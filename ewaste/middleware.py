from django.http import HttpResponse
from django.conf import settings


def _normalize_origin(origin):
    return (origin or "").strip().rstrip("/")


def _origin_matches(origin, allowed_origin):
    if not origin or not allowed_origin:
        return False
    if allowed_origin == origin:
        return True
    if "*." not in allowed_origin:
        return False

    allowed_scheme, _, allowed_host = allowed_origin.partition("://")
    origin_scheme, _, origin_host = origin.partition("://")
    if not allowed_host or allowed_scheme != origin_scheme:
        return False
    if not allowed_host.startswith("*."):
        return False

    suffix = allowed_host[1:]  # keep the leading dot for strict subdomain matching
    return origin_host.endswith(suffix) and origin_host != allowed_host[2:]


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        origin = _normalize_origin(request.headers.get("Origin"))
        allowed_origins = [
            _normalize_origin(candidate) for candidate in getattr(settings, "FRONTEND_ORIGINS", [])
        ]
        fallback_origin = _normalize_origin(getattr(settings, "FRONTEND_ORIGIN", ""))
        if fallback_origin:
            allowed_origins.append(fallback_origin)

        origin_allowed = any(_origin_matches(origin, allowed) for allowed in allowed_origins)
        if origin and origin_allowed:
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
        elif not origin and fallback_origin:
            response["Access-Control-Allow-Origin"] = fallback_origin
            response["Vary"] = "Origin"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRFToken"
        response["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
