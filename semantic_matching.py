import warnings
from typing import List, Optional
import torch
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

_MODEL: Optional[SentenceTransformer] = None

JD_PREFIX = "Represent this job description for finding matching resumes: "
RESUME_PREFIX = "Represent this resume for matching to a job: "


def _get_model() -> SentenceTransformer:
    """Lazily load and cache the Qwen/Qwen3-Embedding-4B model."""
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(
            "Qwen/Qwen3-Embedding-4B",
            model_kwargs={"torch_dtype": torch.float16},
            device="cpu"
        )
    return _MODEL


def semantic_match(jd_text: str, resumes: List[str]) -> List[float]:
    """
    Computes semantic cosine similarity scores between a job description and resumes.

    - Uses 'Qwen/Qwen3-Embedding-4B' via sentence-transformers (float16 on CPU).
    - Encodes jd_text with prefix: 'Represent this job description for finding matching resumes: '
    - Encodes resumes with prefix: 'Represent this resume for matching to a job: '
    - Returns cosine similarity scores as a plain list[float], index-aligned with the input resumes list.
    - Model is lazily cached to prevent reloading per call.

    Args:
        jd_text (str): Job description text.
        resumes (List[str]): List of resume text strings.

    Returns:
        List[float]: Cosine similarity scores aligned with input resumes.
    """
    if not resumes or not isinstance(resumes, list):
        return []

    if not jd_text or not isinstance(jd_text, str) or not jd_text.strip():
        return [0.0] * len(resumes)

    try:
        model = _get_model()

        # Format inputs with task instruction prefixes
        jd_input = f"{JD_PREFIX}{jd_text}"
        resume_inputs = [f"{RESUME_PREFIX}{r}" if (isinstance(r, str) and r.strip()) else f"{RESUME_PREFIX}" for r in resumes]

        # Encode job description and resumes
        jd_embedding = model.encode(jd_input, convert_to_numpy=True)
        resume_embeddings = model.encode(resume_inputs, convert_to_numpy=True)

        # Reshape for sklearn cosine_similarity
        if jd_embedding.ndim == 1:
            jd_embedding = jd_embedding.reshape(1, -1)
        if resume_embeddings.ndim == 1:
            resume_embeddings = resume_embeddings.reshape(1, -1)

        # Compute cosine similarity
        similarities = cosine_similarity(jd_embedding, resume_embeddings)[0]

        return [float(score) for score in similarities]

    except Exception as e:
        warnings.warn(f"Failed in semantic_match: {e}")
        return [0.0] * len(resumes)
