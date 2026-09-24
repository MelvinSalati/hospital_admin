// components/PatientHeader.tsx

import {
    Phone,
    Mail,
    User,
    Cake,
    Shield,
    Hash,
    MapPin,
    HeartPulse,
    Calendar,
    Bed,
    Hospital,
    CreditCard,
    UserCircle,
    ArrowRightLeft,
    Clock,
    Search,
    XCircle,
    Filter,
    Building2,
    CheckCircle2,
    Users2Icon,
    Banknote,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import Notiflix from 'notiflix';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Http from '@/utils/Http';
import profile from './default.png';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department {
    id: number;
    department_name?: string;
    name?: string;
    head_of_department?: string;
    location?: string;
    is_active?: boolean;
    status?: string;
    [key: string]: any;
}

interface StaffMember {
    id: number;
    name?: string;
    email?: string;
    role?: string;
    department?: string;
    available?: boolean;
    patients?: number;
    initials?: string;
    [key: string]: any;
}

interface PatientHeaderProps {
    patient?: any;
    visitToken?: string | null;
    hasActiveVisit?: boolean;
}

// ─── Static service options ──────────────────────────────────────────────────

const SERVICE_OPTIONS = [
    { id: 1, name: 'Emergency', color: 'bg-red-600' },
    { id: 2, name: 'Routine', color: 'bg-yellow-600' },
    { id: 3, name: 'Other', color: 'bg-green-600' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PatientHeader({
    patient: propPatient,
    visitToken: propVisitToken,
    hasActiveVisit: propHasActiveVisit,
}: PatientHeaderProps) {
    // ── Inertia props (page-level) ───────────────────────────────────────────
    const page = usePage().props as any;
    const departments: Department[] = page.departments ?? [];
    const users: StaffMember[] = page.users ?? [];
    const auth = page.auth as { user?: { id: number } } | undefined;
    const visitStatus = page.visit_status as
        | { has_active_visit: boolean; visit_token: string | null }
        | undefined;

    // Resolve final values: prop > inertia > default
    const visitToken = propVisitToken ?? visitStatus?.visit_token ?? null;
    const hasActiveVisit =
        propHasActiveVisit ?? visitStatus?.has_active_visit ?? false;

    // ── Patient state ────────────────────────────────────────────────────────
    const [patient, setPatient] = useState<any>(propPatient ?? null);

    useEffect(() => {
        if (propPatient) {
            setPatient(propPatient);
            localStorage.setItem(
                'current_patient',
                JSON.stringify(propPatient),
            );
            return;
        }
        try {
            const cached = localStorage.getItem('current_patient');
            if (cached) setPatient(JSON.parse(cached));
        } catch {
            /* ignore */
        }
    }, [propPatient]);

    // ── Assign modal state ───────────────────────────────────────────────────
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState<
        'all' | 'active' | 'inactive'
    >('all');
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
        null,
    );
    const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [visitType, setVisitType] = useState(0);
    const [purposeOfVisit, setPurposeOfVisit] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Derived lists ────────────────────────────────────────────────────────
    const filteredDepartments = useMemo(() => {
        let list = Array.isArray(departments) ? departments : [];

        if (departmentFilter === 'active') {
            list = list.filter(
                (d) => d?.is_active !== false && d?.status !== 'inactive',
            );
        } else if (departmentFilter === 'inactive') {
            list = list.filter(
                (d) => d?.is_active === false || d?.status === 'inactive',
            );
        }

        if (departmentSearch.trim()) {
            const q = departmentSearch.toLowerCase();
            list = list.filter(
                (d) =>
                    d?.department_name?.toLowerCase().includes(q) ||
                    d?.name?.toLowerCase().includes(q) ||
                    d?.head_of_department?.toLowerCase().includes(q) ||
                    d?.location?.toLowerCase().includes(q),
            );
        }
        return list;
    }, [departments, departmentSearch, departmentFilter]);

    const filteredStaff = useMemo(() => {
        let list = Array.isArray(users) ? users : [];
        if (staffSearch.trim()) {
            const q = staffSearch.toLowerCase();
            list = list.filter(
                (u) =>
                    u?.name?.toLowerCase().includes(q) ||
                    u?.role?.toLowerCase().includes(q) ||
                    u?.department?.toLowerCase().includes(q) ||
                    u?.email?.toLowerCase().includes(q),
            );
        }
        return list;
    }, [users, staffSearch]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const resetSelections = () => {
        setSelectedDepartment(null);
        setSelectedStaff(null);
        setSelectedServices([]);
        setVisitType(0);
        setPurposeOfVisit('');
        setDepartmentSearch('');
        setStaffSearch('');
        setDepartmentFilter('all');
        setError('');
    };

    const openAssignModal = () => {
        resetSelections();
        setShowAssignModal(true);
    };

    const toggleService = (id: number) => {
        setSelectedServices((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
        setError('');
    };

    const handleStaffSelect = (id: number) => {
        setSelectedStaff(id);
        setError('');
    };

    const handleAssign = async () => {
        if (!selectedDepartment) {
            setError('Please select a department');
            return;
        }

        setLoading(true);
        setError('');

        const payload = {
            patient_id: patient?.id,
            patient_number: patient?.patient_number,
            department_id: selectedDepartment,
            service_ids: selectedServices,
            staff_id: selectedStaff,
            created_by: auth?.user?.id,
            priority: 'routine',
            notes: '',
            visit_type: visitType,
            purpose_of_visit: purposeOfVisit,
            scheduled_date: new Date().toISOString(),
            status: 'pending',
            visit_token: visitToken,
        };

        try {
            const response = await Http.post('/patient/create/visit', payload);

            if (response.status === 200 || response.status === 201) {
                Notiflix.Notify.success(
                    response.data?.message || 'Patient assigned successfully',
                );
                setTimeout(() => {
                    setShowAssignModal(false);
                    resetSelections();
                    router.reload();
                }, 1200);
            } else {
                Notiflix.Notify.warning(
                    response.data?.message || 'Unexpected response',
                );
                setLoading(false);
            }
        } catch (err: any) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to assign visit';
            setError(msg);
            Notiflix.Notify.failure(msg);
            setLoading(false);
        }
    };

    // ── Display helpers ──────────────────────────────────────────────────────
    const getInitials = (first?: string, last?: string) =>
        `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase();

    const calculateAge = (dob?: string) => {
        if (!dob) return '—';
        const today = new Date();
        const birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    if (!patient) return null;

    const age = patient?.date_of_birth
        ? calculateAge(patient.date_of_birth)
        : (patient?.age ?? '—');

    const fullName =
        patient.full_name ||
        `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() ||
        'Unknown Patient';

    const initials = getInitials(patient.first_name, patient.last_name);

    const statusColors: Record<string, string> = {
        active: 'bg-emerald-600 text-white',
        stable: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        discharged: 'bg-gray-50 text-gray-600 border-gray-200',
        admitted: 'bg-blue-50 text-blue-700 border-blue-200',
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    const statusColor =
        statusColors[patient?.status?.toLowerCase()] ||
        'bg-gray-50 text-gray-600 border-gray-200';

    return (
        <>
            <div className="border-b bg-white">
                <div className="px-6 py-5">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <Avatar className="h-16 w-16 border-2 border-blue-100 shadow-sm">
                                <AvatarImage src={profile} alt={fullName} />
                                <AvatarFallback className="bg-blue-600 text-lg font-semibold text-white">
                                    {initials || '?'}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Name & Info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="truncate text-xl font-semibold text-gray-900">
                                    {fullName}
                                </h1>
                                <Badge
                                    className={`${statusColor} border text-xs font-medium capitalize`}
                                >
                                    {patient.status || 'Active'}
                                </Badge>
                                {visitToken && (
                                    <Badge className="border border-purple-200 bg-purple-50 font-mono text-xs font-medium text-purple-700">
                                        Token: {visitToken}
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                                    <span>
                                        MRN: {patient.patient_number ?? '—'}
                                    </span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <UserCircle className="h-3.5 w-3.5 text-gray-400" />
                                    <span>
                                        NRC:{' '}
                                        {patient.nrc ??
                                            patient.id_number ??
                                            'Not provided'}
                                    </span>
                                </span>
                                {patient.room && (
                                    <span className="flex items-center gap-1.5">
                                        <Bed className="h-3.5 w-3.5 text-gray-400" />
                                        <span>Room: {patient.room}</span>
                                    </span>
                                )}
                                {patient.ward && (
                                    <span className="flex items-center gap-1.5">
                                        <Hospital className="h-3.5 w-3.5 text-gray-400" />
                                        <span>Ward: {patient.ward}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right side buttons */}
                        <div className="flex flex-shrink-0 items-center gap-3">
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={openAssignModal}
                                className="h-8 gap-1.5 px-3 text-xs font-bold text-blue-700"
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Assign to Department
                            </Button>

                            {patient.admission_date && (
                                <div className="text-right">
                                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                        <span>
                                            Admitted:{' '}
                                            {new Date(
                                                patient.admission_date,
                                            ).toLocaleDateString()}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="my-3 border-t border-gray-100" />

                    {/* Bottom row */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                                Demographics
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <Cake className="h-3.5 w-3.5 text-blue-400" />
                                    {age !== '—' ? `${age} yrs` : '—'}
                                </span>
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <User className="h-3.5 w-3.5 text-purple-400" />
                                    <span className="capitalize">
                                        {patient.sex ?? patient.gender ?? '—'}
                                    </span>
                                </span>
                                {patient.blood_group && (
                                    <span className="flex items-center gap-1.5 text-gray-700">
                                        <HeartPulse className="h-3.5 w-3.5 text-red-400" />
                                        <span className="font-medium">
                                            {patient.blood_group}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                                Contact
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <Phone className="h-3.5 w-3.5 text-green-500" />
                                    {patient.phone_number ??
                                        patient.phone ??
                                        'Not provided'}
                                </span>
                                {patient.email && (
                                    <span className="flex items-center gap-1.5 text-gray-700">
                                        <Mail className="h-3.5 w-3.5 text-blue-400" />
                                        <span className="max-w-[150px] truncate">
                                            {patient.email}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                                Insurance
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <Shield className="h-3.5 w-3.5 text-indigo-500" />
                                    {patient.insurance_provider ??
                                        'Not specified'}
                                </span>
                                {patient.insurance_number &&
                                    patient.insurance_number !==
                                        'Not specified' && (
                                        <span className="flex items-center gap-1.5 text-gray-700">
                                            <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                                            <span className="font-mono text-xs">
                                                {patient.insurance_number}
                                            </span>
                                        </span>
                                    )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                                Address
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <MapPin className="h-3.5 w-3.5 text-orange-400" />
                                    <span className="max-w-[200px] truncate">
                                        {patient.address ??
                                            patient.location ??
                                            'Not provided'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                Assign to Department Modal — self-contained
            ───────────────────────────────────────────────────────────── */}
            <Dialog
                open={showAssignModal}
                onOpenChange={(open) => {
                    setShowAssignModal(open);
                    if (!open) resetSelections();
                }}
            >
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
                        {/* ── Departments ── */}
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
                                            onValueChange={(v) =>
                                                setDepartmentFilter(
                                                    v as typeof departmentFilter,
                                                )
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
                                            {filteredDepartments.map((dept) => {
                                                const isActive =
                                                    dept.is_active !== false &&
                                                    dept.status !== 'inactive';
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
                                                            if (isActive) {
                                                                setSelectedDepartment(
                                                                    dept.id,
                                                                );
                                                                setError('');
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
                                                                    {deptName}
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
                                            })}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </div>

                        {/* ── Staff ── */}
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
                                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search staff..."
                                            className="h-9 pl-8 text-sm"
                                            value={staffSearch}
                                            onChange={(e) =>
                                                setStaffSearch(e.target.value)
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
                                                                    ?.split(' ')
                                                                    .map(
                                                                        (n) =>
                                                                            n[0],
                                                                    )
                                                                    .join('')
                                                                    .slice(
                                                                        0,
                                                                        2,
                                                                    )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-medium">
                                                                {person.name}
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

                        {/* ── Additional details ── */}
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
                                            {SERVICE_OPTIONS.map((item) => (
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
                                                        toggleService(item.id)
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
                                                onClick={() => setVisitType(1)}
                                                className={`cursor-pointer ${
                                                    visitType === 1
                                                        ? 'ring-2 ring-blue-500 ring-offset-2'
                                                        : ''
                                                } bg-green-600 text-white`}
                                            >
                                                New Visit
                                            </Badge>
                                            <Badge
                                                onClick={() => setVisitType(2)}
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
                                            onChange={(e) =>
                                                setPurposeOfVisit(
                                                    e.target.value,
                                                )
                                            }
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
                                setShowAssignModal(false);
                                resetSelections();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAssign} disabled={loading}>
                            {loading ? 'Assigning...' : 'Confirm Assignment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
