import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  Upload,
  Calculator
} from 'lucide-react';
import { XactimateLineItem, XactimateCategory, UnitOfMeasure } from '../../../types';

interface XactimatePricingProps {
  organizationId?: string;
}

// Unit of measure options with descriptions
const UNIT_OPTIONS: { value: UnitOfMeasure; label: string; description: string }[] = [
  { value: 'SF', label: 'SF', description: 'Square Foot' },
  { value: 'SQ', label: 'SQ', description: 'Square (100 SF)' },
  { value: 'SY', label: 'SY', description: 'Square Yard' },
  { value: 'LF', label: 'LF', description: 'Linear Foot' },
  { value: 'EA', label: 'EA', description: 'Each' },
  { value: 'HR', label: 'HR', description: 'Hour' },
  { value: 'DA', label: 'DA', description: 'Day' },
  { value: 'BDL', label: 'BDL', description: 'Bundle' },
  { value: 'ROL', label: 'ROL', description: 'Roll' },
  { value: 'GAL', label: 'GAL', description: 'Gallon' },
  { value: 'LS', label: 'LS', description: 'Lump Sum' }
];

// Sample categories (would come from database)
const SAMPLE_CATEGORIES: XactimateCategory[] = [
  { id: '1', organization_id: '', category_code: 'RFG', category_name: 'Roofing', sort_order: 1, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '2', organization_id: '', category_code: 'SID', category_name: 'Siding', sort_order: 2, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '3', organization_id: '', category_code: 'GTR', category_name: 'Gutters', sort_order: 3, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '4', organization_id: '', category_code: 'INT', category_name: 'Interior', sort_order: 4, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '5', organization_id: '', category_code: 'DMO', category_name: 'Demo/Tear Off', sort_order: 5, is_active: true, is_system: true, created_at: '', updated_at: '' }
];

// Sample line items for demo
const SAMPLE_LINE_ITEMS: XactimateLineItem[] = [
  {
    id: '1',
    organization_id: '',
    item_code: 'RFG LAMI<',
    category_id: '1',
    description: 'Laminated - Loss/Rsq composition shingle roofing - 25 yr - w/out flsng',
    unit: 'SQ',
    unit_price: 267.52,
    material_price: 145.00,
    labor_price: 122.52,
    equipment_price: 0,
    labor_hours: 2.17,
    waste_factor: 10,
    is_active: true,
    is_taxable: true,
    is_o_and_p_eligible: true,
    price_source: 'manual',
    created_at: '',
    updated_at: ''
  },
  {
    id: '2',
    organization_id: '',
    item_code: 'RFG FELT15',
    category_id: '1',
    description: 'Roofing felt - 15 lb',
    unit: 'SQ',
    unit_price: 19.87,
    material_price: 12.50,
    labor_price: 7.37,
    equipment_price: 0,
    labor_hours: 0.13,
    waste_factor: 5,
    is_active: true,
    is_taxable: true,
    is_o_and_p_eligible: true,
    price_source: 'manual',
    created_at: '',
    updated_at: ''
  },
  {
    id: '3',
    organization_id: '',
    item_code: 'RFG DRIP',
    category_id: '1',
    description: 'Drip edge - aluminum',
    unit: 'LF',
    unit_price: 2.34,
    material_price: 1.25,
    labor_price: 1.09,
    equipment_price: 0,
    labor_hours: 0.02,
    waste_factor: 5,
    is_active: true,
    is_taxable: true,
    is_o_and_p_eligible: true,
    price_source: 'manual',
    created_at: '',
    updated_at: ''
  },
  {
    id: '4',
    organization_id: '',
    item_code: 'RFG RIDGE',
    category_id: '1',
    description: 'Ridge cap - composition shingles',
    unit: 'LF',
    unit_price: 8.45,
    material_price: 4.50,
    labor_price: 3.95,
    equipment_price: 0,
    labor_hours: 0.07,
    waste_factor: 5,
    is_active: true,
    is_taxable: true,
    is_o_and_p_eligible: true,
    price_source: 'manual',
    created_at: '',
    updated_at: ''
  },
  {
    id: '5',
    organization_id: '',
    item_code: 'RFG STRTSH',
    category_id: '1',
    description: 'Starter shingles',
    unit: 'LF',
    unit_price: 3.12,
    material_price: 1.75,
    labor_price: 1.37,
    equipment_price: 0,
    labor_hours: 0.024,
    waste_factor: 5,
    is_active: true,
    is_taxable: true,
    is_o_and_p_eligible: true,
    price_source: 'manual',
    created_at: '',
    updated_at: ''
  },
  {
    id: '6',
    organization_id: '',
    item_code: 'RFG PBOOT',
    category_id: '1',
    description: 'Pipe boot/jack - standard',
    unit: 'EA',
    unit_price: 45.67,
    material_price: 28.00,
    labor_price: 17.67,
    equipment_price: 0,
    labor_hours: 0.31,
    waste_factor: 0,
    is_active: true,
    is_taxable: true,
    is_o_and_p_eligible: true,
    price_source: 'manual',
    created_at: '',
    updated_at: ''
  }
];

const XactimatePricing: React.FC<XactimatePricingProps> = ({ organizationId }) => {
  const [lineItems, setLineItems] = useState<XactimateLineItem[]>(SAMPLE_LINE_ITEMS);
  const [categories] = useState<XactimateCategory[]>(SAMPLE_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<XactimateLineItem | null>(null);
  const [sortField, setSortField] = useState<keyof XactimateLineItem>('item_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // New item form state
  const [newItem, setNewItem] = useState<Partial<XactimateLineItem>>({
    item_code: '',
    description: '',
    unit: 'SF',
    unit_price: 0,
    material_price: 0,
    labor_price: 0,
    equipment_price: 0,
    labor_hours: 0,
    waste_factor: 0,
    is_active: true,
    is_taxable: true,
    is_o_and_p_eligible: true,
    price_source: 'manual'
  });

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...lineItems];

    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(
        item =>
          item.item_code.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category_id === selectedCategory);
    }

    // Sort
    items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return items;
  }, [lineItems, searchTerm, selectedCategory, sortField, sortDirection]);

  const handleSort = (field: keyof XactimateLineItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddItem = () => {
    if (!newItem.item_code || !newItem.description) return;

    // Calculate total unit price from components
    const totalPrice =
      (newItem.material_price || 0) +
      (newItem.labor_price || 0) +
      (newItem.equipment_price || 0);

    const item: XactimateLineItem = {
      id: Date.now().toString(),
      organization_id: organizationId || '',
      item_code: newItem.item_code || '',
      description: newItem.description || '',
      unit: newItem.unit as UnitOfMeasure || 'SF',
      unit_price: totalPrice,
      material_price: newItem.material_price || 0,
      labor_price: newItem.labor_price || 0,
      equipment_price: newItem.equipment_price || 0,
      labor_hours: newItem.labor_hours || 0,
      waste_factor: newItem.waste_factor || 0,
      is_active: true,
      is_taxable: true,
      is_o_and_p_eligible: true,
      price_source: 'manual',
      category_id: newItem.category_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setLineItems([...lineItems, item]);
    setShowAddModal(false);
    resetNewItemForm();
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    // Recalculate total price
    const totalPrice =
      editingItem.material_price +
      editingItem.labor_price +
      editingItem.equipment_price;

    setLineItems(
      lineItems.map(item =>
        item.id === editingItem.id
          ? { ...editingItem, unit_price: totalPrice, updated_at: new Date().toISOString() }
          : item
      )
    );
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this line item?')) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const resetNewItemForm = () => {
    setNewItem({
      item_code: '',
      description: '',
      unit: 'SF',
      unit_price: 0,
      material_price: 0,
      labor_price: 0,
      equipment_price: 0,
      labor_hours: 0,
      waste_factor: 0,
      is_active: true,
      is_taxable: true,
      is_o_and_p_eligible: true,
      price_source: 'manual'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.category_code || '-';
  };

  const SortIcon = ({ field }: { field: keyof XactimateLineItem }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code or description..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-8 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.category_code} - {cat.category_name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm transition-colors">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 flex items-start gap-3">
        <Calculator className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-blue-300 font-medium">Xactimate Line Items</p>
          <p className="text-blue-400/80 text-xs mt-1">
            Manage your Xactimate pricing database. These items can be used in estimates and combined into macros
            for quick estimate generation. Unit prices auto-calculate from material + labor + equipment.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th
                  className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('item_code')}
                >
                  Code <SortIcon field="item_code" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th
                  className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('description')}
                >
                  Description <SortIcon field="description" />
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Unit
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('material_price')}
                >
                  Material <SortIcon field="material_price" />
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('labor_price')}
                >
                  Labor <SortIcon field="labor_price" />
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('unit_price')}
                >
                  Total <SortIcon field="unit_price" />
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Waste %
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-cyan-400">{item.item_code}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {getCategoryName(item.category_id)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-200 line-clamp-2">{item.description}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs font-medium text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                      {item.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-slate-300">{formatCurrency(item.material_price)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-slate-300">{formatCurrency(item.labor_price)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-emerald-400">{formatCurrency(item.unit_price)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm text-slate-400">{item.waste_factor}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No line items found</p>
            <p className="text-sm text-slate-500 mt-1">Add items or adjust your filters</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Showing {filteredItems.length} of {lineItems.length} items</span>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingItem ? 'Edit Line Item' : 'Add New Line Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetNewItemForm();
                }}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Item Code & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Item Code *
                  </label>
                  <input
                    type="text"
                    value={editingItem?.item_code || newItem.item_code || ''}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, item_code: e.target.value })
                        : setNewItem({ ...newItem, item_code: e.target.value })
                    }
                    placeholder="RFG LAMI<"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editingItem?.category_id || newItem.category_id || ''}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, category_id: e.target.value })
                        : setNewItem({ ...newItem, category_id: e.target.value })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_code} - {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  value={editingItem?.description || newItem.description || ''}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, description: e.target.value })
                      : setNewItem({ ...newItem, description: e.target.value })
                  }
                  placeholder="Full item description..."
                  rows={2}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              {/* Unit & Waste */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={editingItem?.unit || newItem.unit || 'SF'}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, unit: e.target.value as UnitOfMeasure })
                        : setNewItem({ ...newItem, unit: e.target.value as UnitOfMeasure })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    {UNIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Waste Factor (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editingItem?.waste_factor ?? newItem.waste_factor ?? 0}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, waste_factor: parseFloat(e.target.value) || 0 })
                        : setNewItem({ ...newItem, waste_factor: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-300">Pricing Breakdown</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Material Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem?.material_price ?? newItem.material_price ?? 0}
                        onChange={(e) =>
                          editingItem
                            ? setEditingItem({ ...editingItem, material_price: parseFloat(e.target.value) || 0 })
                            : setNewItem({ ...newItem, material_price: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Labor Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem?.labor_price ?? newItem.labor_price ?? 0}
                        onChange={(e) =>
                          editingItem
                            ? setEditingItem({ ...editingItem, labor_price: parseFloat(e.target.value) || 0 })
                            : setNewItem({ ...newItem, labor_price: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Equipment Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem?.equipment_price ?? newItem.equipment_price ?? 0}
                        onChange={(e) =>
                          editingItem
                            ? setEditingItem({ ...editingItem, equipment_price: parseFloat(e.target.value) || 0 })
                            : setNewItem({ ...newItem, equipment_price: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                </div>
                {/* Calculated Total */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <span className="text-sm text-slate-400">Total Unit Price:</span>
                  <span className="text-lg font-semibold text-emerald-400">
                    {formatCurrency(
                      (editingItem?.material_price ?? newItem.material_price ?? 0) +
                      (editingItem?.labor_price ?? newItem.labor_price ?? 0) +
                      (editingItem?.equipment_price ?? newItem.equipment_price ?? 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Labor Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Labor Hours (per unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingItem?.labor_hours ?? newItem.labor_hours ?? 0}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, labor_hours: parseFloat(e.target.value) || 0 })
                        : setNewItem({ ...newItem, labor_hours: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetNewItemForm();
                }}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XactimatePricing;
