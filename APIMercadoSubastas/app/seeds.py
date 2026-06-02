from datetime import date, time, timedelta, datetime
from . import crud, models
from .database import SessionLocal


def seed_paises():
    db = SessionLocal()
    try:
        paises_iniciales = [
            models.Pais(numero=1, nombre="Argentina", nombreCorto="ARG", capital="Buenos Aires",  nacionalidad="Argentina",  idiomas="Español"),
            models.Pais(numero=2, nombre="Uruguay",   nombreCorto="URY", capital="Montevideo",    nacionalidad="Uruguaya",   idiomas="Español"),
            models.Pais(numero=3, nombre="Paraguay",  nombreCorto="PRY", capital="Asunción",      nacionalidad="Paraguaya",  idiomas="Español, Guaraní"),
            models.Pais(numero=4, nombre="Chile",     nombreCorto="CHL", capital="Santiago",      nacionalidad="Chilena",    idiomas="Español"),
        ]
        for pais in paises_iniciales:
            if not db.get(models.Pais, pais.numero):
                db.add(pais)
        db.commit()
    finally:
        db.close()


def seed_empleados():
    db = SessionLocal()
    try:
        empleados_iniciales = [
            models.Empleado(identificador=1, cargo="Verificador", sector=None),
            models.Empleado(identificador=2, cargo="Verificador", sector=None),
            models.Empleado(identificador=3, cargo="Verificador", sector=None),
        ]
        for empleado in empleados_iniciales:
            if not db.get(models.Empleado, empleado.identificador):
                db.add(empleado)
        db.commit()
    finally:
        db.close()


def seed_subastas():
    db = SessionLocal()
    try:
        if db.query(models.Persona).filter(models.Persona.documento == "00000001").first():
            return

        # --- Subastador ---
        p_sub = models.Persona(nombre="Subastador Prueba", documento="00000001", direccion="Av. Corrientes 1234, CABA", estado="activo")
        db.add(p_sub)
        db.flush()

        subastador = models.Subastador(identificador=p_sub.identificador, matricula="MAT-001", region="Buenos Aires")
        db.add(subastador)
        db.flush()

        # --- Dueño ---
        p_due = models.Persona(nombre="Duenio Prueba", documento="00000002", direccion="Av. Santa Fe 2000, CABA", estado="activo")
        db.add(p_due)
        db.flush()

        duenio = models.Duenio(identificador=p_due.identificador, numeroPais=1, verificador=1)
        db.add(duenio)
        db.flush()

        # --- Productos ---
        articulos = [
            models.Producto(descripcionCatalogo="Reloj suizo siglo XIX",      descripcionCompleta="Reloj de bolsillo suizo, circa 1890, caja de plata maciza, movimiento de 17 rubíes, en perfecto estado de funcionamiento.", revisor=1, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Jarrón Ming original",        descripcionCompleta="Jarrón de porcelana china de la dinastía Ming, circa 1400, decoración floral en azul y blanco, altura 42 cm.", revisor=1, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Pintura flamenca siglo XVII", descripcionCompleta="Pintura al óleo sobre lienzo, escuela flamenca, siglo XVII, representación de bodegón con frutas y animales, 80x60 cm.", revisor=2, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Colección monedas romanas",   descripcionCompleta="Colección de 12 monedas romanas del período imperial, siglos I a III d.C., incluye denarios y sestercios en buen estado de conservación.", revisor=2, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Silla estilo Luis XV",        descripcionCompleta="Silla tapizada en seda bordada, estilo Luis XV, Francia circa 1750, estructura en madera de nogal tallada, excelente estado.", revisor=3, duenio=duenio.identificador, disponible="si"),
        ]
        for a in articulos:
            db.add(a)
        db.flush()

        # --- Presentaciones ---
        presentaciones = [
            ("Reloj de Bolsillo Suizo — Siglo XIX",       "Relojes y Joyería", "Suiza"),
            ("Jarrón de Porcelana China — Dinastía Ming",  "Arte Oriental",     "China"),
            ("Bodegón Flamenco — Escuela del XVII",        "Pintura y Arte",    "Países Bajos"),
            ("Colección Numismática Romana",                "Numismática",       "Italia"),
            ("Silla Luis XV — Francia 1750",               "Muebles Antiguos",  "Francia"),
        ]
        for articulo, (titulo, categoria_pp, procedencia) in zip(articulos, presentaciones):
            db.add(models.ProductoPresentacion(
                producto=articulo.identificador,
                titulo=titulo,
                categoria=categoria_pp,
                procedencia=procedencia,
                declaracionLegal="si",
                estado="publicado"
            ))
        db.flush()

        # --- Subastas ---
        hoy = date.today()
        subasta_1 = models.Subasta(
            fecha=hoy + timedelta(days=30),
            hora=time(15, 0),
            estado="abierta",
            subastador=subastador.identificador,
            ubicacion="Salón Principal, Av. Alvear 1440, CABA",
            capacidadAsistentes=100,
            tieneDeposito="si",
            seguridadPropia="si",
            categoria="comun"
        )
        subasta_2 = models.Subasta(
            fecha=hoy + timedelta(days=45),
            hora=time(10, 0),
            estado="abierta",
            subastador=subastador.identificador,
            ubicacion="Sala VIP, Av. del Libertador 750, CABA",
            capacidadAsistentes=50,
            tieneDeposito="si",
            seguridadPropia="si",
            categoria="comun"
        )
        db.add(subasta_1)
        db.add(subasta_2)
        db.flush()

        # --- Catálogos ---
        catalogo_1 = models.Catalogo(descripcion="Subasta de Antigüedades — Lote 1",        subasta=subasta_1.identificador, responsable=1)
        catalogo_2 = models.Catalogo(descripcion="Subasta de Arte y Numismática — Lote 2",  subasta=subasta_2.identificador, responsable=2)
        db.add(catalogo_1)
        db.add(catalogo_2)
        db.flush()

        # --- Ítems de catálogo ---
        items = [
            models.ItemCatalogo(catalogo=catalogo_1.identificador, producto=articulos[0].identificador, precioBase=150000, comision=10, subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_1.identificador, producto=articulos[1].identificador, precioBase=320000, comision=10, subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_1.identificador, producto=articulos[2].identificador, precioBase=280000, comision=12, subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_2.identificador, producto=articulos[3].identificador, precioBase=85000,  comision=8,  subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_2.identificador, producto=articulos[4].identificador, precioBase=195000, comision=10, subastado="no"),
        ]
        for item in items:
            db.add(item)

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_subastas_categorias():
    db = SessionLocal()
    try:
        if db.query(models.Persona).filter(models.Persona.documento == "00000003").first():
            return

        # Reusar el dueño existente o crear uno nuevo
        p_due = db.query(models.Persona).filter(models.Persona.documento == "00000002").first()
        if not p_due:
            p_due = models.Persona(nombre="Duenio Prueba 2", documento="00000003", direccion="Av. Rivadavia 3000, CABA", estado="activo")
            db.add(p_due)
            db.flush()
            db.add(models.Duenio(identificador=p_due.identificador, numeroPais=1, verificador=1))
            db.flush()
        duenio_id = p_due.identificador

        p_sub = db.query(models.Persona).filter(models.Persona.documento == "00000001").first()
        if not p_sub:
            p_sub = models.Persona(nombre="Subastador Prueba 2", documento="00000003", direccion="Mitre 500, CABA", estado="activo")
            db.add(p_sub)
            db.flush()
            db.add(models.Subastador(identificador=p_sub.identificador, matricula="MAT-002", region="Buenos Aires"))
            db.flush()
        subastador_id = db.query(models.Subastador).filter(models.Subastador.identificador == p_sub.identificador).first().identificador

        hoy = date.today()

        datos_categorias = [
            ("especial", [
                {
                    "subasta": {"fecha": hoy + timedelta(days=10), "hora": time(14, 0), "ubicacion": "Sala Especial A, Av. Cabildo 100, CABA", "capacidad": 80},
                    "catalogo": "Subasta Especial — Lote A",
                    "productos": [
                        ("Broche victoriano en oro", "Broche victoriano en oro 18k con diamantes de corte antiguo, circa 1880, pieza única de joyería fina.", "Joyería", "Reino Unido", 200000, 12),
                        ("Telescopio refractor siglo XIX", "Telescopio refractor de latón, circa 1870, fabricante inglés, longitud 90 cm, con trípode de madera original.", "Instrumentos", "Reino Unido", 175000, 10),
                    ]
                },
                {
                    "subasta": {"fecha": hoy + timedelta(days=20), "hora": time(16, 0), "ubicacion": "Sala Especial B, Florida 550, CABA", "capacidad": 60},
                    "catalogo": "Subasta Especial — Lote B",
                    "productos": [
                        ("Mapa grabado siglo XVIII", "Mapa grabado en cobre de América del Sur, circa 1750, iluminado a mano, excelente estado de conservación, 60x45 cm.", "Cartografía", "Francia", 130000, 10),
                        ("Abanico de nácar y seda", "Abanico de nácar tallado con varillas de seda bordada, estilo Belle Époque, circa 1900, estuche original incluido.", "Accesorios", "España", 95000, 8),
                    ]
                },
            ]),
            ("plata", [
                {
                    "subasta": {"fecha": hoy + timedelta(days=12), "hora": time(11, 0), "ubicacion": "Salón Plata, Posadas 1200, CABA", "capacidad": 50},
                    "catalogo": "Subasta Plata — Lote A",
                    "productos": [
                        ("Escultura bronce Art Déco", "Escultura en bronce patinado, estilo Art Déco, figura femenina danzante, circa 1925, altura 55 cm, base de mármol negro.", "Escultura", "Francia", 450000, 14),
                        ("Piano de cola Bösendorfer 1910", "Piano de cola Bösendorfer, modelo 170, fabricado en Viena circa 1910, restaurado profesionalmente, madera de palosanto.", "Instrumentos Musicales", "Austria", 1800000, 15),
                    ]
                },
                {
                    "subasta": {"fecha": hoy + timedelta(days=25), "hora": time(18, 0), "ubicacion": "Galería Sur, Defensa 1000, CABA", "capacidad": 40},
                    "catalogo": "Subasta Plata — Lote B",
                    "productos": [
                        ("Tapiz flamenco siglo XVI", "Tapiz tejido en lana y seda, escuela flamenca, siglo XVI, escena de caza, 320x240 cm, restaurado.", "Textiles", "Bélgica", 620000, 13),
                        ("Vajilla plata Sterling completa", "Vajilla Sterling de 48 piezas, casa Christofle, Francia circa 1930, grabado heráldico, estuche de madera original.", "Platería", "Francia", 380000, 12),
                    ]
                },
            ]),
            ("oro", [
                {
                    "subasta": {"fecha": hoy + timedelta(days=15), "hora": time(15, 0), "ubicacion": "Suite Oro, Alvear Palace Hotel, CABA", "capacidad": 30},
                    "catalogo": "Subasta Oro — Lote A",
                    "productos": [
                        ("Collar diamantes Belle Époque", "Collar en platino con 48 diamantes talla brillante, peso total 12 ct, circa 1905, certificado GIA, estuche Cartier.", "Alta Joyería", "Francia", 3500000, 18),
                        ("Manuscrito iluminado medieval", "Manuscrito iluminado en vitela, siglo XIV, 120 páginas, miniaturas en oro y pigmentos naturales, encuadernación original.", "Libros y Manuscritos", "Italia", 2800000, 16),
                    ]
                },
                {
                    "subasta": {"fecha": hoy + timedelta(days=35), "hora": time(12, 0), "ubicacion": "Sala Premium, Arroyo 841, CABA", "capacidad": 25},
                    "catalogo": "Subasta Oro — Lote B",
                    "productos": [
                        ("Automóvil Bugatti Type 35 1927", "Bugatti Type 35, 1927, restauración completa certificada, color azul Bugatti, motor 2.3L superalimentado, 7 victorias documentadas.", "Automóviles Clásicos", "Francia", 12000000, 20),
                        ("Reloj Patek Philippe ref. 2499", "Patek Philippe ref. 2499, calendario perpetuo cronógrafo, oro rosa 18k, circa 1960, caja y documentación originales.", "Relojería", "Suiza", 9500000, 18),
                    ]
                },
            ]),
            ("platino", [
                {
                    "subasta": {"fecha": hoy + timedelta(days=8), "hora": time(20, 0), "ubicacion": "Penthouse Exclusivo, Puerto Madero, CABA", "capacidad": 15},
                    "catalogo": "Subasta Platino — Lote A",
                    "productos": [
                        ("Obra Picasso — Período Azul", "Óleo sobre lienzo, Pablo Picasso, circa 1903, período azul, autenticado por el Musée Picasso París, certificado de procedencia completo, 95x75 cm.", "Pintura Moderna", "España", 85000000, 25),
                        ("Diamante azul — 18 quilates", "Diamante azul fancy vivid, talla cojín, 18.02 ct, certificado GIA FL, subastado anteriormente en Christie's Ginebra.", "Gemas", "Sudáfrica", 120000000, 22),
                    ]
                },
                {
                    "subasta": {"fecha": hoy + timedelta(days=40), "hora": time(19, 0), "ubicacion": "Sala Bóveda, Banco Ciudad Sede Central, CABA", "capacidad": 10},
                    "catalogo": "Subasta Platino — Lote B",
                    "productos": [
                        ("Stradivarius — violín Il Cremonese", "Violín Antonio Stradivari, 1715, modelo Il Cremonese, restaurado por taller Beare Londres, con certificado de autenticidad y estuche de viaje.", "Instrumentos Musicales", "Italia", 95000000, 24),
                        ("Colección vinos Romanée-Conti 1945", "Colección de 12 botellas Domaine de la Romanée-Conti, cosecha 1945, almacenaje continuo certificado desde bodega de origen.", "Vinos y Espirituosos", "Francia", 50000000, 20),
                    ]
                },
            ]),
        ]

        for categoria, lotes in datos_categorias:
            for lote in lotes:
                sd = lote["subasta"]
                subasta = models.Subasta(
                    fecha=sd["fecha"],
                    hora=sd["hora"],
                    estado="abierta",
                    subastador=subastador_id,
                    ubicacion=sd["ubicacion"],
                    capacidadAsistentes=sd["capacidad"],
                    tieneDeposito="si",
                    seguridadPropia="si",
                    categoria=categoria
                )
                db.add(subasta)
                db.flush()

                catalogo = models.Catalogo(descripcion=lote["catalogo"], subasta=subasta.identificador, responsable=1)
                db.add(catalogo)
                db.flush()

                for desc_corta, desc_larga, cat_pp, procedencia, precio, comision in lote["productos"]:
                    producto = models.Producto(
                        descripcionCatalogo=desc_corta,
                        descripcionCompleta=desc_larga,
                        revisor=1,
                        duenio=duenio_id,
                        disponible="si"
                    )
                    db.add(producto)
                    db.flush()

                    db.add(models.ProductoPresentacion(
                        producto=producto.identificador,
                        titulo=desc_corta,
                        categoria=cat_pp,
                        procedencia=procedencia,
                        declaracionLegal="si",
                        estado="publicado"
                    ))

                    db.add(models.ItemCatalogo(
                        catalogo=catalogo.identificador,
                        producto=producto.identificador,
                        precioBase=precio,
                        comision=comision,
                        subastado="no"
                    ))

                db.flush()

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_usuario_prueba():
    db = SessionLocal()
    try:
        if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "prueba@test.com").first():
            return

        persona = models.Persona(
            nombre="Usuario Prueba",
            documento="99999999",
            direccion="Av. Siempreviva 742, Springfield",
            estado="activo"
        )
        db.add(persona)
        db.flush()

        db.add(models.PersonaDetalle(
            persona=persona.identificador,
            pais=1,
            mail="prueba@test.com",
            contrasenia=crud.pwd_context.hash("Prueba1."),
            claveTemporal=False
        ))

        db.add(models.Cliente(
            identificador=persona.identificador,
            numeroPais=1,
            admitido="si",
            categoria="comun",
            verificador=1
        ))

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_configuracion():
    db = SessionLocal()
    try:
        if not db.get(models.ConfiguracionEmpresa, "direccion_inspeccion"):
            db.add(models.ConfiguracionEmpresa(
                clave="direccion_inspeccion",
                valor="Av. Corrientes 1234, Piso 3, CABA — Lunes a Viernes 9-17hs"
            ))
            db.commit()
    finally:
        db.close()


def seed_historial_prueba():
    db = SessionLocal()
    try:
        usuario = db.query(models.PersonaDetalle).filter(
            models.PersonaDetalle.mail == "prueba@test.com"
        ).first()
        if not usuario:
            return

        cliente_id = usuario.persona

        if db.query(models.Asistente).filter(models.Asistente.cliente == cliente_id).first():
            return

        subastas = db.query(models.Subasta).order_by(models.Subasta.identificador).all()
        if len(subastas) < 2:
            return

        subasta_1, subasta_2 = subastas[0], subastas[1]

        def items_de_subasta(subasta_id):
            return (
                db.query(models.ItemCatalogo)
                .join(models.Catalogo, models.ItemCatalogo.catalogo == models.Catalogo.identificador)
                .filter(models.Catalogo.subasta == subasta_id)
                .all()
            )

        items_s1 = items_de_subasta(subasta_1.identificador)
        items_s2 = items_de_subasta(subasta_2.identificador)

        asistente_1 = models.Asistente(numeroPostor=10, cliente=cliente_id, subasta=subasta_1.identificador)
        asistente_2 = models.Asistente(numeroPostor=5,  cliente=cliente_id, subasta=subasta_2.identificador)
        db.add(asistente_1)
        db.add(asistente_2)
        db.flush()

        for i, item in enumerate(items_s1):
            ganador = "si" if i == 0 else "no"
            importe = round(float(item.precioBase) * 1.2, 2)
            pujo = models.Pujo(assitente=asistente_1.identificador, item=item.identificador, importe=importe, ganador=ganador)
            db.add(pujo)
            db.flush()
            db.add(models.HistorialPujos(
                pujo=pujo.identificador,
                asistente=asistente_1.identificador,
                itemCatalogo=item.identificador,
                cliente=cliente_id,
                subasta=subasta_1.identificador,
                importe=importe,
                fechaHora=datetime.now() - timedelta(days=20 - i),
            ))
            if ganador == "si":
                producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
                db.add(models.RegistroSubasta(
                    subasta=subasta_1.identificador,
                    duenio=producto.duenio,
                    producto=item.producto,
                    cliente=cliente_id,
                    importe=importe,
                    comision=float(item.comision),
                ))

        for i, item in enumerate(items_s2):
            ganador = "si" if i == 1 else "no"
            importe = round(float(item.precioBase) * 1.15, 2)
            pujo = models.Pujo(assitente=asistente_2.identificador, item=item.identificador, importe=importe, ganador=ganador)
            db.add(pujo)
            db.flush()
            db.add(models.HistorialPujos(
                pujo=pujo.identificador,
                asistente=asistente_2.identificador,
                itemCatalogo=item.identificador,
                cliente=cliente_id,
                subasta=subasta_2.identificador,
                importe=importe,
                fechaHora=datetime.now() - timedelta(days=5 - i),
            ))
            if ganador == "si":
                producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
                db.add(models.RegistroSubasta(
                    subasta=subasta_2.identificador,
                    duenio=producto.duenio,
                    producto=item.producto,
                    cliente=cliente_id,
                    importe=importe,
                    comision=float(item.comision),
                ))

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
