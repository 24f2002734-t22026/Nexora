import re
import warnings
from typing import List, Set

# Curated list of common tech keywords and frameworks for fallback & extraction
KNOWN_TECH_KEYWORDS = [
    "Python", "Java", "C++", "C#", "C", "Go", "Golang", "Rust", "TypeScript", "JavaScript",
    "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "SQL", "HTML", "CSS", "Bash", "Shell",
    "React", "React Native", "Next.js", "Vue.js", "Angular", "Node.js", "Express.js",
    "Django", "Flask", "FastAPI", "Spring Boot", "ASP.NET", "GraphQL", "REST APIs",
    "Docker", "Kubernetes", "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB",
    "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "Terraform", "Ansible", "Linux",
    "PyTorch", "TensorFlow", "Keras", "Scikit-learn", "Pandas", "NumPy", "OpenCV",
    "Hugging Face", "Transformers", "NLP", "Computer Vision", "Deep Learning",
    "Machine Learning", "LLMs", "Generative AI", "Spark", "Kafka", "Hadoop", "Airflow",
    "Snowflake", "Databricks", "BigQuery", "Tableau", "Power BI", "Microservices"
]

# Section header patterns indicating required skills
SECTION_PATTERNS = [
    r"(?im)^[#*\s-]*(?:required\s+skills|requirements|qualifications|technical\s+skills|key\s+skills|skills\s*(?:&|and)\s*qualifications|skills\s*(?:&|and)\s*requirements|core\s+competencies|must\s+haves?|what\s+you(?:'ll)?\s+need|what\s+we\s+are\s+looking\s+for|what\s+you\s+bring|technologies|technical\s+requirements)\b.*$"
]

# Boundary patterns that mark the end of the skills section
BOUNDARY_PATTERNS = [
    r"(?im)^[#*\s-]*(?:about\s+us|company\s+overview|responsibilities|roles?\s*(?:&|and)\s*responsibilities|what\s+you(?:'ll)?\s+do|benefits|perks|compensation|nice\s+to\s+have|preferred\s+qualifications|bonus\s+points|how\s+to\s+apply|equal\s+opportunity)\b.*$"
]

# Common noise prefix phrases to strip from extracted skill lines
NOISE_PREFIXES = [
    r"(?i)^(?:proficiency\s+in|proficient\s+with|experience\s+with|experience\s+in|hands-on\s+experience\s+with|hands-on\s+with|strong\s+experience\s+with|working\s+knowledge\s+of|knowledge\s+of|deep\s+understanding\s+of|solid\s+understanding\s+of|understanding\s+of|ability\s+to\s+work\s+with|expertise\s+in|familiarity\s+with|skills?\s*:\s*)\s*",
    r"(?i)^\d+\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience\s+(?:in|with))?\s*",
    r"^[•\-\*–—\d\.\)\(\]]+\s*"
]


def _clean_skill_item(raw_item: str) -> str:
    """Cleans a single candidate skill string."""
    item = raw_item.strip()
    for prefix_pattern in NOISE_PREFIXES:
        item = re.sub(prefix_pattern, "", item).strip()
    # Strip trailing punctuation
    item = re.sub(r"[,;:\.\(\)]+$", "", item).strip()
    return item


def _extract_from_section(section_text: str) -> List[str]:
    """Extracts skills from a matched section text."""
    skills = []

    # Split by lines and common bullet/separator characters
    lines = re.split(r"[\n\r]+", section_text)
    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            continue

        # Check if line has multiple comma/semicolon/bullet-separated items
        sub_items = re.split(r"[,;•|/]", cleaned_line)
        if len(sub_items) > 1:
            for sub in sub_items:
                clean_sub = _clean_skill_item(sub)
                if clean_sub and 1 <= len(clean_sub.split()) <= 6 and len(clean_sub) < 50:
                    skills.append(clean_sub)
        else:
            clean_item = _clean_skill_item(cleaned_line)
            if clean_item and 1 <= len(clean_item.split()) <= 6 and len(clean_item) < 50:
                skills.append(clean_item)

    return skills


def _fallback_extract(jd_text: str) -> List[str]:
    """Fallback extraction for technical terms and keywords from the whole text."""
    extracted = []
    seen_lower = set()

    # 1. Match known tech keywords
    for keyword in KNOWN_TECH_KEYWORDS:
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, jd_text, flags=re.IGNORECASE):
            extracted.append(keyword)
            seen_lower.add(keyword.lower())

    # 2. Match capitalized multi-word technical phrases (e.g. "Continuous Integration", "Cloud Computing")
    multi_word_pattern = re.compile(r"\b[A-Z][a-zA-Z0-9+#.-]*(?:\s+[A-Z][a-zA-Z0-9+#.-]*){1,3}\b")
    for match in multi_word_pattern.findall(jd_text):
        cleaned = match.strip()
        if cleaned.lower() not in seen_lower and len(cleaned) > 3:
            extracted.append(cleaned)
            seen_lower.add(cleaned.lower())

    # 3. Match uppercase acronyms (e.g. AWS, GCP, SQL, CI/CD, REST)
    acronym_pattern = re.compile(r"\b[A-Z]{2,6}(?:/[A-Z]{2,6})?\b")
    for match in acronym_pattern.findall(jd_text):
        cleaned = match.strip()
        if cleaned.lower() not in seen_lower and len(cleaned) >= 2:
            extracted.append(cleaned)
            seen_lower.add(cleaned.lower())

    return extracted


def extract_required_skills(jd_text: str) -> List[str]:
    """
    Extracts required skills from a job description text.

    - Locates "Required Skills" / "Requirements" / "Qualifications" sections via regex/heading match.
    - Extracts comma/bullet/newline-separated skill terms from that section.
    - Returns a deduplicated, cleaned list (stripping whitespace and preserving original casing).
    - If no clear section is found, falls back to extracting capitalized multi-word technical terms
      and known tech keywords from the full JD text.

    Args:
        jd_text (str): Job description text.

    Returns:
        List[str]: Cleaned, deduplicated list of required skills.
    """
    if not jd_text or not isinstance(jd_text, str):
        return []

    try:
        # Step 1: Search for section headers
        section_start = None
        for pattern in SECTION_PATTERNS:
            match = re.search(pattern, jd_text)
            if match:
                section_start = match.end()
                break

        if section_start is not None:
            remaining_text = jd_text[section_start:]
            # Find next section boundary
            section_end = len(remaining_text)
            for boundary in BOUNDARY_PATTERNS:
                b_match = re.search(boundary, remaining_text)
                if b_match and b_match.start() < section_end:
                    section_end = b_match.start()

            section_content = remaining_text[:section_end].strip()
            skills = _extract_from_section(section_content)

            if skills:
                # Deduplicate while preserving first casing and order
                deduped = []
                seen_lower: Set[str] = set()
                for s in skills:
                    s_clean = s.strip()
                    if s_clean and s_clean.lower() not in seen_lower:
                        deduped.append(s_clean)
                        seen_lower.add(s_clean.lower())
                if deduped:
                    return deduped

        # Step 2: Fallback extraction across full JD text
        fallback_skills = _fallback_extract(jd_text)
        deduped_fallback = []
        seen_lower_fb: Set[str] = set()
        for s in fallback_skills:
            s_clean = s.strip()
            if s_clean and s_clean.lower() not in seen_lower_fb:
                deduped_fallback.append(s_clean)
                seen_lower_fb.add(s_clean.lower())

        return deduped_fallback

    except Exception as e:
        warnings.warn(f"Failed to extract skills: {e}")
        return []
