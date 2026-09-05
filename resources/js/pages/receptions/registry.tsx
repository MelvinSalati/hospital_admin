import {
    MagnifyingGlassIcon,
    FunnelIcon,
    XMarkIcon,
    UserPlusIcon,
    AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AddPatientModal from '@/components/modals/AddPatientModal';
import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

interface Patient {
    id: string;
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    phone: string;
    email: string;
    nrc?: string;
    passport?: string;
    national_id?: string;
    alt_phone?: string;
    status: 'active' | 'inactive';
    created_at: string;
}

// Search options
type SearchOption =
    | 'all'
    | 'name'
    | 'patient_number'
    | 'phone'
    | 'alt_phone'
    | 'nrc'
    | 'passport'
    | 'national_id'
    | 'email';

const searchOptions: {
    value: SearchOption;
    label: string;
    icon: string;
    placeholder: string;
}[] = [
    {
        value: 'name',
        label: 'Name',
        icon: '👤',
        placeholder: 'Search by first or last name...',
    },
    {
        value: 'patient_number',
        label: 'Patient ID',
        icon: '🆔',
        placeholder: 'Search by patient ID...',
    },
    {
        value: 'phone',
        label: 'Phone Number',
        icon: '📱',
        placeholder: 'Search by phone number...',
    },
   
    {
        value: 'nrc',
        label: 'NRC Number',
        icon: '🪪',
        placeholder: 'Enter NRC number (e.g., 123456/78/9)...',
    },

];

export default function Registry() {
    const { auth } = usePage().props as any;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOption, setSearchOption] = useState<SearchOption>('all');
    const [statusFilter, setStatusFilter] = useState<
        'all' | 'active' | 'inactive'
    >('all');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Get current search option
    const currentOption = searchOptions.find(
        (opt) => opt.value === searchOption,
    );

    // Handle search with POST request
    const handleSearch = async () => {
        if (!searchTerm.trim() && statusFilter === 'all') {
            // If no search term and no status filter, clear results
            setPatients([]);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        try {
            const response = await Http.post('/patients/registry/search', {
                search_value: searchTerm,
                search_type: searchOption,
            });
            console.log(searchTerm, searchOption, response);
            if (response.data.success) {
                setPatients(response.data.data || []);
                setHasSearched(true);

                if (response.data.data.length === 0) {
                    toast.info('No patients found matching your criteria');
                }
            } else {
                toast.error(
                    response.data.message || 'Failed to search patients',
                );
                setPatients([]);
            }
        } catch (error: any) {
            console.error('Search error:', error);
            toast.error(
                error.message ||
                    'An error occurred while searching',
            );
            setPatients([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Handle search button click
    const handleSearchClick = () => {
        handleSearch();
    };

    const handlePatientAdded = () => {
        toast.success('Patient added successfully');
        // Refresh the search results
        if (searchTerm || statusFilter !== 'all') {
            handleSearch();
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchOption('all');
        setStatusFilter('all');
        setPatients([]);
        setHasSearched(false);
    };

    // Format date for display
    const formatDate = (date: string) => {
        try {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return date;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Patient',
                    href: '/',
                },
                {
                    title: 'Registry',
                    href: '/',
                },
            ]}
        >
            <div className="min-h-screen bg-blue-50 p-4 md:p-6">
                <PageHeader
                    icon={
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                    }
                    title={'Patient Registry'}
                    subtitle="Manage and search patients using multiple identification methods"
                    actions={[
                        {
                            label: 'Create Patient',
                            onClick() {
                                setIsModalOpen(true);
                            },
                        },
                    ]}
                />

                {/* Search Section */}
                <div className="bg-white p-2">
                    <div className="mb-6 rounded-xl bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={
                                        currentOption?.placeholder ||
                                        'Search patients...'
                                    }
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    onKeyPress={handleKeyPress}
                                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-10 pl-10 text-gray-900 transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                                    >
                                        <XMarkIcon className="h-5 w-5 text-gray-400 transition-colors hover:text-gray-600" />
                                    </button>
                                )}
                            </div>

                            {/* Search Options */}
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={searchOption}
                                    onChange={(e) =>
                                        setSearchOption(
                                            e.target.value as SearchOption,
                                        )
                                    }
                                    className="min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    {searchOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.icon} {option.label}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value as any)
                                    }
                                    className="min-w-[130px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">● Active</option>
                                    <option value="inactive">○ Inactive</option>
                                </select>

                                {/* Search Button */}
                                <button
                                    onClick={handleSearchClick}
                                    disabled={loading}
                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="h-4 w-4 animate-spin"
                                                fill="none"
                                                viewBox="0 0 24 24"
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
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <MagnifyingGlassIcon className="h-4 w-4" />
                                            Search
                                        </>
                                    )}
                                </button>

                                {(searchTerm ||
                                    statusFilter !== 'all' ||
                                    searchOption !== 'all') && (
                                    <button
                                        onClick={clearSearch}
                                        className="rounded-lg bg-gray-100 px-3 py-2.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
                                        title="Clear all filters"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Search Chips */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-xs text-gray-400">
                                Quick search:
                            </span>
                            {[
                                { label: 'NRC', value: 'nrc' },
                                { label: 'Passport', value: 'passport' },
                                { label: 'Phone', value: 'phone' },
                                { label: 'Alt Phone', value: 'alt_phone' },
                                {
                                    label: 'Patient ID',
                                    value: 'patient_number',
                                },
                                { label: 'Email', value: 'email' },
                            ].map(({ label, value }) => (
                                <button
                                    key={label}
                                    onClick={() => {
                                        setSearchOption(value as SearchOption);
                                        setSearchTerm('');
                                        const input = document.querySelector(
                                            'input[type="text"]',
                                        ) as HTMLInputElement;
                                        if (input) input.focus();
                                    }}
                                    className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                                        searchOption === value
                                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results Stats */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-gray-600">
                                {hasSearched ? (
                                    <>
                                        <span className="font-semibold text-gray-900">
                                            {patients.length}
                                        </span>{' '}
                                        patient
                                        {patients.length !== 1 ? 's' : ''} found
                                        {searchTerm && (
                                            <span className="ml-1 text-gray-400">
                                                matching "{searchTerm}"
                                            </span>
                                        )}
                                        {statusFilter !== 'all' && (
                                            <span
                                                className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                                                    statusFilter === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {statusFilter}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    'Enter search criteria and click Search'
                                )}
                            </p>
                        </div>
                        {patients.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-green-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                    {
                                        patients.filter(
                                            (p) => p.status === 'active',
                                        ).length
                                    }{' '}
                                    Active
                                </span>
                                <span className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-gray-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                                    {
                                        patients.filter(
                                            (p) => p.status === 'inactive',
                                        ).length
                                    }{' '}
                                    Inactive
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Patients Table */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                            Patient #
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                            Name
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                            Identification
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                            Registered
                                        </th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-6 py-12 text-center"
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg
                                                        className="h-6 w-6 animate-spin text-blue-600"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
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
                                                    <span className="text-gray-500">
                                                        Searching...
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : patients.length > 0 ? (
                                        patients.map((patient) => (
                                            <tr
                                                key={patient.id}
                                                className="transition-colors hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-sm font-medium text-blue-600">
                                                        {patient.patient_number}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-medium text-white">
                                                            {
                                                                patient
                                                                    .first_name[0]
                                                            }
                                                            {
                                                                patient
                                                                    .last_name[0]
                                                            }
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {
                                                                    patient.first_name
                                                                }{' '}
                                                                {
                                                                    patient.last_name
                                                                }
                                                            </div>
                                                            <div className="text-xs text-gray-400 capitalize">
                                                                {patient.gender}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-0.5 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-gray-400">
                                                                ✉
                                                            </span>
                                                            <span className="text-sm">
                                                                {patient.email}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-gray-400">
                                                                📱
                                                            </span>
                                                            <span>
                                                                {patient.phone}
                                                            </span>
                                                        </div>
                                                        {patient.alt_phone && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                                <span>📞</span>
                                                                <span>
                                                                    {
                                                                        patient.alt_phone
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-0.5">
                                                        {patient.nrc && (
                                                            <div className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs">
                                                                <span className="text-gray-400">
                                                                    NRC:
                                                                </span>
                                                                <span className="text-gray-700">
                                                                    {
                                                                        patient.nrc
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                        {patient.passport && (
                                                            <div className="ml-1 inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs">
                                                                <span className="text-gray-400">
                                                                    Passport:
                                                                </span>
                                                                <span className="text-gray-700">
                                                                    {
                                                                        patient.passport
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                        {patient.national_id && (
                                                            <div className="ml-1 inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs">
                                                                <span className="text-gray-400">
                                                                    NID:
                                                                </span>
                                                                <span className="text-gray-700">
                                                                    {
                                                                        patient.national_id
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                        {!patient.nrc &&
                                                            !patient.passport &&
                                                            !patient.national_id && (
                                                                <span className="text-xs text-gray-400">
                                                                    —
                                                                </span>
                                                            )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                            patient.status ===
                                                            'active'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${
                                                                patient.status ===
                                                                'active'
                                                                    ? 'bg-green-500'
                                                                    : 'bg-gray-400'
                                                            }`}
                                                        ></span>
                                                        {patient.status ===
                                                        'active'
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                                    {formatDate(
                                                        patient.created_at,
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                                                    <Link
                                                        href={`/patients/${patient.id}`}
                                                        className="mr-4 font-medium text-blue-600 transition-colors hover:text-blue-800"
                                                    >
                                                        View
                                                    </Link>
                                                    <Link
                                                        href={`/patients/${patient.id}/edit`}
                                                        className="font-medium text-gray-600 transition-colors hover:text-gray-800"
                                                    >
                                                        Edit
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : hasSearched ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-6 py-12 text-center"
                                            >
                                                <div className="flex flex-col items-center">
                                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                                                        <svg
                                                            className="h-6 w-6 text-gray-400"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <p className="text-base font-medium text-gray-900">
                                                        No patients found
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        Try adjusting your
                                                        search criteria or
                                                        filters
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-6 py-12 text-center"
                                            >
                                                <div className="flex flex-col items-center">
                                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                                                        <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                    <p className="text-base font-medium text-gray-900">
                                                        Search for patients
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        Enter a search term and
                                                        click Search to find
                                                        patients
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {patients.length > 0 && (
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3.5 sm:flex-row">
                                <p className="text-sm text-gray-500">
                                    Showing{' '}
                                    <span className="font-medium text-gray-700">
                                        1
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium text-gray-700">
                                        {patients.length}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium text-gray-700">
                                        {patients.length}
                                    </span>{' '}
                                    results
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
                                        disabled
                                    >
                                        Previous
                                    </button>
                                    <button className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm text-white transition-colors hover:bg-blue-700">
                                        1
                                    </button>
                                    <button
                                        className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
                                        disabled
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Patient Modal */}
                <AddPatientModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handlePatientAdded}
                />
            </div>
        </AppLayout>
    );
}
