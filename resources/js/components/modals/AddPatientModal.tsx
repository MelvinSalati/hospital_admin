// resources/js/components/modals/AddPatientModal.tsx
import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Notiflix from 'notiflix'
interface PatientFormData {
    // Personal Information
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: 'male' | 'female' | 'other';
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
    
    // Personal Details
    marital_status: 'single' | 'married' | 'divorced' | 'widowed' | '';
    occupation: string;
    nationality: string;
    id_type: 'national_id' | 'passport' | 'driving_license' | '';
    id_number: string;
    
    // Insurance Information
    insurance_provider: string;
    insurance_number: string;
    insurance_expiry: string;
    insurance_status: 'active' | 'expired' | 'pending' | '';
    
    // Next of Kin
    next_of_kin_name: string;
    next_of_kin_relationship: string;
    next_of_kin_phone: string;
    
    // Status
    status: 'active' | 'inactive';
}

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (patient: any) => void;
}

const initialFormData: PatientFormData = {
    patient_number: '',
    first_name: '',
    last_name: '',
    gender: 'male',
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
    nationality: 'Rwandan',
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
};

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const idTypes = [
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'driving_license', label: 'Driving License' },
];
const maritalStatuses = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
];

export default function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [generatingNumber, setGeneratingNumber] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const [formData, setFormData] = useState<PatientFormData>(initialFormData);

    // Generate patient number on mount
    useEffect(() => {
        if (isOpen && !formData.patient_number) {
            generatePatientNumber();
        }
    }, [isOpen]);

    const generatePatientNumber = async () => {
        setGeneratingNumber(true);
        try {
            const response = await axios.get('/api/patients/generate-number');
            setFormData(prev => ({ ...prev, patient_number: response.data.patient_number }));
        } catch (error) {
            console.error('Failed to generate patient number:', error);
            toast.error('Failed to generate patient number');
        } finally {
            setGeneratingNumber(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        try {
            const response = await axios.post('/patients', formData);
            
            if(response.data){
                Notiflix.Notify.success('Patient registered successfully!')
            }
        } catch (error: any) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors || {});
                toast.error('Please check the form for errors');
            } else {
                toast.error(error.response?.data?.message || 'Failed to add patient');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const tabs = [
        { id: 0, name: 'Personal Info', icon: '👤', description: 'Basic personal information' },
        { id: 1, name: 'Medical History', icon: '📋', description: 'Medical records and conditions' },
        { id: 2, name: 'Insurance & ID', icon: '🪪', description: 'Insurance and identification details' },
        { id: 3, name: 'Emergency Contact', icon: '🚨', description: 'Emergency contact information' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Header with Gradient */}
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-2xl">➕</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">Add New Patient</h3>
                                    <p className="text-sm text-white/80">Enter patient information below to register</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Tabs with Icons and Descriptions */}
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4">
                        <nav className="flex space-x-4" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        py-3 px-4 font-medium text-sm border-b-2 transition-all relative
                                        ${activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{tab.icon}</span>
                                        <div className="text-left">
                                            <div>{tab.name}</div>
                                            <div className="text-xs font-normal text-gray-400 hidden md:block">
                                                {tab.description}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
                            {/* Patient Number Banner */}
                            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <span className="text-blue-600 dark:text-blue-400 text-xl">🔢</span>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Patient Number
                                            </label>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Unique identifier for the patient
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            name="patient_number"
                                            value={formData.patient_number}
                                            readOnly
                                            className="w-48 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={generatePatientNumber}
                                            disabled={generatingNumber}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                        >
                                            {generatingNumber ? (
                                                <>
                                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <span>🔄</span>
                                                    Regenerate
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tab 1: Personal Information */}
                            {activeTab === 0 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* First Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                First Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="first_name"
                                                value={formData.first_name}
                                                onChange={handleInputChange}
                                                className={`w-full rounded-lg border ${errors.first_name ? 'border-red-500' : 'border-gray-300'} px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors`}
                                                placeholder="Enter first name"
                                                required
                                            />
                                            {errors.first_name && (
                                                <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                                            )}
                                        </div>

                                        {/* Last Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Last Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleInputChange}
                                                className={`w-full rounded-lg border ${errors.last_name ? 'border-red-500' : 'border-gray-300'} px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors`}
                                                placeholder="Enter last name"
                                                required
                                            />
                                            {errors.last_name && (
                                                <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                                            )}
                                        </div>

                                        {/* Gender */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Gender <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleInputChange}
                                                className={`w-full rounded-lg border ${errors.gender ? 'border-red-500' : 'border-gray-300'} px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors`}
                                                required
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                            {errors.gender && (
                                                <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                                            )}
                                        </div>

                                        {/* Date of Birth */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Date of Birth <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                name="date_of_birth"
                                                value={formData.date_of_birth}
                                                onChange={handleInputChange}
                                                className={`w-full rounded-lg border ${errors.date_of_birth ? 'border-red-500' : 'border-gray-300'} px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors`}
                                                required
                                            />
                                            {errors.date_of_birth && (
                                                <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>
                                            )}
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                className={`w-full rounded-lg border ${errors.phone ? 'border-red-500' : 'border-gray-300'} px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors`}
                                                placeholder="+250 788 123 456"
                                            />
                                            {errors.phone && (
                                                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className={`w-full rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'} px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors`}
                                                placeholder="patient@example.com"
                                            />
                                            {errors.email && (
                                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Address
                                        </label>
                                        <textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className={`w-full rounded-lg border ${errors.address ? 'border-red-500' : 'border-gray-300'} px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors`}
                                            placeholder="Street, City, District"
                                        />
                                        {errors.address && (
                                            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                                        )}
                                    </div>

                                    {/* Personal Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Marital Status
                                            </label>
                                            <select
                                                name="marital_status"
                                                value={formData.marital_status}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                            >
                                                <option value="">Select Status</option>
                                                {maritalStatuses.map(status => (
                                                    <option key={status.value} value={status.value}>
                                                        {status.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Occupation
                                            </label>
                                            <input
                                                type="text"
                                                name="occupation"
                                                value={formData.occupation}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                placeholder="e.g., Teacher, Engineer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Medical History */}
                            {activeTab === 1 && (
                                <div className="space-y-6">
                                    {/* Blood Group */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Blood Group
                                        </label>
                                        <select
                                            name="blood_group"
                                            value={formData.blood_group}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                        >
                                            <option value="">Select Blood Group</option>
                                            {bloodGroups.map(group => (
                                                <option key={group} value={group}>{group}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Allergies */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Allergies
                                        </label>
                                        <textarea
                                            name="allergies"
                                            value={formData.allergies}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                            placeholder="List any allergies (e.g., Penicillin, Latex, Peanuts)"
                                        />
                                    </div>

                                    {/* Chronic Conditions */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Chronic Conditions
                                        </label>
                                        <textarea
                                            name="chronic_conditions"
                                            value={formData.chronic_conditions}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                            placeholder="e.g., Diabetes, Hypertension, Asthma"
                                        />
                                    </div>

                                    {/* Current Medications */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Current Medications
                                        </label>
                                        <textarea
                                            name="current_medications"
                                            value={formData.current_medications}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                            placeholder="List current medications with dosage"
                                        />
                                    </div>

                                    {/* Medical History */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Medical History
                                        </label>
                                        <textarea
                                            name="medical_history"
                                            value={formData.medical_history}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                            placeholder="Past illnesses, surgeries, hospitalizations"
                                        />
                                    </div>

                                    {/* Surgical History */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Surgical History
                                        </label>
                                        <textarea
                                            name="surgical_history"
                                            value={formData.surgical_history}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                            placeholder="Previous surgeries and dates"
                                        />
                                    </div>

                                    {/* Family History */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Family History
                                        </label>
                                        <textarea
                                            name="family_history"
                                            value={formData.family_history}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                            placeholder="Family medical history"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Insurance & ID */}
                            {activeTab === 2 && (
                                <div className="space-y-6">
                                    {/* ID Information */}
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-5 border border-purple-100 dark:border-purple-800">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="text-xl">🪪</span>
                                            Identification Documents
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    ID Type
                                                </label>
                                                <select
                                                    name="id_type"
                                                    value={formData.id_type}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                >
                                                    <option value="">Select ID Type</option>
                                                    {idTypes.map(type => (
                                                        <option key={type.value} value={type.value}>
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    ID Number
                                                </label>
                                                <input
                                                    type="text"
                                                    name="id_number"
                                                    value={formData.id_number}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                    placeholder="Enter ID number"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insurance Information */}
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-100 dark:border-green-800">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="text-xl">🏥</span>
                                            Insurance Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Insurance Provider
                                                </label>
                                                <input
                                                    type="text"
                                                    name="insurance_provider"
                                                    value={formData.insurance_provider}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                    placeholder="e.g., RSSB, SANOFI"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Insurance Number
                                                </label>
                                                <input
                                                    type="text"
                                                    name="insurance_number"
                                                    value={formData.insurance_number}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Expiry Date
                                                </label>
                                                <input
                                                    type="date"
                                                    name="insurance_expiry"
                                                    value={formData.insurance_expiry}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Status
                                                </label>
                                                <select
                                                    name="insurance_status"
                                                    value={formData.insurance_status}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                >
                                                    <option value="">Select Status</option>
                                                    <option value="active">Active</option>
                                                    <option value="expired">Expired</option>
                                                    <option value="pending">Pending</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nationality */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Nationality
                                        </label>
                                        <input
                                            type="text"
                                            name="nationality"
                                            value={formData.nationality}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Emergency Contact */}
                            {activeTab === 3 && (
                                <div className="space-y-6">
                                    {/* Emergency Contact */}
                                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-5 border border-red-100 dark:border-red-800">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="text-xl">🚨</span>
                                            Emergency Contact Information
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Contact Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="emergency_contact"
                                                    value={formData.emergency_contact}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                    placeholder="Full name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Emergency Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="emergency_phone"
                                                    value={formData.emergency_phone}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                    placeholder="+250 788 123 456"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Next of Kin */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="text-xl">👥</span>
                                            Next of Kin
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="next_of_kin_name"
                                                    value={formData.next_of_kin_name}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                    placeholder="Full name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Relationship
                                                </label>
                                                <input
                                                    type="text"
                                                    name="next_of_kin_relationship"
                                                    value={formData.next_of_kin_relationship}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                    placeholder="e.g., Spouse, Parent, Sibling"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="next_of_kin_phone"
                                                    value={formData.next_of_kin_phone}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                                    placeholder="+250 788 123 456"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Patient Status
                                        </label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                        <span className="text-red-500">*</span> Required fields
                                    </span>
                                    {Object.keys(errors).length > 0 && (
                                        <span className="text-sm text-red-500">
                                            Please fix the errors above
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg hover:from-blue-700 hover:to-teal-600 disabled:opacity-50 transition-all flex items-center gap-2 font-medium shadow-lg shadow-blue-500/25"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <span>💾</span>
                                                Save Patient
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}