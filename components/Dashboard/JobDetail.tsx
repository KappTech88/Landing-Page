import React, { useState } from 'react';
import {
  ArrowLeft,
  Upload,
  Camera,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Edit3,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  User,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { ClaimWithDetails, Property } from '../../types';

interface JobDetailProps {
  job?: ClaimWithDetails;
  onBack: () => void;
}

// Mock data for demonstration
const mockJob: ClaimWithDetails & { property: Property; bannerUrl?: string } = {
  id: '1',
  organization_id: 'org-1',
  claim_number: '2122419433',
  internal_reference: 'JOB-001',
  created_by: 'user-1',
  claim_type: 'storm_damage',
  severity: 'moderate',
  priority: 'normal',
  status: 'work_in_progress',
  date_of_loss: '2024-03-15',
  date_reported: '2024-03-16',
  estimated_total: 25000,
  approved_amount: 8000,
  supplement_amount: 0,
  final_amount: 0,
  deductible: 1000,
  description: 'Roof Replacement',
  damage_description: 'Storm damage to roof requiring full replacement',
  scope_of_work: 'Full roof tear-off and replacement with architectural shingles',
  created_at: '2024-03-16T10:00:00Z',
  updated_at: '2024-03-20T15:30:00Z',
  bannerUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=400&fit=crop',
  property: {
    id: 'prop-1',
    claim_id: '1',
    organization_id: 'org-1',
    owner_first_name: 'Money',
    owner_last_name: 'Smith',
    owner_full_name: 'Money Smith',
    owner_email: 'email@trowvapolo.com',
    owner_phone: '+1 (613) 425-2798',
    address_line1: '456 Maple St.',
    city: 'Roof Replace',
    state: 'GA',
    zip_code: '92167',
    full_address: '456 Maple St., Roof Replace, GA 92167',
    property_type: 'residential',
    year_built: 2007,
    square_footage: 350,
    insurance_company: 'Extimations Carrier',
    policy_number: '$123459866',
    created_at: '2024-03-16T10:00:00Z',
    updated_at: '2024-03-16T10:00:00Z',
  }
};

const JobDetail: React.FC<JobDetailProps> = ({ job = mockJob, onBack }) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'files' | 'photos'>('notes');
  const [bannerImage, setBannerImage] = useState<string | null>(job.bannerUrl || null);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBannerImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate progress percentage based on status
  const getProgressPercentage = (status: string): number => {
    const statusProgress: Record<string, number> = {
      'open': 10,
      'assigned': 20,
      'assessment_scheduled': 30,
      'assessment_complete': 40,
      'estimate_in_progress': 50,
      'estimate_submitted': 60,
      'approved': 70,
      'work_in_progress': 80,
      'work_complete': 90,
      'final_inspection': 95,
      'closed': 100,
    };
    return statusProgress[status] || 0;
  };

  const progress = getProgressPercentage(job.status);

  const formatStatus = (status: string): string => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Financial data
  const invoiced = 1000;
  const paid = 0;
  const balance = invoiced - paid;

  return (
    <div className="min-h-full bg-slate-900">
      {/* Banner Section */}
      <div className="relative h-56 bg-slate-800 overflow-hidden group">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt="Property"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No property image</p>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

        {/* Upload button */}
        <label className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm">Upload Photo</span>
          </div>
        </label>

        {/* Job Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                <span className="text-cyan-400">Job:</span> {job.property?.full_address?.split(',')[0]} {job.description}
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-emerald-400 font-semibold">{formatStatus(job.status)}</span>
                <span className="text-slate-400">- {progress}%</span>
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Property & Homeowner Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-semibold text-white">Property & Homeowner Information</h2>
              </div>

              {/* Property Details */}
              <div className="p-6 border-b border-slate-700/50">
                <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  Property Details
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Address</p>
                    <p className="text-slate-200">{job.property?.address_line1}</p>
                    <p className="text-slate-400 text-sm">{job.property?.city}, {job.property?.state} {job.property?.zip_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Year Built</p>
                    <p className="text-slate-200">{job.property?.year_built || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Square Footage</p>
                    <p className="text-slate-200">{job.property?.square_footage?.toLocaleString() || 'N/A'} sq ft</p>
                  </div>
                </div>
              </div>

              {/* Homeowner Contact */}
              <div className="p-6 border-b border-slate-700/50">
                <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  Homeowner Contact
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Name</p>
                    <p className="text-slate-200">{job.property?.owner_full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-slate-200">{job.property?.owner_phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-cyan-400">{job.property?.owner_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Preferred Method</p>
                    <p className="text-slate-200">Promet</p>
                  </div>
                </div>
              </div>

              {/* Claim Information */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Claim Information
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Carrier</p>
                    <p className="text-slate-200">{job.property?.insurance_company || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Policy Number</p>
                    <p className="text-slate-200">{job.property?.policy_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Claim Number</p>
                    <p className="text-slate-200">{job.claim_number}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Job Finances */}
          <div className="space-y-6">
            {/* Job Finances Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Job Finances</h2>
                  <p className="text-slate-500 text-sm mt-1">Summary dashboard with interactive chart. Nee...</p>
                </div>
                <button className="px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  View summary
                </button>
              </div>

              <div className="p-6">
                {/* Finance Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estimate</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(job.estimated_total)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Approved Amount</p>
                    <p className="text-2xl font-bold text-cyan-400">{formatCurrency(job.approved_amount)}</p>
                  </div>
                </div>

                {/* Mini Chart Placeholder */}
                <div className="bg-slate-900/30 rounded-xl p-4 mb-6 border border-slate-700/30">
                  <div className="flex items-end justify-between h-24 gap-2">
                    {/* Estimate bars */}
                    <div className="flex-1 flex items-end gap-1">
                      <div className="flex-1 bg-cyan-500/80 rounded-t h-16"></div>
                      <div className="flex-1 bg-cyan-500/60 rounded-t h-20"></div>
                      <div className="flex-1 bg-cyan-500/40 rounded-t h-12"></div>
                    </div>
                    {/* Approved bars */}
                    <div className="flex-1 flex items-end gap-1">
                      <div className="flex-1 bg-emerald-500/80 rounded-t h-10"></div>
                      <div className="flex-1 bg-emerald-500/60 rounded-t h-14"></div>
                      <div className="flex-1 bg-emerald-500/40 rounded-t h-8"></div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>Plan</span>
                    <span>App</span>
                    <span>Dos</span>
                    <span>Plan</span>
                    <span>App</span>
                    <span>Paid</span>
                  </div>
                </div>

                {/* Invoiced/Paid/Balance */}
                <div className="space-y-3">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Invoiced</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(invoiced)}</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Paid</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(paid)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Balance</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(balance)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes/Files/Photos Tabs */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-700/50">
                {[
                  { id: 'notes', label: 'Notes', icon: MessageSquare },
                  { id: 'files', label: 'Files', icon: FileText },
                  { id: 'photos', label: 'Photos', icon: ImageIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <p className="text-slate-400 text-sm mb-4">
                  Easy access and upload across your {activeTab}.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm border border-slate-600/50">
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
