#!/usr/bin/env python3
"""
Payload recycling and serialization utilities.

Features:
- Serialize/deserialize payloads to/from disk.
- Reuse payloads across examples and pipelines.
- Validate payload integrity before use.
"""

import json
import pickle
from pathlib import Path
from typing import Any, Dict, Optional, Union



class PayloadManager:
    def __init__(self, payload_dir: Union[str, Path] = "payloads"):
        self.payload_dir = Path(payload_dir)
        self.payload_dir.mkdir(parents=True, exist_ok=True)

    def save_payload(self, payload: Dict[str, Any], name: str, ext: str = ".json") -> str:
        """
        Save a payload to disk.
        Returns the path to the saved payload.
        """
        filepath = self.payload_dir / f"{name}{ext}"
        if ext == ".json":
            with open(filepath, "w") as f:
                json.dump(payload, f, indent=2)
        else:
            with open(filepath, "wb") as f:
                pickle.dump(payload, f)
        return str(filepath)

    def load_payload(self, name: str, ext: str = ".json") -> Optional[Dict[str, Any]]:
        """
        Load a payload from disk.
        Returns None if file not found or corrupt.
        """
        filepath = self.payload_dir / f"{name}{ext}"
        if not filepath.exists():
            return None
        try:
            if ext == ".json":
                with open(filepath, "r") as f:
                    return json.load(f)
            else:
                with open(filepath, "rb") as f:
                    return pickle.load(f)
        except Exception:
            return None

    def recycle_payload(self, name: str, payload: Dict[str, Any]) -> str:
        """
        Recycle an existing payload by updating its content.
        Returns the path to the updated payload.
        """
        return self.save_payload(payload, name)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Manage payloads")
    parser.add_argument("--save", type=str, help="Save a payload with given name")
    parser.add_argument("--load", type=str, help="Load a payload by name")
    parser.add_argument("--recycle", type=str, help="Recycle a payload by name")
    args = parser.parse_args()

    pm = PayloadManager()

    if args.save:
        payload = {"msg": "sample payload", "ts": "now"}
        path = pm.save_payload(payload, args.save)
        print(f"Saved payload to: {path}")

    if args.load:
        payload = pm.load_payload(args.load)
        print(f"Loaded payload: {payload}")

    if args.recycle:
        payload = {"msg": "recycled payload", "ts": "now"}
        path = pm.recycle_payload(args.recycle, payload)
        print(f"Recycled payload to: {path}")



if __name__ == "__main__":
    main()
