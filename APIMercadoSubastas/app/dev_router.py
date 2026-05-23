from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from . import models
from .database import SessionLocal

router = APIRouter(prefix="/dev", tags=["Dev Utils"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.delete("/reset/usuarios")
def reset_usuarios(db: Session = Depends(get_db)):
    db.query(models.HistorialPujos).delete(synchronize_session=False)
    db.query(models.Pujo).delete(synchronize_session=False)

    db.query(models.Asistente).delete(synchronize_session=False)

    db.query(models.mpCuentaBancaria).delete(synchronize_session=False)
    db.query(models.mpTarjeta).delete(synchronize_session=False)
    db.query(models.mpChequeCertificado).delete(synchronize_session=False)

    db.query(models.MedioPago).delete(synchronize_session=False)
    db.query(models.RegistroSubasta).delete(synchronize_session=False)

    db.query(models.Cliente).delete(synchronize_session=False)
    db.query(models.Duenio).delete(synchronize_session=False)
    db.query(models.Subastador).delete(synchronize_session=False)

    db.query(models.PersonaDetalle).delete(synchronize_session=False)

    db.query(models.Persona).delete(synchronize_session=False)

    db.commit()

    return {"mensaje": "Todos los usuarios y sus datos asociados fueron eliminados correctamente"}
