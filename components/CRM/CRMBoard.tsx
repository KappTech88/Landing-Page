import React, { useState } from 'react';
import {
  Plus,
  MoreVertical,
  MapPin,
  DollarSign,
  Calendar,
  User,
  GripVertical,
  Filter,
  Search,
  ChevronDown,
  X,
  Phone,
  Mail,
  FileText,
  Camera,
  Clock,
} from 'lucide-react';
import { CRMJob, ClaimStatus, ClaimType } from '../../types';

const CRMBoard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CRMJob | null>(null);
  const [draggedJob, setDraggedJob] = useState<CRMJob | null>(null);

  const columns: { id: ClaimStatus; title: string; color: string }[] = [
    { id: 'open', title: 'New Leads', color: 'bg-blue-500' },
    { id: 'assessment_scheduled', title: 'Assessment', color: 'bg-purple-500' },
    { id: 'estimate_in_progress', title: 'Estimating', color: 'bg-amber-500' },
    { id: 'approved', title: 'Approved', color: 'bg-emerald-500' },
    { id: 'work_in_progress', title: 'In Progress', color: 'bg-cyan-500' },
    { id: 'closed', title: 'Completed', color: 'bg-slate-500' },
  ];

  const [jobs, setJobs] = useState<CRMJob[]>([
    {
      id: '1',
      organization_id: 'org-1',
      contact_id: 'contact-1',
      job_number: 'JOB-2024-0089',
      title: 'Hail Damage Repair',
      description: 'Complete roof replacement due to hail damage',
      status: 'work_in_progress',
      priority: 'high',
      job_type: 'hail',
      estimated_value: 18500,
      property_address: '1234 Oak Street',
      city: 'Dallas',
      state: 'TX',
      zip_code: '75201',
      insurance_company: 'State Farm',
      adjuster_name: 'Mike Williams',
      adjuster_phone: '(469) 555-0789',
      date_of_loss: '2024-03-15',
      tags: ['Urgent', 'Insurance'],
      photos_count: 24,
      tasks_count: 5,
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: 'org-1',
      contact_id: 'contact-2',
      job_number: 'JOB-2024-0088',
      title: 'Storm Damage Assessment',
      description: 'Initial assessment for wind and water damage',
      status: 'estimate_in_progress',
      priority: 'normal',
      job_type: 'storm_damage',
      estimated_value: 24000,
      property_address: '567 Pine Avenue',
      city: 'Fort Worth',
      state: 'TX',
      zip_code: '76102',
      insurance_company: 'Allstate',
      date_of_loss: '2024-03-20',
      tags: ['Storm'],
      photos_count: 12,
      tasks_count: 3,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      organization_id: 'org-1',
      contact_id: 'contact-3',
      job_number: 'JOB-2024-0087',
      title: 'Water Damage Restoration',
      description: 'Commercial property water damage restoration',
      status: 'approved',
      priority: 'urgent',
      job_type: 'water',
      estimated_value: 45000,
      actual_value: 42500,
      property_address: '890 Business Parkway',
      city: 'Plano',
      state: 'TX',
      zip_code: '75024',
      insurance_company: 'Liberty Mutual',
      adjuster_name: 'Sarah Johnson',
      adjuster_email: 'sjohnson@libertymutual.com',
      tags: ['Commercial', 'High Value'],
      photos_count: 48,
      tasks_count: 8,
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      organization_id: 'org-1',
      contact_id: 'contact-4',
      job_number: 'JOB-2024-0086',
      title: 'Roof Inspection',
      description: 'Annual roof inspection and maintenance',
      status: 'assessment_scheduled',
      priority: 'low',
      job_type: 'windstorm',
      estimated_value: 8500,
      property_address: '123 Maple Drive',
      city: 'Arlington',
      state: 'TX',
      zip_code: '76011',
      date_of_loss: '2024-03-22',
      photos_count: 0,
      tasks_count: 2,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      organization_id: 'org-1',
      contact_id: 'contact-5',
      job_number: 'JOB-2024-0085',
      title: 'New Lead - Smith Property',
      description: 'Potential hail damage claim',
      status: 'open',
      priority: 'normal',
      job_type: 'hail',
      estimated_value: 15000,
      property_address: '456 Cedar Lane',
      city: 'Irving',
      state: 'TX',
      zip_code: '75060',
      photos_count: 0,
      tasks_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '6',
      organization_id: 'org-1',
      contact_id: 'contact-6',
      job_number: 'JOB-2024-0084',
      title: 'Fire Damage Claim',
      description: 'Kitchen fire damage restoration',
      status: 'open',
      priority: 'urgent',
      job_type: 'fire',
      estimated_value: 35000,
      property_address: '789 Birch Street',
      city: 'Garland',
      state: 'TX',
      zip_code: '75040',
      insurance_company: 'Farmers',
      tags: ['Fire', 'Urgent'],
      photos_count: 6,
      tasks_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-slate-500',
      normal: 'bg-blue-500',
      high: 'bg-amber-500',
      urgent: 'bg-rose-500',
    };
    return colors[priority] || 'bg-slate-500';
  };

  const getJobTypeIcon = (type: ClaimType) => {
    const icons: Record<ClaimType, string> = {
      hail: '🌨️',
      windstorm: '💨',
      water: '💧',
      fire: '🔥',
      mold: '🦠',
      storm_damage: '⛈️',
    };
    return icons[type] || '📋';
  };

  const handleDragStart = (e: React.DragEvent, job: CRMJob) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: ClaimStatus) => {
    e.preventDefault();
    if (draggedJob) {
      setJobs(jobs.map(job =>
        job.id === draggedJob.id ? { ...job, status: newStatus } : job
      ));
      setDraggedJob(null);
    }
  };

  const getColumnJobs = (status: ClaimStatus) => {
    return jobs.filter(job => job.status === status);
  };

  const getColumnTotal = (status: ClaimStatus) => {
    return getColumnJobs(status).reduce((sum, job) => sum + (job.estimated_value || 0), 0);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 lg:p-6 border-b border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Jobs Board</h1>
            <p className="text-slate-400 mt-1">Drag and drop to update job status</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button className="p-2 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4" />
              New Job
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4 lg:p-6">
        <div className="flex gap-4 min-w-max h-full">
          {columns.map((column) => (
            <div
              key={column.id}
              className="w-80 flex flex-col bg-slate-800/30 rounded-2xl border border-white/5"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex-shrink-0 p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="text-white font-semibold">{column.title}</h3>
                    <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded-full text-xs">
                      {getColumnJobs(column.id).length}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-emerald-400 text-sm font-medium mt-2">
                  {formatCurrency(getColumnTotal(column.id))}
                </p>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {getColumnJobs(column.id).map((job) => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, job)}
                    onClick={() => setSelectedJob(job)}
                    className={`bg-slate-800/80 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-cyan-500/30 transition-all group ${
                      draggedJob?.id === job.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Drag Handle */}
                    <div className="flex items-start justify-between mb-2">
                      <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400 cursor-grab" />
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getJobTypeIcon(job.job_type)}</span>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(job.priority)}`} />
                      </div>
                    </div>

                    {/* Job Info */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500 font-mono">{job.job_number}</p>
                        <h4 className="text-white font-medium text-sm line-clamp-2">{job.title}</h4>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{job.city}, {job.state}</span>
                      </div>

                      {job.insurance_company && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <FileText className="w-3 h-3" />
                          <span className="truncate">{job.insurance_company}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <p className="text-emerald-400 font-semibold text-sm">
                          {formatCurrency(job.estimated_value || 0)}
                        </p>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          {job.photos_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {job.photos_count}
                            </span>
                          )}
                          {job.tasks_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {job.tasks_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      {job.tags && job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {job.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {job.tags.length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                              +{job.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {getColumnJobs(column.id).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <p className="text-sm">No jobs</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getJobTypeIcon(selectedJob.job_type)}</span>
                <div>
                  <p className="text-xs text-slate-400 font-mono">{selectedJob.job_number}</p>
                  <h2 className="text-lg font-semibold text-white">{selectedJob.title}</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Priority */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedJob.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as ClaimStatus;
                    setJobs(jobs.map(job =>
                      job.id === selectedJob.id ? { ...job, status: newStatus } : job
                    ));
                    setSelectedJob({ ...selectedJob, status: newStatus });
                  }}
                  className="px-3 py-1.5 bg-slate-700/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(selectedJob.priority)}`} />
                  <span className="text-slate-300 text-sm capitalize">{selectedJob.priority} Priority</span>
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/30 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Property Address</p>
                  <p className="text-white font-medium">{selectedJob.property_address}</p>
                  <p className="text-slate-300 text-sm">{selectedJob.city}, {selectedJob.state} {selectedJob.zip_code}</p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Estimated Value</p>
                  <p className="text-emerald-400 font-bold text-xl">{formatCurrency(selectedJob.estimated_value || 0)}</p>
                  {selectedJob.actual_value && (
                    <p className="text-slate-400 text-sm">Actual: {formatCurrency(selectedJob.actual_value)}</p>
                  )}
                </div>
                {selectedJob.insurance_company && (
                  <div className="p-4 bg-slate-700/30 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">Insurance Company</p>
                    <p className="text-white font-medium">{selectedJob.insurance_company}</p>
                    {selectedJob.adjuster_name && (
                      <p className="text-slate-300 text-sm">Adjuster: {selectedJob.adjuster_name}</p>
                    )}
                  </div>
                )}
                {selectedJob.date_of_loss && (
                  <div className="p-4 bg-slate-700/30 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">Date of Loss</p>
                    <p className="text-white font-medium">
                      {new Date(selectedJob.date_of_loss).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedJob.description && (
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2">Description</p>
                  <p className="text-slate-400">{selectedJob.description}</p>
                </div>
              )}

              {/* Tags */}
              {selectedJob.tags && selectedJob.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl hover:bg-cyan-500/30 transition-colors">
                  <Camera className="w-4 h-4" />
                  Photos ({selectedJob.photos_count || 0})
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-colors">
                  <FileText className="w-4 h-4" />
                  Documents
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 rounded-xl hover:bg-amber-500/30 transition-colors">
                  <Clock className="w-4 h-4" />
                  Tasks ({selectedJob.tasks_count || 0})
                </button>
                {selectedJob.adjuster_phone && (
                  <a
                    href={`tel:${selectedJob.adjuster_phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl hover:bg-emerald-500/30 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call Adjuster
                  </a>
                )}
                {selectedJob.adjuster_email && (
                  <a
                    href={`mailto:${selectedJob.adjuster_email}`}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-xl hover:bg-rose-500/30 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Email Adjuster
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Create New Job</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Job Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g., Hail Damage Repair"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Job Type</label>
                  <select className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50">
                    <option value="hail">Hail Damage</option>
                    <option value="windstorm">Wind Damage</option>
                    <option value="water">Water Damage</option>
                    <option value="fire">Fire Damage</option>
                    <option value="mold">Mold</option>
                    <option value="storm_damage">Storm Damage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                  <select className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Property Address</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="1234 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="City"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="State"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="ZIP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Insurance Company (Optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g., State Farm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  placeholder="Add job description..."
                />
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
                Create Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMBoard;
