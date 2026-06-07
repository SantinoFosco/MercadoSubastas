import asyncio
import json
import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import SessionLocal, get_db
from ..utils import get_foto_b64, CATEGORIA_ORDER

router = APIRouter(tags=["Subastas"])
AUCTION_ITEM_TIMEOUT = int(os.getenv("AUCTION_ITEM_TIMEOUT", "30"))

# Offset fijo UTC-3 (Argentina, sin DST). Igual que en catalogo.py.
_AR_TZ = timezone(timedelta(hours=-3))

# Timers activos por item_catalogo_id (compartido con dev.py para poder cancelarlos)
_item_timers: dict[int, asyncio.Task] = {}

# ── WebSocket connection manager ───────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: dict[int, list[WebSocket]] = {}    # subasta_id → [ws]
        self.user_subasta: dict[int, int] = {}          # cliente_id → subasta_id activa

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

# ── Helpers ───────────────────────────────────────────────────────────────────

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

# ── CRUD ─────────────────────────────────────────────────────────────────────

def get_subastas(db: Session):
    return db.query(models.Subasta).all()


def create_subasta(db: Session, request: schemas.SubastaCreate):
    nuevo = models.Subasta(
        fecha=request.fecha, hora=request.hora, estado="abierta",
        subastador=request.subastador, ubicacion=request.ubicacion,
        capacidadAsistentes=request.capacidadAsistentes,
        tieneDeposito=request.tieneDeposito, seguridadPropia=request.seguridadPropia,
        categoria=request.categoria, moneda=request.moneda,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def delete_subasta(db: Session, subasta_id: int):
    obj = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj


def create_asistente(db: Session, request: schemas.AsistenteCreate):
    nuevo = models.Asistente(
        numeroPostor=request.numeroPostor,
        cliente=request.cliente,
        subasta=request.subasta,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def delete_asistente(db: Session, asistente_id: int):
    obj = db.query(models.Asistente).filter(models.Asistente.identificador == asistente_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj


def find_or_create_asistente(db: Session, cliente: int, subasta: int):
    existente = db.query(models.Asistente).filter(
        models.Asistente.cliente == cliente,
        models.Asistente.subasta == subasta,
    ).first()
    if existente:
        return existente, False, None

    # F1: la categoría del usuario debe ser >= a la de la subasta
    cliente_obj = db.query(models.Cliente).filter(models.Cliente.identificador == cliente).first()
    subasta_obj = db.query(models.Subasta).filter(models.Subasta.identificador == subasta).first()
    if not cliente_obj or not subasta_obj:
        return None, False, "no_encontrado"
    if CATEGORIA_ORDER.get(cliente_obj.categoria or "comun", 0) < CATEGORIA_ORDER.get(subasta_obj.categoria or "comun", 0):
        return None, False, "categoria_insuficiente"
    multa = db.query(models.Multa).filter(
        models.Multa.cliente == cliente,
        models.Multa.pagado == "no",
    ).first()
    if multa:
        return None, False, "multa_pendiente"

    max_postor = db.query(func.max(models.Asistente.numeroPostor)).filter(
        models.Asistente.subasta == subasta
    ).scalar()
    nuevo = models.Asistente(numeroPostor=(max_postor or 0) + 1, cliente=cliente, subasta=subasta)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo, True, None


def get_subasta_en_vivo(db: Session, subasta_id: int):
    subasta = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if not subasta:
        return None

    # Barrera temporal: la subasta solo existe como "en vivo" si ya arrancó en hora Argentina.
    ahora_ar = datetime.now(tz=_AR_TZ).replace(tzinfo=None)
    inicio = datetime.combine(subasta.fecha, subasta.hora)
    if subasta.estado != "abierta" or inicio > ahora_ar:
        return None

    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if not catalogo:
        return None

    # Primer ítem aún no subastado = el que se subasta ahora
    item_actual = db.query(models.ItemCatalogo).filter(
        models.ItemCatalogo.catalogo == catalogo.identificador,
        models.ItemCatalogo.subastado == "no",
    ).order_by(models.ItemCatalogo.identificador).first()
    if not item_actual:
        return None

    pp = db.query(models.ProductoPresentacion).filter(
        models.ProductoPresentacion.producto == item_actual.producto
    ).first()

    precio_base = float(item_actual.precioBase)
    max_puja = db.query(func.max(models.Pujo.importe)).filter(models.Pujo.item == item_actual.identificador).scalar()
    precio_actual = float(max_puja) if max_puja else precio_base
    pujas_totales = db.query(models.Pujo).filter(models.Pujo.item == item_actual.identificador).count()

    subasta_dt = datetime.combine(subasta.fecha, subasta.hora)
    delta = subasta_dt - datetime.now()
    if delta.total_seconds() > 0:
        h, rem = divmod(int(delta.total_seconds()), 3600)
        m, s = divmod(rem, 60)
        tiempo_restante = f"{h:02d}:{m:02d}:{s:02d}"
    else:
        tiempo_restante = "00:00:00"

    incrementos = [round(precio_base * p, 2) for p in (0.01, 0.05, 0.10)]
    prox_puja = round(precio_actual + incrementos[0], 2)
    puja_maxima = round(precio_actual + precio_base * 0.20, 2)

    historial = (
        db.query(models.HistorialPujos)
        .filter(
            models.HistorialPujos.subasta == subasta_id,
            models.HistorialPujos.itemCatalogo == item_actual.identificador,
        )
        .order_by(models.HistorialPujos.fechaHora.desc())
        .limit(5)
        .all()
    )
    actividad = []
    for h in historial:
        persona = db.query(models.Persona).filter(models.Persona.identificador == h.cliente).first()
        actividad.append(schemas.ActividadReciente(
            pujaId=h.identificador,
            nombreComprador=persona.nombre if persona else "Desconocido",
            nombreProducto=pp.titulo if pp else "Desconocido",
            fecha=h.fechaHora,
            valor=f"${h.importe:,.2f}",
        ))

    return schemas.VivoSubasta(
        subastaId=subasta_id, categoriaSubasta=subasta.categoria,
        productoId=item_actual.producto, itemCatalogoId=item_actual.identificador,
        precioBase=precio_base, titulo=pp.titulo if pp else "Sin título",
        precioActual=precio_actual, proximaPuja=prox_puja, pujaMaxima=puja_maxima,
        tiempoRestante=tiempo_restante, imagen=get_foto_b64(db, item_actual.producto),
        pujasTotales=pujas_totales, incrementosSugeridos=incrementos, actividadReciente=actividad,
    )


def create_pujo(db: Session, request: schemas.PujoRequest):
    asistente = db.query(models.Asistente).filter(models.Asistente.identificador == request.asistenteId).first()
    if not asistente:
        return None, "asistente"

    # Re-verificar multa en cada puja (el asistente pudo tener multa generada después de registrarse)
    multa = db.query(models.Multa).filter(
        models.Multa.cliente == asistente.cliente,
        models.Multa.pagado == "no",
    ).first()
    if multa:
        return None, "multa_pendiente"

    item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == request.itemId).first()
    if not item:
        return None, "item"
    if item.subastado == "si":
        return None, "item_cerrado"

    # Verificar que el asistente no sea ya el mejor postor
    ganador_actual = db.query(models.Pujo).filter(
        models.Pujo.item == request.itemId,
        models.Pujo.ganador == "si",
    ).first()
    if ganador_actual and ganador_actual.asistente == request.asistenteId:
        return None, "ya_es_ganador"

    catalogo = db.query(models.Catalogo).filter(models.Catalogo.identificador == item.catalogo).first()
    if not catalogo or asistente.subasta != catalogo.subasta:
        return None, "subasta_incorrecta"

    # F2: necesita al menos un medio de pago verificado
    if not db.query(models.MedioPago).filter(
        models.MedioPago.cliente == asistente.cliente,
        models.MedioPago.estado == "verificado",
    ).first():
        return None, "sin_medio_verificado"

    # F5: límite de cheque certificado (solo si todos los medios verificados son cheques)
    medios_verificados = db.query(models.MedioPago).filter(
        models.MedioPago.cliente == asistente.cliente,
        models.MedioPago.estado == "verificado",
    ).all()
    if medios_verificados and all(m.tipo == "cheque_certificado" for m in medios_verificados):
        ids_cheques = [m.identificador for m in medios_verificados]
        cheques = db.query(models.mpChequeCertificado).filter(
            models.mpChequeCertificado.medio_pago.in_(ids_cheques)
        ).all()
        monto_disponible = sum(float(c.monto_disponible) for c in cheques)
        pujas_actuales = float(db.query(func.sum(models.Pujo.importe)).join(
            models.Asistente, models.Pujo.asistente == models.Asistente.identificador
        ).filter(
            models.Asistente.cliente == asistente.cliente,
            models.Pujo.ganador == "si",
        ).scalar() or 0)
        ya_pagado = float(db.query(func.sum(models.RegistroSubasta.importe)).filter(
            models.RegistroSubasta.cliente == asistente.cliente,
            models.RegistroSubasta.pagado == "si",
        ).scalar() or 0)
        compromiso_pendiente = max(0.0, pujas_actuales - ya_pagado)
        if compromiso_pendiente + request.importe > monto_disponible:
            return None, "excede_cheque"

    # Validar mínimo y máximo (no aplica a subastas oro/platino)
    subasta_obj = db.query(models.Subasta).filter(
        models.Subasta.identificador == catalogo.subasta
    ).first()
    if (subasta_obj.categoria if subasta_obj else "comun") not in ("oro", "platino"):
        max_puja_actual = db.query(func.max(models.Pujo.importe)).filter(models.Pujo.item == request.itemId).scalar()
        precio_actual_val = float(max_puja_actual) if max_puja_actual else float(item.precioBase)
        precio_base_val = float(item.precioBase)
        if request.importe < round(precio_actual_val + precio_base_val * 0.01, 2):
            return None, "importe_bajo"
        if request.importe > round(precio_actual_val + precio_base_val * 0.20, 2):
            return None, "importe_alto"

    try:
        db.query(models.Pujo).filter(
            models.Pujo.item == request.itemId,
            models.Pujo.ganador == "si",
        ).update({"ganador": "no"})

        nuevo_pujo = models.Pujo(asistente=request.asistenteId, item=request.itemId, importe=request.importe, ganador="si")
        db.add(nuevo_pujo)
        db.flush()

        nuevo_historial = models.HistorialPujos(
            pujo=nuevo_pujo.identificador, asistente=request.asistenteId,
            itemCatalogo=request.itemId, cliente=asistente.cliente,
            subasta=asistente.subasta, importe=request.importe, fechaHora=datetime.now(),
        )
        db.add(nuevo_historial)
        db.commit()
        db.refresh(nuevo_pujo)
        db.refresh(nuevo_historial)

        return schemas.PujoResponse(
            pujoId=nuevo_pujo.identificador, asistenteId=nuevo_pujo.asistente,
            itemId=nuevo_pujo.item, importe=float(nuevo_pujo.importe),
            ganador=nuevo_pujo.ganador, historialId=nuevo_historial.identificador,
            fechaHora=nuevo_historial.fechaHora,
        ), None
    except Exception as e:
        db.rollback()
        raise e


# ── Cierre automático de ítems ────────────────────────────────────────────────

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
            models.Pujo.ganador == "si",
        ).first()
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == item_id).first()

        if not item:
            return

        producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
        item.subastado = "si"
        ganador_nombre = ganador_cliente_id = None
        importe_final = 0.0

        if winning_pujo:
            asistente = db.query(models.Asistente).filter(models.Asistente.identificador == winning_pujo.asistente).first()
            if asistente and producto:
                ganador_persona = db.query(models.Persona).filter(models.Persona.identificador == asistente.cliente).first()
                ganador_nombre = ganador_persona.nombre if ganador_persona else "Desconocido"
                ganador_cliente_id = asistente.cliente
                importe_final = float(winning_pujo.importe)
                comision_monto = round(float(winning_pujo.importe) * float(item.comision) / 100, 2)
                db.add(models.RegistroSubasta(
                    subasta=subasta_id, duenio=producto.duenio, producto=item.producto,
                    cliente=asistente.cliente, importe=winning_pujo.importe, comision=comision_monto,
                ))
        else:
            # F4: nadie pujó → la empresa compra por el precio base
            empresa_persona = db.query(models.Persona).filter(models.Persona.documento == "00000000").first()
            empresa_cliente = db.query(models.Cliente).filter(
                models.Cliente.identificador == empresa_persona.identificador
            ).first() if empresa_persona else None
            if empresa_cliente and producto:
                ganador_nombre = "Casa de Subastas"
                ganador_cliente_id = empresa_cliente.identificador
                importe_final = float(item.precioBase)
                comision_monto = round(float(item.precioBase) * float(item.comision) / 100, 2)
                db.add(models.RegistroSubasta(
                    subasta=subasta_id, duenio=producto.duenio, producto=item.producto,
                    cliente=empresa_cliente.identificador, importe=item.precioBase, comision=comision_monto,
                ))

        db.commit()

        # F6: incluir ganadorClienteId para que el front detecte si el usuario ganó
        await manager.broadcast(subasta_id, {
            "type": "item_closed",
            "data": {
                "itemCatalogoId": item_id,
                "ganadorNombre": ganador_nombre,
                "ganadorClienteId": ganador_cliente_id,
                "importe": importe_final,
            },
        })

        vivo = get_subasta_en_vivo(db=db, subasta_id=subasta_id)
        if vivo:
            await manager.broadcast(subasta_id, {"type": "auction_state", "data": _vivo_to_dict(vivo)})
            next_item_id = vivo.itemCatalogoId
            if next_item_id not in _item_timers or _item_timers[next_item_id].done():
                _item_timers[next_item_id] = asyncio.create_task(_cerrar_item(next_item_id, subasta_id))
        else:
            subasta_upd = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
            if subasta_upd:
                subasta_upd.estado = "cerrada"
                db.commit()
            await manager.broadcast(subasta_id, {"type": "auction_ended", "data": {"subastaId": subasta_id}})

    except Exception:
        db.rollback()
    finally:
        db.close()
        _item_timers.pop(item_id, None)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/subastas/", response_model=list[schemas.SubastaResponse])
def ep_get_subastas(db: Session = Depends(get_db)):
    return get_subastas(db)

@router.post("/subastas/", response_model=schemas.SubastaResponse, status_code=201)
def ep_create_subasta(request: schemas.SubastaCreate, db: Session = Depends(get_db)):
    return create_subasta(db, request)

@router.delete("/subastas/{subasta_id}")
def ep_delete_subasta(subasta_id: int, db: Session = Depends(get_db)):
    try:
        result = delete_subasta(db, subasta_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay asistentes, catálogos u otros registros que dependen de esta subasta")
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")
    return {"message": f"Subasta {subasta_id} eliminada con éxito"}

@router.post("/asistentes/registrar", response_model=schemas.AsistenteRegistrarResponse)
def ep_registrar_asistente(request: schemas.AsistenteRegistrarRequest, db: Session = Depends(get_db)):
    asistente, creado, error = find_or_create_asistente(db, request.cliente, request.subasta)
    if error == "categoria_insuficiente":
        raise HTTPException(status_code=403, detail="Tu categoría no te permite acceder a esta subasta")
    if error == "no_encontrado":
        raise HTTPException(status_code=404, detail="Usuario o subasta no encontrada")
    if error == "multa_pendiente":
        raise HTTPException(status_code=403, detail="Tenés una multa pendiente de pago. Debés abonarla antes de participar en otra subasta.")
    return schemas.AsistenteRegistrarResponse(
        identificador=asistente.identificador,
        numeroPostor=asistente.numeroPostor,
        cliente=asistente.cliente,
        subasta=asistente.subasta,
        creado=creado,
    )

@router.post("/asistentes/", response_model=schemas.AsistenteResponse, status_code=201)
def ep_create_asistente(request: schemas.AsistenteCreate, db: Session = Depends(get_db)):
    return create_asistente(db, request)

@router.delete("/asistentes/{asistente_id}")
def ep_delete_asistente(asistente_id: int, db: Session = Depends(get_db)):
    try:
        result = delete_asistente(db, asistente_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay registros que dependen de este asistente")
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    return {"message": f"Asistente {asistente_id} eliminado con éxito"}

@router.get("/subasta/{subasta_id}/vivo", response_model=schemas.VivoSubasta)
def ep_get_subasta_en_vivo(subasta_id: int, db: Session = Depends(get_db)):
    result = get_subasta_en_vivo(db, subasta_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada o sin items activos")
    return result

@router.websocket("/ws/subasta/{subasta_id}")
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
        vivo = get_subasta_en_vivo(db=db, subasta_id=subasta_id)
        if vivo:
            await websocket.send_text(json.dumps({"type": "auction_state", "data": _vivo_to_dict(vivo)}, default=str))
            item_id = vivo.itemCatalogoId
            if item_id not in _item_timers or _item_timers[item_id].done():
                subasta_obj = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
                if subasta_obj:
                    subasta_dt = datetime.combine(subasta_obj.fecha, subasta_obj.hora)
                    ahora_ar = datetime.now(tz=_AR_TZ).replace(tzinfo=None)
                    if ahora_ar >= subasta_dt:
                        _item_timers[item_id] = asyncio.create_task(_cerrar_item(item_id, subasta_id))
        else:
            # Distinguir entre "aún no arrancó" y "ya terminó" para dar feedback correcto al cliente.
            subasta_obj = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
            if subasta_obj:
                ahora_ar = datetime.now(tz=_AR_TZ).replace(tzinfo=None)
                inicio = datetime.combine(subasta_obj.fecha, subasta_obj.hora)
                if subasta_obj.estado == "abierta" and inicio > ahora_ar:
                    await websocket.send_text(json.dumps({
                        "type": "auction_not_started",
                        "data": {"subastaId": subasta_id, "inicio": inicio.isoformat()},
                    }))
                    return
            await websocket.send_text(json.dumps({"type": "auction_ended", "data": {"subastaId": subasta_id}}))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(subasta_id, websocket, cliente_id=clienteId)

@router.post("/pujar", response_model=schemas.PujoResponse, status_code=201)
async def ep_pujar(request: schemas.PujoRequest, db: Session = Depends(get_db)):
    result, error = create_pujo(db, request)
    if error == "asistente":
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    if error == "item":
        raise HTTPException(status_code=404, detail="Item de catálogo no encontrado")
    if error == "item_cerrado":
        raise HTTPException(status_code=409, detail="Este ítem ya fue subastado")
    if error == "subasta_incorrecta":
        raise HTTPException(status_code=403, detail="El asistente no pertenece a la subasta de este ítem")
    if error == "sin_medio_verificado":
        raise HTTPException(status_code=403, detail="Necesitás al menos un medio de pago verificado para pujar")
    if error == "excede_cheque":
        raise HTTPException(status_code=422, detail="Esta puja excede el monto disponible de tu cheque certificado")
    if error == "multa_pendiente":
        raise HTTPException(status_code=403, detail="Tenés una multa pendiente de pago. Debés abonarla antes de pujar.")
    if error == "ya_es_ganador":
        raise HTTPException(status_code=409, detail="Ya sos el mejor postor de este ítem")
    if error == "importe_bajo":
        raise HTTPException(status_code=422, detail="El importe es inferior al mínimo permitido")
    if error == "importe_alto":
        raise HTTPException(status_code=422, detail="El importe supera el máximo permitido")

    # Broadcast actualización a todos los conectados
    asistente = db.query(models.Asistente).filter(
        models.Asistente.identificador == request.asistenteId
    ).first()
    if asistente:
        vivo = get_subasta_en_vivo(db=db, subasta_id=asistente.subasta)
        if vivo:
            await manager.broadcast(asistente.subasta, {"type": "bid_update", "data": _vivo_to_dict(vivo)})
        else:
            await manager.broadcast(asistente.subasta, {"type": "auction_ended", "data": {"subastaId": asistente.subasta}})

        # Reiniciar countdown: si no llega otra puja en AUCTION_ITEM_TIMEOUT segundos, el ítem se cierra
        existing = _item_timers.get(request.itemId)
        if existing and not existing.done():
            existing.cancel()
        _item_timers[request.itemId] = asyncio.create_task(
            _cerrar_item(request.itemId, asistente.subasta)
        )

    return result
