import re
from typing import Any


def _count_sentences(text: str) -> int:
    sentences = re.split(r"[.!?]+", text)
    return max(len([s for s in sentences if s.strip()]), 1)


def _count_words(text: str) -> int:
    return len(text.split())


def _has_intro_conclusion(text: str) -> tuple[bool, bool]:
    lower = text.lower()
    intro_keywords = ["introduction", "overview", "abstract", "summary", "purpose"]
    conclusion_keywords = ["conclusion", "summary", "in conclusion", "finally", "closing"]
    has_intro = any(kw in lower[:500] for kw in intro_keywords) or len(text) > 200
    has_conclusion = any(kw in lower[-500:] for kw in conclusion_keywords) or len(text) > 200
    return has_intro, has_conclusion


def _detect_structure(text: str) -> dict[str, int]:
    headings = len(re.findall(r"^(?:#{1,6}\s+|[A-Z][A-Z\s]{2,}$)", text, re.MULTILINE))
    paragraphs = len([p for p in text.split("\n\n") if p.strip()])
    lists = len(re.findall(r"^\s*[-*•]\s+", text, re.MULTILINE))
    return {"headings": headings, "paragraphs": paragraphs, "lists": lists}


def score_document(text: str) -> dict[str, Any]:
    if not text.strip():
        return {"completeness": 0, "readability": 0, "structure": 0, "overall": 0}

    word_count = _count_words(text)
    sentence_count = _count_sentences(text)
    avg_sentence_len = word_count / sentence_count
    has_intro, has_conclusion = _has_intro_conclusion(text)
    structure = _detect_structure(text)

    # Completeness (30%)
    completeness = 50
    if word_count > 100:
        completeness += 15
    if word_count > 500:
        completeness += 10
    if has_intro:
        completeness += 10
    if has_conclusion:
        completeness += 15
    completeness = min(completeness, 100)

    # Readability (30%) — Flesch-like heuristic
    if avg_sentence_len < 15:
        readability = 95
    elif avg_sentence_len < 20:
        readability = 85
    elif avg_sentence_len < 25:
        readability = 75
    elif avg_sentence_len < 30:
        readability = 65
    else:
        readability = 50

    # Structure (40%)
    structure_score = 40
    structure_score += min(structure["headings"] * 10, 30)
    structure_score += min(structure["paragraphs"] * 2, 20)
    structure_score += min(structure["lists"] * 5, 10)
    structure_score = min(structure_score, 100)

    overall = round(completeness * 0.3 + readability * 0.3 + structure_score * 0.4)

    return {
        "completeness": completeness,
        "readability": readability,
        "structure": structure_score,
        "overall": overall,
    }
