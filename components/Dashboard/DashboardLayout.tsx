import React, { useState } from 'react';
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
  Plus,
  Wrench,
  ChevronDown,
  Phone,
  Mail,
  Building2,
  Truck,
  User,
  Shield,
  UserCog,
  HardHat,
  Filter,
  X,
  Bell,
  Ruler,
  FileText,
  ClipboardList,
  Package,
  DollarSign,
  FileCheck,
  Camera,
  MessageSquare,
  History,
  Paperclip,
  Menu,
  ChevronRight
} from 'lucide-react';
import { AppView } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  inboxCount?: number;
  tasksCount?: number;
  // Job detail specific
  activeJobTab?: string;
  onJobTabChange?: (tab: string) => void;
}

// Contact types with their icons and colors
const CONTACT_TYPES = [
  { id: 'all', label: 'All Contacts', icon: Users, color: 'text-slate-400' },
  { id: 'client', label: 'Clients', icon: User, color: 'text-blue-400' },
  { id: 'customer', label: 'Customers', icon: User, color: 'text-cyan-400' },
  { id: 'adjuster', label: 'Adjusters', icon: Shield, color: 'text-purple-400' },
  { id: 'employee', label: 'Employees', icon: UserCog, color: 'text-green-400' },
  { id: 'subcontractor', label: 'Subcontractors', icon: HardHat, color: 'text-orange-400' },
  { id: 'supplier', label: 'Suppliers', icon: Truck, color: 'text-emerald-400' },
];

// Sample master contacts list (would come from database)
const SAMPLE_COMPANY_CONTACTS = [
  { id: '1', name: 'Mike Johnson', company: 'ABC Roofing Crew', type: 'subcontractor', phone: '(555) 123-4567', email: 'mike@abcroofing.com' },
  { id: '2', name: 'Carlos Rivera', company: 'Pro Siding Team', type: 'subcontractor', phone: '(555) 234-5678', email: 'carlos@prosiding.com' },
  { id: '3', name: 'John Smith', company: 'ABC Supply Co.', type: 'supplier', phone: '(555) 111-2222', email: 'john.smith@abcsupply.com' },
  { id: '4', name: 'Sarah Williams', company: 'SRS Distribution', type: 'supplier', phone: '(555) 333-4444', email: 'sarah@srsdist.com' },
  { id: '5', name: 'Robert Chen', company: 'State Farm Insurance', type: 'adjuster', phone: '(555) 444-5555', email: 'robert.chen@statefarm.com' },
  { id: '6', name: 'Emily Davis', company: 'Allstate', type: 'adjuster', phone: '(555) 555-6666', email: 'emily.davis@allstate.com' },
  { id: '7', name: 'James Wilson', company: 'Self', type: 'client', phone: '(555) 666-7777', email: 'james.wilson@email.com' },
  { id: '8', name: 'Maria Garcia', company: 'Garcia Properties', type: 'customer', phone: '(555) 777-8888', email: 'maria@garciaproperties.com' },
  { id: '9', name: 'David Lee', company: 'Estimate Reliance', type: 'employee', phone: '(555) 888-9999', email: 'david.lee@estimatereliance.com' },
  { id: '10', name: 'Amanda Taylor', company: 'Estimate Reliance', type: 'employee', phone: '(555) 999-0000', email: 'amanda.taylor@estimatereliance.com' },
];

// Job detail sidebar tabs
const JOB_DETAIL_TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'estimate', label: 'Estimate', icon: FileCheck },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'documents', label: 'Documents', icon: Paperclip },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'history', label: 'History', icon: History },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentView,
  onNavigate,
  inboxCount = 3,
  tasksCount = 5,
  activeJobTab = 'overview',
  onJobTabChange
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [contactFilter, setContactFilter] = useState('all');
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Check if we should show the contextual sidebar (e.g., job detail)
  const showContextSidebar = currentView === AppView.DASHBOARD_JOB_DETAIL;

  // Filter contacts based on type and search
  const filteredContacts = SAMPLE_COMPANY_CONTACTS.filter(contact => {
    const matchesType = contactFilter === 'all' || contact.type === contactFilter;
    const matchesSearch = !contactSearchTerm ||
      contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(contactSearchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Get icon and color for contact type
  const getContactTypeStyle = (type: string) => {
    const contactType = CONTACT_TYPES.find(t => t.id === type);
    return contactType || CONTACT_TYPES[0];
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center px-3 md:px-4 flex-shrink-0">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mr-4 md:mr-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-xs">ER</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-white font-semibold text-sm leading-tight">Estimate Reliance</h1>
            <p className="text-slate-500 text-[10px]">CRM Platform</p>
          </div>
        </div>

        {/* Main Navigation - Hidden on mobile */}
        <nav className="hidden md:flex flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                  active
                    ? 'bg-cyan-600/20 text-cyan-400'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden lg:inline">{item.label}</span>
                {item.badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right Side - Search, Tools, User */}
        <div className="flex items-center gap-2 ml-4">
          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-48 bg-slate-800/50 border border-slate-700 rounded-lg py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          {/* Quick Add */}
          <button className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 px-3 rounded-lg transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                toolsOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Tools Dropdown Panel */}
            {toolsOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setToolsOpen(false)}
                />

                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Company Contacts</h3>
                    <button
                      onClick={() => setToolsOpen(false)}
                      className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  {/* Search & Filter */}
                  <div className="p-3 border-b border-slate-700 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={contactSearchTerm}
                        onChange={(e) => setContactSearchTerm(e.target.value)}
                        placeholder="Search contacts..."
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    {/* Type Filter */}
                    <div className="flex flex-wrap gap-1">
                      {CONTACT_TYPES.map((type) => {
                        const TypeIcon = type.icon;
                        const isSelected = contactFilter === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setContactFilter(type.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                              isSelected
                                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">{type.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contacts List */}
                  <div className="max-h-72 overflow-y-auto">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => {
                        const typeStyle = getContactTypeStyle(contact.type);
                        const TypeIcon = typeStyle.icon;
                        return (
                          <div
                            key={contact.id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 cursor-pointer group border-b border-slate-700/50 last:border-0"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-700`}>
                              <TypeIcon className={`w-4 h-4 ${typeStyle.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 truncate">{contact.name}</p>
                              <p className="text-xs text-slate-500 truncate">{contact.company}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={`tel:${contact.phone}`}
                                className="p-1.5 rounded-lg hover:bg-slate-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title={contact.phone}
                              >
                                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                              </a>
                              <a
                                href={`mailto:${contact.email}`}
                                className="p-1.5 rounded-lg hover:bg-slate-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title={contact.email}
                              >
                                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                              </a>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        No contacts found
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-2 border-t border-slate-700 bg-slate-800/50">
                    <p className="text-[10px] text-slate-500 text-center">
                      {filteredContacts.length} contacts shown
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">JD</span>
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800 z-50 md:hidden flex flex-col shadow-2xl animate-slideInLeft">
            {/* Drawer Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">ER</span>
                </div>
                <div>
                  <h1 className="text-white font-semibold text-sm">Estimate Reliance</h1>
                  <p className="text-slate-500 text-[10px]">CRM Platform</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-2">Navigation</p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-all ${
                      active
                        ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        active ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 ml-auto text-slate-600" />
                  </button>
                );
              })}

              {/* Job Detail Tabs (if on job detail page) */}
              {showContextSidebar && (
                <>
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-2">Job Navigation</p>
                    {JOB_DETAIL_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isTabActive = activeJobTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onJobTabChange?.(tab.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                            isTabActive
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </nav>

            {/* User Profile at Bottom */}
            <div className="p-3 border-t border-slate-800">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">JD</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">John Doe</p>
                  <p className="text-xs text-slate-500">john@estimatereliance.com</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area with Optional Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Context-Sensitive Sidebar (shows for Job Detail, hidden on mobile) */}
        {showContextSidebar && (
          <aside className="hidden md:block w-52 bg-slate-950 border-r border-slate-800 flex-shrink-0 overflow-y-auto">
            <div className="p-3 border-b border-slate-800">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Job Navigation</p>
            </div>
            <nav className="p-2">
              {JOB_DETAIL_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeJobTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onJobTabChange?.(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all text-left ${
                      isActive
                        ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
