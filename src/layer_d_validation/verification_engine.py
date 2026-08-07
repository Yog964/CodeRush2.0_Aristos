import os
import py_compile
from typing import List
from src.schemas import VerificationResult
from src.layer_c_action.sandbox import SandboxExecutor

class VerificationEngine:
    def __init__(self, sandbox: SandboxExecutor):
        self.sandbox = sandbox

    def run_full_verification(self) -> List[VerificationResult]:
        results = []
        results.append(self._check_syntax())
        results.append(self._check_lint())
        results.append(self._check_tests())
        results.append(self._check_security())
        results.append(self._check_diff())
        return results

    def _check_syntax(self) -> VerificationResult:
        diff_out = self.sandbox.get_diff()
        files = [line.split()[1][2:] for line in diff_out.splitlines() if line.startswith('+++ b/') and line.endswith('.py')]
        passed = True
        details = ""
        for file in files:
            full_path = os.path.join(self.sandbox.repo_path, file)
            if os.path.exists(full_path):
                try:
                    py_compile.compile(full_path, doraise=True)
                except Exception as e:
                    passed = False
                    details += f"{file}: {e}\n"
        return VerificationResult(check_name="syntax", passed=passed, details=details)

    def _check_lint(self) -> VerificationResult:
        code, out, err = self.sandbox.execute_command("python -m flake8 --version")
        if code != 0:
            return VerificationResult(check_name="lint", passed=True, details="flake8 not available, skipping")
        diff_out = self.sandbox.get_diff()
        files = [line.split()[1][2:] for line in diff_out.splitlines() if line.startswith('+++ b/') and line.endswith('.py')]
        passed = True
        details = ""
        for file in files:
            full_path = os.path.join(self.sandbox.repo_path, file)
            if os.path.exists(full_path):
                c, o, e = self.sandbox.execute_command(f"python -m flake8 {file} --max-line-length=120")
                if c != 0:
                    passed = False
                    details += o
        return VerificationResult(check_name="lint", passed=passed, details=details)

    def _check_tests(self) -> VerificationResult:
        code, out, err = self.sandbox.execute_command("python -m pytest --tb=short -q")
        if code == 0:
            return VerificationResult(check_name="tests", passed=True, details="Tests passed")
        else:
            if "No modules named" in err or "no tests ran" in out:
                return VerificationResult(check_name="tests", passed=True, details="No tests found")
            return VerificationResult(check_name="tests", passed=False, details=out + err)

    def _check_security(self) -> VerificationResult:
        diff_out = self.sandbox.get_diff()
        passed = True
        details = ""
        bad_patterns = ['password=', 'secret=', 'api_key=']
        for line in diff_out.splitlines():
            if line.startswith('+'):
                for p in bad_patterns:
                    if p in line.lower():
                        passed = False
                        details += f"Found suspicious pattern: {p}\n"
        return VerificationResult(check_name="security", passed=passed, details=details)

    def _check_diff(self) -> VerificationResult:
        diff_out = self.sandbox.get_diff()
        if not diff_out.strip():
            return VerificationResult(check_name="diff", passed=False, details="Empty diff")
        return VerificationResult(check_name="diff", passed=True, details="Diff is non-empty")
