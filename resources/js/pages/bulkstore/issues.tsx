// pages/bulkstore/issues.tsx
import AppLayout from '@/layouts/app-layout';
import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Building2,
    Package,
    ArrowRight,
    X,
    FileText,
    Calendar,
    ClipboardList,
    User,
    Search,
    Filter,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronRight,
    Plus,
    Minus,
    Truck,
    ListChecks,
    Boxes,
    MapPin,
    Send,
    Eye,
    MoreVertical,
    Check,
    AlertTriangle,
    ChevronLeft,
    ChevronsLeft,
    ChevronRight as ChevronRightIcon,
    ChevronsRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Types
interface Drug {
    id: number;
    drug_name: string;
    drug_code: string;
    current_stock: number;
    unit_of_measure: string;
    category: string;
    reorder_level: number;
    location?: string;
    expiry_date?: string;
}

interface DepartmentRequest {
    id: number;
    department: string;
    department_code: string;
    request_date: string;
    status:
        | 'pending'
        | 'approved'
        | 'partially_issued'
        | 'completed'
        | 'rejected';
    priority: 'high' | 'medium' | 'low';
    total_items: number;
    items: RequestItem[];
    requested_by: string;
    notes?: string;
}

interface RequestItem {
    id: number;
    drug_id: number;
    drug_name: string;
    drug_code: string;
    requested_quantity: number;
    issued_quantity: number;
    unit_of_measure: string;
    current_stock: number;
    status: 'pending' | 'issued' | 'partial';
}

interface IssueData {
    quantity: number;
    destination: string;
    notes: string;
    issued_by: string;
    reference_number: string;
    issue_date: string;
}

interface PaginatedResponse {
    data: DepartmentRequest[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

// Modal Component - Self-contained
function Modal({
    isOpen,
    onClose,
    children,
    maxWidth = '4xl',
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-full',
    };

    const maxWidthClass =
        maxWidthClasses[maxWidth as keyof typeof maxWidthClasses] ||
        maxWidthClasses['4xl'];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto`}
            >
                {children}
            </div>
        </div>
    );
}

// Pagination Component
function Pagination({
    currentPage,
    lastPage,
    onPageChange,
    total,
    from,
    to,
}: {
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
    total: number;
    from: number;
    to: number;
}) {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(lastPage, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium">{from}</span> to{' '}
                <span className="font-medium">{to}</span> of{' '}
                <span className="font-medium">{total}</span> results
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronsLeft className="h-4 w-4 text-slate-500" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                </button>
                {pages.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                            page === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                    >
                        {page}
                    </button>
                ))}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronRightIcon className="h-4 w-4 text-slate-500" />
                </button>
                <button
                    onClick={() => onPageChange(lastPage)}
                    disabled={currentPage === lastPage}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronsRight className="h-4 w-4 text-slate-500" />
                </button>
            </div>
        </div>
    );
}

// Main Component
export default function Issues() {
    const { props } = usePage();

    // Get data from Inertia props
    const paginatedData = (props.issues as PaginatedResponse) || {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0,
    };
    const [departments, setDepartments] = useState<DepartmentRequest[]>(
        paginatedData.data || [],
    );
    const [selectedDepartment, setSelectedDepartment] =
        useState<DepartmentRequest | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
    const [selectedRequestItem, setSelectedRequestItem] =
        useState<RequestItem | null>(null);
    const [currentPage, setCurrentPage] = useState(
        paginatedData.current_page || 1,
    );
    const [lastPage, setLastPage] = useState(paginatedData.last_page || 1);
    const [total, setTotal] = useState(paginatedData.total || 0);
    const [from, setFrom] = useState(paginatedData.from || 0);
    const [to, setTo] = useState(paginatedData.to || 0);
    const [perPage] = useState(paginatedData.per_page || 15);

    // Fetch departments with filters
    const fetchDepartments = async (page = 1) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
                search: searchTerm,
                status: statusFilter,
                priority: priorityFilter,
            });

            const response = await fetch(
                `/api/bulkstore/department-requests?${params}`,
                {
                    headers: {
                        'X-CSRF-TOKEN':
                            document
                                .querySelector('meta[name="csrf-token"]')
                                ?.getAttribute('content') || '',
                    },
                },
            );
            if (response.ok) {
                const data = await response.json();
                setDepartments(data.data || []);
                setCurrentPage(data.current_page || 1);
                setLastPage(data.last_page || 1);
                setTotal(data.total || 0);
                setFrom(data.from || 0);
                setTo(data.to || 0);
            }
        } catch (error) {
            console.error('Error fetching department requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch and when filters change
    useEffect(() => {
        fetchDepartments(1);
    }, [searchTerm, statusFilter, priorityFilter]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= lastPage) {
            fetchDepartments(page);
        }
    };

    const handleIssueStock = async (issueData: IssueData) => {
        if (!selectedRequestItem) return;

        try {
            const response = await fetch('/api/bulkstore/issue-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    request_item_id: selectedRequestItem.id,
                    drug_id: selectedRequestItem.drug_id,
                    ...issueData,
                }),
            });

            if (response.ok) {
                fetchDepartments(currentPage);
                setIsIssueModalOpen(false);
                setSelectedDrug(null);
                setSelectedRequestItem(null);
            }
        } catch (error) {
            console.error('Error issuing stock:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'approved':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'partially_issued':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'text-red-600 dark:text-red-400';
            case 'medium':
                return 'text-orange-600 dark:text-orange-400';
            case 'low':
                return 'text-blue-600 dark:text-blue-400';
            default:
                return 'text-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-3.5 w-3.5" />;
            case 'approved':
                return <CheckCircle className="h-3.5 w-3.5" />;
            case 'partially_issued':
                return <AlertTriangle className="h-3.5 w-3.5" />;
            case 'completed':
                return <Check className="h-3.5 w-3.5" />;
            case 'rejected':
                return <AlertCircle className="h-3.5 w-3.5" />;
            default:
                return null;
        }
    };

    return (
        <AppLayout>
            <div className="h-full bg-slate-50 p-4 dark:bg-slate-900">
                {/* Header */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Stock Issues
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Manage department requests and issue stock from bulk
                            store
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className="bg-white dark:bg-slate-800"
                        >
                            <Clock className="mr-1 h-3 w-3" />
                            Pending:{' '}
                            {
                                departments.filter(
                                    (d) => d.status === 'pending',
                                ).length
                            }
                        </Badge>
                        <Badge
                            variant="outline"
                            className="bg-white dark:bg-slate-800"
                        >
                            <Package className="mr-1 h-3 w-3" />
                            Total: {total}
                        </Badge>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
                    <div className="min-w-[200px] flex-1">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by department or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 w-full rounded-lg border border-slate-200 pr-3 pl-9 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="partially_issued">
                            Partially Issued
                        </option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="all">All Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    <button
                        onClick={() => fetchDepartments(1)}
                        disabled={isLoading}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Loader2
                            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                        />
                        {isLoading ? 'Loading...' : 'Apply Filters'}
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Department
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Code
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Items
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Status
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Priority
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Requested By
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Date
                                    </th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td
                                                colSpan={8}
                                                className="px-4 py-3"
                                            >
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                                    <span className="ml-2 text-sm text-slate-500">
                                                        Loading...
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : departments.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-8 text-center"
                                        >
                                            <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                No department requests found
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                                Try adjusting your filters
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    departments.map((dept) => (
                                        <tr
                                            key={dept.id}
                                            className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                            onClick={() =>
                                                setSelectedDepartment(dept)
                                            }
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                        {dept.department}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                                                {dept.department_code}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                                                {dept.total_items} items
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <Badge
                                                    className={`flex w-fit items-center gap-1 ${getStatusColor(dept.status)}`}
                                                >
                                                    {getStatusIcon(dept.status)}
                                                    {dept.status.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <Badge
                                                    variant="outline"
                                                    className={getPriorityColor(
                                                        dept.priority,
                                                    )}
                                                >
                                                    {dept.priority}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3 text-slate-400" />
                                                    {dept.requested_by}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    {new Date(
                                                        dept.request_date,
                                                    ).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDepartment(
                                                            dept,
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!isLoading && departments.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            lastPage={lastPage}
                            onPageChange={handlePageChange}
                            total={total}
                            from={from}
                            to={to}
                        />
                    )}
                </div>

                {/* Department Detail Modal */}
                <Modal
                    isOpen={!!selectedDepartment}
                    onClose={() => setSelectedDepartment(null)}
                    maxWidth="4xl"
                >
                    {selectedDepartment && (
                        <DepartmentDetailContent
                            department={selectedDepartment}
                            onClose={() => setSelectedDepartment(null)}
                            onIssueStock={(
                                drug: Drug,
                                requestItem: RequestItem,
                            ) => {
                                setSelectedDrug(drug);
                                setSelectedRequestItem(requestItem);
                                setIsIssueModalOpen(true);
                                setSelectedDepartment(null);
                            }}
                        />
                    )}
                </Modal>

                {/* Issue Stock Modal */}
                <Modal
                    isOpen={isIssueModalOpen}
                    onClose={() => {
                        setIsIssueModalOpen(false);
                        setSelectedDrug(null);
                        setSelectedRequestItem(null);
                    }}
                    maxWidth="2xl"
                >
                    {selectedDrug && selectedRequestItem && (
                        <IssueStockContent
                            drug={selectedDrug}
                            requestItem={selectedRequestItem}
                            onClose={() => {
                                setIsIssueModalOpen(false);
                                setSelectedDrug(null);
                                setSelectedRequestItem(null);
                            }}
                            onConfirm={handleIssueStock}
                        />
                    )}
                </Modal>
            </div>
        </AppLayout>
    );
}

// Department Detail Content
function DepartmentDetailContent({
    department,
    onClose,
    onIssueStock,
}: {
    department: DepartmentRequest;
    onClose: () => void;
    onIssueStock: (drug: Drug, requestItem: RequestItem) => void;
}) {
    const [searchItem, setSearchItem] = useState('');

    const filteredItems = department.items.filter(
        (item) =>
            item.drug_name.toLowerCase().includes(searchItem.toLowerCase()) ||
            item.drug_code.toLowerCase().includes(searchItem.toLowerCase()),
    );

    return (
        <div className="rounded-xl bg-white shadow-2xl dark:bg-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {department.department}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {department.department_code} •{' '}
                            {department.total_items} items requested
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(department.status)}>
                        {department.status.replace('_', ' ')}
                    </Badge>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Summary Cards */}
                <div className="mb-4 grid grid-cols-4 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Total Items
                        </p>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            {department.total_items}
                        </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Issued
                        </p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {
                                department.items.filter(
                                    (i) => i.status === 'issued',
                                ).length
                            }
                        </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Pending
                        </p>
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                            {
                                department.items.filter(
                                    (i) => i.status === 'pending',
                                ).length
                            }
                        </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Partial
                        </p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {
                                department.items.filter(
                                    (i) => i.status === 'partial',
                                ).length
                            }
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchItem}
                        onChange={(e) => setSearchItem(e.target.value)}
                        className="h-8 w-full rounded-lg border border-slate-200 pr-3 pl-9 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                    Item
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                    Requested
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                    Issued
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                    Available
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                    Status
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredItems.map((item) => (
                                <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                {item.drug_name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                            >
                                                {item.drug_code}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                        {item.requested_quantity}{' '}
                                        {item.unit_of_measure}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                        {item.issued_quantity}{' '}
                                        {item.unit_of_measure}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                        <span
                                            className={
                                                item.current_stock < 10
                                                    ? 'font-medium text-red-600 dark:text-red-400'
                                                    : ''
                                            }
                                        >
                                            {item.current_stock}{' '}
                                            {item.unit_of_measure}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <Badge
                                            className={getStatusColor(
                                                item.status,
                                            )}
                                        >
                                            {item.status}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {item.status !== 'issued' &&
                                            item.current_stock > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const drug: Drug = {
                                                            id: item.drug_id,
                                                            drug_name:
                                                                item.drug_name,
                                                            drug_code:
                                                                item.drug_code,
                                                            current_stock:
                                                                item.current_stock,
                                                            unit_of_measure:
                                                                item.unit_of_measure,
                                                            category: '',
                                                            reorder_level: 0,
                                                        };
                                                        onIssueStock(
                                                            drug,
                                                            item,
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                                                >
                                                    <Send className="h-3 w-3" />
                                                    Issue
                                                </button>
                                            )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    Requested:{' '}
                    {new Date(department.request_date).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    {department.requested_by}
                </div>
            </div>
        </div>
    );
}

// Issue Stock Content
function IssueStockContent({
    drug,
    requestItem,
    onClose,
    onConfirm,
}: {
    drug: Drug;
    requestItem: RequestItem;
    onClose: () => void;
    onConfirm: (data: IssueData) => void;
}) {
    const [quantity, setQuantity] = useState(requestItem.requested_quantity);
    const [destination, setDestination] = useState('');
    const [notes, setNotes] = useState('');
    const [issuedBy, setIssuedBy] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [issueDate] = useState(new Date().toISOString().split('T')[0]);

    const maxStock = drug.current_stock || 0;
    const requestedQuantity = requestItem.requested_quantity || 0;
    const remainingQuantity = requestedQuantity - requestItem.issued_quantity;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            quantity > 0 &&
            quantity <= maxStock &&
            quantity <= remainingQuantity
        ) {
            onConfirm({
                quantity,
                destination,
                notes,
                issued_by: issuedBy || 'System',
                reference_number: referenceNumber || `ISS-${Date.now()}`,
                issue_date: issueDate,
            });
        }
    };

    return (
        <div className="rounded-xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-orange-100 p-1.5 dark:bg-orange-900/30">
                        <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            Issue Stock
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {drug.drug_name} • {drug.drug_code}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <X className="h-4 w-4 text-slate-500" />
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-5">
                    {/* Stock Info */}
                    <div className="mb-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-800/30 dark:bg-blue-950/20">
                            <p className="text-[10px] text-blue-700 dark:text-blue-400">
                                Available
                            </p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                {maxStock}{' '}
                                <span className="text-xs">
                                    {drug.unit_of_measure}
                                </span>
                            </p>
                        </div>
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-800/30 dark:bg-yellow-950/20">
                            <p className="text-[10px] text-yellow-700 dark:text-yellow-400">
                                Requested
                            </p>
                            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                                {requestedQuantity}{' '}
                                <span className="text-xs">
                                    {drug.unit_of_measure}
                                </span>
                            </p>
                        </div>
                        <div className="rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-800/30 dark:bg-green-950/20">
                            <p className="text-[10px] text-green-700 dark:text-green-400">
                                Remaining
                            </p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-400">
                                {remainingQuantity}{' '}
                                <span className="text-xs">
                                    {drug.unit_of_measure}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                            <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <Package className="h-3 w-3" />
                                    Quantity to Issue{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative mt-0.5">
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) =>
                                            setQuantity(
                                                parseInt(e.target.value) || 0,
                                            )
                                        }
                                        className={`h-8 w-full rounded-lg border px-3 pr-16 text-sm focus:ring-1 focus:outline-none ${
                                            quantity > maxStock ||
                                            quantity > remainingQuantity
                                                ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                                                : 'border-slate-200 focus:border-orange-400 focus:ring-orange-400 dark:border-slate-700'
                                        } dark:bg-slate-800 dark:text-slate-100`}
                                        min="1"
                                        max={Math.min(
                                            maxStock,
                                            remainingQuantity,
                                        )}
                                        placeholder="Enter quantity"
                                        required
                                    />
                                    <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-slate-400">
                                        max{' '}
                                        {Math.min(maxStock, remainingQuantity)}
                                    </span>
                                </div>
                                {quantity > remainingQuantity && (
                                    <p className="mt-1 text-[10px] text-red-500">
                                        ⚠️ Quantity exceeds remaining requested
                                        amount
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <Building2 className="h-3 w-3" />
                                    Destination Department{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) =>
                                        setDestination(e.target.value)
                                    }
                                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    placeholder="Department name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <User className="h-3 w-3" />
                                    Issued By{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={issuedBy}
                                    onChange={(e) =>
                                        setIssuedBy(e.target.value)
                                    }
                                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    placeholder="Your name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <FileText className="h-3 w-3" />
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    value={referenceNumber}
                                    onChange={(e) =>
                                        setReferenceNumber(e.target.value)
                                    }
                                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    placeholder={`ISS-${Date.now()}`}
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <ClipboardList className="h-3 w-3" />
                                Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                rows={2}
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                            Current: {maxStock} {drug.unit_of_measure}
                        </div>
                        {quantity > 0 &&
                            quantity <= maxStock &&
                            quantity <= remainingQuantity && (
                                <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                    New Balance: {maxStock - quantity}{' '}
                                    {drug.unit_of_measure}
                                </div>
                            )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={
                                quantity <= 0 ||
                                quantity > maxStock ||
                                quantity > remainingQuantity
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send className="h-3.5 w-3.5" />
                            Issue Stock
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// Helper function for status colors
function getStatusColor(status: string) {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'approved':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        case 'partially_issued':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
        case 'completed':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        case 'rejected':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'issued':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        case 'partial':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}
