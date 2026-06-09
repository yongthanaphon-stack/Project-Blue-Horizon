require('dotenv/config');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const DEFAULT_OUT = path.resolve(__dirname, '..', 'scratch', 'signals-export.xlsx');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, includeDeleted: false };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      args.out = path.resolve(argv[++i]);
    } else if (arg === '--include-deleted') {
      args.includeDeleted = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  node scripts/export-signals-to-xlsx.js [--out <path>] [--include-deleted]

Options:
  --out <path>        Output .xlsx path. Defaults to ${DEFAULT_OUT}
  --include-deleted   Include soft-deleted signals (deletedAt set).
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

const COLUMNS = [
  { header: 'ID', get: (s) => s.id },
  { header: 'Name', get: (s) => s.name },
  { header: 'Short Details', get: (s) => s.shortDetails || '' },
  { header: 'Description', get: (s) => s.description },
  { header: 'Reference Source', get: (s) => s.referenceSource || '' },
  { header: 'Tags', get: (s) => (s.tags || []).join(', ') },
  { header: 'PESTEL Categories', get: (s) => (s.pestelCategories || []).join(', ') },
  { header: 'Stakeholders', get: (s) => (s.stakeholders || []).join(', ') },
  { header: 'Impact Level', get: (s) => s.impactLevel },
  { header: 'Time Horizon', get: (s) => s.timeHorizon },
  { header: 'Impact Score', get: (s) => s.impactScore },
  { header: 'Status', get: (s) => s.status },
  { header: 'Total Votes', get: (s) => s.totalVotes },
  { header: 'Is Global', get: (s) => (s.isGlobal ? 'TRUE' : 'FALSE') },
  { header: 'Owner ID', get: (s) => s.ownerId ?? '' },
  { header: 'Owner Name', get: (s) => s.owner?.name || '' },
  { header: 'Owner Email', get: (s) => s.owner?.email || '' },
  { header: 'Workshop ID', get: (s) => s.workshopId ?? '' },
  { header: 'Workshop Name', get: (s) => s.workshop?.name || '' },
  {
    header: 'References',
    get: (s) =>
      (s.references || [])
        .map((r) => (r.title ? `${r.title} (${r.url})` : r.url))
        .join('\n'),
  },
  { header: 'Created At', get: (s) => toIso(s.createdAt) },
  { header: 'Updated At', get: (s) => toIso(s.updatedAt) },
  { header: 'Deleted At', get: (s) => toIso(s.deletedAt) },
];

function toIso(value) {
  return value ? new Date(value).toISOString() : '';
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnLetter(index) {
  let result = '';
  let n = index;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function buildCell(rowNumber, colIndex, value, styleId) {
  const ref = `${columnLetter(colIndex)}${rowNumber}`;
  const style = styleId ? ` s="${styleId}"` : '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`;
  }

  const text = value === null || value === undefined ? '' : String(value);
  if (text === '') {
    return `<c r="${ref}"${style}/>`;
  }

  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function buildSheetXml(signals) {
  const rows = [];

  const headerCells = COLUMNS.map((col, i) =>
    buildCell(1, i + 1, col.header, 1),
  ).join('');
  rows.push(`<row r="1">${headerCells}</row>`);

  signals.forEach((signal, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const cells = COLUMNS.map((col, i) =>
      buildCell(rowNumber, i + 1, col.get(signal)),
    ).join('');
    rows.push(`<row r="${rowNumber}">${cells}</row>`);
  });

  const lastCol = columnLetter(COLUMNS.length);
  const dimension = `A1:${lastCol}${signals.length + 1}`;
  const cols = COLUMNS.map(
    (_, i) => `<col min="${i + 1}" max="${i + 1}" width="24" customWidth="1"/>`,
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="${dimension}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rows.join('')}</sheetData>
</worksheet>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Signals" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf></cellXfs>
</styleSheet>`;

function writeXlsx(outPath, sheetXml) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'signals-xlsx-'));
  try {
    fs.mkdirSync(path.join(tmpDir, '_rels'));
    fs.mkdirSync(path.join(tmpDir, 'xl', '_rels'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'xl', 'worksheets'), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, '[Content_Types].xml'), CONTENT_TYPES);
    fs.writeFileSync(path.join(tmpDir, '_rels', '.rels'), ROOT_RELS);
    fs.writeFileSync(path.join(tmpDir, 'xl', 'workbook.xml'), WORKBOOK);
    fs.writeFileSync(path.join(tmpDir, 'xl', '_rels', 'workbook.xml.rels'), WORKBOOK_RELS);
    fs.writeFileSync(path.join(tmpDir, 'xl', 'styles.xml'), STYLES);
    fs.writeFileSync(path.join(tmpDir, 'xl', 'worksheets', 'sheet1.xml'), sheetXml);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (fs.existsSync(outPath)) fs.rmSync(outPath);

    // [Content_Types].xml must be stored first in the archive for max compatibility.
    execFileSync('zip', ['-X', '-q', outPath, '[Content_Types].xml'], { cwd: tmpDir });
    execFileSync(
      'zip',
      ['-rX', '-q', outPath, '_rels', 'xl'],
      { cwd: tmpDir },
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const signals = await prisma.signal.findMany({
      where: args.includeDeleted ? {} : { deletedAt: null },
      orderBy: { id: 'asc' },
      include: {
        owner: { select: { name: true, email: true } },
        workshop: { select: { name: true } },
        references: { select: { title: true, url: true } },
      },
    });

    const sheetXml = buildSheetXml(signals);
    writeXlsx(args.out, sheetXml);

    console.log(`Exported ${signals.length} signal(s) to ${args.out}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
