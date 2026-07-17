// components/ChiefComplaints.tsx

import React, { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { SectionWrapper } from './SectionWrapper';
import { ChiefComplaint } from '../types/consultation.types';

interface ChiefComplaintsProps {
  value: ChiefComplaint[];
  onChange: (value: ChiefComplaint[]) => void;
  onValidationChange?: (hasError: boolean) => void;
}

const severityOptions = [
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Severe' },
  { value: 4, label: 'Very Severe' },
  { value: 5, label: 'Worst Possible' },
];

export const ChiefComplaints: React.FC<ChiefComplaintsProps> = ({
  value,
  onChange,
  onValidationChange,
}) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const addComplaint = () => {
    const newComplaint: ChiefComplaint = {
      id: Date.now().toString(),
      symptom: '',
      duration: '',
      severity: 3,
      onset: '',
      characteristics: '',
    };
    onChange([...value, newComplaint]);
  };

  const removeComplaint = (id: string) => {
    onChange(value.filter(c => c.id !== id));
  };

  const updateComplaint = (id: string, field: keyof ChiefComplaint, fieldValue: any) => {
    const updated = value.map(c => 
      c.id === id ? { ...c, [field]: fieldValue } : c
    );
    onChange(updated);
    validateComplaint(updated.find(c => c.id === id)!, field, fieldValue);
  };

  const validateComplaint = (complaint: ChiefComplaint, field: keyof ChiefComplaint, value: any) => {
    const newErrors = { ...errors };
    const errorKey = `${complaint.id}-${field}`;
    
    if (field === 'symptom' && !value.trim()) {
      newErrors[errorKey] = 'Symptom is required';
    } else if (field === 'duration' && !value.trim()) {
      newErrors[errorKey] = 'Duration is required';
    } else {
      delete newErrors[errorKey];
    }
    
    setErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;
    onValidationChange?.(hasErrors);
  };

  return (
    <SectionWrapper
      title="Chief Complaints"
      icon={<AlertCircle className="w-5 h-5" />}
      isComplete={value.length > 0 && Object.keys(errors).length === 0}
      errorCount={Object.keys(errors).length}
    >
      <div className="space-y-4">
        {value.map((complaint) => (
          <div key={complaint.id} className="border border-gray-200 rounded-lg p-4 relative">
            <button
              onClick={() => removeComplaint(complaint.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symptom *
                </label>
                <input
                  type="text"
                  value={complaint.symptom}
                  onChange={(e) => updateComplaint(complaint.id, 'symptom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Headache, Chest pain"
                />
                {errors[`${complaint.id}-symptom`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`${complaint.id}-symptom`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration *
                </label>
                <input
                  type="text"
                  value={complaint.duration}
                  onChange={(e) => updateComplaint(complaint.id, 'duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 3 days, 2 weeks"
                />
                {errors[`${complaint.id}-duration`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`${complaint.id}-duration`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={complaint.severity}
                  onChange={(e) => updateComplaint(complaint.id, 'severity', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {severityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Onset
                </label>
                <input
                  type="text"
                  value={complaint.onset}
                  onChange={(e) => updateComplaint(complaint.id, 'onset', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Sudden, Gradual"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Characteristics
                </label>
                <textarea
                  value={complaint.characteristics}
                  onChange={(e) => updateComplaint(complaint.id, 'characteristics', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the symptom characteristics..."
                />
              </div>
            </div>
          </div>
        ))}
        
        <button
          onClick={addComplaint}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Chief Complaint</span>
        </button>
      </div>
    </SectionWrapper>
  );
};