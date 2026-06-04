# Documentación de Implementación — Mercado Subastas

> Cada sección mapea una funcionalidad a sus archivos backend, frontend, reglas de negocio aplicadas y cita del enunciado que la justifica.

---

## 1. Registro de Usuario (2 etapas)

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/auth.py` | `iniciar_registro` → `POST /auth/registro/iniciar` |
| `app/routers/auth.py` | `aprobar_registro` → `POST /auth/registro/aprobar` |
| `app/routers/auth.py` | `desaprobar_registro` → `POST /auth/registro/desaprobar` |
| `app/models.py` | `Persona`, `PersonaDetalle`, `Cliente` |
| `app/schemas.py` | `RegistroIniciarRequest`, `RegistroIniciarResponse`, `RegistroVerificacionRequest` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/register.tsx` | Formulario etapa 1: nombre, apellido, DNI, email, dirección, país |
| `app/register_final.tsx` | Pantalla de espera / confirmación de registro |
| `app/verification.tsx` | Estado de verificación post-registro |
| `constants/api.ts` | Endpoints `registro/iniciar`, `registro/aprobar`, `registro/desaprobar` |

### Reglas de negocio
1. **Etapa 1 (usuario):** Se crea `Persona` + `PersonaDetalle` con `claveTemporal=True`, `estado="inactivo"`, sin `Cliente` todavía.
2. **Etapa 2 (empleado aprueba):** Se crea `Cliente` con `admitido="si"`, la categoría asignada explícitamente por el empleado (campo `categoria` en el request), y `persona.estado = "activo"`.
3. **Etapa 2 (empleado rechaza):** Se crea `Cliente` con `admitido="no"`, `persona.estado` permanece `"inactivo"`.
4. **Doble llamada protegida:** Si ya existe un `Cliente` para la persona, retorna 409.
5. **Categoría válida:** Si se pasa una categoría no válida al aprobar, retorna 422.

### Justificación enunciado
> *"El mecanismo de registración de los postores se realiza en dos etapas... verificados por la empresa de subastas mediante una investigación externa y si se lo acepta se le asigna una categoría de acuerdo con la investigación realizada."*

---

## 2. Login y Cambio de Clave

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/auth.py` | `login` → `POST /auth/login` |
| `app/routers/auth.py` | `cambiar_clave` → `PUT /auth/cambiar-clave` |
| `app/schemas.py` | `LoginRequest`, `Usuario`, `CambiarClaveRequest` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/sign-in.tsx` | Pantalla de login |
| `app/login.tsx` | Landing con opciones |
| `store/session.ts` | Almacena `identificador` y `categoria` post-login |
| `constants/api.ts` | Endpoints `login`, `cambiar-clave` |

### Reglas de negocio
1. Si el usuario no existe en `PersonaDetalle` → 401.
2. Si `claveTemporal=True` → se omite verificación de contraseña (primer ingreso).
3. Si no existe `Cliente` para la persona → 403 "aún no verificado".
4. Si `cliente.admitido != "si"` → 403 "cuenta no habilitada".
5. `cambiar_clave` hashea con bcrypt y pone `claveTemporal=False`.

### Justificación enunciado
> *"se le envía un mail informándole que debe ingresar a la app y completar el registro y generar su clave personal... La aplicación móvil requiere que los postores se encuentren registrados para poder participar y se identifiquen antes de su participación."*

---

## 3. Medios de Pago

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/medios_pago.py` | `create_cuenta_bancaria` → `POST /mediosPago/cuenta-bancaria` |
| `app/routers/medios_pago.py` | `create_tarjeta` → `POST /mediosPago/tarjeta` |
| `app/routers/medios_pago.py` | `create_cheque_certificado` → `POST /mediosPago/cheque` |
| `app/routers/medios_pago.py` | `get_medios_pago_cliente` → `GET /mediosPago?cliente_id=` |
| `app/routers/medios_pago.py` | `ep_update_estado_medio_pago` → `PUT /mediosPago/{id}/estado` |
| `app/routers/medios_pago.py` | `ep_delete_medio_pago` → `DELETE /mediosPago/{id}` |
| `app/models.py` | `MedioPago`, `mpCuentaBancaria`, `mpTarjeta`, `mpChequeCertificado` |
| `app/schemas.py` | `CuentaBancariaCreate`, `TarjetaCreate`, `ChequeCertificadoCreate`, `MedioPagoItem`, `MedioPagoListResponse` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/payments.tsx` | Alta de tarjeta, cuenta bancaria, cheque; listado de medios |
| `constants/api.ts` | Endpoints `/mediosPago/*` |

### Reglas de negocio
1. Todo medio de pago nace con `estado="pendiente"` — debe ser verificado por un empleado.
2. Tarjeta: marca debe ser VISA, MASTERCARD o AMEX (validado en el endpoint).
3. Cheque: `monto_disponible` se inicializa igual al `monto` declarado.
4. Cuenta bancaria: puede ser nacional o extranjera (`esInternacional`).
5. Solo un empleado puede pasar un medio a `"verificado"` o `"rechazado"` via `PUT /mediosPago/{id}/estado`.
6. Sin medio verificado no se puede pujar (validado en `create_pujo`).

### Justificación enunciado
> *"el usuario debe registrar al menos un medio de pago... Estos pueden ser cuentas bancarias (pueden ser bancos extranjeros)... tarjetas de crédito (nacionales o extranjeras) o cheques certificados... entregado y verificado ANTES del inicio de la subasta."*

---

## 4. Verificación de Dueños

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/personas.py` | `ep_create_duenio` → `POST /duenios/` |
| `app/routers/personas.py` | `ep_update_duenio_verificacion` → `PUT /duenios/{id}/verificacion` |
| `app/models.py` | `Duenio` |
| `app/schemas.py` | `DuenioCreate`, `DuenioResponse`, `DuenioVerificacionUpdate` |

### Frontend
No tiene pantalla específica (operación de empleado interna).

### Reglas de negocio
1. Un dueño nace con `verificacionFinanciera="no"`, `verificacionJudicial="no"`, `calificacionRiesgo=6`.
2. Un empleado puede actualizar cualquiera de los tres campos individualmente via `PATCH`-style (campos opcionales).
3. `calificacionRiesgo` debe estar entre 1 y 6.

### Justificación enunciado
> *"La empresa en caso de duda deberá avisará a las autoridades sobre dudas en el origen... debe poder acreditar el origen lícito de los bienes a subastar."*

---

## 5. Home y Catálogo de Subastas

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/catalogo.py` | `get_home` → `GET /home?categoria=` |
| `app/routers/catalogo.py` | `get_catalogo_subasta` → `GET /subastas/{id}/catalogo` |
| `app/routers/catalogo.py` | `get_detalle_producto_catalogo` → `GET /subastas/{id}/catalogo/{productoId}` |
| `app/models.py` | `Subasta`, `Catalogo`, `ItemCatalogo`, `Producto`, `ProductoPresentacion`, `HistorialPujos` |
| `app/utils.py` | `CATEGORIA_ORDER`, `get_foto_b64` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/exploracion/index.tsx` | Home con subasta destacada + generales |
| `app/exploracion/catalogo.tsx` | Listado de productos de una subasta |
| `app/exploracion/detalle-lote.tsx` | Detalle de producto (precio base, descripción, imagen) |
| `constants/api.ts` | Endpoints `/home`, `/subastas/{id}/catalogo` |

### Reglas de negocio
1. El home filtra subastas donde `estado="abierta"` y `categoria` accesible por el usuario.
2. La categoría accesible se calcula con `CATEGORIA_ORDER`: un usuario "plata" ve subastas de categoría comun, especial y plata.
3. El catálogo muestra precio base **solo a usuarios registrados** (el endpoint requiere autenticación implícita por diseño).
4. Las imágenes se sirven como base64 desde la tabla `fotos`.
5. La actividad reciente toma los últimos 5 registros de `HistorialPujos`.

### Justificación enunciado
> *"Los catálogos son públicos, pero solo los usuarios registrados (de cualquier categoría) pueden ver su precio base de venta... Para que un postor pueda acceder a una subasta determinada debe encontrarse registrado y la categoría de la subasta debe ser menor o igual que la propia."*

---

## 6. Registro de Asistente

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/subastas.py` | `find_or_create_asistente` → `POST /asistentes/registrar` |
| `app/models.py` | `Asistente` |
| `app/schemas.py` | `AsistenteRegistrarRequest`, `AsistenteRegistrarResponse` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/exploracion/subasta-vivo.tsx` | Llama a `/asistentes/registrar` al ingresar a la sala |
| `constants/api.ts` | Endpoint `/asistentes/registrar` |

### Reglas de negocio
1. Si el usuario ya es asistente de esa subasta, retorna el registro existente (`creado=False`).
2. La categoría del cliente debe ser `>=` la categoría de la subasta.
3. Si el cliente tiene multas pendientes (`Multa.pagado="no"`), se bloquea con 403.
4. El `numeroPostor` se asigna automáticamente como `max(existentes) + 1`.

### Justificación enunciado
> *"Para que un postor pueda acceder a una subasta determinada debe encontrarse registrado y la categoría de la subasta debe ser menor o igual que la propia."*
> *"el usuario recibirá una multa... que deberá abonar antes de poder participar en otra subasta."*

---

## 7. Sala de Subastas en Vivo (WebSocket)

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/subastas.py` | `ws_subasta` → `WS /ws/subasta/{id}?clienteId=` |
| `app/routers/subastas.py` | `get_subasta_en_vivo` → `GET /subasta/{id}/vivo` |
| `app/routers/subastas.py` | `ConnectionManager` (clase) |
| `app/routers/subastas.py` | `_cerrar_item` (tarea async) |
| `app/models.py` | `Pujo`, `HistorialPujos`, `ItemCatalogo`, `Subasta` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/exploracion/subasta-vivo.tsx` | Sala principal: estado de subasta, precio actual, pujas |
| `hooks/useAuctionWebSocket.ts` | Maneja conexión WS, mensajes `auction_state`, `bid_update`, `item_closed`, `auction_ended` |
| `hooks/usePlaceBid.ts` | POST a `/pujar` |
| `constants/api.ts` | Endpoints `/ws/subasta/{id}`, `/subasta/{id}/vivo`, `/pujar` |

### Reglas de negocio
1. Un usuario no puede estar conectado a más de una subasta simultáneamente (`ConnectionManager.user_subasta`).
2. Al conectarse, si la fecha/hora de la subasta ya pasó y no hay timer activo, se inicia el countdown automáticamente.
3. Cada ítem tiene `AUCTION_ITEM_TIMEOUT` segundos de inactividad antes de cerrarse (configurable via env var, default 30s).
4. Un nuevo timer se inicia automáticamente para el siguiente ítem al cerrarse el actual.
5. El servidor hace broadcast a todos los conectados en cada puja y cierre de ítem.
6. Si nadie puja, la empresa ("Casa de Subastas", doc `00000000`) compra al precio base.
7. El mensaje `item_closed` incluye `ganadorClienteId` para que el front detecte si el usuario ganó.

### Justificación enunciado
> *"La empresa puede hacer varias subastas al mismo tiempo, pero los usuarios no pueden estar conectados en más de una a la vez."*
> *"Los usuarios conectados deben recibir en tiempo real las modificaciones de las ofertas."*
> *"Si nadie puja por un artículo, la empresa compra el mismo por el valor base al finalizar la subasta."*

---

## 8. Sistema de Pujas

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/subastas.py` | `create_pujo` → `POST /pujar` |
| `app/models.py` | `Pujo`, `HistorialPujos` |
| `app/schemas.py` | `PujoRequest`, `PujoResponse` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/exploracion/subasta-vivo.tsx` | Botones de puja con incrementos sugeridos |
| `hooks/usePlaceBid.ts` | Lógica de envío de puja |

### Reglas de negocio
1. El asistente debe pertenecer a la misma subasta que el ítem (`asistente.subasta == catalogo.subasta`).
2. El ítem no debe estar ya cerrado (`subastado != "si"`).
3. El usuario debe tener al menos un medio de pago verificado.
4. Si todos los medios verificados son cheques, el compromiso pendiente (pujos ganadores no pagados) más el nuevo importe no puede superar el `monto_disponible` total.
5. Para subastas que no son "oro" o "platino":
   - Mínimo: `precio_actual + precio_base * 0.01`
   - Máximo: `precio_actual + precio_base * 0.20`
6. Al ganar, los pujos anteriores del mismo ítem pasan a `ganador="no"`.
7. Cada puja se registra en `HistorialPujos` con timestamp.
8. El timer del ítem se reinicia (cancela el anterior y crea uno nuevo).

### Justificación enunciado
> *"El monto de la puja debe ser al menos el mejor valor hasta el momento más el 1% del valor del valor base del bien... el monto de la puja no puede ser mayor al valor de la última oferta más el 20% del valor base del bien. Estos límites no aplican a las subastas de categorías oro y platino."*
> *"Solo podrá pujar en la misma si tiene al menos un medio de pago verificado por la empresa."*
> *"sus compras no pueden superar dicho monto [cheque certificado]."*

---

## 9. Cierre Automático de Ítems y Registro de Venta

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/subastas.py` | `_cerrar_item` (tarea async interna) |
| `app/models.py` | `RegistroSubasta`, `ItemCatalogo` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `hooks/useAuctionWebSocket.ts` | Maneja mensaje `item_closed` → navega a `/cierre-subasta/winner` si ganó |
| `app/cierre-subasta/winner.tsx` | Pantalla de ganador con resumen de compras |

### Reglas de negocio
1. Al cierre, `ItemCatalogo.subastado` pasa a `"si"`.
2. Se crea `RegistroSubasta` con `importe` (monto pujado), `comision` (calculada como `importe * comision% / 100`), `pagado="no"`.
3. Si nadie pujó, la "Casa de Subastas" es el cliente en `RegistroSubasta` y el importe es el `precioBase`.
4. Al cerrarse un ítem, se inicia automáticamente el timer del siguiente.
5. Cuando todos los ítems están cerrados, se emite `auction_ended`.

### Justificación enunciado
> *"Cuando ya nadie puja con un valor más alto, el usuario de la última puja pasa a ser el nuevo dueño de la pieza. Se registra la venta del objeto... La pieza se marca como vendida y se actualizan todos los datos."*

---

## 10. Compras Post-Subasta

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/compras.py` | `get_compras` → `GET /subasta/{id}/{uid}/compras` |
| `app/routers/compras.py` | `get_precio_total` → `GET /subasta/{id}/{uid}/compras/precio` |
| `app/routers/compras.py` | `confirmar_envio` → `POST /subasta/{id}/{uid}/compras/envio` |
| `app/routers/compras.py` | `confirmar_pago` → `POST /subasta/{id}/{uid}/compras/pagar` |
| `app/models.py` | `RegistroSubasta`, `Seguro` |
| `app/schemas.py` | `ProductoComprado`, `PrecioFinal` |

### Frontend
| Archivo | Rol |
|---------|-----|
| `app/cierre-subasta/winner.tsx` | Lista de ítems ganados con precio |
| `app/cierre-subasta/delivery-details.tsx` | Selección y confirmación de envío |
| `app/cierre-subasta/confirm-payment.tsx` | Selección de medio de pago y confirmación |
| `constants/api.ts` | Endpoints `/compras`, `/compras/precio`, `/compras/envio`, `/compras/pagar` |

### Reglas de negocio
1. `get_precio_total` solo incluye ítems **no pagados** (excluye productos con `RegistroSubasta.pagado="si"`). Suma: importe pujado + comisión (%) + seguro (si aplica).
2. `confirmar_envio` guarda el método de envío en `RegistroSubasta.metodo_envio` para todos los registros del usuario en esa subasta.
3. `confirmar_pago` valida:
   - El medio pertenece al usuario.
   - El medio está verificado (`estado="verificado"`).
   - Si la subasta es en USD: el medio debe tener `moneda="USD"`; si es tarjeta además debe ser `es_internacional="si"`; cheques no válidos para USD.
   - Si el pago es con cheque: se descuenta `total` de `monto_disponible`.
4. Al pagar, todos los `RegistroSubasta` pendientes pasan a `pagado="si"` y se registra el `medio_pago`.

### Justificación enunciado
> *"Se le informa por medio de un mensaje privado el importe que debe pagar indicando lo pujado, las comisiones y el costo de enviarlo a la dirección declarada."*
> *"En el caso de las subastas en dólares las mismas deben ser canceladas en dicha moneda (ya sea por transferencia o por una tarjeta internacional)."*

---

## 11. Sistema de Multas

### Backend
| Archivo | Función/Endpoint |
|---------|-----------------|
| `app/routers/compras.py` | `ep_get_multas` → `GET /multas/{cliente_id}` |
| `app/routers/compras.py` | `ep_pagar_multa` → `POST /multas/{multa_id}/pagar` |
| `app/routers/subastas.py` | `find_or_create_asistente` (bloqueo por multa) |
| `app/models.py` | `Multa` |
| `app/schemas.py` | `MultaResponse` |

### Frontend
No tiene pantalla específica aún (el bloqueo se manifiesta al intentar registrarse como asistente).

### Reglas de negocio
1. Si al intentar pagar con cheque el saldo es insuficiente, se genera automáticamente una multa del **10% del importe total pujado**, con plazo de 72 horas.
2. Solo se crea una multa por subasta+usuario (no se duplica si el usuario reintenta pagar).
3. Con multa pendiente, el usuario no puede registrarse como asistente en ninguna nueva subasta.
4. Al pagar la multa (`POST /multas/{id}/pagar`), `Multa.pagado` pasa a `"si"` y el bloqueo se levanta.

### Justificación enunciado
> *"Si al momento de pagar el usuario no posee el dinero para cumplir con el pago, el usuario recibirá una multa equivalente al 10% del valor ofertado que deberá abonar antes de poder participar en otra subasta."*

---

## 12. Moneda de Subasta (ARS / USD)

### Backend
| Archivo | Campo/Endpoint |
|---------|---------------|
| `app/models.py` | `Subasta.moneda` (`VARCHAR`, check `IN ('ARS','USD')`) |
| `app/routers/subastas.py` | `create_subasta` — incluye `moneda` |
| `app/routers/compras.py` | `confirmar_pago` — valida `moneda` para pagos |
| `app/schemas.py` | `SubastaCreate.moneda`, `SubastaResponse.moneda` |

### Frontend
| Archivo | Rol |
|---------|-----|
| Futuro formulario de creación de subasta | Campo `moneda` en alta de subasta |

### Reglas de negocio
1. La moneda se define al crear la subasta y no puede modificarse después.
2. Por defecto es `"ARS"`.
3. Una subasta en USD solo acepta medios de pago en dólares (cuenta bancaria USD o tarjeta internacional USD).
4. No hay subastas bimonetarias.

### Justificación enunciado
> *"Las subastas pueden ser en pesos o en dólares. Esto está determinado para cada subasta en particular al momento de crear la misma, no es posible hacer una subasta bimonetaria."*

---

## 13. Utilidades de Desarrollo

### Backend
| Archivo | Endpoint |
|---------|---------|
| `app/routers/dev.py` | `DELETE /dev/reset/usuarios` |
| `app/routers/dev.py` | `DELETE /dev/reset/subasta/{id}` |

### Reglas
1. `reset/usuarios` elimina en cascada: historial, pujos, asistentes, medios de pago, registros, multas, clientes, dueños, subastadores, personas.
2. `reset/subasta/{id}` cancela timers activos, borra historial/pujos/registros/multas/asistentes de esa subasta y resetea `subastado="no"` en todos los ítems.

---

## 14. Helpers Compartidos

### Backend
| Archivo | Función |
|---------|---------|
| `app/utils.py` | `get_foto_b64(db, producto_id)` — codifica foto en base64 |
| `app/utils.py` | `CATEGORIA_ORDER` — orden numérico de categorías |

Usados en: `subastas.py`, `compras.py`, `catalogo.py`.

---

## 15. Seed de Datos

### Backend
| Archivo | Función |
|---------|---------|
| `scripts/seed.py` | `seed_paises()` — 4 países iniciales |
| `scripts/seed.py` | `seed_empleados()` — empleados ID 1, 2, 3 |
| `scripts/seed.py` | `seed_empresa()` — "Casa de Subastas" (doc `00000000`) como persona+cliente platino |
| `scripts/seed.py` | `seed_subastas()` — subastador, dueño, 5 productos, 2 subastas con catálogos |
| `scripts/seed.py` | `seed_usuario_prueba()` — `prueba@test.com` con cuenta bancaria verificada |
| `scripts/seed.py` | `seed_usuario_prueba_2()` — `prueba2@test.com` con tarjeta VISA verificada |
| `scripts/seed.py` | `seed_compras_prueba()` — simula 2 ítems ganados para testear el flujo de pago |

**Ejecución:**
```bash
python -m scripts.seed              # seed completo
python -m scripts.seed compras      # solo compras de prueba
```
