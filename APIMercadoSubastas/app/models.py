from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, 
    DateTime, Date, Time, CheckConstraint, LargeBinary, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base  # Importamos la Base que definiste en database.py

class Pais(Base):
    __tablename__ = "paises"

    numero = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    nombreCorto = Column(String, nullable=True)
    capital = Column(String, nullable=False)
    nacionalidad = Column(String, nullable=False)
    idiomas = Column(String, nullable=False)

class Persona(Base):
    __tablename__ = "personas"

    identificador = Column(Integer, primary_key=True, index=True)
    documento = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    direccion = Column(String, nullable=True)
    estado = Column(String, nullable=False, server_default="inactivo")
    foto = Column(LargeBinary, nullable=True)

    __table_args__ = (
        CheckConstraint("estado IN ('activo', 'inactivo')", name="chkEstado"),
    )

class PersonaDetalle(Base):
    __tablename__ = "personas_detalle"

    identificador = Column(Integer, primary_key=True, index=True)
    persona = Column(Integer, ForeignKey("personas.identificador"), nullable=False)
    pais = Column(Integer, ForeignKey("paises.numero"), nullable=False)
    mail = Column(String, nullable=False)
    contrasenia = Column(String, nullable=False)
    claveTemporal = Column(Boolean, nullable=False)
    
class Empleado(Base):
    __tablename__ = "empleados"

    identificador = Column(Integer, primary_key=True, index=True)
    cargo = Column(String, nullable=True)
    sector = Column(Integer, nullable=True)

class Sector(Base):
    __tablename__ = "sectores"

    indentificador = Column(Integer, primary_key=True, index=True)
    nombreSector = Column(String, nullable=False)
    codigoSector = Column(String, nullable=True)
    responsableSector = Column(Integer, ForeignKey("empleados.identificador"), nullable=True)

class Seguro(Base):
    __tablename__ = "seguros"

    nroPoliza = Column(String, primary_key=True, index=True)
    compania = Column(String, nullable=False)
    polizaCombinada = Column(String, nullable=True, server_default="no")
    importe = Column(Numeric(precision=18, scale=2), nullable=False)

    __table_args__ = (
        CheckConstraint("\"polizaCombinada\" IN ('si', 'no')", name="chkPoliza"),
        CheckConstraint("importe > 0", name="chkImporte"),
    )

class Cliente(Base):
    __tablename__ = "clientes"

    identificador = Column(Integer, ForeignKey("personas.identificador"), primary_key=True, index=True)
    numeroPais = Column(Integer, ForeignKey("paises.numero"), nullable=True)
    admitido = Column(String, nullable=False, server_default="no")
    categoria = Column(String, nullable=True, server_default="comun")
    verificador = Column(Integer, ForeignKey("empleados.identificador"), nullable=False)

    __table_args__ = (
        CheckConstraint("admitido IN ('si', 'no')", name="chkAdmision"),
        CheckConstraint("categoria IN ('comun', 'especial', 'plata', 'oro', 'platino')", name="chkCategoria"),
    )

class Duenio(Base):
    __tablename__ = "duenios"

    identificador = Column(Integer, ForeignKey("personas.identificador"), primary_key=True, index=True)
    numeroPais = Column(Integer, ForeignKey("paises.numero"), nullable=True)
    verificacionFinanciera = Column(String, nullable=True, server_default="no")
    verificacionJudicial = Column(String, nullable=True, server_default="no")
    calificacionRiesgo = Column(Integer, nullable=True, server_default="6") #Se asume que 'mayor numero = mayor riesgo'
    verificador = Column(Integer, ForeignKey("empleados.identificador"), nullable=False)

    __table_args__ = (
        CheckConstraint("\"verificacionFinanciera\" IN ('si', 'no')", name="chkVF"),
        CheckConstraint("\"verificacionJudicial\" IN ('si', 'no')", name="chkVJ"),
        CheckConstraint("\"calificacionRiesgo\" IN (1, 2, 3, 4, 5, 6)", name="chkCR"),
    )

class Subastador(Base):
    __tablename__ = "subastadores"

    identificador = Column(Integer, ForeignKey("personas.identificador"), primary_key=True, index=True)
    matricula = Column(String, nullable=True)
    region = Column(String, nullable=True)

class Subasta(Base):
    __tablename__ = "subastas"

    identificador = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    estado = Column(String, nullable=False, server_default="abierta")
    subastador = Column(Integer, ForeignKey("subastadores.identificador"), nullable=False)
    ubicacion = Column(String, nullable=True)
    capacidadAsistentes = Column(Integer, nullable=True)
    tieneDeposito = Column(String, nullable=True)
    seguridadPropia = Column(String, nullable=True)
    categoria = Column(String, nullable=True, server_default="comun")

    __table_args__ = (
        CheckConstraint("fecha > (CURRENT_DATE + INTERVAL '10 days')", name="chkFecha"),
        CheckConstraint("estado IN ('abierta', 'cerrada')", name="chkEstado"),
        CheckConstraint("\"tieneDeposito\" IN ('si', 'no')", name="chkTD"),
        CheckConstraint("\"seguridadPropia\" IN ('si', 'no')", name="chkSP"),
        CheckConstraint("categoria IN ('comun', 'especial', 'plata', 'oro', 'platino')", name="chkCategoria")
    )

class Producto(Base):
    __tablename__ = "productos"

    identificador = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=True)
    disponible = Column(String, nullable=False, server_default="si")
    descripcionCatalogo = Column(String, nullable=False, server_default="No posee")
    descripcionCompleta = Column(String, nullable=False)
    revisor = Column(Integer, ForeignKey("empleados.identificador"), nullable=False)
    duenio = Column(Integer, ForeignKey("duenios.identificador"), nullable=False)
    seguro = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint("disponible IN ('si', 'no')", name="chkDisponibilidad"),
    )

class Foto(Base):
    __tablename__ = "fotos"

    identificador = Column(Integer, primary_key=True, index=True)
    producto = Column(Integer, ForeignKey("productos.identificador"), nullable=False)
    foto = Column(LargeBinary, nullable=True)

class ProductoPresentacion(Base):
    __tablename__ = "productos_presentacion"

    identificador = Column(Integer, primary_key=True, index=True)
    producto = Column(Integer, ForeignKey("productos.identificador"), nullable=False)
    titulo = Column(String, nullable=False)
    categoria = Column(String, nullable=False)
    procedencia = Column(String, nullable=True)
    declaracionLegal = Column(String, nullable=False, server_default="no")
    estado = Column(String, nullable=False, server_default="borrador")
    imagenPrincipal = Column(Integer, ForeignKey("fotos.identificador"), nullable=True)

    __table_args__ = (
        CheckConstraint("\"declaracionLegal\" IN ('si', 'no')", name="chkDL"),
        CheckConstraint("estado IN ('borrador', 'completo', 'publicado')"),
    )

class Catalogo(Base):
    __tablename__ = "catalogos"

    identificador = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String, nullable=False)
    subasta = Column(Integer, ForeignKey("subastas.identificador"), nullable=True)
    responsable = Column(Integer, ForeignKey("empleados.identificador"), nullable=False)

class ItemCatalogo(Base):
    __tablename__ = "items_catalogo"

    identificador = Column(Integer, primary_key=True, index=True)
    catalogo = Column(Integer, ForeignKey("catalogos.identificador"), nullable=False)
    producto = Column(Integer, ForeignKey("productos.identificador"), nullable=False)
    precioBase = Column(Numeric(precision=18, scale=2), nullable=False)
    comision = Column(Numeric(precision=18, scale=2), nullable=False)
    subastado = Column(String, nullable=False, server_default="no")

    __table_args__ = (
        CheckConstraint("\"precioBase\" > 0", name="chkPrecioBase"),
        CheckConstraint("comision > 0", name="chkComision"),
        CheckConstraint("subastado IN ('si', 'no')", name="chkSubastado"),
    )

class Asistente(Base):
    __tablename__ = "asistentes"

    identificador = Column(Integer, primary_key=True, index=True)
    numeroPostor = Column(Integer, nullable=False)
    cliente = Column(Integer, ForeignKey("clientes.identificador"), nullable=False)
    subasta = Column(Integer, ForeignKey("subastas.identificador"), nullable=False)

class Pujo(Base):
    __tablename__ = "pujos"

    identificador = Column(Integer, primary_key=True, index=True)
    asistente = Column(Integer, ForeignKey("asistentes.identificador"), nullable=False)
    item = Column(Integer, ForeignKey("items_catalogo.identificador"), nullable=False)
    importe = Column(Numeric(precision=18, scale=2), nullable=False)
    ganador = Column(String, nullable=False, server_default="no")

    __table_args__ = (
        CheckConstraint("importe > 0.01", name="chkImporte"),
        CheckConstraint("ganador IN ('si', 'no')", name="chkGanador"),
    )

class HistorialPujos(Base):
    __tablename__ = "historial_pujos"

    identificador = Column(Integer, primary_key=True, index=True)
    pujo = Column(Integer, ForeignKey("pujos.identificador"), nullable=False)
    asistente = Column(Integer, ForeignKey("asistentes.identificador"), nullable=False)
    itemCatalogo = Column(Integer, ForeignKey("items_catalogo.identificador"), nullable=False)
    cliente = Column(Integer, ForeignKey("clientes.identificador"), nullable=False)
    subasta = Column(Integer, ForeignKey("subastas.identificador"), nullable=False)
    importe = Column(Numeric(precision=18, scale=2), nullable=False)
    fechaHora = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint("importe > 0.01", name="chkImporte"),
    )

class RegistroSubasta(Base):
    __tablename__ = "registro_subastas"

    identificador = Column(Integer, primary_key=True, index=True)
    subasta = Column(Integer, ForeignKey("subastas.identificador"), nullable=False)
    duenio = Column(Integer, ForeignKey("duenios.identificador"), nullable=False)
    producto = Column(Integer, ForeignKey("productos.identificador"), nullable=False)
    cliente = Column(Integer, ForeignKey("clientes.identificador"), nullable=False)
    importe = Column(Numeric(precision=18, scale=2), nullable=False)
    comision = Column(Numeric(precision=18, scale=2), nullable=False)

class MedioPago(Base):
    __tablename__ = "medios_pago"

    identificador = Column(Integer, primary_key=True, index=True)
    cliente = Column(Integer, ForeignKey("clientes.identificador"), nullable=False)
    tipo = Column(String, nullable=False)
    estado = Column(String, nullable=False, server_default="pendiente")
    moneda = Column(String, nullable=False, server_default="ARS")
    es_internacional = Column(String, nullable=False, server_default="no")
    descripcion = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint("tipo IN ('cuenta_bancaria', 'tarjeta', 'cheque_certificado')", name="chkTipoPago"),
        CheckConstraint("estado IN ('pendiente', 'verificado', 'rechazado')", name="chkEstadoPago"),
        CheckConstraint("moneda IN ('ARS', 'USD')", name="chkMoneda"),
        CheckConstraint("es_internacional IN ('si', 'no')", name="chkInternacional")
    )

class mpCuentaBancaria(Base):
    __tablename__ = "mp_cuentas_bancarias"

    medio_pago = Column(Integer, ForeignKey("medios_pago.identificador"), primary_key=True, index=True)
    titular = Column(String, nullable=False)
    banco = Column(String, nullable=False)
    cbu = Column(String, nullable=False)
    alias = Column(String, nullable=True)
    pais_banco = Column(Integer, ForeignKey("paises.numero"), nullable=False)

class mpTarjeta(Base):
    __tablename__ = "mp_tarjetas"

    medio_pago = Column(Integer, ForeignKey("medios_pago.identificador"), primary_key=True, index=True)
    titular = Column(String, nullable=False)
    ultimos_4_digitos = Column(String, nullable=False)
    vencimiento = Column(Date, nullable=False)
    marca = Column(String, nullable=False)
    tipo_tarjeta = Column(String, nullable=False)

    __table_args__ = (
        CheckConstraint("marca IN ('VISA', 'MASTERCARD', 'AMEX')", name="chkMarca"),
        CheckConstraint("tipo_tarjeta IN ('credito', 'debito')", name="chkTipoTarjeta"),
    )

class mpChequeCertificado(Base):
    __tablename__ = "mp_cheques_certificados"

    medio_pago = Column(Integer, ForeignKey("medios_pago.identificador"), primary_key=True, index=True)
    banco = Column(String, nullable=False)
    numero_cheque = Column(String, nullable=False)
    monto = Column(Numeric(precision=18, scale=2), nullable=False)
    monto_disponible = Column(Numeric(precision=18, scale=2), nullable=False)
    observaciones = Column(String, nullable=True)

class InspeccionProducto(Base):
    __tablename__ = "inspeccion_productos"

    identificador = Column(Integer, primary_key=True, index=True)
    producto = Column(Integer, ForeignKey("productos.identificador"), nullable=False, unique=True)
    estado = Column(String, nullable=False, server_default="pendiente")
    observaciones = Column(String, nullable=True)
    costo_devolucion = Column(Numeric(precision=18, scale=2), nullable=True)
    fecha_ultima_actualizacion = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("estado IN ('pendiente', 'aprobado', 'rechazado')", name="chkEstadoInspeccion"),
        CheckConstraint("costo_devolucion >= 0", name="chkCostoDevolucion"),
    )