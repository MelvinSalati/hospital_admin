// components/SectionWrapper.tsx

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';

interface SectionWrapperProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isComplete?: boolean;
  defaultExpanded?: boolean;
  errorCount?: number;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  title,
  icon,
  children,
  isComplete = false,
  defaultExpanded = true,
  errorCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="text-blue-600">{icon}</div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {isComplete && (
            <CheckCircle className="text-green-500 w-5 h-5" />
          )}
          {errorCount > 0 && (
            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};