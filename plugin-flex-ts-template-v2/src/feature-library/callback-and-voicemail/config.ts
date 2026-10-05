import { getFeatureFlags } from '../../utils/configuration';
import CallbackAndVoicemailConfig from './types/ServiceConfiguration';

const {
  enabled = false,
  allow_requeue = false,
  max_attempts = 1,
  auto_select_task = false,
  custom_audio_base_url = '',
} = (getFeatureFlags()?.features?.callback_and_voicemail as CallbackAndVoicemailConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};

export const isAllowRequeueEnabled = () => {
  return enabled && allow_requeue;
};

export const isAutoSelectTaskEnabled = () => {
  return enabled && auto_select_task;
};

export const getMaxAttempts = () => {
  return max_attempts;
};

export const getCustomAudioBaseUrl = () => {
  return custom_audio_base_url;
};