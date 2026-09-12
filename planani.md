# Nexora - Resume Shortlisting Pipeline & Platform Report

**Generated Date:** September 12, 2026  
**Project Workspace:** `c:\Users\Aniruddh Narayana U\Documents\nexora`  
**Repository:** [https://github.com/aniruddh280307/Resume-shortlisiting.git](https://github.com/aniruddh280307/Resume-shortlisiting.git)  
**Frontend Server:** Running at `http://localhost:5173/`

---

## 1. Executive Summary of Work Completed Till Now

### A. Built 5 Core Python Pipeline Modules
We engineered 5 decoupled, type-hinted, and robust Python modules designed to extract, clean, analyze, and score candidate resumes against job descriptions (JDs).

1. **[`extraction.py`](file:///c:/Users/Aniruddh%20Narayana%20U/Documents/nexora/extraction.py)**
   - **Function:** `extract_text(file_path: str) -> str`
   - **Mechanism:**
     - Attempts text extraction on `.pdf` files using `pdfplumber` (preserving paragraph structure).
     - Automatically falls back to `easyocr` on rendered page images if extracted text is empty or near-empty (<30 characters, e.g. scanned resumes).
     - Uses `python-docx` for `.docx` word files.
     - Gracefully catches all errors, prints a diagnostic warning, and returns an empty string `""` without crashing the batch.

2. **[`normalization.py`](file:///c:/Users/Aniruddh%20Narayana%20U/Documents/nexora/normalization.py)**
   - **Functions:**
     - `normalize_text(raw_text: str, custom_terms: list[str] = None) -> str`: Corrects OCR typos using `symspellpy` while registering a custom dictionary + domain/skill keywords at max frequency so technical terms are never "corrected" away. Standardizes horizontal and vertical whitespace.
     - `normalize_dates(text: str) -> str`: Detects date expressions using regex and reformats them to `YYYY-MM` via `dateutil.parser(fuzzy=True)`, leaving unparseable tokens intact.
     - `normalize_headers(text: str, canonical_headers: list[str]) -> str`: Standardizes short, standalone section header lines (<5 words) against canonical headers using `rapidfuzz` (threshold $\ge 80$).

3. **[`skill_extraction.py`](file:///c:/Users/Aniruddh%20Narayana%20U/Documents/nexora/skill_extraction.py)**
   - **Function:** `extract_required_skills(jd_text: str) -> list[str]`
   - **Mechanism:**
     - Locates requirement/qualification sections via regex (`Required Skills`, `Requirements`, `Qualifications`, `Must Haves`, etc.).
     - Splits items by bullets (`•`, `-`, `*`), commas, semicolons, and newlines; strips noise prefixes (e.g. *"Proficiency in"*, *"3+ years of experience in"*).
     - Provides a fallback mechanism for JDs without explicit section headings by detecting technical phrases, acronyms, and known tech vocabulary.
     - Returns a deduplicated list with original casing preserved.

4. **[`keyword_matching.py`](file:///c:/Users/Aniruddh%20Narayana%20U/Documents/nexora/keyword_matching.py)**
   - **Function:** `keyword_match(jd_text: str, resumes: list[str], required_skills: list[str]) -> dict`
   - **Mechanism:**
     - Computes Okapi BM25 ranking scores using `rank_bm25` (simple whitespace tokenization + lowercasing).
     - Executes fuzzy skill matching with `rapidfuzz` (`process.extractOne`, `fuzz.ratio`, score cutoff $\ge 85$) against n-gram token windows in each resume to catch OCR typos (e.g., matching *"Pythn"* or *"Doker"*).
     - Returns index-aligned dict: `{"bm25_scores": list[float], "matched_skills": list[list[str]], "missing_skills": list[list[str]]}`.

5. **[`semantic_matching.py`](file:///c:/Users/Aniruddh%20Narayana%20U/Documents/nexora/semantic_matching.py)**
   - **Function:** `semantic_match(jd_text: str, resumes: list[str]) -> list[float]`
   - **Mechanism:**
     - Loads `'Qwen/Qwen3-Embedding-4B'` via `sentence_transformers` in `torch.float16` on CPU.
     - Prepends task instructions:
       - JD: `"Represent this job description for finding matching resumes: "`
       - Resume: `"Represent this resume for matching to a job: "`
     - Calculates pairwise cosine similarity via `sklearn.metrics.pairwise.cosine_similarity`.
     - Lazily initializes and caches the embedding model to prevent redundant reloads across function calls.

---

### B. Automated Test Suite & Validation
- Created **[`test_pipeline.py`](file:///c:/Users/Aniruddh%20Narayana%20U/Documents/nexora/test_pipeline.py)** with 12 comprehensive unit tests covering:
  - Error resilience with non-existent or invalid filepaths.
  - Text whitespace standardization and custom term preservation in `symspellpy`.
  - Date normalization to `YYYY-MM`.
  - Case-insensitive rapidfuzz header normalization.
  - Section-based and fallback skill extractions.
  - BM25 score alignment and fuzzy OCR error skill matching.
  - Semantic similarity output indexing and mock vector calculations.
- **Result:** 100% test pass rate (`12 tests in 4.411s - OK`).

---

### C. Repository Integration & Frontend Launch
1. Cloned the remote repository from `https://github.com/aniruddh280307/Resume-shortlisiting.git` into the root workspace.
2. Merged all 5 Python backend modules alongside the frontend codebase.
3. Installed Node dependencies via `npm install` (189 packages audited, 0 vulnerabilities).
4. Started the Vite React + TypeScript development server on `http://localhost:5173/`.

---

## 2. Complete Project Inventory & Architecture

### File & Directory Tree

```
nexora/
├── extraction.py               # Module 1: Document text extraction & OCR fallback
├── normalization.py            # Module 2: OCR typo correction, date & header normalization
├── skill_extraction.py         # Module 3: JD required skill extraction & fallback parser
├── keyword_matching.py         # Module 4: BM25 scoring & fuzzy skill matcher
├── semantic_matching.py        # Module 5: Qwen embedding semantic similarity ranker
├── test_pipeline.py            # Test suite for backend Python modules
├── planani.md                  # Project status and implementation report
│
├── index.html                  # Frontend HTML entry point
├── package.json                # Frontend scripts and dependencies
├── package-lock.json           # Exact dependency lockfile
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite bundler configuration
│
└── src/
    ├── main.tsx                # Main application view and layout routing
    ├── styles.css              # Custom styling & glassmorphism theme
    ├── types.ts                # TypeScript data interfaces (Candidate, Job, Analytics)
    ├── data.ts                 # Mock data & sample candidate benchmarks
    │
    ├── auth/
    │   └── firebase.ts         # Firebase Authentication & DB configuration
    │
    ├── services/
    │   └── api.ts              # Backend API connector & mock service layer
    │
    └── components/
        ├── CandidateComparisonModal.tsx  # Side-by-side candidate comparison matrix
        ├── CandidateDetailView.tsx       # Comprehensive candidate profile view
        ├── HiringSimulator.tsx           # Interactive threshold & scoring simulator
        ├── RecruiterChatbot.tsx          # Recruiter AI assistant drawer/chat
        ├── SkillCandidatesDrawer.tsx     # Drilldown drawer for candidates by skill
        └── SkillCoverageTable.tsx        # Heatmap / coverage table of candidate skills
```

---

## 3. Technology Stack & Key Dependencies

### Python AI Pipeline
| Technology | Version / Spec | Purpose |
| :--- | :--- | :--- |
| **`pdfplumber`** | `^0.11.10` | High-fidelity PDF text and paragraph extraction |
| **`easyocr`** | `^1.7.2` | Image-based Optical Character Recognition for scanned PDFs |
| **`python-docx`** | `^1.2.0` | Microsoft Word (`.docx`) paragraph parsing |
| **`symspellpy`** | `^6.10.0` | Fast OCR typo correction with domain word preservation |
| **`python-dateutil`**| `^2.9.0` | Fuzzy parsing of diverse date representations to `YYYY-MM` |
| **`rapidfuzz`** | `^3.14.6` | Levenshtein ratio & fuzzy matching for skills and headers |
| **`rank-bm25`** | `^0.2.2` | BM25Okapi keyword ranking engine |
| **`sentence-transformers`** | `^6.0.1` | Model loader for `Qwen/Qwen3-Embedding-4B` |
| **`torch`** | `^2.14.0` | PyTorch runtime (CPU float16 inference) |
| **`scikit-learn`** | `^1.9.1` | Cosine similarity computations |

### Frontend Application
| Technology | Purpose |
| :--- | :--- |
| **React 18 / 19** + **TypeScript** | UI Component architecture and static typing |
| **Vite** | Fast HMR dev server and production bundler |
| **Lucide React** | Modern iconography set |
| **Motion** | Fluid animations and transition choreography |
| **Recharts** | Analytics visual charts (skill radar, score distributions) |
| **Sonner** | Toast notifications |
| **Firebase** | Authentication and persistence configuration |

---

## 4. Current Status & Next Steps

- **Frontend Server:** Active and healthy on `http://localhost:5173/`.
- **Backend Modules:** Tested and verified with 100% pass rate.
- **Ready for Integration:**
  - Connect Python modules into a unified API runner (e.g. FastAPI / Flask) if end-to-end resume uploading is triggered directly from the web interface.
  - Extend candidate ranking fusion algorithm to combine BM25 scores, semantic similarity, and skill coverage into a weighted composite score.
