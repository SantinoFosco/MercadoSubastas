# Plan de Testing — App en el Celular

> **Cómo leer este documento**
> - 📱 = acción 100% desde la app en el celu
> - 🔧 = acción en Swagger (`http://localhost:8000/docs`) — operación de empleado sin pantalla en el front
> - **Resultado esperado** = lo que debe verse/pasar en pantalla
> - **Falla si…** = síntoma concreto de un bug

---

## Preparación del ambiente

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| P.1 | `docker compose up` en la carpeta raíz del proyecto | Contenedor corriendo; en los logs de `subastas_api` aparecen "✓ Países cargados", "✓ Subastas y catálogos creados", "✓ Usuario prueba@test.com creado", etc. — **el seed corre automáticamente** |
| P.2 | `npx expo start` en `FrontMercadoSubastas/` | QR visible en terminal |
| P.3 | Abrir **Expo Go** en el celu y escanear el QR | App carga, pantalla de login visible |
| P.4 | Verificar en `http://localhost:8000/docs` que la API responde | Swagger abierto |
| P.5 | *(Opcional)* Base limpia desde cero: `docker compose down -v && docker compose up` | Borra el volumen Postgres y re-seedea todo |

> **Usuarios precargados por el seed:**
> - `prueba@test.com` / `Prueba1.` — categoría comun, cuenta bancaria ARS verificada
> - `prueba2@test.com` / `Prueba2.` — categoría comun, tarjeta VISA verificada

---

## Flujo 1 — Registro de usuario nuevo

### 1A. Registro exitoso (happy path)

| Paso | Dónde estás | Qué hacés | Resultado esperado |
|------|-------------|----------|--------------------|
| 1A.1 | 📱 Pantalla de bienvenida (`login.tsx`) | Tocás **"Registrarse"** | Navegás al formulario |
| 1A.2 | 📱 `register.tsx` | Completás: Nombre `"Carlos"`, Apellido `"López"`, DNI `"55443322"`, Mail `"carlos@test.com"`, Dirección `"Av. Test 1"`, País `"Argentina"` | Todos los campos completos, barra muestra **Paso 1 de 4** |
| 1A.3 | 📱 `register.tsx` | Tocás **"Enviar para Verificación"** | POST a `/auth/registro/iniciar` → navegás a pantalla de verificación |
| 1A.4 | 📱 `verification.tsx` | Ves el mensaje de espera con el reloj y "Revisando cada 10 segundos" | Pantalla estática esperando; el polling ya corre en background |

> **Pausa — el empleado aprueba vía Swagger:**

| Paso | Dónde estás | Qué hacés | Resultado esperado |
|------|-------------|----------|--------------------|
| 1A.5 | 🔧 Swagger `GET /auth/registro/pendientes` | Sin parámetros | Lista con Carlos: `{"personaId": X, "nombre": "Carlos López", "documento": "55443322", "mail": "carlos@test.com"}` — anotás el `personaId` |
| 1A.6 | 🔧 Swagger `POST /auth/registro/aprobar` | `{"personaId": X, "verificador": 1, "categoria": "comun"}` | 200 "Registro aprobado exitosamente" |
| 1A.7 | 📱 `verification.tsx` | Esperás hasta ~10 segundos (próxima ronda de polling) | La pantalla **navega automáticamente** a `register_final` sin que el usuario haga nada |
| 1A.8 | 📱 `register_final.tsx` | Ves "¡Verificación aprobada!" + formulario de nueva clave | Paso 3 de 4 visible |
| 1A.9 | 📱 `register_final.tsx` | Ingresás `"Carlos123."` y confirmás | PUT a `/auth/cambiar-clave` → navegás a `payments.tsx` |

### 1B. Verificación manual ("Verificar ahora")

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 1B.1 | 📱 En `verification.tsx`, tocás **"Verificar ahora"** antes de que pase el poll de 10s | Spinner aparece, hace el check inmediatamente | Botón no responde |
| 1B.2 | Si aún no fue aprobado | Vuelve a mostrar la pantalla de espera sin cambios | Muestra error raro |

### 1C. Cuenta rechazada

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 1C.1 | Crear usuario `"rechazo@test.com"` (igual que 1A.1–1A.4) | Pantalla de verificación |  |
| 1C.2 | 🔧 Swagger `GET /auth/registro/pendientes` → anotar `personaId` | Lista de pendientes visible |  |
| 1C.3 | 🔧 Swagger `POST /auth/registro/desaprobar` `{"personaId": X, "verificador": 1}` | 200 desaprobado |  |
| 1C.4 | 📱 `verification.tsx` espera el siguiente poll | Pantalla cambia a **"Cuenta no habilitada"** con botón "Volver al inicio" | No detecta el rechazo |
| 1C.5 | 📱 Tocás "Volver al inicio" | Navegás a login | No navega |

### 1D. Errores de validación en el formulario

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 1D.1 | Dejás **Nombre vacío** y tocás Enviar | Campos en rojo, alerta de campos incompletos | Navega igual |
| 1D.2 | DNI `"ABC123"` (con letras) | Alerta "solo debe contener números" | Acepta letras |
| 1D.3 | Mail sin `@`: `"carlostest.com"` | Alerta de mail inválido | Acepta |
| 1D.4 | Registrarse de nuevo con DNI `"55443322"` (ya existe) | Alerta "El documento ya está registrado" | No muestra error |
| 1D.5 | Registrarse con mail `"carlos@test.com"` (ya existe) | Alerta "El mail ya está registrado" | Muestra "El documento ya está registrado" o no muestra nada |
| 1D.6 | Sin seleccionar país | Alerta de campos incompletos | Navega sin país |

### 1E. Doble aprobación (guard en backend)

| Paso | Qué hacés | Resultado esperado |
|------|----------|--------------------|
| 1E.1 | 🔧 Swagger `POST /auth/registro/aprobar` con el mismo `personaId` por segunda vez | 409 "El usuario ya fue verificado anteriormente" |

---

## Flujo 2 — Login y re-entrada a verificación

### 2A. Primer login con clave temporal (post-aprobación)

| Paso | Dónde estás | Qué hacés | Resultado esperado |
|------|-------------|----------|--------------------|
| 2A.1 | 📱 `sign-in.tsx` | Mail `"carlos@test.com"`, contraseña `"cualquiercosa"` | Login exitoso (clave temporal ignora contraseña) → redirige a `register_final` |
| 2A.2 | 📱 `register_final.tsx` | Ingresás `"Carlos123."`, confirmás | Clave guardada, `claveTemporal=False` → navegás a `payments.tsx` |

### 2B. Re-entrada a verificación (usuario que cerró la app mientras esperaba)

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 2B.1 | 📱 `sign-in.tsx`: escribís el mail del usuario pendiente (`"carlos@test.com"`) | Mail escrito en el campo |  |
| 2B.2 | 📱 Tocás el link **"Verificar estado"** en el bloque amarillo | Navegás a `verification.tsx` con el mail ya cargado, polling empieza | Link no aparece o no navega |
| 2B.3 | 📱 Intentás tocar "Verificar estado" sin escribir el mail primero | Error "Ingresá tu mail para verificar el estado" | Navega igualmente |

### 2C. Login normal (post cambio de clave)

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 2C.1 | Login `"carlos@test.com"` / `"Carlos123."` | Acceso al home | No puede entrar |
| 2C.2 | Login `"carlos@test.com"` / `"claveincorrecta"` | Error "Mail o contraseña incorrectos" | Deja entrar |
| 2C.3 | Login con mail inexistente | Error "Mail o contraseña incorrectos" | No muestra error |
| 2C.4 | Login con campo mail vacío | Error de validación local, no hace request | Hace el request igual |
| 2C.5 | Login `"prueba@test.com"` / `"Prueba1."` | Entra con categoría `"comun"` al home | Error de credenciales |

### 2D. Login con cuenta rechazada

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 2D.1 | Login `"rechazo@test.com"` / cualquier clave | Error **en la pantalla de login**: "Tu cuenta no fue habilitada. Contactá a la casa de subastas." | Redirige a `verification.tsx` |

---

## Flujo 3 — Medios de Pago

> Logueado como Carlos (acaba de llegar a `payments.tsx`).

### 3A. Validación de obligatoriedad

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 3A.1 | Sin agregar ningún medio, tocás **"Ir a explorar subastas"** | Botón **deshabilitado** (gris); aparece aviso amarillo "Debés registrar al menos un medio de pago" | Botón activo o navega sin medio |

### 3B. Alta de tarjeta de crédito

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 3B.1 | Expandís sección **Agregar Tarjeta** | Formulario visible |  |
| 3B.2 | Completás: Titular `"CARLOS LOPEZ"`, número `"4111 1111 1111 1111"`, marca VISA, tipo crédito, vencimiento 12/2027, Nacional | Campos OK |  |
| 3B.3 | Tocás **"Guardar Tarjeta →"** | Aparece en la lista con badge "Pendiente"; formulario se colapsa | Error 422 o no aparece |
| 3B.4 | Número con 15 dígitos | Error "Ingresá los 16 dígitos de la tarjeta" | Acepta |
| 3B.5 | Titular vacío | Error "Ingresá el titular de la tarjeta" | Hace request |
| 3B.6 | Marca `"Cabal"` (no aceptada por el back) | Error del servidor "Marca inválida" visible en el formulario | Falla silenciosamente |

### 3C. Alta de cuenta bancaria

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 3C.1 | Expandís **Agregar Cuenta Bancaria** | Formulario visible |  |
| 3C.2 | Completás: Titular `"Carlos López"`, Banco `"BBVA"`, CBU de 22 dígitos, País Argentina | Campos OK |  |
| 3C.3 | Tocás **"Guardar Cuenta →"** | Aparece en la lista con badge "Pendiente" | Error |
| 3C.4 | CBU con 21 dígitos | Error "El CBU debe tener exactamente 22 dígitos numéricos" | Acepta |

### 3D. Alta de cheque certificado

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 3D.1 | Completás: Banco `"Banco Nación"`, Nro `"00123456"`, Monto `500000` | Campos OK |  |
| 3D.2 | Tocás **"Registrar Cheque →"** | Aparece en la lista | Error |
| 3D.3 | Monto `0` | Error "Ingresá un monto válido mayor a 0" | Acepta |

### 3E. Navegar al home con medio registrado

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 3E.1 | Con al menos 1 medio registrado, tocás **"Ir a explorar subastas"** | Botón activo (amarillo), navegás al home de subastas | Sigue deshabilitado |

### 3F. Verificar medios de pago (operación de empleado)
🔧 Swagger — sin pantalla en el front.

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 3F.1 | `GET /mediosPago?cliente_id=<id_carlos>` | 3 medios con `estado="pendiente"` |
| 3F.2 | `PUT /mediosPago/<id>/estado?estado=verificado` para cada uno | 200 |

---

## Flujo 4 — Navegación por Tabs (BottomTabBar)

> Logueado como `prueba@test.com`. Verificar que los tabs naveguen correctamente.

| Paso | Dónde estás | Qué hacés | Resultado esperado | Falla si… |
|------|-------------|----------|--------------------|-----------|
| 4A.1 | 📱 Home (`/exploracion`) | Tocás tab **"Vender"** | Navegás a pantalla de vender | No pasa nada |
| 4A.2 | 📱 `/vender` | Tocás tab **"Explorar"** | Volvés al home con todas las subastas | No pasa nada |
| 4A.3 | 📱 Home | Tocás tab **"Perfil"** | Navegás a pantalla de perfil | No pasa nada |
| 4A.4 | 📱 `/perfil` | Tocás tab **"Explorar"** | Volvés al home | No pasa nada |
| 4A.5 | 📱 `/exploracion/catalogo` (catálogo de una subasta) | Tocás tab **"Explorar"** | Volvés al home con **todas** las subastas | Queda en catálogo |

---

## Flujo 5 — Home y Catálogo de Subastas

> Logueado como `prueba@test.com` (categoría comun).

### 5A. Home de subastas

| Paso | Qué ves / hacés | Resultado esperado | Falla si… |
|------|----------------|--------------------|-----------|
| 5A.1 | 📱 Tab **Explorar** | Subasta destacada arriba + otras subastas debajo | Pantalla vacía o error |
| 5A.2 | Ves badges de fecha: **HOY**, **EN X DÍAS**, **PASADA** o fecha exacta | Badge correcto según la fecha | Fechas incorrectas |
| 5A.3 | Ves badges de categoría: COMÚN, ESPECIAL, ORO… | Solo subastas con categoría ≤ "comun" visibles para este usuario | Aparece subasta oro/platino |
| 5A.4 | Footer del BottomTabBar | **Separado** de la pantalla con margen inferior correcto | Pegado al borde |
| 5A.5 | Navegás a otra tab y volvés a Explorar | Datos se refrescan automáticamente | Datos viejos |

### 5B. Catálogo de una subasta

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 5B.1 | Tocás una subasta del home | Navegás al catálogo de esa subasta con la lista de lotes | Error "No se especificó la subasta" |
| 5B.2 | Ves cada lote: imagen, nombre, descripción corta, precio base | Todo visible | Campos `undefined` |
| 5B.3 | Lote con `subastado="si"` | Badge **ADJUDICADO** y botón "Ver Detalles" deshabilitado | Badge ausente |
| 5B.4 | Tocás **"VER DETALLES"** en un lote disponible | Navegás a detalle con descripción completa | Error |
| 5B.5 | Tocás tab **"Explorar"** desde el catálogo | Volvés al home con **todas** las subastas | Queda en catálogo |

---

## Flujo 6 — Sala de Subastas en Vivo

> Requiere subasta con ítems disponibles (seed ya las crea).
> Para testing rápido: agregar `AUCTION_ITEM_TIMEOUT=10` en el docker-compose.

### 6A. Acceso sin sesión (guard de seguridad)

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 6A.1 | Cerrás y reabrís la app (sesión perdida), intentás entrar a la sala directamente desde una URL/link | Redirige a `/sign-in` automáticamente | Carga la sala con pantalla rota |
| 6A.2 | Desde el catalogo sin sesión, tocás "ENTRAR EN VIVO" | Redirige a `/sign-in` | Entra a la sala |

### 6B. Modo observador (sin medio de pago verificado)

> Usar un usuario que tiene medios de pago en estado `"pendiente"` (nunca verificados).

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 6B.1 | 📱 Login con usuario sin medio verificado, tocás **"ENTRAR EN VIVO"** | Entrás a la sala normalmente | Error 403 al entrar |
| 6B.2 | Ves el banner azul **"Modo observador"** con el mensaje "Para pujar necesitás al menos un medio de pago verificado por la casa de subastas." | Banner visible arriba del área de puja | Banner ausente |
| 6B.3 | Los botones de incremento rápido **no se muestran** | Área de puja rápida oculta | Botones visibles aunque no pueda usarlos |
| 6B.4 | El campo de monto personalizado **no se muestra** | Campo oculto | Campo visible |
| 6B.5 | El botón principal dice **"SOLO OBSERVADOR"** y está gris/deshabilitado | No se puede tocar | Botón activo |
| 6B.6 | Ves precio actual, pujas totales, actividad reciente en tiempo real | Datos actualizados por WS normalmente | Pantalla congelada |
| 6B.7 | 🔧 Swagger: verificar medio del usuario (`PUT /mediosPago/{id}/estado?estado=verificado`) | 200 |  |
| 6B.8 | 📱 Salís y volvés a entrar a la sala | Banner desaparece, botones de puja visibles, botón dice **"PUJAR AHORA"** | Sigue en modo observador |

### 6C. Entrar a la sala con medio verificado

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 6C.1 | 📱 Logueado como `prueba@test.com` (tiene cuenta bancaria verificada), tocás **"ENTRAR EN VIVO"** | Registro como asistente + conexión WebSocket; **sin** banner observador | Banner azul aparece igual |
| 6C.2 | Mientras registra el asistente (fracción de segundo) | Banner amarillo **"Registrando tu participación…"** breve | Nada visible |
| 6C.3 | Una vez registrado: ves nombre del producto, precio base, próxima puja mínima, puja máxima | Datos del primer ítem | Campos en 0 |
| 6C.4 | Ves 3 **botones de incremento rápido** con montos calculados (+$X) | Botones visibles y tocables | Botones ausentes |
| 6C.5 | Ves el campo de **monto personalizado** | Input visible | Campo ausente |
| 6C.6 | Error al registrarse (categoría insuficiente, multa) | Banner **rojo** con el mensaje de error; botón dice **"NO PODÉS PUJAR"** | Botón gris sin explicación |

### 6D. Pujas válidas

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 6D.1 | Tocás el primer botón de incremento | Botón se resalta, se selecciona ese monto | Nada cambia |
| 6D.2 | Tocás **"PUJAR AHORA"** | Puja enviada, precio sube, actividad reciente actualizada | Error inesperado |
| 6D.3 | Todos los conectados ven el nuevo precio en tiempo real | WS broadcast recibido | Requiere refresh |
| 6D.4 | Escribís importe personalizado (incremento dentro del rango) | Botones de incremento se deseleccionan; puja enviada | Error inesperado |

### 6E. Validaciones de puja

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 6E.1 | Tocás "PUJAR AHORA" sin seleccionar nada ni escribir monto | Alerta "Seleccioná un monto" | Intenta enviar la puja |
| 6E.2 | Monto personalizado que da un `importe < proximaPuja` | Alerta "Monto muy bajo" con el mínimo | Deja pujar |
| 6E.3 | Monto personalizado que da un `importe > pujaMaxima` | Alerta "Monto muy alto" con el máximo | Deja pujar |
| 6E.4 | Doble tap en pujar | Solo se envía una puja (botón dice "PROCESANDO..." mientras espera) | Se envían dos |

### 6F. Multi-usuario (dos dispositivos o emulador + dispositivo)

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 6F.1 | Dispositivo B: login como `prueba2@test.com`, entrar a la misma subasta | Ambos conectados y ven el mismo estado | Error |
| 6F.2 | Dispositivo A puja | B ve el nuevo precio en tiempo real sin hacer nada | B no se actualiza |
| 6F.3 | Dispositivo A intenta conectarse a **otra** subasta simultáneamente | Error "Ya estás conectado a la subasta #X" | Deja conectar a dos |

### 6G. Cierre automático de ítem

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 6G.1 | Esperás sin pujar (AUCTION_ITEM_TIMEOUT segundos) | Overlay **"VENDIDO"** con nombre del ganador | No aparece overlay |
| 6G.2 | Si sos el ganador | Overlay muestra **"¡ES TUYO!"** + "Seguís en la subasta — pagás todo al final" | Muestra nombre genérico |
| 6G.3 | Overlay desaparece (~4s) y aparece el siguiente ítem | Nuevo producto en pantalla automáticamente | Queda congelado |
| 6G.4 | Si nadie pujó el ítem | Overlay muestra **"Casa de Subastas"** como ganadora | No aparece |
| 6G.5 | Todos los ítems cierran | Pantalla de cierre; si ganaste → botón para ver ganancias | Nada pasa |

---

## Flujo 7 — Cierre de Subasta y Pago

> Continuación del Flujo 6, o usar `python -m scripts.seed compras` para simular compras sin correr la subasta.

### 7A. Pantalla de ganador

| Paso | Qué ves | Resultado esperado | Falla si… |
|------|--------|--------------------|-----------|
| 7A.1 | Trofeo + "¡Felicidades, sos el ganador!" | Pantalla de victoria | Pantalla vacía |
| 7A.2 | Lista de productos ganados con precio final | Todos los ítems listados | Faltan ítems |
| 7A.3 | Desglose: **Precio** + **Comisión** + **Seguro** = **Total** | Comisión = importe × % / 100 (no el % raw) | Comisión incorrecta |
| 7A.4 | Tocás **"Confirmar entrega"** | Navegás a delivery-details | No navega |

### 7B. Detalle de envío

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 7B.1 | Seleccionás método de envío | Selección visible | No hay opciones |
| 7B.2 | Confirmás | POST a `/compras/envio`, navegás a confirm-payment | Error |
| 7B.3 | 🔧 Swagger `GET /subasta/{id}/{uid}/compras` | Campo `metodo_envio` guardado en los registros | Campo null |

### 7C. Confirmación de pago (happy path — cuenta ARS)

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 7C.1 | Ves lista de medios de pago | Solo aparecen los `estado="verificado"` | Aparecen pendientes |
| 7C.2 | Total mostrado | Igual al de winner.tsx | Diferente |
| 7C.3 | Seleccionás la **cuenta bancaria ARS** | Radio button activo | No se puede seleccionar |
| 7C.4 | Tocás **"Finalizar Compra"** | 200, `pagado="si"` en los registros | Error 422 |
| 7C.5 | Volvés a winner.tsx | **Total = $0.00** (todo pagado) | Sigue mostrando el total |
| 7C.6 | Sin seleccionar ningún medio | Error o botón deshabilitado | Intenta pagar igual |

### 7D. Validaciones de pago — subasta USD

| Paso | Qué hacés | Resultado esperado |
|------|----------|--------------------|
| 7D.1 | 🔧 Swagger: crear subasta con `moneda="USD"` | 201 |
| 7D.2 | 📱 Intentar pagar con cuenta ARS | Error "La subasta es en USD. El medio de pago debe ser en dólares." |
| 7D.3 | 📱 Intentar pagar con tarjeta nacional USD | Error "Para subastas en USD se requiere una tarjeta internacional." |
| 7D.4 | 📱 Intentar pagar con cheque | Error "Los cheques certificados no pueden usarse para pagar subastas en USD." |
| 7D.5 | 📱 Pagar con tarjeta internacional USD verificada | 200 OK |

### 7E. Cheque con saldo insuficiente → multa

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 7E.1 | Usuario con cheque de $10, compra de $500 | Setup preparado |  |
| 7E.2 | Intentar pagar con ese cheque | 422 "saldo no alcanza… Se registró una multa del 10%." | Error diferente o sin mensaje |
| 7E.3 | 🔧 Swagger `GET /multas/<cliente_id>` | 1 multa `pagado="no"`, `monto = suma_pujado * 0.10` | Lista vacía |
| 7E.4 | Repetir el pago fallido | 422 (sin crear segunda multa) | Crea dos multas |

---

## Flujo 8 — Multas

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 8.1 | Intentar entrar a sala de subastas con multa activa | Error 403 "Tenés una multa pendiente de pago. Debés abonarla antes de participar en otra subasta." | Deja entrar |
| 8.2 | 🔧 Swagger `POST /multas/<multa_id>/pagar` | 200 "Multa pagada correctamente" |  |
| 8.3 | Repetir 8.2 | 409 "La multa ya fue pagada" |  |
| 8.4 | 📱 Intentar entrar a sala nuevamente | Acceso permitido | Sigue bloqueado |

---

## Flujo 9 — Perfil y Logout

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 9.1 | 📱 Tocás tab **"Perfil"** | Pantalla de perfil con **nombre y mail reales** del usuario logueado (de la sesión) | Muestra "Bautista Damian" hardcodeado |
| 9.2 | Ves botón **"Cerrar Sesión"** con ícono de logout | Visible al final del scroll | Botón ausente |
| 9.3 | Tocás **"Cerrar Sesión"** | Sesión se borra, navegás a pantalla de login — **no podés volver atrás con el botón físico** | Vuelve a la pantalla anterior con sesión activa |
| 9.4 | Intentás volver a la sala de subastas (back) | Redirige a `/sign-in` (sesión ya no existe) | Entra sin sesión |
| 9.5 | Tocás **"Editar Perfil"** | Campos se vuelven editables | No hace nada |
| 9.6 | Tocás **"Guardar Cambios"** | Modo edición se cierra | Error o no responde |

---

## Flujo 10 — Casos de Error Globales

### 10A. Sesión perdida (app reiniciada)

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 10A.1 | Cerrás y reabrís la app | Pantalla de login (sesión en memoria se pierde) | Entra directo al home |
| 10A.2 | Intentás navegar a la sala de subastas sin sesión | Redirige a `/sign-in` automáticamente | Carga la sala rota |

### 10B. Sin conexión al backend

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 10B.1 | Detenés Docker, intentás login | Mensaje de error de red | Crash |
| 10B.2 | En sala de subastas, cortás la red | Badge cambia a "CONECTANDO..." | Pantalla congelada |

### 10C. Categoría insuficiente

| Paso | Qué hacés | Resultado esperado | Falla si… |
|------|----------|--------------------|-----------|
| 10C.1 | 🔧 Swagger: crear subasta `categoria="platino"` | 201 |  |
| 10C.2 | 📱 Login como `prueba@test.com` (comun) → home | Subasta platino **no aparece** | Aparece |
| 10C.3 | 📱 Tocar "Entrar en vivo" en esa subasta | Error 403 | Deja entrar |

---

## Flujo 11 — E2E Completo desde Cero

> Simula un usuario real que no existía antes. Usa todos los flujos anteriores en secuencia.

| # | Quién | Dónde | Acción | Resultado esperado |
|---|-------|-------|--------|--------------------|
| 1 | Usuario | 📱 `register.tsx` | Registro con DNI `"11223344"`, mail `"e2e@test.com"` | Pantalla de verificación con polling activo |
| 2 | Empleado | 🔧 Swagger | `GET /auth/registro/pendientes` → anotar `personaId` | Aparece el usuario en la lista |
| 3 | Empleado | 🔧 Swagger | `POST /auth/registro/aprobar` `{"personaId": X, "verificador": 1, "categoria": "especial"}` | 200 aprobado |
| 4 | Usuario | 📱 `verification.tsx` | Espera el siguiente poll (~10s) | Navega automáticamente a `register_final` |
| 5 | Usuario | 📱 `register_final.tsx` | Crea clave `"E2eTest1."` | Clave guardada, va a `payments.tsx` |
| 6 | Usuario | 📱 `payments.tsx` | Intenta ir sin medio de pago | Botón deshabilitado + aviso amarillo |
| 7 | Usuario | 📱 `payments.tsx` | Agrega tarjeta VISA internacional USD | Aparece en lista con badge "Pendiente" |
| 8 | Usuario | 📱 `payments.tsx` | Toca **"Ir a explorar subastas"** con el medio pendiente | Botón activo (tener medio registrado alcanza para entrar) |
| 9 | Usuario | 📱 Home → Catálogo → **"ENTRAR EN VIVO"** | Entra a la sala | Banner **"Modo observador"** visible; botón dice "SOLO OBSERVADOR" |
| 10 | Empleado | 🔧 Swagger | `PUT /mediosPago/{id}/estado?estado=verificado` | 200 verificado |
| 11 | Usuario | 📱 Sale y vuelve a entrar a la sala | Entra nuevamente | **Sin** banner observador; botones de puja visibles |
| 12 | Usuario | 📱 Sala | Selecciona incremento rápido + toca "PUJAR AHORA" | Precio sube, broadcast recibido |
| 13 | Usuario | 📱 Sala | Espera cierre del ítem (timeout) | "¡ES TUYO!" si ganaste |
| 14 | Usuario | 📱 `winner.tsx` | Ve compras y desglose con comisión correcta | Números correctos |
| 15 | Usuario | 📱 Delivery | Selecciona domicilio → Confirmar | Envío guardado |
| 16 | Usuario | 📱 Confirm-payment | Selecciona tarjeta internacional USD → Finalizar | 200, `pagado="si"` |
| 17 | Usuario | 📱 Vuelve a winner | Total = $0.00 | Flujo completo |
| 18 | Usuario | 📱 Tab **Perfil** | Ves nombre y mail reales del usuario (no hardcodeados) | Datos de otra persona |
| 19 | Usuario | 📱 Perfil → **"Cerrar Sesión"** | Sesión borrada, navega a sign-in, no se puede volver atrás | Permanece logueado |

---

## Checklist rápido de pantallas

| Pantalla | Conectada al back | Notas |
|----------|:-----------------:|-------|
| `login.tsx` | ✅ | Landing de bienvenida |
| `register.tsx` | ✅ | Valida doc + email únicos; 409 muestra mensaje correcto según qué duplica |
| `sign-in.tsx` | ✅ | Link "Verificar estado"; 403 diferencia rechazado vs pendiente |
| `verification.tsx` | ✅ | Polling automático cada 10s + botón manual + pantalla de rechazo automática |
| `register_final.tsx` | ✅ | Cambio de clave |
| `payments.tsx` | ✅ | Botón deshabilitado sin medios registrados; navega a `/exploracion` |
| `exploracion/index.tsx` | ✅ | Footer con safe area correcto |
| `exploracion/catalogo.tsx` | ✅ | Footer con safe area correcto |
| `exploracion/detalle-lote.tsx` | ✅ | |
| `exploracion/subasta-vivo.tsx` | ✅ WS + REST | Guard de sesión; banner observador si sin medio verificado; errores visibles en pantalla |
| `cierre-subasta/winner.tsx` | ✅ | |
| `cierre-subasta/delivery-details.tsx` | ✅ | |
| `cierre-subasta/confirm-payment.tsx` | ✅ | |
| `perfil/index.tsx` | ✅ | Nombre/mail reales de sesión; logout limpia sesión con `replace` |
| `perfil/estadisticas.tsx` | ⚠️ | Verificar si llama al back |
| `vender/` (todas) | ⚠️ | Verificar integración con back |
| `BottomTabBar` | ✅ | Auto-navega sin necesitar `onTabPress` |
