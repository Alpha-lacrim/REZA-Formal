import math

from rest_framework.response import Response


def page_response(request, queryset, serializer_class):
    try:
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = min(max(int(request.query_params.get('page_size', 25)), 1), 100)
    except (TypeError, ValueError):
        page, page_size = 1, 25
    ordering = list(queryset.query.order_by or queryset.model._meta.ordering or [])
    if not any(field.lstrip('-') in {'pk', queryset.model._meta.pk.name} for field in ordering):
        ordering.append('pk')
    queryset = queryset.order_by(*ordering)
    count = queryset.count()
    total_pages = max(math.ceil(count / page_size), 1)
    start = (page - 1) * page_size
    results = serializer_class(queryset[start:start + page_size], many=True, context={'request': request}).data
    def link(target):
        params = request.query_params.copy()
        params['page'] = target
        params['page_size'] = page_size
        return f'{request.path}?{params.urlencode()}'

    return Response({
        'results': results,
        'count': count,
        'next': link(page + 1) if page < total_pages else None,
        'previous': link(page - 1) if page > 1 else None,
        'page': page,
        'page_size': page_size,
        'total_pages': total_pages,
    })
