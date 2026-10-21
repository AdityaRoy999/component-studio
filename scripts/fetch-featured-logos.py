"""Cache brand icons from the Featured projects' own sites for local delivery.

Input: artifacts/featured-library-sources.json (exported from src/data/featured.ts).
The manifest records each original asset URL so branding can be refreshed later.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin
import hashlib
import json
import re
import xml.etree.ElementTree as ET

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'featured'
DEST.mkdir(parents=True, exist_ok=True)
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; ComponentStudioLogoCache/1.0)'}

# These list entries link to source repositories; use their project branding.
PROJECT_SITES = {
    'cult-ui': 'https://cult-ui.com/',
    'origin-ui': 'https://originui.com/',
    'dice-ui': 'https://www.diceui.com/',
    'prompt-kit': 'https://www.prompt-kit.com/',
    'svelteui': 'https://www.svelteui.org/',
}

# A few projects publish their brand assets in the repository rather than
# serving an icon from their documentation site's root.
MANUAL_SOURCES = {
    'dice-ui': 'https://raw.githubusercontent.com/sadmann7/diceui/HEAD/docs/app/icon.png',
    'grommet': 'https://raw.githubusercontent.com/grommet/grommet-site/HEAD/public/img/icons/grommet-192x192.png',
    'react-spectrum': 'https://raw.githubusercontent.com/adobe/react-spectrum/HEAD/packages/dev/s2-docs/assets/rsp-favicon.svg',
    'flowbite-svelte': 'https://raw.githubusercontent.com/themesberg/flowbite-svelte/HEAD/static/images/flowbite-svelte-icon-logo.svg',
    'origin-ui': 'https://raw.githubusercontent.com/shadcn/originui/HEAD/public/logo.svg',
    'react-bootstrap': 'https://react-bootstrap.github.io/img/logo.svg',
    'cirrus': 'https://raw.githubusercontent.com/Spiderpig86/Cirrus/HEAD/img/CirrusLogo.png',
}

class Icons(HTMLParser):
    def __init__(self):
        super().__init__()
        self.candidates = []
        self.manifests = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag != 'link' or not attrs.get('href'):
            return
        rel = attrs.get('rel', '').lower()
        if 'icon' in rel:
            href = attrs['href']
            size = max([int(v) for v in re.findall(r'(\d+)x', attrs.get('sizes', ''))] or [32])
            score = 1000 if '.svg' in href or 'svg' in attrs.get('type', '') else 300 if 'apple-touch' in rel else min(size, 256)
            if 'mask-icon' in rel:
                score = 900
            self.candidates.append((score, href))
        if rel == 'manifest':
            self.manifests.append(attrs['href'])

def fetch(url):
    response = requests.get(url, headers=HEADERS, timeout=18)
    response.raise_for_status()
    if len(response.content) > 1_500_000:
        raise ValueError('Asset exceeds 1.5 MB')
    return response

def validate(data):
    if b'<svg' in data[:2000]:
        root = ET.fromstring(data)
        if not root.tag.endswith('svg'):
            raise ValueError('Invalid SVG')
        return 'svg', {'viewBox': root.get('viewBox', '')}
    with Image.open(BytesIO(data)) as image:
        if image.width < 16 or image.height < 16:
            raise ValueError('Icon is too small')
        ext = {'PNG':'png', 'JPEG':'jpg', 'ICO':'ico', 'WEBP':'webp', 'GIF':'gif'}.get(image.format)
        if not ext:
            raise ValueError('Unsupported image format')
        return ext, {'width':image.width, 'height':image.height}

def save(library, source, data):
    ext, details = validate(data)
    source_hash = hashlib.sha256(data).hexdigest()
    if ext != 'svg':
        # Cache a display-sized, lossless PNG instead of shipping large source
        # artwork or legacy ICO containers to every card.
        with Image.open(BytesIO(data)) as original:
            image = original.convert('RGBA')
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            output = BytesIO()
            image.save(output, format='PNG', optimize=True)
            data = output.getvalue()
            details = {'width':image.width, 'height':image.height}
            ext = 'png'
    filename = f"{library['id']}.{ext}"
    (DEST / filename).write_bytes(data)
    return {'id':library['id'], 'name':library['name'], 'src':f'/featured/{filename}', 'source':source,
            'sourceSha256':source_hash, 'sha256':hashlib.sha256(data).hexdigest(), **details}

def discover(library):
    errors = []
    if library['id'] in MANUAL_SOURCES:
        try:
            response = fetch(MANUAL_SOURCES[library['id']])
            return save(library, response.url, response.content)
        except Exception as error:
            errors.append(str(error)[:130])
    site = PROJECT_SITES.get(library['id'], library['url'])
    candidates = []
    try:
        response = fetch(site)
        site = response.url
        parser = Icons()
        parser.feed(response.text)
        candidates += [(score, urljoin(site, url)) for score, url in parser.candidates if not url.startswith('data:')]
        for manifest in parser.manifests[:1]:
            try:
                response = fetch(urljoin(site, manifest))
                for icon in response.json().get('icons', []):
                    if icon.get('src'):
                        candidates.append((200, urljoin(response.url, icon['src'])))
            except Exception:
                pass
    except Exception as error:
        errors.append(str(error)[:130])
    candidates += [(0, urljoin(site, path)) for path in ['/favicon.svg', '/apple-touch-icon.png', '/favicon.ico']]
    seen = set()
    for _, url in sorted(candidates, reverse=True):
        if url in seen:
            continue
        seen.add(url)
        try:
            response = fetch(url)
            return save(library, response.url, response.content)
        except Exception as error:
            errors.append(str(error)[:130])
    return {'id':library['id'], 'name':library['name'], 'error':errors[-3:]}

def main():
    libraries = json.loads((ROOT / 'artifacts' / 'featured-library-sources.json').read_text(encoding='utf-8'))
    manifest = DEST / 'sources.json'
    cached = {row['id']:row for row in json.loads(manifest.read_text(encoding='utf-8'))} if manifest.exists() else {}
    results = [cached[library['id']] for library in libraries if cached.get(library['id'], {}).get('src') and (ROOT / 'public' / cached[library['id']]['src'].lstrip('/')).exists()]
    ready = {row['id'] for row in results}
    with ThreadPoolExecutor(max_workers=14) as executor:
        futures = {executor.submit(discover, library):library for library in libraries if library['id'] not in ready}
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            print(f"{'OK' if 'src' in result else 'MISSING'} {result['name']}", flush=True)
    by_id = {result['id']:result for result in results}
    ordered = [by_id[library['id']] for library in libraries]
    (DEST / 'sources.json').write_text(json.dumps(ordered, indent=2), encoding='utf-8')
    print(json.dumps({'downloaded':sum('src' in item for item in ordered), 'missing':[item['id'] for item in ordered if 'src' not in item]}), flush=True)

if __name__ == '__main__':
    main()
