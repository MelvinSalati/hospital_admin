// context/ConsultationContext.tsx

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { ConsultationFormData, SectionName, ValidationError } from '../types/consultation.types';

type ConsultationAction = 
  | { type: 'UPDATE_FIELD'; section: SectionName; data: any }
  | { type: 'SET_FORM_DATA'; data: ConsultationFormData }
  | { type: 'SET_VALIDATION_ERRORS'; errors: ValidationError[] }
  | { type: 'CLEAR_VALIDATION_ERRORS' }
  | { type: 'MARK_SECTION_COMPLETE'; section: SectionName }
  | { type: 'SET_STATUS'; status: ConsultationFormData['status'] };

interface ConsultationState {
  formData: ConsultationFormData;
  validationErrors: ValidationError[];
  isDirty: boolean;
}

const initialState: ConsultationState = {
  formData: {
    patientId: '',
    encounterDate: new Date().toISOString(),
    chiefComplaints: [],
    clinicalAnalysis: [],
    physicalExam: [],
    drugHistory: [],
    medicalConditions: [],
    labOrders: [],
    imagingOrders: [],
    prescription: [],
    healthEducation: [],
    status: 'draft',
    completedSections: [],
  },
  validationErrors: [],
  isDirty: false,
};

const consultationReducer = (state: ConsultationState, action: ConsultationAction): ConsultationState => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.section]: action.data,
        },
        isDirty: true,
      };
    
    case 'SET_FORM_DATA':
      return {
        ...state,
        formData: action.data,
        isDirty: false,
      };
    
    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.errors,
      };
    
    case 'CLEAR_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: [],
      };
    
    case 'MARK_SECTION_COMPLETE':
      const completedSections = state.formData.completedSections.includes(action.section)
        ? state.formData.completedSections
        : [...state.formData.completedSections, action.section];
      
      return {
        ...state,
        formData: {
          ...state.formData,
          completedSections,
        },
      };
    
    case 'SET_STATUS':
      return {
        ...state,
        formData: {
          ...state.formData,
          status: action.status,
        },
      };
    
    default:
      return state;
  }
};

interface ConsultationContextType {
  state: ConsultationState;
  updateSection: (section: SectionName, data: any) => void;
  setFormData: (data: ConsultationFormData) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  clearValidationErrors: () => void;
  markSectionComplete: (section: SectionName) => void;
  setStatus: (status: ConsultationFormData['status']) => void;
}

const ConsultationContext = createContext<ConsultationContextType | undefined>(undefined);

export const ConsultationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(consultationReducer, initialState);

  const updateSection = useCallback((section: SectionName, data: any) => {
    dispatch({ type: 'UPDATE_FIELD', section, data });
  }, []);

  const setFormData = useCallback((data: ConsultationFormData) => {
    dispatch({ type: 'SET_FORM_DATA', data });
  }, []);

  const setValidationErrors = useCallback((errors: ValidationError[]) => {
    dispatch({ type: 'SET_VALIDATION_ERRORS', errors });
  }, []);

  const clearValidationErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_VALIDATION_ERRORS' });
  }, []);

  const markSectionComplete = useCallback((section: SectionName) => {
    dispatch({ type: 'MARK_SECTION_COMPLETE', section });
  }, []);

  const setStatus = useCallback((status: ConsultationFormData['status']) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  return (
    <ConsultationContext.Provider
      value={{
        state,
        updateSection,
        setFormData,
        setValidationErrors,
        clearValidationErrors,
        markSectionComplete,
        setStatus,
      }}
    >
      {children}
    </ConsultationContext.Provider>
  );
};

export const useConsultation = () => {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error('useConsultation must be used within ConsultationProvider');
  }
  return context;
};