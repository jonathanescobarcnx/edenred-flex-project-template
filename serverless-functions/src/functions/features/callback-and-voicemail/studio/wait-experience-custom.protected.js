/*
 * Custom Spanish-language TwiML for the <Enqueue> waitUrl, using pre-recorded audio prompts
 * instead of TTS <Say>. This is a parallel implementation of wait-experience.protected.js -
 * that original file is left untouched so existing deployments keep working unmodified.
 *
 * Differences from the original wait-experience.protected.js:
 *  - No "press star" gate: the callback offer is announced immediately in the main wait loop.
 *  - Announces an estimated wait time (from Workflow Cumulative Statistics) between two audio prompts.
 *  - Only offers a callback (digit 1); there is no voicemail or WhatsApp option in this flow.
 *  - Caller-facing prompts are played via <Play> of recorded audio; <Say> is only used for the
 *    few dynamic values that can't be pre-recorded (the estimated wait in minutes, and reading
 *    back an entered phone number digit-by-digit).
 */
const { twilioExecute } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);
const TaskRouterOperations = require(Runtime.getFunctions()['common/twilio-wrappers/taskrouter'].path);
const CallbackOperations = require(Runtime.getFunctions()['features/callback-and-voicemail/common/callback-operations']
  .path);

const options = {
  retainPlaceInQueue: true,
  retainRouting: true,
  sayOptions: { voice: 'Polly.Mia', language: 'es-MX' },
  holdMusicUrl: 'http://com.twilio.music.soft-rock.s3.amazonaws.com/_ghost_-_promo_2_sample_pack.mp3',
  waitTimeStatsWindowMinutes: 15,
  // Audio file names, relative to serverless-functions/src/assets/features/callback-and-voicemail/
  // These are placeholders - replace the files at that path with the actual recordings.
  audio: {
    queueIntro: 'features/callback-and-voicemail/queue-busy-wait-time-intro.wav',
    queueMenu: 'features/callback-and-voicemail/queue-callback-offer-menu.wav',
    callbackNumberChoice: 'features/callback-and-voicemail/callback-number-choice-menu.wav',
    // Played on callback submission regardless of whether the caller kept their own number
    // or entered a different one - there is a single confirmation prompt for both paths.
    callbackSubmitted: 'features/callback-and-voicemail/callback-confirmed.wav',
    enterOtherNumber: 'features/callback-and-voicemail/callback-enter-other-number.wav',
    confirmNumberIntro: 'features/callback-and-voicemail/callback-number-confirm-intro.wav',
    confirmNumberMenu: 'features/callback-and-voicemail/callback-number-confirm-menu.wav',
  },
  // Spanish TTS fallback strings, used only where no recorded prompt applies.
  messages: {
    processingError: 'Lo sentimos, no pudimos procesar tu solicitud. Por favor, permanece en la línea.',
    invalidInput: 'Ingresaste una opción no válida. Por favor, intenta de nuevo.',
    callbackAndVoicemailUnavailable: 'La opción de devolución de llamada no está disponible en este momento. Por favor, permanece en la línea.',
  },
};

/**
 * Utility function to retrieve all recent pending tasks for the supplied workflow, and find the one that matches our call SID.
 * This avoids the need to use EvaluateTaskAttributes which is strictly rate limited to 3 RPS.
 * @param {*} context
 * @param {*} callSid
 * @param {*} workflowSid
 * @returns
 */
async function getPendingTaskByCallSid(context, callSid, workflowSid) {
  // Limiting to a single max payload size of 50 since the task should be top of the list.
  // Fine tuning of this value can be done based on anticipated call volume and validated through load testing.
  const result = await TaskRouterOperations.getTasks({
    context,
    assignmentStatus: ['pending', 'reserved'],
    workflowSid,
    ordering: 'DateCreated:desc',
    limit: 50,
  });

  return result.data?.find((task) => task.attributes.call_sid === callSid);
}

/**
 *
 * @param {*} context
 * @param {*} taskSid
 * @returns
 */
async function fetchTask(context, taskSid) {
  const result = await TaskRouterOperations.fetchTask({
    context,
    taskSid,
  });
  return result.data;
}

/**
 * Cancels the task and updates the attributes to reflect the abandoned status.
 * We don't want callbacks to contribute to abandoned task metrics.
 *
 * @param {*} context
 * @param {*} task
 * @param {*} cancelReason
 */
async function cancelTask(context, task, cancelReason) {
  const newAttributes = {
    ...task.attributes,
    conversations: {
      ...task.attributes.conversations,
      abandoned: 'Follow-Up',
    },
  };

  return TaskRouterOperations.updateTask({
    context,
    taskSid: task.sid,
    updateParams: {
      assignmentStatus: 'canceled',
      reason: cancelReason,
      attributes: JSON.stringify(newAttributes),
    },
  });
}

/**
 * Fetches the estimated wait time, in whole minutes, for the given workflow using
 * Workflow Cumulative Statistics. Returns undefined if the estimate can't be determined,
 * so callers can gracefully skip announcing a wait time.
 * @param {*} context
 * @param {*} workflowSid
 * @returns {Promise<number|undefined>}
 */
async function getEstimatedWaitMinutes(context, workflowSid) {
  if (!workflowSid) return undefined;
  try {
    const result = await TaskRouterOperations.getWorkflowCumulativeStatistics({
      context,
      workflowSid,
      minutes: options.waitTimeStatsWindowMinutes,
    });
    const avgTaskAcceptanceTime = result.data?.avgTaskAcceptanceTime;
    if (!avgTaskAcceptanceTime) return undefined;
    return Math.max(1, Math.round(avgTaskAcceptanceTime / 60));
  } catch (error) {
    console.error(`Failed to fetch workflow cumulative statistics for ${workflowSid}: ${error.message}`);
    return undefined;
  }
}

exports.handler = async (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  const baseUrl = `https://${context.DOMAIN_NAME}/features/callback-and-voicemail/studio/wait-experience-custom`;

  const toAbsoluteAssetUrl = (relativePath) => `https://${context.DOMAIN_NAME}/${relativePath}`;

  let holdMusicUrl = options.holdMusicUrl;
  // Make relative hold music URLs absolute - <Play> does not support relative URLs
  if (!holdMusicUrl.startsWith('http://') && !holdMusicUrl.startsWith('https://')) {
    holdMusicUrl = toAbsoluteAssetUrl(holdMusicUrl);
  }

  const { Digits, CallSid, QueueSid, mode, enqueuedTaskSid, skipGreeting } = event;
  switch (mode) {
    case 'initialize':
    case undefined:
      // Initial logic to find the associated task for the call, and propagate it through to the rest of the TwiML execution
      // If the lookup fails to find the task, the remaining TwiML logic will not offer any callback option.
      const enqueuedWorkflowSid = (await twilioExecute(context, (client) => client.queues(QueueSid).fetch())).data
        .friendlyName;
      console.log(`Enqueued workflow sid: ${enqueuedWorkflowSid}`);
      const enqueuedTask = await getPendingTaskByCallSid(context, CallSid, enqueuedWorkflowSid);

      const redirectBaseUrl = `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}`;

      if (enqueuedTask) {
        twiml.redirect(redirectBaseUrl + `&enqueuedTaskSid=${enqueuedTask.sid}`);
      } else {
        // Log an error for our own debugging purposes, but don't fail the call
        console.error(
          `Failed to find the pending task with callSid: ${CallSid}. This is potentially due to higher call volume than the API query had accounted for.`,
        );
        twiml.redirect(redirectBaseUrl);
      }
      return callback(null, twiml);

    case 'main-wait-loop':
      if (enqueuedTaskSid) {
        if (skipGreeting !== 'true') {
          twiml.play(toAbsoluteAssetUrl(options.audio.queueIntro));

          const task = await fetchTask(context, enqueuedTaskSid);
          const waitMinutes = await getEstimatedWaitMinutes(context, task?.workflowSid);
          if (waitMinutes) {
            twiml.say(options.sayOptions, `Aproximadamente ${waitMinutes} minutos.`);
          }
        }

        // Nest the <Play> within the <Gather> to allow the caller to press a key at any time during the nested verbs' execution.
        const initialGather = twiml.gather({
          input: 'dtmf',
          timeout: '2',
          action: `${baseUrl}?mode=handle-main-choice&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
        });
        initialGather.play(toAbsoluteAssetUrl(options.audio.queueMenu));
        initialGather.play(holdMusicUrl);
      } else {
        // If the task lookup failed to find the task previously, don't offer a callback option - since we aren't able to
        // cancel the ongoing call task
        twiml.say(options.sayOptions, options.messages.callbackAndVoicemailUnavailable);
        twiml.play(holdMusicUrl);
      }
      // Loop back to the start if we reach this point
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);

    case 'handle-main-choice':
      if (Digits === '1') {
        // Prompt the caller if they wish to use the number they called from, or another number.
        const callbackOptionsGather = twiml.gather({
          input: 'dtmf',
          timeout: '5',
          numDigits: 1,
          action: `${baseUrl}?mode=handle-callback-choice&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
        });
        callbackOptionsGather.play(toAbsoluteAssetUrl(options.audio.callbackNumberChoice));
        return callback(null, twiml);
      }

      // Loop back to the start of the wait loop for any other key (or timeout)
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);

    case 'handle-callback-choice':
      if (Digits === '1') {
        // Caller selected option to use the number they called from
        twiml.redirect(
          `${baseUrl}?mode=submit-callback&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&to=${encodeURIComponent(
            event.Caller,
          )}`,
        );
        return callback(null, twiml);
      } else if (Digits === '2') {
        // Get desired phone number from caller
        const gather = twiml.gather({
          input: 'dtmf',
          timeout: 10,
          numDigits: 13,
          finishOnKey: '#',
          action: `${baseUrl}?mode=handle-other-number-confirmation-option&enqueuedTaskSid=${enqueuedTaskSid}&CallSid=${CallSid}`,
          method: 'GET',
        });
        gather.play(toAbsoluteAssetUrl(options.audio.enterOtherNumber));
        return callback(null, twiml);
      } else if (Digits === '0') {
        // Back to the previous menu
        twiml.redirect(
          `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
        );
        return callback(null, twiml);
      }

      // Any other key - replay this menu
      const retryGather = twiml.gather({
        input: 'dtmf',
        timeout: '5',
        numDigits: 1,
        action: `${baseUrl}?mode=handle-callback-choice&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
      });
      retryGather.play(toAbsoluteAssetUrl(options.audio.callbackNumberChoice));
      return callback(null, twiml);

    case 'handle-other-number-confirmation-option':
      if (Digits) {
        twiml.play(toAbsoluteAssetUrl(options.audio.confirmNumberIntro));
        const say = twiml.say(options.sayOptions);
        say.sayAs(
          {
            'interpret-as': 'telephone',
          },
          Digits.trim(),
        );

        const gather = twiml.gather({
          input: 'dtmf',
          timeout: 15,
          numDigits: 1,
          finishOnKey: '#',
          action: `${baseUrl}?mode=handle-other-number-confirmation&enqueuedTaskSid=${enqueuedTaskSid}&updatedPhoneNumber=${Digits.trim()}`,
          method: 'GET',
        });
        gather.play(toAbsoluteAssetUrl(options.audio.confirmNumberMenu));
      } else {
        twiml.say(options.sayOptions, options.messages.invalidInput);
      }
      return callback(null, twiml);

    case 'handle-other-number-confirmation':
      if (Digits && Digits === '1') {
        twiml.redirect(
          `${baseUrl}?mode=submit-callback&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&to=${event.updatedPhoneNumber}`,
        );
      } else {
        const gather = twiml.gather({
          input: 'dtmf',
          timeout: 10,
          numDigits: 13,
          finishOnKey: '#',
          action: `${baseUrl}?mode=handle-other-number-confirmation-option&enqueuedTaskSid=${enqueuedTaskSid}`,
          method: 'GET',
        });
        gather.play(toAbsoluteAssetUrl(options.audio.enterOtherNumber));
      }
      return callback(null, twiml);

    case 'submit-callback':
      // Cancel the original task and create the Callback task
      const originalTask = await fetchTask(context, enqueuedTaskSid);
      await cancelTask(context, originalTask, 'Opted to request a callback');

      // Here you can optionally adjust callback parameters, such as a overriddenWorkflowSid
      const callbackParams = {
        context,
        numberToCall: event.to,
        numberToCallFrom: event.Called,
      };

      if (options.retainRouting && originalTask) {
        // Provide originalTask so that the workflow and attributes are copied to the callback
        callbackParams.originalTask = originalTask;
      }

      if (options.retainPlaceInQueue && originalTask) {
        // Get the original task's start time to maintain queue ordering.
        callbackParams.virtualStartTime = originalTask.dateCreated;
      }

      await CallbackOperations.createCallbackTask(callbackParams);

      // End the interaction. Hangup the call.
      twiml.play(toAbsoluteAssetUrl(options.audio.callbackSubmitted));
      twiml.hangup();
      return callback(null, twiml);

    default:
      //  Default case - if we don't recognize the mode, redirect to the main wait loop
      twiml.say(options.sayOptions, options.messages.processingError);
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);
  }
};
