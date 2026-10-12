export default interface CallbackAndVoicemailConfig {
  enabled: boolean;
  allow_requeue: boolean;
  max_attempts: number;
  auto_select_task: boolean;
  // Base URL serverless-functions/.../wait-experience-custom.protected.js uses to build
  // <Play> URLs for its recorded audio prompts. Not consumed by the plugin - documented here
  // for type-completeness since it's editable through this feature's Admin UI JSON editor.
  custom_audio_base_url?: string;
  // Full URL of the external IVR logging service that wait-experience-custom.protected.js posts
  // callback events to. Not consumed by the plugin. If unset, logging is skipped.
  log_service_url?: string;
}
