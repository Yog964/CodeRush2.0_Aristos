import re

class PolicyEngine:
    FORBIDDEN_PATTERNS = [
        r'\brm\s+-rf\b',
        r'\bsudo\b',
        r'\bcurl\b',
        r'\bwget\b',
        r'\bchmod\s+777\b',
        r'\bmkfs\b',
        r'\bdd\b'
    ]

    @classmethod
    def is_allowed(cls, command: str) -> tuple[bool, str]:
        """
        Evaluates a shell command against security policies.
        Returns (is_allowed, reason_if_rejected)
        """
        for pattern in cls.FORBIDDEN_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                return False, f"Matches forbidden pattern: {pattern}"
        
        return True, ""
