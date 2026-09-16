from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Recall AI Knowledge Platform"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # MongoDB Settings
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "recall_ai_db"

    # Gemini Settings
    GEMINI_API_KEY: str = ""
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    GEMINI_CHAT_MODEL: str = "models/gemini-2.5-flash"
    EMBEDDING_DIMENSION: int = 768

    # RAG Settings
    RAG_TOP_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.15
    MAX_CONVERSATION_HISTORY: int = 6

    # JWT Settings
    JWT_SECRET: str = "change_me_super_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS Settings
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
