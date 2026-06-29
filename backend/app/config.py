from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"
    REFRESH_TOKEN_COOKIE_SECURE: bool = False
    REFRESH_TOKEN_COOKIE_SAMESITE: str = "lax"
    REFRESH_TOKEN_COOKIE_PATH: str = "/api/auth"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # ── Correo (SMTP) ────────────────────────────────────────────────
    # Si EMAIL_ENABLED está en False o no se configuró SMTP_HOST, los correos
    # no se envían: solo se muestran en la consola. Sirve para desarrollar sin
    # tener una cuenta de correo real.
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "Olimpiadas Perú <no-reply@olimpiadas.pe>"
    SMTP_TLS: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
