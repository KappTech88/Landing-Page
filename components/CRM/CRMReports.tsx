import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Briefcase,
  Calendar,
  Download,
  Filter,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity,
  Target,
  Clock,
} from 'lucide-react';

const CRMReports: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [reportType, setReportType] = useState('overview');

  const metrics = {
    revenue: {
      current: 87500,
      previous: 72000,
      change: 21.5,
    },
    jobs: {
      current: 34,
      previous: 28,
      change: 21.4,
    },
    leads: {
      current: 156,
      previous: 134,
      change: 16.4,
    },
    conversion: {
      current: 34.5,
      previous: 31.2,
      change: 10.6,
    },
    avgJobValue: {
      current: 14045,
      previous: 12850,
      change: 9.3,
    },
    tasksCompleted: {
      current: 89,
      previous: 76,
      change: 17.1,
    },
  };

  const jobsByType = [
    { type: 'Hail Damage', count: 45, revenue: 562500, percentage: 42 },
    { type: 'Wind Damage', count: 28, revenue: 336000, percentage: 26 },
    { type: 'Water Damage', count: 18, revenue: 270000, percentage: 17 },
    { type: 'Fire Damage', count: 8, revenue: 160000, percentage: 7 },
    { type: 'Storm Damage', count: 6, revenue: 72000, percentage: 6 },
    { type: 'Other', count: 3, revenue: 24000, percentage: 2 },
  ];

  const jobsByStatus = [
    { status: 'New Leads', count: 24, color: 'bg-blue-500' },
    { status: 'Assessment', count: 12, color: 'bg-purple-500' },
    { status: 'Estimating', count: 18, color: 'bg-amber-500' },
    { status: 'Approved', count: 8, color: 'bg-emerald-500' },
    { status: 'In Progress', count: 15, color: 'bg-cyan-500' },
    { status: 'Completed', count: 31, color: 'bg-slate-500' },
  ];

  const topPerformers = [
    { name: 'John Smith', role: 'Estimator', jobs: 24, revenue: 342000 },
    { name: 'Sarah Johnson', role: 'Sales Rep', jobs: 18, revenue: 256000 },
    { name: 'Mike Williams', role: 'Project Manager', jobs: 15, revenue: 198000 },
  ];

  const recentActivity = [
    { type: 'job_completed', title: 'Davis Residence project completed', value: '$28,500', time: '2 hours ago' },
    { type: 'payment', title: 'Payment received from Liberty Mutual', value: '$42,500', time: '5 hours ago' },
    { type: 'lead', title: 'New lead from website form', value: null, time: '1 day ago' },
    { type: 'estimate', title: 'Estimate approved for Williams property', value: '$24,000', time: '1 day ago' },
  ];

  const monthlyRevenue = [
    { month: 'Jan', value: 62000 },
    { month: 'Feb', value: 58000 },
    { month: 'Mar', value: 72000 },
    { month: 'Apr', value: 85000 },
    { month: 'May', value: 78000 },
    { month: 'Jun', value: 92000 },
    { month: 'Jul', value: 105000 },
    { month: 'Aug', value: 98000 },
    { month: 'Sep', value: 88000 },
    { month: 'Oct', value: 95000 },
    { month: 'Nov', value: 87500 },
  ];

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.value));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400 mt-1">Track your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">Year to date</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Revenue (MTD)', value: formatCurrency(metrics.revenue.current), change: metrics.revenue.change, icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
          { label: 'Active Jobs', value: metrics.jobs.current, change: metrics.jobs.change, icon: Briefcase, color: 'from-cyan-500 to-blue-600' },
          { label: 'Total Leads', value: metrics.leads.current, change: metrics.leads.change, icon: Users, color: 'from-purple-500 to-pink-600' },
          { label: 'Conversion Rate', value: `${metrics.conversion.current}%`, change: metrics.conversion.change, icon: Target, color: 'from-amber-500 to-orange-600' },
          { label: 'Avg Job Value', value: formatCurrency(metrics.avgJobValue.current), change: metrics.avgJobValue.change, icon: TrendingUp, color: 'from-rose-500 to-red-600' },
          { label: 'Tasks Done', value: metrics.tasksCompleted.current, change: metrics.tasksCompleted.change, icon: Activity, color: 'from-indigo-500 to-violet-600' },
        ].map((metric, index) => (
          <div
            key={index}
            className="bg-slate-800/50 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                <metric.icon className="w-4 h-4 text-white" />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${metric.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metric.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(metric.change)}%
              </span>
            </div>
            <p className="text-lg font-bold text-white">{metric.value}</p>
            <p className="text-xs text-slate-400">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Monthly Revenue
            </h3>
            <span className="text-emerald-400 text-sm font-medium">
              {formatCurrency(monthlyRevenue.reduce((sum, m) => sum + m.value, 0))} YTD
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {monthlyRevenue.map((month, index) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-lg transition-all hover:opacity-80 ${
                    index === monthlyRevenue.length - 1 ? 'bg-gradient-to-t from-cyan-500 to-blue-500' : 'bg-slate-600'
                  }`}
                  style={{ height: `${(month.value / maxRevenue) * 100}%` }}
                  title={formatCurrency(month.value)}
                />
                <span className="text-xs text-slate-500">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Jobs by Type */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              Jobs by Type
            </h3>
          </div>
          <div className="space-y-3">
            {jobsByType.map((item, index) => (
              <div key={item.type} className="flex items-center gap-3">
                <div className="w-24 text-slate-300 text-sm truncate">{item.type}</div>
                <div className="flex-1 h-6 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      index === 0 ? 'bg-cyan-500' :
                      index === 1 ? 'bg-purple-500' :
                      index === 2 ? 'bg-amber-500' :
                      index === 3 ? 'bg-rose-500' :
                      index === 4 ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="w-20 text-right">
                  <span className="text-white font-medium text-sm">{item.count}</span>
                  <span className="text-slate-500 text-xs ml-1">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Status */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Pipeline Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {jobsByStatus.map((status) => (
              <div key={status.status} className="bg-slate-700/30 rounded-xl p-4 text-center">
                <div className={`w-3 h-3 ${status.color} rounded-full mx-auto mb-2`} />
                <p className="text-2xl font-bold text-white">{status.count}</p>
                <p className="text-xs text-slate-400 mt-1">{status.status}</p>
              </div>
            ))}
          </div>

          {/* Pipeline Bar */}
          <div className="mt-6">
            <div className="flex rounded-full overflow-hidden h-4">
              {jobsByStatus.map((status, index) => {
                const total = jobsByStatus.reduce((sum, s) => sum + s.count, 0);
                const percentage = (status.count / total) * 100;
                return (
                  <div
                    key={status.status}
                    className={`${status.color} transition-all hover:opacity-80`}
                    style={{ width: `${percentage}%` }}
                    title={`${status.status}: ${status.count}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>New Leads</span>
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'job_completed' ? 'bg-emerald-500' :
                  activity.type === 'payment' ? 'bg-cyan-500' :
                  activity.type === 'lead' ? 'bg-purple-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm truncate">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {activity.value && (
                      <span className="text-emerald-400 text-sm font-medium">{activity.value}</span>
                    )}
                    <span className="text-slate-500 text-xs">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Top Performers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.map((performer, index) => (
            <div key={performer.name} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                'bg-gradient-to-br from-amber-600 to-amber-800'
              }`}>
                #{index + 1}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{performer.name}</p>
                <p className="text-slate-400 text-sm">{performer.role}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-semibold">{formatCurrency(performer.revenue)}</p>
                <p className="text-slate-500 text-xs">{performer.jobs} jobs</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-4">
          <p className="text-cyan-300 text-sm">Avg Response Time</p>
          <p className="text-2xl font-bold text-white mt-1">2.4 hrs</p>
          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> 12% faster
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
          <p className="text-purple-300 text-sm">Customer Satisfaction</p>
          <p className="text-2xl font-bold text-white mt-1">4.8 / 5.0</p>
          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +0.3 this month
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-300 text-sm">Avg Project Duration</p>
          <p className="text-2xl font-bold text-white mt-1">12 days</p>
          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> 2 days faster
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-300 text-sm">Collection Rate</p>
          <p className="text-2xl font-bold text-white mt-1">94.2%</p>
          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +3.5% YoY
          </p>
        </div>
      </div>
    </div>
  );
};

export default CRMReports;
