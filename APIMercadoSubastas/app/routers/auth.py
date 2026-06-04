from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["Auth y Registro"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── CRUD ─────────────────────────────────────────────────────────────────────

def iniciar_registro(db: Session, request: schemas.RegistroIniciarRequest):
    request.mail = request.mail.lower()
    if db.query(models.Persona).filter(models.Persona.documento == request.documento).first():
        raise HTTPException(status_code=409, detail="El documento ya está registrado")
    if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == request.mail).first():
        raise HTTPException(status_code=409, detail="El mail ya está registrado")
    try:
        nueva_persona = models.Persona(
            nombre=f"{request.nombre} {request.apellido}",
            documento=request.documento,
            direccion=request.direccion,
            estado="inactivo",
        )
        db.add(nueva_persona)
        db.flush()
        db.add(models.PersonaDetalle(
            persona=nueva_persona.identificador,
            pais=request.pais,
            mail=request.mail,
            contrasenia="",
            claveTemporal=True,
        ))
        db.commit()
        db.refresh(nueva_persona)
        return schemas.RegistroIniciarResponse(mensaje="Registro iniciado exitosamente", personaId=nueva_persona.identificador)
    except Exception as e:
        db.rollback()
        raise e


def get_pendientes(db: Session):
    with_cliente = db.query(models.Cliente.identificador).subquery()
    rows = (
        db.query(models.PersonaDetalle, models.Persona)
        .join(models.Persona, models.PersonaDetalle.persona == models.Persona.identificador)
        .filter(~models.PersonaDetalle.persona.in_(with_cliente))
        .all()
    )
    return [
        schemas.RegistroPendienteResponse(
            personaId=persona.identificador,
            nombre=persona.nombre,
            documento=persona.documento,
            mail=detalle.mail,
            pais=detalle.pais,
        )
        for detalle, persona in rows
    ]


def aprobar_registro(db: Session, request: schemas.RegistroVerificacionRequest):
    persona = db.query(models.Persona).filter(models.Persona.identificador == request.personaId).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    persona_detalle = db.query(models.PersonaDetalle).filter(models.PersonaDetalle.persona == request.personaId).first()
    if not persona_detalle:
        raise HTTPException(status_code=404, detail="El usuario no completó el registro inicial")
    if not db.query(models.Empleado).filter(models.Empleado.identificador == request.verificador).first():
        raise HTTPException(status_code=404, detail="Empleado verificador no encontrado")
    categorias_validas = {"comun", "especial", "plata", "oro", "platino"}
    if (request.categoria or "comun") not in categorias_validas:
        raise HTTPException(status_code=422, detail="Categoría inválida")
    if db.query(models.Cliente).filter(models.Cliente.identificador == request.personaId).first():
        raise HTTPException(status_code=409, detail="El usuario ya fue verificado anteriormente")
    persona.estado = "activo"
    db.add(models.Cliente(
        identificador=persona.identificador,
        numeroPais=persona_detalle.pais,
        admitido="si",
        categoria=request.categoria or "comun",
        verificador=request.verificador,
    ))
    db.commit()
    return schemas.MensajeResponse(mensaje="Registro aprobado exitosamente")


def desaprobar_registro(db: Session, request: schemas.RegistroVerificacionRequest):
    persona = db.query(models.Persona).filter(models.Persona.identificador == request.personaId).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    persona_detalle = db.query(models.PersonaDetalle).filter(models.PersonaDetalle.persona == request.personaId).first()
    if not persona_detalle:
        raise HTTPException(status_code=404, detail="El usuario no completó el registro inicial")
    if not db.query(models.Empleado).filter(models.Empleado.identificador == request.verificador).first():
        raise HTTPException(status_code=404, detail="Empleado verificador no encontrado")
    if db.query(models.Cliente).filter(models.Cliente.identificador == request.personaId).first():
        raise HTTPException(status_code=409, detail="El usuario ya fue verificado anteriormente")
    db.add(models.Cliente(
        identificador=persona.identificador,
        numeroPais=persona_detalle.pais,
        admitido="no",
        verificador=request.verificador,
    ))
    db.commit()
    return schemas.MensajeResponse(mensaje="Registro desaprobado exitosamente")


def login(db: Session, request: schemas.LoginRequest):
    request.mail = request.mail.lower()
    persona_detalle = db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == request.mail).first()
    if not persona_detalle:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not persona_detalle.claveTemporal:
        if not pwd_context.verify(request.contrasenia, persona_detalle.contrasenia):
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
    persona = db.query(models.Persona).filter(models.Persona.identificador == persona_detalle.persona).first()
    cliente = db.query(models.Cliente).filter(models.Cliente.identificador == persona.identificador).first()
    if not cliente:
        raise HTTPException(status_code=403, detail="El perfil aún no ha sido verificado por un empleado")
    if cliente.admitido != "si":
        raise HTTPException(status_code=403, detail="Tu cuenta no fue habilitada. Contactá a la casa de subastas.")
    return schemas.Usuario(
        identificador=persona.identificador,
        nombre=persona.nombre,
        mail=persona_detalle.mail,
        categoria=cliente.categoria,
        estado=persona.estado,
        claveTemporal=persona_detalle.claveTemporal,
        admitido=cliente.admitido,
    )


def cambiar_clave(db: Session, request: schemas.CambiarClaveRequest):
    request.mail = request.mail.lower()
    persona_detalle = db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == request.mail).first()
    if not persona_detalle:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    persona_detalle.contrasenia = pwd_context.hash(request.contrasenia)
    persona_detalle.claveTemporal = False
    db.commit()
    return schemas.MensajeResponse(mensaje="Contraseña actualizada correctamente")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/registro/iniciar", response_model=schemas.RegistroIniciarResponse)
def ep_iniciar_registro(request: schemas.RegistroIniciarRequest, db: Session = Depends(get_db)):
    return iniciar_registro(db, request)

@router.get("/registro/pendientes", response_model=list[schemas.RegistroPendienteResponse])
def ep_get_pendientes(db: Session = Depends(get_db)):
    return get_pendientes(db)

@router.post("/registro/aprobar", response_model=schemas.MensajeResponse)
def ep_aprobar_registro(request: schemas.RegistroVerificacionRequest, db: Session = Depends(get_db)):
    return aprobar_registro(db, request)

@router.post("/registro/desaprobar", response_model=schemas.MensajeResponse)
def ep_desaprobar_registro(request: schemas.RegistroVerificacionRequest, db: Session = Depends(get_db)):
    return desaprobar_registro(db, request)

@router.post("/login", response_model=schemas.Usuario)
def ep_login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    return login(db, request)

@router.put("/cambiar-clave", response_model=schemas.MensajeResponse)
def ep_cambiar_clave(request: schemas.CambiarClaveRequest, db: Session = Depends(get_db)):
    return cambiar_clave(db, request)
