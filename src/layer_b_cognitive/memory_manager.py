import sqlite3
import json
import uuid
from typing import List, Optional
from datetime import datetime

from src.schemas import MemoryItem, MemoryLayer, MemoryStatus
from config import Config

class MemoryManager:
    """SQLite-based memory manager for Layer B Cognitive Intelligence."""

    def __init__(self, db_path: str = Config.DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the SQLite database with the enhanced schema."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS memory (
                        id TEXT PRIMARY KEY,
                        layer TEXT,
                        content TEXT,
                        source_provenance TEXT,
                        confidence_score REAL,
                        invalidation_rules TEXT,
                        status TEXT DEFAULT 'Created',
                        timestamp TEXT,
                        commit_hash TEXT,
                        creator TEXT DEFAULT 'system',
                        ekg_links TEXT
                    )
                ''')
                conn.commit()
        except sqlite3.Error as e:
            print(f"Error initializing memory DB: {e}")

    def add_memory(self, layer: str, content: str, source_provenance: str,
                   confidence_score: float, invalidation_rules: str,
                   creator: str = 'system', commit_hash: str = '',
                   ekg_links: List[str] = None) -> str:
        """Add a new memory item and return its ID."""
        if ekg_links is None:
            ekg_links = []
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO memory (
                        id, layer, content, source_provenance, confidence_score,
                        invalidation_rules, status, timestamp, commit_hash,
                        creator, ekg_links
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    memory_id, layer, content, source_provenance, confidence_score,
                    invalidation_rules, MemoryStatus.CREATED.value, timestamp, commit_hash,
                    creator, json.dumps(ekg_links)
                ))
                conn.commit()
            return memory_id
        except sqlite3.Error as e:
            print(f"Error adding memory: {e}")
            return ""

    def _row_to_memory_item(self, row) -> MemoryItem:
        return MemoryItem(
            id=row[0],
            layer=row[1],
            content=row[2],
            source_provenance=row[3],
            confidence_score=row[4],
            invalidation_rules=row[5],
            status=row[6],
            timestamp=row[7],
            commit_hash=row[8],
            creator=row[9],
            ekg_links=json.loads(row[10]) if row[10] else []
        )

    def get_by_layer(self, layer: str) -> List[MemoryItem]:
        """Retrieve memory items by layer."""
        results = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM memory WHERE layer = ?', (layer,))
                for row in cursor.fetchall():
                    results.append(self._row_to_memory_item(row))
        except sqlite3.Error as e:
            print(f"Error retrieving memory by layer: {e}")
        return results

    def get_by_status(self, status: str) -> List[MemoryItem]:
        """Retrieve memory items by status."""
        results = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM memory WHERE status = ?', (status,))
                for row in cursor.fetchall():
                    results.append(self._row_to_memory_item(row))
        except sqlite3.Error as e:
            print(f"Error retrieving memory by status: {e}")
        return results

    def update_status(self, memory_id: str, new_status: str):
        """Update the status of a memory item."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('UPDATE memory SET status = ? WHERE id = ?', (new_status, memory_id))
                conn.commit()
        except sqlite3.Error as e:
            print(f"Error updating memory status: {e}")

    def invalidate(self, memory_id: str):
        """Set a memory status to Revoked."""
        self.update_status(memory_id, MemoryStatus.REVOKED.value)

    def promote(self, memory_id: str):
        """Promote a memory (e.g., Created -> Verified or Verified -> Active).
        For simplicity, this immediately sets to Active if it was Verified, or Verified if it was Created.
        Actually, let's just set it to ACTIVE as it's the final usable state, or progress it."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT status FROM memory WHERE id = ?', (memory_id,))
                row = cursor.fetchone()
                if row:
                    current_status = row[0]
                    new_status = MemoryStatus.VERIFIED.value if current_status == MemoryStatus.CREATED.value else MemoryStatus.ACTIVE.value
                    self.update_status(memory_id, new_status)
        except sqlite3.Error as e:
            print(f"Error promoting memory: {e}")

    def archive(self, memory_id: str):
        """Set a memory status to Archived."""
        self.update_status(memory_id, MemoryStatus.ARCHIVED.value)

    def mark_stale_by_file(self, file_path: str):
        """Find memories linked to a file and mark them Stale."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                # Basic string matching for file_path in source_provenance or ekg_links
                cursor.execute('''
                    UPDATE memory
                    SET status = ?
                    WHERE source_provenance LIKE ? OR ekg_links LIKE ?
                ''', (MemoryStatus.STALE.value, f'%{file_path}%', f'%{file_path}%'))
                conn.commit()
        except sqlite3.Error as e:
            print(f"Error marking stale memories: {e}")

    def get_context_for_task(self, task_description: str = '') -> str:
        """Dump relevant active memories formatted for LLM context, prioritize by confidence score, include layer headers."""
        context_parts = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                # Fetch only ACTIVE memories, ordered by layer and then confidence score descending
                cursor.execute('''
                    SELECT * FROM memory
                    WHERE status = ?
                    ORDER BY layer, confidence_score DESC
                ''', (MemoryStatus.ACTIVE.value,))
                rows = cursor.fetchall()
                
                memories_by_layer = {}
                for row in rows:
                    item = self._row_to_memory_item(row)
                    if item.layer not in memories_by_layer:
                        memories_by_layer[item.layer] = []
                    memories_by_layer[item.layer].append(item)
                
                for layer, items in memories_by_layer.items():
                    context_parts.append(f"=== Layer: {layer} ===")
                    for item in items:
                        context_parts.append(f"- [Confidence: {item.confidence_score}] {item.content}")
                    context_parts.append("")
        except sqlite3.Error as e:
            print(f"Error generating context: {e}")
            
        return "\n".join(context_parts)

    def clear_working_memory(self):
        """Delete all Working layer items (ephemeral)."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM memory WHERE layer = ?', (MemoryLayer.WORKING.value,))
                conn.commit()
        except sqlite3.Error as e:
            print(f"Error clearing working memory: {e}")

    def clear_task_memory(self):
        """Delete all Task layer items."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM memory WHERE layer = ?', (MemoryLayer.TASK.value,))
                conn.commit()
        except sqlite3.Error as e:
            print(f"Error clearing task memory: {e}")
