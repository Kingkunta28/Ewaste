import json
from collections import Counter
from calendar import month_name
from datetime import datetime
from datetime import date
from io import BytesIO

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import EWasteRequest, UserProfile


def _json_body(request):
    try:
        return json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return None


def _error(message, status=400):
    return JsonResponse({"error": message}, status=status)


def _client_ip(request):
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    return forwarded or request.META.get("REMOTE_ADDR") or "unknown"


def _throttle(request, scope, identifier="", limit=10, window_seconds=300):
    key = f"throttle:{scope}:{_client_ip(request)}:{(identifier or '').lower()}"
    attempts = cache.get(key, 0)
    if attempts >= limit:
        return _error("Too many attempts. Try again later.", 429)
    cache.set(key, attempts + 1, timeout=window_seconds)
    return None


def _validate_user_password(password, user=None):
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        first_message = exc.messages[0] if exc.messages else "Password is not valid"
        return _error(first_message)
    return None


def _profile_for(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _build_unique_username_from_email(email):
    base = (email or "").strip().lower()
    candidate = base
    index = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f"{base}_{index}"
        index += 1
    return candidate


def _serialize_request(req):
    return {
        "id": req.id,
        "item_type": req.item_type,
        "quantity": req.quantity,
        "condition": req.condition,
        "brand": req.brand,
        "pickup_address": req.pickup_address,
        "pickup_date": req.pickup_date.isoformat(),
        "status": req.status,
        "notes": req.notes,
        "created_at": req.created_at.isoformat(),
        "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
        "completed_at": req.completed_at.isoformat() if req.completed_at else None,
        "user": {
            "id": req.user.id,
            "username": req.user.username,
            "email": req.user.email,
        },
        "assigned_collector": (
            {
                "id": req.assigned_collector.id,
                "username": req.assigned_collector.username,
                "email": req.assigned_collector.email,
            }
            if req.assigned_collector
            else None
        ),
    }


def _role(user):
    if not user.is_authenticated:
        return None
    if user.is_superuser or user.is_staff:
        return UserProfile.ROLE_ADMIN
    return _profile_for(user).role


def _require_auth(request):
    if not request.user.is_authenticated:
        return _error("Authentication required", 401)
    return None


@require_http_methods(["POST"])
def register_view(request):
    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")

    throttled = _throttle(request, "register", limit=10, window_seconds=600)
    if throttled:
        return throttled

    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()

    if not first_name or not last_name or not email or not password:
        return _error("first_name, last_name, email and password are required")
    if User.objects.filter(email__iexact=email).exists():
        return _error("Email already exists")
    password_error = _validate_user_password(password)
    if password_error:
        return password_error

    # Use email as username for normal registrations.
    username = _build_unique_username_from_email(email)
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    profile = _profile_for(user)
    profile.phone = phone
    profile.address = address
    profile.role = UserProfile.ROLE_USER
    profile.save()

    return JsonResponse(
        {
            "message": "Account created",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": profile.role,
            },
        },
        status=201,
    )


@require_http_methods(["POST"])
def login_view(request):
    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")

    email = (data.get("email") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    identifier = email or username
    throttled = _throttle(request, "login", identifier=identifier, limit=10, window_seconds=300)
    if throttled:
        return throttled

    user = None
    if email:
        accounts = User.objects.filter(email__iexact=email).order_by("id")
        for account in accounts:
            authenticated = authenticate(username=account.username, password=password)
            if authenticated:
                user = authenticated
                break
    elif username:
        # Backward-compatible fallback for existing username-based accounts.
        user = authenticate(username=username, password=password)

    if not user:
        return _error("Invalid email/username or password", 401)

    login(request, user)
    return JsonResponse(
        {
            "message": "Logged in",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": _role(user),
            },
        }
    )


@require_http_methods(["POST"])
def forgot_password_view(request):
    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")

    email = (data.get("email") or "").strip()
    new_password = data.get("new_password") or ""
    throttled = _throttle(request, "forgot-password", identifier=email, limit=5, window_seconds=900)
    if throttled:
        return throttled

    if not email or not new_password:
        return _error("email and new_password are required")

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return _error("No user found with provided email", 404)
    except User.MultipleObjectsReturned:
        user = User.objects.filter(email__iexact=email).order_by("id").first()
        if not user:
            return _error("No user found with provided email", 404)

    password_error = _validate_user_password(new_password, user=user)
    if password_error:
        return password_error

    user.set_password(new_password)
    user.save()
    return JsonResponse({"message": "Password reset successful"})


@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out"})


@require_http_methods(["GET"])
def me_view(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    profile = _profile_for(request.user)
    return JsonResponse(
        {
            "id": request.user.id,
            "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "role": _role(request.user),
                "phone": profile.phone,
                "address": profile.address,
            }
        )


@require_http_methods(["GET", "PATCH"])
def profile_view(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    profile = _profile_for(request.user)
    if request.method == "GET":
        return JsonResponse(
            {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "phone": profile.phone,
                "address": profile.address,
                "role": _role(request.user),
            }
        )

    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")

    email = (data.get("email") or request.user.email).strip()
    if User.objects.exclude(id=request.user.id).filter(email__iexact=email).exists():
        return _error("Email already exists")

    request.user.first_name = (data.get("first_name") or request.user.first_name).strip()
    request.user.last_name = (data.get("last_name") or request.user.last_name).strip()
    request.user.email = email
    request.user.save()

    profile.phone = (data.get("phone") or profile.phone).strip()
    profile.address = (data.get("address") or profile.address).strip()
    profile.save()

    return JsonResponse(
        {
            "message": "Profile updated",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "phone": profile.phone,
                "address": profile.address,
                "role": _role(request.user),
            },
        }
    )


@require_http_methods(["GET", "POST"])
def requests_view(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    role = _role(request.user)
    if request.method == "GET":
        qs = EWasteRequest.objects.select_related("user", "assigned_collector").order_by("-created_at")
        if role == UserProfile.ROLE_USER:
            qs = qs.filter(user=request.user)
        elif role == UserProfile.ROLE_COLLECTOR:
            qs = qs.filter(assigned_collector=request.user)
        data = [_serialize_request(item) for item in qs]
        return JsonResponse(data, safe=False)

    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")
    if role != UserProfile.ROLE_USER:
        return _error("Only users can create requests", 403)

    item_type = (data.get("item_type") or "").strip()
    pickup_address = (data.get("pickup_address") or "").strip()
    pickup_date = data.get("pickup_date")
    try:
        quantity = int(data.get("quantity") or 1)
    except (TypeError, ValueError):
        return _error("quantity must be a valid number")
    condition = (data.get("condition") or "").strip()
    brand = (data.get("brand") or "").strip()
    notes = (data.get("notes") or "").strip()

    if not item_type or not pickup_address or not pickup_date:
        return _error("item_type, pickup_address and pickup_date are required")
    try:
        parsed_date = date.fromisoformat(pickup_date)
    except ValueError:
        return _error("pickup_date must be YYYY-MM-DD")
    if parsed_date < date.today():
        return _error("pickup_date cannot be in the past")
    if quantity < 1:
        return _error("quantity must be at least 1")

    req = EWasteRequest.objects.create(
        user=request.user,
        item_type=item_type,
        quantity=quantity,
        condition=condition,
        brand=brand,
        pickup_address=pickup_address,
        pickup_date=parsed_date,
        notes=notes,
    )
    return JsonResponse(_serialize_request(req), status=201)


@require_http_methods(["GET", "PATCH"])
def request_detail_view(request, request_id):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    role = _role(request.user)
    try:
        req = EWasteRequest.objects.select_related("user", "assigned_collector").get(id=request_id)
    except EWasteRequest.DoesNotExist:
        return _error("Request not found", 404)

    if role == UserProfile.ROLE_USER and req.user_id != request.user.id:
        return _error("Forbidden", 403)
    if role == UserProfile.ROLE_COLLECTOR and req.assigned_collector_id != request.user.id:
        return _error("Forbidden", 403)

    if request.method == "GET":
        return JsonResponse(_serialize_request(req))

    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")
    if role != UserProfile.ROLE_USER or req.user_id != request.user.id:
        return _error("Only request owner can edit this request", 403)
    if req.status != EWasteRequest.STATUS_PENDING:
        return _error("Only pending requests can be edited")

    req.item_type = (data.get("item_type") or req.item_type).strip()
    req.pickup_address = (data.get("pickup_address") or req.pickup_address).strip()
    req.condition = (data.get("condition") or req.condition).strip()
    req.brand = (data.get("brand") or req.brand).strip()
    req.notes = (data.get("notes") or req.notes).strip()

    quantity = data.get("quantity")
    if quantity is not None:
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return _error("quantity must be a valid number")
        if quantity < 1:
            return _error("quantity must be at least 1")
        req.quantity = quantity

    pickup_date = data.get("pickup_date")
    if pickup_date:
        try:
            parsed_date = date.fromisoformat(pickup_date)
        except ValueError:
            return _error("pickup_date must be YYYY-MM-DD")
        if parsed_date < date.today():
            return _error("pickup_date cannot be in the past")
        req.pickup_date = parsed_date

    req.save()
    return JsonResponse(_serialize_request(req))


@require_http_methods(["POST"])
def assign_request_view(request, request_id):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error
    if _role(request.user) != UserProfile.ROLE_ADMIN:
        return _error("Only admins can assign collectors", 403)

    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")

    collector_id = data.get("collector_id")
    if not collector_id:
        return _error("collector_id is required")
    try:
        collector_id = int(collector_id)
    except (TypeError, ValueError):
        return _error("collector_id must be a valid number")

    try:
        req = EWasteRequest.objects.select_related("user", "assigned_collector").get(id=request_id)
    except EWasteRequest.DoesNotExist:
        return _error("Request not found", 404)

    try:
        collector = User.objects.get(id=collector_id)
    except User.DoesNotExist:
        return _error("Collector not found", 404)

    collector_profile = _profile_for(collector)
    if collector_profile.role != UserProfile.ROLE_COLLECTOR:
        return _error("Selected user is not a collector")

    req.mark_assigned(collector)
    req.save()
    return JsonResponse(_serialize_request(req))


@require_http_methods(["POST"])
def update_status_view(request, request_id):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error

    role = _role(request.user)
    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")
    status = (data.get("status") or "").strip().lower()

    try:
        req = EWasteRequest.objects.select_related("user", "assigned_collector").get(id=request_id)
    except EWasteRequest.DoesNotExist:
        return _error("Request not found", 404)

    if role == UserProfile.ROLE_COLLECTOR and req.assigned_collector_id != request.user.id:
        return _error("Collectors can only update their assigned requests", 403)
    if role == UserProfile.ROLE_USER:
        return _error("Users cannot update request status", 403)

    if status == EWasteRequest.STATUS_COMPLETED:
        req.mark_completed()
    elif status in {EWasteRequest.STATUS_PENDING, EWasteRequest.STATUS_ASSIGNED, EWasteRequest.STATUS_CANCELLED}:
        req.status = status
    else:
        return _error("Unsupported status")

    req.save()
    return JsonResponse(_serialize_request(req))


@ensure_csrf_cookie
@require_http_methods(["GET"])
def collectors_view(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error
    if _role(request.user) != UserProfile.ROLE_ADMIN:
        return _error("Only admins can view collectors", 403)

    collectors = (
        User.objects.filter(profile__role=UserProfile.ROLE_COLLECTOR)
        .order_by("username")
        .values("id", "username", "email")
    )
    return JsonResponse(list(collectors), safe=False)


@require_http_methods(["POST"])
def register_collector_view(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error
    if _role(request.user) != UserProfile.ROLE_ADMIN:
        return _error("Only admins can register collectors", 403)

    data = _json_body(request)
    if data is None:
        return _error("Invalid JSON payload")

    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()

    if not first_name or not last_name or not email or not password:
        return _error("first_name, last_name, email and password are required")
    if User.objects.filter(email__iexact=email).exists():
        return _error("Email already exists")
    password_error = _validate_user_password(password)
    if password_error:
        return password_error

    username = _build_unique_username_from_email(email)
    collector = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    profile = _profile_for(collector)
    profile.role = UserProfile.ROLE_COLLECTOR
    profile.phone = phone
    profile.address = address
    profile.save()

    return JsonResponse(
        {
            "message": "Collector account created",
            "collector": {
                "id": collector.id,
                "username": collector.username,
                "email": collector.email,
                "first_name": collector.first_name,
                "last_name": collector.last_name,
                "phone": profile.phone,
                "address": profile.address,
                "role": profile.role,
            },
        },
        status=201,
    )


@ensure_csrf_cookie
@require_http_methods(["GET"])
def csrf_view(request):
    return JsonResponse({"message": "CSRF cookie set"})


@require_http_methods(["GET"])
def dashboard_stats_view(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error
    if _role(request.user) != UserProfile.ROLE_ADMIN:
        return _error("Only admins can view dashboard stats", 403)

    total = EWasteRequest.objects.count()
    pending = EWasteRequest.objects.filter(status=EWasteRequest.STATUS_PENDING).count()
    assigned = EWasteRequest.objects.filter(status=EWasteRequest.STATUS_ASSIGNED).count()
    completed = EWasteRequest.objects.filter(status=EWasteRequest.STATUS_COMPLETED).count()
    cancelled = EWasteRequest.objects.filter(status=EWasteRequest.STATUS_CANCELLED).count()

    return JsonResponse(
        {
            "total_requests": total,
            "pending_requests": pending,
            "assigned_requests": assigned,
            "completed_requests": completed,
            "cancelled_requests": cancelled,
        }
    )


@require_http_methods(["GET"])
def monthly_report_pdf_view(request):
    auth_error = _require_auth(request)
    if auth_error:
        return auth_error
    if _role(request.user) != UserProfile.ROLE_ADMIN:
        return _error("Only admins can export reports", 403)

    month_param = (request.GET.get("month") or "").strip()
    if not month_param:
        return _error("month query parameter is required in YYYY-MM format")

    try:
        month_date = datetime.strptime(month_param, "%Y-%m")
    except ValueError:
        return _error("Invalid month format. Use YYYY-MM")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.pdfgen import canvas
    except Exception:
        return _error("PDF library not installed. Please install reportlab.", 500)

    year = month_date.year
    month = month_date.month

    requests_qs = (
        EWasteRequest.objects.select_related("user", "assigned_collector")
        .filter(pickup_date__year=year, pickup_date__month=month, status=EWasteRequest.STATUS_COMPLETED)
        .order_by("pickup_date")
    )
    requests = list(requests_qs)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    left = 36
    right = width - 36
    total_collections = len(requests)
    total_quantity = sum(item.quantity for item in requests)
    unique_users = len({item.user_id for item in requests})
    unique_collectors = len({item.assigned_collector_id for item in requests if item.assigned_collector_id})
    item_counter = Counter()
    for item in requests:
        item_counter[item.item_type] += item.quantity

    header_bg = colors.HexColor("#0B7A66")
    accent_bg = colors.HexColor("#E8F6F2")
    accent_bg_2 = colors.HexColor("#E7F2FA")
    line_color = colors.HexColor("#D4E5DF")
    text_dark = colors.HexColor("#10212A")
    text_muted = colors.HexColor("#526370")
    panel_bg = colors.HexColor("#F6FAFC")

    def _truncate(value, size):
        value = str(value)
        return value if len(value) <= size else f"{value[:size-1]}..."

    def draw_page_header(page_no):
        # Soft page panel to improve print/readability over white paper.
        pdf.setFillColor(panel_bg)
        pdf.roundRect(24, 20, width - 48, height - 40, 16, stroke=0, fill=1)

        pdf.setFillColor(header_bg)
        pdf.roundRect(24, height - 103, width - 48, 86, 14, stroke=0, fill=1)

        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 18)
        title_x = left + 6
        pdf.drawString(title_x, height - 48, "Smart E-Waste Collection System")
        pdf.setFont("Helvetica", 11)
        pdf.drawString(title_x, height - 68, f"Monthly Collection Report - {month_name[month]} {year}")
        pdf.drawRightString(right - 6, height - 68, f"Generated by: {request.user.username}")
        pdf.setFont("Helvetica", 10)
        pdf.drawRightString(right - 6, height - 84, f"Page {page_no}")
        pdf.setFont("Helvetica-Bold", 9)
        pdf.setFillColor(colors.HexColor("#D2F4E9"))
        pdf.drawString(left + 8, height - 86, "Environment First")

    def draw_summary_cards(y_top):
        card_width = (right - left - 18) / 4
        labels = [
            ("Completed Pickups", total_collections),
            ("Total Items", total_quantity),
            ("Unique Users", unique_users),
            ("Collectors", unique_collectors),
        ]
        for index, (label, value) in enumerate(labels):
            x = left + (card_width + 6) * index
            pdf.setFillColor(accent_bg if index % 2 == 0 else accent_bg_2)
            pdf.roundRect(x, y_top - 52, card_width, 44, 8, stroke=0, fill=1)
            pdf.setFillColor(text_dark)
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(x + 8, y_top - 27, str(value))
            pdf.setFont("Helvetica", 8)
            pdf.setFillColor(text_muted)
            pdf.drawString(x + 8, y_top - 40, label)

    def draw_item_breakdown(y_top):
        pdf.setFillColor(colors.white)
        pdf.roundRect(left, y_top - 78, right - left, 66, 10, stroke=0, fill=1)
        pdf.setFillColor(text_dark)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(left + 10, y_top - 25, "Top Collected Item Types")

        top_items = item_counter.most_common(3)
        if not top_items:
            pdf.setFillColor(text_muted)
            pdf.setFont("Helvetica-Oblique", 9)
            pdf.drawString(left + 10, y_top - 42, "No completed collections for this month.")
            return y_top - 86

        max_count = top_items[0][1] if top_items else 1
        bar_area_width = 140
        for idx, (item_name, count) in enumerate(top_items):
            row_y = y_top - 42 - (idx * 16)
            pdf.setFillColor(text_muted)
            pdf.setFont("Helvetica", 8.5)
            pdf.drawString(left + 10, row_y, _truncate(item_name, 22))
            pdf.setFillColor(colors.HexColor("#D9EAF6"))
            pdf.roundRect(left + 160, row_y - 3, bar_area_width, 8, 4, stroke=0, fill=1)
            bar_width = 0 if max_count == 0 else (count / max_count) * bar_area_width
            pdf.setFillColor(colors.HexColor("#0F4F7A"))
            pdf.roundRect(left + 160, row_y - 3, bar_width, 8, 4, stroke=0, fill=1)
            pdf.setFillColor(text_dark)
            pdf.setFont("Helvetica-Bold", 8)
            pdf.drawString(left + 306, row_y, str(count))
        return y_top - 86

    def draw_table_header(y):
        pdf.setFillColor(colors.HexColor("#0F4F7A"))
        pdf.rect(left, y - 15, right - left, 15, stroke=0, fill=1)
        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 8.5)
        pdf.drawString(left + 4, y - 10, "ID")
        pdf.drawString(left + 30, y - 10, "DATE")
        pdf.drawString(left + 90, y - 10, "USER")
        pdf.drawString(left + 180, y - 10, "ITEM TYPE")
        pdf.drawString(left + 312, y - 10, "QTY")
        pdf.drawString(left + 344, y - 10, "COLLECTOR")
        pdf.drawString(left + 440, y - 10, "ADDRESS")
        return y - 18

    page_no = 1
    draw_page_header(page_no)
    draw_summary_cards(height - 102)
    y = draw_item_breakdown(height - 154)
    y = draw_table_header(y - 8)

    if not requests:
        pdf.setFont("Helvetica-Oblique", 10)
        pdf.setFillColor(text_muted)
        pdf.drawString(left + 4, y - 6, "No completed collections found for this month.")
    else:
        for index, req in enumerate(requests):
            if y < 64:
                pdf.setStrokeColor(line_color)
                pdf.line(left, 42, right, 42)
                pdf.setFillColor(text_muted)
                pdf.setFont("Helvetica", 8)
                pdf.drawRightString(right, 28, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}")
                pdf.showPage()
                page_no += 1
                draw_page_header(page_no)
                draw_summary_cards(height - 102)
                y = draw_item_breakdown(height - 154)
                y = draw_table_header(y - 8)

            if index % 2 == 0:
                pdf.setFillColor(colors.HexColor("#F8FBFD"))
                pdf.rect(left, y - 12, right - left, 14, stroke=0, fill=1)

            collector_name = req.assigned_collector.username if req.assigned_collector else "-"
            pdf.setFillColor(text_dark)
            pdf.setFont("Helvetica", 8)
            pdf.drawString(left + 4, y - 8, str(req.id))
            pdf.drawString(left + 30, y - 8, req.pickup_date.isoformat())
            pdf.drawString(left + 90, y - 8, _truncate(req.user.username, 16))
            pdf.drawString(left + 180, y - 8, _truncate(req.item_type, 24))
            pdf.drawString(left + 312, y - 8, str(req.quantity))
            pdf.drawString(left + 344, y - 8, _truncate(collector_name, 16))
            pdf.drawString(left + 440, y - 8, _truncate(req.pickup_address, 24))
            y -= 14

    pdf.setStrokeColor(line_color)
    pdf.line(left, 42, right, 42)
    pdf.setFillColor(text_muted)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(left, 28, f"Report Month: {month_name[month]} {year}")
    pdf.drawCentredString(width / 2, 28, "Smart E-Waste Management - Zanzibar")
    pdf.drawRightString(right, 28, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    pdf.save()
    buffer.seek(0)

    filename = f"monthly_collection_{year}_{month:02d}.pdf"
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
