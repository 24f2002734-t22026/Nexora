import re
import warnings
from typing import Dict, List, Any
from rank_bm25 import BM25Okapi
from rapidfuzz import fuzz, process


def _tokenize(text: str) -> List[str]:
    """Simple whitespace tokenization with lowercasing."""
    if not text or not isinstance(text, str):
        return []
    return text.lower().split()


def _get_candidate_phrases(resume_text: str, n_words: int) -> List[str]:
    """
    Extracts candidate n-grams and single tokens from resume text
    to match against required skills of varying word lengths.
    """
    # Tokenize words preserving tech symbols like #, +, -, .
    tokens = re.findall(r"[a-zA-Z0-9+#.-]+", resume_text.lower())
    if not tokens:
        return []

    candidates = set(tokens)

    # If the skill is multi-word, generate n-grams of matching and adjacent lengths
    if n_words > 1:
        for n in range(max(1, n_words - 1), n_words + 2):
            for i in range(len(tokens) - n + 1):
                candidates.add(" ".join(tokens[i : i + n]))

    return list(candidates)


def keyword_match(
    jd_text: str, resumes: List[str], required_skills: List[str]
) -> Dict[str, Any]:
    """
    Computes BM25 relevance scores and fuzzy matches required skills for each resume.

    - Computes BM25 score for jd_text against each resume using rank_bm25 (BM25Okapi),
      simple whitespace tokenization, lowercase.
    - For each resume and for each required skill, uses rapidfuzz (process.extractOne,
      fuzz.ratio, threshold 85) to determine matched vs missing skills under OCR noise.
    - Returns index-aligned dict with entries matching the resumes input list.

    Args:
        jd_text (str): Job description text.
        resumes (List[str]): List of resume text strings.
        required_skills (List[str]): List of required skills to check against.

    Returns:
        dict: {
            "bm25_scores": List[float],
            "matched_skills": List[List[str]],
            "missing_skills": List[List[str]]
        }
    """
    if not resumes or not isinstance(resumes, list):
        return {
            "bm25_scores": [],
            "matched_skills": [],
            "missing_skills": []
        }

    try:
        # Step 1: BM25 Scoring
        tokenized_corpus = [_tokenize(r) if r.strip() else [""] for r in resumes]
        bm25 = BM25Okapi(tokenized_corpus)

        tokenized_query = _tokenize(jd_text)
        if tokenized_query:
            raw_scores = bm25.get_scores(tokenized_query)
            bm25_scores = [float(s) for s in raw_scores]
        else:
            bm25_scores = [0.0] * len(resumes)

        # Step 2: Fuzzy Skill Matching (Threshold: 85)
        all_matched_skills: List[List[str]] = []
        all_missing_skills: List[List[str]] = []

        for resume in resumes:
            if not resume or not isinstance(resume, str) or not resume.strip():
                all_matched_skills.append([])
                all_missing_skills.append(list(required_skills))
                continue

            resume_matched = []
            resume_missing = []

            for skill in required_skills:
                skill_clean = skill.strip()
                if not skill_clean:
                    continue

                skill_words_count = len(skill_clean.split())
                candidates = _get_candidate_phrases(resume, skill_words_count)

                if not candidates:
                    resume_missing.append(skill_clean)
                    continue

                # Fuzzy match skill against resume candidate tokens/phrases
                match = process.extractOne(
                    skill_clean.lower(),
                    candidates,
                    scorer=fuzz.ratio,
                    score_cutoff=85
                )

                if match:
                    resume_matched.append(skill_clean)
                else:
                    resume_missing.append(skill_clean)

            all_matched_skills.append(resume_matched)
            all_missing_skills.append(resume_missing)

        return {
            "bm25_scores": bm25_scores,
            "matched_skills": all_matched_skills,
            "missing_skills": all_missing_skills
        }

    except Exception as e:
        warnings.warn(f"Failed in keyword_match: {e}")
        # Return fallback aligned empty structures on catastrophic failure
        return {
            "bm25_scores": [0.0] * len(resumes),
            "matched_skills": [[] for _ in resumes],
            "missing_skills": [list(required_skills) for _ in resumes]
        }
