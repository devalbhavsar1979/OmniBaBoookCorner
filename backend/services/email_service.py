import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional

from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Status label maps ─────────────────────────────────────────────────────────

STATUS_LABELS = {
    "REQUESTED":           "Request Placed",
    "REQUEST_ACCEPTED":    "Request Accepted",
    "VOLUNTEER_PICKED":    "Book Picked Up from Library",
    "VOLUNTEER_DELIVERED": "Book Delivered to Reader",
    "ISSUED":              "Book Issued",
    "RETURN_REQUESTED":    "Return Requested",
    "RETURN_PICKED":       "Return Picked Up",
    "RETURN_DELIVERED":    "Return Delivered to Library",
    "AVAILABLE":           "Return Confirmed — Book Available",
}

STATUS_ICONS = {
    "REQUESTED":           "📖",
    "REQUEST_ACCEPTED":    "✋",
    "VOLUNTEER_PICKED":    "📦",
    "VOLUNTEER_DELIVERED": "🚚",
    "ISSUED":              "✅",
    "RETURN_REQUESTED":    "↩️",
    "RETURN_PICKED":       "📦",
    "RETURN_DELIVERED":    "🏛️",
    "AVAILABLE":           "🎉",
}

STATUS_ACTOR = {
    "REQUESTED":           "Reader",
    "REQUEST_ACCEPTED":    "Volunteer",
    "VOLUNTEER_PICKED":    "Volunteer",
    "VOLUNTEER_DELIVERED": "Volunteer",
    "ISSUED":              "Library Owner",
    "RETURN_REQUESTED":    "Reader",
    "RETURN_PICKED":       "Volunteer",
    "RETURN_DELIVERED":    "Volunteer",
    "AVAILABLE":           "Library Owner",
}

STATUS_ORDER = [
    "REQUESTED", "REQUEST_ACCEPTED", "VOLUNTEER_PICKED",
    "VOLUNTEER_DELIVERED", "ISSUED", "RETURN_REQUESTED",
    "RETURN_PICKED", "RETURN_DELIVERED", "AVAILABLE",
]

STATUS_COLORS = {
    "REQUESTED":           "#E65100",
    "REQUEST_ACCEPTED":    "#0D47A1",
    "VOLUNTEER_PICKED":    "#4A148C",
    "VOLUNTEER_DELIVERED": "#004D40",
    "ISSUED":              "#1B5E20",
    "RETURN_REQUESTED":    "#BF360C",
    "RETURN_PICKED":       "#4A148C",
    "RETURN_DELIVERED":    "#004D40",
    "AVAILABLE":           "#1B5E20",
}


def _fmt_ts(ts: Optional[datetime]) -> str:
    if not ts:
        return ""
    return ts.strftime("%d %b %Y, %I:%M %p UTC")


def _build_timeline_rows(req, reader_name: str, volunteer_name: Optional[str], owner_name: str) -> str:
    """Build HTML rows for the timeline table."""

    ts_map = {
        "REQUESTED":           req.requested_at,
        "REQUEST_ACCEPTED":    req.accepted_at,
        "VOLUNTEER_PICKED":    req.picked_at,
        "VOLUNTEER_DELIVERED": req.delivered_at,
        "ISSUED":              req.issued_at,
        "RETURN_REQUESTED":    req.return_requested_at,
        "RETURN_PICKED":       req.return_picked_at,
        "RETURN_DELIVERED":    req.return_delivered_at,
        "AVAILABLE":           req.closed_at,
    }

    actor_name_map = {
        "Reader":        reader_name,
        "Volunteer":     volunteer_name or "—",
        "Library Owner": owner_name,
    }

    current_status = req.status.value if hasattr(req.status, "value") else str(req.status)
    current_idx = STATUS_ORDER.index(current_status) if current_status in STATUS_ORDER else 0

    rows_html = ""
    for status in STATUS_ORDER:
        ts = ts_map.get(status)
        is_done = ts is not None
        is_current = status == current_status
        step_idx = STATUS_ORDER.index(status)

        # Skip pending return steps if not yet issued
        if step_idx > STATUS_ORDER.index("ISSUED") and not req.issued_at and not is_done:
            continue

        icon = STATUS_ICONS.get(status, "•")
        label = STATUS_LABELS.get(status, status)
        actor_role = STATUS_ACTOR.get(status, "")
        actor_name = actor_name_map.get(actor_role, "")

        if is_done:
            circle_bg = "#2E7D50"
            circle_text = "✓"
            row_opacity = "1"
            ts_text = _fmt_ts(ts)
            actor_html = f"""
                <div style="margin-top:4px;">
                  <span style="display:inline-block;background:#F0F4FF;border:1px solid #C5D0E8;
                               border-radius:4px;padding:2px 8px;font-size:12px;color:#1E4D8C;">
                    {actor_role}: <strong>{actor_name}</strong>
                  </span>
                  <span style="font-size:12px;color:#888;margin-left:8px;">🕐 {ts_text}</span>
                </div>"""
        elif is_current:
            circle_bg = "#C4704A"
            circle_text = "●"
            row_opacity = "1"
            actor_html = """
                <div style="margin-top:4px;">
                  <span style="display:inline-block;background:#FBF0EA;border:1px solid #C4704A;
                               border-radius:999px;padding:2px 10px;font-size:11px;
                               color:#C4704A;font-weight:700;letter-spacing:0.05em;">
                    CURRENT STATUS
                  </span>
                </div>"""
        else:
            circle_bg = "#E0E0E0"
            circle_text = icon
            row_opacity = "0.4"
            actor_html = '<div style="margin-top:4px;font-size:12px;color:#999;font-style:italic;">Pending</div>'

        rows_html += f"""
        <tr style="opacity:{row_opacity};">
          <td style="width:48px;padding:8px 4px;vertical-align:top;text-align:center;">
            <div style="width:36px;height:36px;border-radius:50%;background:{circle_bg};
                        color:white;display:flex;align-items:center;justify-content:center;
                        font-size:14px;font-weight:700;margin:0 auto;
                        line-height:36px;text-align:center;">
              {circle_text}
            </div>
          </td>
          <td style="padding:8px 12px;vertical-align:top;border-bottom:1px solid #F0F0F0;">
            <div style="font-weight:600;font-size:14px;color:#1A1A2E;">{label}</div>
            {actor_html}
          </td>
        </tr>
        {"" if status == STATUS_ORDER[-1] else
         '<tr><td style="padding:0 4px;"><div style="width:2px;height:12px;background:'
         + ("#2E7D50" if is_done else "#E0E0E0")
         + ';margin:0 auto;"></div></td><td></td></tr>'}
        """

    return rows_html


def build_email_html(
    req,
    book,
    library,
    owner: "User",
    reader: "User",
    volunteer: Optional["User"],
    new_status: str,
) -> str:
    """Build the full HTML email body."""

    reader_name = reader.full_name
    volunteer_name = volunteer.full_name if volunteer else None
    owner_name = owner.full_name
    status_label = STATUS_LABELS.get(new_status, new_status)
    status_color = STATUS_COLORS.get(new_status, "#1E4D8C")
    timeline_rows = _build_timeline_rows(req, reader_name, volunteer_name, owner_name)

    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Arial,sans-serif;">

  <div style="max-width:580px;margin:32px auto;background:#FFFFFF;border-radius:10px;
              overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:#1E4D8C;padding:28px 32px;">
      <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#FFFFFF;">
        Ba Book Corner
      </div>
      <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#A8C8FF;margin-top:4px;">
        Ba Foundation · Share · Read · Return
      </div>
    </div>

    <!-- Status banner -->
    <div style="background:{status_color};padding:16px 32px;">
      <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.8);">
        Request Update
      </div>
      <div style="font-size:20px;font-weight:700;color:#FFFFFF;margin-top:4px;">
        {STATUS_ICONS.get(new_status, "📬")} {status_label}
      </div>
    </div>

    <!-- Greeting -->
    <div style="padding:24px 32px 0;">
      <p style="font-size:15px;color:#1A1A2E;margin:0 0 6px;">
        Dear <strong>{reader_name}</strong>,
      </p>
      <p style="font-size:14px;color:#555;margin:0;">
        Your book request has been updated. Here are the current details:
      </p>
    </div>

    <!-- Book details -->
    <div style="margin:20px 32px;background:#FAF7F2;border:1px solid #E0D5C0;
                border-radius:8px;padding:18px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;width:110px;">Book</td>
          <td style="padding:5px 0;font-size:14px;font-weight:600;color:#1A1A2E;">
            {book.title}
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;">Author</td>
          <td style="padding:5px 0;font-size:14px;color:#3D3228;">{book.author}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;">Genre</td>
          <td style="padding:5px 0;font-size:14px;color:#3D3228;">{book.genre} · {book.language}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;">Library</td>
          <td style="padding:5px 0;font-size:14px;color:#3D3228;">
            {library.name}<br>
            <span style="font-size:12px;color:#8B7D6B;">
              {library.address}, {library.city}, {library.state}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;">Librarian</td>
          <td style="padding:5px 0;font-size:14px;color:#3D3228;">
            {owner_name}
            {f'<br><span style="font-size:12px;color:#8B7D6B;">{owner.email}</span>' if owner.email else ''}
            {f'<br><span style="font-size:12px;color:#8B7D6B;">📞 {owner.phone}</span>' if owner.phone else ''}
          </td>
        </tr>
        {f'''<tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;">Volunteer</td>
          <td style="padding:5px 0;font-size:14px;color:#3D3228;">
            {volunteer_name}
            {f'<br><span style="font-size:12px;color:#8B7D6B;">{volunteer.email}</span>' if volunteer and volunteer.email else ''}
          </td>
        </tr>''' if volunteer_name else ''}
        <tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;">Deliver to</td>
          <td style="padding:5px 0;font-size:14px;color:#3D3228;">{req.delivery_address}</td>
        </tr>
        {f'''<tr>
          <td style="padding:5px 0;font-size:12px;text-transform:uppercase;
                     letter-spacing:0.06em;color:#8B7D6B;">Notes</td>
          <td style="padding:5px 0;font-size:14px;color:#3D3228;">{req.delivery_notes}</td>
        </tr>''' if req.delivery_notes else ''}
      </table>
    </div>

    <!-- Timeline -->
    <div style="margin:0 32px 24px;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;
                  letter-spacing:0.08em;color:#8B7D6B;margin-bottom:12px;">
        Request Timeline
      </div>
      <table style="width:100%;border-collapse:collapse;">
        {timeline_rows}
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#1A1208;padding:20px 32px;text-align:center;">
      <div style="font-size:12px;color:#8B7D6B;">
        Ba Book Corner · Ba Foundation<br>
        This is an automated notification. Please do not reply to this email.
      </div>
    </div>

  </div>
</body>
</html>
"""


def send_status_email(
    req,
    book,
    library,
    owner: "User",
    reader: "User",
    volunteer: Optional["User"],
    new_status: str,
) -> None:
    """Send status update email to the reader. Fails silently so it never breaks the main flow."""

    if not settings.EMAIL_ENABLED:
        logger.info(f"Email disabled — skipping notification for request {req.id} → {new_status}")
        return

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured — skipping email")
        return

    try:
        status_label = STATUS_LABELS.get(new_status, new_status)
        subject = f"Ba Book Corner — {status_label} | {book.title}"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.email_from_address}>"
        msg["To"] = reader.email

        html_body = build_email_html(req, book, library, owner, reader, volunteer, new_status)
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.email_from_address, reader.email, msg.as_string())

        logger.info(f"Status email sent to {reader.email} for request {req.id} → {new_status}")

    except Exception as e:
        # Email failure must NEVER break the main request flow
        logger.error(f"Failed to send email for request {req.id}: {e}")
