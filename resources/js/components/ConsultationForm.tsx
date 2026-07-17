import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  X, Plus, Trash2, Search, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, FileText, Calendar, Clock, User,
  Activity, Heart, Brain, Eye, Save, Lock, DollarSign,
  CreditCard, Building, Syringe, Pill, Scissors, Microscope,
  AlertTriangle, Stethoscope,
  StethoscopeIcon
} from 'lucide-react';
import { router } from '@inertiajs/react';
import useDrugs from '@/global/useDrugs'
import useLabOrders from "@/global/useLabOrders"

// ============================================
// TYPES
// ============================================

interface BillingItem {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  type: 'consultation' | 'lab' | 'imaging' | 'procedure' | 'medication';
  category: string;
}

interface ConsultationData {
  id?: string;
  patientContext: {
    patientId: string;
    appointmentId: string;
    visitType: string;
    attendingClinician: string;
    dateTime: string;
  };
  chiefComplaints: Array<{
    id: string;
    complaint: string;
    duration: string;
    severity: string;
  }>;
  hpi: {
    narrative: string;
    onset: string;
    duration: string;
    progression: string;
    aggravating: string;
    relieving: string;
    associatedSymptoms: string;
  };
  ros: Record<string, { symptoms: string[]; notes: string }>;
  pastMedicalHistory: {
    chronicIllnesses: string[];
    surgeries: string[];
    allergies: string[];
    medications: Array<{ name: string; dose: string; frequency: string }>;
  };
  vitals: {
    temperature: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    pulse: number;
    respiratoryRate: number;
    oxygenSaturation: number;
    weight: number;
    height: number;
    bmi: number;
  };
  examination: {
    generalAppearance: string;
    systems: Record<string, { status: string; notes: string }>;
  };
  obs: {
    gravida: number;
    para: number;
    abortions: number;
    lmp: string;
    edd: string;
    gestationalAge: number;
    fetalMovement: string;
    riskFactors: string[];
  };
  gyn: {
    menstrualHistory: string;
    cycleRegularity: string;
    dysmenorrhea: boolean;
    vaginalDischarge: string;
    contraceptiveUse: string;
    papSmearHistory: string;
  };
  diagnosis: {
    provisional: string;
    differential: string[];
    icdCodes: Array<{ code: string; name: string }>;
  };
  orders: {
    labs: Array<{ id: string; test: string; priority: string; price: number; code: string }>;
    imaging: Array<{ id: string; type: string; region: string; price: number; code: string }>;
    procedures: Array<{ id: string; procedure: string; quantity: number; price: number; code: string }>;
  };
  prescriptions: Array<{
    id: string;
    drug: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    instructions: string;
    price: number;
    code: string;
  }>;
  treatmentPlan: {
    summary: string;
    followUpDate: string;
    referral: { type: string; to: string };
  };
  billing: BillingItem[];
  status: string;
  audit: Array<{ action: string; user: string; timestamp: string }>;
}

// ============================================
// ACCORDION COMPONENT
// ============================================

const AccordionSection = ({ title, required, badge, completed, isOpen, onToggle, children, highlight }) => {
  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${highlight ? 'bg-blue-100' : ''}`}
      >
        <div className="flex items-center gap-3">
          {completed ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : required ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <FileText className="h-5 w-5 text-gray-400" />
          )}
          <span className="font-medium text-gray-900">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {badge && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// ============================================
// NESTED ACCORDION FOR ROS
// ============================================

const NestedAccordion = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <span className="font-medium text-sm">{title}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isOpen && <div className="p-3 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// ============================================
// SECTION COMPONENTS
// ============================================

const PatientContextSection = ({ data, onChange, patientId, appointmentId }) => (
  <div className="grid grid-cols-2 gap-4">
    <div><label className="block text-sm font-medium text-gray-700">Patient ID</label><input type="text" value={patientId} disabled className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm" /></div>
    <div><label className="block text-sm font-medium text-gray-700">Appointment ID</label><input type="text" value={appointmentId} disabled className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm" /></div>
    <div><label className="block text-sm font-medium text-gray-700">Visit Type</label><select value={data.visitType} onChange={(e) => onChange({...data, visitType: e.target.value})} className="mt-1 w-full rounded border px-3 py-2 text-sm"><option>OPD</option><option>IPD</option><option>Emergency</option><option>Follow-up</option></select></div>
    <div><label className="block text-sm font-medium text-gray-700">Attending Clinician</label><input type="text" value={data.attendingClinician} onChange={(e) => onChange({...data, attendingClinician: e.target.value})} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
    <div><label className="block text-sm font-medium text-gray-700">Date & Time</label><input type="datetime-local" value={data.dateTime} onChange={(e) => onChange({...data, dateTime: e.target.value})} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
  </div>
);

const ChiefComplaintsSection = ({ data, onChange }) => {
  const add = () => onChange([...data, { id: Date.now().toString(), complaint: '', duration: '', severity: 'mild' }]);
  const remove = (id) => onChange(data.filter(c => c.id !== id));
  const update = (id, field, value) => onChange(data.map(c => c.id === id ? { ...c, [field]: value } : c));
  return (
    <div className="space-y-3">
      {data.map(c => (
        <div key={c.id} className="flex gap-2">
          <input type="text" placeholder="Complaint" value={c.complaint} onChange={e => update(c.id, 'complaint', e.target.value)} className="flex-1 rounded border px-3 py-2 text-sm" />
          <input type="text" placeholder="Duration" value={c.duration} onChange={e => update(c.id, 'duration', e.target.value)} className="w-28 rounded border px-3 py-2 text-sm" />
          <select value={c.severity} onChange={e => update(c.id, 'severity', e.target.value)} className="w-28 rounded border px-3 py-2 text-sm"><option>mild</option><option>moderate</option><option>severe</option></select>
          <button onClick={() => remove(c.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={add} className="text-blue-600 text-sm flex items-center gap-1"><Plus className="h-4 w-4" /> Add Complaint</button>
    </div>
  );
};

const HPISection = ({ data, onChange }) => (
  <div className="space-y-3">
    <textarea value={data.narrative} onChange={e => onChange({...data, narrative: e.target.value})} rows={3} placeholder="Narrative description..." className="w-full rounded border px-3 py-2 text-sm" />
    <div className="grid grid-cols-2 gap-3">
      <input type="text" placeholder="Onset" value={data.onset} onChange={e => onChange({...data, onset: e.target.value})} className="rounded border px-3 py-2 text-sm" />
      <input type="text" placeholder="Duration" value={data.duration} onChange={e => onChange({...data, duration: e.target.value})} className="rounded border px-3 py-2 text-sm" />
      <input type="text" placeholder="Progression" value={data.progression} onChange={e => onChange({...data, progression: e.target.value})} className="rounded border px-3 py-2 text-sm" />
      <input type="text" placeholder="Aggravating factors" value={data.aggravating} onChange={e => onChange({...data, aggravating: e.target.value})} className="rounded border px-3 py-2 text-sm" />
      <input type="text" placeholder="Relieving factors" value={data.relieving} onChange={e => onChange({...data, relieving: e.target.value})} className="rounded border px-3 py-2 text-sm" />
      <input type="text" placeholder="Associated symptoms" value={data.associatedSymptoms} onChange={e => onChange({...data, associatedSymptoms: e.target.value})} className="rounded border px-3 py-2 text-sm" />
    </div>
  </div>
);

const ROSSection = ({ data, onChange }) => {
  const systems = ['General', 'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Genitourinary', 'Neurological', 'Musculoskeletal', 'Endocrine', 'Dermatological'];
  const symptoms = {
    General: ['Fever', 'Fatigue', 'Weight loss'],
    Cardiovascular: ['Chest pain', 'Palpitations', 'Shortness of breath'],
    Respiratory: ['Cough', 'Wheezing', 'Hemoptysis'],
    Gastrointestinal: ['Nausea', 'Vomiting', 'Diarrhea'],
    Genitourinary: ['Dysuria', 'Frequency', 'Hematuria'],
    Neurological: ['Headache', 'Dizziness', 'Numbness'],
    Musculoskeletal: ['Joint pain', 'Muscle pain', 'Stiffness'],
    Endocrine: ['Heat/Cold intolerance', 'Weight changes'],
    Dermatological: ['Rash', 'Itching', 'Dryness']
  };
  const updateSystem = (system, field, value) => onChange({...data, [system]: {...data[system], [field]: value}});
  const toggleSymptom = (system, symptom) => {
    const current = data[system]?.symptoms || [];
    const updated = current.includes(symptom) ? current.filter(s => s !== symptom) : [...current, symptom];
    updateSystem(system, 'symptoms', updated);
  };
  return (
    <div className="space-y-2">
      {systems.map(s => (
        <NestedAccordion key={s} title={s}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(symptoms[s] || []).map(sym => (
              <label key={sym} className="flex items-center gap-2"><input type="checkbox" checked={data[s]?.symptoms?.includes(sym)} onChange={() => toggleSymptom(s, sym)} className="rounded" /><span className="text-sm">{sym}</span></label>
            ))}
          </div>
          <textarea placeholder="Notes..." value={data[s]?.notes || ''} onChange={e => updateSystem(s, 'notes', e.target.value)} rows={2} className="w-full rounded border px-3 py-2 text-sm" />
        </NestedAccordion>
      ))}
    </div>
  );
};

const PMHSection = ({ data, onChange }) => {
  const illnesses = ['Hypertension', 'Diabetes', 'Asthma', 'Heart Disease', 'Kidney Disease', 'Thyroid Disorder'];
  const addItem = (field, value, setter) => value && onChange({...data, [field]: [...data[field], value]});
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium mb-2">Chronic Illnesses</label><div className="grid grid-cols-2 gap-2">{illnesses.map(i => (<label key={i} className="flex items-center gap-2"><input type="checkbox" checked={data.chronicIllnesses.includes(i)} onChange={e => onChange({...data, chronicIllnesses: e.target.checked ? [...data.chronicIllnesses, i] : data.chronicIllnesses.filter(x => x !== i)})} /><span>{i}</span></label>))}</div></div>
      <div><label className="block text-sm font-medium mb-1">Surgeries</label><div className="flex gap-2"><input type="text" placeholder="Add surgery" className="flex-1 rounded border px-3 py-2 text-sm" onKeyDown={e => e.key === 'Enter' && addItem('surgeries', e.target.value, e.target.value = '')} /><button className="text-blue-600"><Plus className="h-4 w-4" /></button></div><div className="mt-2">{data.surgeries.map((s, i) => <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded mb-1"><span>{s}</span><button onClick={() => onChange({...data, surgeries: data.surgeries.filter((_, idx) => idx !== i)})}><Trash2 className="h-3 w-3 text-red-500" /></button></div>)}</div></div>
      <div><label className="block text-sm font-medium mb-1">Allergies</label><div className="flex gap-2"><input type="text" placeholder="Add allergy" className="flex-1 rounded border px-3 py-2 text-sm" /><button className="text-blue-600"><Plus className="h-4 w-4" /></button></div><div className="mt-2">{data.allergies.map((a, i) => <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded mb-1"><span>{a}</span><button onClick={() => onChange({...data, allergies: data.allergies.filter((_, idx) => idx !== i)})}><Trash2 className="h-3 w-3 text-red-500" /></button></div>)}</div></div>
    </div>
  );
};

const VitalSignsSection = ({ data, onChange }) => {
  const update = (field, value) => {
    const newData = { ...data, [field]: value };
    if (field === 'weight' || field === 'height') {
      newData.bmi = newData.weight && newData.height ? Math.round(newData.weight / ((newData.height / 100) ** 2) * 10) / 10 : 0;
    }
    onChange(newData);
  };
  return (
    <div className="grid grid-cols-3 gap-3">
      <div><label className="block text-sm">Temperature (°C)</label><input type="number" step="0.1" value={data.temperature} onChange={e => update('temperature', parseFloat(e.target.value))} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      <div><label className="block text-sm">Blood Pressure</label><div className="flex gap-1 mt-1"><input type="number" placeholder="Systolic" value={data.bloodPressureSystolic} onChange={e => update('bloodPressureSystolic', parseInt(e.target.value))} className="w-1/2 rounded border px-3 py-2 text-sm" /><span>/</span><input type="number" placeholder="Diastolic" value={data.bloodPressureDiastolic} onChange={e => update('bloodPressureDiastolic', parseInt(e.target.value))} className="w-1/2 rounded border px-3 py-2 text-sm" /></div></div>
      <div><label className="block text-sm">Pulse (bpm)</label><input type="number" value={data.pulse} onChange={e => update('pulse', parseInt(e.target.value))} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      <div><label className="block text-sm">Respiratory Rate</label><input type="number" value={data.respiratoryRate} onChange={e => update('respiratoryRate', parseInt(e.target.value))} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      <div><label className="block text-sm">O2 Saturation (%)</label><input type="number" value={data.oxygenSaturation} onChange={e => update('oxygenSaturation', parseInt(e.target.value))} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      <div><label className="block text-sm">Weight (kg)</label><input type="number" step="0.1" value={data.weight} onChange={e => update('weight', parseFloat(e.target.value))} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      <div><label className="block text-sm">Height (cm)</label><input type="number" step="0.1" value={data.height} onChange={e => update('height', parseFloat(e.target.value))} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      <div><label className="block text-sm">BMI</label><input type="text" value={data.bmi} disabled className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm" /></div>
    </div>
  );
};

const PhysicalExamSection = ({ data, onChange }) => {
  const systems = ['cardiovascular', 'respiratory', 'abdomen', 'neurological', 'musculoskeletal'];
  return (
    <div className="space-y-3">
      <div><label className="block text-sm font-medium">General Appearance</label><textarea value={data.generalAppearance} onChange={e => onChange({...data, generalAppearance: e.target.value})} rows={2} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      {systems.map(s => (
        <div key={s} className="border rounded p-3"><div className="flex justify-between mb-2"><span className="font-medium capitalize">{s}</span><div className="flex gap-3"><label className="flex items-center gap-1"><input type="radio" name={`${s}-status`} checked={data.systems[s]?.status === 'normal'} onChange={() => onChange({...data, systems: {...data.systems, [s]: {...data.systems[s], status: 'normal'}}})} /><span className="text-sm">Normal</span></label><label className="flex items-center gap-1"><input type="radio" name={`${s}-status`} checked={data.systems[s]?.status === 'abnormal'} onChange={() => onChange({...data, systems: {...data.systems, [s]: {...data.systems[s], status: 'abnormal'}}})} /><span className="text-sm">Abnormal</span></label></div></div><textarea placeholder="Findings..." value={data.systems[s]?.notes || ''} onChange={e => onChange({...data, systems: {...data.systems, [s]: {...data.systems[s], notes: e.target.value}}})} rows={2} className="w-full rounded border px-3 py-2 text-sm" /></div>
      ))}
    </div>
  );
};

const DiagnosisSection = ({ data, onChange }) => {
  const [search, setSearch] = useState('');
  const icdCodes = [{ code: 'I10', name: 'Essential hypertension' }, { code: 'E11.9', name: 'Type 2 diabetes' }, { code: 'J45.909', name: 'Asthma' }];
  const addICD = (icd) => !data.icdCodes.find(c => c.code === icd.code) && onChange({...data, icdCodes: [...data.icdCodes, icd]});
  return (
    <div className="space-y-3">
      <div><label className="block text-sm font-medium">Provisional Diagnosis</label><textarea value={data.provisional} onChange={e => onChange({...data, provisional: e.target.value})} rows={3} className="mt-1 w-full rounded border px-3 py-2 text-sm" /></div>
      <div><label className="block text-sm font-medium">Differential Diagnoses</label><textarea value={data.differential.join('\n')} onChange={e => onChange({...data, differential: e.target.value.split('\n').filter(s => s.trim())})} rows={3} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="One per line" /></div>
      <div><label className="block text-sm font-medium">ICD-10 Codes</label><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder="Search ICD-10..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded text-sm" /></div>{search && <div className="border rounded mt-1 max-h-32 overflow-y-auto">{icdCodes.filter(c => c.code.includes(search) || c.name.toLowerCase().includes(search.toLowerCase())).map(icd => <div key={icd.code} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => { addICD(icd); setSearch(''); }}><span className="font-medium">{icd.code}</span> - {icd.name}</div>)}</div>}<div className="mt-2">{data.icdCodes.map(icd => <div key={icd.code} className="flex justify-between items-center p-2 bg-gray-50 rounded mb-1"><span>{icd.code} - {icd.name}</span><button onClick={() => onChange({...data, icdCodes: data.icdCodes.filter(c => c.code !== icd.code)})}><Trash2 className="h-3 w-3 text-red-500" /></button></div>)}</div></div>
    </div>
  );
};

const OrdersSection = ({ data, onChange, onAddToBilling, onRemoveFromBilling }) => {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showBillableOnly, setShowBillableOnly] = useState(false);
  
  // Use the lab orders hook
  const { labOrders, loading, error, deleteLabOrder } = useLabOrders();

  // Filter lab orders based on search, priority, and billable status
  const filteredLabOrders = labOrders.filter(lab => {
    // Search filter
    const matchesSearch = lab.name?.toLowerCase().includes(search.toLowerCase()) ||
                          lab.code?.toLowerCase().includes(search.toLowerCase()) ||
                          lab.category?.toLowerCase().includes(search.toLowerCase());
    
    // Priority filter
    const matchesPriority = filterPriority === 'all' || lab.priority === filterPriority;
    
    // Billable only filter
    const matchesBillable = !showBillableOnly || (lab.price && lab.price > 0);
    
    return matchesSearch && matchesPriority && matchesBillable;
  });

  // Group labs by category
  const groupedLabs = filteredLabOrders.reduce((groups, lab) => {
    const category = lab.category || 'Uncategorized';
    if (!groups[category]) groups[category] = [];
    groups[category].push(lab);
    return groups;
  }, {});

  // Add lab to consultation orders and billing
  const addLab = (test) => {
    const newLab = {
      id: Date.now().toString(),
      test: test.name,
      priority: test.priority || 'routine',
      price: test.price || 0,
      code: test.code,
      category: test.category,
      labOrderId: test.id
    };
    
    onChange({
      ...data,
      labs: [...data.labs, newLab]
    });
    
    // Add to billing if it has a price
    if (test.price && test.price > 0) {
      onAddToBilling({
        id: newLab.id,
        name: test.name,
        code: test.code,
        price: test.price,
        quantity: 1,
        type: 'lab',
        category: test.category || 'Laboratory'
      });
    }
  };

  // Remove lab from consultation orders and billing
  const removeLab = (id) => {
    const lab = data.labs.find(l => l.id === id);
    if (lab) {
      onRemoveFromBilling(id);
      onChange({
        ...data,
        labs: data.labs.filter(l => l.id !== id)
      });
    }
  };

  // Delete lab order permanently
  const handleDeleteLabOrder = async (labOrderId, labName) => {
    if (confirm(`Are you sure you want to permanently delete "${labName}"? This action cannot be undone.`)) {
      const success = await deleteLabOrder(labOrderId);
      if (!success) {
        alert('Failed to delete lab order. Please try again.');
      }
    }
  };

  // Calculate total billable amount for selected labs
  const totalBillable = data.labs.reduce((total, lab) => total + (lab.price || 0), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading lab orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-red-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load lab orders: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">Laboratory Orders</h4>
          {data.labs.length > 0 && (
            <span className="text-sm font-medium text-green-600">
              Total: ${totalBillable.toFixed(2)}
            </span>
          )}
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tests by name, code, or category..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
            
            <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={showBillableOnly}
                onChange={(e) => setShowBillableOnly(e.target.checked)}
                className="rounded"
              />
              <DollarSign className="h-4 w-4" />
              Billable only
            </label>
          </div>
        </div>

        {/* Available Lab Tests */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {Object.entries(groupedLabs).map(([category, labs]) => (
              <div key={category}>
                <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b font-medium text-sm text-gray-600">
                  {category}
                </div>
                {labs.map(lab => (
                  <div key={lab.id} className="flex justify-between items-center p-3 hover:bg-gray-50 border-b last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{lab.name}</span>
                        {lab.priority === 'stat' && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">STAT</span>
                        )}
                        {lab.priority === 'urgent' && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">Urgent</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">Code: {lab.code}</span>
                        {lab.price && lab.price > 0 && (
                          <span className="text-xs font-medium text-green-600">${lab.price}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => addLab(lab)} 
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Add to consultation"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteLabOrder(lab.id, lab.name)} 
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete lab order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            
            {filteredLabOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No lab tests found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Labs */}
        {data.labs.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Selected Tests ({data.labs.length})</h4>
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {data.labs.map(l => (
                <div key={l.id} className="flex justify-between items-center p-2">
                  <div>
                    <span className="text-sm">{l.test}</span>
                    {l.priority && l.priority !== 'routine' && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        l.priority === 'stat' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {l.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-green-600">${l.price}</span>
                    <button onClick={() => removeLab(l.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PrescriptionsSection = ({ data, onChange, onAddToBilling, onRemoveFromBilling, patientId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [showDrugSelector, setShowDrugSelector] = useState(false);
  
  const { loading, error, drugs } = useDrugs();
  
  // Filter drugs based on search term
  const filteredDrugs = drugs?.filter(drug => 
    drug.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Add new prescription
  const addPrescription = () => {
    onChange([...data, { 
      id: Date.now().toString(), 
      drug: '', 
      dose: '', 
      frequency: '', 
      duration: '', 
      route: '', 
      instructions: '', 
      price: 0, 
      code: '',
      drugId: null,
      patientId: patientId // Add patientId to prescription
    }]);
  };

  // Remove prescription
  const removePrescription = (id) => { 
    onRemoveFromBilling(id); 
    onChange(data.filter(p => p.id !== id)); 
  };

  // Update prescription field
  const updatePrescription = (id, field, value) => {
    onChange(data.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Select drug from dropdown
  const selectDrug = (drug, prescriptionId) => {
    updatePrescription(prescriptionId, 'drug', drug.name);
    updatePrescription(prescriptionId, 'code', drug.code);
    updatePrescription(prescriptionId, 'price', drug.price || 0);
    updatePrescription(prescriptionId, 'drugId', drug.id);
    setShowDrugSelector(false);
    setSearchTerm('');
  };

  // Add to billing
  const addToBilling = (prescription) => { 
    if(prescription.drug && prescription.price) {
      onAddToBilling({ 
        id: prescription.id, 
        name: prescription.drug, 
        code: prescription.code, 
        price: prescription.price, 
        quantity: 1, 
        type: 'medication', 
        category: 'Pharmacy',
        patientId: patientId // Include patientId in billing item
      });
    }
  };

  // Handle prescription submission with patientId
  const handleSubmitPrescription = async (prescription) => {
    // Add patientId to the prescription data
    const prescriptionWithPatient = {
      ...prescription,
      patientId: patientId,
      prescribedAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Here you can submit to your API
    console.log('Submitting prescription:', prescriptionWithPatient);
    
    // You can add API call here
    // await submitPrescription(prescriptionWithPatient);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading drugs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">Failed to load drugs: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with patient info */}
      {patientId && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          Prescribing for Patient ID: {patientId}
        </div>
      )}

      {/* Prescriptions list */}
      {data.map(p => (
        <div key={p.id} className="border rounded-lg p-4 space-y-3">
          {/* Drug selection with search */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Drug</label>
                <div className="relative">
                  <input 
                    placeholder="Search or select drug..." 
                    value={p.drug}
                    onFocus={() => setShowDrugSelector(true)}
                    onChange={(e) => {
                      updatePrescription(p.id, 'drug', e.target.value);
                      setSearchTerm(e.target.value);
                      setShowDrugSelector(true);
                    }}
                    className="w-full rounded border px-3 py-2 text-sm pr-8"
                  />
                  {p.drug && (
                    <button
                      onClick={() => {
                        updatePrescription(p.id, 'drug', '');
                        updatePrescription(p.id, 'code', '');
                        updatePrescription(p.id, 'price', 0);
                        updatePrescription(p.id, 'drugId', null);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Drug selection dropdown */}
                {showDrugSelector && searchTerm && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredDrugs.length > 0 ? (
                      filteredDrugs.map(drug => (
                        <div
                          key={drug.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => selectDrug(drug, p.id)}
                        >
                          <div className="font-medium text-sm">{drug.name}</div>
                          <div className="flex gap-2 text-xs text-gray-500 mt-1">
                            <span>Code: {drug.code}</span>
                            {drug.price && <span>Price: ${drug.price}</span>}
                            {drug.strength && <span>{drug.strength}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        No drugs found. Type to search.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prescription details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Dose</label>
              <input 
                placeholder="e.g., 500mg" 
                value={p.dose} 
                onChange={e => updatePrescription(p.id, 'dose', e.target.value)} 
                className="w-full rounded border px-3 py-2 text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
              <select 
                value={p.frequency} 
                onChange={e => updatePrescription(p.id, 'frequency', e.target.value)} 
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Select frequency</option>
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Four times daily">Four times daily</option>
                <option value="Every 4 hours">Every 4 hours</option>
                <option value="Every 6 hours">Every 6 hours</option>
                <option value="Every 8 hours">Every 8 hours</option>
                <option value="As needed">As needed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
              <input 
                placeholder="e.g., 7 days" 
                value={p.duration} 
                onChange={e => updatePrescription(p.id, 'duration', e.target.value)} 
                className="w-full rounded border px-3 py-2 text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Route</label>
              <select 
                value={p.route} 
                onChange={e => updatePrescription(p.id, 'route', e.target.value)} 
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Select route</option>
                <option value="Oral">Oral</option>
                <option value="Intravenous">Intravenous</option>
                <option value="Intramuscular">Intramuscular</option>
                <option value="Subcutaneous">Subcutaneous</option>
                <option value="Topical">Topical</option>
                <option value="Inhalation">Inhalation</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
              <textarea 
                placeholder="Special instructions..." 
                value={p.instructions} 
                onChange={e => updatePrescription(p.id, 'instructions', e.target.value)} 
                rows={2}
                className="w-full rounded border px-3 py-2 text-sm" 
              />
            </div>
          </div>

          {/* Price and actions */}
          <div className="flex justify-between items-center pt-2 border-t">
            {p.price > 0 && (
              <div className="text-sm font-medium text-green-600">
                Price: ${p.price.toFixed(2)}
              </div>
            )}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  addToBilling(p);
                  handleSubmitPrescription(p);
                  removePrescription(p.id);
                }} 
                className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                disabled={!p.drug || !p.dose || !p.frequency}
              >
                <Trash2 className="h-4 w-4" />
                Remove & Add to Bill
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add prescription button */}
      <button 
        onClick={addPrescription} 
        className="w-full text-blue-600 text-sm flex items-center justify-center gap-1 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Prescription
      </button>
    </div>
  );
};

const TreatmentPlanSection = ({ data, onChange }) => (
  <div className="space-y-3">
    <textarea value={data.summary} onChange={e => onChange({...data, summary: e.target.value})} rows={3} placeholder="Treatment summary..." className="w-full rounded border px-3 py-2 text-sm" />
    <input type="date" value={data.followUpDate} onChange={e => onChange({...data, followUpDate: e.target.value})} className="w-full rounded border px-3 py-2 text-sm" />
    <div className="flex gap-2"><select value={data.referral.type} onChange={e => onChange({...data, referral: {...data.referral, type: e.target.value}})} className="flex-1 rounded border px-3 py-2 text-sm"><option>internal</option><option>external</option></select><input type="text" placeholder="Refer to..." value={data.referral.to} onChange={e => onChange({...data, referral: {...data.referral, to: e.target.value}})} className="flex-1 rounded border px-3 py-2 text-sm" /></div>
  </div>
);

const BillingSidebar = ({ items, consultationFee = 100 }) => {
  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const total = consultationFee + subtotal;
  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Billing Summary</h3>
      <div className="flex justify-between py-2 border-b"><span>Consultation Fee</span><span>${consultationFee}</span></div>
      {items.map(i => <div key={i.id} className="flex justify-between py-1 text-sm"><span>{i.name} x{i.quantity}</span><span>${(i.price * i.quantity).toFixed(2)}</span></div>)}
      <div className="flex justify-between pt-2 border-t font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
      <div className="mt-4"><label className="block text-sm mb-2">Payment Type</label><div className="flex gap-3"><label className="flex items-center"><input type="radio" name="payment" defaultChecked className="mr-1" /> Cash</label><label className="flex items-center"><input type="radio" name="payment" className="mr-1" /> Insurance</label></div></div>
      <button className="w-full mt-4 bg-green-600 text-white py-2 rounded hover:bg-green-700">Process Payment</button>
    </div>
  );
};

const AuditSection = ({ data, clinician }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4" /> Clinician: {clinainer || 'Not assigned'}</div>
    {data.map((entry, i) => <div key={i} className="text-xs text-gray-500"><span>{new Date(entry.timestamp).toLocaleString()}</span> - {entry.action} by {entry.user}</div>)}
  </div>
);

// ============================================
// MAIN CONSULTATION DIALOG
// ============================================

export const ConsultationDialog = ({ isOpen, onClose, onSuccess, patientId, appointmentId, consultationData = null }) => {
  const [activeSections, setActiveSections] = useState(['patient-context']);
  const [billingItems, setBillingItems] = useState([]);
  const [formData, setFormData] = useState({
    patientContext: { visitType: 'OPD', attendingClinician: '', dateTime: new Date().toISOString().slice(0, 16) },
    chiefComplaints: [],
    hpi: { narrative: '', onset: '', duration: '', progression: '', aggravating: '', relieving: '', associatedSymptoms: '' },
    ros: {},
    pastMedicalHistory: { chronicIllnesses: [], surgeries: [], allergies: [], medications: [] },
    vitals: { temperature: 0, bloodPressureSystolic: 0, bloodPressureDiastolic: 0, pulse: 0, respiratoryRate: 0, oxygenSaturation: 0, weight: 0, height: 0, bmi: 0 },
    examination: { generalAppearance: '', systems: {} },
    obs: { gravida: 0, para: 0, abortions: 0, lmp: '', edd: '', gestationalAge: 0, fetalMovement: '', riskFactors: [] },
    gyn: { menstrualHistory: '', cycleRegularity: '', dysmenorrhea: false, vaginalDischarge: '', contraceptiveUse: '', papSmearHistory: '' },
    diagnosis: { provisional: '', differential: [], icdCodes: [] },
    orders: { labs: [], imaging: [], procedures: [] },
    prescriptions: [],
    treatmentPlan: { summary: '', followUpDate: '', referral: { type: 'internal', to: '' } },
    billing: [],
    status: 'draft',
    audit: []
  });
  const [completion, setCompletion] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addToBilling = (item) => setBillingItems(prev => {
    const existing = prev.find(i => i.id === item.id);
    if(existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
    return [...prev, item];
  });
  const removeFromBilling = (id) => setBillingItems(prev => prev.filter(i => i.id !== id));

  const validateSection = (section) => {
    switch(section) {
      case 'patient-context': return !!formData.patientContext.attendingClinician;
      case 'chief-complaints': return formData.chiefComplaints.length > 0 && formData.chiefComplaints.some(c => c.complaint);
      case 'vital-signs': return formData.vitals.temperature > 0 && formData.vitals.bloodPressureSystolic > 0;
      case 'diagnosis': return !!formData.diagnosis.provisional;
      default: return true;
    }
  };

  useEffect(() => {
    setCompletion({
      'patient-context': validateSection('patient-context'),
      'chief-complaints': validateSection('chief-complaints'),
      'vital-signs': validateSection('vital-signs'),
      'diagnosis': validateSection('diagnosis')
    });
  }, [formData]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const payload = { ...formData, billing: billingItems, status: 'in_progress' };
    const url = consultationData ? `/patients/${patientId}/consultations/${consultationData.id}` : `/patients/${patientId}/consultations`;
    router[consultationData ? 'put' : 'post'](url, payload, { onSuccess: () => { onSuccess(); onClose(); }, onFinish: () => setIsSubmitting(false) });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto m-10">
      <div className="flex ">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative  w-full max-w-7xl my-8 mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Main Content */}
          <div className="flex-1  p-6">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
               <div className="p-2 flex gap-2 "> <StethoscopeIcon  size={30}className="font-medium text-blue-600" /> <h2 className="text-2xl font-bold"> Clinical Consultation</h2></div>
             
              <button onClick={onClose}><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto">
              {/* <AccordionSection title="Patient Context" required completed={completion['patient-context']} isOpen={activeSections.includes('patient-context')} onToggle={() => setActiveSections(prev => prev.includes('patient-context') ? prev.filter(s => s !== 'patient-context') : [...prev, 'patient-context'])}>
                <PatientContextSection data={formData.patientContext} onChange={(d) => setFormData({...formData, patientContext: d})} patientId={patientId} appointmentId={appointmentId} />
              </AccordionSection> */}
              <AccordionSection title="Chief Complaints" required completed={completion['chief-complaints']} isOpen={activeSections.includes('chief-complaints')} onToggle={() => setActiveSections(prev => prev.includes('chief-complaints') ? prev.filter(s => s !== 'chief-complaints') : [...prev, 'chief-complaints'])}>
                <ChiefComplaintsSection data={formData.chiefComplaints} onChange={(d) => setFormData({...formData, chiefComplaints: d})} />
              </AccordionSection>
              <AccordionSection title="History of Present Illness" isOpen={activeSections.includes('hpi')} onToggle={() => setActiveSections(prev => prev.includes('hpi') ? prev.filter(s => s !== 'hpi') : [...prev, 'hpi'])}>
                <HPISection data={formData.hpi} onChange={(d) => setFormData({...formData, hpi: d})} />
              </AccordionSection>
              <AccordionSection title="Review of Systems" badge="Nested" isOpen={activeSections.includes('ros')} onToggle={() => setActiveSections(prev => prev.includes('ros') ? prev.filter(s => s !== 'ros') : [...prev, 'ros'])}>
                <ROSSection data={formData.ros} onChange={(d) => setFormData({...formData, ros: d})} />
              </AccordionSection>
              {/* <AccordionSection title="Past Medical History" isOpen={activeSections.includes('pmh')} onToggle={() => setActiveSections(prev => prev.includes('pmh') ? prev.filter(s => s !== 'pmh') : [...prev, 'pmh'])}>
                <PMHSection data={formData.pastMedicalHistory} onChange={(d) => setFormData({...formData, pastMedicalHistory: d})} />
              </AccordionSection> */}
              {/* <AccordionSection title="Vital Signs" required completed={completion['vital-signs']} isOpen={activeSections.includes('vitals')} onToggle={() => setActiveSections(prev => prev.includes('vitals') ? prev.filter(s => s !== 'vitals') : [...prev, 'vitals'])}>
                <VitalSignsSection data={formData.vitals} onChange={(d) => setFormData({...formData, vitals: d})} />
              </AccordionSection> */}
              <AccordionSection title="Physical Examination" isOpen={activeSections.includes('exam')} onToggle={() => setActiveSections(prev => prev.includes('exam') ? prev.filter(s => s !== 'exam') : [...prev, 'exam'])}>
                <PhysicalExamSection data={formData.examination} onChange={(d) => setFormData({...formData, examination: d})} />
              </AccordionSection>
              <AccordionSection title="Diagnosis" required completed={completion['diagnosis']} isOpen={activeSections.includes('diagnosis')} onToggle={() => setActiveSections(prev => prev.includes('diagnosis') ? prev.filter(s => s !== 'diagnosis') : [...prev, 'diagnosis'])}>
                <DiagnosisSection data={formData.diagnosis} onChange={(d) => setFormData({...formData, diagnosis: d})} />
              </AccordionSection>
              <AccordionSection title="Orders (Billable)" badge="Billing" highlight isOpen={activeSections.includes('orders')} onToggle={() => setActiveSections(prev => prev.includes('orders') ? prev.filter(s => s !== 'orders') : [...prev, 'orders'])}>
                <OrdersSection data={formData.orders} onChange={(d) => setFormData({...formData, orders: d})} onAddToBilling={addToBilling} onRemoveFromBilling={removeFromBilling} />
              </AccordionSection>
           <AccordionSection title="Prescriptions" badge="Billing" isOpen={activeSections.includes('prescriptions')} onToggle={() => setActiveSections(prev => prev.includes('prescriptions') ? prev.filter(s => s !== 'prescriptions') : [...prev, 'prescriptions'])}>
  <PrescriptionsSection 
    data={formData.prescriptions} 
    onChange={(d) => setFormData({...formData, prescriptions: d})} 
    onAddToBilling={addToBilling} 
    onRemoveFromBilling={removeFromBilling}
    patientId={patientId}  // Add this line
  />
</AccordionSection>
          
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t">
              {/* <button onClick={onClose} className="flex-1 border rounded py-2">Cancel</button> */}
              <Button onClick={handleSubmit} disabled={isSubmitting} >{isSubmitting ? 'Saving...' : 'Save Consultation'}</Button>
            </div>
          </div>
          {/* Billing Sidebar */}
          {/* <BillingSidebar items={billingItems} /> */}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN CONSULTATION COMPONENT WITH TRIGGER BUTTON
// ============================================

export default function Consultation({ patientId, appointmentId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [consultations, setConsultations] = useState([]);

  const handleSuccess = () => {
    setIsOpen(false);
    router.reload();
  };

  return (
    <div className="p-4">
      <Button
        onClick={() => setIsOpen(true)}
        className=""
      >
        <Plus className="h-4 w-4" />
         Consultation
      </Button>

      <ConsultationDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
        patientId={patientId}
        appointmentId={appointmentId}
      />
    </div>
  );
}