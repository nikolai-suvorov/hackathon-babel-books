"""
Configuration management for the worker service.
"""
import os
from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # MongoDB
    mongodb_uri: str
    mongodb_database: str = "babel-books"
    
    # Gemini API
    gemini_api_key: str
    
    # AWS/S3 (optional)
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    s3_bucket_name: Optional[str] = None
    aws_endpoint_url: Optional[str] = None
    
    # Feature flags
    use_mock_stories: bool = False
    use_mock_images: bool = False
    use_mock_audio: bool = False
    enable_s3_storage: bool = False
    
    # Application settings
    job_check_interval: float = 1.0
    job_error_retry_delay: float = 5.0
    page_processing_delay: float = 0.5
    log_level: str = "INFO"
    
    @field_validator("mongodb_uri")
    @classmethod
    def validate_mongodb_uri(cls, v):
        if not v.startswith(("mongodb://", "mongodb+srv://")):
            raise ValueError("Invalid MongoDB URI format")
        return v
    
    @field_validator("gemini_api_key")
    @classmethod
    def validate_gemini_api_key(cls, v):
        if len(v) < 10:
            raise ValueError("Invalid Gemini API key")
        return v
    
    @field_validator("enable_s3_storage")
    @classmethod
    def validate_s3_config(cls, v, info):
        if v and not all([
            info.data.get("aws_access_key_id"),
            info.data.get("aws_secret_access_key"),
            info.data.get("s3_bucket_name")
        ]):
            raise ValueError("S3 storage enabled but AWS credentials not configured")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Singleton instance
settings = Settings()


# Export commonly used values for backward compatibility
MONGODB_URI = settings.mongodb_uri
MONGODB_DATABASE = settings.mongodb_database
GEMINI_API_KEY = settings.gemini_api_key