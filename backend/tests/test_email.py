"""El servicio de correo en modo desarrollo no debe enviar ni fallar."""
import logging

from app.services.email import send_email


def test_modo_dev_no_lanza_y_loguea(caplog):
    with caplog.at_level(logging.INFO, logger="email"):
        # Sin SMTP configurado (EMAIL_ENABLED por defecto False).
        send_email("destino@test.pe", "Asunto de prueba", "Cuerpo")
    assert any("EMAIL:dev" in r.message for r in caplog.records)


def test_destinatario_vacio_no_hace_nada(caplog):
    with caplog.at_level(logging.INFO, logger="email"):
        send_email(None, "Asunto", "Cuerpo")
    assert not caplog.records
