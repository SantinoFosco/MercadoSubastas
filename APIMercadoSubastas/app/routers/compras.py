import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..utils import get_foto_b64
from ..email_service import send_payment_notification, send_multa_notification

router = APIRouter(tags=["Compras"])

DEADLINE_PAGO_HORAS = 72


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_asistente(db: Session, subasta_id: int, usuario_id: int):
    return db.query(models.Asistente).filter(
        models.Asistente.subasta == subasta_id,
        models.Asistente.cliente == usuario_id,
    ).first()


def _get_costo_envio_domicilio(db: Session) -> float:
    cfg = db.query(models.ConfiguracionEmpresa).filter(
        models.ConfiguracionEmpresa.clave == "costo_envio_domicilio"
    ).first()
    try:
        return float(cfg.valor) if cfg else 0.0
    except (ValueError, TypeError):
        return 0.0


def _get_mail_cliente(db: Session, cliente_id: int) -> tuple[str, str]:
    """Retorna (mail, nombre) del cliente."""
    detalle = db.query(models.PersonaDetalle).join(
        models.Persona, models.PersonaDetalle.persona == models.Persona.identificador
    ).filter(models.PersonaDetalle.persona == cliente_id).first()
    persona = db.query(models.Persona).filter(
        models.Persona.identificador == cliente_id
    ).first()
    mail = detalle.mail if detalle else ""
    nombre = persona.nombre if persona else "Usuario"
    return mail, nombre


# ── CRUD ─────────────────────────────────────────────────────────────────────

def get_compras(db: Session, subasta_id: int, usuario_id: int):
    asistente = _get_asistente(db, subasta_id, usuario_id)
    if not asistente:
        return None
    pujos = db.query(models.Pujo).filter(
        models.Pujo.asistente == asistente.identificador,
        models.Pujo.ganador == "si",
    ).all()
    result = []
    for pujo in pujos:
        item = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.identificador == pujo.item
        ).first()
        if not item:
            continue
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == item.producto
        ).first()
        result.append(schemas.ProductoComprado(
            productoId=item.producto,
            titulo=pp.titulo if pp else "Sin título",
            precioFinal=float(pujo.importe),
            subastado=item.subastado,
            imagen=get_foto_b64(db, item.producto),
        ))
    return result


def get_precio_total(db: Session, subasta_id: int, usuario_id: int):
    asistente = _get_asistente(db, subasta_id, usuario_id)
    if not asistente:
        return None

    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.subasta == subasta_id,
        models.RegistroSubasta.cliente == usuario_id,
        models.RegistroSubasta.pagado.in_(["no", "pendiente"]),
    ).all()

    if not registros:
        # Si ya están pagados, mostrar el total final igual
        registros = db.query(models.RegistroSubasta).filter(
            models.RegistroSubasta.subasta == subasta_id,
            models.RegistroSubasta.cliente == usuario_id,
        ).all()

    total_precio = total_comision = 0.0
    costo_envio = float(registros[0].costo_envio) if registros and registros[0].costo_envio else 0.0

    for r in registros:
        total_precio += float(r.importe)
        total_comision += float(r.comision)

    return schemas.PrecioFinal(
        precioFinal=total_precio,
        comision=round(total_comision, 2),
        envio=costo_envio,
        total=round(total_precio + total_comision + costo_envio, 2),
    )


def confirmar_envio(db: Session, subasta_id: int, usuario_id: int, metodo_envio: str):
    if not _get_asistente(db, subasta_id, usuario_id):
        return None

    costo = _get_costo_envio_domicilio(db) if metodo_envio == "domicilio" else 0.0

    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.subasta == subasta_id,
        models.RegistroSubasta.cliente == usuario_id,
    ).all()
    for r in registros:
        r.metodo_envio = metodo_envio
        r.costo_envio = costo
    db.commit()
    return f"Entrega confirmada: {metodo_envio}"


async def confirmar_pago(db: Session, subasta_id: int, usuario_id: int, metodo_pago_id: int):
    if not _get_asistente(db, subasta_id, usuario_id):
        return None, "asistente"

    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == metodo_pago_id,
        models.MedioPago.cliente == usuario_id,
    ).first()
    if not medio:
        return None, "medio_pago"
    if medio.estado != "verificado":
        return None, "medio_no_verificado"

    # Validar moneda para subastas en USD
    subasta_obj = db.query(models.Subasta).filter(
        models.Subasta.identificador == subasta_id
    ).first()
    moneda = subasta_obj.moneda if subasta_obj else "ARS"
    if moneda == "USD":
        if medio.moneda != "USD":
            return None, "moneda_incompatible"
        if medio.tipo == "tarjeta" and medio.es_internacional != "si":
            return None, "tarjeta_no_internacional"
        if medio.tipo == "cheque_certificado":
            return None, "cheque_no_valido_usd"

    # Compras pendientes de pago
    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.subasta == subasta_id,
        models.RegistroSubasta.cliente == usuario_id,
        models.RegistroSubasta.pagado.in_(["no", "pendiente"]),
    ).all()
    if not registros:
        return None, "sin_compras"

    # Idempotencia: si ya están todos pendientes con el mismo medio, no reenviar
    if all(r.pagado == "pendiente" and r.medio_pago == metodo_pago_id for r in registros):
        return None, "ya_confirmado"

    # Calcular total real (importe + comisión + envío)
    costo_envio = float(registros[0].costo_envio) if registros[0].costo_envio else 0.0
    total = round(
        sum(float(r.importe) + float(r.comision) for r in registros) + costo_envio, 2
    )

    # Para cheques: validar saldo ANTES de proceder
    if medio.tipo == "cheque_certificado":
        cheque = db.query(models.mpChequeCertificado).filter(
            models.mpChequeCertificado.medio_pago == metodo_pago_id
        ).first()
        if not cheque or float(cheque.monto_disponible) < total:
            # Fondos insuficientes → multa inmediata
            monto_multa = round(sum(float(r.importe) for r in registros) * 0.10, 2)
            multa_existente = db.query(models.Multa).filter(
                models.Multa.cliente == usuario_id,
                models.Multa.subasta == subasta_id,
                models.Multa.pagado == "no",
            ).first()
            deadline = datetime.now() + timedelta(hours=DEADLINE_PAGO_HORAS)
            if not multa_existente:
                db.add(models.Multa(
                    cliente=usuario_id,
                    subasta=subasta_id,
                    monto=monto_multa,
                    pagado="no",
                    fecha_limite=deadline,
                ))
                db.commit()
            # Notificar por email
            mail, nombre = _get_mail_cliente(db, usuario_id)
            importe_original = sum(float(r.importe) for r in registros)
            asyncio.create_task(send_multa_notification(
                to_email=mail,
                nombre=nombre,
                monto_multa=monto_multa,
                importe_original=importe_original,
                moneda=moneda,
                deadline=deadline,
            ))
            return None, "fondos_insuficientes"
        # Saldo OK: descontar del cheque
        cheque.monto_disponible = round(float(cheque.monto_disponible) - total, 2)

    # Registrar medio de pago, marcar como PENDIENTE y fijar deadline de 72hs
    deadline = datetime.now() + timedelta(hours=DEADLINE_PAGO_HORAS)
    for r in registros:
        r.medio_pago = metodo_pago_id
        r.pagado = "pendiente"
        r.fecha_limite_pago = deadline
    db.commit()

    # Construir detalle para el email
    items_email = []
    for r in registros:
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == r.producto
        ).first()
        items_email.append({
            "titulo": pp.titulo if pp else f"Artículo #{r.producto}",
            "importe": float(r.importe),
            "comision": float(r.comision),
        })

    metodo_envio = registros[0].metodo_envio or "retiro"
    mail, nombre = _get_mail_cliente(db, usuario_id)

    asyncio.create_task(send_payment_notification(
        to_email=mail,
        nombre=nombre,
        items=items_email,
        costo_envio=costo_envio,
        total=total,
        moneda=moneda,
        metodo_envio=metodo_envio,
        deadline=deadline,
    ))

    return {
        "mensaje": "Email enviado con el detalle de tu compra. El pago queda pendiente de confirmación.",
        "fechaLimitePago": deadline.isoformat(),
        "total": total,
        "moneda": moneda,
    }, None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/subasta/{subasta_id}/{usuario_id}/compras", response_model=list[schemas.ProductoComprado])
def ep_get_compras(subasta_id: int, usuario_id: int, db: Session = Depends(get_db)):
    result = get_compras(db, subasta_id, usuario_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return result


@router.get("/subasta/{subasta_id}/{usuario_id}/compras/precio", response_model=schemas.PrecioFinal)
def ep_get_precio_total(subasta_id: int, usuario_id: int, db: Session = Depends(get_db)):
    result = get_precio_total(db, subasta_id, usuario_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return result


@router.post("/subasta/{subasta_id}/{usuario_id}/compras/envio")
def ep_confirmar_envio(
    subasta_id: int, usuario_id: int,
    metodoEnvio: str = Query(..., pattern="^(domicilio|retiro)$"),
    db: Session = Depends(get_db),
):
    result = confirmar_envio(db, subasta_id, usuario_id, metodoEnvio)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return {"mensaje": result}


@router.post("/subasta/{subasta_id}/{usuario_id}/compras/pagar")
async def ep_confirmar_pago(
    subasta_id: int, usuario_id: int,
    metodoPagoId: int = Query(...),
    db: Session = Depends(get_db),
):
    result, error = await confirmar_pago(db, subasta_id, usuario_id, metodoPagoId)
    if error == "asistente":
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    if error == "medio_pago":
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado o no pertenece al usuario")
    if error == "medio_no_verificado":
        raise HTTPException(status_code=422, detail="El medio de pago no está verificado")
    if error == "sin_compras":
        raise HTTPException(status_code=409, detail="No hay compras pendientes de pago en esta subasta")
    if error == "ya_confirmado":
        raise HTTPException(status_code=409, detail="El pago ya fue registrado con este medio de pago.")
    if error == "fondos_insuficientes":
        raise HTTPException(
            status_code=422,
            detail="Tu cheque no tiene saldo suficiente. Se generó una multa del 10% y se te notificó por email.",
        )
    if error == "moneda_incompatible":
        raise HTTPException(status_code=422, detail="La subasta es en USD. El medio de pago debe ser en dólares.")
    if error == "tarjeta_no_internacional":
        raise HTTPException(status_code=422, detail="Para subastas en USD se requiere una tarjeta internacional.")
    if error == "cheque_no_valido_usd":
        raise HTTPException(status_code=422, detail="Los cheques certificados no pueden usarse en subastas en USD.")
    return result


@router.get("/clientes/{cliente_id}/compras", response_model=list[schemas.CompraClienteResponse])
def ep_get_compras_cliente(cliente_id: int, db: Session = Depends(get_db)):
    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.cliente == cliente_id,
    ).order_by(models.RegistroSubasta.identificador.desc()).all()
    result = []
    for r in registros:
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == r.producto
        ).first()
        costo_envio = float(r.costo_envio) if r.costo_envio else 0.0
        result.append(schemas.CompraClienteResponse(
            registroId=r.identificador,
            subastaId=r.subasta,
            productoId=r.producto,
            titulo=pp.titulo if pp else f"Artículo #{r.producto}",
            importe=r.importe,
            comision=r.comision,
            costoEnvio=r.costo_envio or 0,
            total=round(float(r.importe) + float(r.comision) + costo_envio, 2),
            pagado=r.pagado,
            metodoEnvio=r.metodo_envio,
            fechaLimitePago=r.fecha_limite_pago,
            imagen=get_foto_b64(db, r.producto),
        ))
    return result


@router.get("/clientes/{cliente_id}/pujas", response_model=list[schemas.PujaHistorialItem])
def ep_get_pujas_cliente(
    cliente_id: int,
    ganadas: bool | None = None,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.HistorialPujos)
        .filter(models.HistorialPujos.cliente == cliente_id)
        .order_by(models.HistorialPujos.fechaHora.desc())
        .all()
    )
    result = []
    for h in rows:
        pujo = db.query(models.Pujo).filter(models.Pujo.identificador == h.pujo).first()
        if not pujo:
            continue
        if ganadas is True and pujo.ganador != "si":
            continue
        if ganadas is False and pujo.ganador != "no":
            continue
        item = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.identificador == h.itemCatalogo
        ).first()
        pp = (
            db.query(models.ProductoPresentacion)
            .filter(models.ProductoPresentacion.producto == item.producto)
            .first()
            if item else None
        )
        titulo = pp.titulo if pp else "Artículo desconocido"
        estado_pago = None
        if pujo.ganador == "si" and item:
            registro = db.query(models.RegistroSubasta).filter(
                models.RegistroSubasta.subasta == h.subasta,
                models.RegistroSubasta.producto == item.producto,
                models.RegistroSubasta.cliente == cliente_id,
            ).first()
            if registro:
                estado_pago = registro.pagado
        result.append(schemas.PujaHistorialItem(
            subastaId=h.subasta,
            itemId=h.itemCatalogo,
            titulo=titulo,
            importe=float(h.importe),
            ganador=pujo.ganador,
            fechaHora=h.fechaHora,
            estadoPago=estado_pago,
        ))
    return result


@router.get("/multas/{cliente_id}", response_model=list[schemas.MultaResponse])
def ep_get_multas(cliente_id: int, db: Session = Depends(get_db)):
    return db.query(models.Multa).filter(
        models.Multa.cliente == cliente_id,
        models.Multa.pagado == "no",
    ).all()


@router.post("/multas/{multa_id}/pagar")
def ep_pagar_multa(multa_id: int, cliente_id: int = Query(...), db: Session = Depends(get_db)):
    multa = db.query(models.Multa).filter(models.Multa.identificador == multa_id).first()
    if not multa:
        raise HTTPException(status_code=404, detail="Multa no encontrada")
    if multa.cliente != cliente_id:
        raise HTTPException(status_code=403, detail="Esta multa no pertenece al cliente indicado")
    if multa.pagado == "si":
        raise HTTPException(status_code=409, detail="La multa ya fue pagada")
    multa.pagado = "si"
    db.commit()
    return {"mensaje": "Multa pagada correctamente"}
