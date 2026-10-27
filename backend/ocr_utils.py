import pytesseract
from PIL import Image
import re
import platform

# On Windows, pytesseract needs to be told exactly where Tesseract is installed.
# Adjust this path if you installed it somewhere else.
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# Known lab parameters: pattern to find them, the unit we expect, and a normal range.
# This is intentionally simple (regex-based) rather than a full medical NLP model —
# good enough for common lab report formats as a starting point.
PARAMETER_PATTERNS = {
    "Hemoglobin": {
        "pattern": r"h[ae]moglobin[:\s]+(\d+\.?\d*)",
        "unit": "g/dL",
        "normal_low": 12.0,
        "normal_high": 17.0
    },
    "Fasting Blood Sugar": {
        "pattern": r"fasting blood sugar[:\s]+(\d+\.?\d*)",
        "unit": "mg/dL",
        "normal_low": 70.0,
        "normal_high": 100.0
    },
    "Blood Glucose": {
        "pattern": r"(?<!fasting )(?<!post prandial )blood glucose[:\s]+(\d+\.?\d*)",
        "unit": "mg/dL",
        "normal_low": 70.0,
        "normal_high": 140.0
    },
    "Total Cholesterol": {
        "pattern": r"total cholesterol[:\s]+(\d+\.?\d*)",
        "unit": "mg/dL",
        "normal_low": 0.0,
        "normal_high": 200.0
    },
    "WBC Count": {
        "pattern": r"wbc count[:\s]+(\d+\.?\d*)",
        "unit": "cells/cumm",
        "normal_low": 4000.0,
        "normal_high": 11000.0
    },
    "Platelet Count": {
        "pattern": r"platelet count[:\s]+(\d+\.?\d*)",
        "unit": "lakhs/cumm",
        "normal_low": 1.5,
        "normal_high": 4.5
    }
}


def extract_text_from_image(filepath):
    """Run OCR on an image file and return the raw extracted text."""
    try:
        image = Image.open(filepath)
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        return f"__OCR_ERROR__: {str(e)}"


def parse_values_from_text(text):
    """
    Look through OCR text for known lab parameters using regex.
    Returns a list of dicts ready to be saved as ExtractedValue rows.
    """
    results = []
    lower_text = text.lower()

    for param_name, config in PARAMETER_PATTERNS.items():
        match = re.search(config["pattern"], lower_text, re.IGNORECASE)
        if match:
            try:
                value = float(match.group(1))
            except (ValueError, IndexError):
                continue

            is_abnormal = not (config["normal_low"] <= value <= config["normal_high"])

            results.append({
                "parameter_name": param_name,
                "value": value,
                "unit": config["unit"],
                "normal_range_low": config["normal_low"],
                "normal_range_high": config["normal_high"],
                "is_abnormal": is_abnormal
            })

    return results