import React, { useState, useMemo, useEffect } from 'react';
import { ITask } from '@twilio/flex-ui';
import { Box } from '@twilio-paste/core/box';
import { Heading } from '@twilio-paste/core/heading';
import { Label } from '@twilio-paste/core/label';
import { Select, Option } from '@twilio-paste/core/select';
import { Button } from '@twilio-paste/core/button';
import { Stack } from '@twilio-paste/core/stack';
import { Flex } from '@twilio-paste/core/flex';
import { Text } from '@twilio-paste/core/text';
import { Input } from '@twilio-paste/core/input';
import { getFeatureFlags } from '../../../../utils/configuration';

export interface Props {
  task: ITask;
}

interface PersonalDataCrmConfig {
  tipoSolicitanteOptions: string[];
  tipoSolicitudOptions: Record<string, string[]>;
}

export const WelcomeTab = ({ task }: Props) => {
  const getInitialNit = (): string => {
    if (task?.attributes?.personal_data_crm?.nit) {
      return task.attributes.personal_data_crm.nit;
    }

    const conversations = task?.attributes?.conversations;
    if (typeof conversations === 'object' && conversations !== null) {
      if (conversations.conversation_attribute_5) {
        return String(conversations.conversation_attribute_5);
      }
    } else if (typeof conversations === 'string') {
      try {
        const parsed = JSON.parse(conversations);
        if (parsed?.conversation_attribute_5) {
          return String(parsed.conversation_attribute_5);
        }
      } catch (e) {
        // Ignorar error al parsear JSON
      }
    }

    return String(task?.attributes?.conversation?.conversation_attribute_5 || '');
  };

  const [formData, setFormData] = useState({
    razonSocialCliente: task?.attributes?.personal_data_crm?.razonSocialCliente || '',
    nit: getInitialNit(),
    nombreQuienSeComunica: task?.attributes?.personal_data_crm?.nombreQuienSeComunica || '',
    documento: task?.attributes?.personal_data_crm?.documento || '',
    tipoSolicitante: task?.attributes?.personal_data_crm?.tipoSolicitante || '',
    tipoSolicitud: task?.attributes?.personal_data_crm?.tipoSolicitud || '',
    numeroTicket: task?.attributes?.personal_data_crm?.numeroTicket || '',
  });
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setFormData({
      razonSocialCliente: task?.attributes?.personal_data_crm?.razonSocialCliente || '',
      nit: getInitialNit(),
      nombreQuienSeComunica: task?.attributes?.personal_data_crm?.nombreQuienSeComunica || '',
      documento: task?.attributes?.personal_data_crm?.documento || '',
      tipoSolicitante: task?.attributes?.personal_data_crm?.tipoSolicitante || '',
      tipoSolicitud: task?.attributes?.personal_data_crm?.tipoSolicitud || '',
      numeroTicket: task?.attributes?.personal_data_crm?.numeroTicket || '',
    });
  }, [task?.sid]);

  // Obtener configuración desde ui_attributes
  const config = useMemo((): PersonalDataCrmConfig => {
    const featureFlags = getFeatureFlags();
    const personalDataCrmConfig = featureFlags?.features?.personal_data_crm || {};
    
    // Obtener las opciones desde la configuración JSON
    const tipoSolicitanteOptions: string[] = Array.isArray(personalDataCrmConfig.tipoSolicitanteOptions)
      ? personalDataCrmConfig.tipoSolicitanteOptions
      : [];
    const tipoSolicitudOptions: Record<string, string[]> = 
      typeof personalDataCrmConfig.tipoSolicitudOptions === 'object' && 
      personalDataCrmConfig.tipoSolicitudOptions !== null &&
      !Array.isArray(personalDataCrmConfig.tipoSolicitudOptions)
        ? personalDataCrmConfig.tipoSolicitudOptions
        : {};
    
    return {
      tipoSolicitanteOptions,
      tipoSolicitudOptions,
    };
  }, []);

  // Opciones para Tipo Solicitud basadas en Tipo Solicitante
  // Esta función obtiene las opciones desde la configuración JSON según el tipo de solicitante seleccionado
  const getTipoSolicitudOptions = (tipoSolicitante: string): string[] => {
    if (!tipoSolicitante) return [];
    // Obtener las opciones desde config.tipoSolicitudOptions usando el tipo de solicitante como clave
    return config.tipoSolicitudOptions[tipoSolicitante] || [];
  };

  const handleInputChange = async (field: string, value: string) => {
    setSaveMessage('');
    if (task) {
      await task.setAttributes({
        ...task.attributes,
        personal_data_crm: {
          ...(task.attributes.personal_data_crm || {}),
          formSubmitted: false,
        },
      });
    }
    setFormData((prev: typeof formData) => {
      const newData = { ...prev, [field]: value };
      // Si cambia el tipo solicitante, resetear tipo solicitud
      if (field === 'tipoSolicitante') {
        newData.tipoSolicitud = '';
        newData.numeroTicket = '';
      }
      if (field === 'tipoSolicitud' && value !== 'Escalamiento PQR') {
        newData.numeroTicket = '';
      }
      return newData;
    });
  };

  const isFormComplete =
    Boolean(formData.razonSocialCliente.trim()) &&
    Boolean(formData.nit.trim()) &&
    Boolean(formData.nombreQuienSeComunica.trim()) &&
    Boolean(formData.documento.trim()) &&
    Boolean(formData.tipoSolicitante) &&
    Boolean(formData.tipoSolicitud) &&
    (formData.tipoSolicitud !== 'Escalamiento PQR' || Boolean(formData.numeroTicket.trim()));

  const handleSave = async () => {
    if (!isFormComplete) {
      setSaveMessage('Completa todos los campos antes de guardar');
      return;
    }

    // Guardar los datos del formulario en conversation_attributes
    // Guardar el tipificador: tipoSolicitante en disposition (outcome) y tipoSolicitud en outcome
    if (task) {
      // Preparar los datos de conversations
      // Asegurarse de que conversations sea un objeto, no un string
      let existingConversations: any = {};
      if (task.attributes.conversations) {
        // Si conversations es un objeto, usarlo directamente
        if (typeof task.attributes.conversations === 'object' && !Array.isArray(task.attributes.conversations)) {
          existingConversations = { ...task.attributes.conversations };
        } else if (typeof task.attributes.conversations === 'string') {
          // Si es un string, intentar parsearlo
          try {
            existingConversations = JSON.parse(task.attributes.conversations);
          } catch (e) {
            console.warn('Error parsing conversations as JSON:', e);
            existingConversations = {};
          }
        }
      }

      // Construir el objeto de conversations con nuestros datos
      const conversationsUpdate: any = {
        // Preservar solo propiedades válidas (no índices numéricos)
        ...Object.keys(existingConversations).reduce((acc: any, key: string) => {
          // Filtrar índices numéricos (que son caracteres de un string mal parseado)
          if (!/^\d+$/.test(key) && typeof existingConversations[key] !== 'undefined') {
            acc[key] = existingConversations[key];
          }
          return acc;
        }, {}),
      };

      // Guardar tipificador: tipoSolicitante en disposition (conversations.outcome)
      if (formData.tipoSolicitante) {
        conversationsUpdate.conversation_attribute_2 = formData.tipoSolicitante;
      }

      // Guardar tipificador: tipoSolicitud en conversation_attribute_3
      if (formData.tipoSolicitud) {
        conversationsUpdate.conversation_attribute_3 = formData.tipoSolicitud;
      }

      // Si es Escalamiento PQR, guardar el número de ticket en conversation_attribute_4
      if (formData.tipoSolicitud === 'Escalamiento PQR') {
        if (formData.numeroTicket) {
          conversationsUpdate.conversation_attribute_4 = formData.numeroTicket;
        } else {
          delete conversationsUpdate.conversation_attribute_4;
        }
      } else {
        delete conversationsUpdate.conversation_attribute_4;
      }

      // Guardar campos obligatorios adicionales en el reporte de conversaciones
      if (formData.nit) {
        conversationsUpdate.conversation_attribute_5 = formData.nit;
      }
      if (formData.razonSocialCliente) {
        conversationsUpdate.conversation_attribute_6 = formData.razonSocialCliente;
      }
      if (formData.nombreQuienSeComunica) {
        conversationsUpdate.conversation_attribute_7 = formData.nombreQuienSeComunica;
      }
      if (formData.documento) {
        conversationsUpdate.conversation_attribute_8 = formData.documento;
      }

      // Guardar en task attributes
      await task.setAttributes({
        ...task.attributes,
        conversations: conversationsUpdate,
        // También guardar en personal_data_crm para referencia
        personal_data_crm: {
          ...formData,
          formSubmitted: true,
        },
      });

      console.log('Datos guardados:', {
        disposition: formData.tipoSolicitante,
        outcome: formData.tipoSolicitud,
        razonSocialCliente: formData.razonSocialCliente,
        nit: formData.nit,
        nombreQuienSeComunica: formData.nombreQuienSeComunica,
        documento: formData.documento,
      });
      setSaveMessage('Datos guardados exitosamente');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const tipoSolicitudOptions = getTipoSolicitudOptions(formData.tipoSolicitante);

  // Función auxiliar para formatear valores
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  };

  // Función para renderizar un campo de atributo
  const renderAttributeField = (label: string, value: any) => {
    const displayValue = formatValue(value);
    if (displayValue === 'N/A') return null;
    const fieldId = `attr-${label.toLowerCase().replace(/\s+/g, '-')}`;
    return (
      <Box width="100%" key={label}>
        <Label htmlFor={fieldId}>{label}</Label>
        <Text as="p" id={fieldId} fontSize="fontSize30" color="colorText">
          {displayValue}
        </Text>
      </Box>
    );
  };

  return (
    <Flex vertical width="100%" height="100%" grow>
      <Box
        padding="space60"
        backgroundColor="colorBackgroundBody"
        width="100%"
        height="100%"
        overflowY="auto"
      >
        <Stack orientation="vertical" spacing="space60">
          {/* Sección: Tipificación */}
          <Box width="100%" marginTop="space200">
            <Box marginBottom="space40">
              <Heading as="h3" variant="heading40" marginBottom="space0">
                Tipificación
              </Heading>
            </Box>
            <Stack orientation="vertical" spacing="space40">
              <Box width="100%">
                <Label htmlFor="razon-social-cliente" required>
                  RAZÓN SOCIAL CLIENTE
                </Label>
                <Input
                  type="text"
                  id="razon-social-cliente"
                  value={formData.razonSocialCliente}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('razonSocialCliente', e.target.value)
                  }
                  placeholder="Ingresa la razón social del cliente"
                  required
                />
              </Box>

              <Box width="100%">
                <Label htmlFor="nit" required>
                  NIT
                </Label>
                <Input
                  type="text"
                  id="nit"
                  value={formData.nit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('nit', e.target.value)
                  }
                  placeholder="Ingresa el NIT"
                  required
                />
              </Box>

              <Box width="100%">
                <Label htmlFor="nombre-quien-se-comunica" required>
                  NOMBRE QUIEN SE COMUNICA
                </Label>
                <Input
                  type="text"
                  id="nombre-quien-se-comunica"
                  value={formData.nombreQuienSeComunica}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('nombreQuienSeComunica', e.target.value)
                  }
                  placeholder="Ingresa el nombre de quien se comunica"
                  required
                />
              </Box>

              <Box width="100%">
                <Label htmlFor="documento" required>
                  DOCUMENTO
                </Label>
                <Input
                  type="text"
                  id="documento"
                  value={formData.documento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('documento', e.target.value)
                  }
                  placeholder="Ingresa el documento"
                  required
                />
              </Box>

              <Box width="100%">
                <Label htmlFor="tipo-solicitante" required>TIPO SOLICITANTE</Label>
                <Select
                  id="tipo-solicitante"
                  value={formData.tipoSolicitante}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('tipoSolicitante', e.target.value)}
                >
                  <Option value="" disabled>
                    Selecciona una opción
                  </Option>
                  {config.tipoSolicitanteOptions.map((option: string) => (
                    <Option key={option} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              </Box>

              <Box width="100%">
                <Label htmlFor="tipo-solicitud" required>TIPO SOLICITUD</Label>
                <Select
                  id="tipo-solicitud"
                  value={formData.tipoSolicitud}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('tipoSolicitud', e.target.value)}
                  disabled={!formData.tipoSolicitante}
                >
                  <Option value="" disabled>
                    {formData.tipoSolicitante
                      ? 'Selecciona una opción'
                      : 'Primero selecciona el tipo de solicitante'}
                  </Option>
                  {tipoSolicitudOptions.map((option: string) => (
                    <Option key={option} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              </Box>

              {formData.tipoSolicitud === 'Escalamiento PQR' && (
                <Box width="100%">
                  <Label htmlFor="numero-ticket">NÚMERO DE TICKET</Label>
                  <Input
                    type="text"
                    id="numero-ticket"
                    value={formData.numeroTicket}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('numeroTicket', e.target.value)}
                    placeholder="Ingresa el número de ticket"
                  />
                </Box>
              )}
            </Stack>
          </Box>

          {/* Botón Guardar */}
          <Box width="100%" marginTop="space60">
            <Button variant="primary" onClick={handleSave} disabled={!isFormComplete}>
              Guardar
            </Button>
            {saveMessage && (
              <Text as="p" marginTop="space40" color="colorTextSuccess">
                {saveMessage}
              </Text>
            )}
          </Box>
        </Stack>
      </Box>
    </Flex>
  );
};
