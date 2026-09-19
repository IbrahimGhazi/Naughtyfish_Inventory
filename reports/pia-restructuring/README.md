# PIA Restructuring Report

Coursework report for a Principles of Accounting group project: how the 2024
restructuring of Pakistan International Airlines divided one balance sheet
between PIA Holding Company Limited (PIA HCL) and the operating airline
(PIACL), and what the published evidence says it achieved.

**Deliverable:** `PIA_Restructuring_Report.docx`

## Layout

| Path | What it is |
|---|---|
| `PIA_Restructuring_Report.docx` | The report. Rebuild it rather than editing it by hand if you change `build_report.js`. |
| `build_report.js` | Generates the .docx (content, tables, styling) with docx-js. |
| `figures/*.svg` | Source artwork for the six diagrams. Edit these to change a figure. |
| `figures/*.png` | Rendered artwork embedded in the document. Generated — do not edit. |
| `render_figures.py` | Renders the SVGs to PNG via headless Chromium. |
| `preview.sh` | Renders the .docx to page images so the layout can be checked. |

## Rebuilding

```bash
python3 render_figures.py                      # only if an SVG changed
NODE_PATH=<dir containing node_modules/docx> node build_report.js
./preview.sh                                   # optional visual check
```

Dependencies: `docx` (npm) for the build; `pillow` plus headless Chromium for
the figures; `docx-preview`, `jszip`, `playwright-core` and `pymupdf` for the
preview. LibreOffice is present in this container but cannot load any document,
which is why `preview.sh` renders through Chromium instead of `soffice`.

## Sourcing note

Every factual claim carries a bracketed reference to the source list in
Section 14 of the report. The audited financial statements and the Scheme of
Arrangement are published on `piac.com.pk` and `piahcl.com.pk`; those domains
were unreachable from the environment used to prepare the report, so figures
are taken from published reporting of those documents. Section 13 lists exactly
what could not be verified. Page references should be added after consulting
the source PDFs directly.
