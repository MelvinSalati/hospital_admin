// pages/Register.tsx

import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Phone,
    Save,
    Shield,
    User,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

// ============================================
// TYPES & CONFIG
// ============================================

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

type TabId = 'demographics' | 'contact' | 'roles' | 'departments';

interface TabConfig {
    id: TabId;
    label: string;
    description: string;
    icon: LucideIcon;
    step: number;
}

const tabs: TabConfig[] = [
    {
        id: 'demographics',
        label: 'Demographics',
        description: 'Personal and professional details',
        icon: User,
        step: 1,
    },
    {
        id: 'contact',
        label: 'Contact Info',
        description: 'Phone number and email address',
        icon: Phone,
        step: 2,
    },
    {
        id: 'roles',
        label: 'Roles & Access',
        description: 'Permissions for this user',
        icon: Shield,
        step: 3,
    },
    {
        id: 'departments',
        label: 'Departments',
        description: 'Where the user will work',
        icon: Users,
        step: 4,
    },
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

// ============================================
// PRESENTATION COMPONENTS
// ============================================

/** One row in the vertical stepper. */
const StepItem: React.FC<{
    tab: TabConfig;
    isActive: boolean;
    isDone: boolean;
    hasError: boolean;
    isLast: boolean;
    disabled: boolean;
    onSelect: () => void;
}> = ({ tab, isActive, isDone, hasError, isLast, disabled, onSelect }) => {
    const Icon = tab.icon;

    const circle = hasError
        ? 'border-red-300 bg-red-50 text-red-600'
        : isActive
          ? 'border-blue-600 bg-blue-600 text-white'
          : isDone
            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
            : 'border-gray-200 bg-white text-gray-400';

    const status = hasError
        ? { text: 'Needs attention', color: 'text-red-600' }
        : isDone
          ? { text: 'Complete', color: 'text-emerald-600' }
          : isActive
            ? { text: 'In progress', color: 'text-blue-600' }
            : { text: 'Not started', color: 'text-gray-400' };

    return (
        <li className="relative">
            {!isLast && (
                <span
                    aria-hidden="true"
                    className={`absolute top-11 left-[1.375rem] h-[calc(100%-2rem)] w-px ${
                        isDone && !hasError ? 'bg-emerald-200' : 'bg-gray-200'
                    }`}
                />
            )}
            <button
                type="button"
                onClick={onSelect}
                disabled={disabled}
                aria-current={isActive ? 'step' : undefined}
                className={`flex min-h-[44px] w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
            >
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${circle}`}
                >
                    {hasError ? (
                        <AlertCircle className="h-4 w-4" />
                    ) : isDone && !isActive ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <Icon className="h-4 w-4" />
                    )}
                </span>
                <span className="min-w-0">
                    <span
                        className={`block text-sm font-medium ${
                            isActive ? 'text-blue-700' : 'text-gray-800'
                        }`}
                    >
                        {tab.label}
                    </span>
                    <span className="hidden text-xs text-gray-500 sm:block">
                        {tab.description}
                    </span>
                    <span className={`text-xs font-medium ${status.color}`}>
                        {status.text}
                    </span>
                </span>
            </button>
        </li>
    );
};

// ============================================
// MAIN REGISTER COMPONENT
// ============================================

export default function Register() {
    const [activeTab, setActiveTab] = useState<TabId>('demographics');
    const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
    const [completedTabs, setCompletedTabs] = useState<Record<string, boolean>>(
        {},
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data, setData, processing, errors, clearErrors, reset } =
        useForm<RegisterFormData>(defaultFormValues);

    // Reset form to default values and reset all states
    const resetForm = () => {
        reset(defaultFormValues);
        setActiveTab('demographics');
        setTabErrors({});
        setCompletedTabs({});
        clearErrors();
        setIsSubmitting(false);
    };

    // Validate a tab's required fields (rules unchanged)
    const validateTab = (tabId: string): boolean => {
        let isValid = true;

        switch (tabId) {
            case 'demographics':
                if (
                    !data.first_name ||
                    !data.surname ||
                    !data.date_of_birth ||
                    !data.gender
                ) {
                    isValid = false;
                }
                break;

            case 'contact':
                if (!data.mobile_phone_number || !data.email) {
                    isValid = false;
                }
                break;

            case 'roles':
                if (data.roles.length === 0) {
                    isValid = false;
                }
                break;
        }

        setTabErrors((prev) => ({ ...prev, [tabId]: !isValid }));
        if (isValid) {
            setCompletedTabs((prev) => ({ ...prev, [tabId]: true }));
        }
        return isValid;
    };

    const handleTabChange = (tabId: TabId) => {
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
        // Final validation of every required step; jump to the first one that fails
        const requiredTabs: TabId[] = ['demographics', 'contact', 'roles'];
        const results = requiredTabs.map((id) => ({
            id,
            valid: validateTab(id),
        }));
        const firstInvalid = results.find((r) => !r.valid);

        if (firstInvalid) {
            setActiveTab(firstInvalid.id);
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
                    Notiflix.Notify.failure(
                        extractValidationErrors(user.data.errors),
                    );
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
    const currentTab = tabs[currentIndex];
    const CurrentIcon = currentTab.icon;
    const isLastStep = currentIndex === tabs.length - 1;
    const completedCount = tabs.filter(
        (t) => completedTabs[t.id] && !tabErrors[t.id],
    ).length;
    const progress = Math.round((completedCount / tabs.length) * 100);

    // Live, read-only preview of who is being registered
    const fullName = `${data.first_name} ${data.surname}`.trim();
    const initials =
        `${data.first_name.charAt(0)}${data.surname.charAt(0)}`.toUpperCase();

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '', title: 'Admin' },
                { href: '', title: 'User Registration' },
            ]}
        >
            {' '}
            <PageHeader
                icon={<Users className="h-6 w-6" />}
                title="User Registration"
                subtitle="Add a new user to the system"
            />
            <div className="h-full min-h-screen bg-blue-50 p-4">
                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                    {/* ───────── Stepper sidebar ───────── */}
                    <aside className="space-y-4 lg:sticky lg:top-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-900">
                                    Registration progress
                                </h2>
                                <span className="text-xs font-medium text-gray-500">
                                    {progress}%
                                </span>
                            </div>
                            <div
                                className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100"
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Registration progress"
                            >
                                <div
                                    className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <nav aria-label="Registration steps">
                                <ol className="space-y-1">
                                    {tabs.map((tab, index) => (
                                        <StepItem
                                            key={tab.id}
                                            tab={tab}
                                            isActive={activeTab === tab.id}
                                            isDone={Boolean(
                                                completedTabs[tab.id],
                                            )}
                                            hasError={Boolean(
                                                tabErrors[tab.id],
                                            )}
                                            isLast={index === tabs.length - 1}
                                            disabled={isSubmitting}
                                            onSelect={() =>
                                                handleTabChange(tab.id)
                                            }
                                        />
                                    ))}
                                </ol>
                            </nav>
                        </div>

                        {/* New user preview */}
                        <div className="hidden items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                                {initials || <User className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">
                                    {fullName || 'New user'}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                    {data.email || 'Email not entered yet'}
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* ───────── Step content ───────── */}
                    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 md:px-8">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-lg bg-blue-50 p-2">
                                    <CurrentIcon className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {currentTab.label}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {currentTab.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {isSubmitting && (
                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Submitting...
                                    </span>
                                )}
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                    Step {currentIndex + 1} of {tabs.length}
                                </span>
                            </div>
                        </header>

                        <div className="px-6 py-6 md:px-8 md:py-8">
                            {tabErrors[activeTab] && (
                                <div
                                    role="alert"
                                    className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                >
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        Complete the required fields on this
                                        step to continue.
                                    </span>
                                </div>
                            )}

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
                        </div>

                        {/* Navigation */}
                        <footer className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4 md:px-8">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentIndex === 0 || isSubmitting}
                                className="cursor-pointer border-gray-200 bg-white px-5 text-gray-600 hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>

                            {isLastStep ? (
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || processing}
                                    className="min-w-[200px] cursor-pointer bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                                    className="cursor-pointer bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </footer>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
