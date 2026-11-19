"""Document text extraction engine integrating pypdf, openpyxl, pdf2image, and pytesseract."""

import io
import logging

import openpyxl
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
from pypdf import PdfReader

from app.core.config import settings

logger = logging.getLogger(__name__)


class OCREngine:
    """Extracts raw text and metadata from PDF, XLSX, and image files."""

    def __init__(self, tesseract_cmd: str | None = None) -> None:
        cmd = tesseract_cmd or settings.tesseract_cmd
        if cmd:
            pytesseract.pytesseract.tesseract_cmd = cmd

    def count_pages(self, file_bytes: bytes, filename: str) -> int:
        """Determines page/sheet count for PDF and XLSX or 1 for standard image files."""
        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                return len(reader.pages)
            except Exception as exc:
                logger.warning("Could not read PDF with pypdf: %s. Falling back to 1.", exc)
                return 1
        if lower_name.endswith(".xlsx"):
            try:
                wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True)
                count = len(wb.sheetnames)
                wb.close()
                return max(1, count)
            except Exception as exc:
                logger.warning("Could not read XLSX sheets: %s. Falling back to 1.", exc)
                return 1
        return 1

    def process_file(
        self,
        file_bytes: bytes,
        filename: str,
        lang: str = "spa+eng",
    ) -> tuple[str, int]:
        """Extracts text per page/sheet from PDF, XLSX, or image file.

        Returns (combined_text, page_count).
        """
        lower_name = filename.lower()

        # 1. Handle Excel (.xlsx) files
        if lower_name.endswith(".xlsx"):
            try:
                wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
                page_texts: list[str] = []
                for sheet in wb.worksheets:
                    lines: list[str] = []
                    for row in sheet.iter_rows(values_only=True):
                        row_vals = [
                            str(cell).strip()
                            for cell in row
                            if cell is not None and str(cell).strip()
                        ]
                        if row_vals:
                            lines.append("   ".join(row_vals))
                    page_texts.append("\n".join(lines).strip())
                wb.close()
                combined = "\n\n--- PAGE BREAK ---\n\n".join(page_texts)
                return combined, len(page_texts)
            except Exception as exc:
                logger.error("Failed to read Excel workbook: %s", exc)
                raise RuntimeError(f"Error processing XLSX file: {exc}") from exc

        # 2. Handle PDF files
        if lower_name.endswith(".pdf"):
            # Fast path: try digital text extraction with pypdf
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                digital_pages = [page.extract_text() or "" for page in reader.pages]
                if any(len(p.strip()) > 20 for p in digital_pages):
                    combined = "\n\n--- PAGE BREAK ---\n\n".join(p.strip() for p in digital_pages)
                    return combined, len(digital_pages)
            except Exception as exc:
                logger.debug("Digital text extraction failed, falling back to OCR: %s", exc)

            # Fallback path: OCR via pdf2image and pytesseract
            try:
                images = convert_from_bytes(file_bytes, dpi=200, fmt="png")
            except Exception as exc:
                logger.error("Failed to convert PDF to images: %s", exc)
                raise RuntimeError(f"Error converting PDF to images: {exc}") from exc

            page_texts = []
            for idx, img in enumerate(images, start=1):
                try:
                    text = pytesseract.image_to_string(img, lang=lang)
                    page_texts.append(text.strip())
                except Exception as exc:
                    logger.error("OCR failed on page %d: %s", idx, exc)
                    raise RuntimeError(f"OCR processing failed on page {idx}: {exc}") from exc

            combined_text = "\n\n--- PAGE BREAK ---\n\n".join(page_texts)
            return combined_text, len(images)

        # 3. Handle standard image files
        try:
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        except Exception as exc:
            logger.error("Failed to load image file: %s", exc)
            raise RuntimeError(f"Error loading image file: {exc}") from exc

        try:
            text = pytesseract.image_to_string(image, lang=lang)
            return text.strip(), 1
        except Exception as exc:
            logger.error("OCR failed on image: %s", exc)
            raise RuntimeError(f"OCR processing failed on image: {exc}") from exc


ocr_engine = OCREngine()
