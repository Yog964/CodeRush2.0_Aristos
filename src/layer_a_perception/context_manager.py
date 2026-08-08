from typing import List
from src.schemas import RepoIntelligenceReport
from src.layer_a_perception.ekg import EngineeringKnowledgeGraph

class ContextManager:
    def __init__(self, token_budget: int = 4000):
        self.token_budget = token_budget

    def build_context(self, issue: str, intelligence: RepoIntelligenceReport, ekg: EngineeringKnowledgeGraph, memory_context: str = '') -> str:
        # Layer 3: System Directive (handled via LLM adapter system_prompt, budget implicitly tracked)
        
        # Context Monitor (90% threshold)
        warning_threshold = self.token_budget * 0.90
        
        # Build raw components
        raw_repo_summary = f"Repo Summary:\nTotal Files: {intelligence.total_files}\nTotal Lines: {intelligence.total_lines}\nLanguages: {intelligence.languages}\n"
        raw_memory = f"Memory:\n{memory_context}\n" if memory_context else ""
        
        # Layer 2: Recent Window / Critical Core (Kept verbatim)
        critical_core = f"Issue: {issue}\n"
        
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
        raw_ekg = "EKG Context:\n" + ekg.to_context_string(ekg_nodes) + "\n" if ekg_nodes else ""
        
        standard_context = raw_repo_summary + raw_memory + critical_core + raw_ekg
        current_tokens = self.estimate_tokens(standard_context)
        
        if current_tokens >= warning_threshold:
            # Trigger Compression Engine
            compressed_repo = self._compress_context(raw_repo_summary, "repo")
            compressed_memory = self._compress_context(raw_memory, "memory")
            
            # Layer 1: Summary Block
            summary_block = f"--- [COMPRESSED SUMMARY BLOCK] ---\n{compressed_repo}\n{compressed_memory}\n----------------------------------\n"
            
            final_context = summary_block + critical_core + raw_ekg
            if self.estimate_tokens(final_context) > self.token_budget:
                # Still too large? Aggressively compress EKG
                compressed_ekg = self._compress_context(raw_ekg, "ekg")
                final_context = summary_block + critical_core + f"--- [COMPRESSED EKG] ---\n{compressed_ekg}\n"
        else:
            final_context = standard_context
            
        return final_context

    def _compress_context(self, raw_text: str, context_type: str) -> str:
        """Deterministic algorithmic summarization to guarantee speed and budget constraints."""
        if not raw_text.strip():
            return ""
            
        if context_type == "repo":
            # Extract numbers/languages, strip massive JSON
            return f"[Repo Stats]: {raw_text[:120].replace(chr(10), ' ')}..."
        elif context_type == "memory":
            # Strip whitespace, keep first/last bounds
            lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
            if len(lines) > 5:
                return f"[Memory]: {lines[0]} ... {lines[-1]}"
            return f"[Memory]: {' '.join(lines)}"
        elif context_type == "ekg":
            # Extremely dense EKG representation
            dense_nodes = []
            for line in raw_text.splitlines():
                if "::" in line:
                    dense_nodes.append(line.split("::")[-1])
            return f"[EKG Dense]: {', '.join(dense_nodes[:20])}"
        
        return raw_text[:200] + "...(truncated)"

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
