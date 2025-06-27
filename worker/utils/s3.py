import os
import boto3
from botocore.exceptions import ClientError
import logging
from typing import Dict, Optional
import base64

logger = logging.getLogger(__name__)

# S3 Configuration
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "babel-books-assets")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL")  # For LocalStack

# Initialize S3 client
def get_s3_client():
    """Get S3 client with proper configuration"""
    config = {
        "region_name": AWS_REGION,
    }
    
    # Add endpoint URL for LocalStack
    if AWS_ENDPOINT_URL:
        config["endpoint_url"] = AWS_ENDPOINT_URL
    
    # Add AWS credentials if provided (for both local and production)
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    if aws_access_key and aws_secret_key:
        config["aws_access_key_id"] = aws_access_key
        config["aws_secret_access_key"] = aws_secret_key
    
    return boto3.client("s3", **config)

async def upload_asset(
    base64_data: str,
    key: str,
    content_type: str,
    metadata: Optional[Dict[str, str]] = None
) -> str:
    """Upload a base64 encoded asset to S3
    
    Args:
        base64_data: Base64 encoded file data
        key: S3 object key (path)
        content_type: MIME type of the content
        metadata: Optional metadata to attach to the object
    
    Returns:
        The S3 URL of the uploaded object
    """
    try:
        s3_client = get_s3_client()
        
        # Decode base64 data
        file_data = base64.b64decode(base64_data)
        
        # Upload to S3
        put_params = {
            "Bucket": S3_BUCKET_NAME,
            "Key": key,
            "Body": file_data,
            "ContentType": content_type,
        }
        
        if metadata:
            put_params["Metadata"] = metadata
        
        s3_client.put_object(**put_params)
        
        # Generate URL
        if AWS_ENDPOINT_URL:
            # LocalStack URL - need to use localhost for frontend access
            # Replace 'localstack' with 'localhost' for browser access
            endpoint = AWS_ENDPOINT_URL.replace('localstack', 'localhost')
            url = f"{endpoint}/{S3_BUCKET_NAME}/{key}"
        else:
            # Production S3 URL
            url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
        
        logger.info(f"Uploaded asset to S3: {key}")
        return url
        
    except ClientError as e:
        logger.error(f"S3 upload error: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during S3 upload: {str(e)}")
        raise

def generate_asset_key(
    story_id: str,
    page_number: int,
    asset_type: str,
    format: str
) -> str:
    """Generate a unique S3 key for an asset
    
    Args:
        story_id: The story ID
        page_number: The page number
        asset_type: Type of asset ('image' or 'audio')
        format: File format (e.g., 'png', 'mp3')
    
    Returns:
        The S3 key for the asset
    """
    import time
    timestamp = int(time.time() * 1000)
    return f"stories/{story_id}/page-{page_number}-{asset_type}-{timestamp}.{format}"

async def get_presigned_url(key: str, expiration: int = 3600) -> str:
    """Generate a presigned URL for an S3 object
    
    Args:
        key: S3 object key
        expiration: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Presigned URL
    """
    try:
        s3_client = get_s3_client()
        
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET_NAME, 'Key': key},
            ExpiresIn=expiration
        )
        
        return url
        
    except ClientError as e:
        logger.error(f"Error generating presigned URL: {str(e)}")
        raise