import React from 'react';
import { JOB_STATUS_CONFIG, JobStatus } from '../../../types';

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = false
}) => {
  const config = JOB_STATUS_CONFIG[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
        ${config.bgColor}
      `}
      style={{ color: config.color }}
    >
      {showIcon && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
};

export default StatusBadge;
