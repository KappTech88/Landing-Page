import React, { useState, useEffect } from 'react';
import { MessageSquare, Pin, AtSign, Search, Plus } from 'lucide-react';
import { JobNote, User } from '../../../../types';
import { NotesList } from './NotesList';
import { NoteInput } from './NoteInput';
import {
  getJobNotes,
  getJobAccessUsers,
  createJobNote,
  subscribeToJobNotes
} from '../../../../lib/supabase';

type FilterTab = 'all' | 'mentions' | 'pinned';

interface CommunicationsPanelProps {
  jobId: string;
  organizationId: string;
  currentUserId?: string;
}

export const CommunicationsPanel: React.FC<CommunicationsPanelProps> = ({
  jobId,
  organizationId,
  currentUserId
}) => {
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [accessUsers, setAccessUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load notes and access users
  useEffect(() => {
    loadData();
  }, [jobId, activeTab]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = subscribeToJobNotes(jobId, (payload) => {
      // Reload notes when there are changes
      loadNotes();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [jobId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadNotes(), loadAccessUsers()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const data = await getJobNotes(jobId, {
        filter: activeTab,
        userId: currentUserId
      });
      setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadAccessUsers = async () => {
    try {
      const users = await getJobAccessUsers(jobId);
      setAccessUsers(users);
    } catch (error) {
      console.error('Error loading access users:', error);
    }
  };

  const handleSubmitNote = async (content: string, mentionedUserIds: string[]) => {
    setIsSubmitting(true);
    try {
      await createJobNote(jobId, organizationId, content, {
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined
      });
      await loadNotes();
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentNoteId: string, content: string, mentionedUserIds: string[]) => {
    try {
      await createJobNote(jobId, organizationId, content, {
        parentNoteId,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined
      });
      await loadNotes();
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  // Filter notes by search query
  const filteredNotes = searchQuery
    ? notes.filter(note =>
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.author?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

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
