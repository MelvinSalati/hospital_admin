import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus, X, Eye, CheckCircle2, Search, ChevronDown, Trash2, Save, ShoppingCart, Minus, FlaskConical, FileText, Clock, Edit, Microscope, AlertCircle, Activity, Check, AlertTriangle, Proportions } from 'lucide-react';
import Http from '@/utils/Http';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabTest {
  id: number;
  test_name: string;
  test_category?: string;
  price?: number;
  turnaround_time?: string;
  specimen_type?: string;
  preparation_instructions?: string;
  reference_range?: string;
  unit?: string;
  is_active?: boolean;
}

interface CartLabTest extends LabTest {
  cartId: string;
  quantity: number;
  priority: 'routine' | 'urgent' | 'stat';
  notes?: string;
  collection_date?: string;
}

interface LabOrder {
  id: number;
  order_number: string;
  patient_id: number;
  ordered_date: string;
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  clinical_notes?: string;
  items: LabOrderItem[];
}

interface LabOrderItem {
  id: number;
  test_id: number;
  test_name: string;
  quantity: number;
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled';
  results?: string;
  result_date?: string;
  notes?: string;
  reference_range?: string;
  unit?: string;
}

interface LabResult {
  id: number;
  order_id: number;
  test_id: number;
  test_name: string;
  result_value: string;
  reference_range: string;
  unit: string;
  interpretation: string;
  performed_by: string;
  performed_date: string;
  notes?: string;
  abnormal_flag?: 'normal' | 'high' | 'low' | 'critical';
  performedBy:string
  
}

type PricingScheme = 'cash' | 'nhima' | 'insurance' | 'charity';

interface Props {
  patientId?: number;
  admissionNumber?: string;
  patientPricing?: {
    default_scheme: PricingScheme;
  };
  initialOrders?: LabOrder[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'routine', label: 'Routine', color: 'text-blue-700', bg: 'bg-blue-100', icon: '🟢' },
  { value: 'urgent', label: 'Urgent', color: 'text-orange-700', bg: 'bg-orange-100', icon: '🟠' },
  { value: 'stat', label: 'STAT', color: 'text-red-700', bg: 'bg-red-100', icon: '🔴' },
];

const ORDER_STATUS_CONFIG: Record<LabOrder['status'], { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⏳' },
  collected: { label: 'Collected', color: 'text-blue-700', bg: 'bg-blue-100', icon: '🧪' },
  processing: { label: 'Processing', color: 'text-purple-700', bg: 'bg-purple-100', icon: '⚙️' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100', icon: '❌' },
};

const ABNORMAL_FLAGS = {
  normal: { label: 'Normal', color: 'text-green-700', bg: 'bg-green-100', icon: '✅', value: 'normal' },
  high: { label: 'High', color: 'text-red-700', bg: 'bg-red-100', icon: '⬆️', value: 'high' },
  low: { label: 'Low', color: 'text-orange-700', bg: 'bg-orange-100', icon: '⬇️', value: 'low' },
  critical: { label: 'Critical', color: 'text-purple-700', bg: 'bg-purple-100', icon: '⚠️', value: 'critical' },
};

// ─── Small UI Components ──────────────────────────────────────────────────────

const OrderStatusBadge = ({ status }: { status: LabOrder['status'] }) => {
  const config = ORDER_STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: LabOrder['priority'] }) => {
  const config = PRIORITY_OPTIONS.find(p => p.value === priority);
  if (!config) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
};

const CategoryBadge = ({ category }: { category?: string }) => {
  if (!category) return null;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">
      {category}
    </span>
  );
};

const StepIndicator = ({ step }: { step: 1 | 2 }) => {
  const steps = [
    { label: 'Select tests', num: 1 },
    { label: 'Review & order', num: 2 },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-full text-[10px] font-medium flex items-center justify-center ${
              step >= s.num ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}>
              {step > s.num ? <CheckCircle2 className="w-3 h-3" /> : s.num}
            </span>
            <span className={`text-xs ${step >= s.num ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <div className={`w-5 h-px ${step > s.num ? 'bg-purple-300' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
};

// ─── Results Entry Modal (Refactored for Multiple Results) ───────────────────

const ResultsEntryModal = ({
  isOpen,
  onClose,
  order,
  patientId,
  onResultsSaved,
  performedBy: performedByProp
}: {
  isOpen: boolean;
  onClose: () => void;
  order: LabOrder;
  patientId: number;
  onResultsSaved: () => void;
  performedBy?: string;
}) => {
  // Get authenticated user from Inertia as fallback
  const { props: inertiaProps } = usePage();
  const authUser = (inertiaProps as any)?.auth?.user;
  
  // Use the prop if provided, otherwise use auth user's name, otherwise fallback to 'lab-technician'
  const performedBy = performedByProp || authUser?.name || 'lab-technician';
  
  // Store results as flat array of individual test parameters
  const [results, setResults] = useState<LabResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [fetchingResults, setFetchingResults] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());

  // Log for debugging (remove in production)
  console.log('ResultsEntryModal - performedBy:', performedBy);
  console.log('ResultsEntryModal - authUser:', authUser);

  // Common laboratory units
  const LAB_UNITS = [
    { value: 'g/dL', label: 'g/dL' },
    { value: 'mg/dL', label: 'mg/dL' },
    { value: 'mg/L', label: 'mg/L' },
    { value: 'μg/dL', label: 'μg/dL' },
    { value: 'μg/L', label: 'μg/L' },
    { value: 'ng/mL', label: 'ng/mL' },
    { value: 'pg/mL', label: 'pg/mL' },
    { value: 'IU/L', label: 'IU/L' },
    { value: 'IU/mL', label: 'IU/mL' },
    { value: 'mIU/L', label: 'mIU/L' },
    { value: 'U/L', label: 'U/L' },
    { value: 'mmol/L', label: 'mmol/L' },
    { value: 'μmol/L', label: 'μmol/L' },
    { value: 'mEq/L', label: 'mEq/L' },
    { value: '%', label: '%' },
    { value: 'cells/μL', label: 'cells/μL' },
    { value: 'x10^3/μL', label: 'x10³/μL' },
    { value: 'x10^6/μL', label: 'x10⁶/μL' },
    { value: 'g/L', label: 'g/L' },
    { value: 'mg/g', label: 'mg/g' },
    { value: 'ratio', label: 'Ratio' },
    { value: 'Positive/Negative', label: 'Positive/Negative' },
    { value: 'Reactive/Non-Reactive', label: 'Reactive/Non-Reactive' },
  ];

  // Abnormal flag options
  const ABNORMAL_OPTIONS = [
    { value: 'normal', label: 'Normal', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
    { value: 'high', label: 'High', color: 'text-red-700', bg: 'bg-red-100', icon: '⬆️' },
    { value: 'low', label: 'Low', color: 'text-orange-700', bg: 'bg-orange-100', icon: '⬇️' },
    { value: 'critical', label: 'Critical', color: 'text-purple-700', bg: 'bg-purple-100', icon: '⚠️' },
    { value: 'abnormal', label: 'Abnormal', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⚠️' },
  ];

  // Pre-defined panel templates for common multi-result tests
  const PANEL_TEMPLATES: Record<string, Array<{ test_name: string; unit: string; reference_range: string }>> = {
    'Full Blood Count': [
      { test_name: 'Hemoglobin', unit: 'g/dL', reference_range: '12.0-16.0' },
      { test_name: 'White Blood Cell Count', unit: 'x10³/μL', reference_range: '4.5-11.0' },
      { test_name: 'Platelet Count', unit: 'x10³/μL', reference_range: '150-450' },
      { test_name: 'Red Blood Cell Count', unit: 'x10⁶/μL', reference_range: '4.2-5.4' },
      { test_name: 'Hematocrit', unit: '%', reference_range: '37-47' },
      { test_name: 'MCV', unit: 'fL', reference_range: '80-100' },
      { test_name: 'MCH', unit: 'pg', reference_range: '27-32' },
      { test_name: 'MCHC', unit: 'g/dL', reference_range: '32-36' },
      { test_name: 'RDW', unit: '%', reference_range: '11.5-14.5' },
      { test_name: 'Neutrophils', unit: 'x10³/μL', reference_range: '2.0-7.0' },
      { test_name: 'Lymphocytes', unit: 'x10³/μL', reference_range: '1.0-4.0' },
      { test_name: 'Monocytes', unit: 'x10³/μL', reference_range: '0.2-1.0' },
      { test_name: 'Eosinophils', unit: 'x10³/μL', reference_range: '0.0-0.5' },
      { test_name: 'Basophils', unit: 'x10³/μL', reference_range: '0.0-0.2' },
    ],
    'Comprehensive Metabolic Panel': [
      { test_name: 'Glucose', unit: 'mg/dL', reference_range: '70-100' },
      { test_name: 'Sodium', unit: 'mmol/L', reference_range: '135-145' },
      { test_name: 'Potassium', unit: 'mmol/L', reference_range: '3.5-5.1' },
      { test_name: 'Chloride', unit: 'mmol/L', reference_range: '98-107' },
      { test_name: 'CO2', unit: 'mmol/L', reference_range: '22-29' },
      { test_name: 'BUN', unit: 'mg/dL', reference_range: '7-20' },
      { test_name: 'Creatinine', unit: 'mg/dL', reference_range: '0.6-1.2' },
      { test_name: 'Calcium', unit: 'mg/dL', reference_range: '8.5-10.2' },
      { test_name: 'Albumin', unit: 'g/dL', reference_range: '3.5-5.0' },
      { test_name: 'Total Protein', unit: 'g/dL', reference_range: '6.0-8.3' },
      { test_name: 'ALP', unit: 'U/L', reference_range: '30-120' },
      { test_name: 'ALT', unit: 'U/L', reference_range: '10-40' },
      { test_name: 'AST', unit: 'U/L', reference_range: '10-40' },
      { test_name: 'Bilirubin Total', unit: 'mg/dL', reference_range: '0.3-1.2' },
    ],
    'Lipid Panel': [
      { test_name: 'Total Cholesterol', unit: 'mg/dL', reference_range: '<200' },
      { test_name: 'Triglycerides', unit: 'mg/dL', reference_range: '<150' },
      { test_name: 'HDL Cholesterol', unit: 'mg/dL', reference_range: '>40' },
      { test_name: 'LDL Cholesterol', unit: 'mg/dL', reference_range: '<100' },
      { test_name: 'VLDL Cholesterol', unit: 'mg/dL', reference_range: '5-40' },
    ],
    'Liver Function Test': [
      { test_name: 'Total Protein', unit: 'g/dL', reference_range: '6.0-8.3' },
      { test_name: 'Albumin', unit: 'g/dL', reference_range: '3.5-5.0' },
      { test_name: 'Globulin', unit: 'g/dL', reference_range: '2.0-3.5' },
      { test_name: 'A/G Ratio', unit: 'ratio', reference_range: '1.0-2.5' },
      { test_name: 'Total Bilirubin', unit: 'mg/dL', reference_range: '0.3-1.2' },
      { test_name: 'Direct Bilirubin', unit: 'mg/dL', reference_range: '0.1-0.3' },
      { test_name: 'ALP', unit: 'U/L', reference_range: '30-120' },
      { test_name: 'ALT', unit: 'U/L', reference_range: '10-40' },
      { test_name: 'AST', unit: 'U/L', reference_range: '10-40' },
      { test_name: 'GGT', unit: 'U/L', reference_range: '8-40' },
    ],
    'Renal Function Test': [
      { test_name: 'Sodium', unit: 'mmol/L', reference_range: '135-145' },
      { test_name: 'Potassium', unit: 'mmol/L', reference_range: '3.5-5.1' },
      { test_name: 'Chloride', unit: 'mmol/L', reference_range: '98-107' },
      { test_name: 'BUN', unit: 'mg/dL', reference_range: '7-20' },
      { test_name: 'Creatinine', unit: 'mg/dL', reference_range: '0.6-1.2' },
      { test_name: 'Calcium', unit: 'mg/dL', reference_range: '8.5-10.2' },
      { test_name: 'Phosphorus', unit: 'mg/dL', reference_range: '2.5-4.5' },
      { test_name: 'Uric Acid', unit: 'mg/dL', reference_range: '3.5-7.2' },
    ],
    'Thyroid Function Test': [
      { test_name: 'TSH', unit: 'mIU/L', reference_range: '0.4-4.0' },
      { test_name: 'T3 Total', unit: 'ng/dL', reference_range: '80-200' },
      { test_name: 'T4 Total', unit: 'μg/dL', reference_range: '5.0-12.0' },
      { test_name: 'Free T3', unit: 'pg/mL', reference_range: '2.3-4.2' },
      { test_name: 'Free T4', unit: 'ng/dL', reference_range: '0.8-1.8' },
    ],
    'Coagulation Profile': [
      { test_name: 'PT', unit: 'seconds', reference_range: '11-13.5' },
      { test_name: 'INR', unit: 'ratio', reference_range: '0.8-1.2' },
      { test_name: 'APTT', unit: 'seconds', reference_range: '25-35' },
      { test_name: 'Fibrinogen', unit: 'mg/dL', reference_range: '200-400' },
    ],
  };

  // Check if a test name matches any panel template (case-insensitive)
  const getPanelTemplate = (testName: string) => {
    const normalizedName = testName.toLowerCase();
    for (const [panelName, template] of Object.entries(PANEL_TEMPLATES)) {
      if (normalizedName.includes(panelName.toLowerCase()) || 
          panelName.toLowerCase().includes(normalizedName)) {
        return { panelName, template };
      }
    }
    return null;
  };

  // Fetch existing results when modal opens
  useEffect(() => {
    if (isOpen && order) {
      fetchExistingResults();
    }
  }, [isOpen, order]);

  const fetchExistingResults = async () => {
    setFetchingResults(true);
    try {
      const response = await Http.get(`/lab-orders/${order.id}/results`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        // Use existing results
        setResults(response.data.data);
      } else {
        // Initialize from order items with panel expansion
        const initialResults: LabResult[] = [];
        
        for (const item of order.items) {
          const panel = getPanelTemplate(item.test_name);
          
          if (panel) {
            // This is a panel test - expand into multiple results
            for (const param of panel.template) {
              initialResults.push({
                id: 0,
                order_id: order.id,
                test_id: item.test_id,
                test_name: param.test_name,
                result_value: '',
                reference_range: param.reference_range,
                unit: param.unit,
                interpretation: 'Pending review',
                performed_by: performedBy, // Now using the fixed performedBy variable
                performed_date: new Date().toISOString(),
                notes: '',
                abnormal_flag: 'normal'
              });
            }
            // Auto-expand this panel
            setExpandedPanels(prev => new Set(prev).add(item.test_name));
          } else {
            // Single test
            initialResults.push({
              id: 0,
              order_id: order.id,
              test_id: item.test_id,
              test_name: item.test_name,
              result_value: '',
              reference_range: item.reference_range || '',
              unit: item.unit || '',
              interpretation: 'Pending review',
              performed_by: performedBy, // Now using the fixed performedBy variable
              performed_date: new Date().toISOString(),
              notes: '',
              abnormal_flag: 'normal'
            });
          }
        }
        
        setResults(initialResults);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setFetchingResults(false);
    }
  };

  const handleResultChange = (index: number, field: keyof LabResult, value: any) => {
    const updated = [...results];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate abnormal flag based on reference range for numeric values
    if (field === 'result_value' && updated[index].reference_range && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      const refRange = updated[index].reference_range;
      const rangeMatch = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      
      if (rangeMatch) {
        const low = parseFloat(rangeMatch[1]);
        const high = parseFloat(rangeMatch[2]);
        if (numValue > high) updated[index].abnormal_flag = 'high';
        else if (numValue < low) updated[index].abnormal_flag = 'low';
        else updated[index].abnormal_flag = 'normal';
      } else if (refRange.includes('<') && numValue > parseFloat(refRange.replace('<', ''))) {
        updated[index].abnormal_flag = 'high';
      } else if (refRange.includes('>') && numValue < parseFloat(refRange.replace('>', ''))) {
        updated[index].abnormal_flag = 'low';
      }
    }
    
    setResults(updated);
  };

  const handleAddManualParameter = (testId: number, testName: string) => {
    const newResult: LabResult = {
      id: 0,
      order_id: order.id,
      test_id: testId,
      test_name: '',
      result_value: '',
      reference_range: '',
      unit: '',
      interpretation: 'Pending review',
      performed_by: performedBy, // Now using the fixed performedBy variable
      performed_date: new Date().toISOString(),
      notes: '',
      abnormal_flag: 'normal'
    };
    setResults([...results, newResult]);
  };

  const handleRemoveParameter = (index: number) => {
    if (confirm('Remove this test parameter?')) {
      setResults(results.filter((_, i) => i !== index));
    }
  };

  const handleSaveResults = async () => {
    // Validate all results have test names and values
    const invalidResults = results.filter(r => !r.test_name || !r.result_value);
    if (invalidResults.length > 0) {
      alert(`Please fill in test name and result value for all ${invalidResults.length} incomplete entries`);
      return;
    }

    setSaving(true);
    try {
      const resultsToSave = results.map(result => ({
        ...result,
        performed_date: new Date().toISOString(),
        performed_by: performedBy, // Now using the fixed performedBy variable
      }));

      const response = await Http.post(`/results/${order.id}`, {
        patient_id: patientId,
        results: resultsToSave,
      });

      if (response.data.success) {
        alert(`Saved ${resultsToSave.length} result(s) successfully!`);
        onResultsSaved();
        onClose();
      } else {
        alert('Error saving results: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error saving results:', error);
      alert('Error saving results: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const togglePanel = (panelName: string) => {
    setExpandedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelName)) {
        newSet.delete(panelName);
      } else {
        newSet.add(panelName);
      }
      return newSet;
    });
  };

  // Group results by the original test/panel
  const getResultsByOriginalTest = () => {
    const grouped: Map<number, { item: LabOrderItem; results: (LabResult & { index: number })[] }> = new Map();
    
    // Initialize with order items
    order.items.forEach(item => {
      grouped.set(item.test_id, { item, results: [] });
    });
    
    // Assign results to their parent tests
    results.forEach((result, index) => {
      const group = grouped.get(result.test_id);
      if (group) {
        group.results.push({ ...result, index });
      } else {
        // Results without matching order item (manually added)
        if (!grouped.has(-result.test_id)) {
          grouped.set(-result.test_id, { 
            item: { 
              id: -result.test_id, 
              test_id: result.test_id, 
              test_name: result.test_name,
              quantity: 1,
              status: 'pending'
            } as LabOrderItem, 
            results: [] 
          });
        }
        grouped.get(-result.test_id)?.results.push({ ...result, index });
      }
    });
    
    return grouped;
  };

  if (!isOpen) return null;

  const resultsByTest = getResultsByOriginalTest();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Microscope className="w-5 h-5 text-purple-600" />
              Enter Lab Results
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Order: {order.order_number} | Patient ID: {patientId} | Technician: {performedBy}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {fetchingResults ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading existing results...</div>
            </div>
          ) : (
            <div className="space-y-5">
              {Array.from(resultsByTest.entries()).map(([testId, { item, results: testResults }]) => {
                const panelTemplate = getPanelTemplate(item.test_name);
                const isPanel = panelTemplate !== null;
                const isExpanded = expandedPanels.has(item.test_name);
                const allCompleted = testResults.every(r => r.result_value && r.result_value !== '');
                
                return (
                  <div key={testId} className={`border rounded-lg overflow-hidden transition-all ${
                    allCompleted ? 'bg-green-50/30 border-green-200' : 'border-gray-200'
                  }`}>
                    {/* Panel/Test Header */}
                    <div 
                      className={`px-4 py-3 ${allCompleted ? 'bg-green-50' : 'bg-gray-50'} border-b flex justify-between items-center cursor-pointer ${isPanel ? 'hover:bg-gray-100' : ''}`}
                      onClick={() => isPanel && togglePanel(item.test_name)}
                    >
                      <div className="flex items-center gap-3">
                        {isPanel && (
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {item.test_name}
                            {isPanel && <span className="ml-2 text-xs text-purple-600 font-normal">(Panel - {panelTemplate.template.length} parameters)</span>}
                          </h4>
                          {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {allCompleted && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Complete
                          </span>
                        )}
                        {!isPanel && testResults.length === 0 && (
                          <span className="text-xs text-gray-400">No results entered</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Results Table */}
                    {(!isPanel || isExpanded) && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Test Parameter</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Result Value</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reference Range</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Flag</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Interpretation</th>
                              <th className="px-4 py-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {testResults.map((result, idx) => {
                              const flagConfig = ABNORMAL_OPTIONS.find(f => f.value === result.abnormal_flag);
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={result.test_name}
                                      onChange={(e) => handleResultChange(result.index, 'test_name', e.target.value)}
                                      className="w-48 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                      placeholder="Parameter name"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={result.result_value}
                                      onChange={(e) => handleResultChange(result.index, 'result_value', e.target.value)}
                                      className={`w-28 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                                        result.abnormal_flag && result.abnormal_flag !== 'normal' 
                                          ? 'border-red-300 bg-red-50' 
                                          : 'border-gray-200'
                                      }`}
                                      placeholder="Value"
                                    />
                                   </td>
                                  <td className="px-4 py-2">
                                    <select
                                      value={result.unit || ''}
                                      onChange={(e) => handleResultChange(result.index, 'unit', e.target.value)}
                                      className="w-24 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                                    >
                                      <option value="">Select...</option>
                                      {LAB_UNITS.map(unit => (
                                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                                      ))}
                                    </select>
                                   </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={result.reference_range || ''}
                                      onChange={(e) => handleResultChange(result.index, 'reference_range', e.target.value)}
                                      className="w-28 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                      placeholder="e.g., 10-20"
                                    />
                                   </td>
                                  <td className="px-4 py-2">
                                    <select
                                      value={result.abnormal_flag || 'normal'}
                                      onChange={(e) => handleResultChange(result.index, 'abnormal_flag', e.target.value)}
                                      className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                                    >
                                      {ABNORMAL_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.icon} {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    {flagConfig && flagConfig.value !== 'normal' && (
                                      <div className={`text-[10px] mt-0.5 ${flagConfig.color}`}>
                                        {flagConfig.label}
                                      </div>
                                    )}
                                   </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={result.interpretation || ''}
                                      onChange={(e) => handleResultChange(result.index, 'interpretation', e.target.value)}
                                      className="w-32 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                      placeholder="Interpretation"
                                    />
                                   </td>
                                  <td className="px-4 py-2">
                                    <button
                                      onClick={() => handleRemoveParameter(result.index)}
                                      className="text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                   </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Add Parameter Button */}
                    {(!isPanel || isExpanded) && (
                      <div className="px-4 py-2 bg-gray-50 border-t">
                        <button
                          onClick={() => handleAddManualParameter(item.test_id, item.test_name)}
                          className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add additional parameter
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Technician Notes Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  General Technician Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Any additional notes about the lab processing, quality control issues, or special observations..."
                  value={results[0]?.notes || ''}
                  onChange={(e) => {
                    if (results.length > 0) {
                      handleResultChange(0, 'notes', e.target.value);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total Parameters: {results.length}
          </div>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="h-9 text-sm">
              Cancel
            </Button>
            <Button onClick={handleSaveResults} disabled={saving} className="h-9 text-sm bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : `Save All Results (${results.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
// ─── Order Details Modal ──────────────────────────────────────────────────────

const OrderDetailsModal = ({
  order,
  onClose,
}: {
  order: LabOrder;
  onClose: () => void;
}) => {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await Http.get(`/lab-orders/${order.id}/results`);
        if (response.data.success) {
          setResults(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [order.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Lab Order: {order.order_number}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ordered: {new Date(order.ordered_date).toLocaleString()} |
              Priority: {order.priority.toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {order.clinical_notes && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-1">Clinical Notes:</p>
              <p className="text-sm text-gray-700">{order.clinical_notes}</p>
            </div>
          )}

          <h4 className="text-sm font-semibold text-gray-900 mb-3">Ordered Tests</h4>
          <div className="space-y-3">
            {order.items.map((item) => {
              const itemResults = results.filter(r => r.test_id === item.test_id);
              const isCompleted = item.status === 'completed';

              return (
                <div key={item.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{item.test_name}</p>
                      <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <OrderStatusBadge status={item.status} />
                  </div>

                  {isCompleted && itemResults.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Results:</p>
                      {itemResults.map((result) => {
                        const flagConfig = ABNORMAL_FLAGS[result.abnormal_flag as keyof typeof ABNORMAL_FLAGS];
                        return (
                          <div key={result.id} className={`rounded p-3 space-y-1 ${flagConfig?.bg || 'bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-medium ${flagConfig?.color || 'text-gray-900'}`}>
                                {result.result_value} {result.unit}
                              </span>
                              {flagConfig && flagConfig.label !== 'Normal' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${flagConfig.bg} ${flagConfig.color}`}>
                                  {flagConfig.icon} {flagConfig.label}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">Ref: {result.reference_range}</span>
                            </div>
                            <p className="text-xs text-gray-600">{result.interpretation}</p>
                            <p className="text-xs text-gray-400">
                              Performed by: {result.performed_by} on {new Date(result.performed_date).toLocaleString()}
                            </p>
                            {result.notes && <p className="text-xs text-gray-500 mt-1">📝 {result.notes}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="outline" className="h-9 text-sm">Close</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Order Lab Tests Modal ────────────────────────────────────────────────────

const OrderTestsModal = ({
  isOpen,
  onClose,
  onSave,
  patientId,
  defaultScheme,
  availableTests,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (items: CartLabTest[], scheme: PricingScheme, clinicalNotes: string) => Promise<void>;
  patientId: number;
  defaultScheme: PricingScheme;
  availableTests: any[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartLabTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [showTestForm, setShowTestForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');

  const [testFormData, setTestFormData] = useState({
    priority: 'routine' as 'routine' | 'urgent' | 'stat',
    quantity: 1,
    notes: '',
    collection_date: '',
  });

  const transformedTests = (availableTests || []).map((test: any) => ({
    id: test.id,
    test_name: test.service_name || test.test_name || 'Unnamed Test',
    test_category: test.service_category || test.test_category,
    price: test.price || test.cash_price || null,
    turnaround_time: test.turnaround_time,
    specimen_type: test.specimen_type,
    preparation_instructions: test.preparation_instructions,
    reference_range: test.reference_range,
    unit: test.unit,
    is_active: test.is_active,
  }));

  const filteredTests = transformedTests.filter((t: LabTest) =>
    t.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.test_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrice = (test: LabTest): number | null => {
    if (test.price === null || test.price === undefined) return null;
    return typeof test.price === 'number' ? test.price : parseFloat(test.price as any);
  };

  const step: 1 | 2 = cart.length === 0 ? 1 : 2;

  const handleSelectTest = (test: LabTest) => {
    const price = getPrice(test);
    if (!price || price <= 0) {
      alert(`This test does not have a valid price set. Please contact administrator.`);
      return;
    }
    setSelectedTest(test);
    setTestFormData({
      priority: 'routine',
      quantity: 1,
      notes: '',
      collection_date: '',
    });
    setShowTestForm(true);
    setSearchTerm('');
  };

  const addToCart = () => {
    if (!selectedTest) {
      console.error('No test selected');
      return;
    }
    const price = getPrice(selectedTest);
    if (!price || price <= 0) {
      alert(`Cannot add test: No valid price.`);
      return;
    }
    const cartItem: CartLabTest = {
      ...selectedTest,
      cartId: `${selectedTest.id}-${Date.now()}-${Math.random()}`,
      quantity: testFormData.quantity,
      priority: testFormData.priority,
      notes: testFormData.notes,
      collection_date: testFormData.collection_date,
    };
    setCart(prevCart => [...prevCart, cartItem]);
    setShowTestForm(false);
    setSelectedTest(null);
    alert(`✓ ${selectedTest.test_name} added to cart`);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(cart.map(item => item.cartId === cartId ? { ...item, quantity } : item));
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      alert('Please add at least one test to the order');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(cart, defaultScheme, clinicalNotes);
      setCart([]);
      setSearchTerm('');
      setClinicalNotes('');
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error placing lab order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const total = cart.reduce((sum, item) => {
    const price = getPrice(item);
    return sum + (price || 0) * item.quantity;
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden" style={{ maxHeight: 'min(90vh, 680px)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Order Laboratory Tests</h3>
          </div>
          <div className="flex items-center gap-4">
            <StepIndicator step={step} />
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests by name or category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Panel - Available Tests */}
          <div className="w-[58%] border-r border-gray-100 flex flex-col overflow-hidden">
            {!showTestForm ? (
              <>
                <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    Available Tests
                    {searchTerm && ` · ${filteredTests.length} result${filteredTests.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredTests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                      <FlaskConical className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No tests match your search</p>
                      {transformedTests.length === 0 && (
                        <p className="text-xs text-gray-400 mt-2">No laboratory tests configured. Please add tests in the admin panel.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTests.map((test: LabTest) => {
                        const price = getPrice(test);
                        const hasPrice = price != null && price > 0;
                        const isExpanded = expandedId === test.id;
                        return (
                          <div key={test.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-medium text-gray-900 text-sm">{test.test_name}</p>
                                  <CategoryBadge category={test.test_category} />
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs font-medium ${hasPrice ? 'text-gray-800' : 'text-red-500'}`}>
                                    {hasPrice ? `ZMW ${price!.toFixed(2)}` : 'No price'}
                                  </span>
                                  {test.turnaround_time && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {test.turnaround_time}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setExpandedId(isExpanded ? null : test.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>
                              </div>
                              <button
                                onClick={() => handleSelectTest(test)}
                                disabled={!hasPrice}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-sm ${
                                  !hasPrice
                                    ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 border border-purple-600 text-white hover:bg-purple-700'
                                }`}
                              >
                                {!hasPrice ? 'No Price' : 'Select →'}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="mt-3 pt-2 border-t border-gray-100 space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {test.specimen_type && (
                                    <div>
                                      <span className="text-gray-400">Specimen:</span>
                                      <span className="ml-1 text-gray-700">{test.specimen_type}</span>
                                    </div>
                                  )}
                                  {test.preparation_instructions && (
                                    <div className="col-span-2">
                                      <span className="text-gray-400">Preparation:</span>
                                      <span className="ml-1 text-gray-700">{test.preparation_instructions}</span>
                                    </div>
                                  )}
                                </div>
                                {test.reference_range && (
                                  <div>
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Reference Range:</p>
                                    <p className="text-xs text-gray-600">{test.reference_range}</p>
                                  </div>
                                )}
                                {test.unit && (
                                  <div>
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Unit:</p>
                                    <p className="text-xs text-gray-600">{test.unit}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-purple-700">
                      Ordering: {selectedTest?.test_name}
                    </span>
                    <p className="text-[11px] text-purple-600 mt-0.5">
                      Price: {getPrice(selectedTest) ? `ZMW ${getPrice(selectedTest)!.toFixed(2)}` : 'Price N/A'}
                    </p>
                  </div>
                  <button onClick={() => setShowTestForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 bg-white">
                    ← Back to list
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Priority *</label>
                    <select
                      value={testFormData.priority}
                      onChange={e => setTestFormData({ ...testFormData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {PRIORITY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={testFormData.quantity}
                      onChange={e => setTestFormData({ ...testFormData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Collection Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={testFormData.collection_date}
                      onChange={e => setTestFormData({ ...testFormData, collection_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Instructions / Notes</label>
                    <textarea
                      value={testFormData.notes}
                      onChange={e => setTestFormData({ ...testFormData, notes: e.target.value })}
                      rows={3}
                      placeholder="Special instructions for sample collection or processing..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <Button onClick={addToCart} className="w-full h-10 text-sm font-medium bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Cart */}
          <div className="w-[42%] flex flex-col overflow-hidden bg-gray-50/40">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Cart</span>
              {cart.length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-gray-400">
                  <ShoppingCart className="w-12 h-12 opacity-25" />
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs">Select a test from the left to add</p>
                </div>
              ) : (
                cart.map(item => {
                  const price = getPrice(item);
                  return (
                    <div key={item.cartId} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{item.test_name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-emerald-600">
                              {price ? `ZMW ${(price * item.quantity).toFixed(2)}` : '—'}
                            </span>
                            <PriorityBadge priority={item.priority} />
                            {item.quantity > 1 && (
                              <span className="text-xs text-gray-500">x{item.quantity}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 px-1">
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.cartId)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-gray-500 mt-2 pt-1 border-t border-gray-100 line-clamp-2">
                          📝 {item.notes}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-white shadow-lg">
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Clinical Notes (Optional)</label>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    rows={2}
                    placeholder="Relevant clinical information for the lab..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">ZMW {total.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Tests: {cart.length}</p>
                  </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="w-full h-10 text-sm font-medium bg-purple-600 hover:bg-purple-700">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LabOrdersTab({ patientId, admissionNumber, patientPricing, initialOrders = [], userIsLab = false }: Props) {
  const { props } = usePage();
  const laboratoryTests = (props as any).laboratoryTests || [];
  
  const [orders, setOrders] = useState<LabOrder[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LabOrder['status'] | 'all'>('all');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const defaultScheme = patientPricing?.default_scheme || 'cash';

  useEffect(() => {
    if (initialOrders.length === 0 && patientId) {
      const fetchOrders = async () => {
        setLoading(true);
        try {
          const response = await Http.get(`/patients/${patientId}/lab-orders`);
          if (response.data.success) {
            setOrders(response.data.data);
          }
        } catch (error) {
          console.error('Error fetching lab orders:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [patientId, initialOrders.length]);

  const handlePlaceOrder = async (items: CartLabTest[], scheme: PricingScheme, clinicalNotes: string) => {
    const response = await Http.post(`/patients/${patientId}/lab-orders`, {
      items: items.map(item => ({
        test_id: item.id,
        test_name: item.test_name,
        quantity: item.quantity,
        priority: item.priority,
        notes: item.notes,
        collection_date: item.collection_date,
      })),
      scheme: scheme,
      clinical_notes: clinicalNotes,
      admission_number: admissionNumber,
    });

    if (response.data.success) {
      setOrders(prev => [response.data.data, ...prev]);
      alert('Lab order placed successfully!');
    } else {
      throw new Error(response.data.message || 'Failed to place order');
    }
  };

  const refreshOrders = async () => {
    if (patientId) {
      try {
        const response = await Http.get(`/patients/${patientId}/lab-orders`);
        if (response.data.success) {
          setOrders(response.data.data);
        }
      } catch (error) {
        console.error('Error refreshing orders:', error);
      }
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.items.some(item => item.test_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading lab orders...</div>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Laboratory Orders</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Order and track laboratory tests
            {admissionNumber && admissionNumber !== 'N/A' && <span className="ml-2 text-purple-600">| Admission: {admissionNumber}</span>}
          </p>
        </div>
        <Button onClick={() => setShowOrderModal(true)} className="h-9 text-sm bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-1.5" />
          Order Tests
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders by number or test name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="collected">Collected</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
          <FlaskConical className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No lab orders found</p>
          <Button onClick={() => setShowOrderModal(true)} variant="outline" className="mt-3">
            <Plus className="w-4 h-4 mr-1.5" />
            Order Tests
          </Button>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Order #</th>
                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tests</th>
                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Ordered Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-mono text-sm font-medium text-gray-900">{order.order_number}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-700">{item.test_name}</p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-400">+{order.items.length - 2} more</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={order.priority} />
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {new Date(order.ordered_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-4">
                    {userIsLab ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowResultsModal(true);
                          }}
                          variant="outline"
                          className="h-7 text-xs px-3"
                        >
                          <Microscope className="w-3 h-3 mr-1" />
                          Enter Results
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailsModal(true);
                          }}
                          variant="outline"
                          className="h-7 text-xs px-3"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsModal(true);
                        }}
                        variant="outline"
                        className="h-7 text-xs px-3"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Tests Modal */}
      {showOrderModal && patientId && (
        <OrderTestsModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          onSave={handlePlaceOrder}
          patientId={patientId}
          defaultScheme={defaultScheme}
          availableTests={laboratoryTests}
        />
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Results Entry Modal */}
      {showResultsModal && selectedOrder && patientId && (
        <ResultsEntryModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          patientId={patientId}
          onResultsSaved={refreshOrders}
          performedBy={props.auth.user.name || 'lab-teachnician'}
        />
      )}
    </div>
  );
}