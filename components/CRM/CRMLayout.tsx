import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Mail,
  CheckSquare,
  GitBranch,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Plus,
  Menu,
  X,
  BarChart3,
  LogOut,
  User,
} from 'lucide-react';
import { CRMView } from '../../types';
import CRMDashboard from './CRMDashboard';
import CRMContacts from './CRMContacts';
import CRMBoard from './CRMBoard';
import CRMCalendar from './CRMCalendar';
import CRMInbox from './CRMInbox';
import CRMTasks from './CRMTasks';
import CRMWorkflows from './CRMWorkflows';
import CRMSettings from './CRMSettings';
import CRMReports from './CRMReports';

interface CRMLayoutProps {
  onExit: () => void;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ onExit }) => {
  const [currentView, setCurrentView] = useState<CRMView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { id: 'dashboard' as CRMView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contacts' as CRMView, label: 'Contacts', icon: Users },
    { id: 'jobs' as CRMView, label: 'Jobs', icon: Briefcase },
    { id: 'calendar' as CRMView, label: 'Calendar', icon: Calendar },
    { id: 'inbox' as CRMView, label: 'Inbox', icon: Mail, badge: 3 },
    { id: 'tasks' as CRMView, label: 'Tasks', icon: CheckSquare, badge: 5 },
    { id: 'workflows' as CRMView, label: 'Workflows', icon: GitBranch },
    { id: 'reports' as CRMView, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as CRMView, label: 'Settings', icon: Settings },
  ];

  const notifications = [
    { id: 1, title: 'New lead assigned', message: 'John Smith was assigned to you', time: '5m ago', unread: true },
    { id: 2, title: 'Task due soon', message: 'Follow up call with ABC Corp in 1 hour', time: '1h ago', unread: true },
    { id: 3, title: 'Email received', message: 'State Farm Insurance replied to your inquiry', time: '2h ago', unread: false },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <CRMDashboard onNavigate={setCurrentView} />;
      case 'contacts':
        return <CRMContacts />;
      case 'jobs':
        return <CRMBoard />;
      case 'calendar':
        return <CRMCalendar />;
      case 'inbox':
        return <CRMInbox />;
      case 'tasks':
        return <CRMTasks />;
      case 'workflows':
        return <CRMWorkflows />;
      case 'reports':
        return <CRMReports />;
      case 'settings':
        return <CRMSettings />;
      default:
        return <CRMDashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <span className="text-white font-bold text-lg">ER</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-sm">Estimate Reliance</h1>
                <p className="text-xs text-slate-400">CRM Platform</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ER</span>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="p-4">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40">
              <Plus className="w-4 h-4" />
              Quick Add
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentView === item.id
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-cyan-400' : ''}`} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Collapse Button */}
        <div className="hidden lg:block p-3 border-t border-white/10">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>

        {/* Exit CRM */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onExit}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-sm">Exit CRM</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-400"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search contacts, jobs, tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-all"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-white font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-white/5 cursor-pointer ${
                          notification.unread ? 'bg-cyan-500/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {notification.unread && (
                            <span className="w-2 h-2 mt-2 bg-cyan-500 rounded-full flex-shrink-0" />
                          )}
                          <div className={notification.unread ? '' : 'ml-5'}>
                            <p className="text-sm text-white font-medium">{notification.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{notification.message}</p>
                            <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-white/10">
                    <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white font-medium text-sm">Admin User</p>
                    <p className="text-slate-400 text-xs">admin@estimatereliance.com</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 text-sm transition-colors">
                      <User className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={onExit}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-sm transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-900/50 to-slate-950">
          {renderContent()}
        </main>
      </div>

      {/* Click outside handler */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default CRMLayout;
