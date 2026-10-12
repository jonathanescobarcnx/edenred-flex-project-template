export default interface CallbackAndVoicemailConfig {
  enabled: boolean;
  allow_requeue: boolean;
  max_attempts: number;
  auto_select_task: boolean;
  // Base URL serverless-functions/.../wait-experience-custom.protected.js uses to build
  // <Play> URLs for its recorded audio prompts and to reach the IVR logging service (/queue_messages). Not consumed by the plugin - documented here
  // for type-completeness since it's editable through this feature's Admin UI JSON editor.
  ivr_service_base_url?: string;
}
