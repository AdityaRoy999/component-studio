"""Find project-owned logo assets in source READMEs when a site has no favicon."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin
import html
import json
import re
import requests

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / 'docs/featured-library-evidence.json').read_text(encoding='utf-8'))

def discover(row):
    base = f"https://raw.githubusercontent.com/{row['repository']}/HEAD/"
    try:
        response = requests.get(base + 'README.md', timeout=12)
        if response.status_code != 200: return {'id':row['id'], 'images':[]}
        body = response.text[:18000]
        images = []
        for source, label in [(m[1],m[0]) for m in re.findall(r'!\[([^\]]*)\]\(([^\s)]+)(?:[^)]*)\)',body)]:
            images.append((source,label))
        for tag in re.findall(r'<img\b[^>]*>',body,re.I):
            src = re.search(r'(?:src)=["\']([^"\']+)',tag,re.I)
            alt = re.search(r'(?:alt)=["\']([^"\']+)',tag,re.I)
            if src: images.append((src.group(1),alt.group(1) if alt else ''))
        candidates = []
        for source,label in images:
            text = (source + ' ' + label).lower()
            if any(term in text for term in ['badge','shields.io','sponsor','workflow','star-history','opencollective','license','npmjs','build','coverage','discord','twitter','contributors','demo.gif','screenshot']): continue
            if not any(term in text for term in ['logo','icon','brand']) and not (row['name'].lower() in label.lower() and source.lower().endswith(('.svg','.png'))): continue
            source = html.unescape(source)
            source = re.sub(r'https://github.com/([^/]+/[^/]+)/blob/([^/]+)/',r'https://raw.githubusercontent.com/\1/\2/',source)
            if not source.startswith('http'): source = urljoin(base,source.lstrip('/'))
            if source not in candidates: candidates.append(source)
        return {'id':row['id'], 'readme':response.url, 'images':candidates[:5]}
    except requests.RequestException:
        return {'id':row['id'], 'images':[]}

results = []
with ThreadPoolExecutor(max_workers=20) as pool:
    for future in as_completed([pool.submit(discover,row) for row in rows if row.get('license')]):
        results.append(future.result())
(ROOT / 'artifacts/featured-readme-branding.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps({'checked':len(results),'withBranding':sum(bool(row['images']) for row in results)}))
