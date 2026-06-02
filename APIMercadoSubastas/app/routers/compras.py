from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["Compras"])

# ── CRUD ─────────────────────────────────────────────────────────────────────

def _get_asistente(db: Session, subasta_id: int, usuario_id: int):
    return db.query(models.Asistente).filter(
        models.Asistente.subasta == subasta_id,
        models.Asistente.cliente == usuario_id,
    ).first()


def _get_foto_b64(db: Session, producto_id: int) -> str | None:
    import base64
    foto = db.query(models.Foto).filter(models.Foto.producto == producto_id).first()
    if foto and foto.foto:
        return base64.b64encode(foto.foto).decode("utf-8")
    return None


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
            imagen=_get_foto_b64(db, item.producto),
        ))
    return result


def get_precio_total(db: Session, subasta_id: int, usuario_id: int):
    asistente = _get_asistente(db, subasta_id, usuario_id)
    if not asistente:
        return None
    pujos = db.query(models.Pujo).filter(
        models.Pujo.asistente == asistente.identificador,
        models.Pujo.ganador == "si",
    ).all()
    total_precio = total_comision = total_seguro = 0.0
    for pujo in pujos:
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == pujo.item).first()
        if not item:
            continue
        total_precio += float(pujo.importe)
        total_comision += float(item.comision)
        producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
        if producto and producto.seguro:
            seguro = db.query(models.Seguro).filter(models.Seguro.nroPoliza == producto.seguro).first()
            if seguro:
                total_seguro += float(seguro.importe)
    return schemas.PrecioFinal(
        precioFinal=total_precio,
        comision=total_comision,
        seguro=total_seguro,
        total=round(total_precio + total_comision + total_seguro, 2),
    )


def confirmar_envio(db: Session, subasta_id: int, usuario_id: int, metodo_envio: str):
    if not _get_asistente(db, subasta_id, usuario_id):
        return None
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
    return {"mensaje": result}
