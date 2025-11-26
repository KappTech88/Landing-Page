import React, { useState } from 'react';
import {
  Settings,
  User,
  Building2,
  Bell,
  Mail,
  Calendar,
  Lock,
  Palette,
  Globe,
  Link2,
  CreditCard,
  Users,
  Shield,
  Save,
  Check,
  X,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { isGoogleConnected, signInWithGoogle, signOutGoogle } from '../../services/googleWorkspaceService';

const CRMSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'notifications' | 'integrations' | 'security' | 'billing'>('profile');
  const [googleConnected, setGoogleConnected] = useState(isGoogleConnected());
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@estimatereliance.com',
    phone: '(214) 555-0100',
    title: 'Owner',
    avatar_url: '',
  });

  const [companyData, setCompanyData] = useState({
    name: 'Estimate Reliance',
    email: 'contact@estimatereliance.com',
    phone: '(214) 555-0100',
    website: 'https://estimatereliance.com',
    address: '1234 Business Parkway',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    license_number: 'TX-12345',
    insurance_policy: 'INS-98765',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_new_lead: true,
    email_status_change: true,
    email_task_reminder: true,
    email_payment_received: true,
    sms_new_lead: false,
    sms_appointment_reminder: true,
    push_enabled: true,
    daily_digest: true,
    weekly_report: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    session_timeout: '30',
    login_notifications: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 3000);
  };

  const handleConnectGoogle = async () => {
    try {
      const credentials = await signInWithGoogle();
      if (credentials) {
        setGoogleConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect Google:', error);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await signOutGoogle();
      setGoogleConnected(false);
    } catch (error) {
      console.error('Failed to disconnect Google:', error);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'company' as const, label: 'Company', icon: Building2 },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'integrations' as const, label: 'Integrations', icon: Link2 },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Profile Settings</h2>
              <p className="text-slate-400 text-sm">Manage your personal information and preferences</p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {profileData.first_name[0]}{profileData.last_name[0]}
              </div>
              <div>
                <button className="px-4 py-2 bg-slate-700/50 text-white rounded-xl hover:bg-slate-700 transition-colors text-sm">
                  Change Photo
                </button>
                <p className="text-slate-500 text-xs mt-1">JPG, PNG up to 2MB</p>
              </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Job Title</label>
                <input
                  type="text"
                  value={profileData.title}
                  onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Company Settings</h2>
              <p className="text-slate-400 text-sm">Manage your business information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Business Email</label>
                <input
                  type="email"
                  value={companyData.email}
                  onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Business Phone</label>
                <input
                  type="tel"
                  value={companyData.phone}
                  onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                <input
                  type="url"
                  value={companyData.website}
                  onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">License Number</label>
                <input
                  type="text"
                  value={companyData.license_number}
                  onChange={(e) => setCompanyData({ ...companyData, license_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                <input
                  type="text"
                  value={companyData.address}
                  onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                <input
                  type="text"
                  value={companyData.city}
                  onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                  <input
                    type="text"
                    value={companyData.state}
                    onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={companyData.zip}
                    onChange={(e) => setCompanyData({ ...companyData, zip: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Notification Preferences</h2>
              <p className="text-slate-400 text-sm">Choose how you want to be notified</p>
            </div>

            {/* Email Notifications */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400" />
                Email Notifications
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'email_new_lead', label: 'New lead or claim received', description: 'Get notified when a new lead is added' },
                  { key: 'email_status_change', label: 'Status changes', description: 'When a job status is updated' },
                  { key: 'email_task_reminder', label: 'Task reminders', description: 'Reminders for upcoming and overdue tasks' },
                  { key: 'email_payment_received', label: 'Payment received', description: 'When a payment is recorded' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">{item.label}</p>
                      <p className="text-slate-500 text-xs">{item.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings({
                        ...notificationSettings,
                        [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings],
                      })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? 'bg-cyan-500'
                          : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? 'translate-x-6'
                          : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SMS Notifications */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                SMS Notifications
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'sms_new_lead', label: 'New leads', description: 'Text message for new leads' },
                  { key: 'sms_appointment_reminder', label: 'Appointment reminders', description: 'SMS reminders before appointments' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">{item.label}</p>
                      <p className="text-slate-500 text-xs">{item.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings({
                        ...notificationSettings,
                        [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings],
                      })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? 'bg-cyan-500'
                          : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? 'translate-x-6'
                          : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Reports */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Scheduled Reports
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'daily_digest', label: 'Daily digest', description: 'Summary of daily activity' },
                  { key: 'weekly_report', label: 'Weekly report', description: 'Comprehensive weekly performance report' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">{item.label}</p>
                      <p className="text-slate-500 text-xs">{item.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings({
                        ...notificationSettings,
                        [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings],
                      })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? 'bg-cyan-500'
                          : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? 'translate-x-6'
                          : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Integrations</h2>
              <p className="text-slate-400 text-sm">Connect third-party services to enhance your CRM</p>
            </div>

            {/* Google Workspace */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Google Workspace</h3>
                    <p className="text-slate-400 text-sm mt-1">Sync Gmail, Calendar, and Contacts</p>
                    <div className="flex items-center gap-2 mt-2">
                      {googleConnected ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 text-slate-400 rounded-lg text-xs">
                          Not connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={googleConnected ? handleDisconnectGoogle : handleConnectGoogle}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    googleConnected
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                  }`}
                >
                  {googleConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
              {googleConnected && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 text-sm">Gmail</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-300 text-sm">Calendar</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-300 text-sm">Contacts</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Other Integrations */}
            {[
              { name: 'QuickBooks', description: 'Accounting and invoicing', icon: '📊', connected: false },
              { name: 'Xactimate', description: 'Estimation software', icon: '📋', connected: false },
              { name: 'Slack', description: 'Team communication', icon: '💬', connected: false },
              { name: 'Zapier', description: 'Connect to 5000+ apps', icon: '⚡', connected: false },
            ].map((integration) => (
              <div key={integration.name} className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{integration.name}</h3>
                      <p className="text-slate-400 text-sm">{integration.description}</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors">
                    Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>
              <p className="text-slate-400 text-sm">Manage your account security</p>
            </div>

            {/* Change Password */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                Change Password
              </h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <button className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm hover:bg-cyan-500/30 transition-colors">
                  Update Password
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Two-Factor Authentication</h3>
                    <p className="text-slate-400 text-sm">Add an extra layer of security to your account</p>
                  </div>
                </div>
                <button
                  onClick={() => setSecuritySettings({
                    ...securitySettings,
                    two_factor_enabled: !securitySettings.two_factor_enabled,
                  })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    securitySettings.two_factor_enabled
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {securitySettings.two_factor_enabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>

            {/* Session Timeout */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4">Session Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Auto-logout after inactivity</label>
                  <select
                    value={securitySettings.session_timeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, session_timeout: e.target.value })}
                    className="w-full max-w-xs px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Billing & Subscription</h2>
              <p className="text-slate-400 text-sm">Manage your subscription and payment methods</p>
            </div>

            {/* Current Plan */}
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-medium">Current Plan</span>
                  <h3 className="text-2xl font-bold text-white mt-2">Professional</h3>
                  <p className="text-slate-300">$199/month</p>
                </div>
                <button className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors">
                  Upgrade Plan
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-slate-400 text-sm">Users</p>
                  <p className="text-white font-medium">5 / 10</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Storage</p>
                  <p className="text-white font-medium">25 GB / 50 GB</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Claims</p>
                  <p className="text-white font-medium">Unlimited</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Renewal</p>
                  <p className="text-white font-medium">Dec 15, 2024</p>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                Payment Method
              </h3>
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <p className="text-white">•••• •••• •••• 4242</p>
                    <p className="text-slate-400 text-sm">Expires 12/25</p>
                  </div>
                </div>
                <button className="text-cyan-400 hover:text-cyan-300 text-sm">Update</button>
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-4">Billing History</h3>
              <div className="space-y-3">
                {[
                  { date: 'Nov 15, 2024', amount: '$199.00', status: 'Paid' },
                  { date: 'Oct 15, 2024', amount: '$199.00', status: 'Paid' },
                  { date: 'Sep 15, 2024', amount: '$199.00', status: 'Paid' },
                ].map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                    <div>
                      <p className="text-white text-sm">{invoice.date}</p>
                      <p className="text-slate-400 text-xs">Professional Plan</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{invoice.amount}</p>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs">{invoice.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-l-2 border-cyan-500'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              {renderContent()}

              {/* Save Button */}
              {activeTab !== 'billing' && activeTab !== 'integrations' && (
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                  {showSavedMessage && (
                    <span className="flex items-center gap-2 text-emerald-400 text-sm">
                      <Check className="w-4 h-4" />
                      Changes saved successfully
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMSettings;
