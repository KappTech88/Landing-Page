import React from 'react';

interface UserAvatarProps {
  user?: {
    full_name?: string;
    avatar_url?: string;
    title?: string;
  } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showTooltip = false
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg'
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getColorFromName = (name?: string): string => {
    if (!name) return 'bg-slate-600';
    const colors = [
      'bg-blue-600',
      'bg-cyan-600',
      'bg-teal-600',
      'bg-emerald-600',
      'bg-green-600',
      'bg-purple-600',
      'bg-violet-600',
      'bg-pink-600',
      'bg-rose-600',
      'bg-orange-600'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const initials = getInitials(user?.full_name);
  const bgColor = getColorFromName(user?.full_name);

  const avatarContent = user?.avatar_url ? (
    <img
      src={user.avatar_url}
      alt={user.full_name || 'User'}
      className={`${sizeClasses[size]} rounded-full object-cover`}
    />
  ) : (
    <div
      className={`
        ${sizeClasses[size]}
        ${bgColor}
        rounded-full flex items-center justify-center text-white font-medium
      `}
    >
      {initials}
    </div>
  );

  if (showTooltip && user?.full_name) {
    return (
      <div className="relative group">
        {avatarContent}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
          {user.full_name}
          {user.title && <span className="text-slate-400 ml-1">({user.title})</span>}
        </div>
      </div>
    );
  }

  return avatarContent;
};

export default UserAvatar;
