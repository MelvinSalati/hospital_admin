// pages/reception/create.tsx
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Http from '@/utils/Http';
import Notiflix from 'notiflix'
import {
    User,
    Phone,
    Mail,
    MapPin,
    Heart,
    AlertCircle,
    Calendar,
    Users,
    Briefcase,
    CreditCard,
    FileText,
    Upload,
    Save,
    X,
    ChevronRight,
    ChevronLeft,
    IdCard,
    Activity,
    Pill,
    Scissors,
    Users2,
    Globe,
    Stethoscope,
    Eye,
    Fingerprint,
    Scan,
    Shield,
    CheckCircle2,
    AlertTriangle,
    Camera,
    Loader2
} from 'lucide-react';

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

    // Biometrics
    fingerprint_right_thumb: string | null;
    fingerprint_right_index: string | null;
    fingerprint_right_middle: string | null;
    fingerprint_right_ring: string | null;
    fingerprint_right_little: string | null;
    fingerprint_left_thumb: string | null;
    fingerprint_left_index: string | null;
    fingerprint_left_middle: string | null;
    fingerprint_left_ring: string | null;
    fingerprint_left_little: string | null;
}

export default function Create() {
    const { auth } = usePage().props as any;
    const [activeTab, setActiveTab] = useState('personal');
    const [showPreview, setShowPreview] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Biometrics state
    const [selectedFinger, setSelectedFinger] = useState<string | null>(null);
    const [registeredFingers, setRegisteredFingers] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // Use Inertia's useForm hook
    const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm<FormData>({
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

        // Biometrics
        fingerprint_right_thumb: null,
        fingerprint_right_index: null,
        fingerprint_right_middle: null,
        fingerprint_right_ring: null,
        fingerprint_right_little: null,
        fingerprint_left_thumb: null,
        fingerprint_left_index: null,
        fingerprint_left_middle: null,
        fingerprint_left_ring: null,
        fingerprint_left_little: null,
    });

    // FIX: handleSubmit is now properly closed and uses async/await
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await Http.post(`register/patients/${auth.user.id}`, data);
            if (response.data.status === 200) {
                Notiflix.Notify.success('Patient registration successful!');
                reset();
            } else {
                Notiflix.Notify.failure(response.data.message);
            }
        } catch (error: any) {
            Notiflix.Notify.failure(error?.message ?? 'An unexpected error occurred.');
        }
    }; // FIX: closing brace was missing, causing all functions below to be nested inside handleSubmit

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            setRegisteredFingers(prev => [...prev, finger]);
            setIsScanning(false);
            setSelectedFinger(null);
        }, 2000);
    };

    const removeFingerprint = (finger: string) => {
        const fingerKey = `fingerprint_${finger}` as keyof FormData;
        setData(fingerKey, null as any);
        setRegisteredFingers(prev => prev.filter(f => f !== finger));
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reception', href: '/reception' },
        { title: 'Register Patient' }
    ];

    const tabs = [
        { id: 'personal', label: 'Personal Info', icon: User },
        { id: 'contacts', label: 'Contacts', icon: Phone },
        { id: 'medical', label: 'Medical History', icon: Heart },
        { id: 'demographic', label: 'Demographics', icon: Users },
        { id: 'identification', label: 'Identity', icon: IdCard },
        { id: 'photo', label: 'Profile Photo', icon: Camera },
    ];

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    const idTypes = [
        { value: 'national_id', label: 'National ID' },
        { value: 'passport', label: 'Passport' },
        { value: 'driving_license', label: 'Driving License' },
        { value: 'voter_id', label: 'Voter ID' },
    ];

    const fingers = [
        { id: 'right_thumb', label: 'Right Thumb', hand: 'right' },
        { id: 'right_index', label: 'Right Index', hand: 'right' },
        { id: 'right_middle', label: 'Right Middle', hand: 'right' },
        { id: 'right_ring', label: 'Right Ring', hand: 'right' },
        { id: 'right_little', label: 'Right Little', hand: 'right' },
        { id: 'left_thumb', label: 'Left Thumb', hand: 'left' },
        { id: 'left_index', label: 'Left Index', hand: 'left' },
        { id: 'left_middle', label: 'Left Middle', hand: 'left' },
        { id: 'left_ring', label: 'Left Ring', hand: 'left' },
        { id: 'left_little', label: 'Left Little', hand: 'left' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Patient Registration" />

            <div className="min-h-screen bg-gray-100 p-4 font-poppins dark:bg-gray-900 md:p-6">
                {/* Header */}
                <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
                            Patient Registration
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Register a new patient in the system
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Eye className="h-4 w-4" />
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Display errors if any */}
                {Object.keys(errors).length > 0 && (
                    <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <h3 className="font-medium">Please fix the following errors:</h3>
                        <ul className="mt-2 list-inside list-disc text-sm">
                            {Object.entries(errors).map(([key, value], index) => (
                                <li key={index}>{key}: {value as string}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Success message */}
                {recentlySuccessful && (
                    <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Patient registered successfully! Redirecting...
                    </div>
                )}

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
                    {/* Tabs Navigation */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex min-w-max gap-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Form Sections */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        {/* Personal Information Tab */}
                        {activeTab === 'personal' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Personal Information
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Patient Number
                                        </label>
                                        <div className="relative">
                                            <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="patient_number"
                                                placeholder="Auto-generated"
                                                value={data.patient_number}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-500 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                                                readOnly
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Auto-generated on save</p>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            First Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={data.first_name}
                                            onChange={handleInputChange}
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 ${
                                                errors.first_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                            required
                                        />
                                        {errors.first_name && (
                                            <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Last Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={data.last_name}
                                            onChange={handleInputChange}
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 ${
                                                errors.last_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                            required
                                        />
                                        {errors.last_name && (
                                            <p className="mt-1 text-xs text-red-500">{errors.last_name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Gender *
                                        </label>
                                        <select
                                            name="gender"
                                            value={data.gender}
                                            onChange={handleInputChange}
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 ${
                                                errors.gender ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                            required
                                        >
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                        {errors.gender && (
                                            <p className="mt-1 text-xs text-red-500">{errors.gender}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Date of Birth *
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="date"
                                                name="date_of_birth"
                                                value={data.date_of_birth}
                                                onChange={handleInputChange}
                                                className={`w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 ${
                                                    errors.date_of_birth ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                                required
                                            />
                                        </div>
                                        {errors.date_of_birth && (
                                            <p className="mt-1 text-xs text-red-500">{errors.date_of_birth}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Blood Group
                                        </label>
                                        <select
                                            name="blood_group"
                                            value={data.blood_group}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                        >
                                            <option value="">Select blood group</option>
                                            {bloodGroups.map((bg) => (
                                                <option key={bg} value={bg}>{bg}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contacts Tab */}
                        {activeTab === 'contacts' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <Phone className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Contact Information
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={data.phone}
                                                    onChange={handleInputChange}
                                                    className={`w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 ${
                                                        errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                    placeholder="+260 97 1234567"
                                                />
                                            </div>
                                            {errors.phone && (
                                                <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={data.email}
                                                    onChange={handleInputChange}
                                                    className={`w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 ${
                                                        errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                    placeholder="patient@example.com"
                                                />
                                            </div>
                                            {errors.email && (
                                                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Physical Address
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <textarea
                                                    name="address"
                                                    value={data.address}
                                                    onChange={handleInputChange}
                                                    rows={3}
                                                    className={`w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-900 ${
                                                        errors.address ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                    placeholder="Enter full residential address"
                                                />
                                            </div>
                                            {errors.address && (
                                                <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Medical History Tab */}
                        {activeTab === 'medical' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <Heart className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Medical History
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Allergies
                                        </label>
                                        <div className="relative">
                                            <AlertCircle className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea
                                                name="allergies"
                                                value={data.allergies}
                                                onChange={handleInputChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                placeholder="List any allergies (e.g., Penicillin, Peanuts, Latex)"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Chronic Conditions
                                        </label>
                                        <div className="relative">
                                            <Activity className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea
                                                name="chronic_conditions"
                                                value={data.chronic_conditions}
                                                onChange={handleInputChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                placeholder="e.g., Diabetes, Hypertension, Asthma"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Current Medications
                                        </label>
                                        <div className="relative">
                                            <Pill className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea
                                                name="current_medications"
                                                value={data.current_medications}
                                                onChange={handleInputChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                placeholder="List current medications with dosage"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Medical History
                                        </label>
                                        <div className="relative">
                                            <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea
                                                name="medical_history"
                                                value={data.medical_history}
                                                onChange={handleInputChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                placeholder="Past illnesses, hospitalizations"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Surgical History
                                        </label>
                                        <div className="relative">
                                            <Scissors className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea
                                                name="surgical_history"
                                                value={data.surgical_history}
                                                onChange={handleInputChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                placeholder="Previous surgeries with dates"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Family History
                                        </label>
                                        <div className="relative">
                                            <Users2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea
                                                name="family_history"
                                                value={data.family_history}
                                                onChange={handleInputChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                placeholder="Family medical history"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Demographic Tab */}
                        {activeTab === 'demographic' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Demographic Information
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Marital Status
                                        </label>
                                        <select
                                            name="marital_status"
                                            value={data.marital_status}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                        >
                                            <option value="">Select status</option>
                                            <option value="single">Single</option>
                                            <option value="married">Married</option>
                                            <option value="divorced">Divorced</option>
                                            <option value="widowed">Widowed</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Occupation
                                        </label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="occupation"
                                                value={data.occupation}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                placeholder="e.g., Teacher, Engineer"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Nationality
                                        </label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="nationality"
                                                value={data.nationality}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Identification Tab */}
                        {activeTab === 'identification' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <IdCard className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Identification Documents
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            ID Type
                                        </label>
                                        <select
                                            name="id_type"
                                            value={data.id_type}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                        >
                                            <option value="">Select ID type</option>
                                            {idTypes.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            ID Number
                                        </label>
                                        <input
                                            type="text"
                                            name="id_number"
                                            value={data.id_number}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                            placeholder="Enter ID number"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Insurance Tab */}
                        {activeTab === 'insurance' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Insurance Information
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Insurance Provider
                                        </label>
                                        <input
                                            type="text"
                                            name="insurance_provider"
                                            value={data.insurance_provider}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                            placeholder="e.g., NHIMA, Madison"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Insurance Number
                                        </label>
                                        <input
                                            type="text"
                                            name="insurance_number"
                                            value={data.insurance_number}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                            placeholder="Policy number"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Insurance Expiry
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="date"
                                                name="insurance_expiry"
                                                value={data.insurance_expiry}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Insurance Status
                                        </label>
                                        <select
                                            name="insurance_status"
                                            value={data.insurance_status}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                        >
                                            <option value="">Select status</option>
                                            <option value="active">Active</option>
                                            <option value="expired">Expired</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Emergency & Next of Kin Tab */}
                        {activeTab === 'emergency' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <AlertCircle className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Emergency Contact & Next of Kin
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Emergency Contact
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                                                    Contact Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="emergency_contact"
                                                    value={data.emergency_contact}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                    placeholder="Emergency contact name"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                                                    Emergency Phone
                                                </label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        name="emergency_phone"
                                                        value={data.emergency_phone}
                                                        onChange={handleInputChange}
                                                        className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                        placeholder="Emergency phone number"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Next of Kin
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                                                    Full Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="next_of_kin_name"
                                                    value={data.next_of_kin_name}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                    placeholder="Next of kin name"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                                                    Relationship
                                                </label>
                                                <input
                                                    type="text"
                                                    name="next_of_kin_relationship"
                                                    value={data.next_of_kin_relationship}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                    placeholder="e.g., Spouse, Parent, Sibling"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                                                    Phone Number
                                                </label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        name="next_of_kin_phone"
                                                        value={data.next_of_kin_phone}
                                                        onChange={handleInputChange}
                                                        className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                                        placeholder="Next of kin phone"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Status */}
                                <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Patient Status
                                    </label>
                                    <select
                                        name="status"
                                        value={data.status}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 md:w-64"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="deceased">Deceased</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Biometrics Tab */}
                        {activeTab === 'biometrics' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <Fingerprint className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Fingerprint Registration
                                    </h2>
                                </div>

                                {/* Scanner Status */}
                                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                                    <div className="flex items-center gap-3">
                                        <Scan className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <h3 className="font-medium text-blue-800 dark:text-blue-300">Fingerprint Scanner Ready</h3>
                                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                                {isScanning ? 'Scanning...' : 'Place finger on scanner to register'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Fingerprint Grid */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Right Hand */}
                                    <div>
                                        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Right Hand</h3>
                                        <div className="space-y-2">
                                            {fingers.filter(f => f.hand === 'right').map((finger) => {
                                                const isRegistered = registeredFingers.includes(finger.id);
                                                const isScanningThis = isScanning && selectedFinger === finger.id;

                                                return (
                                                    <div
                                                        key={finger.id}
                                                        className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                                                            isRegistered
                                                                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                                                                : 'border-gray-200 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Fingerprint className={`h-5 w-5 ${
                                                                isRegistered
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : 'text-gray-400'
                                                            }`} />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                {finger.label}
                                                            </span>
                                                        </div>

                                                        {isRegistered ? (
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeFingerprint(finger.id)}
                                                                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleFingerprintScan(finger.id)}
                                                                disabled={isScanning}
                                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {isScanningThis ? 'Scanning...' : 'Scan'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Left Hand */}
                                    <div>
                                        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Left Hand</h3>
                                        <div className="space-y-2">
                                            {fingers.filter(f => f.hand === 'left').map((finger) => {
                                                const isRegistered = registeredFingers.includes(finger.id);
                                                const isScanningThis = isScanning && selectedFinger === finger.id;

                                                return (
                                                    <div
                                                        key={finger.id}
                                                        className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                                                            isRegistered
                                                                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                                                                : 'border-gray-200 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Fingerprint className={`h-5 w-5 ${
                                                                isRegistered
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : 'text-gray-400'
                                                            }`} />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                {finger.label}
                                                            </span>
                                                        </div>

                                                        {isRegistered ? (
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeFingerprint(finger.id)}
                                                                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleFingerprintScan(finger.id)}
                                                                disabled={isScanning}
                                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {isScanningThis ? 'Scanning...' : 'Scan'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Registration Progress</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {registeredFingers.length}/10 fingers
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div
                                            className="h-2 rounded-full bg-green-600 transition-all"
                                            style={{ width: `${(registeredFingers.length / 10) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="mt-4 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
                                    <div className="flex items-start gap-3">
                                        <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        <div>
                                            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                                Biometric Security Information
                                            </h4>
                                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                                Fingerprint data is encrypted and stored securely. It will be used for patient identification during future visits. At least 2 fingerprints are recommended for reliable identification.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Minimum Requirement Warning */}
                                {registeredFingers.length < 2 && (
                                    <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Minimum 2 fingerprints recommended for reliable identification</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Profile Photo Tab */}
                        {activeTab === 'photo' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
                                    <Camera className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Profile Photo
                                    </h2>
                                </div>

                                <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
                                    {/* Photo Preview */}
                                    <div className="flex flex-col items-center">
                                        <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview}
                                                    alt="Profile preview"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    {data.first_name && data.last_name ? (
                                                        <span className="text-6xl font-bold text-gray-400">
                                                            {data.first_name[0]}{data.last_name[0]}
                                                        </span>
                                                    ) : (
                                                        <User className="h-16 w-16 text-gray-400" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">
                                            {imagePreview ? 'New photo selected' : 'No photo uploaded'}
                                        </p>
                                    </div>

                                    {/* Upload Controls */}
                                    <div className="flex-1 space-y-4">
                                        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                                                <label className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500 dark:bg-gray-800">
                                                    <span>Upload a photo</span>
                                                    <input
                                                        type="file"
                                                        className="sr-only"
                                                        onChange={handleFileChange}
                                                        accept="image/*"
                                                        name="profile_photo"
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                PNG, JPG, GIF up to 2MB
                                            </p>
                                        </div>

                                        {/* Photo Guidelines */}
                                        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                                            <h4 className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                                                Photo Guidelines
                                            </h4>
                                            <ul className="list-inside list-disc space-y-1 text-xs text-blue-700 dark:text-blue-400">
                                                <li>Use a clear, front-facing photo</li>
                                                <li>Ensure good lighting and neutral background</li>
                                                <li>Photo should be recent (within last 6 months)</li>
                                                <li>Accepted formats: JPG, PNG, GIF</li>
                                                <li>Maximum file size: 2MB</li>
                                            </ul>
                                        </div>

                                        {imagePreview && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setData('profile_photo', null as any);
                                                    setImagePreview(null);
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

                        {/* Navigation Buttons */}
                        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => {
                                    const currentIndex = tabs.findIndex(t => t.id === activeTab);
                                    if (currentIndex > 0) {
                                        setActiveTab(tabs[currentIndex - 1].id);
                                    }
                                }}
                                disabled={activeTab === tabs[0].id}
                                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </button>

                            <div className="flex gap-2">
                                {activeTab !== tabs[tabs.length - 1].id ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const currentIndex = tabs.findIndex(t => t.id === activeTab);
                                            if (currentIndex < tabs.length - 1) {
                                                setActiveTab(tabs[currentIndex + 1].id);
                                            }
                                        }}
                                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    </div>
                </form>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Patient Information Preview
                            </h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Preview content */}
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Personal Information</h4>
                                    <dl className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Name:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.first_name} {data.last_name}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Gender:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.gender}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">DOB:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.date_of_birth}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Blood Group:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.blood_group || 'Not specified'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Contact Information</h4>
                                    <dl className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Phone:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.phone || 'Not provided'}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Email:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.email || 'Not provided'}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Address:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.address || 'Not provided'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Biometrics</h4>
                                    <dl className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Registered Fingers:</dt>
                                            <dd className="text-gray-900 dark:text-white">{registeredFingers.length} / 10</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Insurance</h4>
                                    <dl className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Provider:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.insurance_provider || 'Not provided'}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Number:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.insurance_number || 'Not provided'}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Expiry:</dt>
                                            <dd className="text-gray-900 dark:text-white">{data.insurance_expiry || 'Not provided'}</dd>
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
        </AppLayout>
    );
}