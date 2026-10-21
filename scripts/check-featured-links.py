"""Record reachability of official documentation for the curated additions."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import re
import requests

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / 'docs/featured-library-evidence.json').read_text(encoding='utf-8'))

def check(row):
    try:
        with requests.get(row['url'], timeout=16, stream=True, headers={'User-Agent':'Mozilla/5.0'}) as response:
            body = next(response.iter_content(180000), b'').decode('utf-8', errors='replace')
            title = re.search(r'<title[^>]*>(.*?)</title>', body, re.S | re.I)
            return {'id':row['id'], 'url':row['url'], 'status':response.status_code,
                    'finalUrl':response.url, 'title':re.sub(r'\s+', ' ', title.group(1)).strip() if title else ''}
    except requests.RequestException as error:
        return {'id':row['id'], 'url':row['url'], 'error':str(error)[:180]}

results = []
with ThreadPoolExecutor(max_workers=16) as pool:
    for future in as_completed([pool.submit(check, row) for row in rows if row.get('license')]):
        result = future.result()
        results.append(result)
        if result.get('status') != 200: print(json.dumps(result), flush=True)
(ROOT / 'artifacts/featured-link-checks.json').write_text(json.dumps(sorted(results, key=lambda row:row['id']), indent=2), encoding='utf-8')
print(json.dumps({'checked':len(results), 'reachable':sum(row.get('status')==200 for row in results)}), flush=True)
