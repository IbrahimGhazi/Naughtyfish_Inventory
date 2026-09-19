#!/usr/bin/env bash
# Renders PIA_Restructuring_Report.docx to page images for visual checking.
#
# LibreOffice cannot load any document in this container, so the .docx is
# rendered in headless Chromium with docx-preview and printed to PDF.
# Requires: node with docx-preview, jszip and playwright-core resolvable, and
# Python with pymupdf.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${WORK:-/tmp/claude-0/-home-user-Naughtyfish-Inventory/188ef873-93b1-5162-9dee-e5ffa8e3e929/scratchpad}"
NM="$WORK/node_modules"
OUT="$WORK/preview"
CHROME="${CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"

rm -rf "$OUT"; mkdir -p "$OUT"

python3 - "$HERE/PIA_Restructuring_Report.docx" "$NM" "$OUT/preview.html" <<'PY'
import base64, sys
docx, nm, out = sys.argv[1], sys.argv[2], sys.argv[3]
b64 = base64.b64encode(open(docx, 'rb').read()).decode()
jszip = open(f'{nm}/jszip/dist/jszip.min.js', encoding='utf-8').read()
prev = open(f'{nm}/docx-preview/dist/docx-preview.min.js', encoding='utf-8').read()
open(out, 'w', encoding='utf-8').write(f"""<!doctype html><meta charset="utf-8">
<style>body{{margin:0;background:#fff}} .docx-wrapper{{background:#fff;padding:0}}</style>
<div id="c"></div>
<script>{jszip}</script>
<script>{prev}</script>
<script>
const b = Uint8Array.from(atob("{b64}"), c => c.charCodeAt(0));
docx.renderAsync(new Blob([b]), document.getElementById('c'), null,
  {{ className:'docx', inWrapper:true, breakPages:true, ignoreHeight:false }})
  .then(() => {{ document.title = 'ready'; }});
</script>""")
PY

export CHROME OUT
NODE_PATH="$NM" node -e "
const {chromium} = require('playwright-core');
(async () => {
  const b = await chromium.launch({executablePath: process.env.CHROME, args: ['--no-sandbox']});
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0, 300)));
  await p.goto('file://' + process.env.OUT + '/preview.html', {waitUntil: 'load'});
  await p.waitForFunction(() => document.title === 'ready', {timeout: 120000});
  await p.pdf({path: process.env.OUT + '/preview.pdf', printBackground: true, preferCSSPageSize: true});
  await b.close();
})();
"

python3 - "$OUT" <<'PY'
import sys, pymupdf
out = sys.argv[1]
doc = pymupdf.open(f'{out}/preview.pdf')
for i, page in enumerate(doc, 1):
    page.get_pixmap(dpi=85).save(f'{out}/page-{i:02d}.png')
print(f'{len(doc)} pages -> {out}/page-NN.png  (page 1 is the preview wrapper, not the cover)')
PY
