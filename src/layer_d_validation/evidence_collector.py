import json
import os
from typing import List
from src.schemas import ToolCallResult, TaskGraph, VerificationResult, ConfidenceReport, EvidencePackage

class EvidenceCollector:
    def __init__(self):
        self.tool_calls: List[ToolCallResult] = []
        self.task_graph_versions: List[dict] = []
        self.files_modified: List[str] = []
        self.verification_results: List[VerificationResult] = []
        self.confidence: ConfidenceReport = ConfidenceReport()

    def add_tool_call(self, result: ToolCallResult):
        self.tool_calls.append(result)

    def add_plan_version(self, graph: TaskGraph):
        self.task_graph_versions.append(graph.model_dump() if hasattr(graph, 'model_dump') else graph.dict())

    def add_file_modified(self, filepath: str):
        if filepath not in self.files_modified:
            self.files_modified.append(filepath)

    def add_verification(self, result: VerificationResult):
        self.verification_results.append(result)

    def set_confidence(self, report: ConfidenceReport):
        self.confidence = report

    def build_package(self) -> EvidencePackage:
        return EvidencePackage(
            task_graph_versions=self.task_graph_versions,
            tool_calls=self.tool_calls,
            files_modified=self.files_modified,
            verification_results=self.verification_results,
            confidence=self.confidence
        )

    def save_to_file(self, output_dir: str):
        os.makedirs(output_dir, exist_ok=True)
        pkg = self.build_package()
        with open(os.path.join(output_dir, 'evidence_package.json'), 'w') as f:
            f.write(pkg.model_dump_json(indent=2) if hasattr(pkg, 'model_dump_json') else pkg.json(indent=2))
