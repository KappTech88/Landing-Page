/**
 * Pricing Service
 * Database operations for Xactimate pricing, macros, work orders, and vendor pricing
 */

import { supabase } from '../lib/supabase';
import type {
  XactimateCategory,
  XactimateLineItem,
  PricingMacro,
  PricingMacroItem,
  WorkOrderPricing,
  VendorLaborRate,
  VendorMaterialPricing,
  UnitOfMeasure,
  PriceSource,
} from '../types';

// ============= XACTIMATE CATEGORIES =============

/**
 * Get all active categories for an organization
 */
export const getXactimateCategories = async (organizationId: string): Promise<XactimateCategory[]> => {
  const { data, error } = await supabase
    .from('xactimate_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Create a new category
 */
export const createXactimateCategory = async (
  category: Omit<XactimateCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<XactimateCategory> => {
  const { data, error } = await supabase
    .from('xactimate_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Initialize default categories for a new organization
 */
export const initializeDefaultCategories = async (organizationId: string): Promise<void> => {
  const { error } = await supabase.rpc('create_default_xactimate_categories', {
    p_organization_id: organizationId,
  });

  if (error) throw error;
};

// ============= XACTIMATE LINE ITEMS =============

/**
 * Get all line items for an organization
 */
export const getXactimateLineItems = async (
  organizationId: string,
  options?: {
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  }
): Promise<{ items: XactimateLineItem[]; total: number }> => {
  let query = supabase
    .from('xactimate_line_items')
    .select('*, category:xactimate_categories(*)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }

  if (options?.search) {
    query = query.or(`item_code.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  query = query.order('item_code', { ascending: true });

  if (options?.limit) {
    query = query.range(
      options.offset || 0,
      (options.offset || 0) + options.limit - 1
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { items: data || [], total: count || 0 };
};

/**
 * Get a single line item by ID
 */
export const getXactimateLineItem = async (id: string): Promise<XactimateLineItem | null> => {
  const { data, error } = await supabase
    .from('xactimate_line_items')
    .select('*, category:xactimate_categories(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
};

/**
 * Create a new line item
 */
export const createXactimateLineItem = async (
  item: Omit<XactimateLineItem, 'id' | 'created_at' | 'updated_at'>
): Promise<XactimateLineItem> => {
  const { data, error } = await supabase
    .from('xactimate_line_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create multiple line items (bulk import)
 */
export const createXactimateLineItemsBulk = async (
  items: Omit<XactimateLineItem, 'id' | 'created_at' | 'updated_at'>[]
): Promise<{ created: number; errors: string[] }> => {
  const errors: string[] = [];
  let created = 0;

  // Process in batches of 100 to avoid timeout
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('xactimate_line_items')
      .upsert(batch, {
        onConflict: 'organization_id,item_code',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else {
      created += data?.length || 0;
    }
  }

  return { created, errors };
};

/**
 * Update a line item
 */
export const updateXactimateLineItem = async (
  id: string,
  updates: Partial<XactimateLineItem>
): Promise<XactimateLineItem> => {
  const { data, error } = await supabase
    .from('xactimate_line_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Soft delete a line item
 */
export const deleteXactimateLineItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('xactimate_line_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

/**
 * Permanently delete a line item
 */
export const hardDeleteXactimateLineItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('xactimate_line_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= PRICING MACROS =============

/**
 * Get all macros for an organization
 */
export const getPricingMacros = async (
  organizationId: string,
  options?: {
    category?: string;
    tradeType?: string;
    activeOnly?: boolean;
    includeItems?: boolean;
  }
): Promise<PricingMacro[]> => {
  let selectQuery = '*';
  if (options?.includeItems) {
    selectQuery = '*, items:pricing_macro_items(*, xactimate_item:xactimate_line_items(*))';
  }

  let query = supabase
    .from('pricing_macros')
    .select(selectQuery)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.tradeType) {
    query = query.eq('trade_type', options.tradeType);
  }

  query = query.order('macro_name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

/**
 * Create a new macro
 */
export const createPricingMacro = async (
  macro: Omit<PricingMacro, 'id' | 'created_at' | 'updated_at' | 'items'>
): Promise<PricingMacro> => {
  const { data, error } = await supabase
    .from('pricing_macros')
    .insert(macro)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update a macro
 */
export const updatePricingMacro = async (
  id: string,
  updates: Partial<PricingMacro>
): Promise<PricingMacro> => {
  const { data, error } = await supabase
    .from('pricing_macros')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a macro
 */
export const deletePricingMacro = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pricing_macros')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

/**
 * Add item to macro
 */
export const addMacroItem = async (
  item: Omit<PricingMacroItem, 'id' | 'created_at' | 'updated_at'>
): Promise<PricingMacroItem> => {
  const { data, error } = await supabase
    .from('pricing_macro_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update macro item
 */
export const updateMacroItem = async (
  id: string,
  updates: Partial<PricingMacroItem>
): Promise<PricingMacroItem> => {
  const { data, error } = await supabase
    .from('pricing_macro_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Remove item from macro
 */
export const removeMacroItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pricing_macro_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= WORK ORDER PRICING =============

/**
 * Get work order pricing items
 */
export const getWorkOrderPricing = async (
  organizationId: string,
  options?: {
    category?: string;
    search?: string;
    activeOnly?: boolean;
  }
): Promise<WorkOrderPricing[]> => {
  let query = supabase
    .from('work_order_pricing')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    query = query.or(`item_code.ilike.%${options.search}%,item_name.ilike.%${options.search}%`);
  }

  query = query.order('category', { ascending: true }).order('item_name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

/**
 * Create work order pricing item
 */
export const createWorkOrderPricing = async (
  item: Omit<WorkOrderPricing, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkOrderPricing> => {
  const { data, error } = await supabase
    .from('work_order_pricing')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update work order pricing item
 */
export const updateWorkOrderPricing = async (
  id: string,
  updates: Partial<WorkOrderPricing>
): Promise<WorkOrderPricing> => {
  const { data, error } = await supabase
    .from('work_order_pricing')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete work order pricing item
 */
export const deleteWorkOrderPricing = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('work_order_pricing')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// ============= VENDOR LABOR RATES =============

/**
 * Get vendor labor rates
 */
export const getVendorLaborRates = async (
  organizationId: string,
  crewId?: string
): Promise<VendorLaborRate[]> => {
  let query = supabase
    .from('vendor_labor_rates')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .eq('is_active', true);

  if (crewId) {
    query = query.eq('crew_id', crewId);
  }

  query = query.order('trade_type', { ascending: true }).order('rate_name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

/**
 * Create vendor labor rate
 */
export const createVendorLaborRate = async (
  rate: Omit<VendorLaborRate, 'id' | 'created_at' | 'updated_at'>
): Promise<VendorLaborRate> => {
  const { data, error } = await supabase
    .from('vendor_labor_rates')
    .insert(rate)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update vendor labor rate
 */
export const updateVendorLaborRate = async (
  id: string,
  updates: Partial<VendorLaborRate>
): Promise<VendorLaborRate> => {
  const { data, error } = await supabase
    .from('vendor_labor_rates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete vendor labor rate
 */
export const deleteVendorLaborRate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('vendor_labor_rates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// ============= VENDOR MATERIAL PRICING =============

/**
 * Get vendor material pricing
 */
export const getVendorMaterialPricing = async (
  organizationId: string,
  supplierId?: string
): Promise<VendorMaterialPricing[]> => {
  let query = supabase
    .from('vendor_material_pricing')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .eq('is_active', true);

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  query = query.order('category', { ascending: true }).order('product_name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

/**
 * Create vendor material pricing
 */
export const createVendorMaterialPricing = async (
  pricing: Omit<VendorMaterialPricing, 'id' | 'created_at' | 'updated_at'>
): Promise<VendorMaterialPricing> => {
  const { data, error } = await supabase
    .from('vendor_material_pricing')
    .insert(pricing)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update vendor material pricing
 */
export const updateVendorMaterialPricing = async (
  id: string,
  updates: Partial<VendorMaterialPricing>
): Promise<VendorMaterialPricing> => {
  const { data, error } = await supabase
    .from('vendor_material_pricing')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete vendor material pricing
 */
export const deleteVendorMaterialPricing = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('vendor_material_pricing')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// ============= IMPORT HELPERS =============

/**
 * Import Xactimate line items from parsed Excel data
 */
export const importXactimateFromExcel = async (
  organizationId: string,
  parsedItems: Array<{
    itemCode: string;
    description: string;
    unit: string;
    unitPrice: number;
    materialPrice?: number;
    laborPrice?: number;
    equipmentPrice?: number;
    laborHours?: number;
    wasteFactor?: number;
    categoryCode?: string;
    selectorCode?: string;
    usefulLife?: number;
    depreciationPercent?: number;
    isTaxable?: boolean;
    rawData?: Record<string, any>;
  }>,
  options?: {
    priceSource?: PriceSource;
    priceListRegion?: string;
    createdBy?: string;
  }
): Promise<{ created: number; updated: number; errors: string[] }> => {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  // Get or create categories
  const categoryMap = new Map<string, string>();
  const existingCategories = await getXactimateCategories(organizationId);
  existingCategories.forEach((cat) => {
    categoryMap.set(cat.category_code, cat.id);
  });

  // Prepare items for upsert
  const itemsToUpsert: Omit<XactimateLineItem, 'id' | 'created_at' | 'updated_at'>[] = [];

  for (const item of parsedItems) {
    // Find or skip category
    let categoryId: string | undefined;
    if (item.categoryCode && categoryMap.has(item.categoryCode)) {
      categoryId = categoryMap.get(item.categoryCode);
    }

    itemsToUpsert.push({
      organization_id: organizationId,
      item_code: item.itemCode,
      selector_code: item.selectorCode,
      category_id: categoryId,
      description: item.description,
      unit: (item.unit || 'EA') as UnitOfMeasure,
      unit_price: item.unitPrice,
      material_price: item.materialPrice || 0,
      labor_price: item.laborPrice || 0,
      equipment_price: item.equipmentPrice || 0,
      labor_hours: item.laborHours || 0,
      waste_factor: item.wasteFactor || 0,
      useful_life_years: item.usefulLife,
      default_depreciation_percent: item.depreciationPercent,
      price_source: options?.priceSource || 'xactimate_import',
      price_list_region: options?.priceListRegion,
      price_effective_date: new Date().toISOString().split('T')[0],
      is_active: true,
      is_taxable: item.isTaxable ?? true,
      is_o_and_p_eligible: true,
      xactimate_data: item.rawData,
      created_by: options?.createdBy,
    });
  }

  // Upsert in batches
  const batchSize = 100;
  for (let i = 0; i < itemsToUpsert.length; i += batchSize) {
    const batch = itemsToUpsert.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('xactimate_line_items')
      .upsert(batch, {
        onConflict: 'organization_id,item_code',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else if (data) {
      // Count creates vs updates (approximate - Supabase doesn't distinguish)
      created += data.length;
    }
  }

  return { created, updated, errors };
};

// ============= CALCULATION HELPERS =============

/**
 * Calculate estimate from macro using measurements
 */
export const calculateMacroEstimate = async (
  macroId: string,
  measurements: Record<string, number>
): Promise<
  Array<{
    item_code: string;
    description: string;
    unit: string;
    quantity: number;
    unit_price: number;
    material_price: number;
    labor_price: number;
    extended_price: number;
  }>
> => {
  const { data, error } = await supabase.rpc('calculate_macro_estimate', {
    p_macro_id: macroId,
    p_measurements: measurements,
  });

  if (error) throw error;
  return data || [];
};

export default {
  // Categories
  getXactimateCategories,
  createXactimateCategory,
  initializeDefaultCategories,
  // Line Items
  getXactimateLineItems,
  getXactimateLineItem,
  createXactimateLineItem,
  createXactimateLineItemsBulk,
  updateXactimateLineItem,
  deleteXactimateLineItem,
  hardDeleteXactimateLineItem,
  // Macros
  getPricingMacros,
  createPricingMacro,
  updatePricingMacro,
  deletePricingMacro,
  addMacroItem,
  updateMacroItem,
  removeMacroItem,
  // Work Order Pricing
  getWorkOrderPricing,
  createWorkOrderPricing,
  updateWorkOrderPricing,
  deleteWorkOrderPricing,
  // Vendor Labor Rates
  getVendorLaborRates,
  createVendorLaborRate,
  updateVendorLaborRate,
  deleteVendorLaborRate,
  // Vendor Material Pricing
  getVendorMaterialPricing,
  createVendorMaterialPricing,
  updateVendorMaterialPricing,
  deleteVendorMaterialPricing,
  // Import
  importXactimateFromExcel,
  // Calculations
  calculateMacroEstimate,
};
