import json

with open('db.json', 'r') as f:
    data = json.load(f)

tools = data.get('tools', [])
print(f'Total tools: {len(tools)}')

# Check last 10 tools
for i in range(-10, 0):
    t = tools[i]
    name = t.get('name')
    params = t.get('parameters')
    params_type = type(params).__name__
    print(f'Index {len(tools)+i}: name={repr(name)}, paramsType={params_type}')