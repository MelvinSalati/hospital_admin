import {
    Stethoscope,
    ClipboardList,
    Pill,
    Activity,
    Calendar,
    ChevronDown,
    ChevronUp,
    FileText,
    AlertCircle,
    PlusCircle,
    X,
    ClipboardCheck,
} from 'lucide-react';
import Notiflix from 'notiflix';
import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import Http from '@/utils/Http';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChiefComplaint {
    symptom: string;
    severity: number;
    duration: string;
    onset?: string;
    characteristics?: string;
}

interface DrugHistoryItem {
    drugName: string;
    dosage?: string;
    frequency?: string;
    status?: string;
}

interface MedicalCondition {
    condition: string;
    diagnosedDate: string;
    status?: string;
    notes?: string | null;
}

interface PhysicalExam {
    system: string;
    finding: string;
    normal: boolean;
    description?: string;
}

interface Diagnosis {
    id?: number;
    diagnosis_uuid?: string;
    patient_id?: number;
    consultation_uuid?: string;
    diagnosis: string;
    icd10_code?: string;
    diagnosed_date: string;
    status: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

interface Interaction {
    id: number;
    consultation_uuid: string;
    chief_complaints: ChiefComplaint[];
    chief_complaints_summary: string;
    drug_history: DrugHistoryItem[];
    drug_history_summary: string;
    medical_conditions: MedicalCondition[];
    medical_conditions_summary: string;
    physical_exam: PhysicalExam[];
    has_chief_complaints: boolean;
    status: string;
    submitted_at: string;
    diagnoses?: Diagnosis[] | null;
}

interface Props {
    isAdmission?: boolean;
    admissionNumber?: string | string[];
    data?: Interaction[];
    isLoading?: boolean;
    patientId?: number;
    onViewDetails?: (consultationUuid: string) => void;
    onDiagnosisAdded?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
    const variants: Record<
        string,
        { label: string; gradient: string; icon: JSX.Element }
    > = {
        completed: {
            label: 'Completed',
            gradient: 'from-emerald-400 to-emerald-500',
            icon: <ClipboardCheck size={14} />,
        },
        pending: {
            label: 'Pending',
            gradient: 'from-amber-400 to-amber-500',
            icon: <ClipboardList size={14} />,
        },
        cancelled: {
            label: 'Cancelled',
            gradient: 'from-red-400 to-red-500',
            icon: <X size={14} />,
        },
    };
    return (
        variants[status?.toLowerCase()] || {
            label: status || 'Unknown',
            gradient: 'from-gray-400 to-gray-500',
            icon: <ClipboardList size={14} />,
        }
    );
};

const getSeverityBadge = (severity: number) => {
    const colors: Record<number, string> = {
        1: 'bg-emerald-100 text-emerald-700',
        2: 'bg-blue-100 text-blue-700',
        3: 'bg-amber-100 text-amber-700',
        4: 'bg-orange-100 text-orange-700',
        5: 'bg-red-100 text-red-700',
    };
    return colors[severity] || colors[3];
};

const getDiagnosisStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700',
        resolved: 'bg-blue-100 text-blue-700',
        chronic: 'bg-amber-100 text-amber-700',
        inactive: 'bg-gray-100 text-gray-700',
    };
    return variants[status] || 'bg-gray-100 text-gray-700';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecentInteractions({
    isAdmission,
    admissionNumber = [],
    data: interactions = [],
    isLoading = false,
    patientId,
    onViewDetails,
    onDiagnosisAdded,
}: Props) {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
    const [selectedConsultation, setSelectedConsultation] =
        useState<Interaction | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [diagnosisForm, setDiagnosisForm] = useState({
        diagnosis: '',
        icd10_code: '',
        diagnosed_date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'active',
    });

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const hasDiagnosis = (interaction: Interaction): boolean => {
        return (
            interaction.diagnoses !== null &&
            interaction.diagnoses !== undefined &&
            Array.isArray(interaction.diagnoses) &&
            interaction.diagnoses.length > 0
        );
    };

    const handleAddDiagnosisClick = (interaction: Interaction) => {
        if (!patientId) {
            Notiflix.Notify.failure('Patient information is missing');
            return;
        }
        setSelectedConsultation(interaction);
        setShowDiagnosisModal(true);
        setDiagnosisForm({
            diagnosis: '',
            icd10_code: '',
            diagnosed_date: new Date().toISOString().split('T')[0],
            notes: '',
            status: 'active',
        });
    };

    const handleSubmitDiagnosis = async () => {
        if (!diagnosisForm.diagnosis.trim()) {
            Notiflix.Notify.failure('Please enter a diagnosis');
            return;
        }
        if (!selectedConsultation || !patientId) {
            Notiflix.Notify.failure(
                'Missing consultation or patient information',
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await Http.post(
                `/consultation/diagnosis/${selectedConsultation.consultation_uuid}`,
                {
                    patient_id: patientId,
                    admission_number: isAdmission ? admissionNumber : null,
                    consultation_uuid: selectedConsultation.consultation_uuid,
                    diagnosis: diagnosisForm.diagnosis,
                    icd10_code: diagnosisForm.icd10_code || null,
                    diagnosed_date: diagnosisForm.diagnosed_date,
                    status: diagnosisForm.status,
                    notes: diagnosisForm.notes || null,
                },
            );

            if (
                response.status === 201 ||
                response.status === 200 ||
                response.data?.status === true
            ) {
                Notiflix.Notify.success('Diagnosis added successfully');
                setDiagnosisForm({
                    diagnosis: '',
                    icd10_code: '',
                    diagnosed_date: new Date().toISOString().split('T')[0],
                    status: 'active',
                    notes: '',
                });
                setShowDiagnosisModal(false);
                setSelectedConsultation(null);
                if (onDiagnosisAdded) {
                    await onDiagnosisAdded();
                }
            } else {
                throw new Error(
                    response.data?.message || 'Failed to add diagnosis',
                );
            }
        } catch (error: any) {
            console.error('Error adding diagnosis:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Failed to add diagnosis. Please try again.';
            Notiflix.Notify.failure(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Expanded Row Content ────────────────────────────────────────────────

    const renderExpandedContent = (interaction: Interaction) => (
        <div className="space-y-4 bg-slate-50 p-4">
            {/* Diagnoses */}
            {hasDiagnosis(interaction) && interaction.diagnoses && (
                <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Stethoscope className="h-4 w-4 text-emerald-600" />
                        Diagnoses
                    </h4>
                    <div className="grid gap-2 pl-6">
                        {interaction.diagnoses.map((diag, idx) => (
                            <div
                                key={diag.diagnosis_uuid || idx}
                                className="border-l-2 border-emerald-200 pl-3 text-sm"
                            >
                                <div className="font-medium text-slate-800">
                                    {diag.diagnosis}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                                    {diag.icd10_code && (
                                        <span>ICD-10: {diag.icd10_code}</span>
                                    )}
                                    <span>
                                        Diagnosed:{' '}
                                        {new Date(
                                            diag.diagnosed_date,
                                        ).toLocaleDateString()}
                                    </span>
                                    {diag.status && (
                                        <Badge
                                            className={getDiagnosisStatusBadge(
                                                diag.status,
                                            )}
                                        >
                                            {diag.status}
                                        </Badge>
                                    )}
                                </div>
                                {diag.notes && (
                                    <div className="mt-2 text-xs text-slate-500">
                                        Notes: {diag.notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!hasDiagnosis(interaction) && (
                <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Stethoscope className="h-4 w-4 text-slate-400" />
                        Diagnosis
                    </h4>
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-center">
                        <p className="mb-2 text-sm text-amber-800">
                            No diagnosis has been added for this consultation.
                        </p>
                        <Button
                            size="sm"
                            onClick={() => handleAddDiagnosisClick(interaction)}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <PlusCircle className="mr-1 h-3 w-3" />
                            Add Diagnosis Now
                        </Button>
                    </div>
                </div>
            )}

            {/* Chief Complaints */}
            {interaction.chief_complaints &&
                interaction.chief_complaints.length > 0 && (
                    <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Activity className="h-4 w-4 text-blue-600" />
                            Chief Complaints Details
                        </h4>
                        <div className="grid gap-2 pl-6">
                            {interaction.chief_complaints.map(
                                (complaint, idx) => (
                                    <div
                                        key={idx}
                                        className="border-l-2 border-blue-200 pl-3 text-sm"
                                    >
                                        <div className="font-medium text-slate-800">
                                            {complaint.symptom}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                                            <span>
                                                Severity:
                                                <Badge
                                                    className={`ml-1 ${getSeverityBadge(complaint.severity)}`}
                                                >
                                                    {complaint.severity}/5
                                                </Badge>
                                            </span>
                                            <span>
                                                Duration: {complaint.duration}
                                            </span>
                                            {complaint.onset && (
                                                <span>
                                                    Onset: {complaint.onset}
                                                </span>
                                            )}
                                        </div>
                                        {complaint.characteristics && (
                                            <div className="mt-1 text-xs text-slate-500">
                                                {complaint.characteristics}
                                            </div>
                                        )}
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

            {/* Drug History */}
            {interaction.drug_history &&
                interaction.drug_history.length > 0 && (
                    <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Pill className="h-4 w-4 text-emerald-600" />
                            Medications
                        </h4>
                        <div className="grid gap-2 pl-6">
                            {interaction.drug_history.map((drug, idx) => (
                                <div
                                    key={idx}
                                    className="border-l-2 border-emerald-200 pl-3 text-sm"
                                >
                                    <div className="font-medium text-slate-800">
                                        {drug.drugName}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                                        {drug.dosage && (
                                            <span>Dosage: {drug.dosage}</span>
                                        )}
                                        {drug.frequency && (
                                            <span>
                                                Frequency: {drug.frequency}
                                            </span>
                                        )}
                                        {drug.status && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {drug.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            {/* Medical Conditions */}
            {interaction.medical_conditions &&
                interaction.medical_conditions.length > 0 && (
                    <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <FileText className="h-4 w-4 text-violet-600" />
                            Medical Conditions
                        </h4>
                        <div className="grid gap-2 pl-6">
                            {interaction.medical_conditions.map(
                                (condition, idx) => (
                                    <div
                                        key={idx}
                                        className="border-l-2 border-violet-200 pl-3 text-sm"
                                    >
                                        <div className="font-medium text-slate-800">
                                            {condition.condition}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                                            <span>
                                                Diagnosed:{' '}
                                                {new Date(
                                                    condition.diagnosedDate,
                                                ).toLocaleDateString()}
                                            </span>
                                            {condition.status && (
                                                <span>
                                                    Status: {condition.status}
                                                </span>
                                            )}
                                        </div>
                                        {condition.notes && (
                                            <div className="mt-1 text-xs text-slate-500">
                                                Notes: {condition.notes}
                                            </div>
                                        )}
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

            {/* Physical Exam */}
            {interaction.physical_exam &&
                interaction.physical_exam.length > 0 && (
                    <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Stethoscope className="h-4 w-4 text-amber-600" />
                            Physical Examination
                        </h4>
                        <div className="grid gap-2 pl-6">
                            {interaction.physical_exam.map((exam, idx) => (
                                <div
                                    key={idx}
                                    className="border-l-2 border-amber-200 pl-3 text-sm"
                                >
                                    <div className="font-medium text-slate-800">
                                        {exam.system}: {exam.finding}
                                    </div>
                                    <div className="mt-1 flex gap-3 text-xs text-slate-600">
                                        <Badge
                                            variant={
                                                exam.normal
                                                    ? 'outline'
                                                    : 'destructive'
                                            }
                                        >
                                            {exam.normal
                                                ? 'Normal'
                                                : 'Abnormal'}
                                        </Badge>
                                        {exam.description && (
                                            <span>{exam.description}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            {!interaction.chief_complaints?.length &&
                !interaction.drug_history?.length &&
                !interaction.medical_conditions?.length &&
                !interaction.physical_exam?.length &&
                !hasDiagnosis(interaction) && (
                    <div className="py-4 text-center text-sm text-slate-500">
                        No detailed clinical data available for this
                        consultation
                    </div>
                )}
        </div>
    );

    // ─── Columns ─────────────────────────────────────────────────────────────

    const columns: Column<Interaction>[] = [
        {
            id: 'id',
            label: '',
            sortable: false,
            format: (_, row) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRow(row.id)}
                    className="h-8 w-8 p-0"
                >
                    {expandedRows.has(row.id) ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </Button>
            ),
        },
        {
            id: 'submitted_at',
            label: 'Date',
            sortable: true,
            format: (value) => (
                <div>
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-sm text-slate-700">
                            {new Date(value).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="text-xs text-slate-400">
                        {new Date(value).toLocaleTimeString()}
                    </div>
                </div>
            ),
        },
        {
            id: 'chief_complaints_summary',
            label: 'Chief Complaints',
            sortable: false,
            format: (value, row) => {
                if (!row.has_chief_complaints || !value) {
                    return (
                        <span className="text-sm text-slate-400">
                            No complaints
                        </span>
                    );
                }
                return (
                    <div>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            {row.chief_complaints?.length || 0} complaint(s)
                        </span>
                        <div className="mt-1 line-clamp-2 text-sm text-slate-700">
                            {value}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'drug_history_summary',
            label: 'Drug History',
            sortable: false,
            format: (value) => {
                if (!value)
                    return (
                        <span className="text-sm text-slate-400">
                            None recorded
                        </span>
                    );
                return (
                    <div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            <Pill className="h-3 w-3" />
                            Active
                        </span>
                        <div className="mt-1 text-sm text-slate-700">
                            {value}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'medical_conditions_summary',
            label: 'Medical Hx',
            sortable: false,
            format: (value) => {
                if (!value)
                    return <span className="text-sm text-slate-400">None</span>;
                return (
                    <div>
                        <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                            Chronic
                        </span>
                        <div className="mt-1 text-sm text-slate-700">
                            {value}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'diagnoses',
            label: 'Diagnosis',
            sortable: false,
            format: (_, row) => {
                if (hasDiagnosis(row)) {
                    return (
                        <div>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                {row.diagnoses?.length} Diagnosis(es)
                            </span>
                            <div className="mt-1 text-sm text-slate-700">
                                {row.diagnoses?.[0]?.diagnosis}
                                {row.diagnoses &&
                                    row.diagnoses.length > 1 &&
                                    ` +${row.diagnoses.length - 1} more`}
                            </div>
                        </div>
                    );
                }
                return (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddDiagnosisClick(row)}
                        className="h-7 border-blue-200 text-xs text-blue-600 hover:bg-blue-50"
                    >
                        <PlusCircle className="mr-1 h-3 w-3" />
                        Add Diagnosis
                    </Button>
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
                completed: 'success',
                pending: 'warning',
                cancelled: 'error',
            },
            format: (value) => {
                const config = getStatusBadge(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${config.gradient} px-3 py-1 text-xs font-medium text-white shadow-sm`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
        },
    ];

    // ─── Actions ─────────────────────────────────────────────────────────────

    const actions: Action<Interaction>[] = [
        {
            label: 'View Details',
            icon: <FileText size={16} />,
            color: 'info',
            onClick: (row) => onViewDetails?.(row.consultation_uuid),
        },
        {
            label: 'Add Diagnosis',
            icon: <PlusCircle size={16} />,
            color: 'success',
            show: (row) => !hasDiagnosis(row),
            onClick: (row) => handleAddDiagnosisClick(row),
        },
    ];

    // ─── Loading / Empty States ──────────────────────────────────────────────

    if (isLoading) {
        return (
            <ReusableTable
                title="Patient Interactions"
                columns={columns}
                data={[]}
                actions={actions}
                loading={true}
                emptyMessage="Loading interactions..."
            />
        );
    }

    if (!interactions || interactions.length === 0) {
        return (
            <div className="w-full rounded-xl border border-slate-200 bg-white p-6">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        No interactions recorded for this patient.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            <ReusableTable
                title="Patient Interactions"
                columns={columns}
                data={interactions}
                actions={actions}
                loading={false}
                filterPlaceholder="Search by complaint, drug, or diagnosis..."
                statusFilterKey="status"
                statusOptions={[
                    { value: 'completed', label: 'Completed' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'cancelled', label: 'Cancelled' },
                ]}
                rowsPerPageOptions={[8, 15, 25, 50]}
                defaultRowsPerPage={8}
                defaultOrderBy="submitted_at"
                emptyMessage="No interactions recorded for this patient"
                renderExpandedRow={(row) =>
                    expandedRows.has(row.id) ? renderExpandedContent(row) : null
                }
            />

            {/* Diagnosis Modal */}
            {showDiagnosisModal && selectedConsultation && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowDiagnosisModal(false)}
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                            {/* Header — slate */}
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                                        <Stethoscope className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">
                                            Add Diagnosis
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Record a new clinical diagnosis
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDiagnosisModal(false)}
                                    className="h-8 w-8 border border-slate-200 bg-white p-0 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Body — white */}
                            <div className="flex-1 space-y-4 overflow-y-auto bg-white p-6">
                                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                                    <p className="font-medium text-slate-700">
                                        Consultation Details:
                                    </p>
                                    <p className="mt-1 text-slate-600">
                                        Date:{' '}
                                        {new Date(
                                            selectedConsultation.submitted_at,
                                        ).toLocaleDateString()}
                                    </p>
                                    {selectedConsultation.chief_complaints_summary && (
                                        <p className="mt-1 text-slate-600">
                                            Chief Complaints:{' '}
                                            {
                                                selectedConsultation.chief_complaints_summary
                                            }
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Diagnosis *
                                    </label>
                                    <input
                                        type="text"
                                        value={diagnosisForm.diagnosis}
                                        onChange={(e) =>
                                            setDiagnosisForm({
                                                ...diagnosisForm,
                                                diagnosis: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                        placeholder="e.g., Hypertension, Type 2 Diabetes Mellitus"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        ICD-10 Code (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={diagnosisForm.icd10_code}
                                        onChange={(e) =>
                                            setDiagnosisForm({
                                                ...diagnosisForm,
                                                icd10_code: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                        placeholder="e.g., I10, E11.9"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Diagnosed Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={diagnosisForm.diagnosed_date}
                                        onChange={(e) =>
                                            setDiagnosisForm({
                                                ...diagnosisForm,
                                                diagnosed_date: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Status
                                    </label>
                                    <select
                                        value={diagnosisForm.status}
                                        onChange={(e) =>
                                            setDiagnosisForm({
                                                ...diagnosisForm,
                                                status: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="resolved">
                                            Resolved
                                        </option>
                                        <option value="chronic">Chronic</option>
                                        <option value="inactive">
                                            Inactive
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Clinical Notes (Optional)
                                    </label>
                                    <textarea
                                        value={diagnosisForm.notes}
                                        onChange={(e) =>
                                            setDiagnosisForm({
                                                ...diagnosisForm,
                                                notes: e.target.value,
                                            })
                                        }
                                        rows={4}
                                        className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                        placeholder="Add any relevant clinical notes, observations, or treatment plan..."
                                    />
                                </div>
                            </div>

                            {/* Footer — slate */}
                            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-100 px-6 py-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDiagnosisModal(false)}
                                    className="border-slate-300 bg-white hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitDiagnosis}
                                    disabled={
                                        isSubmitting ||
                                        !diagnosisForm.diagnosis.trim()
                                    }
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSubmitting
                                        ? 'Adding...'
                                        : 'Add Diagnosis'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
