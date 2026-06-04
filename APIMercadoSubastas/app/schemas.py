from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime, time
from decimal import Decimal

#------------------ Auth y Registro ------------------------#

class RegistroIniciarResponse(BaseModel):
    mensaje: str
    personaId: int

class RegistroIniciarRequest(BaseModel):
    nombre: str
    apellido: str
    documento: str
    mail: EmailStr
    direccion: str
    pais: int

class MensajeResponse(BaseModel):
    mensaje: str

class RegistroVerificacionRequest(BaseModel):
    personaId: int
    verificador: int
    categoria: Optional[str] = "comun"

class RegistroPendienteResponse(BaseModel):
    personaId: int
    nombre: str
    documento: str
    mail: str
    pais: int

class RegistroEstadoResponse(BaseModel):
    verificado: bool
    admitido: bool
    mensaje: str

class VerificacionEstadoRequest(BaseModel):
    mail: str

class CambiarClaveRequest(BaseModel):
    mail: EmailStr
    contrasenia: str

class Usuario(BaseModel):
    identificador: int
    nombre: str
    mail: str
    categoria: str
    estado: str
    claveTemporal: bool
    admitido: str

class LoginRequest(BaseModel):
    mail: EmailStr
    contrasenia: str

#------------------ Medios de pago -------------------------#

class MedioPagoItem(BaseModel):
    id: int
    tipo: str
    estado: str
    descripcion: Optional[str] = None
    moneda: str
    esInternacional: bool
    montoCheque: Optional[Decimal] = None
    montoDisponibleCheque: Optional[Decimal] = None

class MedioPagoListResponse(BaseModel):
    tieneMedioPagoVerificado: bool
    medios: list[MedioPagoItem]

class DescripcionUpdate(BaseModel):
    descripcion: str

class CuentaBancariaCreate(BaseModel):
    cliente: int
    moneda: str = "ARS"
    esInternacional: bool = False
    descripcion: Optional[str] = None
    titular: str
    banco: str
    cbu: str
    alias: Optional[str] = None
    paisBanco: int

class CuentaBancariaResponse(MedioPagoItem):
    titular: str
    banco: str
    cbu: str
    alias: Optional[str] = None
    paisBanco: int

class TarjetaCreate(BaseModel):
    cliente: int
    moneda: str = "ARS"
    descripcion: Optional[str] = None
    titular: str
    ultimos4Digitos: str
    vencimiento: date
    marca: str
    tipoTarjeta: str
    esInternacional: bool = False

class TarjetaResponse(MedioPagoItem):
    titular: str
    ultimos4Digitos: str
    vencimiento: date
    marca: str
    tipoTarjeta: str

class ChequeCertificadoCreate(BaseModel):
    cliente: int
    moneda: str = "ARS"
    descripcion: Optional[str] = None
    banco: str
    numeroCheque: str
    monto: Decimal
    observaciones: Optional[str] = None

class ChequeCertificadoResponse(MedioPagoItem):
    banco: str
    numeroCheque: str
    observaciones: Optional[str] = None

#------------------ Home y Catalogo ------------------------#

class ActividadReciente(BaseModel):
    pujaId: int
    nombreComprador: str
    nombreProducto: str
    fecha: datetime
    valor: str

class SubastaDestacada(BaseModel):
    subastaId: int
    titulo: str
    fecha: datetime
    imagenUrl: str
    postoresRegistrados: int
    categoria: str
    enVivo: bool
    actividadReciente: list[ActividadReciente]

class SubastaGeneral(BaseModel):
    subastaId: int
    titulo: str
    fecha: datetime
    categoria: str
    enVivo: bool
    imagen: Optional[str] = None

class HomeResponse(BaseModel):
    subastaDestacada: Optional[SubastaDestacada] = None
    subastasGenerales: list[SubastaGeneral]

class ProductoCatalogo(BaseModel):
    productoId: int
    titulo: str
    descripcionCorta: str
    precioBase: Decimal
    subastado: str
    imagen: Optional[str] = None

class DetalleProducto(BaseModel):
    productoId: int
    titulo: str
    descripcion: str
    precioBase: Decimal
    subastado: str
    imagen: Optional[str] = None

#------------------ Sala de Subastas -----------------------#

class VivoSubasta(BaseModel):
    subastaId: int
    categoriaSubasta: str
    productoId: int
    itemCatalogoId: int
    precioBase: float
    titulo: str
    precioActual: float
    proximaPuja: float
    pujaMaxima: float
    tiempoRestante: str
    imagen: Optional[str] = None
    pujasTotales: int
    incrementosSugeridos: list[float]
    actividadReciente: list[ActividadReciente]

class PujoRequest(BaseModel):
    asistenteId: int
    itemId: int
    importe: float

class PujoResponse(BaseModel):
    pujoId: int
    asistenteId: int
    itemId: int
    importe: float
    ganador: str
    historialId: int
    fechaHora: datetime

#------------------ Compras --------------------------------#

class ProductoComprado(BaseModel):
    productoId: int
    titulo: str
    precioFinal: float
    subastado: str
    imagen: Optional[str] = None

class PrecioFinal(BaseModel):
    precioFinal: float
    comision: float
    seguro: float
    total: float

#------------------ Personas -------------------------------#

class SectorCreate(BaseModel):
    nombreSector: str
    codigoSector: Optional[str] = None

class SectorResponse(BaseModel):
    identificador: int
    nombreSector: str
    codigoSector: Optional[str] = None

    class Config:
        from_attributes = True

class EmpleadoCreate(BaseModel):
    cargo: Optional[str] = None
    sector: Optional[int] = None

class EmpleadoResponse(BaseModel):
    identificador: int
    cargo: Optional[str] = None
    sector: Optional[int] = None

    class Config:
        from_attributes = True

class ClienteCreate(BaseModel):
    identificador: int
    numeroPais: Optional[int] = None
    verificador: int

class ClienteResponse(BaseModel):
    identificador: int
    numeroPais: Optional[int] = None
    admitido: str
    categoria: str
    verificador: int

    class Config:
        from_attributes = True

#------------------ Personas (extra) -----------------------#

class DuenioCreate(BaseModel):
    identificador: int
    numeroPais: Optional[int] = None
    verificador: int

class DuenioResponse(BaseModel):
    identificador: int
    numeroPais: Optional[int] = None
    verificacionFinanciera: str
    verificacionJudicial: str
    calificacionRiesgo: int
    verificador: int
    class Config:
        from_attributes = True

class DuenioVerificacionUpdate(BaseModel):
    verificacionFinanciera: Optional[str] = None
    verificacionJudicial: Optional[str] = None
    calificacionRiesgo: Optional[int] = None

class SubastadorCreate(BaseModel):
    identificador: int
    matricula: Optional[str] = None
    region: Optional[str] = None

class SubastadorResponse(BaseModel):
    identificador: int
    matricula: Optional[str] = None
    region: Optional[str] = None
    class Config:
        from_attributes = True

#------------------ Productos ------------------------------#

class ProductoCreate(BaseModel):
    descripcionCatalogo: str = "No posee"
    descripcionCompleta: str
    revisor: int
    duenio: int
    fecha: Optional[date] = None

class ProductoResponse(BaseModel):
    identificador: int
    descripcionCatalogo: str
    descripcionCompleta: str
    revisor: int
    duenio: int
    disponible: str
    fecha: Optional[date] = None
    class Config:
        from_attributes = True

class FotoCreate(BaseModel):
    producto: int
    imagen: Optional[str] = None  # base64

class FotoResponse(BaseModel):
    identificador: int
    producto: int
    class Config:
        from_attributes = True

class ProductoPresentacionCreate(BaseModel):
    producto: int
    titulo: str
    categoria: str
    procedencia: Optional[str] = None
    declaracionLegal: str = "no"
    estado: str = "borrador"
    imagenPrincipal: Optional[int] = None

class ProductoPresentacionResponse(BaseModel):
    identificador: int
    producto: int
    titulo: str
    categoria: str
    procedencia: Optional[str] = None
    declaracionLegal: str
    estado: str
    imagenPrincipal: Optional[int] = None
    class Config:
        from_attributes = True

#------------------ Subastas -------------------------------#

class SubastaCreate(BaseModel):
    fecha: date
    hora: time
    subastador: int
    ubicacion: Optional[str] = None
    capacidadAsistentes: Optional[int] = None
    tieneDeposito: Optional[str] = None
    seguridadPropia: Optional[str] = None
    categoria: str = "comun"
    moneda: str = "ARS"

class SubastaResponse(BaseModel):
    identificador: int
    fecha: date
    hora: time
    estado: str
    subastador: int
    ubicacion: Optional[str] = None
    capacidadAsistentes: Optional[int] = None
    tieneDeposito: Optional[str] = None
    seguridadPropia: Optional[str] = None
    categoria: str
    moneda: str = "ARS"
    class Config:
        from_attributes = True

class CatalogoCreate(BaseModel):
    descripcion: str
    subasta: Optional[int] = None
    responsable: int

class CatalogoResponse(BaseModel):
    identificador: int
    descripcion: str
    subasta: Optional[int] = None
    responsable: int
    class Config:
        from_attributes = True

class ItemCatalogoCreate(BaseModel):
    catalogo: int
    producto: int
    precioBase: Decimal
    comision: Decimal

class ItemCatalogoResponse(BaseModel):
    identificador: int
    catalogo: int
    producto: int
    precioBase: Decimal
    comision: Decimal
    subastado: str
    class Config:
        from_attributes = True

class AsistenteCreate(BaseModel):
    numeroPostor: int
    cliente: int
    subasta: int

class AsistenteResponse(BaseModel):
    identificador: int
    numeroPostor: int
    cliente: int
    subasta: int
    class Config:
        from_attributes = True

class AsistenteRegistrarRequest(BaseModel):
    cliente: int
    subasta: int

class AsistenteRegistrarResponse(BaseModel):
    identificador: int
    numeroPostor: int
    cliente: int
    subasta: int
    creado: bool

#------------------ Configuración empresa ------------------#

class ConfiguracionResponse(BaseModel):
    clave: str
    valor: str

#------------------ Condiciones de artículo ----------------#

class ArticuloCondicionesResponse(BaseModel):
    productoId: int
    titulo: str
    tieneCondiciones: bool
    precioBase: Optional[float] = None
    comision: Optional[float] = None
    subastaFecha: Optional[date] = None
    subastaHora: Optional[time] = None
    subastaUbicacion: Optional[str] = None
    aceptacion: Optional[str] = None  # 'pendiente' | 'aceptado' | 'rechazado'

#------------------ Vender ---------------------------------#

class ArticuloSubmitRequest(BaseModel):
    titulo: str
    categoria: str
    descripcionCompleta: str
    procedencia: Optional[str] = None
    declaracionLegal: bool = False
    clienteId: int

class ArticuloSubmitResponse(BaseModel):
    productoId: int
    presentacionId: int
    mensaje: str

class ArticuloListItem(BaseModel):
    productoId: int
    presentacionId: int
    titulo: str
    categoria: str
    fechaEnvio: Optional[date]
    estadoInspeccion: str
    observaciones: Optional[str]
    costoDevolucion: Optional[float]
    enSubasta: bool

#------------------ Estadísticas ---------------------------#

class HistorialItemEstadisticas(BaseModel):
    titulo: str
    fecha: datetime
    importe: float
    ganada: bool

class EstadisticasCliente(BaseModel):
    subastasTotales: int
    pujasGanadas: int
    totalInvertido: float
    historial: list[HistorialItemEstadisticas]

#------------------ Ventas ---------------------------------#

#------------------ Informacion Necesaria ------------------#

# Esquema base con los campos comunes
class PaisBase(BaseModel):
    nombre: str
    nombreCorto: Optional[str] = None
    capital: str
    nacionalidad: str
    idiomas: str

# Esquema para crear (lo que el usuario envía)
class PaisCreate(PaisBase):
    pass

# Esquema para leer (lo que la API devuelve, incluye el ID)
class Pais(PaisBase):
    numero: int

    class Config:
        from_attributes = True

#------------------ Multas --------------------------------#

class MultaResponse(BaseModel):
    identificador: int
    cliente: int
    subasta: int
    monto: Decimal
    pagado: str
    fecha_limite: datetime
    class Config:
        from_attributes = True