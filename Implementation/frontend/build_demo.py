"""Package the split-source site as a single-file offline demonstration.
Run from project folder: python build_demo.py
"""
from pathlib import Path
import base64
import json
import re

here=Path(__file__).parent
html=(here/'index.html').read_text()
# The standalone file must not wait on Google Fonts before its JavaScript can run.
html=re.sub(r'<link[^>]+https://fonts\.googleapis\.com[^>]*>', '', html)
html=re.sub(r'<link[^>]+https://fonts\.gstatic\.com[^>]*>', '', html)
css=(here/'styles.css').read_text()
colour_css=(here/'colour.css').read_text()
assets={}
for asset in sorted((here/'assets').glob('*.svg')):
    uri='data:image/svg+xml;base64,'+base64.b64encode(asset.read_bytes()).decode('ascii')
    assets[asset.name]=uri
    html=html.replace('src="assets/'+asset.name+'"','src="'+uri+'"')
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+css+'\n</style>')
html=html.replace('<link rel="stylesheet" href="colour.css">','<style>\n'+colour_css+'\n</style>')
for script in ('data.js','script.js','motion.js'):
    html=html.replace(f'<script src="{script}" defer></script>','')
js='window.PRICESENSE_ASSET_MAP='+json.dumps(assets,separators=(',',':'))+';\n'
js+='\n'.join((here/p).read_text() for p in ('data.js','script.js','motion.js'))
html=html.replace('</body>','<script>\n'+js+'\n</script>\n</body>')
out=here.parent/'PriceSense_Interactive_Demo.html'
out.write_text(html)
print(f'Saved {out} ({len(html):,} characters), {len(assets)} inlined SVG assets')
