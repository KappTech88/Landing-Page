import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  Building2,
  User,
  Clock
} from 'lucide-react';
import { ClaimStatus } from '../../types';

interface Job {
  id: string;
  claim_number: string;
  address: string;
  city: string;
  state: string;
  owner_name: string;
  status: ClaimStatus;
  progress: number;
  estimated_total: number;
  approved_amount: number;
  date_created: string;
  property_image?: string;
}

interface JobsListProps {
  onSelectJob: (jobId: string) => void;
}

// Mock jobs data
const mockJobs: Job[] = [
  {
    id: '1',
    claim_number: '2122419433',
    address: '456 Maple St.',
    city: 'Roof Replace',
    state: 'GA',
    owner_name: 'Money Smith',
    status: 'work_in_progress',
    progress: 65,
    estimated_total: 25000,
    approved_amount: 8000,
    date_created: '2024-03-16',
    property_image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=200&fit=crop',
  },
  {
    id: '2',
    claim_number: '2122419434',
    address: '789 Oak Avenue',
    city: 'Atlanta',
    state: 'GA',
    owner_name: 'Sarah Johnson',
    status: 'estimate_submitted',
    progress: 50,
    estimated_total: 18500,
    approved_amount: 0,
    date_created: '2024-03-18',
    property_image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=200&fit=crop',
  },
  {
    id: '3',
    claim_number: '2122419435',
    address: '321 Pine Street',
    city: 'Marietta',
    state: 'GA',
    owner_name: 'Robert Williams',
    status: 'approved',
    progress: 70,
    estimated_total: 32000,
    approved_amount: 28500,
    date_created: '2024-03-10',
    property_image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=200&fit=crop',
  },
  {
    id: '4',
    claim_number: '2122419436',
    address: '555 Elm Drive',
    city: 'Decatur',
    state: 'GA',
    owner_name: 'Emily Davis',
    status: 'open',
    progress: 10,
    estimated_total: 0,
    approved_amount: 0,
    date_created: '2024-03-22',
  },
  {
    id: '5',
    claim_number: '2122419437',
    address: '888 Cedar Lane',
    city: 'Alpharetta',
    state: 'GA',
    owner_name: 'Michael Brown',
    status: 'work_complete',
    progress: 90,
    estimated_total: 45000,
    approved_amount: 42000,
    date_created: '2024-02-28',
    property_image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=200&fit=crop',
  },
];

const JobsList: React.FC<JobsListProps> = ({ onSelectJob }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusColor = (status: ClaimStatus): string => {
    const colors: Record<string, string> = {
      'open': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'assigned': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'assessment_scheduled': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'assessment_complete': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      'estimate_in_progress': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'estimate_submitted': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'work_in_progress': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'work_complete': 'bg-green-500/20 text-green-400 border-green-500/30',
      'final_inspection': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'closed': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'cancelled': 'bg-red-500/20 text-red-400 border-red-500/30',
      'denied': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const formatStatus = (status: string): string => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.claim_number.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-slate-400 text-sm mt-1">{filteredJobs.length} active jobs</p>
        </div>
        <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search jobs by address, owner, or claim number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="estimate_submitted">Estimate Submitted</option>
          <option value="approved">Approved</option>
          <option value="work_in_progress">Work In Progress</option>
          <option value="work_complete">Work Complete</option>
          <option value="closed">Closed</option>
        </select>
        <button className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 text-slate-300 px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors text-sm">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden hover:border-cyan-500/50 transition-all cursor-pointer group"
          >
            {/* Property Image */}
            <div className="relative h-32 bg-slate-700 overflow-hidden">
              {job.property_image ? (
                <img
                  src={job.property_image}
                  alt={job.address}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                  <Building2 className="w-10 h-10 text-slate-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(job.status)}`}>
                  {formatStatus(job.status)}
                </span>
                <span className="text-xs text-white/80 bg-slate-900/60 px-2 py-1 rounded-full">
                  {job.progress}%
                </span>
              </div>
            </div>

            {/* Job Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                    {job.address}
                  </h3>
                  <p className="text-slate-400 text-sm">{job.city}, {job.state}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                <User className="w-3.5 h-3.5" />
                <span>{job.owner_name}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <div>
                  <p className="text-xs text-slate-500">Estimate</p>
                  <p className="text-white font-semibold">{formatCurrency(job.estimated_total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Approved</p>
                  <p className="text-cyan-400 font-semibold">{formatCurrency(job.approved_amount)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg text-slate-400 mb-2">No jobs found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default JobsList;
