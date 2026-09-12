import os
import warnings
from typing import Optional

_EASYOCR_READER = None


def _get_easyocr_reader():
    """Lazily initialize and cache the EasyOCR Reader."""
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        import easyocr
        _EASYOCR_READER = easyocr.Reader(['en'], verbose=False)
    return _EASYOCR_READER


def _extract_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file.
    Tries pdfplumber first. If text is empty or near-empty (<30 chars),
    falls back to easyOCR on page images.
    """
    import pdfplumber

    extracted_pages = []
    total_text_len = 0

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            page_text = page_text.strip()
            if page_text:
                extracted_pages.append(page_text)
                total_text_len += len(page_text)

        # If pdfplumber found meaningful text, preserve paragraph breaks
        if total_text_len >= 30:
            return "\n\n".join(extracted_pages)

        # Fallback to easyOCR for scanned / image-based PDFs
        import numpy as np

        reader = _get_easyocr_reader()
        ocr_pages = []

        for page in pdf.pages:
            # Convert page to image
            img_obj = page.to_image(resolution=200)
            pil_img = img_obj.original
            np_img = np.array(pil_img)

            # Perform OCR
            page_lines = reader.readtext(np_img, detail=0)
            if page_lines:
                ocr_pages.append("\n".join(page_lines))

        return "\n\n".join(ocr_pages)


def _extract_docx(file_path: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    import docx
    doc = docx.Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text(file_path: str) -> str:
    """
    Extract text from a resume file (.pdf or .docx).

    - If .pdf: Tries pdfplumber first (preserving paragraph breaks).
      If empty/near-empty, falls back to easyOCR.
    - If .docx: Uses python-docx to join paragraph text.
    - Returns empty string (not an exception) if a file totally fails,
      and prints a warning with the filename.

    Args:
        file_path (str): Absolute or relative path to the resume file.

    Returns:
        str: Extracted text content or empty string on failure.
    """
    if not isinstance(file_path, str) or not file_path.strip():
        print(f"Warning: Invalid file path provided: '{file_path}'")
        return ""

    if not os.path.exists(file_path):
        print(f"Warning: File not found: '{file_path}'")
        return ""

    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".pdf":
            return _extract_pdf(file_path)
        elif ext == ".docx":
            return _extract_docx(file_path)
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            print(f"Warning: Unsupported file extension '{ext}' for file: '{file_path}'")
            return ""
    except Exception as e:
        print(f"Warning: Failed to extract text from '{file_path}': {e}")
        return ""
