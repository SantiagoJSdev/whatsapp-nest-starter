# Plan de implementación: plantilla NestJS y primer bot de ventas

## 1. Dos entregables, dos repositorios

- `whatsapp-nest-starter`: plantilla técnica general. La versión `v0.1.0` termina con NestJS, TypeScript, TypeORM, PostgreSQL local, configuración validada, `/health` y README reproducible. No incluye lógica comercial ni integraciones externas.
- Primer bot, por ejemplo `santiago-sales-bot`: repo nuevo creado a partir de la plantilla verificada. Aquí van catálogo, prospectos, conversación, WhatsApp, IA y despliegue. Mantener oferta, datos y credenciales de cada cliente fuera de la plantilla.
- Una aplicación modular y una instancia inicial. PostgreSQL es el único motor inicial. Sin Redis, microservicios, multitenencia ni SQLite en esta entrega.

## 2. Estado al momento de redactar

| Hito | Estado reportado | Pendiente |
|---|---|---|
| 0. Ruta y estructura | Verificado en `whatsapp-nest-starter` | Ninguno para el entorno original |
| 1. PostgreSQL local | `SELECT 1` y persistencia tras reinicio verificados | Repetir el arranque documentado en el clon |
| 2. NestJS y `/health` | Compilación y `200 → 503 → 200` verificados en la copia original | Cerrar la validación reproducible del clon |
| Clon limpio | El clon no trajo `.env`; se creó localmente. Se reportó un `200` | Confirmar que el proceso arrancó desde el clon, ejecutar `npm ci` como indica el README y repetir el ciclo completo allí |
| `v0.1.0` | No confirmada | Etiquetar el commit de `main` efectivamente probado |

## 3. Cierre de la plantilla general

1. Verificar que `main` contiene README, `compose.yaml`, `.env.example`, `package-lock.json` y el código de la etapa 2; no debe contener `.env`, `node_modules` ni `dist`. Si hubo credenciales reales en algún commit, rotarlas antes de publicar; no confundir retirar el archivo del árbol actual con limpiar el historial.
2. Desde el clon nuevo, crear `.env` a partir de `.env.example`, seguir el README, ejecutar `npm ci`, `npm run build` y arrancar NestJS. Evitar conflictos con la copia original; no borrar volúmenes para liberar un puerto.
3. Con el mismo proceso de NestJS, comprobar `200 → 503 → 200` al detener y reactivar solo PostgreSQL. Registrar el commit probado y cualquier paso que haya faltado en el README.
4. Etiquetar `v0.1.0` solo si pasa. Mantener `main` como versión estable y `develop` o ramas de trabajo para cambios. El usuario hace commits, PR, merge, etiquetas y push; Hermes no los ejecuta por su cuenta.

## 4. Arquitectura del primer bot

```text
Canal simulado o WhatsApp → entrada normalizada → registro durable
  → procesamiento por conversación → reglas / IA opcional
  → catálogo, prospectos y estado → respuesta pendiente → adaptador de envío
```

- Mensaje interno: canal, cuenta, ID externo del mensaje, ID externo del contacto, texto y fecha. No vincular contactos entre redes automáticamente.
- Conversación decide qué hacer; catálogo controla precios y condiciones; prospectos conserva datos comerciales; el estado conversacional es independiente del estado de venta.
- Contratos en la aplicación; TypeORM, Meta y OpenRouter en adaptadores. El núcleo no importa entidades del ORM ni clientes externos.
- PostgreSQL con migraciones versionadas y `synchronize: false`. Los comandos locales y el worker usan el mismo flujo de aplicación, no escriben directamente en las tablas para simular el comportamiento.

## 5. Implementación funcional por etapas

| Etapa | Implementar | Prueba de salida |
|---|---|---|
| 3. Migraciones y catálogo | Migraciones iniciales, repositorio de catálogo y carga ficticia repetible para desarrollo | Migrar una base vacía, consultar el precio desde la aplicación y volver a cargar sin duplicados |
| 4. Conversación local | Comando de simulación no expuesto en producción, reglas deterministas, prospectos y estado persistente | Preguntar el precio de una landing; enviar “La necesito para una clínica”; actualizar el mismo prospecto sin perder datos; reiniciar y comprobar persistencia |
| 5. Procesamiento durable | Persistir antes de confirmar, clave única por canal/cuenta/ID externo, worker en la misma app, registro de intentos y respuesta pendiente | Duplicar un evento sin otra respuesta; procesar mensajes de la misma conversación sin pisarlos; recuperar pendientes tras reiniciar; simular envío incierto sin reenvío ciego |
| 6. Atención humana | Registrar derivación, pausar automatización, listar pendientes, asignar un responsable operativo y reanudar mediante comando | Solicitar atención; ver la solicitud; comprobar silencio automático durante la pausa y respuesta al siguiente mensaje tras reanudar |
| 7. WhatsApp Cloud API | Verificar webhook y firma sobre el cuerpo original, normalizar texto y enviar por adaptador | Probar evento válido, firma inválida y duplicado con fixtures; después hacer ida y vuelta con número de prueba de Meta. Sin credenciales, la prueba real queda pendiente |
| 8. OpenRouter | Adaptador con modelo configurable, salida validada, timeout y alternativa determinista | Precio directo sin IA; intención ambigua con IA; salida inválida o timeout sin perder lead ni inventar precios; prueba real separada de la simulada |

### Reglas de confiabilidad y operación

- No mantener transacciones abiertas mientras se espera a Meta o a IA. Separar recepción, procesamiento y entrega. Registrar fallos e intentos y recuperar trabajos interrumpidos. No prometer entrega exactamente una vez.
- La IA no tiene acceso libre a SQL, no escribe datos y no decide precios. La aplicación valida la salida y aplica reglas antes de ejecutar acciones.
- No decir que un asesor fue notificado si no existe una notificación real. Documentar quién revisa pendientes y qué información necesita para responder.
- Probar persistencia con PostgreSQL real y las mismas migraciones; simular proveedores externos en la suite automatizada.
- Mantener logs con identificadores de seguimiento, sin tokens ni conversaciones completas. Definir qué datos se retienen, por cuánto tiempo y quién puede acceder.
- El timeout HTTP actual de `/health` no implica cancelación de la consulta subyacente. Evaluar antes de producción un límite efectivo para consultas y espera del pool; probar fallos prolongados además del apagado y encendido manual.

## 6. Preparación y despliegue

### Etapa 9 — candidato de despliegue

- Elegir hosting para NestJS y PostgreSQL administrado según presupuesto y operación; Render y Neon son opciones, no dependencias de la aplicación. Decidir región, acceso a base, TLS y gestión de secretos según el proveedor elegido.
- Definir entornos separados: local, prueba y producción. Documentar variables necesarias sin valores reales. No cargar datos ficticios ni habilitar el canal simulado en producción.
- Documentar compilación y arranque de producción, puerto del hosting y `/health`. Ejecutar migraciones como un paso controlado del despliegue, no mediante sincronización automática. Comprobar permisos, backups y recuperación antes de cambios de esquema.
- Definir qué versión se despliega, quién aprueba, cómo se revisan fallos y cómo se vuelve a la versión previa. Si una migración no es compatible hacia atrás, preparar una recuperación de datos aparte; no improvisar un rollback destructivo.

### Etapa 10 — ensayo en un entorno de prueba

- Desplegar una instancia con una base separada y una URL HTTPS. Configurar el webhook con el número de prueba de Meta y los secretos del entorno.
- Ejecutar un recorrido real: mensaje entrante → respuesta → lead guardado → actualización → derivación → reanudación. Verificar deduplicación con eventos de prueba y comprobar los logs sin exponer datos sensibles.
- Reiniciar la aplicación y verificar que los prospectos siguen disponibles y los pendientes recuperables. Comprobar fallos del proveedor de IA y de envío sin perder eventos ni reenviar estados inciertos a ciegas.
- Antes de pasar a producción, confirmar con la cuenta real los permisos y reglas de envío de WhatsApp que apliquen, incluidas las plantillas si el caso de uso las necesita.

### Etapa 11 — salida a producción y aceptación

1. Confirmar catálogo aprobado, responsable de atención humana, acceso a la cuenta de WhatsApp y credenciales de producción separadas.
2. Preparar PostgreSQL, verificar backup, aplicar migraciones y arrancar la versión aprobada. Confirmar `/health` y recepción del webhook antes de habilitar tráfico real.
3. Enviar un mensaje controlado con el número de producción; confirmar respuesta correcta y prospecto persistido. Probar derivación y comprobar que el responsable realmente puede atenderla.
4. Vigilar errores de webhook, trabajos pendientes, envíos inciertos y gasto de IA. Registrar versión, entorno, resultado y responsable. Si falla la recepción, persistencia o respuesta, detener la activación y aplicar el plan de recuperación.

**Se considera funcional cuando** un usuario real consulta un servicio, recibe el precio aprobado, actualiza el mismo prospecto con otro mensaje y puede pasar a atención humana; el flujo persiste tras reinicio y puede operarse con la documentación, sin depender del desarrollador para cada incidente.

## 7. Extensiones posteriores, no necesarias para publicar

- Telegram, Instagram Direct y Facebook Messenger: adaptadores separados según permisos y capacidades del canal.
- CRM o n8n: guardar el lead primero y sincronizar después. Una automatización HTTP no requiere acceso directo a la base ni una segunda instancia del bot.
- Otros proveedores de IA, multimedia, campañas, panel y multitenencia: añadir solo con un caso concreto. Evaluar escalar instancias cuando la carga o la disponibilidad lo justifiquen, no por sumar canales.

## 8. Forma de trabajo

Una etapa por turno. Antes de editar, confirmar la ruta y alcance. Al terminar, reportar archivos tocados, comandos, pruebas reales y pendientes; si falla algo, no avanzar ni marcarlo como aprobado. Hermes ayuda con el código y la documentación; el usuario revisa los cambios, autoriza acciones sobre servicios y realiza Git y el despliegue.
