from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from . import crud, models, schemas
from .database import SessionLocal, engine
from .dev_router import router as dev_router
from .seeds import seed_paises, seed_empleados, seed_subastas, seed_usuario_prueba, seed_usuario_prueba_2, seed_empresa

# Segundos sin pujas para cerrar el ítem automáticamente (configurable via env)
AUCTION_ITEM_TIMEOUT = int(os.getenv("AUCTION_ITEM_TIMEOUT", "30"))

# Timers activos por item_catalogo_id
_item_timers: dict[int, asyncio.Task] = {}

# Crea las tablas si no existen
models.Base.metadata.create_all(bind=engine)

# Carga de datos iniciales
seed_paises()
seed_empleados()
seed_subastas()
seed_usuario_prueba()
seed_usuario_prueba_2()
seed_empresa()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── WebSocket connection manager ────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: dict[int, list[WebSocket]] = {}       # subasta_id → [ws]
        self.user_subasta: dict[int, int] = {}             # cliente_id → subasta_id activa

    async def connect(self, subasta_id: int, ws: WebSocket, cliente_id: int | None = None) -> str | None:
        """Acepta la conexión. Retorna un mensaje de error si el usuario ya está en otra subasta."""
        await ws.accept()
        # F3: un usuario no puede estar conectado a más de una subasta simultáneamente
        if cliente_id is not None:
            subasta_actual = self.user_subasta.get(cliente_id)
            if subasta_actual is not None and subasta_actual != subasta_id:
                return f"Ya estás conectado a la subasta #{subasta_actual}. Salí de ella primero."
            self.user_subasta[cliente_id] = subasta_id
        self.active.setdefault(subasta_id, []).append(ws)
        return None

    def disconnect(self, subasta_id: int, ws: WebSocket, cliente_id: int | None = None):
        if subasta_id in self.active:
            try:
                self.active[subasta_id].remove(ws)
            except ValueError:
                pass
            if not self.active[subasta_id]:
                del self.active[subasta_id]
        if cliente_id is not None and self.user_subasta.get(cliente_id) == subasta_id:
            del self.user_subasta[cliente_id]

    async def broadcast(self, subasta_id: int, message: dict):
        dead = []
        for ws in self.active.get(subasta_id, []):
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(subasta_id, ws)

manager = ConnectionManager()

def _vivo_to_dict(vivo: schemas.VivoSubasta) -> dict:
    return {
        "subastaId": vivo.subastaId,
        "categoriaSubasta": vivo.categoriaSubasta,
        "productoId": vivo.productoId,
        "itemCatalogoId": vivo.itemCatalogoId,
        "precioBase": vivo.precioBase,
        "titulo": vivo.titulo,
        "precioActual": vivo.precioActual,
        "proximaPuja": vivo.proximaPuja,
        "pujaMaxima": vivo.pujaMaxima,
        "imagen": vivo.imagen,
        "pujasTotales": vivo.pujasTotales,
        "incrementosSugeridos": vivo.incrementosSugeridos,
        "actividadReciente": [
            {
                "pujaId": a.pujaId,
                "nombreComprador": a.nombreComprador,
                "nombreProducto": a.nombreProducto,
                "fecha": a.fecha.isoformat(),
                "valor": a.valor,
            }
            for a in vivo.actividadReciente
        ],
    }

async def _cerrar_item(item_id: int, subasta_id: int):
    """Cierra el ítem actual tras AUCTION_ITEM_TIMEOUT segundos sin nuevas pujas."""
    try:
        await asyncio.sleep(AUCTION_ITEM_TIMEOUT)
    except asyncio.CancelledError:
        return  # Una nueva puja reinició el timer

    db = SessionLocal()
    try:
        winning_pujo = db.query(models.Pujo).filter(
            models.Pujo.item == item_id,
            models.Pujo.ganador == "si"
        ).first()
        item = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.identificador == item_id
        ).first()

        ganador_nombre    = None
        ganador_cliente_id = None
        importe_final     = 0.0

        if not item:
            return

        producto = db.query(models.Producto).filter(
            models.Producto.identificador == item.producto
        ).first()

        item.subastado = "si"

        if winning_pujo:
            # Usuario ganó el ítem
            asistente = db.query(models.Asistente).filter(
                models.Asistente.identificador == winning_pujo.asistente
            ).first()
            if asistente and producto:
                ganador_persona = db.query(models.Persona).filter(
                    models.Persona.identificador == asistente.cliente
                ).first()
                ganador_nombre     = ganador_persona.nombre if ganador_persona else "Desconocido"
                ganador_cliente_id = asistente.cliente
                importe_final      = float(winning_pujo.importe)
                db.add(models.RegistroSubasta(
                    subasta=subasta_id,
                    duenio=producto.duenio,
                    producto=item.producto,
                    cliente=asistente.cliente,
                    importe=winning_pujo.importe,
                    comision=item.comision,
                ))
        else:
            # F4: nadie pujó → la empresa compra por el precio base
            empresa = db.query(models.Persona).filter(
                models.Persona.documento == "00000000"
            ).first()
            if empresa and producto:
                ganador_nombre = "Casa de Subastas"
                importe_final  = float(item.precioBase)
                db.add(models.RegistroSubasta(
                    subasta=subasta_id,
                    duenio=producto.duenio,
                    producto=item.producto,
                    cliente=empresa.identificador,
                    importe=item.precioBase,
                    comision=item.comision,
                ))

        db.commit()

        # F6: incluir ganadorClienteId en el mensaje para que el front detecte si el usuario ganó
        await manager.broadcast(subasta_id, {
            "type": "item_closed",
            "data": {
                "itemCatalogoId":    item_id,
                "ganadorNombre":     ganador_nombre,
                "ganadorClienteId":  ganador_cliente_id,
                "importe":           importe_final,
            }
        })

        vivo = crud.get_subasta_en_vivo(db=db, subasta_id=subasta_id)
        if vivo:
            await manager.broadcast(subasta_id, {"type": "auction_state", "data": _vivo_to_dict(vivo)})
        else:
            await manager.broadcast(subasta_id, {"type": "auction_ended", "data": {"subastaId": subasta_id}})

    except Exception:
        db.rollback()
    finally:
        db.close()
        _item_timers.pop(item_id, None)

app.include_router(dev_router)

# Dependencia para obtener la DB en cada request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def hello_world():
    return {"message": "¡Bienvenido a la API del Mercado de Ari!"}

#------------------ Auth y Registro ------------------------#

@app.post("/auth/registro/iniciar", response_model=schemas.RegistroIniciarResponse)
def iniciar_registro(request: schemas.RegistroIniciarRequest, db: Session = Depends(get_db)):
    return crud.iniciar_registro(db=db, request=request)

@app.post("/auth/registro/aprobar", response_model=schemas.MensajeResponse)
def aprobar_registro(request: schemas.RegistroVerificacionRequest, db: Session = Depends(get_db)):
    return crud.aprobar_registro(db=db, request=request)

@app.post("/auth/registro/desaprobar", response_model=schemas.MensajeResponse)
def desaprobar_registro(request: schemas.RegistroVerificacionRequest, db: Session = Depends(get_db)):
    return crud.desaprobar_registro(db=db, request=request)

@app.post("/auth/login", response_model=schemas.Usuario)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    return crud.login(db=db, request=request)

@app.put("/auth/cambiar-clave", response_model=schemas.MensajeResponse)
def cambiar_clave(request: schemas.CambiarClaveRequest, db: Session = Depends(get_db)):
    return crud.cambiar_clave(db=db, request=request)

#------------------ Medios de pago -------------------------#

@app.get("/mediosPago", response_model=schemas.MedioPagoListResponse)
def get_medios_pago_cliente(cliente_id: int = Query(...), db: Session = Depends(get_db)):
    return crud.get_medios_pago_cliente(db=db, cliente_id=cliente_id)

@app.post("/mediosPago/cuenta-bancaria", response_model=schemas.CuentaBancariaResponse)
def create_cuenta_bancaria(request: schemas.CuentaBancariaCreate, db: Session = Depends(get_db)):
    return crud.create_cuenta_bancaria(db=db, request=request)

@app.get("/mediosPago/cuenta-bancaria/{medio_pago_id}", response_model=schemas.CuentaBancariaResponse)
def get_cuenta_bancaria(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_cuenta_bancaria(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
    return result

@app.post("/mediosPago/tarjeta", response_model=schemas.TarjetaResponse)
def create_tarjeta(request: schemas.TarjetaCreate, db: Session = Depends(get_db)):
    return crud.create_tarjeta(db=db, request=request)

@app.get("/mediosPago/tarjeta/{medio_pago_id}", response_model=schemas.TarjetaResponse)
def get_tarjeta(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_tarjeta(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
    return result

@app.post("/mediosPago/cheque", response_model=schemas.ChequeCertificadoResponse)
def create_cheque_certificado(request: schemas.ChequeCertificadoCreate, db: Session = Depends(get_db)):
    return crud.create_cheque_certificado(db=db, request=request)

@app.get("/mediosPago/cheque/{medio_pago_id}", response_model=schemas.ChequeCertificadoResponse)
def get_cheque_certificado(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_cheque_certificado(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cheque certificado no encontrado")
    return result

@app.get("/mediosPago/{medio_pago_id}", response_model=schemas.MedioPagoItem)
def get_medio_pago(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_medio_pago_detalle(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return result

@app.put("/mediosPago/{medio_pago_id}", response_model=schemas.MedioPagoItem)
def update_medio_pago(medio_pago_id: int, request: schemas.DescripcionUpdate, db: Session = Depends(get_db)):
    result = crud.update_medio_pago_descripcion(db=db, medio_pago_id=medio_pago_id, descripcion=request.descripcion)
    if result is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return result

@app.delete("/mediosPago/{medio_pago_id}")
def delete_medio_pago(medio_pago_id: int, db: Session = Depends(get_db)):
    db_medio = crud.delete_medio_pago(db=db, medio_pago_id=medio_pago_id)
    if db_medio is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return {"message": f"Medio de pago {medio_pago_id} eliminado con éxito"}

#------------------ Home y Catalogo ------------------------#

@app.post("/productos/", response_model=schemas.ProductoResponse, status_code=201)
def create_producto(request: schemas.ProductoCreate, db: Session = Depends(get_db)):
    return crud.create_producto(db=db, request=request)

@app.delete("/productos/{producto_id}")
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_producto(db=db, producto_id=producto_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay fotos, presentaciones o items de catálogo que dependen de este producto")
    if result is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": f"Producto {producto_id} eliminado con éxito"}

@app.post("/fotos/", response_model=schemas.FotoResponse, status_code=201)
def create_foto(request: schemas.FotoCreate, db: Session = Depends(get_db)):
    return crud.create_foto(db=db, request=request)

@app.delete("/fotos/{foto_id}")
def delete_foto(foto_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_foto(db=db, foto_id=foto_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay presentaciones que dependen de esta foto")
    if result is None:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return {"message": f"Foto {foto_id} eliminada con éxito"}

@app.post("/productos-presentacion/", response_model=schemas.ProductoPresentacionResponse, status_code=201)
def create_producto_presentacion(request: schemas.ProductoPresentacionCreate, db: Session = Depends(get_db)):
    return crud.create_producto_presentacion(db=db, request=request)

@app.delete("/productos-presentacion/{pp_id}")
def delete_producto_presentacion(pp_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_producto_presentacion(db=db, pp_id=pp_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay registros que dependen de esta presentación")
    if result is None:
        raise HTTPException(status_code=404, detail="Presentación no encontrada")
    return {"message": f"Presentación {pp_id} eliminada con éxito"}

@app.post("/catalogos/", response_model=schemas.CatalogoResponse, status_code=201)
def create_catalogo(request: schemas.CatalogoCreate, db: Session = Depends(get_db)):
    return crud.create_catalogo(db=db, request=request)

@app.delete("/catalogos/{catalogo_id}")
def delete_catalogo(catalogo_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_catalogo(db=db, catalogo_id=catalogo_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay items de catálogo que dependen de este catálogo")
    if result is None:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    return {"message": f"Catálogo {catalogo_id} eliminado con éxito"}

@app.post("/items-catalogo/", response_model=schemas.ItemCatalogoResponse, status_code=201)
def create_item_catalogo(request: schemas.ItemCatalogoCreate, db: Session = Depends(get_db)):
    return crud.create_item_catalogo(db=db, request=request)

@app.delete("/items-catalogo/{item_id}")
def delete_item_catalogo(item_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_item_catalogo(db=db, item_id=item_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay pujos que dependen de este item")
    if result is None:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return {"message": f"Item {item_id} eliminado con éxito"}

@app.get("/home", response_model=schemas.HomeResponse)
def get_home(categoria: str = Query(...), db: Session = Depends(get_db)):
    return crud.get_home(db=db, categoria=categoria)

@app.get("/subastas/{subasta_id}/catalogo", response_model=list[schemas.ProductoCatalogo])
def get_catalogo_subasta(subasta_id: int, db: Session = Depends(get_db)):
    result = crud.get_catalogo_subasta(db=db, subasta_id=subasta_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")
    return result

@app.get("/subastas/{subasta_id}/catalogo/{producto_id}", response_model=schemas.DetalleProducto)
def get_detalle_producto_catalogo(subasta_id: int, producto_id: int, db: Session = Depends(get_db)):
    result = crud.get_detalle_producto_catalogo(db=db, subasta_id=subasta_id, producto_id=producto_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado en el catálogo")
    return result

#------------------ Sala de Subastas -----------------------#

@app.get("/subastas/", response_model=list[schemas.SubastaResponse])
def get_subastas(db: Session = Depends(get_db)):
    return crud.get_subastas(db=db)

@app.post("/subastas/", response_model=schemas.SubastaResponse, status_code=201)
def create_subasta(request: schemas.SubastaCreate, db: Session = Depends(get_db)):
    return crud.create_subasta(db=db, request=request)

@app.delete("/subastas/{subasta_id}")
def delete_subasta(subasta_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_subasta(db=db, subasta_id=subasta_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay asistentes, catálogos u otros registros que dependen de esta subasta")
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")
    return {"message": f"Subasta {subasta_id} eliminada con éxito"}

@app.post("/asistentes/registrar", response_model=schemas.AsistenteRegistrarResponse)
def registrar_asistente(request: schemas.AsistenteRegistrarRequest, db: Session = Depends(get_db)):
    asistente, creado, error = crud.find_or_create_asistente(db=db, cliente=request.cliente, subasta=request.subasta)
    if error == "categoria_insuficiente":
        raise HTTPException(status_code=403, detail="Tu categoría no te permite acceder a esta subasta")
    if error == "no_encontrado":
        raise HTTPException(status_code=404, detail="Usuario o subasta no encontrada")
    return schemas.AsistenteRegistrarResponse(
        identificador=asistente.identificador,
        numeroPostor=asistente.numeroPostor,
        cliente=asistente.cliente,
        subasta=asistente.subasta,
        creado=creado,
    )

@app.post("/asistentes/", response_model=schemas.AsistenteResponse, status_code=201)
def create_asistente(request: schemas.AsistenteCreate, db: Session = Depends(get_db)):
    return crud.create_asistente(db=db, request=request)

@app.delete("/asistentes/{asistente_id}")
def delete_asistente(asistente_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_asistente(db=db, asistente_id=asistente_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay registros que dependen de este asistente")
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    return {"message": f"Asistente {asistente_id} eliminado con éxito"}

@app.get("/subasta/{subasta_id}/vivo", response_model=schemas.VivoSubasta)
def get_subasta_en_vivo(subasta_id: int, db: Session = Depends(get_db)):
    result = crud.get_subasta_en_vivo(db=db, subasta_id=subasta_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada o sin items activos")
    return result

@app.websocket("/ws/subasta/{subasta_id}")
async def ws_subasta(
    subasta_id: int,
    websocket: WebSocket,
    clienteId: int = Query(default=None),
    db: Session = Depends(get_db),
):
    # F3: registrar conexión y rechazar si el usuario ya está en otra subasta
    error = await manager.connect(subasta_id, websocket, cliente_id=clienteId)
    if error:
        await websocket.send_text(json.dumps({"type": "error", "detail": error}))
        await websocket.close(code=1008)
        return
    try:
        vivo = crud.get_subasta_en_vivo(db=db, subasta_id=subasta_id)
        if vivo:
            await websocket.send_text(json.dumps({"type": "auction_state", "data": _vivo_to_dict(vivo)}, default=str))
        else:
            await websocket.send_text(json.dumps({"type": "auction_ended", "data": {"subastaId": subasta_id}}))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(subasta_id, websocket, cliente_id=clienteId)

@app.post("/pujar", response_model=schemas.PujoResponse, status_code=201)
async def pujar(request: schemas.PujoRequest, db: Session = Depends(get_db)):
    result, error = crud.create_pujo(db=db, request=request)
    if error == "asistente":
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    if error == "item":
        raise HTTPException(status_code=404, detail="Item de catálogo no encontrado")
    if error == "sin_medio_verificado":
        raise HTTPException(status_code=403, detail="Necesitás al menos un medio de pago verificado para pujar")
    if error == "excede_cheque":
        raise HTTPException(status_code=422, detail="Esta puja excede el monto disponible de tu cheque certificado")
    if error == "importe_bajo":
        raise HTTPException(status_code=422, detail="El importe es inferior al mínimo permitido")
    if error == "importe_alto":
        raise HTTPException(status_code=422, detail="El importe supera el máximo permitido")

    # Broadcast actualización a todos los conectados a esta subasta
    asistente = db.query(models.Asistente).filter(
        models.Asistente.identificador == request.asistenteId
    ).first()
    if asistente:
        vivo = crud.get_subasta_en_vivo(db=db, subasta_id=asistente.subasta)
        if vivo:
            await manager.broadcast(asistente.subasta, {"type": "bid_update", "data": _vivo_to_dict(vivo)})
        else:
            await manager.broadcast(asistente.subasta, {"type": "auction_ended", "data": {"subastaId": asistente.subasta}})

        # Reiniciar countdown — si no llega otra puja en AUCTION_ITEM_TIMEOUT segundos, el ítem se cierra
        existing = _item_timers.get(request.itemId)
        if existing and not existing.done():
            existing.cancel()
        _item_timers[request.itemId] = asyncio.create_task(
            _cerrar_item(request.itemId, asistente.subasta)
        )

    return result

#------------------ Compras --------------------------------#

@app.get("/subasta/{subasta_id}/{usuario_id}/compras", response_model=list[schemas.ProductoComprado])
def get_compras(subasta_id: int, usuario_id: int, db: Session = Depends(get_db)):
    result = crud.get_compras(db=db, subasta_id=subasta_id, usuario_id=usuario_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return result

@app.get("/subasta/{subasta_id}/{usuario_id}/compras/precio", response_model=schemas.PrecioFinal)
def get_precio_total(subasta_id: int, usuario_id: int, db: Session = Depends(get_db)):
    result = crud.get_precio_total(db=db, subasta_id=subasta_id, usuario_id=usuario_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return result

@app.post("/subasta/{subasta_id}/{usuario_id}/compras/envio")
def confirmar_envio(subasta_id: int, usuario_id: int, metodoEnvio: str = Query(...), db: Session = Depends(get_db)):
    result = crud.confirmar_envio(db=db, subasta_id=subasta_id, usuario_id=usuario_id, metodo_envio=metodoEnvio)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return {"mensaje": result}

@app.post("/subasta/{subasta_id}/{usuario_id}/compras/pagar")
def confirmar_pago(subasta_id: int, usuario_id: int, metodoPagoId: int = Query(...), db: Session = Depends(get_db)):
    result, error = crud.confirmar_pago(db=db, subasta_id=subasta_id, usuario_id=usuario_id, metodo_pago_id=metodoPagoId)
    if error == "asistente":
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    if error == "medio_pago":
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado o no pertenece al usuario")
    return {"mensaje": result}

#------------------ Personas -------------------------------#

@app.get("/sectores/", response_model=list[schemas.SectorResponse])
def get_sectores(db: Session = Depends(get_db)):
    return crud.get_sectores(db=db)

@app.post("/duenios/", response_model=schemas.DuenioResponse, status_code=201)
def create_duenio(request: schemas.DuenioCreate, db: Session = Depends(get_db)):
    return crud.create_duenio(db=db, request=request)

@app.delete("/duenios/{duenio_id}")
def delete_duenio(duenio_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_duenio(db=db, duenio_id=duenio_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay productos que dependen de este dueño")
    if result is None:
        raise HTTPException(status_code=404, detail="Dueño no encontrado")
    return {"message": f"Dueño {duenio_id} eliminado con éxito"}

@app.post("/subastadores/", response_model=schemas.SubastadorResponse, status_code=201)
def create_subastador(request: schemas.SubastadorCreate, db: Session = Depends(get_db)):
    return crud.create_subastador(db=db, request=request)

@app.delete("/subastadores/{subastador_id}")
def delete_subastador(subastador_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_subastador(db=db, subastador_id=subastador_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay subastas que dependen de este subastador")
    if result is None:
        raise HTTPException(status_code=404, detail="Subastador no encontrado")
    return {"message": f"Subastador {subastador_id} eliminado con éxito"}

@app.post("/sectores/", response_model=schemas.SectorResponse)
def create_sector(request: schemas.SectorCreate, db: Session = Depends(get_db)):
    return crud.create_sector(db=db, request=request)

@app.get("/sectores/{sector_id}", response_model=schemas.SectorResponse)
def get_sector(sector_id: int, db: Session = Depends(get_db)):
    result = crud.get_sector(db=db, sector_id=sector_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return result

@app.delete("/sectores/{sector_id}")
def delete_sector(sector_id: int, db: Session = Depends(get_db)):
    result = crud.delete_sector(db=db, sector_id=sector_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return {"message": f"Sector {sector_id} eliminado con éxito"}

@app.get("/empleados/", response_model=list[schemas.EmpleadoResponse])
def get_empleados(db: Session = Depends(get_db)):
    return crud.get_empleados(db=db)

@app.post("/empleados/", response_model=schemas.EmpleadoResponse)
def create_empleado(request: schemas.EmpleadoCreate, db: Session = Depends(get_db)):
    return crud.create_empleado(db=db, request=request)

@app.get("/empleados/{empleado_id}", response_model=schemas.EmpleadoResponse)
def get_empleado(empleado_id: int, db: Session = Depends(get_db)):
    result = crud.get_empleado(db=db, empleado_id=empleado_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return result

@app.delete("/empleados/{empleado_id}")
def delete_empleado(empleado_id: int, db: Session = Depends(get_db)):
    result = crud.delete_empleado(db=db, empleado_id=empleado_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"message": f"Empleado {empleado_id} eliminado con éxito"}

@app.get("/clientes/", response_model=list[schemas.ClienteResponse])
def get_clientes(db: Session = Depends(get_db)):
    return crud.get_clientes(db=db)

@app.post("/clientes/", response_model=schemas.ClienteResponse)
def create_cliente(request: schemas.ClienteCreate, db: Session = Depends(get_db)):
    return crud.create_cliente(db=db, request=request)

@app.get("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def get_cliente(cliente_id: int, db: Session = Depends(get_db)):
    result = crud.get_cliente(db=db, cliente_id=cliente_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return result

@app.delete("/clientes/{cliente_id}")
def delete_cliente(cliente_id: int, db: Session = Depends(get_db)):
    result = crud.delete_cliente(db=db, cliente_id=cliente_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": f"Cliente {cliente_id} eliminado con éxito"}

#------------------ Ventas ---------------------------------#

#------------------ Informacion Necesaria ------------------#

@app.post("/paises/", response_model=schemas.Pais)
def create_pais(pais: schemas.PaisCreate, db: Session = Depends(get_db)):
    return crud.create_pais(db=db, pais=pais)

@app.get("/paises/", response_model=list[schemas.Pais])
def read_paises(db: Session = Depends(get_db)):
    paises = crud.get_paises(db)
    return paises

@app.get("/paises/{numero}", response_model=schemas.Pais)
def read_pais(numero: int, db: Session = Depends(get_db)):
    pais = crud.get_pais(db, numero=numero)
    if not pais:
        raise HTTPException(status_code=404, detail="País no encontrado")
    return pais

@app.delete("/paises/{numero}")
def delete_pais(numero: int, db: Session = Depends(get_db)):
    pais = crud.delete_pais(db, numero=numero)
    if not pais:
        raise HTTPException(status_code=404, detail="País no encontrado")
    return pais

#------------------ Dev / Testing --------------------------#

@app.delete("/dev/reset/subasta/{subasta_id}")
def reset_subasta_dev(subasta_id: int, db: Session = Depends(get_db)):
    """Resetea el estado de una subasta: cancela timers, borra pujas y asistentes. Solo para dev/test."""
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if catalogo:
        item_ids = [
            i.identificador for i in db.query(models.ItemCatalogo)
            .filter(models.ItemCatalogo.catalogo == catalogo.identificador).all()
        ]
        # Cancelar timers activos
        for iid in item_ids:
            existing = _item_timers.get(iid)
            if existing and not existing.done():
                existing.cancel()
            _item_timers.pop(iid, None)
        # Borrar historial y pujos
        db.query(models.HistorialPujos).filter(models.HistorialPujos.subasta == subasta_id).delete()
        for iid in item_ids:
            db.query(models.Pujo).filter(models.Pujo.item == iid).delete()
        # Resetear subastado
        db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.catalogo == catalogo.identificador
        ).update({"subastado": "no"})
    # Borrar registros de venta y asistentes
    db.query(models.RegistroSubasta).filter(models.RegistroSubasta.subasta == subasta_id).delete()
    db.query(models.Asistente).filter(models.Asistente.subasta == subasta_id).delete()
    db.commit()
    return {"mensaje": f"Subasta {subasta_id} reseteada para testing"}