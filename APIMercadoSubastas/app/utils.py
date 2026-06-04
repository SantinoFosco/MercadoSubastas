import base64
from sqlalchemy.orm import Session
from . import models

CATEGORIA_ORDER = {"comun": 1, "especial": 2, "plata": 3, "oro": 4, "platino": 5}


def get_foto_b64(db: Session, producto_id: int) -> str | None:
    foto = db.query(models.Foto).filter(models.Foto.producto == producto_id).first()
    if foto and foto.foto:
        return base64.b64encode(foto.foto).decode("utf-8")
    return None
