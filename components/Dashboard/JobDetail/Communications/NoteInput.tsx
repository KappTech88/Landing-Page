import React, { useState, useRef, useEffect } from 'react';
import { Send, AtSign, X, Paperclip } from 'lucide-react';
import { User } from '../../../../types';
import { UserAvatar } from '../../shared/UserAvatar';

interface NoteInputProps {
  accessUsers: User[];
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<void>;
  isSubmitting?: boolean;
  placeholder?: string;
  compact?: boolean;
  onCancel?: () => void;
}

export const NoteInput: React.FC<NoteInputProps> = ({
  accessUsers,
  onSubmit,
  isSubmitting = false,
  placeholder = 'Write a note...',
  compact = false,
  onCancel
}) => {
  const [content, setContent] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter users based on search
  const filteredUsers = accessUsers.filter(user =>
    user.full_name?.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    user.email?.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(value);
    setCursorPosition(cursor);

    // Check for @ trigger
    const textBeforeCursor = value.substring(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if we're in a mention context (no space since @)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionFilter(textAfterAt);
        setShowMentionDropdown(true);
        return;
      }
    }

    setShowMentionDropdown(false);
    setMentionFilter('');
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown) {
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        e.preventDefault();
      } else if (e.key === 'Enter' && filteredUsers.length > 0) {
        e.preventDefault();
        handleSelectMention(filteredUsers[0]);
      }
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle mention selection
  const handleSelectMention = (user: User) => {
    if (!user.full_name) return;

    // Find the @ position
    const textBeforeCursor = content.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Replace the @mention with the user's name
      const textBefore = content.substring(0, lastAtIndex);
      const textAfter = content.substring(cursorPosition);
      const newContent = `${textBefore}@${user.full_name} ${textAfter}`;

      setContent(newContent);

      // Add to selected mentions if not already there
      if (!selectedMentions.find(m => m.id === user.id)) {
        setSelectedMentions([...selectedMentions, user]);
      }

      // Close dropdown
      setShowMentionDropdown(false);
      setMentionFilter('');

      // Focus and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + user.full_name.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Remove a mention
  const handleRemoveMention = (userId: string) => {
    setSelectedMentions(selectedMentions.filter(m => m.id !== userId));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    try {
      await onSubmit(content.trim(), selectedMentions.map(m => m.id));
      setContent('');
      setSelectedMentions([]);
    } catch (error) {
      console.error('Error submitting note:', error);
    }
  };

  // Handle @ button click
  const handleAtButtonClick = () => {
    if (textareaRef.current) {
      const cursor = textareaRef.current.selectionStart;
      const newContent = content.substring(0, cursor) + '@' + content.substring(cursor);
      setContent(newContent);
      setCursorPosition(cursor + 1);
      setShowMentionDropdown(true);
      setMentionFilter('');

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(cursor + 1, cursor + 1);
        }
      }, 0);
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMentionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      {/* Selected mentions */}
      {selectedMentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedMentions.map(user => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full"
            >
              @{user.full_name}
              <button
                onClick={() => handleRemoveMention(user.id)}
                className="hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Text input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className={`
            w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg
            text-sm text-white placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            resize-none
          `}
        />

        {/* Mention dropdown */}
        {showMentionDropdown && filteredUsers.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 bottom-full mb-2 w-64 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20"
          >
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelectMention(user)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors"
              >
                <UserAvatar user={user} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{user.full_name}</p>
                  {user.title && (
                    <p className="text-xs text-slate-400 truncate">{user.title}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAtButtonClick}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded transition-colors"
            title="Mention someone"
          >
            <AtSign className="w-4 h-4" />
            Tag User
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${content.trim() && !isSubmitting
                ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-500 mt-1">
        Press Ctrl+Enter to send. Type @ to mention someone.
      </p>
    </div>
  );
};

export default NoteInput;
