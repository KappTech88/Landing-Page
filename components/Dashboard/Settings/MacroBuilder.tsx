import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  Calculator,
  Copy,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Ruler
} from 'lucide-react';
import {
  PricingMacro,
  PricingMacroItem,
  XactimateLineItem,
  UnitOfMeasure,
  QuantityType,
  MacroRequiredInput
} from '../../../types';

interface MacroBuilderProps {
  organizationId?: string;
}

// Sample Xactimate items for selection
const SAMPLE_XACTIMATE_ITEMS: XactimateLineItem[] = [
  { id: '1', organization_id: '', item_code: 'RFG LAMI<', description: 'Laminated composition shingle roofing - 25 yr', unit: 'SQ', unit_price: 267.52, material_price: 145.00, labor_price: 122.52, equipment_price: 0, labor_hours: 2.17, waste_factor: 10, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '2', organization_id: '', item_code: 'RFG FELT15', description: 'Roofing felt - 15 lb', unit: 'SQ', unit_price: 19.87, material_price: 12.50, labor_price: 7.37, equipment_price: 0, labor_hours: 0.13, waste_factor: 5, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '3', organization_id: '', item_code: 'RFG DRIP', description: 'Drip edge - aluminum', unit: 'LF', unit_price: 2.34, material_price: 1.25, labor_price: 1.09, equipment_price: 0, labor_hours: 0.02, waste_factor: 5, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '4', organization_id: '', item_code: 'RFG RIDGE', description: 'Ridge cap - composition shingles', unit: 'LF', unit_price: 8.45, material_price: 4.50, labor_price: 3.95, equipment_price: 0, labor_hours: 0.07, waste_factor: 5, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '5', organization_id: '', item_code: 'RFG STRTSH', description: 'Starter shingles', unit: 'LF', unit_price: 3.12, material_price: 1.75, labor_price: 1.37, equipment_price: 0, labor_hours: 0.024, waste_factor: 5, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '6', organization_id: '', item_code: 'RFG PBOOT', description: 'Pipe boot/jack - standard', unit: 'EA', unit_price: 45.67, material_price: 28.00, labor_price: 17.67, equipment_price: 0, labor_hours: 0.31, waste_factor: 0, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '7', organization_id: '', item_code: 'RFG I&W', description: 'Ice & water shield membrane', unit: 'SQ', unit_price: 85.50, material_price: 65.00, labor_price: 20.50, equipment_price: 0, labor_hours: 0.36, waste_factor: 10, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '8', organization_id: '', item_code: 'RFG STEPFL', description: 'Step flashing - aluminum', unit: 'LF', unit_price: 6.78, material_price: 3.50, labor_price: 3.28, equipment_price: 0, labor_hours: 0.058, waste_factor: 5, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' },
  { id: '9', organization_id: '', item_code: 'DMO RFGSHN<', description: 'R&R Composition shingles - tear off', unit: 'SQ', unit_price: 68.50, material_price: 0, labor_price: 68.50, equipment_price: 0, labor_hours: 1.21, waste_factor: 0, is_active: true, is_taxable: true, is_o_and_p_eligible: true, price_source: 'manual', created_at: '', updated_at: '' }
];

// Default measurement inputs for roofing macros
const DEFAULT_MEASUREMENT_INPUTS: MacroRequiredInput[] = [
  { name: 'total_squares', label: 'Total Squares', unit: 'SQ', type: 'number' },
  { name: 'ridge_length', label: 'Ridge Length', unit: 'LF', type: 'number' },
  { name: 'hip_length', label: 'Hip Length', unit: 'LF', type: 'number' },
  { name: 'valley_length', label: 'Valley Length', unit: 'LF', type: 'number' },
  { name: 'eave_length', label: 'Eave/Starter Length', unit: 'LF', type: 'number' },
  { name: 'rake_length', label: 'Rake Length', unit: 'LF', type: 'number' },
  { name: 'step_flashing_length', label: 'Step Flashing', unit: 'LF', type: 'number' },
  { name: 'pipe_boots', label: 'Pipe Boots', unit: 'EA', type: 'number' },
  { name: 'chimneys', label: 'Chimneys', unit: 'EA', type: 'number' },
  { name: 'skylights', label: 'Skylights', unit: 'EA', type: 'number' }
];

// Sample macros
const SAMPLE_MACROS: PricingMacro[] = [
  {
    id: '1',
    organization_id: '',
    macro_code: 'ROOF-COMP-25',
    macro_name: 'Complete Roof System - 25yr Composition',
    description: 'Full roof replacement including tear-off, felt, shingles, and standard accessories',
    category: 'Roofing',
    trade_type: 'roofing',
    required_inputs: DEFAULT_MEASUREMENT_INPUTS,
    base_price: 0,
    calculated_material_total: 1425.00,
    calculated_labor_total: 875.00,
    calculated_total: 2300.00,
    markup_type: 'percentage',
    markup_value: 0,
    is_active: true,
    is_template: true,
    tags: ['roofing', 'composition', '25-year'],
    created_at: '',
    updated_at: ''
  }
];

// Sample macro items
const SAMPLE_MACRO_ITEMS: PricingMacroItem[] = [
  { id: '1', macro_id: '1', organization_id: '', xactimate_item_id: '9', item_code: 'DMO RFGSHN<', description: 'R&R Composition shingles - tear off', unit: 'SQ', quantity_type: 'calculated', fixed_quantity: 1, input_field_name: 'total_squares', quantity_multiplier: 1, sort_order: 1, is_included: true, is_optional: false, group_name: 'Tear Off', created_at: '', updated_at: '' },
  { id: '2', macro_id: '1', organization_id: '', xactimate_item_id: '2', item_code: 'RFG FELT15', description: 'Roofing felt - 15 lb', unit: 'SQ', quantity_type: 'calculated', fixed_quantity: 1, input_field_name: 'total_squares', quantity_multiplier: 1, sort_order: 2, is_included: true, is_optional: false, group_name: 'Underlayment', created_at: '', updated_at: '' },
  { id: '3', macro_id: '1', organization_id: '', xactimate_item_id: '1', item_code: 'RFG LAMI<', description: 'Laminated composition shingle roofing - 25 yr', unit: 'SQ', quantity_type: 'calculated', fixed_quantity: 1, input_field_name: 'total_squares', quantity_multiplier: 1, sort_order: 3, is_included: true, is_optional: false, group_name: 'Shingles', created_at: '', updated_at: '' },
  { id: '4', macro_id: '1', organization_id: '', xactimate_item_id: '3', item_code: 'RFG DRIP', description: 'Drip edge - aluminum', unit: 'LF', quantity_type: 'calculated', fixed_quantity: 1, input_field_name: 'eave_length', quantity_multiplier: 1, sort_order: 4, is_included: true, is_optional: false, group_name: 'Accessories', created_at: '', updated_at: '' },
  { id: '5', macro_id: '1', organization_id: '', xactimate_item_id: '4', item_code: 'RFG RIDGE', description: 'Ridge cap - composition shingles', unit: 'LF', quantity_type: 'calculated', fixed_quantity: 1, input_field_name: 'ridge_length', quantity_multiplier: 1, sort_order: 5, is_included: true, is_optional: false, group_name: 'Accessories', created_at: '', updated_at: '' },
  { id: '6', macro_id: '1', organization_id: '', xactimate_item_id: '5', item_code: 'RFG STRTSH', description: 'Starter shingles', unit: 'LF', quantity_type: 'calculated', fixed_quantity: 1, input_field_name: 'eave_length', quantity_multiplier: 1, sort_order: 6, is_included: true, is_optional: false, group_name: 'Accessories', created_at: '', updated_at: '' },
  { id: '7', macro_id: '1', organization_id: '', xactimate_item_id: '6', item_code: 'RFG PBOOT', description: 'Pipe boot/jack - standard', unit: 'EA', quantity_type: 'calculated', fixed_quantity: 1, input_field_name: 'pipe_boots', quantity_multiplier: 1, sort_order: 7, is_included: true, is_optional: false, group_name: 'Penetrations', created_at: '', updated_at: '' }
];

const MacroBuilder: React.FC<MacroBuilderProps> = ({ organizationId }) => {
  const [macros, setMacros] = useState<PricingMacro[]>(SAMPLE_MACROS);
  const [macroItems, setMacroItems] = useState<Record<string, PricingMacroItem[]>>({
    '1': SAMPLE_MACRO_ITEMS
  });
  const [xactimateItems] = useState<XactimateLineItem[]>(SAMPLE_XACTIMATE_ITEMS);
  const [selectedMacro, setSelectedMacro] = useState<PricingMacro | null>(SAMPLE_MACROS[0]);
  const [showAddMacroModal, setShowAddMacroModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingMacroItem, setEditingMacroItem] = useState<PricingMacroItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Test measurements for preview calculation
  const [testMeasurements, setTestMeasurements] = useState<Record<string, number>>({
    total_squares: 25,
    ridge_length: 60,
    hip_length: 0,
    valley_length: 20,
    eave_length: 120,
    rake_length: 80,
    step_flashing_length: 30,
    pipe_boots: 4,
    chimneys: 0,
    skylights: 0
  });

  // New macro form state
  const [newMacro, setNewMacro] = useState<Partial<PricingMacro>>({
    macro_code: '',
    macro_name: '',
    description: '',
    category: 'Roofing',
    trade_type: 'roofing',
    required_inputs: DEFAULT_MEASUREMENT_INPUTS,
    is_active: true,
    is_template: false,
    markup_type: 'percentage',
    markup_value: 0
  });

  // New macro item form state
  const [newMacroItem, setNewMacroItem] = useState<Partial<PricingMacroItem>>({
    quantity_type: 'calculated',
    fixed_quantity: 1,
    quantity_multiplier: 1,
    is_included: true,
    is_optional: false
  });

  // Get items for selected macro
  const currentMacroItems = useMemo(() => {
    if (!selectedMacro) return [];
    return macroItems[selectedMacro.id] || [];
  }, [selectedMacro, macroItems]);

  // Calculate preview totals based on test measurements
  const calculateItemQuantity = (item: PricingMacroItem): number => {
    const xactItem = xactimateItems.find(x => x.id === item.xactimate_item_id);
    const wasteFactor = item.waste_factor_override ?? xactItem?.waste_factor ?? 0;

    let baseQuantity = item.fixed_quantity;

    if (item.quantity_type === 'calculated' && item.input_field_name) {
      baseQuantity = (testMeasurements[item.input_field_name] || 0) * item.quantity_multiplier;
    } else if (item.quantity_type === 'per_square') {
      baseQuantity = (testMeasurements['total_squares'] || 0) * item.quantity_multiplier;
    }

    // Apply waste factor
    return baseQuantity * (1 + wasteFactor / 100);
  };

  const calculateItemTotal = (item: PricingMacroItem): { material: number; labor: number; total: number } => {
    const xactItem = xactimateItems.find(x => x.id === item.xactimate_item_id);
    if (!xactItem || !item.is_included) return { material: 0, labor: 0, total: 0 };

    const quantity = calculateItemQuantity(item);
    const materialPrice = item.material_override ?? xactItem.material_price;
    const laborPrice = item.labor_override ?? xactItem.labor_price;
    const unitPrice = item.price_override ?? xactItem.unit_price;

    return {
      material: quantity * materialPrice,
      labor: quantity * laborPrice,
      total: quantity * unitPrice
    };
  };

  const previewTotals = useMemo(() => {
    let material = 0;
    let labor = 0;
    let total = 0;

    currentMacroItems.forEach(item => {
      const itemTotals = calculateItemTotal(item);
      material += itemTotals.material;
      labor += itemTotals.labor;
      total += itemTotals.total;
    });

    return { material, labor, total };
  }, [currentMacroItems, testMeasurements]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleAddMacro = () => {
    if (!newMacro.macro_code || !newMacro.macro_name) return;

    const macro: PricingMacro = {
      id: Date.now().toString(),
      organization_id: organizationId || '',
      macro_code: newMacro.macro_code || '',
      macro_name: newMacro.macro_name || '',
      description: newMacro.description,
      category: newMacro.category,
      trade_type: newMacro.trade_type,
      required_inputs: newMacro.required_inputs || DEFAULT_MEASUREMENT_INPUTS,
      base_price: 0,
      calculated_material_total: 0,
      calculated_labor_total: 0,
      calculated_total: 0,
      markup_type: newMacro.markup_type || 'percentage',
      markup_value: newMacro.markup_value || 0,
      is_active: true,
      is_template: newMacro.is_template || false,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setMacros([...macros, macro]);
    setMacroItems({ ...macroItems, [macro.id]: [] });
    setSelectedMacro(macro);
    setShowAddMacroModal(false);
    setNewMacro({
      macro_code: '',
      macro_name: '',
      description: '',
      category: 'Roofing',
      trade_type: 'roofing',
      required_inputs: DEFAULT_MEASUREMENT_INPUTS,
      is_active: true,
      is_template: false,
      markup_type: 'percentage',
      markup_value: 0
    });
  };

  const handleAddItemToMacro = (xactItem: XactimateLineItem) => {
    if (!selectedMacro) return;

    const items = macroItems[selectedMacro.id] || [];
    const newItem: PricingMacroItem = {
      id: Date.now().toString(),
      macro_id: selectedMacro.id,
      organization_id: organizationId || '',
      xactimate_item_id: xactItem.id,
      item_code: xactItem.item_code,
      description: xactItem.description,
      unit: xactItem.unit,
      quantity_type: newMacroItem.quantity_type || 'calculated',
      fixed_quantity: newMacroItem.fixed_quantity || 1,
      quantity_multiplier: newMacroItem.quantity_multiplier || 1,
      input_field_name: newMacroItem.input_field_name,
      waste_factor_override: newMacroItem.waste_factor_override,
      sort_order: items.length + 1,
      is_included: true,
      is_optional: newMacroItem.is_optional || false,
      group_name: newMacroItem.group_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setMacroItems({
      ...macroItems,
      [selectedMacro.id]: [...items, newItem]
    });
    setShowAddItemModal(false);
    resetNewItemForm();
  };

  const handleUpdateMacroItem = (updatedItem: PricingMacroItem) => {
    if (!selectedMacro) return;

    const items = macroItems[selectedMacro.id] || [];
    setMacroItems({
      ...macroItems,
      [selectedMacro.id]: items.map(item =>
        item.id === updatedItem.id ? { ...updatedItem, updated_at: new Date().toISOString() } : item
      )
    });
    setEditingMacroItem(null);
  };

  const handleDeleteMacroItem = (itemId: string) => {
    if (!selectedMacro) return;

    const items = macroItems[selectedMacro.id] || [];
    setMacroItems({
      ...macroItems,
      [selectedMacro.id]: items.filter(item => item.id !== itemId)
    });
  };

  const resetNewItemForm = () => {
    setNewMacroItem({
      quantity_type: 'calculated',
      fixed_quantity: 1,
      quantity_multiplier: 1,
      is_included: true,
      is_optional: false
    });
    setItemSearchTerm('');
  };

  const filteredXactimateItems = useMemo(() => {
    if (!itemSearchTerm) return xactimateItems;
    const search = itemSearchTerm.toLowerCase();
    return xactimateItems.filter(
      item =>
        item.item_code.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
    );
  }, [xactimateItems, itemSearchTerm]);

  const filteredMacros = useMemo(() => {
    if (!searchTerm) return macros;
    const search = searchTerm.toLowerCase();
    return macros.filter(
      macro =>
        macro.macro_code.toLowerCase().includes(search) ||
        macro.macro_name.toLowerCase().includes(search)
    );
  }, [macros, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3 flex items-start gap-3">
        <Layers className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-purple-300 font-medium">Pricing Macros</p>
          <p className="text-purple-400/80 text-xs mt-1">
            Create reusable groups of line items that auto-calculate based on measurements.
            Perfect for complete roof systems, siding packages, or any job that uses standard line items.
            Macros can integrate with EagleView and other measurement services for automatic estimate generation.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Macro List */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
            <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Macros</h4>
              <button
                onClick={() => setShowAddMacroModal(true)}
                className="p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                title="Add Macro"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-slate-700/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search macros..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Macro List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredMacros.map(macro => (
                <button
                  key={macro.id}
                  onClick={() => setSelectedMacro(macro)}
                  className={`w-full text-left p-3 border-b border-slate-700/30 transition-colors ${
                    selectedMacro?.id === macro.id
                      ? 'bg-cyan-600/20 border-l-2 border-l-cyan-500'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Layers className={`w-4 h-4 mt-0.5 ${selectedMacro?.id === macro.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedMacro?.id === macro.id ? 'text-cyan-400' : 'text-slate-200'}`}>
                        {macro.macro_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{macro.macro_code}</p>
                      {macro.is_template && (
                        <span className="inline-flex items-center gap-1 text-xs text-purple-400 mt-1">
                          <Copy className="w-3 h-3" />
                          Template
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {filteredMacros.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No macros found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Macro Details & Items */}
        <div className="flex-1 min-w-0 space-y-4">
          {selectedMacro ? (
            <>
              {/* Macro Header */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedMacro.macro_name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{selectedMacro.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                        {selectedMacro.macro_code}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                        {selectedMacro.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddItemModal(true)}
                      className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Measurements Panel */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
                <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-medium text-white">Test Measurements</h4>
                  <span className="text-xs text-slate-500">(for preview calculation)</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-5 gap-3">
                    {selectedMacro.required_inputs.slice(0, 10).map(input => (
                      <div key={input.name}>
                        <label className="block text-xs text-slate-400 mb-1">{input.label}</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={testMeasurements[input.name] || 0}
                            onChange={(e) =>
                              setTestMeasurements({
                                ...testMeasurements,
                                [input.name]: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full bg-slate-800 border border-slate-600 rounded py-1 px-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            {input.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Macro Items Table */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">Item</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-400 uppercase">Unit</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-400 uppercase">Qty Type</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-400 uppercase">Input</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">Calc Qty</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">Unit Price</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">Extended</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {currentMacroItems.map((item) => {
                        const xactItem = xactimateItems.find(x => x.id === item.xactimate_item_id);
                        const quantity = calculateItemQuantity(item);
                        const totals = calculateItemTotal(item);

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-800/30 transition-colors ${!item.is_included ? 'opacity-50' : ''}`}
                          >
                            <td className="py-2 px-3">
                              <div>
                                <span className="text-xs font-mono text-cyan-400">{item.item_code}</span>
                                <p className="text-xs text-slate-300 line-clamp-1">{item.description}</p>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-xs text-slate-300 bg-slate-700/50 px-1.5 py-0.5 rounded">
                                {item.unit}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                item.quantity_type === 'calculated'
                                  ? 'bg-blue-900/30 text-blue-400'
                                  : item.quantity_type === 'per_square'
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-slate-700 text-slate-400'
                              }`}>
                                {item.quantity_type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-xs text-slate-400">
                                {item.input_field_name || '-'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="text-xs text-slate-200">{quantity.toFixed(2)}</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="text-xs text-slate-300">
                                {formatCurrency(item.price_override ?? xactItem?.unit_price ?? 0)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="text-xs font-medium text-emerald-400">
                                {formatCurrency(totals.total)}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setEditingMacroItem(item)}
                                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMacroItem(item.id)}
                                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {currentMacroItems.length === 0 && (
                  <div className="py-8 text-center">
                    <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No items in this macro</p>
                    <p className="text-slate-500 text-xs mt-1">Add Xactimate line items to build your macro</p>
                  </div>
                )}
              </div>

              {/* Preview Totals */}
              {currentMacroItems.length > 0 && (
                <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-medium text-white">Calculated Totals (Preview)</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Material</p>
                        <p className="text-sm font-medium text-slate-200">{formatCurrency(previewTotals.material)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Labor</p>
                        <p className="text-sm font-medium text-slate-200">{formatCurrency(previewTotals.labor)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Total</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(previewTotals.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-12 text-center">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Select a macro to view and edit</p>
              <p className="text-sm text-slate-500 mt-1">Or create a new macro to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Macro Modal */}
      {showAddMacroModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create New Macro</h3>
              <button
                onClick={() => setShowAddMacroModal(false)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Macro Code *</label>
                  <input
                    type="text"
                    value={newMacro.macro_code || ''}
                    onChange={(e) => setNewMacro({ ...newMacro, macro_code: e.target.value })}
                    placeholder="ROOF-COMP-25"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newMacro.category || 'Roofing'}
                    onChange={(e) => setNewMacro({ ...newMacro, category: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Roofing">Roofing</option>
                    <option value="Siding">Siding</option>
                    <option value="Gutters">Gutters</option>
                    <option value="Interior">Interior</option>
                    <option value="Exterior">Exterior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Macro Name *</label>
                <input
                  type="text"
                  value={newMacro.macro_name || ''}
                  onChange={(e) => setNewMacro({ ...newMacro, macro_name: e.target.value })}
                  placeholder="Complete Roof System - 25yr Composition"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newMacro.description || ''}
                  onChange={(e) => setNewMacro({ ...newMacro, description: e.target.value })}
                  placeholder="Describe what this macro includes..."
                  rows={2}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMacro.is_template || false}
                    onChange={(e) => setNewMacro({ ...newMacro, is_template: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Save as template</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddMacroModal(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMacro}
                disabled={!newMacro.macro_code || !newMacro.macro_name}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Create Macro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item to Macro Modal */}
      {showAddItemModal && selectedMacro && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Item to Macro</h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  resetNewItemForm();
                }}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-700 space-y-4">
              {/* Quantity Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Quantity Type</label>
                  <select
                    value={newMacroItem.quantity_type || 'calculated'}
                    onChange={(e) => setNewMacroItem({ ...newMacroItem, quantity_type: e.target.value as QuantityType })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="fixed">Fixed Quantity</option>
                    <option value="calculated">Calculated from Input</option>
                    <option value="per_square">Per Square</option>
                  </select>
                </div>
                {newMacroItem.quantity_type === 'calculated' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Input Field</label>
                    <select
                      value={newMacroItem.input_field_name || ''}
                      onChange={(e) => setNewMacroItem({ ...newMacroItem, input_field_name: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="">Select input...</option>
                      {selectedMacro.required_inputs.map(input => (
                        <option key={input.name} value={input.name}>
                          {input.label} ({input.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {newMacroItem.quantity_type === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Fixed Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newMacroItem.fixed_quantity || 1}
                      onChange={(e) => setNewMacroItem({ ...newMacroItem, fixed_quantity: parseFloat(e.target.value) || 1 })}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Multiplier</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMacroItem.quantity_multiplier || 1}
                    onChange={(e) => setNewMacroItem({ ...newMacroItem, quantity_multiplier: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Item Search */}
            <div className="p-4 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  placeholder="Search Xactimate items..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredXactimateItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItemToMacro(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-cyan-400">{item.item_code}</span>
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                          {item.unit}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1 line-clamp-1">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-400">{formatCurrency(item.unit_price)}</p>
                      <p className="text-xs text-slate-500">per {item.unit}</p>
                    </div>
                    <Plus className="w-5 h-5 text-cyan-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Macro Item Modal */}
      {editingMacroItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit Macro Item</h3>
              <button
                onClick={() => setEditingMacroItem(null)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <span className="text-sm font-mono text-cyan-400">{editingMacroItem.item_code}</span>
                <p className="text-sm text-slate-300 mt-1">{editingMacroItem.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Quantity Type</label>
                  <select
                    value={editingMacroItem.quantity_type}
                    onChange={(e) => setEditingMacroItem({ ...editingMacroItem, quantity_type: e.target.value as QuantityType })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="fixed">Fixed Quantity</option>
                    <option value="calculated">Calculated from Input</option>
                    <option value="per_square">Per Square</option>
                  </select>
                </div>
                {editingMacroItem.quantity_type === 'calculated' && selectedMacro && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Input Field</label>
                    <select
                      value={editingMacroItem.input_field_name || ''}
                      onChange={(e) => setEditingMacroItem({ ...editingMacroItem, input_field_name: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="">Select input...</option>
                      {selectedMacro.required_inputs.map(input => (
                        <option key={input.name} value={input.name}>
                          {input.label} ({input.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {editingMacroItem.quantity_type === 'fixed' ? 'Fixed Quantity' : 'Multiplier'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingMacroItem.quantity_type === 'fixed' ? editingMacroItem.fixed_quantity : editingMacroItem.quantity_multiplier}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 1;
                      if (editingMacroItem.quantity_type === 'fixed') {
                        setEditingMacroItem({ ...editingMacroItem, fixed_quantity: value });
                      } else {
                        setEditingMacroItem({ ...editingMacroItem, quantity_multiplier: value });
                      }
                    }}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Waste Factor Override (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingMacroItem.waste_factor_override ?? ''}
                    onChange={(e) => setEditingMacroItem({
                      ...editingMacroItem,
                      waste_factor_override: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    placeholder="Use default"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  value={editingMacroItem.group_name || ''}
                  onChange={(e) => setEditingMacroItem({ ...editingMacroItem, group_name: e.target.value })}
                  placeholder="e.g., Shingles, Accessories, Labor"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMacroItem.is_included}
                    onChange={(e) => setEditingMacroItem({ ...editingMacroItem, is_included: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Include in calculations</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMacroItem.is_optional}
                    onChange={(e) => setEditingMacroItem({ ...editingMacroItem, is_optional: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Optional item</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingMacroItem(null)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateMacroItem(editingMacroItem)}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MacroBuilder;
