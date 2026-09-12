import os
import re
import warnings
from typing import List, Optional
from datetime import datetime
from dateutil import parser as date_parser
from rapidfuzz import fuzz, process
import symspellpy
from symspellpy import SymSpell

_DICTIONARY_PATH = os.path.join(
    os.path.dirname(symspellpy.__file__), "frequency_dictionary_en_82_765.txt"
)
_BIGRAM_PATH = os.path.join(
    os.path.dirname(symspellpy.__file__), "frequency_bigramdictionary_en_243_342.txt"
)


def _init_symspell(custom_terms: Optional[List[str]] = None) -> SymSpell:
    """Initializes a SymSpell instance with base and custom dictionaries."""
    sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
    if os.path.exists(_DICTIONARY_PATH):
        sym_spell.load_dictionary(_DICTIONARY_PATH, term_index=0, count_index=1)
    if os.path.exists(_BIGRAM_PATH):
        try:
            sym_spell.load_bigram_dictionary(_BIGRAM_PATH, term_index=0, count_index=2)
        except Exception:
            pass

    if custom_terms:
        for term in custom_terms:
            if term and isinstance(term, str):
                clean_term = term.strip().lower()
                if clean_term:
                    sym_spell.create_dictionary_entry(clean_term, 10**9)
                    for part in clean_term.split():
                        if len(part) > 1:
                            sym_spell.create_dictionary_entry(part, 10**9)

    return sym_spell


def normalize_text(raw_text: str, custom_terms: Optional[List[str]] = None) -> str:
    """
    Normalizes raw text by correcting OCR typos and standardizing whitespace/line breaks.
    Loads standard English dictionary + custom technical/skill terms so real terms are not altered.

    Args:
        raw_text (str): Input raw text (e.g. from OCR or file extraction).
        custom_terms (Optional[List[str]]): List of tech/skill terms to protect from correction.

    Returns:
        str: Normalized text.
    """
    if not raw_text or not isinstance(raw_text, str):
        return ""

    try:
        sym_spell = _init_symspell(custom_terms)

        # Standardize line breaks
        normalized = raw_text.replace("\r\n", "\n").replace("\r", "\n")

        # Process line by line to preserve layout structure
        processed_lines = []
        for line in normalized.split("\n"):
            stripped_line = line.strip()
            if not stripped_line:
                processed_lines.append("")
                continue

            # Standardize internal whitespace for line
            cleaned_line = re.sub(r"[ \t]+", " ", stripped_line)

            # Apply OCR spell correction
            suggestions = sym_spell.lookup_compound(cleaned_line, max_edit_distance=2)
            if suggestions and suggestions[0].term:
                corrected_line = suggestions[0].term
            else:
                corrected_line = cleaned_line

            processed_lines.append(corrected_line)

        # Standardize multiple consecutive blank lines to maximum 2 newlines
        result = "\n".join(processed_lines)
        result = re.sub(r"\n{3,}", "\n\n", result).strip()
        return result

    except Exception as e:
        warnings.warn(f"Failed to normalize text: {e}")
        # Standardize whitespace as fallback
        cleaned = re.sub(r"[ \t]+", " ", raw_text.replace("\r\n", "\n").replace("\r", "\n"))
        return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


def normalize_dates(text: str) -> str:
    """
    Finds date-like substrings in text and rewrites them to YYYY-MM format
    using dateutil.parser(fuzzy=True), leaving unparseable substrings unchanged.

    Args:
        text (str): Input text containing dates.

    Returns:
        str: Text with dates formatted as YYYY-MM.
    """
    if not text or not isinstance(text, str):
        return ""

    date_regex = re.compile(
        r"(?i)\b("
        # e.g., Jan 2020, January 2020, Sept. 2021, Mar 22, Aug '20
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.,]?\s*(?:'?\d{2,4})"
        # e.g., January 15, 2020 or 15th Jan 2020
        r"|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.,]?\s+\d{1,2}(?:st|nd|rd|th)?[,\s]+\d{4}"
        r"|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.,]?\s+\d{4}"
        # e.g., 2020-05-12, 05/12/2020, 12-05-2020
        r"|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}"
        # e.g., 05/2020, 2020/05, 05-2020, 2020-05
        r"|\d{1,2}[\/\-](?:19\d\d|20\d\d)"
        r"|(?:19\d\d|20\d\d)[\/\-]\d{1,2}"
        # Standalone years: 1980 - 2030
        r"|(?:19[8-9]\d|20[0-3]\d)"
        r")\b"
    )

    def _replace_date(match: re.Match) -> str:
        date_str = match.group(0)
        try:
            parsed_dt = date_parser.parse(date_str, fuzzy=True, default=datetime(2000, 1, 1))
            return parsed_dt.strftime("%Y-%m")
        except (ValueError, OverflowError, TypeError):
            return date_str

    try:
        return date_regex.sub(_replace_date, text)
    except Exception as e:
        warnings.warn(f"Failed to normalize dates: {e}")
        return text


def normalize_headers(text: str, canonical_headers: List[str]) -> str:
    """
    Finds lines that look like section headers and replaces them with their closest canonical match
    using rapidfuzz (threshold 80), only if a line is short (<5 words) and appears on its own line.

    Args:
        text (str): Input document text.
        canonical_headers (List[str]): List of canonical header names (e.g. ['Experience', 'Education', 'Skills']).

    Returns:
        str: Text with normalized section headers.
    """
    if not text or not isinstance(text, str) or not canonical_headers:
        return text if isinstance(text, str) else ""

    lines = text.split("\n")
    processed_lines = []

    for line in lines:
        stripped = line.strip()
        words = stripped.split()

        # Check if line is short (<5 words) and non-empty
        if 0 < len(words) < 5:
            # Strip markdown formatting, trailing colons/dashes
            cleaned_header = re.sub(r"^[\s#*\-_:]+|[\s:*#\-_]+$", "", stripped).strip()
            if cleaned_header:
                match = process.extractOne(
                    cleaned_header,
                    canonical_headers,
                    scorer=fuzz.ratio,
                    score_cutoff=80,
                    processor=lambda s: s.lower()
                )
                if match:
                    processed_lines.append(match[0])
                    continue

        processed_lines.append(line)

    return "\n".join(processed_lines)
