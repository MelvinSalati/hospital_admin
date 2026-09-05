import { Link, usePage, router } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    Activity,
    Plus,
    LayoutGrid,
    MicroscopeIcon,
    StethoscopeIcon,
    Eye,
    FileText,
    Calendar,
    User,
    Clock,
    ChevronRight,
    X,
    ClipboardList,
    Stethoscope,
    Pill,
    Heart,
    BookOpen,
    FileCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import PatientLayout from '@/layouts/patients/PatientLayout';
import RecentInteractions from './components/RecentInteractions';

interface Tab {
    key: number;
    name: string;
    icon?: any;
    description?: string;
}

const tabs: Tab[] = [
    {
        key: 1,
        name: 'Recent Interactions',
        icon: Activity,
        description: 'View consultation history',
    },
    {
        key: 2,
        name: 'New Consultation',
        icon: Plus,
        description: 'Add new consultation',
    },
];

// Consultation Form Tabs (Vertical inside modal)
const consultationFormTabs = [
    { key: 'chief_complaints', label: 'Chief Complaints', icon: ClipboardList },
    { key: 'clinical_analysis', label: 'Clinical Analysis', icon: Stethoscope },
    { key: 'physical_exam', label: 'Physical Exam', icon: MicroscopeIcon },
    { key: 'drug_history', label: 'Drug Hx', icon: Pill },
    { key: 'medical_conditions', label: 'Medical Conditions', icon: Heart },
    { key: 'health_education', label: 'Health Education', icon: BookOpen },
];

interface Props {
    patient?: any;
    appointments?: any[];
    consultations?: any[];
    recentInteractions?: any[];
}

// Main Component
export default function Consultation({
    patient,
    consultations,
    recentInteractions,
}: Props) {
    const { props } = usePage<Props>();

    // Extract patient ID from URL: /patients/consultations/23
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const patientIdFromUrl = parseInt(pathSegments[pathSegments.length - 1]);

    // Use patient from props or ID from URL
    const patientId = patient?.id || patientIdFromUrl;

    const [activeTab, setActiveTab] = useState<number>(2);
    const [patientData, setPatientData] = useState(patient);
    const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isConsultationModalOpen, setIsConsultationModalOpen] =
        useState(false);
    const [activeFormTab, setActiveFormTab] = useState('chief_complaints');

    // Form state
    const [formData, setFormData] = useState({
        chief_complaints: '',
        clinical_analysis: '',
        physical_exam: '',
        drug_history: '',
        medical_conditions: '',
        health_education: '',
        diagnosis: '',
        treatment: '',
        status: 'pending',
        type: 'general',
    });

    // Use consultations as recent interactions if recentInteractions is not provided
    const interactions = recentInteractions || consultations || [];

    // Fetch patient data if not provided in props
    useEffect(() => {
        if (!patient && patientIdFromUrl) {
            const fetchPatient = async () => {
                try {
                    const response = await fetch(
                        `/api/patients/${patientIdFromUrl}`,
                    );
                    if (response.ok) {
                        const data = await response.json();
                        setPatientData(data.data || data);
                    }
                } catch (error) {
                    console.error('Error fetching patient:', error);
                }
            };
            fetchPatient();
        }
    }, [patientIdFromUrl, patient]);

    const handleConsultationSuccess = () => {
        router.reload();
        setIsConsultationModalOpen(false);
        // Reset form
        setFormData({
            chief_complaints: '',
            clinical_analysis: '',
            physical_exam: '',
            drug_history: '',
            medical_conditions: '',
            health_education: '',
            diagnosis: '',
            treatment: '',
            status: 'pending',
            type: 'general',
        });
        setActiveFormTab('chief_complaints');
    };

    // Get patient name for display
    const patientName = patientData
        ? `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim()
        : 'Patient';

    // Format date for display
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get status badge color
    const getStatusColor = (status: string) => {
        const statusMap: Record<string, string> = {
            completed: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            cancelled: 'bg-red-100 text-red-800',
            scheduled: 'bg-blue-100 text-blue-800',
        };
        return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
    };

    // Handle form input changes
    const handleFormChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Handle form submission
    const handleSubmit = async () => {
        try {
            const response = await fetch(
                `/api/patients/${patientId}/consultations`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                },
            );

            if (response.ok) {
                handleConsultationSuccess();
            }
        } catch (error) {
            console.error('Error submitting consultation:', error);
        }
    };

    // Consultation Details Modal - Custom implementation
    const ConsultationDetailsModal = ({
        consultation,
        isOpen,
        onClose,
    }: any) => {
        if (!consultation || !isOpen) return null;

        // Close modal on escape key
        useEffect(() => {
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }, [onClose]);

        // Prevent body scroll when modal is open
        useEffect(() => {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'unset';
            }
            return () => {
                document.body.style.overflow = 'unset';
            };
        }, [isOpen]);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                {/* Backdrop click to close */}
                <div className="absolute inset-0" onClick={onClose} />

                {/* Modal Content */}
                <div className="relative z-10 max-h-[95vh] w-[95vw] overflow-y-auto rounded-xl bg-white shadow-2xl">
                    {/* Header */}
                    <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-100 p-2">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold">
                                    Consultation Details
                                </h2>
                                <Badge
                                    className={getStatusColor(
                                        consultation.status,
                                    )}
                                >
                                    {consultation.status || 'Completed'}
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Date & Time
                                    </p>
                                    <p className="flex items-center gap-2 font-medium">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        {formatDate(
                                            consultation.created_at ||
                                                consultation.date,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Doctor
                                    </p>
                                    <p className="flex items-center gap-2 font-medium">
                                        <User className="h-4 w-4 text-gray-400" />
                                        {consultation.doctor_name ||
                                            'Dr. Smith'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Type
                                    </p>
                                    <p className="flex items-center gap-2 font-medium">
                                        <StethoscopeIcon className="h-4 w-4 text-gray-400" />
                                        {consultation.type ||
                                            'General Consultation'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Patient
                                    </p>
                                    <p className="flex items-center gap-2 font-medium">
                                        <User className="h-4 w-4 text-gray-400" />
                                        {consultation.patient_name ||
                                            patientName}
                                    </p>
                                </div>
                            </div>

                            {/* Two Column Layout for Details */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    {/* Chief Complaints */}
                                    {consultation.chief_complaints && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-orange-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-orange-100 p-1.5">
                                                    <ClipboardList className="h-4 w-4 text-orange-600" />
                                                </div>
                                                Chief Complaints
                                            </h4>
                                            <p className="rounded-lg bg-orange-50 p-3 text-gray-700">
                                                {consultation.chief_complaints}
                                            </p>
                                        </div>
                                    )}

                                    {/* Symptoms */}
                                    {consultation.symptoms && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-purple-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-purple-100 p-1.5">
                                                    <StethoscopeIcon className="h-4 w-4 text-purple-600" />
                                                </div>
                                                Symptoms
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(
                                                    consultation.symptoms,
                                                ) ? (
                                                    consultation.symptoms.map(
                                                        (
                                                            symptom: string,
                                                            index: number,
                                                        ) => (
                                                            <Badge
                                                                key={index}
                                                                variant="outline"
                                                                className="bg-purple-50 text-purple-700"
                                                            >
                                                                {symptom}
                                                            </Badge>
                                                        ),
                                                    )
                                                ) : (
                                                    <p className="text-gray-600">
                                                        {consultation.symptoms}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Clinical Analysis */}
                                    {consultation.clinical_analysis && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-indigo-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-indigo-100 p-1.5">
                                                    <Stethoscope className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                Clinical Analysis
                                            </h4>
                                            <p className="rounded-lg bg-indigo-50 p-3 text-gray-700">
                                                {consultation.clinical_analysis}
                                            </p>
                                        </div>
                                    )}

                                    {/* Physical Exam */}
                                    {consultation.physical_exam && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-teal-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-teal-100 p-1.5">
                                                    <MicroscopeIcon className="h-4 w-4 text-teal-600" />
                                                </div>
                                                Physical Exam
                                            </h4>
                                            <p className="rounded-lg bg-teal-50 p-3 text-gray-700">
                                                {consultation.physical_exam}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    {/* Drug History */}
                                    {consultation.drug_history && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-pink-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-pink-100 p-1.5">
                                                    <Pill className="h-4 w-4 text-pink-600" />
                                                </div>
                                                Drug History
                                            </h4>
                                            <p className="rounded-lg bg-pink-50 p-3 text-gray-700">
                                                {consultation.drug_history}
                                            </p>
                                        </div>
                                    )}

                                    {/* Medical Conditions */}
                                    {consultation.medical_conditions && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-red-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-red-100 p-1.5">
                                                    <Heart className="h-4 w-4 text-red-600" />
                                                </div>
                                                Medical Conditions
                                            </h4>
                                            <p className="rounded-lg bg-red-50 p-3 text-gray-700">
                                                {
                                                    consultation.medical_conditions
                                                }
                                            </p>
                                        </div>
                                    )}

                                    {/* Diagnosis */}
                                    {consultation.diagnosis && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-blue-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-blue-100 p-1.5">
                                                    <MicroscopeIcon className="h-4 w-4 text-blue-600" />
                                                </div>
                                                Diagnosis
                                            </h4>
                                            <p className="rounded-lg bg-blue-50 p-3 text-gray-700">
                                                {consultation.diagnosis}
                                            </p>
                                        </div>
                                    )}

                                    {/* Treatment */}
                                    {consultation.treatment && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-green-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-green-100 p-1.5">
                                                    <FileText className="h-4 w-4 text-green-600" />
                                                </div>
                                                Treatment Plan
                                            </h4>
                                            <p className="rounded-lg bg-green-50 p-3 text-gray-700">
                                                {consultation.treatment}
                                            </p>
                                        </div>
                                    )}

                                    {/* Health Education */}
                                    {consultation.health_education && (
                                        <div className="rounded-lg border border-gray-200 p-4 hover:border-yellow-200">
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="rounded-lg bg-yellow-100 p-1.5">
                                                    <BookOpen className="h-4 w-4 text-yellow-600" />
                                                </div>
                                                Health Education
                                            </h4>
                                            <p className="rounded-lg bg-yellow-50 p-3 text-gray-700">
                                                {consultation.health_education}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full Width Sections */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Notes */}
                                {consultation.notes && (
                                    <div className="rounded-lg border border-gray-200 p-4 hover:border-gray-300">
                                        <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                            <div className="rounded-lg bg-gray-100 p-1.5">
                                                <FileText className="h-4 w-4 text-gray-600" />
                                            </div>
                                            Additional Notes
                                        </h4>
                                        <p className="rounded-lg bg-gray-50 p-3 text-gray-600">
                                            {consultation.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Follow-up */}
                                {consultation.follow_up_date && (
                                    <div className="rounded-lg border border-gray-200 p-4 hover:border-amber-200">
                                        <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                            <div className="rounded-lg bg-amber-100 p-1.5">
                                                <Calendar className="h-4 w-4 text-amber-600" />
                                            </div>
                                            Follow-up Date
                                        </h4>
                                        <p className="rounded-lg bg-amber-50 p-3 text-gray-700">
                                            {formatDate(
                                                consultation.follow_up_date,
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Consultation Form Modal with Vertical Tabs
    // Consultation Form Modal with Vertical Tabs - Compact Professional Design
    const ConsultationFormModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="relative z-10 max-h-[92vh] w-[92vw] max-w-7xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header - Compact */}
                <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <StethoscopeIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-800">
                                    New Consultation
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {patientName} • ID: {patientId}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsConsultationModalOpen(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                        >
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex h-[calc(85vh-65px)] flex-col overflow-hidden bg-gray-50/30 md:flex-row">
                    {/* Vertical Tabs - Compact Left Side */}
                    <div className="w-full flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-2 md:w-52">
                        {consultationFormTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeFormTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                    onClick={() => setActiveFormTab(tab.key)}
                                >
                                    <div
                                        className={`rounded-md p-1.5 ${
                                            isActive
                                                ? 'bg-blue-100'
                                                : 'bg-gray-100'
                                        }`}
                                    >
                                        <Icon
                                            className={`h-3.5 w-3.5 ${
                                                isActive
                                                    ? 'text-blue-600'
                                                    : 'text-gray-500'
                                            }`}
                                        />
                                    </div>
                                    <span
                                        className={`text-sm ${isActive ? 'font-medium' : ''}`}
                                    >
                                        {tab.label}
                                    </span>
                                    {isActive && (
                                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    )}
                                </button>
                            );
                        })}

                        <div className="mt-3 border-t border-gray-100 pt-3">
                            <button
                                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <FileCheck className="h-4 w-4" />
                                        Save Consultation
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Form Content - Right Side */}
                    <div className="flex-1 overflow-y-auto bg-white p-4">
                        {activeFormTab === 'chief_complaints' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                        <ClipboardList className="h-4 w-4 text-blue-600" />
                                        Chief Complaints
                                    </h3>
                                </div>
                                <div className="space-y-2.5">
                                    <div>
                                        <Label className="text-xs font-medium text-gray-600">
                                            Primary Complaint
                                        </Label>
                                        <Textarea
                                            placeholder="What is the patient's main concern?"
                                            value={formData.chief_complaints}
                                            onChange={(e) =>
                                                handleFormChange(
                                                    'chief_complaints',
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                            className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600">
                                                Duration
                                            </Label>
                                            <Input
                                                placeholder="How long?"
                                                className="mt-1 h-9 border-gray-200 text-sm focus:border-blue-300"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600">
                                                Severity
                                            </Label>
                                            <Select>
                                                <SelectTrigger className="mt-1 h-9 border-gray-200 text-sm focus:border-blue-300">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="mild">
                                                        Mild
                                                    </SelectItem>
                                                    <SelectItem value="moderate">
                                                        Moderate
                                                    </SelectItem>
                                                    <SelectItem value="severe">
                                                        Severe
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFormTab === 'clinical_analysis' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    <Stethoscope className="h-4 w-4 text-blue-600" />
                                    Clinical Analysis
                                </h3>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Symptoms
                                    </Label>
                                    <Textarea
                                        placeholder="Describe the symptoms in detail"
                                        value={formData.clinical_analysis}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'clinical_analysis',
                                                e.target.value,
                                            )
                                        }
                                        rows={4}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Preliminary Diagnosis
                                    </Label>
                                    <Textarea
                                        placeholder="Initial diagnosis based on clinical assessment"
                                        rows={3}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                            </div>
                        )}

                        {activeFormTab === 'physical_exam' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    <MicroscopeIcon className="h-4 w-4 text-blue-600" />
                                    Physical Exam
                                </h3>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Vital Signs
                                    </Label>
                                    <div className="mt-1 grid grid-cols-2 gap-2.5">
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Blood Pressure
                                            </Label>
                                            <Input
                                                placeholder="120/80"
                                                className="h-9 border-gray-200 text-sm focus:border-blue-300"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Heart Rate
                                            </Label>
                                            <Input
                                                placeholder="72 bpm"
                                                className="h-9 border-gray-200 text-sm focus:border-blue-300"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Temperature
                                            </Label>
                                            <Input
                                                placeholder="98.6°F"
                                                className="h-9 border-gray-200 text-sm focus:border-blue-300"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Respiratory Rate
                                            </Label>
                                            <Input
                                                placeholder="16/min"
                                                className="h-9 border-gray-200 text-sm focus:border-blue-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Physical Examination Findings
                                    </Label>
                                    <Textarea
                                        placeholder="Document all physical examination findings"
                                        value={formData.physical_exam}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'physical_exam',
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                            </div>
                        )}

                        {activeFormTab === 'drug_history' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    <Pill className="h-4 w-4 text-blue-600" />
                                    Drug History
                                </h3>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Current Medications
                                    </Label>
                                    <Textarea
                                        placeholder="List all current medications with dosages"
                                        value={formData.drug_history}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'drug_history',
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Allergies
                                    </Label>
                                    <Textarea
                                        placeholder="List any known allergies"
                                        rows={2}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Previous Drug Reactions
                                    </Label>
                                    <Textarea
                                        placeholder="Any adverse drug reactions in the past"
                                        rows={2}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                            </div>
                        )}

                        {activeFormTab === 'medical_conditions' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    <Heart className="h-4 w-4 text-blue-600" />
                                    Medical Conditions
                                </h3>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Chronic Conditions
                                    </Label>
                                    <Textarea
                                        placeholder="List all chronic medical conditions"
                                        value={formData.medical_conditions}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'medical_conditions',
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Past Medical History
                                    </Label>
                                    <Textarea
                                        placeholder="Previous surgeries, hospitalizations, etc."
                                        rows={2}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Family History
                                    </Label>
                                    <Textarea
                                        placeholder="Relevant family medical history"
                                        rows={2}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                            </div>
                        )}

                        {activeFormTab === 'health_education' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                    Health Education
                                </h3>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Patient Education Provided
                                    </Label>
                                    <Textarea
                                        placeholder="Document health education provided to patient"
                                        value={formData.health_education}
                                        onChange={(e) =>
                                            handleFormChange(
                                                'health_education',
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Follow-up Instructions
                                    </Label>
                                    <Textarea
                                        placeholder="Instructions for follow-up care"
                                        rows={2}
                                        className="mt-1 resize-none border-gray-200 text-sm focus:border-blue-300"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600">
                                        Referral Needed
                                    </Label>
                                    <Select>
                                        <SelectTrigger className="mt-1 h-9 border-gray-200 text-sm focus:border-blue-300">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no">
                                                No referral needed
                                            </SelectItem>
                                            <SelectItem value="yes">
                                                Referral required
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
    const renderTabContent = () => {
        switch (activeTab) {
            case 1:
                return (
                    <div className="mt-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="h-5 w-5 text-blue-600" />
                                    Consultation History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {interactions && interactions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>
                                                        Doctor
                                                    </TableHead>
                                                    <TableHead>
                                                        Status
                                                    </TableHead>
                                                    <TableHead>
                                                        Diagnosis
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        Action
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {interactions.map(
                                                    (
                                                        item: any,
                                                        index: number,
                                                    ) => (
                                                        <TableRow key={index}>
                                                            <TableCell className="font-medium">
                                                                {formatDate(
                                                                    item.created_at ||
                                                                        item.date,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.type ||
                                                                    'Consultation'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.doctor_name ||
                                                                    'Dr. Smith'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    className={getStatusColor(
                                                                        item.status,
                                                                    )}
                                                                >
                                                                    {item.status ||
                                                                        'Completed'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="max-w-[150px] truncate">
                                                                {item.diagnosis ||
                                                                    'N/A'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                    onClick={() => {
                                                                        setSelectedConsultation(
                                                                            item,
                                                                        );
                                                                        setIsDetailsModalOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Eye className="mr-1 h-4 w-4" />
                                                                    View Details
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-gray-500">
                                        <Activity className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                        <p>No consultation records found</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );

            case 2:
                return (
                    <div className="mt-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Plus className="h-5 w-5 text-blue-600" />
                                    New Consultation
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="py-12 text-center text-gray-500">
                                    <StethoscopeIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                                    <h3 className="mb-2 text-lg font-medium text-gray-700">
                                        Ready to start a new consultation?
                                    </h3>
                                    <p className="mx-auto max-w-md text-sm text-gray-400">
                                        Click the "Start Consultation" button in
                                        the header to begin documenting the
                                        patient's visit. The comprehensive form
                                        will guide you through all necessary
                                        sections.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <PatientLayout
            patient={patientData}
            breadcrumbs={[
                { title: 'Patients', href: '/patients' },
                { title: patientName, href: `/patients/${patientId}` },
                { title: 'Consultations', href: '' },
            ]}
        >
            {/* Header with Button on Right */}
            <div className="bg-blue-30 flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-white p-4">
                <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-blue-600 p-2.5 shadow-lg shadow-blue-200">
                        <StethoscopeIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-blue-900">
                            Consultations
                        </h1>
                        <p className="text-sm text-gray-500">
                            Manage patient consultations and medical records
                        </p>
                    </div>
                </div>

                {/* Start Consultation Button - Right Side */}
                <Button
                    className="bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                    onClick={() => setIsConsultationModalOpen(true)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Start Consultation
                </Button>
            </div>

            <div className="h-full bg-gray-50">
                {/* Patient Summary Card */}
                {patientData && (
                    <div className="border-b bg-white px-4 py-3">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">
                                    {patientName}
                                </span>
                            </div>
                            {patientData.medical_record_number && (
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                    <span>
                                        MRN: {patientData.medical_record_number}
                                    </span>
                                </div>
                            )}
                            {patientData.date_of_birth && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>
                                        DOB:{' '}
                                        {new Date(
                                            patientData.date_of_birth,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4 p-4 md:flex-row">
                    {/* Vertical Tabs */}
                    <div className="w-full flex-shrink-0 md:w-64">
                        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                            {tabs.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Button
                                        key={item.key}
                                        className={`mb-1 w-full justify-start gap-3 rounded-lg px-4 py-3 transition-all ${
                                            activeTab === item.key
                                                ? 'border border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                                                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                        variant="ghost"
                                        onClick={() => setActiveTab(item.key)}
                                    >
                                        <div
                                            className={`rounded-lg p-1.5 ${
                                                activeTab === item.key
                                                    ? 'bg-blue-100'
                                                    : 'bg-gray-100'
                                            }`}
                                        >
                                            {Icon && (
                                                <Icon
                                                    className={`h-4 w-4 ${
                                                        activeTab === item.key
                                                            ? 'text-blue-600'
                                                            : 'text-gray-500'
                                                    }`}
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">
                                                {item.name}
                                            </span>
                                            {item.description && (
                                                <span className="text-xs text-gray-400">
                                                    {item.description}
                                                </span>
                                            )}
                                        </div>
                                        {activeTab === item.key && (
                                            <ChevronRight className="ml-auto h-4 w-4 text-blue-600" />
                                        )}
                                    </Button>
                                );
                            })}
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <h4 className="mb-3 text-sm font-semibold text-gray-600">
                                Quick Stats
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Total Consultations
                                    </span>
                                    <span className="font-semibold">
                                        {interactions?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Last Visit
                                    </span>
                                    <span className="font-semibold">
                                        {interactions?.length > 0
                                            ? formatDate(
                                                  interactions[0].created_at ||
                                                      interactions[0].date,
                                              )
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="min-w-0 flex-1">{renderTabContent()}</div>
                </div>
            </div>

            {/* Consultation Details Modal */}
            {isDetailsModalOpen && (
                <ConsultationDetailsModal
                    consultation={selectedConsultation}
                    isOpen={isDetailsModalOpen}
                    onClose={() => {
                        setIsDetailsModalOpen(false);
                        setSelectedConsultation(null);
                    }}
                />
            )}

            {/* Consultation Form Modal with Vertical Tabs */}
            {isConsultationModalOpen && <ConsultationFormModal />}
        </PatientLayout>
    );
}
