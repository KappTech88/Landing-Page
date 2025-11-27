/**
 * Excel Service for Estimate Reliance
 * Parses Xactimate Excel exports and other estimate spreadsheets
 *
 * @module services/excelService
 */

import * as XLSX from 'xlsx';

// ============= TYPES =============

/**
 * Activity types from Xactimate
 */
export type XactimateActivity =
  | 'Remove'
  | 'Replace'
  | 'Remove and Replace'
  | 'Detach & Reset'
  | 'Detach and Reset';

/**
 * Depreciation type options
 */
export type DepreciationType = 'Percent' | 'None' | 'Flat';

/**
 * Unit types commonly found in Xactimate exports
 */
export type XactimateUnit =
  | 'SF' | 'LF' | 'EA' | 'SQ' | 'SY' | 'CF' | 'CY'
  | 'GAL' | 'BDL' | 'ROL' | 'PC' | 'HR' | 'DAY';

/**
 * Raw row data as parsed from Excel
 */
export interface ExcelRawRow {
  rowNumber?: number;
  description?: string;
  unitCost?: number;
  unit?: string;
  activity?: string;
  workersWage?: number;
  laborBorders?: number;
  laborOverhead?: number;
  material?: number;
  equipment?: number;
  marketConditions?: number;
  laborMinimum?: number;
  salesTax?: number;
  rcv?: number;
  life?: number;
  depreciationType?: string;
  depreciationAmount?: number;
  recoverable?: number;
  acv?: number;
  tax?: number;
  replace?: string;
  category?: string;
  selector?: string;
  date?: string;
  quantity?: number;
}

/**
 * Parsed and normalized line item from Excel
 */
export interface ParsedExcelLineItem {
  id: string;
  lineNumber: number;
  description: string;
  detailedDescription?: string;
  categoryCode: string;
  categoryName: string;
  itemCode: string;
  selectorCode?: string;
  activity: XactimateActivity | string;

  // Quantity & Units
  quantity: number;
  unit: XactimateUnit | string;
  unitCost: number;

  // Pricing Breakdown
  materialCost: number;
  laborCost: number;
  laborOverhead: number;
  equipmentCost: number;
  workersWage: number;
  laborMinimum: number;

  // Calculated Values
  extendedPrice: number;
  rcv: number;
  acv: number;

  // Depreciation
  depreciationType: DepreciationType | string;
  depreciationPercent: number;
  depreciationAmount: number;
  usefulLife: number;

  // Flags
  isRecoverable: boolean;
  isTaxable: boolean;

  // Metadata
  date?: string;
  rawData?: ExcelRawRow;
}

/**
 * Summary of parsed estimate
 */
export interface ParsedEstimateSummary {
  totalLineItems: number;
  totalRCV: number;
  totalACV: number;
  totalDepreciation: number;
  totalMaterial: number;
  totalLabor: number;
  totalEquipment: number;
  categorySummary: CategorySummary[];
  activityBreakdown: ActivityBreakdown[];
  parseErrors: ParseError[];
  parseWarnings: ParseWarning[];
}

export interface CategorySummary {
  code: string;
  name: string;
  itemCount: number;
  totalRCV: number;
  totalACV: number;
}

export interface ActivityBreakdown {
  activity: string;
  itemCount: number;
  totalRCV: number;
}

export interface ParseError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParseWarning {
  row: number;
  message: string;
}

/**
 * Complete result from parsing an Excel file
 */
export interface ExcelParseResult {
  success: boolean;
  lineItems: ParsedExcelLineItem[];
  summary: ParsedEstimateSummary;
  metadata: {
    fileName: string;
    sheetName: string;
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    parseDate: string;
  };
}

// ============= COLUMN MAPPING =============

/**
 * Common column header variations for Xactimate exports
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  rowNumber: ['#', 'row', 'line', 'no', 'number', 'line #', 'line no'],
  description: ['desc', 'description', 'item', 'item description', 'line item'],
  unitCost: ['unit cost', 'unit price', 'price', 'cost', 'rate'],
  unit: ['unit', 'uom', 'unit of measure', 'units'],
  activity: ['activity', 'action', 'type', 'work type'],
  workersWage: ['worker\'s wage', 'workers wage', 'wage', 'labor wage'],
  laborBorders: ['labor borders', 'labor burden', 'burden'],
  laborOverhead: ['labor overhead', 'overhead', 'o/h'],
  material: ['material', 'materials', 'mat', 'material cost'],
  equipment: ['equipment', 'equip', 'equipment cost'],
  marketConditions: ['market conditions', 'market cond', 'conditions'],
  laborMinimum: ['labor minimum', 'labor min', 'min labor'],
  salesTax: ['sales tax', 'tax rate', 'tax %'],
  rcv: ['rcv', 'replacement cost', 'replacement cost value', 'total'],
  life: ['life', 'useful life', 'lifespan', 'years'],
  depreciationType: ['depreciation type', 'dep type', 'depr type'],
  depreciationAmount: ['depreciation amount', 'dep amount', 'depr amt', 'depreciation'],
  recoverable: ['recoverable', 'recov', 'recoverable dep'],
  acv: ['acv', 'actual cash value', 'actual cash', 'net'],
  tax: ['tax', 'taxable', 'is taxable'],
  replace: ['replace', 'repl'],
  category: ['cat', 'category', 'cat code', 'category code', 'trade'],
  selector: ['sel', 'selector', 'sel code', 'selector code'],
  date: ['date', 'effective date', 'price date'],
  quantity: ['qty', 'quantity', 'amount', 'count'],
};

/**
 * Category code to name mapping
 */
const CATEGORY_NAMES: Record<string, string> = {
  'RFG': 'Roofing',
  'RFO': 'Roofing',
  'SFG': 'Soffit/Fascia/Gutters',
  'SFO': 'Soffit/Fascia',
  'SDG': 'Siding',
  'SID': 'Siding',
  'GUT': 'Gutters',
  'WDS': 'Windows/Doors/Siding',
  'WND': 'Windows',
  'DOR': 'Doors',
  'INT': 'Interior',
  'EXT': 'Exterior',
  'DRY': 'Drywall',
  'PNT': 'Painting',
  'PLM': 'Plumbing',
  'ELC': 'Electrical',
  'HVC': 'HVAC',
  'FLR': 'Flooring',
  'FNC': 'Fencing',
  'LND': 'Landscaping',
  'DMO': 'Demolition',
  'GEN': 'General',
  'CLN': 'Cleaning',
  'TMP': 'Temporary',
  'AWN': 'Awning',
  'WOR': 'Windows/Doors',
  'FRM': 'Framing',
  'MIL': 'Millwork/Trim',
  'MTL': 'Metal',
  'ELS': 'Electrical Systems',
  'SOD': 'Siding/Decking',
};

// ============= UTILITY FUNCTIONS =============

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Normalize a column header for matching
 */
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Find the mapped field name for a column header
 */
const findFieldMapping = (header: string): string | null => {
  const normalized = normalizeHeader(header);

  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    if (variations.some(v => normalizeHeader(v) === normalized || normalized.includes(normalizeHeader(v)))) {
      return field;
    }
  }

  return null;
};

/**
 * Parse a numeric value from cell
 */
const parseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  // Handle string values
  const str = String(value).replace(/[$,\s]/g, '').replace(/[()]/g, '-');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Parse a string value from cell
 */
const parseString = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

/**
 * Extract category code from various formats
 */
const extractCategoryCode = (value: string): string => {
  if (!value) return 'GEN';

  // Common patterns: "RFG", "RFG ASPH", "RFG-001", etc.
  const upper = value.toUpperCase().trim();
  const match = upper.match(/^([A-Z]{2,4})/);

  return match ? match[1] : 'GEN';
};

/**
 * Get category name from code
 */
const getCategoryName = (code: string): string => {
  return CATEGORY_NAMES[code] || 'General';
};

/**
 * Normalize activity string
 */
const normalizeActivity = (activity: string): string => {
  if (!activity) return 'Replace';

  const lower = activity.toLowerCase().trim();

  if (lower.includes('remove') && lower.includes('replace')) {
    return 'Remove and Replace';
  }
  if (lower.includes('detach') && lower.includes('reset')) {
    return 'Detach & Reset';
  }
  if (lower === 'remove') {
    return 'Remove';
  }
  if (lower === 'replace') {
    return 'Replace';
  }

  return activity;
};

/**
 * Normalize unit string
 */
const normalizeUnit = (unit: string): XactimateUnit | string => {
  if (!unit) return 'EA';

  const upper = unit.toUpperCase().trim();
  const validUnits: XactimateUnit[] = ['SF', 'LF', 'EA', 'SQ', 'SY', 'CF', 'CY', 'GAL', 'BDL', 'ROL', 'PC', 'HR', 'DAY'];

  // Direct match
  if (validUnits.includes(upper as XactimateUnit)) {
    return upper as XactimateUnit;
  }

  // Common variations
  const unitMap: Record<string, XactimateUnit> = {
    'EACH': 'EA',
    'SQUARE FOOT': 'SF',
    'SQ FT': 'SF',
    'SQFT': 'SF',
    'LINEAR FOOT': 'LF',
    'LIN FT': 'LF',
    'LINFT': 'LF',
    'SQUARE': 'SQ',
    'SQUARES': 'SQ',
    'SQUARE YARD': 'SY',
    'SQ YD': 'SY',
    'SQYD': 'SY',
    'CUBIC FOOT': 'CF',
    'CU FT': 'CF',
    'CUFT': 'CF',
    'CUBIC YARD': 'CY',
    'CU YD': 'CY',
    'CUYD': 'CY',
    'GALLON': 'GAL',
    'GALLONS': 'GAL',
    'BUNDLE': 'BDL',
    'BUNDLES': 'BDL',
    'ROLL': 'ROL',
    'ROLLS': 'ROL',
    'PIECE': 'PC',
    'PIECES': 'PC',
    'HOUR': 'HR',
    'HOURS': 'HR',
  };

  return unitMap[upper] || upper;
};

// ============= MAIN PARSING FUNCTIONS =============

/**
 * Parse headers from the first row and create column index mapping
 */
const parseHeaders = (worksheet: XLSX.WorkSheet): Map<string, number> => {
  const columnMap = new Map<string, number>();
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1');

  // Look at first few rows to find headers (sometimes data starts on row 2 or 3)
  for (let row = range.s.r; row <= Math.min(range.s.r + 5, range.e.r); row++) {
    let hasHeaders = false;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellRef];

      if (cell && cell.v) {
        const headerValue = parseString(cell.v);
        const fieldName = findFieldMapping(headerValue);

        if (fieldName && !columnMap.has(fieldName)) {
          columnMap.set(fieldName, col);
          hasHeaders = true;
        }
      }
    }

    // If we found multiple headers, this is our header row
    if (columnMap.size >= 3) {
      // Store header row for later
      columnMap.set('_headerRow', row);
      break;
    }
  }

  return columnMap;
};

/**
 * Parse a single row into a raw row object
 */
const parseRow = (
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnMap: Map<string, number>
): ExcelRawRow | null => {
  const row: ExcelRawRow = {};
  let hasData = false;

  // Parse each mapped field
  for (const [field, colIndex] of columnMap.entries()) {
    if (field.startsWith('_')) continue; // Skip metadata entries

    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    const cell = worksheet[cellRef];
    const value = cell ? cell.v : undefined;

    // Skip if no value
    if (value === undefined || value === null || value === '') continue;

    hasData = true;

    // Parse based on field type
    switch (field) {
      case 'rowNumber':
        row.rowNumber = parseNumber(value);
        break;
      case 'description':
        row.description = parseString(value);
        break;
      case 'unitCost':
        row.unitCost = parseNumber(value);
        break;
      case 'unit':
        row.unit = parseString(value);
        break;
      case 'activity':
        row.activity = parseString(value);
        break;
      case 'workersWage':
        row.workersWage = parseNumber(value);
        break;
      case 'laborBorders':
        row.laborBorders = parseNumber(value);
        break;
      case 'laborOverhead':
        row.laborOverhead = parseNumber(value);
        break;
      case 'material':
        row.material = parseNumber(value);
        break;
      case 'equipment':
        row.equipment = parseNumber(value);
        break;
      case 'marketConditions':
        row.marketConditions = parseNumber(value);
        break;
      case 'laborMinimum':
        row.laborMinimum = parseNumber(value);
        break;
      case 'salesTax':
        row.salesTax = parseNumber(value);
        break;
      case 'rcv':
        row.rcv = parseNumber(value);
        break;
      case 'life':
        row.life = parseNumber(value);
        break;
      case 'depreciationType':
        row.depreciationType = parseString(value);
        break;
      case 'depreciationAmount':
        row.depreciationAmount = parseNumber(value);
        break;
      case 'recoverable':
        row.recoverable = parseNumber(value);
        break;
      case 'acv':
        row.acv = parseNumber(value);
        break;
      case 'tax':
        row.tax = parseNumber(value);
        break;
      case 'replace':
        row.replace = parseString(value);
        break;
      case 'category':
        row.category = parseString(value);
        break;
      case 'selector':
        row.selector = parseString(value);
        break;
      case 'date':
        row.date = parseString(value);
        break;
      case 'quantity':
        row.quantity = parseNumber(value);
        break;
    }
  }

  return hasData ? row : null;
};

/**
 * Convert raw row to parsed line item
 */
const convertToLineItem = (
  raw: ExcelRawRow,
  index: number
): ParsedExcelLineItem => {
  const categoryCode = extractCategoryCode(raw.category || '');
  const categoryName = getCategoryName(categoryCode);

  // Calculate values
  const quantity = raw.quantity || 1;
  const unitCost = raw.unitCost || 0;
  const materialCost = raw.material || 0;
  const laborCost = (raw.workersWage || 0) + (raw.laborBorders || 0);
  const laborOverhead = raw.laborOverhead || 0;
  const equipmentCost = raw.equipment || 0;

  // Calculate extended price if not provided
  let extendedPrice = materialCost + laborCost + laborOverhead + equipmentCost;
  if (extendedPrice === 0 && unitCost > 0) {
    extendedPrice = quantity * unitCost;
  }

  // RCV and ACV
  const rcv = raw.rcv || extendedPrice;
  const depreciationAmount = raw.depreciationAmount || 0;
  const acv = raw.acv || (rcv - depreciationAmount);

  // Calculate depreciation percent
  let depreciationPercent = 0;
  if (rcv > 0 && depreciationAmount > 0) {
    depreciationPercent = (depreciationAmount / rcv) * 100;
  }

  // Generate item code from category and selector
  const itemCode = raw.selector
    ? `${categoryCode} ${raw.selector}`.trim()
    : `${categoryCode}-${String(index + 1).padStart(3, '0')}`;

  return {
    id: generateId(),
    lineNumber: raw.rowNumber || index + 1,
    description: raw.description || '',
    categoryCode,
    categoryName,
    itemCode,
    selectorCode: raw.selector,
    activity: normalizeActivity(raw.activity || 'Replace'),

    quantity,
    unit: normalizeUnit(raw.unit || 'EA'),
    unitCost,

    materialCost,
    laborCost,
    laborOverhead,
    equipmentCost,
    workersWage: raw.workersWage || 0,
    laborMinimum: raw.laborMinimum || 0,

    extendedPrice,
    rcv,
    acv,

    depreciationType: raw.depreciationType || 'Percent',
    depreciationPercent,
    depreciationAmount,
    usefulLife: raw.life || 0,

    isRecoverable: (raw.recoverable || 0) > 0,
    isTaxable: (raw.tax || 0) > 0 || String(raw.tax).toLowerCase() === 'yes',

    date: raw.date,
    rawData: raw,
  };
};

/**
 * Generate summary from parsed line items
 */
const generateSummary = (
  lineItems: ParsedExcelLineItem[],
  errors: ParseError[],
  warnings: ParseWarning[]
): ParsedEstimateSummary => {
  // Calculate totals
  const totalRCV = lineItems.reduce((sum, item) => sum + item.rcv, 0);
  const totalACV = lineItems.reduce((sum, item) => sum + item.acv, 0);
  const totalDepreciation = lineItems.reduce((sum, item) => sum + item.depreciationAmount, 0);
  const totalMaterial = lineItems.reduce((sum, item) => sum + item.materialCost, 0);
  const totalLabor = lineItems.reduce((sum, item) => sum + item.laborCost + item.laborOverhead, 0);
  const totalEquipment = lineItems.reduce((sum, item) => sum + item.equipmentCost, 0);

  // Category summary
  const categoryMap = new Map<string, CategorySummary>();
  for (const item of lineItems) {
    const existing = categoryMap.get(item.categoryCode);
    if (existing) {
      existing.itemCount++;
      existing.totalRCV += item.rcv;
      existing.totalACV += item.acv;
    } else {
      categoryMap.set(item.categoryCode, {
        code: item.categoryCode,
        name: item.categoryName,
        itemCount: 1,
        totalRCV: item.rcv,
        totalACV: item.acv,
      });
    }
  }

  // Activity breakdown
  const activityMap = new Map<string, ActivityBreakdown>();
  for (const item of lineItems) {
    const existing = activityMap.get(item.activity);
    if (existing) {
      existing.itemCount++;
      existing.totalRCV += item.rcv;
    } else {
      activityMap.set(item.activity, {
        activity: item.activity,
        itemCount: 1,
        totalRCV: item.rcv,
      });
    }
  }

  return {
    totalLineItems: lineItems.length,
    totalRCV,
    totalACV,
    totalDepreciation,
    totalMaterial,
    totalLabor,
    totalEquipment,
    categorySummary: Array.from(categoryMap.values()).sort((a, b) => b.totalRCV - a.totalRCV),
    activityBreakdown: Array.from(activityMap.values()).sort((a, b) => b.totalRCV - a.totalRCV),
    parseErrors: errors,
    parseWarnings: warnings,
  };
};

// ============= MAIN EXPORT FUNCTIONS =============

/**
 * Parse an Excel file buffer/array
 */
export const parseExcelFile = async (
  fileData: ArrayBuffer | Uint8Array,
  fileName: string = 'estimate.xlsx'
): Promise<ExcelParseResult> => {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  try {
    // Read workbook
    const workbook = XLSX.read(fileData, { type: 'array' });

    // Get first sheet (or sheet named "Estimate", "Line Items", etc.)
    let sheetName = workbook.SheetNames[0];
    for (const name of workbook.SheetNames) {
      const lower = name.toLowerCase();
      if (lower.includes('estimate') || lower.includes('line') || lower.includes('detail')) {
        sheetName = name;
        break;
      }
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return {
        success: false,
        lineItems: [],
        summary: generateSummary([], [{ row: 0, message: 'No worksheet found', severity: 'error' }], []),
        metadata: {
          fileName,
          sheetName: '',
          totalRows: 0,
          parsedRows: 0,
          skippedRows: 0,
          parseDate: new Date().toISOString(),
        },
      };
    }

    // Parse headers
    const columnMap = parseHeaders(worksheet);
    const headerRow = columnMap.get('_headerRow') || 0;

    if (columnMap.size < 3) {
      warnings.push({ row: 0, message: 'Few column mappings found - data may be incomplete' });
    }

    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1');
    const totalRows = range.e.r - headerRow;

    // Parse rows
    const lineItems: ParsedExcelLineItem[] = [];
    let skippedRows = 0;

    for (let rowIndex = headerRow + 1; rowIndex <= range.e.r; rowIndex++) {
      try {
        const rawRow = parseRow(worksheet, rowIndex, columnMap);

        if (!rawRow || !rawRow.description) {
          skippedRows++;
          continue;
        }

        const lineItem = convertToLineItem(rawRow, lineItems.length);
        lineItems.push(lineItem);

      } catch (error) {
        errors.push({
          row: rowIndex + 1,
          message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        });
        skippedRows++;
      }
    }

    // Generate summary
    const summary = generateSummary(lineItems, errors, warnings);

    return {
      success: errors.filter(e => e.severity === 'error').length === 0,
      lineItems,
      summary,
      metadata: {
        fileName,
        sheetName,
        totalRows,
        parsedRows: lineItems.length,
        skippedRows,
        parseDate: new Date().toISOString(),
      },
    };

  } catch (error) {
    return {
      success: false,
      lineItems: [],
      summary: generateSummary([], [{
        row: 0,
        message: `Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      }], []),
      metadata: {
        fileName,
        sheetName: '',
        totalRows: 0,
        parsedRows: 0,
        skippedRows: 0,
        parseDate: new Date().toISOString(),
      },
    };
  }
};

/**
 * Parse Excel file from File object (browser)
 */
export const parseExcelFromFile = async (file: File): Promise<ExcelParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const result = await parseExcelFile(data, file.name);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Convert parsed Excel items to EstimateBuilder LineItem format
 */
export const convertToEstimateBuilderFormat = (
  parsedItems: ParsedExcelLineItem[]
): Array<{
  id: string;
  lineNumber: number;
  categoryId: string;
  categoryName: string;
  itemCode: string;
  description: string;
  detailedDescription?: string;
  itemType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  materialCost: number;
  laborCost: number;
  laborHours?: number;
  laborRate?: number;
  rcv: number;
  depreciationPercent: number;
  depreciationAmount: number;
  acv: number;
  isTaxable: boolean;
  isOptional: boolean;
  isIncluded: boolean;
  isContested: boolean;
  contestNotes?: string;
  notes?: string;
}> => {
  return parsedItems.map((item, index) => ({
    id: item.id,
    lineNumber: index + 1,
    categoryId: item.categoryCode.toLowerCase(),
    categoryName: item.categoryName,
    itemCode: item.itemCode,
    description: item.description,
    detailedDescription: item.selectorCode ? `${item.activity} - ${item.selectorCode}` : undefined,
    itemType: 'material_labor',
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitCost || (item.extendedPrice / (item.quantity || 1)),
    materialCost: item.materialCost,
    laborCost: item.laborCost + item.laborOverhead,
    laborHours: item.laborMinimum > 0 ? item.laborMinimum : undefined,
    rcv: item.rcv,
    depreciationPercent: item.depreciationPercent,
    depreciationAmount: item.depreciationAmount,
    acv: item.acv,
    isTaxable: item.isTaxable,
    isOptional: false,
    isIncluded: true,
    isContested: false,
    notes: item.activity !== 'Replace' ? `Activity: ${item.activity}` : undefined,
  }));
};

/**
 * Get unique categories from parsed items
 */
export const getUniqueCategories = (
  parsedItems: ParsedExcelLineItem[]
): Array<{
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  isExpanded: boolean;
  sortOrder: number;
}> => {
  const categoryColors: Record<string, string> = {
    'RFG': '#3B82F6',
    'RFO': '#3B82F6',
    'SDG': '#8B5CF6',
    'SID': '#8B5CF6',
    'GUT': '#06B6D4',
    'SFG': '#06B6D4',
    'SFO': '#06B6D4',
    'WDS': '#10B981',
    'WND': '#10B981',
    'DOR': '#14B8A6',
    'DRY': '#F59E0B',
    'PNT': '#EC4899',
    'PLM': '#10B981',
    'ELC': '#EF4444',
    'HVC': '#6366F1',
    'FLR': '#D97706',
    'DMO': '#78716C',
    'GEN': '#6B7280',
    'INT': '#A855F7',
    'EXT': '#22C55E',
  };

  const categoryIcons: Record<string, string> = {
    'RFG': 'home',
    'RFO': 'home',
    'SDG': 'layers',
    'SID': 'layers',
    'GUT': 'droplets',
    'SFG': 'droplets',
    'PNT': 'paintbrush',
    'PLM': 'wrench',
    'ELC': 'zap',
    'HVC': 'wind',
    'DMO': 'trash',
  };

  const seen = new Set<string>();
  const categories: Array<{
    id: string;
    code: string;
    name: string;
    icon: string;
    color: string;
    isExpanded: boolean;
    sortOrder: number;
  }> = [];

  let sortOrder = 1;

  for (const item of parsedItems) {
    if (!seen.has(item.categoryCode)) {
      seen.add(item.categoryCode);
      categories.push({
        id: item.categoryCode.toLowerCase(),
        code: item.categoryCode,
        name: item.categoryName,
        icon: categoryIcons[item.categoryCode] || 'package',
        color: categoryColors[item.categoryCode] || '#6B7280',
        isExpanded: sortOrder === 1,
        sortOrder: sortOrder++,
      });
    }
  }

  return categories;
};

/**
 * Export utility for creating a sample template
 */
export const createTemplateWorkbook = (): XLSX.WorkBook => {
  const headers = [
    '#', 'Desc', 'Unit Cost', 'Unit', 'Activity',
    'Worker\'s Wage', 'Labor Overhead', 'Material', 'Equipment',
    'Labor Minimum', 'Sales Tax', 'RCV', 'Life',
    'Depreciation Type', 'Depreciation Amount', 'Recoverable', 'ACV',
    'Tax', 'Cat', 'Sel', 'Date'
  ];

  const sampleData = [
    [1, 'Asphalt shingles - Architectural grade', 425.00, 'SQ', 'Remove and Replace',
     85.00, 12.50, 280.00, 5.00, 0, 0, 425.00, 20,
     'Percent', 106.25, 106.25, 318.75, 'Yes', 'RFG', 'ASPH', '11/17/2025'],
    [2, 'Roofing felt - 15#', 45.00, 'SQ', 'Replace',
     15.00, 2.25, 25.00, 0, 0, 0, 45.00, 15,
     'Percent', 9.00, 9.00, 36.00, 'Yes', 'RFG', 'FELT', '11/17/2025'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estimate');

  return wb;
};

/**
 * Download template as file
 */
export const downloadTemplate = (fileName: string = 'estimate_template.xlsx'): void => {
  const wb = createTemplateWorkbook();
  XLSX.writeFile(wb, fileName);
};

export default {
  parseExcelFile,
  parseExcelFromFile,
  convertToEstimateBuilderFormat,
  getUniqueCategories,
  createTemplateWorkbook,
  downloadTemplate,
};
