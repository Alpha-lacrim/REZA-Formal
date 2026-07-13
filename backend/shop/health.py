from django.db import connection
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@throttle_classes([])
def live(request):
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@throttle_classes([])
def ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:
        return Response({'status': 'unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({'status': 'ready'})
