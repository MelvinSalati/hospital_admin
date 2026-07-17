// types/consultation.types.ts

export interface ChiefComplaint {
  id: string;
  symptom: string;
  duration: string;
  severity: 1 | 2 | 3 | 4 | 5;
  onset: string;
  characteristics: string;
}

export interface SymptomAnalysis {
  id: string;
  system: string;
  symptom: string;
  present: boolean;
  duration?: string;
  notes?: string;
}

export interface PhysicalExamFinding {
  id: string;
  system: string;
  finding: string;
  normal: boolean;
  description?: string;
  side?: 'left' | 'right' | 'bilateral';
}

export interface DrugHistoryEntry {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  status: 'current' | 'discontinued';
  prescribedBy?: string;
  notes?: string;
}

export interface MedicalCondition {
  id: string;
  condition: string;
  diagnosedDate: string;
  status: 'active' | 'resolved' | 'chronic';
  notes?: string;
  icd10Code?: string;
}

export interface LabOrder {
  id: string;
  testName: string;
  category: string;
  urgency: 'routine' | 'urgent' | 'stat';
  orderedDate: string;
  notes?: string;
  status: 'pending' | 'collected' | 'processing' | 'completed';
}

export interface ImagingOrder {
  id: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'PET' | 'Mammogram';
  bodyPart: string;
  reason: string;
  contrastRequired: boolean;
  urgency: 'routine' | 'urgent' | 'stat';
  orderedDate: string;
  status: 'pending' | 'scheduled' | 'completed';
  notes?: string;
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  dispenseAsWritten: boolean;
}

export interface HealthEducationNote {
  id: string;
  topic: string;
  description: string;
  materialsProvided: string[];
  patientUnderstanding: 'poor' | 'fair' | 'good' | 'excellent';
  followUpNeeded: boolean;
  followUpDate?: string;
}

export interface ConsultationFormData {
  id?: string;
  patientId: string;
  encounterDate: string;
  chiefComplaints: ChiefComplaint[];
  clinicalAnalysis: SymptomAnalysis[];
  physicalExam: PhysicalExamFinding[];
  drugHistory: DrugHistoryEntry[];
  medicalConditions: MedicalCondition[];
  labOrders: LabOrder[];
  imagingOrders: ImagingOrder[];
  prescription: PrescriptionItem[];
  healthEducation: HealthEducationNote[];
  status: 'draft' | 'completed' | 'submitted';
  completedSections: string[];
}

export type SectionName = 
  | 'chiefComplaints'
  | 'clinicalAnalysis'
  | 'physicalExam'
  | 'drugHistory'
  | 'medicalConditions'
  | 'labOrders'
  | 'imagingOrders'
  | 'prescription'
  | 'healthEducation';

export interface ValidationError {
  section: SectionName;
  field: string;
  message: string;
}