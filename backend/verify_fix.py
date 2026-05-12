
import sys
import os
import logging

# Setup path to backend
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

logging.basicConfig(level=logging.INFO)

from app.services.network_map_service import NetworkMapService

def verify():
    print("Running NetworkMapService._compute()...")
    try:
        data = NetworkMapService._compute()
    except Exception as e:
        with open("verify_result.txt", "w") as f:
            f.write(f"FAILED: {e}\n")
        import traceback
        traceback.print_exc()
    else:
        with open("verify_result.txt", "w") as f:
            graph = data.get("graph", {})
            root_id = graph.get("id")
            children = graph.get("children", [])
            f.write(f"SUCCESS\nRoot: {root_id}\nChildren: {len(children)}\n")
            if children:
                f.write(f"First Child: {children[0]['name']} (Val: {children[0]['val']})\n")

if __name__ == "__main__":
    verify()
