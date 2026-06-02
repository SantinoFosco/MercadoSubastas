from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["Información"])

@router.post("/paises/", response_model=schemas.Pais)
def ep_create_pais(pais: schemas.PaisCreate, db: Session = Depends(get_db)):
    db_pais = models.Pais(**pais.model_dump())
    db.add(db_pais)
    db.commit()
    db.refresh(db_pais)
    return db_pais

@router.get("/paises/", response_model=list[schemas.Pais])
def ep_read_paises(db: Session = Depends(get_db)):
    return db.query(models.Pais).all()

@router.get("/paises/{numero}", response_model=schemas.Pais)
def ep_read_pais(numero: int, db: Session = Depends(get_db)):
    pais = db.query(models.Pais).filter(models.Pais.numero == numero).first()
    if not pais:
        raise HTTPException(status_code=404, detail="País no encontrado")
    return pais

@router.delete("/paises/{numero}")
def ep_delete_pais(numero: int, db: Session = Depends(get_db)):
    pais = db.query(models.Pais).filter(models.Pais.numero == numero).first()
    if not pais:
        raise HTTPException(status_code=404, detail="País no encontrado")
    db.delete(pais)
    db.commit()
    return pais
