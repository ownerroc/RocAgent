#!/usr/bin/env python3
"""
Keylogger trap and file access monitor.

Monitors suspicious file access patterns and logs them for security review.
"""

import os
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler



class KeylogTrap(FileSystemEventHandler):
    def __init__(self, watch_dirs: list = None, log_file: str = "keylog_trap.log"):
        self.watch_dirs = watch_dirs or ["/tmp", "/data/data/com.termux/files/home"]
        self.log_file = Path(log_file)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self._start_monitoring()

    def _start_monitoring(self):
        observer = Observer()
        for d in self.watch_dirs:
            if Path(d).exists():
                observer.schedule(self, d, recursive=True)
        observer.start()
        print(f"KeylogTrap started. Monitoring: {self.watch_dirs}")

    def on_modified(self, event):
        self._log_event("MODIFIED", event.src_path)

    def on_created(self, event):
        self._log_event("CREATED", event.src_path)

    def on_deleted(self, event):
        self._log_event("DELETED", event.src_path)

    def on_moved(self, event):
        self._log_event("MOVED", f"{event.src_path} -> {event.dest_path}")

    def _log_event(self, action: str, path: str):
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{ts}] [{action}] {path}\n"
        with open(self.log_file, "a") as f:
            f.write(log_line)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Keylogger trap and file monitor")
    parser.add_argument("--dirs", nargs="+", default=[], help="Directories to watch")
    args = parser.parse_args()

    watch_dirs = args.dirs if args.dirs else None
    KeylogTrap(watch_dirs=watch_dirs)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("KeylogTrap stopped by user")


if __name__ == "__main__":
    main()
