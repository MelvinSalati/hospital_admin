import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Briefcase,
    Calendar,
    Camera,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Eye,
    Globe,
    IdCard,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Save,
    Upload,
    User,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

/* -------------------------------------------------------------------------- */
/* Types and constants                                                        */
/* -------------------------------------------------------------------------- */

interface PatientForm {
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    email: string;
    address: string;
    emergency_contact: string;
    emergency_phone: string;
    blood_group: string;
    allergies: string;
    chronic_conditions: string;
    current_medications: string;
    medical_history: string;
    surgical_history: string;
    family_history: string;
    marital_status: string;
    occupation: string;
    nationality: string;
    id_type: string;
    id_number: string;
    insurance_provider: string;
    insurance_number: string;
    insurance_expiry: string;
    insurance_status: string;
    next_of_kin_name: string;
    next_of_kin_relationship: string;
    next_of_kin_phone: string;
    status: string;
    profile_photo: File | null;
}

interface RecentPatient {
    id: number;
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    phone: string | null;
    alt_phone?: string | null;
    email?: string | null;
    status: string;
    created_at: string;
}

type TabId =
    | 'personal'
    | 'contacts'
    | 'demographic'
    | 'identification'
    | 'photo'
    | 'insurance';

type FieldErrors = Partial<Record<keyof PatientForm, string>>;

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'contacts', label: 'Contacts', icon: Phone },
    { id: 'demographic', label: 'Demographics', icon: Users },
    { id: 'identification', label: 'Identity', icon: IdCard },
    { id: 'photo', label: 'Photo', icon: Camera },
    { id: 'insurance', label: 'Insurance', icon: CreditCard },
];

const TAB_FIELDS: Record<TabId, (keyof PatientForm)[]> = {
    personal: [
        'first_name',
        'last_name',
        'gender',
        'date_of_birth',
        'blood_group',
    ],
    contacts: [
        'phone',
        'email',
        'address',
        'next_of_kin_name',
        'next_of_kin_relationship',
        'next_of_kin_phone',
        'emergency_contact',
        'emergency_phone',
    ],
    demographic: ['marital_status', 'occupation', 'nationality'],
    identification: ['id_type', 'id_number'],
    photo: ['profile_photo'],
    insurance: [
        'insurance_provider',
        'insurance_number',
        'insurance_expiry',
        'insurance_status',
    ],
};

const REQUIRED_FIELDS: (keyof PatientForm)[] = [
    'first_name',
    'last_name',
    'gender',
    'date_of_birth',
];

const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const ID_TYPES = [
    {
        value: 'national_id',
        label: 'NRC (National Registration Card)',
        placeholder: '123456/78/1',
    },
    { value: 'passport', label: 'Passport', placeholder: 'ZN1234567' },
    {
        value: 'driving_license',
        label: 'Driving licence',
        placeholder: 'Licence number',
    },
    { value: 'voter_id', label: 'Voter ID', placeholder: 'Voter ID number' },
];

const RELATIONSHIPS = [
    'Spouse',
    'Parent',
    'Child',
    'Sibling',
    'Guardian',
    'Friend',
];

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const hasValue = (value: unknown): boolean =>
    value !== null && value !== undefined && value !== '';

const formatDate = (dateString: string): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const getAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
    }
    return age >= 0 ? age : null;
};

const formatAge = (age: number | null): string | null => {
    if (age === null) return null;
    if (age === 0) return 'Under 1 year old';
    return `${age} ${age === 1 ? 'year' : 'years'} old`;
};

const initialsOf = (first?: string, last?: string): string =>
    `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

const todayISO = () => new Date().toISOString().slice(0, 10);

const controlClass = (hasError: boolean, hasIcon = false): string =>
    [
        'w-full rounded-lg border bg-white py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
        'focus:ring-2 focus:outline-none dark:bg-slate-900 dark:text-white',
        hasIcon ? 'pr-4 pl-10' : 'px-4',
        hasError
            ? 'border-red-500 focus:ring-red-500/20'
            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700',
    ].join(' ');

/* -------------------------------------------------------------------------- */
/* Small presentational components (defined outside Create so inputs keep     */
/* focus while typing)                                                        */
/* -------------------------------------------------------------------------- */

function Field({
    label,
    htmlFor,
    error,
    hint,
    required,
    className,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    hint?: string | null;
    required?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <label
                htmlFor={htmlFor}
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            {children}
            {error ? (
                <p
                    id={`${htmlFor}-error`}
                    role="alert"
                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                >
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

function IconWrap({
    icon: Icon,
    children,
    top,
}: {
    icon: typeof User;
    children: ReactNode;
    top?: boolean;
}) {
    return (
        <div className="relative">
            <Icon
                className={`pointer-events-none absolute left-3 h-4 w-4 text-slate-400 ${
                    top ? 'top-3' : 'top-1/2 -translate-y-1/2'
                }`}
            />
            {children}
        </div>
    );
}

function SectionTitle({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof User;
    title: string;
    description?: string;
}) {
    return (
        <div className="border-b border-slate-200 pb-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {title}
                </h3>
            </div>
            {description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            )}
        </div>
    );
}

function SummaryBlock({
    title,
    rows,
}: {
    title: string;
    rows: [string, string | null | undefined][];
}) {
    return (
        <div>
            <h4 className="mb-2 font-medium text-slate-900 dark:text-white">
                {title}
            </h4>
            <dl className="space-y-1.5 text-sm">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                        <dt className="text-slate-500 dark:text-slate-400">
                            {label}
                        </dt>
                        <dd
                            className={`text-right ${
                                hasValue(value)
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400'
                            }`}
                        >
                            {hasValue(value) ? value : 'Not provided'}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function Avatar({
    first,
    last,
    size = 'md',
}: {
    first?: string;
    last?: string;
    size?: 'md' | 'lg';
}) {
    return (
        <div
            className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 font-medium text-white ${
                size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm'
            }`}
        >
            {initialsOf(first, last)}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Table columns                                                              */
/* -------------------------------------------------------------------------- */

const recentPatientColumns = [
    {
        id: 'patient_number',
        label: 'Patient #',
        sortable: true,
        render: (patient: RecentPatient) => (
            <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                {hasValue(patient.patient_number)
                    ? patient.patient_number
                    : '—'}
            </span>
        ),
    },
    {
        id: 'first_name',
        label: 'First name',
        sortable: true,
        render: (patient: RecentPatient) => (
            <div className="flex items-center gap-3">
                <Avatar first={patient.first_name} last={patient.last_name} />
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {hasValue(patient.first_name)
                            ? patient.first_name
                            : '—'}
                    </div>
                    <div className="text-xs text-gray-500 capitalize dark:text-slate-400">
                        {hasValue(patient.gender) ? patient.gender : '—'}
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'last_name',
        label: 'Surname',
        sortable: true,
        render: (patient: RecentPatient) => (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
                {hasValue(patient.last_name) ? patient.last_name : '—'}
            </span>
        ),
    },
    {
        id: 'phone',
        label: 'Contact',
        sortable: false,
        render: (patient: RecentPatient) => (
            <div className="space-y-0.5 text-sm text-gray-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{hasValue(patient.phone) ? patient.phone : '—'}</span>
                </div>
                {hasValue(patient.email) && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span>{patient.email}</span>
                    </div>
                )}
                {hasValue(patient.alt_phone) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span>{patient.alt_phone}</span>
                    </div>
                )}
            </div>
        ),
    },
    {
        id: 'status',
        label: 'Status',
        sortable: true,
        render: (patient: RecentPatient) => {
            const active = patient.status === 'active';
            return (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                    />
                    {active ? 'Active' : 'Inactive'}
                </span>
            );
        },
    },
    {
        id: 'created_at',
        label: 'Registered',
        sortable: true,
        render: (patient: RecentPatient) => (
            <span className="text-sm text-gray-500 dark:text-slate-400">
                {hasValue(patient.created_at)
                    ? formatDate(patient.created_at)
                    : '—'}
            </span>
        ),
    },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Create() {
    const { auth, insuranceProviders, recentPatients } = usePage().props as any;

    const [activeTab, setActiveTab] = useState<TabId>('personal');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    const { data, setData, errors, setError, clearErrors, reset, isDirty } =
        useForm<PatientForm>({
            patient_number: '',
            first_name: '',
            last_name: '',
            gender: '',
            date_of_birth: '',
            phone: '',
            email: '',
            address: '',
            emergency_contact: '',
            emergency_phone: '',
            blood_group: '',
            allergies: '',
            chronic_conditions: '',
            current_medications: '',
            medical_history: '',
            surgical_history: '',
            family_history: '',
            marital_status: '',
            occupation: '',
            nationality: 'Zambian',
            id_type: '',
            id_number: '',
            insurance_provider: '',
            insurance_number: '',
            insurance_expiry: '',
            insurance_status: '',
            next_of_kin_name: '',
            next_of_kin_relationship: '',
            next_of_kin_phone: '',
            status: 'active',
            profile_photo: null,
        });

    const fieldErrors = errors as FieldErrors;
    const tabIndex = TABS.findIndex((t) => t.id === activeTab);
    const isLastTab = tabIndex === TABS.length - 1;
    const canRegisterNow = REQUIRED_FIELDS.every((f) => hasValue(data[f]));
    const age = getAge(data.date_of_birth);
    const insuranceExpired =
        hasValue(data.insurance_expiry) && data.insurance_expiry < todayISO();
    const selectedIdType = ID_TYPES.find((t) => t.value === data.id_type);
    const fullName = `${data.first_name} ${data.last_name}`.trim();
    const genderLabel = GENDERS.find((g) => g.value === data.gender)?.label;
    const identitySummary = [genderLabel, formatAge(age)]
        .filter(Boolean)
        .join(', ');

    /* Release the object URL when the photo changes or the page unmounts */
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const closeModal = () => {
        if (submitting) return;
        if (isDirty && !window.confirm('Discard this registration?')) return;
        reset();
        clearErrors();
        setImagePreview(null);
        setActiveTab('personal');
        setShowPreview(false);
        setIsModalOpen(false);
    };

    /* Escape closes the top-most layer; page scroll is locked while open */
    useEffect(() => {
        if (!isModalOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showPreview) setShowPreview(false);
            else closeModal();
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModalOpen, showPreview, submitting, isDirty]);

    /* ---------------------------- field handling ---------------------------- */

    const update = (name: keyof PatientForm, value: string) => {
        setData(name as any, value as any);
        if (fieldErrors[name]) clearErrors(name as any);
    };

    const handleInputChange = (
        e: ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => update(e.target.name as keyof PatientForm, e.target.value);

    const bind = (name: keyof PatientForm) => ({
        id: name,
        name,
        value: (data[name] as string) ?? '',
        onChange: handleInputChange,
        'aria-invalid': fieldErrors[name] ? true : undefined,
        'aria-describedby': fieldErrors[name] ? `${name}-error` : undefined,
    });

    const setPhoto = (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Choose an image file (PNG, JPG or GIF).');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            toast.error('The photo must be 2 MB or smaller.');
            return;
        }
        setData('profile_photo', file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) =>
        setPhoto(e.target.files?.[0]);

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        setPhoto(e.dataTransfer.files?.[0]);
    };

    const removePhoto = () => {
        setData('profile_photo', null);
        setImagePreview(null);
    };

    /* ------------------------------ validation ------------------------------ */

    const tabState = (id: TabId): 'error' | 'done' | 'idle' => {
        if (TAB_FIELDS[id].some((f) => fieldErrors[f])) return 'error';
        if (id === 'personal') {
            return REQUIRED_FIELDS.every((f) => hasValue(data[f]))
                ? 'done'
                : 'idle';
        }
        return TAB_FIELDS[id].some(
            (f) => f !== 'nationality' && hasValue(data[f]),
        )
            ? 'done'
            : 'idle';
    };

    const validate = (): FieldErrors => {
        const found: FieldErrors = {};
        if (!data.first_name.trim()) found.first_name = 'Enter the first name.';
        if (!data.last_name.trim()) found.last_name = 'Enter the last name.';
        if (!data.gender) found.gender = 'Select a gender.';
        if (!data.date_of_birth) {
            found.date_of_birth = 'Enter the date of birth.';
        } else if (data.date_of_birth > todayISO()) {
            found.date_of_birth = 'The date of birth can’t be in the future.';
        }
        return found;
    };

    const goToFirstTabWith = (found: FieldErrors) => {
        const target = TABS.find((t) =>
            TAB_FIELDS[t.id].some((f) => f in found),
        );
        if (target) setActiveTab(target.id);
    };

    /* ------------------------------- submitting ------------------------------ */

    const submitRegistration = async () => {
        const found = validate();
        if (Object.keys(found).length > 0) {
            setError(found as any);
            goToFirstTabWith(found);
            return;
        }

        setSubmitting(true);
        try {
            // Multipart so the photo file is actually sent
            const payload = new FormData();
            (Object.keys(data) as (keyof PatientForm)[]).forEach((key) => {
                const value = data[key];
                if (value === null || value === undefined) return;
                payload.append(
                    key,
                    value instanceof File ? value : String(value),
                );
            });

            const response = await Http.post(
                `register/patients/${auth.user.id}`,
                payload,
            );

            if (response.status === 201) {
                toast.success(response.data.message ?? 'Patient registered.');
                reset();
                setImagePreview(null);
                setActiveTab('personal');
                setIsModalOpen(false);
              
            } else {
                toast.error(
                    response.data.message ?? 'Couldn’t register the patient.',
                );
            }
        } catch (error: any) {
            console.log(error)
            const res = error?.response;
            if (res?.status === 422 && res.data?.errors) {
                const mapped = Object.fromEntries(
                    Object.entries(res.data.errors).map(([key, value]) => [
                        key,
                        Array.isArray(value) ? String(value[0]) : String(value),
                    ]),
                ) as FieldErrors;
                setError(mapped as any);
                goToFirstTabWith(mapped);
                toast.error('Some details need fixing. Check the red fields.');
            } else {
                toast.error(
                    res?.data?.message ??
                        'Couldn’t register the patient. Try again.',
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    const goNext = () => {
        if (!isLastTab) setActiveTab(TABS[tabIndex + 1].id);
    };

    const goBack = () => {
        if (tabIndex > 0) setActiveTab(TABS[tabIndex - 1].id);
    };

    // Enter moves to the next step; only the last step submits
    const handleFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isLastTab) submitRegistration();
        else goNext();
    };

    /* ----------------------------- table actions ----------------------------- */

    const handleViewPatient = (patient: RecentPatient) =>
        router.visit(`/patients/${patient.id}`);

    const handleEditPatient = (patient: RecentPatient) =>
        router.visit(`/patients/${patient.id}/edit`);

    const recentPatientActions = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row: RecentPatient) => handleViewPatient(row),
        },
        {
            label: 'Edit',
            icon: <Pencil size={16} />,
            color: 'warning',
            onClick: (row: RecentPatient) => handleEditPatient(row),
        },
    ];

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reception', href: '/reception' },
        { title: 'Register patient' },
    ];

    const providerName = insuranceProviders?.find(
        (p: any) => String(p.id) === String(data.insurance_provider),
    )?.name;

    const errorMessages = Object.values(fieldErrors).filter(
        Boolean,
    ) as string[];

    /* -------------------------------- render -------------------------------- */

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Register patient" />

            <div className="font-poppins min-h-screen bg-blue-50 dark:bg-slate-950">
                <PageHeader
                    icon={<UserPlus />}
                    title="Register patient"
                    subtitle="Add a new patient to the system"
                    actions={[
                        {
                            label: 'Register patient',
                            onClick() {
                                setIsModalOpen(true);
                            },
                        },
                    ]}
                />

                {/* ------------------------- Registration modal ------------------------- */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="register-title"
                            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-slate-50 shadow-2xl dark:bg-slate-800"
                        >
                            {/* Header: shows who is being registered as details are entered */}
                            <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                                <div className="flex min-w-0 items-center gap-4">
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt=""
                                            className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <Avatar
                                            first={data.first_name}
                                            last={data.last_name}
                                            size="lg"
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <h2
                                            id="register-title"
                                            className="truncate text-base font-semibold text-slate-900 dark:text-white"
                                        >
                                            {fullName || 'New patient'}
                                        </h2>
                                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                                            {identitySummary ||
                                                'Name, gender and date of birth are required.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(true)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                                    >
                                        <Eye className="h-4 w-4" />
                                        <span className="hidden sm:inline">
                                            Review
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        aria-label="Close"
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <form
                                noValidate
                                onSubmit={handleFormSubmit}
                                encType="multipart/form-data"
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                {/* Steps */}
                                <div
                                    role="tablist"
                                    aria-label="Registration steps"
                                    className="flex flex-shrink-0 overflow-x-auto border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                                >
                                    {TABS.map((tab) => {
                                        const Icon = tab.icon;
                                        const state = tabState(tab.id);
                                        const selected = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={selected}
                                                aria-controls={`panel-${tab.id}`}
                                                onClick={() =>
                                                    setActiveTab(tab.id)
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                                                    selected
                                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                        : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {tab.label}
                                                {state === 'error' && (
                                                    <AlertCircle
                                                        className="h-4 w-4 text-red-500"
                                                        aria-label="Has errors"
                                                    />
                                                )}
                                                {state === 'done' && (
                                                    <CheckCircle
                                                        className="h-4 w-4 text-green-500"
                                                        aria-label="Filled in"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Scrolling body */}
                                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                                    {errorMessages.length > 0 && (
                                        <div
                                            role="alert"
                                            className="mx-6 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                        >
                                            <p className="font-medium">
                                                Some details need fixing. Steps
                                                with a red icon have errors.
                                            </p>
                                            <ul className="mt-1 list-inside list-disc">
                                                {errorMessages.map(
                                                    (message, i) => (
                                                        <li key={i}>
                                                            {message}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    <div
                                        id={`panel-${activeTab}`}
                                        role="tabpanel"
                                        className="min-h-[20rem] space-y-6 px-6 py-5"
                                    >
                                        {/* Personal */}
                                        {activeTab === 'personal' && (
                                            <>
                                                <SectionTitle
                                                    icon={User}
                                                    title="Personal information"
                                                />
                                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                    <Field
                                                        label="Patient number"
                                                        htmlFor="patient_number"
                                                    >
                                                        <IconWrap icon={IdCard}>
                                                            <input
                                                                type="text"
                                                                {...bind(
                                                                    'patient_number',
                                                                )}
                                                                placeholder="Assigned when you save"
                                                                readOnly
                                                                className={`${controlClass(false, true)} bg-slate-50 text-slate-500 dark:bg-slate-800`}
                                                            />
                                                        </IconWrap>
                                                    </Field>

                                                    <Field
                                                        label="First name"
                                                        htmlFor="first_name"
                                                        required
                                                        error={
                                                            fieldErrors.first_name
                                                        }
                                                    >
                                                        <input
                                                            type="text"
                                                            autoComplete="off"
                                                            autoFocus
                                                            {...bind(
                                                                'first_name',
                                                            )}
                                                            className={controlClass(
                                                                !!fieldErrors.first_name,
                                                            )}
                                                        />
                                                    </Field>

                                                    <Field
                                                        label="Last name"
                                                        htmlFor="last_name"
                                                        required
                                                        error={
                                                            fieldErrors.last_name
                                                        }
                                                    >
                                                        <input
                                                            type="text"
                                                            autoComplete="off"
                                                            {...bind(
                                                                'last_name',
                                                            )}
                                                            className={controlClass(
                                                                !!fieldErrors.last_name,
                                                            )}
                                                        />
                                                    </Field>

                                                    <Field
                                                        label="Gender"
                                                        htmlFor="gender"
                                                        required
                                                        error={
                                                            fieldErrors.gender
                                                        }
                                                    >
                                                        <div
                                                            id="gender"
                                                            role="radiogroup"
                                                            aria-label="Gender"
                                                            className={`grid grid-cols-3 gap-1 rounded-lg border bg-white p-1 dark:bg-slate-900 ${
                                                                fieldErrors.gender
                                                                    ? 'border-red-500'
                                                                    : 'border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        >
                                                            {GENDERS.map(
                                                                (g) => {
                                                                    const checked =
                                                                        data.gender ===
                                                                        g.value;
                                                                    return (
                                                                        <button
                                                                            key={
                                                                                g.value
                                                                            }
                                                                            type="button"
                                                                            role="radio"
                                                                            aria-checked={
                                                                                checked
                                                                            }
                                                                            onClick={() =>
                                                                                update(
                                                                                    'gender',
                                                                                    g.value,
                                                                                )
                                                                            }
                                                                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                                                                checked
                                                                                    ? 'bg-blue-600 text-white'
                                                                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                                                            }`}
                                                                        >
                                                                            {
                                                                                g.label
                                                                            }
                                                                        </button>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </Field>

                                                    <Field
                                                        label="Date of birth"
                                                        htmlFor="date_of_birth"
                                                        required
                                                        error={
                                                            fieldErrors.date_of_birth
                                                        }
                                                        hint={formatAge(age)}
                                                    >
                                                        <IconWrap
                                                            icon={Calendar}
                                                        >
                                                            <input
                                                                type="date"
                                                                max={todayISO()}
                                                                {...bind(
                                                                    'date_of_birth',
                                                                )}
                                                                className={controlClass(
                                                                    !!fieldErrors.date_of_birth,
                                                                    true,
                                                                )}
                                                            />
                                                        </IconWrap>
                                                    </Field>

                                                    <Field
                                                        label="Blood group"
                                                        htmlFor="blood_group"
                                                    >
                                                        <select
                                                            {...bind(
                                                                'blood_group',
                                                            )}
                                                            className={controlClass(
                                                                false,
                                                            )}
                                                        >
                                                            <option value="">
                                                                Select blood
                                                                group
                                                            </option>
                                                            {BLOOD_GROUPS.map(
                                                                (bg) => (
                                                                    <option
                                                                        key={bg}
                                                                        value={
                                                                            bg
                                                                        }
                                                                    >
                                                                        {bg}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </Field>
                                                </div>
                                            </>
                                        )}

                                        {/* Contacts */}
                                        {activeTab === 'contacts' && (
                                            <>
                                                <SectionTitle
                                                    icon={Phone}
                                                    title="Contact information"
                                                />
                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="space-y-4">
                                                        <Field
                                                            label="Phone number"
                                                            htmlFor="phone"
                                                            error={
                                                                fieldErrors.phone
                                                            }
                                                        >
                                                            <IconWrap
                                                                icon={Phone}
                                                            >
                                                                <input
                                                                    type="tel"
                                                                    {...bind(
                                                                        'phone',
                                                                    )}
                                                                    placeholder="+260 97 1234567"
                                                                    className={controlClass(
                                                                        !!fieldErrors.phone,
                                                                        true,
                                                                    )}
                                                                />
                                                            </IconWrap>
                                                        </Field>
                                                        <Field
                                                            label="Email address"
                                                            htmlFor="email"
                                                            error={
                                                                fieldErrors.email
                                                            }
                                                        >
                                                            <IconWrap
                                                                icon={Mail}
                                                            >
                                                                <input
                                                                    type="email"
                                                                    {...bind(
                                                                        'email',
                                                                    )}
                                                                    placeholder="patient@example.com"
                                                                    className={controlClass(
                                                                        !!fieldErrors.email,
                                                                        true,
                                                                    )}
                                                                />
                                                            </IconWrap>
                                                        </Field>
                                                    </div>

                                                    <Field
                                                        label="Physical address"
                                                        htmlFor="address"
                                                        error={
                                                            fieldErrors.address
                                                        }
                                                    >
                                                        <IconWrap
                                                            icon={MapPin}
                                                            top
                                                        >
                                                            <textarea
                                                                rows={4}
                                                                {...bind(
                                                                    'address',
                                                                )}
                                                                placeholder="Plot, area and town"
                                                                className={controlClass(
                                                                    !!fieldErrors.address,
                                                                    true,
                                                                )}
                                                            />
                                                        </IconWrap>
                                                    </Field>
                                                </div>

                                                <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
                                                    <h4 className="mb-4 font-medium text-slate-900 dark:text-white">
                                                        Next of kin
                                                    </h4>
                                                    <div className="grid gap-6 md:grid-cols-3">
                                                        <Field
                                                            label="Full name"
                                                            htmlFor="next_of_kin_name"
                                                            error={
                                                                fieldErrors.next_of_kin_name
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                {...bind(
                                                                    'next_of_kin_name',
                                                                )}
                                                                className={controlClass(
                                                                    !!fieldErrors.next_of_kin_name,
                                                                )}
                                                            />
                                                        </Field>
                                                        <Field
                                                            label="Relationship"
                                                            htmlFor="next_of_kin_relationship"
                                                            error={
                                                                fieldErrors.next_of_kin_relationship
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                list="relationships"
                                                                {...bind(
                                                                    'next_of_kin_relationship',
                                                                )}
                                                                className={controlClass(
                                                                    !!fieldErrors.next_of_kin_relationship,
                                                                )}
                                                            />
                                                            <datalist id="relationships">
                                                                {RELATIONSHIPS.map(
                                                                    (r) => (
                                                                        <option
                                                                            key={
                                                                                r
                                                                            }
                                                                            value={
                                                                                r
                                                                            }
                                                                        />
                                                                    ),
                                                                )}
                                                            </datalist>
                                                        </Field>
                                                        <Field
                                                            label="Phone number"
                                                            htmlFor="next_of_kin_phone"
                                                            error={
                                                                fieldErrors.next_of_kin_phone
                                                            }
                                                        >
                                                            <input
                                                                type="tel"
                                                                {...bind(
                                                                    'next_of_kin_phone',
                                                                )}
                                                                className={controlClass(
                                                                    !!fieldErrors.next_of_kin_phone,
                                                                )}
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
                                                    <div className="mb-4 flex items-center justify-between gap-3">
                                                        <h4 className="font-medium text-slate-900 dark:text-white">
                                                            Emergency contact
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                update(
                                                                    'emergency_contact',
                                                                    data.next_of_kin_name,
                                                                );
                                                                update(
                                                                    'emergency_phone',
                                                                    data.next_of_kin_phone,
                                                                );
                                                            }}
                                                            disabled={
                                                                !data.next_of_kin_name &&
                                                                !data.next_of_kin_phone
                                                            }
                                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400"
                                                        >
                                                            Same as next of kin
                                                        </button>
                                                    </div>
                                                    <div className="grid gap-6 md:grid-cols-2">
                                                        <Field
                                                            label="Full name"
                                                            htmlFor="emergency_contact"
                                                            error={
                                                                fieldErrors.emergency_contact
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                {...bind(
                                                                    'emergency_contact',
                                                                )}
                                                                className={controlClass(
                                                                    !!fieldErrors.emergency_contact,
                                                                )}
                                                            />
                                                        </Field>
                                                        <Field
                                                            label="Phone number"
                                                            htmlFor="emergency_phone"
                                                            error={
                                                                fieldErrors.emergency_phone
                                                            }
                                                        >
                                                            <input
                                                                type="tel"
                                                                {...bind(
                                                                    'emergency_phone',
                                                                )}
                                                                className={controlClass(
                                                                    !!fieldErrors.emergency_phone,
                                                                )}
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Demographics */}
                                        {activeTab === 'demographic' && (
                                            <>
                                                <SectionTitle
                                                    icon={Users}
                                                    title="Demographic information"
                                                />
                                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                    <Field
                                                        label="Marital status"
                                                        htmlFor="marital_status"
                                                    >
                                                        <select
                                                            {...bind(
                                                                'marital_status',
                                                            )}
                                                            className={controlClass(
                                                                false,
                                                            )}
                                                        >
                                                            <option value="">
                                                                Select status
                                                            </option>
                                                            <option value="single">
                                                                Single
                                                            </option>
                                                            <option value="married">
                                                                Married
                                                            </option>
                                                            <option value="divorced">
                                                                Divorced
                                                            </option>
                                                            <option value="widowed">
                                                                Widowed
                                                            </option>
                                                        </select>
                                                    </Field>
                                                    <Field
                                                        label="Occupation"
                                                        htmlFor="occupation"
                                                    >
                                                        <IconWrap
                                                            icon={Briefcase}
                                                        >
                                                            <input
                                                                type="text"
                                                                {...bind(
                                                                    'occupation',
                                                                )}
                                                                placeholder="e.g. Teacher"
                                                                className={controlClass(
                                                                    false,
                                                                    true,
                                                                )}
                                                            />
                                                        </IconWrap>
                                                    </Field>
                                                    <Field
                                                        label="Nationality"
                                                        htmlFor="nationality"
                                                    >
                                                        <IconWrap icon={Globe}>
                                                            <input
                                                                type="text"
                                                                {...bind(
                                                                    'nationality',
                                                                )}
                                                                className={controlClass(
                                                                    false,
                                                                    true,
                                                                )}
                                                            />
                                                        </IconWrap>
                                                    </Field>
                                                </div>
                                            </>
                                        )}

                                        {/* Identity */}
                                        {activeTab === 'identification' && (
                                            <>
                                                <SectionTitle
                                                    icon={IdCard}
                                                    title="Identification"
                                                />
                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <Field
                                                        label="ID type"
                                                        htmlFor="id_type"
                                                    >
                                                        <select
                                                            {...bind('id_type')}
                                                            className={controlClass(
                                                                false,
                                                            )}
                                                        >
                                                            <option value="">
                                                                Select ID type
                                                            </option>
                                                            {ID_TYPES.map(
                                                                (type) => (
                                                                    <option
                                                                        key={
                                                                            type.value
                                                                        }
                                                                        value={
                                                                            type.value
                                                                        }
                                                                    >
                                                                        {
                                                                            type.label
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </Field>
                                                    <Field
                                                        label="ID number"
                                                        htmlFor="id_number"
                                                    >
                                                        <input
                                                            type="text"
                                                            {...bind(
                                                                'id_number',
                                                            )}
                                                            placeholder={
                                                                selectedIdType?.placeholder ??
                                                                'Select an ID type first'
                                                            }
                                                            className={controlClass(
                                                                false,
                                                            )}
                                                        />
                                                    </Field>
                                                </div>
                                            </>
                                        )}

                                        {/* Photo */}
                                        {activeTab === 'photo' && (
                                            <>
                                                <SectionTitle
                                                    icon={Camera}
                                                    title="Profile photo"
                                                    description="Optional. PNG, JPG or GIF, up to 2 MB."
                                                />
                                                <div className="flex flex-col items-center gap-6 md:flex-row">
                                                    <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-full border-4 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                                                        {imagePreview ? (
                                                            <img
                                                                src={
                                                                    imagePreview
                                                                }
                                                                alt="Profile preview"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                {fullName ? (
                                                                    <span className="text-4xl font-semibold text-slate-400">
                                                                        {initialsOf(
                                                                            data.first_name,
                                                                            data.last_name,
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <User className="h-12 w-12 text-slate-400" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="w-full flex-1 space-y-3">
                                                        <div
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                setDragging(
                                                                    true,
                                                                );
                                                            }}
                                                            onDragLeave={() =>
                                                                setDragging(
                                                                    false,
                                                                )
                                                            }
                                                            onDrop={handleDrop}
                                                            className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                                                                dragging
                                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                    : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
                                                            }`}
                                                        >
                                                            <Upload className="mx-auto h-10 w-10 text-slate-400" />
                                                            <div className="mt-2 flex justify-center text-sm text-slate-600 dark:text-slate-400">
                                                                <label className="cursor-pointer rounded-md font-semibold text-blue-600 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 focus-within:outline-none hover:text-blue-500">
                                                                    <span>
                                                                        Choose a
                                                                        photo
                                                                    </span>
                                                                    <input
                                                                        type="file"
                                                                        name="profile_photo"
                                                                        accept="image/*"
                                                                        className="sr-only"
                                                                        onChange={
                                                                            handleFileChange
                                                                        }
                                                                    />
                                                                </label>
                                                                <span className="pl-1">
                                                                    or drop it
                                                                    here
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {imagePreview && (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    removePhoto
                                                                }
                                                                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                                                            >
                                                                Remove photo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Insurance */}
                                        {activeTab === 'insurance' && (
                                            <>
                                                <SectionTitle
                                                    icon={CreditCard}
                                                    title="Insurance information"
                                                    description="Leave blank for self-paying patients."
                                                />
                                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                                    <Field
                                                        label="Provider"
                                                        htmlFor="insurance_provider"
                                                    >
                                                        <select
                                                            {...bind(
                                                                'insurance_provider',
                                                            )}
                                                            className={controlClass(
                                                                false,
                                                            )}
                                                        >
                                                            <option value="">
                                                                Select provider
                                                            </option>
                                                            {insuranceProviders?.map(
                                                                (item: any) => (
                                                                    <option
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        value={
                                                                            item.id
                                                                        }
                                                                    >
                                                                        {
                                                                            item.name
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </Field>
                                                    <Field
                                                        label="Policy number"
                                                        htmlFor="insurance_number"
                                                    >
                                                        <input
                                                            type="text"
                                                            {...bind(
                                                                'insurance_number',
                                                            )}
                                                            className={controlClass(
                                                                false,
                                                            )}
                                                        />
                                                    </Field>
                                                    <Field
                                                        label="Expiry date"
                                                        htmlFor="insurance_expiry"
                                                        hint={
                                                            insuranceExpired
                                                                ? 'This policy has expired.'
                                                                : null
                                                        }
                                                    >
                                                        <IconWrap
                                                            icon={Calendar}
                                                        >
                                                            <input
                                                                type="date"
                                                                {...bind(
                                                                    'insurance_expiry',
                                                                )}
                                                                className={`${controlClass(false, true)} ${
                                                                    insuranceExpired
                                                                        ? 'border-amber-500'
                                                                        : ''
                                                                }`}
                                                            />
                                                        </IconWrap>
                                                    </Field>
                                                    <Field
                                                        label="Status"
                                                        htmlFor="insurance_status"
                                                    >
                                                        <select
                                                            {...bind(
                                                                'insurance_status',
                                                            )}
                                                            className={controlClass(
                                                                false,
                                                            )}
                                                        >
                                                            <option value="">
                                                                Select status
                                                            </option>
                                                            <option value="active">
                                                                Active
                                                            </option>
                                                            <option value="expired">
                                                                Expired
                                                            </option>
                                                            <option value="pending">
                                                                Pending
                                                            </option>
                                                        </select>
                                                    </Field>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Footer stays visible while the body scrolls */}
                                <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        disabled={tabIndex === 0}
                                        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Back
                                    </button>

                                    <span className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                                        Step {tabIndex + 1} of {TABS.length}
                                    </span>

                                    <div className="flex items-center gap-3">
                                        {!isLastTab && canRegisterNow && (
                                            <button
                                                type="button"
                                                onClick={submitRegistration}
                                                disabled={submitting}
                                                className="flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                            >
                                                {submitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="h-4 w-4" />
                                                )}
                                                Register patient
                                            </button>
                                        )}

                                        {isLastTab ? (
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Saving…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4" />
                                                        Register patient
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={goNext}
                                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ---------------------------- Review modal ---------------------------- */}
                {isModalOpen && showPreview && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="review-title"
                            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-800"
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h3
                                    id="review-title"
                                    className="text-lg font-semibold text-slate-900 dark:text-white"
                                >
                                    Review patient details
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(false)}
                                    aria-label="Close review"
                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="grid gap-8 md:grid-cols-2">
                                <SummaryBlock
                                    title="Personal information"
                                    rows={[
                                        ['Name', fullName],
                                        ['Gender', genderLabel],
                                        [
                                            'Date of birth',
                                            data.date_of_birth
                                                ? `${formatDate(data.date_of_birth)}${
                                                      age !== null
                                                          ? ` (${age})`
                                                          : ''
                                                  }`
                                                : '',
                                        ],
                                        ['Blood group', data.blood_group],
                                    ]}
                                />
                                <SummaryBlock
                                    title="Contact information"
                                    rows={[
                                        ['Phone', data.phone],
                                        ['Email', data.email],
                                        ['Address', data.address],
                                    ]}
                                />
                                <SummaryBlock
                                    title="Next of kin"
                                    rows={[
                                        ['Name', data.next_of_kin_name],
                                        [
                                            'Relationship',
                                            data.next_of_kin_relationship,
                                        ],
                                        ['Phone', data.next_of_kin_phone],
                                    ]}
                                />
                                <SummaryBlock
                                    title="Emergency contact"
                                    rows={[
                                        ['Name', data.emergency_contact],
                                        ['Phone', data.emergency_phone],
                                    ]}
                                />
                                <SummaryBlock
                                    title="Identification"
                                    rows={[
                                        ['ID type', selectedIdType?.label],
                                        ['ID number', data.id_number],
                                    ]}
                                />
                                <SummaryBlock
                                    title="Insurance"
                                    rows={[
                                        ['Provider', providerName],
                                        [
                                            'Policy number',
                                            data.insurance_number,
                                        ],
                                        [
                                            'Expiry',
                                            data.insurance_expiry
                                                ? formatDate(
                                                      data.insurance_expiry,
                                                  )
                                                : '',
                                        ],
                                    ]}
                                />
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(false)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    Back to form
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ------------------------ Recent registrations ------------------------ */}
                <div className="mt-8 px-6 pb-8">
                    <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Recent registrations
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    The last 10 patients registered
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.visit('/patients')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                View all patients
                            </button>
                        </div>

                        {(recentPatients?.length ?? 0) > 0 ? (
                            <ReusableTable
                                data={recentPatients}
                                columns={recentPatientColumns}
                                actions={recentPatientActions}
                                searchable={true}
                                searchPlaceholder="Search patients..."
                                onRowClick={handleViewPatient}
                                emptyMessage="No patients found"
                                className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                            />
                        ) : (
                            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                                <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                                <p className="mt-2 font-medium">
                                    No patients registered yet
                                </p>
                                <p className="text-sm">
                                    Select Register patient to add the first
                                    one.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
