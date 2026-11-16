import {
    DevicePhoneMobileIcon,
    EnvelopeIcon,
    FaceFrownIcon,
    MagnifyingGlassIcon,
    PhoneIcon,
    UserPlusIcon,
    UsersIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link, router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddPatientModal from '@/components/modals/AddPatientModal';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface Patient {
    id: string | number;
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    phone: string | null;
    email: string | null;
    nrc?: string;
    passport?: string;
    national_id?: string;
    alt_phone?: string;
    status: 'active' | 'inactive';
    created_at: string;
    address: string | null;
    date_of_birth: string | null;
    blood_group: string | null;
    nationality: string | null;
    occupation: string | null;
    marital_status: string | null;
    id_type: string | null;
    id_number: string | null;
    insurance_provider: string | null;
    insurance_number: string | null;
}

type SearchOption =
    | 'name'
    | 'patient_number'
    | 'phone'
    | 'alt_phone'
    | 'nrc'
    | 'passport'
    | 'national_id'
    | 'email';

type StatusFilter = 'all' | 'active' | 'inactive';

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const SEARCH_OPTIONS: {
    value: SearchOption;
    label: string;
    placeholder: string;
}[] = [
    {
        value: 'name',
        label: 'Name',
        placeholder: 'First or last name, e.g. Mary Phiri',
    },
    {
        value: 'patient_number',
        label: 'Patient ID',
        placeholder: 'Patient number, e.g. P-000123',
    },
    {
        value: 'phone',
        label: 'Phone',
        placeholder: 'Phone number, e.g. 0977 123 456',
    },
    {
        value: 'alt_phone',
        label: 'Alt phone',
        placeholder: 'Alternative phone number',
    },
    {
        value: 'nrc',
        label: 'NRC',
        placeholder: 'NRC number, e.g. 123456/78/9',
    },
    {
        value: 'passport',
        label: 'Passport',
        placeholder: 'Passport number',
    },
    {
        value: 'national_id',
        label: 'National ID',
        placeholder: 'National ID number',
    },
    {
        value: 'email',
        label: 'Email',
        placeholder: 'Email address',
    },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const hasValue = (value: unknown): boolean =>
    value !== null && value !== undefined && value !== '';

const fullName = (patient: Patient): string => {
    const name = [patient.first_name, patient.last_name]
        .filter(hasValue)
        .join(' ');

    return name || '—';
};

const initials = (patient: Patient): string => {
    const first = hasValue(patient.first_name) ? patient.first_name[0] : '';
    const last = hasValue(patient.last_name) ? patient.last_name[0] : '';

    return (first + last).toUpperCase() || '?';
};

const formatRegistered = (date: string): string => {
    if (!hasValue(date)) {
        return '—';
    }

    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
        ? '—'
        : parsed.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          });
};

/* -------------------------------------------------------------------------- */
/* SMALL UI PIECES                                                            */
/* -------------------------------------------------------------------------- */

function IdChip({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs">
            <span className="text-gray-500">{label}:</span>
            <span className="text-gray-800">{value}</span>
        </span>
    );
}

function ContactLine({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-gray-500" aria-hidden="true">
                {icon}
            </span>
            <span className="sr-only">{label}:</span>
            <span className="truncate">{hasValue(value) ? value : '—'}</span>
        </div>
    );
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg
            className={`${className} animate-spin motion-reduce:animate-none`}
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                {icon}
            </div>
            <p className="text-base font-medium text-gray-900">{title}</p>
            <p className="mt-1 max-w-md text-sm text-gray-600">{description}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* TABLE COLUMNS                                                              */
/* -------------------------------------------------------------------------- */

const getTableColumns = () => [
    {
        id: 'patient_number',
        label: 'Patient #',
        sortable: true,
        render: (patient: Patient) => (
            <span className="font-mono text-sm font-medium text-blue-700">
                {hasValue(patient.patient_number)
                    ? patient.patient_number
                    : '—'}
            </span>
        ),
    },
    {
        id: 'first_name',
        label: 'Patient',
        sortable: true,
        render: (patient: Patient) => (
            <div className="flex items-center">
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-medium text-white"
                    aria-hidden="true"
                >
                    {initials(patient)}
                </div>
                <div className="ml-3 min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                        {fullName(patient)}
                    </div>
                    <div className="text-xs text-gray-600 capitalize">
                        {hasValue(patient.gender) ? patient.gender : '—'}
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'phone',
        label: 'Contact',
        sortable: false,
        render: (patient: Patient) => (
            <div className="space-y-0.5 text-sm text-gray-700">
                <ContactLine
                    icon={<EnvelopeIcon className="h-4 w-4" />}
                    label="Email"
                    value={patient.email}
                />
                <ContactLine
                    icon={<DevicePhoneMobileIcon className="h-4 w-4" />}
                    label="Phone"
                    value={patient.phone}
                />
                {hasValue(patient.alt_phone) && (
                    <ContactLine
                        icon={<PhoneIcon className="h-4 w-4" />}
                        label="Alternative phone"
                        value={patient.alt_phone}
                    />
                )}
            </div>
        ),
    },
    {
        id: 'identification',
        label: 'Identification',
        sortable: false,
        render: (patient: Patient) => {
            const hasAny =
                hasValue(patient.nrc) ||
                hasValue(patient.passport) ||
                hasValue(patient.national_id);

            return (
                <div className="flex flex-wrap gap-1">
                    {hasValue(patient.nrc) && (
                        <IdChip label="NRC" value={patient.nrc as string} />
                    )}
                    {hasValue(patient.passport) && (
                        <IdChip
                            label="Passport"
                            value={patient.passport as string}
                        />
                    )}
                    {hasValue(patient.national_id) && (
                        <IdChip
                            label="NID"
                            value={patient.national_id as string}
                        />
                    )}
                    {!hasAny && (
                        <span className="text-xs text-gray-500">—</span>
                    )}
                </div>
            );
        },
    },
    {
        id: 'status',
        label: 'Status',
        sortable: true,
        render: (patient: Patient) => {
            const active = patient.status === 'active';

            return (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            active ? 'bg-green-600' : 'bg-gray-500'
                        }`}
                        aria-hidden="true"
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
        render: (patient: Patient) => (
            <span className="text-sm text-gray-600">
                {formatRegistered(patient.created_at)}
            </span>
        ),
    },
    {
        id: 'actions',
        label: 'Actions',
        sortable: false,
        render: (patient: Patient) => (
            <div className="flex items-center justify-end gap-1">
                <Link
                    href={`/patients/dashboard/${patient.id}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`View ${fullName(patient)}`}
                    className="inline-flex min-h-11 items-center rounded-md px-3 font-medium text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-900 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                >
                    View
                </Link>
                <Link
                    href={`/patients/${patient.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Edit ${fullName(patient)}`}
                    className="inline-flex min-h-11 items-center rounded-md px-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                >
                    Edit
                </Link>
            </div>
        ),
    },
];

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function Registry() {
    const inputRef = useRef<HTMLInputElement>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOption, setSearchOption] = useState<SearchOption>('name');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);

    const currentOption = SEARCH_OPTIONS.find(
        (option) => option.value === searchOption,
    );

    const visiblePatients = useMemo(
        () =>
            statusFilter === 'all'
                ? patients
                : patients.filter((patient) => patient.status === statusFilter),
        [patients, statusFilter],
    );

    const activeCount = patients.filter((p) => p.status === 'active').length;
    const inactiveCount = patients.filter(
        (p) => p.status === 'inactive',
    ).length;

    const columns = useMemo(() => getTableColumns(), []);

    const handleSearch = async () => {
        const term = searchTerm.trim();

        if (!term) {
            setInputError(
                `Enter a ${currentOption?.label.toLowerCase() ?? 'value'} to search for.`,
            );
            setPatients([]);
            setHasSearched(false);
            inputRef.current?.focus();
            return;
        }

        setInputError(null);
        setLoading(true);

        try {
            const response = await Http.post('/patients/registry/search', {
                search_value: term,
                search_type: searchOption,
            });

            if (response.data.success) {
                setPatients(response.data.data || []);
                setHasSearched(true);
            } else {
                toast.error(
                    response.data.message || 'Failed to search patients',
                );
                setPatients([]);
            }
        } catch (error: any) {
            toast.error(error?.message || 'An error occurred while searching');
            setPatients([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePatientAdded = () => {
        toast.success('Patient added successfully');

        if (searchTerm.trim()) {
            handleSearch();
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchOption('name');
        setStatusFilter('all');
        setPatients([]);
        setHasSearched(false);
        setInputError(null);
        inputRef.current?.focus();
    };

    const selectOption = (value: SearchOption) => {
        setSearchOption(value);
        setInputError(null);
        inputRef.current?.focus();
    };

    const hasFilters =
        searchTerm !== '' || statusFilter !== 'all' || searchOption !== 'name';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Registry', href: '/' },
            ]}
        >
            <div className="min-h-screen bg-blue-50 p-4 md:p-6">
                <PageHeader
                    icon={<UsersIcon className="h-5 w-5" />}
                    title="Search"
                    subtitle="Find registered patients using multiple identification methods"
                />

                <div className="bg-white p-2">
                    {/* ------------------------------ Search card ------------------------------ */}
                    <section
                        aria-label="Patient search"
                        className="mb-6 rounded-xl bg-white p-4"
                    >
                        <label
                            htmlFor="patient-search"
                            className="mb-1.5 block text-sm font-medium text-gray-800"
                        >
                            Search by{' '}
                            <span className="text-blue-700">
                                {currentOption?.label}
                            </span>
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <div
                                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
                                    aria-hidden="true"
                                >
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                                </div>

                                <input
                                    id="patient-search"
                                    ref={inputRef}
                                    type="text"
                                    inputMode={
                                        searchOption === 'phone' ||
                                        searchOption === 'alt_phone'
                                            ? 'tel'
                                            : 'text'
                                    }
                                    autoComplete="off"
                                    placeholder={currentOption?.placeholder}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (inputError) setInputError(null);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    aria-invalid={inputError ? true : undefined}
                                    aria-describedby={
                                        inputError
                                            ? 'patient-search-error'
                                            : undefined
                                    }
                                    className={`min-h-11 w-full rounded-lg border bg-white py-2.5 pr-11 pl-10 text-gray-900 transition-colors placeholder:text-gray-500 focus:ring-2 focus:outline-none ${
                                        inputError
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:border-blue-600 focus:ring-blue-600'
                                    }`}
                                />

                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            inputRef.current?.focus();
                                        }}
                                        aria-label="Clear search text"
                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-500 transition-colors hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={loading}
                                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                                >
                                    {loading ? (
                                        <>
                                            <Spinner />
                                            Searching…
                                        </>
                                    ) : (
                                        <>
                                            <MagnifyingGlassIcon
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            />
                                            Search
                                        </>
                                    )}
                                </button>

                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                                    >
                                        <XMarkIcon
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {inputError && (
                            <p
                                id="patient-search-error"
                                role="alert"
                                className="mt-1.5 text-sm text-red-700"
                            >
                                {inputError}
                            </p>
                        )}

                        {/* Search type */}
                        <div className="mt-4">
                            <span
                                id="search-type-label"
                                className="mb-1.5 block text-xs font-medium tracking-wide text-gray-600 uppercase"
                            >
                                Search type
                            </span>
                            <div
                                role="radiogroup"
                                aria-labelledby="search-type-label"
                                className="flex flex-wrap gap-2"
                            >
                                {SEARCH_OPTIONS.map((option) => {
                                    const selected =
                                        searchOption === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() =>
                                                selectOption(option.value)
                                            }
                                            className={`min-h-9 rounded-full border px-3.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                                                selected
                                                    ? 'border-blue-700 bg-blue-700 font-medium text-white'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Status filter */}
                        <div className="mt-4">
                            <span
                                id="status-filter-label"
                                className="mb-1.5 block text-xs font-medium tracking-wide text-gray-600 uppercase"
                            >
                                Patient status
                            </span>
                            <div
                                role="radiogroup"
                                aria-labelledby="status-filter-label"
                                className="inline-flex rounded-lg bg-gray-100 p-1"
                            >
                                {STATUS_OPTIONS.map((option) => {
                                    const selected =
                                        statusFilter === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() =>
                                                setStatusFilter(option.value)
                                            }
                                            className={`min-h-9 rounded-md px-4 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                                                selected
                                                    ? 'bg-white font-medium text-gray-900 shadow-sm'
                                                    : 'text-gray-700 hover:text-gray-900'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ----------------------------- Results summary ---------------------------- */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p
                            role="status"
                            aria-live="polite"
                            className="text-sm text-gray-700"
                        >
                            {loading ? (
                                'Searching…'
                            ) : hasSearched ? (
                                <>
                                    <span className="font-semibold text-gray-900">
                                        {visiblePatients.length}
                                    </span>{' '}
                                    {visiblePatients.length === 1
                                        ? 'patient'
                                        : 'patients'}{' '}
                                    found
                                    {searchTerm.trim() && (
                                        <span className="ml-1 text-gray-600">
                                            matching “{searchTerm.trim()}”
                                        </span>
                                    )}
                                    {statusFilter !== 'all' && (
                                        <span
                                            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                statusFilter === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            {statusFilter}
                                        </span>
                                    )}
                                </>
                            ) : (
                                'Enter search criteria and select Search.'
                            )}
                        </p>

                        {patients.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-green-800">
                                    <span
                                        className="h-1.5 w-1.5 rounded-full bg-green-600"
                                        aria-hidden="true"
                                    />
                                    {activeCount} Active
                                </span>
                                <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700">
                                    <span
                                        className="h-1.5 w-1.5 rounded-full bg-gray-500"
                                        aria-hidden="true"
                                    />
                                    {inactiveCount} Inactive
                                </span>
                            </div>
                        )}
                    </div>

                    {/* -------------------------------- Results -------------------------------- */}
                    {loading ? (
                        <div
                            role="status"
                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-12 text-gray-600 shadow-sm"
                        >
                            <Spinner className="h-6 w-6 text-blue-700" />
                            Searching patients…
                        </div>
                    ) : visiblePatients.length > 0 ? (
                        <ReusableTable
                            data={visiblePatients}
                            columns={columns}
                            searchable={false}
                            onRowClick={(patient: Patient) => {
                                router.visit(
                                    `/patients/dashboard/${patient.id}`,
                                );
                            }}
                            emptyMessage="No patients found"
                            className="rounded-xl border border-gray-200 bg-white shadow-sm"
                        />
                    ) : hasSearched ? (
                        <EmptyState
                            icon={<FaceFrownIcon className="h-6 w-6" />}
                            title="No patients found"
                            description={
                                patients.length > 0
                                    ? `No ${statusFilter} patients match this search. Try “All” status.`
                                    : 'Check the spelling, try a different search type (for example NRC or phone), or register them as a new patient.'
                            }
                            action={
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                                >
                                    <UserPlusIcon
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    Register new patient
                                </button>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={<MagnifyingGlassIcon className="h-6 w-6" />}
                            title="Search for patients"
                            description="Choose a search type, enter a value and press Enter or select Search."
                        />
                    )}
                </div>

                <AddPatientModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handlePatientAdded}
                />
            </div>
        </AppLayout>
    );
}
