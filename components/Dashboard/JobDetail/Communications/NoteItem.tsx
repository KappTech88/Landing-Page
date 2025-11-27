import React, { useState } from 'react';
import { Reply, Pin, MoreHorizontal, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { JobNote, User } from '../../../../types';
import { UserAvatar } from '../../shared/UserAvatar';
import { NoteInput } from './NoteInput';
import { toggleNotePin, deleteJobNote } from '../../../../lib/supabase';

interface NoteItemProps {
  note: JobNote;
  accessUsers: User[];
  currentUserId?: string;
  onReply: (parentNoteId: string, content: string, mentionedUserIds: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  isReply?: boolean;
}

export const NoteItem: React.FC<NoteItemProps> = ({
  note,
  accessUsers,
  currentUserId,
  onReply,
  onRefresh,
  isReply = false
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwnNote = currentUserId === note.created_by;
  const hasReplies = (note.replies?.length ?? 0) > 0;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleReplySubmit = async (content: string, mentionedUserIds: string[]) => {
    setIsSubmitting(true);
    try {
      await onReply(note.id, content, mentionedUserIds);
      setShowReplyInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async () => {
    try {
      await toggleNotePin(note.id);
      await onRefresh();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteJobNote(note.id);
      await onRefresh();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
    setShowMenu(false);
  };

  // Parse content and highlight @mentions
  const renderContent = (content: string) => {
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      // Check if this part is a mention (odd indices after split)
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-cyan-400 font-medium">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`${isReply ? 'pl-10 bg-slate-900/20' : ''}`}>
      <div className="px-4 py-3 hover:bg-slate-700/20 transition-colors">
        <div className="flex gap-3">
          {/* Avatar */}
          <UserAvatar user={note.author} size="md" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-white truncate">
                  {note.author?.full_name || 'Unknown User'}
                </span>
                {note.author?.title && (
                  <span className="text-xs text-slate-500 truncate">
                    {note.author.title}
                  </span>
                )}
                {note.is_pinned && (
                  <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                )}
                {note.edited_at && (
                  <span className="text-xs text-slate-500">(edited)</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-500">
                  {formatTime(note.created_at)}
                </span>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 rounded hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                        <button
                          onClick={handleTogglePin}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/50 transition-colors"
                        >
                          <Pin className="w-4 h-4" />
                          {note.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        {isOwnNote && (
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-slate-700/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Note Content */}
            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
              {renderContent(note.content)}
            </p>

            {/* Mentions tags */}
            {note.mentions && note.mentions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.mentions.map(mention => (
                  <span
                    key={mention.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full"
                  >
                    @{mention.mentioned_user?.full_name || 'Unknown'}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2">
              {!isReply && (
                <button
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Reply
                </button>
              )}

              {hasReplies && !isReply && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {showReplies ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {note.reply_count} {note.reply_count === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>

            {/* Reply Input */}
            {showReplyInput && (
              <div className="mt-3">
                <NoteInput
                  accessUsers={accessUsers}
                  onSubmit={handleReplySubmit}
                  isSubmitting={isSubmitting}
                  placeholder="Write a reply..."
                  compact
                  onCancel={() => setShowReplyInput(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {hasReplies && showReplies && (
        <div className="border-l-2 border-slate-700/50 ml-6">
          {note.replies?.map(reply => (
            <NoteItem
              key={reply.id}
              note={reply}
              accessUsers={accessUsers}
              currentUserId={currentUserId}
              onReply={onReply}
              onRefresh={onRefresh}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteItem;
