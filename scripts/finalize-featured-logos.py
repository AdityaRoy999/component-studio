"""Merge recovered branding, keeping only assets matching their source hashes."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'public/featured/sources.json'
rows = json.loads(path.read_text(encoding='utf-8'))
recovered = json.loads((ROOT / 'artifacts/featured-recovered-logos.json').read_text(encoding='utf-8'))
by_id = {row['id']:row for row in rows}
for row in recovered:
    if not row.get('src'): continue
    file = ROOT / 'public' / row['src'].lstrip('/')
    if hashlib.sha256(file.read_bytes()).hexdigest() == row['sha256']:
        by_id[row['id']] = row
for row in by_id.values():
    if 'github.githubassets.com' in row.get('source',''):
        row.pop('src',None)
        row['error'] = ['The documentation uses a generic GitHub icon rather than project branding.']
path.write_text(json.dumps(list(by_id.values()),indent=2),encoding='utf-8')
print(json.dumps({'branded':sum('src' in row for row in by_id.values()), 'missing':[row['id'] for row in by_id.values() if 'src' not in row]},indent=2))
