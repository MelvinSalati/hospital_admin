// pages/patients/show.tsx
import { router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CalendarClock,
    ClipboardList,
    Clock,
    FlaskConical,
    HeartPulse,
    Pill,
    Search,
    Shield,
    Stethoscope,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { getUserRole, isReceptionist } from '@/lib/roles';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import PatientVisitSchemeModal from './components/PatientSchemeModal';

/* -------------------------------------------------------------------------- */
/* Design tokens                                                              */
/* Swiss-style clinical chart: calm cyan primary, one alert colour (red),     */
/* Atkinson Hyperlegible for legibility. Type scale, never below 12px:        */
/*   12px meta and labels · 13px body and table cells · 14px section titles   */
/*   18px vital values                                                        */
/* Load the font once in app.css or the root blade file:                      */
/*   https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap */
/* It falls back to the system UI font until then.                            */
/* -------------------------------------------------------------------------- */

const FONT =
    "font-['Atkinson_Hyperlegible',ui-sans-serif,system-ui,sans-serif]";

const PRIMARY_BTN = 'bg-cyan-700 text-white hover:bg-cyan-800';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Department {
    id: number;
    department_name?: string;
    name?: string;
    head_of_department?: string;
    location?: string;
    is_active?: boolean;
    status?: string;
}

interface StaffMember {
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
}

interface Interaction {
    id: number | string;
    patient_id: number;
    provider_id: number | null;
    type: string;
    description: string;
    status: string;
    created_at: string;
}

interface VitalSign {
    id: number;
    systolic_bp: number | null;
    diastolic_bp: number | null;
    pulse_rate: number | null;
    respiratory_rate: number | null;
    spO2: string | null;
    bmi: string | null;
    temperature: string | null;
    blood_glucose: number | null;
    pain_level: number | null;
    notes: string | null;
    recorded_at: string | null;
    created_at: string;
}

interface Laboratory {
    id: number;
    test_name: string;
    status: string;
    result_value: string | null;
    reference_range: string | null;
    unit: string | null;
    interpretation: string | null;
    created_at: string;
}

interface Prescription {
    id: number;
    drug_name: string;
    dosage: string | null;
    dosage_unit: string | null;
    frequency: string | null;
    frequency_label: string | null;
    route: string | null;
    payment_status: string;
    dispensation_status: string;
    is_cancelled: boolean;
    prescribed_by?: string | null;
    created_at: string;
}

interface Patient {
    id: number;
    patient_number: string;
    first_name: string;
    last_name: string;
    allergies: string | null;
    chronic_conditions: string | null;
    insurance_provider: string | null;
    insurance_number: string | null;
    insurance_expiry: string | null;
    insurance_status: string | null;
    interaction?: Interaction[];
    vital_sign?: VitalSign[];
    laboratory?: Laboratory[];
    prescription?: Prescription[];
    [key: string]: any;
}

interface Props {
    patient: Patient | Patient[];
    departments: Department[];
    users: StaffMember[];
    insuranceProviders?: { id: number | string; name: string }[];
    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            role?: unknown;
            profile?: { role?: unknown; [key: string]: any } | null;
            [key: string]: any;
        };
        users?: {
            profile?: { role?: unknown; [key: string]: any } | null;
            [key: string]: any;
        };
    };
    visit_status?: VisitStatus;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const present = (v: unknown) => v !== null && v !== undefined && v !== '';

const parseDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value?: string | null): string => {
    const d = parseDate(value);
    if (!d) return '—';
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const formatTime = (value?: string | null): string => {
    const d = parseDate(value);
    if (!d) return '—';
    return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const humanize = (value?: string | null): string => {
    if (!value) return '—';
    const text = value.replace(/_/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const splitList = (value?: string | null): string[] =>
    Array.from(
        new Set(
            (value ?? '')
                .split(/[,;\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
        ),
    );

const byNewest = <T extends { created_at: string }>(a: T, b: T) =>
    (parseDate(b.created_at)?.getTime() ?? 0) -
    (parseDate(a.created_at)?.getTime() ?? 0);

const initialsOf = (name?: string): string =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

const extractError = (error: any, fallback: string): string => {
    if (error?.response) {
        return (
            error.response.data?.message ||
            error.response.data?.error ||
            fallback
        );
    }
    if (error?.request) {
        return 'No response from the server. Check your connection and try again.';
    }
    return fallback;
};

/* ----------------------------- role storage ------------------------------ */

const ROLE_KEY = 'userRole'; // primary role, kept for getUserRole() compatibility
const ROLES_KEY = 'userRoles'; // full list of roles as JSON
const ROLE_EVENT = 'userRole:changed';

/** Accepts ['nurse'], 'nurse', 'nurse,doctor', '["nurse"]' or [{ name: 'nurse' }]. */
const normalizeRoles = (raw: unknown): string[] => {
    let list: unknown[] = [];

    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === 'string') {
        const text = raw.trim();
        if (text.startsWith('[')) {
            try {
                const parsed = JSON.parse(text);
                list = Array.isArray(parsed) ? parsed : [text];
            } catch {
                list = text.split(',');
            }
        } else {
            list = text.split(',');
        }
    }

    const names = list.map((item) =>
        typeof item === 'string'
            ? item
            : ((item as any)?.name ?? (item as any)?.role ?? ''),
    );

    return Array.from(
        new Set(
            names.map((n) => String(n).trim().toLowerCase()).filter(Boolean),
        ),
    );
};

const sameRoles = (a: string[], b: string[]): boolean =>
    [...a].sort().join('|') === [...b].sort().join('|');

const readStoredRoles = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const json = window.localStorage.getItem(ROLES_KEY);
        if (json) {
            const parsed = normalizeRoles(JSON.parse(json));
            if (parsed.length) return parsed;
        }
        return normalizeRoles(window.localStorage.getItem(ROLE_KEY));
    } catch {
        return [];
    }
};

/** Write the roles and notify every listener in this tab. */
const writeStoredRoles = (roles: string[]) => {
    if (typeof window === 'undefined') return;
    try {
        if (roles.length) {
            window.localStorage.setItem(ROLE_KEY, roles[0]);
            window.localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
        } else {
            window.localStorage.removeItem(ROLE_KEY);
            window.localStorage.removeItem(ROLES_KEY);
        }
    } catch {
        // storage unavailable (private mode, quota): in-memory state still works
    }
    window.dispatchEvent(new Event(ROLE_EVENT));
};

/** Find the roles in the shared auth props, trying every shape we have seen. */
const pickServerRoles = (auth: Props['auth']): string[] => {
    const user: any = auth?.user;
    const users: any = auth?.users;

    const candidates: unknown[] = [
        user?.profile?.roles,
        user?.profile?.role,
        users?.profile?.roles,
        users?.profile?.role,
        user?.roles,
        user?.role,
    ];

    for (const candidate of candidates) {
        const roles = normalizeRoles(candidate);
        if (roles.length) return roles;
    }
    return [];
};

const isReceptionRole = (role: string): boolean =>
    isReceptionist(role) || /reception/i.test(role);

const STATUS_TONE: Record<string, string> = {
    Dispensed: 'bg-emerald-100 text-emerald-800',
    'Partly dispensed': 'bg-amber-100 text-amber-800',
    'Awaiting dispensing': 'bg-sky-100 text-sky-800',
    'Awaiting payment': 'bg-amber-100 text-amber-800',
    Discontinued: 'bg-rose-100 text-rose-800',
    Completed: 'bg-emerald-100 text-emerald-800',
    Pending: 'bg-amber-100 text-amber-800',
    Collected: 'bg-sky-100 text-sky-800',
    Processing: 'bg-sky-100 text-sky-800',
    Cancelled: 'bg-slate-100 text-slate-600',
    Upcoming: 'bg-sky-100 text-sky-800',
    Confirmed: 'bg-sky-100 text-sky-800',
    Scheduled: 'bg-sky-100 text-sky-800',
};

const interpretationTone = (text: string): string => {
    const t = text.toLowerCase();
    if (t.includes('critical')) return 'bg-rose-100 text-rose-800';
    if (/(abnormal|high|low|elevated|positive)/.test(t))
        return 'bg-amber-100 text-amber-800';
    if (/(normal|negative|clear)/.test(t))
        return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-100 text-slate-700';
};

const SERVICE_OPTIONS = [
    { id: 1, name: 'Emergency', on: 'bg-red-700 text-white ring-red-700' },
    { id: 2, name: 'Routine', on: 'bg-amber-700 text-white ring-amber-700' },
    { id: 3, name: 'Other', on: 'bg-emerald-700 text-white ring-emerald-700' },
];

/* -------------------------------------------------------------------------- */
/* Presentational components                                                  */
/* -------------------------------------------------------------------------- */

function StatusBadge({ label }: { label: string }) {
    return (
        <Badge
            className={`px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                STATUS_TONE[label] ?? 'bg-slate-100 text-slate-700'
            }`}
        >
            {label}
        </Badge>
    );
}

/**
 * A card with a fixed header and an independently scrolling body.
 * Cap the height with `scrollClass` (for example "max-h-64"); the body scrolls
 * on both axes, can be focused with the keyboard, and keeps table headers
 * sticky. `toolbar` stays pinned above the scroll area.
 */
function Section({
    title,
    icon: Icon,
    summary,
    toolbar,
    scrollClass = 'max-h-64',
    children,
}: {
    title: string;
    icon: typeof Pill;
    summary?: string;
    toolbar?: ReactNode;
    scrollClass?: string;
    children: ReactNode;
}) {
    return (
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-cyan-700" aria-hidden />
                    <h2 className="text-sm font-semibold text-cyan-950">
                        {title}
                    </h2>
                </div>
                {summary && (
                    <span className="text-xs text-slate-500">{summary}</span>
                )}
            </header>
            {toolbar}
            <div
                role="region"
                aria-label={title}
                tabIndex={0}
                className={`min-h-0 flex-1 scroll-pt-9 overflow-auto overscroll-contain [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:outline-none focus-visible:ring-inset ${scrollClass}`}
            >
                {children}
            </div>
        </section>
    );
}

function EmptyState({ children }: { children: ReactNode }) {
    return (
        <p className="px-3 py-5 text-center text-xs text-slate-500">
            {children}
        </p>
    );
}

interface Column<T> {
    header: string;
    cell: (row: T) => ReactNode;
}

function DataTable<T extends { id: number | string }>({
    rows,
    columns,
    empty,
}: {
    rows: T[];
    columns: Column<T>[];
    empty: string;
}) {
    if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
    return (
        <table className="w-full min-w-[34rem] text-[13px] leading-snug">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium text-slate-600 shadow-[0_1px_0_#e2e8f0]">
                <tr>
                    {columns.map((c) => (
                        <th
                            key={c.header}
                            scope="col"
                            className="px-3 py-1.5 font-medium"
                        >
                            {c.header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-slate-50">
                        {columns.map((c) => (
                            <td key={c.header} className="px-3 py-2">
                                {c.cell(row)}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ListToolbar({
    search,
    onSearch,
    placeholder,
    status,
    onStatus,
    statuses,
}: {
    search: string;
    onSearch: (v: string) => void;
    placeholder: string;
    status: string;
    onStatus: (v: string) => void;
    statuses: string[];
}) {
    return (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
            <div className="relative min-w-[10rem] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                    aria-label={placeholder}
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    className="h-8 pr-8 pl-8 text-[13px]"
                />
                {search && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => onSearch('')}
                        className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:outline-none"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            <Select value={status} onValueChange={onStatus}>
                <SelectTrigger
                    aria-label="Filter by status"
                    className="h-8 w-40 text-[13px]"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                            {s}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function ChoiceRow({
    selected,
    disabled,
    onClick,
    children,
}: {
    selected: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={onClick}
            className={`flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:outline-none ${
                selected
                    ? 'border-cyan-300 bg-cyan-50'
                    : 'border-transparent hover:bg-white'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
            <span
                aria-hidden
                className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full ${
                    selected
                        ? 'border-4 border-cyan-700'
                        : 'border-2 border-slate-300'
                }`}
            />
            <div className="min-w-0 flex-1">{children}</div>
        </button>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PatientPage() {
    const { props } = usePage<Props>();

    const {
        departments = [],
        users = [],
        insuranceProviders = [],
        auth,
        visit_status,
    } = props;

    const patient: Patient | undefined = Array.isArray(props.patient)
        ? props.patient[0]
        : props.patient;
    const patientId = patient?.id;
    const authenticatedUserId = auth?.user?.id;

    /* ------------------------------ role syncing ----------------------------- */

    // The server is the source of truth: auth.user.profile.roles, e.g. ['receptionist']
    const serverRoles = useMemo(() => pickServerRoles(auth), [auth]);
    const serverRolesKey = serverRoles.join('|');

    // First render already uses the server roles, so there is no flicker
    const [userRoles, setUserRoles] = useState<string[]>(() => {
        if (serverRoles.length) return serverRoles;
        const stored = readStoredRoles();
        if (stored.length) return stored;
        return normalizeRoles(getUserRole());
    });

    // 1. On first run and whenever the server roles change: compare with what is
    //    stored and overwrite it if it is missing or different
    useEffect(() => {
        if (serverRoles.length === 0) return;
        if (!sameRoles(serverRoles, readStoredRoles())) {
            writeStoredRoles(serverRoles);
        }
        setUserRoles((prev) =>
            sameRoles(prev, serverRoles) ? prev : serverRoles,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverRolesKey]);

    // 2. Follow stored changes from this tab (custom event) and other tabs (storage)
    useEffect(() => {
        const sync = () => {
            const stored = readStoredRoles();
            if (stored.length) {
                setUserRoles((prev) =>
                    sameRoles(prev, stored) ? prev : stored,
                );
            }
        };
        window.addEventListener(ROLE_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(ROLE_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    // 3. Re-check the role with the server whenever the tab becomes visible again
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['auth'] });
            }
        };
        document.addEventListener('visibilitychange', refresh);
        return () => document.removeEventListener('visibilitychange', refresh);
    }, []);

    const canStartVisit = userRoles.some(isReceptionRole);

    /* ------------------------------ visit state ------------------------------ */

    const [hasActiveVisit, setHasActiveVisit] = useState(
        visit_status?.has_active_visit ?? false,
    );
    const [activeVisitToken, setActiveVisitToken] = useState<string | null>(
        visit_status?.visit_token ?? null,
    );
    // Keep local state in step with fresh props after router.reload()
    useEffect(() => {
        setHasActiveVisit(visit_status?.has_active_visit ?? false);
        setActiveVisitToken(visit_status?.visit_token ?? null);
    }, [visit_status?.has_active_visit, visit_status?.visit_token]);

    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showStartVisitModal, setShowStartVisitModal] = useState(false);
    const [starting, setStarting] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState('');

    // Assign modal selections
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
        null,
    );
    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
    const [visitType, setVisitType] = useState(0);
    const [purposeOfVisit, setPurposeOfVisit] = useState('');

    // Table filters (only shown once a list is long enough to need them)
    const [medSearch, setMedSearch] = useState('');
    const [medStatus, setMedStatus] = useState('all');
    const [labSearch, setLabSearch] = useState('');
    const [labStatus, setLabStatus] = useState('all');

    // NOTE: other screens may read this key, so it is kept. It stores the full
    // patient record in the browser, so consider replacing it with a patient id.
    useEffect(() => {
        if (patient) {
            localStorage.setItem('current_patient', JSON.stringify(patient));
        }
    }, [patient]);

    /* ------------------------------ derived data ------------------------------ */

    const staffName = (id: number | null) =>
        id ? (users.find((u) => u.id === id)?.name ?? `Provider #${id}`) : '—';

    const allergies = useMemo(
        () => splitList(patient?.allergies),
        [patient?.allergies],
    );
    const conditions = useMemo(
        () => splitList(patient?.chronic_conditions),
        [patient?.chronic_conditions],
    );

    const latestVitals = useMemo(() => {
        const list = [...(patient?.vital_sign ?? [])];
        if (list.length === 0) return null;
        const stamp = (v: VitalSign) =>
            parseDate(v.recorded_at ?? v.created_at)?.getTime() ?? 0;
        const latest = list.sort((a, b) => stamp(b) - stamp(a))[0];
        const tiles = [
            {
                label: 'Blood pressure',
                value:
                    present(latest.systolic_bp) && present(latest.diastolic_bp)
                        ? `${latest.systolic_bp}/${latest.diastolic_bp}`
                        : null,
                unit: 'mmHg',
            },
            { label: 'Pulse', value: latest.pulse_rate, unit: 'bpm' },
            { label: 'Temperature', value: latest.temperature, unit: '°C' },
            { label: 'SpO₂', value: latest.spO2, unit: '%' },
            {
                label: 'Respiration',
                value: latest.respiratory_rate,
                unit: '/min',
            },
            { label: 'Blood glucose', value: latest.blood_glucose, unit: '' },
            { label: 'BMI', value: latest.bmi, unit: 'kg/m²' },
            { label: 'Pain', value: latest.pain_level, unit: '/10' },
        ].filter((t) => present(t.value));
        return {
            tiles,
            recordedAt: latest.recorded_at ?? latest.created_at,
            notes: latest.notes,
        };
    }, [patient?.vital_sign]);

    const medications = useMemo(
        () =>
            [...(patient?.prescription ?? [])].sort(byNewest).map((p) => {
                let status = 'Awaiting payment';
                if (p.is_cancelled) status = 'Discontinued';
                else if (p.dispensation_status === 'dispensed')
                    status = 'Dispensed';
                else if (p.dispensation_status === 'partial')
                    status = 'Partly dispensed';
                else if (p.payment_status === 'paid')
                    status = 'Awaiting dispensing';
                return {
                    id: p.id,
                    name: p.drug_name || 'Unnamed medication',
                    prescribedOn: formatDate(p.created_at),
                    prescribedBy: p.prescribed_by || null,
                    dosage:
                        `${p.dosage ?? ''} ${p.dosage_unit ?? ''}`.trim() ||
                        '—',
                    frequency: p.frequency_label || p.frequency || '—',
                    route: p.route || '—',
                    status,
                };
            }),
        [patient?.prescription],
    );

    const labResults = useMemo(
        () =>
            [...(patient?.laboratory ?? [])].sort(byNewest).map((lab) => ({
                id: lab.id,
                test: lab.test_name || 'Unnamed test',
                date: formatDate(lab.created_at),
                value: present(lab.result_value)
                    ? `${lab.result_value}${lab.unit ? ` ${lab.unit}` : ''}`
                    : null,
                range: lab.reference_range,
                interpretation: lab.interpretation,
                status: humanize(lab.status),
            })),
        [patient?.laboratory],
    );

    const history = useMemo(
        () => [...(patient?.interaction ?? [])].sort(byNewest),
        [patient?.interaction],
    );

    const appointments = useMemo(
        () =>
            history
                .filter(
                    (i) =>
                        i.type === 'appointment' || i.type === 'consultation',
                )
                .map((i) => ({
                    id: i.id,
                    title: humanize(i.type),
                    provider: staffName(i.provider_id),
                    date: formatDate(i.created_at),
                    time: formatTime(i.created_at),
                    status:
                        i.status === 'completed'
                            ? 'Completed'
                            : i.status === 'pending'
                              ? 'Upcoming'
                              : humanize(i.status),
                })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [history, users],
    );

    const filteredMedications = medications.filter(
        (m) =>
            m.name.toLowerCase().includes(medSearch.toLowerCase()) &&
            (medStatus === 'all' || m.status === medStatus),
    );
    const filteredLabs = labResults.filter(
        (l) =>
            l.test.toLowerCase().includes(labSearch.toLowerCase()) &&
            (labStatus === 'all' || l.status === labStatus),
    );

    const insuranceName =
        insuranceProviders.find(
            (p) => String(p.id) === String(patient?.insurance_provider),
        )?.name ?? patient?.insurance_provider;
    const insuranceExpiryDate = parseDate(patient?.insurance_expiry);

    const insuranceExpired =
        insuranceExpiryDate instanceof Date &&
        !isNaN(insuranceExpiryDate.getTime()) &&
        insuranceExpiryDate < new Date();

    const filteredDepartments = useMemo(() => {
        const q = departmentSearch.toLowerCase();
        return departments.filter((dept) => {
            const active =
                dept.is_active !== false && dept.status !== 'inactive';
            if (departmentFilter === 'active' && !active) return false;
            if (departmentFilter === 'inactive' && active) return false;
            if (!q) return true;
            return [
                dept.department_name,
                dept.name,
                dept.head_of_department,
                dept.location,
            ].some((field) => field?.toLowerCase().includes(q));
        });
    }, [departments, departmentSearch, departmentFilter]);

    const filteredStaff = useMemo(() => {
        const q = staffSearch.toLowerCase();
        if (!q) return users;
        return users.filter((person) =>
            [person.name, person.role, person.department, person.email].some(
                (field) => field?.toLowerCase().includes(q),
            ),
        );
    }, [users, staffSearch]);

    /* -------------------------------- actions -------------------------------- */

    const resetSelections = () => {
        setSelectedDepartment(null);
        setSelectedServices([]);
        setSelectedStaff(null);
        setVisitType(0);
        setPurposeOfVisit('');
        setError('');
        setDepartmentSearch('');
        setStaffSearch('');
        setDepartmentFilter('all');
    };

    const openAssignModal = () => {
        resetSelections();
        setShowVisitModal(true);
    };

    const toggleService = (id: number) => {
        setSelectedServices((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
        );
        setError('');
    };

    const handleStartVisit = async (data: {
        scheme: string;
        provider_id?: number | string | null;
    }) => {
        const { scheme, provider_id } = data;
        if (!patientId) {
            console.log('patient id not found', patientId);
            toast.error('Patient ID not found.');
            return;
        }

        setStarting(true);
        try {
            const response = await Http.post('/visit-token/generate', {
                patient_id: patientId,
                patient_number: patient?.patient_number,
                payment_method: scheme,
                scheme_type: scheme,
                provider_id: provider_id || null,
                created_by: authenticatedUserId,
                status: 'pending',
                started_at: new Date().toISOString(),
            });

            if (response.data.success) {
                setHasActiveVisit(true);
                setActiveVisitToken(response.data.token);

                localStorage.setItem(`visit_started_${patientId}`, 'true');
                localStorage.setItem(
                    `visit_token_${patientId}`,
                    response.data.token,
                );
                localStorage.setItem(
                    `visit_payment_method_${patientId}`,
                    scheme,
                );
                if (provider_id) {
                    localStorage.setItem(
                        `visit_provider_${patientId}`,
                        String(provider_id),
                    );
                }

                toast.success(`Visit started. Token: ${response.data.token}`);
                setShowStartVisitModal(false);
                router.reload();
            } else {
                toast.error(
                    response.data.message || 'Couldn’t start the visit.',
                );
            }
        } catch (err: any) {
            setStarting(false);
            console.log(err);
            toast.error(extractError(err, 'Couldn’t start the visit.'));
        } finally {
            setStarting(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedDepartment) {
            setError('Select a department to continue.');
            return;
        }

        setAssigning(true);
        setError('');
        try {
            const response = await Http.post('/patient/create/visit', {
                patient_id: patientId,
                patient_number: patient?.patient_number,
                department_id: selectedDepartment,
                service_ids: selectedServices,
                staff_id: selectedStaff,
                created_by: authenticatedUserId,
                priority: 'routine',
                notes: '',
                visit_type: visitType,
                purpose_of_visit: purposeOfVisit,
                scheduled_date: new Date().toISOString(),
                status: 'pending',
                visit_token: activeVisitToken,
            });

            if (response.data.status === 301 || response.status === 409) {
                toast.error(response.data.message);
            } else if (response.status === 200 || response.status === 201) {
                toast.success(response.data.message ?? 'Patient assigned.');
                setShowVisitModal(false);
                resetSelections();
            } else {
                toast.warning(
                    response.data.message ||
                        'Unexpected response from the server.',
                );
            }
        } catch (err: any) {
            const message = extractError(err, 'Couldn’t assign the patient.');
            setError(message);
            toast.error('Assignment failed', { description: message });
        } finally {
            setAssigning(false);
        }
    };

    /* -------------------------------- render --------------------------------- */

    if (!patient) {
        return (
            <div
                className={`flex h-screen items-center justify-center ${FONT}`}
            >
                <div className="text-center" role="status">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-700" />
                    <p className="mt-3 text-sm text-slate-600">
                        Loading patient…
                    </p>
                </div>
            </div>
        );
    }

    const patientName =
        `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() ||
        'Unknown patient';

    return (
        <PatientLayout
            patient={patient}
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: patientName, href: '' },
            ]}
            onAssignClick={canStartVisit ? openAssignModal : undefined}
            onStartVisitClick={
                canStartVisit ? () => setShowStartVisitModal(true) : undefined
            }
        >
            <div
                className={`min-h-screen bg-blue-50 text-[13px] text-slate-800 ${FONT}`}
            >
                {/* Visit bar (receptionists only) */}
                {canStartVisit && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
                        <div className="flex items-center gap-2.5 text-[13px]">
                            <span
                                aria-hidden
                                className={`h-2 w-2 rounded-full ${
                                    hasActiveVisit
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-300'
                                }`}
                            />
                            {hasActiveVisit ? (
                                <>
                                    <span className="font-medium text-cyan-950">
                                        Visit in progress
                                    </span>
                                    {activeVisitToken && (
                                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs text-emerald-800">
                                            {activeVisitToken}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-slate-600">
                                    No active visit
                                </span>
                            )}
                        </div>
                        {hasActiveVisit ? (
                            <Button
                                size="sm"
                                className={`h-8 cursor-pointer text-[13px] ${PRIMARY_BTN}`}
                                onClick={openAssignModal}
                            >
                                <Building2 className="mr-1.5 h-4 w-4" />
                                Assign to department
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                className={`h-8 cursor-pointer text-[13px] ${PRIMARY_BTN}`}
                                onClick={() => setShowStartVisitModal(true)}
                            >
                                <Clock className="mr-1.5 h-4 w-4" />
                                Start visit
                            </Button>
                        )}
                    </div>
                )}

                <div className="space-y-3 p-3 lg:p-4">
                    {/* Top strip: allergies, vitals, conditions */}
                    <div className="grid gap-3 lg:grid-cols-12">
                        {/* Allergies come first: the safety-critical fact */}
                        <div className="lg:col-span-4 xl:col-span-3">
                            {allergies.length > 0 ? (
                                <div
                                    role="region"
                                    aria-label="Allergies"
                                    className="flex h-full items-start gap-2.5 rounded-lg border border-l-4 border-red-200 border-l-red-600 bg-red-50 px-3 py-2.5"
                                >
                                    <AlertTriangle
                                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-700"
                                        aria-hidden
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-red-900">
                                            Allergies
                                        </p>
                                        <ul className="mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto [scrollbar-width:thin]">
                                            {allergies.map((a) => (
                                                <li
                                                    key={a}
                                                    className="rounded bg-white px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200"
                                                >
                                                    {a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    role="region"
                                    aria-label="Allergies"
                                    className="flex h-full items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                                >
                                    <AlertTriangle
                                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400"
                                        aria-hidden
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-cyan-950">
                                            Allergies
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-600">
                                            None recorded. Confirm with the
                                            patient before prescribing.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-8 xl:col-span-6">
                            <Section
                                title="Latest vitals"
                                icon={HeartPulse}
                                summary={
                                    latestVitals
                                        ? `Recorded ${formatDate(latestVitals.recordedAt)}, ${formatTime(latestVitals.recordedAt)}`
                                        : undefined
                                }
                                scrollClass="max-h-36"
                            >
                                {latestVitals &&
                                latestVitals.tiles.length > 0 ? (
                                    <div className="px-3 py-2.5">
                                        <dl className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-x-4 gap-y-2.5">
                                            {latestVitals.tiles.map((tile) => (
                                                <div key={tile.label}>
                                                    <dt className="text-xs text-slate-500">
                                                        {tile.label}
                                                    </dt>
                                                    <dd className="mt-0.5 leading-none">
                                                        <span className="text-lg font-semibold text-cyan-950 tabular-nums">
                                                            {tile.value}
                                                        </span>
                                                        {tile.unit && (
                                                            <span className="ml-1 text-xs text-slate-500">
                                                                {tile.unit}
                                                            </span>
                                                        )}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                        {latestVitals.notes && (
                                            <p className="mt-2.5 border-t border-slate-100 pt-2 text-xs text-slate-600">
                                                {latestVitals.notes}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <EmptyState>
                                        No vitals recorded yet. They appear here
                                        after triage.
                                    </EmptyState>
                                )}
                            </Section>
                        </div>

                        <div className="lg:col-span-12 xl:col-span-3">
                            <Section
                                title="Chronic conditions"
                                icon={Stethoscope}
                                scrollClass="max-h-24"
                            >
                                {conditions.length > 0 ? (
                                    <ul className="flex flex-wrap gap-1.5 px-3 py-2.5">
                                        {conditions.map((c) => (
                                            <li
                                                key={c}
                                                className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800"
                                            >
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyState>
                                        No chronic conditions recorded.
                                    </EmptyState>
                                )}
                            </Section>
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_21rem]">
                        {/* Main column */}
                        <div className="min-w-0 space-y-3">
                            <Section
                                title="Medications"
                                icon={Pill}
                                summary={
                                    medications.length > 0
                                        ? `${medications.length} prescribed`
                                        : undefined
                                }
                                scrollClass="max-h-72"
                                toolbar={
                                    medications.length > 5 ? (
                                        <ListToolbar
                                            search={medSearch}
                                            onSearch={setMedSearch}
                                            placeholder="Search medications"
                                            status={medStatus}
                                            onStatus={setMedStatus}
                                            statuses={Array.from(
                                                new Set(
                                                    medications.map(
                                                        (m) => m.status,
                                                    ),
                                                ),
                                            )}
                                        />
                                    ) : undefined
                                }
                            >
                                <DataTable
                                    rows={filteredMedications}
                                    empty={
                                        medications.length === 0
                                            ? 'No prescriptions yet. They appear here once a clinician orders them.'
                                            : 'No medications match your search.'
                                    }
                                    columns={[
                                        {
                                            header: 'Medication',
                                            cell: (m) => (
                                                <div>
                                                    <p className="font-medium text-cyan-950">
                                                        {m.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Prescribed{' '}
                                                        {m.prescribedOn}
                                                        {m.prescribedBy
                                                            ? ` by ${m.prescribedBy}`
                                                            : ''}
                                                    </p>
                                                </div>
                                            ),
                                        },
                                        {
                                            header: 'Dosage',
                                            cell: (m) => m.dosage,
                                        },
                                        {
                                            header: 'Frequency',
                                            cell: (m) => m.frequency,
                                        },
                                        {
                                            header: 'Route',
                                            cell: (m) => m.route,
                                        },
                                        {
                                            header: 'Status',
                                            cell: (m) => (
                                                <StatusBadge label={m.status} />
                                            ),
                                        },
                                    ]}
                                />
                            </Section>

                            <Section
                                title="Lab results"
                                icon={FlaskConical}
                                summary={
                                    labResults.length > 0
                                        ? `${labResults.length} ${labResults.length === 1 ? 'test' : 'tests'}`
                                        : undefined
                                }
                                scrollClass="max-h-72"
                                toolbar={
                                    labResults.length > 5 ? (
                                        <ListToolbar
                                            search={labSearch}
                                            onSearch={setLabSearch}
                                            placeholder="Search tests"
                                            status={labStatus}
                                            onStatus={setLabStatus}
                                            statuses={Array.from(
                                                new Set(
                                                    labResults.map(
                                                        (l) => l.status,
                                                    ),
                                                ),
                                            )}
                                        />
                                    ) : undefined
                                }
                            >
                                <DataTable
                                    rows={filteredLabs}
                                    empty={
                                        labResults.length === 0
                                            ? 'No lab tests ordered for this patient.'
                                            : 'No tests match your search.'
                                    }
                                    columns={[
                                        {
                                            header: 'Test',
                                            cell: (l) => (
                                                <div>
                                                    <p className="font-medium text-cyan-950">
                                                        {l.test}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Ordered {l.date}
                                                    </p>
                                                </div>
                                            ),
                                        },
                                        {
                                            header: 'Result',
                                            cell: (l) =>
                                                l.value ? (
                                                    <div>
                                                        <p className="font-medium text-cyan-950 tabular-nums">
                                                            {l.value}
                                                        </p>
                                                        {l.range && (
                                                            <p className="text-xs text-slate-500">
                                                                Reference{' '}
                                                                {l.range}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : l.status === 'Completed' ? (
                                                    <span className="text-amber-800">
                                                        Result not entered
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">
                                                        {l.status ===
                                                        'Cancelled'
                                                            ? '—'
                                                            : 'Awaiting result'}
                                                    </span>
                                                ),
                                        },
                                        {
                                            header: 'Interpretation',
                                            cell: (l) =>
                                                l.interpretation ? (
                                                    <Badge
                                                        className={`px-2 py-0.5 text-xs font-medium ${interpretationTone(l.interpretation)}`}
                                                    >
                                                        {l.interpretation}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400">
                                                        —
                                                    </span>
                                                ),
                                        },
                                        {
                                            header: 'Status',
                                            cell: (l) => (
                                                <StatusBadge label={l.status} />
                                            ),
                                        },
                                    ]}
                                />
                            </Section>
                        </div>

                        {/* Side column */}
                        <div className="min-w-0 space-y-3">
                            <Section
                                title="Visit history"
                                icon={ClipboardList}
                                summary={
                                    history.length > 0
                                        ? `${history.length}`
                                        : undefined
                                }
                                scrollClass="max-h-72"
                            >
                                {history.length === 0 ? (
                                    <EmptyState>
                                        No visits or interactions recorded.
                                    </EmptyState>
                                ) : (
                                    <ol className="space-y-3 px-3 py-3">
                                        {history.map((item) => (
                                            <li
                                                key={item.id}
                                                className="border-l-2 border-cyan-200 pl-3"
                                            >
                                                <p className="text-[13px] font-medium text-cyan-950">
                                                    {humanize(item.type)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(
                                                        item.created_at,
                                                    )}
                                                    ,{' '}
                                                    {staffName(
                                                        item.provider_id,
                                                    )}
                                                </p>
                                                {item.description && (
                                                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </Section>

                            <Section
                                title="Appointments"
                                icon={CalendarClock}
                                summary={
                                    appointments.length > 0
                                        ? `${appointments.length}`
                                        : undefined
                                }
                                scrollClass="max-h-56"
                            >
                                {appointments.length === 0 ? (
                                    <EmptyState>
                                        No appointments recorded.
                                    </EmptyState>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {appointments.map((a) => (
                                            <li
                                                key={a.id}
                                                className="flex items-start justify-between gap-3 px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-medium text-cyan-950">
                                                        {a.title}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {a.provider}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {a.date}, {a.time}
                                                    </p>
                                                </div>
                                                <StatusBadge label={a.status} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>

                            <Section
                                title="Insurance"
                                icon={Shield}
                                scrollClass="max-h-48"
                            >
                                {patient.insurance_provider ||
                                patient.insurance_number ? (
                                    <dl className="space-y-1.5 px-3 py-2.5 text-[13px]">
                                        {[
                                            ['Provider', insuranceName],
                                            [
                                                'Policy number',
                                                patient.insurance_number,
                                            ],
                                            [
                                                'Expires',
                                                patient.insurance_expiry
                                                    ? formatDate(
                                                          patient.insurance_expiry,
                                                      )
                                                    : null,
                                            ],
                                            [
                                                'Status',
                                                insuranceExpired
                                                    ? 'Expired'
                                                    : patient.insurance_status
                                                      ? humanize(
                                                            patient.insurance_status,
                                                        )
                                                      : null,
                                            ],
                                        ].map(([label, value]) => (
                                            <div
                                                key={label}
                                                className="flex justify-between gap-4"
                                            >
                                                <dt className="text-slate-500">
                                                    {label}
                                                </dt>
                                                <dd
                                                    className={`text-right ${
                                                        label === 'Status' &&
                                                        insuranceExpired
                                                            ? 'font-medium text-amber-800'
                                                            : 'text-cyan-950'
                                                    }`}
                                                >
                                                    {value || '—'}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    <EmptyState>
                                        No insurance on file. Visits are
                                        self-pay.
                                    </EmptyState>
                                )}
                            </Section>
                        </div>
                    </div>
                </div>

                {/* Start visit (receptionists only) */}
                {canStartVisit && (
                    <PatientVisitSchemeModal
                        open={showStartVisitModal}
                        onOpenChange={setShowStartVisitModal}
                        onSubmit={handleStartVisit}
                        patient={patient}
                        schemes={insuranceProviders}
                        loading={starting}
                        title="Start patient visit"
                        subtitle="Create the encounter and confirm visit pricing"
                    />
                )}

                {/* Assign to department (receptionists only) */}
                {canStartVisit && (
                    <Dialog
                        open={showVisitModal}
                        onOpenChange={setShowVisitModal}
                    >
                        <DialogContent
                            className={`w-[95vw] max-w-5xl overflow-hidden bg-slate-50 p-0 text-[13px] ${FONT}`}
                        >
                            <DialogHeader className="px-5 pt-4 pb-2">
                                <DialogTitle className="text-base font-semibold text-cyan-950">
                                    Assign to department
                                </DialogTitle>
                                {activeVisitToken && (
                                    <p className="text-xs text-slate-600">
                                        Visit token{' '}
                                        <span className="font-mono text-cyan-950">
                                            {activeVisitToken}
                                        </span>
                                    </p>
                                )}
                            </DialogHeader>

                            {error && (
                                <div
                                    role="alert"
                                    className="mx-5 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="grid max-h-[62vh] overflow-y-auto lg:grid-cols-3 lg:overflow-hidden">
                                {/* Departments */}
                                <div className="flex min-h-0 flex-col p-3 lg:max-h-[62vh] lg:border-r">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-cyan-950">
                                            Department
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            {filteredDepartments.length} of{' '}
                                            {departments.length}
                                        </span>
                                    </div>
                                    <div className="relative mb-2">
                                        <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            aria-label="Search departments"
                                            placeholder="Search departments"
                                            className="h-8 bg-white pl-8 text-[13px]"
                                            value={departmentSearch}
                                            onChange={(e) =>
                                                setDepartmentSearch(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <Select
                                        value={departmentFilter}
                                        onValueChange={setDepartmentFilter}
                                    >
                                        <SelectTrigger
                                            aria-label="Filter departments"
                                            className="mb-2 h-8 bg-white text-xs"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All departments
                                            </SelectItem>
                                            <SelectItem value="active">
                                                Active only
                                            </SelectItem>
                                            <SelectItem value="inactive">
                                                Inactive only
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div
                                        role="radiogroup"
                                        aria-label="Department"
                                        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]"
                                    >
                                        {filteredDepartments.length === 0 && (
                                            <p className="py-6 text-center text-xs text-slate-500">
                                                No departments match.
                                            </p>
                                        )}
                                        {filteredDepartments.map((dept) => {
                                            const active =
                                                dept.is_active !== false &&
                                                dept.status !== 'inactive';
                                            return (
                                                <ChoiceRow
                                                    key={dept.id}
                                                    selected={
                                                        selectedDepartment ===
                                                        dept.id
                                                    }
                                                    disabled={!active}
                                                    onClick={() => {
                                                        setSelectedDepartment(
                                                            dept.id,
                                                        );
                                                        setError('');
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[13px] font-medium text-cyan-950">
                                                            {dept.department_name ||
                                                                dept.name ||
                                                                'Unnamed'}
                                                        </p>
                                                        {!active && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600">
                                                        Head:{' '}
                                                        {dept.head_of_department ||
                                                            'Not assigned'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {dept.location ||
                                                            'Location not set'}
                                                    </p>
                                                </ChoiceRow>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Staff */}
                                <div className="flex min-h-0 flex-col p-3 lg:max-h-[62vh] lg:border-r">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-cyan-950">
                                            Staff member
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            Optional
                                        </span>
                                    </div>
                                    <div className="relative mb-2">
                                        <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            aria-label="Search staff"
                                            placeholder="Search staff"
                                            className="h-8 bg-white pl-8 text-[13px]"
                                            value={staffSearch}
                                            onChange={(e) =>
                                                setStaffSearch(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div
                                        role="radiogroup"
                                        aria-label="Staff member"
                                        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]"
                                    >
                                        {filteredStaff.length === 0 && (
                                            <p className="py-6 text-center text-xs text-slate-500">
                                                No staff match.
                                            </p>
                                        )}
                                        {filteredStaff.map((person) => (
                                            <ChoiceRow
                                                key={person.id}
                                                selected={
                                                    selectedStaff === person.id
                                                }
                                                onClick={() => {
                                                    setSelectedStaff(person.id);
                                                    setError('');
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7">
                                                        <AvatarFallback className="bg-cyan-100 text-xs text-cyan-800">
                                                            {person.initials ||
                                                                initialsOf(
                                                                    person.name,
                                                                )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="truncate text-[13px] font-medium text-cyan-950">
                                                                {person.name}
                                                            </p>
                                                            {person.available ===
                                                                true && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-emerald-50 text-xs text-emerald-800"
                                                                >
                                                                    Available
                                                                </Badge>
                                                            )}
                                                            {person.available ===
                                                                false && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-red-50 text-xs text-red-800"
                                                                >
                                                                    Busy
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-600">
                                                            {person.role ||
                                                                'Staff'}
                                                            ,{' '}
                                                            {person.department ||
                                                                'General'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {person.patients ??
                                                                0}{' '}
                                                            patients today
                                                        </p>
                                                    </div>
                                                </div>
                                            </ChoiceRow>
                                        ))}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-4 p-3 lg:max-h-[62vh] lg:overflow-y-auto">
                                    <h3 className="text-sm font-semibold text-cyan-950">
                                        Details
                                    </h3>

                                    <div>
                                        <p className="mb-1.5 text-xs font-medium text-slate-600">
                                            Service type
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {SERVICE_OPTIONS.map((item) => {
                                                const on =
                                                    selectedServices.includes(
                                                        item.id,
                                                    );
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        aria-pressed={on}
                                                        onClick={() =>
                                                            toggleService(
                                                                item.id,
                                                            )
                                                        }
                                                        className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-1 focus-visible:outline-none ${
                                                            on
                                                                ? item.on
                                                                : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {item.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-1.5 text-xs font-medium text-slate-600">
                                            Type of visit
                                        </p>
                                        <div
                                            role="radiogroup"
                                            aria-label="Type of visit"
                                            className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1"
                                        >
                                            {[
                                                {
                                                    value: 1,
                                                    label: 'New visit',
                                                },
                                                { value: 2, label: 'Revisit' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={
                                                        visitType === opt.value
                                                    }
                                                    onClick={() =>
                                                        setVisitType(opt.value)
                                                    }
                                                    className={`cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:outline-none ${
                                                        visitType === opt.value
                                                            ? 'bg-cyan-700 text-white'
                                                            : 'text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <Label
                                            htmlFor="purpose_of_visit"
                                            className="mb-1.5 block text-xs font-medium text-slate-600"
                                        >
                                            Purpose of visit
                                        </Label>
                                        <textarea
                                            id="purpose_of_visit"
                                            rows={4}
                                            value={purposeOfVisit}
                                            onChange={(e) =>
                                                setPurposeOfVisit(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Reason for coming in today"
                                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[13px] focus:ring-2 focus:ring-cyan-600 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 border-t bg-white px-5 py-3">
                                <Button
                                    variant="outline"
                                    className="h-8 cursor-pointer text-[13px]"
                                    onClick={() => {
                                        setShowVisitModal(false);
                                        resetSelections();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className={`h-8 cursor-pointer text-[13px] ${PRIMARY_BTN}`}
                                    onClick={handleAssign}
                                    disabled={assigning}
                                >
                                    {assigning
                                        ? 'Assigning…'
                                        : 'Assign patient'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </PatientLayout>
    );
}
