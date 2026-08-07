import sqlite3
import uuid
from typing import List, Optional
from .schemas import MemoryItem

class MemoryManager:
    def __init__(self, db_path: str = "harness_memory.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS memory (
                    id TEXT PRIMARY KEY,
                    layer TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source_provenance TEXT NOT NULL,
                    confidence_score REAL NOT NULL,
                    invalidation_rules TEXT NOT NULL
                )
            ''')
            conn.commit()

    def add_memory(self, layer: str, content: str, source_provenance: str, confidence_score: float, invalidation_rules: str) -> str:
        memory_id = str(uuid.uuid4())
        item = MemoryItem(
            id=memory_id,
            layer=layer,
            content=content,
            source_provenance=source_provenance,
            confidence_score=confidence_score,
            invalidation_rules=invalidation_rules
        )
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO memory (id, layer, content, source_provenance, confidence_score, invalidation_rules)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (item.id, item.layer, item.content, item.source_provenance, item.confidence_score, item.invalidation_rules))
            conn.commit()
        return memory_id

    def get_memory_by_layer(self, layer: str) -> List[MemoryItem]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM memory WHERE layer = ?', (layer,))
            rows = cursor.fetchall()
            
            memories = []
            for row in rows:
                memories.append(MemoryItem(
                    id=row[0],
                    layer=row[1],
                    content=row[2],
                    source_provenance=row[3],
                    confidence_score=row[4],
                    invalidation_rules=row[5]
                ))
            return memories

    def invalidate_memory(self, memory_id: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM memory WHERE id = ?', (memory_id,))
            conn.commit()

    def get_all_context(self) -> str:
        """Helper to dump all memory for the LLM prompt"""
        context_parts = []
        for layer in ["Working", "Task", "Project", "Episodic"]:
            items = self.get_memory_by_layer(layer)
            if items:
                context_parts.append(f"--- {layer} Memory ---")
                for item in items:
                    context_parts.append(f"[{item.confidence_score:.2f}] ({item.source_provenance}): {item.content}")
        return "\n".join(context_parts)
