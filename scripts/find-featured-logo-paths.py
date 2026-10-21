"""Inspect source trees for brand assets missing from documentation pages."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import requests

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / 'docs/featured-library-evidence.json').read_text(encoding='utf-8'))
TARGETS = {'aos','recharts','tsParticles'.lower(),'json-forms','react-type-animation','react-awesome-reveal','ring-ui','visx','react-virtualized','tom-select','modular-forms','tagify','imask','react-page','glightbox','video-js','react-player','feather','monaco-editor','react-grid-layout','split-js','react-big-calendar','react-datepicker','magnus-ui','dripsy','legend-list','countup-js','headroom-js','lottie-web','react-data-grid','react-data-table-component','pragmatic-drag-and-drop','vueuse-motion','rellax','vivus'}

def inspect(row):
    try:
        response = requests.get(f"https://api.github.com/repos/{row['repository']}/git/trees/HEAD?recursive=1",timeout=20)
        response.raise_for_status()
        paths = [entry['path'] for entry in response.json().get('tree',[]) if entry['path'].lower().endswith(('.svg','.png','.ico','.webp')) and any(word in entry['path'].lower() for word in ['logo','favicon','brand'])]
        paths = [p for p in paths if not any(word in p.lower() for word in ['node_modules','sponsor','browserstack','jetbrains','npm-logo','github-logo','testmu','storybook-logo','reddit'])]
        paths.sort(key=lambda p:(0 if 'favicon' in p.lower() else 1,len(p)))
        return {'id':row['id'],'repository':row['repository'],'paths':paths[:8]}
    except requests.RequestException as error:
        return {'id':row['id'],'error':str(error)[:140]}

results = []
with ThreadPoolExecutor(max_workers=12) as pool:
    for future in as_completed([pool.submit(inspect,row) for row in rows if row['id'] in TARGETS]):
        result = future.result()
        results.append(result)
        print(json.dumps(result),flush=True)
(ROOT / 'artifacts/featured-logo-paths.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
