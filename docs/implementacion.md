# Documento de Implementación — Mercado Subastas

> Describe exhaustivamente cada funcionalidad implementada: lógica de negocio, condiciones de acceso, párrafos del enunciado que la fundamentan, y los archivos del back y del front donde reside el código.

---

## Índice

1. [Registro de usuarios (2 etapas)](#1-registro-de-usuarios)
2. [Login y gestión de sesión](#2-login-y-sesión)
3. [Medios de pago](#3-medios-de-pago)
4. [Exploración: Home y catálogo](#4-exploración-home-y-catálogo)
5. [Sala de subasta en vivo (WebSocket)](#5-sala-de-subasta-en-vivo)
6. [Sistema de pujas](#6-sistema-de-pujas)
7. [Cierre automático de ítems y registro de venta](#7-cierre-automático-de-ítems)
8. [Selección de entrega (domicilio / retiro)](#8-selección-de-entrega)
9. [Confirmación de pago y notificación por email](#9-confirmación-de-pago)
10. [Sistema de multas](#10-sistema-de-multas)
11. [Administración de pagos y multas (admin)](#11-administración-admin)
12. [Vender artículo: envío para inspección](#12-vender-artículo)
13. [Mis artículos: seguimiento del estado de inspección](#13-mis-artículos)
14. [Condiciones de subasta: aceptar o rechazar](#14-condiciones-de-subasta)
15. [Perfil del usuario](#15-perfil-del-usuario)
16. [Estadísticas del comprador](#16-estadísticas)
17. [Datos de referencia: países y configuración empresa](#17-datos-de-referencia)
18. [Utilidades de desarrollo (reset de datos)](#18-utilidades-de-desarrollo)

---

## 1. Registro de usuarios

### Descripción
El registro se completa en cuatro pasos consecutivos: el usuario ingresa sus datos personales, espera la verificación de la empresa, define su contraseña definitiva y registra al menos un medio de pago.

### Condiciones del usuario
- No requiere estar registrado previamente.
- El documento (DNI) y el mail deben ser únicos en el sistema.

### Enunciado — párrafos de referencia
- **Líneas 19–27:** El mecanismo de registración se realiza en dos etapas. Primera etapa: nombre, apellido, domicilio legal y país de origen. Los datos son verificados externamente; si se acepta, se le asigna una categoría.
- **Línea 25:** Las categorías son común, especial, plata, oro y platino.
- **Línea 27:** Una vez finalizada la primera parte, se le envía un mail para completar el registro y generar su clave personal.
- **Líneas 29–31:** El usuario debe registrar al menos un medio de pago: cuentas bancarias, tarjetas de crédito o cheques certificados.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/auth.py` | `iniciar_registro()` · `POST /auth/registro/iniciar` | Crea `Persona` (estado="inactivo") + `PersonaDetalle` (claveTemporal=True). Valida documento y mail únicos. |
| `app/routers/auth.py` | `aprobar_registro()` · `POST /auth/registro/aprobar` | El empleado aprueba: pone `Persona.estado="activo"` y crea `Cliente` con la categoría asignada y `admitido="si"`. |
| `app/routers/auth.py` | `desaprobar_registro()` · `POST /auth/registro/desaprobar` | El empleado rechaza: crea `Cliente` con `admitido="no"`. |
| `app/routers/auth.py` | `get_pendientes()` · `GET /auth/registro/pendientes` | Lista personas sin `Cliente` aún (pendientes de verificación del empleado). |
| `app/routers/auth.py` | `cambiar_clave()` · `PUT /auth/cambiar-clave` | Hashea la nueva contraseña con bcrypt y pone `claveTemporal=False`. |
| `app/routers/medios_pago.py` | `create_tarjeta()` · `POST /mediosPago/tarjeta` | Valida: marca en {VISA, MASTERCARD, AMEX} y vencimiento futuro. Crea `MedioPago` (estado="pendiente") + `mpTarjeta`. |
| `app/routers/medios_pago.py` | `create_cuenta_bancaria()` · `POST /mediosPago/cuenta-bancaria` | Crea `MedioPago` + `mpCuentaBancaria`. |
| `app/routers/medios_pago.py` | `create_cheque_certificado()` · `POST /mediosPago/cheque` | Solo acepta `moneda="ARS"`. Crea `MedioPago` + `mpChequeCertificado` (con `monto_disponible = monto`). |
| `app/schemas.py` | `RegistroIniciarRequest`, `RegistroVerificacionRequest`, `TarjetaCreate`, `CuentaBancariaCreate`, `ChequeCertificadoCreate` | Contratos de entrada. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/register.tsx` | **Paso 1:** Formulario (nombre, apellido, DNI, mail, dirección, país). Llama `POST /auth/registro/iniciar`. Valida campo por campo antes de enviar. |
| `app/verification.tsx` | **Paso 2:** Pantalla de espera. Polling cada 10s vía `POST /auth/login` con contraseña vacía para detectar aprobación automáticamente. |
| `app/register_final.tsx` | **Paso 3:** Formulario de nueva contraseña (mínimo 8 caracteres, confirmación coincidente). Llama `PUT /auth/cambiar-clave`. |
| `app/payments.tsx` | **Paso 4:** Tres pestañas (Tarjeta / Cuenta / Cheque). Llama el endpoint correspondiente al presionar "Agregar". |
| `constants/api.ts` | Endpoints: `registroIniciar`, `cambiarClave`, `paises`, `medioPagoTarjeta`, `medioPagoCuenta`, `medioPagoCheque`. |

---

## 2. Login y gestión de sesión

### Descripción
Autenticación con email y contraseña. La sesión persiste en el dispositivo usando `expo-secure-store`. El layout raíz carga la sesión al iniciar la app y redirige según el estado del usuario.

### Condiciones del usuario
- Debe estar registrado y aprobado (`Cliente.admitido="si"`).
- Si tiene clave temporal, es redirigido a cambiarla antes de poder usar la app.

### Enunciado — párrafos de referencia
- **Línea 19:** La aplicación requiere que los postores estén registrados y se identifiquen antes de participar.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/auth.py` | `login()` · `POST /auth/login` | Valida credenciales con bcrypt, verifica que existe `Cliente`, que `admitido="si"`. Retorna el objeto `Usuario` completo. |
| `app/schemas.py` | `LoginRequest`, `Usuario` | `Usuario` incluye: identificador, nombre, mail, categoria, estado, claveTemporal, admitido. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/sign-in.tsx` | Formulario de login. Maneja los distintos estados: 401 (credenciales incorrectas), 403 no habilitado (error), 403 pendiente (navega a verificación), `claveTemporal=true` (navega a `register_final`), éxito (guarda sesión y navega a exploración). |
| `store/session.ts` | `SessionStore`: guarda en `expo-secure-store` (`save()`), carga al iniciar (`load()`), limpia al cerrar sesión (`clear()`). Mantiene copia en memoria para acceso síncrono (`get()`). |
| `app/_layout.tsx` | Carga sesión con `SessionStore.load()`. Si existe sesión válida, redirige a `/exploracion` sin pasar por login. |

---

## 3. Medios de pago

### Descripción
Los usuarios registran medios de pago que quedan en estado "pendiente" hasta ser verificados por un empleado. Solo los medios verificados pueden usarse para pujar y para pagar compras.

### Condiciones del usuario
- Estar logueado.
- El medio queda en `estado="pendiente"` hasta verificación por empleado (vía Swagger).

### Enunciado — párrafos de referencia
- **Líneas 29–31:** Pueden ser cuentas bancarias (nacionales o extranjeras), tarjetas de crédito, o cheques certificados entregados y verificados **antes del inicio de la subasta**.
- **Línea 42:** Solo podrá pujar si tiene al menos un medio verificado.
- **Línea 67:** Si el medio es un cheque certificado, las compras no pueden superar el monto garantizado.
- **Líneas 75–77:** Las subastas en USD deben pagarse en dólares. Cheques no válidos para USD.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/medios_pago.py` | `ep_update_estado()` · `PUT /mediosPago/{id}/estado?estado=` | **Solo empleado (Swagger).** Cambia estado a "verificado", "rechazado" o "pendiente". Valida que el estado sea uno de los tres valores permitidos. |
| `app/routers/medios_pago.py` | `_build_medio_pago_item()` | Helper privado: transforma modelo DB a schema de respuesta. Convierte `es_internacional "si"/"no"` → `bool`. Para cheques incluye `montoCheque` y `montoDisponibleCheque`. |
| `app/routers/medios_pago.py` | `ep_get_medios_pago_cliente()` · `GET /mediosPago?cliente_id=` | Lista todos los medios del cliente con el flag `tieneMedioPagoVerificado`. |
| `app/models.py` | `MedioPago`, `mpTarjeta`, `mpCuentaBancaria`, `mpChequeCertificado` | `MedioPago` es la cabecera; cada tipo tiene su tabla detalle con FK al medio. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/payments.tsx` | Tres pestañas con formularios propios. Al enviar llama el endpoint correspondiente. |

---

## 4. Exploración: Home y catálogo

### Descripción
El home filtra y muestra subastas accesibles según la categoría del usuario. La subasta destacada es la más próxima; las generales se muestran en scroll. Desde ahí se navega al catálogo y al detalle de cada artículo.

### Condiciones del usuario
- Estar logueado.
- Solo ve subastas con categoría ≤ a la suya. Un usuario "plata" ve comun, especial y plata.

### Enunciado — párrafos de referencia
- **Línea 35:** Los catálogos son públicos, pero solo los usuarios registrados pueden ver el precio base.
- **Líneas 37–38:** De cada artículo: descripción, precio base, dueño, ~6 imágenes. Para obras de arte: artista, fecha, historia.
- **Línea 40:** Para acceder a una subasta, la categoría del usuario debe ser ≥ a la de la subasta.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/catalogo.py` | `get_home()` · `GET /home?categoria=` | Filtra subastas `estado="abierta"` con categoría ≤ usuario (usando `CATEGORIA_ORDER` de utils). Subasta destacada: la primera, con actividad reciente (últimas 5 pujas del historial). Imagen en base64 real. |
| `app/routers/catalogo.py` | `get_catalogo_subasta()` · `GET /subastas/{id}/catalogo` | Lista todos los ítems con imagen base64, título, descripción corta, precio base y estado de subasta. |
| `app/routers/catalogo.py` | `get_detalle_producto_catalogo()` · `GET /subastas/{id}/catalogo/{productoId}` | Descripción completa, procedencia, precio base, imagen. |
| `app/utils.py` | `get_foto_b64()`, `CATEGORIA_ORDER` | `get_foto_b64()`: obtiene primera foto del producto como base64. `CATEGORIA_ORDER = {comun:1, especial:2, plata:3, oro:4, platino:5}`. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/exploracion/index.tsx` | Home: subasta destacada con badge "EN VIVO" y actividad reciente, grid de subastas generales con miniaturas, filtro por texto en cliente. |
| `app/exploracion/catalogo.tsx` | Lista de artículos de una subasta con estado visible. |
| `app/exploracion/detalle-lote.tsx` | Detalle completo con galería de imágenes y botón para entrar a la subasta en vivo. |
| `components/BottomTabBar.tsx` | Navegación inferior: Explorar / Mis Pujas / Vender / Perfil. |

---

## 5. Sala de subasta en vivo

### Descripción
El usuario se conecta a la sala via WebSocket. Recibe el estado actual del artículo en subasta y todas las actualizaciones en tiempo real. Al conectarse queda registrado como asistente (con número de postor).

### Condiciones del usuario
- Estar logueado con categoría ≥ categoría de la subasta.
- **No tener multas pendientes** de pago.
- No puede estar conectado a más de una subasta simultáneamente.

### Enunciado — párrafos de referencia
- **Líneas 15–17:** Subasta dinámica ascendente: los postores conocen las ofertas de la competencia.
- **Línea 40:** La categoría de la subasta debe ser ≤ a la del usuario.
- **Línea 44:** Cualquier usuario registrado puede seguir la subasta (incluso sin medio verificado).
- **Línea 58:** Los usuarios conectados reciben en tiempo real las modificaciones de las ofertas.
- **Línea 73:** Los usuarios no pueden estar conectados a más de una subasta a la vez.
- **Línea 81:** No se permite enviar otra puja hasta que la anterior fue confirmada y difundida.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/subastas.py` | `find_or_create_asistente()` · `POST /asistentes/registrar` | Crea o recupera el `Asistente`. Valida: categoría ≥ subasta (usando `CATEGORIA_ORDER`), sin multas pendientes. Asigna `numeroPostor = max + 1`. |
| `app/routers/subastas.py` | `get_subasta_en_vivo()` · `GET /subasta/{id}/vivo` | Estado actual: primer ítem no subastado, precio actual (máxima puja o precio base si no hay), proximaPuja, pujaMaxima, countdown al horario de la subasta, 3 incrementos sugeridos (1%/5%/10% del precio base), actividad reciente (últimas 5 pujas). |
| `app/routers/subastas.py` | `ws_subasta()` · `WS /ws/subasta/{id}?clienteId=` | Acepta conexión. Envía `auction_state` al conectar. Valida que el usuario no esté en otra subasta (F3). Escucha mensajes del cliente (keep-alive). |
| `app/routers/subastas.py` | `ConnectionManager` | Diccionario `active`: subasta_id → [websockets]. Diccionario `user_subasta`: cliente_id → subasta_id activa. `broadcast()` envía a todos los conectados a una subasta. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/exploracion/subasta-vivo.tsx` | Maneja toda la sala: conecta WS, muestra artículo actual, precios, countdown, actividad reciente. Mensajes WS: `auction_state` (actualiza UI), `bid_update` (nueva puja recibida), `item_closed` (ítem cerrado → si ganó, navega a cierre), `auction_ended` (subasta terminada), `error`. |

---

## 6. Sistema de pujas

### Descripción
El usuario puede pujar mientras el ítem está activo. Los límites mínimo y máximo se calculan sobre el precio base del artículo. Pujar exitosamente reinicia el countdown de 30s y difunde la actualización a todos.

### Condiciones del usuario
- Estar registrado como asistente en la subasta.
- Tener **al menos un medio de pago verificado**.
- Si solo tiene cheques: el importe no puede exceder el saldo disponible considerando compromisos previos.
- El importe debe respetar los límites (excepto en subastas oro/platino).

### Enunciado — párrafos de referencia
- **Línea 42:** Solo podrá pujar si tiene al menos un medio de pago verificado.
- **Líneas 50–52:** Monto mínimo = precio actual + 1% del precio base.
- **Líneas 53–54:** Monto máximo = precio actual + 20% del precio base.
- **Línea 56:** Límites NO aplican a subastas oro y platino.
- **Línea 67:** Si el medio es un cheque, las compras no pueden superar el monto garantizado.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/subastas.py` | `create_pujo()` | Valida (en orden): asistente existe, ítem no cerrado, ítem pertenece a la subasta del asistente, **F2** (al menos un medio verificado), **F5** (límite cheque si todos los medios son cheques), límites mínimo/máximo (si no es oro/platino). Crea `Pujo` (ganador="si", anterior pasa a "no") + `HistorialPujos`. |
| `app/routers/subastas.py` | `ep_pujar()` · `POST /pujar` | Endpoint async: llama a `create_pujo()`, maneja errores con HTTP codes específicos, y si OK: broadcast `bid_update` vía WebSocket + cancela timer anterior + crea nuevo timer de 30s. |
| `app/models.py` | `Pujo`, `HistorialPujos` | `Pujo`: solo el ganador actual tiene `ganador="si"`. `HistorialPujos`: registro cronológico de todas las pujas (permite auditoría). |

#### Reglas de negocio F2 y F5

```
F2 — Verificación de medio de pago:
  db.query(MedioPago).filter(cliente == X, estado == "verificado").first()
  Si None → error "sin_medio_verificado" (403)

F5 — Límite de cheque (solo si TODOS los medios verificados son cheques):
  monto_disponible = sum(cheque.monto_disponible for all cheques verificados)
  pujas_ganadas = sum(Pujo.importe where ganador="si" del cliente)
  ya_pagado = sum(RegistroSubasta.importe where pagado="si" del cliente)
  compromiso_pendiente = max(0, pujas_ganadas - ya_pagado)
  Si compromiso_pendiente + importe_nuevo > monto_disponible → error "excede_cheque" (422)
```

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/exploracion/subasta-vivo.tsx` | Botones de incremento rápido (+1%/+5%/+10% del precio base sobre el precio actual). Input manual. Validación en cliente antes de enviar (≥ proximaPuja, ≤ pujaMaxima). Muestra todos los errores del back. |

---

## 7. Cierre automático de ítems

### Descripción
Cuando no llegan nuevas pujas durante 30 segundos (configurable), el ítem se cierra: se registra la venta, se notifica a todos los conectados con el ganador, y se pasa al siguiente ítem. Si nadie pujó, la empresa compra al precio base.

### Condiciones
- Proceso automático del servidor. No requiere acción del usuario.

### Enunciado — párrafos de referencia
- **Líneas 60–61:** Cuando ya nadie puja, el último postor es el nuevo dueño. Se registra la venta con el medio de pago y los datos del usuario.
- **Línea 105:** Si nadie puja, la empresa compra al precio base al finalizar la subasta.

### Backend

| Archivo | Función | Responsabilidad |
|---------|---------|-----------------|
| `app/routers/subastas.py` | `_cerrar_item()` (async task) | Espera `AUCTION_ITEM_TIMEOUT` segundos (env var, default 30). Al expirar: `ItemCatalogo.subastado="si"`, crea `RegistroSubasta` (ganador real o Casa de Subastas si nadie pujó), calcula `comision = importe × comision% / 100`. Broadcast `item_closed` con `ganadorClienteId`. Si quedan ítems: broadcast `auction_state`. Si no: broadcast `auction_ended`. |
| `app/routers/subastas.py` | `_item_timers: dict[int, Task]` | Diccionario global. Cada nueva puja cancela el timer anterior del ítem (`existing.cancel()`) y crea uno nuevo. El timer se elimina del dict al completar. |
| `app/models.py` | `RegistroSubasta` | `importe`, `comision`, `medio_pago`, `pagado` ("no"→"pendiente"→"si"/"vencido"), `metodo_envio`, `costo_envio`, `fecha_limite_pago`. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/exploracion/subasta-vivo.tsx` | Maneja `item_closed`: si `ganadorClienteId == session.identificador` → navega a `/cierre-subasta/winner?subastaId=&clienteId=`. Maneja `auction_state` (nuevo ítem). Maneja `auction_ended` (muestra mensaje final). |

---

## 8. Selección de entrega

### Descripción
El ganador elige cómo recibir los artículos: envío a domicilio (con costo, dirección tomada del registro) o retiro personal (sin costo pero sin cobertura de seguro durante el retiro).

### Condiciones del usuario
- Haber ganado al menos un ítem en la subasta.

### Enunciado — párrafos de referencia
- **Línea 63:** Se le informa el importe a pagar indicando lo pujado, las comisiones y el costo de enviarlo **a la dirección declarada**.
- **Línea 65:** El usuario puede retirar personalmente, pero pierde la cobertura del seguro.
- **Línea 103:** El envío está a cargo del comprador y se incluye en la factura de compra.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/compras.py` | `confirmar_envio()` · `POST /subasta/{sid}/{uid}/compras/envio?metodoEnvio=` | Valida metodoEnvio ∈ {domicilio, retiro}. Actualiza todos los `RegistroSubasta` del usuario en esa subasta con `metodo_envio` y `costo_envio` (lee `ConfiguracionEmpresa["costo_envio_domicilio"]`; 0 si retiro). |
| `app/routers/compras.py` | `get_precio_total()` · `GET /subasta/{sid}/{uid}/compras/precio` | Suma `importe + comision + costo_envio` de todos los `RegistroSubasta` pendientes. |
| `app/routers/personas.py` | `ep_get_perfil()` · `GET /clientes/{id}/perfil` | Retorna `nombre`, `mail`, **`direccion`** (de `Persona`), categoria, admitido, numeroPais. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/cierre-subasta/delivery-details.tsx` | Radio buttons domicilio/retiro. Carga dirección real del usuario (`/clientes/{id}/perfil`). Muestra desglose: pujado + comisión + envío (si domicilio). Advertencia de pérdida de seguro al elegir retiro. |

---

## 9. Confirmación de pago

### Descripción
El usuario selecciona su medio de pago verificado. El sistema valida la compatibilidad con la moneda de la subasta y, si todo está bien, registra el pago como "pendiente", envía un email con el detalle y el link de pago, y queda en espera de confirmación del admin.

### Condiciones del usuario
- Tener medios de pago **verificados**.
- Si la subasta es en USD: el medio debe ser USD (cuenta bancaria o tarjeta internacional). Cheques no válidos.
- Si paga con cheque: el saldo disponible debe cubrir el total.

### Enunciado — párrafos de referencia
- **Líneas 60–63:** Se registra la venta con el medio de pago. Se informa al usuario el importe, comisiones y costo de envío.
- **Líneas 75–77:** Las subastas en USD deben cancelarse en dólares: transferencia bancaria o tarjeta internacional.
- **Línea 69:** Si no posee el dinero, recibe una multa del 10% y tiene 72hs para presentar los fondos.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/compras.py` | `confirmar_pago()` · `POST /subasta/{sid}/{uid}/compras/pagar?metodoPagoId=` | Valida: medio verificado, moneda USD compatible, hay compras pendientes. **Si cheque insuficiente**: genera `Multa` inmediata + email de multa + retorna error. **Si OK**: pone `pagado="pendiente"`, `fecha_limite_pago=+72hs`, envía email de pago (async task). |
| `app/email_service.py` | `send_payment_notification()` | Email HTML: tabla de ítems (título/puja/comisión), costo de envío, total, link `https://pay.mercadosubastas.com/checkout/{uuid}`, deadline. Usa Gmail SMTP con App Password desde `APIMercadoSubastas/.env`. |
| `app/email_service.py` | `send_multa_notification()` | Email rojo: monto de la multa (10% del pujado), importe original, deadline de 72hs, link de pago. |
| `app/models.py` | `RegistroSubasta.pagado` | `"no"` → recién creado al cierre. `"pendiente"` → medio registrado, email enviado. `"si"` → confirmado admin. `"vencido"` → no pagó en 72hs. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/cierre-subasta/confirm-payment.tsx` | Lista medios verificados (ícono, nombre, saldo si cheque). Resumen: pujado + comisión + envío = total. Botón "Confirmar y recibir link de pago". Tras éxito: pantalla "Email enviado" con deadline. **No marca el pago como hecho** — queda pendiente del admin. |
| `app/cierre-subasta/winner.tsx` | Lista artículos ganados con imagen, título y precio. Desglose: precioFinal, comision, envio (si aplica), total. |

---

## 10. Sistema de multas

### Descripción
Una multa equivalente al 10% del importe pujado se genera cuando el pago falla. El usuario queda bloqueado para participar en nuevas subastas hasta pagarla. Tiene 72hs para presentar los fondos del pago original.

### Condiciones del usuario
- La multa puede generarse a cualquier usuario con compras que no puede/quiere pagar.
- Con multa pendiente no puede registrarse en nuevas subastas.

### Enunciado — párrafos de referencia
- **Línea 69:** Si no posee el dinero, multa del 10% del valor ofertado. Debe abonarla antes de otra subasta. Tiene 72hs para presentar los fondos originales.
- **Línea 71:** Si no cumple, el caso se deriva a la justicia y el usuario pierde acceso a todos los servicios.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/compras.py` | `confirmar_pago()` | Si cheque insuficiente → `Multa(cliente, subasta, monto=importe×10%, pagado="no", fecha_limite=+72hs)`. |
| `app/routers/admin.py` | `ep_rechazar_pago()` · `POST /admin/pagos/{id}/rechazar` | Admin detecta pago no recibido en 72hs → crea `Multa` + `RegistroSubasta.pagado="vencido"`. |
| `app/routers/subastas.py` | `find_or_create_asistente()` | Antes de registrar al usuario en una subasta, verifica `Multa.pagado="no"`. Si existe → error 403. |
| `app/routers/compras.py` | `ep_get_multas()` · `GET /multas/{clienteId}` | Lista multas sin pagar del usuario. |
| `app/routers/compras.py` | `ep_pagar_multa()` · `POST /multas/{id}/pagar` | Marca `Multa.pagado="si"` (sujeto a confirmación admin). |
| `app/models.py` | `Multa` | cliente, subasta, monto, pagado ("si"/"no"), fecha_limite. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/perfil/index.tsx` | Si `GET /multas/{id}` retorna lista no vacía: muestra botón rojo "Multas pendientes (N)" con badge. |

---

## 11. Administración (admin)

### Descripción
Endpoints para uso exclusivo del personal de la empresa vía Swagger. Permiten confirmar o rechazar pagos y gestionar multas. No hay pantalla en la app móvil.

### Enunciado — párrafos de referencia
- **Líneas 60–63:** La empresa registra la venta y emite la notificación.
- **Línea 69:** La empresa detecta la falta de pago y genera la multa.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/admin.py` | `ep_pagos_pendientes()` · `GET /admin/pagos/pendientes` | Lista todos los `RegistroSubasta` con `pagado="pendiente"`: nombre, mail, total, moneda, método, deadline. |
| `app/routers/admin.py` | `ep_confirmar_pago()` · `POST /admin/pagos/{id}/confirmar` | `pagado="si"` + email de confirmación al comprador. |
| `app/routers/admin.py` | `ep_rechazar_pago()` · `POST /admin/pagos/{id}/rechazar` | `pagado="vencido"` + crea `Multa` (10%) + email de multa. |
| `app/routers/admin.py` | `ep_multas_pendientes()` · `GET /admin/multas/pendientes` | Lista todas las multas sin pagar. |
| `app/routers/admin.py` | `ep_confirmar_pago_multa()` · `POST /admin/multas/{id}/confirmar-pago` | `Multa.pagado="si"` → usuario desbloqueado para nuevas subastas. |
| `app/email_service.py` | `send_payment_confirmed_notification()` | Email verde de confirmación al comprador. |

---

## 12. Vender artículo

### Descripción
Un usuario puede enviar un artículo para que la empresa lo evalúe. El flujo tiene dos fases: primero se completa el formulario (que crea el artículo en el sistema), luego se suben las fotos con los slots habilitados.

### Condiciones del usuario
- Estar logueado.
- Completar título, categoría, descripción completa y marcar la declaración legal.
- Subir al menos 1 foto para poder continuar (recomendado: 6).

### Enunciado — párrafos de referencia
- **Líneas 85–87:** Ingresar datos del bien, fotos (al menos 6) y cualquier dato histórico. Declarar que le pertenece sin impedimentos.
- **Línea 89:** Acreditar el origen lícito del bien.
- **Líneas 91–92:** Si la empresa está interesada, el usuario debe enviarlo a la dirección indicada para inspección. Acepta que si es rechazado, la devolución tiene cargo.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/vender.py` | `submit_articulo()` · `POST /articulos/` | Valida que el cliente existe. Si no existe `Duenio` → lo crea. Crea: `Producto`, `ProductoPresentacion` (estado="publicado"), `InspeccionProducto` (estado="pendiente"). |
| `app/routers/catalogo.py` | `ep_create_foto()` · `POST /fotos/` | Decodifica base64 a bytes. Si el base64 es inválido: error 422. Crea `Foto` vinculada al producto. |
| `app/routers/vender.py` | `ep_get_configuracion()` · `GET /config/direccion_inspeccion` | Dirección a la que enviar el artículo. |
| `app/models.py` | `Producto`, `ProductoPresentacion`, `Foto`, `InspeccionProducto` | `InspeccionProducto`: estado ("pendiente"/"aprobado"/"rechazado"), observaciones, costo_devolucion, fecha_ultima_actualizacion. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/vender/index.tsx` | **Fase 1** (submitted=false): formulario + checkbox + botón "Enviar Artículo" (requiere título, descripción y checkbox). Los 6 slots de fotos aparecen deshabilitados. **Fase 2** (submitted=true): banner verde de éxito, slots habilitados para subir fotos, contador "X/6 fotos". Botón "Continuar" aparece cuando hay ≥ 1 foto. |

---

## 13. Mis artículos

### Descripción
Lista de todos los artículos enviados por el usuario vendedor, con su estado actual de inspección. Permite acceder a las condiciones si fue aprobado o ver el rechazo si fue rechazado.

### Condiciones del usuario
- Estar logueado.
- Haber enviado al menos un artículo.

### Enunciado — párrafos de referencia
- **Línea 95:** La empresa informa al usuario si el bien fue aceptado o no **a través de la app**.
- **Línea 97:** Si no lo acepta, el usuario puede ver las **causas del rechazo** a través de la app.
- **Línea 99:** Si lo acepta, se informa fecha, hora, lugar, valor base y comisiones.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/vender.py` | `get_articulos_cliente()` · `GET /clientes/{id}/articulos` | Por cada `Producto` donde `duenio == clienteId`: busca `ProductoPresentacion`, `InspeccionProducto`, y si está en `ItemCatalogo` con `subastado="si"`. Retorna `ArticuloListItem` con todos los estados. |
| `app/schemas.py` | `ArticuloListItem` | productoId, presentacionId, titulo, categoria, fechaEnvio, **estadoInspeccion**, **observaciones**, **costoDevolucion**, enSubasta. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/vender/mis-articulos.tsx` | Lista con badges de estado (PENDIENTE / APROBADO / RECHAZADO / EN SUBASTA). Si rechazado: muestra observaciones y costo de devolución. Si aprobado: botón "Ver condiciones". Muestra dirección de inspección desde `GET /config/direccion_inspeccion`. |
| `app/vender/inspeccion-rechazada.tsx` | Detalle del rechazo. Recibe `observaciones` y `costoDevolucion` via `useLocalSearchParams`. |

---

## 14. Condiciones de subasta: aceptar o rechazar

### Descripción
Cuando la empresa aprueba un artículo, lo asigna a un catálogo con precio base y comisión. Esto crea automáticamente un registro de aceptación pendiente. El dueño puede ver las condiciones y aceptarlas o rechazarlas.

### Condiciones del usuario
- Ser el dueño del artículo.
- El artículo debe haber sido asignado a un `ItemCatalogo` por el admin (via `POST /items-catalogo/`).

### Enunciado — párrafos de referencia
- **Línea 99:** Si lo acepta, el bien se incluye en la subasta informando fecha, hora, lugar, valor base y comisiones.
- **Línea 101:** El usuario puede **no aceptar** el valor base o las comisiones. En ese caso se procede a la devolución informando los gastos.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/vender.py` | `get_condiciones_articulo()` · `GET /articulos/{id}/condiciones` | Retorna condiciones si el artículo está en un `ItemCatalogo`: precio base, comisión, fecha/hora/ubicación de la subasta y estado de aceptación. |
| `app/routers/vender.py` | `_set_aceptacion()` · `POST /articulos/{id}/aceptar` y `/rechazar` | Actualiza `AceptacionArticulo.estado` ("aceptado" o "rechazado") con timestamp. |
| `app/routers/catalogo.py` | `ep_create_item_catalogo()` · `POST /items-catalogo/` | Al agregar el artículo al catálogo, crea automáticamente `AceptacionArticulo(producto, estado="pendiente")` si no existe. |
| `app/models.py` | `AceptacionArticulo` | producto (FK único), estado ("pendiente"/"aceptado"/"rechazado"), fecha. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/vender/articulo-aprobado.tsx` | Muestra: precio base, comisión, fecha/hora/ubicación de la subasta, estado actual. Botones "Aceptar" y "Rechazar" visibles solo si estado="pendiente". |

---

## 15. Perfil del usuario

### Descripción
Muestra los datos personales completos del usuario: nombre, correo, dirección, categoría, país y estado de la cuenta. Incluye alerta de multas pendientes y acceso a estadísticas.

### Condiciones del usuario
- Estar logueado.

### Enunciado — párrafos de referencia
- **Línea 25:** La categoría determina a qué subastas puede acceder el usuario.
- **Línea 83:** El usuario puede ver métricas de su actividad.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/personas.py` | `ep_get_perfil()` · `GET /clientes/{id}/perfil` | Join de `Cliente` + `Persona` + `PersonaDetalle`. Retorna: identificador, nombre, mail, **direccion**, categoria, admitido, numeroPais. |
| `app/routers/lookup.py` | `ep_read_pais()` · `GET /paises/{numero}` | Retorna nombre del país para mostrar en pantalla. |
| `app/routers/compras.py` | `ep_get_multas()` · `GET /multas/{clienteId}` | Lista multas pendientes para el badge de alerta. |
| `app/schemas.py` | `PerfilCompletoResponse` | identificador, nombre, mail, direccion, categoria, admitido, numeroPais. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/perfil/index.tsx` | Carga datos reales de `/clientes/{id}/perfil` (no del SessionStore). Muestra campos con etiquetas. Badge rojo "Multas pendientes (N)" si hay multas. Botón "Mis Estadísticas". Botón "Cerrar Sesión". |

---

## 16. Estadísticas

### Descripción
Métricas de la actividad del usuario como comprador: cantidad de subastas, pujas ganadas, total invertido e historial de las últimas 10 pujas con su resultado.

### Condiciones del usuario
- Estar logueado.

### Enunciado — párrafos de referencia
- **Línea 83:** La aplicación debería dar métricas sobre: cantidad de subastas, participaciones, importes pagados y ofertados, veces que ganó.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/vender.py` | `get_estadisticas_cliente()` · `GET /clientes/{id}/estadisticas` | `subastasTotales`: count de subastas distintas en `HistorialPujos`. `pujasGanadas`: count de `Pujo.ganador="si"`. `totalInvertido`: sum de `RegistroSubasta.importe`. `historial`: últimas 10 entradas de `HistorialPujos` con título del artículo y si el pujo final fue ganador. |
| `app/schemas.py` | `EstadisticasCliente`, `HistorialItemEstadisticas` | subastasTotales, pujasGanadas, totalInvertido, historial[{titulo, fecha, importe, ganada}]. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/perfil/estadisticas.tsx` | Cards con métricas numéricas. Lista de historial con título, fecha formateada, importe y badge "GANADA" / "SUPERADA". |

---

## 17. Datos de referencia

### Descripción
Información estática de apoyo: países para formularios de registro y medios de pago, y configuración de la empresa para direcciones, costos y datos del seguro.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/lookup.py` | `GET /paises/` · `GET /paises/{numero}` | Lista todos los países o retorna uno. También tiene `POST` y `DELETE` para gestión admin. |
| `app/routers/vender.py` | `ep_get_configuracion()` · `GET /config/{clave}` | Retorna el valor de cualquier clave de `ConfiguracionEmpresa`. |
| `scripts/seed.py` | `seed_paises()` | Carga: Argentina (1), Uruguay (2), Paraguay (3), Chile (4). |
| `scripts/seed.py` | `seed_configuracion()` | Carga: `direccion_inspeccion`, `direccion_deposito`, `costo_envio_domicilio` ($5.000 ARS), `compania_seguro` ("Seguros del Sur S.A."). |

### Frontend — dónde se consume

| Archivo | Endpoint consumido |
|---------|-------------------|
| `app/register.tsx` | `GET /paises/` → dropdown de país de origen |
| `app/payments.tsx` | `GET /paises/` → país del banco en cuenta bancaria |
| `app/perfil/index.tsx` | `GET /paises/{numero}` → nombre del país del usuario |
| `app/cierre-subasta/delivery-details.tsx` | `GET /clientes/{id}/perfil` → dirección de envío |
| `app/vender/mis-articulos.tsx` | `GET /config/direccion_inspeccion` → dirección donde enviar el artículo |

---

## 18. Utilidades de desarrollo

### Descripción
Endpoints para facilitar el testing: resetear usuarios o subastas sin reiniciar Docker. Solo deben usarse en desarrollo.

### Backend

| Archivo | Función / Endpoint | Responsabilidad |
|---------|-------------------|-----------------|
| `app/routers/dev.py` | `reset_usuarios()` · `DELETE /dev/reset/usuarios` | Borra en orden correcto (respetando FKs): HistorialPujos → Pujo → Asistente → detalle medios → MedioPago → RegistroSubasta → Multa → Cliente → Duenio → Subastador → PersonaDetalle → Persona. Preserva subastas, productos y configuración. |
| `app/routers/dev.py` | `reset_subasta()` · `DELETE /dev/reset/subasta/{id}` | Cancela los `asyncio.Task` del timer activo (importa `_item_timers` de subastas.py). Borra pujas, historial, asistentes y registros de venta. Resetea `ItemCatalogo.subastado="no"`. Permite repetir la misma subasta. |

### Script de seed — resumen de datos de prueba

| Función | Usuario / Datos | Para testear |
|---------|-----------------|-------------|
| `seed_usuario_prueba()` | `prueba@test.com` / `Prueba1.` — cuenta bancaria ARS verificada | Login, pujas, pago |
| `seed_usuario_prueba_2()` | `prueba2@test.com` / `Prueba2.` — tarjeta VISA ARS verificada | Pujas múltiples usuarios |
| `seed_usuario_cheque()` | `cheque@test.com` / `Cheque1.` — cheque $50k verificado | F5 (límite saldo), multa por cheque insuficiente |
| `seed_usuario_especial()` | `especial@test.com` / `Especial1.` — categoría especial | Acceso a subastas especial+ |
| `seed_subastas()` | 2 subastas comun, 5 artículos | Flujo base de exploración y pujas |
| `seed_subastas_categorias()` | 1 subasta por especial/plata/oro/platino | Acceso filtrado por categoría |
| `seed_subasta_usd()` | Subasta en USD (American Eagle, $1.800 USD) | Pago en dólares |
| `seed_historial_prueba()` | Pujas históricas de `prueba@test.com` | Pantalla de estadísticas |
| `seed_articulos_vendedor()` | 3 artículos de `prueba@test.com`: pendiente / aprobado / rechazado | Pantalla "mis artículos" |
| `seed_compras_prueba()` | (Manual) 2 ítems ganados por `prueba@test.com` | Cierre de subasta y pago |

---

## Apéndice — Arquitectura de archivos

```
APIMercadoSubastas/
├── app/
│   ├── main.py              ← Registra todos los routers + ejecuta seeds al iniciar
│   ├── models.py            ← 25+ clases SQLAlchemy (tablas de BD)
│   ├── schemas.py           ← Schemas Pydantic para request/response
│   ├── database.py          ← Conexión PostgreSQL via DATABASE_URL (.env)
│   ├── utils.py             ← get_foto_b64(), CATEGORIA_ORDER
│   ├── email_service.py     ← Gmail SMTP (aiosmtplib) — 3 templates de email
│   └── routers/
│       ├── auth.py          ← Registro, login, cambio de clave
│       ├── medios_pago.py   ← Tarjetas, cuentas bancarias, cheques, verificación
│       ├── catalogo.py      ← Productos, fotos, catálogos, home, items
│       ├── subastas.py      ← Subastas, asistentes, pujas, WebSocket, cierre automático
│       ├── compras.py       ← Compras post-subasta, entrega, pago, multas
│       ├── personas.py      ← Clientes, empleados, dueños, subastadores, sectores, perfil
│       ├── lookup.py        ← Países (información de referencia estática)
│       ├── vender.py        ← Artículos del vendedor, condiciones, estadísticas, config
│       ├── admin.py         ← Confirmación/rechazo de pagos y multas (solo Swagger)
│       └── dev.py           ← Reset de datos para testing
├── scripts/
│   └── seed.py              ← 12 funciones de datos iniciales y de prueba
└── .env                     ← DATABASE_URL, GMAIL_USER, GMAIL_APP_PASSWORD (NO commitear)

FrontMercadoSubastas/
├── app/
│   ├── _layout.tsx              ← Root layout: carga sesión, define navegación raíz
│   ├── index.tsx                ← Pantalla de bienvenida
│   ├── sign-in.tsx              ← Login
│   ├── register.tsx             ← Registro paso 1 (datos personales)
│   ├── register_final.tsx       ← Registro paso 3 (nueva contraseña)
│   ├── verification.tsx         ← Registro paso 2 (espera aprobación del empleado)
│   ├── payments.tsx             ← Registro paso 4 (medios de pago)
│   ├── exploracion/
│   │   ├── index.tsx            ← Home (subastas destacada y generales)
│   │   ├── catalogo.tsx         ← Catálogo de artículos de una subasta
│   │   ├── detalle-lote.tsx     ← Detalle de un artículo específico
│   │   └── subasta-vivo.tsx     ← Sala en vivo (WebSocket + pujas)
│   ├── perfil/
│   │   ├── index.tsx            ← Perfil del usuario + alert de multas
│   │   └── estadisticas.tsx     ← Métricas de participación
│   ├── vender/
│   │   ├── index.tsx            ← Enviar artículo (formulario 2 fases + fotos)
│   │   ├── mis-articulos.tsx    ← Seguimiento de artículos enviados
│   │   ├── articulo-aprobado.tsx    ← Ver condiciones y aceptar/rechazar
│   │   ├── inspeccion-rechazada.tsx ← Detalle del rechazo
│   │   └── ubicacion-seguro.tsx    ← Ubicación del depósito y seguro
│   └── cierre-subasta/
│       ├── winner.tsx           ← Resumen de artículos ganados
│       ├── delivery-details.tsx ← Selección de entrega + dirección real
│       └── confirm-payment.tsx  ← Selección de medio + "email enviado" con deadline
├── components/
│   └── BottomTabBar.tsx     ← Barra de navegación inferior (4 tabs)
├── store/
│   └── session.ts           ← SessionStore: persiste sesión en expo-secure-store
└── constants/
    └── api.ts               ← Todos los endpoints del back centralizados
```
