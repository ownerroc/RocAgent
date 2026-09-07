#!/usr/bin/env python3
"""
Unified utility for dumping data to disk and safely terminating subprocesses.

Features:
- Dump arrays/data to disk using op.dumper() pattern or pickle.
- Kill subprocesses with timeout and cleanup.
- Safe for use in inference pipelines and training loops.
"""

import os
import pickle
import signal
import subprocess
import time
from pathlib import Path
from typing import Any, Optional, Union



class DumpAndKill:
    def __init__(self, dump_dir: Union[str, Path] = "dumps"):
        self.dump_dir = Path(dump_dir)
        self.dump_dir.mkdir(parents=True, exist_ok=True)

    def dumper(self, data: Any, filename: str = None, ext: str = ".pkl") -> str:
        """
        Dump data to disk using pickle.
        Returns the path to the dumped file.
        """
        if filename is None:
            timestamp = int(time.time())
            filename = f"dump_{timestamp}{ext}"
        filepath = self.dump_dir / filename
        with open(filepath, "wb") as f:
            pickle.dump(data, f)
        return str(filepath)

    def kill_subprocess(self, proc: subprocess.Popen, timeout: float = 5.0) -> bool:
        """
        Kill a subprocess safely with timeout and cleanup.
        Returns True if killed, False if it exited on its own.
        """
        if proc.poll() is not None:
            return False  # already dead
        try:
            proc.kill()
            try:
                proc.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                # Force kill if still alive
                proc.kill()
                proc.wait()
            return True
        except Exception:
            return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Dump data and/or kill a subprocess")
    parser.add_argument("--dump", action="store_true", help="Dump sample data to disk")
    parser.add_argument("--kill", type=int, help="PID of subprocess to kill")
    parser.add_argument("--timeout", type=float, default=5.0, help="Kill timeout in seconds")
    args = parser.parse_args()

    dk = DumpAndKill()

    if args.dump:
        sample = {"msg": "sample payload", "ts": time.time()}
        path = dk.dumper(sample, "sample_payload.pkl")
        print(f"Dumped to: {path}")

    if args.kill:
        try:
            proc = subprocess.Popen([], start_new_session=True)
            proc.pid = args.kill
            killed = dk.kill_subprocess(proc, args.timeout)
            print(f"Killed PID {args.kill}: {'success' if killed else 'already dead'}")
        except Exception as e:
            print(f"Failed to kill PID {args.kill}: {e}")



if __name__ == "__main__":
    main()
