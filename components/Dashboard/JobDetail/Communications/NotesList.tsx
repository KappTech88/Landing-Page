import React from 'react';
import { JobNote, User } from '../../../../types';
import { NoteItem } from './NoteItem';

interface NotesListProps {
  notes: JobNote[];
  accessUsers: User[];
  currentUserId?: string;
  onReply: (parentNoteId: string, content: string, mentionedUserIds: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  accessUsers,
  currentUserId,
  onReply,
  onRefresh
}) => {
  return (
    <div className="divide-y divide-slate-700/30">
      {notes.map(note => (
        <NoteItem
          key={note.id}
          note={note}
          accessUsers={accessUsers}
          currentUserId={currentUserId}
          onReply={onReply}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
};

export default NotesList;
