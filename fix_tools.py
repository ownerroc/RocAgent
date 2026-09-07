#!/usr/bin/env python3
"""Fix corrupted tools in db.json"""

import json
import sys

DB_PATH = "/data/data/com.termux/files/home/.agent/rocsystem/db.json"

def main():
    print("🔍 Loading db.json...")
    with open(DB_PATH, 'r') as f:
        db = json.load(f)
    
    tools = db.get('tools', [])
    print(f"📊 Total tools before: {len(tools)}")
    
    # Find problematic tools
    problematic = []
    for i, tool in enumerate(tools):
        name = tool.get('name', '')
        if not name or name == 'Systemdocker' or name == 'SystemfileOps':
            problematic.append((i, name, tool))
            print(f"  ⚠️  Index {i}: name='{name}'")
    
    print(f"\n🚫 Found {len(problematic)} problematic tools")
    
    # Remove problematic tools
    fixed_tools = [t for t in tools if t.get('name') and t.get('name') != 'Systemdocker' and t.get('name') != 'SystemfileOps']
    print(f"📊 Total tools after: {len(fixed_tools)}")
    
    # Save
    db['tools'] = fixed_tools
    with open(DB_PATH, 'w') as f:
        json.dump(db, f, indent=2)
    
    print("✅ Fixed and saved!")

if __name__ == "__main__":
    main()