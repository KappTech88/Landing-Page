import React from 'react';
import {
  Home,
  FileText,
  Calculator,
  Plus,
  Folder,
  Clock,
  Star,
  Settings,
  HelpCircle,
  ChevronRight,
  Layers,
  Package,
  Hammer,
  Zap,
  Droplet,
  PaintBucket,
  Wrench,
  Grid3X3,
  FileCheck,
  Send,
  Download,
  Printer,
  History,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Calendar,
  Inbox,
  CheckSquare,
  GitBranch
} from 'lucide-react';
import { AppView } from '../../types';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  badge?: number | string;
  isActive?: boolean;
  children?: SidebarItem[];
}

interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface ContextualSidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onAction?: (action: string) => void;
  isCollapsed?: boolean;
}

const ContextualSidebar: React.FC<ContextualSidebarProps> = ({
  currentView,
  onNavigate,
  onAction,
  isCollapsed = false
}) => {
  const handleAction = (action: string) => {
    onAction?.(action);
  };

  // Get sidebar content based on current view
  const getSidebarContent = (): SidebarSection[] => {
    // Estimate Builder Sidebar
    if (currentView === AppView.ESTIMATE_BUILDER || currentView === AppView.DASHBOARD_ESTIMATES) {
      return [
        {
          title: 'Actions',
          items: [
            { id: 'new-estimate', label: 'New Estimate', icon: Plus, onClick: () => handleAction('new-estimate') },
            { id: 'save-draft', label: 'Save Draft', icon: FileText, onClick: () => handleAction('save-draft') },
            { id: 'preview', label: 'Preview', icon: FileCheck, onClick: () => handleAction('preview') },
          ]
        },
        {
          title: 'Categories',
          items: [
            { id: 'cat-rfg', label: 'Roofing (RFG)', icon: Layers, onClick: () => handleAction('scroll-rfg') },
            { id: 'cat-sdg', label: 'Siding (SDG)', icon: Grid3X3, onClick: () => handleAction('scroll-sdg') },
            { id: 'cat-gut', label: 'Gutters (GUT)', icon: Droplet, onClick: () => handleAction('scroll-gut') },
            { id: 'cat-dry', label: 'Drywall (DRY)', icon: Package, onClick: () => handleAction('scroll-dry') },
            { id: 'cat-pnt', label: 'Painting (PNT)', icon: PaintBucket, onClick: () => handleAction('scroll-pnt') },
            { id: 'cat-plm', label: 'Plumbing (PLM)', icon: Wrench, onClick: () => handleAction('scroll-plm') },
            { id: 'cat-elc', label: 'Electrical (ELC)', icon: Zap, onClick: () => handleAction('scroll-elc') },
            { id: 'cat-gen', label: 'General (GEN)', icon: Hammer, onClick: () => handleAction('scroll-gen') },
          ]
        },
        {
          title: 'Templates',
          items: [
            { id: 'tpl-roof-replace', label: 'Roof Replacement', icon: Folder, onClick: () => handleAction('template-roof') },
            { id: 'tpl-siding', label: 'Siding Repair', icon: Folder, onClick: () => handleAction('template-siding') },
            { id: 'tpl-storm', label: 'Storm Damage', icon: Folder, onClick: () => handleAction('template-storm') },
            { id: 'tpl-interior', label: 'Interior Repairs', icon: Folder, onClick: () => handleAction('template-interior') },
          ]
        },
        {
          title: 'Recent',
          items: [
            { id: 'recent-1', label: 'Johnson Roof - Draft', icon: Clock, onClick: () => handleAction('open-recent-1') },
            { id: 'recent-2', label: 'Smith Siding - Sent', icon: Send, onClick: () => handleAction('open-recent-2'), badge: 'Sent' },
            { id: 'recent-3', label: 'Miller Storm - Approved', icon: Star, onClick: () => handleAction('open-recent-3'), badge: 'Approved' },
          ]
        },
        {
          title: 'Export',
          items: [
            { id: 'export-pdf', label: 'Download PDF', icon: Download, onClick: () => handleAction('export-pdf') },
            { id: 'export-print', label: 'Print', icon: Printer, onClick: () => handleAction('print') },
            { id: 'export-send', label: 'Send to Client', icon: Send, onClick: () => handleAction('send-client') },
          ]
        }
      ];
    }

    // Dashboard Home Sidebar
    if (currentView === AppView.DASHBOARD_HOME || currentView === AppView.DASHBOARD) {
      return [
        {
          title: 'Quick Actions',
          items: [
            { id: 'new-job', label: 'New Job', icon: Plus, onClick: () => onNavigate(AppView.DASHBOARD_JOBS) },
            { id: 'new-estimate', label: 'New Estimate', icon: Calculator, onClick: () => onNavigate(AppView.DASHBOARD_ESTIMATES) },
            { id: 'new-contact', label: 'New Contact', icon: Users, onClick: () => onNavigate(AppView.DASHBOARD_CONTACTS) },
          ]
        },
        {
          title: 'Navigate',
          items: [
            { id: 'nav-dashboard', label: 'Dashboard', icon: Home, isActive: true, onClick: () => onNavigate(AppView.DASHBOARD_HOME) },
            { id: 'nav-jobs', label: 'Jobs', icon: Briefcase, onClick: () => onNavigate(AppView.DASHBOARD_JOBS) },
            { id: 'nav-contacts', label: 'Contacts', icon: Users, onClick: () => onNavigate(AppView.DASHBOARD_CONTACTS) },
            { id: 'nav-calendar', label: 'Calendar', icon: Calendar, onClick: () => onNavigate(AppView.DASHBOARD_CALENDAR) },
            { id: 'nav-inbox', label: 'Inbox', icon: Inbox, badge: 3, onClick: () => onNavigate(AppView.DASHBOARD_INBOX) },
            { id: 'nav-tasks', label: 'Tasks', icon: CheckSquare, badge: 5, onClick: () => onNavigate(AppView.DASHBOARD_TASKS) },
          ]
        },
        {
          title: 'Reports',
          items: [
            { id: 'reports', label: 'Analytics', icon: BarChart3, onClick: () => onNavigate(AppView.DASHBOARD_REPORTS) },
            { id: 'workflows', label: 'Workflows', icon: GitBranch, onClick: () => onNavigate(AppView.DASHBOARD_WORKFLOWS) },
          ]
        }
      ];
    }

    // Jobs View Sidebar
    if (currentView === AppView.DASHBOARD_JOBS || currentView === AppView.DASHBOARD_JOB_DETAIL) {
      return [
        {
          title: 'Actions',
          items: [
            { id: 'new-job', label: 'New Job', icon: Plus, onClick: () => handleAction('new-job') },
          ]
        },
        {
          title: 'Filter by Status',
          items: [
            { id: 'filter-all', label: 'All Jobs', icon: Briefcase, badge: 24, onClick: () => handleAction('filter-all') },
            { id: 'filter-open', label: 'Open', icon: Clock, badge: 8, onClick: () => handleAction('filter-open') },
            { id: 'filter-in-progress', label: 'In Progress', icon: Hammer, badge: 12, onClick: () => handleAction('filter-progress') },
            { id: 'filter-completed', label: 'Completed', icon: CheckSquare, badge: 4, onClick: () => handleAction('filter-completed') },
          ]
        },
        {
          title: 'Filter by Type',
          items: [
            { id: 'type-residential', label: 'Residential', icon: Home, onClick: () => handleAction('type-residential') },
            { id: 'type-commercial', label: 'Commercial', icon: Building2, onClick: () => handleAction('type-commercial') },
          ]
        }
      ];
    }

    // Contacts View Sidebar
    if (currentView === AppView.DASHBOARD_CONTACTS) {
      return [
        {
          title: 'Actions',
          items: [
            { id: 'new-contact', label: 'New Contact', icon: Plus, onClick: () => handleAction('new-contact') },
            { id: 'import', label: 'Import Contacts', icon: Download, onClick: () => handleAction('import-contacts') },
          ]
        },
        {
          title: 'Filter',
          items: [
            { id: 'filter-all', label: 'All Contacts', icon: Users, badge: 156, onClick: () => handleAction('filter-all') },
            { id: 'filter-customers', label: 'Customers', icon: Users, badge: 89, onClick: () => handleAction('filter-customers') },
            { id: 'filter-leads', label: 'Leads', icon: Star, badge: 45, onClick: () => handleAction('filter-leads') },
            { id: 'filter-adjusters', label: 'Adjusters', icon: FileCheck, badge: 22, onClick: () => handleAction('filter-adjusters') },
          ]
        }
      ];
    }

    // Default/Landing sidebar
    return [
      {
        title: 'Quick Links',
        items: [
          { id: 'services', label: 'Our Services', icon: FileText, onClick: () => onNavigate(AppView.SERVICES) },
          { id: 'estimate-builder', label: 'Estimate Builder', icon: Calculator, onClick: () => onNavigate(AppView.ESTIMATE_BUILDER) },
          { id: 'labs', label: 'Creative Labs', icon: Zap, onClick: () => onNavigate(AppView.LABS) },
        ]
      },
      {
        title: 'Resources',
        items: [
          { id: 'help', label: 'Help Center', icon: HelpCircle, onClick: () => handleAction('help') },
          { id: 'contact', label: 'Contact Us', icon: Send, onClick: () => handleAction('contact') },
        ]
      }
    ];
  };

  const sections = getSidebarContent();

  if (isCollapsed) {
    return (
      <aside className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col py-4">
        {sections.flatMap((section) =>
          section.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center justify-center p-3 transition-all ${
                  item.isActive
                    ? 'bg-cyan-600/20 text-cyan-400 border-r-2 border-cyan-400'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })
        )}
      </aside>
    );
  }

  return (
    <aside className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="border-b border-slate-800/50 last:border-b-0">
          {section.title && (
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {section.title}
            </div>
          )}
          <div className="px-2 pb-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all text-left group ${
                    item.isActive
                      ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      typeof item.badge === 'number'
                        ? 'bg-slate-700 text-slate-400'
                        : item.badge === 'Approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.badge === 'Sent'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-700 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
};

export default ContextualSidebar;
