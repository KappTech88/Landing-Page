import React, { useState, useEffect } from 'react';
import {
  Search,
  Mail,
  Star,
  StarOff,
  Reply,
  Forward,
  Trash2,
  Archive,
  Tag,
  MoreVertical,
  Paperclip,
  Send,
  X,
  RefreshCw,
  Inbox,
  SendHorizontal,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  Plus,
  Link2,
  User,
} from 'lucide-react';
import { CRMEmail } from '../../types';
import {
  isGoogleConnected,
  signInWithGoogle,
  fetchEmails,
  sendEmail,
  markEmailAsRead,
  starEmail,
} from '../../services/googleWorkspaceService';

const CRMInbox: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent' | 'drafts' | 'starred'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<CRMEmail | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Mock emails for demo
  const [emails, setEmails] = useState<CRMEmail[]>([
    {
      id: '1',
      organization_id: 'org-1',
      from_email: 'mike.williams@statefarm.com',
      from_name: 'Mike Williams',
      to_emails: ['admin@estimatereliance.com'],
      subject: 'Re: Claim #SF-2024-4521 - Johnson Property Assessment',
      body_text: 'Hi,\n\nThank you for submitting the assessment report for the Johnson property claim. I have reviewed the documentation and have a few questions regarding the scope of work.\n\nCould we schedule a call this week to discuss the following items:\n1. The roof replacement specifications\n2. Additional damage to the gutters\n3. Timeline for completion\n\nPlease let me know your availability.\n\nBest regards,\nMike Williams\nSenior Claims Adjuster\nState Farm Insurance',
      body_html: '',
      snippet: 'Thank you for submitting the assessment report for the Johnson property claim...',
      is_read: false,
      is_starred: true,
      is_sent: false,
      is_draft: false,
      has_attachments: true,
      attachments: [
        { name: 'claim_assessment.pdf', size: 2458000, mime_type: 'application/pdf' }
      ],
      labels: ['INBOX', 'IMPORTANT'],
      received_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: 'org-1',
      from_email: 'sarah.johnson@email.com',
      from_name: 'Sarah Johnson',
      to_emails: ['admin@estimatereliance.com'],
      subject: 'New Claim Inquiry - Storm Damage',
      body_text: 'Hello,\n\nI was referred to your company by a neighbor who had their roof replaced after the recent hailstorm. We believe our property sustained similar damage and would like to schedule an inspection.\n\nOur address is 567 Pine Avenue, Fort Worth, TX.\n\nPlease let me know when you have availability.\n\nThank you,\nSarah Johnson',
      snippet: 'I was referred to your company by a neighbor who had their roof replaced...',
      is_read: false,
      is_starred: false,
      is_sent: false,
      is_draft: false,
      has_attachments: false,
      labels: ['INBOX'],
      received_at: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      organization_id: 'org-1',
      from_email: 'admin@estimatereliance.com',
      from_name: 'Estimate Reliance',
      to_emails: ['emily.davis@email.com'],
      subject: 'Your Project Completion Summary - Davis Residence',
      body_text: 'Dear Emily,\n\nWe are pleased to inform you that the restoration work at your property has been completed. Attached you will find the final inspection report and warranty documentation.\n\nThank you for choosing Estimate Reliance!\n\nBest regards,\nEstimate Reliance Team',
      snippet: 'We are pleased to inform you that the restoration work at your property...',
      is_read: true,
      is_starred: false,
      is_sent: true,
      is_draft: false,
      has_attachments: true,
      attachments: [
        { name: 'final_report.pdf', size: 1580000, mime_type: 'application/pdf' },
        { name: 'warranty.pdf', size: 890000, mime_type: 'application/pdf' }
      ],
      labels: ['SENT'],
      received_at: new Date(Date.now() - 86400000).toISOString(),
      sent_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      organization_id: 'org-1',
      from_email: 'robert@abcroofing.com',
      from_name: 'Robert Martinez',
      to_emails: ['admin@estimatereliance.com'],
      subject: 'Material Quote - Shingles Order',
      body_text: 'Hi,\n\nAs requested, please find attached our quote for the roofing materials for your upcoming projects.\n\nQuantity: 50 squares\nMaterial: CertainTeed Landmark PRO\nColor: Weathered Wood\nPrice: $125/square\n\nLet me know if you need any adjustments.\n\nThanks,\nRobert Martinez\nABC Roofing Supplies',
      snippet: 'As requested, please find attached our quote for the roofing materials...',
      is_read: true,
      is_starred: false,
      is_sent: false,
      is_draft: false,
      has_attachments: true,
      labels: ['INBOX'],
      received_at: new Date(Date.now() - 172800000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: '5',
      organization_id: 'org-1',
      from_email: 'claims@libertymutual.com',
      from_name: 'Liberty Mutual Claims',
      to_emails: ['admin@estimatereliance.com'],
      subject: 'Claim Approved - Williams Commercial Property',
      body_text: 'Dear Partner,\n\nWe are pleased to inform you that Claim #LM-2024-8892 for the Williams Commercial Property has been approved.\n\nApproved Amount: $42,500.00\n\nPayment will be processed within 5-7 business days.\n\nRegards,\nLiberty Mutual Claims Department',
      snippet: 'We are pleased to inform you that Claim #LM-2024-8892 has been approved...',
      is_read: true,
      is_starred: true,
      is_sent: false,
      is_draft: false,
      has_attachments: false,
      labels: ['INBOX', 'IMPORTANT'],
      received_at: new Date(Date.now() - 259200000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ]);

  const [composeEmail, setComposeEmail] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    setGoogleConnected(isGoogleConnected());
  }, []);

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    try {
      const credentials = await signInWithGoogle();
      if (credentials) {
        setGoogleConnected(true);
        await handleSyncEmails();
      }
    } catch (error) {
      console.error('Failed to connect Google:', error);
    }
    setIsLoading(false);
  };

  const handleSyncEmails = async () => {
    setIsSyncing(true);
    try {
      const googleEmails = await fetchEmails(50);
      // In production, merge with existing emails
      console.log('Synced emails:', googleEmails.length);
    } catch (error) {
      console.error('Failed to sync emails:', error);
    }
    setIsSyncing(false);
  };

  const handleSendEmail = async () => {
    if (!composeEmail.to || !composeEmail.subject) return;

    try {
      const toEmails = composeEmail.to.split(',').map(e => e.trim());
      const ccEmails = composeEmail.cc ? composeEmail.cc.split(',').map(e => e.trim()) : undefined;
      const bccEmails = composeEmail.bcc ? composeEmail.bcc.split(',').map(e => e.trim()) : undefined;

      if (googleConnected) {
        await sendEmail(toEmails, composeEmail.subject, composeEmail.body, ccEmails, bccEmails);
      }

      // Add to local emails as sent
      const newEmail: CRMEmail = {
        id: Date.now().toString(),
        organization_id: 'org-1',
        from_email: 'admin@estimatereliance.com',
        from_name: 'Estimate Reliance',
        to_emails: toEmails,
        cc_emails: ccEmails,
        bcc_emails: bccEmails,
        subject: composeEmail.subject,
        body_text: composeEmail.body,
        snippet: composeEmail.body.slice(0, 100),
        is_read: true,
        is_starred: false,
        is_sent: true,
        is_draft: false,
        has_attachments: false,
        labels: ['SENT'],
        received_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      setEmails([newEmail, ...emails]);
      setShowComposeModal(false);
      setComposeEmail({ to: '', cc: '', bcc: '', subject: '', body: '' });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const handleToggleStar = async (email: CRMEmail) => {
    if (googleConnected && email.gmail_message_id) {
      await starEmail(email.gmail_message_id, !email.is_starred);
    }
    setEmails(emails.map(e =>
      e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
    ));
  };

  const handleMarkAsRead = async (email: CRMEmail) => {
    if (!email.is_read) {
      if (googleConnected && email.gmail_message_id) {
        await markEmailAsRead(email.gmail_message_id);
      }
      setEmails(emails.map(e =>
        e.id === email.id ? { ...e, is_read: true } : e
      ));
    }
  };

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFolder =
      selectedFolder === 'inbox' ? !email.is_sent && !email.is_draft :
      selectedFolder === 'sent' ? email.is_sent :
      selectedFolder === 'drafts' ? email.is_draft :
      selectedFolder === 'starred' ? email.is_starred : true;

    return matchesSearch && matchesFolder;
  });

  const folders = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: emails.filter(e => !e.is_read && !e.is_sent).length },
    { id: 'sent' as const, label: 'Sent', icon: SendHorizontal, count: 0 },
    { id: 'starred' as const, label: 'Starred', icon: Star, count: emails.filter(e => e.is_starred).length },
    { id: 'drafts' as const, label: 'Drafts', icon: FileText, count: emails.filter(e => e.is_draft).length },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="w-full lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 p-4 bg-slate-900/30">
        <button
          onClick={() => setShowComposeModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/25 mb-4"
        >
          <Plus className="w-4 h-4" />
          Compose
        </button>

        {/* Google Connection Status */}
        {!googleConnected ? (
          <button
            onClick={handleConnectGoogle}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-3 py-2 mb-4 bg-slate-800/50 border border-white/10 text-white rounded-xl text-sm hover:bg-slate-700 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isLoading ? 'Connecting...' : 'Connect Gmail'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-sm text-emerald-300">Gmail Connected</span>
            <button
              onClick={handleSyncEmails}
              disabled={isSyncing}
              className="ml-auto p-1 hover:bg-white/10 rounded"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Folders */}
        <nav className="space-y-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                selectedFolder === folder.id
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <folder.icon className="w-4 h-4" />
                {folder.label}
              </div>
              {folder.count > 0 && (
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-xs">
                  {folder.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Email List */}
      <div className={`flex-1 flex flex-col ${selectedEmail ? 'hidden lg:flex' : ''}`}>
        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Mail className="w-12 h-12 mb-3 text-slate-600" />
              <p>No emails found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    handleMarkAsRead(email);
                  }}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 ${
                    !email.is_read ? 'bg-cyan-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(email);
                      }}
                      className={`mt-1 ${email.is_starred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      {email.is_starred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm truncate ${!email.is_read ? 'text-white font-semibold' : 'text-slate-300'}`}>
                          {email.is_sent ? email.to_emails[0] : (email.from_name || email.from_email)}
                        </p>
                        <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                          {formatDate(email.received_at)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!email.is_read ? 'text-white' : 'text-slate-400'}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {email.snippet}
                      </p>
                      {email.has_attachments && (
                        <div className="flex items-center gap-1 mt-1 text-slate-500">
                          <Paperclip className="w-3 h-3" />
                          <span className="text-xs">{email.attachments?.length} attachment(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      {selectedEmail && (
        <div className="flex-1 flex flex-col lg:border-l border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/30">
            <button
              onClick={() => setSelectedEmail(null)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                <Reply className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                <Forward className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                <Archive className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <h1 className="text-xl font-semibold text-white mb-4">{selectedEmail.subject}</h1>

            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {(selectedEmail.from_name || selectedEmail.from_email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">
                    {selectedEmail.from_name || selectedEmail.from_email}
                  </p>
                  <span className="text-sm text-slate-500">
                    {new Date(selectedEmail.received_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  to {selectedEmail.to_emails.join(', ')}
                </p>
              </div>
            </div>

            {/* Email Body */}
            <div className="prose prose-invert max-w-none">
              <div className="text-slate-300 whitespace-pre-wrap">
                {selectedEmail.body_text || selectedEmail.body_html}
              </div>
            </div>

            {/* Attachments */}
            {selectedEmail.has_attachments && selectedEmail.attachments && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Attachments ({selectedEmail.attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedEmail.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{attachment.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Reply */}
          <div className="p-4 border-t border-white/10 bg-slate-900/30">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Write a quick reply..."
                className="flex-1 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button className="p-2 bg-cyan-500/20 text-cyan-300 rounded-xl hover:bg-cyan-500/30 transition-colors">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center">
          <div className="bg-slate-800 border border-white/10 rounded-t-2xl lg:rounded-2xl w-full lg:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">New Message</h2>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="To"
                  value={composeEmail.to}
                  onChange={(e) => setComposeEmail({ ...composeEmail, to: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Cc"
                  value={composeEmail.cc}
                  onChange={(e) => setComposeEmail({ ...composeEmail, cc: e.target.value })}
                  className="flex-1 px-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
                <input
                  type="text"
                  placeholder="Bcc"
                  value={composeEmail.bcc}
                  onChange={(e) => setComposeEmail({ ...composeEmail, bcc: e.target.value })}
                  className="flex-1 px-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeEmail.subject}
                  onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <textarea
                  rows={12}
                  placeholder="Write your message..."
                  value={composeEmail.body}
                  onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                  <Link2 className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  Discard
                </button>
                <button
                  onClick={handleSendEmail}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMInbox;
