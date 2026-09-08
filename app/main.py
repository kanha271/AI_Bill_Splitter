import os
from typing import Dict, List, Optional

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .extractor import extract_bill
from .models import Bill, ExtractionResponse
from .splitter import split_bill


app = FastAPI(
    title="AI Bill Splitter",
    description="AI-powered receipt extraction and fair bill splitting",
    version="1.0.0"
)


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static"
)


@app.get("/")
async def home():
    return FileResponse(
        "app/static/index.html"
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "AI Bill Splitter"
    }


@app.post("/upload")
async def upload_bill(
    file: UploadFile = File(...)
):
    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:
        buffer.write(
            await file.read()
        )

    return {
        "message": "Bill uploaded successfully",
        "filename": file.filename
    }


@app.post(
    "/extract",
    response_model=ExtractionResponse
)
async def extract_bill_endpoint(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    try:

        with open(file_path, "wb") as buffer:
            buffer.write(
                await file.read()
            )

        bill = await extract_bill(
            file_path
        )

        return ExtractionResponse(
            success=True,
            bill=bill,
            message="Bill extracted successfully"
        )

    except Exception as e:

        error_text = str(e)

        print(
            f"Extraction error: "
            f"{type(e).__name__}: {error_text}"
        )

        if "429" in error_text or "quota" in error_text.lower():

            message = (
                "AI extraction quota is temporarily "
                "exhausted. Please try again later."
            )

        else:

            message = (
                f"Extraction failed: {error_text}"
            )

        return ExtractionResponse(
            success=False,
            bill=None,
            message=message
        )


class SplitRequest(BaseModel):

    bill: Bill

    people: List[str] = Field(
        ...,
        min_length=1
    )

    assignments: Dict[
        str,
        Dict[str, float]
    ]


class SplitResponse(BaseModel):

    success: bool

    results: Optional[dict] = None

    message: str


@app.post(
    "/split",
    response_model=SplitResponse
)
async def split_bill_endpoint(
    request: SplitRequest
):

    try:

        results = split_bill(

            items=[
                item.model_dump()
                for item in request.bill.items
            ],

            people=request.people,

            assignments=request.assignments,

            discount=request.bill.discount,

            tax=request.bill.tax,

            service_charge=request.bill.service_charge
        )

        return SplitResponse(
            success=True,
            results=results,
            message="Bill split successfully"
        )

    except Exception as e:

        print(
            f"Split error: "
            f"{type(e).__name__}: {e}"
        )

        return SplitResponse(
            success=False,
            results=None,
            message=f"Split failed: {e}"
        )