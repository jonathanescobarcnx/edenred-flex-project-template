import { getFeatureFlags } from '../../utils/configuration';
import PersonalDataCrmConfig from './types/ServiceConfiguration';

const { enabled = false } = (getFeatureFlags()?.features?.personal_data_crm as PersonalDataCrmConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};
