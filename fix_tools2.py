import json
import sys

print("Starting fix...", flush=True)

# Load db.json
try:
    with open('db.json', 'r') as f:
        content = f.read()
        print(f"File loaded, size: {len(content)}", flush=True)
        data = json.loads(content)
        print("JSON parsed successfully", flush=True)
except Exception as e:
    print(f"Error loading: {e}", flush=True)
    sys.exit(1)

tools = data.get('tools', [])
print(f'Total tools before: {len(tools)}', flush=True)

# Fix: remove empty tool at index 65, fix Systemdocker & SystemfileOps
fixed_tools = []
removed_empty = False
fixed_docker = False
fixed_fileops = False

for i, t in enumerate(tools):
    if i == 65 and not t.get('name'):
        # Skip empty tool
        print(f'Removing index 65: {t}', flush=True)
        removed_empty = True
        continue
    
    new_t = dict(t)  # Make a copy
    
    if new_t.get('name') == 'Systemdocker':
        # Fix parameters - convert string to object
        params = new_t.get('parameters', '{}')
        if isinstance(params, str):
            new_t['parameters'] = json.loads(params)
            print(f'Fixed Systemdocker parameters', flush=True)
            fixed_docker = True
    
    if new_t.get('name') == 'SystemfileOps':
        # Fix parameters - convert string to object
        params = new_t.get('parameters', '{}')
        if isinstance(params, str):
            new_t['parameters'] = json.loads(params)
            print(f'Fixed SystemfileOps parameters', flush=True)
            fixed_fileops = True
    
    fixed_tools.append(new_t)

data['tools'] = fixed_tools
print(f'Total tools after: {len(fixed_tools)}', flush=True)

# Save with explicit encoding
try:
    with open('db.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print('File saved successfully', flush=True)
except Exception as e:
    print(f"Error saving: {e}", flush=True)
    sys.exit(1)

print('=== SUMMARY ===', flush=True)
print(f'Removed empty tool: {removed_empty}', flush=True)
print(f'Fixed Systemdocker: {fixed_docker}', flush=True)
print(f'Fixed SystemfileOps: {fixed_fileops}', flush=True)
print('✅ DONE!', flush=True)