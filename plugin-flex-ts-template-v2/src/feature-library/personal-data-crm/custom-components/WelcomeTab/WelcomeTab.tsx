import React, { useState, useMemo } from 'react';
import { ITask } from '@twilio/flex-ui';
import { Box } from '@twilio-paste/core/box';
import { Heading } from '@twilio-paste/core/heading';
import { Input } from '@twilio-paste/core/input';
import { Label } from '@twilio-paste/core/label';
import { Select, Option } from '@twilio-paste/core/select';
import { Button } from '@twilio-paste/core/button';
import { Stack } from '@twilio-paste/core/stack';
import { HelpText } from '@twilio-paste/core/help-text';
import { Flex } from '@twilio-paste/core/flex';
import { Text } from '@twilio-paste/core/text';
import { getFeatureFlags } from '../../../../utils/configuration';

export interface Props {
  task: ITask;
}

interface PersonalDataCrmConfig {
  tipoSolicitanteOptions: string[];
  tipoSolicitudOptions: Record<string, string[]>;
}

export const WelcomeTab = ({ task }: Props) => {
  const [formData, setFormData] = useState({
    nombreUsuario: '',
    documento: '',
    nit: '',
    clasificacionEmpresa: '',
    tipoSolicitante: '',
    tipoSolicitud: '',
  });

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: typeof formData) => {
      const newData = { ...prev, [field]: value };
      // Si cambia el tipo solicitante, resetear tipo solicitud
      if (field === 'tipoSolicitante') {
        newData.tipoSolicitud = '';
      }
      return newData;
    });
  };

  const handleSave = () => {
    // Guardar los datos del formulario en conversation_attributes
    // Guardar el tipificador: tipoSolicitante en disposition (outcome) y tipoSolicitud en outcome
    if (task) {
      const formDataToSave = {
        nombreUsuario: formData.nombreUsuario,
        documento: formData.documento,
        nit: formData.nit,
        clasificacionEmpresa: formData.clasificacionEmpresa,
      };

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
        // Datos del formulario en conversation_attributes
        conversation_attribute_1: formDataToSave.nombreUsuario,
        conversation_attribute_2: formDataToSave.documento,
        conversation_attribute_3: formDataToSave.nit,
        conversation_attribute_4: formDataToSave.clasificacionEmpresa,
      };

      // Guardar tipificador: tipoSolicitante en disposition (conversations.outcome)
      if (formData.tipoSolicitante) {
        conversationsUpdate.outcome = formData.tipoSolicitante;
      }

      // Guardar tipificador: tipoSolicitud en conversation_attribute_5
      if (formData.tipoSolicitud) {
        conversationsUpdate.conversation_attribute_5 = formData.tipoSolicitud;
      }

      // Guardar en task attributes
      task.setAttributes({
        ...task.attributes,
        conversations: conversationsUpdate,
        // También guardar en personal_data_crm para referencia
        personal_data_crm: formData,
      });

      console.log('Datos guardados:', {
        formulario: formDataToSave,
        disposition: formData.tipoSolicitante,
        outcome: formData.tipoSolicitud,
      });
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
          {/* Sección: Datos del usuario */}
          <Box width="100%" marginBottom="space80">
            <Box marginBottom="space40">
              <Heading as="h3" variant="heading40" marginBottom="space0">
                Datos del usuario
              </Heading>
            </Box>
            <Stack orientation="vertical" spacing="space40">
              <Box width="100%">
                <Label htmlFor="nombre-usuario">NOMBRE DEL USUARIO</Label>
                <Input
                  id="nombre-usuario"
                  type="text"
                  value={formData.nombreUsuario}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nombreUsuario', e.target.value)}
                />
              </Box>

              <Box width="100%">
                <Label htmlFor="documento">DOCUMENTO</Label>
                <Input
                  id="documento"
                  type="text"
                  value={formData.documento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('documento', e.target.value)}
                />
              </Box>

              <Box width="100%">
                <Label htmlFor="nit">NIT</Label>
                <Input
                  id="nit"
                  type="text"
                  value={formData.nit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nit', e.target.value)}
                />
                <HelpText>9 dígitos</HelpText>
              </Box>

              <Box width="100%">
                <Label htmlFor="clasificacion-empresa">CLASIFICACIÓN DE LA EMPRESA</Label>
                <Select
                  id="clasificacion-empresa"
                  value={formData.clasificacionEmpresa}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('clasificacionEmpresa', e.target.value)}
                >
                  <Option value="Pequeña">Pequeña</Option>
                  <Option value="Mediana">Mediana</Option>
                  <Option value="Grande">Grande</Option>
                </Select>
              </Box>
            </Stack>
          </Box>

          {/* Sección: Tipificación */}
          <Box width="100%" marginTop="space200">
            <Box marginBottom="space40">
              <Heading as="h3" variant="heading40" marginBottom="space0">
                Tipificación
              </Heading>
            </Box>
            <Stack orientation="vertical" spacing="space40">
              <Box width="100%">
                <Label htmlFor="tipo-solicitante">TIPO SOLICITANTE</Label>
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
                <Label htmlFor="tipo-solicitud">TIPO SOLICITUD</Label>
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
            </Stack>
          </Box>

          {/* Botón Guardar */}
          <Box width="100%" marginTop="space60">
            <Button variant="primary" onClick={handleSave}>
              Guardar
            </Button>
          </Box>
        </Stack>
      </Box>
    </Flex>
  );
};

