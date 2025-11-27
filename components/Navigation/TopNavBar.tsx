import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  FileText,
  Calculator,
  FileCheck,
  Building2,
  FileEdit,
  Microscope,
  Palette,
  Type,
  CreditCard,
  Image,
  Flag,
  LayoutDashboard,
  Briefcase,
  Users,
  BarChart3,
  LogIn,
  UserPlus,
  ClipboardList,
  Home
} from 'lucide-react';
import { AppView } from '../../types';

interface TopNavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isLoggedIn?: boolean;
}

interface DropdownItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  description?: string;
}

interface DropdownMenu {
  label: string;
  icon: React.ElementType;
  items: DropdownItem[];
}

const TopNavBar: React.FC<TopNavBarProps> = ({ currentView, onNavigate, isLoggedIn = false }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const servicesMenu: DropdownMenu = {
    label: 'Services',
    icon: ClipboardList,
    items: [
      { id: AppView.DENIAL_APPEAL, label: 'Denial Appeal', icon: FileCheck, description: '10% of Total RCV' },
      { id: AppView.XACTIMATE_ESTIMATE, label: 'Xactimate Estimate', icon: Calculator, description: '$150' },
      { id: AppView.SUPPLEMENT_CLAIM, label: 'Supplement Claim', icon: FileText, description: '15% of Supplement' },
      { id: AppView.COMMERCIAL_BID, label: 'Commercial Bid', icon: Building2, description: '$250 + 3%' },
      { id: AppView.CUSTOMIZED_DOCS, label: 'Custom Documents', icon: FileEdit, description: '$50 - $100' },
    ]
  };

  const toolsMenu: DropdownMenu = {
    label: 'Tools',
    icon: Calculator,
    items: [
      { id: AppView.ESTIMATE_BUILDER, label: 'Estimate Builder', icon: Calculator, description: 'Xactimate-style estimates' },
    ]
  };

  const labsMenu: DropdownMenu = {
    label: 'Labs',
    icon: Microscope,
    items: [
      { id: AppView.LABS, label: 'Creative Studio', icon: Palette, description: 'AI-powered design tools' },
    ]
  };

  const dashboardMenu: DropdownMenu = {
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: AppView.DASHBOARD_HOME, label: 'Overview', icon: Home, description: 'Dashboard home' },
      { id: AppView.DASHBOARD_JOBS, label: 'Jobs', icon: Briefcase, description: 'Manage jobs' },
      { id: AppView.DASHBOARD_CONTACTS, label: 'Contacts', icon: Users, description: 'Customer database' },
      { id: AppView.DASHBOARD_ESTIMATES, label: 'Estimates', icon: Calculator, description: 'Create estimates' },
      { id: AppView.DASHBOARD_REPORTS, label: 'Reports', icon: BarChart3, description: 'Analytics & reports' },
    ]
  };

  const menus = isLoggedIn
    ? [servicesMenu, toolsMenu, labsMenu, dashboardMenu]
    : [servicesMenu, toolsMenu, labsMenu];

  const handleItemClick = (itemId: AppView) => {
    onNavigate(itemId);
    setActiveDropdown(null);
  };

  const renderDropdown = (menu: DropdownMenu, index: number) => {
    const isOpen = activeDropdown === menu.label;
    const Icon = menu.icon;

    return (
      <div key={menu.label} className="relative" ref={index === 0 ? dropdownRef : undefined}>
        <button
          onClick={() => setActiveDropdown(isOpen ? null : menu.label)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
            isOpen
              ? 'bg-white/10 text-cyan-400'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{menu.label}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
            >
              <div className="p-2">
                {menu.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left group ${
                        isActive
                          ? 'bg-cyan-600/20 border border-cyan-500/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-white/5 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10'
                      }`}>
                        <ItemIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => onNavigate(AppView.LANDING)}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 group-hover:shadow-cyan-500/80 transition-shadow">
            <span className="text-white font-bold text-sm">ER</span>
          </div>
          <span className="text-white font-semibold hidden sm:block">Estimate Reliance</span>
        </div>

        {/* Navigation Dropdowns */}
        <div className="hidden md:flex items-center gap-1" ref={dropdownRef}>
          {menus.map((menu, index) => renderDropdown(menu, index))}
        </div>

        {/* Right Side - Auth Buttons */}
        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => onNavigate(AppView.REGISTER)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-cyan-300 hover:text-cyan-200 border border-cyan-700 hover:border-cyan-500 rounded-lg transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Register</span>
              </button>
              <button
                onClick={() => onNavigate(AppView.PORTAL)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer">
                <span className="text-white text-xs font-bold">JD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu - Simplified */}
      <div className="md:hidden border-t border-white/5 px-4 py-2 flex gap-2 overflow-x-auto">
        {menus.map((menu) => {
          const Icon = menu.icon;
          return (
            <button
              key={menu.label}
              onClick={() => setActiveDropdown(activeDropdown === menu.label ? null : menu.label)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                activeDropdown === menu.label
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {menu.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TopNavBar;
