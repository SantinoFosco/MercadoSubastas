from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..utils import get_foto_b64

router = APIRouter(tags=["Compras"])

# ── CRUD ─────────────────────────────────────────────────────────────────────

def _get_asistente(db: Session, subasta_id: int, usuario_id: int):
    return db.query(models.Asistente).filter(
        models.Asistente.subasta == subasta_id,
        models.Asistente.cliente == usuario_id,
    ).first()


def _get_seguro_importe(db: Session, producto_id: int) -> float:
    producto = db.query(models.Producto).filter(models.Producto.identificador == producto_id).first()
    if producto and producto.seguro:
        seguro = db.query(models.Seguro).filter(models.Seguro.nroPoliza == producto.seguro).first()
        if seguro:
            return float(seguro.importe)
    return 0.0


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
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == pujo.item).first()
        if not item:
            continue
        pp = db.query(models.ProductoPresentacion).filter(models.ProductoPresentacion.producto == item.producto).first()
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
    paid_products = {r.producto for r in db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.subasta == subasta_id,
        models.RegistroSubasta.cliente == usuario_id,
        models.RegistroSubasta.pagado == "si",
    ).all()}
    pujos = db.query(models.Pujo).filter(
        models.Pujo.asistente == asistente.identificador,
        models.Pujo.ganador == "si",
    ).all()
    total_precio = total_comision = total_seguro = 0.0
    for pujo in pujos:
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == pujo.item).first()
        if not item or item.producto in paid_products:
            continue
        total_precio += float(pujo.importe)
        total_comision += float(pujo.importe) * float(item.comision) / 100
        total_seguro += _get_seguro_importe(db, item.producto)
    return schemas.PrecioFinal(
        precioFinal=total_precio,
        comision=total_comision,
        seguro=total_seguro,
        total=round(total_precio + total_comision + total_seguro, 2),
    )


def confirmar_envio(db: Session, subasta_id: int, usuario_id: int, metodo_envio: str):
    if not _get_asistente(db, subasta_id, usuario_id):
        return None
    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.subasta == subasta_id,
        models.RegistroSubasta.cliente == usuario_id,
    ).all()
    for r in registros:
        r.metodo_envio = metodo_envio
    db.commit()
    return f"Envío confirmado: {metodo_envio}"


def confirmar_pago(db: Session, subasta_id: int, usuario_id: int, metodo_pago_id: int):
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
    subasta_obj = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if subasta_obj and subasta_obj.moneda == "USD":
        if medio.moneda != "USD":
            return None, "moneda_incompatible"
        if medio.tipo == "tarjeta" and medio.es_internacional != "si":
            return None, "tarjeta_no_internacional"
        if medio.tipo == "cheque_certificado":
            return None, "cheque_no_valido_usd"

    # Buscar compras pendientes de pago de este usuario en esta subasta
    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.subasta == subasta_id,
        models.RegistroSubasta.cliente == usuario_id,
        models.RegistroSubasta.pagado == "no",
    ).all()
    if not registros:
        return None, "sin_compras"

    # Si paga con cheque certificado: validar saldo y descontarlo
    if medio.tipo == "cheque_certificado":
        cheque = db.query(models.mpChequeCertificado).filter(
            models.mpChequeCertificado.medio_pago == metodo_pago_id
        ).first()
        total = round(sum(
            float(r.importe) + float(r.comision) + _get_seguro_importe(db, r.producto)
            for r in registros
        ), 2)
        if not cheque or float(cheque.monto_disponible) < total:
            multa_existente = db.query(models.Multa).filter(
                models.Multa.cliente == usuario_id,
                models.Multa.subasta == subasta_id,
                models.Multa.pagado == "no",
            ).first()
            if not multa_existente:
                monto_multa = round(sum(float(r.importe) for r in registros) * 0.10, 2)
                db.add(models.Multa(
                    cliente=usuario_id, subasta=subasta_id,
                    monto=monto_multa, pagado="no",
                    fecha_limite=datetime.now() + timedelta(hours=72),
                ))
                db.commit()
            return None, "fondos_insuficientes"
        cheque.monto_disponible = round(float(cheque.monto_disponible) - total, 2)

    # Registrar el medio de pago y marcar cada ítem como pagado
    for registro in registros:
        registro.medio_pago = metodo_pago_id
        registro.pagado = "si"

    db.commit()
    return "Pago confirmado correctamente", None


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
def ep_confirmar_envio(subasta_id: int, usuario_id: int, metodoEnvio: str = Query(...), db: Session = Depends(get_db)):
    result = confirmar_envio(db, subasta_id, usuario_id, metodoEnvio)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return {"mensaje": result}

@router.post("/subasta/{subasta_id}/{usuario_id}/compras/pagar")
def ep_confirmar_pago(subasta_id: int, usuario_id: int, metodoPagoId: int = Query(...), db: Session = Depends(get_db)):
    result, error = confirmar_pago(db, subasta_id, usuario_id, metodoPagoId)
    if error == "asistente":
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    if error == "medio_pago":
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado o no pertenece al usuario")
    if error == "medio_no_verificado":
        raise HTTPException(status_code=422, detail="El medio de pago no está verificado")
    if error == "sin_compras":
        raise HTTPException(status_code=409, detail="No hay compras pendientes de pago en esta subasta")
    if error == "fondos_insuficientes":
        raise HTTPException(status_code=422, detail="El saldo disponible en el cheque certificado no alcanza para cubrir el total. Se registró una multa del 10%.")
    if error == "moneda_incompatible":
        raise HTTPException(status_code=422, detail="La subasta es en USD. El medio de pago debe ser en dólares.")
    if error == "tarjeta_no_internacional":
        raise HTTPException(status_code=422, detail="Para subastas en USD se requiere una tarjeta internacional.")
    if error == "cheque_no_valido_usd":
        raise HTTPException(status_code=422, detail="Los cheques certificados no pueden usarse para pagar subastas en USD.")
    return {"mensaje": result}


@router.get("/multas/{cliente_id}", response_model=list[schemas.MultaResponse])
def ep_get_multas(cliente_id: int, db: Session = Depends(get_db)):
    return db.query(models.Multa).filter(
        models.Multa.cliente == cliente_id,
        models.Multa.pagado == "no",
    ).all()


@router.post("/multas/{multa_id}/pagar")
def ep_pagar_multa(multa_id: int, db: Session = Depends(get_db)):
    multa = db.query(models.Multa).filter(models.Multa.identificador == multa_id).first()
    if not multa:
        raise HTTPException(status_code=404, detail="Multa no encontrada")
    if multa.pagado == "si":
        raise HTTPException(status_code=409, detail="La multa ya fue pagada")
    multa.pagado = "si"
    db.commit()
    return {"mensaje": "Multa pagada correctamente"}
