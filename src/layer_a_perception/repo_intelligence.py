import os
import ast
from typing import List, Dict, Any, Optional
from datetime import datetime

from src.schemas import (
    FileInfo, SymbolInfo, ImportInfo, CallInfo, 
    TestMapping, RepoIntelligenceReport
)

class RepoIntelligenceEngine:
    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)
        self.skip_dirs = {'.git', '__pycache__', 'node_modules', '.env'}

    def scan(self) -> RepoIntelligenceReport:
        files = self._build_file_map()
        symbols = self._build_ast_index(files)
        imports = self._build_import_graph(files)
        calls = self._build_call_graph(files)
        tests = self._build_test_map(files)
        
        languages: Dict[str, int] = {}
        total_lines = 0
        for f in files:
            languages[f.language] = languages.get(f.language, 0) + 1
            total_lines += f.line_count
            
        return RepoIntelligenceReport(
            files=files,
            symbols=symbols,
            imports=imports,
            calls=calls,
            test_mappings=tests,
            total_files=len(files),
            total_lines=total_lines,
            languages=languages
        )

    def _build_file_map(self) -> List[FileInfo]:
        files_info = []
        ext_to_lang = {
            '.py': 'Python',
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.java': 'Java',
            '.go': 'Go',
            '.cpp': 'C++',
            '.c': 'C',
            '.cs': 'C#',
            '.rb': 'Ruby',
            '.php': 'PHP',
            '.rs': 'Rust',
        }
        for root, dirs, files in os.walk(self.repo_path):
            dirs[:] = [d for d in dirs if d not in self.skip_dirs]
            for file in files:
                file_path = os.path.join(root, file)
                ext = os.path.splitext(file)[1].lower()
                lang = ext_to_lang.get(ext, 'unknown')
                
                try:
                    stat = os.stat(file_path)
                    size_bytes = stat.st_size
                    last_mod = datetime.fromtimestamp(stat.st_mtime).isoformat()
                    
                    line_count = 0
                    if lang != 'unknown':
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            line_count = sum(1 for _ in f)
                    
                    files_info.append(FileInfo(
                        path=file_path,
                        size_bytes=size_bytes,
                        language=lang,
                        last_modified=last_mod,
                        line_count=line_count
                    ))
                except OSError:
                    continue
        return files_info

    def _build_ast_index(self, files: List[FileInfo]) -> List[SymbolInfo]:
        symbols = []
        for file in files:
            if file.language == 'Python':
                try:
                    with open(file.path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read(), filename=file.path)
                    
                    for node in ast.walk(tree):
                        if isinstance(node, ast.ClassDef):
                            docstring = ast.get_docstring(node) or ""
                            decs = [ast.unparse(d) for d in node.decorator_list]
                            symbols.append(SymbolInfo(
                                name=node.name,
                                kind='class',
                                file_path=file.path,
                                line_start=getattr(node, 'lineno', 0),
                                line_end=getattr(node, 'end_lineno', 0),
                                docstring=docstring,
                                decorators=decs
                            ))
                        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            docstring = ast.get_docstring(node) or ""
                            decs = [ast.unparse(d) for d in node.decorator_list]
                            symbols.append(SymbolInfo(
                                name=node.name,
                                kind='function',
                                file_path=file.path,
                                line_start=getattr(node, 'lineno', 0),
                                line_end=getattr(node, 'end_lineno', 0),
                                docstring=docstring,
                                decorators=decs
                            ))
                except (SyntaxError, FileNotFoundError, OSError):
                    pass
        return symbols

    def _build_import_graph(self, files: List[FileInfo]) -> List[ImportInfo]:
        imports = []
        for file in files:
            if file.language == 'Python':
                try:
                    with open(file.path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read(), filename=file.path)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                imports.append(ImportInfo(
                                    source_file=file.path,
                                    imported_module=alias.name,
                                    imported_names=[],
                                    is_relative=False
                                ))
                        elif isinstance(node, ast.ImportFrom):
                            mod = node.module or ""
                            imports.append(ImportInfo(
                                source_file=file.path,
                                imported_module=mod,
                                imported_names=[alias.name for alias in node.names],
                                is_relative=(node.level is not None and node.level > 0)
                            ))
                except (SyntaxError, FileNotFoundError, OSError):
                    pass
        return imports

    def _build_call_graph(self, files: List[FileInfo]) -> List[CallInfo]:
        calls = []
        for file in files:
            if file.language == 'Python':
                try:
                    with open(file.path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read(), filename=file.path)
                    
                    current_func = "<module>"
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            current_func = node.name
                            for child in ast.walk(node):
                                if isinstance(child, ast.Call):
                                    callee = ""
                                    if isinstance(child.func, ast.Name):
                                        callee = child.func.id
                                    elif isinstance(child.func, ast.Attribute):
                                        callee = child.func.attr
                                    if callee:
                                        calls.append(CallInfo(
                                            caller_file=file.path,
                                            caller_function=current_func,
                                            callee_function=callee,
                                            line_number=getattr(child, 'lineno', 0)
                                        ))
                        elif isinstance(node, ast.Call):
                            callee = ""
                            if isinstance(node.func, ast.Name):
                                callee = node.func.id
                            elif isinstance(node.func, ast.Attribute):
                                callee = node.func.attr
                            if callee:
                                calls.append(CallInfo(
                                    caller_file=file.path,
                                    caller_function="<module>",
                                    callee_function=callee,
                                    line_number=getattr(node, 'lineno', 0)
                                ))
                except (SyntaxError, FileNotFoundError, OSError):
                    pass
        return calls

    def _build_test_map(self, files: List[FileInfo]) -> List[TestMapping]:
        test_maps = []
        for file in files:
            if file.language == 'Python' and (file.path.endswith('_test.py') or os.path.basename(file.path).startswith('test_')):
                try:
                    with open(file.path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read(), filename=file.path)
                    
                    imports = []
                    test_funcs = []
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                imports.append(alias.name)
                        elif isinstance(node, ast.ImportFrom):
                            if node.module:
                                imports.append(node.module)
                        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            if node.name.startswith('test_'):
                                test_funcs.append(node.name)
                    
                    for func in test_funcs:
                        test_maps.append(TestMapping(
                            test_file=file.path,
                            test_function=func,
                            source_imports=imports
                        ))
                except (SyntaxError, FileNotFoundError, OSError):
                    pass
        return test_maps
