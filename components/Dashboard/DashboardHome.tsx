import React from 'react';
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react';

const DashboardHome: React.FC = () => {
  const stats = [
    {
      label: 'Active Jobs',
      value: '24',
      change: '+12%',
      positive: true,
      icon: Briefcase,
      color: 'cyan',
    },
    {
      label: 'Total Revenue',
      value: '$482,500',
      change: '+8%',
      positive: true,
      icon: DollarSign,
      color: 'emerald',
    },
    {
      label: 'Pending Approvals',
      value: '8',
      change: '-3',
      positive: true,
      icon: Clock,
      color: 'amber',
    },
    {
      label: 'Completed This Month',
      value: '12',
      change: '+4',
      positive: true,
      icon: CheckCircle,
      color: 'green',
    },
  ];

  const recentJobs = [
    { id: 1, address: '456 Maple St.', status: 'In Progress', amount: '$25,000', progress: 65 },
    { id: 2, address: '789 Oak Avenue', status: 'Pending Approval', amount: '$18,500', progress: 50 },
    { id: 3, address: '321 Pine Street', status: 'Approved', amount: '$32,000', progress: 70 },
    { id: 4, address: '555 Elm Drive', status: 'New', amount: 'TBD', progress: 10 },
  ];

  const upcomingTasks = [
    { id: 1, task: 'Site inspection - 456 Maple St.', due: 'Today, 2:00 PM', priority: 'high' },
    { id: 2, task: 'Submit estimate - 789 Oak Ave', due: 'Tomorrow', priority: 'medium' },
    { id: 3, task: 'Follow up with adjuster', due: 'Mar 25', priority: 'low' },
    { id: 4, task: 'Final walkthrough - Pine St.', due: 'Mar 26', priority: 'medium' },
  ];

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Welcome Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome back, John</h1>
        <p className="text-slate-400 text-sm sm:text-base mt-1">Here's what's happening with your projects today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 sm:p-5"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${stat.color}-400`} />
                </div>
                <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm ${stat.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">{stat.value}</p>
              <p className="text-xs sm:text-sm text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Jobs */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-3 sm:p-5 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-white">Recent Jobs</h2>
            <button className="text-cyan-400 text-xs sm:text-sm hover:text-cyan-300 transition-colors">
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-700/50">
            {recentJobs.map((job) => (
              <div key={job.id} className="p-3 sm:p-4 hover:bg-slate-700/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <h3 className="text-white font-medium text-sm sm:text-base truncate mr-2">{job.address}</h3>
                  <span className="text-cyan-400 font-semibold text-xs sm:text-sm flex-shrink-0">{job.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs sm:text-sm">{job.status}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-16 sm:w-20 h-1 sm:h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="text-slate-500 text-[10px] sm:text-xs">{job.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-3 sm:p-5 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-white">Upcoming Tasks</h2>
            <button className="text-cyan-400 text-xs sm:text-sm hover:text-cyan-300 transition-colors">
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-700/50">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="p-3 sm:p-4 hover:bg-slate-700/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm sm:text-base mb-1 line-clamp-2">{task.task}</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-400">{task.due}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
