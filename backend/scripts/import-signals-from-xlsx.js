require('dotenv/config');

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const DEFAULT_FILE = '/Users/admin/Documents/signal.xlsx';
const DEFAULT_OWNER_EMAIL = 'admin@bluehorizon.com';
const VALID_STATUSES = new Set(['DRAFT', 'PUBLISHED']);

const PESTEL_COLUMNS = {
  3: 'POLITICAL',
  4: 'ECONOMIC',
  5: 'SOCIAL',
  6: 'TECHNOLOGICAL',
  7: 'ENVIRONMENTAL',
  8: 'LEGAL',
};

const STAKEHOLDER_COLUMNS = {
  9: 'Academia',
  10: 'HEI',
  11: 'Administration',
  12: 'Startups',
  13: 'SMEs',
  14: 'Large Industry',
  15: 'VCs/Investors',
  16: 'Regulators',
  17: 'NGOs',
  18: 'Public',
};

const CURATED_SIGNAL_OVERRIDES = {
  SIG002: {
    impactLevel: 'GLOBAL',
    timeHorizon: 'H1',
  },
  SIG003: {
    impactLevel: 'GLOBAL',
    timeHorizon: 'H1',
    stakeholders: ['Public', 'Administration', 'Academia'],
  },
  SIG004: {
    impactLevel: 'GLOBAL',
  },
  SIG005: {
    impactLevel: 'GLOBAL',
    timeHorizon: 'H2',
    stakeholders: ['Academia', 'HEI', 'Administration', 'Public'],
  },
  SIG010: {
    impactLevel: 'COUNTRY',
  },
  SIG017: {
    name: 'ช่องว่างการผลิตบัณฑิตปริญญาเอกคุณภาพสูงของไทย',
    descriptionFromTitle: true,
  },
  SIG021: {
    impactLevel: 'COUNTRY',
    tags: ['subnational', 'local / urban area'],
  },
  SIG024: {
    useSignalSource: true,
  },
  SIG025: {
    useSignalSource: true,
  },
  SIG026: {
    useSignalSource: true,
  },
  SIG028: {
    pestelCategories: ['SOCIAL', 'ECONOMIC', 'LEGAL'],
    stakeholders: ['Academia', 'HEI', 'Administration', 'Public'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H2',
    useSignalSource: true,
  },
};

const CURATED_DETAIL_ROWS = [
  {
    rowNumber: 29,
    originalId: 'SIG029',
    name: 'The Digital Worker Race: The New OS that Redefines Work',
    pestelCategories: ['ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL'],
    stakeholders: ['Large Industry', 'SMEs', 'Startups', 'Tech Providers', 'Public'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H2',
  },
  {
    rowNumber: 30,
    originalId: 'SIG030',
    name: 'ความท้าทายผลิตภาพไทย: Startups และงานวิจัยพร้อมขายยังไม่เร่งเศรษฐกิจ',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'TECHNOLOGICAL'],
    stakeholders: ['Administration', 'Startups', 'SMEs', 'Academia', 'HEI', 'Large Industry'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 31,
    originalId: 'SIG031',
    pestelCategories: ['POLITICAL', 'SOCIAL', 'ENVIRONMENTAL', 'LEGAL'],
    stakeholders: ['Administration', 'Regulators', 'Public', 'NGOs'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 32,
    originalId: 'SIG032',
    pestelCategories: ['ECONOMIC', 'TECHNOLOGICAL', 'ENVIRONMENTAL'],
    stakeholders: ['Academia', 'Large Industry', 'Startups', 'SMEs'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H2',
  },
  {
    rowNumber: 33,
    originalId: 'SIG033',
    pestelCategories: ['ECONOMIC', 'SOCIAL'],
    stakeholders: ['Academia', 'HEI', 'Administration', 'Public', 'Medical Practitioners'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 34,
    originalId: 'SIG034',
    pestelCategories: ['POLITICAL', 'SOCIAL', 'ENVIRONMENTAL'],
    stakeholders: ['Administration', 'Regulators', 'Public', 'NGOs'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 35,
    originalId: 'SIG035',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'SOCIAL'],
    stakeholders: ['Administration', 'Public', 'SMEs', 'NGOs'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 36,
    originalId: 'SIG036',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'TECHNOLOGICAL'],
    stakeholders: ['Academia', 'Large Industry', 'Startups', 'VCs/Investors', 'Regulators'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H3',
  },
  {
    rowNumber: 37,
    originalId: 'SIG037',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'SOCIAL', 'ENVIRONMENTAL'],
    stakeholders: ['Administration', 'Regulators', 'Public', 'NGOs'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 38,
    originalId: 'SIG038',
    pestelCategories: ['ECONOMIC', 'TECHNOLOGICAL', 'ENVIRONMENTAL'],
    stakeholders: ['Administration', 'Large Industry', 'Startups', 'SMEs', 'VCs/Investors'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 39,
    originalId: 'SIG039',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'ENVIRONMENTAL', 'LEGAL'],
    stakeholders: ['Regulators', 'Administration', 'SMEs', 'Large Industry'],
    impactLevel: 'REGION',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 40,
    originalId: 'SIG040',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'TECHNOLOGICAL'],
    stakeholders: ['Administration', 'Regulators', 'Large Industry', 'Public'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 41,
    originalId: 'SIG041',
    pestelCategories: ['ECONOMIC', 'TECHNOLOGICAL'],
    stakeholders: ['Large Industry', 'Startups', 'SMEs', 'VCs/Investors', 'Academia'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 42,
    originalId: 'SIG042',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'ENVIRONMENTAL'],
    stakeholders: ['Administration', 'Regulators', 'Large Industry', 'Public'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 43,
    originalId: 'SIG043',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL', 'ENVIRONMENTAL'],
    stakeholders: ['Administration', 'Public', 'Large Industry'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 44,
    originalId: 'SIG044',
    pestelCategories: ['POLITICAL', 'ECONOMIC', 'SOCIAL'],
    stakeholders: ['Administration', 'Regulators', 'Large Industry', 'Public'],
    impactLevel: 'REGION',
    timeHorizon: 'H1',
  },
  {
    rowNumber: 45,
    originalId: 'SIG045',
    pestelCategories: ['SOCIAL', 'TECHNOLOGICAL'],
    stakeholders: ['Academia', 'HEI', 'Tech Providers', 'Public'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H2',
  },
  {
    rowNumber: 46,
    originalId: 'SIG046',
    pestelCategories: ['ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL'],
    stakeholders: ['Academia', 'HEI', 'Administration', 'Public'],
    impactLevel: 'GLOBAL',
    timeHorizon: 'H2',
  },
  {
    rowNumber: 47,
    originalId: 'SIG047',
    pestelCategories: ['ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL'],
    stakeholders: ['Administration', 'Large Industry', 'Academia', 'HEI', 'Public'],
    impactLevel: 'COUNTRY',
    timeHorizon: 'H1',
  },
];

function parseArgs(argv) {
  const args = {
    file: DEFAULT_FILE,
    ownerEmail: DEFAULT_OWNER_EMAIL,
    status: 'DRAFT',
    dryRun: true,
    import: false,
    curated: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') {
      args.file = argv[++i];
    } else if (arg === '--owner-email') {
      args.ownerEmail = argv[++i];
    } else if (arg === '--status') {
      args.status = String(argv[++i] || '').toUpperCase();
    } else if (arg === '--dry-run') {
      args.dryRun = true;
      args.import = false;
    } else if (arg === '--import') {
      args.import = true;
      args.dryRun = false;
    } else if (arg === '--curated') {
      args.curated = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!VALID_STATUSES.has(args.status)) {
    throw new Error('--status must be DRAFT or PUBLISHED');
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/import-signals-from-xlsx.js --dry-run
  node scripts/import-signals-from-xlsx.js --import --status DRAFT

Options:
  --file <path>          XLSX source file. Defaults to ${DEFAULT_FILE}
  --owner-email <email>  Owner/admin user for imported signal histories.
  --status <status>      DRAFT or PUBLISHED. Defaults to DRAFT.
  --dry-run              Validate and preview only. This is the default.
  --import               Insert eligible, non-duplicate signals into the DB.
  --curated              Apply reviewed mappings for incomplete rows.
`);
}

function readZipText(filePath, entryName) {
  return execFileSync('unzip', ['-p', filePath, entryName], {
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseAttributes(tag) {
  const attrs = {};
  const attrPattern = /([\w:.-]+)="([^"]*)"/g;
  let match;
  while ((match = attrPattern.exec(tag))) {
    attrs[match[1]] = decodeXml(match[2]);
  }
  return attrs;
}

function parseSharedStrings(xml) {
  const strings = [];
  const itemPattern = /<si\b[\s\S]*?<\/si>/g;
  let itemMatch;

  while ((itemMatch = itemPattern.exec(xml))) {
    const item = itemMatch[0];
    const textParts = [];
    const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;

    while ((textMatch = textPattern.exec(item))) {
      textParts.push(decodeXml(textMatch[1]));
    }

    strings.push(textParts.join(''));
  }

  return strings;
}

function parseWorkbook(filePath) {
  const workbookXml = readZipText(filePath, 'xl/workbook.xml');
  const relsXml = readZipText(filePath, 'xl/_rels/workbook.xml.rels');
  const rels = parseRelationships(relsXml);
  const sheets = new Map();
  const sheetPattern = /<sheet\b[^>]*\/>/g;
  let match;

  while ((match = sheetPattern.exec(workbookXml))) {
    const attrs = parseAttributes(match[0]);
    const relId = attrs['r:id'];
    let target = rels.get(relId);
    if (!target) continue;
    if (target.startsWith('/')) target = target.slice(1);
    if (!target.startsWith('xl/')) target = path.posix.join('xl', target);
    sheets.set(attrs.name, target);
  }

  return sheets;
}

function parseRelationships(xml) {
  const rels = new Map();
  const relPattern = /<Relationship\b[^>]*\/>/g;
  let match;

  while ((match = relPattern.exec(xml))) {
    const attrs = parseAttributes(match[0]);
    rels.set(attrs.Id, attrs.Target);
  }

  return rels;
}

function columnNumber(cellRef) {
  const match = /^([A-Z]+)/.exec(cellRef);
  if (!match) return 0;

  return match[1].split('').reduce((total, char) => {
    return total * 26 + char.charCodeAt(0) - 64;
  }, 0);
}

function parseSheet(filePath, sheetPath, sharedStrings) {
  const xml = readZipText(filePath, sheetPath);
  const relPath = path.posix.join(
    path.posix.dirname(sheetPath),
    '_rels',
    `${path.posix.basename(sheetPath)}.rels`,
  );
  let rels = new Map();
  try {
    rels = parseRelationships(readZipText(filePath, relPath));
  } catch {
    rels = new Map();
  }

  const hyperlinks = new Map();
  const hyperlinkPattern = /<hyperlink\b[^>]*\/>/g;
  let hyperlinkMatch;
  while ((hyperlinkMatch = hyperlinkPattern.exec(xml))) {
    const attrs = parseAttributes(hyperlinkMatch[0]);
    const relId = attrs['r:id'];
    hyperlinks.set(attrs.ref, relId ? rels.get(relId) || '' : attrs.location || '');
  }

  const rows = new Map();
  const rowPattern = /<row\b[^>]*>[\s\S]*?<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(xml))) {
    const rowXml = rowMatch[0];
    const rowAttrs = parseAttributes(rowXml.slice(0, rowXml.indexOf('>') + 1));
    const rowNumber = Number(rowAttrs.r);
    const values = new Map();
    const cellPattern = /<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(rowXml))) {
      const cellXml = cellMatch[0];
      const cellAttrs = parseAttributes(cellXml.slice(0, cellXml.indexOf('>') + 1));
      const cellRef = cellAttrs.r;
      if (!cellRef) continue;

      const col = columnNumber(cellRef);
      const value = readCellValue(cellXml, cellAttrs, sharedStrings);
      if (value !== '') values.set(col, value);
    }

    if (values.size > 0) rows.set(rowNumber, values);
  }

  return { rows, hyperlinks };
}

function readCellValue(cellXml, cellAttrs, sharedStrings) {
  const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(cellXml);
  const type = cellAttrs.t;

  if (type === 's') {
    const index = valueMatch ? Number(valueMatch[1]) : -1;
    return sharedStrings[index] || '';
  }

  if (type === 'inlineStr') {
    const parts = [];
    const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;
    while ((textMatch = textPattern.exec(cellXml))) {
      parts.push(decodeXml(textMatch[1]));
    }
    return parts.join('');
  }

  if (type === 'b' && valueMatch) {
    return valueMatch[1] === '1' ? 'TRUE' : 'FALSE';
  }

  return valueMatch ? decodeXml(valueMatch[1]) : '';
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizedKey(value) {
  return cleanText(value).replace(/\s+/g, ' ').toLowerCase();
}

function rowValue(row, col) {
  return cleanText(row.get(col));
}

function yesNo(value) {
  const normalized = normalizedKey(value).toUpperCase();
  if (['YES', 'Y', 'TRUE', '1'].includes(normalized)) return true;
  if (['NO', 'N', 'FALSE', '0', ''].includes(normalized)) return false;
  return null;
}

function mapImpactLevel(value) {
  const normalized = normalizedKey(value);
  if (normalized === 'global') return 'GLOBAL';
  if (normalized === 'regional' || normalized === 'region') return 'REGION';
  if (normalized === 'country') return 'COUNTRY';
  if (!normalized) return '';
  return null;
}

function mapTimeHorizon(value) {
  const match = /\bH([123])\b/i.exec(cleanText(value));
  if (match) return `H${match[1]}`;
  return cleanText(value) ? null : '';
}

function parseSignalRows(signalSheet) {
  const signals = [];

  for (const [rowNumber, row] of [...signalSheet.rows.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    if (rowNumber < 3) continue;

    const originalId = rowValue(row, 1);
    const title = rowValue(row, 2);
    const hasData = title || [...Array(22).keys()].some((i) => rowValue(row, i + 3));
    if (!originalId && !hasData) continue;

    const pestelCategories = [];
    const invalidPestelFlags = [];
    for (const [column, category] of Object.entries(PESTEL_COLUMNS)) {
      const flag = yesNo(rowValue(row, Number(column)));
      if (flag === true) pestelCategories.push(category);
      if (flag === null) invalidPestelFlags.push(`${column}:${rowValue(row, Number(column))}`);
    }

    const stakeholders = [];
    const invalidStakeholderFlags = [];
    for (const [column, stakeholder] of Object.entries(STAKEHOLDER_COLUMNS)) {
      const flag = yesNo(rowValue(row, Number(column)));
      if (flag === true) stakeholders.push(stakeholder);
      if (flag === null) {
        invalidStakeholderFlags.push(`${column}:${rowValue(row, Number(column))}`);
      }
    }

    signals.push({
      rowNumber,
      originalId,
      title,
      pestelCategories,
      stakeholders,
      impactRaw: rowValue(row, 19),
      impactLevel: mapImpactLevel(rowValue(row, 19)),
      geoDetail: rowValue(row, 20),
      horizonRaw: rowValue(row, 21),
      timeHorizon: mapTimeHorizon(rowValue(row, 21)),
      paceLayering: rowValue(row, 22),
      timingImpact: rowValue(row, 23),
      details: rowValue(row, 24),
      sourceText: rowValue(row, 25),
      sourceUrl: cleanText(signalSheet.hyperlinks.get(`Y${rowNumber}`)),
      invalidPestelFlags,
      invalidStakeholderFlags,
      hasData,
    });
  }

  return signals;
}

function parseDetailRows(detailsSheet) {
  const details = [];

  for (const [rowNumber, row] of [...detailsSheet.rows.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    if (rowNumber < 2) continue;

    const record = {
      rowNumber,
      originalId: rowValue(row, 1),
      title: rowValue(row, 2),
      details: rowValue(row, 3),
      linkText: rowValue(row, 4),
      linkUrl: cleanText(detailsSheet.hyperlinks.get(`D${rowNumber}`)),
      youtubeText: rowValue(row, 5),
      youtubeUrl: cleanText(detailsSheet.hyperlinks.get(`E${rowNumber}`)),
    };

    if (
      record.originalId ||
      record.title ||
      record.details ||
      record.linkText ||
      record.linkUrl ||
      record.youtubeText ||
      record.youtubeUrl
    ) {
      details.push(record);
    }
  }

  return details;
}

function groupUniqueBy(records, getKey) {
  const groups = new Map();
  for (const record of records) {
    const key = getKey(record);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const unique = new Map();
  for (const [key, group] of groups.entries()) {
    if (group.length === 1) unique.set(key, group[0]);
  }
  return unique;
}

function findDetailMatch(signal, detailsById, detailsByTitle) {
  const titleKey = normalizedKey(signal.title);
  const idKey = normalizedKey(signal.originalId);
  const titleMatch = detailsByTitle.get(titleKey);
  if (titleMatch) {
    const sameId = normalizedKey(titleMatch.originalId) === idKey;
    return {
      detail: titleMatch,
      matchedBy: sameId ? 'id+title' : 'title',
      warning: sameId
        ? ''
        : `source title matched but source ID is ${titleMatch.originalId || '(blank)'}`,
    };
  }

  const idMatch = detailsById.get(idKey);
  if (idMatch) {
    return {
      detail: idMatch,
      matchedBy: 'id',
      warning: `source ID matched but title differs: "${idMatch.title}"`,
    };
  }

  return { detail: null, matchedBy: '', warning: '' };
}

function cleanUrl(value) {
  return cleanText(value)
    .replace(/[)\].,]+$/g, '')
    .replace(/^<|>$/g, '');
}

function extractUrls(...values) {
  const urls = [];
  for (const value of values) {
    const text = String(value || '');
    const matches = text.match(/https?:\/\/[^\s<>"']+/g) || [];
    urls.push(...matches.map(cleanUrl));
  }
  return urls;
}

function referenceTitleFor(url, detail) {
  const label = cleanText(detail.linkText)
    .split(/\n+/)
    .map(cleanText)
    .find((line) => line && !line.startsWith('http'));

  if (label && label.length <= 180) return label;

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Reference source';
  }
}

function buildReferences(detail) {
  const urls = [
    detail.linkUrl,
    detail.youtubeUrl,
    ...extractUrls(detail.linkText, detail.youtubeText),
  ]
    .map(cleanUrl)
    .filter((url) => /^https?:\/\//i.test(url));

  const seen = new Set();
  return urls
    .filter((url) => {
      const key = url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((url) => ({
      title: referenceTitleFor(url, detail),
      url,
    }));
}

function normalizeTag(tag) {
  return String(tag || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeTags(tags) {
  const seen = new Set();
  const normalized = [];
  for (const tag of tags) {
    const value = normalizeTag(tag);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized.slice(0, 12);
}

function compactDescription(text) {
  const value = cleanText(text).replace(/\s+/g, ' ');
  return value.length <= 2000 ? value : value.slice(0, 1997).trimEnd() + '...';
}

function detailFromSignalSource(signal) {
  return {
    rowNumber: signal.rowNumber,
    originalId: signal.originalId,
    title: signal.title,
    details: signal.details,
    linkText: signal.sourceText,
    linkUrl: signal.sourceUrl,
    youtubeText: '',
    youtubeUrl: '',
  };
}

function applyCuratedSignalOverride(signal, curated) {
  if (!curated) return signal;

  const override = CURATED_SIGNAL_OVERRIDES[signal.originalId];
  if (!override) return signal;

  return {
    ...signal,
    curatedName: override.name,
    curatedDescription: override.descriptionFromTitle ? signal.title : override.description,
    curatedTags: override.tags || [],
    useSignalSource: Boolean(override.useSignalSource),
    pestelCategories: override.pestelCategories || signal.pestelCategories,
    stakeholders: override.stakeholders || signal.stakeholders,
    impactLevel: override.impactLevel || signal.impactLevel,
    timeHorizon: override.timeHorizon || signal.timeHorizon,
  };
}

function buildSignalImportItem({
  signal,
  detail,
  match,
  status,
  references,
}) {
  const name = signal.curatedName || signal.title;
  const description = compactDescription(
    signal.curatedDescription || detail.details || signal.details || signal.title,
  );

  return {
    originalId: signal.originalId,
    sourceRow: signal.rowNumber,
    detailRow: detail.rowNumber,
    matchedBy: match.matchedBy,
    warning: match.warning,
    data: {
      name,
      shortDetails: detail.details ? compactDescription(detail.details) : null,
      description,
      referenceSource: `signal.xlsx:${signal.originalId}`,
      tags: normalizeTags([
        'signal-import',
        signal.originalId,
        ...(signal.curatedTags || []),
      ]),
      pestelCategories: signal.pestelCategories,
      stakeholders: signal.stakeholders,
      impactLevel: signal.impactLevel,
      timeHorizon: signal.timeHorizon,
      status,
      isGlobal: true,
      references,
    },
  };
}

function buildCuratedDetailItems(details, status) {
  const detailsByRow = new Map(details.map((detail) => [detail.rowNumber, detail]));
  const eligible = [];
  const skipped = [];

  for (const curation of CURATED_DETAIL_ROWS) {
    const detail = detailsByRow.get(curation.rowNumber);
    if (!detail) {
      skipped.push({
        signal: {
          originalId: curation.originalId,
          rowNumber: curation.rowNumber,
        },
        reason: 'missing curated detail row',
      });
      continue;
    }

    const references = buildReferences(detail);
    if (references.length === 0) {
      skipped.push({
        signal: {
          originalId: curation.originalId,
          rowNumber: curation.rowNumber,
        },
        reason: 'missing source URL',
      });
      continue;
    }

    const name = curation.name || detail.title;
    if (!name || name.length > 200) {
      skipped.push({
        signal: {
          originalId: curation.originalId,
          rowNumber: curation.rowNumber,
        },
        reason: !name
          ? 'missing title'
          : `title exceeds 200 characters (${name.length})`,
      });
      continue;
    }

    eligible.push({
      originalId: curation.originalId,
      sourceRow: null,
      detailRow: detail.rowNumber,
      matchedBy: 'curated-detail',
      warning: '',
      data: {
        name,
        shortDetails: detail.details ? compactDescription(detail.details) : null,
        description: compactDescription(detail.details || detail.title),
        referenceSource: `signal.xlsx:${curation.originalId}`,
        tags: normalizeTags(['signal-import', curation.originalId, 'curated-detail']),
        pestelCategories: curation.pestelCategories,
        stakeholders: curation.stakeholders,
        impactLevel: curation.impactLevel,
        timeHorizon: curation.timeHorizon,
        status,
        isGlobal: true,
        references,
      },
    });
  }

  return { eligible, skipped };
}

function validateAndTransform(signals, details, status, curated = false) {
  const detailsById = groupUniqueBy(details, (detail) => normalizedKey(detail.originalId));
  const detailsByTitle = groupUniqueBy(details, (detail) => normalizedKey(detail.title));
  const eligible = [];
  const skipped = [];
  const curatedDetailRows = curated
    ? new Set(CURATED_DETAIL_ROWS.map((detail) => detail.rowNumber))
    : new Set();
  const detailRowsWithoutIds = details.filter(
    (detail) => !detail.originalId && !curatedDetailRows.has(detail.rowNumber),
  );

  for (const rawSignal of signals) {
    const signal = applyCuratedSignalOverride(rawSignal, curated);
    const name = signal.curatedName || signal.title;
    const skip = (reason) => skipped.push({ signal, reason });

    if (!signal.hasData || (!name && signal.originalId)) {
      skip('placeholder row');
      continue;
    }

    if (!/^SIG\d{3}$/i.test(signal.originalId)) {
      skip('missing or invalid Signal ID');
      continue;
    }

    if (!name) {
      skip('missing title');
      continue;
    }

    if (name.length > 200) {
      skip(`title exceeds 200 characters (${name.length})`);
      continue;
    }

    if (signal.invalidPestelFlags.length || signal.invalidStakeholderFlags.length) {
      skip('invalid yes/no flag in PESTEL or stakeholder columns');
      continue;
    }

    if (signal.pestelCategories.length === 0) {
      skip('missing PESTEL category');
      continue;
    }

    if (!signal.impactLevel) {
      skip(signal.impactLevel === '' ? 'missing impact level' : `unsupported impact level: ${signal.impactRaw}`);
      continue;
    }

    if (!signal.timeHorizon) {
      skip(signal.timeHorizon === '' ? 'missing time horizon' : `unsupported time horizon: ${signal.horizonRaw}`);
      continue;
    }

    let match = findDetailMatch(signal, detailsById, detailsByTitle);
    if (signal.useSignalSource) {
      match = {
        detail: detailFromSignalSource(signal),
        matchedBy: 'signal-source',
        warning: 'curated from Signal sheet source column',
      };
    }

    if (!match.detail) {
      skip('missing matching source/details row');
      continue;
    }

    if (match.matchedBy === 'id' && match.warning) {
      skip(match.warning);
      continue;
    }

    const references = buildReferences(match.detail);
    if (references.length === 0) {
      skip('missing source URL');
      continue;
    }

    const description = compactDescription(
      match.detail.details || signal.details || signal.title,
    );
    if (!description) {
      skip('missing description');
      continue;
    }

    eligible.push(
      buildSignalImportItem({
        signal,
        detail: match.detail,
        match,
        status,
        references,
      }),
    );
  }

  if (curated) {
    const curatedDetails = buildCuratedDetailItems(details, status);
    eligible.push(...curatedDetails.eligible);
    skipped.push(...curatedDetails.skipped);
  }

  return { eligible, skipped, detailRowsWithoutIds };
}

function sanitizeSignalData(data, purify) {
  return {
    ...data,
    name: purify.sanitize(data.name),
    shortDetails: data.shortDetails ? purify.sanitize(data.shortDetails) : null,
    description: purify.sanitize(data.description),
    references: data.references.map((reference) => ({
      title: purify.sanitize(reference.title),
      url: reference.url,
    })),
  };
}

async function findOwner(prisma, ownerEmail) {
  const owner =
    (await prisma.user.findUnique({ where: { email: ownerEmail } })) ||
    (await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'ADMIN_SYSTEM'] } },
      orderBy: { id: 'asc' },
    }));

  if (!owner) {
    throw new Error(
      `No owner found. Create an admin user or pass --owner-email <email>.`,
    );
  }

  return owner;
}

async function filterDuplicates(prisma, eligible) {
  const existingSignals = await prisma.signal.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, referenceSource: true },
  });
  const existingNames = new Map(
    existingSignals.map((signal) => [normalizedKey(signal.name), signal]),
  );
  const existingSources = new Map(
    existingSignals
      .filter((signal) => signal.referenceSource)
      .map((signal) => [normalizedKey(signal.referenceSource), signal]),
  );

  const duplicates = [];
  const insertable = [];

  for (const item of eligible) {
    const sourceDuplicate = existingSources.get(
      normalizedKey(item.data.referenceSource),
    );
    const nameDuplicate = existingNames.get(normalizedKey(item.data.name));

    if (sourceDuplicate || nameDuplicate) {
      duplicates.push({
        item,
        existing: sourceDuplicate || nameDuplicate,
        reason: sourceDuplicate ? 'same referenceSource' : 'same title',
      });
      continue;
    }

    insertable.push(item);
  }

  return { insertable, duplicates };
}

function printSummary({ eligible, skipped, detailRowsWithoutIds, insertable, duplicates, imported }) {
  console.log('\nSignal XLSX import check');
  console.log(`Eligible rows: ${eligible.length}`);
  console.log(`Skipped rows: ${skipped.length}`);
  console.log(`Details rows without IDs: ${detailRowsWithoutIds.length}`);
  console.log(`Existing duplicates: ${duplicates.length}`);
  console.log(`Ready to insert: ${insertable.length}`);
  if (typeof imported === 'number') console.log(`Imported: ${imported}`);

  if (insertable.length) {
    console.log('\nReady IDs:');
    for (const item of insertable) {
      const warning = item.warning ? ` (${item.warning})` : '';
      console.log(
        `  ${item.originalId} Signal row ${item.sourceRow}, source row ${item.detailRow}, ${item.data.name}${warning}`,
      );
    }
  }

  if (duplicates.length) {
    console.log('\nDuplicates skipped:');
    for (const duplicate of duplicates) {
      console.log(
        `  ${duplicate.item.originalId}: ${duplicate.reason}, existing Signal #${duplicate.existing.id}`,
      );
    }
  }

  if (skipped.length) {
    console.log('\nSkipped source rows:');
    for (const { signal, reason } of skipped) {
      console.log(
        `  ${signal.originalId || '(no id)'} Signal row ${signal.rowNumber}: ${reason}`,
      );
    }
  }

  if (detailRowsWithoutIds.length) {
    console.log('\nDetail rows not imported because they do not have Signal IDs/metadata:');
    for (const detail of detailRowsWithoutIds) {
      console.log(`  Detail row ${detail.rowNumber}: ${detail.title.slice(0, 100)}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const absoluteFile = path.resolve(args.file);

  const sharedStrings = parseSharedStrings(readZipText(absoluteFile, 'xl/sharedStrings.xml'));
  const workbook = parseWorkbook(absoluteFile);
  const signalPath = workbook.get('Signal');
  const detailsPath = workbook.get('ชีต1');

  if (!signalPath || !detailsPath) {
    throw new Error('Workbook must contain "Signal" and "ชีต1" sheets.');
  }

  const signalSheet = parseSheet(absoluteFile, signalPath, sharedStrings);
  const detailsSheet = parseSheet(absoluteFile, detailsPath, sharedStrings);
  const signals = parseSignalRows(signalSheet);
  const details = parseDetailRows(detailsSheet);
  const transformed = validateAndTransform(
    signals,
    details,
    args.status,
    args.curated,
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const purify = DOMPurify(new JSDOM('').window);

  try {
    const { insertable, duplicates } = await filterDuplicates(
      prisma,
      transformed.eligible,
    );
    const summary = { ...transformed, insertable, duplicates };

    if (args.dryRun) {
      printSummary(summary);
      console.log('\nDry run only. Re-run with --import to insert ready rows.');
      return;
    }

    const owner = await findOwner(prisma, args.ownerEmail);
    const sanitized = insertable.map((item) => ({
      ...item,
      data: sanitizeSignalData(item.data, purify),
    }));

    await prisma.$transaction(async (tx) => {
      for (const item of sanitized) {
        await tx.signal.create({
          data: {
            ...item.data,
            ownerId: owner.id,
            impactScore: 0,
            totalVotes: 0,
            references: {
              create: item.data.references,
            },
            histories: {
              create: {
                action: 'CREATED',
                changes: `Imported from signal.xlsx ${item.originalId}`,
                userId: owner.id,
              },
            },
          },
        });
      }
    });

    printSummary({ ...summary, imported: sanitized.length });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
