// pages/patients/registry.tsx

import { useState } from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Search,
    Phone,
    Mail,
    Calendar,
    Heart,
    Download,
    Eye,
    Edit,
    Loader2,
    X,
    ChevronLeft,
    ChevronRight,
    User,
    Filter,
    UserSearch,
    Users,
    Clock,
    CheckCircle,
    AlertCircle,
    Plus,
    Printer,
} from 'lucide-react';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';

// ============================================================================
// Types
// ============================================================================

interface Patient {
    id: number;
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    phone: string | null;
    email: string | null;
    blood_group: string | null;
    status: 'active' | 'inactive' | 'deceased';
}

interface SearchResponse {
    success: boolean;
    data: {
        data: Patient[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

// ============================================================================
// Sub-Components
// ============================================================================

const StatusBadge: React.FC<{ status: Patient['status'] }> = ({ status }) => {
    const config = {
        active: {
            icon: <CheckCircle className="h-2.5 w-2.5" />,
            label: 'Active',
            bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
        },
        inactive: {
            icon: <Clock className="h-2.5 w-2.5" />,
            label: 'Inactive',
            bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        },
        deceased: {
            icon: <AlertCircle className="h-2.5 w-2.5" />,
            label: 'Deceased',
            bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
        },
    };

    const { icon, label, bg } = config[status];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${bg}`}
        >
            {icon}
            {label}
        </span>
    );
};

const PatientAvatar: React.FC<{ first?: string; last?: string }> = ({
    first,
    last,
}) => {
    const initials = `${first?.charAt(0) || '?'}${last?.charAt(0) || '?'}`;
    return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-medium text-white shadow-sm">
            {initials}
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function PatientRegistry() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [results, setResults] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const handleSearch = async (page = 1) => {
        if (!searchQuery.trim()) {
            Notiflix.Notify.warning('Please enter a search term');
            return;
        }

        setLoading(true);
        try {
            const response = await Http.post<SearchResponse>(
                '/patients/search',
                {
                    query: searchQuery,
                    type: searchType,
                    page: page,
                },
            );

            if (response.data.success) {
                const patients = response.data.data || [];
                setResults(patients);
                setHasSearched(true);
                setCurrentPage(response.data.current_page || 1);
                setTotalPages(response.data.last_page || 1);
                setTotalResults(response.data.total || 0);

                if (patients.length === 0) {
                    Notiflix.Notify.info('No patients found');
                }
            }
        } catch (error: any) {
            Notiflix.Notify.failure(
                error?.response?.data?.message || 'Search failed',
            );
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch(1);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults([]);
        setHasSearched(false);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalResults(0);
    };

    const calculateAge = (dob: string) => {
        if (!dob) return 'N/A';
        const age = Math.floor(
            (new Date().getTime() - new Date(dob).getTime()) / 3.15576e10,
        );
        return age > 0 ? age : 'N/A';
    };

    const exportToCSV = () => {
        const headers = [
            'Patient ID',
            'Name',
            'Phone',
            'Email',
            'Age',
            'Gender',
            'Blood Group',
            'Status',
        ];
        const rows = results.map((p) => [
            p.patient_number,
            `"${p.first_name} ${p.last_name}"`,
            p.phone || '',
            p.email || '',
            calculateAge(p.date_of_birth),
            p.gender || '',
            p.blood_group || '',
            p.status,
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
            '\n',
        );
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patients_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Notiflix.Notify.success(`Exported ${results.length} patient records`);
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Registry',
                    href: '/registry',
                },
                {
                    title: 'Patient',
                    href: '/',
                },
            ]}
        >
            <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-3 dark:bg-slate-900">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            Patient Registry
                        </h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Search and manage patient records
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() =>
                                (window.location.href = '/patients/create')
                            }
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            <Plus className="h-3 w-3" />
                            Add Patient
                        </button>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Users className="h-3 w-3" />
                            <span>{totalResults > 0 ? totalResults : '0'}</span>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <div className="relative min-w-[180px] flex-1">
                            <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, ID, phone, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="h-7 w-full rounded-lg border border-slate-200 pr-2 pl-7 text-[10px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                disabled={loading}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <X className="h-2.5 w-2.5 text-slate-400" />
                                </button>
                            )}
                        </div>

                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="h-7 rounded-lg border border-slate-200 px-2 pr-6 text-[10px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="all">All</option>
                            <option value="name">Name</option>
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="id">Patient ID</option>
                        </select>

                        <button
                            onClick={() => handleSearch(1)}
                            disabled={loading || !searchQuery.trim()}
                            className="flex h-7 items-center gap-1 rounded-lg bg-blue-600 px-3 text-[10px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Search className="h-3 w-3" />
                            )}
                            {loading ? 'Searching' : 'Search'}
                        </button>

                        {results.length > 0 && (
                            <button
                                onClick={exportToCSV}
                                className="flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                <Download className="h-3 w-3" />
                                Export
                            </button>
                        )}
                    </div>

                    {/* Search Info */}
                    {hasSearched && searchQuery && (
                        <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                            <span>
                                Found{' '}
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {totalResults}
                                </span>{' '}
                                patient{totalResults !== 1 ? 's' : ''}
                                {totalResults > 0 && (
                                    <span className="ml-1.5">
                                        • Page {currentPage} of {totalPages}
                                    </span>
                                )}
                            </span>
                            <button
                                onClick={clearSearch}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800/90">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            Searching...
                        </span>
                    </div>
                )}

                {/* Results */}
                {!loading && hasSearched && (
                    <>
                        {results.length > 0 ? (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm lg:block dark:border-slate-700 dark:bg-slate-800/90">
                                    <table className="w-full">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-[9px] text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                            <tr>
                                                <th className="px-2 py-1.5 text-left">
                                                    Patient
                                                </th>
                                                <th className="px-2 py-1.5 text-left">
                                                    ID
                                                </th>
                                                <th className="px-2 py-1.5 text-left">
                                                    Contact
                                                </th>
                                                <th className="px-2 py-1.5 text-left">
                                                    Details
                                                </th>
                                                <th className="px-2 py-1.5 text-center">
                                                    Status
                                                </th>
                                                <th className="px-2 py-1.5 text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[10px] dark:divide-slate-700/50">
                                            {results.map((patient) => (
                                                <tr
                                                    key={patient.id}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                >
                                                    <td className="px-2 py-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <PatientAvatar
                                                                first={
                                                                    patient.first_name
                                                                }
                                                                last={
                                                                    patient.last_name
                                                                }
                                                            />
                                                            <div>
                                                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                                                    {
                                                                        patient.first_name
                                                                    }{' '}
                                                                    {
                                                                        patient.last_name
                                                                    }
                                                                </div>
                                                                <div className="text-[8px] text-slate-500 dark:text-slate-400">
                                                                    {patient.gender ||
                                                                        'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <code className="font-mono text-[9px] text-slate-600 dark:text-slate-400">
                                                            {
                                                                patient.patient_number
                                                            }
                                                        </code>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <div className="space-y-0.5">
                                                            {patient.phone && (
                                                                <div className="flex items-center gap-1 text-[9px] text-slate-600 dark:text-slate-400">
                                                                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                                                                    <span>
                                                                        {
                                                                            patient.phone
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {patient.email && (
                                                                <div className="flex items-center gap-1 text-[9px] text-slate-600 dark:text-slate-400">
                                                                    <Mail className="h-2.5 w-2.5 text-slate-400" />
                                                                    <span className="max-w-[140px] truncate">
                                                                        {
                                                                            patient.email
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <div className="flex items-center gap-2 text-[9px] text-slate-600 dark:text-slate-400">
                                                            <Calendar className="h-2.5 w-2.5 text-slate-400" />
                                                            <span>
                                                                {calculateAge(
                                                                    patient.date_of_birth,
                                                                )}{' '}
                                                                yrs
                                                            </span>
                                                            {patient.blood_group && (
                                                                <>
                                                                    <span className="text-slate-300">
                                                                        |
                                                                    </span>
                                                                    <Heart className="h-2.5 w-2.5 text-slate-400" />
                                                                    <span className="font-mono">
                                                                        {
                                                                            patient.blood_group
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        <StatusBadge
                                                            status={
                                                                patient.status
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right">
                                                        <div className="flex justify-end gap-0.5">
                                                            <Link
                                                                href={`/patients/${patient.id}`}
                                                                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700"
                                                                title="View"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                            </Link>
                                                            <Link
                                                                href={`/patients/${patient.id}/edit`}
                                                                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700"
                                                                title="Edit"
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between border-t border-slate-200 px-2 py-1.5 dark:border-slate-700">
                                            <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                                {results.length} of{' '}
                                                {totalResults}
                                            </span>
                                            <div className="flex gap-0.5">
                                                <button
                                                    onClick={() =>
                                                        handleSearch(
                                                            currentPage - 1,
                                                        )
                                                    }
                                                    disabled={currentPage === 1}
                                                    className="rounded border border-slate-200 p-0.5 disabled:opacity-50 dark:border-slate-700"
                                                >
                                                    <ChevronLeft className="h-3 w-3" />
                                                </button>
                                                <span className="px-1.5 py-0.5 text-[9px] text-slate-600 dark:text-slate-400">
                                                    {currentPage}/{totalPages}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        handleSearch(
                                                            currentPage + 1,
                                                        )
                                                    }
                                                    disabled={
                                                        currentPage ===
                                                        totalPages
                                                    }
                                                    className="rounded border border-slate-200 p-0.5 disabled:opacity-50 dark:border-slate-700"
                                                >
                                                    <ChevronRight className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mobile Cards */}
                                <div className="space-y-1.5 lg:hidden">
                                    {results.map((patient) => (
                                        <div
                                            key={patient.id}
                                            className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/90"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <PatientAvatar
                                                        first={
                                                            patient.first_name
                                                        }
                                                        last={patient.last_name}
                                                    />
                                                    <div>
                                                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                            {patient.first_name}{' '}
                                                            {patient.last_name}
                                                        </div>
                                                        <div className="font-mono text-[8px] text-slate-500 dark:text-slate-400">
                                                            {
                                                                patient.patient_number
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                <StatusBadge
                                                    status={patient.status}
                                                />
                                            </div>
                                            <div className="mt-1.5 grid grid-cols-2 gap-0.5 text-[9px] text-slate-600 dark:text-slate-400">
                                                {patient.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-2.5 w-2.5 text-slate-400" />
                                                        {patient.phone}
                                                    </div>
                                                )}
                                                {patient.email && (
                                                    <div className="flex items-center gap-1 truncate">
                                                        <Mail className="h-2.5 w-2.5 text-slate-400" />
                                                        {patient.email}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-2.5 w-2.5 text-slate-400" />
                                                    {calculateAge(
                                                        patient.date_of_birth,
                                                    )}{' '}
                                                    yrs
                                                </div>
                                                {patient.gender && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-2.5 w-2.5 text-slate-400" />
                                                        {patient.gender}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-1.5 flex gap-1 border-t border-slate-100 pt-1.5 dark:border-slate-700">
                                                <Link
                                                    href={`/patients/${patient.id}`}
                                                    className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-200 py-1 text-[9px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                                >
                                                    <Eye className="h-2.5 w-2.5" />
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/patients/${patient.id}/edit`}
                                                    className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-50 py-1 text-[9px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                                                >
                                                    <Edit className="h-2.5 w-2.5" />
                                                    Edit
                                                </Link>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Mobile Pagination */}
                                    {totalPages > 1 && (
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() =>
                                                    handleSearch(
                                                        currentPage - 1,
                                                    )
                                                }
                                                disabled={currentPage === 1}
                                                className="flex-1 rounded-lg border border-slate-200 px-3 py-1 text-[9px] font-medium disabled:opacity-50 dark:border-slate-700"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-[9px] text-slate-600 dark:text-slate-400">
                                                {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    handleSearch(
                                                        currentPage + 1,
                                                    )
                                                }
                                                disabled={
                                                    currentPage === totalPages
                                                }
                                                className="flex-1 rounded-lg border border-slate-200 px-3 py-1 text-[9px] font-medium disabled:opacity-50 dark:border-slate-700"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            // Empty State
                            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                                    <UserSearch className="h-6 w-6 text-slate-400" />
                                </div>
                                <h3 className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                                    No patients found
                                </h3>
                                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    Try adjusting your search terms
                                </p>
                                <button
                                    onClick={clearSearch}
                                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                                >
                                    <X className="h-3 w-3" />
                                    Clear search
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Initial State */}
                {!loading && !hasSearched && (
                    <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                                <Search className="h-8 w-8 text-blue-400" />
                            </div>
                            <h3 className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                                Search Patient Records
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Enter a name, ID, phone number, or email to find
                                patients
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
