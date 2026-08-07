import os
from src.memory import MemoryManager
from src.schemas import MemoryItem

def test_memory_persistence():
    # Remove existing db if any
    if os.path.exists("test_memory.db"):
        os.remove("test_memory.db")
        
    mm = MemoryManager("test_memory.db")
    mm.add_memory("Working", "Test Content", "Test Source", 0.99, "Never")
    
    items = mm.get_memory_by_layer("Working")
    assert len(items) == 1
    assert items[0].content == "Test Content"
    assert items[0].confidence_score == 0.99
    
    print("Memory persistence test passed!")

if __name__ == "__main__":
    test_memory_persistence()
