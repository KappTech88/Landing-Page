import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Users,
  Truck,
  Wrench,
  Package,
  FileText,
  Calculator,
  Layers,
  Plus
} from 'lucide-react';
import { ProductionPricingCategory, VendorSubCategory } from '../../../types';
import XactimatePricing from './XactimatePricing';
import MacroBuilder from './MacroBuilder';
import VendorManagement from './VendorManagement';
import WorkOrderPricingList from './WorkOrderPricingList';

interface ProductionPricingSettingsProps {
  organizationId?: string;
}

interface CategoryItem {
  id: ProductionPricingCategory;
  label: string;
  icon: React.ElementType;
  description: string;
  subItems?: {
    id: VendorSubCategory;
    label: string;
    icon: React.ElementType;
    description: string;
  }[];
}

const ProductionPricingSettings: React.FC<ProductionPricingSettingsProps> = ({ organizationId }) => {
  const [expandedCategory, setExpandedCategory] = useState<ProductionPricingCategory | null>('xactimate-pricing');
  const [activeCategory, setActiveCategory] = useState<ProductionPricingCategory>('xactimate-pricing');
  const [activeSubCategory, setActiveSubCategory] = useState<VendorSubCategory | null>(null);

  const categories: CategoryItem[] = [
    {
      id: 'vendors',
      label: 'Vendors',
      icon: Users,
      description: 'Manage subcontractors and suppliers',
      subItems: [
        {
          id: 'subcontractors',
          label: 'Sub Contractors',
          icon: Wrench,
          description: 'Labor rates and crew management'
        },
        {
          id: 'suppliers',
          label: 'Suppliers',
          icon: Truck,
          description: 'Material vendors and pricing'
        }
      ]
    },
    {
      id: 'work-order-pricing',
      label: 'Work Order Pricing',
      icon: FileText,
      description: 'Standard pricing for work orders'
    },
    {
      id: 'xactimate-pricing',
      label: 'Xactimate Pricing',
      icon: Calculator,
      description: 'Xactimate line items and pricing'
    },
    {
      id: 'macros',
      label: 'Macros',
      icon: Layers,
      description: 'Grouped line items for estimates'
    }
  ];

  const handleCategoryClick = (category: CategoryItem) => {
    if (category.subItems) {
      // Toggle expansion for categories with sub-items
      setExpandedCategory(expandedCategory === category.id ? null : category.id);
    } else {
      setActiveCategory(category.id);
      setActiveSubCategory(null);
      setExpandedCategory(null);
    }
  };

  const handleSubCategoryClick = (categoryId: ProductionPricingCategory, subCategoryId: VendorSubCategory) => {
    setActiveCategory(categoryId);
    setActiveSubCategory(subCategoryId);
  };

  const renderContent = () => {
    if (activeCategory === 'vendors' && activeSubCategory) {
      return (
        <VendorManagement
          organizationId={organizationId}
          vendorType={activeSubCategory}
        />
      );
    }

    switch (activeCategory) {
      case 'xactimate-pricing':
        return <XactimatePricing organizationId={organizationId} />;
      case 'macros':
        return <MacroBuilder organizationId={organizationId} />;
      case 'work-order-pricing':
        return <WorkOrderPricingList organizationId={organizationId} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <p className="mb-2">Select a category from the menu</p>
            <p className="text-sm text-slate-500">Choose a pricing category to view and manage items</p>
          </div>
        );
    }
  };

  const getActiveTitle = () => {
    if (activeCategory === 'vendors' && activeSubCategory) {
      const category = categories.find(c => c.id === 'vendors');
      const subItem = category?.subItems?.find(s => s.id === activeSubCategory);
      return subItem?.label || 'Vendors';
    }
    const category = categories.find(c => c.id === activeCategory);
    return category?.label || 'Production & Pricing';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-white">Production & Pricing</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure pricing for materials, labor, and Xactimate line items
        </p>
      </div>

      <div className="flex">
        {/* Category Navigation */}
        <div className="w-64 border-r border-slate-700/50 bg-slate-900/30">
          <div className="p-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2">
              Categories
            </p>
            {categories.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategory === category.id;
              const isActive = activeCategory === category.id && !activeSubCategory;
              const hasSubItems = category.subItems && category.subItems.length > 0;

              return (
                <div key={category.id}>
                  <button
                    onClick={() => handleCategoryClick(category)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1 transition-all text-left ${
                      isActive
                        ? 'bg-cyan-600/20 border border-cyan-500/30'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    {hasSubItems ? (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )
                    ) : (
                      <div className="w-4" />
                    )}
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${isActive ? 'text-cyan-400' : 'text-slate-200'}`}>
                      {category.label}
                    </span>
                  </button>

                  {/* Sub Items */}
                  {hasSubItems && isExpanded && (
                    <div className="ml-6 mb-2">
                      {category.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeCategory === category.id && activeSubCategory === subItem.id;

                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleSubCategoryClick(category.id, subItem.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all text-left ${
                              isSubActive
                                ? 'bg-cyan-600/20 border border-cyan-500/30'
                                : 'hover:bg-slate-700/50'
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${isSubActive ? 'text-cyan-400' : 'text-slate-300'}`}>
                                {subItem.label}
                              </span>
                              <p className="text-xs text-slate-500 truncate">{subItem.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Content Header */}
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-md font-medium text-white">{getActiveTitle()}</h3>
          </div>

          {/* Content */}
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPricingSettings;
