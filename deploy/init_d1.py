import json
import os
import requests

CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'
CLOUDFLARE_ACCOUNT_ID = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
CLOUDFLARE_API_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', '')

headers = {
    'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
    'Content-Type': 'application/json',
}

# Check if D1 database exists
resp = requests.get(
    f'{CLOUDFLARE_API_BASE}/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database',
    headers=headers,
)
resp.raise_for_status()
databases = resp.json().get('result', [])

d1_name = 'uptimeflare_d1'
d1_id = None

for db in databases:
    if db['name'] == d1_name:
        d1_id = db['uuid']
        print(f'D1 database {d1_name} already exists with id {d1_id}')
        break

if d1_id is None:
    # Create D1 database
    resp = requests.post(
        f'{CLOUDFLARE_API_BASE}/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database',
        headers=headers,
        json={'name': d1_name},
    )
    resp.raise_for_status()
    d1_id = resp.json()['result']['uuid']
    print(f'Created D1 database {d1_name} with id {d1_id}')

# Write D1_ID to GITHUB_ENV
with open(os.environ.get('GITHUB_ENV', '/dev/null'), 'a') as f:
    f.write(f'D1_ID={d1_id}\n')

# Initialize table
with open('init.sql', 'r') as f:
    query = f.read()

resp = requests.post(
    f'{CLOUDFLARE_API_BASE}/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{d1_id}/query',
    headers=headers,
    json={'sql': query},
)
resp.raise_for_status()
print('Table initialized successfully')
