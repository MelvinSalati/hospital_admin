// pages/Register.tsx

import { useForm, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    User,
    Phone,
    Shield,
    Save,
    Users,
    Loader2,
    X,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';

// Import Tab Components
import routes from '@/constants/routes';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import ContactTab from './components/tabs/ContactTab';
import DemographicsTab from './components/tabs/DemographicsTab';
import DepartmentsTab from './components/tabs/DepartmentsTab';
import RolesTab from './components/tabs/RolesTab';

interface RegisterFormData {
    first_name: string;
    surname: string;
    date_of_birth: string;
    gender: string;
    address: string;
    mobile_phone_number: string;
    email: string;
    profession_id: string;
    certificates: File[];
    diplomas: File[];
    degrees: File[];
    roles: string[];
    license_number: string;
    license_expiry_date: string;
    license_document: File | null;
    department_id: number | string;
}

interface DepartmentsTabProps {
    data: RegisterFormData;
    setData: (key: keyof RegisterFormData, value: any) => void;
    errors?: Record<string, string>;
    required?: boolean;
}

const tabs = [
    { id: 'demographics', label: 'Demographics', icon: User, step: 1 },
    { id: 'contact', label: 'Contact Info', icon: Phone, step: 2 },
    { id: 'roles', label: 'Roles & Access', icon: Shield, step: 3 },
    { id: 'departments', label: 'Departments', icon: Users, step: 4 },
];

const defaultFormValues: RegisterFormData = {
    first_name: '',
    surname: '',
    date_of_birth: '',
    gender: '',
    address: '',
    mobile_phone_number: '',
    email: '',
    profession_id: '',
    certificates: [],
    diplomas: [],
    degrees: [],
    roles: [],
    license_number: '',
    license_expiry_date: '',
    license_document: null,
    department_id: '',
};

// ============================================
// ERROR HANDLING HELPERS
// ============================================

/**
 * Extract validation errors from various formats
 * Supports Laravel MessageBag and standard error objects
 */
const extractValidationErrors = (errors: any): string => {
    if (!errors) return 'Validation failed!';

    const messages: string[] = [];

    // Handle Laravel MessageBag format
    if (errors['Illuminate\\Support\\MessageBag']) {
        const messageBag = errors['Illuminate\\Support\\MessageBag'];
        Object.keys(messageBag).forEach((field) => {
            const fieldErrors = Array.isArray(messageBag[field])
                ? messageBag[field]
                : [messageBag[field]];
            messages.push(
                `${formatFieldName(field)}: ${fieldErrors.join(', ')}`,
            );
        });
    }
    // Handle standard object format
    else if (typeof errors === 'object') {
        Object.keys(errors).forEach((field) => {
            const fieldErrors = Array.isArray(errors[field])
                ? errors[field]
                : [errors[field]];
            messages.push(
                `${formatFieldName(field)}: ${fieldErrors.join(', ')}`,
            );
        });
    }
    // Handle string error
    else if (typeof errors === 'string') {
        return errors;
    }

    return messages.length > 0 ? messages.join(' | ') : 'Validation failed!';
};

/**
 * Format field names for better readability
 */
const formatFieldName = (field: string): string => {
    return field
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Handle HTTP errors with proper status code handling
 */
const handleHttpError = (error: any): void => {
    console.error('Registration error:', error);

    if (error.response) {
        // The request was made and the server responded with a status code
        const { status, data } = error.response;

        switch (status) {
            case 422:
                // Validation errors
                if (data.errors) {
                    const errorMessages = extractValidationErrors(data.errors);
                    Notiflix.Notify.failure(errorMessages);
                } else {
                    Notiflix.Notify.failure(
                        data.message || 'Validation failed!',
                    );
                }
                break;
            case 400:
                Notiflix.Notify.failure(
                    data.message || 'Bad request! Please check your input.',
                );
                break;
            case 401:
                Notiflix.Notify.failure('Session expired! Please login again.');
                break;
            case 403:
                Notiflix.Notify.failure(
                    'You do not have permission to perform this action.',
                );
                break;
            case 409:
                Notiflix.Notify.failure(
                    data.message || 'Conflict! This resource already exists.',
                );
                break;
            case 429:
                Notiflix.Notify.failure(
                    'Too many requests! Please try again later.',
                );
                break;
            case 500:
                Notiflix.Notify.failure(
                    'Server error! Please try again later or contact support.',
                );
                break;
            default:
                Notiflix.Notify.failure(
                    data.message || `Error ${status}: Something went wrong!`,
                );
        }
    } else if (error.request) {
        // The request was made but no response was received
        Notiflix.Notify.failure(
            'Network error! Please check your internet connection.',
        );
    } else {
        // Something happened in setting up the request
        Notiflix.Notify.failure(
            error.message || 'An unexpected error occurred!',
        );
    }
};

/**
 * Get validation errors as an object for displaying on specific fields
 */
const getValidationErrorsForFields = (
    errors: any,
): Record<string, string[]> => {
    if (!errors) return {};

    const fieldErrors: Record<string, string[]> = {};

    // Handle Laravel MessageBag
    if (errors['Illuminate\\Support\\MessageBag']) {
        const messageBag = errors['Illuminate\\Support\\MessageBag'];
        Object.keys(messageBag).forEach((field) => {
            fieldErrors[field] = Array.isArray(messageBag[field])
                ? messageBag[field]
                : [messageBag[field]];
        });
    }
    // Handle standard object
    else if (typeof errors === 'object') {
        Object.keys(errors).forEach((field) => {
            fieldErrors[field] = Array.isArray(errors[field])
                ? errors[field]
                : [errors[field]];
        });
    }

    return fieldErrors;
};

// ============================================
// MAIN REGISTER COMPONENT
// ============================================

export default function Register() {
    const [activeTab, setActiveTab] = useState('demographics');
    const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { departments } = usePage().props;

    const { data, setData, processing, errors, clearErrors, reset } =
        useForm<RegisterFormData>(defaultFormValues);

    // Reset form to default values and reset all states
    const resetForm = () => {
        reset(defaultFormValues);
        setActiveTab('demographics');
        setTabErrors({});
        clearErrors();
        setIsSubmitting(false);
    };

    // Validate current tab before switching
    const validateTab = (tabId: string): boolean => {
        const tabValidationErrors: Record<string, boolean> = {};
        let isValid = true;

        switch (tabId) {
            case 'demographics':
                if (!data.first_name) {
                    isValid = false;
                    tabValidationErrors.first_name = true;
                }
                if (!data.surname) {
                    isValid = false;
                    tabValidationErrors.surname = true;
                }
                if (!data.date_of_birth) {
                    isValid = false;
                    tabValidationErrors.date_of_birth = true;
                }
                if (!data.gender) {
                    isValid = false;
                    tabValidationErrors.gender = true;
                }
                break;

            case 'contact':
                if (!data.mobile_phone_number) {
                    isValid = false;
                    tabValidationErrors.mobile_phone_number = true;
                }
                if (!data.email) {
                    isValid = false;
                    tabValidationErrors.email = true;
                }
                break;

            case 'roles':
                if (data.roles.length === 0) {
                    isValid = false;
                    tabValidationErrors.roles = true;
                }
                break;
        }

        setTabErrors((prev) => ({ ...prev, [tabId]: !isValid }));
        return isValid;
    };

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    const handleNext = () => {
        const currentIndex = tabs.findIndex((t) => t.id === activeTab);
        if (currentIndex < tabs.length - 1 && validateTab(activeTab)) {
            setActiveTab(tabs[currentIndex + 1].id);
            clearErrors();
        }
    };

    const handlePrevious = () => {
        const currentIndex = tabs.findIndex((t) => t.id === activeTab);
        if (currentIndex > 0) {
            setActiveTab(tabs[currentIndex - 1].id);
            clearErrors();
        }
    };

    const handleSubmit = async () => {
        // Final validation before submission
        if (
            !validateTab('demographics') ||
            !validateTab('contact') ||
            !validateTab('roles')
        ) {
            Notiflix.Notify.warning(
                'Please complete all required fields before submitting',
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const user = await Http.post(routes.api.user.register, { data });

            if (user.data.status) {
                Notiflix.Notify.success(user.data.message);
                resetForm();
            } else {
                // Handle backend validation errors
                if (user.data.errors) {
                    // Show specific validation errors
                    const errorMessages = extractValidationErrors(
                        user.data.errors,
                    );
                    Notiflix.Notify.failure(errorMessages);

                    // Optional: Highlight fields with errors
                    const fieldErrors = getValidationErrorsForFields(
                        user.data.errors,
                    );
                    console.log('Field-specific errors:', fieldErrors);
                } else {
                    Notiflix.Notify.failure(
                        user.data.message || 'Failed to create user!',
                    );
                }
                setIsSubmitting(false);
            }
        } catch (error) {
            // Handle HTTP errors with detailed messages
            handleHttpError(error);
            setIsSubmitting(false);
        }
    };

    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    const progress = ((currentIndex + 1) / tabs.length) * 100;
    console.log('departments', departments);

    return (
        <AppLayout
            breadcrumbs={[
                { href: '', title: 'Admin' },
                { href: '', title: 'User Registration' },
            ]}
        >
            <div className="h-full bg-blue-50 p-4">
                <div className="">
                    {/* Header Section */}
                    <PageHeader
                        icon={<Users className="h-6 w-6" />}
                        title="User Registration"
                        subtitle={'Add a new user to the system'}
                    />

                    {/* Form Container */}
                    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        {/* Progress Bar */}
                        <div className="border-b border-gray-100 px-8 pt-6 pb-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Step {currentIndex + 1} of {tabs.length}
                                    </span>
                                    {isSubmitting && (
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Submitting...
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400">
                                    {Math.round(progress)}% Complete
                                </span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="border-b border-gray-100">
                            <nav className="flex overflow-x-auto px-4">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const hasError = tabErrors[tab.id];
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() =>
                                                handleTabChange(tab.id)
                                            }
                                            disabled={isSubmitting}
                                            className={`relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all ${
                                                isActive
                                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            } ${hasError ? 'text-red-600' : ''} ${
                                                isSubmitting
                                                    ? 'cursor-not-allowed opacity-50'
                                                    : ''
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{tab.label}</span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs ${
                                                    isActive
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'bg-gray-50 text-gray-400'
                                                }`}
                                            >
                                                {tab.step}
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Form Content */}
                        <div className="p-8">
                            {activeTab === 'demographics' && (
                                <DemographicsTab
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                />
                            )}
                            {activeTab === 'contact' && (
                                <ContactTab
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                />
                            )}
                            {activeTab === 'roles' && (
                                <RolesTab
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                />
                            )}
                            {activeTab === 'departments' && (
                                <DepartmentsTab
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                />
                            )}

                            {/* Navigation Buttons */}
                            <div className="mt-8 flex justify-between border-t border-gray-100 pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrevious}
                                    disabled={
                                        currentIndex === 0 || isSubmitting
                                    }
                                    className="border-gray-200 px-6 text-gray-600 hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Previous
                                </Button>

                                {currentIndex === tabs.length - 1 ? (
                                    <Button
                                        onClick={handleSubmit}
                                        type="button"
                                        disabled={isSubmitting || processing}
                                        className="min-w-[180px] bg-blue-600 px-6 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating Account...
                                            </>
                                        ) : (
                                            <>
                                                Complete Registration
                                                <Save className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleNext}
                                        disabled={isSubmitting}
                                        className="bg-blue-600 px-6 text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Next
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
