// pages/bulkstore/issues.tsx
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
    Outdent,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Issue Products',
        href: '/bulkstore/issue',
    },
];

// Helper function for status colors
const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        pending:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        approved:
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        partially_issued:
            'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        completed:
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        rejected:
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        issued: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        partial:
            'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
        pending: <Clock className="h-3 w-3" />,
        approved: <CheckCircle className="h-3 w-3" />,
        partially_issued: <AlertTriangle className="h-3 w-3" />,
        completed: <Check className="h-3 w-3" />,
        rejected: <AlertCircle className="h-3 w-3" />,
    };
    return icons[status] || null;
};

const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
        high: 'text-red-600 dark:text-red-400 border-red-600',
        medium: 'text-orange-600 dark:text-orange-400 border-orange-600',
        low: 'text-blue-600 dark:text-blue-400 border-blue-600',
    };
    return colors[priority] || 'text-gray-600';
};

// Main Component
export default function Issues() {
    const { props } = usePage();
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
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({
        currentPage: paginatedData.current_page || 1,
        pageSize: paginatedData.per_page || 15,
        totalItems: paginatedData.total || 0,
        totalPages: paginatedData.last_page || 1,
    });

    // Modal states
    const [selectedDepartment, setSelectedDepartment] =
        useState<DepartmentRequest | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
    const [selectedRequestItem, setSelectedRequestItem] =
        useState<RequestItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch departments
    const fetchDepartments = useCallback(
        async (page = 1, search = '', status = 'all', priority = 'all') => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    per_page: pagination.pageSize.toString(),
                    search: search,
                    status: status,
                    priority: priority,
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
                    setPagination({
                        currentPage: data.current_page || 1,
                        pageSize: data.per_page || 15,
                        totalItems: data.total || 0,
                        totalPages: data.last_page || 1,
                    });
                }
            } catch (error) {
                console.error('Error fetching department requests:', error);
                toast.error('Failed to load department requests');
            } finally {
                setLoading(false);
            }
        },
        [pagination.pageSize],
    );

    // Initial fetch
    useEffect(() => {
        fetchDepartments(1, searchTerm, statusFilter, priorityFilter);
    }, [fetchDepartments, searchTerm, statusFilter, priorityFilter]);

    // Handle page change
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.totalPages) {
            fetchDepartments(page, searchTerm, statusFilter, priorityFilter);
        }
    };

    // Handle page size change
    const handlePageSizeChange = (size: number) => {
        setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
        fetchDepartments(1, searchTerm, statusFilter, priorityFilter);
    };

    // Handle issue stock
    const handleIssueStock = async (issueData: IssueData) => {
        if (!selectedRequestItem) return;
        setIsProcessing(true);

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
                toast.success('Stock issued successfully');
                setIsIssueModalOpen(false);
                setSelectedDrug(null);
                setSelectedRequestItem(null);
                fetchDepartments(
                    pagination.currentPage,
                    searchTerm,
                    statusFilter,
                    priorityFilter,
                );
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to issue stock');
            }
        } catch (error) {
            console.error('Error issuing stock:', error);
            toast.error('Failed to issue stock');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle view department
    const handleViewDepartment = (department: DepartmentRequest) => {
        setSelectedDepartment(department);
        setIsDetailModalOpen(true);
    };

    // Handle issue from detail
    const handleIssueFromDetail = (drug: Drug, requestItem: RequestItem) => {
        setSelectedDrug(drug);
        setSelectedRequestItem(requestItem);
        setIsDetailModalOpen(false);
        setIsIssueModalOpen(true);
    };

    // Columns for ReusableTable
    const columns: Column<DepartmentRequest>[] = [
        {
            id: 'department',
            label: 'Department',
            minWidth: 180,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <div>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                            {row.department}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {row.department_code}
                        </p>
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'total_items',
            label: 'Items',
            minWidth: 80,
            align: 'center',
            format: (value) => (
                <Badge variant="outline" className="text-xs">
                    {value} items
                </Badge>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 120,
            format: (value) => (
                <Badge
                    className={`flex w-fit items-center gap-1 ${getStatusColor(value)}`}
                >
                    {getStatusIcon(value)}
                    {value?.replace('_', ' ') || 'N/A'}
                </Badge>
            ),
            sortable: true,
        },
        {
            id: 'priority',
            label: 'Priority',
            minWidth: 80,
            format: (value) => (
                <Badge variant="outline" className={getPriorityColor(value)}>
                    {value}
                </Badge>
            ),
            sortable: true,
        },
        {
            id: 'requested_by',
            label: 'Requested By',
            minWidth: 120,
            format: (value) => (
                <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {value || 'N/A'}
                    </span>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'request_date',
            label: 'Date',
            minWidth: 120,
            format: (value) => (
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        {value ? new Date(value).toLocaleDateString() : 'N/A'}
                    </span>
                </div>
            ),
            sortable: true,
        },
    ];

    // Actions for ReusableTable
    const actions: Action<DepartmentRequest>[] = [
        {
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleViewDepartment,
        },
        {
            label: 'Issue Stock',
            icon: <Send className="h-4 w-4" />,
            color: 'success',
            onClick: (row) => {
                // Open detail modal first to select items
                handleViewDepartment(row);
            },
            show: (row) =>
                row.status !== 'completed' && row.status !== 'rejected',
        },
    ];

    // Status options for filter
    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'partially_issued', label: 'Partially Issued' },
        { value: 'completed', label: 'Completed' },
        { value: 'rejected', label: 'Rejected' },
    ];

    // Additional filters
    const additionalFilters = [
        {
            key: 'priority',
            label: 'Priority',
            options: [
                { value: 'all', label: 'All Priority' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
            ],
            value: priorityFilter,
            onChange: (value: string) => {
                setPriorityFilter(value);
                setPagination((prev) => ({ ...prev, currentPage: 1 }));
            },
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full bg-blue-50 p-4 dark:bg-slate-900">
                <PageHeader
                    icon={<Outdent className="h-6 w-6" />}
                    title="Department Requests"
                    subtitle="Manage department requests and issue stock from bulk store"
                />

                {/* Table */}
                <div className="mt-4">
                    <ReusableTable
                        columns={columns}
                        data={departments}
                        actions={actions}
                        loading={loading}
                        title="Department Requests"
                        rowsPerPageOptions={[10, 15, 25, 50, 100]}
                        defaultRowsPerPage={15}
                        defaultOrderBy="request_date"
                        defaultOrder="desc"
                        filterPlaceholder="Search by department or code..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        additionalFilters={additionalFilters}
                        emptyMessage="No department requests found"
                        onSearchChange={(value) => {
                            setSearchTerm(value);
                            setPagination((prev) => ({
                                ...prev,
                                currentPage: 1,
                            }));
                        }}
                        onStatusChange={(value) => {
                            setStatusFilter(value);
                            setPagination((prev) => ({
                                ...prev,
                                currentPage: 1,
                            }));
                        }}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        pagination={{
                            currentPage: pagination.currentPage,
                            pageSize: pagination.pageSize,
                            totalItems: pagination.totalItems,
                            totalPages: pagination.totalPages,
                        }}
                    />
                </div>

                {/* Department Detail Modal */}
                {selectedDepartment && (
                    <DepartmentDetailModal
                        isOpen={isDetailModalOpen}
                        department={selectedDepartment}
                        onClose={() => {
                            setIsDetailModalOpen(false);
                            setSelectedDepartment(null);
                        }}
                        onIssueStock={handleIssueFromDetail}
                    />
                )}

                {/* Issue Stock Modal */}
                {selectedDrug && selectedRequestItem && (
                    <IssueStockModal
                        isOpen={isIssueModalOpen}
                        drug={selectedDrug}
                        requestItem={selectedRequestItem}
                        onClose={() => {
                            setIsIssueModalOpen(false);
                            setSelectedDrug(null);
                            setSelectedRequestItem(null);
                        }}
                        onConfirm={handleIssueStock}
                        isProcessing={isProcessing}
                    />
                )}
            </div>
        </AppLayout>
    );
}

// ============================================
// Department Detail Modal
// ============================================

interface DepartmentDetailModalProps {
    isOpen: boolean;
    department: DepartmentRequest;
    onClose: () => void;
    onIssueStock: (drug: Drug, requestItem: RequestItem) => void;
}

function DepartmentDetailModal({
    isOpen,
    department,
    onClose,
    onIssueStock,
}: DepartmentDetailModalProps) {
    const [searchItem, setSearchItem] = useState('');

    if (!isOpen) return null;

    const filteredItems = department.items.filter(
        (item) =>
            item.drug_name.toLowerCase().includes(searchItem.toLowerCase()) ||
            item.drug_code.toLowerCase().includes(searchItem.toLowerCase()),
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-800">
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
                            {getStatusIcon(department.status)}
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
        </div>
    );
}

// ============================================
// Issue Stock Modal
// ============================================

interface IssueStockModalProps {
    isOpen: boolean;
    drug: Drug;
    requestItem: RequestItem;
    onClose: () => void;
    onConfirm: (data: IssueData) => void;
    isProcessing: boolean;
}

function IssueStockModal({
    isOpen,
    drug,
    requestItem,
    onClose,
    onConfirm,
    isProcessing,
}: IssueStockModalProps) {
    const [quantity, setQuantity] = useState(requestItem.requested_quantity);
    const [destination, setDestination] = useState('');
    const [notes, setNotes] = useState('');
    const [issuedBy, setIssuedBy] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [issueDate] = useState(new Date().toISOString().split('T')[0]);

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-800">
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
                                                    parseInt(e.target.value) ||
                                                        0,
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
                                            {Math.min(
                                                maxStock,
                                                remainingQuantity,
                                            )}
                                        </span>
                                    </div>
                                    {quantity > remainingQuantity && (
                                        <p className="mt-1 text-[10px] text-red-500">
                                            ⚠️ Quantity exceeds remaining
                                            requested amount
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
                                    quantity > remainingQuantity ||
                                    isProcessing
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-3.5 w-3.5" />
                                        Issue Stock
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
