/* Builds PIA_Restructuring_Report.docx
 *
 * Run: node build_report.js
 * Figures must already be rendered by render_figures.py.
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, ImageRun, PageBreak,
  HeadingLevel, Footer, PageNumber, ExternalHyperlink, LevelFormat, convertInchesToTwip,
} = require('docx');

const FIG = path.join(__dirname, 'figures');
const CONTENT_W = 9638;       // usable width in DXA for A4 with 2cm side margins
const IMG_W = 640;            // px at 96dpi ≈ content width

const GREEN = '0B4D2C';       // deep PIA green
const GREEN2 = '046A38';      // Pakistan green accent
const GOLD = 'B08D1F';        // restrained gold
const GOLD_BG = 'FBF3DD';
const GREEN_BG = 'E9F2EC';
const GREY_BG = 'F4F7F5';
const INK = '1F2A24';
const MUTED = '5A6B62';
const RED = '8C2F20';
const SERIF = 'Georgia';

/* ------------------------------------------------------------------ helpers */

const run = (text, o = {}) => new TextRun({
  text, font: SERIF, size: o.size || 20, bold: o.bold, italics: o.italics,
  color: o.color || INK, allCaps: o.caps,
});

const p = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { before: o.before === undefined ? 60 : o.before, after: o.after === undefined ? 100 : o.after, line: 276 },
  indent: o.indent,
  children: Array.isArray(text) ? text : [run(text, o)],
});

const spacer = (h = 120) => new Paragraph({ spacing: { before: 0, after: h }, children: [] });

function h1(num, text) {
  return new Paragraph({
    spacing: { before: 320, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } },
    children: [
      new TextRun({ text: `${num}  `, font: SERIF, size: 28, bold: true, color: GOLD }),
      new TextRun({ text, font: SERIF, size: 28, bold: true, color: GREEN }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    spacing: { before: 220, after: 90 },
    children: [new TextRun({ text, font: SERIF, size: 23, bold: true, color: GREEN2 })],
  });
}

function bullets(items, o = {}) {
  return items.map((t) => new Paragraph({
    bullet: { level: o.level || 0 },
    alignment: AlignmentType.LEFT,
    spacing: { before: 30, after: 60, line: 268 },
    children: Array.isArray(t) ? t : [run(t, { size: o.size || 20 })],
  }));
}

/* A single-cell shaded box, used for slide cues, definitions and warnings. */
function box(children, o = {}) {
  return new Table({
    columnWidths: [CONTENT_W],
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: o.edge || GREEN2 },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: o.edge || GREEN2 },
      left: { style: BorderStyle.SINGLE, size: 18, color: o.edge || GREEN2 },
      right: { style: BorderStyle.SINGLE, size: 2, color: o.edge || GREEN2 },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: o.fill || GREEN_BG, color: 'auto' },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children,
      })],
    })],
  });
}

/* Slide cue: lets the report double as a presentation script. */
function slide(n, title, points) {
  return box([
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `SLIDE ${n}  ·  `, font: SERIF, size: 18, bold: true, color: GOLD }),
        new TextRun({ text: title, font: SERIF, size: 19, bold: true, color: GREEN }),
      ],
    }),
    ...points.map((t) => new Paragraph({
      bullet: { level: 0 },
      spacing: { before: 20, after: 20 },
      children: [run(t, { size: 18, color: INK })],
    })),
  ], { fill: GREEN_BG, edge: GREEN });
}

/* Plain-language definition of a technical term. */
function define(term, meaning) {
  return box([new Paragraph({
    spacing: { after: 0 },
    children: [
      new TextRun({ text: 'In plain words — ', font: SERIF, size: 19, bold: true, color: GOLD }),
      new TextRun({ text: `${term}: `, font: SERIF, size: 19, bold: true, color: GREEN }),
      new TextRun({ text: meaning, font: SERIF, size: 19, color: INK }),
    ],
  })], { fill: GOLD_BG, edge: GOLD });
}

function caution(text) {
  return box([new Paragraph({
    spacing: { after: 0 },
    children: [
      new TextRun({ text: 'Limit of the evidence — ', font: SERIF, size: 19, bold: true, color: RED }),
      new TextRun({ text, font: SERIF, size: 19, color: INK }),
    ],
  })], { fill: 'F7EAE6', edge: RED });
}

function figure(file, srcW, srcH, number, caption) {
  const h = Math.round((IMG_W * srcH) / srcW);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      children: [new ImageRun({
        type: 'png',
        data: fs.readFileSync(path.join(FIG, file)),
        transformation: { width: IMG_W, height: h },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: `Figure ${number}. `, font: SERIF, size: 18, bold: true, color: GREEN }),
        new TextRun({ text: caption, font: SERIF, size: 18, italics: true, color: MUTED }),
      ],
    }),
  ];
}

const cellPara = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.LEFT,
  spacing: { before: 40, after: 40, line: 240 },
  children: [run(text, { size: o.size || 17, bold: o.bold, color: o.color, italics: o.italics })],
});

function table(widths, header, rows, o = {}) {
  const thin = { style: BorderStyle.SINGLE, size: 2, color: 'C3CFC7' };
  const mk = (children, shade) => new TableRow({
    tableHeader: shade === 'head',
    children: children.map((c, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: {
        type: ShadingType.CLEAR,
        fill: shade === 'head' ? GREEN : (shade === 'alt' ? GREY_BG : 'FFFFFF'),
        color: 'auto',
      },
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [cellPara(c, {
        bold: shade === 'head' || (o.boldFirst && i === 0),
        color: shade === 'head' ? 'FFFFFF' : undefined,
        size: shade === 'head' ? 16 : (o.size || 17),
        align: (o.numeric || []).includes(i) ? AlignmentType.RIGHT : AlignmentType.LEFT,
      })],
    })),
  });
  return new Table({
    columnWidths: widths,
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders: { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin },
    rows: [mk(header, 'head'), ...rows.map((r, i) => mk(r, i % 2 ? 'alt' : 'plain'))],
  });
}

function tableCaption(n, text) {
  return new Paragraph({
    spacing: { before: 60, after: 180 },
    children: [
      new TextRun({ text: `Table ${n}. `, font: SERIF, size: 18, bold: true, color: GREEN }),
      new TextRun({ text, font: SERIF, size: 18, italics: true, color: MUTED }),
    ],
  });
}

function link(label, url) {
  return new ExternalHyperlink({
    link: url,
    children: [new TextRun({ text: label, font: SERIF, size: 17, color: '1F4E79', underline: {} })],
  });
}

/* ------------------------------------------------------------------ content */

const children = [];
const push = (...xs) => xs.forEach((x) => children.push(x));

/* ---- cover ---- */
push(new Table({
  columnWidths: [CONTENT_W],
  width: { size: CONTENT_W, type: WidthType.DXA },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 24, color: GOLD },
    bottom: { style: BorderStyle.SINGLE, size: 24, color: GOLD },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
  },
  rows: [new TableRow({
    children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: GREEN, color: 'auto' },
      margins: { top: 560, bottom: 560, left: 400, right: 400 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 120 },
          children: [new TextRun({ text: 'PAKISTAN INTERNATIONAL AIRLINES', font: SERIF, size: 26, bold: true, color: 'C9A227', characterSpacing: 40 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 100 },
          children: [new TextRun({ text: 'Splitting One Balance Sheet Into Two', font: SERIF, size: 46, bold: true, color: 'FFFFFF' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 260 },
          children: [new TextRun({ text: 'How the 2024 restructuring divided PIA between a holding company and an operating airline — and what the evidence says it achieved', font: SERIF, size: 21, italics: true, color: 'CFE3D6' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 40 },
          children: [new TextRun({ text: 'PIA Holding Company Limited  ·  PIACL  ·  PIA Equity Limited', font: SERIF, size: 20, bold: true, color: 'FFFFFF' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Principles of Accounting — Group Project  ·  September 2026', font: SERIF, size: 19, color: 'CFE3D6' })],
        }),
      ],
    })],
  })],
}));

push(spacer(240));
push(box([
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'How to read this report', font: SERIF, size: 22, bold: true, color: GREEN })] }),
  p('Each section opens in plain language, then gives the accounting detail. Gold boxes define a technical term the first time it is used. Red boxes mark the places where the public record does not answer the question, so that nothing here is guesswork. Green boxes are slide cues: the report can be presented straight from them.', { size: 19, after: 60 }),
  p('All amounts are in Pakistan Rupees (Rs). "bn" means billion. Every table states whether figures are separate-company (one legal entity on its own) or consolidated (a parent and its subsidiaries added together), because for PIA the two tell very different stories.', { size: 19, after: 0 }),
], { fill: GREY_BG, edge: GREEN }));

push(spacer(200));
push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Contents', font: SERIF, size: 24, bold: true, color: GREEN })] }));
[
  '1  Executive overview',
  '2  Before and after: ownership and corporate structure',
  '3  Timeline of the restructuring',
  '4  Balance-sheet comparison: before and after',
  '5  Detailed asset allocation',
  '6  Detailed liability allocation',
  '7  Accounting treatment and Principles of Accounting',
  '8  Why the split was necessary, and what it was meant to achieve',
  '9  Results to date: has the restructuring met its objectives?',
  '10  Practical challenges and limitations',
  '11  Key observations and conclusion',
  '12  Key learning points',
  '13  What this report could not verify',
  '14  Sources',
].forEach((t) => push(new Paragraph({
  spacing: { before: 20, after: 20 },
  indent: { left: 340 },
  children: [run(t, { size: 20 })],
})));

push(new Paragraph({ children: [new PageBreak()] }));

/* ================================================================ 1 overview */
push(h1('1', 'Executive overview'));

push(slide(1, 'One airline, two companies, one unpaid bill', [
  'PIA was a single State-owned airline whose debts were five times its assets.',
  'In April 2024 it was legally cut in two: the airline kept the planes, a new holding company took the debt.',
  'The debt was not repaid. It changed owner — and the new owner is the taxpayer.',
]));
push(spacer(160));

push(h2('1.1  What PIA was before the restructuring'));
push(p('Pakistan International Airlines Corporation Limited (PIACL) is Pakistan’s national flag carrier, incorporated in 1955 and converted from a statutory corporation into a public limited company by shares under the Pakistan International Airlines (Conversion) Act, 2016, with effect from 19 April 2016 [27]. Until 2024 it was a single legal entity, majority owned by the Government of Pakistan and listed on the Pakistan Stock Exchange (PSX) under the symbols PIAA and PIAB.'));
push(p('That one company held everything at once: the aircraft and the flying business; three subsidiaries (a hotel-owning investment company, an airport hotel and a ticketing-technology firm); a 44-property real-estate portfolio in Pakistan, the United States and France; and decades of accumulated borrowings. At 31 December 2023 it reported total assets of about Rs 161 bn against total liabilities of about Rs 825 bn [6] — liabilities roughly five times assets, and accumulated losses of about Rs 713 bn [30].'));

push(define('negative equity', 'what a company has is worth less than what it owes. If PIA had sold everything it owned in 2023 and paid out the proceeds, roughly Rs 664 bn of debt would still have been unpaid. Ordinary companies in this position are usually wound up; PIA survived because the Government kept funding it.'));
push(spacer(120));

push(h2('1.2  The three entities this report is about'));
push(table(
  [1900, 2500, 5238],
  ['Entity', 'What it is', 'Role in the transaction'],
  [
    ['PIA HCL\nPIA Holding Company Limited', 'New parent company, incorporated 21 March 2024; listed on PSX 27 May 2024 as PIAHCLA and PIAHCLB [15]', 'Absorbed the legacy debt, the non-core assets and the three subsidiaries. Still State-controlled and still listed. It exists to carry and work down obligations, not to fly aeroplanes.'],
    ['PIACL\nPakistan International Airlines Corporation Limited', 'The operating airline — the same legal entity as before, but stripped down; delisted from PSX with effect from 25 May 2024 [15]', 'Kept the aircraft, routes and trading operations and shed most of the debt, so that it could be sold. This is the entity sometimes referred to informally as the "operating company" or "PIA CCL".'],
    ['PIA EL\nPIA Equity Limited', 'Special-purpose vehicle formed in 2026 by the Arif Habib Corporation-led consortium [21]', 'The acquiring entity. It took 75% of PIACL and management control at the first financial closing on 29 June 2026 [19]. It is a buyer, not a party to the 2024 split.'],
  ],
  { boldFirst: true },
));
push(tableCaption(1, 'The three companies, and which part of the transaction each belongs to.'));

push(h2('1.3  Why it was done, and why it matters'));
push(p('The Government wanted to privatise PIA, and no buyer would take an airline carrying Rs 825 bn of legacy obligations. The restructuring separated the viable flying business from the legacy balance sheet so that a purchaser could buy the first without inheriting the second [11][16]. About Rs 671 bn of liabilities moved to PIA HCL [10].'));
push(p('The significance runs in four directions. For operations, PIACL was freed from interest costs that were consuming its cash. For government finances, the same obligations became explicitly the State’s: debt servicing on the transferred bank loans alone is reported at roughly Rs 32.2 bn a year for ten years [12], with about Rs 35 bn budgeted in the current fiscal year [16]. For debt management, Rs 268.7 bn of commercial bank debt was renegotiated to a ten-year term with interest capped at 12% instead of about 23.5% [7][12]. And for privatisation, the split was the precondition that made the December 2025 auction possible.'));

push(caution('The headline totals differ between filings — total liabilities at or near 31 December 2023 are variously reported as Rs 825 bn, Rs 850.75 bn and Rs 864 bn, and the FY2023 loss as Rs 75 bn, Rs 87.26 bn, Rs 103.9 bn and Rs 104.5 bn. These are not all errors; they are different measurement dates and different reporting entities. Section 4.3 reconciles them rather than picking one.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ================================================== 2 structure before/after */
push(h1('2', 'Before and after: ownership and corporate structure'));

push(slide(2, 'Follow the ownership arrows', [
  'Before: one listed company owned everything, including its own debt.',
  'After 2024: a new listed parent sits on top; the airline becomes its wholly-owned subsidiary.',
  'After 2026: the airline leaves the group entirely — the parent keeps only the debt and the hotels.',
]));
push(spacer(120));

push(h2('2.1  The original structure, to 30 April 2024'));
push(p('One legal entity held the core airline and the non-core estate side by side. Because they sat in the same company, the same balance sheet carried both the aircraft that earned revenue and the borrowings that had funded decades of losses. There was no way for an investor to buy one without the other.'));
push(...figure('fig1-structure-before.png', 1040, 470, 1, 'PIA before the split: a single listed company holding core and non-core activities together.'));

push(h2('2.2  The post-scheme structure, from 30 April 2024'));
push(p('The Scheme of Arrangement inserted a new company above PIACL. Shareholders did not pay or receive anything: holders of PIACL shares simply became holders of PIA HCL shares of the same class, PIACL was delisted on 25 May 2024 and PIA HCL began trading on 27 May 2024 at the same opening price as PIACL’s closing price [15]. PIACL became a wholly-owned subsidiary of PIA HCL, and the non-core assets and legacy liabilities moved up into the parent.'));
push(...figure('fig2-structure-after-2024.png', 1040, 500, 2, 'After the scheme: PIA HCL as listed parent, PIACL as its wholly-owned operating subsidiary.'));

push(h2('2.3  The post-privatisation structure, from 29 June 2026'));
push(p('The 2024 structure was a staging post, not a destination. At the first financial closing the Government transferred 75% of PIACL and management control to PIA Equity Limited, the consortium’s acquisition vehicle [19]. PIACL therefore left the PIA HCL group. The holding company retained the debt, the hotels, the remaining subsidiaries and 33 of the 44 properties; 11 properties valued at Rs 14.2 bn went with the airline to the buyer [20].'));
push(...figure('fig3-structure-after-2026.png', 1040, 440, 3, 'After privatisation: PIACL is owned 75% by PIA Equity Limited and 25% by the Government; PIA HCL is left with the legacy estate.'));

push(h2('2.4  Who owns or controls what'));
push(table(
  [2300, 3100, 4238],
  ['Entity', 'Owner / controller today', 'Evidence'],
  [
    ['PIA HCL', 'Government of Pakistan (majority) plus the former minority PIACL shareholders; listed on PSX', 'Scheme of Arrangement share exchange; PSX listing of PIAHCLA / PIAHCLB from 27 May 2024 [15]'],
    ['PIACL', 'PIA Equity Limited 75%; Government of Pakistan 25%', 'Privatisation Commission announcement of first financial closing, 29 June 2026 [19]'],
    ['PIA Investments Limited\n(Roosevelt Hotel, New York; Hôtel Scribe, Paris)', 'PIA HCL — reported at about 99%, with about 1% held by a Saudi interest', 'PIA HCL Annual Report 2024 subsidiary disclosures [1]; adviser’s confirmation that the hotels were excluded from the sale [26]'],
    ['Skyrooms (Private) Limited; Sabre Travel Network (Pakistan) (Private) Limited', 'PIA HCL', 'PIA HCL Annual Report 2024 [1]; Scheme of Arrangement [2]'],
    ['PIA Equity Limited', 'Arif Habib Corporation-led consortium: AHCL, Fatima Fertilizer, Lake City Holdings, City Group Holdings, AKD Group Holding', 'Formation of the special-purpose vehicle reported April 2026 [21]'],
  ],
  { boldFirst: true },
));
push(tableCaption(2, 'Ownership and control after the restructuring and the 2026 privatisation.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 3 timeline */
push(h1('3', 'Timeline of the restructuring'));
push(slide(3, 'Five years of intention, six weeks of execution', [
  'The idea dates from 2021; the legal split took effect on a single day, 30 April 2024.',
  'Listing and delisting followed within four weeks.',
  'Privatisation took another two years and is still not finished.',
]));
push(spacer(120));
push(p('The diagram distinguishes three states, because they are often blurred in press coverage: what was merely decided, what was legally completed, and what is still open. The legal split is complete and irreversible. The privatisation is only partly complete — a second closing and a second equity tranche remain outstanding.'));
push(...figure('fig4-timeline.png', 1040, 700, 4, 'Chronology from the initial policy decision to the position in September 2026.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 4 balance sheet */
push(h1('4', 'Balance-sheet comparison: before and after'));
push(slide(4, 'The number that did not improve', [
  'PIACL before: Rs 161 bn of assets, Rs 825 bn of liabilities — a Rs 664 bn hole.',
  'PIACL after: about Rs 160 bn of assets, Rs 190–202 bn of liabilities, equity just positive at Rs 3.55 bn.',
  'But PIA HCL’s consolidated accounts still showed negative equity of Rs 563 bn. The hole moved; it did not close.',
]));
push(spacer(140));

push(h2('4.1  The last pre-split position — PIACL, 31 December 2023'));
push(table(
  [4400, 2400, 2838],
  ['Caption (separate-company figures)', 'Amount', 'Source'],
  [
    ['Total assets', 'Rs 161 bn', 'Business Recorder reporting of the FY2023 accounts [6]'],
    ['Total liabilities', 'Rs 825 bn', 'As above [6]'],
    ['Shareholders’ deficit (assets less liabilities)', 'Rs (664) bn', 'Derived from the two figures above'],
    ['Accumulated losses', 'Rs (713) bn', 'Stock-take of PIA privatisation [30]'],
    ['Long-term financing including lease liabilities', 'over Rs 295 bn', 'Ministry of Finance Central Monitoring Unit review, reported July 2025 [8][25]'],
  ],
  { numeric: [1], boldFirst: true },
));
push(tableCaption(3, 'Extract of PIACL’s final pre-split balance sheet. Separate-company (unconsolidated) figures in Pakistan Rupees.'));

push(p('The income statement for the same year explains why the deficit kept deepening. PIACL earned an operating profit of about Rs 3.9 bn in 2023, but recorded an exchange loss of about Rs 26.0 bn and a finance cost of about Rs 79.4 bn — almost all of it interest on legacy debt — turning a marginally profitable operation into a loss of around Rs 104 bn for the year [7][24]. The business could cover its flying costs. It could not cover its borrowings.'));

push(h2('4.2  The post-split position — year ended 31 December 2024'));
push(table(
  [3200, 2000, 2000, 2438],
  ['Caption', 'PIACL (separate)', 'PIA HCL (consolidated)', 'Source'],
  [
    ['Total assets', '≈ Rs 160 bn', 'Rs 396 bn', 'PIA HCL Annual Report 2024 [1]'],
    ['Total liabilities', '≈ Rs 190–202 bn', 'Rs 959 bn', 'PIA HCL Annual Report 2024 [1]'],
    ['Net equity', '+ Rs 3.55 bn', 'Rs (563) bn', 'Revised audited FY2024 accounts [18]; PIA HCL AR 2024 [1]'],
    ['Revenue', 'Rs 204 bn', 'Rs 239.65 bn', 'CMU review [8]; PIA HCL AR 2024 [9]'],
    ['Operating profit', 'Rs 9.4 bn', 'Rs 18.62 bn', 'FY2024 results reporting [7]; PIA HCL AR 2024 [1]'],
    ['Gross profit', '—', 'Rs 51.74 bn (up 42.9%)', 'PIA HCL FY2024 results [9]'],
    ['Exchange loss', 'Rs 2.3 bn', '—', 'FY2024 results reporting [7]'],
    ['Finance cost', 'Rs 10.1 bn', '—', 'FY2024 results reporting [7][8]'],
    ['Result after tax', '+ Rs 26.2 bn', 'Rs (15.35) bn', 'CMU review [8]; PIA HCL AR 2024 [9]'],
  ],
  { numeric: [1, 2], boldFirst: true },
));
push(tableCaption(4, 'Post-split extracts. The PIACL column is one company on its own; the PIA HCL column is the whole group, including PIACL. The two columns must not be added together.'));

push(p('Three things drove PIACL’s apparent transformation, and only one of them is operational. Finance cost fell 87%, from Rs 79.4 bn to Rs 10.1 bn, and exchange losses fell by over 90%, because the interest-bearing and foreign-currency debt was no longer PIACL’s: long-term financing including leases dropped from over Rs 295 bn to Rs 13 bn [8]. Separately, a one-off deferred tax asset of about Rs 31.6 bn was recognised, which converted a pre-tax loss of roughly Rs 3 bn into a reported after-tax profit of Rs 26.2 bn [7][24]. Underneath both, operating profit did genuinely improve, from Rs 3.9 bn to Rs 9.4 bn, even as revenue fell about 14% [7].'));

push(h2('4.3  Reconciling the different published totals'));
push(p('Students reading the sources will find figures that do not agree. They are reconcilable once the reporting entity and the date are identified:'));
push(...bullets([
  'Reporting entity. PIACL alone reported a FY2023 loss of about Rs 104.5 bn, while PIA HCL’s consolidated comparative for 2023 is a loss of Rs 87.26 bn [9]. The consolidated figure is smaller because it includes the profitable hotel subsidiary, PIA Investments Limited. Revenue behaves the same way: Rs 204 bn for PIACL alone against Rs 239.65 bn consolidated in 2024 [8][9].',
  'Measurement date. Liabilities are reported as Rs 825 bn at 31 December 2023 [6] and as Rs 850.75 bn on other filings for dates close to it. The position was worsening month by month as exchange losses and interest accrued, so a later date gives a larger number.',
  'Scheme figures versus year-end figures. The scheme measured PIACL at the effective date, giving total assets of Rs 146.57 bn and total liabilities of Rs 202.27 bn [1]. The Rs 160 bn / Rs 190 bn figures are for 31 December 2024, eight months later.',
  'Plan versus execution. The Cabinet approved a transfer of about Rs 625 bn [11]; the transaction as executed and later reported to the National Assembly moved about Rs 671 bn [10]. The difference is mainly the employee-benefit and operating-liability balances finalised after the plan was approved.',
]));

push(h2('4.4  The before-to-after bridge'));
push(...figure('fig5-bridge.png', 1040, 620, 5, 'How one balance sheet became two. Read downwards: the deficit was relocated, not removed.'));

push(h2('4.5  Annotated extract of the pre-split balance sheet'));
push(p('The extract below marks each major caption of PIACL’s final pre-split balance sheet with the entity that received it. Where PIA has never published a caption split between the two companies, the extract says so rather than showing an estimate.'));
push(...figure('fig6-annotated-balance-sheet.png', 1040, 790, 6, 'Pre-split balance-sheet captions with their destination marked. Amounts shown in bold are figures stated in the cited sources.'));

push(caution('This is a reconstructed extract, not a photographic reproduction of the audited statement. The audited financial statements themselves are published as PDFs on piac.com.pk and piahcl.com.pk (see Section 14), but those domains could not be opened from the environment in which this report was prepared, so the line items here are assembled from figures quoted in the cited secondary reporting of those statements. Page-level references should be added by checking the two PDFs directly before submission.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 5 assets */
push(h1('5', 'Detailed asset allocation'));
push(slide(5, 'The buyer got aeroplanes; the State kept hotels', [
  'Everything needed to fly a route stayed with PIACL.',
  'Everything that was an investment rather than an operation went to PIA HCL.',
  'Roosevelt Hotel New York and Hôtel Scribe Paris were explicitly excluded from the sale.',
]));
push(spacer(140));

push(p('The dividing principle in the Scheme of Arrangement was function, not value: assets required to operate the airline were retained by PIACL, and assets held for investment, development or legacy reasons were transferred to PIA HCL [1][2]. The table below states what is publicly disclosed and marks what is not.'));

push(table(
  [2500, 1750, 1500, 1700, 2188],
  ['Item / category', 'Pre-split treatment', 'Receiving entity', 'Reported amount', 'Source'],
  [
    ['Aircraft, engines, rotables, spares and aviation equipment', 'Operating assets of PIACL', 'Retained by PIACL', 'Not separately published', 'Scheme of Arrangement — core undertaking retained [2]'],
    ['Route licences, traffic rights, slots and other operating assets', 'Operating assets of PIACL', 'Retained by PIACL', 'Not separately published', 'Scheme of Arrangement [2]'],
    ['PIA Investments Limited — owner of the Roosevelt Hotel, New York (1,015 rooms, Madison Avenue at 45th Street, acquired 1979) and Hôtel Scribe, Paris', 'Long-term investment in a subsidiary', 'Transferred to PIA HCL', 'FY2024 revenue USD 123.84 m; net profit USD 24.84 m; assets above USD 744 m', 'PIA HCL Annual Report 2024 [1]; hotels confirmed excluded from the PIACL sale [26]'],
    ['Skyrooms (Private) Limited — airport hotel, Karachi', 'Long-term investment in a subsidiary; 4,000,000 shares of Rs 10 each', 'Transferred to PIA HCL', 'FY2024 revenue Rs 271.5 m; net loss Rs 65.7 m', 'PIA HCL Annual Report 2024 [1]; Scheme of Arrangement [2]'],
    ['Sabre Travel Network (Pakistan) (Private) Limited — reservations and ticketing technology', 'Long-term investment in a subsidiary', 'Transferred to PIA HCL', 'FY2024 commission income Rs 726 m; profit after tax Rs 2.53 m', 'PIA HCL Annual Report 2024 [1]'],
    ['Precision Engineering Complex', 'Non-core division of PIACL', 'Transferred to PIA HCL', 'Within the ≈ Rs 26 bn of non-core assets', 'Cabinet approval of the restructuring [11]'],
    ['Real-estate portfolio — 44 properties across Pakistan, the United States and France', 'Owned by PIACL', '33 to PIA HCL; 11 with the airline in 2026', '11 transferred properties valued at Rs 14.2 bn', 'Property transfer reporting, July 2026 [20]'],
    ['Of which, the four Pakistani properties sold with the airline', 'Owned by PIACL', 'To the buyer via PIACL', 'Peshawar (Arbab Road) Rs 5.1 bn; Islamabad (Jinnah Avenue) Rs 2.4 bn; Rawalpindi (Mall Road) Rs 2.3 bn; Quetta (Shahrah-e-Hali) Rs 837.4 m', 'Property transfer reporting, July 2026 [20]'],
    ['Of which, the seven overseas properties sold with the airline', 'Owned by PIACL', 'To the buyer via PIACL', 'Indian properties over INR 234 m; Amsterdam EUR 2.1 m; a New York residence USD 1.7 m; a Tashkent asset', 'Property transfer reporting, July 2026 [20]'],
    ['Properties retained by PIA HCL', 'Owned by PIACL', 'PIA HCL', 'Includes the Avant Hotel Karachi, sales offices, warehouses, a farmhouse, housing colonies and several hundred acres of land', 'Analysis of the privatisation [16]'],
    ['Stores, spares, inventories; trade debts, advances, deposits, prepayments', 'Current assets of PIACL', 'Retained by PIACL', 'Not separately published', 'Scheme of Arrangement — core undertaking [2]'],
    ['Cash and bank balances', 'Current assets of PIACL', 'Split between the two entities', 'Allocation not published', 'No public disclosure identified'],
    ['Deferred tax asset', 'Not recognised before the split', 'Recognised by PIACL after the split', 'Rs 31.6 bn recognised in FY2024 (reported elsewhere as about Rs 30 bn)', 'FY2024 results reporting [7]; CMU review [8][24]'],
  ],
  { size: 15, boldFirst: true },
));
push(tableCaption(5, 'Asset-by-asset allocation. Amounts are shown only where a public source states them.'));

push(caution('No published document identified in this research gives an asset-by-asset schedule with carrying amounts at the effective date. The aggregate of about Rs 26 bn of non-core assets [11] is the only figure available for the transferred asset side, and it cannot be decomposed between the subsidiaries, the Precision Engineering Complex and the property portfolio from public sources. No allocation is estimated here.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 6 liabilities */
push(h1('6', 'Detailed liability allocation'));
push(slide(6, 'Rs 671 billion changed debtor', [
  'Bank loans, government payables, supplier arrears and pension dues all moved to PIA HCL.',
  'Only the obligations of the continuing flying business stayed with PIACL.',
  'A further Rs 36–40 bn of employee obligations was discovered after the scheme was signed.',
]));
push(spacer(140));

push(p('The liability side is far better disclosed than the asset side, because the figures were reported to the National Assembly and were the subject of a separate agreement with the banks. Roughly Rs 671 bn of liabilities left PIACL [10].'));

push(table(
  [2400, 1500, 1500, 2500, 1738],
  ['Liability category', 'Receiving entity', 'Reported amount', 'Rationale', 'Source'],
  [
    ['Commercial bank loans and other borrowings', 'PIA HCL', 'Rs 268.7 bn', 'Legacy funding of past losses, unrelated to current flying operations; renegotiated to a ten-year term with interest capped at 12% instead of about 23.5%, conditional on privatisation progress', 'NA briefing [10]; debt restructuring approval [12]; FY2024 reporting [7]'],
    ['Amounts payable to the Government of Pakistan (loans and advances)', 'PIA HCL', 'Rs 170 bn', 'Owed to the controlling shareholder; retaining it in PIACL would have left the buyer owing the seller', 'NA briefing [10]; Cabinet approval [11]'],
    ['Historical operating liabilities, including dues to the Civil Aviation Authority, Pakistan State Oil and National Insurance Corporation Limited', 'PIA HCL', 'Rs 188.3 bn, of which CAA, PSO and NICL dues are about Rs 144 bn', 'Arrears accumulated over many years rather than obligations of current trading', 'NA briefing [10]; Cabinet approval [11]'],
    ['Employee retirement obligations — pension, gratuity and post-retirement medical', 'PIA HCL', 'Rs 44 bn', 'Obligations to retired and former staff, not to the workforce the buyer would employ', 'NA briefing [10]'],
    ['Further employee obligation identified after the scheme was executed', 'Remained with PIACL', '≈ Rs 36–40 bn', 'A portion of pension and post-retirement fund liability had not been accounted for when the scheme was finalised, and had to be dealt with afterwards', 'Analysis of the scheme documentation [18]'],
    ['Long-term financing and lease liabilities', 'Substantially PIA HCL', 'Fell from over Rs 295 bn to Rs 13 bn in PIACL', 'Follows the underlying borrowings; the residual Rs 13 bn relates to the continuing operation', 'CMU review [8][25]'],
    ['Trade payables and operational creditors of the continuing business', 'Retained by PIACL', 'Not separately published', 'Ordinary working-capital obligations of the airline the buyer was acquiring', 'Scheme of Arrangement — core undertaking [2]'],
    ['Tax liabilities, legal claims, provisions and contingent liabilities', 'Not separately disclosed', 'Not published', 'The Government later waived penalties and surcharge on about Rs 4.29 bn of PIA income-tax liabilities to facilitate the privatisation, which indicates tax exposures survived the split', 'Tax waiver reporting, July 2026 [29]'],
    ['Intercompany balances and government support arrangements', 'PIA HCL', 'Not published as a single figure', 'Advances from subsidiaries were shifted to the holding company; the State continues to fund PIA HCL, approving over Rs 4.5 bn for its liabilities in May 2026 and Rs 4.4 bn for PIA retirees', 'Cabinet approval [11]; post-privatisation funding approvals [28][34]'],
  ],
  { size: 15, boldFirst: true },
));
push(tableCaption(6, 'Liability-by-liability allocation, with the reason each item was placed where it was.'));

push(p('The four principal figures reconcile exactly: Rs 268.7 bn plus Rs 170 bn plus Rs 188.3 bn plus Rs 44 bn is Rs 671.0 bn [10]. This is the single most reliable quantitative statement available about the restructuring.'));

push(caution('The Cabinet-approved plan described a transfer of about Rs 625 bn [11], while the executed transaction is reported at about Rs 671 bn [10] and other coverage cites "over Rs 650 bn" or "about Rs 660 bn" [16]. No public reconciliation between the plan and the execution has been identified. Contingent liabilities and legal claims are not quantified in any source located for this report.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 7 accounting */
push(h1('7', 'Accounting treatment and Principles of Accounting'));
push(slide(7, 'Where the textbook meets PIA', [
  'Substance over form is the whole story: two companies, one owner, one unchanged obligation.',
  'Derecognition is why PIACL could delete Rs 671 bn from its books — a third party legally assumed it.',
  'Recognising a Rs 31.6 bn deferred tax asset required a judgement that only became defensible after the split.',
]));
push(spacer(140));

push(h2('7.1  Going concern'));
push(define('going concern', 'the assumption that a business will keep trading for at least the next year, so its assets can be valued at what they are worth in use rather than at fire-sale prices. If auditors doubt it, they must say so.'));
push(p('PIACL’s pre-split accounts could only be prepared on a going-concern basis because the Government kept supporting the airline; liabilities exceeded assets five times over. The restructuring transferred that problem rather than solving it. PIA HCL’s FY2024 accounts are reported to carry a going-concern warning of their own, with current liabilities vastly exceeding current assets and operations described as dependent on government support [23]. So the same accounting question that hung over PIACL in 2023 now hangs over PIA HCL — which is exactly what one would expect, because the obligations are the same obligations.'));

push(h2('7.2  Substance over legal form'));
push(define('substance over form', 'account for what a transaction really does, not merely what the paperwork calls it.'));
push(p('This is the central principle of the whole case. In legal form, two separate companies were created and PIACL’s balance sheet became healthy. In economic substance, until June 2026 nothing left the group: PIA HCL owned PIACL, the Government owned PIA HCL, and the Government had owned the debt all along. The proof is in PIA HCL’s own consolidated accounts, which for 2024 still showed negative equity of Rs 563 bn [1]. Consolidation is the accounting mechanism that refuses to let a group hide a liability by moving it between its own companies — and it did its job here. The "clean balance sheet" was real at the level of one legal entity and false at the level of the group.'));

push(h2('7.3  Historical cost and valuation'));
push(p('Assets moved between entities under common control are normally carried across at existing book value rather than revalued. That matters for PIA because book values and market values are visibly far apart. The Roosevelt Hotel, acquired in 1979, has been discussed in the context of a redevelopment valuation approaching USD 1 bn, while the Government has targeted at least USD 100 m from its disposal [16]. Similarly, the 11 properties transferred to the buyer were recorded at Rs 14.2 bn [20], a figure representing carrying or transfer value rather than a market test. A historical-cost balance sheet therefore tells you what was paid, not what could be realised — which is why the asset side of PIA’s accounts arguably understates what PIA HCL now holds.'));

push(h2('7.4  Recognition and derecognition'));
push(define('derecognition', 'removing an asset or a liability from the balance sheet. A liability may only be removed when it is paid, cancelled, expired, or legally taken over by someone else.'));
push(p('PIACL was able to remove roughly Rs 671 bn of liabilities from its balance sheet because the Scheme of Arrangement, sanctioned by SECP under sections 279 to 282 of the Companies Act, 2017, legally novated those obligations to PIA HCL with effect from 30 April 2024 [13]. Without that legal step — a mere internal reallocation, or a promise by the parent to pay — derecognition would not have been permitted and the liabilities would have stayed on PIACL’s books. This is the clearest illustration in the case of why the legal mechanism and the accounting outcome are inseparable.'));
push(p('On the asset side, the mirror-image event is the recognition of a deferred tax asset of about Rs 31.6 bn in PIACL’s 2024 accounts. A deferred tax asset arising from past losses may only be recognised when future taxable profits are probable. While PIACL was losing Rs 100 bn a year and carrying Rs 825 bn of liabilities, that test failed. Once the debt was gone and the airline was operationally profitable, management could argue it passed. The Ministry of Finance’s Central Monitoring Unit nevertheless concluded that PIA had made an underlying loss of Rs 4.6 bn in 2024 and that the Rs 26 bn reported profit "should not be misinterpreted as a sign of operational profitability" [8][25]. Recognition here was a judgement, not a fact — and a well-informed reader should treat it as such.'));

push(h2('7.5  Provisions and contingent liabilities'));
push(p('Employee benefit obligations are the case study. Rs 44 bn of pension, gratuity and post-retirement medical dues were identified and transferred [10], and a further Rs 36–40 bn of pension and post-retirement fund liability was subsequently found not to have been accounted for when the scheme was executed [18]. A liability that is discovered after the transaction that was supposed to allocate it demonstrates precisely why estimates of this kind are disclosed as areas of measurement uncertainty. Government guarantees over the transferred borrowings are a related point: they are not liabilities of PIA HCL at all, but contingent liabilities of the State, and they do not appear on any of the balance sheets examined here.'));

push(h2('7.6  Related-party and common-control transactions'));
push(define('common control', 'both sides of a transaction are ultimately owned by the same party — here, the Government of Pakistan. Such transfers are not arm’s-length bargains, so accounting standards treat them differently from ordinary acquisitions.'));
push(p('The 2024 split was a textbook common-control transaction: the Government controlled PIACL before and PIA HCL after. The international standard on business combinations excludes combinations under common control, and the usual practice is predecessor or book-value accounting — assets and liabilities are carried across at existing amounts, no goodwill arises and no gain is recognised on the transfer. That treatment is consistent with the fact that the group’s consolidated deficit did not disappear. Related-party disclosure also becomes more prominent after the split, because PIACL and PIA HCL transacted with each other and both transacted with their common controlling shareholder.'));
push(caution('This report could not open PIA HCL’s audited financial statements to confirm which accounting policy the company actually applied to the transfer, or whether any fair-value uplift was recognised. The description above is what the standards and the observable outcome imply, not a quotation from the accounting policy note. Verify against Note 1 and the significant accounting policies note of the PIA HCL Annual Report 2024 [1].'));

push(h2('7.7  Presentation, disclosure, comparability and restatement'));
push(...bullets([
  'Comparability broke. What was one set of accounts became two. A reader who wants the pre-split picture must now combine PIACL’s separate accounts with PIA HCL’s consolidated accounts, and the two are prepared on different bases.',
  'Comparatives shifted basis. PIA HCL’s 2023 comparative column is a group figure — revenue Rs 259.59 bn, loss Rs 87.26 bn — which is not the same as PIACL’s own 2023 result [9].',
  'First-year disclosure gaps. As a new company, PIA HCL could not present the six-year summary of results that Pakistani disclosure rules normally require, and it disclosed incomplete corporate-governance compliance in its first year, including an internal audit function not yet fully operational [1].',
  'Timeliness failed. PIACL’s FY2023 audited accounts were adopted only at its eighth AGM on 7 February 2025, more than thirteen months after the year end, and PIA HCL’s quarterly report for the period ended 30 September 2025 was recommended by its Board only on 8 May 2026 [5]. Late accounts reduce the usefulness of disclosure even when the disclosure is accurate.',
  'Audit opinion. PIA HCL’s FY2024 audit is reported to have carried a qualified opinion, related to a subsidiary not being properly brought into the accounts [23]. A qualification is a statement that part of the financial statements cannot be relied upon.',
]));

push(h2('7.8  Textbook practice compared with what PIA actually did'));
push(table(
  [3100, 3200, 3338],
  ['Principle as taught', 'What a textbook expects', 'What happened at PIA'],
  [
    ['Going concern', 'Disclosed if there is material doubt; otherwise assumed', 'Assumed for years only because of State support; the doubt was passed from PIACL to PIA HCL rather than resolved [23]'],
    ['Derecognition of liabilities', 'Remove only on settlement, cancellation or expiry', 'Removed on legal novation under a regulator-sanctioned scheme — valid, but no cash was paid [13]'],
    ['Deferred tax assets', 'Recognise when future taxable profit is probable', 'Rs 31.6 bn recognised immediately after the restructuring; an independent government review disputed the underlying profitability [8][25]'],
    ['Common-control transfers', 'Book-value / predecessor accounting, no goodwill', 'Consistent with the consolidated deficit persisting, but the policy note could not be verified for this report'],
    ['Comparability of periods', 'Restate comparatives so periods can be compared', 'Comparatives changed reporting entity, so "before" and "after" are not directly comparable [9]'],
    ['Timely reporting', 'Accounts filed within statutory deadlines', 'FY2023 accounts adopted February 2025; a Q3 2025 report reached the Board in May 2026 [5]'],
  ],
  { size: 16, boldFirst: true },
));
push(tableCaption(7, 'Theory against practice — the comparison the project brief asks for.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 8 rationale */
push(h1('8', 'Why the split was necessary, and what it was meant to achieve'));
push(slide(8, 'Four objectives, one precondition', [
  'Nobody buys an airline with Rs 825 bn of legacy debt attached.',
  'The split isolated a sellable business and made its real operating performance visible.',
  'It also converted a hidden State liability into an explicit, budgeted one.',
]));
push(spacer(140));

push(...bullets([
  [
    new TextRun({ text: 'Separating a viable airline from unviable legacy obligations. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('PIACL’s flying operation produced an operating profit of Rs 3.9 bn in 2023 [7]. The business was not the problem; the balance sheet was. Isolating the operation was the only way to make that visible and saleable.'),
  ],
  [
    new TextRun({ text: 'Financial transparency. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('With legacy finance costs removed, PIACL’s reported results now approximate the performance of the airline itself rather than the cost of its history. That is genuinely more informative, provided the reader also looks at PIA HCL.'),
  ],
  [
    new TextRun({ text: 'Operational viability. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('Debt servicing was reported to consume roughly a third of the airline’s cash inflow before the restructuring, and in late 2023 unpaid fuel bills to Pakistan State Oil disrupted supply. Removing that claim on cash was a condition of running a reliable schedule.'),
  ],
  [
    new TextRun({ text: 'Debt management. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('Concentrating the borrowings in one State-controlled vehicle allowed a single negotiation with the banks: Rs 268.7 bn rescheduled over ten years at a capped 12% rather than about 23.5%, with a reopener if privatisation targets were missed [7][12].'),
  ],
  [
    new TextRun({ text: 'Readiness for privatisation. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('This was the binding objective. Earlier attempts to sell PIA had failed; privatisation was also a commitment under Pakistan’s IMF programme [22]. A "debt-lite" airline was the product the market was eventually willing to bid for.'),
  ],
]));

push(p('It is worth naming the objective the restructuring did not have. It was never designed to reduce the total obligations of the Pakistani State. It relocated them and made them explicit — which has its own value in public finance, but is not debt reduction.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 9 results */
push(h1('9', 'Results to date: has the restructuring met its objectives?'));
push(slide(9, 'A clear success, a clear cost, and an open question', [
  'Achieved: the airline was legally cleaned up and actually sold.',
  'Achieved: PIACL now makes an operating profit and has posted profitable half-years.',
  'Unresolved: Rs 500 bn-plus of legacy debt still sits with the State, and the sale is not fully closed.',
]));
push(spacer(140));

push(h2('9.1  Intended outcomes against achievements'));
push(table(
  [2700, 3400, 3538],
  ['Intended outcome', 'Evidence to date', 'Assessment'],
  [
    ['Legally separate core from non-core', 'Scheme sanctioned 3 May 2024, effective 30 April 2024; PIA HCL listed and PIACL delisted in May 2024 [13][15]', 'Achieved and complete'],
    ['Give PIACL a clean balance sheet', 'About Rs 671 bn of liabilities transferred; long-term financing including leases down from over Rs 295 bn to Rs 13 bn; net equity positive at Rs 3.55 bn [8][18]', 'Achieved at the level of the separate company'],
    ['Improve the airline’s reported performance', 'Operating profit Rs 3.9 bn to Rs 9.4 bn; finance cost down 87%; first half-year profit in about two decades in H1 2025 (Rs 11.5 bn pre-tax, Rs 6.8 bn after tax) [7][22]', 'Achieved, though partly mechanical'],
    ['Restructure the bank debt', 'Rs 268.7 bn rescheduled to ten years with interest capped at 12% [7][12]', 'Achieved, but conditional on privatisation milestones'],
    ['Sell the airline', 'Arif Habib-led consortium won 75% at auction on 22 December 2025 for Rs 135 bn; first financial closing and transfer of management control on 29 June 2026 [17][19]', 'Substantially achieved; second closing still pending'],
    ['Reduce the burden on public finances', 'Debt servicing on transferred loans reported at about Rs 32.2 bn a year for ten years, with about Rs 35 bn budgeted this fiscal year; further approvals of Rs 4.5 bn and Rs 4.4 bn for PIA HCL liabilities and PIA retirees in 2026 [12][16][28][34]', 'Not achieved — the cost became explicit and continuing'],
  ],
  { size: 16, boldFirst: true },
));
push(tableCaption(8, 'Objective-by-objective assessment on the evidence currently available.'));

push(h2('9.2  Evidence of genuine improvement'));
push(...bullets([
  'Operating profit more than doubled, from Rs 3.9 bn to Rs 9.4 bn in 2024, while revenue fell about 14% — meaning the improvement came from cost control, route rationalisation and lower fuel prices rather than from growth [7].',
  'PIA HCL’s consolidated net loss narrowed by 82.4%, from Rs 87.26 bn in 2023 to Rs 15.35 bn in 2024, with gross profit up 42.9% to Rs 51.74 bn [9].',
  'PIACL posted a pre-tax profit of Rs 11.5 bn and an after-tax profit of Rs 6.8 bn in the first half of 2025 — reported as its first half-year profit since about 2004 [22].',
  'A competitive auction actually took place and produced a binding price, after earlier privatisation attempts had failed [17].',
]));

push(h2('9.3  Evidence of continuing stress and unresolved outcomes'));
push(...bullets([
  'The Ministry of Finance’s Central Monitoring Unit concluded that PIA made an underlying net loss of Rs 4.6 bn in 2024 despite the reported Rs 26 bn accounting profit, which was driven by the deferred tax asset [8][25].',
  'PIA HCL remains deeply insolvent on paper: consolidated negative equity of Rs 563 bn at 31 December 2024, with a reported qualified audit opinion and a going-concern warning [1][23].',
  'The transferred debt is being serviced by the State, at roughly Rs 32.2 bn a year, and additional public funds continue to be approved for PIA HCL’s liabilities and for PIA retirees [12][28][34].',
  'Only Rs 10.125 bn of the Rs 135 bn bid reaches the Government for shares; the remaining Rs 124.875 bn is subscribed into PIACL itself through a rights issue in two tranches [18]. The Government puts its total cash proceeds for 100% of the airline at about Rs 55 bn, including the Rs 45 bn call option on the residual 25% stake.',
  'The second closing, the second equity tranche of Rs 41.625 bn and the disposal of the Roosevelt Hotel were all still outstanding at the date of this report.',
]));

push(p('An honest verdict, on the evidence available: the restructuring achieved what it was designed to achieve, which was to make PIA sellable and to sell it. It did not make the underlying obligations smaller, and it was never going to. Whether the transaction was good value for the public is a separate question that turns on figures — future privatisation proceeds against a decade of debt service — that are not yet known.'));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 10 challenges */
push(h1('10', 'Practical challenges and limitations'));
push(slide(10, 'Why this was hard to do and is hard to audit', [
  'Splitting a balance sheet means valuing and allocating items that were never separately recorded.',
  'A Rs 36–40 bn employee liability was missed at the time of the split.',
  'The public record is incomplete and often late, which limits what anyone outside the companies can verify.',
]));
push(spacer(140));

push(...bullets([
  [
    new TextRun({ text: 'Allocation and valuation. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('Assets and liabilities recorded for one company had to be split between two. Shared items — cash, tax balances, group-wide provisions — have no natural dividing line, and no public document shows how they were divided.'),
  ],
  [
    new TextRun({ text: 'Incomplete disclosure and poor comparability. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('Independent analysis noted that there is little clear public data on the companies’ balance sheets after CY2024 [18], and market data vendors report figures for PIA HCL that differ materially from the annual report. Section 13 lists the specific gaps.'),
  ],
  [
    new TextRun({ text: 'Legacy debt and contingent liabilities. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('The bank restructuring carries a reopener if privatisation milestones are missed [7], so the 12% cap is not permanent. Contingent items — guarantees, legal claims, tax disputes — are not quantified in any located source, and the waiver of penalties on about Rs 4.29 bn of income-tax liabilities in July 2026 shows they were still live [29].'),
  ],
  [
    new TextRun({ text: 'Employee and pension obligations. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('Rs 44 bn was transferred, then a further Rs 36–40 bn was identified as unaccounted for at the time of the scheme [18]. Separate public funds were later approved to settle PIA salary and pension payments and Rs 4.4 bn for retirees [34]. Workforce obligations proved to be the least tractable part of the transaction.'),
  ],
  [
    new TextRun({ text: 'Legal, tax, regulatory and governance complexity. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('The transaction required SECP sanction, Competition Commission clearance, shareholder and creditor approvals, PSX listing and delisting, and in 2026 a presidential ordinance to enable post-privatisation asset transfers [35]. PIA HCL also disclosed incomplete governance compliance in its first year [1].'),
  ],
  [
    new TextRun({ text: 'Dependence on government support. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('PIA HCL has few revenue-generating assets beyond its hotel and technology subsidiaries against Rs 959 bn of consolidated liabilities. Its ability to continue is reported to rest on continued State support [23].'),
  ],
  [
    new TextRun({ text: 'Privatisation uncertainty and investor concerns. ', font: SERIF, size: 20, bold: true, color: GREEN }),
    run('The deal structure — most of the price funding the airline rather than the seller — attracted sustained public criticism [18][32], and the residual 25% has not yet been bought.'),
  ],
]));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 11 conclusion */
push(h1('11', 'Key observations and conclusion'));
push(slide(11, 'The five answers', [
  'What changed, who got what, why it mattered, whether it worked, and what is still open.',
]));
push(spacer(140));

push(h2('What exactly changed?'));
push(p('A single company holding both an airline and Rs 825 bn of legacy obligations was divided into two. From 30 April 2024 the airline business continued inside PIACL, while a newly incorporated parent, PIA HCL, took the legacy liabilities, the non-core assets and the subsidiaries. Shareholders were carried across unchanged; no cash moved; nothing was repaid.'));

push(h2('Which entity received which major assets and liabilities?'));
push(p('PIACL kept the aircraft, engines, spares, route licences, operating receivables and payables — everything required to fly. PIA HCL received Rs 268.7 bn of bank loans, Rs 170 bn payable to the Government, Rs 188.3 bn of historical operating liabilities, Rs 44 bn of employee retirement obligations, the shareholdings in PIA Investments Limited (Roosevelt Hotel and Hôtel Scribe), Skyrooms and Sabre Travel Network, the Precision Engineering Complex, and 33 of the 44 properties. In 2026 the remaining 11 properties, valued at Rs 14.2 bn, went with the airline to its new owners.'));

push(h2('Why is this restructuring important?'));
push(p('It is the largest balance-sheet separation in Pakistani corporate history and the precondition for the country’s most closely watched privatisation. For an accounting student it is unusually instructive, because it shows a real case in which the accounts of one legal entity became dramatically healthier while the economic position of the group did not change at all — the difference between form and substance made visible in published numbers.'));

push(h2('Has it achieved the purpose for which it was designed?'));
push(p('Largely yes, on its own terms. The separation was legally completed, the airline’s reported and underlying operating performance improved, the bank debt was rescheduled on better terms, and the airline was sold at auction with management control transferred on 29 June 2026. But it did not reduce the obligations — PIA HCL still reported consolidated negative equity of Rs 563 bn — and the reported FY2024 profit rested on a deferred tax asset that the Government’s own monitoring unit did not treat as evidence of operating profitability.'));

push(h2('What risks and unresolved matters remain?'));
push(...bullets([
  'The second closing and the residual 25% stake (Rs 45 bn) and the second equity tranche (Rs 41.625 bn) are outstanding.',
  'Roughly Rs 500 bn or more of legacy obligations remain with the State-controlled PIA HCL, to be serviced at about Rs 32.2 bn a year.',
  'The bank agreement can be reopened and repriced if privatisation milestones are missed.',
  'The disposal of the Roosevelt Hotel and other non-core assets — the main source of repayment capacity — has not yet happened.',
  'Employee and pension obligations continue to require ad hoc public funding.',
  'Post-CY2024 financial statements for both companies were not publicly available at the date of this report, so the most recent audited picture is already more than eighteen months old.',
]));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 12 learning points */
push(h1('12', 'Key learning points'));
push(box([
  ...[
    'A balance sheet belongs to a legal entity, not to a business. Moving a liability from a subsidiary to its parent changes one balance sheet and leaves the group unchanged — which is exactly what consolidation exists to reveal.',
    'Derecognition needs a legal event. PIACL could remove Rs 671 bn only because a regulator-sanctioned scheme legally transferred the obligations to another company. An internal promise would not have been enough.',
    'Profit is not cash, and a reported profit can rest on a judgement. PIACL’s Rs 26.2 bn profit for 2024 depended on a Rs 31.6 bn deferred tax credit; before tax the year was a loss, and the Government’s own review put the underlying result at a Rs 4.6 bn loss.',
    'Read the finance cost line before the revenue line in a distressed company. PIA’s operating profit was positive throughout; interest and exchange losses were what destroyed it.',
    'Common-control transactions are not bargains. When the same owner sits on both sides, book-value accounting applies, no goodwill arises, and no gain should appear — and none did.',
    'Disclosure quality is part of financial performance. Accounts adopted thirteen months late, a qualified opinion and a quarterly report reaching the Board seven months after the period end all limit how much any outsider can conclude.',
    'Comparatives can change meaning. PIA HCL’s "2023" column is a group figure and is not comparable with PIACL’s own 2023 result. Always check what entity a comparative describes.',
    'Structuring can make something sellable without making it profitable. The restructuring achieved its stated purpose; whether it produced value for the public depends on numbers that are not yet available.',
  ].map((t, i) => new Paragraph({
    spacing: { before: 60, after: 60, line: 264 },
    children: [
      new TextRun({ text: `${i + 1}.  `, font: SERIF, size: 20, bold: true, color: GOLD }),
      run(t, { size: 20 }),
    ],
  })),
], { fill: GREY_BG, edge: GREEN }));

push(spacer(200));

/* ===================================================== 13 limitations */
push(h1('13', 'What this report could not verify'));
push(p('The project brief requires that unverifiable matters be stated rather than estimated. The following are the specific limits of this report.'));
push(...bullets([
  'Primary documents were not opened directly. PIACL’s and PIA HCL’s audited financial statements, and the Scheme of Arrangement itself, are published as PDFs on piac.com.pk and piahcl.com.pk. Those domains could not be reached from the environment used to prepare this report, so figures are taken from published reporting of those documents. Direct links are given in Section 14 and page references should be added after consulting the PDFs.',
  'No asset-by-asset schedule with carrying amounts at the effective date has been published. Only the aggregate of about Rs 26 bn of non-core assets is available.',
  'The split of cash, tax balances and shared provisions between the two companies is not disclosed anywhere located in this research.',
  'The accounting policy PIA HCL applied to the common-control transfer, and the wording of the going-concern and scheme notes, could not be confirmed.',
  'Contingent liabilities, legal claims and guarantee exposures are not quantified in any located source.',
  'Owned versus leased aircraft, and the carrying amount of the fleet retained by PIACL, are not separately published.',
  'Financial statements for FY2025 and interim periods in 2026 were not publicly available for either company at the date of this report; independent commentary notes the same gap [18].',
  'Figures attributed to market-data vendors differ materially from the annual report and are not relied on here.',
]));

push(box([new Paragraph({
  spacing: { after: 0 },
  children: [
    new TextRun({ text: 'Note on method. ', font: SERIF, size: 19, bold: true, color: GREEN }),
    run('No interviews were conducted for this report and it contains no interview section. All evidence is documentary: company annual reports and filings, regulator and Privatisation Commission announcements, and financial-press reporting of the audited accounts. Where sources disagree, the range is shown and the reason for the difference is explained rather than a single figure being chosen.', { size: 19 }),
  ],
})], { fill: GOLD_BG, edge: GOLD }));

push(new Paragraph({ children: [new PageBreak()] }));

/* ===================================================== 14 sources */
push(h1('14', 'Sources'));
push(p('Primary company and regulatory documents are listed first. Every numbered reference used in the text appears below.', { after: 160 }));

const SOURCES = [
  ['1', 'PIA Holding Company Limited, Annual Report 2024 (year ended 31 December 2024) — Chairman’s Review, Directors’ Report, Statement of Compliance, consolidated and unconsolidated financial statements.', 'https://piahcl.com.pk/assets/corporate_reports/PIA_HCL_ANNUAL_REPORT_2024_FINAL.pdf'],
  ['2', 'Scheme of Arrangement between Pakistan International Airlines Corporation Limited and PIA Holding Company Limited, revised final version filed with SECP.', 'https://www.piac.com.pk/corporate/images/Cargo/investor-information/SECP_Scheme_Version_Revised_Final.pdf'],
  ['3', 'Pakistan International Airlines Corporation Limited, Annual Report 2024 (revised), containing the FY2023 comparative column.', 'https://www.piac.com.pk/corporate/images/corporate_reports/PIAC_Annual_Report_2024_Revised.pdf'],
  ['4', 'Special Audited Accounts of PIA Holding Company Limited for the period ended 30 April 2025, audited by Grant Thornton Anjum Rahman.', 'https://piahcl.com.pk/assets/investor-information/Special_Audited_Accounts_of_PIAHCL_for_the_period_ended_April_30_2025.pdf'],
  ['5', 'Pakistan Stock Exchange company pages and filings for PIAHCLA, PIAHCLB and PIAA (historical, pre-delisting).', 'https://dps.psx.com.pk/company/PIAHCLA'],
  ['6', 'Business Recorder, "Posted Rs75bn loss in 2023: PIACL liabilities rise to Rs825bn with Rs161bn assets", 27 August 2024.', 'https://www.brecorder.com/news/40319463/'],
  ['7', 'Profit by Pakistan Today, "PIA reports rare profit ahead of privatization, trims losses after major restructuring", 8 April 2025.', 'https://profit.pakistantoday.com.pk/2025/04/08/pia-reports-rare-profit-ahead-of-privatization-trims-losses-after-major-restructuring/'],
  ['8', 'Profit by Pakistan Today, "PIA posts Rs4.6 billion loss despite reporting Rs26 billion accounting profit", 13 July 2025.', 'https://profit.pakistantoday.com.pk/2025/07/13/pia-posts-rs4-6-billion-loss-despite-reporting-rs26-billion-accounting-profit/'],
  ['9', 'Profit by Pakistan Today, "PIA holding company reduces net loss by 82% in 2024, reports Rs15.35 billion loss", 28 July 2025.', 'https://profit.pakistantoday.com.pk/2025/07/28/pia-holding-company-reduces-net-loss-by-82-in-2024-reports-rs15-35-billion-loss/'],
  ['10', 'Profit by Pakistan Today, "PIA initiates restructuring of Rs671bn debt as part of financial recovery plan, NA told", 20 March 2025.', 'https://profit.pakistantoday.com.pk/2025/03/20/pia-initiates-restructuring-of-rs671bn-debt-as-part-of-financial-recovery-plan-na-told/'],
  ['11', 'The Express Tribune, "Cabinet okays PIA restructuring".', 'https://tribune.com.pk/story/2455682/cabinet-okays-pia-restructuring'],
  ['12', 'The Express Tribune, "PIA Holding Company approves Rs268b debt restructuring".', 'https://tribune.com.pk/story/2460773/'],
  ['13', 'The Express Tribune, "SECP okays PIACL restructuring".', 'https://tribune.com.pk/story/2465344/secp-okays-piacl-restructuring'],
  ['14', 'The Express Tribune, "CCP okays PIA’s acquisition by Holdco".', 'https://tribune.com.pk/story/2465194/'],
  ['15', 'The News, "PIAHCL to list on PSX on May 27".', 'https://www.thenews.com.pk/print/1192098-piahcl-to-list-on-psx-on-may-27'],
  ['16', 'The Express Tribune, "The true cost of PIA privatisation".', 'https://tribune.com.pk/story/2587758/the-true-cost-of-pia-privatisation'],
  ['17', 'Dawn, "Arif Habib consortium emerges victorious in PIA auction with Rs135bn bid", 22 December 2025.', 'https://www.dawn.com/news/1962791'],
  ['18', 'Profit by Pakistan Today, "How much was the PIA really sold for?", 25 December 2025.', 'https://profit.pakistantoday.com.pk/2025/12/25/how-much-was-the-pia-really-sold-for/'],
  ['19', 'Dawn, "Govt formally transfers management control of PIA to Arif Habib-led consortium", 29 June 2026.', 'https://www.dawn.com/news/2011655'],
  ['20', 'Profit by Pakistan Today, "PIA Deal: 11 Properties Worth Rs14.2b Transferred to Buyers", 15 July 2026; and The Express Tribune, "PIA buyers get Rs14.2b properties".', 'https://tribune.com.pk/story/2618278/pia-buyers-get-rs142b-properties'],
  ['21', 'The Nation, "PIA’s acquirers form special purpose vehicle, namely PIA Equity Limited (PIAEL)", 30 April 2026; and Dawn, "Arif Habib creates PIA takeover vehicle".', 'https://www.dawn.com/news/1996519'],
  ['22', 'Arab News, "Pakistan’s PIA posts first half-year profit in 20 years ahead of privatization sale".', 'https://www.arabnews.com/node/2615497/pakistan'],
  ['23', 'Pakistan Observer, "PIA’s privatization saga" — reporting the qualified audit opinion and going-concern warning on PIA HCL’s FY2024 accounts.', 'https://pakobserver.net/pias-privatization-saga/'],
  ['24', 'Mettis Global, "PIA shows Rs26bn profit, but actually in loss".', 'https://mettisglobal.news/PIA-shows-Rs26bn-profit-but-actually-in-loss-53760'],
  ['25', 'The Express Tribune, "PIA incurs net loss of Rs4.6 billion" — Ministry of Finance Central Monitoring Unit report on state-owned enterprises, July 2025.', 'https://tribune.com.pk/story/2555581/pia-incurs-net-loss-of-rs46-billion'],
  ['26', 'Geo News, "Roosevelt, Scribe hotels not part of PIA privatisation: PM’s adviser".', 'https://www.geo.tv/latest/641154'],
  ['27', 'Pakistan International Airlines, company profile — incorporation 1955 and conversion under the PIA (Conversion) Act, 2016.', 'https://www.piac.com.pk/corporate/about-us/company-profile'],
  ['28', 'Profit by Pakistan Today, "Govt approves over Rs4.5 billion for PIA Holding Company liabilities after privatisation", 7 May 2026.', 'https://profit.pakistantoday.com.pk/2026/05/07/govt-approves-over-rs4-5-billion-for-pia-holding-company-liabilities-after-privatisation/'],
  ['29', 'Profit by Pakistan Today, "Govt waives penalties, surcharge on PIA’s Rs4.29 billion income tax liabilities to facilitate privatisation", 17 July 2026.', 'https://profit.pakistantoday.com.pk/2026/07/17/govt-waives-penalties-surcharge-on-pias-rs429-billion-income-tax-liabilities-to-facilitate-privatisation'],
  ['30', 'Friedrich Naumann Foundation, "Pakistan: Wings of Loss — a stock-take on PIA privatisation".', 'https://www.freiheit.org/pakistan/wings-loss-stock-take-pia-privatisation'],
  ['31', 'Privatisation Commission of Pakistan — transaction announcements and press releases on the PIACL transaction.', 'https://privatisation.gov.pk/'],
  ['32', 'Al Jazeera, "Why is the sale of Pakistan’s national airline stirring a political storm?", 26 December 2025.', 'https://www.aljazeera.com/news/2025/12/26/why-is-the-sale-of-pakistans-national-airline-stirring-a-political-storm'],
  ['33', 'The Express Tribune, "Taxpayers to pay Rs30b for PIA debt".', 'https://tribune.com.pk/story/2624673/taxpayers-to-pay-rs30b-for-pia-debt'],
  ['34', 'The Express Tribune, "Govt approves Rs4.4b for PIA retirees".', 'https://tribune.com.pk/story/2605180/'],
  ['35', 'Profit by Pakistan Today, "President Zardari approves ordinance to enable PIA asset transfer after privatisation", 5 May 2026.', 'https://profit.pakistantoday.com.pk/2026/05/05/president-zardari-approves-ordinance-to-enable-pia-asset-transfer-after-privatisation/'],
];

SOURCES.forEach(([n, text, url]) => push(new Paragraph({
  spacing: { before: 50, after: 50, line: 252 },
  indent: { left: 420, hanging: 420 },
  children: [
    new TextRun({ text: `[${n}]  `, font: SERIF, size: 17, bold: true, color: GREEN }),
    new TextRun({ text: `${text} `, font: SERIF, size: 17, color: INK }),
    link(url, url),
  ],
})));

push(spacer(200));
push(box([new Paragraph({
  spacing: { after: 0 },
  children: [
    new TextRun({ text: 'Acknowledgement of sources. ', font: SERIF, size: 19, bold: true, color: GREEN }),
    run('This report relies entirely on secondary and published primary sources, listed above. No professional was interviewed and no unpublished information was used. Where a figure could not be traced to a published source it has been omitted rather than estimated.', { size: 19 }),
  ],
})], { fill: GREY_BG, edge: GREEN }));

/* ------------------------------------------------------------------ assemble */

const doc = new Document({
  creator: 'Principles of Accounting — Group Project',
  title: 'PIA: Splitting One Balance Sheet Into Two',
  description: 'Analysis of the 2024 restructuring of Pakistan International Airlines into PIA HCL and PIACL.',
  styles: {
    default: {
      document: { run: { font: SERIF, size: 20, color: INK } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'PIA Restructuring — Principles of Accounting Group Project   ·   ', font: SERIF, size: 15, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 15, color: MUTED }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, 'PIA_Restructuring_Report.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, buf.length, 'bytes');
});
