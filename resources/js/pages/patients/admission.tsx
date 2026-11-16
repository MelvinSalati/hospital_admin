import { router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    ActivityIcon,
    AlertTriangle,
    ClipboardList,
    LogOut,
    Plus,
    StethoscopeIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { admissionAPI } from '@/services/api';
import AdmissionModal from './components/AdmissionModal';
import ConsultationTabs from './components/ConsultationTabs';
import NursingDiagnosis from './components/NursingDiagnosis';
import RecentInteractions from './components/RecentInteractions';
import VitalSignsTab from './components/VitalSignsTab';

/* -------------------------------------------------------------------------- */
/* Types & helpers                                                             */
/* -------------------------------------------------------------------------- */

interface Admission {
    id: number;
    admission_number: string;
    admission_date?: string;
    date_of_admission?: string;
    department?: string;
    bed?: string;
    discharge_date?: string | null;
    status?: 'active' | 'discharged';
    uuid?: string;
}

type TabValue = 'admissions' | 'firm' | 'vitals';
type ConsultationTabValue =
    | 'recent-interactions'
    | 'add-interactions'
    | 'nursing';

const isDischarged = (a: Admission) =>
    Boolean(a.discharge_date) || a.status === 'discharged';

const formatAdmissionDate = (a: Admission) => {
    const raw = a.date_of_admission ?? a.admission_date;
    if (!raw) return '–';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? '–' : format(date, 'PPP');
};

function getPatientIdFromUrl(): number | undefined {
    if (typeof window === 'undefined') return undefined;
    const [section, page, id] = window.location.pathname
        .split('/')
        .filter(Boolean);
    if (section !== 'patients' || page !== 'admissions') return undefined;
    const parsed = parseInt(id, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
}

const TABS: { value: TabValue; label: string; icon: typeof ActivityIcon }[] = [
    { value: 'admissions', label: 'Admissions', icon: StethoscopeIcon },
    { value: 'firm', label: 'Review patient', icon: ClipboardList },
    { value: 'vitals', label: 'Vitals', icon: ActivityIcon },
];

const CONSULTATION_TABS: {
    value: ConsultationTabValue;
    label: string;
    icon: typeof ActivityIcon;
}[] = [
    {
        value: 'recent-interactions',
        label: 'Recent interactions',
        icon: ActivityIcon,
    },
    { value: 'add-interactions', label: 'Add interaction', icon: Plus },
    { value: 'nursing', label: 'Nursing', icon: ActivityIcon },
];

/* -------------------------------------------------------------------------- */
/* Admissions table + empty state                                              */
/* -------------------------------------------------------------------------- */

function AdmissionsTable({
    admissions,
    onDischarge,
}: {
    admissions: Admission[];
    onDischarge: (admission: Admission) => void;
}) {
    return (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Admission number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Bed</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {admissions.map((admission) => {
                        const discharged = isDischarged(admission);
                        return (
                            <TableRow key={admission.id}>
                                <TableCell className="font-medium">
                                    {admission.admission_number}
                                </TableCell>
                                <TableCell>
                                    {formatAdmissionDate(admission)}
                                </TableCell>
                                <TableCell>
                                    {discharged ? (
                                        <Badge className="bg-gray-100 text-gray-700">
                                            Discharged
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-green-50 text-green-700">
                                            Active
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {admission.department ?? '–'}
                                </TableCell>
                                <TableCell>{admission.bed ?? '–'}</TableCell>
                                <TableCell className="text-right">
                                    {!discharged && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-blue-700"
                                            onClick={() =>
                                                onDischarge(admission)
                                            }
                                        >
                                            <LogOut
                                                className="mr-1 h-4 w-4"
                                                aria-hidden="true"
                                            />
                                            Discharge
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function NoAdmissions({ onAdmit }: { onAdmit: () => void }) {
    return (
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 py-10 text-center">
            <h2 className="text-lg font-medium text-gray-800">
                No admissions yet
            </h2>
            <p className="mx-auto mt-1 mb-4 max-w-sm text-sm text-gray-600">
                Admit this patient to start recording interactions and vitals.
            </p>
            <Button onClick={onAdmit}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Admit patient
            </Button>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Discharge dialog                                                            */
/* -------------------------------------------------------------------------- */

function DischargeDialog({
    admission,
    isSubmitting,
    error,
    notes,
    onNotesChange,
    onConfirm,
    onClose,
}: {
    admission: Admission | null;
    isSubmitting: boolean;
    error: string | null;
    notes: string;
    onNotesChange: (value: string) => void;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Dialog
            open={admission !== null}
            onOpenChange={(open) => {
                if (!open && !isSubmitting) onClose();
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-yellow-100 p-2">
                            <AlertTriangle
                                className="h-5 w-5 text-yellow-700"
                                aria-hidden="true"
                            />
                        </div>
                        <DialogTitle>Discharge patient?</DialogTitle>
                    </div>
                    <DialogDescription>
                        This marks the patient as discharged and frees the bed.
                        It can’t be undone.
                    </DialogDescription>
                </DialogHeader>

                {admission && (
                    <dl className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
                        {[
                            ['Admission number', admission.admission_number],
                            ['Department', admission.department ?? '–'],
                            ['Bed', admission.bed ?? '–'],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between">
                                <dt className="text-gray-600">{label}</dt>
                                <dd className="font-medium text-gray-900">
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}

                <div>
                    <label
                        htmlFor="discharge-notes"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Discharge notes (optional)
                    </label>
                    <textarea
                        id="discharge-notes"
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        rows={3}
                        disabled={isSubmitting}
                        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
                    />
                </div>

                {error && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </p>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        {isSubmitting ? (
                            <>
                                <span
                                    className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                    aria-hidden="true"
                                />
                                Discharging…
                            </>
                        ) : (
                            'Discharge patient'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function Admissions() {
    const {
        admissions: admissionsProp,
        auth,
        nursing_diagnosis: nursingDx,
        doctors: doctorsList,
        interactions: recent,
        admission_number,
    } = usePage().props as any;

    const admissions: Admission[] = admissionsProp ?? [];
    const patientId = useMemo(getPatientIdFromUrl, []);
    const doctorId = auth.user.id;
    const hasActiveAdmission = admissions.some((a) => !isDischarged(a));

    const [activeTab, setActiveTab] = useState<TabValue>('admissions');
    const [activeConsultationTab, setActiveConsultationTab] =
        useState<ConsultationTabValue>('recent-interactions');
    const [showAdmissionModal, setShowAdmissionModal] = useState(false);

    const [dischargeTarget, setDischargeTarget] = useState<Admission | null>(
        null,
    );
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [isDischarging, setIsDischarging] = useState(false);
    const [dischargeError, setDischargeError] = useState<string | null>(null);

    const openDischarge = (admission: Admission) => {
        setDischargeTarget(admission);
        setDischargeNotes('');
        setDischargeError(null);
    };

    const closeDischarge = () => {
        setDischargeTarget(null);
        setDischargeError(null);
    };

    const confirmDischarge = async () => {
        if (!dischargeTarget) return;
        setIsDischarging(true);
        setDischargeError(null);

        try {
            await admissionAPI.discharge(
                dischargeTarget.uuid || String(dischargeTarget.id),
                {
                    discharge_date: new Date().toISOString(),
                    discharged_by: auth.user.id,
                    discharged_by_name: auth.user.name,
                    diagnosis_on_discharge: '',
                    discharge_notes:
                        dischargeNotes.trim() || 'Patient discharged',
                },
            );
            closeDischarge();
            router.reload();
        } catch (error: any) {
            setDischargeError(
                error?.message ||
                    'Couldn’t discharge the patient. Check your connection and try again.',
            );
        } finally {
            setIsDischarging(false);
        }
    };

    const renderConsultationTab = () => {
        switch (activeConsultationTab) {
            case 'recent-interactions':
                return (
                    <RecentInteractions
                        admissionNumber={admission_number}
                        data={recent}
                        patientId={patientId}
                        onDiagnosisAdded={() =>
                            router.reload({ only: ['interactions'] })
                        }
                    />
                );
            case 'add-interactions':
                return (
                    <ConsultationTabs
                        admissionNumber={admission_number}
                        patientId={patientId}
                        doctorId={doctorId}
                        interactions={recent}
                    />
                );
            case 'nursing':
                return (
                    <NursingDiagnosis
                        admissionNumber={admission_number}
                        patientId={patientId}
                        initialData={nursingDx}
                    />
                );
        }
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: 'Admission', href: '#' },
            ]}
        >
            <div className="h-full bg-blue-100 p-2">
                <PageHeader
                    icon={<StethoscopeIcon />}
                    title="Admission"
                    subtitle="View current active admission"
                    actions={
                        hasActiveAdmission
                            ? []
                            : [
                                  {
                                      label: 'Admit patient',
                                      onClick: () =>
                                          setShowAdmissionModal(true),
                                  },
                              ]
                    }
                />

                <div
                    role="tablist"
                    aria-label="Admission sections"
                    className="mb-6 flex gap-3"
                >
                    {TABS.map(({ value, label, icon: Icon }) => (
                        <Button
                            key={value}
                            role="tab"
                            aria-selected={activeTab === value}
                            variant={
                                activeTab === value ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setActiveTab(value)}
                        >
                            <Icon className="mr-1 h-4 w-4" aria-hidden="true" />
                            {label}
                        </Button>
                    ))}
                </div>

                {activeTab === 'admissions' && (
                    <div className="mt-6 w-full">
                        {admissions.length > 0 ? (
                            <AdmissionsTable
                                admissions={admissions}
                                onDischarge={openDischarge}
                            />
                        ) : (
                            <NoAdmissions
                                onAdmit={() => setShowAdmissionModal(true)}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'firm' && (
                    <>
                        <div
                            role="tablist"
                            aria-label="Review sections"
                            className="flex gap-2"
                        >
                            {CONSULTATION_TABS.map(
                                ({ value, label, icon: Icon }) => {
                                    const selected =
                                        activeConsultationTab === value;
                                    return (
                                        <Button
                                            key={value}
                                            role="tab"
                                            aria-selected={selected}
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setActiveConsultationTab(value)
                                            }
                                            className={`flex items-center gap-1 rounded-none border-b-2 transition-colors ${
                                                selected
                                                    ? 'border-gray-700 bg-transparent text-gray-900'
                                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                                            }`}
                                        >
                                            <Icon
                                                className="mr-1 h-4 w-4"
                                                aria-hidden="true"
                                            />
                                            {label}
                                        </Button>
                                    );
                                },
                            )}
                        </div>
                        <div className="mt-6 w-full">
                            {renderConsultationTab()}
                        </div>
                    </>
                )}

                {activeTab === 'vitals' && (
                    <VitalSignsTab
                        admissionNumber={admission_number}
                        patientId={patientId}
                    />
                )}
            </div>

            <AdmissionModal
                open={showAdmissionModal}
                onOpenChange={setShowAdmissionModal}
                admittedById={auth.user.id}
                doctorsList={doctorsList}
                patientId={patientId}
                onSuccess={() => {
                    setShowAdmissionModal(false);
                    router.reload();
                }}
            />

            <DischargeDialog
                admission={dischargeTarget}
                isSubmitting={isDischarging}
                error={dischargeError}
                notes={dischargeNotes}
                onNotesChange={setDischargeNotes}
                onConfirm={confirmDischarge}
                onClose={closeDischarge}
            />
        </PatientLayout>
    );
}
