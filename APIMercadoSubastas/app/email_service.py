import os
import uuid
import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

logger = logging.getLogger(__name__)

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://pay.mercadosubastas.com")

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def _fmt(amount: float, moneda: str = "ARS") -> str:
    symbol = "USD " if moneda == "USD" else "$"
    return f"{symbol}{amount:,.2f}"


async def _send(to: str, subject: str, html: str) -> None:
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        logger.warning("[email] Credenciales no configuradas — email no enviado a %s", to)
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Mercado Subastas <{GMAIL_USER}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=GMAIL_USER,
            password=GMAIL_APP_PASSWORD,
            start_tls=True,
        )
        logger.info("[email] Enviado a %s: %s", to, subject)
    except Exception as exc:
        logger.error("[email] Error al enviar a %s: %s", to, exc)


async def send_payment_notification(
    to_email: str,
    nombre: str,
    items: list[dict],
    costo_envio: float,
    total: float,
    moneda: str,
    metodo_envio: str,
    deadline: datetime,
) -> None:
    """
    Notifica al comprador el detalle de su compra y el link de pago.
    items: [{"titulo": str, "importe": float, "comision": float}]
    """
    payment_id = str(uuid.uuid4())
    link = f"{APP_BASE_URL}/checkout/{payment_id}"
    deadline_str = deadline.strftime("%d/%m/%Y a las %H:%M hs")
    envio_label = "Envío a domicilio" if metodo_envio == "domicilio" else "Retiro personal"

    rows = "".join(
        f"""
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">{it['titulo']}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">{_fmt(it['importe'], moneda)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">{_fmt(it['comision'], moneda)}</td>
        </tr>"""
        for it in items
    )

    envio_row = ""
    if costo_envio > 0:
        envio_row = f"""
        <tr>
          <td colspan="2" style="padding:8px;border-bottom:1px solid #eee">Costo de envío ({envio_label})</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">{_fmt(costo_envio, moneda)}</td>
        </tr>"""

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

        <!-- Header -->
        <div style="background:#1A1A1A;padding:24px;text-align:center">
          <h1 style="color:#FFD700;margin:0;font-size:22px">🔨 Mercado Subastas</h1>
          <p style="color:#ccc;margin:6px 0 0">Confirmación de compra</p>
        </div>

        <!-- Body -->
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hola <strong>{nombre}</strong>,</p>
          <p style="color:#555">Ganaste los siguientes artículos. Tenés tiempo hasta el
            <strong style="color:#D32F2F">{deadline_str}</strong> para completar el pago.</p>

          <!-- Tabla de ítems -->
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
            <thead>
              <tr style="background:#f9f9f9">
                <th style="padding:10px 8px;text-align:left;color:#555">Artículo</th>
                <th style="padding:10px 8px;text-align:right;color:#555">Puja</th>
                <th style="padding:10px 8px;text-align:right;color:#555">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {rows}
              {envio_row}
            </tbody>
          </table>

          <!-- Total -->
          <div style="background:#f9f9f9;border-radius:8px;padding:16px;text-align:right;margin-bottom:24px">
            <span style="font-size:14px;color:#555">TOTAL A PAGAR ({moneda}): </span>
            <span style="font-size:22px;font-weight:bold;color:#1A1A1A">{_fmt(total, moneda)}</span>
          </div>

          <!-- Método de entrega -->
          <p style="color:#555;font-size:14px;margin-bottom:24px">
            📦 <strong>Entrega:</strong> {envio_label}
          </p>

          <!-- Botón de pago -->
          <div style="text-align:center;margin:32px 0">
            <a href="{link}"
               style="background:#FFD700;color:#1A1A1A;padding:16px 40px;border-radius:8px;
                      text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
              Ir al portal de pago
            </a>
            <p style="color:#999;font-size:12px;margin-top:12px">
              O copiá este link: <a href="{link}" style="color:#8A6D3B">{link}</a>
            </p>
          </div>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px;text-align:center">
            Si no completás el pago antes del {deadline_str}, se generará una multa
            del 10% y el caso podrá derivarse a instancias legales.
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    await _send(to_email, "Mercado Subastas — Detalle de tu compra y link de pago", html)


async def send_multa_notification(
    to_email: str,
    nombre: str,
    monto_multa: float,
    importe_original: float,
    moneda: str,
    deadline: datetime,
) -> None:
    """Notifica al usuario que tiene una multa por falta de pago."""
    deadline_str = deadline.strftime("%d/%m/%Y a las %H:%M hs")
    multa_id = str(uuid.uuid4())
    link = f"{APP_BASE_URL}/multa/{multa_id}"

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

        <div style="background:#D32F2F;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">⚠️ Aviso de multa</h1>
          <p style="color:#ffcdd2;margin:6px 0 0">Mercado Subastas</p>
        </div>

        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hola <strong>{nombre}</strong>,</p>
          <p style="color:#555">
            Se registró una multa en tu cuenta por no contar con los fondos suficientes
            para cubrir tu compra de <strong>{_fmt(importe_original, moneda)}</strong>.
          </p>

          <div style="background:#fff3f3;border:1px solid #ffcdd2;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
            <p style="color:#D32F2F;font-size:13px;margin:0 0 8px">MULTA (10% de la compra)</p>
            <p style="color:#D32F2F;font-size:28px;font-weight:bold;margin:0">{_fmt(monto_multa, moneda)}</p>
          </div>

          <p style="color:#555">
            Además, tenés tiempo hasta el <strong style="color:#D32F2F">{deadline_str}</strong>
            para presentar los fondos de la compra original. De no hacerlo, el caso se derivará
            a instancias legales y tu cuenta quedará inhabilitada.
          </p>

          <div style="text-align:center;margin:32px 0">
            <a href="{link}"
               style="background:#D32F2F;color:#fff;padding:16px 40px;border-radius:8px;
                      text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
              Pagar multa ahora
            </a>
          </div>

          <p style="color:#999;font-size:12px;text-align:center">
            No podrás participar en nuevas subastas hasta que esta multa sea abonada.
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    await _send(to_email, "Mercado Subastas — Multa por falta de pago", html)


async def send_payment_confirmed_notification(
    to_email: str,
    nombre: str,
    items_titulos: list[str],
    total: float,
    moneda: str,
) -> None:
    """Notifica al usuario que su pago fue confirmado."""
    items_html = "".join(f"<li style='margin:4px 0;color:#555'>{t}</li>" for t in items_titulos)
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <div style="background:#2E7D32;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">✅ Pago confirmado</h1>
          <p style="color:#c8e6c9;margin:6px 0 0">Mercado Subastas</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hola <strong>{nombre}</strong>,</p>
          <p style="color:#555">Tu pago de <strong>{_fmt(total, moneda)}</strong> fue confirmado exitosamente.</p>
          <p style="color:#555">Artículos adquiridos:</p>
          <ul style="padding-left:20px">{items_html}</ul>
          <p style="color:#555;margin-top:16px">
            Nos pondremos en contacto para coordinar la entrega o retiro de tus artículos.
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    await _send(to_email, "Mercado Subastas — Pago confirmado ✅", html)
