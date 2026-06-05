from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/mediosPago", tags=["Medios de Pago"])

# ── CRUD ─────────────────────────────────────────────────────────────────────

def _build_medio_pago_item(medio: models.MedioPago, db: Session) -> schemas.MedioPagoItem:
    monto = monto_disp = None
    if medio.tipo == "cheque_certificado":
        cheque = db.query(models.mpChequeCertificado).filter(
            models.mpChequeCertificado.medio_pago == medio.identificador
        ).first()
        if cheque:
            monto = cheque.monto
            monto_disp = cheque.monto_disponible
    return schemas.MedioPagoItem(
        id=medio.identificador,
        tipo=medio.tipo,
        estado=medio.estado,
        descripcion=medio.descripcion,
        moneda=medio.moneda,
        esInternacional=medio.es_internacional == "si",
        montoCheque=monto,
        montoDisponibleCheque=monto_disp,
    )


def get_medios_pago_cliente(db: Session, cliente_id: int) -> schemas.MedioPagoListResponse:
    medios = db.query(models.MedioPago).filter(models.MedioPago.cliente == cliente_id).all()
    items = [_build_medio_pago_item(m, db) for m in medios]
    return schemas.MedioPagoListResponse(
        tieneMedioPagoVerificado=any(i.estado == "verificado" for i in items),
        medios=items,
    )


def get_medio_pago_detalle(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(models.MedioPago.identificador == medio_pago_id).first()
    return _build_medio_pago_item(medio, db) if medio else None


def update_medio_pago_descripcion(db: Session, medio_pago_id: int, descripcion: str):
    medio = db.query(models.MedioPago).filter(models.MedioPago.identificador == medio_pago_id).first()
    if not medio:
        return None
    medio.descripcion = descripcion
    db.commit()
    db.refresh(medio)
    return _build_medio_pago_item(medio, db)


def delete_medio_pago(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(models.MedioPago.identificador == medio_pago_id).first()
    if medio:
        db.delete(medio)
        db.commit()
    return medio


def create_cuenta_bancaria(db: Session, request: schemas.CuentaBancariaCreate):
    try:
        nuevo_medio = models.MedioPago(
            cliente=request.cliente, tipo="cuenta_bancaria", estado="pendiente",
            moneda=request.moneda, es_internacional="si" if request.esInternacional else "no",
            descripcion=request.descripcion,
        )
        db.add(nuevo_medio)
        db.flush()
        nueva_cuenta = models.mpCuentaBancaria(
            medio_pago=nuevo_medio.identificador, titular=request.titular,
            banco=request.banco, cbu=request.cbu, alias=request.alias, pais_banco=request.paisBanco,
        )
        db.add(nueva_cuenta)
        db.commit()
        db.refresh(nuevo_medio)
        db.refresh(nueva_cuenta)
        return schemas.CuentaBancariaResponse(
            id=nuevo_medio.identificador, tipo=nuevo_medio.tipo, estado=nuevo_medio.estado,
            descripcion=nuevo_medio.descripcion, moneda=nuevo_medio.moneda, esInternacional=False,
            titular=nueva_cuenta.titular, banco=nueva_cuenta.banco, cbu=nueva_cuenta.cbu,
            alias=nueva_cuenta.alias, paisBanco=nueva_cuenta.pais_banco,
        )
    except Exception as e:
        db.rollback()
        raise e


def get_cuenta_bancaria(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(models.MedioPago.identificador == medio_pago_id).first()
    cuenta = db.query(models.mpCuentaBancaria).filter(models.mpCuentaBancaria.medio_pago == medio_pago_id).first()
    if not medio or not cuenta:
        return None
    return schemas.CuentaBancariaResponse(
        id=medio.identificador, tipo=medio.tipo, estado=medio.estado,
        descripcion=medio.descripcion, moneda=medio.moneda, esInternacional=medio.es_internacional == "si",
        titular=cuenta.titular, banco=cuenta.banco, cbu=cuenta.cbu,
        alias=cuenta.alias, paisBanco=cuenta.pais_banco,
    )


def create_tarjeta(db: Session, request: schemas.TarjetaCreate):
    from datetime import date
    marca_normalizada = request.marca.upper()
    if marca_normalizada not in {"VISA", "MASTERCARD", "AMEX"}:
        raise HTTPException(status_code=422, detail=f"Marca inválida '{request.marca}'. Permitidas: VISA, MASTERCARD, AMEX")
    if request.vencimiento < date.today():
        raise HTTPException(status_code=422, detail="La tarjeta está vencida")
    try:
        nuevo_medio = models.MedioPago(
            cliente=request.cliente, tipo="tarjeta", estado="pendiente",
            moneda=request.moneda, es_internacional="si" if request.esInternacional else "no",
            descripcion=request.descripcion,
        )
        db.add(nuevo_medio)
        db.flush()
        nueva_tarjeta = models.mpTarjeta(
            medio_pago=nuevo_medio.identificador, titular=request.titular,
            ultimos_4_digitos=request.ultimos4Digitos, vencimiento=request.vencimiento,
            marca=marca_normalizada, tipo_tarjeta=request.tipoTarjeta,
        )
        db.add(nueva_tarjeta)
        db.commit()
        db.refresh(nuevo_medio)
        db.refresh(nueva_tarjeta)
        return schemas.TarjetaResponse(
            id=nuevo_medio.identificador, tipo=nuevo_medio.tipo, estado=nuevo_medio.estado,
            descripcion=nuevo_medio.descripcion, moneda=nuevo_medio.moneda, esInternacional=request.esInternacional,
            titular=nueva_tarjeta.titular, ultimos4Digitos=nueva_tarjeta.ultimos_4_digitos,
            vencimiento=nueva_tarjeta.vencimiento, marca=nueva_tarjeta.marca, tipoTarjeta=nueva_tarjeta.tipo_tarjeta,
        )
    except Exception as e:
        db.rollback()
        raise e


def get_tarjeta(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(models.MedioPago.identificador == medio_pago_id).first()
    tarjeta = db.query(models.mpTarjeta).filter(models.mpTarjeta.medio_pago == medio_pago_id).first()
    if not medio or not tarjeta:
        return None
    return schemas.TarjetaResponse(
        id=medio.identificador, tipo=medio.tipo, estado=medio.estado,
        descripcion=medio.descripcion, moneda=medio.moneda, esInternacional=medio.es_internacional == "si",
        titular=tarjeta.titular, ultimos4Digitos=tarjeta.ultimos_4_digitos,
        vencimiento=tarjeta.vencimiento, marca=tarjeta.marca, tipoTarjeta=tarjeta.tipo_tarjeta,
    )


def create_cheque_certificado(db: Session, request: schemas.ChequeCertificadoCreate):
    if request.moneda != "ARS":
        raise HTTPException(
            status_code=422,
            detail="Los cheques certificados solo pueden registrarse en pesos (ARS)"
        )
    try:
        nuevo_medio = models.MedioPago(
            cliente=request.cliente, tipo="cheque_certificado", estado="pendiente",
            moneda="ARS", es_internacional="no", descripcion=request.descripcion,
        )
        db.add(nuevo_medio)
        db.flush()
        nuevo_cheque = models.mpChequeCertificado(
            medio_pago=nuevo_medio.identificador, banco=request.banco,
            numero_cheque=request.numeroCheque, monto=request.monto,
            monto_disponible=request.monto, observaciones=request.observaciones,
        )
        db.add(nuevo_cheque)
        db.commit()
        db.refresh(nuevo_medio)
        db.refresh(nuevo_cheque)
        return schemas.ChequeCertificadoResponse(
            id=nuevo_medio.identificador, tipo=nuevo_medio.tipo, estado=nuevo_medio.estado,
            descripcion=nuevo_medio.descripcion, moneda=nuevo_medio.moneda, esInternacional=False,
            montoCheque=nuevo_cheque.monto, montoDisponibleCheque=nuevo_cheque.monto_disponible,
            banco=nuevo_cheque.banco, numeroCheque=nuevo_cheque.numero_cheque,
            observaciones=nuevo_cheque.observaciones,
        )
    except Exception as e:
        db.rollback()
        raise e


def get_cheque_certificado(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(models.MedioPago.identificador == medio_pago_id).first()
    cheque = db.query(models.mpChequeCertificado).filter(models.mpChequeCertificado.medio_pago == medio_pago_id).first()
    if not medio or not cheque:
        return None
    return schemas.ChequeCertificadoResponse(
        id=medio.identificador, tipo=medio.tipo, estado=medio.estado,
        descripcion=medio.descripcion, moneda=medio.moneda, esInternacional=medio.es_internacional == "si",
        montoCheque=cheque.monto, montoDisponibleCheque=cheque.monto_disponible,
        banco=cheque.banco, numeroCheque=cheque.numero_cheque, observaciones=cheque.observaciones,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=schemas.MedioPagoListResponse)
def ep_get_medios_pago_cliente(cliente_id: int = Query(...), db: Session = Depends(get_db)):
    return get_medios_pago_cliente(db, cliente_id)

@router.post("/cuenta-bancaria", response_model=schemas.CuentaBancariaResponse)
def ep_create_cuenta_bancaria(request: schemas.CuentaBancariaCreate, db: Session = Depends(get_db)):
    return create_cuenta_bancaria(db, request)

@router.get("/cuenta-bancaria/{medio_pago_id}", response_model=schemas.CuentaBancariaResponse)
def ep_get_cuenta_bancaria(medio_pago_id: int, db: Session = Depends(get_db)):
    result = get_cuenta_bancaria(db, medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
    return result

@router.post("/tarjeta", response_model=schemas.TarjetaResponse)
def ep_create_tarjeta(request: schemas.TarjetaCreate, db: Session = Depends(get_db)):
    return create_tarjeta(db, request)

@router.get("/tarjeta/{medio_pago_id}", response_model=schemas.TarjetaResponse)
def ep_get_tarjeta(medio_pago_id: int, db: Session = Depends(get_db)):
    result = get_tarjeta(db, medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
    return result

@router.post("/cheque", response_model=schemas.ChequeCertificadoResponse)
def ep_create_cheque_certificado(request: schemas.ChequeCertificadoCreate, db: Session = Depends(get_db)):
    return create_cheque_certificado(db, request)

@router.get("/cheque/{medio_pago_id}", response_model=schemas.ChequeCertificadoResponse)
def ep_get_cheque_certificado(medio_pago_id: int, db: Session = Depends(get_db)):
    result = get_cheque_certificado(db, medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cheque certificado no encontrado")
    return result

@router.get("/{medio_pago_id}", response_model=schemas.MedioPagoItem)
def ep_get_medio_pago(medio_pago_id: int, db: Session = Depends(get_db)):
    result = get_medio_pago_detalle(db, medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return result

@router.put("/{medio_pago_id}", response_model=schemas.MedioPagoItem)
def ep_update_medio_pago(medio_pago_id: int, request: schemas.DescripcionUpdate, db: Session = Depends(get_db)):
    result = update_medio_pago_descripcion(db, medio_pago_id, request.descripcion)
    if result is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return result

@router.put("/{medio_pago_id}/estado", response_model=schemas.MedioPagoItem)
def ep_update_estado_medio_pago(medio_pago_id: int, estado: str = Query(...), db: Session = Depends(get_db)):
    if estado not in ("verificado", "rechazado", "pendiente"):
        raise HTTPException(status_code=422, detail="Estado inválido. Opciones: verificado, rechazado, pendiente")
    medio = db.query(models.MedioPago).filter(models.MedioPago.identificador == medio_pago_id).first()
    if not medio:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    medio.estado = estado
    db.commit()
    db.refresh(medio)
    return _build_medio_pago_item(medio, db)

@router.delete("/{medio_pago_id}")
def ep_delete_medio_pago(medio_pago_id: int, db: Session = Depends(get_db)):
    if delete_medio_pago(db, medio_pago_id) is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return {"message": f"Medio de pago {medio_pago_id} eliminado con éxito"}
