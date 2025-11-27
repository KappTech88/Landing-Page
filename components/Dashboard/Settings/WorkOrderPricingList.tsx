import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Save,
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import { WorkOrderPricing, UnitOfMeasure } from '../../../types';

interface WorkOrderPricingListProps {
  organizationId?: string;
}

// Unit options
const UNIT_OPTIONS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'EA', label: 'EA - Each' },
  { value: 'SF', label: 'SF - Square Foot' },
  { value: 'SQ', label: 'SQ - Square (100 SF)' },
  { value: 'LF', label: 'LF - Linear Foot' },
  { value: 'HR', label: 'HR - Hour' },
  { value: 'LS', label: 'LS - Lump Sum' }
];

// Sample work order pricing
const SAMPLE_WORK_ORDER_PRICING: WorkOrderPricing[] = [
  {
    id: '1',
    organization_id: '',
    item_code: 'WO-REPAIR-001',
    item_name: 'Emergency Tarp Installation',
    description: 'Emergency roof tarp installation to prevent water damage',
    category: 'Emergency Repairs',
    trade_type: 'roofing',
    unit: 'EA',
    unit_price: 350.00,
    material_cost: 75.00,
    labor_cost: 275.00,
    labor_hours: 2.5,
    pricing_type: 'flat',
    is_active: true,
    is_taxable: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: '2',
    organization_id: '',
    item_code: 'WO-REPAIR-002',
    item_name: 'Leak Investigation',
    description: 'Inspect and diagnose roof leak source',
    category: 'Repairs',
    trade_type: 'roofing',
    unit: 'HR',
    unit_price: 125.00,
    material_cost: 0,
    labor_cost: 125.00,
    labor_hours: 1,
    pricing_type: 'per_unit',
    min_price: 125.00,
    is_active: true,
    is_taxable: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: '3',
    organization_id: '',
    item_code: 'WO-REPAIR-003',
    item_name: 'Shingle Replacement (Small Area)',
    description: 'Replace damaged shingles - up to 1 square',
    category: 'Repairs',
    trade_type: 'roofing',
    unit: 'SQ',
    unit_price: 450.00,
    material_cost: 150.00,
    labor_cost: 300.00,
    labor_hours: 2,
    pricing_type: 'per_unit',
    min_price: 250.00,
    is_active: true,
    is_taxable: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: '4',
    organization_id: '',
    item_code: 'WO-MAINT-001',
    item_name: 'Gutter Cleaning',
    description: 'Clean and flush gutters and downspouts',
    category: 'Maintenance',
    trade_type: 'gutters',
    unit: 'LF',
    unit_price: 2.50,
    material_cost: 0,
    labor_cost: 2.50,
    pricing_type: 'per_unit',
    min_price: 150.00,
    is_active: true,
    is_taxable: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: '5',
    organization_id: '',
    item_code: 'WO-MAINT-002',
    item_name: 'Annual Roof Inspection',
    description: 'Comprehensive roof inspection with written report',
    category: 'Maintenance',
    trade_type: 'roofing',
    unit: 'EA',
    unit_price: 295.00,
    material_cost: 0,
    labor_cost: 295.00,
    labor_hours: 1.5,
    pricing_type: 'flat',
    is_active: true,
    is_taxable: false,
    created_at: '',
    updated_at: ''
  }
];

const WorkOrderPricingList: React.FC<WorkOrderPricingListProps> = ({ organizationId }) => {
  const [items, setItems] = useState<WorkOrderPricing[]>(SAMPLE_WORK_ORDER_PRICING);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkOrderPricing | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.category));
    return Array.from(cats).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.item_code.toLowerCase().includes(search) ||
          item.item_name.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    return filtered;
  }, [items, searchTerm, categoryFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this pricing item?')) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // New item form state
  const [newItem, setNewItem] = useState<Partial<WorkOrderPricing>>({
    item_code: '',
    item_name: '',
    description: '',
    category: 'Repairs',
    trade_type: 'roofing',
    unit: 'EA',
    unit_price: 0,
    material_cost: 0,
    labor_cost: 0,
    labor_hours: 0,
    pricing_type: 'flat',
    is_active: true,
    is_taxable: true
  });

  const handleAddItem = () => {
    if (!newItem.item_code || !newItem.item_name) return;

    const item: WorkOrderPricing = {
      id: Date.now().toString(),
      organization_id: organizationId || '',
      item_code: newItem.item_code || '',
      item_name: newItem.item_name || '',
      description: newItem.description,
      category: newItem.category || 'Repairs',
      subcategory: newItem.subcategory,
      trade_type: newItem.trade_type,
      unit: newItem.unit as UnitOfMeasure || 'EA',
      unit_price: newItem.unit_price || 0,
      material_cost: newItem.material_cost || 0,
      labor_cost: newItem.labor_cost || 0,
      labor_hours: newItem.labor_hours,
      pricing_type: newItem.pricing_type || 'flat',
      min_price: newItem.min_price,
      max_price: newItem.max_price,
      is_active: true,
      is_taxable: newItem.is_taxable ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setItems([...items, item]);
    setShowAddModal(false);
    resetForm();
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    setItems(items.map(item =>
      item.id === editingItem.id
        ? { ...editingItem, updated_at: new Date().toISOString() }
        : item
    ));
    setEditingItem(null);
  };

  const resetForm = () => {
    setNewItem({
      item_code: '',
      item_name: '',
      description: '',
      category: 'Repairs',
      trade_type: 'roofing',
      unit: 'EA',
      unit_price: 0,
      material_cost: 0,
      labor_cost: 0,
      labor_hours: 0,
      pricing_type: 'flat',
      is_active: true,
      is_taxable: true
    });
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-blue-300 font-medium">Work Order Pricing</p>
          <p className="text-blue-400/80 text-xs mt-1">
            Standard pricing for work orders, repairs, and maintenance services.
            These are non-Xactimate items for quick service quotes.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pricing items..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-8 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Code</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Item Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Category</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Unit</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Material</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Labor</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Total</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-cyan-400">{item.item_code}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm text-slate-200">{item.item_name}</p>
                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs font-medium text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                      {item.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-slate-400">{formatCurrency(item.material_cost)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-slate-400">{formatCurrency(item.labor_cost)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-emerald-400">{formatCurrency(item.unit_price)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.pricing_type === 'flat'
                        ? 'bg-purple-900/30 text-purple-400'
                        : item.pricing_type === 'per_unit'
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-amber-900/30 text-amber-400'
                    }`}>
                      {item.pricing_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
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
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No pricing items found</p>
            <p className="text-sm text-slate-500 mt-1">Add items or adjust your filters</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Showing {filteredItems.length} of {items.length} items</span>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingItem ? 'Edit Pricing Item' : 'Add Pricing Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Code & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Item Code *</label>
                  <input
                    type="text"
                    value={editingItem?.item_code || newItem.item_code || ''}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, item_code: e.target.value })
                        : setNewItem({ ...newItem, item_code: e.target.value })
                    }
                    placeholder="WO-REPAIR-001"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={editingItem?.category || newItem.category || 'Repairs'}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, category: e.target.value })
                        : setNewItem({ ...newItem, category: e.target.value })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Emergency Repairs">Emergency Repairs</option>
                    <option value="Repairs">Repairs</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inspections">Inspections</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={editingItem?.item_name || newItem.item_name || ''}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, item_name: e.target.value })
                      : setNewItem({ ...newItem, item_name: e.target.value })
                  }
                  placeholder="Emergency Tarp Installation"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={editingItem?.description || newItem.description || ''}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, description: e.target.value })
                      : setNewItem({ ...newItem, description: e.target.value })
                  }
                  placeholder="Describe the service..."
                  rows={2}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              {/* Unit & Pricing Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                  <select
                    value={editingItem?.unit || newItem.unit || 'EA'}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, unit: e.target.value as UnitOfMeasure })
                        : setNewItem({ ...newItem, unit: e.target.value as UnitOfMeasure })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    {UNIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Pricing Type</label>
                  <select
                    value={editingItem?.pricing_type || newItem.pricing_type || 'flat'}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, pricing_type: e.target.value as 'flat' | 'per_unit' | 'range' })
                        : setNewItem({ ...newItem, pricing_type: e.target.value as 'flat' | 'per_unit' | 'range' })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="flat">Flat Rate</option>
                    <option value="per_unit">Per Unit</option>
                    <option value="range">Price Range</option>
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-300">Pricing</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Material Cost</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem?.material_cost ?? newItem.material_cost ?? 0}
                        onChange={(e) =>
                          editingItem
                            ? setEditingItem({ ...editingItem, material_cost: parseFloat(e.target.value) || 0 })
                            : setNewItem({ ...newItem, material_cost: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Labor Cost</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem?.labor_cost ?? newItem.labor_cost ?? 0}
                        onChange={(e) =>
                          editingItem
                            ? setEditingItem({ ...editingItem, labor_cost: parseFloat(e.target.value) || 0 })
                            : setNewItem({ ...newItem, labor_cost: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Unit Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem?.unit_price ?? newItem.unit_price ?? 0}
                        onChange={(e) =>
                          editingItem
                            ? setEditingItem({ ...editingItem, unit_price: parseFloat(e.target.value) || 0 })
                            : setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                </div>
                {(editingItem?.pricing_type || newItem.pricing_type) === 'per_unit' && (
                  <div className="pt-2 border-t border-slate-700">
                    <label className="block text-xs text-slate-400 mb-1">Minimum Charge</label>
                    <div className="relative w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem?.min_price ?? newItem.min_price ?? ''}
                        onChange={(e) =>
                          editingItem
                            ? setEditingItem({ ...editingItem, min_price: e.target.value ? parseFloat(e.target.value) : undefined })
                            : setNewItem({ ...newItem, min_price: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                        placeholder="Optional"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem?.is_taxable ?? newItem.is_taxable ?? true}
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({ ...editingItem, is_taxable: e.target.checked })
                        : setNewItem({ ...newItem, is_taxable: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Taxable</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetForm();
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

export default WorkOrderPricingList;
