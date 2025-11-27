import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Calculator,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { XactimateLineItem, XactimateCategory, UnitOfMeasure } from '../../../types';
import {
  getXactimateLineItems,
  getXactimateCategories,
  createXactimateLineItem,
  updateXactimateLineItem,
  deleteXactimateLineItem,
  importXactimateFromExcel,
  initializeDefaultCategories,
} from '../../../services/pricingService';
import {
  parseExcelFromFile,
  downloadTemplate,
  type ParsedExcelLineItem,
} from '../../../services/excelService';

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

// Demo categories when no organization ID
const DEMO_CATEGORIES: XactimateCategory[] = [
  { id: '1', organization_id: '', category_code: 'RFG', category_name: 'Roofing', sort_order: 1, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '2', organization_id: '', category_code: 'SID', category_name: 'Siding', sort_order: 2, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '3', organization_id: '', category_code: 'GTR', category_name: 'Gutters', sort_order: 3, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '4', organization_id: '', category_code: 'INT', category_name: 'Interior', sort_order: 4, is_active: true, is_system: true, created_at: '', updated_at: '' },
  { id: '5', organization_id: '', category_code: 'DMO', category_name: 'Demo/Tear Off', sort_order: 5, is_active: true, is_system: true, created_at: '', updated_at: '' }
];

const XactimatePricing: React.FC<XactimatePricingProps> = ({ organizationId }) => {
  // Check if we're in demo mode (no org ID)
  const isDemoMode = !organizationId;

  // Data state
  const [lineItems, setLineItems] = useState<XactimateLineItem[]>([]);
  const [categories, setCategories] = useState<XactimateCategory[]>(isDemoMode ? DEMO_CATEGORIES : []);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<XactimateLineItem | null>(null);
  const [sortField, setSortField] = useState<keyof XactimateLineItem>('item_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Loading/error state
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedExcelLineItem[] | null>(null);
  const [importStats, setImportStats] = useState<{ total: number; categories: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load data on mount
  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadData = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load categories first
      let cats = await getXactimateCategories(organizationId);

      // If no categories exist, initialize defaults
      if (cats.length === 0) {
        await initializeDefaultCategories(organizationId);
        cats = await getXactimateCategories(organizationId);
      }
      setCategories(cats);

      // Load line items
      const { items, total } = await getXactimateLineItems(organizationId, {
        search: searchTerm || undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setLineItems(items);
      setTotalCount(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing data');
      console.error('Error loading pricing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload when filters change
  useEffect(() => {
    if (organizationId && !isLoading) {
      const debounce = setTimeout(() => {
        loadData();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [searchTerm, selectedCategory]);

  // Filter and sort items locally for immediate feedback
  const filteredItems = useMemo(() => {
    let items = [...lineItems];

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
  }, [lineItems, sortField, sortDirection]);

  const handleSort = (field: keyof XactimateLineItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.item_code || !newItem.description) return;

    setIsSaving(true);
    setError(null);

    try {
      // Calculate total unit price from components
      const totalPrice =
        (newItem.material_price || 0) +
        (newItem.labor_price || 0) +
        (newItem.equipment_price || 0);

      if (isDemoMode) {
        // Demo mode - add to local state only
        const demoItem: XactimateLineItem = {
          id: `demo-${Date.now()}`,
          organization_id: '',
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
          updated_at: new Date().toISOString(),
        };

        setLineItems([...lineItems, demoItem]);
        setTotalCount(totalCount + 1);
        setSuccessMessage('Line item added (Demo Mode)');
      } else {
        const item = await createXactimateLineItem({
          organization_id: organizationId!,
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
        });

        setLineItems([...lineItems, item]);
        setSuccessMessage('Line item created successfully');
      }

      setShowAddModal(false);
      resetNewItemForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create line item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    setIsSaving(true);
    setError(null);

    try {
      // Recalculate total price
      const totalPrice =
        editingItem.material_price +
        editingItem.labor_price +
        editingItem.equipment_price;

      if (isDemoMode) {
        // Demo mode - update local state only
        setLineItems(
          lineItems.map(item =>
            item.id === editingItem.id
              ? { ...editingItem, unit_price: totalPrice, updated_at: new Date().toISOString() }
              : item
          )
        );
        setSuccessMessage('Line item updated (Demo Mode)');
      } else {
        const updated = await updateXactimateLineItem(editingItem.id, {
          ...editingItem,
          unit_price: totalPrice,
        });

        setLineItems(
          lineItems.map(item =>
            item.id === editingItem.id ? updated : item
          )
        );
        setSuccessMessage('Line item updated successfully');
      }
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update line item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;

    setIsSaving(true);
    setError(null);

    try {
      if (isDemoMode) {
        // Demo mode - remove from local state only
        setLineItems(lineItems.filter(item => item.id !== id));
        setTotalCount(totalCount - 1);
        setSuccessMessage('Line item deleted (Demo Mode)');
      } else {
        await deleteXactimateLineItem(id);
        setLineItems(lineItems.filter(item => item.id !== id));
        setSuccessMessage('Line item deleted successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete line item');
    } finally {
      setIsSaving(false);
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

  // Excel Import handlers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      const result = await parseExcelFromFile(file);

      if (!result.success) {
        throw new Error(result.summary.parseErrors.map(e => e.message).join(', '));
      }

      setImportPreview(result.lineItems);
      setImportStats({
        total: result.lineItems.length,
        categories: result.summary.categorySummary.length,
      });
      setShowImportModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportConfirm = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    setError(null);

    try {
      if (isDemoMode) {
        // In demo mode, just add to local state (data won't persist)
        const demoItems: XactimateLineItem[] = importPreview.map((item, index) => ({
          id: `demo-${Date.now()}-${index}`,
          organization_id: '',
          item_code: item.itemCode,
          selector_code: item.selectorCode,
          category_id: categories.find(c => c.category_code === item.categoryCode)?.id,
          description: item.description,
          unit: item.unit as UnitOfMeasure,
          unit_price: item.unitCost,
          material_price: item.materialCost,
          labor_price: item.laborCost + item.laborOverhead,
          equipment_price: item.equipmentCost,
          labor_hours: item.laborMinimum,
          waste_factor: 0,
          is_active: true,
          is_taxable: item.isTaxable,
          is_o_and_p_eligible: true,
          price_source: 'xactimate_import',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        setLineItems(demoItems);
        setTotalCount(demoItems.length);
        setSuccessMessage(`Loaded ${demoItems.length} items (Demo Mode - data will not persist)`);
      } else {
        // Connected mode - save to database
        const itemsToImport = importPreview.map(item => ({
          itemCode: item.itemCode,
          description: item.description,
          unit: item.unit,
          unitPrice: item.unitCost,
          materialPrice: item.materialCost,
          laborPrice: item.laborCost + item.laborOverhead,
          equipmentPrice: item.equipmentCost,
          laborHours: item.laborMinimum,
          wasteFactor: 0,
          categoryCode: item.categoryCode,
          selectorCode: item.selectorCode,
          usefulLife: item.usefulLife,
          depreciationPercent: item.depreciationPercent,
          isTaxable: item.isTaxable,
          rawData: item.rawData,
        }));

        const result = await importXactimateFromExcel(organizationId!, itemsToImport, {
          priceSource: 'xactimate_import',
        });

        if (result.errors.length > 0) {
          console.warn('Import errors:', result.errors);
        }

        setSuccessMessage(`Successfully imported ${result.created} line items to database`);

        // Reload data
        await loadData();
      }

      setShowImportModal(false);
      setImportPreview(null);
      setImportStats(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setImportPreview(null);
    setImportStats(null);
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

  // Show loading state
  if (isLoading && lineItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-slate-400">Loading pricing data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-300 text-sm">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Import Excel
          </button>
          <button
            onClick={() => downloadTemplate()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      {isDemoMode ? (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-medium">Demo Mode - Data Not Persisted</p>
            <p className="text-amber-400/80 text-xs mt-1">
              No organization ID configured. Import your Excel file to preview the data.
              To save data permanently, configure your Supabase connection and organization.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 flex items-start gap-3">
          <Calculator className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-300 font-medium">Xactimate Line Items - Database Connected</p>
            <p className="text-blue-400/80 text-xs mt-1">
              Your pricing data is stored in the database. Import Excel files from Xactimate exports to populate your price list.
              Items can be combined into macros for quick estimate generation.
            </p>
          </div>
        </div>
      )}

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

        {filteredItems.length === 0 && !isLoading && (
          <div className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No line items found</p>
            <p className="text-sm text-slate-500 mt-1">Add items manually or import from Excel</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Showing {filteredItems.length} of {totalCount} items</span>
        <span className="text-xs text-slate-500">
          {isDemoMode ? 'Demo mode - import Excel to load data' : 'Data synced with database'}
        </span>
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
                disabled={isSaving}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Import Preview
              </h3>
              <button
                onClick={handleImportCancel}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-700 bg-slate-900/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs uppercase">Total Items</p>
                  <p className="text-2xl font-bold text-white mt-1">{importStats?.total}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs uppercase">Categories</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">{importStats?.categories}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-center">Unit</th>
                    <th className="px-3 py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {importPreview.slice(0, 50).map((item, index) => (
                    <tr key={index} className="hover:bg-slate-700/20">
                      <td className="px-3 py-2">
                        <span className="font-mono text-cyan-400">{item.itemCode}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">{item.categoryCode}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-200 max-w-xs truncate">{item.description}</td>
                      <td className="px-3 py-2 text-center text-slate-400">{item.unit}</td>
                      <td className="px-3 py-2 text-right text-emerald-400">{formatCurrency(item.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 50 && (
                <p className="text-center text-slate-500 text-sm mt-4">
                  Showing first 50 of {importPreview.length} items
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Items with matching codes will be updated
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleImportCancel}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={isImporting}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import {importPreview.length} Items to Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XactimatePricing;
