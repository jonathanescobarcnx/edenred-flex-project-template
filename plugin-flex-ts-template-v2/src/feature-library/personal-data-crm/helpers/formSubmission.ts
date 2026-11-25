import * as Flex from '@twilio/flex-ui';

export const isFormSubmittedByWorker = (task: Flex.ITask | undefined, workerSid?: string): boolean =>
  Boolean(
    task &&
      workerSid &&
      task.attributes.personal_data_crm?.formSubmitted === true &&
      task.attributes.personal_data_crm?.formSubmittedByWorkerSid === workerSid,
  );
