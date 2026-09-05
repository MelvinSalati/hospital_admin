import { router } from '@inertiajs/react';
import {
    Activity,
    Plus,
    Stethoscope,
    X,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import {
    useState,
    useEffect,
    useCallback,
    useRef
    
} from 'react';
import type {ReactNode} from 'react';
import { Button } from '@/components/ui/button';
import PatientLayout from '@/layouts/patients/PatientLayout';
import ConsultationTabs from './components/ConsultationTabs';
import RecentInteractions from './components/RecentInteractions';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Patient {
    id: number;
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
}

interface Props {
    patient?: Patient | null;
    appointments?: unknown[];
    consultations?: unknown[];
    recentInteractions?: unknown[];
}

type NavSection = 'recent' | 'add';

/* -------------------------------------------------------------------------- */
/* Custom full-width Consultation Modal                                       */
/* (intentionally NOT using shadcn Dialog)                                    */
/* -------------------------------------------------------------------------- */

interface ConsultationModalProps {
    open: boolean;
    onClose: () => void;
    patientName: string;
    children: ReactNode;
}

function ConsultationModal({
    open,
    onClose,
    patientName,
    children,
}: ConsultationModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Lock body scroll while open
    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    // Escape key
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Basic focus management
    useEffect(() => {
        if (open && dialogRef.current) {
            dialogRef.current.focus();
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog panel – almost full screen, flexible */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="consultation-modal-title"
                tabIndex={-1}
                className="relative z-10 flex h-full max-h-[95vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none sm:h-[92vh]"
            >
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div>
                        <h2
                            id="consultation-modal-title"
                            className="flex items-center gap-2 text-lg font-semibold text-slate-900"
                        >
                            <Plus className="h-5 w-5 text-blue-600" />
                            Add Interaction
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Record a new clinical interaction for{' '}
                            <span className="font-medium text-slate-700">
                                {patientName}
                            </span>
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="-mr-1 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable body – existing form lives here */}
                <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function ConsultationHeader({
    patientName,
    onAddClick,
}: {
    patientName: string;
    onAddClick: () => void;
}) {
    return (
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                        Consultation
                    </h1>
                    <p className="text-sm text-slate-500">{patientName}</p>
                </div>
            </div>

            <Button
                onClick={onAddClick}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
                <Plus className="h-4 w-4" />
                Add Interaction
            </Button>
        </header>
    );
}

/* -------------------------------------------------------------------------- */
/* Vertical Navigation                                                        */
/* -------------------------------------------------------------------------- */

function ConsultationNavigation({
    active,
    onSelectRecent,
    onSelectAdd,
}: {
    active: NavSection;
    onSelectRecent: () => void;
    onSelectAdd: () => void;
}) {
    const itemClass = (isActive: boolean) =>
        `flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`;

    return (
        <nav className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-white">
            <div className="px-4 pt-5 pb-2">
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    Consultation
                </p>
            </div>

            <div className="flex flex-col gap-0.5 px-2">
                <button
                    type="button"
                    onClick={onSelectRecent}
                    className={itemClass(active === 'recent')}
                >
                    <Activity className="h-4 w-4 shrink-0" />
                    Recent Interactions
                </button>

                <button
                    type="button"
                    onClick={onSelectAdd}
                    className={itemClass(active === 'add')}
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    Add Interaction
                </button>
            </div>
        </nav>
    );
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function Consultation({
    patient,
    consultations,
    recentInteractions,
}: Props) {
    /* ---- Patient ID (prefer Inertia prop) ---- */
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    const patientIdFromUrl = Number.isFinite(Number(lastSegment))
        ? Number(lastSegment)
        : null;

    const patientId = patient?.id ?? patientIdFromUrl;

    /* ---- State ---- */
    const [patientData, setPatientData] = useState<Patient | null>(
        patient ?? null,
    );
    const [isLoadingPatient, setIsLoadingPatient] = useState(false);
    const [patientError, setPatientError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<NavSection>('recent');
    const [isModalOpen, setIsModalOpen] = useState(false);

    /* ---- Interactions from Inertia props (no extra fetch) ---- */
    const interactions = recentInteractions ?? consultations ?? [];

    const patientName = patientData
        ? `${patientData.first_name ?? ''} ${patientData.last_name ?? ''}`.trim() ||
          'Patient'
        : 'Patient';

    /* ---- Optional patient fallback (only when prop is missing) ---- */
    /* Safely checks Content-Type before parsing JSON to avoid the           */
    /* "Unexpected token '<'" error when an HTML page is returned.           */
    const fetchPatientSafely = useCallback(async (id: number) => {
        setIsLoadingPatient(true);
        setPatientError(null);

        try {
            const response = await fetch(`/api/patients/${id}`);

            if (!response.ok) {
                throw new Error(
                    `Request failed with status ${response.status}`,
                );
            }

            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    'Expected JSON response but received non-JSON content. ' +
                        'The patient endpoint may not exist or is returning an HTML page.',
                );
            }

            const data = await response.json();
            setPatientData((data.data ?? data) as Patient);
        } catch (err) {
            console.error(err);
            setPatientError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load patient information.',
            );
        } finally {
            setIsLoadingPatient(false);
        }
    }, []);

    useEffect(() => {
        // Prefer the patient already supplied by Inertia.
        // Only fall back to a browser fetch when the prop is genuinely missing.
        if (!patient && patientIdFromUrl) {
            fetchPatientSafely(patientIdFromUrl);
        }
    }, [patient, patientIdFromUrl, fetchPatientSafely]);

    /* ---- Success handler (preserves original behaviour) ---- */
    const handleConsultationSuccess = () => {
        setIsModalOpen(false);
        setActiveSection('recent');
        router.reload();
    };

    const openAddModal = () => {
        setIsModalOpen(true);
        setActiveSection('add');
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveSection('recent');
    };

    /* ---- Guard: cannot determine patient ---- */
    if (!patientId) {
        return (
            <PatientLayout
                patient={null}
                breadcrumbs={[
                    { title: 'Patients', href: '/patients' },
                    { title: 'Consultations', href: '' },
                ]}
            >
                <div className="flex h-64 items-center justify-center p-8">
                    <div className="flex flex-col items-center gap-3 text-center text-slate-500">
                        <AlertCircle className="h-8 w-8 text-slate-400" />
                        <p className="text-sm font-medium">
                            Unable to determine patient
                        </p>
                        <p className="text-xs">
                            Please open this page from a valid patient record.
                        </p>
                    </div>
                </div>
            </PatientLayout>
        );
    }

    return (
        <PatientLayout
            patient={patientData}
            breadcrumbs={[
                { title: 'Patients', href: '/patients' },
                {
                    title: patientName,
                    href: `/patients/${patientId}`,
                },
                { title: 'Consultations', href: '' },
            ]}
        >
            <div className="flex h-full flex-col bg-slate-50">
                <ConsultationHeader
                    patientName={patientName}
                    onAddClick={openAddModal}
                />

                <div className="flex flex-1 overflow-hidden">
                    <ConsultationNavigation
                        active={activeSection}
                        onSelectRecent={() => setActiveSection('recent')}
                        onSelectAdd={openAddModal}
                    />

                    <main className="flex-1 overflow-y-auto p-5">
                        {/* Loading */}
                        {isLoadingPatient && (
                            <div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading patient information…
                            </div>
                        )}

                        {/* Error (non-blocking) */}
                        {patientError && !isLoadingPatient && (
                            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <p className="font-medium">
                                        Patient details could not be refreshed
                                    </p>
                                    <p className="mt-0.5 text-amber-700/90">
                                        {patientError}
                                    </p>
                                    <p className="mt-1 text-xs text-amber-600">
                                        Continuing with available data. The form
                                        will still use the correct patient ID.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Recent Interactions workspace */}
                        {!isLoadingPatient && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-blue-600" />
                                        <h2 className="text-base font-semibold text-slate-900">
                                            Recent Interactions
                                        </h2>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                        {interactions.length}{' '}
                                        {interactions.length === 1
                                            ? 'record'
                                            : 'records'}
                                    </span>
                                </div>

                                <div className="p-5">
                                    {interactions.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-center">
                                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                                <Activity className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">
                                                No recent interactions
                                            </p>
                                            <p className="mt-1 max-w-xs text-xs text-slate-500">
                                                There are no consultation
                                                records for this patient yet.
                                            </p>
                                            <Button
                                                onClick={openAddModal}
                                                variant="outline"
                                                size="sm"
                                                className="mt-4 gap-1.5"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Add first interaction
                                            </Button>
                                        </div>
                                    ) : (
                                        <RecentInteractions
                                            isAdmission={true}
                                            data={interactions}
                                            patientId={patientId}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* ============================================================ */}
            {/* Custom full-width modal                                      */}
            {/* Contains the EXISTING ConsultationTabs form.                 */}
            {/* Submission endpoint, method, payload, validation and         */}
            {/* success/error handling remain completely unchanged.          */}
            {/* ============================================================ */}
            <ConsultationModal
                open={isModalOpen}
                onClose={closeModal}
                patientName={patientName}
            >
                <ConsultationTabs
                    patientId={patientId}
                    onSuccess={handleConsultationSuccess}
                />
            </ConsultationModal>
        </PatientLayout>
    );
}
