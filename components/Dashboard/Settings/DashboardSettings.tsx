import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Bell,
  Plug,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { SettingsSection } from '../../../types';
import ProductionPricingSettings from './ProductionPricingSettings';

interface DashboardSettingsProps {
  organizationId?: string;
}

const DashboardSettings: React.FC<DashboardSettingsProps> = ({ organizationId }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('production-pricing');

  const settingsSections = [
    {
      id: 'general' as SettingsSection,
      label: 'General',
      icon: Building2,
      description: 'Organization profile and branding'
    },
    {
      id: 'production-pricing' as SettingsSection,
      label: 'Production & Pricing',
      icon: DollarSign,
      description: 'Vendors, materials, labor rates, and Xactimate pricing'
    },
    {
      id: 'users' as SettingsSection,
      label: 'Users',
      icon: Users,
      description: 'Manage team members and access'
    },
    {
      id: 'roles' as SettingsSection,
      label: 'Roles & Permissions',
      icon: Shield,
      description: 'Configure roles and access levels'
    },
    {
      id: 'notifications' as SettingsSection,
      label: 'Notifications',
      icon: Bell,
      description: 'Email and alert preferences'
    },
    {
      id: 'integrations' as SettingsSection,
      label: 'Integrations',
      icon: Plug,
      description: 'Connect external services'
    }
  ];

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'production-pricing':
        return <ProductionPricingSettings organizationId={organizationId} />;
      case 'general':
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>General settings coming soon...</p>
          </div>
        );
      case 'users':
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>User management coming soon...</p>
          </div>
        );
      case 'roles':
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Roles & permissions coming soon...</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Notification settings coming soon...</p>
          </div>
        );
      case 'integrations':
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Integrations coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-slate-400 text-sm">Manage your organization settings</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Settings Navigation Sidebar */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300">Settings Menu</h3>
            </div>
            <nav className="p-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-all text-left ${
                      isActive
                        ? 'bg-cyan-600/20 border border-cyan-500/30'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isActive ? 'text-cyan-400' : 'text-slate-200'}`}>
                        {section.label}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{section.description}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
