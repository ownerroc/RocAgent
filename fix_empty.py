import json
import re

with open('db.json', 'r') as f:
    content = f.read()

# Fix empty object pattern - specifically in tools array
# Pattern: },    {},    { in tools section

# Find the tools section
tools_start = content.find('"tools": [')
tools_end = content.rfind(']')

if tools_start > 0 and tools_end > 0:
    tools_section = content[tools_start:tools_end]
    
    # Find and remove empty object {}, 
    # Pattern: "required": [...],    {}    or similar
    fixed = re.sub(r'(\n    \}\n)    \{\},(\n)', r'\1\2', tools_section)
    
    content = content[:tools_start] + fixed + content[tools_end:]

# Also try another pattern
content = re.sub(r'(\n    \}\n)    \{\},\n(\n    \{)', r'\1\2', content)

with open('db.json', 'w') as f:
    f.write(content)

# Verify
with open('db.json', 'rb') as f:
    new_content = f.read()
    
if b'    {}' in new_content:
    print("STILL FOUND: empty object")
else:
    print("FIXED: No empty object")
    
# Count tools
with open('db.json', 'r') as f:
    data = json.load(f)
    
tools = data.get('tools', [])
print(f"Total tools: {len(tools)}")

# Check last 5
for i in range(max(0, len(tools)-5), len(tools)):
    t = tools[i]
    name = t.get('name', 'NO_NAME')
    params_type = type(t.get('parameters')).__name__
    print(f"Index {i}: {name} | params={params_type}")