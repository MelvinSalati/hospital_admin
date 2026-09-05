import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Users,
    Briefcase,
    CreditCard,
    Save,
    X,
    ChevronRight,
    ChevronLeft,
    IdCard,
    Activity,
    Scissors,
    Stethoscope,
    Fingerprint,
    Shield,
    CheckCircle2,
    AlertTriangle,
    Camera,
    Loader2,
    Stethoscope as StethoscopeIcon,
    ShieldCheck,
    UserPlus,
    UserCircle,
    Eye,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

interface FormData {
    // Personal Information
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    email: string;
    address: string;

    // Emergency Contact
    emergency_contact: string;
    emergency_phone: string;

    // Medical Information
    blood_group: string;
    allergies: string;
    chronic_conditions: string;
    current_medications: string;
    medical_history: string;
    surgical_history: string;
    family_history: string;

    // Demographic Information
    marital_status: string;
    occupation: string;
    nationality: string;

    // Identification
    id_type: string;
    id_number: string;

    // Insurance Information
    insurance_provider: string;
    insurance_number: string;
    insurance_expiry: string;
    insurance_status: string;

    // Next of Kin
    next_of_kin_name: string;
    next_of_kin_relationship: string;
    next_of_kin_phone: string;

    // Status
    status: string;

    // File
    profile_photo: File | null;
}

export default function Create() {
    const { auth, insuranceProviders } = usePage().props as any;
    const [activeTab, setActiveTab] = useState('personal');
    const [showPreview, setShowPreview] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Biometrics state
    const [selectedFinger, setSelectedFinger] = useState<string | null>(null);
    const [registeredFingers, setRegisteredFingers] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // Use Inertia's useForm hook
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        recentlySuccessful,
    } = useForm<FormData>({
        // Personal Information
        patient_number: '',
        first_name: '',
        last_name: '',
        gender: '',
        date_of_birth: '',
        phone: '',
        email: '',
        address: '',

        // Emergency Contact
        emergency_contact: '',
        emergency_phone: '',

        // Medical Information
        blood_group: '',
        allergies: '',
        chronic_conditions: '',
        current_medications: '',
        medical_history: '',
        surgical_history: '',
        family_history: '',

        // Demographic Information
        marital_status: '',
        occupation: '',
        nationality: 'Zambian',

        // Identification
        id_type: '',
        id_number: '',

        // Insurance Information
        insurance_provider: '',
        insurance_number: '',
        insurance_expiry: '',
        insurance_status: '',

        // Next of Kin
        next_of_kin_name: '',
        next_of_kin_relationship: '',
        next_of_kin_phone: '',

        // Status
        status: 'active',

        // File
        profile_photo: null,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await Http.post(
                `register/patients/${auth.user.id}`,
                data,
            );
            console.log(response);
            if (response.status === 201) {
                toast.success(response.data.message);
                reset();
                setIsModalOpen(false);
                router.visit(`../patients/dashboard/${response.data.data.id}`);
            } else {
                Notiflix.Notify.failure(response.data.message);
            }
        } catch (error: any) {
            // console.log(error);
            toast.error('Some required field(s) are empty!');
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value, type } = e.target;

        if (type === 'file') {
            const fileInput = e.target as HTMLInputElement;
            if (fileInput.files && fileInput.files[0]) {
                setData(name as keyof FormData, fileInput.files[0] as any);
            }
        } else {
            setData(name as keyof FormData, value as any);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setData('profile_photo', file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Simulate fingerprint scanning
    const handleFingerprintScan = (finger: string) => {
        setIsScanning(true);
        setSelectedFinger(finger);

        setTimeout(() => {
            const mockFingerprintData = `fingerprint_${finger}_${Date.now()}`;
            const fingerKey = `fingerprint_${finger}` as keyof FormData;
            setData(fingerKey, mockFingerprintData as any);
            setRegisteredFingers((prev) => [...prev, finger]);
            setIsScanning(false);
            setSelectedFinger(null);
        }, 2000);
    };

    const removeFingerprint = (finger: string) => {
        const fingerKey = `fingerprint_${finger}` as keyof FormData;
        setData(fingerKey, null as any);
        setRegisteredFingers((prev) => prev.filter((f) => f !== finger));
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reception', href: '/reception' },
        { title: 'Register Patient' },
    ];

    const tabs = [
        { id: 'personal', label: 'Personal', icon: User },
        { id: 'contacts', label: 'Contacts', icon: Phone },
        { id: 'demographic', label: 'Demographics', icon: Users },
        { id: 'identification', label: 'Identity', icon: IdCard },
        { id: 'photo', label: 'Photo', icon: Camera },
        { id: 'insurance', label: 'Insurance', icon: CreditCard },
    ];

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    const idTypes = [
        { value: 'national_id', label: 'National ID' },
        { value: 'passport', label: 'Passport' },
        { value: 'driving_license', label: 'Driving License' },
        { value: 'voter_id', label: 'Voter ID' },
    ];

    console.log(insuranceProviders);
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Patient Registration" />

            <div className="font-poppins min-h-screen bg-blue-50">
                <PageHeader
                    icon={<UserPlus />}
                    title={'Patient Registration'}
                    subtitle={'Register a new patient in the system'}
                    actions={[
                        {
                            label: 'Register',
                            onClick() {
                                setIsModalOpen(true);
                            },
                        },
                    ]}
                />

                {/* <div className="mx-auto w-[800px] justify-center rounded-xl bg-white shadow-lg">
                    <div className="mx-auto flex gap-2">
                        <div className="border-r-1">
                            <UserCircle className="h-30 w-30" />
                        </div>
                        <div className="">
                            <h1 className="text-2xl font-bold text-slate-600">
                                Altaf Memorial Hospital
                            </h1>
                            <p>
                                The Hospital will send the delivery important
                                information to patient via whats app{' '}
                            </p>
                        </div>
                    </div>
                </div> */}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="relative flex w-[980px] flex-col overflow-hidden rounded-xl bg-slate-50 shadow-2xl dark:bg-slate-800">
                            {/* Modal Header */}
                            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-blue-600 p-2 text-white dark:bg-blue-900/30">
                                        <User className="h-5 w-5 text-white dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                            New Patient Registration
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Fill in the patient details below
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(true)}
                                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                        title="Preview"
                                    >
                                        <Eye className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                                {/* Display errors if any */}
                                {Object.keys(errors).length > 0 && (
                                    <div className="mb-4 rounded-lg bg-red-50 p-4 px-6 py-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                        <h3 className="font-medium">
                                            Please fix the following errors:
                                        </h3>
                                        <ul className="mt-1 list-inside list-disc text-sm">
                                            {Object.entries(errors).map(
                                                ([key, value], index) => (
                                                    <li key={index}>
                                                        {key}: {value as string}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {/* Success message */}
                                {recentlySuccessful && (
                                    <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        Patient registered successfully!
                                    </div>
                                )}

                                {/* Main Form */}
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                    encType="multipart/form-data"
                                >
                                    {/* Full Width Tabs Navigation */}
                                    <div className="overflow-x-auto border-b border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-800">
                                        <div className="flex min-w-full gap-0">
                                            {tabs.map((tab) => {
                                                const Icon = tab.icon;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setActiveTab(tab.id)
                                                        }
                                                        className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                                                            activeTab === tab.id
                                                                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        <span className="whitespace-nowrap">
                                                            {tab.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Form Sections */}
                                    <div className="space-y-6">
                                        {/* Personal Information Tab */}
                                        {activeTab === 'personal' && (
                                            <div className="space-y-6 px-6 py-4">
                                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                                                    <User className="h-5 w-5 text-blue-600" />
                                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                        Personal Information
                                                    </h2>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Patient Number
                                                        </label>
                                                        <div className="relative">
                                                            <IdCard className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                name="patient_number"
                                                                placeholder="Auto-generated"
                                                                value={
                                                                    data.patient_number
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                                                                readOnly
                                                            />
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            Auto-generated
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            First Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="first_name"
                                                            value={
                                                                data.first_name
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-900 ${
                                                                errors.first_name
                                                                    ? 'border-red-500'
                                                                    : 'border-slate-200 dark:border-slate-700'
                                                            }`}
                                                            required
                                                        />
                                                        {errors.first_name && (
                                                            <p className="mt-1 text-xs text-red-500">
                                                                {
                                                                    errors.first_name
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Last Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="last_name"
                                                            value={
                                                                data.last_name
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-900 ${
                                                                errors.last_name
                                                                    ? 'border-red-500'
                                                                    : 'border-slate-200 dark:border-slate-700'
                                                            }`}
                                                            required
                                                        />
                                                        {errors.last_name && (
                                                            <p className="mt-1 text-xs text-red-500">
                                                                {
                                                                    errors.last_name
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Gender *
                                                        </label>
                                                        <select
                                                            name="gender"
                                                            value={data.gender}
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-900 ${
                                                                errors.gender
                                                                    ? 'border-red-500'
                                                                    : 'border-slate-200 dark:border-slate-700'
                                                            }`}
                                                            required
                                                        >
                                                            <option value="">
                                                                Select gender
                                                            </option>
                                                            <option value="male">
                                                                Male
                                                            </option>
                                                            <option value="female">
                                                                Female
                                                            </option>
                                                            <option value="other">
                                                                Other
                                                            </option>
                                                        </select>
                                                        {errors.gender && (
                                                            <p className="mt-1 text-xs text-red-500">
                                                                {errors.gender}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Date of Birth *
                                                        </label>
                                                        <div className="relative">
                                                            <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="date"
                                                                name="date_of_birth"
                                                                value={
                                                                    data.date_of_birth
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                className={`w-full rounded-lg border bg-white py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-900 ${
                                                                    errors.date_of_birth
                                                                        ? 'border-red-500'
                                                                        : 'border-slate-200 dark:border-slate-700'
                                                                }`}
                                                                required
                                                            />
                                                        </div>
                                                        {errors.date_of_birth && (
                                                            <p className="mt-1 text-xs text-red-500">
                                                                {
                                                                    errors.date_of_birth
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Blood Group
                                                        </label>
                                                        <select
                                                            name="blood_group"
                                                            value={
                                                                data.blood_group
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                        >
                                                            <option value="">
                                                                Select blood
                                                                group
                                                            </option>
                                                            {bloodGroups.map(
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
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Contacts Tab */}
                                        {activeTab === 'contacts' && (
                                            <div className="space-y-6 px-6 py-4">
                                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                                                    <Phone className="h-5 w-5 text-blue-600" />
                                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                        Contact Information
                                                    </h2>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                Phone Number
                                                            </label>
                                                            <div className="relative">
                                                                <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    type="tel"
                                                                    name="phone"
                                                                    value={
                                                                        data.phone
                                                                    }
                                                                    onChange={
                                                                        handleInputChange
                                                                    }
                                                                    className={`w-full rounded-lg border bg-white py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-900 ${
                                                                        errors.phone
                                                                            ? 'border-red-500'
                                                                            : 'border-slate-200 dark:border-slate-700'
                                                                    }`}
                                                                    placeholder="+260 97 1234567"
                                                                />
                                                            </div>
                                                            {errors.phone && (
                                                                <p className="mt-1 text-xs text-red-500">
                                                                    {
                                                                        errors.phone
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                Email Address
                                                            </label>
                                                            <div className="relative">
                                                                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    type="email"
                                                                    name="email"
                                                                    value={
                                                                        data.email
                                                                    }
                                                                    onChange={
                                                                        handleInputChange
                                                                    }
                                                                    className={`w-full rounded-lg border bg-white py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-900 ${
                                                                        errors.email
                                                                            ? 'border-red-500'
                                                                            : 'border-slate-200 dark:border-slate-700'
                                                                    }`}
                                                                    placeholder="patient@example.com"
                                                                />
                                                            </div>
                                                            {errors.email && (
                                                                <p className="mt-1 text-xs text-red-500">
                                                                    {
                                                                        errors.email
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Physical Address
                                                        </label>
                                                        <div className="relative">
                                                            <MapPin className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                                                            <textarea
                                                                name="address"
                                                                value={
                                                                    data.address
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                rows={4}
                                                                className={`w-full rounded-lg border bg-white py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-900 ${
                                                                    errors.address
                                                                        ? 'border-red-500'
                                                                        : 'border-slate-200 dark:border-slate-700'
                                                                }`}
                                                                placeholder="Enter full residential address"
                                                            />
                                                        </div>
                                                        {errors.address && (
                                                            <p className="mt-1 text-xs text-red-500">
                                                                {errors.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Demographic Tab */}
                                        {activeTab === 'demographic' && (
                                            <div className="space-y-6 px-6 py-4">
                                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                                                    <Users className="h-5 w-5 text-blue-600" />
                                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                        Demographic Information
                                                    </h2>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Marital Status
                                                        </label>
                                                        <select
                                                            name="marital_status"
                                                            value={
                                                                data.marital_status
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
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
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Occupation
                                                        </label>
                                                        <div className="relative">
                                                            <Briefcase className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                name="occupation"
                                                                value={
                                                                    data.occupation
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                                placeholder="e.g., Teacher"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Nationality
                                                        </label>
                                                        <div className="relative">
                                                            <Globe className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                name="nationality"
                                                                value={
                                                                    data.nationality
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Identification Tab */}
                                        {activeTab === 'identification' && (
                                            <div className="space-y-6 px-6 py-4">
                                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                                                    <IdCard className="h-5 w-5 text-blue-600" />
                                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                        Identification Documents
                                                    </h2>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            ID Type
                                                        </label>
                                                        <select
                                                            name="id_type"
                                                            value={data.id_type}
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                        >
                                                            <option value="">
                                                                Select ID type
                                                            </option>
                                                            {idTypes.map(
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
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            ID Number
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="id_number"
                                                            value={
                                                                data.id_number
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                            placeholder="Enter ID number"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Profile Photo Tab */}
                                        {activeTab === 'photo' && (
                                            <div className="space-y-6 px-6 py-4">
                                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                                                    <Camera className="h-5 w-5 text-blue-600" />
                                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                        Profile Photo
                                                    </h2>
                                                </div>

                                                <div className="flex flex-col items-center gap-6 md:flex-row">
                                                    <div className="flex-shrink-0">
                                                        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
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
                                                                    {data.first_name &&
                                                                    data.last_name ? (
                                                                        <span className="text-4xl font-bold text-slate-400">
                                                                            {
                                                                                data
                                                                                    .first_name[0]
                                                                            }
                                                                            {
                                                                                data
                                                                                    .last_name[0]
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <User className="h-12 w-12 text-slate-400" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 space-y-4">
                                                        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                                                            <Upload className="mx-auto h-10 w-10 text-slate-400" />
                                                            <div className="mt-2 flex justify-center text-sm leading-6 text-slate-600 dark:text-slate-400">
                                                                <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 focus-within:outline-none hover:text-blue-500">
                                                                    <span>
                                                                        Upload a
                                                                        photo
                                                                    </span>
                                                                    <input
                                                                        type="file"
                                                                        className="sr-only"
                                                                        onChange={
                                                                            handleFileChange
                                                                        }
                                                                        accept="image/*"
                                                                        name="profile_photo"
                                                                    />
                                                                </label>
                                                                <span className="pl-1">
                                                                    or drag and
                                                                    drop
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-400">
                                                                PNG, JPG, GIF up
                                                                to 2MB
                                                            </p>
                                                        </div>

                                                        {imagePreview && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setData(
                                                                        'profile_photo',
                                                                        null as any,
                                                                    );
                                                                    setImagePreview(
                                                                        null,
                                                                    );
                                                                }}
                                                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                                                            >
                                                                Remove photo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Insurance Tab */}
                                        {activeTab === 'insurance' && (
                                            <div className="space-y-6 px-6 py-4">
                                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                        Insurance Information
                                                    </h2>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Insurance Provider
                                                        </label>

                                                        <select
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                        >
                                                            <optgroup label="Insurance Providers">
                                                                <option value="">
                                                                    Select
                                                                    Provider
                                                                </option>

                                                                {insuranceProviders.map(
                                                                    (item) => (
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
                                                            </optgroup>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Insurance Number
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="insurance_number"
                                                            value={
                                                                data.insurance_number
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                            placeholder="Policy number"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Insurance Expiry
                                                        </label>
                                                        <div className="relative">
                                                            <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="date"
                                                                name="insurance_expiry"
                                                                value={
                                                                    data.insurance_expiry
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Insurance Status
                                                        </label>
                                                        <select
                                                            name="insurance_status"
                                                            value={
                                                                data.insurance_status
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
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
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation Buttons */}
                                    <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentIndex =
                                                    tabs.findIndex(
                                                        (t) =>
                                                            t.id === activeTab,
                                                    );
                                                if (currentIndex > 0) {
                                                    setActiveTab(
                                                        tabs[currentIndex - 1]
                                                            .id,
                                                    );
                                                }
                                            }}
                                            disabled={activeTab === tabs[0].id}
                                            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </button>

                                        <div className="flex gap-3 px-6 py-4">
                                            {activeTab !==
                                            tabs[tabs.length - 1].id ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentIndex =
                                                            tabs.findIndex(
                                                                (t) =>
                                                                    t.id ===
                                                                    activeTab,
                                                            );
                                                        if (
                                                            currentIndex <
                                                            tabs.length - 1
                                                        ) {
                                                            setActiveTab(
                                                                tabs[
                                                                    currentIndex +
                                                                        1
                                                                ].id,
                                                            );
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    type="submit"
                                                    disabled={processing}
                                                    className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {processing ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-4 w-4" />
                                                            Register Patient
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {showPreview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Patient Information Preview
                                </h3>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <h4 className="mb-2 font-medium text-slate-900 dark:text-white">
                                            Personal Information
                                        </h4>
                                        <dl className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Name:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.first_name}{' '}
                                                    {data.last_name}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Gender:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.gender}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    DOB:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.date_of_birth}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Blood Group:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.blood_group ||
                                                        'Not specified'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div>
                                        <h4 className="mb-2 font-medium text-slate-900 dark:text-white">
                                            Contact Information
                                        </h4>
                                        <dl className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Phone:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.phone ||
                                                        'Not provided'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Email:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.email ||
                                                        'Not provided'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Address:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.address ||
                                                        'Not provided'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div>
                                        <h4 className="mb-2 font-medium text-slate-900 dark:text-white">
                                            Insurance
                                        </h4>
                                        <dl className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Provider:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.insurance_provider ||
                                                        'Not provided'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Number:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.insurance_number ||
                                                        'Not provided'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">
                                                    Expiry:
                                                </dt>
                                                <dd className="text-slate-900 dark:text-white">
                                                    {data.insurance_expiry ||
                                                        'Not provided'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        Close Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
