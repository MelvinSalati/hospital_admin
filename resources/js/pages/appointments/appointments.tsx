import { usePage } from '@inertiajs/react';
import {
    User,
    Clock,
    Stethoscope,
    Pill,
    FileText,
    Clipboard,
    AlertCircle,
    Calendar,
    RefreshCw,
    Target,
    Syringe,
    Scissors,
    Activity,
    Heart,
    Brain,
    Bone,
    Eye,
    Baby,
    Microscope,
    TestTube,
    CheckCircle2,
    XCircle,
    Calendar as CalendarIcon,
    PlayCircle,
    Edit,
    Save,
    X,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

// ============================================================================
// TYPES
// ============================================================================

interface Appointment {
    id: number;
    patient_id: number;
    patient_name: string;
    doctor_name: string;
    department: string;
    time: string;
    reason: string;
    status: 'waiting' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// 📅 Format time to human-readable format (e.g., "14:30" -> "2:30 PM")
const formatTimeToHumanReadable = (time: string): string => {
    if (!time) return 'N/A';

    try {
        if (time.match(/^\d{2}:\d{2}$/)) {
            const [hours, minutes] = time.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);

            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }

        const date = new Date(time);
        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }

        return time;
    } catch {
        return time;
    }
};

// 📅 Format date to readable format
const formatDate = (date: string): string => {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        }
        return date;
    } catch {
        return date;
    }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Appointments() {
    // ===== STATE =====
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<Appointment>>({});

    // Get initial data from server props
    const pageProps = usePage().props as { appointments?: Appointment[] };
    const initialAppointments = pageProps.appointments || [];

    // ===== FETCH APPOINTMENTS =====
    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const res = await Http.get('/api/appointments/today');
            setAppointments(res.data);
        } catch {
            Notiflix.Notify.failure('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    // ===== APPOINTMENT ACTIONS =====

    // ▶️ Start Consultation
    const startConsultation = async (id: number) => {
        try {
            await Http.post(`/appointments/${id}/start`);
            Notiflix.Notify.success('Consultation started');
            fetchAppointments();
        } catch {
            Notiflix.Notify.failure('Failed to start');
        }
    };

    // ✅ Complete
    const completeAppointment = async (id: number) => {
        try {
            await Http.post(`/api/appointments/${id}/complete`);
            Notiflix.Notify.success('Completed');
            fetchAppointments();
        } catch {
            Notiflix.Notify.failure('Failed');
        }
    };

    // ❌ Cancel
    const cancelAppointment = async (id: number) => {
        try {
            await Http.post(`/api/appointments/${id}/cancel`);
            Notiflix.Notify.success('Cancelled');
            fetchAppointments();
        } catch {
            Notiflix.Notify.failure('Failed to cancel');
        }
    };

    // ✏️ Start Editing
    const startEditing = (appointment: Appointment) => {
        setEditingId(appointment.id);
        setEditForm(appointment);
    };

    // 💾 Save Edit
    const saveEdit = async () => {
        if (!editingId || !editForm) return;

        try {
            await Http.put(`/api/appointments/${editingId}`, editForm);
            Notiflix.Notify.success('Appointment updated successfully');
            setEditingId(null);
            setEditForm({});
            fetchAppointments();
        } catch (error: any) {
            Notiflix.Notify.failure(
                error.response?.data?.message || 'Failed to update appointment',
            );
        }
    };

    // ❌ Cancel Edit
    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    // 🔄 Handle form field changes
    const handleEditChange = (field: keyof Appointment, value: any) => {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // ===== TABLE COLUMNS =====

    const columns: Column<Appointment>[] = [
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => {
                if (editingId === row.id) {
                    return (
                        <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-400" />
                            <input
                                type="text"
                                value={editForm.patient_name || ''}
                                onChange={(e) =>
                                    handleEditChange(
                                        'patient_name',
                                        e.target.value,
                                    )
                                }
                                className="rounded border px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                            <User size={14} />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800">
                                {value}
                            </span>
                            <div className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-slate-800">
                                ID: {row.patient_id}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'doctor_name',
            label: 'Doctor',
            sortable: true,
            format: (value, row) => {
                if (editingId === row.id) {
                    return (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editForm.doctor_name || ''}
                                onChange={(e) =>
                                    handleEditChange(
                                        'doctor_name',
                                        e.target.value,
                                    )
                                }
                                className="rounded border px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
                            <span className="text-xs font-medium">
                                {typeof value === 'string'
                                    ? value.charAt(0).toUpperCase()
                                    : 'D'}
                            </span>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                            {value}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'department',
            label: 'Department',
            sortable: true,
            format: (value, row) => {
                if (editingId === row.id) {
                    return (
                        <input
                            type="text"
                            value={editForm.department || ''}
                            onChange={(e) =>
                                handleEditChange('department', e.target.value)
                            }
                            className="rounded border px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                    );
                }
                const deptColors: Record<string, string> = {
                    cardiology: 'bg-rose-100 text-rose-700',
                    dermatology: 'bg-fuchsia-100 text-fuchsia-700',
                    emergency: 'bg-red-100 text-red-700',
                    endocrinology: 'bg-amber-100 text-amber-700',
                    gastroenterology: 'bg-orange-100 text-orange-700',
                    general: 'bg-gray-100 text-gray-700',
                    neurology: 'bg-cyan-100 text-cyan-700',
                    obstetrics: 'bg-pink-100 text-pink-700',
                    oncology: 'bg-purple-100 text-purple-700',
                    ophthalmology: 'bg-blue-100 text-blue-700',
                    orthopedics: 'bg-indigo-100 text-indigo-700',
                    pediatrics: 'bg-green-100 text-green-700',
                    psychiatry: 'bg-violet-100 text-violet-700',
                    radiology: 'bg-sky-100 text-sky-700',
                    surgery: 'bg-slate-100 text-slate-700',
                    urology: 'bg-teal-100 text-teal-700',
                    pharmacy: 'bg-emerald-100 text-emerald-700',
                    laboratory: 'bg-yellow-100 text-yellow-700',
                };

                const deptKey = (value as string)?.toLowerCase() || 'general';
                const colorClass =
                    deptColors[deptKey] || 'bg-gray-100 text-gray-700';

                return (
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}
                    >
                        {value || 'General'}
                    </span>
                );
            },
        },
        {
            id: 'time',
            label: 'Time',
            sortable: true,
            format: (value, row) => {
                if (editingId === row.id) {
                    return (
                        <input
                            type="time"
                            value={editForm.time || ''}
                            onChange={(e) =>
                                handleEditChange('time', e.target.value)
                            }
                            className="rounded border px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                    );
                }
                return (
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-slate-100 p-1.5">
                            <Clock size={14} className="text-slate-600" />
                        </div>
                        <div>
                            <span className="font-mono text-sm font-semibold text-slate-800">
                                {formatTimeToHumanReadable(value)}
                            </span>
                            <div className="text-xs text-slate-400">
                                {formatDate(new Date().toISOString())}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'reason',
            label: 'Reason',
            sortable: true,
            format: (value, row) => {
                if (editingId === row.id) {
                    return (
                        <select
                            value={editForm.reason || ''}
                            onChange={(e) =>
                                handleEditChange('reason', e.target.value)
                            }
                            className="rounded border px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="check-up">Check-up</option>
                            <option value="follow-up">Follow-up</option>
                            <option value="consultation">Consultation</option>
                            <option value="emergency">Emergency</option>
                            <option value="annual">Annual</option>
                            <option value="routine">Routine</option>
                            <option value="specialist">Specialist</option>
                            <option value="surgery">Surgery</option>
                            <option value="vaccination">Vaccination</option>
                            <option value="pharmacy">Pharmacy</option>
                            <option value="laboratory">Laboratory</option>
                            <option value="lab">Lab Test</option>
                            <option value="cardiology">Cardiology</option>
                            <option value="neurology">Neurology</option>
                            <option value="orthopedics">Orthopedics</option>
                            <option value="ophthalmology">Ophthalmology</option>
                            <option value="pediatrics">Pediatrics</option>
                        </select>
                    );
                }

                const reasonConfig: Record<
                    string,
                    { icon: JSX.Element; color: string; label: string }
                > = {
                    'check-up': {
                        icon: <Stethoscope size={14} />,
                        color: 'bg-emerald-100 text-emerald-700',
                        label: 'Check-up',
                    },
                    'follow-up': {
                        icon: <Clipboard size={14} />,
                        color: 'bg-blue-100 text-blue-700',
                        label: 'Follow-up',
                    },
                    consultation: {
                        icon: <Activity size={14} />,
                        color: 'bg-purple-100 text-purple-700',
                        label: 'Consultation',
                    },
                    emergency: {
                        icon: <AlertCircle size={14} />,
                        color: 'bg-red-100 text-red-700',
                        label: 'Emergency',
                    },
                    annual: {
                        icon: <Calendar size={14} />,
                        color: 'bg-amber-100 text-amber-700',
                        label: 'Annual',
                    },
                    routine: {
                        icon: <RefreshCw size={14} />,
                        color: 'bg-cyan-100 text-cyan-700',
                        label: 'Routine',
                    },
                    specialist: {
                        icon: <Target size={14} />,
                        color: 'bg-fuchsia-100 text-fuchsia-700',
                        label: 'Specialist',
                    },
                    surgery: {
                        icon: <Scissors size={14} />,
                        color: 'bg-rose-100 text-rose-700',
                        label: 'Surgery',
                    },
                    vaccination: {
                        icon: <Syringe size={14} />,
                        color: 'bg-green-100 text-green-700',
                        label: 'Vaccination',
                    },
                    pharmacy: {
                        icon: <Pill size={14} />,
                        color: 'bg-emerald-100 text-emerald-700',
                        label: 'Pharmacy',
                    },
                    laboratory: {
                        icon: <Microscope size={14} />,
                        color: 'bg-yellow-100 text-yellow-700',
                        label: 'Laboratory',
                    },
                    lab: {
                        icon: <TestTube size={14} />,
                        color: 'bg-amber-100 text-amber-700',
                        label: 'Lab Test',
                    },
                    cardiology: {
                        icon: <Heart size={14} />,
                        color: 'bg-rose-100 text-rose-700',
                        label: 'Cardiology',
                    },
                    neurology: {
                        icon: <Brain size={14} />,
                        color: 'bg-cyan-100 text-cyan-700',
                        label: 'Neurology',
                    },
                    orthopedics: {
                        icon: <Bone size={14} />,
                        color: 'bg-indigo-100 text-indigo-700',
                        label: 'Orthopedics',
                    },
                    ophthalmology: {
                        icon: <Eye size={14} />,
                        color: 'bg-blue-100 text-blue-700',
                        label: 'Ophthalmology',
                    },
                    pediatrics: {
                        icon: <Baby size={14} />,
                        color: 'bg-green-100 text-green-700',
                        label: 'Pediatrics',
                    },
                };

                const key = (value as string)?.toLowerCase() || '';
                const config = reasonConfig[key] || {
                    icon: <FileText size={14} />,
                    color: 'bg-gray-100 text-gray-700',
                    label: value || 'N/A',
                };

                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                waiting: 'warning',
                in_progress: 'info',
                completed: 'success',
                missed: 'error',
                cancelled: 'error',
            },
            format: (value, row) => {
                if (editingId === row.id) {
                    return (
                        <select
                            value={editForm.status || ''}
                            onChange={(e) =>
                                handleEditChange('status', e.target.value)
                            }
                            className="rounded border px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="waiting">Waiting</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="missed">Missed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    );
                }

                const statusConfig: Record<
                    string,
                    { label: string; color: string; icon: JSX.Element }
                > = {
                    waiting: {
                        label: 'Waiting',
                        color: 'bg-amber-100 text-amber-700',
                        icon: <Clock size={14} />,
                    },
                    in_progress: {
                        label: 'In Progress',
                        color: 'bg-blue-100 text-blue-700',
                        icon: <Activity size={14} />,
                    },
                    completed: {
                        label: 'Completed',
                        color: 'bg-emerald-100 text-emerald-700',
                        icon: <CheckCircle2 size={14} />,
                    },
                    missed: {
                        label: 'Missed',
                        color: 'bg-rose-100 text-rose-700',
                        icon: <XCircle size={14} />,
                    },
                    cancelled: {
                        label: 'Cancelled',
                        color: 'bg-gray-100 text-gray-700',
                        icon: <XCircle size={14} />,
                    },
                };

                const config = statusConfig[value as string] || {
                    label: value || 'Unknown',
                    color: 'bg-gray-100 text-gray-700',
                    icon: <FileText size={14} />,
                };

                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
        },
    ];

    // ===== TABLE ACTIONS =====

    const actions: Action<Appointment>[] = [
        {
            label: 'Edit',
            icon: <Edit size={16} />,
            color: 'primary',
            show: (row) => editingId !== row.id,
            onClick: (row) => startEditing(row),
        },
        {
            label: 'Save',
            icon: <Save size={16} />,
            color: 'success',
            show: (row) => editingId === row.id,
            onClick: () => saveEdit(),
        },
        {
            label: 'Cancel',
            icon: <X size={16} />,
            color: 'error',
            show: (row) => editingId === row.id,
            onClick: () => cancelEdit(),
        },
        {
            label: 'Start',
            icon: <PlayCircle size={16} />,
            color: 'info',
            show: (row) => row.status === 'waiting' && editingId !== row.id,
            onClick: (row) => startConsultation(row.id),
        },
        {
            label: 'Complete',
            icon: <CheckCircle2 size={16} />,
            color: 'success',
            show: (row) => row.status === 'in_progress' && editingId !== row.id,
            onClick: (row) => completeAppointment(row.id),
        },
        {
            label: 'Cancel',
            icon: <XCircle size={16} />,
            color: 'error',
            show: (row) =>
                row.status !== 'completed' &&
                row.status !== 'cancelled' &&
                editingId !== row.id,
            onClick: (row) => cancelAppointment(row.id),
        },
    ];

    // ===== STATUS OPTIONS =====

    const statusOptions = [
        { value: 'waiting', label: 'Waiting' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'missed', label: 'Missed' },
    ];

    // ===== RENDER =====

    const displayData =
        appointments.length > 0 ? appointments : initialAppointments;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Appointments', href: '/reception/appointments' },
            ]}
        >
            <div className="h-full bg-blue-50 p-4">
                <PageHeader
                    icon={<CalendarIcon className="h-6 w-6" />}
                    title="Appointments"
                    subtitle="Manage patient queue and consultations. Track all appointments for today."
                />

                {/* Reusable Table */}
                <div className="mt-6">
                    <ReusableTable
                        title="Today's Appointments"
                        columns={columns}
                        data={displayData}
                        actions={actions}
                        loading={loading}
                        filterPlaceholder="Search by patient name..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        defaultOrderBy="time"
                        emptyMessage="No appointments found for today"
                        className="shadow-sm"
                    />
                </div>
            </div>
        </AppLayout>
    );
}
