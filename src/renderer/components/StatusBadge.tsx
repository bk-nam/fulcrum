import React from 'react';
import { PROJECT_STATUSES } from '../../shared/constants';
import type { ProjectStatus } from '../../shared/types';

interface StatusBadgeProps {
  status?: ProjectStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true
}) => {
  if (!status) return null;

  const config = PROJECT_STATUSES[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const colorClasses = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  }[config.color];

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-md font-medium border ${colorClasses}`}>
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </span>
  );
};
