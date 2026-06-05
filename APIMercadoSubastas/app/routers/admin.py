"""
Endpoints de administración para gestionar pagos y multas.
Solo para uso interno (empleados / sistema backend).
"""
import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..email_service import send_payment_confirmed_notification, send_multa_notification

router = APIRouter(prefix="/admin", tags=["Admin"])

DEADLINE_PAGO_HORAS = 72


def _get_mail_nombre(db: Session, cliente_id: int) -> tuple[str, str]:
    detalle = db.query(models.PersonaDetalle).filter(
        models.PersonaDetalle.persona == cliente_id
    ).first()
    persona = db.query(models.Persona).filter(
        models.Persona.identificador == cliente_id
    ).first()
    return (detalle.mail if detalle else ""), (persona.nombre if persona else "Usuario")


# ── Pagos ─────────────────────────────────────────────────────────────────────

@router.get("/pagos/pendientes", response_model=list[schemas.AdminPagoPendienteResponse])
def ep_pagos_pendientes(db: Session = Depends(get_db)):
    """Lista todos los registros con pagado='pendiente'."""
    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.pagado == "pendiente"
    ).all()

    result = []
    for r in registros:
        persona = db.query(models.Persona).filter(
            models.Persona.identificador == r.cliente
        ).first()
        detalle = db.query(models.PersonaDetalle).filter(
            models.PersonaDetalle.persona == r.cliente
        ).first()
        subasta = db.query(models.Subasta).filter(
            models.Subasta.identificador == r.subasta
        ).first()
        medio = db.query(models.MedioPago).filter(
            models.MedioPago.identificador == r.medio_pago
        ).first() if r.medio_pago else None

        costo_envio = float(r.costo_envio) if r.costo_envio else 0.0
        total = round(float(r.importe) + float(r.comision) + costo_envio, 2)

        result.append(schemas.AdminPagoPendienteResponse(
            registroId=r.identificador,
            clienteId=r.cliente,
            nombreCliente=persona.nombre if persona else "—",
            mailCliente=detalle.mail if detalle else "—",
            subastaId=r.subasta,
            importe=float(r.importe),
            comision=float(r.comision),
            envio=costo_envio,
            total=total,
            moneda=subasta.moneda if subasta else "ARS",
            metodoPago=medio.tipo if medio else None,
            fechaLimitePago=r.fecha_limite_pago,
        ))
    return result


@router.post("/pagos/{registro_id}/confirmar")
async def ep_confirmar_pago(registro_id: int, db: Session = Depends(get_db)):
    """Marca un registro de compra como pagado (pago recibido)."""
    registro = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.identificador == registro_id
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if registro.pagado == "si":
        raise HTTPException(status_code=409, detail="Este pago ya fue confirmado")
    if registro.pagado == "vencido":
        raise HTTPException(status_code=409, detail="Este pago ya fue marcado como vencido")

    registro.pagado = "si"
    db.commit()

    # Email de confirmación al cliente
    mail, nombre = _get_mail_nombre(db, registro.cliente)
    pp = db.query(models.ProductoPresentacion).filter(
        models.ProductoPresentacion.producto == registro.producto
    ).first()
    titulo = pp.titulo if pp else f"Artículo #{registro.producto}"
    subasta = db.query(models.Subasta).filter(
        models.Subasta.identificador == registro.subasta
    ).first()
    moneda = subasta.moneda if subasta else "ARS"
    costo_envio = float(registro.costo_envio) if registro.costo_envio else 0.0
    total = round(float(registro.importe) + float(registro.comision) + costo_envio, 2)

    asyncio.create_task(send_payment_confirmed_notification(
        to_email=mail,
        nombre=nombre,
        items_titulos=[titulo],
        total=total,
        moneda=moneda,
    ))

    return {"mensaje": f"Pago del registro #{registro_id} confirmado. Email enviado a {mail}."}


@router.post("/pagos/{registro_id}/rechazar")
async def ep_rechazar_pago(registro_id: int, db: Session = Depends(get_db)):
    """
    Marca el pago como vencido (no se recibieron fondos en 72hs).
    Genera multa del 10% y notifica al cliente.
    """
    registro = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.identificador == registro_id
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if registro.pagado in ("si", "vencido"):
        raise HTTPException(status_code=409, detail=f"El pago ya tiene estado '{registro.pagado}'")

    registro.pagado = "vencido"

    # Multa: 10% del importe pujado
    monto_multa = round(float(registro.importe) * 0.10, 2)
    multa_existente = db.query(models.Multa).filter(
        models.Multa.cliente == registro.cliente,
        models.Multa.subasta == registro.subasta,
        models.Multa.pagado == "no",
    ).first()
    deadline = datetime.now() + timedelta(hours=DEADLINE_PAGO_HORAS)
    if not multa_existente:
        db.add(models.Multa(
            cliente=registro.cliente,
            subasta=registro.subasta,
            monto=monto_multa,
            pagado="no",
            fecha_limite=deadline,
        ))

    db.commit()

    mail, nombre = _get_mail_nombre(db, registro.cliente)
    subasta = db.query(models.Subasta).filter(
        models.Subasta.identificador == registro.subasta
    ).first()
    moneda = subasta.moneda if subasta else "ARS"

    asyncio.create_task(send_multa_notification(
        to_email=mail,
        nombre=nombre,
        monto_multa=monto_multa,
        importe_original=float(registro.importe),
        moneda=moneda,
        deadline=deadline,
    ))

    return {
        "mensaje": f"Pago rechazado. Multa de {monto_multa} generada. Email enviado a {mail}.",
        "multaMonto": monto_multa,
        "deadlinePago": deadline.isoformat(),
    }


# ── Multas ────────────────────────────────────────────────────────────────────

@router.get("/multas/pendientes", response_model=list[schemas.MultaResponse])
def ep_multas_pendientes(db: Session = Depends(get_db)):
    """Lista todas las multas sin pagar."""
    return db.query(models.Multa).filter(models.Multa.pagado == "no").all()


@router.post("/multas/{multa_id}/confirmar-pago")
def ep_confirmar_pago_multa(multa_id: int, db: Session = Depends(get_db)):
    """Marca una multa como pagada (admin confirma recepción de fondos)."""
    multa = db.query(models.Multa).filter(models.Multa.identificador == multa_id).first()
    if not multa:
        raise HTTPException(status_code=404, detail="Multa no encontrada")
    if multa.pagado == "si":
        raise HTTPException(status_code=409, detail="La multa ya fue pagada")
    multa.pagado = "si"
    db.commit()
    return {"mensaje": f"Multa #{multa_id} marcada como pagada. El usuario puede participar en subastas nuevamente."}
