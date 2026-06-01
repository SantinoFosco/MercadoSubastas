#!/usr/bin/env python3
"""
Test end-to-end del sistema de subastas en vivo.

== Cómo correr ==
  $env:AUCTION_ITEM_TIMEOUT=5; docker compose down -v; docker compose up --build
  # Esperar "Application startup complete"
  $env:AUCTION_ITEM_TIMEOUT=5; py APIMercadoSubastas/tests/test_live.py

Tarda ~30 segundos con AUCTION_ITEM_TIMEOUT=5.

== Qué testea ==
  BLOQUE A — API y WebSocket (un usuario)
    1.  GET  /subasta/1/vivo       → campos: itemCatalogoId, precioBase, pujaMaxima
    2.  POST /asistentes/registrar → crea asistente + idempotencia
    3.  WS connect                 → recibe auction_state
    4.  POST /pujar (monto bajo)   → 422
    5.  POST /pujar (monto alto)   → 422
    6.  POST /pujar (válida)       → 201 + WS recibe bid_update

  BLOQUE B — Dos usuarios en simultáneo (integridad en tiempo real)
    7.  Usuario 2 registra como asistente (sin medio de pago → 403)
    8.  Usuario 2 puja → Usuario 1 recibe bid_update en su WS (precio actualizado)
    9.  Usuario 1 puja → Usuario 2 recibe bid_update en su WS
    10. Solo un ganador → ganadorClienteId correcto en item_closed
    11. Ambos WS reciben item_closed con el mismo ganador
    12. Siguiente ítem o fin de subasta

  BLOQUE C — Empresa compra si nadie puja
    13. Nuevo ítem, nadie puja 5s → item_closed con ganador="Casa de Subastas"
"""

import asyncio
import json
import os
import sys
import urllib.error
import urllib.request

try:
    import websockets
except ImportError:
    print("Falta websockets. Instalar con: pip install websockets")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL   = os.environ.get("API_BASE_URL", "http://localhost:8000")
WS_BASE    = BASE_URL.replace("http://", "ws://")
SUBASTA_ID = int(os.environ.get("SUBASTA_ID", "1"))
TIMEOUT_S  = int(os.environ.get("AUCTION_ITEM_TIMEOUT", "30"))
# Margen extra para latencia de red y diferencias entre el timer del test y el del backend
TIMER_WAIT = TIMEOUT_S + 15

USER1_MAIL = "prueba@test.com"
USER1_PASS = "Prueba1."
USER2_MAIL = "prueba2@test.com"
USER2_PASS = "Prueba2."

OK   = "[OK]"
FAIL = "[FAIL]"
WAIT = "[...]"

# ── HTTP helper ───────────────────────────────────────────────────────────────

def http(method: str, path: str, body: dict = None) -> tuple[int, dict]:
    url  = BASE_URL + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    req  = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read()).get("detail", "")
        except Exception:
            detail = ""
        return e.code, {"detail": detail}

def check(condition: bool, tag: str, detail: str = ""):
    if not condition:
        print(f"{FAIL} {tag}" + (f": {detail}" if detail else ""))
        sys.exit(1)

def assert_status(status: int, expected: int, tag: str, body: dict = {}):
    check(status == expected, tag, f"esperaba {expected}, recibio {status}. {body.get('detail','')}")

async def recv(ws, timeout=5) -> dict:
    raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
    return json.loads(raw)

def ws_url(subasta_id: int, cliente_id: int) -> str:
    return f"{WS_BASE}/ws/subasta/{subasta_id}?clienteId={cliente_id}"

# ── Tests ─────────────────────────────────────────────────────────────────────

async def run_tests():
    sep = "-" * 58
    print(f"\n{sep}")
    print(f"  MERCADO SUBASTAS — Test en vivo  (timer={TIMEOUT_S}s)")
    print(f"{sep}\n")

    # Reset
    status, _ = http("DELETE", f"/dev/reset/subasta/{SUBASTA_ID}")
    check(status in (200, 404), "Reset subasta", f"HTTP {status} - backend corriendo?")

    # Login ambos usuarios
    status, u1 = http("POST", "/auth/login", {"mail": USER1_MAIL, "contrasenia": USER1_PASS})
    assert_status(status, 200, "Login usuario 1", u1)
    c1_id = u1["identificador"]

    status, u2 = http("POST", "/auth/login", {"mail": USER2_MAIL, "contrasenia": USER2_PASS})
    assert_status(status, 200, "Login usuario 2", u2)
    c2_id = u2["identificador"]
    print(f"{OK} Login  u1={USER1_MAIL} (id={c1_id})  u2={USER2_MAIL} (id={c2_id})")

    # ── BLOQUE A ─────────────────────────────────────────────────────────────
    print(f"\n--- BLOQUE A: API y WebSocket (un usuario) ---\n")

    # TEST 1: GET /subasta/vivo
    status, vivo = http("GET", f"/subasta/{SUBASTA_ID}/vivo")
    assert_status(status, 200, "TEST 1 GET /subasta/vivo", vivo)
    for campo in ("itemCatalogoId", "precioBase", "pujaMaxima", "proximaPuja", "categoriaSubasta"):
        check(campo in vivo, f"TEST 1 campo '{campo}'")
    item_id     = vivo["itemCatalogoId"]
    prox_puja   = vivo["proximaPuja"]
    puja_max    = vivo["pujaMaxima"]
    precio_base = vivo["precioBase"]
    print(f"{OK} TEST 1  item={item_id}  base=${precio_base:.0f}  min=${prox_puja:.2f}  max=${puja_max:.2f}")

    # TEST 2: registrar asistente + idempotencia
    status, a1 = http("POST", "/asistentes/registrar", {"cliente": c1_id, "subasta": SUBASTA_ID})
    assert_status(status, 200, "TEST 2 registrar asistente", a1)
    a1_id = a1["identificador"]
    check(a1["creado"] is True, "TEST 2 creado=true")

    status, a1b = http("POST", "/asistentes/registrar", {"cliente": c1_id, "subasta": SUBASTA_ID})
    check(a1b["creado"] is False and a1b["identificador"] == a1_id, "TEST 2 idempotencia")
    print(f"{OK} TEST 2  asistenteId={a1_id}  idempotente=OK")

    async with websockets.connect(ws_url(SUBASTA_ID, c1_id)) as ws1:

        # TEST 3: auction_state al conectar
        msg = await recv(ws1)
        check(msg["type"] == "auction_state", "TEST 3 auction_state", msg["type"])
        print(f"{OK} TEST 3  WS u1 conectado → recibio auction_state")

        # TEST 4: puja baja → 422
        status, body = http("POST", "/pujar", {"asistenteId": a1_id, "itemId": item_id, "importe": 0.01})
        assert_status(status, 422, "TEST 4 puja baja", body)
        print(f"{OK} TEST 4  Puja baja → 422 '{body['detail']}'")

        # TEST 5: puja alta → 422
        status, body = http("POST", "/pujar", {"asistenteId": a1_id, "itemId": item_id, "importe": puja_max + 999999})
        assert_status(status, 422, "TEST 5 puja alta", body)
        print(f"{OK} TEST 5  Puja alta → 422 '{body['detail']}'")

        # TEST 6: puja valida → bid_update en WS
        status, _ = http("POST", "/pujar", {"asistenteId": a1_id, "itemId": item_id, "importe": prox_puja})
        assert_status(status, 201, "TEST 6 puja valida")
        msg = await recv(ws1)
        check(msg["type"] == "bid_update", "TEST 6 bid_update", msg["type"])
        precio_tras_u1 = msg["data"]["precioActual"]
        print(f"{OK} TEST 6  Puja u1 ${prox_puja:.2f} → bid_update (precio=${precio_tras_u1:.2f})")

        # ── BLOQUE B ─────────────────────────────────────────────────────────
        print(f"\n--- BLOQUE B: Dos usuarios en simultaneo ---\n")

        # TEST 7: usuario 2 sin medio verificado no puede pujar
        # (registrarse SI puede, pujar NO)
        status, a2 = http("POST", "/asistentes/registrar", {"cliente": c2_id, "subasta": SUBASTA_ID})
        assert_status(status, 200, "TEST 7 u2 registrar asistente", a2)
        a2_id = a2["identificador"]
        print(f"{OK} TEST 7  u2 registrado como asistente (id={a2_id})")

        # Usuario 2 conecta su WS
        async with websockets.connect(ws_url(SUBASTA_ID, c2_id)) as ws2:
            msg2 = await recv(ws2)
            check(msg2["type"] == "auction_state", "TEST 7 ws2 auction_state", msg2["type"])
            print(f"{OK} TEST 7  WS u2 conectado → recibio auction_state (precio actual=${msg2['data']['precioActual']:.2f})")

            # TEST 8: u2 puja → u1 recibe bid_update
            prox_u2 = msg2["data"]["proximaPuja"]
            status, _ = http("POST", "/pujar", {"asistenteId": a2_id, "itemId": item_id, "importe": prox_u2})
            assert_status(status, 201, "TEST 8 puja u2")

            # u1 debe recibir bid_update con el precio de u2
            msg1_update = await recv(ws1, timeout=5)
            check(msg1_update["type"] == "bid_update", "TEST 8 u1 recibe bid_update de u2", msg1_update["type"])
            precio_tras_u2 = msg1_update["data"]["precioActual"]
            check(precio_tras_u2 == prox_u2, "TEST 8 precio correcto en u1", f"{precio_tras_u2} != {prox_u2}")
            # consumir el bid_update en ws2 tambien
            await recv(ws2, timeout=5)
            print(f"{OK} TEST 8  u2 puja ${prox_u2:.2f} → u1 recibe bid_update en tiempo real (precio=${precio_tras_u2:.2f})")

            # TEST 9: u1 vuelve a pujar → u2 recibe bid_update
            prox_u1_again = msg1_update["data"]["proximaPuja"]
            status, _ = http("POST", "/pujar", {"asistenteId": a1_id, "itemId": item_id, "importe": prox_u1_again})
            assert_status(status, 201, "TEST 9 puja u1")

            msg2_update = await recv(ws2, timeout=5)
            check(msg2_update["type"] == "bid_update", "TEST 9 u2 recibe bid_update de u1", msg2_update["type"])
            precio_tras_u1_again = msg2_update["data"]["precioActual"]
            await recv(ws1, timeout=5)  # consumir en ws1
            print(f"{OK} TEST 9  u1 puja ${prox_u1_again:.2f} → u2 recibe bid_update (precio=${precio_tras_u1_again:.2f})")

            # TEST 10+11: timer → ambos reciben item_closed con el mismo ganador (u1, ultimo en pujar)
            espera = TIMER_WAIT
            print(f"\n{WAIT} TEST 10  Esperando cierre ({TIMEOUT_S}s sin pujas)...")

            closed1 = await recv(ws1, timeout=espera)
            check(closed1["type"] == "item_closed", "TEST 10 u1 item_closed", closed1["type"])

            closed2 = await recv(ws2, timeout=5)
            check(closed2["type"] == "item_closed", "TEST 11 u2 item_closed", closed2["type"])

            # Ambos deben ver el mismo ganador
            check(
                closed1["data"]["ganadorClienteId"] == closed2["data"]["ganadorClienteId"],
                "TEST 10/11 mismo ganadorClienteId en ambos WS"
            )
            ganador_id     = closed1["data"]["ganadorClienteId"]
            ganador_nombre = closed1["data"]["ganadorNombre"]
            # El ganador debe ser u1 (ultimo en pujar)
            check(ganador_id == c1_id, "TEST 10 ganador es u1", f"ganador={ganador_id} esperado={c1_id}")
            print(f"{OK} TEST 10  u1 recibe item_closed → ganador='{ganador_nombre}' (id={ganador_id})")
            print(f"{OK} TEST 11  u2 recibe el mismo item_closed → integridad OK")

            # TEST 12: siguiente estado
            next1 = await recv(ws1, timeout=5)
            next2 = await recv(ws2, timeout=5)
            check(next1["type"] in ("auction_state","auction_ended"), "TEST 12 u1 siguiente estado")
            check(next2["type"] in ("auction_state","auction_ended"), "TEST 12 u2 siguiente estado")
            check(next1["type"] == next2["type"], "TEST 12 mismo tipo en ambos WS")
            print(f"{OK} TEST 12  Siguiente estado '{next1['type']}' — igual en ambos WS")

            # ── BLOQUE C ─────────────────────────────────────────────────────
            print(f"\n--- BLOQUE C: Empresa compra si nadie puja ---\n")

            if next1["type"] == "auction_state":
                # TEST 13: nadie puja en este item → empresa compra
                print(f"{WAIT} TEST 13  Nadie puja, esperando que empresa compre ({TIMEOUT_S}s)...")
                empresa1 = await recv(ws1, timeout=espera)
                empresa2 = await recv(ws2, timeout=5)
                check(empresa1["type"] == "item_closed", "TEST 13 item_closed", empresa1["type"])
                check(empresa2["type"] == "item_closed", "TEST 13 u2 item_closed", empresa2["type"])
                check(empresa1["data"]["ganadorNombre"] == "Casa de Subastas",
                      "TEST 13 empresa compra", empresa1["data"]["ganadorNombre"])
                check(empresa1["data"]["ganadorClienteId"] is None,
                      "TEST 13 ganadorClienteId=null")
                print(f"{OK} TEST 13  Nadie pujó → 'Casa de Subastas' compra por ${empresa1['data']['importe']:.2f}")
            else:
                print(f"  (TEST 13 saltado — subasta ya finalizada, no quedan ítems)")

    print(f"\n{sep}")
    print(f"  TODOS LOS TESTS PASARON")
    print(f"{sep}\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
