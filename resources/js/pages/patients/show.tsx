// pages/patients/Patient.tsx
import { Link, usePage, router } from '@inertiajs/react';
import type { User } from 'lucide-react';
import {
    Droplets,
    Baby,
    ChevronRight,
    X,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Hash,
    AlertCircle,
    UserCheck2,
    Clock,
    CalendarClock,
    Stethoscope,
    Building2,
    ArrowBigLeft,
    ArrowLeftRightIcon,
    Activity as Heart,
    ArrowLeftCircle,
    Briefcase,
    Globe,
    Shield,
    CreditCard,
    Search,
    Filter,
    Users,
    XCircle,
    Wallet,
    CreditCard as CardIcon,
    Smartphone,
    Banknote,
    HeartPulse,
    Thermometer,
    Pill,
    FileText,
    CalendarDays,
    DollarSign,
    CheckCircle,
    Activity,
    ChevronDown,
    ChevronUp,
    Hospital,
    Eye,
    Download,
    PlusCircle,
    User2,
    DatabaseIcon,
    PlusCircleIcon,
    Users2Icon,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import PatientVisitSchemeModal from './components/PatientSchemeModal';

interface Department {
    id: number;
    department_name?: string;
    name?: string;
    code?: string;
    description?: string;
    head_of_department?: string;
    location?: string;
    is_active?: boolean;
    status?: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role?: string;
    department?: string;
    available?: boolean;
    patients?: number;
    initials?: string;
}

interface VisitStatus {
    has_active_visit: boolean;
    visit_token: string | null;
    token_details?: any;
}

// Real data interfaces
interface Interaction {
    id: number;
    interaction_uuid: string;
    patient_id: number;
    provider_id: number | null;
    type: string;
    description: string;
    status: string;
    reference_number: string | null;
    created_at: string;
    updated_at: string;
}

interface VitalSign {
    id: number;
    visit_token: string;
    recorded_by: number | null;
    patient_id: number;
    systolic_bp: number | null;
    diastolic_bp: number | null;
    pulse_rate: number | null;
    respiratory_rate: number | null;
    spO2: string | null;
    height: string | null;
    weight: string | null;
    bmi: string | null;
    temperature: string | null;
    blood_glucose: number | null;
    pain_level: number | null;
    notes: string | null;
    recorded_at: string;
    created_at: string;
    updated_at: string;
}

interface Laboratory {
    id: number;
    lab_order_id: number;
    patient_id: number;
    order_number: string;
    visit_token: string;
    test_id: number;
    test_name: string;
    test_category: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    priority: string;
    status: string;
    notes: string | null;
    result_value: string | null;
    reference_range: string | null;
    unit: string | null;
    interpretation: string | null;
    performed_by: string | null;
    performed_date: string | null;
    created_at: string;
    updated_at: string;
}

interface Prescription {
    id: number;
    prescription_id: number;
    visit_token: string;
    prescription_uuid: string;
    drug_id: number | null;
    patient_id: number;
    drug_name: string;
    drug_code: string | null;
    drug_category: string | null;
    dosage: string | null;
    dosage_unit: string | null;
    frequency: string | null;
    frequency_label: string | null;
    route: string | null;
    duration: string | null;
    duration_unit: string | null;
    instructions: string | null;
    quantity_prescribed: string;
    quantity_dispensed: string;
    quantity_remaining: string;
    unit_price: string;
    total_price: string;
    currency: string;
    payment_status: string;
    payment_amount: string;
    payment_date: string | null;
    payment_method: string | null;
    transaction_reference: string | null;
    invoice_id: string | null;
    invoice_item_id: string | null;
    dispensation_status: string;
    dispensed_by: string | null;
    dispensed_at: string | null;
    reason_not_dispensed: string | null;
    is_active: boolean;
    is_cancelled: boolean;
    cancelled_by: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
}

interface Patient {
    id: number;
    patient_uuid: string | null;
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    emergency_contact: string | null;
    emergency_phone: string | null;
    blood_group: string | null;
    allergies: string | null;
    chronic_conditions: string | null;
    current_medications: string | null;
    medical_history: string | null;
    surgical_history: string | null;
    family_history: string | null;
    marital_status: string | null;
    occupation: string | null;
    nationality: string | null;
    id_type: string | null;
    id_number: string | null;
    insurance_provider: string | null;
    insurance_number: string | null;
    insurance_expiry: string | null;
    insurance_status: string | null;
    next_of_kin_name: string | null;
    next_of_kin_relationship: string | null;
    next_of_kin_phone: string | null;
    profile_photo: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    interaction: Interaction[];
    vital_sign: VitalSign[];
    laboratory: Laboratory[];
    prescription: Prescription[];
}

interface Props {
    patient: Patient | Patient[] | any;
    departments: Department[];
    users: User[];
    services?: any[];
    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
        };
    };
    visit_status?: VisitStatus;
}

// Payment methods
const paymentMethods = [
    {
        id: 'cash',
        label: 'Cash',
        icon: Banknote,
        color: 'text-green-600',
        bg: 'bg-green-50',
        description: 'Pay with cash',
    },
    {
        id: 'insurance',
        label: 'Insurance',
        icon: Shield,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        description: 'Use insurance coverage',
    },
];

export default function Patient() {
    const { props } = usePage<Props>();

    const {
        departments = [],
        users = [],
        services = [],
        auth,
        visit_status = { has_active_visit: false, visit_token: null },
        insuranceProviders,
    } = props;
    console.log(insuranceProviders);
    // Extract patient from props - handle both array and single object
    const patientFromProps = props.patient;
    const patient = Array.isArray(patientFromProps)
        ? patientFromProps[0]
        : patientFromProps;

    // Extract patientId from URL
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const patientIdFromUrl = parseInt(pathSegments[pathSegments.length - 1]);

    // Use visit status from backend props
    const [hasActiveVisit, setHasActiveVisit] = useState(
        visit_status?.has_active_visit || false,
    );
    const [activeVisitToken, setActiveVisitToken] = useState(
        visit_status?.visit_token || null,
    );

    // Filter states for overview sections
    const [medicalFilter, setMedicalFilter] = useState({
        search: '',
        type: 'all',
        severity: 'all',
    });
    const [treatmentFilter, setTreatmentFilter] = useState({
        search: '',
        status: 'all',
        route: 'all',
    });
    const [labFilter, setLabFilter] = useState({
        search: '',
        status: 'all',
        result: 'all',
    });
    const [historyFilter, setHistoryFilter] = useState({
        search: '',
        type: 'all',
    });
    const [appointmentFilter, setAppointmentFilter] = useState({
        search: '',
        status: 'all',
    });
    const [billingFilter, setBillingFilter] = useState({
        search: '',
        category: 'all',
    });

    const authenticatedUserId = auth?.user?.id;

    const [activeTab, setActiveTab] = useState('overview');
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showStartVisitModal, setShowStartVisitModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
        string | null
    >(null);

    // Selection states for assign modal
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
        null,
    );
    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
    const [priority, setPriority] = useState('routine');
    const [notes, setNotes] = useState('');
    const [visitType, setVisitType] = useState(0);
    const [purposeOfVisit, setPurposeOfVisit] = useState('');

    useEffect(() => {
        if (patient) {
            localStorage.setItem('current_patient', JSON.stringify(patient));
        }
    }, [patient]);

    const hasStartedVisit = hasActiveVisit;
    const visitToken = activeVisitToken;

    // Calculate age from date of birth
    function calculateAge(dob: string) {
        if (!dob) return '—';
        try {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
                age--;
            return age;
        } catch {
            return '—';
        }
    }

    // Format date
    function formatDate(date: string) {
        if (!date) return '—';
        try {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return date;
        }
    }

    // Format time
    function formatTime(date: string) {
        if (!date) return '—';
        try {
            return new Date(date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return date;
        }
    }

    function getInitials(name: string) {
        if (!name || name === 'Unknown') return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    const patientData = {
        id: patient?.id || patientIdFromUrl,
        name: patient
            ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
              'Unknown Patient'
            : 'Loading...',
        patientNumber: patient?.patient_number || '—',
        age: patient?.date_of_birth ? calculateAge(patient.date_of_birth) : '—',
        gender: patient?.gender || '—',
        phone: patient?.phone || 'Not provided',
        email: patient?.email || 'Not provided',
        status: patient?.status || 'active',
        avatar:
            patient?.profile_photo ||
            `https://ui-avatars.com/api/?name=${patient?.first_name || 'User'}&background=3b82f6&color=fff&size=128`,
    };

    // Transform real data for display
    // Medical Summary from allergies and chronic conditions
    const medicalSummary = useMemo(() => {
        const items = [];

        if (patient?.allergies) {
            try {
                const allergies =
                    typeof patient.allergies === 'string'
                        ? patient.allergies.split(',').map((a) => a.trim())
                        : [patient.allergies];
                allergies.forEach((allergy: string) => {
                    if (allergy) {
                        items.push({
                            id: `allergy-${items.length}`,
                            condition: allergy,
                            type: 'Allergy',
                            severity: 'Severe',
                        });
                    }
                });
            } catch {
                if (patient.allergies) {
                    items.push({
                        id: `allergy-${items.length}`,
                        condition: patient.allergies,
                        type: 'Allergy',
                        severity: 'Severe',
                    });
                }
            }
        }

        if (patient?.chronic_conditions) {
            try {
                const conditions =
                    typeof patient.chronic_conditions === 'string'
                        ? patient.chronic_conditions
                              .split(',')
                              .map((c) => c.trim())
                        : [patient.chronic_conditions];
                conditions.forEach((condition: string) => {
                    if (condition) {
                        items.push({
                            id: `chronic-${items.length}`,
                            condition: condition,
                            type: 'Chronic',
                            severity: 'Moderate',
                        });
                    }
                });
            } catch {
                if (patient.chronic_conditions) {
                    items.push({
                        id: `chronic-${items.length}`,
                        condition: patient.chronic_conditions,
                        type: 'Chronic',
                        severity: 'Moderate',
                    });
                }
            }
        }

        return items.length > 0
            ? items
            : [
                  {
                      id: 1,
                      condition: 'No conditions recorded',
                      type: 'None',
                      severity: 'Low',
                  },
              ];
    }, [patient]);

    // Treatment Plan from prescriptions
    const treatmentPlan = useMemo(() => {
        if (!patient?.prescription || patient.prescription.length === 0) {
            return [
                {
                    id: 1,
                    medication: 'No prescriptions',
                    dosage: '—',
                    frequency: '—',
                    route: '—',
                    status: 'None',
                    prescribedBy: '—',
                },
            ];
        }

        return patient.prescription.map((prescription: Prescription) => ({
            id: prescription.id,
            medication: prescription.drug_name || 'Unnamed Medication',
            dosage: prescription.dosage || '—',
            frequency:
                prescription.frequency_label || prescription.frequency || '—',
            route: prescription.route || '—',
            status:
                prescription.dispensation_status === 'dispensed'
                    ? 'Active'
                    : prescription.is_cancelled
                      ? 'Discontinued'
                      : prescription.payment_status === 'paid'
                        ? 'Active'
                        : 'Pending',
            prescribedBy: prescription.prescribed_by || '—',
        }));
    }, [patient?.prescription]);

    // Lab Reports from laboratory data
    const labReports = useMemo(() => {
        if (!patient?.laboratory || patient.laboratory.length === 0) {
            return [
                {
                    id: 1,
                    test: 'No lab tests',
                    date: '—',
                    result: '—',
                    value: '—',
                    status: '—',
                },
            ];
        }

        return patient.laboratory.map((lab: Laboratory) => ({
            id: lab.id,
            test: lab.test_name || 'Unnamed Test',
            date: lab.created_at ? formatDate(lab.created_at) : '—',
            result:
                lab.result_value ||
                lab.interpretation ||
                (lab.status === 'completed' ? 'Normal' : 'Pending'),
            value: lab.result_value || lab.unit || '—',
            status:
                lab.status === 'completed'
                    ? 'Completed'
                    : lab.status === 'pending'
                      ? 'Pending'
                      : lab.status === 'cancelled'
                        ? 'Cancelled'
                        : '—',
        }));
    }, [patient?.laboratory]);

    // Medical History from interactions
    const medicalHistory = useMemo(() => {
        if (!patient?.interaction || patient.interaction.length === 0) {
            return [
                {
                    id: 1,
                    date: '—',
                    title: 'No interactions recorded',
                    type: '—',
                    description: '—',
                    doctor: '—',
                },
            ];
        }

        return patient.interaction.map((interaction: Interaction) => ({
            id: interaction.id,
            date: interaction.created_at
                ? formatDate(interaction.created_at)
                : '—',
            title:
                interaction.type?.charAt(0).toUpperCase() +
                    interaction.type?.slice(1) || 'Interaction',
            type: interaction.type || '—',
            description: interaction.description || '—',
            doctor: interaction.provider_id
                ? `Provider #${interaction.provider_id}`
                : '—',
            status: interaction.status || '—',
        }));
    }, [patient?.interaction]);

    // Appointments from interactions with type 'appointment' or 'consultation'
    const appointments = useMemo(() => {
        const apptInteractions =
            patient?.interaction?.filter(
                (i: Interaction) =>
                    i.type === 'appointment' || i.type === 'consultation',
            ) || [];

        if (apptInteractions.length === 0) {
            return [
                {
                    id: 1,
                    title: 'No appointments',
                    doctor: '—',
                    date: '—',
                    time: '—',
                    status: '—',
                },
            ];
        }

        return apptInteractions.map((interaction: Interaction) => ({
            id: interaction.id,
            title:
                interaction.type?.charAt(0).toUpperCase() +
                    interaction.type?.slice(1) || 'Appointment',
            doctor: interaction.provider_id
                ? `Provider #${interaction.provider_id}`
                : '—',
            date: interaction.created_at
                ? formatDate(interaction.created_at)
                : '—',
            time: interaction.created_at
                ? formatTime(interaction.created_at)
                : '—',
            status:
                interaction.status === 'completed'
                    ? 'Completed'
                    : interaction.status === 'pending'
                      ? 'Upcoming'
                      : interaction.status || 'Scheduled',
        }));
    }, [patient?.interaction]);

    // Vital Signs
    const vitalSigns = useMemo(() => {
        if (!patient?.vital_sign || patient.vital_sign.length === 0) {
            return null;
        }
        const latest = patient.vital_sign[patient.vital_sign.length - 1];
        return {
            condition: latest.notes || 'Stable',
            bloodPressure:
                latest.systolic_bp && latest.diastolic_bp
                    ? `${latest.systolic_bp}/${latest.diastolic_bp}`
                    : '—',
            heartRate: latest.pulse_rate ? `${latest.pulse_rate} bpm` : '—',
            temperature: latest.temperature ? `${latest.temperature}°C` : '—',
            oxygen: latest.spO2 ? `${latest.spO2}%` : '—',
            bmi: latest.bmi || '—',
            painScore: latest.pain_level ? `${latest.pain_level}/10` : '—',
        };
    }, [patient?.vital_sign]);

    // Get unique values for filters
    const medicalTypes = [...new Set(medicalSummary.map((item) => item.type))];
    const medicalSeverities = [
        ...new Set(medicalSummary.map((item) => item.severity)),
    ];
    const treatmentStatuses = [
        ...new Set(treatmentPlan.map((item) => item.status)),
    ];
    const treatmentRoutes = [
        ...new Set(treatmentPlan.map((item) => item.route)),
    ];
    const labStatuses = [...new Set(labReports.map((item) => item.status))];
    const labResults = [...new Set(labReports.map((item) => item.result))];
    const historyTypes = [...new Set(medicalHistory.map((item) => item.type))];
    const appointmentStatuses = [
        ...new Set(appointments.map((item) => item.status)),
    ];

    // Filter functions
    const filteredMedical = useMemo(() => {
        return medicalSummary.filter((item) => {
            const searchMatch = item.condition
                .toLowerCase()
                .includes(medicalFilter.search.toLowerCase());
            const typeMatch =
                medicalFilter.type === 'all' ||
                item.type === medicalFilter.type;
            const severityMatch =
                medicalFilter.severity === 'all' ||
                item.severity === medicalFilter.severity;
            return searchMatch && typeMatch && severityMatch;
        });
    }, [medicalSummary, medicalFilter]);

    const filteredTreatment = useMemo(() => {
        return treatmentPlan.filter((item) => {
            const searchMatch = item.medication
                .toLowerCase()
                .includes(treatmentFilter.search.toLowerCase());
            const statusMatch =
                treatmentFilter.status === 'all' ||
                item.status === treatmentFilter.status;
            const routeMatch =
                treatmentFilter.route === 'all' ||
                item.route === treatmentFilter.route;
            return searchMatch && statusMatch && routeMatch;
        });
    }, [treatmentPlan, treatmentFilter]);

    const filteredLab = useMemo(() => {
        return labReports.filter((item) => {
            const searchMatch = item.test
                .toLowerCase()
                .includes(labFilter.search.toLowerCase());
            const statusMatch =
                labFilter.status === 'all' || item.status === labFilter.status;
            const resultMatch =
                labFilter.result === 'all' || item.result === labFilter.result;
            return searchMatch && statusMatch && resultMatch;
        });
    }, [labReports, labFilter]);

    const filteredHistory = useMemo(() => {
        return medicalHistory.filter((item) => {
            const searchMatch =
                item.title
                    .toLowerCase()
                    .includes(historyFilter.search.toLowerCase()) ||
                item.description
                    .toLowerCase()
                    .includes(historyFilter.search.toLowerCase());
            const typeMatch =
                historyFilter.type === 'all' ||
                item.type === historyFilter.type;
            return searchMatch && typeMatch;
        });
    }, [medicalHistory, historyFilter]);

    const filteredAppointments = useMemo(() => {
        return appointments.filter((item) => {
            const searchMatch =
                item.title
                    .toLowerCase()
                    .includes(appointmentFilter.search.toLowerCase()) ||
                item.doctor
                    .toLowerCase()
                    .includes(appointmentFilter.search.toLowerCase());
            const statusMatch =
                appointmentFilter.status === 'all' ||
                item.status === appointmentFilter.status;
            return searchMatch && statusMatch;
        });
    }, [appointments, appointmentFilter]);

    const handlePurposeOfVisit = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setPurposeOfVisit(e.target.value);
    };

    const handleVisitType = (visit: number) => {
        setVisitType(visit);
    };

    const toggleService = (serviceId: number) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId],
        );
        setError('');
    };

    const handleStaffSelect = (staffId: number) => {
        setSelectedStaff(staffId);
        setError('');
    };

    // In your Patient.tsx

    // Update the handleStartVisit function
    const handleStartVisit = async (data: {
        scheme: string;
        provider_id?: number | string | null;
    }) => {
        const { scheme, provider_id } = data;

        if (!patientIdFromUrl) {
            Notiflix.Notify.failure('Patient ID not found');
            return;
        }

        setLoading(true);
        setError('');

        const visitData = {
            patient_id: patientIdFromUrl,
            patient_number: patientData.patientNumber,
            payment_method: scheme,
            scheme_type: scheme,
            provider_id: provider_id || null,
            created_by: authenticatedUserId,
            status: 'pending',
            started_at: new Date().toISOString(),
        };

        try {
            const response = await Http.post(
                '/visit-token/generate',
                visitData,
            );

            if (response.data.success) {
                setHasActiveVisit(true);
                setActiveVisitToken(response.data.token);

                localStorage.setItem(
                    `visit_started_${patientIdFromUrl}`,
                    'true',
                );
                localStorage.setItem(
                    `visit_token_${patientIdFromUrl}`,
                    response.data.token,
                );
                localStorage.setItem(
                    `visit_payment_method_${patientIdFromUrl}`,
                    scheme,
                );

                if (provider_id) {
                    localStorage.setItem(
                        `visit_provider_${patientIdFromUrl}`,
                        String(provider_id),
                    );
                }

                Notiflix.Notify.success(
                    `Visit started successfully! Token: ${response.data.token}`,
                );

                // Close modal and reload after success
                setTimeout(() => {
                    setShowStartVisitModal(false);
                    setLoading(false); // Reset loading state
                    setError('');
                    router.reload();
                }, 1500);
            } else {
                Notiflix.Notify.failure(
                    response.data.message || 'Failed to start visit',
                );
                setLoading(false); // Reset loading state on failure
            }
        } catch (error: any) {
            console.error('Start visit error:', error);
            let errorMessage = 'Failed to start visit';
            if (error.response) {
                errorMessage =
                    error.response.data?.message ||
                    error.response.data?.error ||
                    errorMessage;
            } else if (error.request) {
                errorMessage =
                    'No response from server. Please check your connection.';
            }
            setError(errorMessage);
            Notiflix.Notify.failure(errorMessage);
            setLoading(false); // Reset loading state on error
        }
    };

    // Modal usage in JSX done
    <PatientVisitSchemeModal
        open={showStartVisitModal}
        onOpenChange={setShowStartVisitModal}
        onSubmit={handleStartVisit}
        patient={patient}
        schemes={insuranceProviders}
        loading={loading}
        title="Start Patient Visit"
        subtitle="Create encounter and resolve visit pricing"
    />;

    const handleAssign = async () => {
        if (!selectedDepartment) {
            setError('Please select a department');
            toast.error('Please select a department', {
                position: 'top-center',
                duration: 4000,
            });
            return;
        }

        setLoading(true);
        setError('');

        const visitData = {
            patient_id: patientIdFromUrl,
            patient_number: patientData.patientNumber,
            department_id: selectedDepartment,
            service_ids: selectedServices,
            staff_id: selectedStaff,
            created_by: authenticatedUserId,
            priority: priority,
            notes: notes,
            visit_type: visitType,
            purpose_of_visit: purposeOfVisit,
            scheduled_date: new Date().toISOString(),
            status: 'pending',
            visit_token: visitToken,
        };

        try {
            const response = await Http.post(
                '/patient/create/visit',
                visitData,
            );

            if (response.data.status === 301 || response.status === 409) {
                Notiflix.Notify.failure(response.data.message);
            } else if (response.status === 200 || response.status === 201) {
                Notiflix.Notify.success(response.data.message);
                setTimeout(() => {
                    setShowVisitModal(false);
                    resetSelections();
                }, 1500);
            } else {
                Notiflix.Notify.warning(
                    response.data.message || 'Unexpected response',
                );
            }
        } catch (error: any) {
            console.error('Queue error:', error);
            let errorMessage = 'Failed to assign visit';
            if (error.response) {
                errorMessage =
                    error.response.data?.message ||
                    error.response.data?.error ||
                    errorMessage;
            } else if (error.request) {
                errorMessage =
                    'No response from server. Please check your connection.';
            }
            setError(errorMessage);
            toast.error('Assignment Failed', {
                description: errorMessage,
                duration: 5000,
            });
        } finally {
            setLoading(false);
        }
    };

    const resetSelections = () => {
        setSelectedDepartment(null);
        setSelectedServices([]);
        setSelectedStaff(null);
        setPriority('routine');
        setNotes('');
        setVisitType(0);
        setPurposeOfVisit('');
        setError('');
        setDepartmentSearch('');
        setStaffSearch('');
        setDepartmentFilter('all');
    };

    const serviceOptions = [
        { id: 1, name: 'Emergency', color: 'bg-red-600' },
        { id: 2, name: 'Routine', color: 'bg-yellow-600' },
        { id: 3, name: 'Other', color: 'bg-green-600' },
    ];

    const filteredDepartments = useMemo(() => {
        let filtered = Array.isArray(departments) ? departments : [];
        if (departmentSearch && filtered.length > 0) {
            filtered = filtered.filter(
                (dept) =>
                    dept?.department_name
                        ?.toLowerCase()
                        .includes(departmentSearch.toLowerCase()) ||
                    dept?.name
                        ?.toLowerCase()
                        .includes(departmentSearch.toLowerCase()) ||
                    dept?.head_of_department
                        ?.toLowerCase()
                        .includes(departmentSearch.toLowerCase()) ||
                    dept?.location
                        ?.toLowerCase()
                        .includes(departmentSearch.toLowerCase()),
            );
        }
        if (departmentFilter === 'active') {
            filtered = filtered.filter(
                (dept) =>
                    dept?.is_active !== false && dept?.status !== 'inactive',
            );
        } else if (departmentFilter === 'inactive') {
            filtered = filtered.filter(
                (dept) =>
                    dept?.is_active === false || dept?.status === 'inactive',
            );
        }
        return filtered;
    }, [departments, departmentSearch, departmentFilter]);

    const filteredStaff = useMemo(() => {
        let filtered = Array.isArray(users) ? users : [];
        if (staffSearch && filtered.length > 0) {
            filtered = filtered.filter(
                (person) =>
                    person?.name
                        ?.toLowerCase()
                        .includes(staffSearch.toLowerCase()) ||
                    person?.role
                        ?.toLowerCase()
                        .includes(staffSearch.toLowerCase()) ||
                    person?.department
                        ?.toLowerCase()
                        .includes(staffSearch.toLowerCase()) ||
                    person?.email
                        ?.toLowerCase()
                        .includes(staffSearch.toLowerCase()),
            );
        }
        return filtered;
    }, [users, staffSearch]);

    // Helper functions for styling
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Active: 'bg-emerald-100 text-emerald-700',
            Completed: 'bg-emerald-100 text-emerald-700',
            Upcoming: 'bg-blue-100 text-blue-700',
            Scheduled: 'bg-blue-100 text-blue-700',
            Pending: 'bg-amber-100 text-amber-700',
            Discontinued: 'bg-rose-100 text-rose-700',
            Normal: 'bg-emerald-100 text-emerald-700',
            'Minor Irregularity': 'bg-amber-100 text-amber-700',
            Clear: 'bg-emerald-100 text-emerald-700',
            Elevated: 'bg-orange-100 text-orange-700',
            'Elevated Cholesterol': 'bg-orange-100 text-orange-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getSeverityColor = (severity: string) => {
        const colors: Record<string, string> = {
            Mild: 'bg-emerald-100 text-emerald-700',
            Moderate: 'bg-amber-100 text-amber-700',
            Severe: 'bg-rose-100 text-rose-700',
            Low: 'bg-blue-100 text-blue-700',
            None: 'bg-gray-100 text-gray-700',
        };
        return colors[severity] || 'bg-gray-100 text-gray-700';
    };

    // Render filter bar component
    const renderFilterBar = (
        search: string,
        setSearch: (value: string) => void,
        filters: {
            key: string;
            label: string;
            options: string[];
            value: string;
            onChange: (value: string) => void;
        }[],
        placeholder: string = 'Search...',
    ) => (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[150px] flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pr-8 pl-9 text-sm"
                />
                {search && (
                    <XCircle
                        className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                        onClick={() => setSearch('')}
                    />
                )}
            </div>
            {filters.map((filter) => (
                <Select
                    key={filter.key}
                    value={filter.value}
                    onValueChange={filter.onChange}
                >
                    <SelectTrigger className="h-9 w-[130px] text-sm">
                        <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All {filter.label}</SelectItem>
                        {filter.options.map((option) => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}
        </div>
    );

    if (!patient) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">
                        Loading patient data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PatientLayout
            patient={patient}
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: patientData.name, href: '' },
            ]}
        >
            <div className="min-h-screen bg-blue-50">
                {/* Top Bar with Quick Actions */}
                <div className="border-b bg-white p-4">
                    <div className="flex items-center gap-2">
                        {hasStartedVisit ? (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        resetSelections();
                                        setShowVisitModal(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Building2 className="mr-2 h-4 w-4" />
                                    Assign to Department
                                </Button>
                                {visitToken && (
                                    <Badge className="bg-green-100 text-green-700">
                                        Token: {visitToken}
                                    </Badge>
                                )}
                            </>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => setShowStartVisitModal(true)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Clock className="mr-2 h-4 w-4" />
                                Start Visit
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Content - 70/30 Layout */}
                <div className="p-6">
                    {activeTab === 'overview' && (
                        <>
                            {/* Vital Signs Row */}
                            {vitalSigns && (
                                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="text-xs text-gray-500">
                                            Condition
                                        </p>
                                        <p className="font-medium">
                                            {vitalSigns.condition}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="text-xs text-gray-500">
                                            Blood Pressure
                                        </p>
                                        <p className="font-medium">
                                            {vitalSigns.bloodPressure}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="text-xs text-gray-500">
                                            Heart Rate
                                        </p>
                                        <p className="font-medium">
                                            {vitalSigns.heartRate}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="text-xs text-gray-500">
                                            Temperature
                                        </p>
                                        <p className="font-medium">
                                            {vitalSigns.temperature}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="text-xs text-gray-500">
                                            Oxygen
                                        </p>
                                        <p className="font-medium">
                                            {vitalSigns.oxygen}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="text-xs text-gray-500">
                                            BMI
                                        </p>
                                        <p className="font-medium">
                                            {vitalSigns.bmi}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white p-3 shadow-sm">
                                        <p className="text-xs text-gray-500">
                                            Pain Score
                                        </p>
                                        <p className="font-medium">
                                            {vitalSigns.painScore}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 70/30 Layout */}
                            <div className="flex flex-col gap-6 lg:flex-row">
                                {/* Left Column - 70% */}
                                <div className="flex-1 space-y-6">
                                    {/* Medical Summary */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Stethoscope className="h-5 w-5 text-blue-600" />
                                                    <CardTitle className="text-base font-semibold">
                                                        Medical Summary
                                                    </CardTitle>
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        {filteredMedical.length}{' '}
                                                        conditions
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="mb-4">
                                                {renderFilterBar(
                                                    medicalFilter.search,
                                                    (value) =>
                                                        setMedicalFilter(
                                                            (prev) => ({
                                                                ...prev,
                                                                search: value,
                                                            }),
                                                        ),
                                                    [
                                                        {
                                                            key: 'type',
                                                            label: 'Type',
                                                            options:
                                                                medicalTypes,
                                                            value: medicalFilter.type,
                                                            onChange: (value) =>
                                                                setMedicalFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        type: value,
                                                                    }),
                                                                ),
                                                        },
                                                        {
                                                            key: 'severity',
                                                            label: 'Severity',
                                                            options:
                                                                medicalSeverities,
                                                            value: medicalFilter.severity,
                                                            onChange: (value) =>
                                                                setMedicalFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        severity:
                                                                            value,
                                                                    }),
                                                                ),
                                                        },
                                                    ],
                                                    'Search conditions...',
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {filteredMedical.length ===
                                                0 ? (
                                                    <p className="text-sm text-gray-500">
                                                        No conditions found
                                                    </p>
                                                ) : (
                                                    filteredMedical.map(
                                                        (item) => (
                                                            <Badge
                                                                key={item.id}
                                                                className={`${getSeverityColor(item.severity)} px-3 py-1.5 text-sm`}
                                                            >
                                                                <span className="font-medium">
                                                                    {
                                                                        item.condition
                                                                    }
                                                                </span>
                                                                <span className="ml-2 text-xs opacity-70">
                                                                    •{' '}
                                                                    {item.type}
                                                                </span>
                                                                <span
                                                                    className={`ml-2 text-xs ${getSeverityColor(item.severity)}`}
                                                                >
                                                                    •{' '}
                                                                    {
                                                                        item.severity
                                                                    }
                                                                </span>
                                                            </Badge>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Treatment Plan */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Pill className="h-5 w-5 text-emerald-600" />
                                                    <CardTitle className="text-base font-semibold">
                                                        Treatment Plan
                                                    </CardTitle>
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        {
                                                            filteredTreatment.length
                                                        }{' '}
                                                        medications
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="mb-4">
                                                {renderFilterBar(
                                                    treatmentFilter.search,
                                                    (value) =>
                                                        setTreatmentFilter(
                                                            (prev) => ({
                                                                ...prev,
                                                                search: value,
                                                            }),
                                                        ),
                                                    [
                                                        {
                                                            key: 'status',
                                                            label: 'Status',
                                                            options:
                                                                treatmentStatuses,
                                                            value: treatmentFilter.status,
                                                            onChange: (value) =>
                                                                setTreatmentFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        status: value,
                                                                    }),
                                                                ),
                                                        },
                                                        {
                                                            key: 'route',
                                                            label: 'Route',
                                                            options:
                                                                treatmentRoutes,
                                                            value: treatmentFilter.route,
                                                            onChange: (value) =>
                                                                setTreatmentFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        route: value,
                                                                    }),
                                                                ),
                                                        },
                                                    ],
                                                    'Search medications...',
                                                )}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Medication
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Dosage
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Frequency
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Route
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Status
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredTreatment.length ===
                                                        0 ? (
                                                            <tr>
                                                                <td
                                                                    colSpan={5}
                                                                    className="px-4 py-8 text-center text-gray-500"
                                                                >
                                                                    No
                                                                    medications
                                                                    found
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredTreatment.map(
                                                                (item) => (
                                                                    <tr
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        className="border-t border-gray-100 hover:bg-gray-50"
                                                                    >
                                                                        <td className="px-4 py-2 font-medium">
                                                                            {
                                                                                item.medication
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            {
                                                                                item.dosage
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            {
                                                                                item.frequency
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            {
                                                                                item.route
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            <Badge
                                                                                className={getStatusColor(
                                                                                    item.status,
                                                                                )}
                                                                            >
                                                                                {
                                                                                    item.status
                                                                                }
                                                                            </Badge>
                                                                        </td>
                                                                    </tr>
                                                                ),
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Lab Reports */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-5 w-5 text-purple-600" />
                                                    <CardTitle className="text-base font-semibold">
                                                        Lab Reports
                                                    </CardTitle>
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        {filteredLab.length}{' '}
                                                        tests
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="mb-4">
                                                {renderFilterBar(
                                                    labFilter.search,
                                                    (value) =>
                                                        setLabFilter(
                                                            (prev) => ({
                                                                ...prev,
                                                                search: value,
                                                            }),
                                                        ),
                                                    [
                                                        {
                                                            key: 'status',
                                                            label: 'Status',
                                                            options:
                                                                labStatuses,
                                                            value: labFilter.status,
                                                            onChange: (value) =>
                                                                setLabFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        status: value,
                                                                    }),
                                                                ),
                                                        },
                                                        {
                                                            key: 'result',
                                                            label: 'Result',
                                                            options: labResults,
                                                            value: labFilter.result,
                                                            onChange: (value) =>
                                                                setLabFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        result: value,
                                                                    }),
                                                                ),
                                                        },
                                                    ],
                                                    'Search tests...',
                                                )}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Test Name
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Date
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Result
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Value
                                                            </th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                                                                Status
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredLab.length ===
                                                        0 ? (
                                                            <tr>
                                                                <td
                                                                    colSpan={5}
                                                                    className="px-4 py-8 text-center text-gray-500"
                                                                >
                                                                    No lab
                                                                    reports
                                                                    found
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredLab.map(
                                                                (item) => (
                                                                    <tr
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        className="border-t border-gray-100 hover:bg-gray-50"
                                                                    >
                                                                        <td className="px-4 py-2 font-medium">
                                                                            {
                                                                                item.test
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            {
                                                                                item.date
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            <Badge
                                                                                className={getStatusColor(
                                                                                    item.result,
                                                                                )}
                                                                            >
                                                                                {
                                                                                    item.result
                                                                                }
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-gray-600">
                                                                            {
                                                                                item.value
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            <Badge
                                                                                className={getStatusColor(
                                                                                    item.status,
                                                                                )}
                                                                            >
                                                                                {
                                                                                    item.status
                                                                                }
                                                                            </Badge>
                                                                        </td>
                                                                    </tr>
                                                                ),
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column - 30% */}
                                <div className="space-y-6 lg:w-[30%]">
                                    {/* Medical History */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-5 w-5 text-orange-600" />
                                                    <CardTitle className="text-base font-semibold">
                                                        Medical History
                                                    </CardTitle>
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        {filteredHistory.length}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="mb-3">
                                                {renderFilterBar(
                                                    historyFilter.search,
                                                    (value) =>
                                                        setHistoryFilter(
                                                            (prev) => ({
                                                                ...prev,
                                                                search: value,
                                                            }),
                                                        ),
                                                    [
                                                        {
                                                            key: 'type',
                                                            label: 'Type',
                                                            options:
                                                                historyTypes,
                                                            value: historyFilter.type,
                                                            onChange: (value) =>
                                                                setHistoryFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        type: value,
                                                                    }),
                                                                ),
                                                        },
                                                    ],
                                                    'Search history...',
                                                )}
                                            </div>
                                            <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2">
                                                {filteredHistory.length ===
                                                0 ? (
                                                    <p className="py-4 text-center text-sm text-gray-500">
                                                        No history records found
                                                    </p>
                                                ) : (
                                                    filteredHistory.map(
                                                        (item) => (
                                                            <div
                                                                key={item.id}
                                                                className={`border-l-2 pl-3 ${
                                                                    item.type ===
                                                                    'Admission'
                                                                        ? 'border-rose-500'
                                                                        : item.type ===
                                                                            'Lab Test'
                                                                          ? 'border-blue-500'
                                                                          : 'border-gray-300'
                                                                }`}
                                                            >
                                                                <p className="text-sm font-medium">
                                                                    {item.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {item.date}{' '}
                                                                    •{' '}
                                                                    {item.type}
                                                                </p>
                                                                <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-gray-500">
                                                                    {
                                                                        item.doctor
                                                                    }
                                                                </p>
                                                            </div>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Appointments */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-5 w-5 text-indigo-600" />
                                                    <CardTitle className="text-base font-semibold">
                                                        Appointments
                                                    </CardTitle>
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        {
                                                            filteredAppointments.length
                                                        }
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="mb-3">
                                                {renderFilterBar(
                                                    appointmentFilter.search,
                                                    (value) =>
                                                        setAppointmentFilter(
                                                            (prev) => ({
                                                                ...prev,
                                                                search: value,
                                                            }),
                                                        ),
                                                    [
                                                        {
                                                            key: 'status',
                                                            label: 'Status',
                                                            options:
                                                                appointmentStatuses,
                                                            value: appointmentFilter.status,
                                                            onChange: (value) =>
                                                                setAppointmentFilter(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        status: value,
                                                                    }),
                                                                ),
                                                        },
                                                    ],
                                                    'Search appointments...',
                                                )}
                                            </div>
                                            <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
                                                {filteredAppointments.length ===
                                                0 ? (
                                                    <p className="py-4 text-center text-sm text-gray-500">
                                                        No appointments found
                                                    </p>
                                                ) : (
                                                    filteredAppointments.map(
                                                        (item) => (
                                                            <div
                                                                key={item.id}
                                                                className={`flex items-center justify-between rounded-lg p-3 ${
                                                                    item.status ===
                                                                    'Upcoming'
                                                                        ? 'border border-blue-200 bg-blue-50'
                                                                        : item.status ===
                                                                            'Scheduled'
                                                                          ? 'border border-amber-200 bg-amber-50'
                                                                          : 'border border-gray-200 bg-gray-50'
                                                                }`}
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium">
                                                                        {
                                                                            item.title
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {
                                                                            item.doctor
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-gray-400">
                                                                        {
                                                                            item.date
                                                                        }{' '}
                                                                        •{' '}
                                                                        {
                                                                            item.time
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <Badge
                                                                    className={getStatusColor(
                                                                        item.status,
                                                                    )}
                                                                >
                                                                    {
                                                                        item.status
                                                                    }
                                                                </Badge>
                                                            </div>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Billing Summary - Placeholder for now */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                                    <CardTitle className="text-base font-semibold">
                                                        Billing Summary
                                                    </CardTitle>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5">
                                                    <span className="text-sm text-gray-500">
                                                        Total Charges
                                                    </span>
                                                    <span className="text-sm font-bold">
                                                        —
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-2.5">
                                                    <span className="text-sm text-gray-500">
                                                        Amount Paid
                                                    </span>
                                                    <span className="text-sm font-bold text-emerald-600">
                                                        —
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-blue-50 p-2.5">
                                                    <span className="text-sm text-gray-500">
                                                        Balance
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-600">
                                                        —
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-3 border-t border-gray-200 pt-2">
                                                <p className="text-xs text-gray-500">
                                                    <span className="font-medium">
                                                        Insurance:
                                                    </span>{' '}
                                                    {patient?.insurance_provider ||
                                                        'Not specified'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    <span className="font-medium">
                                                        Policy:
                                                    </span>{' '}
                                                    {patient?.insurance_number ||
                                                        '—'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Start Visit Modal */}
                <PatientVisitSchemeModal
                    open={showStartVisitModal}
                    onOpenChange={setShowStartVisitModal}
                    onSubmit={handleStartVisit}
                    patient={patient}
                    schemes={insuranceProviders} // Make sure this is passed from your controller
                    loading={loading}
                    title="Start Patient Visit"
                    subtitle="Create encounter and resolve visit pricing"
                />

                {/* Assign to Department Modal */}
                <Dialog open={showVisitModal} onOpenChange={setShowVisitModal}>
                    <DialogContent className="w-fit max-w-6xl min-w-[1000px] overflow-hidden bg-gray-50 p-0">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-xl">
                                Assign to Department
                            </DialogTitle>
                            {visitToken && (
                                <p className="mt-1 text-sm text-purple-600">
                                    Visit Token: {visitToken}
                                </p>
                            )}
                        </DialogHeader>
                        {error && (
                            <div className="mx-6 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <div className="grid max-h-[70vh] grid-cols-3 gap-4 overflow-hidden px-6 py-4">
                            {/* Departments Column */}
                            <div className="flex h-full flex-col overflow-hidden border-r">
                                <CardContent className="flex h-full flex-col p-4">
                                    <div className="flex-shrink-0">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="font-medium">
                                                Departments
                                            </h3>
                                            <Badge variant="outline">
                                                {filteredDepartments.length} of{' '}
                                                {departments.length}
                                            </Badge>
                                        </div>
                                        <div className="relative mb-2">
                                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search departments..."
                                                className="h-9 bg-white pl-8 text-sm"
                                                value={departmentSearch}
                                                onChange={(e) =>
                                                    setDepartmentSearch(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {departmentSearch && (
                                                <XCircle
                                                    className="absolute top-2.5 right-2 h-4 w-4 cursor-pointer text-gray-400 hover:text-gray-600"
                                                    onClick={() =>
                                                        setDepartmentSearch('')
                                                    }
                                                />
                                            )}
                                        </div>
                                        <div className="mb-3 flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-gray-400" />
                                            <Select
                                                value={departmentFilter}
                                                onValueChange={
                                                    setDepartmentFilter
                                                }
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Filter by status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        All Departments
                                                    </SelectItem>
                                                    <SelectItem value="active">
                                                        Active Only
                                                    </SelectItem>
                                                    <SelectItem value="inactive">
                                                        Inactive Only
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                        {filteredDepartments.length === 0 ? (
                                            <div className="py-8 text-center text-gray-500">
                                                No departments found
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredDepartments.map(
                                                    (dept) => {
                                                        const isActive =
                                                            dept.is_active !==
                                                                false &&
                                                            dept.status !==
                                                                'inactive';
                                                        const deptName =
                                                            dept.department_name ||
                                                            dept.name ||
                                                            'Unnamed';
                                                        return (
                                                            <div
                                                                key={dept.id}
                                                                className={`flex cursor-pointer items-start gap-2 rounded p-3 transition-colors ${
                                                                    selectedDepartment ===
                                                                    dept.id
                                                                        ? 'border border-blue-200 bg-blue-50'
                                                                        : isActive
                                                                          ? 'border border-transparent hover:bg-gray-50'
                                                                          : 'cursor-not-allowed opacity-50'
                                                                }`}
                                                                onClick={() => {
                                                                    if (
                                                                        isActive
                                                                    ) {
                                                                        setSelectedDepartment(
                                                                            dept.id,
                                                                        );
                                                                        setError(
                                                                            '',
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <div
                                                                    className={`mt-0.5 h-4 w-4 rounded-full border ${
                                                                        selectedDepartment ===
                                                                        dept.id
                                                                            ? 'border-4 border-blue-600'
                                                                            : 'border-2 border-gray-300'
                                                                    }`}
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-sm font-medium">
                                                                            {
                                                                                deptName
                                                                            }
                                                                        </p>
                                                                        {!isActive && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="bg-gray-50 text-xs text-gray-700"
                                                                            >
                                                                                Inactive
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">
                                                                        Head:{' '}
                                                                        {dept.head_of_department ||
                                                                            'Not assigned'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400">
                                                                        {dept.location ||
                                                                            'Location not set'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </div>

                            {/* Staff Column */}
                            <div className="flex h-full flex-col overflow-hidden border-r">
                                <CardContent className="flex h-full flex-col p-4">
                                    <div className="flex-shrink-0">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="font-medium">
                                                Assign to Staff
                                            </h3>
                                            <Badge variant="outline">
                                                {selectedStaff
                                                    ? '1 selected'
                                                    : '0 selected'}
                                            </Badge>
                                        </div>
                                        <div className="relative mb-2">
                                            <Search className="absolute top-2.5 left-2 h-4 w-4 bg-white text-gray-400" />
                                            <Input
                                                placeholder="Search staff..."
                                                className="h-9 pl-8 text-sm"
                                                value={staffSearch}
                                                onChange={(e) =>
                                                    setStaffSearch(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {staffSearch && (
                                                <XCircle
                                                    className="absolute top-2.5 right-2 h-4 w-4 cursor-pointer text-gray-400 hover:text-gray-600"
                                                    onClick={() =>
                                                        setStaffSearch('')
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                        {filteredStaff.length === 0 ? (
                                            <div className="py-8 text-center text-gray-500">
                                                No staff found
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredStaff.map((person) => (
                                                    <div
                                                        key={person.id}
                                                        className={`flex cursor-pointer items-start gap-2 rounded p-3 transition-colors ${
                                                            selectedStaff ===
                                                            person.id
                                                                ? 'border border-purple-200 bg-purple-50'
                                                                : 'border border-transparent hover:bg-gray-50'
                                                        }`}
                                                        onClick={() =>
                                                            handleStaffSelect(
                                                                person.id,
                                                            )
                                                        }
                                                    >
                                                        <div
                                                            className={`mt-0.5 h-4 w-4 rounded-full border ${
                                                                selectedStaff ===
                                                                person.id
                                                                    ? 'border-4 border-purple-600'
                                                                    : 'border-2 border-gray-300'
                                                            }`}
                                                        />
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="bg-blue-100 text-xs text-blue-700">
                                                                {person.initials ||
                                                                    person.name
                                                                        ?.split(
                                                                            ' ',
                                                                        )
                                                                        .map(
                                                                            (
                                                                                n,
                                                                            ) =>
                                                                                n[0],
                                                                        )
                                                                        .join(
                                                                            '',
                                                                        )
                                                                        .slice(
                                                                            0,
                                                                            2,
                                                                        )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-medium">
                                                                    {
                                                                        person.name
                                                                    }
                                                                </p>
                                                                {person.available ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="bg-green-50 text-xs text-green-700"
                                                                    >
                                                                        Available
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="bg-red-50 text-xs text-red-700"
                                                                    >
                                                                        Busy
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {person.role ||
                                                                    'Staff'}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {person.department ||
                                                                    'General'}{' '}
                                                                •{' '}
                                                                {person.patients ||
                                                                    0}{' '}
                                                                patients
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </div>

                            {/* Additional Details Column */}
                            <div className="flex h-full flex-col overflow-hidden">
                                <CardContent className="flex h-full flex-col p-4">
                                    <div className="flex-shrink-0">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="font-medium">
                                                Additional Details
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                                        <div>
                                            <label className="mb-2 block text-sm text-gray-600">
                                                Service Type
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {serviceOptions.map((item) => (
                                                    <Badge
                                                        key={item.id}
                                                        className={`${item.color} cursor-pointer text-white hover:opacity-80 ${
                                                            selectedServices.includes(
                                                                item.id,
                                                            )
                                                                ? 'ring-2 ring-blue-500 ring-offset-2'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            toggleService(
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        {item.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm text-gray-600">
                                                Type of visit
                                            </label>
                                            <div className="flex gap-4">
                                                <Badge
                                                    onClick={() =>
                                                        handleVisitType(1)
                                                    }
                                                    className={`cursor-pointer ${
                                                        visitType === 1
                                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                                            : ''
                                                    } bg-green-600 text-white`}
                                                >
                                                    New Visit
                                                </Badge>
                                                <Badge
                                                    onClick={() =>
                                                        handleVisitType(2)
                                                    }
                                                    className={`cursor-pointer ${
                                                        visitType === 2
                                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                                            : ''
                                                    } bg-blue-600 text-white`}
                                                >
                                                    Revisit
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm text-gray-600">
                                                Purpose of visit
                                            </label>
                                            <textarea
                                                className="h-20 w-full rounded-lg border border-gray-200 bg-gray-100 p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                onChange={handlePurposeOfVisit}
                                                value={purposeOfVisit}
                                                placeholder="Enter purpose of visit..."
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 p-6 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowVisitModal(false);
                                    resetSelections();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleAssign} disabled={loading}>
                                {loading
                                    ? 'Assigning...'
                                    : 'Confirm Assignment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PatientLayout>
    );
}
