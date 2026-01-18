from pydantic import BaseModel, Field
from typing import List, Optional

class MedicationSuggestion(BaseModel):
    name: str = Field(..., description="Medication name")
    dosage: str = Field(..., description="Dosage (e.g., 500mg)")
    quantity: int = Field(..., ge=1, description="Quantity to dispense")

class OCRResponse(BaseModel):
    text: str = Field(..., description="Extracted text from image")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR confidence score")
    suggested_medications: List[MedicationSuggestion] = Field(
        default_factory=list,
        description="AI-suggested medications based on extracted text"
    )

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "ocr-service"
    version: str = "1.0.0"
    tesseract_installed: bool = True
