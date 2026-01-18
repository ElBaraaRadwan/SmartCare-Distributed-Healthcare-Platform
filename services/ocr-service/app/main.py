from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import pytesseract
from PIL import Image
import io
import re
import logging

from app.config import settings
from app.models import OCRResponse, MedicationSuggestion, HealthResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SmartCare OCR Service",
    description="Prescription image OCR processing service",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Verify Tesseract is available
        version = pytesseract.get_tesseract_version()
        tesseract_ok = True
    except Exception as e:
        logger.error(f"Tesseract not available: {e}")
        tesseract_ok = False

    return HealthResponse(
        status="ok" if tesseract_ok else "degraded",
        tesseract_installed=tesseract_ok
    )

# OCR processing endpoint
@app.post("/ocr", response_model=OCRResponse)
async def process_prescription_image(file: UploadFile = File(...)):
    """
    Extract text from prescription image using Tesseract OCR

    Args:
        file: Image file (jpg, png, pdf)

    Returns:
        OCRResponse with extracted text, confidence, and medication suggestions
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (jpg, png, pdf)"
        )

    # Check file size (10MB limit)
    max_size = settings.max_file_size_mb * 1024 * 1024

    try:
        # Read image
        contents = await file.read()

        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds {settings.max_file_size_mb}MB limit"
            )

        # Open image with PIL
        image = Image.open(io.BytesIO(contents))

        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Perform OCR
        logger.info(f"Processing image: {file.filename}")
        ocr_text = pytesseract.image_to_string(image)

        # Calculate confidence
        confidence = calculate_confidence(ocr_text)

        # Extract medication suggestions
        medications = extract_medications(ocr_text)

        logger.info(f"OCR completed. Confidence: {confidence:.2f}")

        return OCRResponse(
            text=ocr_text.strip(),
            confidence=confidence,
            suggested_medications=medications
        )

    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

# Batch processing endpoint
@app.post("/ocr/batch")
async def process_batch(files: List[UploadFile] = File(...)):
    """
    Process multiple prescription images

    Args:
        files: List of image files

    Returns:
        List of processing results
    """
    results = []

    for file in files:
        try:
            result = await process_prescription_image(file)
            results.append({
                "filename": file.filename,
                "success": True,
                "data": result.dict()
            })
        except HTTPException as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": e.detail
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e)
            })

    return {
        "results": results,
        "total": len(files),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"])
    }

# Helper functions
def calculate_confidence(text: str) -> float:
    """
    Calculate OCR confidence based on text quality
    Simple heuristic: more alphanumeric chars = higher confidence
    """
    if not text:
        return 0.0

    # Count alphanumeric characters
    alnum_count = sum(c.isalnum() for c in text)
    total_count = len(text.replace(" ", "").replace("\n", ""))

    if total_count == 0:
        return 0.0

    confidence = min(alnum_count / total_count, 1.0)
    return round(confidence, 2)

def extract_medications(text: str) -> List[MedicationSuggestion]:
    """
    Extract medication information from OCR text
    Uses regex patterns to identify drug names, dosages, quantities
    """
    medications = []

    # Common medication patterns
    # Format: Drug Name 500mg x30 or Drug Name 500mg #30
    patterns = [
        r'([A-Z][a-z]+(?:cillin|mycin|profen|oxin|ol|ine))\s+(\d+\s*mg)\s+(?:x|×|#)?\s*(\d+)',
        r'([A-Z][a-z]{3,})\s+(\d+\s*mg)\s+(?:x|×|#)?\s*(\d+)',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            medications.append(MedicationSuggestion(
                name=match[0].capitalize(),
                dosage=match[1].replace(" ", ""),
                quantity=int(match[2])
            ))

    # If no pattern matches, look for common drug names
    if not medications:
        common_drugs = [
            "Amoxicillin", "Azithromycin", "Ciprofloxacin",
            "Ibuprofen", "Paracetamol", "Metformin", "Aspirin",
            "Omeprazole", "Simvastatin", "Lisinopril"
        ]

        for drug in common_drugs:
            if drug.lower() in text.lower():
                medications.append(MedicationSuggestion(
                    name=drug,
                    dosage="500mg",  # Default
                    quantity=30       # Default
                ))

    # Remove duplicates
    seen = set()
    unique_medications = []
    for med in medications:
        key = (med.name.lower(), med.dosage, med.quantity)
        if key not in seen:
            seen.add(key)
            unique_medications.append(med)

    return unique_medications

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "SmartCare OCR Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "ocr": "/ocr",
            "batch": "/ocr/batch"
        }
    }
