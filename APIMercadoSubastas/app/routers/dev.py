import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from .subastas import _item_timers

# Solo disponible cuando DEV_MODE=true (nunca en producción)
router = APIRouter(prefix="/dev", tags=["Dev Utils"])
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"


@router.delete("/reset/usuarios")
def reset_usuarios(db: Session = Depends(get_db)):
    """Elimina todos los usuarios y sus datos asociados. Solo para dev/test."""
    if not DEV_MODE:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Endpoint solo disponible en modo desarrollo (DEV_MODE=true)")
    db.query(models.HistorialPujos).delete(synchronize_session=False)
    db.query(models.Pujo).delete(synchronize_session=False)
    db.query(models.Asistente).delete(synchronize_session=False)
    db.query(models.mpCuentaBancaria).delete(synchronize_session=False)
    db.query(models.mpTarjeta).delete(synchronize_session=False)
    db.query(models.mpChequeCertificado).delete(synchronize_session=False)
    db.query(models.MedioPago).delete(synchronize_session=False)
    db.query(models.RegistroSubasta).delete(synchronize_session=False)
    db.query(models.Multa).delete(synchronize_session=False)
    db.query(models.Cliente).delete(synchronize_session=False)
    db.query(models.Duenio).delete(synchronize_session=False)
    db.query(models.Subastador).delete(synchronize_session=False)
    db.query(models.PersonaDetalle).delete(synchronize_session=False)
    db.query(models.Persona).delete(synchronize_session=False)
    db.commit()
    return {"mensaje": "Todos los usuarios y sus datos asociados fueron eliminados correctamente"}


@router.delete("/reset/subasta/{subasta_id}")
def reset_subasta(subasta_id: int, db: Session = Depends(get_db)):
    """Resetea el estado de una subasta: cancela timers, borra pujas y asistentes. Solo para dev/test."""
    if not DEV_MODE:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Endpoint solo disponible en modo desarrollo (DEV_MODE=true)")
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if catalogo:
        item_ids = [
            i.identificador for i in db.query(models.ItemCatalogo)
            .filter(models.ItemCatalogo.catalogo == catalogo.identificador).all()
        ]
        for iid in item_ids:
            existing = _item_timers.get(iid)
            if existing and not existing.done():
                existing.cancel()
            _item_timers.pop(iid, None)
        db.query(models.HistorialPujos).filter(models.HistorialPujos.subasta == subasta_id).delete()
        for iid in item_ids:
            db.query(models.Pujo).filter(models.Pujo.item == iid).delete()
        db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.catalogo == catalogo.identificador
        ).update({"subastado": "no"})
    db.query(models.RegistroSubasta).filter(models.RegistroSubasta.subasta == subasta_id).delete()
    db.query(models.Multa).filter(models.Multa.subasta == subasta_id).delete()
    db.query(models.Asistente).filter(models.Asistente.subasta == subasta_id).delete()
    # Restaurar estado "abierta" para que vuelva a aparecer en home
    subasta = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if subasta:
        subasta.estado = "abierta"
    db.commit()
    return {"mensaje": f"Subasta {subasta_id} reseteada para testing"}
