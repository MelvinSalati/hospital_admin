import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';
import {
    Search,
    Calendar,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    Loader2,
    PlayCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

interface Appointment {
    id: number;
    patient_name: string;
    patient_id: number;
    doctor_name: string;
    department: string;
    time: string;
    status: 'waiting' | 'in_progress' | 'completed' | 'missed';
}

export default function Appointments() {
    const [appointmentss, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const appointments = usePage().props.appointments as Appointment[];

    // 📅 Load today's appointments
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

    // 🔍 Filter
    const filtered = appointments.filter((a) =>
        a.patient_name.toLowerCase().includes(search.toLowerCase()),
    );

    // 🎨 Status Badge
    const StatusBadge = ({ status }: { status: Appointment['status'] }) => {
        const map: any = {
            waiting: 'bg-yellow-100 text-yellow-700',
            in_progress: 'bg-blue-100 text-blue-700',
            completed: 'bg-green-100 text-green-700',
            missed: 'bg-red-100 text-red-700',
        };

        return (
            <span className={`rounded px-2 py-1 text-xs ${map[status]}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

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

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Appointments', href: '' },
                { title: 'Today', href: '' },
            ]}
        >
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold">
                            <Calendar size={18} />
                            Today's Appointments
                        </h1>
                        <p className="text-sm text-gray-500">
                            Manage patient queue and consultations
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search
                        size={16}
                        className="absolute top-2.5 left-3 text-gray-400"
                    />
                    <input
                        className="w-full rounded-lg border py-2 pr-3 pl-10"
                        placeholder="Search patient..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                            <tr>
                                <th className="p-3 text-left">Patient</th>
                                <th>Doctor</th>
                                <th>Department</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center">
                                        <Loader2 className="mx-auto animate-spin" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-6 text-center text-gray-500"
                                    >
                                        No appointments found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((a) => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <User size={14} />
                                                <span>{a.patient_name}</span>
                                            </div>
                                        </td>

                                        <td>{a.doctor_name}</td>
                                        <td>{a.department}</td>

                                        <td>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {a.time}
                                            </div>
                                        </td>

                                        <td>
                                            <StatusBadge status={a.status} />
                                        </td>

                                        <td className="flex gap-2 p-2">
                                            {a.status === 'waiting' && (
                                                <button
                                                    onClick={() =>
                                                        startConsultation(a.id)
                                                    }
                                                    className="flex items-center gap-1 text-blue-600"
                                                >
                                                    <PlayCircle size={16} />
                                                    Start
                                                </button>
                                            )}

                                            {a.status === 'in_progress' && (
                                                <button
                                                    onClick={() =>
                                                        completeAppointment(
                                                            a.id,
                                                        )
                                                    }
                                                    className="flex items-center gap-1 text-green-600"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    Complete
                                                </button>
                                            )}

                                            {a.status !== 'completed' && (
                                                <button className="flex items-center gap-1 text-red-600">
                                                    <XCircle size={16} />
                                                    Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
