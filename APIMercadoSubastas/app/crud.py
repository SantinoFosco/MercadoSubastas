from fastapi import HTTPException
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from . import models, schemas

import random
import base64

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

#------------------ Auth y Registro ------------------------#

def iniciar_registro(db: Session, request: schemas.RegistroIniciarRequest):
    request.mail = request.mail.lower()
    usuario_existente = db.query(models.Persona).filter(models.Persona.documento == request.documento).first()
    if usuario_existente:
        raise HTTPException(status_code=409, detail="El documento ya está registrado")

    try:
        nueva_persona = models.Persona(
            nombre = f"{request.nombre} {request.apellido}",
            documento = request.documento,
            direccion = request.direccion,
            estado = "inactivo"
        )
        db.add(nueva_persona)

        db.flush()

        nuevo_detalle = models.PersonaDetalle(
            persona = nueva_persona.identificador,
            pais = request.pais,
            mail = request.mail,
            contrasenia = "",
            claveTemporal = True
        )
        db.add(nuevo_detalle)

        db.commit()
        db.refresh(nueva_persona)

        return schemas.RegistroIniciarResponse(
            mensaje="Registro iniciado exitosamente",
            personaId=nueva_persona.identificador
        )

    except Exception as e:
        db.rollback()
        raise e
    
def aprobar_registro(db: Session, request: schemas.RegistroVerificacionRequest):
    request.mail = request.mail.lower()
    persona_detalle = db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == request.mail).first()

    if not persona_detalle:
        raise HTTPException(status_code=404, detail="Correo no registrado")

    empleado = db.query(models.Empleado).filter(models.Empleado.identificador == request.verificador).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado verificador no encontrado")

    persona = db.query(models.Persona).filter(models.Persona.identificador == persona_detalle.persona).first()
    persona.estado = "activo"

    categorias = ["comun", "especial", "plata", "oro", "platino"]

    nuevo_cliente = models.Cliente(
        identificador = persona.identificador,
        numeroPais=persona_detalle.pais,
        admitido="si",
        categoria=random.choice(categorias),
        verificador=request.verificador
    )

    db.add(nuevo_cliente)
    db.commit()

    return schemas.MensajeResponse(mensaje="Registro aprobado exitosamente")
    
def desaprobar_registro(db: Session, request: schemas.RegistroVerificacionRequest):
    request.mail = request.mail.lower()
    persona_detalle = db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == request.mail).first()

    if not persona_detalle:
        raise HTTPException(status_code=404, detail="Correo no registrado")

    empleado = db.query(models.Empleado).filter(models.Empleado.identificador == request.verificador).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado verificador no encontrado")

    persona = db.query(models.Persona).filter(models.Persona.identificador == persona_detalle.persona).first()
    persona.estado = "activo"

    nuevo_cliente = models.Cliente(
        identificador = persona.identificador,
        numeroPais=persona_detalle.pais,
        admitido="no",
        verificador=request.verificador
    )

    db.add(nuevo_cliente)
    db.commit()

    return schemas.MensajeResponse(mensaje="Registro desaprobado exitosamente")
    
def login(db: Session, request: schemas.LoginRequest):
    request.mail = request.mail.lower()
    persona_detalle = db.query(models.PersonaDetalle).filter(
        models.PersonaDetalle.mail == request.mail
    ).first()

    if not persona_detalle:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not persona_detalle.claveTemporal:
        if not pwd_context.verify(request.contrasenia, persona_detalle.contrasenia):
            raise HTTPException(status_code=401, detail="Credenciales inválidas")

    persona = db.query(models.Persona).filter(models.Persona.identificador == persona_detalle.persona).first()

    cliente = db.query(models.Cliente).filter(models.Cliente.identificador == persona.identificador).first()

    if not cliente:
        raise HTTPException(status_code=403, detail="El perfil aún no ha sido verificado por un empleado")

    return schemas.Usuario(
        identificador = persona.identificador,
        nombre = persona.nombre,
        mail = persona_detalle.mail,
        categoria = cliente.categoria,
        estado = persona.estado,
        claveTemporal = persona_detalle.claveTemporal,
        admitido = cliente.admitido
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



#------------------ Medios de pago -------------------------#

def _build_medio_pago_item(medio: models.MedioPago, db) -> schemas.MedioPagoItem:
    monto = None
    monto_disp = None
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
        montoDisponibleCheque=monto_disp
    )

def get_medios_pago_cliente(db: Session, cliente_id: int) -> schemas.MedioPagoListResponse:
    medios = db.query(models.MedioPago).filter(
        models.MedioPago.cliente == cliente_id
    ).all()
    items = [_build_medio_pago_item(m, db) for m in medios]
    return schemas.MedioPagoListResponse(
        tieneMedioPagoVerificado=any(i.estado == "verificado" for i in items),
        medios=items
    )

def get_medio_pago_detalle(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == medio_pago_id
    ).first()
    if not medio:
        return None
    return _build_medio_pago_item(medio, db)

def update_medio_pago_descripcion(db: Session, medio_pago_id: int, descripcion: str):
    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == medio_pago_id
    ).first()
    if not medio:
        return None
    medio.descripcion = descripcion
    db.commit()
    db.refresh(medio)
    return _build_medio_pago_item(medio, db)

def delete_medio_pago(db: Session, medio_pago_id: int):
    db_medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == medio_pago_id
    ).first()
    if db_medio:
        db.delete(db_medio)
        db.commit()
    return db_medio

def create_cuenta_bancaria(db: Session, request: schemas.CuentaBancariaCreate):
    try:
        nuevo_medio = models.MedioPago(
            cliente=request.cliente,
            tipo="cuenta_bancaria",
            estado="pendiente",
            moneda=request.moneda,
            es_internacional="no",
            descripcion=request.descripcion
        )
        db.add(nuevo_medio)
        db.flush()

        nueva_cuenta = models.mpCuentaBancaria(
            medio_pago=nuevo_medio.identificador,
            titular=request.titular,
            banco=request.banco,
            cbu=request.cbu,
            alias=request.alias,
            pais_banco=request.paisBanco
        )
        db.add(nueva_cuenta)
        db.commit()
        db.refresh(nuevo_medio)
        db.refresh(nueva_cuenta)

        return schemas.CuentaBancariaResponse(
            id=nuevo_medio.identificador,
            tipo=nuevo_medio.tipo,
            estado=nuevo_medio.estado,
            descripcion=nuevo_medio.descripcion,
            moneda=nuevo_medio.moneda,
            esInternacional=False,
            titular=nueva_cuenta.titular,
            banco=nueva_cuenta.banco,
            cbu=nueva_cuenta.cbu,
            alias=nueva_cuenta.alias,
            paisBanco=nueva_cuenta.pais_banco
        )
    except Exception as e:
        db.rollback()
        raise e

def get_cuenta_bancaria(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == medio_pago_id
    ).first()
    cuenta = db.query(models.mpCuentaBancaria).filter(
        models.mpCuentaBancaria.medio_pago == medio_pago_id
    ).first()
    if not medio or not cuenta:
        return None
    return schemas.CuentaBancariaResponse(
        id=medio.identificador,
        tipo=medio.tipo,
        estado=medio.estado,
        descripcion=medio.descripcion,
        moneda=medio.moneda,
        esInternacional=medio.es_internacional == "si",
        titular=cuenta.titular,
        banco=cuenta.banco,
        cbu=cuenta.cbu,
        alias=cuenta.alias,
        paisBanco=cuenta.pais_banco
    )

def create_tarjeta(db: Session, request: schemas.TarjetaCreate):
    marcas_validas = {"VISA", "MASTERCARD", "AMEX"}
    marca_normalizada = request.marca.upper()
    if marca_normalizada not in marcas_validas:
        raise HTTPException(
            status_code=422,
            detail=f"Marca inválida '{request.marca}'. Las marcas permitidas son: VISA, MASTERCARD, AMEX"
        )

    try:
        nuevo_medio = models.MedioPago(
            cliente=request.cliente,
            tipo="tarjeta",
            estado="pendiente",
            moneda=request.moneda,
            es_internacional="si" if request.esInternacional else "no",
            descripcion=request.descripcion
        )
        db.add(nuevo_medio)
        db.flush()

        nueva_tarjeta = models.mpTarjeta(
            medio_pago=nuevo_medio.identificador,
            titular=request.titular,
            ultimos_4_digitos=request.ultimos4Digitos,
            vencimiento=request.vencimiento,
            marca=marca_normalizada,
            tipo_tarjeta=request.tipoTarjeta
        )
        db.add(nueva_tarjeta)
        db.commit()
        db.refresh(nuevo_medio)
        db.refresh(nueva_tarjeta)

        return schemas.TarjetaResponse(
            id=nuevo_medio.identificador,
            tipo=nuevo_medio.tipo,
            estado=nuevo_medio.estado,
            descripcion=nuevo_medio.descripcion,
            moneda=nuevo_medio.moneda,
            esInternacional=request.esInternacional,
            titular=nueva_tarjeta.titular,
            ultimos4Digitos=nueva_tarjeta.ultimos_4_digitos,
            vencimiento=nueva_tarjeta.vencimiento,
            marca=nueva_tarjeta.marca,
            tipoTarjeta=nueva_tarjeta.tipo_tarjeta
        )
    except Exception as e:
        db.rollback()
        raise e

def get_tarjeta(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == medio_pago_id
    ).first()
    tarjeta = db.query(models.mpTarjeta).filter(
        models.mpTarjeta.medio_pago == medio_pago_id
    ).first()
    if not medio or not tarjeta:
        return None
    return schemas.TarjetaResponse(
        id=medio.identificador,
        tipo=medio.tipo,
        estado=medio.estado,
        descripcion=medio.descripcion,
        moneda=medio.moneda,
        esInternacional=medio.es_internacional == "si",
        titular=tarjeta.titular,
        ultimos4Digitos=tarjeta.ultimos_4_digitos,
        vencimiento=tarjeta.vencimiento,
        marca=tarjeta.marca,
        tipoTarjeta=tarjeta.tipo_tarjeta
    )

def create_cheque_certificado(db: Session, request: schemas.ChequeCertificadoCreate):
    try:
        nuevo_medio = models.MedioPago(
            cliente=request.cliente,
            tipo="cheque_certificado",
            estado="pendiente",
            moneda=request.moneda,
            es_internacional="no",
            descripcion=request.descripcion
        )
        db.add(nuevo_medio)
        db.flush()

        nuevo_cheque = models.mpChequeCertificado(
            medio_pago=nuevo_medio.identificador,
            banco=request.banco,
            numero_cheque=request.numeroCheque,
            monto=request.monto,
            monto_disponible=request.monto,
            observaciones=request.observaciones
        )
        db.add(nuevo_cheque)
        db.commit()
        db.refresh(nuevo_medio)
        db.refresh(nuevo_cheque)

        return schemas.ChequeCertificadoResponse(
            id=nuevo_medio.identificador,
            tipo=nuevo_medio.tipo,
            estado=nuevo_medio.estado,
            descripcion=nuevo_medio.descripcion,
            moneda=nuevo_medio.moneda,
            esInternacional=False,
            montoCheque=nuevo_cheque.monto,
            montoDisponibleCheque=nuevo_cheque.monto_disponible,
            banco=nuevo_cheque.banco,
            numeroCheque=nuevo_cheque.numero_cheque,
            observaciones=nuevo_cheque.observaciones
        )
    except Exception as e:
        db.rollback()
        raise e

def get_cheque_certificado(db: Session, medio_pago_id: int):
    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == medio_pago_id
    ).first()
    cheque = db.query(models.mpChequeCertificado).filter(
        models.mpChequeCertificado.medio_pago == medio_pago_id
    ).first()
    if not medio or not cheque:
        return None
    return schemas.ChequeCertificadoResponse(
        id=medio.identificador,
        tipo=medio.tipo,
        estado=medio.estado,
        descripcion=medio.descripcion,
        moneda=medio.moneda,
        esInternacional=medio.es_internacional == "si",
        montoCheque=cheque.monto,
        montoDisponibleCheque=cheque.monto_disponible,
        banco=cheque.banco,
        numeroCheque=cheque.numero_cheque,
        observaciones=cheque.observaciones
    )

#------------------ Home y Catalogo ------------------------#

def delete_asistente(db: Session, asistente_id: int):
    obj = db.query(models.Asistente).filter(models.Asistente.identificador == asistente_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def delete_item_catalogo(db: Session, item_id: int):
    obj = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == item_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def delete_catalogo(db: Session, catalogo_id: int):
    obj = db.query(models.Catalogo).filter(models.Catalogo.identificador == catalogo_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def delete_subasta(db: Session, subasta_id: int):
    obj = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def create_producto(db: Session, request: schemas.ProductoCreate):
    nuevo = models.Producto(
        descripcionCatalogo=request.descripcionCatalogo,
        descripcionCompleta=request.descripcionCompleta,
        revisor=request.revisor,
        duenio=request.duenio,
        fecha=request.fecha,
        disponible="si",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def create_foto(db: Session, request: schemas.FotoCreate):
    nueva = models.Foto(producto=request.producto, foto=None)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

def delete_producto_presentacion(db: Session, pp_id: int):
    obj = db.query(models.ProductoPresentacion).filter(models.ProductoPresentacion.identificador == pp_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def delete_foto(db: Session, foto_id: int):
    obj = db.query(models.Foto).filter(models.Foto.identificador == foto_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def delete_producto(db: Session, producto_id: int):
    obj = db.query(models.Producto).filter(models.Producto.identificador == producto_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def create_producto_presentacion(db: Session, request: schemas.ProductoPresentacionCreate):
    nuevo = models.ProductoPresentacion(
        producto=request.producto,
        titulo=request.titulo,
        categoria=request.categoria,
        procedencia=request.procedencia,
        declaracionLegal=request.declaracionLegal,
        estado=request.estado,
        imagenPrincipal=request.imagenPrincipal,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def create_catalogo(db: Session, request: schemas.CatalogoCreate):
    nuevo = models.Catalogo(
        descripcion=request.descripcion,
        subasta=request.subasta,
        responsable=request.responsable,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def create_item_catalogo(db: Session, request: schemas.ItemCatalogoCreate):
    nuevo = models.ItemCatalogo(
        catalogo=request.catalogo,
        producto=request.producto,
        precioBase=request.precioBase,
        comision=request.comision,
        subastado="no",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def _get_foto_b64(db: Session, producto_id: int) -> str | None:
    foto = db.query(models.Foto).filter(models.Foto.producto == producto_id).first()
    if foto and foto.foto:
        return base64.b64encode(foto.foto).decode("utf-8")
    return None

def get_home(db: Session, categoria: str) -> schemas.HomeResponse:
    subastas = db.query(models.Subasta).filter(
        models.Subasta.estado == "abierta",
        models.Subasta.categoria == categoria.lower()
    ).order_by(models.Subasta.fecha).all()

    if not subastas:
        return schemas.HomeResponse(subastaDestacada=None, subastasGenerales=[])

    def _titulo_subasta(subasta_id: int) -> str:
        cat = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
        return cat.descripcion if cat else f"Subasta #{subasta_id}"

    def _primer_producto_id(subasta_id: int) -> int | None:
        cat = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
        if not cat:
            return None
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.catalogo == cat.identificador).first()
        return item.producto if item else None

    # Subasta destacada: la primera de la lista
    dest = subastas[0]
    postores = db.query(models.Asistente).filter(models.Asistente.subasta == dest.identificador).count()

    historial = (
        db.query(models.HistorialPujos)
        .filter(models.HistorialPujos.subasta == dest.identificador)
        .order_by(models.HistorialPujos.fechaHora.desc())
        .limit(5)
        .all()
    )
    actividad = []
    for h in historial:
        persona = db.query(models.Persona).filter(models.Persona.identificador == h.cliente).first()
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == h.itemCatalogo).first()
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == item.producto
        ).first() if item else None
        actividad.append(schemas.ActividadReciente(
            pujaId=h.identificador,
            nombreComprador=persona.nombre if persona else "Desconocido",
            nombreProducto=pp.titulo if pp else "Desconocido",
            fecha=h.fechaHora,
            valor=f"${h.importe:,.2f}"
        ))

    primer_prod = _primer_producto_id(dest.identificador)
    imagen_url = f"/productos/{primer_prod}/imagen-principal" if primer_prod else f"/subastas/{dest.identificador}/imagen-principal"

    destacada = schemas.SubastaDestacada(
        subastaId=dest.identificador,
        titulo=_titulo_subasta(dest.identificador),
        fecha=datetime.combine(dest.fecha, dest.hora),
        imagenUrl=imagen_url,
        postoresRegistrados=postores,
        actividadReciente=actividad
    )

    generales = []
    for s in subastas[1:]:
        prod_id = _primer_producto_id(s.identificador)
        generales.append(schemas.SubastaGeneral(
            subastaId=s.identificador,
            titulo=_titulo_subasta(s.identificador),
            fecha=datetime.combine(s.fecha, s.hora),
            imagen=_get_foto_b64(db, prod_id) if prod_id else None
        ))

    return schemas.HomeResponse(subastaDestacada=destacada, subastasGenerales=generales)

def get_catalogo_subasta(db: Session, subasta_id: int):
    subasta = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if not subasta:
        return None

    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if not catalogo:
        return []

    items = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.catalogo == catalogo.identificador).all()

    result = []
    for item in items:
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == item.producto
        ).first()
        producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
        result.append(schemas.ProductoCatalogo(
            productoId=item.producto,
            titulo=pp.titulo if pp else "Sin título",
            descripcionCorta=producto.descripcionCatalogo if producto else "",
            precioBase=item.precioBase,
            subastado=item.subastado,
            imagen=_get_foto_b64(db, item.producto)
        ))
    return result

def get_detalle_producto_catalogo(db: Session, subasta_id: int, producto_id: int):
    subasta = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if not subasta:
        return None

    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if not catalogo:
        return None

    item = db.query(models.ItemCatalogo).filter(
        models.ItemCatalogo.catalogo == catalogo.identificador,
        models.ItemCatalogo.producto == producto_id
    ).first()
    if not item:
        return None

    producto = db.query(models.Producto).filter(models.Producto.identificador == producto_id).first()
    pp = db.query(models.ProductoPresentacion).filter(
        models.ProductoPresentacion.producto == producto_id
    ).first()

    return schemas.DetalleProducto(
        productoId=producto_id,
        titulo=pp.titulo if pp else "Sin título",
        descripcion=producto.descripcionCompleta if producto else "",
        precioBase=item.precioBase,
        subastado=item.subastado,
        imagen=_get_foto_b64(db, producto_id)
    )

#------------------ Sala de Subastas -----------------------#

def get_subastas(db: Session):
    return db.query(models.Subasta).all()

def create_subasta(db: Session, request: schemas.SubastaCreate):
    nuevo = models.Subasta(
        fecha=request.fecha,
        hora=request.hora,
        estado="abierta",
        subastador=request.subastador,
        ubicacion=request.ubicacion,
        capacidadAsistentes=request.capacidadAsistentes,
        tieneDeposito=request.tieneDeposito,
        seguridadPropia=request.seguridadPropia,
        categoria=request.categoria,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def create_asistente(db: Session, request: schemas.AsistenteCreate):
    nuevo = models.Asistente(
        numeroPostor=request.numeroPostor,
        cliente=request.cliente,
        subasta=request.subasta,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def get_subasta_en_vivo(db: Session, subasta_id: int):
    subasta = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if not subasta:
        return None

    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if not catalogo:
        return None

    # Primer item aún no subastado = el que se está subastando ahora
    item_actual = db.query(models.ItemCatalogo).filter(
        models.ItemCatalogo.catalogo == catalogo.identificador,
        models.ItemCatalogo.subastado == "no"
    ).order_by(models.ItemCatalogo.identificador).first()
    if not item_actual:
        return None

    pp = db.query(models.ProductoPresentacion).filter(
        models.ProductoPresentacion.producto == item_actual.producto
    ).first()

    # Precio actual = máxima puja registrada, o precio base si no hay pujas
    max_puja = db.query(func.max(models.Pujo.importe)).filter(
        models.Pujo.item == item_actual.identificador
    ).scalar()
    precio_actual = float(max_puja) if max_puja else float(item_actual.precioBase)

    pujas_totales = db.query(models.Pujo).filter(
        models.Pujo.item == item_actual.identificador
    ).count()

    # Tiempo restante hasta la fecha/hora de la subasta
    subasta_dt = datetime.combine(subasta.fecha, subasta.hora)
    delta = subasta_dt - datetime.now()
    if delta.total_seconds() > 0:
        h, rem = divmod(int(delta.total_seconds()), 3600)
        m, s = divmod(rem, 60)
        tiempo_restante = f"{h:02d}:{m:02d}:{s:02d}"
    else:
        tiempo_restante = "00:00:00"

    incrementos = [
        round(precio_actual * 0.01, 2),
        round(precio_actual * 0.05, 2),
        round(precio_actual * 0.10, 2),
    ]

    historial = (
        db.query(models.HistorialPujos)
        .filter(
            models.HistorialPujos.subasta == subasta_id,
            models.HistorialPujos.itemCatalogo == item_actual.identificador,
        )
        .order_by(models.HistorialPujos.fechaHora.desc())
        .limit(5)
        .all()
    )
    actividad = []
    for h in historial:
        persona = db.query(models.Persona).filter(models.Persona.identificador == h.cliente).first()
        actividad.append(schemas.ActividadReciente(
            pujaId=h.identificador,
            nombreComprador=persona.nombre if persona else "Desconocido",
            nombreProducto=pp.titulo if pp else "Desconocido",
            fecha=h.fechaHora,
            valor=f"${h.importe:,.2f}",
        ))

    return schemas.VivoSubasta(
        subastaId=subasta_id,
        productoId=item_actual.producto,
        titulo=pp.titulo if pp else "Sin título",
        precioActual=precio_actual,
        proximaPuja=round(precio_actual + incrementos[0], 2),
        tiempoRestante=tiempo_restante,
        imagen=_get_foto_b64(db, item_actual.producto),
        pujasTotales=pujas_totales,
        incrementosSugeridos=incrementos,
        actividadReciente=actividad,
    )

def create_pujo(db: Session, request: schemas.PujoRequest):
    asistente = db.query(models.Asistente).filter(
        models.Asistente.identificador == request.asistenteId
    ).first()
    if not asistente:
        return None, "asistente"

    item = db.query(models.ItemCatalogo).filter(
        models.ItemCatalogo.identificador == request.itemId
    ).first()
    if not item:
        return None, "item"

    try:
        # La puja anterior deja de ser ganadora
        db.query(models.Pujo).filter(
            models.Pujo.item == request.itemId,
            models.Pujo.ganador == "si"
        ).update({"ganador": "no"})

        nuevo_pujo = models.Pujo(
            assitente=request.asistenteId,
            item=request.itemId,
            importe=request.importe,
            ganador="si",
        )
        db.add(nuevo_pujo)
        db.flush()

        nuevo_historial = models.HistorialPujos(
            pujo=nuevo_pujo.identificador,
            asistente=request.asistenteId,
            itemCatalogo=request.itemId,
            cliente=asistente.cliente,
            subasta=asistente.subasta,
            importe=request.importe,
            fechaHora=datetime.now(),
        )
        db.add(nuevo_historial)
        db.commit()
        db.refresh(nuevo_pujo)
        db.refresh(nuevo_historial)

        return schemas.PujoResponse(
            pujoId=nuevo_pujo.identificador,
            asistenteId=nuevo_pujo.assitente,
            itemId=nuevo_pujo.item,
            importe=float(nuevo_pujo.importe),
            ganador=nuevo_pujo.ganador,
            historialId=nuevo_historial.identificador,
            fechaHora=nuevo_historial.fechaHora,
        ), None

    except Exception as e:
        db.rollback()
        raise e

#------------------ Compras --------------------------------#

def _get_asistente(db: Session, subasta_id: int, usuario_id: int):
    return db.query(models.Asistente).filter(
        models.Asistente.subasta == subasta_id,
        models.Asistente.cliente == usuario_id
    ).first()

def get_compras(db: Session, subasta_id: int, usuario_id: int):
    asistente = _get_asistente(db, subasta_id, usuario_id)
    if not asistente:
        return None

    pujos = db.query(models.Pujo).filter(
        models.Pujo.assitente == asistente.identificador,
        models.Pujo.ganador == "si"
    ).all()

    result = []
    for pujo in pujos:
        item = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.identificador == pujo.item
        ).first()
        if not item:
            continue
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == item.producto
        ).first()
        result.append(schemas.ProductoComprado(
            productoId=item.producto,
            titulo=pp.titulo if pp else "Sin título",
            precioFinal=float(pujo.importe),
            subastado=item.subastado,
            imagen=_get_foto_b64(db, item.producto)
        ))
    return result

def get_precio_total(db: Session, subasta_id: int, usuario_id: int):
    asistente = _get_asistente(db, subasta_id, usuario_id)
    if not asistente:
        return None

    pujos = db.query(models.Pujo).filter(
        models.Pujo.assitente == asistente.identificador,
        models.Pujo.ganador == "si"
    ).all()

    total_precio = 0.0
    total_comision = 0.0
    total_seguro = 0.0

    for pujo in pujos:
        item = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.identificador == pujo.item
        ).first()
        if not item:
            continue
        total_precio += float(pujo.importe)
        total_comision += float(item.comision)

        producto = db.query(models.Producto).filter(
            models.Producto.identificador == item.producto
        ).first()
        if producto and producto.seguro:
            seguro = db.query(models.Seguro).filter(
                models.Seguro.nroPoliza == producto.seguro
            ).first()
            if seguro:
                total_seguro += float(seguro.importe)

    return schemas.PrecioFinal(
        precioFinal=total_precio,
        comision=total_comision,
        seguro=total_seguro,
        total=round(total_precio + total_comision + total_seguro, 2)
    )

def confirmar_envio(db: Session, subasta_id: int, usuario_id: int, metodo_envio: str):
    asistente = _get_asistente(db, subasta_id, usuario_id)
    if not asistente:
        return None
    return f"Envío confirmado: {metodo_envio}"

def confirmar_pago(db: Session, subasta_id: int, usuario_id: int, metodo_pago_id: int):
    asistente = _get_asistente(db, subasta_id, usuario_id)
    if not asistente:
        return None, "asistente"

    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == metodo_pago_id,
        models.MedioPago.cliente == usuario_id
    ).first()
    if not medio:
        return None, "medio_pago"

    return "Pago confirmado correctamente", None

#------------------ Personas -------------------------------#

def create_sector(db: Session, request: schemas.SectorCreate):
    nuevo = models.Sector(
        nombreSector=request.nombreSector,
        codigoSector=request.codigoSector
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return schemas.SectorResponse(
        identificador=nuevo.indentificador,
        nombreSector=nuevo.nombreSector,
        codigoSector=nuevo.codigoSector
    )

def get_sectores(db: Session):
    sectores = db.query(models.Sector).all()
    return [schemas.SectorResponse(
        identificador=s.indentificador,
        nombreSector=s.nombreSector,
        codigoSector=s.codigoSector
    ) for s in sectores]

def get_sector(db: Session, sector_id: int):
    s = db.query(models.Sector).filter(models.Sector.indentificador == sector_id).first()
    if not s:
        return None
    return schemas.SectorResponse(
        identificador=s.indentificador,
        nombreSector=s.nombreSector,
        codigoSector=s.codigoSector
    )

def delete_sector(db: Session, sector_id: int):
    s = db.query(models.Sector).filter(models.Sector.indentificador == sector_id).first()
    if s:
        db.delete(s)
        db.commit()
    return s

def delete_duenio(db: Session, duenio_id: int):
    obj = db.query(models.Duenio).filter(models.Duenio.identificador == duenio_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def delete_subastador(db: Session, subastador_id: int):
    obj = db.query(models.Subastador).filter(models.Subastador.identificador == subastador_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj

def create_duenio(db: Session, request: schemas.DuenioCreate):
    nuevo = models.Duenio(
        identificador=request.identificador,
        numeroPais=request.numeroPais,
        verificador=request.verificador,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def create_subastador(db: Session, request: schemas.SubastadorCreate):
    nuevo = models.Subastador(
        identificador=request.identificador,
        matricula=request.matricula,
        region=request.region,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def create_empleado(db: Session, request: schemas.EmpleadoCreate):
    nuevo = models.Empleado(cargo=request.cargo, sector=request.sector)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def get_empleados(db: Session):
    return db.query(models.Empleado).all()

def get_empleado(db: Session, empleado_id: int):
    return db.query(models.Empleado).filter(models.Empleado.identificador == empleado_id).first()

def delete_empleado(db: Session, empleado_id: int):
    e = db.query(models.Empleado).filter(models.Empleado.identificador == empleado_id).first()
    if e:
        db.delete(e)
        db.commit()
    return e

def create_cliente(db: Session, request: schemas.ClienteCreate):
    nuevo = models.Cliente(
        identificador=request.identificador,
        numeroPais=request.numeroPais,
        admitido="no",
        categoria="comun",
        verificador=request.verificador
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def get_clientes(db: Session):
    return db.query(models.Cliente).all()

def get_cliente(db: Session, cliente_id: int):
    return db.query(models.Cliente).filter(models.Cliente.identificador == cliente_id).first()

def delete_cliente(db: Session, cliente_id: int):
    c = db.query(models.Cliente).filter(models.Cliente.identificador == cliente_id).first()
    if c:
        db.delete(c)
        db.commit()
    return c



#------------------ Ventas ---------------------------------#

#------------------ Informacion Necesaria ------------------#

# Obtener todos los países
def get_paises(db: Session):
    return db.query(models.Pais).all()

# Obtener un país por su número (ID)
def get_pais(db: Session, numero: int):
    return db.query(models.Pais).filter(models.Pais.numero == numero).first()

# Crear un nuevo país
def create_pais(db: Session, pais: schemas.PaisCreate):
    db_pais = models.Pais(**pais.model_dump())
    db.add(db_pais)
    db.commit()
    db.refresh(db_pais)
    return db_pais

# Eliminar un país
def delete_pais(db: Session, numero: int):
    db_pais = db.query(models.Pais).filter(models.Pais.numero == numero).first()
    
    db.delete(db_pais)
    db.commit()

    return db_pais