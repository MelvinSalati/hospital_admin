// components/Prescription.tsx

import React, { useState } from 'react';
import { Plus, X, Pill } from 'lucide-react';
import { SectionWrapper } from './SectionWrapper';
import { PrescriptionItem } from '../types/consultation.types';

interface PrescriptionProps {
  value: PrescriptionItem[];
  onChange: (value: PrescriptionItem[]) => void;
  onValidationChange?: (hasError: boolean) => void;
}

export const Prescription: React.FC<PrescriptionProps> = ({
  value,
  onChange,
  onValidationChange,
}) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const addPrescription = () => {
    const newPrescription: PrescriptionItem = {
      id: Date.now().toString(),
      drugName: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 30,
      refills: 0,
      instructions: '',
      dispenseAsWritten: false,
    };
    onChange([...value, newPrescription]);
  };

  const removePrescription = (id: string) => {
    onChange(value.filter(p => p.id !== id));
  };

  const updatePrescription = (id: string, field: keyof PrescriptionItem, fieldValue: any) => {
    const updated = value.map(p => 
      p.id === id ? { ...p, [field]: fieldValue } : p
    );
    onChange(updated);
    validatePrescription(updated.find(p => p.id === id)!, field, fieldValue);
  };

  const validatePrescription = (prescription: PrescriptionItem, field: keyof PrescriptionItem, value: any) => {
    const newErrors = { ...errors };
    const errorKey = `${prescription.id}-${field}`;
    
    if (field === 'drugName' && !value.trim()) {
      newErrors[errorKey] = 'Drug name is required';
    } else if (field === 'dosage' && !value.trim()) {
      newErrors[errorKey] = 'Dosage is required';
    } else if (field === 'frequency' && !value.trim()) {
      newErrors[errorKey] = 'Frequency is required';
    } else if (field === 'duration' && !value.trim()) {
      newErrors[errorKey] = 'Duration is required';
    } else if (field === 'quantity' && (value <= 0 || isNaN(value))) {
      newErrors[errorKey] = 'Quantity must be greater than 0';
    } else {
      delete newErrors[errorKey];
    }
    
    setErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;
    onValidationChange?.(hasErrors);
  };

  const frequencies = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
  ];

  return (
    <SectionWrapper
      title="Prescription"
      icon={<Pill className="w-5 h-5" />}
      isComplete={value.length > 0 && Object.keys(errors).length === 0}
      errorCount={Object.keys(errors).length}
    >
      <div className="space-y-4">
        {value.map((prescription) => (
          <div key={prescription.id} className="border border-gray-200 rounded-lg p-4 relative">
            <button
              onClick={() => removePrescription(prescription.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Drug Name *
                </label>
                <input
                  type="text"
                  value={prescription.drugName}
                  onChange={(e) => updatePrescription(prescription.id, 'drugName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Amoxicillin"
                />
                {errors[`${prescription.id}-drugName`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`${prescription.id}-drugName`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage *
                </label>
                <input
                  type="text"
                  value={prescription.dosage}
                  onChange={(e) => updatePrescription(prescription.id, 'dosage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 500mg"
                />
                {errors[`${prescription.id}-dosage`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`${prescription.id}-dosage`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <select
                  value={prescription.frequency}
                  onChange={(e) => updatePrescription(prescription.id, 'frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select frequency</option>
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
                {errors[`${prescription.id}-frequency`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`${prescription.id}-frequency`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration *
                </label>
                <input
                  type="text"
                  value={prescription.duration}
                  onChange={(e) => updatePrescription(prescription.id, 'duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 7 days"
                />
                {errors[`${prescription.id}-duration`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`${prescription.id}-duration`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={prescription.quantity}
                  onChange={(e) => updatePrescription(prescription.id, 'quantity', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors[`${prescription.id}-quantity`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`${prescription.id}-quantity`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refills
                </label>
                <input
                  type="number"
                  value={prescription.refills}
                  onChange={(e) => updatePrescription(prescription.id, 'refills', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={prescription.dispenseAsWritten}
                    onChange={(e) => updatePrescription(prescription.id, 'dispenseAsWritten', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Dispense as written (no generic substitution)</span>
                </label>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  value={prescription.instructions}
                  onChange={(e) => updatePrescription(prescription.id, 'instructions', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Take with food, avoid alcohol, etc."
                />
              </div>
            </div>
          </div>
        ))}
        
        <button
          onClick={addPrescription}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Prescription</span>
        </button>
      </div>
    </SectionWrapper>
  );
};