import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Inbox,
  CheckSquare,
  GitBranch,
  BarChart3,
  Settings,
  Search,
  Plus
} from 'lucide-react';
import { AppView } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  inboxCount?: number;
  tasksCount?: number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentView,
  onNavigate,
  inboxCount = 3,
  tasksCount = 5
}) => {
  const navItems = [
    { id: AppView.DASHBOARD_HOME, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.DASHBOARD_CONTACTS, label: 'Contacts', icon: Users },
    { id: AppView.DASHBOARD_JOBS, label: 'Jobs', icon: Briefcase },
    { id: AppView.DASHBOARD_CALENDAR, label: 'Calendar', icon: Calendar },
    { id: AppView.DASHBOARD_INBOX, label: 'Inbox', icon: Inbox, badge: inboxCount },
    { id: AppView.DASHBOARD_TASKS, label: 'Tasks', icon: CheckSquare, badge: tasksCount },
    { id: AppView.DASHBOARD_WORKFLOWS, label: 'Workflows', icon: GitBranch },
    { id: AppView.DASHBOARD_REPORTS, label: 'Reports', icon: BarChart3 },
    { id: AppView.DASHBOARD_SETTINGS, label: 'Settings', icon: Settings },
  ];

  const isActive = (itemId: AppView) => {
    if (itemId === AppView.DASHBOARD_JOBS && currentView === AppView.DASHBOARD_JOB_DETAIL) {
      return true;
    }
    return currentView === itemId;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white font-bold text-sm">ER</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">Estimate Reliance</h1>
              <p className="text-slate-500 text-xs">CRM Platform</p>
            </div>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="p-3">
          <button className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 px-4 rounded-lg transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            Quick Add
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all text-left ${
                  active
                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    active ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">John Doe</p>
              <p className="text-slate-500 text-xs truncate">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Search Bar */}
        <header className="h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex items-center px-6">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search contacts, jobs, tasks..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
