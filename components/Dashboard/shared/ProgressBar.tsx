import React from 'react';
import { JOB_STATUS_CONFIG, JobStatus } from '../../../types';

interface ProgressBarProps {
  status: JobStatus;
  percentage?: number;
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  status,
  percentage,
  showLabel = true,
  height = 'md'
}) => {
  const config = JOB_STATUS_CONFIG[status];
  const progress = percentage ?? config.progress;

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">{config.label}</span>
          <span className="text-xs text-slate-400">{progress}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-700/50 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: config.color
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
