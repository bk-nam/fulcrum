import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { PROJECT_STATUSES } from '../../shared/constants';
import type { ProjectStatus } from '../../shared/types';

interface StatusSelectorProps {
  currentStatus?: ProjectStatus;
  projectPath: string;
  onStatusChange: (status: ProjectStatus | null) => void;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (status: ProjectStatus | null) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  const currentConfig = currentStatus ? PROJECT_STATUSES[currentStatus] : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
      >
        {currentConfig ? (
          <>
            <span>{currentConfig.icon}</span>
            <span>{currentConfig.label}</span>
          </>
        ) : (
          <span className="text-gray-500">Set Status</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          {(Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((statusKey) => {
            const config = PROJECT_STATUSES[statusKey];
            const isSelected = currentStatus === statusKey;

            return (
              <button
                key={statusKey}
                onClick={() => handleSelect(statusKey)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{config.label}</div>
                  <div className="text-xs text-gray-500">{config.description}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}

          {/* Clear option */}
          {currentStatus && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">🚫</span>
                <span>Clear Status</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
