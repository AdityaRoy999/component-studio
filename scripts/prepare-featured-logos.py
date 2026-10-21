"""Prepare the typed logo registry and light/dark contact sheets for review."""
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageStat
import json

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / 'public/featured/sources.json').read_text(encoding='utf-8'))
active = {row['id'] for row in json.loads((ROOT / 'artifacts/featured-library-sources.json').read_text(encoding='utf-8'))}
rows = [row for row in rows if row['id'] in active]
registry = {}
review = []
for row in rows:
    if 'src' not in row:
        raise ValueError(f"Missing logo: {row['name']}")
    source = ROOT / 'public' / row['src'].lstrip('/')
    preview = ROOT / 'artifacts/featured-logo-review' / f"{row['id']}.png" if source.suffix == '.svg' else source
    image = Image.open(preview).convert('RGBA')
    image.thumbnail((180, 180), Image.Resampling.LANCZOS)
    # Preserve brand colors. Only invert transparent monochrome marks when
    # their native color would disappear against the corresponding theme.
    pixels = [p for p in image.getdata() if p[3] > 64]
    if not pixels:
        raise ValueError(f"Empty logo: {row['name']}")
    alpha_fraction = sum(p[3] < 200 for p in image.getdata()) / (image.width * image.height)
    chromatic = sum(max(p[:3]) - min(p[:3]) > 30 for p in pixels) / len(pixels)
    brightness = sum((p[0]*.2126 + p[1]*.7152 + p[2]*.0722) for p in pixels) / len(pixels)
    entry = {'src': row['src']}
    if image.width > image.height * 1.8:
        entry['wide'] = True
    if alpha_fraction > .15 and chromatic < .08:
        if brightness < 110:
            entry['invertInDark'] = True
        elif brightness > 175:
            entry['invertInLight'] = True
    if row['id'] == 'choices-js':
        entry['invertInDark'] = True
    registry[row['id']] = entry
    review.append((row['name'], image, entry))

header = 'export interface FeaturedLogo { src: string; invertInDark?: boolean; invertInLight?: boolean; wide?: boolean; }\n\n'
(ROOT / 'src/data/featured-logos.ts').write_text(header + 'export const FEATURED_LOGOS: Record<string, FeaturedLogo> = ' + json.dumps(registry, indent=2) + ';\n', encoding='utf-8')

font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 12)
for page in range((len(review)+39)//40):
    batch = review[page*40:(page+1)*40]
    sheet = Image.new('RGB', (1000, ((len(batch)+4)//5)*118), '#343434')
    draw = ImageDraw.Draw(sheet)
    for index, (name, image, entry) in enumerate(batch):
        x, y = (index % 5)*200, (index // 5)*118
        for is_dark, background, dx in [(True, '#1b1b1b', 0), (False, '#f3f3f3', 100)]:
            tile = Image.new('RGBA', (100, 88), background)
            icon = image.copy()
            icon.thumbnail((64, 64), Image.Resampling.LANCZOS)
            if entry.get('invertInDark' if is_dark else 'invertInLight'):
                r, g, b, a = icon.split()
                icon = Image.merge('RGBA', (r.point(lambda p:255-p), g.point(lambda p:255-p), b.point(lambda p:255-p), a))
            tile.alpha_composite(icon, ((100-icon.width)//2, (88-icon.height)//2))
            sheet.paste(tile.convert('RGB'), (x+dx, y))
        draw.text((x+6, y+93), name[:27], font=font, fill='white')
    sheet.save(ROOT / 'artifacts' / f'featured-logo-review-{page+1}.png')
print(json.dumps({'logos':len(registry), 'themeAdjusted':sum(len(v)>1 for v in registry.values()), 'smallRasters':[row['id'] for row in rows if row.get('width',72)<48]}, indent=2))
