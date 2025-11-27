import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  Users,
  Truck,
  Phone,
  Mail,
  MapPin,
  Star,
  DollarSign,
  Building2,
  Wrench,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Crew, Supplier, VendorLaborRate, VendorMaterialPricing, VendorSubCategory } from '../../../types';

interface VendorManagementProps {
  organizationId?: string;
  vendorType: VendorSubCategory;
}

// Sample subcontractors (crews with is_subcontractor=true)
const SAMPLE_SUBCONTRACTORS: Crew[] = [
  {
    id: '1',
    organization_id: '',
    crew_name: 'ABC Roofing Crew',
    crew_code: 'ABC-001',
    crew_type: 'subcontractor',
    trade: 'roofing',
    crew_lead_name: 'Mike Johnson',
    crew_lead_phone: '(555) 123-4567',
    crew_lead_email: 'mike@abcroofing.com',
    crew_size: 5,
    daily_capacity_squares: 15,
    is_subcontractor: true,
    company_name: 'ABC Roofing Services LLC',
    pay_type: 'per_square',
    per_square_rate: 85.00,
    quality_rating: 4.5,
    reliability_rating: 4.8,
    total_jobs_completed: 127,
    is_active: true,
    availability_status: 'available',
    color_code: '#10B981',
    certifications: ['GAF Certified', 'OSHA 10'],
    created_at: '',
    updated_at: ''
  },
  {
    id: '2',
    organization_id: '',
    crew_name: 'Pro Siding Team',
    crew_code: 'PRO-002',
    crew_type: 'subcontractor',
    trade: 'siding',
    crew_lead_name: 'Carlos Rivera',
    crew_lead_phone: '(555) 234-5678',
    crew_lead_email: 'carlos@prosiding.com',
    crew_size: 4,
    is_subcontractor: true,
    company_name: 'Pro Siding Specialists',
    pay_type: 'per_square',
    per_square_rate: 95.00,
    quality_rating: 4.2,
    reliability_rating: 4.5,
    total_jobs_completed: 89,
    is_active: true,
    availability_status: 'busy',
    color_code: '#3B82F6',
    certifications: ['James Hardie Certified'],
    created_at: '',
    updated_at: ''
  }
];

// Sample suppliers
const SAMPLE_SUPPLIERS: Supplier[] = [
  {
    id: '1',
    organization_id: '',
    supplier_name: 'ABC Supply Co.',
    supplier_code: 'ABC-SUP',
    supplier_type: 'distributor',
    primary_contact_name: 'John Smith',
    primary_contact_phone: '(555) 111-2222',
    primary_contact_email: 'john.smith@abcsupply.com',
    main_phone: '(555) 111-0000',
    website: 'www.abcsupply.com',
    address_line1: '123 Industrial Blvd',
    city: 'Dallas',
    state: 'TX',
    zip_code: '75201',
    account_number: 'ACC-12345',
    credit_limit: 50000,
    payment_terms: 'net_30',
    tax_exempt: false,
    product_categories: ['shingles', 'underlayment', 'flashing', 'ventilation'],
    brands_carried: ['GAF', 'Owens Corning', 'CertainTeed'],
    offers_delivery: true,
    delivery_fee: 75.00,
    free_delivery_minimum: 2500.00,
    typical_lead_time_days: 1,
    price_rating: 4,
    service_rating: 5,
    delivery_rating: 4,
    is_preferred: true,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: '2',
    organization_id: '',
    supplier_name: 'SRS Distribution',
    supplier_code: 'SRS-001',
    supplier_type: 'distributor',
    primary_contact_name: 'Sarah Williams',
    primary_contact_phone: '(555) 333-4444',
    primary_contact_email: 'sarah@srsdist.com',
    main_phone: '(555) 333-0000',
    website: 'www.srsdistribution.com',
    address_line1: '456 Commerce Dr',
    city: 'Fort Worth',
    state: 'TX',
    zip_code: '76102',
    account_number: 'SRS-67890',
    credit_limit: 75000,
    payment_terms: 'net_30',
    tax_exempt: false,
    product_categories: ['shingles', 'metal roofing', 'gutters'],
    brands_carried: ['Atlas', 'Tamko', 'IKO'],
    offers_delivery: true,
    delivery_fee: 50.00,
    free_delivery_minimum: 2000.00,
    typical_lead_time_days: 1,
    price_rating: 5,
    service_rating: 4,
    delivery_rating: 5,
    is_preferred: false,
    is_active: true,
    created_at: '',
    updated_at: ''
  }
];

const VendorManagement: React.FC<VendorManagementProps> = ({ organizationId, vendorType }) => {
  const [subcontractors, setSubcontractors] = useState<Crew[]>(SAMPLE_SUBCONTRACTORS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(SAMPLE_SUPPLIERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Crew | Supplier | null>(null);

  const isSubcontractorView = vendorType === 'subcontractors';

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const items = isSubcontractorView ? subcontractors : suppliers;
    if (!searchTerm) return items;

    const search = searchTerm.toLowerCase();
    if (isSubcontractorView) {
      return (items as Crew[]).filter(
        item =>
          item.crew_name.toLowerCase().includes(search) ||
          item.company_name?.toLowerCase().includes(search) ||
          item.crew_lead_name?.toLowerCase().includes(search)
      );
    } else {
      return (items as Supplier[]).filter(
        item =>
          item.supplier_name.toLowerCase().includes(search) ||
          item.primary_contact_name?.toLowerCase().includes(search)
      );
    }
  }, [isSubcontractorView, subcontractors, suppliers, searchTerm]);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
            }`}
          />
        ))}
        <span className="text-xs text-slate-400 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      if (isSubcontractorView) {
        setSubcontractors(subcontractors.filter(s => s.id !== id));
      } else {
        setSuppliers(suppliers.filter(s => s.id !== id));
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className={`${isSubcontractorView ? 'bg-orange-900/20 border-orange-700/30' : 'bg-green-900/20 border-green-700/30'} border rounded-lg p-3 flex items-start gap-3`}>
        {isSubcontractorView ? (
          <Wrench className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Truck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          <p className={`${isSubcontractorView ? 'text-orange-300' : 'text-green-300'} font-medium`}>
            {isSubcontractorView ? 'Sub Contractors - Labor' : 'Suppliers - Materials'}
          </p>
          <p className={`${isSubcontractorView ? 'text-orange-400/80' : 'text-green-400/80'} text-xs mt-1`}>
            {isSubcontractorView
              ? 'Manage your subcontractor crews, labor rates, and track their performance. Labor rates can be linked to Xactimate line items.'
              : 'Manage material suppliers, pricing, and account information. Supplier pricing can be linked to your product catalog.'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${isSubcontractorView ? 'subcontractors' : 'suppliers'}...`}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {isSubcontractorView ? 'Subcontractor' : 'Supplier'}
        </button>
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isSubcontractorView ? (
          // Subcontractor Cards
          (filteredItems as Crew[]).map((crew) => (
            <div
              key={crew.id}
              className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden hover:border-slate-600/50 transition-colors"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: crew.color_code + '20', borderColor: crew.color_code }}
                    >
                      <Users className="w-5 h-5" style={{ color: crew.color_code }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{crew.crew_name}</h4>
                      <p className="text-xs text-slate-400">{crew.company_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {crew.trade}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          crew.availability_status === 'available'
                            ? 'bg-green-900/30 text-green-400'
                            : crew.availability_status === 'busy'
                            ? 'bg-amber-900/30 text-amber-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {crew.availability_status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingVendor(crew)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(crew.id)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-3 space-y-1.5">
                  {crew.crew_lead_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{crew.crew_lead_name} (Lead)</span>
                    </div>
                  )}
                  {crew.crew_lead_phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{crew.crew_lead_phone}</span>
                    </div>
                  )}
                  {crew.crew_lead_email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{crew.crew_lead_email}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Rate</p>
                    <p className="text-sm font-medium text-emerald-400">
                      {formatCurrency(crew.per_square_rate)}/SQ
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jobs</p>
                    <p className="text-sm font-medium text-slate-200">{crew.total_jobs_completed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Quality</p>
                    {renderStars(crew.quality_rating)}
                  </div>
                </div>

                {/* Certifications */}
                {crew.certifications && crew.certifications.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {crew.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          // Supplier Cards
          (filteredItems as Supplier[]).map((supplier) => (
            <div
              key={supplier.id}
              className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden hover:border-slate-600/50 transition-colors"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-white">{supplier.supplier_name}</h4>
                        {supplier.is_preferred && (
                          <span className="text-xs bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400" />
                            Preferred
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{supplier.supplier_code}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {supplier.supplier_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingVendor(supplier)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-3 space-y-1.5">
                  {supplier.primary_contact_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{supplier.primary_contact_name}</span>
                    </div>
                  )}
                  {supplier.main_phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{supplier.main_phone}</span>
                    </div>
                  )}
                  {supplier.address_line1 && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{supplier.city}, {supplier.state}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Credit Limit</p>
                    <p className="text-sm font-medium text-emerald-400">
                      {formatCurrency(supplier.credit_limit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Terms</p>
                    <p className="text-sm font-medium text-slate-200">{supplier.payment_terms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Service</p>
                    {renderStars(supplier.service_rating || 0)}
                  </div>
                </div>

                {/* Brands */}
                {supplier.brands_carried && supplier.brands_carried.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1">Brands</p>
                    <div className="flex flex-wrap gap-1">
                      {supplier.brands_carried.map((brand, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Info */}
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {supplier.offers_delivery ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-xs text-slate-400">
                      {supplier.offers_delivery ? 'Delivery Available' : 'No Delivery'}
                    </span>
                  </div>
                  {supplier.offers_delivery && supplier.delivery_fee && (
                    <span className="text-xs text-slate-400">
                      {formatCurrency(supplier.delivery_fee)} fee
                      {supplier.free_delivery_minimum && ` (Free over ${formatCurrency(supplier.free_delivery_minimum)})`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredItems.length === 0 && (
        <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 py-12 text-center">
          {isSubcontractorView ? (
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          ) : (
            <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          )}
          <p className="text-slate-400">No {isSubcontractorView ? 'subcontractors' : 'suppliers'} found</p>
          <p className="text-sm text-slate-500 mt-1">Add your first vendor to get started</p>
        </div>
      )}

      {/* Add/Edit Modal (simplified for now) */}
      {(showAddModal || editingVendor) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingVendor ? 'Edit' : 'Add'} {isSubcontractorView ? 'Subcontractor' : 'Supplier'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingVendor(null);
                }}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-slate-400 text-sm text-center py-8">
                Full vendor form will be implemented with database integration.
                <br />
                This includes contact info, rates, and account details.
              </p>
            </div>

            <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingVendor(null);
                }}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingVendor(null);
                }}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;
