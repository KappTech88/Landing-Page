import React, { useState, useEffect } from 'react';
import { MessageSquare, Pin, AtSign, Search, Plus } from 'lucide-react';
import { JobNote, User } from '../../../../types';
import { NotesList } from './NotesList';
import { NoteInput } from './NoteInput';

type FilterTab = 'all' | 'mentions' | 'pinned';

interface CommunicationsPanelProps {
  jobId: string;
  organizationId: string;
  currentUserId?: string;
}

// Mock users for demonstration
const mockUsers: User[] = [
  { id: 'user-1', email: 'john@example.com', full_name: 'John Doe', title: 'Project Manager', is_active: true, is_email_verified: true, phone_verified: false, created_at: '', updated_at: '' },
  { id: 'user-2', email: 'jane@example.com', full_name: 'Jane Smith', title: 'Sales Rep', is_active: true, is_email_verified: true, phone_verified: false, created_at: '', updated_at: '' },
  { id: 'user-3', email: 'mike@example.com', full_name: 'Mike Johnson', title: 'Estimator', is_active: true, is_email_verified: true, phone_verified: false, created_at: '', updated_at: '' },
];

// Initial mock notes
const initialMockNotes: JobNote[] = [
  {
    id: 'note-1',
    job_id: '1',
    organization_id: 'org-1',
    content: 'Homeowner confirmed materials delivery for Monday morning.',
    note_type: 'general',
    created_by: 'user-1',
    is_pinned: false,
    is_internal: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    author: mockUsers[0],
    replies: [],
    reply_count: 0,
  },
  {
    id: 'note-2',
    job_id: '1',
    organization_id: 'org-1',
    content: '@Mike Johnson Can you confirm crew availability for next week?',
    note_type: 'mention',
    created_by: 'user-2',
    is_pinned: true,
    is_internal: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    author: mockUsers[1],
    mentions: [{ id: 'm-1', note_id: 'note-2', mentioned_user_id: 'user-3', organization_id: 'org-1', notification_sent: true, is_read: false, has_responded: true, created_at: '', mentioned_user: mockUsers[2] }],
    replies: [
      {
        id: 'note-3',
        job_id: '1',
        organization_id: 'org-1',
        content: 'Yes, crew is available. Will be there 8am Monday.',
        note_type: 'reply',
        parent_note_id: 'note-2',
        created_by: 'user-3',
        is_pinned: false,
        is_internal: true,
        created_at: new Date(Date.now() - 5400000).toISOString(),
        updated_at: new Date(Date.now() - 5400000).toISOString(),
        author: mockUsers[2],
      }
    ],
    reply_count: 1,
  },
];

export const CommunicationsPanel: React.FC<CommunicationsPanelProps> = ({
  jobId,
  organizationId,
  currentUserId = 'user-1'
}) => {
  const [notes, setNotes] = useState<JobNote[]>(initialMockNotes);
  const [accessUsers] = useState<User[]>(mockUsers);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitNote = async (content: string, mentionedUserIds: string[]) => {
    setIsSubmitting(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const newNote: JobNote = {
      id: `note-${Date.now()}`,
      job_id: jobId,
      organization_id: organizationId,
      content,
      note_type: mentionedUserIds.length > 0 ? 'mention' : 'general',
      created_by: currentUserId,
      is_pinned: false,
      is_internal: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: mockUsers.find(u => u.id === currentUserId) || mockUsers[0],
      mentions: mentionedUserIds.map(userId => ({
        id: `m-${Date.now()}-${userId}`,
        note_id: `note-${Date.now()}`,
        mentioned_user_id: userId,
        organization_id: organizationId,
        notification_sent: true,
        is_read: false,
        has_responded: false,
        created_at: new Date().toISOString(),
        mentioned_user: mockUsers.find(u => u.id === userId),
      })),
      replies: [],
      reply_count: 0,
    };

    setNotes(prev => [newNote, ...prev]);
    setIsSubmitting(false);
  };

  const handleReply = async (parentNoteId: string, content: string, mentionedUserIds: string[]) => {
    const newReply: JobNote = {
      id: `note-${Date.now()}`,
      job_id: jobId,
      organization_id: organizationId,
      content,
      note_type: 'reply',
      parent_note_id: parentNoteId,
      created_by: currentUserId,
      is_pinned: false,
      is_internal: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: mockUsers.find(u => u.id === currentUserId) || mockUsers[0],
    };

    setNotes(prev => prev.map(note => {
      if (note.id === parentNoteId) {
        return {
          ...note,
          replies: [...(note.replies || []), newReply],
          reply_count: (note.reply_count || 0) + 1,
        };
      }
      return note;
    }));
  };

  const loadNotes = async () => {
    // Mock refresh - in real app this would fetch from database
  };

  // Filter notes by search query and active tab
  let filteredNotes = notes;

  if (activeTab === 'pinned') {
    filteredNotes = notes.filter(note => note.is_pinned);
  } else if (activeTab === 'mentions') {
    filteredNotes = notes.filter(note =>
      note.mentions?.some(m => m.mentioned_user_id === currentUserId)
    );
  }

  if (searchQuery) {
    filteredNotes = filteredNotes.filter(note =>
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.author?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'mentions', label: 'Mentions', icon: <AtSign className="w-4 h-4" /> },
    { id: 'pinned', label: 'Pinned', icon: <Pin className="w-4 h-4" /> }
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Communications
          </h3>
          <span className="text-xs text-slate-400">{notes.length} notes</span>
        </div>

        {/* Tabs + Search Row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1 bg-slate-900/50 border border-slate-700/50 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">
              {activeTab === 'mentions'
                ? 'No mentions yet'
                : activeTab === 'pinned'
                ? 'No pinned notes'
                : 'No notes yet'}
            </p>
            <p className="text-xs mt-1">Start the conversation below</p>
          </div>
        ) : (
          <NotesList
            notes={filteredNotes}
            accessUsers={accessUsers}
            currentUserId={currentUserId}
            onReply={handleReply}
            onRefresh={loadNotes}
          />
        )}
      </div>

      {/* Note Input */}
      <div className="border-t border-slate-700/50 p-3">
        <NoteInput
          accessUsers={accessUsers}
          onSubmit={handleSubmitNote}
          isSubmitting={isSubmitting}
          placeholder="Write a note..."
          compact
        />
      </div>
    </div>
  );
};

export default CommunicationsPanel;
