import * as Flex from '@twilio/flex-ui';

import WelcomeTab from '../../custom-components/WelcomeTab';
import { FlexActionEvent } from '../../../../types/feature-loader';

export const actionEvent = FlexActionEvent.before;
export const actionName = 'LoadCRMContainerTabs';
export const actionHook = function addWelcomeTabToCRM(flex: typeof Flex) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    // Solo mostrar la tab si hay una tarea y es una llamada de voz
    if (!payload.task) {
      return;
    }

    if (!flex.TaskHelper.isCallTask(payload.task)) {
      return;
    }

    // Agregar la tab de bienvenida al inicio
    payload.components = [
      {
        title: 'Bienvenida',
        order: 0,
        component: <WelcomeTab task={payload.task} key="welcome-tab" />,
      },
      ...payload.components,
    ];
  });
};

