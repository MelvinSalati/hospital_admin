// components/ConsultationTabs.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Save, Loader2, CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  Activity, AlertTriangle, Heart, Pill, ClipboardList, 
  Microscope, Camera, FileText, BookOpen, X, Plus, Calendar, Clock, User, Stethoscope
} from 'lucide-react';
import { router,usePage } from '@inertiajs/react';

// import LabOrdersSection from './LaboOrderSection';
// Types
interface ConsultationFormData {
  chiefComplaints: ChiefComplaint[];
  clinicalAnalysis: SymptomAnalysis[];
  physicalExam: PhysicalFinding[];
  drugHistory: DrugEntry[];
  medicalConditions: MedicalCondition[];
  labOrders: LabOrder[];
  imagingOrders: ImagingOrder[];
  prescription: PrescriptionItem[];
  healthEducation: HealthEducation[];
}

interface ChiefComplaint {
  id: string;
  symptom: string;
  duration: string;
  severity: number;
  onset: string;
  characteristics: string;
}

interface SymptomAnalysis {
  id: string;
  system: string;
  symptom: string;
  present: boolean;
  notes?: string;
}

interface PhysicalFinding {
  id: string;
  system: string;
  finding: string;
  normal: boolean;
  description?: string;
}

interface DrugEntry {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  status: 'current' | 'discontinued';
  notes?: string;
}

interface MedicalCondition {
  id: string;
  condition: string;
  diagnosedDate: string;
  status: 'active' | 'resolved' | 'chronic';
  notes?: string;
}

interface LabOrder {
  id: string;
  testName: string;
  category: string;
  urgency: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

interface ImagingOrder {
  id: string;
  modality: string;
  bodyPart: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'stat';
}

interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
}

interface HealthEducation {
  id: string;
  topic: string;
  description: string;
  patientUnderstanding: 'poor' | 'fair' | 'good' | 'excellent';
  followUpNeeded: boolean;
}

interface ConsultationTabsProps {
  patientId: string;
  initialData?: Partial<ConsultationFormData>;
  onSuccess?: () => void;
}

// Section Configuration
const sections = [
  { id: 'chiefComplaints', label: 'Chief Complaints', icon: AlertTriangle, color: 'blue', description: 'Document patient\'s primary symptoms' },
  { id: 'clinicalAnalysis', label: 'Clinical Analysis', icon: Activity, color: 'purple', description: 'Review of systems' },
  { id: 'physicalExam', label: 'Physical Exam', icon: Heart, color: 'red', description: 'Physical examination findings' },
  { id: 'drugHistory', label: 'Drug History', icon: Pill, color: 'green', description: 'Current and past medications' },
  { id: 'medicalConditions', label: 'Medical Conditions', icon: ClipboardList, color: 'orange', description: 'Past medical history' },
  { id: 'labOrders', label: 'Lab Orders', icon: Microscope, color: 'indigo', description: 'Laboratory tests' },
  { id: 'imagingOrders', label: 'Imaging Orders', icon: Camera, color: 'pink', description: 'Radiology studies' },
  { id: 'prescription', label: 'Prescription', icon: FileText, color: 'teal', description: 'Medications' },
  { id: 'healthEducation', label: 'Health Education', icon: BookOpen, color: 'yellow', description: 'Patient education' }
];

export default function ConsultationTabs({ patientId, initialData, onSuccess }: ConsultationTabsProps) {
    const {props}  = usePage();
    console.log(props)
 
    const [activeTab, setActiveTab] = useState('chiefComplaints');
    const [formData, setFormData] = useState<ConsultationFormData>({
      chiefComplaints: [],
      clinicalAnalysis: [],
      physicalExam: [],
      drugHistory: [],
      medicalConditions: [],
      labOrders: [],
      imagingOrders: [],
      prescription: [],
      healthEducation: [],
      ...initialData
    });
    const [errors, setErrors] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});

    // Validate section
    const validateSection = (sectionId: string, data: any[]) => {
      let isValid = true;
      const sectionErrors: any = {};
      
      switch(sectionId) {
        case 'chiefComplaints':
          isValid = data.every(item => item.symptom?.trim() && item.duration?.trim());
          if (!isValid) sectionErrors.general = 'Please fill all required fields';
          break;
        case 'prescription':
          isValid = data.every(item => 
            item.drugName?.trim() && item.dosage?.trim() && 
            item.frequency?.trim() && item.duration?.trim() && item.quantity > 0
          );
          if (!isValid) sectionErrors.general = 'Please complete all prescription details';
          break;
        default:
          isValid = true;
      }
      
      setErrors(prev => ({ ...prev, [sectionId]: sectionErrors }));
      setSectionErrors(prev => ({ ...prev, [sectionId]: !isValid }));
      return isValid;
    };

    // Update section data
    const updateSection = (sectionId: string, data: any[]) => {
      setFormData(prev => ({ ...prev, [sectionId]: data }));
      validateSection(sectionId, data);
    };

    // Get section completion status
    const getSectionStatus = (sectionId: string) => {
      const data = formData[sectionId as keyof ConsultationFormData];
      return Array.isArray(data) && data.length > 0;
    };

    const completedSections = sections.filter(s => getSectionStatus(s.id)).length;
    const progress = (completedSections / sections.length) * 100;
    const hasErrors = Object.values(sectionErrors).some(error => error === true);

    // Submit form
    const handleSubmit = async () => {
      let allValid = true;
      sections.forEach(section => {
        const data = formData[section.id as keyof ConsultationFormData];
        if (!validateSection(section.id, data as any[])) {
          allValid = false;
        }
      });
      
      if (!allValid) {
        alert('Please fix errors in all sections before submitting');
        return;
      }
      
      setIsSubmitting(true);
      
      try {
        const response = await fetch('/api/consultations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patientId,
            ...formData,
            status: 'completed',
            submitted_at: new Date().toISOString()
          })
        });
        if(response.status===404){
          Notiflix.Notify.warning(response.message);
        }
        
        if (response.ok) {
          onSuccess?.();
          alert('Consultation saved successfully!');
          router.reload();
        } else {
          throw new Error('Failed to save');
        }
      } catch (error) {
        console.error('Submission error:', error.response.data.message);
        alert('Failed to save consultation. Please try again.');
    
      } finally {
        setIsSubmitting(false);
      }
    };

    // Render active section content
    const renderSection = () => {
      switch(activeTab) {
        case 'chiefComplaints':
          return <ChiefComplaintsSection data={formData.chiefComplaints} onChange={(data) => updateSection('chiefComplaints', data)} errors={errors.chiefComplaints} />;
        case 'clinicalAnalysis':
          return <ClinicalAnalysisSection data={formData.clinicalAnalysis} onChange={(data) => updateSection('clinicalAnalysis', data)} />;
        case 'physicalExam':
          return <PhysicalExamSection data={formData.physicalExam} onChange={(data) => updateSection('physicalExam', data)} />;
        case 'drugHistory':
          return <DrugHistorySection data={formData.drugHistory} onChange={(data) => updateSection('drugHistory', data)} />;
        case 'medicalConditions':
          return <MedicalConditionsSection data={formData.medicalConditions} onChange={(data) => updateSection('medicalConditions', data)} />;
        case 'labOrders':
          return <LabOrdersSection data={formData.labOrders} onChange={(data) => updateSection('labOrders', data)} />;
        case 'imagingOrders':
          return <ImagingOrdersSection data={formData.imagingOrders} onChange={(data) => updateSection('imagingOrders', data)} />;
        case 'prescription':
          return <PrescriptionSection data={formData.prescription} onChange={(data) => updateSection('prescription', data)} errors={errors.prescription} />;
        case 'healthEducation':
          return <HealthEducationSection data={formData.healthEducation} onChange={(data) => updateSection('healthEducation', data)} />;
        default:
          return null;
      }
    };

    return (
      <div className="bg-whit rounded-xl shadow-lg ">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Medical Consultation Form</h2>
              <p className="text-sm text-gray-600 mt-1">Patient ID: {patientId}</p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || hasErrors}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Consultation
                </>
              )}
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Form Completion</span>
              <span>{completedSections} of {sections.length} sections completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <div className="flex min-w-max">
            {sections.map((section, index) => {
              const isComplete = getSectionStatus(section.id);
              const hasError = sectionErrors[section.id];
              const Icon = section.icon;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all whitespace-nowrap
                    ${activeTab === section.id 
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-white' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${activeTab === section.id ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span>{section.label}</span>
                  {isComplete && !hasError && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  {hasError && (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Content */}
        <div className="p-6 max-h-[calc(100vh-350px)] overflow-y-auto">
          {renderSection()}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = sections.findIndex(s => s.id === activeTab);
              if (currentIndex > 0) {
                setActiveTab(sections[currentIndex - 1].id);
              }
            }}
            disabled={sections.findIndex(s => s.id === activeTab) === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="text-sm text-gray-500">
            Section {sections.findIndex(s => s.id === activeTab) + 1} of {sections.length}
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = sections.findIndex(s => s.id === activeTab);
              if (currentIndex < sections.length - 1) {
                setActiveTab(sections[currentIndex + 1].id);
              }
            }}
            disabled={sections.findIndex(s => s.id === activeTab) === sections.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
}

  // ==================== Section Components ====================

  // 1. Chief Complaints Section
  const ChiefComplaintsSection = ({ data, onChange, errors }: any) => {
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        symptom: '',
        duration: '',
        severity: 3,
        onset: '',
        characteristics: ''
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900">Chief Complaints</h3>
          <p className="text-sm text-blue-700">Document the patient's primary symptoms in their own words</p>
        </div>
        
        {errors?.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {errors.general}
          </div>
        )}
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Symptom *</label>
                <input
                  type="text"
                  value={item.symptom}
                  onChange={(e) => update(item.id, 'symptom', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Headache, Chest pain"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Duration *</label>
                <input
                  type="text"
                  value={item.duration}
                  onChange={(e) => update(item.id, 'duration', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., 3 days"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={item.severity}
                  onChange={(e) => update(item.id, 'severity', parseInt(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value={1}>Mild</option>
                  <option value={2}>Moderate</option>
                  <option value={3}>Severe</option>
                  <option value={4}>Very Severe</option>
                  <option value={5}>Worst Possible</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Onset</label>
                <input
                  type="text"
                  value={item.onset}
                  onChange={(e) => update(item.id, 'onset', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Sudden, Gradual"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Characteristics</label>
                <textarea
                  value={item.characteristics}
                  onChange={(e) => update(item.id, 'characteristics', e.target.value)}
                  rows={2}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Quality, location, aggravating/alleviating factors..."
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Chief Complaint
        </Button>
      </div>
    );
  };

  // 2. Clinical Analysis Section
  const ClinicalAnalysisSection = ({ data, onChange }: any) => {
    const systems = ['Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Neurological', 'Musculoskeletal', 'Dermatological', 'Endocrine'];
    
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        system: systems[0],
        symptom: '',
        present: false,
        notes: ''
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-purple-900">Review of Systems</h3>
          <p className="text-sm text-purple-700">Document symptoms by body system</p>
        </div>
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">System</label>
                <select
                  value={item.system}
                  onChange={(e) => update(item.id, 'system', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Symptom</label>
                <input
                  type="text"
                  value={item.symptom}
                  onChange={(e) => update(item.id, 'symptom', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Chest pain, Shortness of breath"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.present}
                    onChange={(e) => update(item.id, 'present', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Present</span>
                </label>
              </div>
              
              {item.present && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => update(item.id, 'notes', e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Duration, severity, characteristics..."
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add System Review
        </Button>
      </div>
    );
  };

  // 3. Physical Exam Section
  const PhysicalExamSection = ({ data, onChange }: any) => {
    const systems = ['General', 'HEENT', 'Cardiovascular', 'Respiratory', 'Abdomen', 'Musculoskeletal', 'Neurological', 'Skin'];
    
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        system: systems[0],
        finding: '',
        normal: true,
        description: ''
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-red-900">Physical Examination</h3>
          <p className="text-sm text-red-700">Document physical exam findings</p>
        </div>
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">System</label>
                <select
                  value={item.system}
                  onChange={(e) => update(item.id, 'system', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Finding</label>
                <input
                  type="text"
                  value={item.finding}
                  onChange={(e) => update(item.id, 'finding', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Heart sounds, Lung auscultation"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.normal}
                    onChange={(e) => update(item.id, 'normal', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Normal</span>
                </label>
              </div>
              
              {!item.normal && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => update(item.id, 'description', e.target.value)}
                    rows={2}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Describe abnormal findings..."
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Examination Finding
        </Button>
      </div>
    );
  };

  // 4. Drug History Section
  const DrugHistorySection = ({ data, onChange }: any) => {
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        drugName: '',
        dosage: '',
        frequency: '',
        status: 'current',
        notes: ''
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    return (
      <div className="p-5">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-900">Drug History</h3>
          <p className="text-sm text-green-700">Current and past medications</p>
        </div>
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Drug Name</label>
                <input
                  type="text"
                  value={item.drugName}
                  onChange={(e) => update(item.id, 'drugName', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Lisinopril"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Dosage</label>
                <input
                  type="text"
                  value={item.dosage}
                  onChange={(e) => update(item.id, 'dosage', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., 10mg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <input
                  type="text"
                  value={item.frequency}
                  onChange={(e) => update(item.id, 'frequency', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Once daily"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={item.status}
                  onChange={(e) => update(item.id, 'status', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="current">Current</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={item.notes || ''}
                  onChange={(e) => update(item.id, 'notes', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Reason for discontinuation, allergies, etc."
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </Button>
      </div>
    );
  };

  // 5. Medical Conditions Section
  const MedicalConditionsSection = ({ data, onChange }: any) => {
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        condition: '',
        diagnosedDate: '',
        status: 'active',
        notes: ''
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-orange-900">Medical Conditions</h3>
          <p className="text-sm text-orange-700">Past medical history and chronic conditions</p>
        </div>
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Condition</label>
                <input
                  type="text"
                  value={item.condition}
                  onChange={(e) => update(item.id, 'condition', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Hypertension, Diabetes Type 2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Diagnosed Date</label>
                <input
                  type="date"
                  value={item.diagnosedDate}
                  onChange={(e) => update(item.id, 'diagnosedDate', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={item.status}
                  onChange={(e) => update(item.id, 'status', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="chronic">Chronic</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={item.notes || ''}
                  onChange={(e) => update(item.id, 'notes', e.target.value)}
                  rows={2}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Additional details about the condition..."
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>
    );
  };

  // 6. Lab Orders Section
  // LabOrdersSection.tsx - Updated with two-column layout

  const LabOrdersSection = ({ data = [], onChange }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const { labOrders, loading, error, deleteLabOrder } = useLabOrders(); 
    const categories = ['Blood', 'Urine', 'Stool', 'Pathology', 'Microbiology', 'Chemistry', 'Hematology', 'Immunology'];
    
    // Available laboratory tests database
    const availableTests = labOrders;
    
    // Filter tests based on search and category
    const filteredTests = availableTests.filter(test => {
      const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    
    const addTest = (test: any) => {
      console.log('Adding test:', test); // Debug log
      
      // Check if test already exists in selected list
      const exists = data.some((item: any) => item.testName === test.name);
      if (exists) {
        alert(`${test.name} is already added`);
        return;
      }
      
      const newTest = {
        id: Date.now().toString(),
        testName: test.name,
        category: test.category,
        urgency: 'routine',
        notes: '',
        normalRange: test.normalRange,
        price: test.price
      };
      
      console.log('New test object:', newTest); // Debug log
      onChange([...data, newTest]);
    };
    
    const remove = (id: string) => {
      console.log('Removing test with id:', id); // Debug log
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    const update = (id: string, field: string, value: any) => {
      console.log('Updating test:', id, field, value); // Debug log
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const getUrgencyColor = (urgency: string) => {
      switch(urgency) {
        case 'stat': return 'bg-red-100 text-red-800';
        case 'urgent': return 'bg-orange-100 text-orange-800';
        default: return 'bg-blue-100 text-blue-800';
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-indigo-900">Laboratory Orders</h3>
          <p className="text-sm text-indigo-700">Select laboratory tests and investigation</p> 
          <div className='flex gap-2'>
          <div className=''>
              <h1>Select Lab Tests</h1>
          </div>
          <div className=''></div>
        </div>
        </div>  

        <div className='flex gap-2'>
          <div className=''>
              <h1>Select Lab Tests</h1>
          </div>
          <div className=''></div>
        </div>
        
        {/* Two Column Layout */}
        <div className="flex  gap-6">
          {/* Left Column - Available Tests */}
          <div className="border rounded-lg">
            <div className="bg-gray-50 border-b p-4">
              <h4 className="font-medium text-gray-800 mb-3">Available Laboratory Tests</h4>
              
              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {availableTests.map((item)=>(
                      <div>{item.name}</div>
                  ))}
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Tests List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredTests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No tests found matching "{searchTerm}"
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTests.map((test) => (
                    <div key={test.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h5 className="font-medium text-gray-800">{test.name}</h5>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {test.category}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>Normal Range: {test.normalRange}</p>
                            <p>Price: ${test.price}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addTest(test)}
                          className="ml-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Selected Tests */}
          <div className="border rounded-lg">
            <div className="bg-gray-50 border-b p-4">
              <h4 className="font-medium text-gray-800">
                Selected Tests ({data?.length || 0})
              </h4>
              {(!data || data.length === 0) && (
                <p className="text-sm text-gray-500 mt-1">No tests selected</p>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {data && data.length > 0 ? (
                <div className="divide-y">
                  {data.map((item: any) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h5 className="font-medium text-gray-800">{item.testName}</h5>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {item.category}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            <p>Normal Range: {item.normalRange}</p>
                            <p>Price: ${item.price}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Urgency
                          </label>
                          <select
                            value={item.urgency}
                            onChange={(e) => update(item.id, 'urgency', e.target.value)}
                            className="w-full border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="stat">STAT</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Status
                          </label>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getUrgencyColor(item.urgency)}`}>
                            {item.urgency.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Notes / Instructions
                        </label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => update(item.id, 'notes', e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Fasting required, specific timing, etc."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Microscope className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No tests selected</p>
                  <p className="text-xs mt-1">Add tests from the left panel</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Summary Section */}
        {data && data.length > 0 && (
          <div className="bg-gray-50 border rounded-lg p-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-800">Order Summary</h4>
                <p className="text-sm text-gray-600">Total Tests: {data.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Estimated Total:</p>
                <p className="text-lg font-bold text-indigo-600">
                  ${data.reduce((total, item) => total + (item.price || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 7. Imaging Orders Section
  const ImagingOrdersSection = ({ data, onChange }: any) => {
    const modalities = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammogram', 'PET Scan'];
    
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        modality: modalities[0],
        bodyPart: '',
        reason: '',
        urgency: 'routine'
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-pink-900">Imaging Orders</h3>
          <p className="text-sm text-pink-700">Order radiology and imaging studies</p>
        </div>
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Modality</label>
                <select
                  value={item.modality}
                  onChange={(e) => update(item.id, 'modality', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  {modalities.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Body Part</label>
                <input
                  type="text"
                  value={item.bodyPart}
                  onChange={(e) => update(item.id, 'bodyPart', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Chest, Lumbar Spine"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Reason</label>
                <input
                  type="text"
                  value={item.reason}
                  onChange={(e) => update(item.id, 'reason', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Evaluate for fracture, Rule out pneumonia"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Urgency</label>
                <select
                  value={item.urgency}
                  onChange={(e) => update(item.id, 'urgency', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Imaging Order
        </Button>
      </div>
    );
  };

  // 8. Prescription Section
  const PrescriptionSection = ({ data, onChange, errors }: any) => {
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        drugName: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 30,
        refills: 0,
        instructions: ''
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    const frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'As needed'];
    
    return (
      <div className="space-y-4">
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-teal-900">Prescription</h3>
          <p className="text-sm text-teal-700">Prescribe medications with proper dosage and instructions</p>
        </div>
        
        {errors?.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {errors.general}
          </div>
        )}
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Drug Name *</label>
                <input
                  type="text"
                  value={item.drugName}
                  onChange={(e) => update(item.id, 'drugName', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Amoxicillin"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Dosage *</label>
                <input
                  type="text"
                  value={item.dosage}
                  onChange={(e) => update(item.id, 'dosage', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., 500mg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Frequency *</label>
                <select
                  value={item.frequency}
                  onChange={(e) => update(item.id, 'frequency', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select frequency</option>
                  {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Duration *</label>
                <input
                  type="text"
                  value={item.duration}
                  onChange={(e) => update(item.id, 'duration', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., 7 days"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => update(item.id, 'quantity', parseInt(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Refills</label>
                <input
                  type="number"
                  value={item.refills}
                  onChange={(e) => update(item.id, 'refills', parseInt(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Instructions</label>
                <textarea
                  value={item.instructions}
                  onChange={(e) => update(item.id, 'instructions', e.target.value)}
                  rows={2}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Take with food, avoid alcohol, etc."
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Prescription
        </Button>
      </div>
    );
  };

  // 9. Health Education Section
  const HealthEducationSection = ({ data, onChange }: any) => {
    const add = () => {
      onChange([...data, {
        id: Date.now().toString(),
        topic: '',
        description: '',
        patientUnderstanding: 'good',
        followUpNeeded: false
      }]);
    };
    
    const update = (id: string, field: string, value: any) => {
      onChange(data.map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };
    
    const remove = (id: string) => {
      onChange(data.filter((item: any) => item.id !== id));
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-yellow-900">Health Education</h3>
          <p className="text-sm text-yellow-700">Patient education and counseling provided</p>
        </div>
        
        {data.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 relative mb-4">
            <button
              onClick={() => remove(item.id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Topic</label>
                <input
                  type="text"
                  value={item.topic}
                  onChange={(e) => update(item.id, 'topic', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Diabetes Management, Hypertension"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={item.description}
                  onChange={(e) => update(item.id, 'description', e.target.value)}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="What education was provided?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Patient Understanding</label>
                <select
                  value={item.patientUnderstanding}
                  onChange={(e) => update(item.id, 'patientUnderstanding', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="poor">Poor</option>
                  <option value="fair">Fair</option>
                  <option value="good">Good</option>
                  <option value="excellent">Excellent</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={item.followUpNeeded}
                    onChange={(e) => update(item.id, 'followUpNeeded', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Follow-up needed</span>
                </label>
              </div>
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={add} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Add Health Education
        </Button>
      </div>
    );
  };