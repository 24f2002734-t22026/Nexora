import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock

# Import each module independently
import extraction
import normalization
import skill_extraction
import keyword_matching
import semantic_matching


class TestExtractionModule(unittest.TestCase):
    def test_nonexistent_file(self):
        result = extraction.extract_text("non_existent_file_xyz.pdf")
        self.assertEqual(result, "")

    def test_empty_or_invalid_path(self):
        self.assertEqual(extraction.extract_text(""), "")
        self.assertEqual(extraction.extract_text(None), "")

    def test_txt_file(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("Sample Resume Content\nExperience: Python Developer")
            temp_path = f.name
        try:
            result = extraction.extract_text(temp_path)
            self.assertIn("Python Developer", result)
        finally:
            os.remove(temp_path)


class TestNormalizationModule(unittest.TestCase):
    def test_normalize_text_whitespace(self):
        raw = "Line 1   with    spaces.\n\n\n\nLine 2.\r\nLine 3."
        normalized = normalization.normalize_text(raw)
        self.assertNotIn("   ", normalized)
        self.assertNotIn("\r", normalized)
        self.assertNotIn("\n\n\n", normalized)

    def test_normalize_text_with_custom_terms(self):
        # With custom terms, specific tech names should not be altered
        raw = "I am proficient in PyTorch and Kubernetes"
        custom_terms = ["PyTorch", "Kubernetes"]
        normalized = normalization.normalize_text(raw, custom_terms)
        self.assertIn("pytorch", normalized.lower())
        self.assertIn("kubernetes", normalized.lower())

    def test_normalize_dates(self):
        sample = "Worked from Jan 2020 to March 2022. Also started on 05/2018."
        normalized = normalization.normalize_dates(sample)
        self.assertIn("2020-01", normalized)
        self.assertIn("2022-03", normalized)
        self.assertIn("2018-05", normalized)

    def test_normalize_headers(self):
        text = "WORK EXPERIENCE\nBuilt APIs\n\nEDUCATON\nBS Computer Science"
        canonical = ["Work Experience", "Education", "Skills"]
        normalized = normalization.normalize_headers(text, canonical)
        self.assertIn("Work Experience", normalized)
        self.assertIn("Education", normalized)


class TestSkillExtractionModule(unittest.TestCase):
    def test_extract_from_section(self):
        jd = """
        Job Title: Senior Backend Engineer
        About Us: Fast-growing tech startup.
        
        Required Skills:
        - Python, FastAPI, Docker
        - PostgreSQL and Redis
        - Experience with AWS and CI/CD
        
        Responsibilities:
        - Build reliable microservices.
        """
        skills = skill_extraction.extract_required_skills(jd)
        self.assertTrue(len(skills) > 0)
        skills_lower = [s.lower() for s in skills]
        self.assertTrue(any("python" in s for s in skills_lower))
        self.assertTrue(any("fastapi" in s for s in skills_lower))
        self.assertTrue(any("docker" in s for s in skills_lower))

    def test_extract_fallback(self):
        jd = "Looking for a seasoned engineer with expertise in PyTorch, Kubernetes, Go, and Machine Learning."
        skills = skill_extraction.extract_required_skills(jd)
        self.assertTrue(len(skills) > 0)
        skills_lower = [s.lower() for s in skills]
        self.assertTrue(any("pytorch" in s for s in skills_lower))
        self.assertTrue(any("kubernetes" in s for s in skills_lower))


class TestKeywordMatchingModule(unittest.TestCase):
    def test_keyword_match_alignment_and_scores(self):
        jd = "Looking for Python backend developer with Docker and AWS experience."
        resumes = [
            "Experienced Python developer proficient in Docker, AWS, and PostgreSQL.",
            "Frontend developer with React, TypeScript, and CSS skills.",
            "DevOps engineer with Pythn (OCR typo) and Doker (OCR typo) and AWS."
        ]
        required_skills = ["Python", "Docker", "AWS", "Kubernetes"]

        result = keyword_matching.keyword_match(jd, resumes, required_skills)

        self.assertIn("bm25_scores", result)
        self.assertIn("matched_skills", result)
        self.assertIn("missing_skills", result)

        self.assertEqual(len(result["bm25_scores"]), len(resumes))
        self.assertEqual(len(result["matched_skills"]), len(resumes))
        self.assertEqual(len(result["missing_skills"]), len(resumes))

        # First resume should match Python, Docker, AWS
        self.assertIn("Python", result["matched_skills"][0])
        self.assertIn("Docker", result["matched_skills"][0])
        self.assertIn("AWS", result["matched_skills"][0])
        self.assertIn("Kubernetes", result["missing_skills"][0])

        # Third resume should fuzzy match "Python" and "Docker" despite OCR typos (Pythn, Doker)
        self.assertIn("Python", result["matched_skills"][2])
        self.assertIn("Docker", result["matched_skills"][2])


class TestSemanticMatchingModule(unittest.TestCase):
    def test_empty_resumes(self):
        res = semantic_matching.semantic_match("Software Engineer JD", [])
        self.assertEqual(res, [])

    @patch("semantic_matching._get_model")
    def test_semantic_match_mocked(self, mock_get_model):
        import numpy as np
        mock_model = MagicMock()
        # Mock encode to return 2D numpy arrays
        mock_model.encode.side_effect = [
            np.array([[1.0, 0.0, 0.0]]),                 # JD embedding
            np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]) # 2 resume embeddings
        ]
        mock_get_model.return_value = mock_model

        jd = "Python Engineer"
        resumes = ["Python Developer resume", "Chef at restaurant"]

        scores = semantic_matching.semantic_match(jd, resumes)
        self.assertEqual(len(scores), 2)
        self.assertAlmostEqual(scores[0], 1.0, places=3)
        self.assertAlmostEqual(scores[1], 0.0, places=3)


if __name__ == "__main__":
    unittest.main()
