# Plan de Testing — Mercado Subastas

> **Convenciones**
> - 📱 = acción desde la app (Expo Go en el celu)
> - 🔧 = acción en Swagger (`http://localhost:8000/docs`)
> - ✅ = resultado esperado si todo funciona
> - ❌ = comportamiento esperado en caso de error/validación
> - **Archivos back** = routers afectados
> - **Archivos front** = pantallas/componentes afectados

---

## Preparación del ambiente

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| P.1 | `docker compose up` en la raíz del proyecto | Contenedor corriendo; logs de `subastas_api` muestran: `✓ Países cargados`, `✓ Empleados cargados`, `✓ Subastas y catálogos creados`, `✓ Usuario prueba@test.com creado`, `✓ Configuración de empresa cargada` |
| P.2 | `cd FrontMercadoSubastas && npx expo start` | QR visible en terminal |
| P.3 | Abrir **Expo Go** y escanear QR | App carga, pantalla de bienvenida visible |
| P.4 | Abrir `http://localhost:8000/docs` | Swagger cargado con todos los endpoints |
| P.5 | *(Reset completo)* `docker compose down -v && docker compose up` | Borra el volumen de Postgres y re-seedea todo desde cero |

**Usuarios precargados por el seed:**

| Usuario | Contraseña | Categoría | Medio de Pago | Estado |
|---------|-----------|-----------|---------------|--------|
| prueba@test.com | Prueba1. | comun | Cuenta bancaria ARS (Banco Nación, CBU: 0110012340012345678901) — **verificado** | activo, admitido |
| prueba2@test.com | Prueba2. | comun | Tarjeta VISA crédito (últimos 4: 4321, vence 12/2027) — **verificado** | activo, admitido |

**Subastas precargadas:**

| Subasta | Categoría | Fecha | Items |
|---------|-----------|-------|-------|
| Antigüedades — Lote 1 | comun | hoy + 30 días | Reloj Suizo ($150k), Jarrón Ming ($320k), Bodegón Flamenco ($280k) |
| Arte y Numismática — Lote 2 | comun | hoy + 45 días | Monedas Romanas ($85k), Silla Luis XV ($195k) |
| Especial — Lote A | especial | hoy + 10 días | Broche victoriano ($200k), Telescopio ($175k) |
| Plata — Lote A | plata | hoy + 12 días | Escultura Art Déco ($450k), Piano Bösendorfer ($1.8M) |
| Oro — Lote A | oro | hoy + 15 días | Collar diamantes ($3.5M), Reloj Patek ($9.5M) |
| Platino — Lote A | platino | hoy + 8 días | Picasso ($85M), Diamante azul ($120M) |

---

## Flujo 1 — Registro de usuario nuevo

**Archivos back:** `routers/auth.py` → `iniciar_registro()`, `aprobar_registro()`
**Archivos front:** `app/register.tsx`, `app/verification.tsx`, `app/register_final.tsx`, `app/payments.tsx`

### 1A. Registro exitoso (happy path)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 1A.1 | 📱 `login.tsx` (bienvenida) | Tocás **"Registrarse"** | Navegás a `register.tsx` — barra progreso en Paso 1 de 4 |
| 1A.2 | 📱 `register.tsx` | Completás todos los campos: Nombre `"Carlos"`, Apellido `"Lopez"`, DNI `"55443322"`, Mail `"carlos@test.com"`, Dirección `"Av. Test 123"`, País `"Argentina"` | Campos sin borde rojo |
| 1A.3 | 📱 `register.tsx` | Tocás **"Enviar para Verificación"** | POST `/auth/registro/iniciar` → respuesta `{"mensaje": "Registro iniciado exitosamente", "personaId": X}` → navegás a `verification.tsx` |
| 1A.4 | 📱 `verification.tsx` | Ves pantalla de espera | Texto "Verificando cada 10 segundos", polling activo en background |
| 1A.5 | 🔧 Swagger `GET /auth/registro/pendientes` | Sin params | Lista con Carlos: `{"personaId": X, "nombre": "Carlos Lopez", "documento": "55443322", "mail": "carlos@test.com", "pais": 1}` — anotás el `personaId` |
| 1A.6 | 🔧 Swagger `POST /auth/registro/aprobar` | `{"personaId": X, "verificador": 1, "categoria": "comun"}` | `{"mensaje": "Registro aprobado exitosamente"}` — en DB: Cliente creado con admitido="si", categoria="comun" |
| 1A.7 | 📱 `verification.tsx` | Esperás hasta ~10s (próximo polling) | App navega automáticamente a `register_final.tsx` — Paso 3 de 4 |
| 1A.8 | 📱 `register_final.tsx` | Ves "¡Verificación aprobada!" + campo contraseña | Paso 3 de 4 visible |
| 1A.9 | 📱 `register_final.tsx` | Ingresás `"Carlos123."` + confirmás | PUT `/auth/cambiar-clave` → `{"mensaje": "Contraseña actualizada correctamente"}` → navegás a `payments.tsx` |
| 1A.10 | 📱 `payments.tsx` | Ves formulario para registrar medio de pago | Paso 4 de 4 visible; pestañas Tarjeta / Cuenta / Cheque |
| 1A.11 | 📱 `payments.tsx` | Seleccionás **Tarjeta**, completás: Titular `"Carlos Lopez"`, últimos 4 `"1234"`, vencimiento `12/2027`, Marca `VISA`, Tipo `Crédito`, ¿Internacional? No | Formulario lleno |
| 1A.12 | 📱 `payments.tsx` | Tocás **"Agregar"** | POST `/mediosPago/tarjeta` → 201 `TarjetaResponse` → mensaje de éxito → navegás a `/exploracion` |

### 1B. Validaciones en el formulario de registro

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 1B.1 | 📱 `register.tsx` | Tocás "Enviar" con todos los campos vacíos | ❌ Alert "Campos Incompletos" — campos en rojo |
| 1B.2 | 📱 `register.tsx` | DNI con letras: `"ABC123"` | ❌ Alert "Documento Inválido — solo números" |
| 1B.3 | 📱 `register.tsx` | Mail sin @: `"carlostest.com"` | ❌ Alert "Correo Inválido — debe contener @" |
| 1B.4 | 📱 `register.tsx` | Registrás con DNI `"99999999"` (ya existe) | ❌ POST retorna 409 → Alert "Ya existe una cuenta con esos datos" |
| 1B.5 | 📱 `register.tsx` | Registrás con mail `"prueba@test.com"` (ya existe) | ❌ POST retorna 409 → Alert "Ya existe una cuenta con esos datos" |
| 1B.6 | 📱 `register_final.tsx` | Contraseña con menos de 8 caracteres | ❌ Validación cliente — no llama al back |
| 1B.7 | 📱 `register_final.tsx` | Contraseñas no coinciden | ❌ Validación cliente — no llama al back |

### 1C. Registro rechazado por empleado

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 1C.1 | 📱 + 🔧 | Registrás usuario nuevo → esperás pendiente → 🔧 `POST /auth/registro/desaprobar` con `{personaId: X, verificador: 1}` | `{"mensaje": "Registro desaprobado exitosamente"}` — Cliente creado con admitido="no" |
| 1C.2 | 📱 `verification.tsx` | Próximo polling detecta estado rechazado | App muestra UI de rechazo: "Tu solicitud fue rechazada" |

---

## Flujo 2 — Login

**Archivos back:** `routers/auth.py` → `login()`
**Archivos front:** `app/sign-in.tsx`, `store/session.ts`

### 2A. Login exitoso

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 2A.1 | 📱 `sign-in.tsx` | Ingresás `prueba@test.com` / `Prueba1.` → tocás **"INICIAR SESIÓN"** | POST `/auth/login` → 200 `Usuario` → `SessionStore.save()` → navegás a `/exploracion` |
| 2A.2 | 📱 `sign-in.tsx` | Cerrás y volvés a abrir la app | `_layout.tsx` llama `SessionStore.load()` → si hay sesión guardada en SecureStore, navega directo a `/exploracion` sin pasar por login |

### 2B. Validaciones de login

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 2B.1 | 📱 `sign-in.tsx` | Tocás "INICIAR SESIÓN" con campos vacíos | ❌ "Por favor ingresá tu correo" (validación cliente) |
| 2B.2 | 📱 `sign-in.tsx` | Mail sin formato válido (`"noesunmail"`) | ❌ "Por favor ingresá un correo válido" |
| 2B.3 | 📱 `sign-in.tsx` | Mail correcto pero contraseña incorrecta | ❌ 401 → "Mail o contraseña incorrectos." |
| 2B.4 | 📱 `sign-in.tsx` | Mail no registrado | ❌ 401 → "Mail o contraseña incorrectos." |
| 2B.5 | 📱 `sign-in.tsx` | Usuario con registro pendiente de verificación | ❌ 403 → navegás a `/verification` (polling retoma) |
| 2B.6 | 📱 `sign-in.tsx` | Usuario con clave temporal (recién aprobado) | 200 + claveTemporal=true → navegás a `/register_final` |
| 2B.7 | 📱 `sign-in.tsx` | Usuario con admitido="no" (rechazado) | ❌ 403 → "Tu cuenta no fue habilitada. Contactá a la casa de subastas." |

### 2C. Logout

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 2C.1 | 📱 `perfil/index.tsx` | Tocás **"Cerrar Sesión"** | `SessionStore.clear()` → navega a `/sign-in` — SecureStore limpiado |
| 2C.2 | 📱 cualquier pantalla protegida | Refresco forzado sin sesión | Redirige a `/sign-in` |

---

## Flujo 3 — Medios de Pago

**Archivos back:** `routers/medios_pago.py`
**Archivos front:** `app/payments.tsx`

### 3A. Agregar tarjeta

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 3A.1 | 📱 `payments.tsx` | Seleccionás pestaña **Tarjeta** y completás todos los campos | Formulario válido |
| 3A.2 | 📱 | Marca `"MASTERCARD"`, tipo `"Débito"`, internacional `Sí` | Tarjeta internacional |
| 3A.3 | 📱 | Tocás **"Agregar"** | POST `/mediosPago/tarjeta` → 201 → `TarjetaResponse {estado: "pendiente", tipo: "tarjeta"}` |
| 3A.4 | 📱 | Marca inválida (`"DISCOVER"`) | ❌ 422 "Marca inválida 'DISCOVER'. Las marcas permitidas son: VISA, MASTERCARD, AMEX" |

### 3B. Agregar cuenta bancaria

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 3B.1 | 📱 `payments.tsx` | Pestaña **Cuenta Bancaria**, completás: Titular `"Carlos"`, Banco `"Santander"`, CBU `"0720461888000012345678"`, Alias `"carlos.banco"`, País Banco `Argentina` | Formulario válido |
| 3B.2 | 📱 | Tocás **"Agregar"** | POST `/mediosPago/cuenta-bancaria` → 201 → `CuentaBancariaResponse {estado: "pendiente"}` |

### 3C. Agregar cheque certificado

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 3C.1 | 📱 `payments.tsx` | Pestaña **Cheque**, completás: Banco `"Galicia"`, Nro `"00012345"`, Monto `100000` | Formulario válido |
| 3C.2 | 📱 | Tocás **"Agregar"** | POST `/mediosPago/cheque` → 201 → `ChequeCertificadoResponse {montoCheque: 100000, montoDisponibleCheque: 100000}` |

### 3D. Verificar medios de pago (operación de empleado vía admin)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 3D.1 | 🔧 `GET /mediosPago?cliente_id={id}` | Con el id del cliente | Lista de medios con estado="pendiente" |
| 3D.2 | 🔧 `PUT /admin/medios-pago/{medioId}/estado?estado=verificado` | Con el id del medio de pago | 200 → estado cambia a "verificado" |
| 3D.3 | 🔧 `PUT /admin/medios-pago/{medioId}/estado?estado=aprobado` | Estado inválido | ❌ 422 |
| 3D.4 | 📱 `exploracion/subasta-vivo.tsx` | Usuario con al menos un medio verificado intenta pujar | ✅ Puede pujar |
| 3D.5 | 📱 `exploracion/subasta-vivo.tsx` | Usuario sin medios verificados intenta pujar | ❌ 403 "Necesitás al menos un medio de pago verificado para pujar" |

---

## Flujo 4 — Home y Exploración de Catálogo

**Archivos back:** `routers/catalogo.py` → `get_home()`, `get_catalogo_subasta()`, `get_detalle_producto_catalogo()`
**Archivos front:** `app/exploracion/index.tsx`, `app/exploracion/catalogo.tsx`, `app/exploracion/detalle-lote.tsx`

### 4A. Home según categoría

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 4A.1 | 📱 `exploracion/index.tsx` | Logueado como `prueba@test.com` (categoría: comun) | GET `/home?categoria=comun` → muestra subastas de categoría ≤ comun (solo "Antigüedades" y "Arte y Numismática") |
| 4A.2 | 📱 | Categoria `especial` (si tuvieras un usuario así) | Muestra subastas comun + especial |
| 4A.3 | 📱 | Subasta destacada (la más próxima) | Imagen principal, título del catálogo, fecha, postores registrados, actividad reciente (últimas 5 pujas) |
| 4A.4 | 📱 | Search bar — escribís texto | Lista se filtra por nombre en tiempo real (cliente) |
| 4A.5 | 📱 | Click en subasta general | Navega a `/exploracion/catalogo?subastaId={id}` |
| 4A.6 | 📱 | Click en "Ver en vivo" | Navega a `/exploracion/subasta-vivo?subastaId={id}` |

### 4B. Catálogo de subasta

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 4B.1 | 📱 `exploracion/catalogo.tsx` | Abrís catálogo de "Subasta Antigüedades — Lote 1" | GET `/subastas/{id}/catalogo` → lista 3 productos con imagen (base64), título, descripción corta, precio base, estado |
| 4B.2 | 📱 | Click en "Reloj de Bolsillo Suizo" | Navega a `/exploracion/detalle-lote?subastaId={id}&productoId={id}` |
| 4B.3 | 🔧 `GET /subastas/9999/catalogo` | ID inexistente | ❌ 404 "Subasta no encontrada" |

### 4C. Detalle de lote

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 4C.1 | 📱 `exploracion/detalle-lote.tsx` | Abrís detalle del Reloj | GET `/subastas/{id}/catalogo/{productoId}` → título completo, descripción larga, procedencia, precio base |
| 4C.2 | 📱 | Click en "Participar en subasta en vivo" | Navega a `/exploracion/subasta-vivo?subastaId={id}` |
| 4C.3 | 🔧 `GET /subastas/{id}/catalogo/9999` | Producto ID inexistente | ❌ 404 "Producto no encontrado en el catálogo" |

---

## Flujo 5 — Sala de Subastas en Vivo (WebSocket)

**Archivos back:** `routers/subastas.py` → `find_or_create_asistente()`, `get_subasta_en_vivo()`, `create_pujo()`, `_cerrar_item()`, `ConnectionManager`
**Archivos front:** `app/exploracion/subasta-vivo.tsx`

### 5A. Ingreso a la sala

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 5A.1 | 📱 `subasta-vivo.tsx` | Logueado como `prueba@test.com`, entrás a "Subasta Antigüedades" | POST `/asistentes/registrar {cliente: X, subasta: Y}` → 200 `{identificador, numeroPostor: 1, creado: true}` |
| 5A.2 | 📱 | WebSocket conectado | Conexión WS a `/ws/subasta/{subastaId}?clienteId={clienteId}` → mensaje tipo `"auction_state"` con estado actual del item |
| 5A.3 | 📱 | Vista cargada | Muestra: título del artículo, imagen, precio base (ej. $150.000), precio actual (= precio base si no hay pujas), próxima puja sugerida, puja máxima, countdown, últimas pujas |
| 5A.4 | 📱 | Entrás a la misma subasta por segunda vez | POST `/asistentes/registrar` → `{creado: false}` (asistente ya existe, retorna el mismo) |

### 5B. Validaciones de acceso

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 5B.1 | 📱 | Usuario sin medio de pago verificado intenta entrar | POST asistentes/registrar OK, pero al intentar pujar: ❌ 403 "Necesitás al menos un medio de pago verificado" |
| 5B.2 | 📱 | Usuario con multa pendiente intenta registrarse | ❌ 403 "Tenés una multa pendiente de pago. Debés abonarla antes de participar en otra subasta." |
| 5B.3 | 📱 | Usuario con categoría `comun` intenta subasta `especial` | ❌ 403 "Tu categoría no te permite acceder a esta subasta" |
| 5B.4 | 📱 | Usuario ya conectado a otra subasta via WS | WS retorna `{"type": "error", "detail": "Ya estás conectado a la subasta #X. Salí de ella primero."}` → cierra conexión |

### 5C. Pujar correctamente

> Precondición: usuario `prueba@test.com` (cuenta bancaria verificada) en "Subasta Antigüedades" con item "Reloj Suizo" (precio base $150.000)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 5C.1 | 📱 | Precio actual = 150.000, presionás botón de incremento rápido +1% | Puja de 151.500 (150.000 + 150.000*0.01) |
| 5C.2 | 📱 | Tocás **"Pujar"** | POST `/pujar {asistenteId, itemId, importe: 151500}` → 201 `PujoResponse` → WS broadcast `bid_update` a todos los conectados — countdown reiniciado a 30s |
| 5C.3 | 📱 | El precio actual en pantalla se actualiza | Via WS mensaje `bid_update` → precio = 151.500, próxima puja = 152.000 (+ 1% de base) |
| 5C.4 | 📱 | El segundo usuario (`prueba2@test.com`) conectado ve la actualización en tiempo real | WS broadcast → precio actualizado sin refrescar |

### 5D. Validaciones de puja

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 5D.1 | 📱 | Puja menor al mínimo (precio_actual + 1% base = 151.500), enviás 151.000 | ❌ 422 "El importe es inferior al mínimo permitido" |
| 5D.2 | 📱 | Puja mayor al máximo (precio_actual + 20% base = 180.000), enviás 200.000 | ❌ 422 "El importe supera el máximo permitido" |
| 5D.3 | 📱 | Item ya cerrado (subastado="si") | ❌ 409 "Este ítem ya fue subastado" |
| 5D.4 | 📱 | Asistente de subasta distinta a la del item | ❌ 403 "El asistente no pertenece a la subasta de este ítem" |
| 5D.5 | 📱 | Usuario con SOLO cheques y puja > monto_disponible | ❌ 422 "Esta puja excede el monto disponible de tu cheque certificado" |

### 5E. Puja sin límites (oro/platino)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 5E.1 | 🔧 Swagger `POST /pujar` | item de subasta oro, importe = precio_actual + 999% | ✅ 201 — sin validación de máximo |
| 5E.2 | 🔧 Swagger `POST /pujar` | item de subasta oro, importe mínimo < precio_actual | ✅ 201 — sin validación de mínimo (solo que sea > 0.01) |

### 5F. Cierre automático de ítem (30 segundos)

> Para testear este flujo: usá el endpoint dev para reducir el timeout, o esperá 30s luego de la última puja

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 5F.1 | 📱 | No se hacen pujas durante 30s desde que empezó la subasta | Timer expira → back ejecuta `_cerrar_item()` |
| 5F.2 | 📱 | Hubo al menos 1 puja | WS broadcast `item_closed {ganadorNombre, ganadorClienteId, importe}` → en DB: RegistroSubasta creado (importe + comisión), item.subastado="si" |
| 5F.3 | 📱 | Ninguna puja | WS broadcast `item_closed {ganadorNombre: "Casa de Subastas", importe: precioBase}` → RegistroSubasta con cliente="Casa de Subastas" |
| 5F.4 | 📱 | El ganador conectado recibe `item_closed` | Si `ganadorClienteId == sessionId`: navega a `/cierre-subasta/winner?subastaId={id}&clienteId={id}` |
| 5F.5 | 📱 | Hay un próximo item | WS broadcast `auction_state` con el nuevo item — todos los conectados ven el cambio automáticamente |
| 5F.6 | 📱 | No hay más items | WS broadcast `auction_ended {subastaId}` — pantalla muestra "Subasta finalizada" |

### 5G. Reset para retestear subastas

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 5G.1 | 🔧 `DELETE /dev/reset/subasta/{subastaId}` | ID de la subasta a resetear | Borra pujos, historial y asistentes — items vuelven a subastado="no" |

---

## Flujo 6 — Cierre de Subasta: Entrega y Pago

**Archivos back:** `routers/compras.py` → `get_compras()`, `get_precio_total()`, `confirmar_envio()`, `confirmar_pago()` · `email_service.py`
**Archivos front:** `app/cierre-subasta/winner.tsx`, `delivery-details.tsx`, `confirm-payment.tsx`

### 6A. Pantalla de ganador

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 6A.1 | 📱 `cierre-subasta/winner.tsx` | Navega automáticamente tras ganar (o manualmente con params) | GET `/subasta/{sid}/{cid}/compras` + GET `/subasta/{sid}/{cid}/compras/precio` — muestra trofeo, lista de artículos, precio+comisión |
| 6A.2 | 📱 | Desglose visible | precioFinal (suma de pujas), comision (% sobre pujas), envio (0 aún — se confirma en siguiente paso), total |
| 6A.3 | 📱 | Tocás **"Confirmar Entrega"** | Navega a `delivery-details.tsx` |

### 6B. Método de entrega

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 6B.1 | 📱 `delivery-details.tsx` | Pantalla carga | GET `/subasta/{sid}/{cid}/compras/precio` (precio sin envío) + GET `/clientes/{cid}/perfil` (dirección real) + GET `/config/costo_envio_domicilio` (costo de envío) |
| 6B.2 | 📱 | Dirección mostrada en "Envío a domicilio" | La dirección declarada en el registro (Persona.direccion), no hardcodeada |
| 6B.3 | 📱 | Seleccionás **"Envío a domicilio"** | Resumen muestra: precioFinal + comisión + costo_envio (5.000) = total — el valor viene de config, no muestra $0 aunque el RegistroSubasta no tenga envío guardado aún |
| 6B.4 | 📱 | Seleccionás **"Retiro personal"** | Advertencia en rojo "pierde cobertura del seguro" — total = precioFinal + comisión (sin envío) |
| 6B.5 | 📱 | Tocás **"Continuar al pago"** | POST `/subasta/{sid}/{cid}/compras/envio?metodoEnvio=domicilio` — si el back devuelve error, muestra Alert con el detalle; si es exitoso navega a `confirm-payment.tsx` |

### 6C. Confirmación de pago

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 6C.1 | 📱 `confirm-payment.tsx` | Pantalla carga | GET `/mediosPago?cliente_id={cid}` (solo verificados) + GET `/subasta/{sid}/{cid}/compras/precio` |
| 6C.2 | 📱 | Resumen muestra | precioFinal + comisión + envio (5.000) = total |
| 6C.3 | 📱 | Seleccionás cuenta bancaria verificada → tocás **"Confirmar y recibir link de pago"** | POST `/subasta/{sid}/{cid}/compras/pagar?metodoPagoId={id}` |
| 6C.4 | 📱 | Éxito | RegistroSubasta.pagado="pendiente", fecha_limite_pago=+72hs — pantalla de "Email enviado" con deadline |
| 6C.5 | 📧 | Email recibido en la casilla del usuario | Email HTML con: tabla de items (título, puja, comisión), costo de envío, total, link de pago falso (`https://pay.mercadosubastas.com/checkout/{uuid}`), fecha límite |
| 6C.6 | 📱 | Tocás **"Volver al inicio"** | Navega a `/exploracion` |

### 6D. Validaciones de pago

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 6D.1 | 📱 | Medio de pago no verificado (estado="pendiente") | ❌ 422 "El medio de pago no está verificado" |
| 6D.2 | 📱 | Subasta en USD con tarjeta ARS | ❌ 422 "La subasta es en USD. El medio de pago debe ser en dólares." |
| 6D.3 | 📱 | Subasta en USD con tarjeta no internacional | ❌ 422 "Para subastas en USD se requiere una tarjeta internacional." |
| 6D.4 | 📱 | Subasta en USD con cheque certificado | ❌ 422 "Los cheques certificados no pueden usarse en subastas en USD." |
| 6D.5 | 📱 | Sin compras pendientes (ya pagadas) | ❌ 409 "No hay compras pendientes de pago en esta subasta" |
| 6D.6 | 📱 | Confirmás el pago dos veces (doble tap o back + retry) | ❌ 409 "El pago ya fue registrado con este medio de pago." — no se genera estado duplicado |

### 6E. Pago con cheque insuficiente → Multa inmediata

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 6E.1 | 🔧 | Creás cheque con monto $10 (muy bajo), verificarlo con `PUT /admin/medios-pago/{id}/estado?estado=verificado` | Cheque verificado con monto_disponible=$10 |
| 6E.2 | 📱 | Usuario intenta pagar una compra de $151.500 con ese cheque | POST `/compras/pagar` → back detecta monto_disponible ($10) < total ($151.500) |
| 6E.3 | 📱 | Resultado | ❌ 422 "Tu cheque no tiene saldo suficiente. Se generó una multa del 10%..." — en DB: Multa creada con monto=15.150 (10% de $151.500), fecha_limite=+72hs |
| 6E.4 | 📧 | Email de multa recibido | Email rojo con monto multa, importe original, deadline, link de pago |
| 6E.5 | 📱 | Usuario intenta registrarse en otra subasta | ❌ 403 "Tenés una multa pendiente de pago..." |
| 6E.6 | 📱 `perfil/index.tsx` | Botón "Multas pendientes (1)" visible | Badge rojo con contador de multas |

---

## Flujo 7 — Admin: Confirmación/Rechazo de Pagos

**Archivos back:** `routers/admin.py` · `email_service.py`
**Acceso:** Solo via Swagger (sin pantalla en el front)

### 7A. Confirmar pago recibido

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 7A.1 | 🔧 `GET /admin/pagos/pendientes` | Sin params | Lista de todos los RegistroSubasta con pagado="pendiente": registroId, clienteId, nombre, mail, subastaId, importe, comisión, envío, total, moneda, metodoPago, fechaLimitePago |
| 7A.2 | 🔧 `POST /admin/pagos/{registroId}/confirmar` | Con ID del registro pendiente | 200 `{"mensaje": "Pago del registro #X confirmado. Email enviado a..."}` — en DB: pagado="si" |
| 7A.3 | 📧 | Email de confirmación recibido | Email verde: "✅ Pago confirmado" con artículos y total |
| 7A.4 | 🔧 | Intentás confirmar el mismo registro de nuevo | ❌ 409 "Este pago ya fue confirmado" |

### 7B. Rechazar pago (venció el plazo de 72hs)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 7B.1 | 🔧 `POST /admin/pagos/{registroId}/rechazar` | ID de registro con pagado="pendiente" | 200 `{"mensaje": "Pago rechazado. Multa de X generada...", "multaMonto": X, "deadlinePago": "..."}` |
| 7B.2 | 🔧 | Verificación en DB | RegistroSubasta.pagado="vencido" — Multa creada (10% de importe) con fecha_limite=+72hs |
| 7B.3 | 📧 | Email de multa recibido | Email rojo con monto multa, deadline, link de pago multa |
| 7B.4 | 📱 | Usuario intenta unirse a otra subasta | ❌ 403 "Tenés una multa pendiente" |

### 7C. Gestión de multas (confirmación por admin)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 7C.1 | 🔧 `GET /admin/multas/pendientes` | Sin params | Lista completa de multas sin pagar con identificador, cliente, subasta, monto, fecha_limite |
| 7C.2 | 🔧 `POST /admin/multas/{multaId}/confirmar-pago` | ID de multa | 200 "Multa #X marcada como pagada. El usuario puede participar..." — DB: Multa.pagado="si" |
| 7C.3 | 📱 `perfil/index.tsx` | Tras marcar multa como pagada | El botón de multas desaparece del perfil (0 multas pendientes) |
| 7C.4 | 📱 | Usuario intenta registrarse en subasta nuevamente | ✅ 200 — puede participar |

### 7D. Procesar pagos vencidos masivamente

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 7D.1 | 🔧 `POST /admin/pagos/procesar-vencidos` | Sin params | Recorre todos los RegistroSubasta con `pagado in ("no","pendiente")` y `fecha_limite_pago < ahora` → los marca `pagado="vencido"` y genera una Multa por cada uno |
| 7D.2 | 🔧 | Verificación en DB | Registros marcados "vencido"; Multas creadas con `fecha_limite = ahora + 72hs` (no igual a `ahora`) |
| 7D.3 | 📱 | Los usuarios afectados intentan registrarse en subasta | ❌ 403 "Tenés una multa pendiente de pago" |
| 7D.4 | 🔧 | Volvés a llamar al endpoint cuando no hay vencidos | 200 — no genera errores ni multas duplicadas |

---

## Flujo 8 — Vender Artículo

**Archivos back:** `routers/vender.py` → `submit_articulo()`, `get_articulos_cliente()`, `get_condiciones_articulo()`, `_set_aceptacion()`
**Archivos front:** `app/vender/index.tsx`, `app/vender/mis-articulos.tsx`, `app/vender/articulo-aprobado.tsx`, `app/vender/inspeccion-rechazada.tsx`, `app/vender/ubicacion-seguro.tsx`

### 8A. Envío de artículo

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 8A.1 | 📱 `vender/index.tsx` | Completás: Título `"Silla Antigua"`, Categoría `"Muebles"`, Descripción completa, Procedencia/Historia, al menos 1 imagen, checkbox marcado | Formulario válido |
| 8A.2 | 📱 | Checkbox NO marcado → tocás "Enviar" | ❌ Validación cliente — no llama al back |
| 8A.3 | 📱 | Tocás **"Enviar artículo"** | POST `/articulos/ {titulo, categoria, descripcionCompleta, procedencia, declaracionLegal: true, clienteId}` → 200 `{productoId, presentacionId, mensaje: "Artículo enviado..."}` |
| 8A.4 | 📱 | Por cada imagen seleccionada | POST `/fotos/ {producto: productoId, imagen: base64}` → 201 en DB: foto guardada como bytes |
| 8A.5 | 📱 | Tras éxito | Navega a `/vender/mis-articulos` |

### 8B. Ver mis artículos

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 8B.1 | 📱 `vender/mis-articulos.tsx` | Pantalla carga | GET `/clientes/{id}/articulos` + GET `/config/direccion_inspeccion` |
| 8B.2 | 📱 | Artículo recién enviado | Badge "PENDIENTE" — estadoInspeccion="pendiente" |
| 8B.3 | 📱 | Dirección de inspección mostrada | Desde config: "Av. Corrientes 1234, Piso 3, CABA — Lunes a Viernes 9-17hs" |

### 8C. Artículo inspeccionado → Aprobado

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 8C.1 | 🔧 | El empleado usa back-office para: crear Catalogo, crear ItemCatalogo (precio base, comisión), asociar el producto a la subasta | ItemCatalogo creado con productoId, precio base y comisión |
| 8C.2 | 🔧 `POST /items-catalogo/` | `{catalogo: X, producto: Y, precioBase: 50000, comision: 10}` | 201 ItemCatalogoResponse |
| 8C.3 | 📱 `vender/mis-articulos.tsx` | Refrescás la pantalla | Badge cambia a "APROBADO" — estadoInspeccion="aprobado" — botón "Ver condiciones" |
| 8C.4 | 📱 | Tocás "Ver condiciones" | Navega a `/vender/articulo-aprobado?productoId={id}` |
| 8C.5 | 📱 `vender/articulo-aprobado.tsx` | Pantalla carga | GET `/articulos/{productoId}/condiciones` → {tieneCondiciones: true, precioBase: 50000, comision: 10, subastaFecha, subastaHora, subastaUbicacion, aceptacion: "pendiente"} |
| 8C.6 | 📱 | Tocás **"Aceptar condiciones"** | POST `/articulos/{id}/aceptar` → DB: AceptacionArticulo.estado="aceptado" → {mensaje: "Condiciones aceptadas correctamente."} |
| 8C.7 | 📱 | Tocás **"Rechazar"** (en vez de aceptar) | POST `/articulos/{id}/rechazar` → AceptacionArticulo.estado="rechazado" — artículo será devuelto |

### 8D. Artículo inspeccionado → Rechazado

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 8D.1 | 🔧 | Empleado actualiza InspeccionProducto.estado="rechazado" con observaciones y costo_devolucion | `PUT` de back-office sobre el producto |
| 8D.2 | 📱 `vender/mis-articulos.tsx` | Refrescás | Badge "RECHAZADO" — observaciones y costo de devolución visibles |
| 8D.3 | 📱 | Click en artículo rechazado | Navega a `/vender/inspeccion-rechazada?productoId={id}&observaciones={text}&costoDevolucion={n}` |
| 8D.4 | 📱 `inspeccion-rechazada.tsx` | Vista del rechazo | Observaciones del inspector + costo de devolución + botón "Volver" |

### 8E. Ver ubicación y seguro del artículo

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 8E.1 | 📱 `vender/ubicacion-seguro.tsx` | Pantalla carga (desde mis-articulos) | GET `/config/direccion_deposito` → "Av. Corrientes 1234, Depósito Subsuelo, CABA" |
| 8E.2 | 📱 | Datos del seguro | Póliza desde tabla Seguro (si fue creada por el empleado) |

---

## Flujo 9 — Perfil y Estadísticas

**Archivos back:** `routers/personas.py` → `ep_get_perfil()` · `routers/vender.py` → `get_estadisticas_cliente()` · `routers/compras.py` → `ep_get_multas()`
**Archivos front:** `app/perfil/index.tsx`, `app/perfil/estadisticas.tsx`, `app/perfil/multas.tsx`

### 9A. Pantalla de perfil

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 9A.1 | 📱 `perfil/index.tsx` | Abrís pestaña Perfil | GET `/clientes/{id}/perfil` → nombre, mail, dirección, categoría, admitido, numeroPais |
| 9A.2 | 📱 | País | GET `/paises/{numeroPais}` → nombre del país ("Argentina") |
| 9A.3 | 📱 | Categoría mostrada | Usa el valor que devuelve la API (`perfilData.categoria`), no el dato de la sesión guardada al login — refleja cambios que el admin haya hecho |
| 9A.4 | 📱 | Sin multas | Botón "Multas pendientes" NO aparece |
| 9A.5 | 📱 | Con multas | Botón "Multas pendientes (N)" visible en rojo |
| 9A.6 | 📱 | Datos correctos | Nombre: "Usuario Prueba", Correo: "prueba@test.com", Categoría: "Común", País: "Argentina" |

### 9B. Estadísticas

> Precondición: `seed_historial_prueba()` cargó historial de pujas para `prueba@test.com`

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 9B.1 | 📱 | Tocás **"Mis Estadísticas"** | Navega a `/perfil/estadisticas` |
| 9B.2 | 📱 `perfil/estadisticas.tsx` | Pantalla carga | GET `/clientes/{id}/estadisticas` → {subastasTotales, pujasGanadas, totalInvertido, historial} |
| 9B.3 | 📱 | Datos mostrados | subastasTotales: 2 (dos subastas), pujasGanadas: 2 (1 en cada subasta), historial con los 5 items pujados |
| 9B.4 | 📱 | Historial | Cada entrada: título del artículo, fecha, importe, ganada (sí/no) |

### 9C. Multas pendientes del cliente

> Precondición: el usuario tiene al menos una multa con `pagado="no"` (generada por 6E o 7B)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 9C.1 | 📱 `perfil/index.tsx` | Tocás **"Multas pendientes (N)"** | Navega a `/perfil/multas` |
| 9C.2 | 📱 `perfil/multas.tsx` | Pantalla carga | GET `/multas/{clienteId}` → lista de multas pendientes: monto, fecha_limite, id de subasta |
| 9C.3 | 📱 | Cada fila de multa | Muestra monto formateado, fecha límite, y botón **"Pagar multa"** |
| 9C.4 | 📱 | Tocás **"Pagar multa"** | Alert de confirmación: "¿Querés pagar esta multa?" |
| 9C.5 | 📱 | Confirmás en el Alert | POST `/multas/{multaId}/pagar?cliente_id={clienteId}` → Multa.pagado="si" — la multa desaparece de la lista |
| 9C.6 | 📱 | Intentás pagar una multa que no te pertenece (vía Swagger) | ❌ 403 "Esta multa no pertenece al cliente indicado" |
| 9C.7 | 📱 | Tras pagar todas las multas | Lista vacía — botón "Multas pendientes" desaparece del perfil al volver |
| 9C.8 | 📱 | Usuario intenta registrarse en subasta tras pagar la multa | ✅ 200 — puede participar |

---

## Flujo 10 — Casos de Negocio Especiales

### 10A. Subasta en USD

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 10A.1 | 🔧 `POST /subastas/` | `{fecha, hora, subastador: 1, categoria: "comun", moneda: "USD"}` | 201 SubastaResponse con moneda="USD" |
| 10A.2 | 🔧 | Agregás items al catálogo de esa subasta | Items cargados |
| 10A.3 | 📱 | Usuario intenta pagar con tarjeta ARS | ❌ 422 "La subasta es en USD. El medio de pago debe ser en dólares." |
| 10A.4 | 📱 | Usuario intenta pagar con cheque | ❌ 422 "Los cheques certificados no pueden usarse en subastas en USD." |
| 10A.5 | 📱 | Usuario paga con tarjeta USD internacional | ✅ Email enviado — pagado="pendiente" |

### 10B. Empresa compra por precio base (nadie puja)

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 10B.1 | 📱 | WebSocket conectado pero nadie puja durante 30s | Timer expira → `_cerrar_item()` |
| 10B.2 | 📱 | Resultado en DB | RegistroSubasta con cliente=Casa de Subastas (documento "00000000"), importe=precioBase, comision calculada |
| 10B.3 | 📱 | WS mensaje | `item_closed {ganadorNombre: "Casa de Subastas", ganadorClienteId: X, importe: precioBase}` — nadie navega a winner |

### 10C. Múltiples usuarios pujando simultáneamente

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 10C.1 | 📱 | `prueba@test.com` y `prueba2@test.com` ambos entran a la misma subasta | Ambos reciben auction_state inicial |
| 10C.2 | 📱 | `prueba@test.com` puja $151.500 | Broadcast `bid_update` — precio actualizado en AMBOS dispositivos en tiempo real |
| 10C.3 | 📱 | `prueba2@test.com` intenta pujar $150.000 (menor al actual) | ❌ 422 "El importe es inferior al mínimo" |
| 10C.4 | 📱 | `prueba2@test.com` puja $152.000 (supera al anterior) | Nuevo ganador — broadcast a ambos — prueba@test.com ya no es ganador |

### 10D. F5 — Límite de cheque durante las pujas

> Precondición: usuario SOLO tiene cheque verificado de $100.000

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 10D.1 | 📱 | Puja $80.000 en primer item | ✅ — compromiso: $80.000 < $100.000 |
| 10D.2 | 📱 | Puja $30.000 en segundo item (mientras sigue ganando el primero) | ❌ 422 "Esta puja excede el monto disponible de tu cheque" — compromiso_pendiente ($80.000) + $30.000 > $100.000 |
| 10D.3 | 📱 | Gana primer item, paga con cheque → saldo descontado a $20.000 | RegistroSubasta con importe=80.000, cheque.monto_disponible actualizado |

---

## Flujo 11 — Endpoints de Administración de Catálogo

**Archivos back:** `routers/catalogo.py`
**Acceso:** Solo via Swagger

### 11A. Gestión de productos

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 11A.1 | 🔧 `POST /productos/` | `{descripcionCatalogo: "Reloj", descripcionCompleta: "Descripción larga", revisor: 1, duenio: 1}` | 201 ProductoResponse con disponible="si" |
| 11A.2 | 🔧 `POST /fotos/` | `{producto: X, imagen: "base64valido"}` | 201 — imagen decodificada y guardada en binary |
| 11A.3 | 🔧 `POST /fotos/` | imagen con base64 inválido | ❌ 422 "La imagen no es un base64 válido" |
| 11A.4 | 🔧 `DELETE /productos/{id}` | Con producto que tiene fotos | ❌ 400 "No se puede eliminar: hay fotos, presentaciones o items que dependen de este producto" |
| 11A.5 | 🔧 `DELETE /fotos/{id}` | Borrás la foto primero, luego el producto | ✅ |

### 11B. Gestión de catálogos y subastas

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 11B.1 | 🔧 `POST /catalogos/` | `{descripcion: "Mi catálogo", subasta: X, responsable: 1}` | 201 CatalogoResponse |
| 11B.2 | 🔧 `POST /items-catalogo/` | `{catalogo: X, producto: Y, precioBase: 100000, comision: 10}` | 201 ItemCatalogoResponse con subastado="no" |
| 11B.3 | 🔧 `DELETE /catalogos/{id}` | Con items cargados | ❌ 400 "No se puede eliminar: hay items de catálogo que dependen de este catálogo" |

---

## Flujo 12 — Configuración de Empresa

**Archivos back:** `routers/vender.py` → `ep_get_configuracion()`
**Archivos front:** `app/vender/mis-articulos.tsx`, `app/vender/ubicacion-seguro.tsx`, `app/cierre-subasta/delivery-details.tsx`

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 12.1 | 🔧 `GET /config/direccion_inspeccion` | — | `{"clave": "direccion_inspeccion", "valor": "Av. Corrientes 1234, Piso 3, CABA — Lunes a Viernes 9-17hs"}` |
| 12.2 | 🔧 `GET /config/direccion_deposito` | — | `{"clave": "direccion_deposito", "valor": "Av. Corrientes 1234, Depósito Subsuelo, CABA"}` |
| 12.3 | 🔧 `GET /config/costo_envio_domicilio` | — | `{"clave": "costo_envio_domicilio", "valor": "5000"}` |
| 12.4 | 🔧 `GET /config/clave_inexistente` | — | ❌ 404 "Configuración no encontrada" |

---

## Flujo 13 — Países

**Archivos back:** `routers/lookup.py`
**Archivos front:** `app/register.tsx`, `app/payments.tsx`, `app/perfil/index.tsx`

| Paso | 📱/🔧 | Acción | Resultado esperado |
|------|-------|--------|--------------------|
| 13.1 | 🔧 `GET /paises/` | — | Lista: Argentina (1), Uruguay (2), Paraguay (3), Chile (4) |
| 13.2 | 📱 `register.tsx` | Dropdown de país al cargar | Los 4 países del seed |
| 13.3 | 🔧 `GET /paises/1` | — | `{numero: 1, nombre: "Argentina", nombreCorto: "ARG", capital: "Buenos Aires", ...}` |
| 13.4 | 🔧 `GET /paises/9999` | — | ❌ 404 "País no encontrado" |

---

## Resumen de Reglas de Negocio Validadas

| # | Regla | Dónde se valida (back) | Dónde se muestra (front) | Test |
|---|-------|------------------------|--------------------------|------|
| F1 | Categoría del usuario >= categoría de la subasta | `subastas.py:find_or_create_asistente()` | `subasta-vivo.tsx` | 5B.3 |
| F2 | Al menos un medio de pago verificado para pujar | `subastas.py:create_pujo()` | `subasta-vivo.tsx` | 3D.5 |
| F3 | Un usuario = una subasta simultánea (WebSocket) | `subastas.py:ConnectionManager.connect()` | `subasta-vivo.tsx` | 5B.4 |
| F4 | Si nadie puja → empresa compra al precio base | `subastas.py:_cerrar_item()` | `subasta-vivo.tsx` | 10B |
| F5 | Cheques no pueden superar saldo disponible al pujar | `subastas.py:create_pujo()` | `subasta-vivo.tsx` | 5D.5, 10D |
| F6 | Ganador identificado por clienteId en item_closed | `subastas.py:_cerrar_item()` | `subasta-vivo.tsx` hook | 5F.4 |
| M1 | Pago registrado como "pendiente" + email + deadline 72hs | `compras.py:confirmar_pago()` | `confirm-payment.tsx` | 6C |
| M2 | Multa = 10% del importe pujado, al fallar el pago | `compras.py:confirmar_pago()`, `admin.py:ep_rechazar_pago()` | `perfil/index.tsx` | 6E, 7B |
| M3 | Multa pendiente bloquea participación en subastas | `subastas.py:find_or_create_asistente()` | `subasta-vivo.tsx` | 6E.5 |
| M4 | Multa con fecha_limite = ahora + 72hs (no igual a ahora) | `admin.py:ep_procesar_vencidos()` | — | 7D.2 |
| E1 | Incremento mínimo: precio_actual + 1% del precio base | `subastas.py:create_pujo()` | `subasta-vivo.tsx` (validación cliente) | 5C.1, 5D.1 |
| E2 | Incremento máximo: precio_actual + 20% del precio base | `subastas.py:create_pujo()` | `subasta-vivo.tsx` (validación cliente) | 5D.2 |
| E3 | Límites E1/E2 NO aplican a subastas oro/platino | `subastas.py:create_pujo()` | — | 5E |
| E4 | Timer 30s de inactividad → cierre automático del item | `subastas.py:_cerrar_item()` | `subasta-vivo.tsx` WS listener | 5F |
| D1 | Subasta USD: solo pago con tarjeta int. o cuenta USD | `compras.py:confirmar_pago()` | `confirm-payment.tsx` | 6D.2-6D.4, 10A |

---

## Apéndice A — Variables de entorno requeridas

Archivo: `APIMercadoSubastas/.env` (**nunca commitear**)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mercado_subastas
GMAIL_USER=tu_correo@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx   # sin espacios
APP_BASE_URL=https://pay.mercadosubastas.com
```

Para verificar que el email funciona: correr flujo 6C con credenciales reales y revisar la bandeja de entrada.

---

## Apéndice B — Estructura de archivos por flujo

| Flujo | Archivos Back | Archivos Front |
|-------|--------------|----------------|
| Registro | `routers/auth.py` | `app/register.tsx`, `app/verification.tsx`, `app/register_final.tsx`, `app/payments.tsx` |
| Login | `routers/auth.py` | `app/sign-in.tsx`, `store/session.ts`, `app/_layout.tsx` |
| Medios de Pago | `routers/medios_pago.py` | `app/payments.tsx` |
| Home/Catálogo | `routers/catalogo.py`, `app/utils.py` | `app/exploracion/index.tsx`, `app/exploracion/catalogo.tsx`, `app/exploracion/detalle-lote.tsx` |
| Subasta en vivo | `routers/subastas.py` | `app/exploracion/subasta-vivo.tsx` |
| Cierre/Pago | `routers/compras.py`, `app/email_service.py` | `app/cierre-subasta/winner.tsx`, `delivery-details.tsx`, `confirm-payment.tsx` |
| Admin Pagos | `routers/admin.py`, `app/email_service.py` | Solo Swagger |
| Vender | `routers/vender.py` | `app/vender/index.tsx`, `mis-articulos.tsx`, `articulo-aprobado.tsx`, `inspeccion-rechazada.tsx`, `ubicacion-seguro.tsx` |
| Perfil | `routers/personas.py`, `routers/vender.py` | `app/perfil/index.tsx`, `app/perfil/estadisticas.tsx`, `app/perfil/multas.tsx` |
| Config | `routers/vender.py`, `scripts/seed.py` | `app/vender/mis-articulos.tsx`, `app/cierre-subasta/delivery-details.tsx` |
| Países | `routers/lookup.py` | `app/register.tsx`, `app/payments.tsx`, `app/perfil/index.tsx` |
| Dev Reset | `routers/dev.py` | Solo Swagger |
