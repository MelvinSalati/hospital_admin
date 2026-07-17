// components/register/tabs/ProfessionalTab.tsx

import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, Image, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { usePage } from '@inertiajs/react';

interface ProfessionalTabProps {
    data: any;
    setData: (key: string, value: any) => void;
    errors: Record<string, string>;
}

interface Profession {
    id: number;
    name: string;
    description: string;
    category: 'clinical' | 'administrative' | 'technical' | 'support';
}

type UploadField = 'certificates' | 'diplomas' | 'degrees';

const UPLOAD_FIELDS: { key: UploadField; label: string }[] = [
    { key: 'certificates', label: 'Professional Certificates' },
    { key: 'diplomas',     label: 'Diplomas'                  },
    { key: 'degrees',      label: 'Degrees'                   },
];

// Dummy professional data for health participants
const DUMMY_PROFESSIONS: Profession[] = [
    // Clinical Professionals
    { id: 1, name: 'Medical Doctor (MD)', description: 'Diagnose and treat medical conditions, prescribe medications, and manage patient care', category: 'clinical' },
    { id: 2, name: 'Registered Nurse (RN)', description: 'Provide patient care, administer medications, and assist in treatments', category: 'clinical' },
    { id: 3, name: 'Clinical Officer', description: 'Diagnose and treat common illnesses, prescribe medications, and provide primary care', category: 'clinical' },
    { id: 4, name: 'Physician Assistant', description: 'Practice medicine under physician supervision, conduct exams, and diagnose conditions', category: 'clinical' },
    { id: 5, name: 'Specialist Physician', description: 'Specialized medical practice in cardiology, neurology, pediatrics, etc.', category: 'clinical' },
    { id: 6, name: 'Surgeon', description: 'Perform surgical procedures and operations', category: 'clinical' },
    { id: 7, name: 'Anesthesiologist', description: 'Administer anesthesia and monitor patients during surgery', category: 'clinical' },
    { id: 8, name: 'Emergency Medicine Physician', description: 'Handle emergency medical situations and trauma care', category: 'clinical' },

    // Allied Health Professionals
    { id: 9, name: 'Pharmacist', description: 'Dispense medications, provide drug information, and ensure medication safety', category: 'clinical' },
    { id: 10, name: 'Radiographer', description: 'Perform diagnostic imaging procedures including X-ray, CT, and MRI', category: 'technical' },
    { id: 11, name: 'Medical Laboratory Technician', description: 'Conduct laboratory tests and analyze biological samples', category: 'technical' },
    { id: 12, name: 'Physiotherapist', description: 'Provide physical therapy and rehabilitation services', category: 'clinical' },
    { id: 13, name: 'Occupational Therapist', description: 'Help patients regain daily living skills and independence', category: 'clinical' },
    { id: 14, name: 'Speech Therapist', description: 'Treat communication and swallowing disorders', category: 'clinical' },
    { id: 15, name: 'Nutritionist/Dietitian', description: 'Provide dietary advice and nutrition counseling', category: 'clinical' },
    { id: 16, name: 'Psychologist', description: 'Provide mental health assessment and therapy', category: 'clinical' },
    { id: 17, name: 'Social Worker', description: 'Provide psychosocial support and patient advocacy', category: 'support' },
    { id: 18, name: 'Dental Surgeon', description: 'Diagnose and treat dental conditions', category: 'clinical' },
    { id: 19, name: 'Optometrist', description: 'Provide eye care services and prescribe corrective lenses', category: 'clinical' },
    { id: 20, name: 'Audiologist', description: 'Diagnose and treat hearing and balance disorders', category: 'clinical' },

    // Administrative and Support
    { id: 21, name: 'Healthcare Administrator', description: 'Manage healthcare facility operations and administration', category: 'administrative' },
    { id: 22, name: 'Medical Records Officer', description: 'Manage patient records and health information systems', category: 'administrative' },
    { id: 23, name: 'Billing Officer', description: 'Process medical billing and insurance claims', category: 'administrative' },
    { id: 24, name: 'Receptionist', description: 'Manage patient registration and appointment scheduling', category: 'administrative' },
    { id: 25, name: 'Information Technology Officer', description: 'Manage healthcare IT systems and electronic medical records', category: 'technical' },
    { id: 26, name: 'Health Educator', description: 'Provide health education and community outreach', category: 'support' },
    { id: 27, name: 'Community Health Worker', description: 'Provide basic health services and education in communities', category: 'support' },
    { id: 28, name: 'Medical Assistant', description: 'Assist physicians with clinical and administrative tasks', category: 'support' },

    // Specialized Roles
    { id: 29, name: 'Clinical Research Coordinator', description: 'Manage clinical trials and research studies', category: 'clinical' },
    { id: 30, name: 'Infection Control Officer', description: 'Manage infection prevention and control programs', category: 'clinical' },
    { id: 31, name: 'Quality Assurance Officer', description: 'Ensure healthcare quality standards and compliance', category: 'administrative' },
    { id: 32, name: 'Biomedical Engineer', description: 'Maintain and repair medical equipment', category: 'technical' },
    { id: 33, name: 'Palliative Care Specialist', description: 'Provide end-of-life care and pain management', category: 'clinical' },
    { id: 34, name: 'Midwife', description: 'Provide prenatal, delivery, and postnatal care', category: 'clinical' },
    { id: 35, name: 'Emergency Medical Technician (EMT)', description: 'Provide emergency medical services and ambulance care', category: 'clinical' },
];

// ─── Reusable upload block ────────────────────────────────────────────────────

interface FileUploadFieldProps {
    id: string;
    label: string;
    files: File[];
    error?: string;
    onAdd:    (files: FileList) => void;
    onRemove: (index: number)   => void;
}

function FileUploadField({ id, label, files, error, onAdd, onRemove }: FileUploadFieldProps) {
    const getIcon = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase() ?? '';
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
            ? <Image    className="h-4 w-4 text-gray-400" />
            : <FileText className="h-4 w-4 text-gray-400" />;
    };

    return (
        <div>
            <Label htmlFor={id} className="text-sm font-medium text-gray-700">
                {label}
            </Label>

            <label
                htmlFor={id}
                className="mt-1 flex flex-col items-center justify-center gap-2 px-6 py-8
                           border-2 border-dashed border-gray-300 rounded-lg cursor-pointer
                           hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                        Click to upload
                    </span>
                    {' '}or drag and drop
                </span>
                <span className="text-xs text-gray-400">PDF, JPG, PNG up to 10 MB</span>
                <input
                    id={id}
                    type="file"
                    multiple
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files && onAdd(e.target.files)}
                />
            </label>

            {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {files.map((file, i) => (
                        <li
                            key={i}
                            className="flex items-center justify-between p-2 bg-gray-50
                                       border border-gray-100 rounded-lg"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {getIcon(file.name)}
                                <span className="text-sm text-gray-700 truncate max-w-[220px]">
                                    {file.name}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(i)}
                                className="text-red-500 hover:text-red-700 shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

type LoadState = 'idle' | 'loading' | 'error' | 'done';

export default function ProfessionalTab({ data, setData, errors }: ProfessionalTabProps) {
    const { props } = usePage<any>();

    // Resolve professions from every common location Inertia apps place shared data:
    //   props.professions          – passed directly to the page
    //   props.shared?.professions  – via HandleInertiaRequests::share()
    //   props.auth?.professions    – sometimes nested under auth
    const fromProps: Profession[] | undefined =
        props.professions ??
        props.shared?.professions ??
        props.auth?.professions;

    const [professions, setProfessions] = useState<Profession[]>([]);
    const [loadState,   setLoadState]   = useState<LoadState>('idle');
    const [fetchError,  setFetchError]  = useState<string>('');
    const [useDummyData, setUseDummyData] = useState<boolean>(false);

    // Load professions from API or use dummy data
    const loadProfessions = async (forceDummy: boolean = false) => {
        if (forceDummy) {
            setProfessions(DUMMY_PROFESSIONS);
            setLoadState('done');
            setUseDummyData(true);
            return;
        }

        setLoadState('loading');
        setFetchError('');
        setUseDummyData(false);

        try {
            const res = await fetch('/api/professions', {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status} ${res.statusText}`);
            }

            const json = await res.json();

            // Handle both { data: [...] } (Laravel Resource collection) and bare array
            const list: Profession[] = Array.isArray(json) ? json : (json.data ?? []);

            if (list.length === 0) {
                // If no data from API, use dummy data
                console.log('No professions from API, using dummy data');
                setProfessions(DUMMY_PROFESSIONS);
                setLoadState('done');
                setUseDummyData(true);
                return;
            }

            setProfessions(list);
            setLoadState('done');
        } catch (err: any) {
            console.error('Failed to load professions:', err);
            // On error, fallback to dummy data
            setProfessions(DUMMY_PROFESSIONS);
            setLoadState('done');
            setUseDummyData(true);
            setFetchError(err?.message ?? 'Failed to load professions. Using demo data instead.');
        }
    };

    // Initialize on mount
    useEffect(() => {
        if (fromProps?.length) {
            setProfessions(fromProps);
            setLoadState('done');
        } else {
            // Try API first, fallback to dummy if fails
            loadProfessions(false);
        }
    }, []);

    const addFiles = (field: UploadField, incoming: FileList) => {
        const current: File[] = data[field] ?? [];
        setData(field, [...current, ...Array.from(incoming)]);
    };

    const removeFile = (field: UploadField, index: number) => {
        const updated = (data[field] as File[]).filter((_, i) => i !== index);
        setData(field, updated);
    };

    // Group professions by category for better organization
    const groupedProfessions = useMemo(() => {
        const groups: Record<string, Profession[]> = {
            clinical: [],
            administrative: [],
            technical: [],
            support: []
        };

        professions.forEach(prof => {
            if (groups[prof.category]) {
                groups[prof.category].push(prof);
            } else {
                groups.clinical.push(prof);
            }
        });

        return groups;
    }, [professions]);

    // ── Profession selector ────────────────────────────────────────────────────

    const renderProfessionSelector = () => {
        if (loadState === 'loading') {
            return (
                <div className="mt-1 flex items-center gap-2 h-10 px-3 border border-gray-200
                                rounded-md bg-gray-50 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Loading professions…
                </div>
            );
        }

        if (useDummyData && fetchError) {
            return (
                <div className="mt-1 space-y-2">
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200
                                    rounded-lg text-sm text-yellow-700">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium">Using demo data</p>
                            <p className="text-xs text-yellow-600 mt-0.5 break-words">
                                {fetchError} Showing sample healthcare professions instead.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => loadProfessions(false)}
                            className="flex items-center gap-1 text-xs font-medium text-yellow-700
                                       hover:text-yellow-900 shrink-0 mt-0.5"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Retry API
                        </button>
                    </div>
                    {renderProfessionSelect()}
                </div>
            );
        }

        return renderProfessionSelect();
    };

    const renderProfessionSelect = () => {
        return (
            <Select
                value={data.profession_id?.toString() ?? ''}
                onValueChange={(v) => setData('profession_id', parseInt(v, 10))}
            >
                <SelectTrigger id="profession_id" className="mt-1">
                    <SelectValue placeholder="Select your profession" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                    {/* Group by category for better UX */}
                    {Object.entries(groupedProfessions).map(([category, categoryProfessions]) => {
                        if (categoryProfessions.length === 0) return null;

                        const categoryNames = {
                            clinical: '👨‍⚕️ Clinical Professionals',
                            administrative: '📋 Administrative Staff',
                            technical: '🔧 Technical Professionals',
                            support: '🤝 Support Staff'
                        };

                        return (
                            <div key={category}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                    {categoryNames[category as keyof typeof categoryNames] || category}
                                </div>
                                {categoryProfessions.map((p) => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{p.name}</span>
                                            <span className="text-xs text-gray-500">{p.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </div>
                        );
                    })}
                </SelectContent>
            </Select>
        );
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div>
                <Label htmlFor="profession_id" className="text-sm font-medium text-gray-700">
                    Profession <span className="text-red-500">*</span>
                </Label>
                {renderProfessionSelector()}
                {errors.profession_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.profession_id}</p>
                )}
                {useDummyData && !fetchError && (
                    <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Using demo healthcare profession data
                    </p>
                )}
            </div>

            {UPLOAD_FIELDS.map(({ key, label }) => (
                <FileUploadField
                    key={key}
                    id={key}
                    label={label}
                    files={data[key] ?? []}
                    error={errors[key]}
                    onAdd={(files) => addFiles(key, files)}
                    onRemove={(i)   => removeFile(key, i)}
                />
            ))}
        </div>
    );
}
