from collections import Counter, defaultdict
from datetime import datetime
from io import BytesIO

from django.contrib.auth.models import User
from django.utils import timezone

from .models import EWasteRequest, UserProfile


def build_monthly_report(month_date, prepared_by):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    year, month = month_date.year, month_date.month
    month_label = month_date.strftime("%B %Y")
    generated = timezone.localtime().strftime("%d %B %Y, %H:%M")
    report_id = f"SEW-{year}{month:02d}-{timezone.now():%d%H%M}"
    rows = list(EWasteRequest.objects.select_related("user", "assigned_collector").filter(pickup_date__year=year, pickup_date__month=month).order_by("-pickup_date", "-id"))
    users = list(User.objects.filter(profile__role=UserProfile.ROLE_USER))
    collectors = list(User.objects.filter(profile__role=UserProfile.ROLE_COLLECTOR))
    new_users = sum(1 for user in users if user.date_joined.year == year and user.date_joined.month == month)
    active_users = sum(1 for user in users if user.is_active)
    status = Counter(item.status for item in rows)
    total = len(rows)
    completed = status[EWasteRequest.STATUS_COMPLETED]
    assigned = status[EWasteRequest.STATUS_ASSIGNED]
    pending = status[EWasteRequest.STATUS_PENDING]
    cancelled = status[EWasteRequest.STATUS_CANCELLED]
    quantities = sum(item.quantity for item in rows)
    completed_devices = sum(item.quantity for item in rows if item.status == EWasteRequest.STATUS_COMPLETED)
    success_rate = completed / total * 100 if total else 0

    response_hours = [(item.assigned_at - item.created_at).total_seconds() / 3600 for item in rows if item.assigned_at and item.created_at]
    collection_hours = [(item.completed_at - item.assigned_at).total_seconds() / 3600 for item in rows if item.completed_at and item.assigned_at]
    avg_response = sum(response_hours) / len(response_hours) if response_hours else None
    avg_collection = sum(collection_hours) / len(collection_hours) if collection_hours else None

    category_counts = Counter()
    for item in rows:
        name = item.item_type.lower()
        category = "Other Electronics"
        for needle, label in (("phone", "Mobile Phones"), ("laptop", "Laptops"), ("desktop", "Desktop Computers"), ("battery", "Batteries"), ("printer", "Printers"), ("television", "Televisions"), ("tv", "Televisions")):
            if needle in name:
                category = label
                break
        category_counts[category] += item.quantity

    daily = Counter(item.pickup_date.day for item in rows if item.status == EWasteRequest.STATUS_COMPLETED)
    weekly = Counter(min(((item.pickup_date.day - 1) // 7) + 1, 5) for item in rows if item.status == EWasteRequest.STATUS_COMPLETED)
    top_week = max(weekly, key=weekly.get) if weekly else None
    collector_stats = defaultdict(lambda: {"assigned": 0, "completed": 0, "hours": []})
    for item in rows:
        if item.assigned_collector:
            data = collector_stats[item.assigned_collector]
            data["assigned"] += 1
            if item.status == EWasteRequest.STATUS_COMPLETED:
                data["completed"] += 1
            if item.assigned_at and item.created_at:
                data["hours"].append((item.assigned_at - item.created_at).total_seconds() / 3600)

    W, H = A4
    M = 38
    green = colors.HexColor("#15803D")
    green_dark = colors.HexColor("#0B4D2A")
    lime = colors.HexColor("#84CC16")
    mint = colors.HexColor("#EAF8EE")
    ink = colors.HexColor("#14231A")
    muted = colors.HexColor("#5C6B62")
    line = colors.HexColor("#DCE8DF")
    soft = colors.HexColor("#F5F9F6")
    amber = colors.HexColor("#E9A923")
    blue = colors.HexColor("#3B82F6")
    red = colors.HexColor("#DC5A5A")
    palette = [green, lime, blue, amber, colors.HexColor("#14B8A6"), colors.HexColor("#8B5CF6"), red]
    total_pages = 9
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.setTitle(f"Smart E-Waste Monthly Performance Report - {month_label}")
    pdf.setAuthor(str(prepared_by))
    pdf.setSubject("Monthly operational and environmental performance")

    def text(value, x, y, size=9, color=ink, bold=False, right=False, center=False):
        pdf.setFillColor(color); pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        value = str(value)
        if right: pdf.drawRightString(x, y, value)
        elif center: pdf.drawCentredString(x, y, value)
        else: pdf.drawString(x, y, value)

    def wrap(value, x, y, max_chars=88, size=9, leading=13, color=muted, bold=False):
        words, lines, current = str(value).split(), [], ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if len(candidate) > max_chars and current:
                lines.append(current); current = word
            else: current = candidate
        if current: lines.append(current)
        for index, item in enumerate(lines): text(item, x, y - index * leading, size, color, bold)
        return y - len(lines) * leading

    def logo(x, y, scale=1):
        pdf.setFillColor(green); pdf.circle(x, y, 16 * scale, stroke=0, fill=1)
        pdf.setStrokeColor(colors.white); pdf.setLineWidth(2 * scale)
        pdf.arc(x - 9 * scale, y - 8 * scale, x + 9 * scale, y + 10 * scale, 20, 110)
        pdf.arc(x - 9 * scale, y - 9 * scale, x + 9 * scale, y + 9 * scale, 140, 110)
        pdf.arc(x - 9 * scale, y - 8 * scale, x + 9 * scale, y + 10 * scale, 260, 100)
        text("E", x, y - 4 * scale, 9 * scale, colors.white, True, center=True)

    def chrome(page, title):
        pdf.setFillColor(colors.white); pdf.rect(0, 0, W, H, stroke=0, fill=1)
        pdf.setFillColor(green_dark); pdf.rect(0, H - 58, W, 58, stroke=0, fill=1)
        logo(M + 13, H - 29, .62)
        text("SMART E-WASTE", M + 34, H - 25, 10, colors.white, True)
        text(title.upper(), M + 34, H - 40, 7, colors.HexColor("#BDE8C9"), True)
        text(month_label, W - M, H - 33, 9, colors.white, True, right=True)
        pdf.setStrokeColor(line); pdf.line(M, 35, W - M, 35)
        text("Smart E-Waste Collection System", M, 20, 7, muted)
        text("CONFIDENTIAL REPORT", W / 2, 20, 7, green, True, center=True)
        text(f"Page {page} of {total_pages}  |  {month_label}", W - M, 20, 7, muted, right=True)

    def heading(title, subtitle, y=H - 88):
        text(title, M, y, 20, ink, True)
        text(subtitle, M, y - 18, 9, muted)
        return y - 40

    def card(x, y, w, h, label, value, accent=green, note=""):
        pdf.setFillColor(colors.white); pdf.setStrokeColor(line); pdf.roundRect(x, y - h, w, h, 9, stroke=1, fill=1)
        pdf.setFillColor(accent); pdf.roundRect(x, y - h, 4, h, 2, stroke=0, fill=1)
        text(label.upper(), x + 13, y - 18, 7, muted, True)
        text(value, x + 13, y - 42, 18, ink, True)
        if note: text(note, x + 13, y - h + 10, 7, muted)

    def section(title, y):
        text(title, M, y, 12, green_dark, True); pdf.setStrokeColor(line); pdf.line(M, y - 7, W - M, y - 7)
        return y - 24

    def bar_chart(values, labels, x, y, w, h, color=green):
        maximum = max(values) if values else 1
        maximum = maximum or 1
        gap = 7; bw = (w - gap * (len(values) - 1)) / max(len(values), 1)
        pdf.setStrokeColor(line); pdf.line(x, y, x + w, y)
        for i, value in enumerate(values):
            bh = (value / maximum) * (h - 20); bx = x + i * (bw + gap)
            pdf.setFillColor(mint); pdf.roundRect(bx, y, bw, h - 20, 3, stroke=0, fill=1)
            pdf.setFillColor(color); pdf.roundRect(bx, y, bw, bh, 3, stroke=0, fill=1)
            text(value, bx + bw / 2, y + bh + 5, 7, ink, True, center=True)
            text(labels[i], bx + bw / 2, y - 12, 6.5, muted, center=True)

    def donut(values, labels, x, y, radius=48):
        total_value = sum(values) or 1; start = 90
        for i, value in enumerate(values):
            angle = value / total_value * 360
            if angle:
                pdf.setFillColor(palette[i % len(palette)])
                if angle >= 359.999:
                    pdf.circle(x, y, radius, stroke=0, fill=1)
                else:
                    pdf.wedge(x-radius, y-radius, x+radius, y+radius, start, -angle, stroke=0, fill=1)
                start -= angle
        if not sum(values):
            pdf.setFillColor(line); pdf.circle(x, y, radius, stroke=0, fill=1)
        pdf.setFillColor(colors.white); pdf.circle(x, y, radius * .58, stroke=0, fill=1)
        text(sum(values), x, y + 2, 15, ink, True, center=True); text("TOTAL", x, y - 12, 6.5, muted, True, center=True)
        for i, label in enumerate(labels):
            ly = y + radius - i * 15
            pdf.setFillColor(palette[i % len(palette)]); pdf.circle(x + radius + 27, ly, 3, stroke=0, fill=1)
            text(f"{label}: {values[i]}", x + radius + 35, ly - 3, 7.5, muted)

    def table(headers, data, widths, y, row_h=20, font=7):
        x = M
        pdf.setFillColor(green_dark); pdf.roundRect(M, y - 18, sum(widths), 18, 4, stroke=0, fill=1)
        for header, width in zip(headers, widths): text(header.upper(), x + 5, y - 12, 6.5, colors.white, True); x += width
        y -= 18
        for index, row in enumerate(data):
            pdf.setFillColor(colors.white if index % 2 else soft); pdf.rect(M, y - row_h, sum(widths), row_h, stroke=0, fill=1)
            x = M
            for value, width in zip(row, widths):
                shown = str(value); limit = max(5, int(width / (font * .52)))
                if len(shown) > limit: shown = shown[:limit - 1] + "…"
                text(shown, x + 5, y - row_h + 7, font, ink); x += width
            y -= row_h
        return y

    # 1 Cover
    pdf.setFillColor(green_dark); pdf.rect(0, 0, W, H, stroke=0, fill=1)
    pdf.setFillColor(colors.HexColor("#126437")); pdf.circle(W + 35, H - 120, 190, stroke=0, fill=1)
    pdf.setFillColor(colors.HexColor("#1A7D45")); pdf.circle(-30, 100, 165, stroke=0, fill=1)
    logo(M + 23, H - 72, 1.25); text("SMART E-WASTE", M + 58, H - 67, 15, colors.white, True); text("COLLECTION SYSTEM", M + 58, H - 84, 8, colors.HexColor("#BCE7C8"), True)
    text("MONTHLY", M, H - 205, 13, lime, True); text("PERFORMANCE", M, H - 248, 34, colors.white, True); text("REPORT", M, H - 289, 34, colors.white, True)
    text(month_label.upper(), M, H - 325, 14, colors.HexColor("#DDF5E4"), True)
    # eco illustration
    pdf.setStrokeColor(colors.HexColor("#B8E986")); pdf.setLineWidth(3)
    pdf.circle(W - 145, H - 365, 88, stroke=1, fill=0); pdf.circle(W - 145, H - 365, 65, stroke=1, fill=0)
    text("♻", W - 145, H - 391, 64, colors.white, True, center=True)
    pdf.setStrokeColor(colors.HexColor("#75C98F")); pdf.line(W - 230, H - 470, W - 60, H - 470)
    for i, label in enumerate(("DEVICE", "RECYCLE", "RESTORE")): text(label, W - 225 + i * 65, H - 489, 6.5, colors.HexColor("#BCE7C8"), True)
    pdf.setFillColor(colors.HexColor("#F4FFF6")); pdf.roundRect(M, 70, W - 2*M, 125, 12, stroke=0, fill=1)
    details = [("Prepared By", prepared_by), ("Organization", "Smart E-Waste Collection System"), ("Report ID", report_id), ("Date Generated", generated)]
    for i, (label, value) in enumerate(details):
        cx = M + 20 + (i % 2) * 245; cy = 165 - (i // 2) * 50
        text(label.upper(), cx, cy, 6.5, muted, True); text(value, cx, cy - 16, 9, ink, True)
    text("CONFIDENTIAL • FOR AUTHORIZED REVIEW", W / 2, 39, 7, colors.HexColor("#C6EBD0"), True, center=True)
    pdf.showPage()

    # 2 Contents
    chrome(2, "Table of Contents"); y = heading("Table of Contents", "Executive-level monthly operational report")
    contents = [("01", "Executive Summary & Monthly Overview", 3), ("02", "Collection Performance & Device Categories", 4), ("03", "Collector Performance & Collection Centers", 5), ("04", "User Activity & Environmental Impact", 6), ("05", "Request Status & Geographic Distribution", 7), ("06", "Recent Collection Activities", 8), ("07", "Issues, Recommendations, Conclusion & Appendix", 9)]
    for number, label, page in contents:
        pdf.setFillColor(soft); pdf.roundRect(M, y - 44, W - 2*M, 35, 7, stroke=0, fill=1)
        text(number, M + 13, y - 31, 11, green, True); text(label, M + 52, y - 31, 10, ink, True); text(page, W - M - 13, y - 31, 10, green, True, right=True); y -= 48
    y = section("Report Scope", y - 10)
    wrap("This report summarizes pickup demand, collection outcomes, user adoption, collector performance, and estimated environmental benefits for the selected month. Estimates are clearly identified; unavailable modules are never represented as measured data.", M, y, 105, 9, 14)
    pdf.showPage()

    # 3 Executive and overview
    chrome(3, "Executive Summary"); y = heading("Executive Summary", f"Performance snapshot for {month_label}")
    summary = f"The system recorded {total} pickup requests and completed {completed} collections during the reporting period, achieving a {success_rate:.1f}% completion rate. {assigned} requests remain assigned, {pending} await assignment, and {cancelled} were cancelled."
    y = wrap(summary, M, y, 105, 10, 15, ink) - 12
    cw = (W - 2*M - 18) / 4
    for i, args in enumerate((("Total Requests", total, green), ("Completed", completed, lime), ("Pending", pending, amber), ("Active Users", active_users, blue))): card(M + i*(cw+6), y, cw, 72, args[0], args[1], args[2])
    y -= 94; y = section("Monthly Overview", y)
    metrics = [("Registered Users", len(users)), ("New Users", new_users), ("Assigned Requests", assigned), ("Cancelled", cancelled), ("Avg Response", f"{avg_response:.1f} h" if avg_response is not None else "N/A"), ("Avg Collection", f"{avg_collection:.1f} h" if avg_collection is not None else "N/A")]
    cw = (W - 2*M - 12) / 3
    for i, (label, value) in enumerate(metrics): card(M + (i%3)*(cw+6), y - (i//3)*78, cw, 65, label, value, palette[i%len(palette)])
    y -= 176; y = section("Overall System Performance", y)
    performance = round(success_rate)
    text(f"{performance}%", M, y - 27, 28, green_dark, True); text("MONTHLY COMPLETION INDEX", M + 85, y - 15, 8, muted, True)
    pdf.setFillColor(line); pdf.roundRect(M + 85, y - 34, 370, 10, 5, stroke=0, fill=1); pdf.setFillColor(green); pdf.roundRect(M + 85, y - 34, 370*performance/100 if performance else 0, 10, 5, stroke=0, fill=1)
    text("Collection centers: Not tracked in the current system data model", M, y - 58, 8, muted)
    pdf.showPage()

    # 4 Collection and categories
    chrome(4, "Collection Performance"); y = heading("Collection Performance", "Volume, success and device category analysis")
    for i, args in enumerate((("Devices Collected", completed_devices), ("Success Rate", f"{success_rate:.1f}%"), ("Daily Average", f"{completed/max(len(daily),1):.1f}"), ("Top Week", f"Week {top_week}" if top_week else "N/A"))): card(M+i*(cw+6), y, cw, 66, args[0], args[1], palette[i])
    y -= 92; y = section("Weekly Collection Trend", y)
    bar_chart([weekly[i] for i in range(1,6)], [f"W{i}" for i in range(1,6)], M, y-125, W-2*M, 120)
    y -= 165; y = section("Device Category Analysis", y)
    categories = ["Mobile Phones", "Laptops", "Desktop Computers", "Batteries", "Printers", "Televisions", "Other Electronics"]
    values = [category_counts[item] for item in categories]
    donut(values, categories, M + 85, y - 83, 55)
    bar_chart(values, ["Phones", "Laptops", "Desktop", "Battery", "Printer", "TV", "Other"], M + 285, y - 130, 230, 125, blue)
    pdf.showPage()

    # 5 Collectors and centers
    chrome(5, "Collector Performance"); y = heading("Collector Performance", "Assignment efficiency and completion outcomes")
    ranked = sorted(collector_stats.items(), key=lambda pair: (pair[1]["completed"], pair[1]["assigned"]), reverse=True)
    collector_rows = []
    for index, (collector, data) in enumerate(ranked[:12]):
        rate = data["completed"] / data["assigned"] * 100 if data["assigned"] else 0
        hours = sum(data["hours"])/len(data["hours"]) if data["hours"] else None
        rating = "Excellent" if rate >= 90 else "Good" if rate >= 70 else "Needs focus"
        name = collector.get_full_name() or collector.username
        collector_rows.append((f"★ {name}" if index == 0 else name, data["assigned"], data["completed"], f"{rate:.0f}%", f"{hours:.1f} h" if hours is not None else "N/A", rating))
    if not collector_rows: collector_rows = [("No collector activity", "-", "-", "-", "-", "-")]
    y = table(["Collector", "Assigned", "Completed", "Rate", "Avg Response", "Rating"], collector_rows, [145,65,70,55,90,92], y, 22, 7.5) - 28
    y = section("Collection Centers", y)
    pdf.setFillColor(colors.HexColor("#FFF8E7")); pdf.setStrokeColor(colors.HexColor("#F1D99A")); pdf.roundRect(M, y-95, W-2*M, 82, 9, stroke=1, fill=1)
    text("DATA MODULE NOT AVAILABLE", M+18, y-38, 10, amber, True)
    wrap("Collection center name, district, processed requests, device totals, and center completion rates are not stored by the current application. Add a CollectionCenter model and associate requests with centers to activate this section.", M+18, y-56, 100, 8, 12, muted)
    pdf.showPage()

    # 6 Users and environment
    chrome(6, "User Activity & Environmental Impact"); y = heading("User Activity", "Adoption indicators and estimated sustainability outcomes")
    growth = new_users / max(len(users)-new_users, 1) * 100
    for i, args in enumerate((("New Registrations", new_users), ("Active Users", active_users), ("Monthly Growth", f"{growth:.1f}%"), ("Requests Submitted", total))): card(M+i*(cw+6), y, cw, 66, args[0], args[1], palette[i])
    y -= 92
    pdf.setFillColor(soft); pdf.roundRect(M, y-62, W-2*M, 52, 8, stroke=0, fill=1)
    text("LOGIN ACTIVITY", M+15, y-30, 8, muted, True); text("Not tracked", M+135, y-31, 12, ink, True)
    text("Enable an audit/session analytics model to report verified login trends.", M+240, y-30, 8, muted)
    y -= 90; y = section("Environmental Impact (Estimated)", y)
    kg = completed_devices * 3.4; co2 = completed_devices * 2.1
    env = [("E-waste Recycled", f"{kg:.1f} kg"), ("CO₂ Prevented", f"{co2:.1f} kg"), ("Batteries Disposed", category_counts["Batteries"]), ("Plastic Recycled", f"{kg*.22:.1f} kg"), ("Metal Recovered", f"{kg*.48:.1f} kg"), ("Trees Saved", f"{co2/21:.1f}"), ("Community Score", min(completed_devices*14, 1000))]
    ew = (W-2*M-12)/3
    for i,(label,value) in enumerate(env): card(M+(i%3)*(ew+6), y-(i//3)*72, ew, 60, label, value, palette[i%len(palette)])
    text("Estimates use planning factors per completed device; they are not audited material weights.", M, 66, 7, muted)
    pdf.showPage()

    # 7 Status and geography
    chrome(7, "Request Status Analysis"); y = heading("Request Status Analysis", "Current workflow distribution and service geography")
    status_values = [pending, assigned, 0, completed, cancelled]; status_labels = ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"]
    donut(status_values, status_labels, M+90, y-80, 58)
    status_rows = [(label, value, f"{value/max(total,1)*100:.1f}%") for label,value in zip(status_labels,status_values)]
    table(["Status", "Requests", "Share"], status_rows, [170,100,100], y-14, 23, 8)
    y -= 195; y = section("Geographic Distribution", y)
    addresses = Counter(item.pickup_address for item in rows)
    geo_rows = [(address, count, sum(item.quantity for item in rows if item.pickup_address == address)) for address,count in addresses.most_common(10)]
    if not geo_rows: geo_rows = [("No pickup locations recorded", "-", "-")]
    table(["Pickup Area / Address", "Requests", "Devices"], geo_rows, [310,90,90], y, 22, 7.5)
    text("District, region, coordinates, and collection-center relationships are not structured fields; addresses are shown as entered.", M, 56, 7, muted)
    pdf.showPage()

    # 8 Recent activity
    chrome(8, "Recent Collection Activities"); y = heading("Recent Collection Activities", "Latest requests recorded for the reporting month")
    activity = []
    for item in rows[:24]:
        customer = item.user.get_full_name() or item.user.username
        collector = (item.assigned_collector.get_full_name() or item.assigned_collector.username) if item.assigned_collector else "Unassigned"
        activity.append((f"#{item.id}", customer, item.item_type, item.quantity, item.pickup_date.isoformat(), collector, item.status.title()))
    if not activity: activity = [("-", "No activity", "-", "-", "-", "-", "-")]
    table(["ID", "Customer", "Device", "Qty", "Pickup Date", "Collector", "Status"], activity, [42,88,90,32,72,96,70], y, 22, 6.7)
    pdf.showPage()

    # 9 Management notes and appendix
    chrome(9, "Management Review & Appendix"); y = heading("Management Review", "Challenges, recommendations and closing assessment")
    y = section("Issues & Challenges", y)
    issues = [(f"{pending} requests awaiting assignment", "Prioritize oldest pending requests."), (f"{cancelled} cancelled requests", "Review cancellation reasons and contact affected users."), ("Equipment shortages", "Not tracked; introduce operational incident logging."), ("Low participation areas", "Structured district data is required for reliable identification."), ("Technical issues", "Not tracked; introduce a support ticket register.")]
    for i,(label,note) in enumerate(issues): text(f"{i+1:02d}", M, y, 8, green, True); text(label, M+28, y, 8.5, ink, True); text(note, M+210, y, 7.5, muted); y -= 22
    y -= 6; y = section("Recommendations", y)
    recommendations = ["Increase public awareness campaigns in low-volume areas.", "Add a collection-center and district data module.", "Improve collector coverage and balance assignment workloads.", "Optimize pickup scheduling using response-time targets.", "Expand certified recycling partnerships and material weighing.", "Add audit analytics for login activity and technical incidents."]
    for i,item in enumerate(recommendations): text("●", M, y, 8, lime); text(item, M+16, y, 8.5, ink); y -= 19
    y -= 4; y = section("Conclusion", y)
    y = wrap(f"During {month_label}, the platform processed {total} requests and completed {completed} collections, representing a {success_rate:.1f}% completion rate and an estimated {kg:.1f} kg of diverted electronic waste. The next priority is to reduce pending demand, strengthen geographic data, and measure verified material outcomes.", M, y, 105, 8.5, 13, ink) - 8
    y = section("Appendix", y)
    appendix = [("Generated", generated), ("System Version", "1.0.0"), ("Data Sources", "Django users, profiles, pickup requests"), ("Definitions", "Active = enabled account; Completed = closed collection"), ("Abbreviations", "KPI: Key Performance Indicator; CO₂: Carbon dioxide"), ("Prepared By", prepared_by)]
    for label,value in appendix: text(label, M, y, 7.5, muted, True); text(value, M+105, y, 7.5, ink); y -= 17

    pdf.save(); buffer.seek(0)
    return buffer.getvalue(), f"smart_ewaste_monthly_report_{year}_{month:02d}.pdf"
