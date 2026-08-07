import os
import subprocess
from collections import Counter
from typing import List

from src.schemas import RepositoryDNA, RepoIntelligenceReport

class RepoDNAAnalyzer:
    def __init__(self, repo_path: str, intelligence: RepoIntelligenceReport):
        self.repo_path = os.path.abspath(repo_path)
        self.intelligence = intelligence

    def analyze(self) -> RepositoryDNA:
        arch = self._detect_architecture()
        frameworks = self._detect_frameworks()
        risk_modules = self._detect_risk_modules()
        hot_files = self._detect_hot_files()
        conventions = self._detect_coding_conventions()
        
        return RepositoryDNA(
            architecture_pattern=arch,
            coding_conventions=conventions,
            frameworks=frameworks,
            risk_modules=risk_modules,
            hot_files=hot_files,
            common_bug_patterns=[],
            repo_health="stable"
        )

    def _detect_architecture(self) -> str:
        dirs = {os.path.basename(os.path.dirname(f.path)) for f in self.intelligence.files}
        if {'controllers', 'models', 'views'}.issubset(dirs):
            return "MVC"
        if {'layers', 'src'}.issubset(dirs) or 'domain' in dirs:
            return "Layered/Domain-Driven"
        return "Unknown"

    def _detect_frameworks(self) -> List[str]:
        frameworks = []
        for file in self.intelligence.files:
            base = os.path.basename(file.path)
            if base == 'requirements.txt':
                try:
                    with open(file.path, 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                        if 'django' in content: frameworks.append('Django')
                        if 'flask' in content: frameworks.append('Flask')
                        if 'fastapi' in content: frameworks.append('FastAPI')
                except OSError:
                    pass
            elif base == 'package.json':
                try:
                    with open(file.path, 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                        if 'react' in content: frameworks.append('React')
                        if 'express' in content: frameworks.append('Express')
                        if 'vue' in content: frameworks.append('Vue')
                except OSError:
                    pass
            elif base == 'go.mod':
                try:
                    with open(file.path, 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                        if 'gin' in content: frameworks.append('Gin')
                except OSError:
                    pass
        return list(set(frameworks))

    def _detect_risk_modules(self) -> List[str]:
        commits_per_file = {}
        for file in self.intelligence.files:
            if file.language == 'unknown':
                continue
            try:
                out = subprocess.check_output(
                    ['git', 'log', '--format=%H', '--follow', '--', file.path],
                    cwd=self.repo_path,
                    stderr=subprocess.DEVNULL
                )
                count = len(out.strip().split(b'\n'))
                commits_per_file[file.path] = count
            except subprocess.CalledProcessError:
                pass
        
        sorted_files = sorted(commits_per_file.items(), key=lambda x: x[1], reverse=True)
        return [f[0] for f in sorted_files[:5]]

    def _detect_hot_files(self) -> List[str]:
        try:
            sorted_files = sorted(self.intelligence.files, key=lambda f: f.last_modified, reverse=True)
            return [f.path for f in sorted_files[:5]]
        except Exception:
            return []

    def _detect_coding_conventions(self) -> List[str]:
        conventions = []
        python_symbols = [s for s in self.intelligence.symbols if s.kind in ('function', 'class')]
        if not python_symbols:
            return conventions
        
        snake_case = 0
        camel_case = 0
        has_docstring = 0
        
        for sym in python_symbols:
            if sym.name.islower() and '_' in sym.name:
                snake_case += 1
            elif any(c.isupper() for c in sym.name):
                camel_case += 1
                
            if sym.docstring:
                has_docstring += 1
                
        if snake_case > camel_case:
            conventions.append("snake_case preference")
        else:
            conventions.append("camelCase preference")
            
        doc_pct = (has_docstring / len(python_symbols)) * 100
        conventions.append(f"{doc_pct:.0f}% docstring coverage")
        
        return conventions
