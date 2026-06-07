from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/pdf")
async def generate_pdf_report(db: Session = Depends(get_db)):
    service = ReportService()
    pdf_bytes = service.generate_pdf_report(db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=numa_scheduler_report.pdf"},
    )


@router.get("/csv/{model}")
async def generate_csv(
    model: str,
    db: Session = Depends(get_db),
):
    if model not in ["migrations", "threads", "decisions"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid model: {model}")

    service = ReportService()
    csv_content = service.generate_csv(db, model)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={model}.csv"},
    )
