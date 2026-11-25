import * as Flex from '@twilio/flex-ui';

export enum PersonalDataCrmNotification {
  FormRequired = 'PSPersonalDataCrmFormRequired',
}

export const notificationHook = () => [
  {
    id: PersonalDataCrmNotification.FormRequired,
    type: Flex.NotificationType.error,
    content: 'Debes diligenciar y guardar el formulario con tu usuario antes de completar o transferir la tarea.',
    timeout: 3500,
  },
];
