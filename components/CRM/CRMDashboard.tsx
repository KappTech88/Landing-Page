import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Calendar,
  Mail,
  CheckSquare,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronRight,
  AlertCircle,
  Zap,
  Target,
  Award,
} from 'lucide-react';
import { CRMView, CRMDashboardMetrics, CRMJob, CRMTask, CRMCalendarEvent } from '../../types';

interface CRMDashboardProps {
  onNavigate: (view: CRMView) => void;
}

const CRMDashboard: React.FC<CRMDashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<CRMDashboardMetrics>({
    total_leads: 156,
    new_leads_this_week: 12,
    total_jobs: 89,
    active_jobs: 34,
    jobs_by_status: {
      open: 8,
      assessment_scheduled: 5,
      estimate_in_progress: 12,
      approved: 6,
      work_in_progress: 3,
    },
    total_revenue: 1250000,
    revenue_this_month: 87500,
    pending_tasks: 23,
    overdue_tasks: 5,
    upcoming_appointments: 8,
    unread_emails: 3,
    conversion_rate: 34.5,
    avg_job_value: 14045,
  });

  const [recentJobs] = useState<Partial<CRMJob>[]>([
    {
      id: '1',
      job_number: 'JOB-2024-0089',
      title: 'Hail Damage Repair - Johnson Residence',
      status: 'work_in_progress',
      estimated_value: 18500,
      property_address: '1234 Oak Street',
      city: 'Dallas',
      state: 'TX',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      job_number: 'JOB-2024-0088',
      title: 'Storm Damage Assessment - Williams Property',
      status: 'estimate_in_progress',
      estimated_value: 24000,
      property_address: '567 Pine Avenue',
      city: 'Fort Worth',
      state: 'TX',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      job_number: 'JOB-2024-0087',
      title: 'Water Damage Restoration - ABC Commercial',
      status: 'approved',
      estimated_value: 45000,
      property_address: '890 Business Parkway',
      city: 'Plano',
      state: 'TX',
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ]);

  const [upcomingTasks] = useState<Partial<CRMTask>[]>([
    {
      id: '1',
      title: 'Follow up call with State Farm adjuster',
      priority: 'high',
      due_date: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
    },
    {
      id: '2',
      title: 'Submit supplement for Johnson claim',
      priority: 'urgent',
      due_date: new Date(Date.now() + 7200000).toISOString(),
      status: 'in_progress',
    },
    {
      id: '3',
      title: 'Review estimate for Williams property',
      priority: 'medium',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      status: 'pending',
    },
    {
      id: '4',
      title: 'Schedule inspection with homeowner',
      priority: 'low',
      due_date: new Date(Date.now() + 172800000).toISOString(),
      status: 'pending',
    },
  ]);

  const [upcomingEvents] = useState<Partial<CRMCalendarEvent>[]>([
    {
      id: '1',
      title: 'Property Inspection - 1234 Oak St',
      start_time: new Date(Date.now() + 3600000).toISOString(),
      event_type: 'inspection',
      location: '1234 Oak Street, Dallas, TX',
    },
    {
      id: '2',
      title: 'Adjuster Meeting - Williams Claim',
      start_time: new Date(Date.now() + 86400000).toISOString(),
      event_type: 'meeting',
      location: 'Virtual - Zoom',
    },
    {
      id: '3',
      title: 'Final Walkthrough - Smith Residence',
      start_time: new Date(Date.now() + 172800000).toISOString(),
      event_type: 'appointment',
      location: '456 Elm Drive, Arlington, TX',
    },
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'In less than 1 hour';
    if (diffHours < 24) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-500/20 text-blue-300',
      assessment_scheduled: 'bg-purple-500/20 text-purple-300',
      estimate_in_progress: 'bg-amber-500/20 text-amber-300',
      approved: 'bg-emerald-500/20 text-emerald-300',
      work_in_progress: 'bg-cyan-500/20 text-cyan-300',
    };
    return colors[status] || 'bg-slate-500/20 text-slate-300';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-slate-500/20 text-slate-300',
      medium: 'bg-blue-500/20 text-blue-300',
      high: 'bg-amber-500/20 text-amber-300',
      urgent: 'bg-rose-500/20 text-rose-300',
    };
    return colors[priority] || 'bg-slate-500/20 text-slate-300';
  };

  const statCards = [
    {
      title: 'Total Leads',
      value: metrics.total_leads,
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'from-cyan-500 to-blue-600',
      subtext: `${metrics.new_leads_this_week} new this week`,
    },
    {
      title: 'Active Jobs',
      value: metrics.active_jobs,
      change: '+8%',
      changeType: 'positive',
      icon: Briefcase,
      color: 'from-purple-500 to-pink-600',
      subtext: `${metrics.total_jobs} total jobs`,
    },
    {
      title: 'Revenue (MTD)',
      value: formatCurrency(metrics.revenue_this_month),
      change: '+23%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600',
      subtext: `${formatCurrency(metrics.total_revenue)} total`,
    },
    {
      title: 'Conversion Rate',
      value: `${metrics.conversion_rate}%`,
      change: '+5.2%',
      changeType: 'positive',
      icon: Target,
      color: 'from-amber-500 to-orange-600',
      subtext: 'Lead to job ratio',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Welcome back!</h1>
          <p className="text-slate-400 mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('contacts')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
          <button
            onClick={() => onNavigate('jobs')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-sm transition-all border border-white/10"
          >
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="relative overflow-hidden bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className={`w-full h-full bg-gradient-to-br ${stat.color} rounded-full blur-2xl`} />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${stat.changeType === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stat.changeType === 'positive' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.title}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('inbox')}
          className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:border-cyan-500/30 hover:bg-slate-800 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
            <Mail className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{metrics.unread_emails} Unread</p>
            <p className="text-slate-400 text-xs">Emails</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('tasks')}
          className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:border-amber-500/30 hover:bg-slate-800 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
            <CheckSquare className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{metrics.pending_tasks} Pending</p>
            <p className="text-slate-400 text-xs">Tasks</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('calendar')}
          className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:border-purple-500/30 hover:bg-slate-800 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{metrics.upcoming_appointments} Upcoming</p>
            <p className="text-slate-400 text-xs">Appointments</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('tasks')}
          className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:border-rose-500/30 hover:bg-slate-800 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center group-hover:bg-rose-500/30 transition-colors">
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{metrics.overdue_tasks} Overdue</p>
            <p className="text-slate-400 text-xs">Tasks</p>
          </div>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Recent Jobs
            </h2>
            <button
              onClick={() => onNavigate('jobs')}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {recentJobs.map((job) => (
              <div key={job.id} className="px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500 font-mono">{job.job_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status || '')}`}>
                        {job.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-white font-medium text-sm truncate">{job.title}</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {job.property_address}, {job.city}, {job.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-semibold">{formatCurrency(job.estimated_value || 0)}</p>
                    <p className="text-slate-500 text-xs mt-1">Est. Value</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks & Events */}
        <div className="space-y-6">
          {/* Tasks */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                Upcoming Tasks
              </h2>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {upcomingTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${task.priority === 'urgent' ? 'bg-rose-500' : task.priority === 'high' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${getPriorityColor(task.priority || '')}`}>
                          {task.priority}
                        </span>
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(task.due_date || '')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Events */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Upcoming Events
              </h2>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      event.event_type === 'inspection' ? 'bg-cyan-500/20' :
                      event.event_type === 'meeting' ? 'bg-purple-500/20' : 'bg-emerald-500/20'
                    }`}>
                      <Calendar className={`w-4 h-4 ${
                        event.event_type === 'inspection' ? 'text-cyan-400' :
                        event.event_type === 'meeting' ? 'text-purple-400' : 'text-emerald-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{event.title}</p>
                      <p className="text-slate-500 text-xs mt-1">{formatDate(event.start_time || '')}</p>
                      {event.location && (
                        <p className="text-slate-400 text-xs truncate mt-0.5">{event.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          Job Pipeline Overview
        </h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(metrics.jobs_by_status).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-xl border border-white/5"
            >
              <span className={`w-3 h-3 rounded-full ${
                status === 'open' ? 'bg-blue-500' :
                status === 'assessment_scheduled' ? 'bg-purple-500' :
                status === 'estimate_in_progress' ? 'bg-amber-500' :
                status === 'approved' ? 'bg-emerald-500' : 'bg-cyan-500'
              }`} />
              <span className="text-white font-medium">{count}</span>
              <span className="text-slate-400 text-sm capitalize">{status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
