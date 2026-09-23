import React from 'react';
import { useFlexSelector } from '@twilio/flex-ui';

import AppState from '../../../../types/manager/AppState';
import TabbedCRMTask from '../TabbedCRMTask';

export const TabbedCRMContainer = () => {
  const tasks = useFlexSelector((state: AppState) => state.flex.worker.tasks);

  // Render an instance for every task (including tasks spawned from a parent task,
  // e.g. an outbound call placed from a callback/voicemail task) so each one gets its
  // own LoadCRMContainerTabs invocation and its own typification/tab state, plus an
  // instance for when there is no task selected
  return (
    <>
      {Array.from(tasks.values()).map((task) => (
        <TabbedCRMTask thisTask={task} key={task.taskSid} />
      ))}
      <TabbedCRMTask thisTask={undefined} key="no-task" />
    </>
  );
};
