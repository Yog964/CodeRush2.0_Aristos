import networkx as nx
from typing import List, Dict, Any

from src.schemas import RepoIntelligenceReport

class EngineeringKnowledgeGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def build_from_intelligence(self, report: RepoIntelligenceReport):
        for file in report.files:
            self.graph.add_node(file.path, type='File', language=file.language)

        for sym in report.symbols:
            sym_id = f"{sym.file_path}::{sym.name}"
            self.graph.add_node(sym_id, type='Symbol', kind=sym.kind)
            self.graph.add_edge(sym.file_path, sym_id, relation='contains')

        for imp in report.imports:
            self.graph.add_node(imp.imported_module, type='Module')
            self.graph.add_edge(imp.source_file, imp.imported_module, relation='imports')

        for call in report.calls:
            caller_id = f"{call.caller_file}::{call.caller_function}"
            callee_id = call.callee_function
            if not self.graph.has_node(caller_id):
                self.graph.add_node(caller_id, type='Symbol')
            if not self.graph.has_node(callee_id):
                self.graph.add_node(callee_id, type='Symbol')
            self.graph.add_edge(caller_id, callee_id, relation='calls')

        for test in report.test_mappings:
            test_id = f"{test.test_file}::{test.test_function}"
            self.graph.add_node(test_id, type='Test')
            self.graph.add_edge(test.test_file, test_id, relation='contains')
            for imp in test.source_imports:
                self.graph.add_edge(test_id, imp, relation='tests')

    def query_related(self, entity_id: str, depth: int = 2) -> List[str]:
        if not self.graph.has_node(entity_id):
            return []
        
        related = set()
        queue = [(entity_id, 0)]
        visited = {entity_id}
        
        while queue:
            current, d = queue.pop(0)
            related.add(current)
            if d < depth:
                for neighbor in self.graph.neighbors(current):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, d + 1))
                for pred in self.graph.predecessors(current):
                    if pred not in visited:
                        visited.add(pred)
                        queue.append((pred, d + 1))
                        
        return list(related)

    def get_impact_analysis(self, file_path: str) -> Dict[str, Any]:
        impact = {'files': [], 'functions': []}
        if not self.graph.has_node(file_path):
            return impact
            
        for node in nx.descendants(self.graph, file_path):
            data = self.graph.nodes[node]
            if data.get('type') == 'File':
                impact['files'].append(node)
            elif data.get('type') == 'Symbol':
                impact['functions'].append(node)
                
        return impact

    def to_context_string(self, node_ids: List[str] = None) -> str:
        if node_ids is None:
            node_ids = list(self.graph.nodes())
            
        lines = []
        for node in node_ids:
            if self.graph.has_node(node):
                data = self.graph.nodes[node]
                lines.append(f"Node: {node} ({data.get('type', 'Unknown')})")
                for neighbor in self.graph.neighbors(node):
                    edge_data = self.graph.get_edge_data(node, neighbor)
                    lines.append(f"  -[{edge_data.get('relation', 'related')}]-> {neighbor}")
        return "\n".join(lines)

    def summary(self) -> str:
        types = {}
        for _, data in self.graph.nodes(data=True):
            t = data.get('type', 'Unknown')
            types[t] = types.get(t, 0) + 1
            
        summary_str = f"Nodes: {self.graph.number_of_nodes()}\nEdges: {self.graph.number_of_edges()}\n"
        for t, count in types.items():
            summary_str += f"{t}: {count}\n"
        return summary_str
