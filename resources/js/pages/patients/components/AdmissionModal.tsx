import {
    Plus,
    X,
    Calendar,
    Clock,
    MapPin,
    Shield,
    FileText,
    ClipboardList,
    Stethoscope,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Http from '@/utils/Http';

interface AdmissionFormData {
    patient_id: string;
    doctor_id: string;
    date_of_admission: string;
    time_of_admission: string;
    diagnosis_on_admission: string;
    priority: string;
    admitted_to_ward: string;
    condition_on_admission: string;
    admission_notes: string;
}

interface Doctor {
    id: number;
    name?: string;
    first_name?: string;
    surname?: string;
    email?: string;
    specialization?: string;
}

interface AdmissionModalProps {
    admittedById: number;
    doctorsList: Doctor[];
    patientId?: number;
    onSuccess?: () => void;
    /**
     * Controlled mode: pass `open` + `onOpenChange` and the modal will
     * NOT render its own "Create Admission" trigger button.
     */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Label for the built-in trigger (uncontrolled mode only) */
    triggerLabel?: string;
}

const PRIORITY_CONFIG = {
    LOW: {
        label: 'Low',
        color: 'text-slate-500',
        bg: 'bg-slate-50 border-slate-200',
    },
    NORMAL: {
        label: 'Normal',
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200',
    },
    HIGH: {
        label: 'High',
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200',
    },
    URGENT: {
        label: 'Urgent',
        color: 'text-orange-600',
        bg: 'bg-orange-50 border-orange-200',
    },
    EMERGENCY: {
        label: 'Emergency',
        color: 'text-red-600',
        bg: 'bg-red-50 border-red-200',
    },
} as const;

export default function AdmissionModal({
    admittedById,
    patientId,
    doctorsList,
    onSuccess,
    open,
    onOpenChange,
    triggerLabel = 'Create Admission',
}: AdmissionModalProps) {
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const timeNow = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });

    const [admissionFormData, setAdmissionFormData] =
        useState<AdmissionFormData>({
            patient_id: patientId?.toString() ?? '',
            doctor_id: '',
            date_of_admission: todayISO,
            time_of_admission: timeNow,
            diagnosis_on_admission: '',
            priority: 'NORMAL',
            admitted_to_ward: '',
            condition_on_admission: '',
            admission_notes: '',
        });

    // Controlled vs uncontrolled state
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const showModal = isControlled ? open : internalOpen;
    const setShowModal = isControlled ? onOpenChange! : setInternalOpen;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep form's patient_id in sync when patientId prop changes / modal opens
    useEffect(() => {
        if (showModal) {
            setAdmissionFormData((prev) => ({
                ...prev,
                patient_id: patientId?.toString() ?? prev.patient_id,
            }));
        }
    }, [showModal, patientId]);

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setAdmissionFormData((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setAdmissionFormData({
            patient_id: patientId?.toString() ?? '',
            doctor_id: '',
            date_of_admission: todayISO,
            time_of_admission: timeNow,
            diagnosis_on_admission: '',
            priority: 'NORMAL',
            admitted_to_ward: '',
            condition_on_admission: '',
            admission_notes: '',
        });
        setError(null);
    };

    const handleClose = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!admissionFormData.patient_id) {
            Notiflix.Notify.warning('Please enter Patient ID');
            return;
        }
        if (!admissionFormData.doctor_id) {
            Notiflix.Notify.warning('Please select a doctor');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const admissionUuid = crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const payload = {
                admission_uuid: admissionUuid,
                patient_id: parseInt(admissionFormData.patient_id),
                doctor_id: parseInt(admissionFormData.doctor_id),
                admitted_by: admittedById,
                date_of_admission: admissionFormData.date_of_admission,
                time_of_admission: admissionFormData.time_of_admission,
                diagnosis_on_admission:
                    admissionFormData.diagnosis_on_admission || null,
                priority: admissionFormData.priority,
                admitted_to_ward: admissionFormData.admitted_to_ward || null,
                condition_on_admission:
                    admissionFormData.condition_on_admission || null,
                admission_notes: admissionFormData.admission_notes || null,
                diagnosis_on_discharge: null,
            };

            const response = await Http.post('/admissions', payload);

            if (response.status) {
                Notiflix.Notify.success(
                    response.data.message || 'Admission created successfully',
                );
                setShowModal(false);
                resetForm();
                onSuccess?.();
            } else {
                Notiflix.Notify.failure(
                    response.data.message || 'Failed to create admission',
                );
            }
        } catch (err: any) {
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Something went wrong. Please try again.';
            setError(errorMessage);
            Notiflix.Notify.failure(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedPriority =
        PRIORITY_CONFIG[
            admissionFormData.priority as keyof typeof PRIORITY_CONFIG
        ];

    return (
        <>
            {/* Only render the trigger when NOT controlled */}
            {!isControlled && (
                <Button onClick={() => setShowModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {triggerLabel}
                </Button>
            )}

            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Create New Admission
                                </h2>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    Fill in the admission details below
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form
                            onSubmit={handleSubmit}
                            className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
                        >
                            <input
                                type="hidden"
                                name="patient_id"
                                value={admissionFormData.patient_id}
                                onChange={handleInputChange}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                        <Stethoscope className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                                        Doctor{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="doctor_id"
                                        value={admissionFormData.doctor_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Doctor</option>
                                        {doctorsList?.map((doctor) => (
                                            <option
                                                key={doctor.id}
                                                value={doctor.id}
                                            >
                                                {doctor.name ??
                                                    `${doctor.first_name ?? ''} ${doctor.surname ?? ''}`.trim()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                        <Calendar className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                                        Date of Admission{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="date_of_admission"
                                        value={
                                            admissionFormData.date_of_admission
                                        }
                                        onChange={handleInputChange}
                                        required
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                        <Clock className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                                        Time of Admission{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="time_of_admission"
                                        value={
                                            admissionFormData.time_of_admission
                                        }
                                        onChange={handleInputChange}
                                        required
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                        <MapPin className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                                        Admitted To Ward
                                    </label>
                                    <input
                                        type="text"
                                        name="admitted_to_ward"
                                        value={
                                            admissionFormData.admitted_to_ward
                                        }
                                        onChange={handleInputChange}
                                        placeholder="e.g., Ward 3B, ICU"
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                        <Shield className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                                        Priority
                                    </label>
                                    <select
                                        name="priority"
                                        value={admissionFormData.priority}
                                        onChange={handleInputChange}
                                        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none ${selectedPriority.color} ${selectedPriority.bg}`}
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(
                                            ([key, config]) => (
                                                <option
                                                    key={key}
                                                    value={key}
                                                    className={config.color}
                                                >
                                                    {config.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                    <FileText className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                                    Diagnosis on Admission
                                </label>
                                <textarea
                                    name="diagnosis_on_admission"
                                    value={
                                        admissionFormData.diagnosis_on_admission
                                    }
                                    onChange={handleInputChange}
                                    rows={2}
                                    placeholder="Initial diagnosis..."
                                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                    <ClipboardList className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                                    Condition on Admission
                                </label>
                                <textarea
                                    name="condition_on_admission"
                                    value={
                                        admissionFormData.condition_on_admission
                                    }
                                    onChange={handleInputChange}
                                    rows={2}
                                    placeholder="Patient's presenting condition, vitals, symptoms..."
                                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                    Admission Notes
                                </label>
                                <textarea
                                    name="admission_notes"
                                    value={admissionFormData.admission_notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder="Additional notes, allergies, special instructions..."
                                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 pt-2 text-xs text-gray-400">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300"></span>
                                Diagnosis on discharge will be recorded during
                                patient checkout
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {error}
                                </div>
                            )}
                        </form>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                className="text-sm"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="min-w-[140px] text-sm"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg
                                            className="h-4 w-4 animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v8z"
                                            />
                                        </svg>
                                        Creating...
                                    </span>
                                ) : (
                                    'Create Admission'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
