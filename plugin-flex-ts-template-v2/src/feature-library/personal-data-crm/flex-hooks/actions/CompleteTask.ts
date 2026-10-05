import * as Flex from '@twilio/flex-ui';

import { FlexAction, FlexActionEvent } from '../../../../types/feature-loader';
import { PersonalDataCrmNotification } from '../notifications';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.CompleteTask;
export const actionHook = function requirePersonalDataCrmForm(flex: typeof Flex) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload, abortFunction) => {
    const task = payload.task || (payload.sid ? flex.TaskHelper.getTaskByTaskSid(payload.sid) : undefined);

    if (!task || task.attributes.personal_data_crm?.formSubmitted === true || task.attributes.taskType === 'callback') {
      console.log('No task, form already submitted, or not a call task. Allowing CompleteTask action to proceed.');
      return;
    }

    flex.Notifications.showNotification(PersonalDataCrmNotification.FormRequired);
    abortFunction();
  });
};