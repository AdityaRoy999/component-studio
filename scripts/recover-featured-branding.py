"""Cache selected project-owned branding discovered in source documentation."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import runpy

ROOT = Path(__file__).resolve().parents[1]
logo_tools = runpy.run_path(str(ROOT / 'scripts/fetch-featured-logos.py'))
fetch, save = logo_tools['fetch'], logo_tools['save']
SELECTED = {
    'aos':'https://s32.postimg.org/ktvt59hol/aos_header.png',
    'uplot':'https://raw.githubusercontent.com/leeoniya/uPlot/HEAD/uPlot.svg',
    'observable-plot':'https://observablehq.com/plot/plot.svg',
    'roughviz':'https://raw.githubusercontent.com/jwilber/random_data/master/roughViz_Title.png',
    'veevalidate':'https://raw.githubusercontent.com/logaretm/vee-validate/main/logo.png',
    'react-json-schema-form':'https://raw.githubusercontent.com/rjsf-team/react-jsonschema-form/59a8206e148474bea854bbb004f624143fbcbac8/packages/core/logo.png',
    'downshift':'https://raw.githubusercontent.com/downshift-js/downshift/master/other/public/logo/downshift.svg',
    'moveable':'https://raw.githubusercontent.com/daybrush/moveable/master/demo/images/logo.png',
    'allotment':'https://raw.githubusercontent.com/johnwalley/allotment/HEAD/assets/logo.svg',
    'leaflet':'https://raw.githubusercontent.com/Leaflet/Leaflet/HEAD/src/images/logo.svg',
    'react-loading-skeleton':'https://raw.githubusercontent.com/dvtng/react-loading-skeleton/HEAD/assets/logo.svg',
    'konva':'https://konvajs.org/img/icon.png',
    'restyle':'https://raw.githubusercontent.com/Shopify/restyle/HEAD/Restyle.png',
    'flashlist':'https://raw.githubusercontent.com/Shopify/flash-list/HEAD/FlashList.png',
    'tippy-js':'https://raw.githubusercontent.com/atomiks/tippyjs/master/logo.png',
    'micromodal':'https://raw.githubusercontent.com/ghosh/Micromodal/HEAD/logo.svg',
    'recharts':'https://raw.githubusercontent.com/recharts/recharts/HEAD/www/public/logo.svg',
    'react-data-table-component':'https://raw.githubusercontent.com/jbetancur/react-data-table-component/HEAD/apps/docs/public/favicon.svg',
    'react-virtualized':'https://raw.githubusercontent.com/bvaughn/react-virtualized/HEAD/public/favicon.svg',
    'vueuse-motion':'https://raw.githubusercontent.com/vueuse/motion/HEAD/docs/public/logo.svg',
    'visx':'https://raw.githubusercontent.com/airbnb/visx/HEAD/packages/visx-demo/public/static/logo-dark.png',
    'tsparticles':'https://raw.githubusercontent.com/tsparticles/tsparticles/HEAD/demo/astro/public/favicon.svg',
    'tagify':'https://raw.githubusercontent.com/yairEO/tagify/HEAD/docs/logo.svg',
    'modular-forms':'https://raw.githubusercontent.com/fabian-hiller/modular-forms/HEAD/website/public/favicon-32x32.png',
    'video-js':'https://raw.githubusercontent.com/videojs/video.js/HEAD/site/public/favicon.svg',
    'pragmatic-drag-and-drop':'https://raw.githubusercontent.com/atlassian/pragmatic-drag-and-drop/HEAD/packages/documentation/examples/pieces/pdnd-logo.svg',
    'split-js':'https://raw.githubusercontent.com/nathancahill/split/HEAD/packages/splitjs/logo.svg',
    'react-datepicker':'https://raw.githubusercontent.com/Hacker0x01/react-datepicker/HEAD/docs-site/src/components/App/logo.png',
    'magnus-ui':'https://raw.githubusercontent.com/jsartisan/react-native-magnus/HEAD/docs/public/images/favicon/android-chrome-192x192.png',
    'dripsy':'https://raw.githubusercontent.com/nandorojo/dripsy/HEAD/docs/public/favicon.png',
}

def recover(row):
    try:
        response = fetch(SELECTED[row['id']])
        return save(row,response.url,response.content)
    except Exception as error:
        return {'id':row['id'],'error':str(error)[:160]}

if __name__ == '__main__':
    rows = json.loads((ROOT / 'artifacts/featured-library-sources.json').read_text(encoding='utf-8'))
    destination = ROOT / 'artifacts/featured-recovered-logos.json'
    cached = {row['id']:row for row in json.loads(destination.read_text(encoding='utf-8'))} if destination.exists() else {}
    results = [row for row in cached.values() if row.get('src')]
    with ThreadPoolExecutor(max_workers=12) as pool:
        for future in as_completed([pool.submit(recover,row) for row in rows if row['id'] in SELECTED and not cached.get(row['id'],{}).get('src')]):
            result = future.result()
            results.append(result)
            print(json.dumps({key:value for key,value in result.items() if key in ['id','src','error']}),flush=True)
    destination.write_text(json.dumps(results,indent=2),encoding='utf-8')
