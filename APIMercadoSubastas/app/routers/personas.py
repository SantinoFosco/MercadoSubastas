from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["Personas"])

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/sectores/", response_model=list[schemas.SectorResponse])
def ep_get_sectores(db: Session = Depends(get_db)):
    sectores = db.query(models.Sector).all()
    return [schemas.SectorResponse(
        identificador=s.identificador,
        nombreSector=s.nombreSector,
        codigoSector=s.codigoSector,
    ) for s in sectores]

@router.post("/sectores/", response_model=schemas.SectorResponse)
def ep_create_sector(request: schemas.SectorCreate, db: Session = Depends(get_db)):
    nuevo = models.Sector(nombreSector=request.nombreSector, codigoSector=request.codigoSector)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return schemas.SectorResponse(
        identificador=nuevo.identificador,
        nombreSector=nuevo.nombreSector,
        codigoSector=nuevo.codigoSector,
    )

@router.get("/sectores/{sector_id}", response_model=schemas.SectorResponse)
def ep_get_sector(sector_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Sector).filter(models.Sector.identificador == sector_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return schemas.SectorResponse(identificador=s.identificador, nombreSector=s.nombreSector, codigoSector=s.codigoSector)

@router.delete("/sectores/{sector_id}")
def ep_delete_sector(sector_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Sector).filter(models.Sector.identificador == sector_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    db.delete(s)
    db.commit()
    return {"message": f"Sector {sector_id} eliminado con éxito"}

@router.post("/duenios/", response_model=schemas.DuenioResponse, status_code=201)
def ep_create_duenio(request: schemas.DuenioCreate, db: Session = Depends(get_db)):
    try:
        nuevo = models.Duenio(identificador=request.identificador, numeroPais=request.numeroPais, verificador=request.verificador)
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede crear el dueño: datos inválidos o duplicados")

@router.put("/duenios/{duenio_id}/verificacion", response_model=schemas.DuenioResponse)
def ep_update_duenio_verificacion(duenio_id: int, request: schemas.DuenioVerificacionUpdate, db: Session = Depends(get_db)):
    duenio = db.query(models.Duenio).filter(models.Duenio.identificador == duenio_id).first()
    if not duenio:
        raise HTTPException(status_code=404, detail="Dueño no encontrado")
    if request.verificacionFinanciera is not None:
        if request.verificacionFinanciera not in ("si", "no"):
            raise HTTPException(status_code=422, detail="verificacionFinanciera debe ser 'si' o 'no'")
        duenio.verificacionFinanciera = request.verificacionFinanciera
    if request.verificacionJudicial is not None:
        if request.verificacionJudicial not in ("si", "no"):
            raise HTTPException(status_code=422, detail="verificacionJudicial debe ser 'si' o 'no'")
        duenio.verificacionJudicial = request.verificacionJudicial
    if request.calificacionRiesgo is not None:
        if request.calificacionRiesgo not in (1, 2, 3, 4, 5, 6):
            raise HTTPException(status_code=422, detail="calificacionRiesgo debe ser entre 1 y 6")
        duenio.calificacionRiesgo = request.calificacionRiesgo
    db.commit()
    db.refresh(duenio)
    return duenio

@router.delete("/duenios/{duenio_id}")
def ep_delete_duenio(duenio_id: int, db: Session = Depends(get_db)):
    try:
        obj = db.query(models.Duenio).filter(models.Duenio.identificador == duenio_id).first()
        if obj:
            db.delete(obj)
            db.commit()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay productos que dependen de este dueño")
    if obj is None:
        raise HTTPException(status_code=404, detail="Dueño no encontrado")
    return {"message": f"Dueño {duenio_id} eliminado con éxito"}

@router.post("/subastadores/", response_model=schemas.SubastadorResponse, status_code=201)
def ep_create_subastador(request: schemas.SubastadorCreate, db: Session = Depends(get_db)):
    nuevo = models.Subastador(identificador=request.identificador, matricula=request.matricula, region=request.region)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/subastadores/{subastador_id}")
def ep_delete_subastador(subastador_id: int, db: Session = Depends(get_db)):
    try:
        obj = db.query(models.Subastador).filter(models.Subastador.identificador == subastador_id).first()
        if obj:
            db.delete(obj)
            db.commit()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay subastas que dependen de este subastador")
    if obj is None:
        raise HTTPException(status_code=404, detail="Subastador no encontrado")
    return {"message": f"Subastador {subastador_id} eliminado con éxito"}

@router.get("/empleados/", response_model=list[schemas.EmpleadoResponse])
def ep_get_empleados(db: Session = Depends(get_db)):
    return db.query(models.Empleado).all()

@router.post("/empleados/", response_model=schemas.EmpleadoResponse)
def ep_create_empleado(request: schemas.EmpleadoCreate, db: Session = Depends(get_db)):
    nuevo = models.Empleado(cargo=request.cargo, sector=request.sector)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/empleados/{empleado_id}", response_model=schemas.EmpleadoResponse)
def ep_get_empleado(empleado_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Empleado).filter(models.Empleado.identificador == empleado_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return e

@router.delete("/empleados/{empleado_id}")
def ep_delete_empleado(empleado_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Empleado).filter(models.Empleado.identificador == empleado_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    db.delete(e)
    db.commit()
    return {"message": f"Empleado {empleado_id} eliminado con éxito"}

@router.get("/clientes/", response_model=list[schemas.ClienteResponse])
def ep_get_clientes(db: Session = Depends(get_db)):
    return db.query(models.Cliente).all()

@router.post("/clientes/", response_model=schemas.ClienteResponse)
def ep_create_cliente(request: schemas.ClienteCreate, db: Session = Depends(get_db)):
    nuevo = models.Cliente(
        identificador=request.identificador, numeroPais=request.numeroPais,
        admitido="no", categoria="comun", verificador=request.verificador,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/clientes/{cliente_id}/perfil", response_model=schemas.PerfilCompletoResponse)
def ep_get_perfil(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.identificador == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    persona = db.query(models.Persona).filter(
        models.Persona.identificador == cliente_id
    ).first()
    detalle = db.query(models.PersonaDetalle).filter(
        models.PersonaDetalle.persona == cliente_id
    ).first()
    return schemas.PerfilCompletoResponse(
        identificador=cliente_id,
        nombre=persona.nombre if persona else "",
        mail=detalle.mail if detalle else "",
        direccion=persona.direccion if persona else "",
        categoria=cliente.categoria,
        admitido=cliente.admitido,
        numeroPais=cliente.numeroPais,
    )

@router.get("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def ep_get_cliente(cliente_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Cliente).filter(models.Cliente.identificador == cliente_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return c

@router.delete("/clientes/{cliente_id}")
def ep_delete_cliente(cliente_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Cliente).filter(models.Cliente.identificador == cliente_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(c)
    db.commit()
    return {"message": f"Cliente {cliente_id} eliminado con éxito"}
