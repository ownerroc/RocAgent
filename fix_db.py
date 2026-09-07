import json
import re

# Read file
with open('db.json', 'r') as f:
    content = f.read()

# Fix 1: Replace parameters string with proper JSON object
# Pattern: "parameters": "{...}"
# Replace with proper multiline JSON

# Find all occurrences of "parameters": "{" pattern
pattern = r'"parameters":\s*"(\{[^}]+\})"'
matches = re.findall(pattern, content)
print(f"Found {len(matches)} parameters as string")

# Replace using a more robust approach
# We'll use regex to find and fix each occurrence

def fix_parameters(match):
    inner = match.group(1)
    try:
        # Try to parse and pretty print
        obj = json.loads(inner)
        return '"parameters": ' + json.dumps(obj, indent=8)
    except:
        return match.group(0)

# Actually, let's do a simpler fix - replace the specific tools
# Find Systemdocker and SystemfileOps entries and fix them

# Fix Systemdocker
content = content.replace(
    '"parameters": "{\\"type\\": \\"object\\", \\"properties\\": {\\"command\\": {\\"type\\": \\"string\\"}, \\"args\\": {\\"type\\": \\"array\\", \\"items\\": {\\"type\\": \\"string\\"}}}}"',
    '''"parameters": {
        "type": "object",
        "properties": {
          "command": {
            "type": "string"
          },
          "args": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      }'''
)

# Fix SystemfileOps
content = content.replace(
    '"parameters": "{\\"type\\": \\"object\\", \\"properties\\": {\\"command\\": {\\"type\\": \\"string\\"}, \\"args\\": {\\"type\\": \\"array\\", \\"items\\": {\\"type\\": \\"string\\"}}}}"',
    '''"parameters": {
        "type": "object",
        "properties": {
          "command": {
            "type": "string"
          },
          "args": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      }'''
)

# Fix empty object {}
# Find pattern: "    },\n    {}," or similar
content = re.sub(r'(\n    \},\n)    \{\},', r'\1', content)

# Write back
with open('db.json', 'w') as f:
    f.write(content)

print("Done!")

# Verify
with open('db.json', 'rb') as f:
    new_content = f.read()
    
if b'"parameters": "{' in new_content:
    print("STILL FOUND: parameters as string")
else:
    print("FIXED: No parameters as string")
    
if b'    {}' in new_content:
    print("STILL FOUND: empty object")
else:
    print("FIXED: No empty object")