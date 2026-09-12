import unittest

from pydantic import ValidationError

from mywork.coding_assessment.mapper import CandidateMapping


class CandidateMappingTests(unittest.TestCase):
    def test_valid_mapping(self) -> None:
        mapping = CandidateMapping.create("cand_014", "cand_014")
        self.assertTrue(mapping.is_valid())

    def test_empty_ids_are_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            CandidateMapping(candidate_id="", profile_id="")

    def test_mismatch_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            CandidateMapping.create("cand_014", "profile_999")


if __name__ == "__main__":
    unittest.main()