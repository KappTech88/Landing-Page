import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Save, Eye, EyeOff,
  FileText, Calculator, DollarSign, Percent, Copy, Download,
  Search, Filter, MoreVertical, GripVertical, AlertCircle,
  Building2, Home, Layers, Paintbrush, Wrench, Zap, Droplets,
  Wind, Settings2, Package, Clock, CheckCircle2, XCircle,
  ChevronUp, Printer, Send, ArrowLeft, Upload
} from 'lucide-react';
import EstimateImport from './EstimateImport';

// ============= TYPES =============

export type ItemType = 'material' | 'labor' | 'material_labor' | 'equipment' | 'subcontractor' | 'permit' | 'disposal' | 'other';
export type UnitType = 'EA' | 'SF' | 'LF' | 'SQ' | 'HR' | 'SY' | 'CF' | 'CY' | 'GAL' | 'BDL' | 'ROL' | 'PC' | 'DAY';

export interface LineItem {
  id: string;
  lineNumber: number;
  categoryId: string;
  categoryName: string;
  itemCode: string;
  description: string;
  detailedDescription?: string;
  itemType: ItemType;
  quantity: number;
  unit: UnitType;
  unitPrice: number;
  materialCost: number;
  laborCost: number;
  laborHours?: number;
  laborRate?: number;
  // Insurance fields
  rcv: number;
  depreciationPercent: number;
  depreciationAmount: number;
  acv: number;
  // Flags
  isTaxable: boolean;
  isOptional: boolean;
  isIncluded: boolean;
  isContested: boolean;
  contestNotes?: string;
  notes?: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  isExpanded: boolean;
  sortOrder: number;
}

export interface EstimateData {
  id: string;
  estimateNumber: string;
  estimateName: string;
  estimateType: 'initial' | 'revision' | 'supplement' | 'change_order' | 'final';
  status: 'draft' | 'pending_review' | 'sent' | 'accepted' | 'rejected';
  // Customer Info
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  propertyAddress: string;
  // Job Info
  jobNumber: string;
  jobType: string;
  claimNumber?: string;
  dateOfLoss?: string;
  // Insurance
  isInsuranceJob: boolean;
  insuranceCompany?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  // Pricing settings
  overheadPercent: number;
  profitPercent: number;
  taxRate: number;
  // Categories and line items
  categories: Category[];
  lineItems: LineItem[];
  // Notes
  scopeOfWork: string;
  exclusions: string;
  internalNotes: string;
}

// ============= DEFAULT DATA =============

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'rfg', code: 'RFG', name: 'Roofing', icon: 'home', color: '#3B82F6', isExpanded: true, sortOrder: 1 },
  { id: 'sdg', code: 'SDG', name: 'Siding', icon: 'layers', color: '#8B5CF6', isExpanded: false, sortOrder: 2 },
  { id: 'gut', code: 'GUT', name: 'Gutters', icon: 'droplets', color: '#06B6D4', isExpanded: false, sortOrder: 3 },
  { id: 'dry', code: 'DRY', name: 'Drywall', icon: 'square', color: '#F59E0B', isExpanded: false, sortOrder: 4 },
  { id: 'pnt', code: 'PNT', name: 'Painting', icon: 'paintbrush', color: '#EC4899', isExpanded: false, sortOrder: 5 },
  { id: 'plm', code: 'PLM', name: 'Plumbing', icon: 'wrench', color: '#10B981', isExpanded: false, sortOrder: 6 },
  { id: 'elc', code: 'ELC', name: 'Electrical', icon: 'zap', color: '#EF4444', isExpanded: false, sortOrder: 7 },
  { id: 'gen', code: 'GEN', name: 'General', icon: 'package', color: '#6B7280', isExpanded: false, sortOrder: 8 },
];

const COMMON_LINE_ITEMS: Partial<LineItem>[] = [
  // Roofing
  { itemCode: 'RFG ASPH', description: 'Asphalt shingles - Architectural grade', categoryId: 'rfg', unit: 'SQ', unitPrice: 425.00, itemType: 'material_labor' },
  { itemCode: 'RFG FELT', description: 'Roofing felt - 15# or 30#', categoryId: 'rfg', unit: 'SQ', unitPrice: 45.00, itemType: 'material_labor' },
  { itemCode: 'RFG ICE', description: 'Ice & water shield', categoryId: 'rfg', unit: 'SQ', unitPrice: 95.00, itemType: 'material_labor' },
  { itemCode: 'RFG DRIP', description: 'Drip edge - aluminum', categoryId: 'rfg', unit: 'LF', unitPrice: 4.50, itemType: 'material_labor' },
  { itemCode: 'RFG RIDGE', description: 'Ridge cap shingles', categoryId: 'rfg', unit: 'LF', unitPrice: 12.00, itemType: 'material_labor' },
  { itemCode: 'RFG VENT', description: 'Ridge vent - continuous', categoryId: 'rfg', unit: 'LF', unitPrice: 18.00, itemType: 'material_labor' },
  { itemCode: 'RFG PIPE', description: 'Pipe boot/jack', categoryId: 'rfg', unit: 'EA', unitPrice: 65.00, itemType: 'material_labor' },
  { itemCode: 'RFG TEAR', description: 'Tear off - shingles (per layer)', categoryId: 'rfg', unit: 'SQ', unitPrice: 85.00, itemType: 'labor' },
  { itemCode: 'RFG DECK', description: 'Decking replacement - OSB/Plywood', categoryId: 'rfg', unit: 'SF', unitPrice: 4.25, itemType: 'material_labor' },
  { itemCode: 'RFG FLASH', description: 'Step flashing - aluminum', categoryId: 'rfg', unit: 'LF', unitPrice: 8.50, itemType: 'material_labor' },
  // Gutters
  { itemCode: 'GUT 5IN', description: '5" K-style aluminum gutter', categoryId: 'gut', unit: 'LF', unitPrice: 12.00, itemType: 'material_labor' },
  { itemCode: 'GUT 6IN', description: '6" K-style aluminum gutter', categoryId: 'gut', unit: 'LF', unitPrice: 15.00, itemType: 'material_labor' },
  { itemCode: 'GUT DOWN', description: 'Downspout - 2x3 or 3x4', categoryId: 'gut', unit: 'LF', unitPrice: 9.00, itemType: 'material_labor' },
  // Siding
  { itemCode: 'SDG VNL', description: 'Vinyl siding - standard', categoryId: 'sdg', unit: 'SF', unitPrice: 8.50, itemType: 'material_labor' },
  { itemCode: 'SDG HARDI', description: 'HardiePlank fiber cement siding', categoryId: 'sdg', unit: 'SF', unitPrice: 14.00, itemType: 'material_labor' },
  { itemCode: 'SDG WRAP', description: 'House wrap - Tyvek or equivalent', categoryId: 'sdg', unit: 'SF', unitPrice: 0.85, itemType: 'material_labor' },
  // General
  { itemCode: 'GEN DUMP', description: 'Dumpster rental & disposal', categoryId: 'gen', unit: 'EA', unitPrice: 550.00, itemType: 'equipment' },
  { itemCode: 'GEN PERM', description: 'Building permit', categoryId: 'gen', unit: 'EA', unitPrice: 350.00, itemType: 'permit' },
  { itemCode: 'GEN HAUL', description: 'Debris removal/haul away', categoryId: 'gen', unit: 'EA', unitPrice: 250.00, itemType: 'disposal' },
];

const UNIT_OPTIONS: { value: UnitType; label: string; description: string }[] = [
  { value: 'EA', label: 'EA', description: 'Each' },
  { value: 'SF', label: 'SF', description: 'Square Foot' },
  { value: 'LF', label: 'LF', description: 'Linear Foot' },
  { value: 'SQ', label: 'SQ', description: 'Square (100 SF)' },
  { value: 'SY', label: 'SY', description: 'Square Yard' },
  { value: 'HR', label: 'HR', description: 'Hour' },
  { value: 'DAY', label: 'DAY', description: 'Day' },
  { value: 'CF', label: 'CF', description: 'Cubic Foot' },
  { value: 'CY', label: 'CY', description: 'Cubic Yard' },
  { value: 'GAL', label: 'GAL', description: 'Gallon' },
  { value: 'BDL', label: 'BDL', description: 'Bundle' },
  { value: 'ROL', label: 'ROL', description: 'Roll' },
  { value: 'PC', label: 'PC', description: 'Piece' },
];

// ============= HELPER FUNCTIONS =============

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatNumber = (num: number, decimals = 2) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);

const getCategoryIcon = (iconName: string) => {
  const iconProps = { className: "w-4 h-4" };
  switch (iconName) {
    case 'home': return <Home {...iconProps} />;
    case 'layers': return <Layers {...iconProps} />;
    case 'droplets': return <Droplets {...iconProps} />;
    case 'paintbrush': return <Paintbrush {...iconProps} />;
    case 'wrench': return <Wrench {...iconProps} />;
    case 'zap': return <Zap {...iconProps} />;
    case 'wind': return <Wind {...iconProps} />;
    default: return <Package {...iconProps} />;
  }
};

// ============= SUB-COMPONENTS =============

interface LineItemRowProps {
  item: LineItem;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isInsuranceJob: boolean;
  showDetailedView: boolean;
}

const LineItemRow: React.FC<LineItemRowProps> = ({
  item,
  onUpdate,
  onDelete,
  onDuplicate,
  isInsuranceJob,
  showDetailedView
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const extendedPrice = item.quantity * item.unitPrice;

  const handleDepreciationChange = (percent: number) => {
    const depAmount = (extendedPrice * percent) / 100;
    onUpdate(item.id, {
      depreciationPercent: percent,
      depreciationAmount: depAmount,
      rcv: extendedPrice,
      acv: extendedPrice - depAmount
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`group relative grid gap-2 p-3 rounded-lg border transition-all duration-200
        ${item.isIncluded
          ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50'
          : 'bg-slate-900/40 border-slate-800/50 opacity-60'}
        ${item.isContested ? 'border-l-4 border-l-amber-500' : ''}
        ${item.isOptional ? 'border-l-4 border-l-blue-500' : ''}
      `}
      style={{
        gridTemplateColumns: isInsuranceJob
          ? showDetailedView
            ? '60px 80px 1fr 70px 60px 90px 100px 60px 100px 100px 40px'
            : '60px 80px 1fr 70px 60px 90px 100px 40px'
          : '60px 80px 1fr 80px 70px 100px 110px 40px'
      }}
    >
      {/* Line Number */}
      <div className="flex items-center gap-1 text-slate-500">
        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-grab" />
        <span className="text-xs font-mono">{item.lineNumber}</span>
      </div>

      {/* Item Code */}
      <input
        type="text"
        value={item.itemCode}
        onChange={(e) => onUpdate(item.id, { itemCode: e.target.value.toUpperCase() })}
        className="px-2 py-1 text-xs font-mono bg-slate-900/50 border border-slate-700/50 rounded text-cyan-300 focus:border-cyan-500/50 focus:outline-none uppercase"
        placeholder="CODE"
      />

      {/* Description */}
      <input
        type="text"
        value={item.description}
        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
        className="px-2 py-1 text-sm bg-slate-900/50 border border-slate-700/50 rounded text-white focus:border-cyan-500/50 focus:outline-none"
        placeholder="Description"
      />

      {/* Quantity */}
      <input
        type="number"
        value={item.quantity}
        onChange={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) || 0 })}
        className="px-2 py-1 text-sm text-right bg-slate-900/50 border border-slate-700/50 rounded text-white focus:border-cyan-500/50 focus:outline-none"
        step="0.01"
        min="0"
      />

      {/* Unit */}
      <select
        value={item.unit}
        onChange={(e) => onUpdate(item.id, { unit: e.target.value as UnitType })}
        className="px-1 py-1 text-xs bg-slate-900/50 border border-slate-700/50 rounded text-slate-300 focus:border-cyan-500/50 focus:outline-none"
      >
        {UNIT_OPTIONS.map(u => (
          <option key={u.value} value={u.value}>{u.label}</option>
        ))}
      </select>

      {/* Unit Price */}
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
        <input
          type="number"
          value={item.unitPrice}
          onChange={(e) => onUpdate(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
          className="w-full px-2 py-1 pl-5 text-sm text-right bg-slate-900/50 border border-slate-700/50 rounded text-white focus:border-cyan-500/50 focus:outline-none"
          step="0.01"
          min="0"
        />
      </div>

      {/* Extended Price / RCV */}
      <div className="px-2 py-1 text-sm text-right font-medium text-emerald-400 bg-slate-900/30 rounded">
        {formatCurrency(extendedPrice)}
      </div>

      {/* Insurance Fields */}
      {isInsuranceJob && showDetailedView && (
        <>
          {/* Depreciation % */}
          <div className="relative">
            <input
              type="number"
              value={item.depreciationPercent}
              onChange={(e) => handleDepreciationChange(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 pr-5 text-sm text-right bg-slate-900/50 border border-slate-700/50 rounded text-amber-300 focus:border-amber-500/50 focus:outline-none"
              step="0.1"
              min="0"
              max="100"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
          </div>

          {/* Depreciation Amount */}
          <div className="px-2 py-1 text-sm text-right text-amber-400/80 bg-slate-900/30 rounded">
            -{formatCurrency(item.depreciationAmount)}
          </div>

          {/* ACV */}
          <div className="px-2 py-1 text-sm text-right font-medium text-cyan-400 bg-slate-900/30 rounded">
            {formatCurrency(item.acv)}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[140px]">
            <button
              onClick={() => { onDuplicate(item.id); setShowMenu(false); }}
              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2"
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            <button
              onClick={() => onUpdate(item.id, { isOptional: !item.isOptional })}
              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-3 h-3" /> {item.isOptional ? 'Make Required' : 'Make Optional'}
            </button>
            <button
              onClick={() => onUpdate(item.id, { isIncluded: !item.isIncluded })}
              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2"
            >
              {item.isIncluded ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {item.isIncluded ? 'Exclude' : 'Include'}
            </button>
            {isInsuranceJob && (
              <button
                onClick={() => onUpdate(item.id, { isContested: !item.isContested })}
                className="w-full px-3 py-2 text-left text-sm text-amber-300 hover:bg-slate-700/50 flex items-center gap-2"
              >
                <AlertCircle className="w-3 h-3" /> {item.isContested ? 'Unmark Contested' : 'Mark Contested'}
              </button>
            )}
            <hr className="my-1 border-slate-700" />
            <button
              onClick={() => { onDelete(item.id); setShowMenu(false); }}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface CategorySectionProps {
  category: Category;
  items: LineItem[];
  onToggle: () => void;
  onAddItem: (categoryId: string) => void;
  onUpdateItem: (id: string, updates: Partial<LineItem>) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  isInsuranceJob: boolean;
  showDetailedView: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  items,
  onToggle,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  isInsuranceJob,
  showDetailedView
}) => {
  const categoryTotal = items
    .filter(i => i.isIncluded)
    .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const categoryACV = items
    .filter(i => i.isIncluded)
    .reduce((sum, item) => sum + item.acv, 0);

  return (
    <div className="mb-4">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            {getCategoryIcon(category.icon)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">{category.code}</span>
              <span className="text-sm font-medium text-white">{category.name}</span>
              <span className="text-xs text-slate-500">({items.length} items)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-emerald-400">{formatCurrency(categoryTotal)}</div>
            {isInsuranceJob && showDetailedView && (
              <div className="text-xs text-cyan-400">ACV: {formatCurrency(categoryACV)}</div>
            )}
          </div>
          {category.isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Category Items */}
      <AnimatePresence>
        {category.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 pl-4 border-l-2 ml-4" style={{ borderColor: `${category.color}40` }}>
              {/* Column Headers */}
              <div
                className="grid gap-2 px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider"
                style={{
                  gridTemplateColumns: isInsuranceJob
                    ? showDetailedView
                      ? '60px 80px 1fr 70px 60px 90px 100px 60px 100px 100px 40px'
                      : '60px 80px 1fr 70px 60px 90px 100px 40px'
                    : '60px 80px 1fr 80px 70px 100px 110px 40px'
                }}
              >
                <span>#</span>
                <span>Code</span>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span>Unit</span>
                <span className="text-right">Price</span>
                <span className="text-right">{isInsuranceJob ? 'RCV' : 'Total'}</span>
                {isInsuranceJob && showDetailedView && (
                  <>
                    <span className="text-right">Dep %</span>
                    <span className="text-right">Dep $</span>
                    <span className="text-right">ACV</span>
                  </>
                )}
                <span></span>
              </div>

              {/* Line Items */}
              <AnimatePresence>
                {items.map(item => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    onUpdate={onUpdateItem}
                    onDelete={onDeleteItem}
                    onDuplicate={onDuplicateItem}
                    isInsuranceJob={isInsuranceJob}
                    showDetailedView={showDetailedView}
                  />
                ))}
              </AnimatePresence>

              {/* Add Item Button */}
              <button
                onClick={() => onAddItem(category.id)}
                className="w-full py-2 mt-2 rounded-lg border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Line Item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============= QUICK ADD PANEL =============

interface QuickAddPanelProps {
  onAddItem: (item: Partial<LineItem>) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const QuickAddPanel: React.FC<QuickAddPanelProps> = ({ onAddItem, searchTerm, onSearchChange }) => {
  const filteredItems = COMMON_LINE_ITEMS.filter(item =>
    item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <Package className="w-4 h-4 text-cyan-400" />
        Quick Add Items
      </h3>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search items..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
        />
      </div>

      {/* Items List */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filteredItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onAddItem(item)}
            className="w-full p-2 text-left rounded-lg hover:bg-slate-700/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-cyan-400">{item.itemCode}</span>
                <p className="text-sm text-slate-300 group-hover:text-white truncate">{item.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">{item.unit}</span>
                <p className="text-sm text-emerald-400">{formatCurrency(item.unitPrice || 0)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============= SUMMARY PANEL =============

interface SummaryPanelProps {
  lineItems: LineItem[];
  overheadPercent: number;
  profitPercent: number;
  taxRate: number;
  isInsuranceJob: boolean;
  onUpdateSettings: (updates: { overheadPercent?: number; profitPercent?: number; taxRate?: number }) => void;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  lineItems,
  overheadPercent,
  profitPercent,
  taxRate,
  isInsuranceJob,
  onUpdateSettings
}) => {
  const includedItems = lineItems.filter(i => i.isIncluded);

  const subtotalMaterials = includedItems.reduce((sum, i) => sum + i.materialCost, 0);
  const subtotalLabor = includedItems.reduce((sum, i) => sum + i.laborCost, 0);
  const subtotal = includedItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

  const overheadAmount = (subtotal * overheadPercent) / 100;
  const profitAmount = (subtotal * profitPercent) / 100;
  const subtotalWithOP = subtotal + overheadAmount + profitAmount;
  const taxAmount = (subtotalWithOP * taxRate) / 100;
  const totalRCV = subtotalWithOP + taxAmount;

  const totalDepreciation = includedItems.reduce((sum, i) => sum + i.depreciationAmount, 0);
  const totalACV = totalRCV - totalDepreciation;

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 sticky top-4">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-emerald-400" />
        Estimate Summary
      </h3>

      <div className="space-y-3">
        {/* Subtotals */}
        <div className="space-y-2 pb-3 border-b border-slate-700/50">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Items ({includedItems.length})</span>
            <span className="text-white">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        {/* O&P */}
        <div className="space-y-2 pb-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Overhead</span>
              <div className="relative w-16">
                <input
                  type="number"
                  value={overheadPercent}
                  onChange={(e) => onUpdateSettings({ overheadPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-0.5 pr-5 text-xs text-right bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none"
                  step="0.1"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
              </div>
            </div>
            <span className="text-sm text-white">{formatCurrency(overheadAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Profit</span>
              <div className="relative w-16">
                <input
                  type="number"
                  value={profitPercent}
                  onChange={(e) => onUpdateSettings({ profitPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-0.5 pr-5 text-xs text-right bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none"
                  step="0.1"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
              </div>
            </div>
            <span className="text-sm text-white">{formatCurrency(profitAmount)}</span>
          </div>
        </div>

        {/* Tax */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Tax</span>
            <div className="relative w-16">
              <input
                type="number"
                value={taxRate}
                onChange={(e) => onUpdateSettings({ taxRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-0.5 pr-5 text-xs text-right bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none"
                step="0.01"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
            </div>
          </div>
          <span className="text-sm text-white">{formatCurrency(taxAmount)}</span>
        </div>

        {/* Total RCV */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-base font-medium text-white">{isInsuranceJob ? 'Total RCV' : 'Total'}</span>
          <span className="text-xl font-bold text-emerald-400">{formatCurrency(totalRCV)}</span>
        </div>

        {/* Insurance Totals */}
        {isInsuranceJob && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-amber-400">Total Depreciation</span>
              <span className="text-amber-400">-{formatCurrency(totalDepreciation)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base font-medium text-cyan-400">Total ACV</span>
              <span className="text-xl font-bold text-cyan-400">{formatCurrency(totalACV)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= PREVIEW MODE =============

interface EstimatePreviewProps {
  estimate: EstimateData;
  onClose: () => void;
}

const EstimatePreview: React.FC<EstimatePreviewProps> = ({ estimate, onClose }) => {
  const includedItems = estimate.lineItems.filter(i => i.isIncluded);
  const itemsByCategory = estimate.categories.map(cat => ({
    ...cat,
    items: includedItems.filter(i => i.categoryId === cat.id)
  })).filter(cat => cat.items.length > 0);

  const subtotal = includedItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const overheadAmount = (subtotal * estimate.overheadPercent) / 100;
  const profitAmount = (subtotal * estimate.profitPercent) / 100;
  const subtotalWithOP = subtotal + overheadAmount + profitAmount;
  const taxAmount = (subtotalWithOP * estimate.taxRate) / 100;
  const totalRCV = subtotalWithOP + taxAmount;
  const totalDepreciation = includedItems.reduce((sum, i) => sum + i.depreciationAmount, 0);
  const totalACV = totalRCV - totalDepreciation;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/95 overflow-auto"
    >
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Editor
          </button>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
              <Send className="w-4 h-4" /> Send to Customer
            </button>
          </div>
        </div>

        {/* Estimate Document */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden text-slate-900">
          {/* Company Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-1">ESTIMATE</h1>
                <p className="text-slate-400">{estimate.estimateNumber}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-cyan-400">Estimate Reliance</h2>
                <p className="text-sm text-slate-400">Professional Restoration Services</p>
              </div>
            </div>
          </div>

          {/* Customer & Property Info */}
          <div className="grid md:grid-cols-2 gap-6 p-8 border-b border-slate-200">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Customer</h3>
              <p className="font-medium text-lg">{estimate.customerName}</p>
              <p className="text-slate-600">{estimate.customerPhone}</p>
              <p className="text-slate-600">{estimate.customerEmail}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Property Address</h3>
              <p className="text-slate-700">{estimate.propertyAddress}</p>
              {estimate.isInsuranceJob && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Insurance</h3>
                  <p className="text-slate-700">{estimate.insuranceCompany}</p>
                  <p className="text-sm text-slate-600">Claim #: {estimate.claimNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scope of Work */}
          {estimate.scopeOfWork && (
            <div className="p-8 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scope of Work</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{estimate.scopeOfWork}</p>
            </div>
          )}

          {/* Line Items */}
          <div className="p-8">
            {itemsByCategory.map(cat => (
              <div key={cat.id} className="mb-8">
                <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-900 pb-2 mb-4">
                  {cat.name}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2 w-20">Qty</th>
                      <th className="text-center py-2 w-16">Unit</th>
                      <th className="text-right py-2 w-24">Price</th>
                      <th className="text-right py-2 w-28">{estimate.isInsuranceJob ? 'RCV' : 'Total'}</th>
                      {estimate.isInsuranceJob && (
                        <>
                          <th className="text-right py-2 w-20">Dep%</th>
                          <th className="text-right py-2 w-28">ACV</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map(item => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4">
                          <span className="font-mono text-xs text-slate-500 mr-2">{item.itemCode}</span>
                          {item.description}
                        </td>
                        <td className="text-right py-2">{formatNumber(item.quantity, 2)}</td>
                        <td className="text-center py-2">{item.unit}</td>
                        <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right py-2 font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                        {estimate.isInsuranceJob && (
                          <>
                            <td className="text-right py-2 text-amber-600">{item.depreciationPercent}%</td>
                            <td className="text-right py-2 text-cyan-600">{formatCurrency(item.acv)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t-2 border-slate-900 pt-4 mt-8">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Overhead ({estimate.overheadPercent}%)</span>
                    <span>{formatCurrency(overheadAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Profit ({estimate.profitPercent}%)</span>
                    <span>{formatCurrency(profitAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({estimate.taxRate}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-300">
                    <span>{estimate.isInsuranceJob ? 'Total RCV' : 'Total'}</span>
                    <span>{formatCurrency(totalRCV)}</span>
                  </div>
                  {estimate.isInsuranceJob && (
                    <>
                      <div className="flex justify-between text-sm text-amber-600">
                        <span>Less Depreciation</span>
                        <span>-{formatCurrency(totalDepreciation)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-cyan-600">
                        <span>Total ACV</span>
                        <span>{formatCurrency(totalACV)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Signature */}
          <div className="p-8 bg-slate-50 border-t border-slate-200">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Terms & Conditions</h3>
                <p className="text-xs text-slate-600">
                  This estimate is valid for 30 days from the date above. Prices are subject to change based on actual conditions found during work.
                  All work includes standard manufacturer warranty plus our workmanship guarantee.
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Acceptance</h3>
                <div className="border-b border-slate-400 mt-8 mb-2"></div>
                <p className="text-xs text-slate-500">Customer Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============= MAIN COMPONENT =============

interface EstimateBuilderProps {
  onBack?: () => void;
  jobId?: string;
}

const EstimateBuilder: React.FC<EstimateBuilderProps> = ({ onBack }) => {
  // State
  const [showPreview, setShowPreview] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(true);
  const [quickAddSearch, setQuickAddSearch] = useState('');
  const [showImport, setShowImport] = useState(false);

  const [estimate, setEstimate] = useState<EstimateData>({
    id: generateId(),
    estimateNumber: 'EST-2024-00001',
    estimateName: 'Roof Replacement Estimate',
    estimateType: 'initial',
    status: 'draft',
    customerName: 'John Smith',
    customerPhone: '(555) 123-4567',
    customerEmail: 'john.smith@email.com',
    propertyAddress: '123 Main Street, Anytown, TX 75001',
    jobNumber: 'JOB-2024-00001',
    jobType: 'roofing',
    claimNumber: 'CLM-2024-56789',
    dateOfLoss: '2024-03-15',
    isInsuranceJob: true,
    insuranceCompany: 'State Farm Insurance',
    adjusterName: 'Mike Johnson',
    adjusterPhone: '(555) 987-6543',
    overheadPercent: 10,
    profitPercent: 10,
    taxRate: 8.25,
    categories: DEFAULT_CATEGORIES,
    lineItems: [],
    scopeOfWork: 'Complete tear-off and replacement of existing asphalt shingle roofing system including all necessary components.',
    exclusions: 'Excludes interior damage, structural repairs, and landscaping restoration.',
    internalNotes: ''
  });

  // Handlers
  const toggleCategory = useCallback((categoryId: string) => {
    setEstimate(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    }));
  }, []);

  const addLineItem = useCallback((categoryId: string, template?: Partial<LineItem>) => {
    const category = estimate.categories.find(c => c.id === categoryId);
    const maxLineNumber = Math.max(0, ...estimate.lineItems.map(i => i.lineNumber));

    const newItem: LineItem = {
      id: generateId(),
      lineNumber: maxLineNumber + 1,
      categoryId,
      categoryName: category?.name || '',
      itemCode: template?.itemCode || '',
      description: template?.description || '',
      itemType: template?.itemType || 'material_labor',
      quantity: 1,
      unit: template?.unit || 'EA',
      unitPrice: template?.unitPrice || 0,
      materialCost: 0,
      laborCost: 0,
      rcv: 0,
      depreciationPercent: 0,
      depreciationAmount: 0,
      acv: 0,
      isTaxable: true,
      isOptional: false,
      isIncluded: true,
      isContested: false
    };

    setEstimate(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, isExpanded: true } : cat
      )
    }));
  }, [estimate.categories, estimate.lineItems]);

  const addFromQuickAdd = useCallback((template: Partial<LineItem>) => {
    if (template.categoryId) {
      addLineItem(template.categoryId, template);
    }
  }, [addLineItem]);

  const updateLineItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setEstimate(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        // Recalculate RCV/ACV when price changes
        const extendedPrice = updated.quantity * updated.unitPrice;
        updated.rcv = extendedPrice;
        if (!updates.depreciationPercent && !updates.acv) {
          updated.depreciationAmount = (extendedPrice * updated.depreciationPercent) / 100;
          updated.acv = extendedPrice - updated.depreciationAmount;
        }
        return updated;
      })
    }));
  }, []);

  const deleteLineItem = useCallback((id: string) => {
    setEstimate(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  }, []);

  const duplicateLineItem = useCallback((id: string) => {
    const item = estimate.lineItems.find(i => i.id === id);
    if (!item) return;

    const maxLineNumber = Math.max(0, ...estimate.lineItems.map(i => i.lineNumber));
    const newItem: LineItem = {
      ...item,
      id: generateId(),
      lineNumber: maxLineNumber + 1
    };

    setEstimate(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  }, [estimate.lineItems]);

  const updateSettings = useCallback((updates: { overheadPercent?: number; profitPercent?: number; taxRate?: number }) => {
    setEstimate(prev => ({ ...prev, ...updates }));
  }, []);

  // Import from Excel handler
  const handleExcelImport = useCallback((
    lineItems: Array<{
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
    }>,
    categories: Array<{
      id: string;
      code: string;
      name: string;
      icon: string;
      color: string;
      isExpanded: boolean;
      sortOrder: number;
    }>
  ) => {
    // Convert imported items to our LineItem format
    const convertedItems: LineItem[] = lineItems.map((item, index) => ({
      id: item.id,
      lineNumber: index + 1,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      itemCode: item.itemCode,
      description: item.description,
      detailedDescription: item.detailedDescription,
      itemType: (item.itemType as ItemType) || 'material_labor',
      quantity: item.quantity,
      unit: (item.unit as UnitType) || 'EA',
      unitPrice: item.unitPrice,
      materialCost: item.materialCost,
      laborCost: item.laborCost,
      laborHours: item.laborHours,
      laborRate: item.laborRate,
      rcv: item.rcv,
      depreciationPercent: item.depreciationPercent,
      depreciationAmount: item.depreciationAmount,
      acv: item.acv,
      isTaxable: item.isTaxable,
      isOptional: item.isOptional,
      isIncluded: item.isIncluded,
      isContested: item.isContested,
      contestNotes: item.contestNotes,
      notes: item.notes,
    }));

    // Merge imported categories with existing ones
    const existingCategoryIds = new Set(estimate.categories.map(c => c.id));
    const newCategories: Category[] = categories
      .filter(c => !existingCategoryIds.has(c.id))
      .map(c => ({
        ...c,
        isExpanded: true,
      }));

    // Update estimate with imported data
    setEstimate(prev => ({
      ...prev,
      lineItems: convertedItems, // Replace all line items
      categories: [...prev.categories, ...newCategories],
    }));
  }, [estimate.categories]);

  // Render
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Preview Mode */}
      <AnimatePresence>
        {showPreview && (
          <EstimatePreview estimate={estimate} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImport && (
          <EstimateImport
            onImport={handleExcelImport}
            onClose={() => setShowImport(false)}
            existingItemCount={estimate.lineItems.length}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white">{estimate.estimateName}</h1>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {estimate.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{estimate.estimateNumber} • {estimate.customerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Import Excel</span>
              </button>

              <button
                onClick={() => setShowDetailedView(!showDetailedView)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  showDetailedView
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {showDetailedView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-sm">{estimate.isInsuranceJob ? 'RCV/ACV' : 'Details'}</span>
              </button>

              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">Preview</span>
              </button>

              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                <Save className="w-4 h-4" />
                <span className="text-sm">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Line Items */}
          <div className="space-y-4">
            {/* Project Info Bar */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{estimate.propertyAddress}</span>
              </div>
              {estimate.isInsuranceJob && (
                <>
                  <div className="w-px h-4 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-cyan-300">Claim: {estimate.claimNumber}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-700" />
                  <span className="text-sm text-slate-400">{estimate.insuranceCompany}</span>
                </>
              )}
            </div>

            {/* Categories & Line Items */}
            {estimate.categories.map(category => (
              <CategorySection
                key={category.id}
                category={category}
                items={estimate.lineItems.filter(i => i.categoryId === category.id)}
                onToggle={() => toggleCategory(category.id)}
                onAddItem={addLineItem}
                onUpdateItem={updateLineItem}
                onDeleteItem={deleteLineItem}
                onDuplicateItem={duplicateLineItem}
                isInsuranceJob={estimate.isInsuranceJob}
                showDetailedView={showDetailedView}
              />
            ))}
          </div>

          {/* Right: Summary & Quick Add */}
          <div className="space-y-4">
            <SummaryPanel
              lineItems={estimate.lineItems}
              overheadPercent={estimate.overheadPercent}
              profitPercent={estimate.profitPercent}
              taxRate={estimate.taxRate}
              isInsuranceJob={estimate.isInsuranceJob}
              onUpdateSettings={updateSettings}
            />

            <QuickAddPanel
              onAddItem={addFromQuickAdd}
              searchTerm={quickAddSearch}
              onSearchChange={setQuickAddSearch}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateBuilder;
