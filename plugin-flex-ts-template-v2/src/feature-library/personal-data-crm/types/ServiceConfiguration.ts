/** Shape de `features.personal_data_crm` en ui_attributes. */
export default interface PersonalDataCrmConfig {
  enabled: boolean;
  tipoSolicitanteOptions?: string[];
  tipoSolicitudOptions?: Record<string, string[]>;
}
