import io
import csv
from datetime import datetime
from typing import List
from sqlalchemy.orm import Session

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.units import inch

    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


class ReportService:
    def generate_pdf_report(self, db: Session) -> bytes:
        if not HAS_REPORTLAB:
            return b"ReportLab not installed. Install with: pip install reportlab"

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph("NUMA Scheduler Performance Report", styles["Title"]))
        elements.append(
            Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", styles["Normal"])
        )
        elements.append(Spacer(1, 0.25 * inch))

        from app.models import SystemMetric, MigrationEvent, ThreadMetric

        latest = (
            db.query(SystemMetric)
            .order_by(SystemMetric.timestamp.desc())
            .first()
        )
        if latest:
            elements.append(Paragraph("System Summary", styles["Heading2"]))
            data = [
                ["Metric", "Value"],
                ["Total CPUs", str(latest.total_cpus)],
                ["Total Memory (MB)", f"{latest.total_memory:.1f}"],
                ["CPU Usage", f"{latest.cpu_percent:.1f}%"],
                ["Running Threads", str(latest.running_threads)],
                ["Scheduler Efficiency", f"{latest.scheduler_efficiency:.1f}%"],
            ]
            t = Table(data, colWidths=[3 * inch, 2 * inch])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ]
                )
            )
            elements.append(t)
            elements.append(Spacer(1, 0.25 * inch))

        migrations = (
            db.query(MigrationEvent)
            .order_by(MigrationEvent.timestamp.desc())
            .limit(20)
            .all()
        )
        if migrations:
            elements.append(Paragraph("Recent Migrations", styles["Heading2"]))
            data = [["Thread", "Source Node", "Dest Node", "Time (ms)", "Gain (%)", "Status"]]
            for m in migrations:
                data.append(
                    [
                        str(m.tid),
                        str(m.source_node),
                        str(m.destination_node),
                        f"{m.migration_time_ms:.1f}",
                        f"{m.estimated_gain:.1f}",
                        "Success" if m.success else "Failed",
                    ]
                )
            t = Table(data, colWidths=[0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ]
                )
            )
            elements.append(t)

        doc.build(elements)
        buf.seek(0)
        return buf.getvalue()

    def generate_csv(self, db: Session, model_name: str) -> str:
        output = io.StringIO()
        writer = csv.writer(output)

        if model_name == "migrations":
            from app.models import MigrationEvent
            writer.writerow(["ID", "PID", "TID", "Source Node", "Dest Node", "Time (ms)", "Gain (%)", "Success", "Trigger", "Timestamp"])
            events = db.query(MigrationEvent).order_by(MigrationEvent.timestamp.desc()).limit(1000).all()
            for e in events:
                writer.writerow(
                    [
                        e.id,
                        e.pid,
                        e.tid,
                        e.source_node,
                        e.destination_node,
                        e.migration_time_ms,
                        e.estimated_gain,
                        "Yes" if e.success else "No",
                        e.triggered_by,
                        e.timestamp.isoformat(),
                    ]
                )
        elif model_name == "threads":
            from app.models import ThreadMetric
            writer.writerow(["ID", "PID", "TID", "CPU %", "Memory MB", "CPU", "Node", "Remote %", "Timestamp"])
            metrics = db.query(ThreadMetric).order_by(ThreadMetric.timestamp.desc()).limit(1000).all()
            for m in metrics:
                writer.writerow(
                    [
                        m.id,
                        m.pid,
                        m.tid,
                        m.cpu_usage,
                        m.memory_usage,
                        m.current_cpu,
                        m.current_node,
                        m.remote_access_ratio,
                        m.timestamp.isoformat(),
                    ]
                )
        elif model_name == "decisions":
            from app.models import SchedulerDecision
            writer.writerow(["ID", "PID", "TID", "Decision", "Confidence", "Reason", "Timestamp"])
            decisions = db.query(SchedulerDecision).order_by(SchedulerDecision.timestamp.desc()).limit(1000).all()
            for d in decisions:
                writer.writerow([d.id, d.pid, d.tid, d.decision, d.confidence_score, d.reason, d.timestamp.isoformat()])

        return output.getvalue()
