#!/usr/bin/env python3
import subprocess
import pty
import os
import time
import sys

# Create a pseudo-terminal
master, slave = pty.openpty()

proc = subprocess.Popen(
    ['loclx', 'account', 'login'],
    stdin=slave,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    close_fds=True
)

os.close(slave)

# Read output
output = b''
try:
    while True:
        try:
            data = os.read(master, 1024)
            output += data
            sys.stdout.buffer.write(data)
            sys.stdout.flush()
            if b'please type your access token' in output:
                time.sleep(0.3)
                os.write(master, b'oPi3ry2GdAdk7ZAesBpNDD3l4Hkr0gIgemxjfvKb\n')
                time.sleep(1)
        except OSError:
            break
except Exception as e:
    print(f'Error: {e}')
finally:
    os.close(master)
    proc.wait()

print('\n--- Final output ---')
print(output.decode())