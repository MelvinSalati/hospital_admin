import {
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    AlertTriangle,
    Pill,
    ClipboardList,
    BookOpen,
    X,
    Plus,
    Eye,
    Glasses,
    Activity,
    Heart,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import routes from '@/constants/routes';
import Http from '@/utils/Http';

// ==================== Types ====================

interface VisualAcuityRecord {
    id: string;
    testType: 'distance' | 'near';
    correction: 'unaided' | 'with_glasses' | 'pinhole' | 'contact_lens';
    rightEye: string; // OD
    leftEye: string; // OS
    bothEyes?: string; // OU
    notes?: string;
}

interface ChiefComplaint {
    id: string;
    symptom: string;
    duration: string;
    severity: number;
    onset: string;
    characteristics: string;
}

interface OcularFinding {
    id: string;
    structure: string;
    eye: 'OD' | 'OS' | 'OU';
    normal: boolean;
    description?: string;
}

interface DrugEntry {
    id: string;
    drugName: string;
    dosage: string;
    frequency: string;
    status: 'current' | 'discontinued';
    notes?: string;
}

interface OcularHistoryEntry {
    id: string;
    category: string;
    eye: 'OD' | 'OS' | 'OU';
    date: string;
    status: 'active' | 'resolved' | 'chronic';
    notes?: string;
}

interface HealthEducation {
    id: string;
    topic: string;
    description: string;
    patientUnderstanding: 'poor' | 'fair' | 'good' | 'excellent';
    followUpNeeded: boolean;
}

interface SymptomAnalysis {
    id: string;
    system: string;
    symptom: string;
    present: boolean;
    notes?: string;
}

interface PhysicalFinding {
    id: string;
    system: string;
    finding: string;
    normal: boolean;
    description?: string;
}

interface MedicalCondition {
    id: string;
    condition: string;
    diagnosedDate: string;
    status: 'active' | 'resolved' | 'chronic';
    notes?: string;
}

interface ConsultationFormData {
    // General consultation
    clinicalAnalysis: SymptomAnalysis[];
    physicalExam: PhysicalFinding[];
    medicalConditions: MedicalCondition[];
    // Ophthalmology consultation
    visualAcuity: VisualAcuityRecord[];
    chiefComplaints: ChiefComplaint[];
    ocularExamination: OcularFinding[];
    drugHistory: DrugEntry[];
    ocularHistory: OcularHistoryEntry[];
    healthEducation: HealthEducation[];
}

interface ConsultationTabsProps {
    patientId: string | number;
    doctorId?: string;
    /** id of the logged-in user creating the consultation (sent as created_by) */
    createdBy?: string | number;
    admissionNumber?: string;
    initialData?: Partial<ConsultationFormData>;
    onSuccess?: () => void;
}

// ==================== Section Configuration ====================

const ophthalmologySections = [
    {
        id: 'visualAcuity',
        label: 'Visual Acuity',
        icon: Eye,
        color: 'blue',
        description: 'Distance and near vision',
    },
    {
        id: 'chiefComplaints',
        label: 'Chief Complaints',
        icon: AlertTriangle,
        color: 'blue',
        description: "Document patient's primary symptoms",
    },
    {
        id: 'ocularExamination',
        label: 'Ocular Examination',
        icon: Glasses,
        color: 'purple',
        description: 'Eye examination findings',
    },
    {
        id: 'drugHistory',
        label: 'Drug Hx',
        icon: Pill,
        color: 'green',
        description: 'Current and past medications',
    },
    {
        id: 'ocularHistory',
        label: 'Patient Ocular Hx',
        icon: ClipboardList,
        color: 'orange',
        description: 'Past eye history',
    },
    {
        id: 'healthEducation',
        label: 'Health Education',
        icon: BookOpen,
        color: 'yellow',
        description: 'Patient education',
    },
];

const generalSections = [
    {
        id: 'chiefComplaints',
        label: 'Chief Complaints',
        icon: AlertTriangle,
        color: 'blue',
        description: "Document patient's primary symptoms",
    },
    {
        id: 'clinicalAnalysis',
        label: 'Clinical Analysis',
        icon: Activity,
        color: 'purple',
        description: 'Review of systems',
    },
    {
        id: 'physicalExam',
        label: 'Physical Exam',
        icon: Heart,
        color: 'red',
        description: 'Physical examination findings',
    },
    {
        id: 'drugHistory',
        label: 'Drug Hx',
        icon: Pill,
        color: 'green',
        description: 'Current and past medications',
    },
    {
        id: 'medicalConditions',
        label: 'Md/Surg/Obs&Gyn Conditions',
        icon: ClipboardList,
        color: 'orange',
        description: 'Past medical history',
    },
    {
        id: 'healthEducation',
        label: 'Health Education',
        icon: BookOpen,
        color: 'yellow',
        description: 'Patient education',
    },
];

// Reads the logged-in user's role from localStorage
const checkIsOphthalmology = () => {
    try {
        const role = (localStorage.getItem('userRole') ?? '')
            .trim()
            .toLowerCase();
        // accepts both spellings: "ophthalmology" and "opthalmology"
        return role === 'ophthalmology' || role === 'opthalmology';
    } catch {
        return false;
    }
};

// ==================== Main Component ====================

export default function OphthalmologyConsultationTabs({
    admissionNumber,
    patientId,
    doctorId,
    createdBy,
    initialData,
    onSuccess,
}: ConsultationTabsProps) {
    const [isOphthalmology] = useState(checkIsOphthalmology);
    const sections = isOphthalmology ? ophthalmologySections : generalSections;
    const [activeTab, setActiveTab] = useState(sections[0].id);
    const [formData, setFormData] = useState<ConsultationFormData>({
        clinicalAnalysis: [],
        physicalExam: [],
        medicalConditions: [],
        visualAcuity: [],
        chiefComplaints: [],
        ocularExamination: [],
        drugHistory: [],
        ocularHistory: [],
        healthEducation: [],
        ...initialData,
    });
    const [errors, setErrors] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>(
        {},
    );

    // Validate section
    const validateSection = (sectionId: string, data: any[]) => {
        let isValid = true;
        const sectionErrs: any = {};

        switch (sectionId) {
            case 'visualAcuity':
                isValid = data.every(
                    (item) => item.rightEye?.trim() && item.leftEye?.trim(),
                );
                if (!isValid)
                    sectionErrs.general =
                        'Please record acuity for both eyes (OD and OS)';
                break;
            case 'chiefComplaints':
                isValid = data.every(
                    (item) => item.symptom?.trim() && item.duration?.trim(),
                );
                if (!isValid)
                    sectionErrs.general = 'Please fill all required fields';
                break;
            default:
                isValid = true;
        }

        setErrors((prev) => ({ ...prev, [sectionId]: sectionErrs }));
        setSectionErrors((prev) => ({ ...prev, [sectionId]: !isValid }));
        return isValid;
    };

    // Update section data
    const updateSection = (sectionId: string, data: any[]) => {
        setFormData((prev) => ({ ...prev, [sectionId]: data }));
        validateSection(sectionId, data);
    };

    // Section completion status
    const getSectionStatus = (sectionId: string) => {
        const data = formData[sectionId as keyof ConsultationFormData];
        return Array.isArray(data) && data.length > 0;
    };

    const completedSections = sections.filter((s) =>
        getSectionStatus(s.id),
    ).length;
    const hasErrors = Object.values(sectionErrors).some(
        (error) => error === true,
    );
    const currentIndex = sections.findIndex((s) => s.id === activeTab);

    // Submit form
    const handleSubmit = async () => {
        let allValid = true;
        sections.forEach((section) => {
            const data = formData[section.id as keyof ConsultationFormData];
            if (!validateSection(section.id, data as any[])) {
                allValid = false;
            }
        });

        if (!allValid) {
            Notiflix.Notify.warning(
                'Please fix errors in all sections before submitting',
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await Http.post(
                routes.api.consultation.create,
                JSON.stringify({
                    patient_id: patientId,
                    doctor_id: doctorId,
                    created_by: createdBy,
                    admission_number: admissionNumber,
                    consultation_type: isOphthalmology
                        ? 'ophthalmology'
                        : 'general',
                    ...Object.fromEntries(
                        sections.map((s) => [
                            s.id,
                            formData[s.id as keyof ConsultationFormData],
                        ]),
                    ),
                    status: 'completed',
                    submitted_at: new Date().toISOString(),
                }),
            );

            if (response.data.status) {
                onSuccess?.();
                Notiflix.Notify.success('Consultation saved successfully!');
            } else {
                Notiflix.Notify.failure('Failed to save');
            }
        } catch (error: any) {
            Notiflix.Notify.failure(
                error?.response?.data?.message ?? 'Failed to save',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render active section content
    const renderSection = () => {
        switch (activeTab) {
            case 'visualAcuity':
                return (
                    <VisualAcuitySection
                        data={formData.visualAcuity}
                        onChange={(data: any[]) =>
                            updateSection('visualAcuity', data)
                        }
                        errors={errors.visualAcuity}
                    />
                );
            case 'chiefComplaints':
                return (
                    <ChiefComplaintsSection
                        data={formData.chiefComplaints}
                        onChange={(data: any[]) =>
                            updateSection('chiefComplaints', data)
                        }
                        errors={errors.chiefComplaints}
                    />
                );
            case 'ocularExamination':
                return (
                    <OcularExaminationSection
                        data={formData.ocularExamination}
                        onChange={(data: any[]) =>
                            updateSection('ocularExamination', data)
                        }
                    />
                );
            case 'clinicalAnalysis':
                return (
                    <ClinicalAnalysisSection
                        data={formData.clinicalAnalysis}
                        onChange={(data: any[]) =>
                            updateSection('clinicalAnalysis', data)
                        }
                    />
                );
            case 'physicalExam':
                return (
                    <PhysicalExamSection
                        data={formData.physicalExam}
                        onChange={(data: any[]) =>
                            updateSection('physicalExam', data)
                        }
                    />
                );
            case 'medicalConditions':
                return (
                    <MedicalConditionsSection
                        data={formData.medicalConditions}
                        onChange={(data: any[]) =>
                            updateSection('medicalConditions', data)
                        }
                    />
                );
            case 'drugHistory':
                return (
                    <DrugHistorySection
                        data={formData.drugHistory}
                        onChange={(data: any[]) =>
                            updateSection('drugHistory', data)
                        }
                    />
                );
            case 'ocularHistory':
                return (
                    <OcularHistorySection
                        data={formData.ocularHistory}
                        onChange={(data: any[]) =>
                            updateSection('ocularHistory', data)
                        }
                    />
                );
            case 'healthEducation':
                return (
                    <HealthEducationSection
                        data={formData.healthEducation}
                        onChange={(data: any[]) =>
                            updateSection('healthEducation', data)
                        }
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="rounded-xl bg-white">
            {/* Tabs Navigation */}
            <div className="overflow-x-auto border-gray-200 bg-gray-50">
                <div className="flex min-w-max">
                    {sections.map((section) => {
                        const isComplete = getSectionStatus(section.id);
                        const hasError = sectionErrors[section.id];
                        const Icon = section.icon;

                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveTab(section.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                                    activeTab === section.id
                                        ? 'border-b-2 border-blue-500 bg-white text-blue-600'
                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                } `}
                            >
                                <Icon
                                    className={`h-4 w-4 ${activeTab === section.id ? 'text-blue-500' : 'text-gray-400'}`}
                                />
                                <span>{section.label}</span>
                                {isComplete && !hasError && (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                                {hasError && (
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Section Content */}
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto p-6">
                {renderSection()}
            </div>

            {/* Navigation and Submit Buttons */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="mb-4 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (currentIndex > 0) {
                                setActiveTab(sections[currentIndex - 1].id);
                            }
                        }}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                    </Button>

                    <div className="text-sm text-gray-500">
                        Section {currentIndex + 1} of {sections.length}
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => {
                            if (currentIndex < sections.length - 1) {
                                setActiveTab(sections[currentIndex + 1].id);
                            }
                        }}
                        disabled={currentIndex === sections.length - 1}
                    >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>

                <div className="border-t border-gray-500 pt-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || hasErrors}
                        className="bg-black text-white hover:bg-blue-700"
                        size="sm"
                        style={{ float: 'right' }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Submitting Consultation...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-5 w-5" />
                                Submit
                            </>
                        )}
                    </Button>
                    {hasErrors && (
                        <p className="mt-2 text-center text-sm text-red-600">
                            ⚠️ Please complete all required fields before
                            submitting
                        </p>
                    )}
                    {!hasErrors && completedSections === sections.length && (
                        <p className="mt-2 text-center text-sm text-green-600">
                            ✓ All sections completed! Ready to submit.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== Shared helpers ====================

const useListActions = (data: any[], onChange: (d: any[]) => void) => {
    const update = (id: string, field: string, value: any) =>
        onChange(
            data.map((item: any) =>
                item.id === id ? { ...item, [field]: value } : item,
            ),
        );
    const remove = (id: string) =>
        onChange(data.filter((item: any) => item.id !== id));
    return { update, remove };
};

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
    >
        <X className="h-4 w-4" />
    </button>
);

const AddButton = ({
    onClick,
    label,
}: {
    onClick: () => void;
    label: string;
}) => (
    <Button
        variant="outline"
        onClick={onClick}
        className="w-full border-dashed"
    >
        <Plus className="mr-2 h-4 w-4" />
        {label}
    </Button>
);

// ==================== Section Components ====================

// 1. Visual Acuity Section
const VisualAcuitySection = ({ data, onChange, errors }: any) => {
    const { update: baseUpdate, remove } = useListActions(data, onChange);

    const distanceScale = [
        '6/4',
        '6/5',
        '6/6',
        '6/9',
        '6/12',
        '6/18',
        '6/24',
        '6/36',
        '6/60',
        '3/60',
        '1/60',
        'CF (Counting Fingers)',
        'HM (Hand Motion)',
        'PL (Perception of Light)',
        'NPL (No Light Perception)',
    ];
    const nearScale = [
        'N5',
        'N6',
        'N8',
        'N10',
        'N12',
        'N14',
        'N18',
        'N24',
        'N36',
        'N48',
        'Unable to read',
    ];

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                testType: 'distance',
                correction: 'unaided',
                rightEye: '',
                leftEye: '',
                bothEyes: '',
                notes: '',
            },
        ]);
    };

    const update = (id: string, field: string, value: any) => {
        // reset readings when switching scale type
        if (field === 'testType') {
            onChange(
                data.map((item: any) =>
                    item.id === id
                        ? {
                              ...item,
                              testType: value,
                              rightEye: '',
                              leftEye: '',
                              bothEyes: '',
                          }
                        : item,
                ),
            );
            return;
        }
        baseUpdate(id, field, value);
    };

    const renderEyeSelect = (
        item: any,
        field: string,
        label: string,
        required = false,
    ) => {
        const scale = item.testType === 'distance' ? distanceScale : nearScale;
        return (
            <div>
                <label className="mb-1 block text-sm font-medium">
                    {label} {required && '*'}
                </label>
                <select
                    value={item[field] || ''}
                    onChange={(e) => update(item.id, field, e.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                >
                    <option value="">Select</option>
                    {scale.map((v) => (
                        <option key={v} value={v}>
                            {v}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900">Visual Acuity</h3>
                <p className="text-sm text-blue-700">
                    Record distance (Snellen) and near vision for each eye
                </p>
            </div>

            {errors?.general && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errors.general}
                </div>
            )}

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Test Type
                            </label>
                            <select
                                value={item.testType}
                                onChange={(e) =>
                                    update(item.id, 'testType', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="distance">
                                    Distance (Snellen)
                                </option>
                                <option value="near">Near</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Correction
                            </label>
                            <select
                                value={item.correction}
                                onChange={(e) =>
                                    update(
                                        item.id,
                                        'correction',
                                        e.target.value,
                                    )
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="unaided">Unaided</option>
                                <option value="with_glasses">
                                    With Glasses
                                </option>
                                <option value="contact_lens">
                                    With Contact Lens
                                </option>
                                <option value="pinhole">Pinhole</option>
                            </select>
                        </div>

                        {renderEyeSelect(
                            item,
                            'rightEye',
                            'Right Eye (OD)',
                            true,
                        )}
                        {renderEyeSelect(
                            item,
                            'leftEye',
                            'Left Eye (OS)',
                            true,
                        )}
                        {renderEyeSelect(item, 'bothEyes', 'Both Eyes (OU)')}

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Notes
                            </label>
                            <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) =>
                                    update(item.id, 'notes', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., Improves with pinhole, eccentric fixation..."
                            />
                        </div>
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Visual Acuity Test" />
        </div>
    );
};

// 2. Chief Complaints Section
const ChiefComplaintsSection = ({ data, onChange, errors }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                symptom: '',
                duration: '',
                severity: 3,
                onset: '',
                characteristics: '',
            },
        ]);
    };

    const onsetOptions = [
        'Sudden',
        'Gradual',
        'Acute',
        'Insidious',
        'Acute-on-chronic',
        'Intermittent',
        'Constant',
        'Progressive',
    ];

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900">
                    Chief Complaints
                </h3>
                <p className="text-sm text-blue-700">
                    Document the patient's primary symptoms in their own words
                </p>
            </div>

            {errors?.general && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errors.general}
                </div>
            )}

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Symptom *
                            </label>
                            <input
                                type="text"
                                value={item.symptom}
                                onChange={(e) =>
                                    update(item.id, 'symptom', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., Blurred vision, Eye pain, Redness"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Duration *
                            </label>
                            <input
                                type="text"
                                value={item.duration}
                                onChange={(e) =>
                                    update(item.id, 'duration', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., 3 days"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Severity
                            </label>
                            <select
                                value={item.severity}
                                onChange={(e) =>
                                    update(
                                        item.id,
                                        'severity',
                                        parseInt(e.target.value),
                                    )
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value={1}>Mild</option>
                                <option value={2}>Moderate</option>
                                <option value={3}>Severe</option>
                                <option value={4}>Very Severe</option>
                                <option value={5}>Worst Possible</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Onset
                            </label>
                            <select
                                value={item.onset}
                                onChange={(e) =>
                                    update(item.id, 'onset', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="">Select onset</option>
                                {onsetOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Characteristics
                            </label>
                            <textarea
                                value={item.characteristics}
                                onChange={(e) =>
                                    update(
                                        item.id,
                                        'characteristics',
                                        e.target.value,
                                    )
                                }
                                rows={2}
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="Which eye, quality, aggravating/alleviating factors..."
                            />
                        </div>
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Chief Complaint" />
        </div>
    );
};

// 3. Ocular Examination Section
const OcularExaminationSection = ({ data, onChange }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const structures = [
        'Lids & Adnexa',
        'Lacrimal System',
        'Conjunctiva',
        'Sclera',
        'Cornea',
        'Anterior Chamber',
        'Iris',
        'Pupil',
        'Lens',
        'Intraocular Pressure (IOP)',
        'Extraocular Movements',
        'Visual Fields',
        'Vitreous',
        'Optic Disc',
        'Macula',
        'Retinal Vessels',
        'Peripheral Retina',
    ];

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                structure: structures[0],
                eye: 'OU',
                normal: true,
                description: '',
            },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h3 className="font-semibold text-purple-900">
                    Ocular Examination
                </h3>
                <p className="text-sm text-purple-700">
                    Document external, anterior segment and posterior segment
                    findings
                </p>
            </div>

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Structure
                            </label>
                            <select
                                value={item.structure}
                                onChange={(e) =>
                                    update(item.id, 'structure', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                {structures.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Eye
                            </label>
                            <select
                                value={item.eye}
                                onChange={(e) =>
                                    update(item.id, 'eye', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="OD">Right (OD)</option>
                                <option value="OS">Left (OS)</option>
                                <option value="OU">Both (OU)</option>
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={item.normal}
                                    onChange={(e) =>
                                        update(
                                            item.id,
                                            'normal',
                                            e.target.checked,
                                        )
                                    }
                                    className="rounded"
                                />
                                <span className="text-sm">Normal</span>
                            </label>
                        </div>

                        {!item.normal && (
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium">
                                    Description
                                </label>
                                <textarea
                                    value={item.description || ''}
                                    onChange={(e) =>
                                        update(
                                            item.id,
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                    rows={2}
                                    className="w-full rounded-md border px-3 py-2"
                                    placeholder="Describe abnormal findings..."
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Ocular Finding" />
        </div>
    );
};

// 4. Drug History Section
const DrugHistorySection = ({ data, onChange }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                drugName: '',
                dosage: '',
                frequency: '',
                status: 'current',
                notes: '',
            },
        ]);
    };

    const frequencyOptions = [
        'OD (Once daily)',
        'BD (Twice daily)',
        'TDS (Three times daily)',
        'QID (Four times daily)',
        'Q6H (Every 6 hours)',
        'Q8H (Every 8 hours)',
        'Q12H (Every 12 hours)',
        'PRN (As needed)',
        'STAT (Immediately)',
        'Weekly',
        'Monthly',
    ];

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <h3 className="font-semibold text-green-900">Drug History</h3>
                <p className="text-sm text-green-700">
                    Current and past medications (include eye drops)
                </p>
            </div>

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Drug Name
                            </label>
                            <input
                                type="text"
                                value={item.drugName}
                                onChange={(e) =>
                                    update(item.id, 'drugName', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., Timolol eye drops"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Dosage
                            </label>
                            <input
                                type="text"
                                value={item.dosage}
                                onChange={(e) =>
                                    update(item.id, 'dosage', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., 0.5%, 1 drop"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Frequency
                            </label>
                            <select
                                value={item.frequency}
                                onChange={(e) =>
                                    update(item.id, 'frequency', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="">Select frequency</option>
                                {frequencyOptions.map((freq) => (
                                    <option key={freq} value={freq}>
                                        {freq}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Status
                            </label>
                            <select
                                value={item.status}
                                onChange={(e) =>
                                    update(item.id, 'status', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="current">Current</option>
                                <option value="discontinued">
                                    Discontinued
                                </option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Notes
                            </label>
                            <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) =>
                                    update(item.id, 'notes', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="Reason for discontinuation, allergies, etc."
                            />
                        </div>
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Medication" />
        </div>
    );
};

// 5. Patient Ocular History Section
const OcularHistorySection = ({ data, onChange }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const categories = [
        'Refractive error / Glasses use',
        'Contact lens use',
        'Previous eye surgery',
        'Eye trauma / Injury',
        'Glaucoma',
        'Cataract',
        'Diabetic / Hypertensive retinopathy',
        'Allergic / Infective conjunctivitis',
        'Uveitis',
        'Amblyopia / Strabismus',
        'Family history of eye disease',
        'Other',
    ];

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                category: categories[0],
                eye: 'OU',
                date: '',
                status: 'active',
                notes: '',
            },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-orange-100 bg-orange-50 p-4">
                <h3 className="font-semibold text-orange-900">
                    Patient Ocular History
                </h3>
                <p className="text-sm text-orange-700">
                    Past eye conditions, surgeries, trauma and family history
                </p>
            </div>

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Category
                            </label>
                            <select
                                value={item.category}
                                onChange={(e) =>
                                    update(item.id, 'category', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Eye
                            </label>
                            <select
                                value={item.eye}
                                onChange={(e) =>
                                    update(item.id, 'eye', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="OD">Right (OD)</option>
                                <option value="OS">Left (OS)</option>
                                <option value="OU">Both (OU)</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Date
                            </label>
                            <input
                                type="date"
                                value={item.date}
                                onChange={(e) =>
                                    update(item.id, 'date', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Status
                            </label>
                            <select
                                value={item.status}
                                onChange={(e) =>
                                    update(item.id, 'status', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="active">Active</option>
                                <option value="resolved">Resolved</option>
                                <option value="chronic">Chronic</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Notes
                            </label>
                            <textarea
                                value={item.notes || ''}
                                onChange={(e) =>
                                    update(item.id, 'notes', e.target.value)
                                }
                                rows={2}
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="Additional details..."
                            />
                        </div>
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Ocular History" />
        </div>
    );
};

// 6. Health Education Section
const HealthEducationSection = ({ data, onChange }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                topic: '',
                description: '',
                patientUnderstanding: 'good',
                followUpNeeded: false,
            },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="font-semibold text-yellow-900">
                    Health Education
                </h3>
                <p className="text-sm text-yellow-700">
                    Patient education and counseling provided
                </p>
            </div>

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Topic
                            </label>
                            <input
                                type="text"
                                value={item.topic}
                                onChange={(e) =>
                                    update(item.id, 'topic', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., Eye drop technique, Glaucoma adherence"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Description
                            </label>
                            <textarea
                                value={item.description}
                                onChange={(e) =>
                                    update(
                                        item.id,
                                        'description',
                                        e.target.value,
                                    )
                                }
                                rows={3}
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="What education was provided?"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Patient Understanding
                            </label>
                            <select
                                value={item.patientUnderstanding}
                                onChange={(e) =>
                                    update(
                                        item.id,
                                        'patientUnderstanding',
                                        e.target.value,
                                    )
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="poor">Poor</option>
                                <option value="fair">Fair</option>
                                <option value="good">Good</option>
                                <option value="excellent">Excellent</option>
                            </select>
                        </div>

                        <div>
                            <label className="mt-6 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={item.followUpNeeded}
                                    onChange={(e) =>
                                        update(
                                            item.id,
                                            'followUpNeeded',
                                            e.target.checked,
                                        )
                                    }
                                    className="rounded"
                                />
                                <span className="text-sm">
                                    Follow-up needed
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Health Education" />
        </div>
    );
};

// ==================== General consultation sections ====================

// Clinical Analysis Section
const ClinicalAnalysisSection = ({ data, onChange }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const systems = [
        'Cardiovascular',
        'Respiratory',
        'Gastrointestinal',
        'Neurological',
        'Musculoskeletal',
        'Dermatological',
        'Endocrine',
        'Reproductive - Male',
        'Reproductive - Female',
        'Genitourinary',
        'Hematological',
        'Psychiatric',
        'ENT',
        'Ophthalmological',
        'Immunological',
        'Renal',
        'Hepatic',
    ];

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                system: systems[0],
                symptom: '',
                present: false,
                notes: '',
            },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h3 className="font-semibold text-purple-900">
                    Review of Systems
                </h3>
                <p className="text-sm text-purple-700">
                    Document symptoms by body system
                </p>
            </div>

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                System
                            </label>
                            <select
                                value={item.system}
                                onChange={(e) =>
                                    update(item.id, 'system', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                {systems.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Symptom
                            </label>
                            <input
                                type="text"
                                value={item.symptom}
                                onChange={(e) =>
                                    update(item.id, 'symptom', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., Chest pain, Shortness of breath"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={item.present}
                                    onChange={(e) =>
                                        update(
                                            item.id,
                                            'present',
                                            e.target.checked,
                                        )
                                    }
                                    className="rounded"
                                />
                                <span className="text-sm">Present</span>
                            </label>
                        </div>

                        {item.present && (
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium">
                                    Notes
                                </label>
                                <input
                                    type="text"
                                    value={item.notes || ''}
                                    onChange={(e) =>
                                        update(item.id, 'notes', e.target.value)
                                    }
                                    className="w-full rounded-md border px-3 py-2"
                                    placeholder="Duration, severity, characteristics..."
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add System Review" />
        </div>
    );
};

// Physical Exam Section
const PhysicalExamSection = ({ data, onChange }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const systems = [
        'General',
        'HEENT',
        'Cardiovascular',
        'Respiratory',
        'Abdomen',
        'Musculoskeletal',
        'Neurological',
        'Skin',
        'Reproductive - Male',
        'Reproductive - Female',
        'Rectal',
        'Lymphatic',
        'Psychiatric',
        'Vascular',
    ];

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                system: systems[0],
                finding: '',
                normal: true,
                description: '',
            },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <h3 className="font-semibold text-red-900">
                    Physical Examination
                </h3>
                <p className="text-sm text-red-700">
                    Document physical exam findings
                </p>
            </div>

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                System
                            </label>
                            <select
                                value={item.system}
                                onChange={(e) =>
                                    update(item.id, 'system', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                {systems.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Finding
                            </label>
                            <input
                                type="text"
                                value={item.finding}
                                onChange={(e) =>
                                    update(item.id, 'finding', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., Heart sounds, Lung auscultation"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={item.normal}
                                    onChange={(e) =>
                                        update(
                                            item.id,
                                            'normal',
                                            e.target.checked,
                                        )
                                    }
                                    className="rounded"
                                />
                                <span className="text-sm">Normal</span>
                            </label>
                        </div>

                        {!item.normal && (
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium">
                                    Description
                                </label>
                                <textarea
                                    value={item.description || ''}
                                    onChange={(e) =>
                                        update(
                                            item.id,
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                    rows={2}
                                    className="w-full rounded-md border px-3 py-2"
                                    placeholder="Describe abnormal findings..."
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Examination Finding" />
        </div>
    );
};

// Medical Conditions Section
const MedicalConditionsSection = ({ data, onChange }: any) => {
    const { update, remove } = useListActions(data, onChange);

    const add = () => {
        onChange([
            ...data,
            {
                id: Date.now().toString(),
                condition: '',
                diagnosedDate: '',
                status: 'active',
                notes: '',
            },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-orange-100 bg-orange-50 p-4">
                <h3 className="font-semibold text-orange-900">
                    Medical, Surgical, and Obs & Gyn
                </h3>
                <p className="text-sm text-orange-700">
                    Past medical, surgical, Obs and Gyn history
                </p>
            </div>

            {data.map((item: any) => (
                <div
                    key={item.id}
                    className="relative mb-4 rounded-lg border p-4"
                >
                    <RemoveButton onClick={() => remove(item.id)} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Condition
                            </label>
                            <input
                                type="text"
                                value={item.condition}
                                onChange={(e) =>
                                    update(item.id, 'condition', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="e.g., Hypertension, Diabetes Type 2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Diagnosed Date
                            </label>
                            <input
                                type="date"
                                value={item.diagnosedDate}
                                onChange={(e) =>
                                    update(
                                        item.id,
                                        'diagnosedDate',
                                        e.target.value,
                                    )
                                }
                                className="w-full rounded-md border px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Status
                            </label>
                            <select
                                value={item.status}
                                onChange={(e) =>
                                    update(item.id, 'status', e.target.value)
                                }
                                className="w-full rounded-md border px-3 py-2"
                            >
                                <option value="active">Active</option>
                                <option value="resolved">Resolved</option>
                                <option value="chronic">Chronic</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                Notes
                            </label>
                            <textarea
                                value={item.notes || ''}
                                onChange={(e) =>
                                    update(item.id, 'notes', e.target.value)
                                }
                                rows={2}
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="Additional details about the condition..."
                            />
                        </div>
                    </div>
                </div>
            ))}

            <AddButton onClick={add} label="Add Condition" />
        </div>
    );
};
