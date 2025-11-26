import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Building2,
  Tag,
  User,
  Calendar,
  DollarSign,
  ChevronDown,
  X,
  Edit2,
  Trash2,
  Eye,
  Star,
  StarOff,
} from 'lucide-react';
import { CRMContact, ContactType, ContactStatus } from '../../types';

const CRMContacts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ContactType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ContactStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [contacts] = useState<CRMContact[]>([
    {
      id: '1',
      organization_id: 'org-1',
      contact_type: 'customer',
      status: 'qualified',
      first_name: 'John',
      last_name: 'Smith',
      full_name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(214) 555-0123',
      company: 'Smith Properties LLC',
      address_line1: '1234 Oak Street',
      city: 'Dallas',
      state: 'TX',
      zip_code: '75201',
      source: 'Referral',
      tags: ['High Value', 'VIP'],
      total_value: 45000,
      last_contacted: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: 'org-1',
      contact_type: 'lead',
      status: 'new',
      first_name: 'Sarah',
      last_name: 'Johnson',
      full_name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(972) 555-0456',
      address_line1: '567 Pine Avenue',
      city: 'Fort Worth',
      state: 'TX',
      zip_code: '76102',
      source: 'Website',
      tags: ['Storm Damage'],
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      organization_id: 'org-1',
      contact_type: 'adjuster',
      status: 'contacted',
      first_name: 'Mike',
      last_name: 'Williams',
      full_name: 'Mike Williams',
      email: 'mwilliams@statefarm.com',
      phone: '(469) 555-0789',
      company: 'State Farm Insurance',
      job_title: 'Senior Claims Adjuster',
      city: 'Plano',
      state: 'TX',
      source: 'Insurance Partner',
      tags: ['State Farm', 'Priority'],
      created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      organization_id: 'org-1',
      contact_type: 'customer',
      status: 'won',
      first_name: 'Emily',
      last_name: 'Davis',
      full_name: 'Emily Davis',
      email: 'emily.davis@email.com',
      phone: '(817) 555-0321',
      address_line1: '890 Elm Drive',
      city: 'Arlington',
      state: 'TX',
      zip_code: '76011',
      source: 'Google Ads',
      tags: ['Roof Replacement', 'Completed'],
      total_value: 28500,
      last_contacted: new Date(Date.now() - 86400000 * 7).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      organization_id: 'org-1',
      contact_type: 'vendor',
      status: 'qualified',
      first_name: 'Robert',
      last_name: 'Martinez',
      full_name: 'Robert Martinez',
      email: 'robert@abcroofing.com',
      phone: '(214) 555-0654',
      company: 'ABC Roofing Supplies',
      job_title: 'Account Manager',
      city: 'Dallas',
      state: 'TX',
      source: 'Trade Show',
      tags: ['Supplier', 'Materials'],
      created_at: new Date(Date.now() - 86400000 * 120).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const [newContact, setNewContact] = useState<Partial<CRMContact>>({
    contact_type: 'lead',
    status: 'new',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const contactTypes: { value: ContactType | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All Types', color: 'bg-slate-500' },
    { value: 'lead', label: 'Leads', color: 'bg-blue-500' },
    { value: 'customer', label: 'Customers', color: 'bg-emerald-500' },
    { value: 'adjuster', label: 'Adjusters', color: 'bg-purple-500' },
    { value: 'vendor', label: 'Vendors', color: 'bg-amber-500' },
    { value: 'insurance_company', label: 'Insurance', color: 'bg-rose-500' },
  ];

  const statusOptions: { value: ContactStatus | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All Status', color: 'bg-slate-500' },
    { value: 'new', label: 'New', color: 'bg-blue-500' },
    { value: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
    { value: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
    { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-amber-500' },
    { value: 'negotiating', label: 'Negotiating', color: 'bg-orange-500' },
    { value: 'won', label: 'Won', color: 'bg-emerald-500' },
    { value: 'lost', label: 'Lost', color: 'bg-rose-500' },
  ];

  const getTypeColor = (type: ContactType) => {
    const colors: Record<ContactType, string> = {
      lead: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      customer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      adjuster: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      vendor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      insurance_company: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return colors[type];
  };

  const getStatusColor = (status: ContactStatus) => {
    const colors: Record<ContactStatus, string> = {
      new: 'bg-blue-500/20 text-blue-300',
      contacted: 'bg-cyan-500/20 text-cyan-300',
      qualified: 'bg-purple-500/20 text-purple-300',
      proposal_sent: 'bg-amber-500/20 text-amber-300',
      negotiating: 'bg-orange-500/20 text-orange-300',
      won: 'bg-emerald-500/20 text-emerald-300',
      lost: 'bg-rose-500/20 text-rose-300',
    };
    return colors[status];
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedFilter === 'all' || contact.contact_type === selectedFilter;
    const matchesStatus = selectedStatus === 'all' || contact.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-slate-400 mt-1">{filteredContacts.length} contacts found</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search contacts by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-all"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as ContactType | 'all')}
            className="appearance-none pl-4 pr-10 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            {contactTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ContactStatus | 'all')}
            className="appearance-none pl-4 pr-10 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Contacts List */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 bg-slate-700/30 border-b border-white/10 text-xs font-medium text-slate-400 uppercase tracking-wider">
          <div className="col-span-3">Contact</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Location</div>
          <div className="col-span-2">Value</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Contact Rows */}
        <div className="divide-y divide-white/5">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => setSelectedContact(contact)}
            >
              <div className="lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
                {/* Contact Info */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {contact.first_name[0]}{contact.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{contact.full_name}</p>
                    <p className="text-slate-400 text-xs truncate">{contact.email}</p>
                    {contact.company && (
                      <p className="text-slate-500 text-xs truncate lg:hidden">{contact.company}</p>
                    )}
                  </div>
                </div>

                {/* Type */}
                <div className="col-span-2 mt-2 lg:mt-0">
                  <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium border ${getTypeColor(contact.contact_type)}`}>
                    {contact.contact_type}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2 mt-2 lg:mt-0">
                  <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(contact.status)}`}>
                    {contact.status}
                  </span>
                </div>

                {/* Location */}
                <div className="col-span-2 hidden lg:block">
                  {contact.city && contact.state && (
                    <p className="text-slate-300 text-sm">{contact.city}, {contact.state}</p>
                  )}
                </div>

                {/* Value */}
                <div className="col-span-2 hidden lg:block">
                  {contact.total_value ? (
                    <p className="text-emerald-400 font-medium">{formatCurrency(contact.total_value)}</p>
                  ) : (
                    <p className="text-slate-500">-</p>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-end gap-1 mt-3 lg:mt-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `mailto:${contact.email}`;
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${contact.phone}`;
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 lg:ml-13">
                  {contact.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredContacts.length === 0 && (
          <div className="px-5 py-12 text-center">
            <User className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No contacts found</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Add New Contact</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Contact Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Contact Type</label>
                <select
                  value={newContact.contact_type}
                  onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value as ContactType })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                  <option value="adjuster">Adjuster</option>
                  <option value="vendor">Vendor</option>
                  <option value="insurance_company">Insurance Company</option>
                </select>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
                  <input
                    type="text"
                    value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={newContact.last_name}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="Smith"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="john@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="(214) 555-0123"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company (Optional)</label>
                <input
                  type="text"
                  value={newContact.company || ''}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="ABC Company"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address (Optional)</label>
                <input
                  type="text"
                  value={newContact.address_line1 || ''}
                  onChange={(e) => setNewContact({ ...newContact, address_line1: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="1234 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <input
                    type="text"
                    value={newContact.city || ''}
                    onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="City"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={newContact.state || ''}
                    onChange={(e) => setNewContact({ ...newContact, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="State"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={newContact.zip_code || ''}
                    onChange={(e) => setNewContact({ ...newContact, zip_code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all">
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {selectedContact.first_name[0]}{selectedContact.last_name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedContact.full_name}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${getTypeColor(selectedContact.contact_type)}`}>
                      {selectedContact.contact_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(selectedContact.status)}`}>
                      {selectedContact.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                  <Mail className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-white">{selectedContact.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-white">{selectedContact.phone}</p>
                  </div>
                </div>
                {selectedContact.company && (
                  <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-xs text-slate-400">Company</p>
                      <p className="text-white">{selectedContact.company}</p>
                    </div>
                  </div>
                )}
                {selectedContact.city && (
                  <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                    <MapPin className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-xs text-slate-400">Location</p>
                      <p className="text-white">{selectedContact.city}, {selectedContact.state}</p>
                    </div>
                  </div>
                )}
                {selectedContact.total_value && (
                  <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs text-slate-400">Total Value</p>
                      <p className="text-emerald-400 font-medium">{formatCurrency(selectedContact.total_value)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-xs text-slate-400">Created</p>
                    <p className="text-white">{formatDate(selectedContact.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedContact.tags && selectedContact.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl hover:bg-cyan-500/30 transition-colors">
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl hover:bg-emerald-500/30 transition-colors">
                  <Phone className="w-4 h-4" />
                  Call
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-colors">
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMContacts;
