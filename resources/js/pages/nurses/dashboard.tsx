// pages/nurses/dashboard.tsx

import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import {
    Users,
    Clock,
    UserCheck,
    Activity,
    HeartPulse,
    Thermometer,
    Pill,
    Stethoscope,
    TrendingUp,
    Calendar,
    ArrowUp,
    ArrowDown,
    Eye,
    Phone,
    User,
    Bed,
    AlertTriangle,
    CheckCircle,
    Clock as ClockIcon,
    FileText,
    Plus,
    Bell,
} from 'lucide-react';
// import { StatCard } from '@/components/dashboard/cards/StatCard';
import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface NurseDashboardProps {
    stats?: {
        total_patients: number;
        active_patients: number;
        pending_admissions: number;
        today_visits: number;
        vitals_taken: number;
        admissions_today: number;
        discharged_today: number;
        critical_patients: number;
        stable_patients: number;
    };
    recentPatients?: Array<{
        id: number;
        name: string;
        token: string;
        status: string;
        admitted_at: string;
        room?: string;
        vitals?: {
            bp: string;
            hr: number;
            temp: number;
            spo2: number;
        };
    }>;
    recentVitals?: Array<{
        id: number;
        patient_name: string;
        blood_pressure: string;
        heart_rate: number;
        temperature: number;
        oxygen_saturation: number;
        recorded_at: string;
        status: string;
    }>;
    notifications?: Array<{
        id: number;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'success' | 'danger';
        time: string;
        read: boolean;
    }>;
}

// ============================================================================
// Sub-Components
// ============================================================================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string; bg: string }> = {
        admitted: { label: 'Admitted', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
        stable: { label: 'Stable', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' },
        critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30 dark:text-red-400' },
        discharged: { label: 'Discharged', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800 dark:text-slate-400' },
        pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
        in_progress: { label: 'In Progress', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400' },
    };

    const cfg = config[status] || config.pending;
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            <span className={`mr-1 h-1.5 w-1.5 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
            {cfg.label}
        </span>
    );
};

const VitalsIndicator: React.FC<{ value: number; threshold: number; label: string }> = ({ value, threshold, label }) => {
    const isWarning = value > threshold;
    return (
        <span className={`text-sm font-medium ${isWarning ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {value}
            {isWarning && <AlertTriangle className="ml-1 inline h-3 w-3" />}
        </span>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function NurseDashboard() {
    const { props } = usePage();
    const dashboardData = props as NurseDashboardProps;

    // Mock data - replace with actual props from controller
    const stats = dashboardData.stats || {
        total_patients: 156,
        active_patients: 42,
        pending_admissions: 8,
        today_visits: 27,
        vitals_taken: 34,
        admissions_today: 12,
        discharged_today: 5,
        critical_patients: 3,
        stable_patients: 28,
    };

    const recentPatients = dashboardData.recentPatients || [
        { id: 1, name: 'John Doe', token: 'T-1001', status: 'critical', admitted_at: '10:30 AM', room: 'ICU - Bed 4', vitals: { bp: '150/95', hr: 102, temp: 38.5, spo2: 92 } },
        { id: 2, name: 'Jane Smith', token: 'T-1002', status: 'stable', admitted_at: '09:15 AM', room: 'Ward 1 - Bed 2', vitals: { bp: '120/80', hr: 72, temp: 36.8, spo2: 98 } },
        { id: 3, name: 'Robert Johnson', token: 'T-1003', status: 'in_progress', admitted_at: '08:45 AM', room: 'Ward 3 - Bed 6', vitals: { bp: '135/85', hr: 88, temp: 37.2, spo2: 96 } },
        { id: 4, name: 'Maria Garcia', token: 'T-1004', status: 'stable', admitted_at: '07:30 AM', room: 'Ward 2 - Bed 8', vitals: { bp: '118/75', hr: 68, temp: 36.5, spo2: 99 } },
        { id: 5, name: 'David Wilson', token: 'T-1005', status: 'admitted', admitted_at: '06:45 AM', room: 'Ward 4 - Bed 3', vitals: { bp: '125/82', hr: 76, temp: 36.9, spo2: 97 } },
    ];

    const recentVitals = dashboardData.recentVitals || [
        { id: 1, patient_name: 'John Doe', blood_pressure: '150/95', heart_rate: 102, temperature: 38.5, oxygen_saturation: 92, recorded_at: '10:30 AM', status: 'critical' },
        { id: 2, patient_name: 'Jane Smith', blood_pressure: '120/80', heart_rate: 72, temperature: 36.8, oxygen_saturation: 98, recorded_at: '09:15 AM', status: 'stable' },
        { id: 3, patient_name: 'Robert Johnson', blood_pressure: '135/85', heart_rate: 88, temperature: 37.2, oxygen_saturation: 96, recorded_at: '08:45 AM', status: 'warning' },
        { id: 4, patient_name: 'Maria Garcia', blood_pressure: '118/75', heart_rate: 68, temperature: 36.5, oxygen_saturation: 99, recorded_at: '07:30 AM', status: 'stable' },
    ];

    const notifications = dashboardData.notifications || [
        { id: 1, title: 'Critical Vital Alert', message: 'John Doe - BP: 150/95, HR: 102, Temp: 38.5°C', type: 'danger', time: '5 min ago', read: false },
        { id: 2, title: 'New Admission', message: 'David Wilson admitted to Ward 4 - Bed 3', type: 'success', time: '15 min ago', read: false },
        { id: 3, title: 'Medication Reminder', message: 'Jane Smith due for medication in 30 minutes', type: 'warning', time: '25 min ago', read: false },
        { id: 4, title: 'Lab Results Available', message: 'John Doe - Blood test results ready', type: 'info', time: '45 min ago', read: false },
        { id: 5, title: 'Discharge Request', message: 'Maria Garcia - Discharge clearance requested', type: 'success', time: '1 hour ago', read: true },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Nurses', href: '/nurses' },
                { title: 'Dashboard', href: '/nurses/dashboard' },
            ]}
        >
            <Head title="Nurse Dashboard" />
 <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-3 dark:bg-slate-900">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            👩‍⚕️ Nurse Dashboard
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Patient care overview and vitals monitoring
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-slate-800">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                {/* Quick Stats */}
                {/* <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard title="Total Patients" value={stats.total_patients} icon={Users} colorScheme="purple" />
                    <StatCard title="Active" value={stats.active_patients} icon={Activity} colorScheme="blue" />
                    <StatCard title="Pending Admissions" value={stats.pending_admissions} icon={UserCheck} colorScheme="amber" />
                    <StatCard title="Today's Visits" value={stats.today_visits} icon={Calendar} colorScheme="green" />
                    <StatCard title="Critical" value={stats.critical_patients} icon={AlertTriangle} colorScheme="red" />
                </div> */}

                {/* Stats Row 2 */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-950/30">
                                <HeartPulse className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">Vitals Taken</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.vitals_taken}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-emerald-100 p-1.5 dark:bg-emerald-950/30">
                                <UserCheck className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">Admissions</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.admissions_today}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-amber-100 p-1.5 dark:bg-amber-950/30">
                                <ArrowUp className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">Discharged</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.discharged_today}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-indigo-100 p-1.5 dark:bg-indigo-950/30">
                                <Bed className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">Occupied Beds</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.active_patients}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {/* Recent Patients - Compact */}
                    <div className="lg:col-span-2">
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-slate-500" />
                                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Recent Patients</h3>
                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                        {recentPatients.length}
                                    </span>
                                </div>
                                <button className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[8px] uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                        <tr>
                                            <th className="px-2 py-1 text-left">Patient</th>
                                            <th className="px-2 py-1 text-left">Token</th>
                                            <th className="px-2 py-1 text-center">Vitals</th>
                                            <th className="px-2 py-1 text-center">Status</th>
                                            <th className="px-2 py-1 text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-700/50">
                                        {recentPatients.slice(0, 5).map((patient) => (
                                            <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-2 py-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                                            <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200">
                                                            {patient.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-[8px] text-slate-400">{patient.room}</div>
                                                </td>
                                                <td className="px-2 py-1 font-mono text-[9px] text-blue-600 dark:text-blue-400">
                                                    {patient.token}
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-[9px]">
                                                        <span className="text-slate-500">BP</span>
                                                        <span className="font-medium">{patient.vitals?.bp}</span>
                                                        <span className="text-slate-300">|</span>
                                                        <span className="text-slate-500">HR</span>
                                                        <span className={`font-medium ${(patient.vitals?.hr || 0) > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {patient.vitals?.hr}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <StatusBadge status={patient.status} />
                                                </td>
                                                <td className="px-2 py-1 text-right text-[9px] text-slate-400">
                                                    {patient.admitted_at}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="lg:col-span-1">
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                            <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-slate-500" />
                                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
                                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        {notifications.filter(n => !n.read).length}
                                    </span>
                                </div>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto">
                                {notifications.slice(0, 5).map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`border-b border-slate-100 p-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 ${
                                            !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                                                notification.type === 'danger' ? 'bg-red-500' :
                                                notification.type === 'warning' ? 'bg-amber-500' :
                                                notification.type === 'success' ? 'bg-emerald-500' :
                                                'bg-blue-500'
                                            }`} />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-medium text-slate-800 dark:text-slate-200">
                                                    {notification.title}
                                                    {!notification.read && <span className="ml-1 inline-block h-1 w-1 rounded-full bg-blue-500" />}
                                                </p>
                                                <p className="text-[9px] text-slate-600 dark:text-slate-400">{notification.message}</p>
                                                <p className="mt-0.5 text-[8px] text-slate-400 dark:text-slate-500">{notification.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {notifications.length > 5 && (
                                <div className="border-t border-slate-200 px-3 py-1.5 text-center dark:border-slate-700">
                                    <button className="text-[9px] text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Vitals - Compact */}
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <HeartPulse className="h-4 w-4 text-slate-500" />
                            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Recent Vitals</h3>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                {recentVitals.length}
                            </span>
                        </div>
                        <button className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[8px] uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-2 py-1 text-left">Patient</th>
                                    <th className="px-2 py-1 text-center">BP</th>
                                    <th className="px-2 py-1 text-center">HR</th>
                                    <th className="px-2 py-1 text-center">Temp</th>
                                    <th className="px-2 py-1 text-center">SpO₂</th>
                                    <th className="px-2 py-1 text-center">Status</th>
                                    <th className="px-2 py-1 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-700/50">
                                {recentVitals.map((vital) => (
                                    <tr key={vital.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-2 py-1 text-[10px] font-medium text-slate-800 dark:text-slate-200">
                                            {vital.patient_name}
                                        </td>
                                        <td className="px-2 py-1 text-center text-[10px] text-slate-600 dark:text-slate-400">
                                            {vital.blood_pressure}
                                        </td>
                                        <td className="px-2 py-1 text-center">
                                            <span className={`text-[10px] font-medium ${vital.heart_rate > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {vital.heart_rate}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1 text-center text-[10px] text-slate-600 dark:text-slate-400">
                                            {vital.temperature}°C
                                        </td>
                                        <td className="px-2 py-1 text-center">
                                            <span className={`text-[10px] font-medium ${vital.oxygen_saturation < 95 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {vital.oxygen_saturation}%
                                            </span>
                                        </td>
                                        <td className="px-2 py-1 text-center">
                                            <StatusBadge status={vital.status} />
                                        </td>
                                        <td className="px-2 py-1 text-right text-[9px] text-slate-400">
                                            {vital.recorded_at}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}