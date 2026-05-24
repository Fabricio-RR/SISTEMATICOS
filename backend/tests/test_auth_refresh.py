from http.cookies import SimpleCookie

from app.config import settings
from app.core.security import hash_password, hash_refresh_token
from app.models.refresh_tokens import RefreshToken
from app.models.usuarios import Usuario


def _cookie_value(response, name: str) -> str:
    raw = response.headers.get("set-cookie")
    assert raw is not None
    cookie = SimpleCookie()
    cookie.load(raw)
    return cookie[name].value


def _create_user(db_session) -> Usuario:
    user = Usuario(
        nombres="Admin",
        apellidos="Test",
        correo="admin@test.pe",
        contrasena_hash=hash_password("Admin1234!"),
        rol="admin",
        esta_activo=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_refresh_requires_cookie(client):
    response = client.request("POST", "/api/auth/refresh")
    assert response.status_code == 401


def test_refresh_rotates_token(client, db_session):
    user = _create_user(db_session)
    response = client.request("POST", "/api/auth/login", json={"correo": user.correo, "contrasena": "Admin1234!"})
    assert response.status_code == 200

    old_refresh = _cookie_value(response, settings.REFRESH_TOKEN_COOKIE_NAME)
    refresh_response = client.request(
        "POST",
        "/api/auth/refresh",
        cookies={settings.REFRESH_TOKEN_COOKIE_NAME: old_refresh},
    )
    assert refresh_response.status_code == 200
    new_refresh = _cookie_value(refresh_response, settings.REFRESH_TOKEN_COOKIE_NAME)
    assert new_refresh != old_refresh

    stored = db_session.query(RefreshToken).filter(
        RefreshToken.token_hash == hash_refresh_token(old_refresh)
    ).first()
    assert stored is not None
    assert stored.revoked_at is not None


def test_logout_revokes_refresh(client, db_session):
    user = _create_user(db_session)
    response = client.request("POST", "/api/auth/login", json={"correo": user.correo, "contrasena": "Admin1234!"})
    assert response.status_code == 200

    refresh_token = _cookie_value(response, settings.REFRESH_TOKEN_COOKIE_NAME)
    logout = client.request("POST", "/api/auth/logout", cookies={settings.REFRESH_TOKEN_COOKIE_NAME: refresh_token})
    assert logout.status_code == 204

    refresh = client.request("POST", "/api/auth/refresh", cookies={settings.REFRESH_TOKEN_COOKIE_NAME: refresh_token})
    assert refresh.status_code == 401
