"""Validated product images. Validation never writes to storage."""
import base64
import json
import uuid
import warnings
from io import BytesIO
from pathlib import PurePosixPath
from urllib.parse import unquote, urlsplit

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers


MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_GALLERY_IMAGES = 12
FORMATS = {'PNG': ('.png', 'image/png'), 'JPEG': ('.jpg', 'image/jpeg'),
           'WEBP': ('.webp', 'image/webp'), 'GIF': ('.gif', 'image/gif')}


class ProductImageField(serializers.ImageField):
    def to_internal_value(self, data):
        # Compatibility for already stored inline galleries; they become files on edit.
        if isinstance(data, str) and data.startswith('data:'):
            try:
                header, encoded = data.split(',', 1)
                if len(encoded) > (MAX_IMAGE_BYTES * 4 // 3) + 4:
                    raise ValueError
                mime = header.removeprefix('data:').removesuffix(';base64')
                extension = next(ext for ext, content_type in FORMATS.values() if content_type == mime)
                if header != f'data:{mime};base64':
                    raise ValueError
                data = ContentFile(base64.b64decode(encoded, validate=True), name=f'legacy{extension}')
            except (ValueError, StopIteration):
                raise serializers.ValidationError('Invalid inline image.')
        if not hasattr(data, 'size') or data.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError('Each image must be at most 10 MiB.')
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                data.seek(0)
                with Image.open(data) as source:
                    image_format = source.format
                    if image_format not in FORMATS:
                        raise ValueError('Use PNG, JPEG, WebP or GIF.')
                    extension, mime = FORMATS[image_format]
                    supplied_extension = PurePosixPath(data.name.lower()).suffix
                    if supplied_extension not in ({'.jpg', '.jpeg'} if image_format == 'JPEG' else {extension}):
                        raise ValueError('Image extension does not match its content.')
                    if getattr(data, 'content_type', mime) != mime:
                        raise ValueError('Image MIME type does not match its content.')
                    if max(source.size) > 8000 or source.width * source.height > 20_000_000:
                        raise ValueError('Images must fit within 8000 pixels per side and 20 million pixels.')
                    if getattr(source, 'is_animated', False):
                        raise ValueError('Upload a still image.')
                    source.load()
                    # Decode and re-encode pixels; discard metadata and appended/polyglot content.
                    clean = Image.new('RGBA' if 'A' in source.getbands() or 'transparency' in source.info else 'RGB', source.size)
                    clean.paste(source.convert(clean.mode))
                    output = BytesIO()
                    clean.save(output, format=image_format)
                    if output.tell() > MAX_IMAGE_BYTES:
                        raise ValueError('The decoded image is too large.')
                    return ContentFile(output.getvalue(), name=f'{uuid.uuid4().hex}{extension}')
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise serializers.ValidationError(str(exc) or 'Invalid image.') from exc


def image_list(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('Expected a JSON array of image URLs.')
    if not isinstance(value, list):
        raise serializers.ValidationError('Expected an array of image URLs.')
    return value


class ProductGalleryField(serializers.Field):
    def to_internal_value(self, data):
        values = image_list(data)
        if len(values) > MAX_GALLERY_IMAGES:
            raise serializers.ValidationError('At most 12 gallery images are allowed.')
        result = []
        for value in values:
            if not isinstance(value, str):
                raise serializers.ValidationError('Gallery entries must be image URLs.')
            if value.startswith('data:'):
                result.append(ProductImageField().to_internal_value(value))
                continue
            try:
                url = urlsplit(value)
            except ValueError:
                raise serializers.ValidationError('Invalid image URL.')
            path = unquote(url.path)
            if (not value or '\\' in unquote(value) or any(ord(char) < 32 for char in unquote(value))
                    or (url.scheme not in ('http', 'https') and not value.startswith('/'))
                    or (not url.scheme and (url.netloc or value.startswith('//')))
                    or (url.scheme and not url.netloc) or url.username or url.password
                    or '..' in path.split('/') or url.scheme not in ('', 'http', 'https')
                    or PurePosixPath(path.lower()).suffix in {'.html', '.htm', '.svg', '.js', '.pdf'}):
                raise serializers.ValidationError('Use an HTTP(S) image URL or a local image path.')
            result.append(value)
        return result

    def to_representation(self, value):
        # Preserve legacy imagery until an edit converts it; normalize JSON-string galleries.
        try:
            return image_list(value)
        except serializers.ValidationError:
            return []


def store_product_media(values, saved_names):
    """Stage validated files; the caller owns cleanup if its transaction fails."""
    def save(file, prefix):
        name = default_storage.save(f'{prefix}/{file.name}', file)
        saved_names.append(name)
        return name

    primary = values.get('image')
    if isinstance(primary, ContentFile):
        values['image'] = save(primary, 'products')
    gallery = values.pop('gallery_files', [])
    if 'images' in values or gallery:
        values['images'] = [
            default_storage.url(save(value, 'products/gallery')) if isinstance(value, ContentFile) else value
            for value in [*values.get('images', []), *gallery]
        ]
