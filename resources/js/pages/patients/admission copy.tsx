import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { router } from '@inertiajs/react';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft,
  Activity,
  Heart,
  Thermometer,
  Droplets,
  Pill,
  FileText,
  AlertCircle,
  Plus,
  Edit,
  Save,
  Clock,
  User,
  Stethoscope,
  ClipboardList,
  Syringe,
  Calendar,
  LineChart,
  TrendingUp,
  Gauge,
  ActivitySquare,
  HeartPulse,
  Wind,
  Waves,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// Import Recharts components
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  ReferenceLine,
} from 'recharts';

// Mock data for a single admission
const mockAdmissionDetails = {
  id: 'ADM000001',
  patient: {
    id: 'P00001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    bloodGroup: 'O+',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, New York, NY 10001',
  },
  admission: {
    date: '15th Jan, 2025',
    time: '10:30 AM',
    doctor: 'Dr. Sarah Smith',
    ward: 'ICU',
    bedNumber: 'ICU-12',
    admittingDiagnosis: 'Acute Chest Pain, Suspected Myocardial Infarction',
    packageName: 'Premium Cardiac Care',
    insurance: 'Blue Cross',
    policyNo: 'BC456789012',
    emergencyContact: 'Jane Doe (Wife)',
    emergencyPhone: '+1 (555) 987-6543',
    status: 'Active',
    notes: 'Patient has history of hypertension. Allergic to penicillin.',
  },
  nursingCarePlan: [
    {
      id: 1,
      assessmentData: {
        cluster1: 'Patient reports chest pain 8/10, diaphoretic, pale',
        cluster2: 'ECG shows ST elevation, elevated troponin',
      },
      diagnosis: 'Acute Pain related to myocardial ischemia',
      relatedFactors: 'Myocardial ischemia due to coronary artery blockage',
      definingCharacteristics: 'Patient reports chest pain 8/10, facial grimacing, guarding behavior, diaphoresis, elevated blood pressure 150/90',
      overallGoal: 'Patient will experience reduced pain and improved comfort',
      expectedOutcomes: [
        'Patient will report pain level ≤ 3/10 within 24 hours',
        'Patient will demonstrate relaxed facial expression and body posture within 4 hours',
        'Patient will verbalize relief after pain medication within 1 hour',
      ],
      interventions: [
        'Administer prescribed analgesics as ordered',
        'Assess pain level every 2 hours using 0-10 scale',
        'Provide comfort measures: positioning, relaxation techniques',
        'Monitor vital signs before and after pain medication',
      ],
      rationales: [
        'Analgesics block pain pathways and reduce pain perception (Potter & Perry, 2017)',
        'Regular pain assessment allows for timely intervention and evaluation of effectiveness',
        'Comfort measures enhance pain relief and reduce anxiety',
        'Monitoring vital signs helps detect adverse effects and evaluate response',
      ],
      evaluation: {
        status: 'Partially Met',
        notes: 'Pain reduced to 4/10 after medication, still reports discomfort with movement',
        date: '16th Jan, 2025',
      },
      revision: [
        'Increase frequency of pain assessment to hourly',
        'Consult with physician about alternative pain management strategies',
      ],
      status: 'In Progress',
    },
    {
      id: 2,
      assessmentData: {
        cluster1: 'Heart rate 110 bpm, BP 150/90, patient verbalizes anxiety',
        cluster2: 'Restless, asking repeated questions about condition',
      },
      diagnosis: 'Anxiety related to health crisis and hospitalization',
      relatedFactors: 'Uncertainty about diagnosis and treatment outcomes',
      definingCharacteristics: 'Patient verbalizes fear about heart attack, increased heart rate, restlessness, repeated questioning about prognosis',
      overallGoal: 'Patient will demonstrate reduced anxiety and increased coping',
      expectedOutcomes: [
        'Patient will verbalize decreased anxiety within 24 hours',
        'Patient will demonstrate relaxation techniques within 12 hours',
        'Patient will ask questions appropriately and express understanding of information within 24 hours',
      ],
      interventions: [
        'Provide clear, concise information about procedures and treatments',
        'Teach relaxation techniques: deep breathing, guided imagery',
        'Allow patient to express concerns and ask questions',
        'Maintain calm, reassuring presence during interactions',
      ],
      rationales: [
        'Information reduces uncertainty and anxiety related to unknown outcomes',
        'Relaxation techniques activate parasympathetic nervous system reducing stress response',
        'Expression of concerns validates patient feelings and reduces emotional distress',
        'Calm demeanor of nurse promotes patient sense of safety and security',
      ],
      evaluation: {
        status: 'Met',
        notes: 'Patient reports feeling less anxious, heart rate decreased to 88 bpm, able to discuss concerns calmly',
        date: '16th Jan, 2025',
      },
      revision: [],
      status: 'Ongoing',
    },
  ],
  nursingDiagnosis: [
    {
      id: 1,
      diagnosis: 'Ineffective Tissue Perfusion',
      relatedTo: 'Decreased cardiac output',
      asEvidenceBy: 'Chest pain, shortness of breath, ECG changes',
      date: '15th Jan, 2025',
      status: 'Active',
    },
    {
      id: 2,
      diagnosis: 'Anxiety',
      relatedTo: 'Health crisis and hospitalization',
      asEvidenceBy: 'Patient verbalizes fear, restlessness',
      date: '15th Jan, 2025',
      status: 'Active',
    },
  ],
  medications: [
    {
      id: 1,
      name: 'Aspirin',
      dosage: '325mg',
      route: 'Oral',
      frequency: 'Once daily',
      lastAdministered: '15th Jan, 2025 - 08:00 AM',
      nextDue: '16th Jan, 2025 - 08:00 AM',
      prescribedBy: 'Dr. Sarah Smith',
      status: 'Active',
      administrationHistory: [
        { time: '15th Jan, 2025 - 08:00 AM', by: 'Nurse Emily', notes: 'Patient took with water' },
        { time: '14th Jan, 2025 - 08:00 AM', by: 'Nurse John', notes: 'Taken' },
      ],
    },
    {
      id: 2,
      name: 'Nitroglycerin',
      dosage: '0.4mg',
      route: 'Sublingual',
      frequency: 'As needed for chest pain',
      lastAdministered: '15th Jan, 2025 - 02:30 PM',
      nextDue: 'As needed',
      prescribedBy: 'Dr. Sarah Smith',
      status: 'Active',
      administrationHistory: [
        { time: '15th Jan, 2025 - 02:30 PM', by: 'Nurse Emily', notes: 'Pain reduced from 8 to 4' },
      ],
    },
    {
      id: 3,
      name: 'Metoprolol',
      dosage: '50mg',
      route: 'Oral',
      frequency: 'Twice daily',
      lastAdministered: '15th Jan, 2025 - 09:00 AM',
      nextDue: '15th Jan, 2025 - 09:00 PM',
      prescribedBy: 'Dr. Sarah Smith',
      status: 'Active',
      administrationHistory: [
        { time: '15th Jan, 2025 - 09:00 AM', by: 'Nurse Emily', notes: '' },
        { time: '14th Jan, 2025 - 09:00 PM', by: 'Nurse John', notes: '' },
      ],
    },
  ],
  vitalSigns: [
    {
      id: 1,
      time: '08:00 AM',
      temperature: '98.6°F',
      bloodPressure: '120/80',
      heartRate: '72',
      respiratoryRate: '16',
      oxygenSaturation: '98%',
      painLevel: '2',
      notes: 'Resting comfortably',
    },
    {
      id: 2,
      time: '12:00 PM',
      temperature: '98.8°F',
      bloodPressure: '118/78',
      heartRate: '70',
      respiratoryRate: '16',
      oxygenSaturation: '99%',
      painLevel: '1',
      notes: 'No complaints',
    },
    {
      id: 3,
      time: '04:00 PM',
      temperature: '98.7°F',
      bloodPressure: '122/82',
      heartRate: '74',
      respiratoryRate: '18',
      oxygenSaturation: '98%',
      painLevel: '0',
      notes: 'Stable',
    },
  ],
  tprRecords: [
    {
      id: 1,
      time: '08:00',
      displayTime: '08:00 AM',
      temperature: 98.6,
      pulse: 72,
      respiration: 16,
      systolic: 120,
      diastolic: 80,
      bp: '120/80',
      spo2: 98,
    },
    {
      id: 2,
      time: '12:00',
      displayTime: '12:00 PM',
      temperature: 98.8,
      pulse: 70,
      respiration: 16,
      systolic: 118,
      diastolic: 78,
      bp: '118/78',
      spo2: 99,
    },
    {
      id: 3,
      time: '16:00',
      displayTime: '04:00 PM',
      temperature: 98.7,
      pulse: 74,
      respiration: 18,
      systolic: 122,
      diastolic: 82,
      bp: '122/82',
      spo2: 98,
    },
    {
      id: 4,
      time: '20:00',
      displayTime: '08:00 PM',
      temperature: 98.9,
      pulse: 76,
      respiration: 18,
      systolic: 124,
      diastolic: 84,
      bp: '124/84',
      spo2: 97,
    },
    {
      id: 5,
      time: '00:00',
      displayTime: '12:00 AM',
      temperature: 98.5,
      pulse: 68,
      respiration: 14,
      systolic: 116,
      diastolic: 76,
      bp: '116/76',
      spo2: 98,
    },
  ],
  drugAdministration: [
    {
      id: 1,
      medication: 'Aspirin 325mg',
      scheduledTime: '08:00 AM',
      administeredTime: '08:05 AM',
      administeredBy: 'Nurse Emily',
      status: 'Given',
      notes: 'Patient took with water',
    },
    {
      id: 2,
      medication: 'Metoprolol 50mg',
      scheduledTime: '09:00 AM',
      administeredTime: '09:10 AM',
      administeredBy: 'Nurse Emily',
      status: 'Given',
      notes: '',
    },
    {
      id: 3,
      medication: 'Metoprolol 50mg',
      scheduledTime: '09:00 PM',
      administeredTime: '',
      administeredBy: '',
      status: 'Pending',
      notes: '',
    },
  ],
};

export default function ViewAdmissionPage() {
  const params = useParams();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddVital, setShowAddVital] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddDiagnosis, setShowAddDiagnosis] = useState(false);
  const [showAddCarePlan, setShowAddCarePlan] = useState(false);
  const [showAdministerMedication, setShowAdministerMedication] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [chartType, setChartType] = useState('line');
  const [tprAccordionValue, setTprAccordionValue] = useState('temperature');

  const [newVital, setNewVital] = useState({
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    painLevel: '',
    notes: '',
  });

  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    route: '',
    frequency: '',
    prescribedBy: '',
  });

  const [administerMedication, setAdministerMedication] = useState({
    medicationId: '',
    administeredTime: new Date().toLocaleTimeString(),
    administeredBy: 'Current Nurse',
    notes: '',
  });

  // New Nursing Diagnosis state following the template
  const [newNursingDiagnosis, setNewNursingDiagnosis] = useState({
    assessmentDataCluster1: '',
    assessmentDataCluster2: '',
    diagnosis: '',
    relatedFactors: '',
    definingCharacteristics: '',
    overallGoal: '',
    expectedOutcomes: ['', '', ''],
    interventions: ['', '', ''],
    rationales: ['', '', ''],
    evaluationStatus: 'Met',
    evaluationNotes: '',
    revision1: '',
    revision2: '',
  });

  // New Care Plan state following the template
  const [newCarePlan, setNewCarePlan] = useState({
    assessmentDataCluster1: '',
    assessmentDataCluster2: '',
    diagnosis: '',
    relatedFactors: '',
    definingCharacteristics: '',
    overallGoal: '',
    expectedOutcome1: '',
    expectedOutcome2: '',
    expectedOutcome3: '',
    intervention1: '',
    intervention2: '',
    intervention3: '',
    rationale1: '',
    rationale2: '',
    rationale3: '',
    evaluationStatus: 'Met',
    evaluationNotes: '',
    revision1: '',
    revision2: '',
  });

  const handleAddVital = () => {
    console.log('Adding vital signs:', newVital);
    setShowAddVital(false);
  };

  const handleAddMedication = () => {
    console.log('Adding medication:', newMedication);
    setShowAddMedication(false);
  };

  const handleAddNursingDiagnosis = () => {
    console.log('Adding nursing diagnosis:', newNursingDiagnosis);
    setShowAddDiagnosis(false);
    // Reset form
    setNewNursingDiagnosis({
      assessmentDataCluster1: '',
      assessmentDataCluster2: '',
      diagnosis: '',
      relatedFactors: '',
      definingCharacteristics: '',
      overallGoal: '',
      expectedOutcomes: ['', '', ''],
      interventions: ['', '', ''],
      rationales: ['', '', ''],
      evaluationStatus: 'Met',
      evaluationNotes: '',
      revision1: '',
      revision2: '',
    });
  };

  const handleAddCarePlan = () => {
    console.log('Adding care plan:', newCarePlan);
    setShowAddCarePlan(false);
    // Reset form
    setNewCarePlan({
      assessmentDataCluster1: '',
      assessmentDataCluster2: '',
      diagnosis: '',
      relatedFactors: '',
      definingCharacteristics: '',
      overallGoal: '',
      expectedOutcome1: '',
      expectedOutcome2: '',
      expectedOutcome3: '',
      intervention1: '',
      intervention2: '',
      intervention3: '',
      rationale1: '',
      rationale2: '',
      rationale3: '',
      evaluationStatus: 'Met',
      evaluationNotes: '',
      revision1: '',
      revision2: '',
    });
  };

  const handleAdministerMedicationSubmit = () => {
    console.log('Administering medication:', administerMedication);
    setShowAdministerMedication(false);
    setSelectedMedication(null);
    // Reset form
    setAdministerMedication({
      medicationId: '',
      administeredTime: new Date().toLocaleTimeString(),
      administeredBy: 'Current Nurse',
      notes: '',
    });
  };

  const openAdministerModal = (medication: any) => {
    setSelectedMedication(medication);
    setAdministerMedication({
      ...administerMedication,
      medicationId: medication.id,
    });
    setShowAdministerMedication(true);
  };

  const handleGoBack = () => {
    router.visit('/patients/admissions');
  };

  // Prepare data for charts
  const chartData = mockAdmissionDetails.tprRecords.map(record => ({
    time: record.displayTime,
    timeValue: record.time,
    temperature: record.temperature,
    pulse: record.pulse,
    respiration: record.respiration,
    systolic: record.systolic,
    diastolic: record.diastolic,
    spo2: record.spo2,
  }));

  // Calculate statistics
  const averageTemp = (chartData.reduce((sum, item) => sum + item.temperature, 0) / chartData.length).toFixed(1);
  const averagePulse = Math.round(chartData.reduce((sum, item) => sum + item.pulse, 0) / chartData.length);
  const averageRespiration = Math.round(chartData.reduce((sum, item) => sum + item.respiration, 0) / chartData.length);
  const averageSpo2 = Math.round(chartData.reduce((sum, item) => sum + item.spo2, 0) / chartData.length);

  // Custom tooltip component with shadcn styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              if (entry.value === undefined) return null;
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}:</span>
                  <span className="font-medium text-foreground">
                    {entry.value}
                    {entry.name === 'Temperature' && '°F'}
                    {entry.name === 'Pulse' && ' bpm'}
                    {entry.name === 'Respiration' && ' /min'}
                    {entry.name === 'SpO2' && '%'}
                    {(entry.name === 'Systolic' || entry.name === 'Diastolic') && ' mmHg'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <PatientLayout
      breadcrumbs={[
        { title: 'Patients', href: '/patients' },
        { title: 'Admissions', href: '/patients/admissions' },
        { title: `Admission ${params.admissionId}`, href: '#' },
      ]}
    >
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mb-2"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Admissions
          </Button>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-3 py-1">
              {mockAdmissionDetails.admission.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              <AlertCircle className="h-4 w-4 mr-2" />
              Emergency
            </Button>
          </div>
        </div>

        {/* Patient Info Card */}
       

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-6 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="diagnosis">Nursing Diagnosis</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
            <TabsTrigger value="tpr">TPR Chart</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admission Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Admitting Diagnosis</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {mockAdmissionDetails.admission.admittingDiagnosis}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Package</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {mockAdmissionDetails.admission.packageName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Insurance</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {mockAdmissionDetails.admission.insurance} {mockAdmissionDetails.admission.policyNo && `(Policy: ${mockAdmissionDetails.admission.policyNo})`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {mockAdmissionDetails.admission.notes || 'No additional notes'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Care Plan Tab */}
          <TabsContent value="careplan" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Nursing Care Plan</CardTitle>
                <Dialog open={showAddCarePlan} onOpenChange={setShowAddCarePlan}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Care Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Nursing Care Plan (Based on ANA Scope and Standards of Practice, 2015 and NANDA-I, 2018-2020)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Assessment Data */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Clinically Relevant Assessment Data</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cluster of Assessment Data for Nursing Diagnosis #1</Label>
                            <Textarea 
                              value={newCarePlan.assessmentDataCluster1}
                              onChange={(e) => setNewCarePlan({...newCarePlan, assessmentDataCluster1: e.target.value})}
                              placeholder="Enter assessment data cluster 1"
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cluster of Assessment Data for Nursing Diagnosis #2</Label>
                            <Textarea 
                              value={newCarePlan.assessmentDataCluster2}
                              onChange={(e) => setNewCarePlan({...newCarePlan, assessmentDataCluster2: e.target.value})}
                              placeholder="Enter assessment data cluster 2"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Nursing Diagnosis */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nursing Diagnosis (Problem)</Label>
                          <Input 
                            value={newCarePlan.diagnosis}
                            onChange={(e) => setNewCarePlan({...newCarePlan, diagnosis: e.target.value})}
                            placeholder="e.g., Acute Pain related to myocardial ischemia"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Related Factors (Etiology)</Label>
                          <Input 
                            value={newCarePlan.relatedFactors}
                            onChange={(e) => setNewCarePlan({...newCarePlan, relatedFactors: e.target.value})}
                            placeholder="What is the cause of this problem?"
                          />
                        </div>
                      </div>

                      {/* Defining Characteristics */}
                      <div className="space-y-2">
                        <Label>Defining Characteristics (Signs and Symptoms)</Label>
                        <Textarea 
                          value={newCarePlan.definingCharacteristics}
                          onChange={(e) => setNewCarePlan({...newCarePlan, definingCharacteristics: e.target.value})}
                          placeholder="What are the patient's signs and symptoms of this problem?"
                          rows={3}
                        />
                      </div>

                      {/* Goals and Outcomes */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Overall Goal</Label>
                          <Textarea 
                            value={newCarePlan.overallGoal}
                            onChange={(e) => setNewCarePlan({...newCarePlan, overallGoal: e.target.value})}
                            placeholder="What do you want to accomplish? (broad goal)"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expected Outcomes (SMART)</Label>
                          <div className="space-y-2">
                            <Input 
                              value={newCarePlan.expectedOutcome1}
                              onChange={(e) => setNewCarePlan({...newCarePlan, expectedOutcome1: e.target.value})}
                              placeholder="The patient will... (outcome 1)"
                            />
                            <Input 
                              value={newCarePlan.expectedOutcome2}
                              onChange={(e) => setNewCarePlan({...newCarePlan, expectedOutcome2: e.target.value})}
                              placeholder="The patient will... (outcome 2)"
                            />
                            <Input 
                              value={newCarePlan.expectedOutcome3}
                              onChange={(e) => setNewCarePlan({...newCarePlan, expectedOutcome3: e.target.value})}
                              placeholder="The patient will... (outcome 3)"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Interventions and Rationales */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nursing Interventions</Label>
                          <div className="space-y-2">
                            <Input 
                              value={newCarePlan.intervention1}
                              onChange={(e) => setNewCarePlan({...newCarePlan, intervention1: e.target.value})}
                              placeholder="The nurse will... (intervention 1)"
                            />
                            <Input 
                              value={newCarePlan.intervention2}
                              onChange={(e) => setNewCarePlan({...newCarePlan, intervention2: e.target.value})}
                              placeholder="The nurse will... (intervention 2)"
                            />
                            <Input 
                              value={newCarePlan.intervention3}
                              onChange={(e) => setNewCarePlan({...newCarePlan, intervention3: e.target.value})}
                              placeholder="The nurse will... (intervention 3)"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Rationale (Evidence-based)</Label>
                          <div className="space-y-2">
                            <Input 
                              value={newCarePlan.rationale1}
                              onChange={(e) => setNewCarePlan({...newCarePlan, rationale1: e.target.value})}
                              placeholder="Rationale for intervention 1"
                            />
                            <Input 
                              value={newCarePlan.rationale2}
                              onChange={(e) => setNewCarePlan({...newCarePlan, rationale2: e.target.value})}
                              placeholder="Rationale for intervention 2"
                            />
                            <Input 
                              value={newCarePlan.rationale3}
                              onChange={(e) => setNewCarePlan({...newCarePlan, rationale3: e.target.value})}
                              placeholder="Rationale for intervention 3"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Evaluation */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Evaluation</h3>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <RadioGroup 
                            value={newCarePlan.evaluationStatus}
                            onValueChange={(value) => setNewCarePlan({...newCarePlan, evaluationStatus: value})}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Met" id="met" />
                              <Label htmlFor="met">Met</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Partially Met" id="partially-met" />
                              <Label htmlFor="partially-met">Partially Met</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Not Met" id="not-met" />
                              <Label htmlFor="not-met">Not Met</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label>Evaluation Notes (Re-assessment data)</Label>
                          <Textarea 
                            value={newCarePlan.evaluationNotes}
                            onChange={(e) => setNewCarePlan({...newCarePlan, evaluationNotes: e.target.value})}
                            placeholder="State re-assessment data to support your analysis"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Revision */}
                      <div className="space-y-2">
                        <Label>Revision (If goal was Partially Met or Not Met)</Label>
                        <div className="space-y-2">
                          <Input 
                            value={newCarePlan.revision1}
                            onChange={(e) => setNewCarePlan({...newCarePlan, revision1: e.target.value})}
                            placeholder="New intervention 1 based on analysis"
                          />
                          <Input 
                            value={newCarePlan.revision2}
                            onChange={(e) => setNewCarePlan({...newCarePlan, revision2: e.target.value})}
                            placeholder="New intervention 2 based on analysis"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCarePlan(false)}>
                        Cancel
                      </Button>Button>
                      <Button onClick={handleAddCarePlan}>Add Care Plan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockAdmissionDetails.nursingCarePlan.map((plan) => (
                    <Card key={plan.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {plan.diagnosis}
                            </h3>
                            <Badge className={
                              plan.status === 'In Progress' 
                                ? 'mt-2 bg-yellow-100 text-yellow-800'
                                : 'mt-2 bg-green-100 text-green-800'
                            }>
                              {plan.status}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Assessment Data */}
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">Assessment Data</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <p className="text-sm">{plan.assessmentData.cluster1}</p>
                              <p className="text-sm">{plan.assessmentData.cluster2}</p>
                            </div>
                          </div>

                          {/* Diagnosis and Related Factors */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">Related Factors</h4>
                              <p className="text-sm mt-1">{plan.relatedFactors}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">Defining Characteristics</h4>
                              <p className="text-sm mt-1">{plan.definingCharacteristics}</p>
                            </div>
                          </div>

                          {/* Goals */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Overall Goal</h4>
                            <p className="text-sm mt-1">{plan.overallGoal}</p>
                          </div>

                          {/* Expected Outcomes */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Expected Outcomes (SMART)</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {plan.expectedOutcomes.map((outcome, index) => (
                                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                  {outcome}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Interventions and Rationales */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Nursing Interventions</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {plan.interventions.map((intervention, index) => (
                                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                    {intervention}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Rationale</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {plan.rationales.map((rationale, index) => (
                                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                    {rationale}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Evaluation */}
                          <div className="bg-muted/30 p-4 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">Evaluation</h4>
                            <div className="flex items-center gap-4 mb-2">
                              <Badge className={
                                plan.evaluation.status === 'Met' 
                                  ? 'bg-green-100 text-green-800'
                                  : plan.evaluation.status === 'Partially Met'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }>
                                {plan.evaluation.status}
                              </Badge>
                              <span className="text-sm text-gray-500">{plan.evaluation.date}</span>
                            </div>
                            <p className="text-sm">{plan.evaluation.notes}</p>
                          </div>

                          {/* Revision */}
                          {plan.revision.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Revision</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {plan.revision.map((rev, index) => (
                                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                    {rev}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nursing Diagnosis Tab */}
          <TabsContent value="diagnosis" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Nursing Diagnosis</CardTitle>
                <Dialog open={showAddDiagnosis} onOpenChange={setShowAddDiagnosis}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Diagnosis
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Nursing Diagnosis (Based on ANA Scope and Standards of Practice, 2015 and NANDA-I, 2018-2020)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Assessment Data */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Clinically Relevant Assessment Data</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cluster of Assessment Data for Nursing Diagnosis #1</Label>
                            <Textarea 
                              value={newNursingDiagnosis.assessmentDataCluster1}
                              onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, assessmentDataCluster1: e.target.value})}
                              placeholder="Enter assessment data cluster 1"
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cluster of Assessment Data for Nursing Diagnosis #2</Label>
                            <Textarea 
                              value={newNursingDiagnosis.assessmentDataCluster2}
                              onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, assessmentDataCluster2: e.target.value})}
                              placeholder="Enter assessment data cluster 2"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Nursing Diagnosis */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nursing Diagnosis (Problem)</Label>
                          <Input 
                            value={newNursingDiagnosis.diagnosis}
                            onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, diagnosis: e.target.value})}
                            placeholder="e.g., Acute Pain related to myocardial ischemia"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Related Factors (Etiology)</Label>
                          <Input 
                            value={newNursingDiagnosis.relatedFactors}
                            onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, relatedFactors: e.target.value})}
                            placeholder="What is the cause of this problem?"
                          />
                        </div>
                      </div>

                      {/* Defining Characteristics */}
                      <div className="space-y-2">
                        <Label>Defining Characteristics (Signs and Symptoms)</Label>
                        <Textarea 
                          value={newNursingDiagnosis.definingCharacteristics}
                          onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, definingCharacteristics: e.target.value})}
                          placeholder="What are the patient's signs and symptoms of this problem?"
                          rows={3}
                        />
                      </div>

                      {/* Goals and Outcomes */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Overall Goal</Label>
                          <Textarea 
                            value={newNursingDiagnosis.overallGoal}
                            onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, overallGoal: e.target.value})}
                            placeholder="What do you want to accomplish? (broad goal)"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expected Outcomes (SMART)</Label>
                          <div className="space-y-2">
                            <Input 
                              value={newNursingDiagnosis.expectedOutcomes[0]}
                              onChange={(e) => {
                                const newOutcomes = [...newNursingDiagnosis.expectedOutcomes];
                                newOutcomes[0] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, expectedOutcomes: newOutcomes});
                              }}
                              placeholder="The patient will... (outcome 1)"
                            />
                            <Input 
                              value={newNursingDiagnosis.expectedOutcomes[1]}
                              onChange={(e) => {
                                const newOutcomes = [...newNursingDiagnosis.expectedOutcomes];
                                newOutcomes[1] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, expectedOutcomes: newOutcomes});
                              }}
                              placeholder="The patient will... (outcome 2)"
                            />
                            <Input 
                              value={newNursingDiagnosis.expectedOutcomes[2]}
                              onChange={(e) => {
                                const newOutcomes = [...newNursingDiagnosis.expectedOutcomes];
                                newOutcomes[2] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, expectedOutcomes: newOutcomes});
                              }}
                              placeholder="The patient will... (outcome 3)"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Interventions and Rationales */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nursing Interventions</Label>
                          <div className="space-y-2">
                            <Input 
                              value={newNursingDiagnosis.interventions[0]}
                              onChange={(e) => {
                                const newInterventions = [...newNursingDiagnosis.interventions];
                                newInterventions[0] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, interventions: newInterventions});
                              }}
                              placeholder="The nurse will... (intervention 1)"
                            />
                            <Input 
                              value={newNursingDiagnosis.interventions[1]}
                              onChange={(e) => {
                                const newInterventions = [...newNursingDiagnosis.interventions];
                                newInterventions[1] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, interventions: newInterventions});
                              }}
                              placeholder="The nurse will... (intervention 2)"
                            />
                            <Input 
                              value={newNursingDiagnosis.interventions[2]}
                              onChange={(e) => {
                                const newInterventions = [...newNursingDiagnosis.interventions];
                                newInterventions[2] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, interventions: newInterventions});
                              }}
                              placeholder="The nurse will... (intervention 3)"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Rationale (Evidence-based)</Label>
                          <div className="space-y-2">
                            <Input 
                              value={newNursingDiagnosis.rationales[0]}
                              onChange={(e) => {
                                const newRationales = [...newNursingDiagnosis.rationales];
                                newRationales[0] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, rationales: newRationales});
                              }}
                              placeholder="Rationale for intervention 1"
                            />
                            <Input 
                              value={newNursingDiagnosis.rationales[1]}
                              onChange={(e) => {
                                const newRationales = [...newNursingDiagnosis.rationales];
                                newRationales[1] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, rationales: newRationales});
                              }}
                              placeholder="Rationale for intervention 2"
                            />
                            <Input 
                              value={newNursingDiagnosis.rationales[2]}
                              onChange={(e) => {
                                const newRationales = [...newNursingDiagnosis.rationales];
                                newRationales[2] = e.target.value;
                                setNewNursingDiagnosis({...newNursingDiagnosis, rationales: newRationales});
                              }}
                              placeholder="Rationale for intervention 3"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Evaluation */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Evaluation</h3>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <RadioGroup 
                            value={newNursingDiagnosis.evaluationStatus}
                            onValueChange={(value) => setNewNursingDiagnosis({...newNursingDiagnosis, evaluationStatus: value})}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Met" id="diag-met" />
                              <Label htmlFor="diag-met">Met</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Partially Met" id="diag-partially-met" />
                              <Label htmlFor="diag-partially-met">Partially Met</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Not Met" id="diag-not-met" />
                              <Label htmlFor="diag-not-met">Not Met</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label>Evaluation Notes (Re-assessment data)</Label>
                          <Textarea 
                            value={newNursingDiagnosis.evaluationNotes}
                            onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, evaluationNotes: e.target.value})}
                            placeholder="State re-assessment data to support your analysis"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Revision */}
                      <div className="space-y-2">
                        <Label>Revision (If goal was Partially Met or Not Met)</Label>
                        <div className="space-y-2">
                          <Input 
                            value={newNursingDiagnosis.revision1}
                            onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, revision1: e.target.value})}
                            placeholder="New intervention 1 based on analysis"
                          />
                          <Input 
                            value={newNursingDiagnosis.revision2}
                            onChange={(e) => setNewNursingDiagnosis({...newNursingDiagnosis, revision2: e.target.value})}
                            placeholder="New intervention 2 based on analysis"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddDiagnosis(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddNursingDiagnosis}>Add Diagnosis</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Related To</TableHead>
                        <TableHead>As Evidence By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAdmissionDetails.nursingDiagnosis.map((diagnosis) => (
                        <TableRow key={diagnosis.id}>
                          <TableCell className="font-medium">{diagnosis.diagnosis}</TableCell>
                          <TableCell>{diagnosis.relatedTo}</TableCell>
                          <TableCell>{diagnosis.asEvidenceBy}</TableCell>
                          <TableCell>{diagnosis.date}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              {diagnosis.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4">
            {/* Today's Drug Administration - Placed above */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Drug Administration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medication</TableHead>
                        <TableHead>Scheduled Time</TableHead>
                        <TableHead>Administered Time</TableHead>
                        <TableHead>Administered By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAdmissionDetails.drugAdministration.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.medication}</TableCell>
                          <TableCell>{record.scheduledTime}</TableCell>
                          <TableCell>{record.administeredTime || '—'}</TableCell>
                          <TableCell>{record.administeredBy || '—'}</TableCell>
                          <TableCell>
                            <Badge className={
                              record.status === 'Given' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Medication Administration Record</CardTitle>
                <Dialog open={showAddMedication} onOpenChange={setShowAddMedication}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Prescribe Medication
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Medication</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Medication Name</Label>
                        <Input 
                          value={newMedication.name}
                          onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Dosage</Label>
                          <Input 
                            value={newMedication.dosage}
                            onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Route</Label>
                          <Select onValueChange={(value) => setNewMedication({...newMedication, route: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Oral">Oral</SelectItem>
                              <SelectItem value="IV">IV</SelectItem>
                              <SelectItem value="IM">IM</SelectItem>
                              <SelectItem value="Sublingual">Sublingual</SelectItem>
                              <SelectItem value="Topical">Topical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Input 
                          value={newMedication.frequency}
                          onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                          placeholder="e.g., Twice daily, Once daily, As needed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prescribed By</Label>
                        <Input 
                          value={newMedication.prescribedBy}
                          onChange={(e) => setNewMedication({...newMedication, prescribedBy: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddMedication(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMedication}>Add Medication</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medication</TableHead>
                        <TableHead>Dosage/Route</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Last Administered</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAdmissionDetails.medications.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell>{med.dosage} • {med.route}</TableCell>
                          <TableCell>{med.frequency}</TableCell>
                          <TableCell>{med.lastAdministered}</TableCell>
                          <TableCell>{med.nextDue}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              {med.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAdministerModal(med)}
                              disabled={med.status !== 'Active'}
                            >
                              <Syringe className="h-4 w-4 mr-2" />
                              Administer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Administer Medication Modal */}
            <Dialog open={showAdministerMedication} onOpenChange={setShowAdministerMedication}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Administer Medication</DialogTitle>
                  <DialogDescription>
                    Record medication administration for {selectedMedication?.name} {selectedMedication?.dosage}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Medication</Label>
                    <Input 
                      value={selectedMedication ? `${selectedMedication.name} ${selectedMedication.dosage} - ${selectedMedication.route}` : ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Administered Time</Label>
                      <Input 
                        value={administerMedication.administeredTime}
                        onChange={(e) => setAdministerMedication({...administerMedication, administeredTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Administered By</Label>
                      <Input 
                        value={administerMedication.administeredBy}
                        onChange={(e) => setAdministerMedication({...administerMedication, administeredBy: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={administerMedication.notes}
                      onChange={(e) => setAdministerMedication({...administerMedication, notes: e.target.value})}
                      placeholder="Any observations or notes about administration"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Administration History</Label>
                    <div className="bg-muted/30 p-3 rounded-md">
                      {selectedMedication?.administrationHistory?.map((history: any, index: number) => (
                        <div key={index} className="text-sm flex items-start gap-2 py-1 border-b last:border-0">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="font-medium">{history.time}</span>
                            <span className="text-muted-foreground"> by {history.by}</span>
                            {history.notes && <p className="text-xs text-muted-foreground">{history.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAdministerMedication(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdministerMedicationSubmit}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Administration
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Vital Signs Tab */}
          <TabsContent value="vitals" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Vital Signs Monitoring</CardTitle>
                <Dialog open={showAddVital} onOpenChange={setShowAddVital}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Record Vital Signs
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Vital Signs</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Temperature (°F)</Label>
                          <Input 
                            value={newVital.temperature}
                            onChange={(e) => setNewVital({...newVital, temperature: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Blood Pressure</Label>
                          <Input 
                            value={newVital.bloodPressure}
                            onChange={(e) => setNewVital({...newVital, bloodPressure: e.target.value})}
                            placeholder="120/80"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Heart Rate</Label>
                          <Input 
                            value={newVital.heartRate}
                            onChange={(e) => setNewVital({...newVital, heartRate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Respiratory Rate</Label>
                          <Input 
                            value={newVital.respiratoryRate}
                            onChange={(e) => setNewVital({...newVital, respiratoryRate: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>O2 Saturation (%)</Label>
                          <Input 
                            value={newVital.oxygenSaturation}
                            onChange={(e) => setNewVital({...newVital, oxygenSaturation: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pain Level (0-10)</Label>
                          <Input 
                            value={newVital.painLevel}
                            onChange={(e) => setNewVital({...newVital, painLevel: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea 
                          value={newVital.notes}
                          onChange={(e) => setNewVital({...newVital, notes: e.target.value})}
                          placeholder="Any observations..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddVital(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddVital}>Save Record</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                          <span className="text-sm text-muted-foreground">Temperature</span>
                        </div>
                        <span className="text-lg font-semibold">98.6°F</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Heart className="h-5 w-5 text-red-500 mr-2" />
                          <span className="text-sm text-muted-foreground">Heart Rate</span>
                        </div>
                        <span className="text-lg font-semibold">72 bpm</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Activity className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="text-sm text-muted-foreground">Blood Pressure</span>
                        </div>
                        <span className="text-lg font-semibold">120/80</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>BP</TableHead>
                        <TableHead>Heart Rate</TableHead>
                        <TableHead>Resp Rate</TableHead>
                        <TableHead>SpO2</TableHead>
                        <TableHead>Pain</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAdmissionDetails.vitalSigns.map((vital) => (
                        <TableRow key={vital.id}>
                          <TableCell>{vital.time}</TableCell>
                          <TableCell>{vital.temperature}</TableCell>
                          <TableCell>{vital.bloodPressure}</TableCell>
                          <TableCell>{vital.heartRate}</TableCell>
                          <TableCell>{vital.respiratoryRate}</TableCell>
                          <TableCell>{vital.oxygenSaturation}</TableCell>
                          <TableCell>{vital.painLevel}</TableCell>
                          <TableCell>{vital.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TPR Chart Tab - with Accordions */}
          <TabsContent value="tpr" className="space-y-4">
            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm text-muted-foreground">Avg Temperature</span>
                    </div>
                    <span className="text-lg font-semibold">{averageTemp}°F</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <HeartPulse className="h-5 w-5 text-pink-500 mr-2" />
                      <span className="text-sm text-muted-foreground">Avg Pulse</span>
                    </div>
                    <span className="text-lg font-semibold">{averagePulse} bpm</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Wind className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-sm text-muted-foreground">Avg Respiration</span>
                    </div>
                    <span className="text-lg font-semibold">{averageRespiration} /min</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Waves className="h-5 w-5 text-cyan-500 mr-2" />
                      <span className="text-sm text-muted-foreground">Avg SpO2</span>
                    </div>
                    <span className="text-lg font-semibold">{averageSpo2}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Temperature, Pulse, Respiration (TPR) Charts</CardTitle>
                  <CardDescription>
                    Visual representation of vital signs over time - click on each section to expand
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={chartType === 'line' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType('line')}
                  >
                    <LineChart className="h-4 w-4 mr-2" />
                    Line
                  </Button>
                  <Button
                    variant={chartType === 'area' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType('area')}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Area
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion 
                  type="single" 
                  collapsible 
                  value={tprAccordionValue} 
                  onValueChange={setTprAccordionValue}
                  className="space-y-4"
                >
                  {/* Temperature Accordion */}
                  <AccordionItem value="temperature" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-5 w-5 text-red-500" />
                        <span className="text-lg font-medium">Temperature Trend</span>
                        <Badge variant="outline" className="ml-2 text-red-500 border-red-200 bg-red-50 dark:bg-red-950/20">
                          Normal: 97.0°F - 99.0°F
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="h-64 w-full py-4">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === 'line' ? (
                            <ReLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                              <YAxis domain={[97, 100]} className="text-xs fill-muted-foreground" />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <ReferenceLine y={97} stroke="#94a3b8" strokeDasharray="3 3" />
                              <ReferenceLine y={99} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Line 
                                type="monotone" 
                                dataKey="temperature" 
                                stroke="#ef4444" 
                                name="Temperature"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#ef4444" }}
                                activeDot={{ r: 6, fill: "#ef4444" }}
                              />
                            </ReLineChart>
                          ) : (
                            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                              <YAxis domain={[97, 100]} className="text-xs fill-muted-foreground" />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <ReferenceLine y={97} stroke="#94a3b8" strokeDasharray="3 3" />
                              <ReferenceLine y={99} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Area 
                                type="monotone" 
                                dataKey="temperature" 
                                stroke="#ef4444" 
                                fill="#ef4444" 
                                fillOpacity={0.2}
                                name="Temperature"
                              />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Pulse Accordion */}
                  <AccordionItem value="pulse" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-pink-500" />
                        <span className="text-lg font-medium">Pulse Rate Trend</span>
                        <Badge variant="outline" className="ml-2 text-pink-500 border-pink-200 bg-pink-50 dark:bg-pink-950/20">
                          Normal: 60 - 100 bpm
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="h-64 w-full py-4">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === 'line' ? (
                            <ReLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                              <YAxis domain={[60, 100]} className="text-xs fill-muted-foreground" />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <ReferenceLine y={60} stroke="#94a3b8" strokeDasharray="3 3" />
                              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Line 
                                type="monotone" 
                                dataKey="pulse" 
                                stroke="#ec4899" 
                                name="Pulse"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#ec4899" }}
                                activeDot={{ r: 6, fill: "#ec4899" }}
                              />
                            </ReLineChart>
                          ) : (
                            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                              <YAxis domain={[60, 100]} className="text-xs fill-muted-foreground" />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <ReferenceLine y={60} stroke="#94a3b8" strokeDasharray="3 3" />
                              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Area 
                                type="monotone" 
                                dataKey="pulse" 
                                stroke="#ec4899" 
                                fill="#ec4899" 
                                fillOpacity={0.2}
                                name="Pulse"
                              />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Respiration Accordion */}
                  <AccordionItem value="respiration" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Wind className="h-5 w-5 text-blue-500" />
                        <span className="text-lg font-medium">Respiration Rate Trend</span>
                        <Badge variant="outline" className="ml-2 text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                          Normal: 12 - 20 /min
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="h-64 w-full py-4">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === 'line' ? (
                            <ReLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                              <YAxis domain={[12, 20]} className="text-xs fill-muted-foreground" />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <ReferenceLine y={12} stroke="#94a3b8" strokeDasharray="3 3" />
                              <ReferenceLine y={20} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Line 
                                type="monotone" 
                                dataKey="respiration" 
                                stroke="#3b82f6" 
                                name="Respiration"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#3b82f6" }}
                                activeDot={{ r: 6, fill: "#3b82f6" }}
                              />
                            </ReLineChart>
                          ) : (
                            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                              <YAxis domain={[12, 20]} className="text-xs fill-muted-foreground" />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <ReferenceLine y={12} stroke="#94a3b8" strokeDasharray="3 3" />
                              <ReferenceLine y={20} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Area 
                                type="monotone" 
                                dataKey="respiration" 
                                stroke="#3b82f6" 
                                fill="#3b82f6" 
                                fillOpacity={0.2}
                                name="Respiration"
                              />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Blood Pressure Accordion */}
                  <AccordionItem value="bp" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ActivitySquare className="h-5 w-5 text-purple-500" />
                        <span className="text-lg font-medium">Blood Pressure Trend</span>
                        <Badge variant="outline" className="ml-2 text-purple-500 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                          Normal: &lt;120/80 mmHg
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="h-64 w-full py-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                            <YAxis domain={[70, 130]} className="text-xs fill-muted-foreground" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <ReferenceLine y={120} stroke="#94a3b8" strokeDasharray="3 3" />
                            <ReferenceLine y={80} stroke="#94a3b8" strokeDasharray="3 3" />
                            <Line 
                              type="monotone" 
                              dataKey="systolic" 
                              stroke="#8b5cf6" 
                              name="Systolic"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#8b5cf6" }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="diastolic" 
                              stroke="#c084fc" 
                              name="Diastolic"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#c084fc" }}
                            />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* SpO2 Accordion */}
                  <AccordionItem value="spo2" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Waves className="h-5 w-5 text-cyan-500" />
                        <span className="text-lg font-medium">Oxygen Saturation (SpO2) Trend</span>
                        <Badge variant="outline" className="ml-2 text-cyan-500 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20">
                          Normal: ≥95%
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="h-64 w-full py-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                            <YAxis domain={[90, 100]} className="text-xs fill-muted-foreground" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <ReferenceLine y={95} stroke="#94a3b8" strokeDasharray="3 3" />
                            <Line 
                              type="monotone" 
                              dataKey="spo2" 
                              stroke="#06b6d4" 
                              name="SpO2"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#06b6d4" }}
                            />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Combined Chart Accordion */}
                  <AccordionItem value="combined" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-muted-foreground" />
                        <span className="text-lg font-medium">Combined Vital Signs</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="h-80 w-full py-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                            <YAxis yAxisId="left" className="text-xs fill-muted-foreground" />
                            <YAxis yAxisId="right" orientation="right" className="text-xs fill-muted-foreground" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ef4444" name="Temperature" />
                            <Line yAxisId="left" type="monotone" dataKey="pulse" stroke="#ec4899" name="Pulse" />
                            <Line yAxisId="right" type="monotone" dataKey="respiration" stroke="#3b82f6" name="Respiration" />
                            <Bar yAxisId="right" dataKey="spo2" fill="#06b6d4" name="SpO2" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Data Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Detailed Records</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Temperature (°F)</TableHead>
                          <TableHead>Pulse (bpm)</TableHead>
                          <TableHead>Respiration (/min)</TableHead>
                          <TableHead>Blood Pressure</TableHead>
                          <TableHead>SpO2 (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockAdmissionDetails.tprRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{record.displayTime}</TableCell>
                            <TableCell>{record.temperature}°F</TableCell>
                            <TableCell>{record.pulse}</TableCell>
                            <TableCell>{record.respiration}</TableCell>
                            <TableCell>{record.bp}</TableCell>
                            <TableCell>{record.spo2}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PatientLayout>
  );
}