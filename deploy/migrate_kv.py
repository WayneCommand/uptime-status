import json
import os
import requests

CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'
CLOUDFLARE_ACCOUNT_ID = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
CLOUDFLARE_API_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', '')
D1_ID = os.environ.get('D1_ID', '')

headers = {
    'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
    'Content-Type': 'application/json',
}

# Find KV namespace ID
resp = requests.get(
    f'{CLOUDFLARE_API_BASE}/accounts/{CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces',
    headers=headers,
)
resp.raise_for_status()
namespaces = resp.json().get('result', [])

kv_id = None
for ns in namespaces:
    if ns['title'] == 'uptimeflare_kv':
        kv_id = ns['id']
        break

if kv_id is None:
    print('No KV namespace found, nothing to migrate')
    exit(0)

# Get state from KV
resp = requests.get(
    f'{CLOUDFLARE_API_BASE}/accounts/{CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/{kv_id}/values/state',
    headers=headers,
)
if resp.status_code != 200:
    print('No state found in KV, nothing to migrate')
    exit(0)

state = resp.text
print(f'Migrating state from KV (size: {len(state)} bytes)')

# Write to D1
query = "INSERT INTO uptimeflare (key, value) VALUES ('state', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;"
resp = requests.post(
    f'{CLOUDFLARE_API_BASE}/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{D1_ID}/query',
    headers=headers,
    json={'sql': query, 'params': [state]},
)
resp.raise_for_status()
print('State migrated to D1 successfully')

# Delete KV namespace
resp = requests.delete(
    f'{CLOUDFLARE_API_BASE}/accounts/{CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/{kv_id}',
    headers=headers,
)
resp.raise_for_status()
print('Old KV namespace deleted successfully')
