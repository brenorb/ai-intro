# Build 2x3 contact sheets from the PNGs in a folder.  Usage: uv run --with pillow python tools/sheets.py <dir>
import sys, glob, os
from PIL import Image, ImageDraw
d = sys.argv[1]; files = sorted(glob.glob(os.path.join(d, '[0-9]*.png')))
W, H, COLS, ROWS = 800, 450, 2, 3
for i in range(0, len(files), COLS * ROWS):
    sheet = Image.new('RGB', (W * COLS, H * ROWS), '#333')
    for k, f in enumerate(files[i:i + COLS * ROWS]):
        im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
        ImageDraw.Draw(im).text((8, H - 16), os.path.basename(f), fill='#ff0')
        sheet.paste(im, ((k % COLS) * W, (k // COLS) * H))
    sheet.save(os.path.join(d, f'sheet-{i // (COLS * ROWS):02d}.jpg'), quality=85)
print(len(files), 'shots')
