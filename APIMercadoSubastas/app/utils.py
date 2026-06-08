import base64
from sqlalchemy.orm import Session
from . import models

CATEGORIA_ORDER = {"comun": 1, "especial": 2, "plata": 3, "oro": 4, "platino": 5}


def get_foto_b64(db: Session, producto_id: int) -> str | None:
    pp = db.query(models.ProductoPresentacion).filter(
        models.ProductoPresentacion.producto == producto_id
    ).first()
    foto_id = pp.imagenPrincipal if pp and pp.imagenPrincipal else None
    if foto_id:
        foto = db.query(models.Foto).filter(models.Foto.identificador == foto_id).first()
    else:
        foto = db.query(models.Foto).filter(models.Foto.producto == producto_id).first()
    if foto and foto.foto:
        return base64.b64encode(foto.foto).decode("utf-8")
    return None
