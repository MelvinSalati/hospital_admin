import { useState, useMemo, useEffect } from 'react';
import {
    User,
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
} from 'lucide-react';
import Notiflix from 'notiflix';
import PatientLayout from '@/layouts/patients/PatientLayout';
import PatientTabs from './components/PatientTabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import Http from '@/utils/Http';
import { toast } from 'sonner';
import { Link, usePage, router } from '@inertiajs/react';

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

interface Props {
    patient: any;
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
    },
    // { id: "nhima", label: "NHIMA", icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
    {
        id: 'insurance',
        label: 'Insurance',
        icon: Shield,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
    },
    // { id: "charity", label: "Charity", icon: Heart, color: "text-red-600", bg: "bg-red-50" },
    // { id: "altaf", label: "Altaf Medical Scheme", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    {
        id: 'mobile_money',
        label: 'Mobile Money',
        icon: Smartphone,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
    },
    {
        id: 'card',
        label: 'Card',
        icon: CardIcon,
        color: 'text-cyan-600',
        bg: 'bg-cyan-50',
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
    } = props;

    // Extract patientId from URL: /patients/23
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const patientIdFromUrl = parseInt(pathSegments[pathSegments.length - 1]);

    // Get patient data from props or fetch it
    const patientFromProps = props.patient;
    const [patientDataState, setPatientDataState] = useState(patientFromProps);

    // Use visit status from backend props (primary source of truth)
    const [hasActiveVisit, setHasActiveVisit] = useState(
        visit_status?.has_active_visit || false,
    );
    const [activeVisitToken, setActiveVisitToken] = useState(
        visit_status?.visit_token || null,
    );

    // Fetch patient data if not provided in props
    useEffect(() => {
        if (!patientFromProps && patientIdFromUrl) {
            const fetchPatient = async () => {
                try {
                    const response = await Http.get(
                        `/patients/${patientIdFromUrl}`,
                    );
                    if (response.data.success) {
                        setPatientDataState(response.data.data);
                    }
                } catch (error) {
                    console.error('Error fetching patient:', error);
                    Notiflix.Notify.failure('Failed to load patient data');
                }
            };
            fetchPatient();
        }
    }, [patientIdFromUrl, patientFromProps]);

    // Fetch visit status if not provided in props
    useEffect(() => {
        if (!visit_status && patientIdFromUrl) {
            const fetchVisitStatus = async () => {
                try {
                    const response = await Http.get(
                        `/patients/${patientIdFromUrl}/visit-status`,
                    );
                    if (response.data.success) {
                        setHasActiveVisit(response.data.has_active_visit);
                        setActiveVisitToken(response.data.visit_token);
                    }
                } catch (error) {
                    console.error('Failed to fetch visit status:', error);
                }
            };
            fetchVisitStatus();
        }
    }, [patientIdFromUrl, visit_status]);

    // Cleanup old localStorage data when patient changes
    useEffect(() => {
        // Clear localStorage items for other patients
        Object.keys(localStorage).forEach((key) => {
            if (
                key.startsWith('visit_started_') ||
                key.startsWith('visit_token_') ||
                key.startsWith('visit_payment_method_')
            ) {
                const keyPatientId = key.split('_').pop();

                // If this key doesn't belong to current patient, remove it
                if (keyPatientId && keyPatientId !== String(patientIdFromUrl)) {
                    localStorage.removeItem(key);
                    console.log(
                        `Cleared old visit data for patient ${keyPatientId}`,
                    );
                }
            }
        });

        // Sync localStorage with backend state
        if (hasActiveVisit && activeVisitToken) {
            localStorage.setItem(`visit_started_${patientIdFromUrl}`, 'true');
            localStorage.setItem(
                `visit_token_${patientIdFromUrl}`,
                activeVisitToken,
            );
        }
    }, [patientIdFromUrl, hasActiveVisit, activeVisitToken]);

    // Get authenticated user ID
    const authenticatedUserId = auth?.user?.id;
    const authenticatedUserName = auth?.user?.name;

    const [activeTab, setActiveTab] = useState('overview');
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showStartVisitModal, setShowStartVisitModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
        string | null
    >(null);

    // Filter states
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');

    // Selection states
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
        null,
    );
    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
    const [priority, setPriority] = useState('routine');
    const [notes, setNotes] = useState('');
    const [visitType, setVisitType] = useState(0);
    const [purposeOfVisit, setPurposeOfVisit] = useState('');
    const [queueTo, setQueueTo] = useState('');

    // Use patient from props or fetched data
    const patient = patientDataState || patientFromProps;

    // create localstorage 
    useEffect(() => {
        if (patient) {
            localStorage.setItem('current_patient', JSON.stringify(patient));
        }
    },[patient]);
    // Use backend state as source of truth
    const hasStartedVisit = hasActiveVisit;
    const visitToken = activeVisitToken;

    // Enhanced patient data from props
    const patientData = {
        id: patientIdFromUrl, // Use URL param as fallback
        name: patient
            ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
            : 'Loading...',
        patientNumber: patient?.patient_number || '—',
        mrn: patient?.patient_number || '—',
        age: patient?.date_of_birth ? calculateAge(patient.date_of_birth) : '—',
        gender: patient?.gender || '—',
        bloodGroup: patient?.blood_group || '—',
        phone: patient?.phone || 'Not provided',
        email: patient?.email || 'Not provided',
        address: patient?.address || 'Not provided',
        emergencyContact:
            patient?.emergency_contact ||
            patient?.next_of_kin_name ||
            'Not provided',
        emergencyPhone:
            patient?.emergency_phone ||
            patient?.next_of_kin_phone ||
            'Not provided',
        insuranceProvider: patient?.insurance_provider || 'Not specified',
        insuranceNumber: patient?.insurance_number || 'Not specified',
        idType: patient?.id_type || 'Not specified',
        idNumber: patient?.id_number || 'Not provided',
        occupation: patient?.occupation || 'Not specified',
        nationality: patient?.nationality || 'Not specified',
        maritalStatus: patient?.marital_status || 'Not specified',
        status: patient?.status || 'active',
        avatar:
            patient?.profile_photo ||
            `https://ui-avatars.com/api/?name=${patient?.first_name || 'User'}&background=3b82f6&color=fff&size=128`,
    };

    const handlePurposeOfVisit = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setPurposeOfVisit(e.target.value);
    };

    const handleVisitType = (visit: number) => {
        setVisitType(visit);
    };

    const handleQueue = (queue: string) => {
        setQueueTo(queue);
    };

    // Age calculation
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

    // Initials
    function getInitials(name: string) {
        if (!name || name === 'Unknown') return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    // Handle service selection
    const toggleService = (serviceId: number) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId],
        );
        setError('');
    };

    // Handle staff selection
    const handleStaffSelect = (staffId: number) => {
        setSelectedStaff(staffId);
        setError('');
    };

    // Handle Start Visit - Generate Token
    const handleStartVisit = async () => {
        if (!selectedPaymentMethod) {
            toast.error('Please select a payment method', {
                position: 'top-center',
                duration: 4000,
            });
            return;
        }

        if (!patientIdFromUrl) {
            Notiflix.Notify.failure('Patient ID not found');
            return;
        }

        setLoading(true);
        setError('');

        // Map payment method - card is treated as cash
        let effectivePaymentMethod = selectedPaymentMethod;
        if (selectedPaymentMethod === 'card') {
            effectivePaymentMethod = 'cash';
        }

        const visitData = {
            patient_id: patientIdFromUrl,
            patient_number: patientData.patientNumber,
            payment_method: effectivePaymentMethod,
            original_payment_method: selectedPaymentMethod,
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
                // Update state
                setHasActiveVisit(true);
                setActiveVisitToken(response.data.token);

                // Store in localStorage as backup
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
                    selectedPaymentMethod,
                );

                Notiflix.Notify.success(
                    `Visit started successfully! Token: ${response.data.token}`,
                );

                setTimeout(() => {
                    setShowStartVisitModal(false);
                    setSelectedPaymentMethod(null);
                    // Reload to show updated state
                    router.reload();
                }, 1500);
            } else {
                Notiflix.Notify.failure(
                    response.data.message || 'Failed to start visit',
                );
            }
        } catch (error: any) {
            console.error('Start visit error:', error);

            let errorMessage = 'Failed to start visit';

            if (error.response) {
                errorMessage =
                    error.response.data?.message ||
                    error.response.data?.error ||
                    errorMessage;
                if (error.response.status === 401) {
                    errorMessage = 'Please log in again to continue';
                }
            } else if (error.request) {
                errorMessage =
                    'No response from server. Please check your connection.';
            }

            setError(errorMessage);
            Notiflix.Notify.failure(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Handle Assign to Department (after visit started)
    const handleAssign = async () => {
        // Validation
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
                if (response.data.interaction_id) {
                    Notiflix.Notify.success(
                        `${response.data.message} - Interaction ID: ${response.data.interaction_id}`,
                    );
                } else {
                    Notiflix.Notify.success(response.data.message);
                }

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
                if (error.response.status === 401) {
                    errorMessage = 'Please log in again to continue';
                    toast.error('Session Expired', {
                        description: errorMessage,
                        duration: 5000,
                    });
                } else {
                    setError(errorMessage);
                    toast.error('Assignment Failed', {
                        description: errorMessage,
                        duration: 5000,
                    });
                }
            } else if (error.request) {
                errorMessage =
                    'No response from server. Please check your connection.';
                toast.error('Connection Error', {
                    description: errorMessage,
                    duration: 5000,
                });
            } else {
                errorMessage = error.message || errorMessage;
                toast.error('Error', {
                    description: errorMessage,
                    duration: 5000,
                });
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Reset selections
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

    // Services options
    const serviceOptions = [
        { id: 1, name: 'Emergency', color: 'bg-red-600' },
        { id: 2, name: 'Routine', color: 'bg-yellow-600' },
        { id: 3, name: 'Other', color: 'bg-green-600' },
    ];

    // Filter departments based on search and filter
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

    // Filter staff based on search
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
                {
                    title: `Patient`,
                    href: '',
                },
                {
                    title: `${patientData.name}`,
                    href: '',
                },
            ]}
        >
            <div className="border-t-r-100 bg-gray-100">
                {/* Main Patient Card */}
                <div className="overflow-hidden">
                    <CardContent className="p-0">
                        {/* Top Bar with Quick Actions */}
                        <div className="flex items-center justify-between border-b bg-white p-4">
                            <div className="flex items-center gap-2">
                                {hasStartedVisit ? (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                resetSelections();
                                                setShowVisitModal(true);
                                            }}
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
                                        onClick={() =>
                                            setShowStartVisitModal(true)
                                        }
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        Start Visit
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </div>

                {/* Tabs */}
                <PatientTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    patient={patient}
                />

                {/* Start Visit Modal with Payment Methods */}
                <Dialog
                    open={showStartVisitModal}
                    onOpenChange={setShowStartVisitModal}
                >
                    <DialogContent className="w-fit max-w-lg overflow-hidden bg-gray-50 p-0">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-xl">
                                Start Patient Visit
                            </DialogTitle>
                            <p className="mt-1 text-sm text-gray-500">
                                Select payment method to generate visit token
                            </p>
                        </DialogHeader>

                        {/* Payment Methods Grid */}
                        <div className="px-6 py-4">
                            <Label className="mb-3 block text-sm font-medium text-gray-700">
                                Select Payment Method *
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                {paymentMethods.map((method) => {
                                    const Icon = method.icon;
                                    const isSelected =
                                        selectedPaymentMethod === method.id;
                                    return (
                                        <div
                                            key={method.id}
                                            onClick={() =>
                                                setSelectedPaymentMethod(
                                                    method.id,
                                                )
                                            }
                                            className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                                                isSelected
                                                    ? `${method.bg} border-purple-500 ring-2 ring-purple-200`
                                                    : 'border-gray-200 bg-white hover:border-purple-300'
                                            }`}
                                        >
                                            <div
                                                className={`rounded-full p-2 ${method.bg}`}
                                            >
                                                <Icon
                                                    className={`h-5 w-5 ${method.color}`}
                                                />
                                            </div>
                                            <div>
                                                <p
                                                    className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}
                                                >
                                                    {method.label}
                                                </p>
                                                {method.id === 'card' && (
                                                    <p className="text-xs text-gray-400">
                                                        Treated as Cash
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="ml-auto">
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600">
                                                        <div className="h-2 w-2 rounded-full bg-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="mx-6 mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600" />
                                <div className="text-xs text-blue-800">
                                    <p className="mb-1 font-medium">
                                        What happens next?
                                    </p>
                                    <p>
                                        After selecting payment method, a unique
                                        token will be generated for this visit.
                                        You can then assign the patient to a
                                        department.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 p-6 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowStartVisitModal(false);
                                    setSelectedPaymentMethod(null);
                                    setError('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleStartVisit}
                                disabled={loading || !selectedPaymentMethod}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {loading
                                    ? 'Generating Token...'
                                    : 'Start Visit'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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

                        {/* Error Message */}
                        {error && (
                            <div className="mx-6 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {/* Modal Content - 3 Columns with selection */}
                        <div className="grid max-h-[70vh] grid-cols-3 gap-4 overflow-hidden px-6 py-4">
                            {/* Column 1: Departments - With Filter */}
                            <div className="flex h-full flex-col overflow-hidden border-r">
                                <CardContent className="flex h-full flex-col p-4">
                                    <div className="flex-shrink-0">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="font-medium">
                                                Departments
                                            </h3>
                                            <Badge variant="outline">
                                                {filteredDepartments.length} of{' '}
                                                {Array.isArray(departments)
                                                    ? departments.length
                                                    : 0}
                                            </Badge>
                                        </div>

                                        {/* Search Input */}
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

                                        {/* Filter Dropdown */}
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

                                    {/* Scrollable Department List */}
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

                            {/* Column 2: Staff - Search Only */}
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

                                        {/* Search Input */}
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

                                    {/* Scrollable Staff List */}
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

                            {/* Column 3: Additional Details */}
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
                                                    className={`cursor-pointer ${visitType === 1 ? 'ring-2 ring-blue-500 ring-offset-2' : ''} bg-green-600 text-white`}
                                                >
                                                    New Visit
                                                </Badge>
                                                <Badge
                                                    onClick={() =>
                                                        handleVisitType(2)
                                                    }
                                                    className={`cursor-pointer ${visitType === 2 ? 'ring-2 ring-blue-500 ring-offset-2' : ''} bg-blue-600 text-white`}
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
                                            ></textarea>
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </div>

                        {/* Additional Options */}
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
