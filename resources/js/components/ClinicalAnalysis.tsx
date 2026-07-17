// components/consultation/components/ClinicalAnalysis.tsx

import React, { useState } from 'react';
import { Plus, X, Activity } from 'lucide-react';
import { SectionWrapper } from './SectionWrapper';
import { SymptomAnalysis } from '../types/consultation.types';

const systems = [
  'Cardiovascular',
  'Respiratory',
  'Gastrointestinal',
  'Neurological',
  'Musculoskeletal',
  'Dermatological',
  'Endocrine',
  'Genitourinary',
  'Psychological'
];

export const ClinicalAnalysis: React.FC<{
  value: SymptomAnalysis[];
  onChange: (value: SymptomAnalysis[]) => void;
}> = ({ value, onChange }) => {
  const addSymptom = () => {
    const newSymptom: SymptomAnalysis = {
      id: Date.now().toString(),
      system: systems[0],
      symptom: '',
      present: false,
      notes: ''
    };
    onChange([...value, newSymptom]);
  };

  const updateSymptom = (id: string, field: keyof SymptomAnalysis, fieldValue: any) => {
    const updated = value.map(s => s.id === id ? { ...s, [field]: fieldValue } : s);
    onChange(updated);
  };

  const removeSymptom = (id: string) => {
    onChange(value.filter(s => s.id !== id));
  };

  return (
    <SectionWrapper
      title="Clinical Analysis - Review of Systems"
      icon={<Activity className="w-5 h-5" />}
      isComplete={value.some(s => s.present)}
    >
      <div className="space-y-4">
        {value.map((symptom) => (
          <div key={symptom.id} className="border border-gray-200 rounded-lg p-4 relative">
            <button
              onClick={() => removeSymptom(symptom.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System
                </label>
                <select
                  value={symptom.system}
                  onChange={(e) => updateSymptom(symptom.id, 'system', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {systems.map(sys => (
                    <option key={sys} value={sys}>{sys}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symptom
                </label>
                <input
                  type="text"
                  value={symptom.symptom}
                  onChange={(e) => updateSymptom(symptom.id, 'symptom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Chest pain, Shortness of breath"
                />
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={symptom.present}
                    onChange={(e) => updateSymptom(symptom.id, 'present', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Present</span>
                </label>
              </div>
              
              {symptom.present && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration & Notes
                  </label>
                  <input
                    type="text"
                    value={symptom.duration || ''}
                    onChange={(e) => updateSymptom(symptom.id, 'duration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Duration and additional notes"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        
        <button
          onClick={addSymptom}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add System Review</span>
        </button>
      </div>
    </SectionWrapper>
  );
};