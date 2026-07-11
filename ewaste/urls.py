from django.urls import path

from .views import (
    assign_request_view,
    collectors_view,
    csrf_view,
    dashboard_stats_view,
    forgot_password_view,
    login_view,
    logout_view,
    me_view,
    monthly_report_pdf_view,
    profile_view,
    register_view,
    register_collector_view,
    request_detail_view,
    requests_view,
    update_status_view,
)

urlpatterns = [
    path("auth/register/", register_view, name="register"),
    path("auth/csrf/", csrf_view, name="csrf"),
    path("auth/login/", login_view, name="login"),
    path("auth/forgot-password/", forgot_password_view, name="forgot-password"),
    path("auth/logout/", logout_view, name="logout"),
    path("me/", me_view, name="me"),
    path("profile/", profile_view, name="profile"),
    path("requests/", requests_view, name="requests"),
    path("requests/<int:request_id>/", request_detail_view, name="request-detail"),
    path("requests/<int:request_id>/assign/", assign_request_view, name="request-assign"),
    path("requests/<int:request_id>/status/", update_status_view, name="request-status"),
    path("collectors/", collectors_view, name="collectors"),
    path("collectors/register/", register_collector_view, name="register-collector"),
    path("dashboard/stats/", dashboard_stats_view, name="dashboard-stats"),
    path("reports/monthly-pdf/", monthly_report_pdf_view, name="monthly-report-pdf"),
]
