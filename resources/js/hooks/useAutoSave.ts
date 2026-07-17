// hooks/useAutoSave.ts

import { useEffect, useRef } from 'react';
import { ConsultationFormData } from '../types/consultation.types';

export const useAutoSave = (
  data: ConsultationFormData,
  onSave: (data: ConsultationFormData) => Promise<void>,
  delay: number = 3000
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSave(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, onSave]);
};