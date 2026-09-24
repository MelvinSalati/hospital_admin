// resources/js/pages/nurses/dashboard.tsx

import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Bell,
    CalendarClock,
    CheckCircle2,
    ChevronRight,
    Clock3,
    ClipboardCheck,
    ClipboardList,
    HeartPulse,
    ListChecks,
    Pill,
    RefreshCw,
    Stethoscope,
    Thermometer,
    UserCheck,
    Users,
    UserRound,
    Weight,
    XCircle,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { ReactNode } from 'react';

interface DashboardStats {
    patients_waiting: number;
    patients_in_assessment: number;
    triage_queue: number;
    vital_signs_due: number;
    pending_tasks: number;
    medications_due: number;
    reassessments_due: number;
    abnormal_vitals: number;
    completed_encounters: number;
}

interface QueuePatient {
    id: number;
    patient_id: number;
    patient_name: string;
    mrn: string;
    visit_id: number;
    visit_number: string;
    reason: string;
    priority: 'routine' | 'moderate' | 'high' | 'urgent';
    workflow_status:
        | 'waiting'
        | 'triage'
        | 'assessment'
        | 'care'
        | 'reassessment';
    task?: string;
    due_at?: string;
    waiting_minutes?: number;
    age?: number;
    sex?: string;
}

interface ClinicalAlert {
    id: number;
    patient_id: number;
    patient_name: string;
    mrn: string;
    type: 'vital' | 'medication' | 'task' | 'clinical';
    severity: 'warning' | 'critical';
    message: string;
    detail?: string;
    created_at: string;
}

interface VitalDue {
    id: number;
    patient_id: number;
    patient_name: string;
    mrn: string;
    reason: string;
    due_at: string;
    overdue: boolean;
    minutes: number;
}

interface MedicationDue {
    id: number;
    patient_id: number;
    patient_name: string;
    medication: string;
    dose: string;
    route: string;
    due_at: string;
    status: 'due' | 'overdue' | 'upcoming';
}

interface NursingTask {
    id: number;
    patient_id: number;
    patient_name: string;
    task: string;
    priority: 'routine' | 'moderate' | 'high' | 'urgent';
    due_at?: string;
    overdue?: boolean;
}

interface Reassessment {
    id: number;
    patient_id: number;
    patient_name: string;
    mrn: string;
    assessment: string;
    due_at: string;
    overdue: boolean;
}

interface ActivitySummary {
    triage_completed: number;
    assessments_completed: number;
    procedures_completed: number;
    reassessments_completed: number;
    patients_educated: number;
}

interface NurseDashboardProps {
    stats?: DashboardStats;
    queue?: QueuePatient[];
    alerts?: ClinicalAlert[];
    vitalsDue?: VitalDue[];
    medicationsDue?: MedicationDue[];
    tasks?: NursingTask[];
    reassessments?: Reassessment[];
    activity?: ActivitySummary;
}

const defaultStats: DashboardStats = {
    patients_waiting: 12,
    patients_in_assessment: 4,
    triage_queue: 7,
    vital_signs_due: 6,
    pending_tasks: 9,
    medications_due: 5,
    reassessments_due: 3,
    abnormal_vitals: 3,
    completed_encounters: 38,
};

const defaultQueue: QueuePatient[] = [
    {
        id: 1,
        patient_id: 1001,
        patient_name: 'John Banda',
        mrn: 'MRN-001245',
        visit_id: 5001,
        visit_number: 'OPD-1024',
        reason: 'Fever and weakness',
        priority: 'urgent',
        workflow_status: 'triage',
        task: 'Triage',
        waiting_minutes: 18,
        age: 42,
        sex: 'Male',
    },
    {
        id: 2,
        patient_id: 1002,
        patient_name: 'Mary Phiri',
        mrn: 'MRN-001246',
        visit_id: 5002,
        visit_number: 'OPD-1025',
        reason: 'ANC follow-up',
        priority: 'high',
        workflow_status: 'waiting',
        task: 'Initial assessment',
        waiting_minutes: 14,
        age: 28,
        sex: 'Female',
    },
    {
        id: 3,
        patient_id: 1003,
        patient_name: 'Peter Zulu',
        mrn: 'MRN-001247',
        visit_id: 5003,
        visit_number: 'OPD-1026',
        reason: 'Wound dressing',
        priority: 'routine',
        workflow_status: 'care',
        task: 'Wound dressing',
        waiting_minutes: 7,
        age: 35,
        sex: 'Male',
    },
    {
        id: 4,
        patient_id: 1004,
        patient_name: 'Ruth Mwale',
        mrn: 'MRN-001248',
        visit_id: 5004,
        visit_number: 'OPD-1027',
        reason: 'Hypertension review',
        priority: 'moderate',
        workflow_status: 'reassessment',
        task: 'BP reassessment',
        waiting_minutes: 5,
        age: 51,
        sex: 'Female',
    },
    {
        id: 5,
        patient_id: 1005,
        patient_name: 'David Phiri',
        mrn: 'MRN-001249',
        visit_id: 5005,
        visit_number: 'OPD-1028',
        reason: 'Cough',
        priority: 'routine',
        workflow_status: 'assessment',
        task: 'Nursing assessment',
        waiting_minutes: 4,
        age: 31,
        sex: 'Male',
    },
];

const defaultAlerts: ClinicalAlert[] = [
    {
        id: 1,
        patient_id: 1001,
        patient_name: 'John Banda',
        mrn: 'MRN-001245',
        type: 'vital',
        severity: 'critical',
        message: 'Low oxygen saturation',
        detail: 'SpO₂ 89% • recorded 4 minutes ago',
        created_at: '4 min ago',
    },
    {
        id: 2,
        patient_id: 1006,
        patient_name: 'Grace Phiri',
        mrn: 'MRN-001250',
        type: 'vital',
        severity: 'critical',
        message: 'Elevated blood pressure',
        detail: '178/110 mmHg • recorded 8 minutes ago',
        created_at: '8 min ago',
    },
    {
        id: 3,
        patient_id: 1007,
        patient_name: 'Peter Mwila',
        mrn: 'MRN-001251',
        type: 'vital',
        severity: 'warning',
        message: 'Elevated temperature',
        detail: '38.9°C • recorded 12 minutes ago',
        created_at: '12 min ago',
    },
];

const defaultVitalsDue: VitalDue[] = [
    {
        id: 1,
        patient_id: 1001,
        patient_name: 'John Banda',
        mrn: 'MRN-001245',
        reason: 'Triage',
        due_at: 'Now',
        overdue: true,
        minutes: 6,
    },
    {
        id: 2,
        patient_id: 1002,
        patient_name: 'Mary Phiri',
        mrn: 'MRN-001246',
        reason: 'ANC assessment',
        due_at: '10:20',
        overdue: false,
        minutes: 0,
    },
    {
        id: 3,
        patient_id: 1004,
        patient_name: 'Ruth Mwale',
        mrn: 'MRN-001248',
        reason: 'BP reassessment',
        due_at: '10:30',
        overdue: false,
        minutes: 0,
    },
];

const defaultMedications: MedicationDue[] = [
    {
        id: 1,
        patient_id: 1008,
        patient_name: 'Jane Smith',
        medication: 'Paracetamol',
        dose: '500 mg',
        route: 'PO',
        due_at: '10:00',
        status: 'due',
    },
    {
        id: 2,
        patient_id: 1009,
        patient_name: 'Robert Johnson',
        medication: 'Amoxicillin',
        dose: '500 mg',
        route: 'PO',
        due_at: '10:15',
        status: 'upcoming',
    },
    {
        id: 3,
        patient_id: 1010,
        patient_name: 'Maria Garcia',
        medication: 'Metronidazole',
        dose: '500 mg',
        route: 'IV',
        due_at: '09:45',
        status: 'overdue',
    },
];

const defaultTasks: NursingTask[] = [
    {
        id: 1,
        patient_id: 1003,
        patient_name: 'Peter Zulu',
        task: 'Wound dressing',
        priority: 'routine',
    },
    {
        id: 2,
        patient_id: 1011,
        patient_name: 'Sarah Banda',
        task: 'Patient education',
        priority: 'moderate',
    },
    {
        id: 3,
        patient_id: 1004,
        patient_name: 'Ruth Mwale',
        task: 'Recheck blood pressure',
        priority: 'high',
        overdue: true,
    },
    {
        id: 4,
        patient_id: 1012,
        patient_name: 'Andrew Phiri',
        task: 'Specimen collection',
        priority: 'routine',
    },
];

const defaultReassessments: Reassessment[] = [
    {
        id: 1,
        patient_id: 1004,
        patient_name: 'Ruth Mwale',
        mrn: 'MRN-001248',
        assessment: 'Blood pressure',
        due_at: '10:30',
        overdue: false,
    },
    {
        id: 2,
        patient_id: 1001,
        patient_name: 'John Banda',
        mrn: 'MRN-001245',
        assessment: 'Pain / respiratory status',
        due_at: 'Now',
        overdue: true,
    },
    {
        id: 3,
        patient_id: 1013,
        patient_name: 'Lucy Mwila',
        mrn: 'MRN-001253',
        assessment: 'Post-procedure review',
        due_at: '11:00',
        overdue: false,
    },
];

const defaultActivity: ActivitySummary = {
    triage_completed: 31,
    assessments_completed: 27,
    procedures_completed: 22,
    reassessments_completed: 14,
    patients_educated: 17,
};

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    href,
    urgent = false,
}: {
    title: string;
    value: number;
    subtitle: string;
    icon: typeof Users;
    href?: string;
    urgent?: boolean;
}) {
    const content = (
        <div
            className={`group rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-slate-800 ${
                urgent
                    ? 'border-red-200 dark:border-red-900/60'
                    : 'border-slate-200 dark:border-slate-700'
            }`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>

                    <p
                        className={`mt-1 text-2xl font-bold ${
                            urgent
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-900 dark:text-white'
                        }`}
                    >
                        {value}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        {subtitle}
                    </p>
                </div>

                <div
                    className={`rounded-lg p-2 ${
                        urgent
                            ? 'bg-red-50 dark:bg-red-950/30'
                            : 'bg-blue-50 dark:bg-blue-950/30'
                    }`}
                >
                    <Icon
                        className={`h-5 w-5 ${
                            urgent
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-blue-600 dark:text-blue-400'
                        }`}
                    />
                </div>
            </div>

            {href && (
                <div className="mt-3 flex items-center text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    Open queue
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
            )}
        </div>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}

function PriorityBadge({
    priority,
}: {
    priority: QueuePatient['priority'];
}) {
    const config = {
        urgent: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
        high: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
        moderate:
            'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        routine:
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    };

    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${config[priority]}`}
        >
            {priority}
        </span>
    );
}

function WorkflowBadge({
    status,
}: {
    status: QueuePatient['workflow_status'];
}) {
    const labels = {
        waiting: 'Waiting',
        triage: 'Triage',
        assessment: 'Assessment',
        care: 'Nursing Care',
        reassessment: 'Reassessment',
    };

    return (
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {labels[status]}
        </span>
    );
}

function SectionHeader({
    icon: Icon,
    title,
    count,
    href,
}: {
    icon: typeof Users;
    title: string;
    count?: number;
    href?: string;
}) {
    return (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-500" />

                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {title}
                </h2>

                {typeof count === 'number' && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {count}
                    </span>
                )}
            </div>

            {href && (
                <Link
                    href={href}
                    className="flex items-center text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                    View all
                    <ChevronRight className="ml-0.5 h-3 w-3" />
                </Link>
            )}
        </div>
    );
}

export default function NurseDashboard() {
    const { props } = usePage<NurseDashboardProps>();
    const data = props;

    const stats = data.stats ?? defaultStats;
    const queue = data.queue ?? defaultQueue;
    const alerts = data.alerts ?? defaultAlerts;
    const vitalsDue = data.vitalsDue ?? defaultVitalsDue;
    const medicationsDue = data.medicationsDue ?? defaultMedications;
    const tasks = data.tasks ?? defaultTasks;
    const reassessments = data.reassessments ?? defaultReassessments;
    const activity = data.activity ?? defaultActivity;

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Nurses', href: '/nurses' },
                { title: 'Dashboard', href: '/nurses/dashboard' },
            ]}
        >
            <Head title="Nursing Dashboard" />

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="mx-auto max-w-[1600px] space-y-4 p-4 lg:p-5">

                    {/* =====================================================
                        HEADER
                    ====================================================== */}
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950/40">
                                    <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>

                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                        Nursing Dashboard
                                    </h1>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Clinical workflow and patient care
                                        management
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <CalendarClock className="h-4 w-4 text-slate-400" />
                                {currentDate}
                            </div>

                            <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                                title="Refresh dashboard"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* =====================================================
                        PRIMARY WORKLOAD
                    ====================================================== */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard
                            title="Patients Waiting"
                            value={stats.patients_waiting}
                            subtitle="Awaiting nursing"
                            icon={Users}
                            href="/nurses/queue"
                        />

                        <StatCard
                            title="In Assessment"
                            value={stats.patients_in_assessment}
                            subtitle="Currently being assessed"
                            icon={UserCheck}
                            href="/nurses/queue?status=assessment"
                        />

                        <StatCard
                            title="Triage Queue"
                            value={stats.triage_queue}
                            subtitle="Awaiting triage"
                            icon={Activity}
                            href="/nurses/triage"
                        />

                        <StatCard
                            title="Reassessment Due"
                            value={stats.reassessments_due}
                            subtitle="Requires review"
                            icon={RefreshCw}
                            href="/nurses/reassessments"
                            urgent={stats.reassessments_due > 0}
                        />
                    </div>

                    {/* =====================================================
                        CLINICAL WORKLOAD
                    ====================================================== */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard
                            title="Vital Signs Due"
                            value={stats.vital_signs_due}
                            subtitle="Measurements due"
                            icon={HeartPulse}
                            href="/nurses/vitals/due"
                            urgent={stats.vital_signs_due > 0}
                        />

                        <StatCard
                            title="Pending Tasks"
                            value={stats.pending_tasks}
                            subtitle="Nursing actions"
                            icon={ListChecks}
                            href="/nurses/tasks"
                        />

                        <StatCard
                            title="Medication Due"
                            value={stats.medications_due}
                            subtitle="MAR actions"
                            icon={Pill}
                            href="/nurses/medications"
                        />

                        <StatCard
                            title="Abnormal Vitals"
                            value={stats.abnormal_vitals}
                            subtitle="Requires attention"
                            icon={AlertTriangle}
                            href="/nurses/alerts"
                            urgent={stats.abnormal_vitals > 0}
                        />
                    </div>

                    {/* =====================================================
                        MAIN WORK AREA
                    ====================================================== */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

                        {/* Nursing Queue */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2 dark:border-slate-700 dark:bg-slate-800">
                            <SectionHeader
                                icon={ClipboardList}
                                title="Nursing Work Queue"
                                count={queue.length}
                                href="/nurses/queue"
                            />

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[850px]">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70">
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Patient
                                            </th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Visit
                                            </th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Reason
                                            </th>
                                            <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Priority
                                            </th>
                                            <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Workflow
                                            </th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {queue.map((patient) => (
                                            <tr
                                                key={patient.id}
                                                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40">
                                                            <UserRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                        </div>

                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                                {patient.patient_name}
                                                            </p>

                                                            <p className="text-[10px] text-slate-400">
                                                                {patient.mrn}
                                                                {patient.age
                                                                    ? ` • ${patient.age}y`
                                                                    : ''}
                                                                {patient.sex
                                                                    ? ` • ${patient.sex}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3">
                                                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                                                        {patient.visit_number}
                                                    </span>
                                                </td>

                                                <td className="max-w-[180px] px-3 py-3">
                                                    <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                                                        {patient.reason}
                                                    </p>

                                                    {patient.task && (
                                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                                            Task: {patient.task}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-3 py-3 text-center">
                                                    <PriorityBadge
                                                        priority={
                                                            patient.priority
                                                        }
                                                    />
                                                </td>

                                                <td className="px-3 py-3 text-center">
                                                    <WorkflowBadge
                                                        status={
                                                            patient.workflow_status
                                                        }
                                                    />
                                                </td>

                                                <td className="px-3 py-3 text-right">
                                                    <Link
                                                        href={`/nurses/patients/${patient.patient_id}`}
                                                        className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                                                    >
                                                        {patient.workflow_status ===
                                                        'waiting'
                                                            ? 'Start'
                                                            : patient.workflow_status ===
                                                                'reassessment'
                                                              ? 'Review'
                                                              : 'Continue'}
                                                        <ArrowRight className="ml-1 h-3 w-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Clinical Alerts */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <SectionHeader
                                icon={AlertTriangle}
                                title="Clinical Alerts"
                                count={alerts.length}
                                href="/nurses/alerts"
                            />

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                    >
                                        <div className="flex gap-3">
                                            <div
                                                className={`mt-0.5 rounded-full p-1.5 ${
                                                    alert.severity === 'critical'
                                                        ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                                        : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                                }`}
                                            >
                                                {alert.severity ===
                                                'critical' ? (
                                                    <AlertCircle className="h-4 w-4" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                            {
                                                                alert.patient_name
                                                            }
                                                        </p>

                                                        <p className="text-[10px] text-slate-400">
                                                            {alert.mrn}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                                            alert.severity ===
                                                            'critical'
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                        }`}
                                                    >
                                                        {alert.severity}
                                                    </span>
                                                </div>

                                                <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                                                    {alert.message}
                                                </p>

                                                <p className="mt-0.5 text-[10px] text-slate-500">
                                                    {alert.detail}
                                                </p>

                                                <Link
                                                    href={`/nurses/patients/${alert.patient_id}`}
                                                    className="mt-2 inline-flex items-center text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                                                >
                                                    Review patient
                                                    <ChevronRight className="ml-0.5 h-3 w-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* =====================================================
                        VITALS + REASSESSMENT + TASKS
                    ====================================================== */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                        {/* Vitals Due */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <SectionHeader
                                icon={HeartPulse}
                                title="Vital Signs Due"
                                count={vitalsDue.length}
                                href="/nurses/vitals/due"
                            />

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {vitalsDue.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-3 p-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/30">
                                                <HeartPulse className="h-4 w-4 text-red-500" />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                    {item.patient_name}
                                                </p>

                                                <p className="text-[10px] text-slate-400">
                                                    {item.reason}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p
                                                className={`text-[10px] font-semibold ${
                                                    item.overdue
                                                        ? 'text-red-600'
                                                        : 'text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                {item.due_at}
                                            </p>

                                            <Link
                                                href={`/nurses/vitals/${item.patient_id}`}
                                                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                                            >
                                                Record
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reassessment */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <SectionHeader
                                icon={RefreshCw}
                                title="Reassessment Due"
                                count={reassessments.length}
                                href="/nurses/reassessments"
                            />

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {reassessments.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-3 p-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                {item.patient_name}
                                            </p>

                                            <p className="text-[10px] text-slate-400">
                                                {item.assessment}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p
                                                className={`text-[10px] font-semibold ${
                                                    item.overdue
                                                        ? 'text-red-600'
                                                        : 'text-slate-500'
                                                }`}
                                            >
                                                {item.due_at}
                                            </p>

                                            <Link
                                                href={`/nurses/reassessments/${item.id}`}
                                                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                                            >
                                                Assess
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Nursing Tasks */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <SectionHeader
                                icon={ListChecks}
                                title="Pending Nursing Tasks"
                                count={tasks.length}
                                href="/nurses/tasks"
                            />

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-3 p-3"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                                            <ClipboardCheck className="h-4 w-4 text-slate-500" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                                                {task.task}
                                            </p>

                                            <p className="text-[10px] text-slate-400">
                                                {task.patient_name}
                                            </p>
                                        </div>

                                        <PriorityBadge
                                            priority={task.priority}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* =====================================================
                        MEDICATION ADMINISTRATION
                    ====================================================== */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <SectionHeader
                            icon={Pill}
                            title="Medication Administration Due"
                            count={medicationsDue.length}
                            href="/nurses/medications"
                        />

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                                <thead className="bg-slate-50 dark:bg-slate-800/70">
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-4 py-2 text-left text-[10px] uppercase text-slate-500">
                                            Patient
                                        </th>
                                        <th className="px-3 py-2 text-left text-[10px] uppercase text-slate-500">
                                            Medication
                                        </th>
                                        <th className="px-3 py-2 text-center text-[10px] uppercase text-slate-500">
                                            Dose
                                        </th>
                                        <th className="px-3 py-2 text-center text-[10px] uppercase text-slate-500">
                                            Route
                                        </th>
                                        <th className="px-3 py-2 text-center text-[10px] uppercase text-slate-500">
                                            Due
                                        </th>
                                        <th className="px-3 py-2 text-right text-[10px] uppercase text-slate-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {medicationsDue.map((medication) => (
                                        <tr
                                            key={medication.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                    {
                                                        medication.patient_name
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-3 py-3 text-xs text-slate-700 dark:text-slate-200">
                                                {medication.medication}
                                            </td>

                                            <td className="px-3 py-3 text-center text-xs">
                                                {medication.dose}
                                            </td>

                                            <td className="px-3 py-3 text-center">
                                                <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                    {medication.route}
                                                </span>
                                            </td>

                                            <td className="px-3 py-3 text-center">
                                                <span
                                                    className={`text-xs font-semibold ${
                                                        medication.status ===
                                                        'overdue'
                                                            ? 'text-red-600'
                                                            : medication.status ===
                                                                'due'
                                                              ? 'text-amber-600'
                                                              : 'text-slate-500'
                                                    }`}
                                                >
                                                    {medication.due_at}
                                                </span>
                                            </td>

                                            <td className="px-3 py-3 text-right">
                                                <Link
                                                    href={`/nurses/medications/${medication.id}`}
                                                    className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                                                >
                                                    Administer
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* =====================================================
                        TODAY'S NURSING ACTIVITY
                    ====================================================== */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <SectionHeader
                            icon={CheckCircle2}
                            title="Today's Nursing Activity"
                        />

                        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-5 sm:divide-y-0 dark:divide-slate-700">
                            <div className="p-4">
                                <p className="text-[10px] uppercase text-slate-400">
                                    Triage Completed
                                </p>
                                <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                    {activity.triage_completed}
                                </p>
                            </div>

                            <div className="p-4">
                                <p className="text-[10px] uppercase text-slate-400">
                                    Assessments
                                </p>
                                <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                    {activity.assessments_completed}
                                </p>
                            </div>

                            <div className="p-4">
                                <p className="text-[10px] uppercase text-slate-400">
                                    Procedures
                                </p>
                                <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                    {activity.procedures_completed}
                                </p>
                            </div>

                            <div className="p-4">
                                <p className="text-[10px] uppercase text-slate-400">
                                    Reassessments
                                </p>
                                <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                    {activity.reassessments_completed}
                                </p>
                            </div>

                            <div className="p-4">
                                <p className="text-[10px] uppercase text-slate-400">
                                    Patient Education
                                </p>
                                <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                    {activity.patients_educated}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}