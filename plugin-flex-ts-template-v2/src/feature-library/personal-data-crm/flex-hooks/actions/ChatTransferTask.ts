import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent } from '../../../../types/feature-loader';
import { isFormSubmittedByWorker } from '../../helpers/formSubmission';
import { PersonalDataCrmNotification } from '../notifications';

export const actionEvent = FlexActionEvent.before;
export const actionName = 'ChatTransferTask';
export const actionHook = function requirePersonalDataCrmFormBeforeChatTransfer(flex: typeof Flex) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload, abortFunction) => {
    const task = payload.task || (payload.sid ? flex.TaskHelper.getTaskByTaskSid(payload.sid) : undefined);

    if (task && isFormSubmittedByWorker(task, flex.Manager.getInstance().workerClient?.sid)) {
      return;
    }

    flex.Notifications.showNotification(PersonalDataCrmNotification.FormRequired);
    abortFunction();
  });
};
