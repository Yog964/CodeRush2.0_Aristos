from typing import List
from src.schemas import RepoIntelligenceReport
from src.layer_a_perception.ekg import EngineeringKnowledgeGraph

class ContextManager:
    def __init__(self, token_budget: int = 4000):
        self.token_budget = token_budget

    def build_context(self, issue: str, intelligence: RepoIntelligenceReport, ekg: EngineeringKnowledgeGraph, memory_context: str = '') -> str:
        context_parts = []
        
        context_parts.append(f"Issue: {issue}\n")
        
        repo_summary = f"Repo Summary:\nTotal Files: {intelligence.total_files}\nTotal Lines: {intelligence.total_lines}\n"
        repo_summary += f"Languages: {intelligence.languages}\n"
        context_parts.append(repo_summary)
        
        if memory_context:
            context_parts.append(f"Memory:\n{memory_context}\n")
            
        relevant_symbols = []
        for sym in intelligence.symbols:
            score = self._score_relevance(sym.name, issue)
            if score > 0:
                relevant_symbols.append((score, sym))
                
        relevant_symbols.sort(key=lambda x: x[0], reverse=True)
        
        ekg_nodes = []
        for _, sym in relevant_symbols[:5]:
            sym_id = f"{sym.file_path}::{sym.name}"
            ekg_nodes.extend(ekg.query_related(sym_id, depth=1))
            
        ekg_nodes = list(set(ekg_nodes))
        if ekg_nodes:
            context_parts.append("EKG Context:\n" + ekg.to_context_string(ekg_nodes) + "\n")
            
        final_context = ""
        for part in context_parts:
            if self.estimate_tokens(final_context + part) > self.token_budget:
                break
            final_context += part
            
        return final_context

    def estimate_tokens(self, text: str) -> int:
        return len(text) // 4

    def _score_relevance(self, item_text: str, issue: str) -> float:
        score = 0.0
        issue_words = set(issue.lower().split())
        item_words = set(item_text.lower().split('_'))
        
        for word in item_words:
            if word in issue_words:
                score += 1.0
        return score
