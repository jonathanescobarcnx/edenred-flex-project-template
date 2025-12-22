# Datos Disponibles en personal-data-crm

Desde el componente `WelcomeTab`, tienes acceso al objeto `task` que contiene toda la información de la llamada. Aquí están los datos principales que puedes capturar:

## Datos Principales del Task (task.*)

```typescript
// Identificadores
task.sid                    // SID único de la tarea
task.taskChannelUniqueName  // Tipo de canal ('voice', 'chat', etc.)
task.queueName              // Nombre de la cola
task.queueSid               // SID de la cola
task.workflowName           // Nombre del workflow
task.workflowSid            // SID del workflow

// Estado y fechas
task.status                 // Estado: 'reserved', 'assigned', 'wrapping', 'completed'
task.dateCreated            // Fecha de creación de la tarea
task.dateUpdated            // Fecha de última actualización
task.age                    // Edad de la tarea en segundos
task.priority               // Prioridad de la tarea
task.timeout                // Timeout de la tarea

// Reservación
task.reservationSid         // SID de la reservación actual
```

## Datos de la Llamada (task.attributes.*)

### Información del Número de Teléfono

```typescript
// Números de teléfono
task.attributes.from        // Número que llama (inbound) o desde donde se llama (outbound)
task.attributes.to          // Número que recibe la llamada (inbound) o al que se llama (outbound)
task.attributes.caller      // Número del que llama (alias para 'from' en inbound)
task.attributes.called      // Número al que se llama (alias para 'to' en inbound)

// Información geográfica del que llama
task.attributes.caller_city
task.attributes.caller_country
task.attributes.caller_state
task.attributes.caller_zip

// Información geográfica del destinatario
task.attributes.called_city
task.attributes.called_country
task.attributes.called_state
task.attributes.call_zip

// Información geográfica alternativa (from/to)
task.attributes.from_city
task.attributes.from_country
task.attributes.from_state
task.attributes.from_zip
task.attributes.to_city
task.attributes.to_country
task.attributes.to_state
task.attributes.to_zip
```

### Información de la Llamada

```typescript
// SIDs e IDs
task.attributes.call_sid          // SID único de la llamada en Twilio
task.attributes.account_sid       // SID de la cuenta de Twilio
task.attributes.api_version       // Versión de la API utilizada

// Dirección de la llamada
task.attributes.direction         // 'inbound' o 'outbound'

// Tipo
task.attributes.type              // Tipo de tarea (ej: 'call')
```

### Información de la Conferencia

```typescript
task.attributes.conference?.sid              // SID de la conferencia
task.attributes.conference?.friendlyName     // Nombre amigable de la conferencia
task.attributes.conference?.participants     // Objeto con participantes de la conferencia
```

### Información de Conversaciones (Flex Insights)

```typescript
task.attributes.conversations?.conversation_id      // ID de la conversación
task.attributes.conversations?.destination          // Destino
task.attributes.conversations?.hang_up_by           // Quien colgó
task.attributes.conversations?.outcome              // Resultado de la conversación
task.attributes.conversations?.content              // Contenido

// Atributos personalizados de conversación (1-10)
task.attributes.conversations?.conversation_attribute_1
task.attributes.conversations?.conversation_attribute_2
// ... hasta conversation_attribute_10

// Etiquetas de conversación (1-10)
task.attributes.conversations?.conversation_label_1
// ... hasta conversation_label_10

// Medidas de conversación (1-10)
task.attributes.conversations?.conversation_measure_1
// ... hasta conversation_measure_10
```

### Atributos Personalizados

```typescript
// Propiedades personalizadas comunes
task.attributes.name              // Nombre del contacto/cliente
task.attributes.accountNumber     // Número de cuenta
task.attributes.targetSkill       // Skill objetivo
task.attributes.autoClose         // Si la tarea se cierra automáticamente
task.attributes.parentTask        // SID de la tarea padre (para callbacks)
task.attributes.taskType          // Tipo de tarea personalizado

// Llamadas internas
task.attributes.client_call       // true si es una llamada interna

// Callback data (si aplica)
task.attributes.callBackData?.numberToCall
task.attributes.callBackData?.numberToCallFrom
task.attributes.callBackData?.mainTimeZone
task.attributes.callBackData?.utcDateTimeReceived
task.attributes.callBackData?.recordingSid
task.attributes.callBackData?.recordingUrl
task.attributes.callBackData?.transcriptSid
task.attributes.callBackData?.transcriptText
```

## Ejemplo de Uso en WelcomeTab

```typescript
export const WelcomeTab = ({ task }: Props) => {
  // Datos principales de la llamada
  const callSid = task?.attributes?.call_sid;
  const callerNumber = task?.attributes?.from || task?.attributes?.caller;
  const calledNumber = task?.attributes?.to || task?.attributes?.called;
  const direction = task?.attributes?.direction; // 'inbound' o 'outbound'
  
  // Información geográfica
  const callerCity = task?.attributes?.caller_city;
  const callerCountry = task?.attributes?.caller_country;
  const callerState = task?.attributes?.caller_state;
  
  // Información de la tarea
  const taskSid = task?.sid;
  const queueName = task?.queueName;
  const dateCreated = task?.dateCreated;
  
  // Información personalizada
  const customerName = task?.attributes?.name;
  const accountNumber = task?.attributes?.accountNumber;
  
  // Usar estos datos en el componente...
};
```

## Notas Importantes

1. **Algunos datos pueden no estar disponibles** dependiendo de cómo se creó la tarea. Siempre usa optional chaining (`?.`) para acceder a los datos.

2. **Para llamadas inbound**: usa `task.attributes.from` o `task.attributes.caller` para obtener el número del cliente.

3. **Para llamadas outbound**: `task.attributes.from` es el número desde donde se llama, y `task.attributes.to` es el número al que se llama.

4. **Los datos geográficos** pueden no estar disponibles si Twilio no puede determinarlos.

5. **Puedes guardar datos personalizados** en `task.attributes` usando `task.setAttributes()`.

