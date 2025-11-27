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
  CheckCircle,
  Package,
  ClipboardList,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ClaimWithDetails, Property, JOB_STATUS_CONFIG } from '../../types';
import { CommunicationsPanel } from './JobDetail/Communications';
import { StatusBadge } from './shared/StatusBadge';
import { ProgressBar } from './shared/ProgressBar';

interface JobDetailProps {
  job?: ClaimWithDetails;
  onBack: () => void;
  activeTab?: string;
}

// Helper function to display empty values
const displayValue = (value: string | number | undefined | null, suffix?: string): string => {
  if (value === undefined || value === null || value === '') {
    return '--';
  }
  return suffix ? `${value}${suffix}` : String(value);
};

// Mock data for demonstration - includes all fields with some left empty to show placeholders
const mockJob: ClaimWithDetails & { property: Property; bannerUrl?: string } & {
  // Extended job fields
  job_number?: string;
  job_name?: string;
  job_type?: string;
  job_category?: string;
  work_type?: string;
  // Customer contact
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  // Dates
  date_appointment?: string;
  date_sold?: string;
  date_started?: string;
  date_completed?: string;
  target_start_date?: string;
  target_completion_date?: string;
  // Insurance/Adjuster
  adjuster_name?: string;
  adjuster_phone?: string;
  adjuster_email?: string;
  // Team
  sales_rep_name?: string;
  project_manager_name?: string;
  estimator_name?: string;
  // Permit
  permit_number?: string;
  permit_status?: string;
  // Roofing
  roof_type?: string;
  roof_squares?: number;
  roof_pitch?: string;
  shingle_color?: string;
  // Extended financials
  contract_amount?: number;
  material_cost?: number;
  labor_cost?: number;
} = {
  id: '1',
  organization_id: 'org-1',
  // Job identification
  job_number: 'JOB-2024-0147',
  job_name: 'Roof Replacement',
  job_type: 'roofing',
  job_category: 'residential_insurance',
  work_type: 'replacement',
  // Claim info
  claim_number: '2122419433',
  internal_reference: 'JOB-001',
  created_by: 'user-1',
  claim_type: 'storm_damage',
  severity: 'moderate',
  priority: 'normal',
  status: 'work_in_progress',
  date_of_loss: '2024-03-15',
  date_reported: '2024-03-16',
  // Financials
  estimated_total: 25000,
  approved_amount: 8000,
  supplement_amount: 0,
  final_amount: 0,
  deductible: 1000,
  contract_amount: undefined, // Empty - not set yet
  material_cost: undefined, // Empty
  labor_cost: undefined, // Empty
  // Descriptions
  description: 'Roof Replacement',
  damage_description: 'Storm damage to roof requiring full replacement',
  scope_of_work: 'Full roof tear-off and replacement with architectural shingles',
  // Dates
  created_at: '2024-03-16T10:00:00Z',
  updated_at: '2024-03-20T15:30:00Z',
  date_appointment: '2024-03-18',
  date_sold: undefined, // Empty
  date_started: undefined, // Empty
  date_completed: undefined, // Empty
  target_start_date: undefined, // Empty
  target_completion_date: undefined, // Empty
  // Adjuster - some empty
  adjuster_name: undefined, // Empty
  adjuster_phone: undefined, // Empty
  adjuster_email: undefined, // Empty
  // Team - empty
  sales_rep_name: undefined, // Empty
  project_manager_name: undefined, // Empty
  estimator_name: undefined, // Empty
  // Permit - empty
  permit_number: undefined, // Empty
  permit_status: undefined, // Empty
  // Roofing details - some filled
  roof_type: 'Architectural Shingles',
  roof_squares: 28,
  roof_pitch: '6/12',
  shingle_color: undefined, // Empty
  // Banner
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
    // Insurance
    insurance_company: 'Extimations Carrier',
    policy_number: '$123459866',
    // Adjuster fields on property
    adjuster_name: undefined, // Empty
    adjuster_phone: undefined, // Empty
    adjuster_email: undefined, // Empty
    created_at: '2024-03-16T10:00:00Z',
    updated_at: '2024-03-16T10:00:00Z',
  }
};

const JobDetail: React.FC<JobDetailProps> = ({ job = mockJob, onBack, activeTab = 'overview' }) => {
  const [notesFilesTab, setNotesFilesTab] = useState<'notes' | 'files' | 'photos'>('notes');
  const [bannerImage, setBannerImage] = useState<string | null>(job.bannerUrl || null);

  // Panel expanded states
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    jobInfo: false,
    customerProperty: false,
    insuranceClaim: false,
    team: false,
    keyDates: false,
    permit: false,
    financials: false,
  });

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

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

  // Calculate total job amount (use estimated or contract if available)
  const totalJobAmount = job.contract_amount || job.estimated_total || 0;
  const amountDue = balance;

  // Banner component shared across tabs
  const BannerSection = () => (
    <div className="relative h-52 bg-slate-800 overflow-hidden group">
      {bannerImage ? (
        <img
          src={bannerImage}
          alt="Property"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
          <div className="text-center">
            <Camera className="w-8 h-8 text-slate-600 mx-auto mb-1" />
            <p className="text-slate-500 text-xs">No property image</p>
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

      {/* Financial Summary - Top Right */}
      <div className="absolute top-3 right-3 bg-slate-900/70 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
        <div className="text-right">
          <p className="text-xs text-slate-400">Job Total</p>
          <p className="text-lg font-bold text-white">{formatCurrency(totalJobAmount)}</p>
        </div>
        <div className="text-right mt-1 pt-1 border-t border-slate-700/50">
          <p className="text-xs text-slate-400">Amount Due</p>
          <p className="text-lg font-bold text-cyan-400">{formatCurrency(amountDue)}</p>
        </div>
      </div>

      {/* Upload button */}
      <label className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleBannerUpload}
          className="hidden"
        />
        <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs hover:bg-slate-800 transition-colors">
          <Upload className="w-3 h-3" />
          Upload
        </div>
      </label>

      {/* Job Title Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">
              <span className="text-cyan-400">Job:</span> {job.property?.full_address?.split(',')[0]} {job.description}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-medium text-sm">{formatStatus(job.status)}</span>
              <span className="text-slate-400 text-sm">{progress}%</span>
              <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
  );

  // Overview content (the original job detail view)
  const renderOverviewContent = () => (
    <div className="min-h-full bg-slate-900">
      <BannerSection />

      {/* Main Content - Compact Layout */}
      <div className="p-4 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Job, Property & Claim Info */}
          <div className="space-y-3">
            {/* Job Info */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-cyan-400" />
                  Job Information
                </h2>
                <div className="flex items-center gap-2">
                  <button className="text-cyan-400 hover:text-cyan-300">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => togglePanel('jobInfo')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedPanels.jobInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Job #</p>
                  <p className="text-slate-200">{displayValue(job.job_number)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Job Type</p>
                  <p className="text-slate-200 capitalize">{displayValue(job.job_type)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Work Type</p>
                  <p className="text-slate-200 capitalize">{displayValue(job.work_type)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Priority</p>
                  <p className="text-slate-200 capitalize">{displayValue(job.priority)}</p>
                </div>
              </div>
              {/* Expanded content */}
              {expandedPanels.jobInfo && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Job Category</p>
                    <p className="text-slate-200 capitalize">{displayValue(job.job_category?.replace('_', ' '))}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Internal Ref</p>
                    <p className="text-slate-200">{displayValue(job.internal_reference)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Created</p>
                    <p className="text-slate-200">{job.created_at ? new Date(job.created_at).toLocaleDateString() : '--'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Updated</p>
                    <p className="text-slate-200">{job.updated_at ? new Date(job.updated_at).toLocaleDateString() : '--'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Customer & Property - Combined with Roof Details */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  Customer & Property
                </h2>
                <div className="flex items-center gap-2">
                  <button className="text-cyan-400 hover:text-cyan-300">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => togglePanel('customerProperty')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedPanels.customerProperty ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs">Customer Name</p>
                  <p className="text-slate-200">{displayValue(job.property?.owner_full_name)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Phone</p>
                  <p className="text-cyan-400">{displayValue(job.property?.owner_phone)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Email</p>
                  <p className="text-cyan-400 truncate">{displayValue(job.property?.owner_email)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs">Address</p>
                  <p className="text-slate-200">{displayValue(job.property?.address_line1)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">City</p>
                  <p className="text-slate-200">{displayValue(job.property?.city)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">State / Zip</p>
                  <p className="text-slate-200">{displayValue(job.property?.state)} {displayValue(job.property?.zip_code)}</p>
                </div>
              </div>
              {/* Expanded content - Property & Roof Details */}
              {expandedPanels.customerProperty && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Property Details</p>
                  <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Property Type</p>
                      <p className="text-slate-200 capitalize">{displayValue(job.property?.property_type)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Year Built</p>
                      <p className="text-slate-200">{displayValue(job.property?.year_built)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Sq Footage</p>
                      <p className="text-slate-200">{job.property?.square_footage ? `${job.property.square_footage.toLocaleString()} sf` : '--'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Stories</p>
                      <p className="text-slate-200">{displayValue(job.property?.stories)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 mt-3 font-medium">Roof Details</p>
                  <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Roof Type</p>
                      <p className="text-slate-200">{displayValue(job.roof_type)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Squares</p>
                      <p className="text-slate-200">{job.roof_squares ? `${job.roof_squares} SQ` : '--'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Pitch</p>
                      <p className="text-slate-200">{displayValue(job.roof_pitch)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Shingle Color</p>
                      <p className="text-slate-200">{displayValue(job.shingle_color)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Insurance & Claim Info */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Insurance & Claim
                </h2>
                <div className="flex items-center gap-2">
                  <button className="text-cyan-400 hover:text-cyan-300">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => togglePanel('insuranceClaim')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedPanels.insuranceClaim ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Carrier</p>
                  <p className="text-slate-200 truncate">{displayValue(job.property?.insurance_company)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Policy #</p>
                  <p className="text-slate-200">{displayValue(job.property?.policy_number)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Claim #</p>
                  <p className="text-slate-200">{displayValue(job.claim_number)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Date of Loss</p>
                  <p className="text-slate-200">{job.date_of_loss ? new Date(job.date_of_loss).toLocaleDateString() : '--'}</p>
                </div>
              </div>
              {/* Expanded content - Adjuster & More Claim Info */}
              {expandedPanels.insuranceClaim && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Adjuster Information</p>
                  <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Adjuster Name</p>
                      <p className="text-slate-200">{displayValue(job.adjuster_name || job.property?.adjuster_name)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Adjuster Phone</p>
                      <p className="text-cyan-400">{displayValue(job.adjuster_phone || job.property?.adjuster_phone)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500 text-xs">Adjuster Email</p>
                      <p className="text-cyan-400 truncate">{displayValue(job.adjuster_email || job.property?.adjuster_email)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 mt-3 font-medium">Claim Details</p>
                  <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Deductible</p>
                      <p className="text-slate-200">{job.deductible ? formatCurrency(job.deductible) : '--'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Claim Type</p>
                      <p className="text-slate-200 capitalize">{displayValue(job.claim_type?.replace('_', ' '))}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Severity</p>
                      <p className="text-slate-200 capitalize">{displayValue(job.severity)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Date Reported</p>
                      <p className="text-slate-200">{job.date_reported ? new Date(job.date_reported).toLocaleDateString() : '--'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Team & Dates Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Team Assignment */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    Team
                  </h2>
                  <button
                    onClick={() => togglePanel('team')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedPanels.team ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Sales Rep</span>
                    <span className="text-slate-200">{displayValue(job.sales_rep_name)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Project Manager</span>
                    <span className="text-slate-200">{displayValue(job.project_manager_name)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Estimator</span>
                    <span className="text-slate-200">{displayValue(job.estimator_name)}</span>
                  </div>
                </div>
                {expandedPanels.team && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Production Mgr</span>
                      <span className="text-slate-200">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Coordinator</span>
                      <span className="text-slate-200">--</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Important Dates */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Key Dates
                  </h2>
                  <button
                    onClick={() => togglePanel('keyDates')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedPanels.keyDates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Appointment</span>
                    <span className="text-slate-200">{job.date_appointment ? new Date(job.date_appointment).toLocaleDateString() : '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Sold Date</span>
                    <span className="text-slate-200">{job.date_sold ? new Date(job.date_sold).toLocaleDateString() : '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Start Date</span>
                    <span className="text-slate-200">{job.date_started ? new Date(job.date_started).toLocaleDateString() : '--'}</span>
                  </div>
                </div>
                {expandedPanels.keyDates && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Target Start</span>
                      <span className="text-slate-200">{job.target_start_date ? new Date(job.target_start_date).toLocaleDateString() : '--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Target Complete</span>
                      <span className="text-slate-200">{job.target_completion_date ? new Date(job.target_completion_date).toLocaleDateString() : '--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Completed</span>
                      <span className="text-slate-200">{job.date_completed ? new Date(job.date_completed).toLocaleDateString() : '--'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Permit Info */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Permit
                </h2>
                <button
                  onClick={() => togglePanel('permit')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {expandedPanels.permit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Permit #</p>
                  <p className="text-slate-200">{displayValue(job.permit_number)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Status</p>
                  <p className="text-slate-200">{displayValue(job.permit_status)}</p>
                </div>
              </div>
              {expandedPanels.permit && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Jurisdiction</p>
                    <p className="text-slate-200">--</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Permit Fee</p>
                    <p className="text-slate-200">--</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Submitted</p>
                    <p className="text-slate-200">--</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Approved</p>
                    <p className="text-slate-200">--</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Access - Files/Photos */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNotesFilesTab('files')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Files
                </button>
                <button
                  onClick={() => setNotesFilesTab('photos')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  Photos
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 text-sm border border-cyan-500/30">
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Communications */}
          <div className="lg:mt-0">
            <CommunicationsPanel
              jobId={job.id}
              organizationId={job.organization_id}
              currentUserId="demo-user-id"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Render tab-specific content based on activeTab from sidebar
  const renderTabContent = () => {
    switch (activeTab) {
      case 'measurements':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Measurements</h2>
                <p className="text-slate-400 mb-6">Import measurements from EagleView, HOVER, or enter manually.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Roof Area</p>
                    <p className="text-2xl font-bold text-white">-- SQ</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ridge Length</p>
                    <p className="text-2xl font-bold text-white">-- LF</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Eave Length</p>
                    <p className="text-2xl font-bold text-white">-- LF</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  <Upload className="w-4 h-4" />
                  Import from EagleView
                </button>
              </div>
            </div>
          </div>
        );
      case 'estimate':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Estimate</h2>
                <p className="text-slate-400 mb-6">Create and manage estimates for this job.</p>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Primary Estimate</p>
                      <p className="text-xs text-slate-500">Last updated: --</p>
                    </div>
                    <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">Not Created</span>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  <Plus className="w-4 h-4" />
                  Create Estimate
                </button>
              </div>
            </div>
          </div>
        );
      case 'work-orders':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Work Orders</h2>
                <p className="text-slate-400 mb-6">Manage work orders and assign crews to this job.</p>
                <div className="text-center py-8 text-slate-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No work orders created yet</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  <Plus className="w-4 h-4" />
                  Create Work Order
                </button>
              </div>
            </div>
          </div>
        );
      case 'materials':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Materials</h2>
                <p className="text-slate-400 mb-6">Track materials ordered and delivered for this job.</p>
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No materials tracked yet</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  <Plus className="w-4 h-4" />
                  Add Material Order
                </button>
              </div>
            </div>
          </div>
        );
      case 'financials':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Financials</h2>
                <p className="text-slate-400 mb-6">Complete financial overview for this job.</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estimate</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(job.estimated_total)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Approved</p>
                    <p className="text-2xl font-bold text-cyan-400">{formatCurrency(job.approved_amount)}</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Paid</p>
                    <p className="text-2xl font-bold text-emerald-400">$0</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Balance</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(job.estimated_total)}</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        );
      case 'photos':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Photos</h2>
                <p className="text-slate-400 mb-6">Manage job photos organized by category.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {['Before', 'During', 'After', 'Damage'].map((category) => (
                    <div key={category} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30 text-center">
                      <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-300">{category}</p>
                      <p className="text-xs text-slate-500">0 photos</p>
                    </div>
                  ))}
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  <Upload className="w-4 h-4" />
                  Upload Photos
                </button>
              </div>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Documents</h2>
                <p className="text-slate-400 mb-6">Store contracts, invoices, and other documents.</p>
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No documents uploaded yet</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30">
                  <Upload className="w-4 h-4" />
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        );
      case 'communications':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <CommunicationsPanel
                jobId={job.id}
                organizationId={job.organization_id}
                currentUserId="demo-user-id"
              />
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="min-h-full bg-slate-900">
            <BannerSection />
            <div className="p-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">History</h2>
                <p className="text-slate-400 mb-6">Complete activity log for this job.</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-200">Job created</p>
                      <p className="text-xs text-slate-500">{new Date(job.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'overview':
      default:
        return renderOverviewContent();
    }
  };

  return renderTabContent();
};

export default JobDetail;
