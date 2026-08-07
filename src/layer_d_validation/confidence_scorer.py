from typing import List
from src.schemas import VerificationResult, ConfidenceReport
from config import Config

class ConfidenceScorer:
    def __init__(self):
        self.config = Config()

    def calculate(self, verification_results: List[VerificationResult], used_fallback_plan: bool, files_modified_count: int) -> ConfidenceReport:
        factors = {}
        overall = 0.0

        for r in verification_results:
            if r.check_name == "tests":
                if r.passed and "passed" in r.details.lower():
                    factors["tests"] = 1.0
                elif r.passed and "no tests" in r.details.lower():
                    factors["tests"] = 0.5
                else:
                    factors["tests"] = 0.0
            if r.check_name == "syntax":
                factors["syntax"] = 1.0 if r.passed else 0.0
            if r.check_name == "lint":
                if r.passed and "skipping" in r.details.lower():
                    factors["lint"] = 0.5
                elif r.passed:
                    factors["lint"] = 1.0
                else:
                    factors["lint"] = 0.0
            if r.check_name == "security":
                factors["security"] = 1.0 if r.passed else 0.0

        factors["plan"] = 0.0 if used_fallback_plan else 1.0

        if files_modified_count <= 3:
            factors["minimal_changes"] = 1.0
        elif files_modified_count <= 10:
            factors["minimal_changes"] = 0.5
        else:
            factors["minimal_changes"] = 0.0

        score = (
            factors.get("tests", 0.0) * self.config.WEIGHT_TESTS +
            factors.get("syntax", 0.0) * self.config.WEIGHT_BUILD +
            factors.get("lint", 0.0) * self.config.WEIGHT_LINT +
            factors.get("security", 0.0) * self.config.WEIGHT_SECURITY +
            factors.get("plan", 0.0) * self.config.WEIGHT_PLAN_QUALITY +
            factors.get("minimal_changes", 0.0) * self.config.WEIGHT_MINIMAL_CHANGES
        )

        return ConfidenceReport(
            overall_score=score,
            factors=factors,
            explanation="Confidence calculated based on verification results."
        )
