import * as Flex from '@twilio/flex-ui';

import { FlexAction, FlexActionEvent } from '../../../../types/feature-loader';
import { PersonalDataCrmNotification } from '../notifications';
import { isFormSubmittedByWorker } from '../../helpers/formSubmission';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.TransferTask;
export const actionHook = function requirePersonalDataCrmFormBeforeTransfer(flex: typeof Flex) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload, abortFunction) => {
    const task = payload.task || (payload.sid ? flex.TaskHelper.getTaskByTaskSid(payload.sid) : undefined);

    if (task && isFormSubmittedByWorker(task, flex.Manager.getInstance().workerClient?.sid)) {
      return;
    }

    flex.Notifications.showNotification(PersonalDataCrmNotification.FormRequired);
    abortFunction();
  });
};
