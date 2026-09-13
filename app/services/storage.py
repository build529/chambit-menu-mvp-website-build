from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image

from app.config import settings


ALLOWED_IMAGE_FORMATS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}


def save_image(upload: UploadFile | None) -> str | None:
    """
    Validate an uploaded image by its real content, save it with a unique
    filename, and return the public local URL.

    Returns None when no file was submitted.
    """
    if upload is None or not upload.filename:
        return None

    data = upload.file.read(settings.max_upload_bytes + 1)

    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB upload limit.",
        )

    try:
        image = Image.open(BytesIO(data))
        image.verify()

        # Reopen after verify() because Pillow invalidates the first object.
        image = Image.open(BytesIO(data))
        image_format = image.format
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail="Upload must be a valid JPEG, PNG, or WebP image.",
        ) from error

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=422,
            detail="Only JPEG, PNG, and WebP images are allowed.",
        )

    filename = f"{uuid4().hex}{ALLOWED_IMAGE_FORMATS[image_format]}"
    destination = settings.upload_dir / filename
    destination.write_bytes(data)

    return f"/uploads/{filename}"


def delete_local_image(path: str | None) -> None:
    """
    Delete only files managed in the configured local uploads directory.
    External URLs are never deleted here.
    """
    if not path or not path.startswith("/uploads/"):
        return

    file_path = settings.upload_dir / Path(path).name

    if file_path.exists():
        file_path.unlink()
