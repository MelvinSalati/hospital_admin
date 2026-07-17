// pages/nurses/index.tsx

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Link, usePage, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Users,
    Eye,
    Clock,
    Phone,
    Search,
    CheckCircle,
    Activity,
    UserCheck,
    Loader2,
    ChevronLeft,
    ChevronRight,
    User,
    CreditCard,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState, useMemo } from 'react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';

// ============================================================================
// Types
// ============================================================================

interface QueuePatient {
    id: number;
    token: string;
    patient_id: number;
    patient_name: string;
    contact: string;
    gender: string;
    payment_method: string;
    original_payment_method: string;
    status: number | string;
    registered_at: string;
    assigned_department: string;
    assigned_staff: string;
    visit_status: string;
    priority: string;
    department_id: number;
}

interface Stats {
    total_in_queue: number;
    pending_assignment: number;
    assigned_today: number;
}

interface Props {
    queue: QueuePatient[];
    stats: Stats;
}

// ============================================================================
// Ultra Compact Sub-Components
// ============================================================================

// Ultra Compact Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string; bg: string }> =
        {
            pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            active: { label: 'Active', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            in_progress: { label: 'In Prog', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
            completed: { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
        };
    const cfg = config[status] || config.pending;

    return (
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[7px] font-medium ${cfg.bg} ${cfg.color}`}>
            <span className={`h-1 w-1 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
            {cfg.label}
        </span>
    );
};

// Ultra Compact Priority Badge
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
    const config: Record<string, { label: string; color: string; bg: string }> =
        {
            routine: { label: 'Routine', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            urgent: { label: 'Urgent', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
            emergency: { label: 'Emerg', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
            stat: { label: 'STAT', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
        };
    const cfg = config[priority] || config.routine;

    return (
        <span className={`inline-flex items-center rounded px-1 py-0.5 text-[6px] font-medium ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
        </span>
    );
};

// Ultra Compact Payment Badge
const PaymentBadge: React.FC<{ method: string }> = ({ method }) => {
    if (!method || method === 'Not specified') {
        return <span className="text-[6px] text-slate-400">—</span>;
    }

    const config: Record<string, { label: string; color: string; bg: string }> =
        {
            cash: { label: 'Cash', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            nhima: { label: 'NHIMA', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            insurance: { label: 'Ins', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
            charity: { label: 'Charity', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
            mobile_money: { label: 'Mobile', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
            card: { label: 'Card', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
            altaf: { label: 'Altaf', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
        };
    const cfg = config[method.toLowerCase()] || {
        label: method,
        color: 'text-slate-600',
        bg: 'bg-slate-50 dark:bg-slate-800',
    };

    return (
        <span className={`inline-flex items-center rounded px-1 py-0.5 text-[6px] font-medium ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
        </span>
    );
};

// Ultra Compact Patient Avatar
const PatientAvatar: React.FC<{ name: string }> = ({ name }) => {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[8px] font-medium text-white shadow-sm">
            {initials || '?'}
        </div>
    );
};

// Ultra Compact Stat Card
const StatCard: React.FC<{ icon: any; label: string; value: number }> = ({
    icon: Icon,
    label,
    value,
}) => {
    const colors: Record<string, string> = {
        Queue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
        Pending: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
        Assigned: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    };

    return (
        <div className={`rounded px-1.5 py-0.5 text-center ${colors[label as keyof typeof colors] || colors.Queue}`}>
            <div className="flex items-center justify-center gap-0.5 text-[7px] font-medium uppercase">
                <Icon className="h-2.5 w-2.5" />
                {label}
            </div>
            <p className="text-xs font-bold">{value}</p>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function Nurses() {
    const { props } = usePage<{ props: Props }>();
    const queues: QueuePatient[] = props.queue || [];
    const stats: Stats = props.stats || {
        total_in_queue: 0,
        pending_assignment: 0,
        assigned_today: 0,
    };

    const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Normalize status
    const normalizeStatus = (status: number | string | undefined): string => {
        if (!status) return 'pending';
        if (typeof status === 'number') {
            const statusMap: Record<number, string> = {
                0: 'cancelled',
                1: 'active',
                2: 'pending',
                3: 'in_progress',
                4: 'completed',
            };
            return statusMap[status] || 'pending';
        }
        return status.toLowerCase();
    };

    // Process queue data
    const processedQueue = useMemo(() => {
        return queues.map((patient) => ({
            ...patient,
            token: patient.token || `T-${String(patient.id).padStart(4, '0')}`,
            payment_method: patient.payment_method || patient.original_payment_method || 'Not specified',
            contact: patient.contact || 'N/A',
            gender: patient.gender || 'N/A',
            visit_status: normalizeStatus(patient.visit_status || patient.status),
            priority: patient.priority || 'routine',
        }));
    }, [queues]);

    // Filter patients
    const filteredPatients = useMemo(() => {
        let filtered = [...processedQueue];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.patient_name?.toLowerCase().includes(term) ||
                    p.token?.toLowerCase().includes(term) ||
                    p.contact?.includes(term)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter((p) => p.visit_status === statusFilter);
        }

        return filtered;
    }, [processedQueue, searchTerm, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const paginatedPatients = filteredPatients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const formatTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleViewDetails = (patient: QueuePatient) => {
        setSelectedPatient(patient);
        setShowDetailsModal(true);
    };

    const handleStatusUpdate = async (patientId: number, newStatus: string) => {
        setLoading(true);
        Notiflix.Loading.pulse('Updating...');

        try {
            const response = await Http.post(`/nurses/queue/${patientId}/status`, { status: newStatus });
            if (response.data.success) {
                Notiflix.Loading.remove();
                Notiflix.Notify.success(`Status updated to ${newStatus}`);
                router.reload();
            } else {
                Notiflix.Loading.remove();
                Notiflix.Notify.failure(response.data.message || 'Failed to update status');
            }
        } catch (error: any) {
            Notiflix.Loading.remove();
            Notiflix.Notify.failure(error.response?.data?.message || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { href: '', title: 'Department' },
                { href: '', title: 'Nurses Bay' },
            ]}
        >
            <div className="flex h-full min-h-screen flex-1 flex-col gap-1.5 bg-slate-50 p-1.5 dark:bg-slate-900">
                {/* Ultra Compact Header */}
                <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                        <Link href="/dashboard">
                            <Button variant="outline" size="icon" className="h-5 w-5">
                                <ArrowLeft size={10} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-[10px] font-bold text-slate-800 dark:text-slate-100">
                                Nurses Bay
                            </h1>
                            <p className="text-[6px] text-slate-500 dark:text-slate-400">
                                Manage patient queue
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-[7px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" />
                            {stats.total_in_queue || 0}
                        </span>
                        <span className="h-2.5 w-px bg-slate-300 dark:bg-slate-600" />
                        <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {stats.pending_assignment || 0}
                        </span>
                    </div>
                </div>

                {/* Ultra Compact Stats */}
                <div className="grid grid-cols-3 gap-1">
                    <StatCard icon={Users} label="Queue" value={stats.total_in_queue || 0} />
                    <StatCard icon={Clock} label="Pending" value={stats.pending_assignment || 0} />
                    <StatCard icon={UserCheck} label="Assigned" value={stats.assigned_today || 0} />
                </div>

                {/* Ultra Compact Search & Filter */}
                <div className="flex flex-wrap items-center gap-0.5 rounded border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="relative flex-1 min-w-[80px]">
                        <Search className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-5 w-full rounded border border-slate-200 pl-5 pr-1 text-[7px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="h-5 rounded border border-slate-200 px-1 text-[6px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Prog</option>
                        <option value="completed">Done</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setCurrentPage(1);
                        }}
                        className="h-5 rounded border border-slate-200 px-1.5 text-[6px] hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                    >
                        Clear
                    </button>
                </div>

                {/* Ultra Compact Table */}
                <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[6px] uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-1 py-0.5 text-left">Token</th>
                                    <th className="px-1 py-0.5 text-left">Patient</th>
                                    <th className="px-1 py-0.5 text-center">Pri</th>
                                    <th className="px-1 py-0.5 text-center">Status</th>
                                    <th className="px-1 py-0.5 text-center">Time</th>
                                    <th className="px-1 py-0.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[7px] dark:divide-slate-700/50">
                                {paginatedPatients.length > 0 ? (
                                    paginatedPatients.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-1 py-0.5">
                                                <span className="font-mono text-[7px] font-bold text-blue-600 dark:text-blue-400">
                                                    {p.token}
                                                </span>
                                            </td>
                                            <td className="px-1 py-0.5">
                                                <div className="flex items-center gap-1">
                                                    <PatientAvatar name={p.patient_name} />
                                                    <div>
                                                        <div className="text-[7px] font-medium text-slate-800 dark:text-slate-200">
                                                            {p.patient_name}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-0.5 text-[5px] text-slate-500 dark:text-slate-400">
                                                            <Phone className="h-1.5 w-1.5" />
                                                            <span className="max-w-[40px] truncate">{p.contact}</span>
                                                            <span className="text-slate-300 dark:text-slate-600">|</span>
                                                            <PaymentBadge method={p.payment_method} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-1 py-0.5 text-center">
                                                <PriorityBadge priority={p.priority} />
                                            </td>
                                            <td className="px-1 py-0.5 text-center">
                                                <StatusBadge status={p.visit_status} />
                                            </td>
                                            <td className="px-1 py-0.5 text-center text-[6px] text-slate-500 dark:text-slate-400">
                                                {formatTime(p.registered_at)}
                                            </td>
                                            <td className="px-1 py-0.5 text-right">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <Link
                                                        href={`/patients/admissions/${p.patient_id}`}
                                                        className="rounded bg-blue-600 px-1 py-0.5 text-[6px] font-medium text-white transition-colors hover:bg-blue-700"
                                                    >
                                                        Admit
                                                    </Link>
                                                    <Link
                                                        href={`/patients/vital-signs/create/${p.patient_id}`}
                                                        className="rounded bg-slate-700 px-1 py-0.5 text-[6px] font-medium text-white transition-colors hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500"
                                                    >
                                                        VS
                                                    </Link>
                                                    <button
                                                        onClick={() => handleViewDetails(p)}
                                                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700"
                                                        title="View"
                                                    >
                                                        <Eye className="h-2.5 w-2.5" />
                                                    </button>
                                                    {p.visit_status === 'in_progress' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(p.id, 'completed')}
                                                            disabled={loading}
                                                            className="rounded bg-emerald-600 px-1 py-0.5 text-[6px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                                        >
                                                            Done
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-1 py-4 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Users className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                                                <p className="text-[7px] text-slate-500 dark:text-slate-400">
                                                    No patients
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Ultra Compact Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-1 py-0.5 dark:border-slate-700">
                            <p className="text-[6px] text-slate-500 dark:text-slate-400">
                                {filteredPatients.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
                                {Math.min(currentPage * itemsPerPage, filteredPatients.length)}
                            </p>
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="rounded border border-slate-200 p-0.5 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-700"
                                >
                                    <ChevronLeft className="h-2.5 w-2.5" />
                                </button>
                                <span className="text-[6px] text-slate-600 dark:text-slate-400">
                                    {currentPage}/{totalPages}
                                </span>
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="rounded border border-slate-200 p-0.5 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-700"
                                >
                                    <ChevronRight className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Patient Details Modal - Ultra Compact */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xs">Patient Details</DialogTitle>
                    </DialogHeader>
                    {selectedPatient && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-[8px] text-slate-500">Patient</Label>
                                    <p className="text-[9px] font-medium">{selectedPatient.patient_name}</p>
                                </div>
                                <div>
                                    <Label className="text-[8px] text-slate-500">Token</Label>
                                    <p className="font-mono text-[9px] font-semibold">{selectedPatient.token}</p>
                                </div>
                                <div>
                                    <Label className="text-[8px] text-slate-500">Contact</Label>
                                    <p className="text-[9px]">{selectedPatient.contact}</p>
                                </div>
                                <div>
                                    <Label className="text-[8px] text-slate-500">Gender</Label>
                                    <p className="text-[9px] capitalize">{selectedPatient.gender}</p>
                                </div>
                                <div>
                                    <Label className="text-[8px] text-slate-500">Payment</Label>
                                    <PaymentBadge method={selectedPatient.payment_method} />
                                </div>
                                <div>
                                    <Label className="text-[8px] text-slate-500">Priority</Label>
                                    <PriorityBadge priority={selectedPatient.priority} />
                                </div>
                                <div>
                                    <Label className="text-[8px] text-slate-500">Status</Label>
                                    <StatusBadge status={selectedPatient.visit_status} />
                                </div>
                                <div>
                                    <Label className="text-[8px] text-slate-500">Arrived</Label>
                                    <p className="text-[9px]">{formatTime(selectedPatient.registered_at)}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-[8px] text-slate-500">Department</Label>
                                    <p className="text-[9px]">{selectedPatient.assigned_department}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-[8px] text-slate-500">Staff</Label>
                                    <p className="text-[9px]">{selectedPatient.assigned_staff}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button size="sm" className="h-6 text-[8px]" onClick={() => setShowDetailsModal(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}