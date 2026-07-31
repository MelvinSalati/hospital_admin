// resources/js/pages/bulkstore/PurchaseRequisition.tsx

import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import {
    Plus,
    Download,
    RefreshCw,
    FileText,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    User,
    Calendar,
    DollarSign,
    Building,
    Tag,
    ShoppingCart,
    Users,
    Package,
    Send,
    Wallet,
    CreditCard,
    Lock,
    Loader2,
    X,
    Barcode,
    Landmark,
    Key,
    Check,
    AlertCircle,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Import JsBarcode for barcode generation
import JsBarcode from 'jsbarcode';

// Import the ViewPurchaseOrderModal component
import ViewPurchaseOrderModal from '@/components/modals/ViewPurchaseOrderModal';

// ============================================
// TYPES
// ============================================

interface Product {
    id: number;
    product_uuid: string;
    description: string;
    product_name: string;
    barcode: string | null;
    product_code: string;
    product_description: string | null;
    category_id: number;
    strength: string | null;
    unit: string | null;
    form: string | null;
    supplier_id: number | null;
    created_by: number | null;
    created_by_department: number | null;
    created_at: string;
    updated_at: string;
}

interface RequisitionItem {
    id: number;
    requisition_id: number;
    product_id: number;
    quantity: string;
    estimated_unit_price: string;
    estimated_total: number;
    required_by_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    product: Product;
}

interface BudgetCheck {
    has_sufficient_funds: boolean;
    budget_code: string;
    available_balance: number;
    requested_amount: number;
    budget_line: string;
    budget_holder: string;
    currency: string;
    message: string;
}

interface ApprovalCode {
    code: string;
    expires_at: string;
    valid: boolean;
}

interface PurchaseRequisition {
    id: number;
    supplier_id: number | null;
    pr_number: string;
    pr_number_id: number | null;
    requisition_id: number | null;
    department_id: number | null;
    requested_by: number | null;
    request_date: string;
    required_date: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status:
        | 'draft'
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'cancelled'
        | 'completed';
    justification: string | null;
    estimated_total: string;
    budget_code: string | null;
    cost_center: string | null;
    approved_by: number | null;
    approved_at: string | null;
    converted_to_po_id: number | null;
    funds_released: boolean;
    funds_released_at: string | null;
    funds_released_by: number | null;
    approval_code: string | null;
    approval_code_expires_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    items: RequisitionItem[];
    // Additional fields for PO view
    po_number?: string;
    supplier_name?: string;
    supplier_code?: string;
    department_name?: string;
    total_amount?: number;
    paid_amount?: number;
    balance_amount?: number;
    payment_status?: string;
    shipping_address?: string;
    special_instructions?: string;
    budget_check?: BudgetCheck;
}

interface RequisitionStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    total_value: number;
    urgent_count: number;
    high_priority_count: number;
    funds_released: number;
}

// ============================================
// CONFIGURATION
// ============================================

const PRIORITY_CONFIG: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
> = {
    low: {
        label: 'Low',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <TrendingDown className="h-3 w-3" />,
    },
    medium: {
        label: 'Medium',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Minus className="h-3 w-3" />,
    },
    high: {
        label: 'High',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        icon: <TrendingUp className="h-3 w-3" />,
    },
    urgent: {
        label: 'Urgent',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
};

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
> = {
    draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <FileText className="h-3 w-3" />,
    },
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Clock className="h-3 w-3" />,
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3 w-3" />,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <XCircle className="h-3 w-3" />,
    },
    completed: {
        label: 'Completed',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
};

// ============================================
// CUSTOM MODAL COMPONENT - Compact
// ============================================

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    showCloseButton?: boolean;
    className?: string;
    footer?: React.ReactNode;
}

const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = 'md',
    showCloseButton = true,
    className = '',
    footer,
}) => {
    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative ${maxWidthClasses[maxWidth]} flex max-h-[85vh] w-full animate-in flex-col rounded-lg bg-white shadow-2xl duration-200 fade-in zoom-in dark:bg-slate-800 ${className}`}
            >
                {/* Header - Compact */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-slate-800 dark:text-slate-200">
                            {title}
                        </h3>
                        {description && (
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="ml-2 flex-shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    {children}
                </div>

                {/* Footer - Compact */}
                {footer && (
                    <div className="flex-shrink-0 border-t border-slate-200 px-4 py-2.5 dark:border-slate-700">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PurchaseRequisition() {
    const { props } = usePage();
    const { auth } = props;

    const barcodeRef = useRef<SVGSVGElement>(null);

    const [loading, setLoading] = useState(false);
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
    const [selectedRequisition, setSelectedRequisition] =
        useState<PurchaseRequisition | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('all');

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showReleaseFundsModal, setShowReleaseFundsModal] = useState(false);
    const [showFundsReleasedModal, setShowFundsReleasedModal] = useState(false);
    // View Purchase Order Modal state
    const [showViewPOModal, setShowViewPOModal] = useState(false);

    // Form states
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalComments, setApprovalComments] = useState('');
    const [fundReleaseComments, setFundReleaseComments] = useState('');
    const [approvalCode, setApprovalCode] = useState('');
    const [rejectCode, setRejectCode] = useState('');
    const [fundReleaseCode, setFundReleaseCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Stats
    const [stats, setStats] = useState<RequisitionStats>({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        total_value: 0,
        urgent_count: 0,
        high_priority_count: 0,
        funds_released: 0,
    });

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return 'ZK0.00';
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
            .format(num)
            .replace('ZMW', 'ZK');
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDepartmentName = (departmentId: number | null) => {
        const departments: Record<number, string> = {
            1: 'Pharmacy',
            2: 'Nursing',
            3: 'Laboratory',
            4: 'Administration',
            5: 'Finance',
            6: 'Ward 2',
        };
        return departmentId
            ? departments[departmentId] || `Dept ${departmentId}`
            : 'N/A';
    };

    // Generate barcode using JsBarcode
    const generateBarcode = useCallback((code: string) => {
        if (barcodeRef.current && code) {
            try {
                JsBarcode(barcodeRef.current, code, {
                    format: 'CODE128',
                    width: 1.5,
                    height: 40,
                    displayValue: true,
                    fontSize: 12,
                    font: 'monospace',
                    textAlign: 'center',
                    textPosition: 'bottom',
                    textMargin: 3,
                    margin: 8,
                    background: '#ffffff',
                    lineColor: '#000000',
                });
            } catch (error) {
                console.error('Barcode generation failed:', error);
            }
        }
    }, []);

    // Transform requisition to purchase order format for the modal
    const transformToPurchaseOrder = (requisition: PurchaseRequisition) => {
        return {
            id: requisition.id,
            po_number: requisition.po_number || `PO-${requisition.pr_number}`,
            pr_number: requisition.pr_number,
            requisition_id: requisition.id,
            supplier_id: requisition.supplier_id || 0,
            supplier_name: requisition.supplier_name || 'N/A',
            supplier_code: requisition.supplier_code || '',
            department_id: requisition.department_id || 0,
            department_name:
                requisition.department_name ||
                getDepartmentName(requisition.department_id),
            budget_code: requisition.budget_code || 'N/A',
            order_date: requisition.request_date,
            expected_delivery_date:
                requisition.required_date || requisition.request_date,
            required_date: requisition.required_date,
            status:
                requisition.status === 'approved'
                    ? 'approved'
                    : requisition.status,
            priority: requisition.priority,
            total_amount: parseFloat(requisition.estimated_total || '0'),
            paid_amount: 0,
            balance_amount: parseFloat(requisition.estimated_total || '0'),
            payment_status: 'unpaid',
            shipping_address: requisition.shipping_address || '',
            special_instructions: requisition.justification || '',
            funds_released: requisition.funds_released || false,
            approval_code: requisition.approval_code || '',
            items:
                requisition.items?.map((item) => ({
                    id: item.id,
                    product_id: item.product_id,
                    product_name:
                        item.product?.product_name ||
                        `Product #${item.product_id}`,
                    product_code: item.product?.product_code || '',
                    quantity: parseFloat(item.quantity),
                    unit_price: parseFloat(item.estimated_unit_price || '0'),
                    total: parseFloat(item.estimated_total?.toString() || '0'),
                    received_quantity: 0,
                    remaining_quantity: parseFloat(item.quantity),
                    status: 'pending',
                })) || [],
            created_by: requisition.requested_by || 0,
            created_by_name: 'N/A',
            approved_by: requisition.approved_by || undefined,
            approved_by_name: 'N/A',
            approved_at: requisition.approved_at,
            created_at: requisition.created_at,
            updated_at: requisition.updated_at,
            justification: requisition.justification || '',
            request_date: requisition.request_date,
            items_count: requisition.items?.length || 0,
            items_sum_estimated_total: parseFloat(
                requisition.estimated_total || '0',
            ),
            // Supplier details
            supplier: {
                id: requisition.supplier_id || 0,
                supplier_name: requisition.supplier_name || 'N/A',
                supplier_code: requisition.supplier_code || '',
                address: requisition.shipping_address || '',
                phone: '',
                email: '',
                contact_person: '',
            },
            // Department details
            department: {
                id: requisition.department_id || 0,
                name:
                    requisition.department_name ||
                    getDepartmentName(requisition.department_id),
                code: '',
                description: '',
            },
        };
    };

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchRequisitions = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
            };

            if (searchTerm) params.search = searchTerm;
            if (statusFilter) params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (departmentFilter) params.department = departmentFilter;
            if (activeTab !== 'all') params.status = activeTab;

            const response = await Http.get('/admin/purchase-orders', {
                params,
            });
            const data = response.data;

            if (data.orders) {
                setRequisitions(data.orders || []);

                // Calculate stats
                const orders = data.orders || [];
                const totalValue = orders.reduce(
                    (sum: number, order: PurchaseRequisition) =>
                        sum + parseFloat(order.estimated_total || 0),
                    0,
                );

                setStats({
                    total: orders.length,
                    pending: orders.filter(
                        (o: PurchaseRequisition) => o.status === 'pending',
                    ).length,
                    approved: orders.filter(
                        (o: PurchaseRequisition) => o.status === 'approved',
                    ).length,
                    rejected: orders.filter(
                        (o: PurchaseRequisition) => o.status === 'rejected',
                    ).length,
                    total_value: totalValue,
                    urgent_count: orders.filter(
                        (o: PurchaseRequisition) => o.priority === 'urgent',
                    ).length,
                    high_priority_count: orders.filter(
                        (o: PurchaseRequisition) => o.priority === 'high',
                    ).length,
                    funds_released: orders.filter(
                        (o: PurchaseRequisition) => o.funds_released === true,
                    ).length,
                });

                setPagination((prev) => ({
                    ...prev,
                    totalItems: data.total || orders.length || 0,
                    totalPages: data.last_page || 1,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch requisitions:', error);
            toast.error('Failed to load purchase requisitions');
        } finally {
            setLoading(false);
        }
    }, [
        pagination.currentPage,
        pagination.pageSize,
        searchTerm,
        statusFilter,
        priorityFilter,
        departmentFilter,
        activeTab,
    ]);

    useEffect(() => {
        fetchRequisitions();
    }, [fetchRequisitions]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setStatusFilter('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleView = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        // Generate barcode when viewing
        setTimeout(() => {
            generateBarcode(requisition.pr_number);
        }, 100);
        // If approved, show the PO view modal instead
        if (
            requisition.status === 'approved' ||
            requisition.status === 'completed'
        ) {
            setShowViewPOModal(true);
        } else {
            setShowDetailModal(true);
        }
    };

    const handleApprove = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setApprovalComments('');
        setApprovalCode('');
        setShowApproveModal(true);
    };

    const handleReject = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setRejectionReason('');
        setRejectCode('');
        setShowRejectModal(true);
    };

    const handleDelete = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setShowDeleteModal(true);
    };

    const handleConvertToPO = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setShowConvertModal(true);
    };

    const handleViewPO = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setShowViewPOModal(true);
    };

    const handleReleaseFunds = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setFundReleaseComments('');
        setFundReleaseCode('');
        setShowReleaseFundsModal(true);
    };

    const handleConfirmApprove = async () => {
        if (!selectedRequisition) return;
        if (!approvalCode.trim()) {
            toast.error('Please enter the approval code');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-requisition/${selectedRequisition.id}/approve`,
                {
                    approval_code: approvalCode,
                    comments: approvalComments,
                    approved_by: auth?.user?.id,
                },
            );
            console.log(response);
            if (response.data.success) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} approved successfully`,
                );
                await fetchRequisitions();
                setShowApproveModal(false);
                setSelectedRequisition(null);
                setApprovalComments('');
                setApprovalCode('');
            } else {
                toast.success(response.data.message || 'Approval failed');
            }
        } catch (error: any) {
            console.error('Approval failed:', error);
            toast.error(
                error.response?.data?.message ||
                    'Failed to approve requisition. Invalid approval code?',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmReject = async () => {
        if (!selectedRequisition) return;
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        if (!rejectCode.trim()) {
            toast.error('Please enter the approval code');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-requisition/${selectedRequisition.id}/reject`,
                {
                    approval_code: rejectCode,
                    rejection_reason: rejectionReason,
                    rejected_by: auth?.user?.id || 1,
                },
            );

            if (response.data.success) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} rejected`,
                );
                await fetchRequisitions();
                setShowRejectModal(false);
                setSelectedRequisition(null);
                setRejectionReason('');
                setRejectCode('');
            } else {
                throw new Error(response.data.message || 'Rejection failed');
            }
        } catch (error: any) {
            console.error('Rejection failed:', error);
            toast.error(
                error.response?.data?.message ||
                    'Failed to reject requisition. Invalid approval code?',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedRequisition) return;
        setIsProcessing(true);
        try {
            const response = await Http.delete(
                `/admin/purchase-orders/${selectedRequisition.id}`,
            );
            if (response.data.success) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} deleted`,
                );
                await fetchRequisitions();
                setShowDeleteModal(false);
                setSelectedRequisition(null);
            } else {
                throw new Error(response.data.message || 'Delete failed');
            }
        } catch (error: any) {
            console.error('Delete failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to delete requisition',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmConvert = async () => {
        if (!selectedRequisition) return;
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-orders/${selectedRequisition.id}/convert-to-po`,
            );

            if (response.data.success) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} converted to PO successfully`,
                );
                await fetchRequisitions();
                setShowConvertModal(false);
                setSelectedRequisition(null);
            } else {
                throw new Error(response.data.message || 'Conversion failed');
            }
        } catch (error: any) {
            console.error('Conversion failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to convert to PO',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmReleaseFunds = async () => {
        if (!selectedRequisition) return;
        if (!fundReleaseCode.trim()) {
            toast.error('Please enter the approval code');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-order/${selectedRequisition.id}/release-funds`,
                {
                    approval_code: fundReleaseCode,
                    comments: fundReleaseComments,
                    released_by: auth?.user?.id || 1,
                },
            );

            if (response.data.success) {
                toast.success(
                    `Funds released for requisition ${selectedRequisition.pr_number}`,
                );
                await fetchRequisitions();
                setShowReleaseFundsModal(false);
                setShowFundsReleasedModal(true);
                setSelectedRequisition(null);
                setFundReleaseComments('');
                setFundReleaseCode('');
            } else {
                throw new Error(response.data.message || 'Fund release failed');
            }
        } catch (error: any) {
            console.error('Fund release failed:', error);
            toast.error(
                error.response?.data?.message ||
                    'Failed to release funds. Invalid approval code?',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConvertedToPO = () => {
        fetchRequisitions();
        setShowViewPOModal(false);
        toast.success('Purchase Order created successfully!');
    };

    const handleExport = () => {
        toast.success('Exporting requisitions...');
    };

    const handleRefresh = () => {
        fetchRequisitions();
        toast.success('Data refreshed');
    };

    const handleCreate = () => {
        toast.success('Create requisition functionality coming soon!');
    };

    // ============================================
    // STATS CARDS
    // ============================================

    const StatCard = ({ title, value, color, icon, subtitle }: any) => (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={`rounded-full p-1.5 ${color}`}>{icon}</div>
            </div>
        </div>
    );

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<PurchaseRequisition>[] = [
        {
            id: 'pr_number',
            label: 'PR #',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'department_id',
            label: 'Department',
            minWidth: 100,
            format: (value) => (
                <div className="flex items-center gap-1.5">
                    <Building className="h-3 w-3 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {getDepartmentName(value)}
                    </span>
                </div>
            ),
        },
        {
            id: 'priority',
            label: 'Priority',
            minWidth: 80,
            format: (value) => {
                const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;
                return (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'estimated_total',
            label: 'Total',
            minWidth: 100,
            format: (value) => (
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(value)}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 90,
            format: (value) => {
                const config = STATUS_CONFIG[value] || STATUS_CONFIG.draft;
                return (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'funds_released',
            label: 'Funds',
            minWidth: 80,
            format: (value) => (
                <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        value
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                >
                    <Wallet className="h-3 w-3" />
                    {value ? 'Released' : 'Pending'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'request_date',
            label: 'Request Date',
            minWidth: 90,
            format: (value) => (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(value)}
                </div>
            ),
            sortable: true,
        },
    ];

    const actions: Action<PurchaseRequisition>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Approve',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'success',
            onClick: handleApprove,
            show: (row) =>
                row.status === 'pending' && row.approval_code !== null,
        },
        {
            label: 'Reject',
            icon: <XCircle className="h-4 w-4" />,
            color: 'error',
            onClick: handleReject,
            show: (row) => row.status === 'pending',
        },
        {
            label: 'Release Funds',
            icon: <Wallet className="h-4 w-4" />,
            color: 'success',
            onClick: handleReleaseFunds,
            show: (row) => row.status === 'approved' && !row.funds_released,
        },
        {
            label: 'Convert to PO',
            icon: <Send className="h-4 w-4" />,
            color: 'warning',
            onClick: handleConvertToPO,
            show: (row) => row.status === 'approved' && !row.converted_to_po_id,
        },
        {
            label: 'View PO',
            icon: <FileText className="h-4 w-4" />,
            color: 'info',
            onClick: handleViewPO,
            show: (row) =>
                row.status === 'approved' && row.converted_to_po_id !== null,
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: handleDelete,
            show: (row) => row.status === 'draft' || row.status === 'rejected',
        },
    ];

    // Filter options
    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    const priorityOptions = Object.entries(PRIORITY_CONFIG).map(
        ([key, value]) => ({
            value: key,
            label: value.label,
        }),
    );

    const departmentOptions = useMemo(() => {
        return Array.from(new Set(requisitions.map((r) => r.department_id)))
            .filter(Boolean)
            .map((deptId) => ({
                value: String(deptId),
                label: getDepartmentName(deptId),
            }));
    }, [requisitions]);

    // Tabs
    const tabs = [
        {
            key: 'all',
            label: 'All',
            count: stats.total,
            icon: <FileText className="h-4 w-4" />,
        },
        {
            key: 'pending',
            label: 'Pending',
            count: stats.pending,
            icon: <Clock className="h-4 w-4" />,
        },
        {
            key: 'approved',
            label: 'Approved',
            count: stats.approved,
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            key: 'rejected',
            label: 'Rejected',
            count: stats.rejected,
            icon: <XCircle className="h-4 w-4" />,
        },
        {
            key: 'funds_released',
            label: 'Funds Released',
            count: stats.funds_released,
            icon: <Wallet className="h-4 w-4" />,
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Procurement', href: '' },
                { title: 'Purchase Requisitions', href: '' },
            ]}
        >
            <Head title="Purchase Requisitions" />

            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        icon={<ShoppingCart className="h-6 w-6" />}
                        title="Purchase Requisitions"
                        subtitle="Manage purchase requisitions and approvals"
                    />

                    {/* Table */}
                    <div className="mt-4">
                        <ReusableTable
                            columns={columns}
                            data={requisitions}
                            actions={actions}
                            loading={loading}
                            title="Purchase Requisitions"
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="created_at"
                            defaultOrder="desc"
                            filterPlaceholder="Search by PR #, department..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            additionalFilters={[
                                {
                                    key: 'priority',
                                    label: 'Priority',
                                    options: priorityOptions,
                                    value: priorityFilter,
                                    onChange: setPriorityFilter,
                                },
                                {
                                    key: 'department',
                                    label: 'Department',
                                    options: departmentOptions,
                                    value: departmentFilter,
                                    onChange: setDepartmentFilter,
                                },
                            ]}
                            emptyMessage="No purchase requisitions found"
                            onSearchChange={(value) => {
                                setSearchTerm(value);
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: 1,
                                }));
                            }}
                            onPageChange={(page) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: page,
                                }));
                            }}
                            onPageSizeChange={(size) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    pageSize: size,
                                    currentPage: 1,
                                }));
                            }}
                            pagination={{
                                currentPage: pagination.currentPage,
                                pageSize: pagination.pageSize,
                                totalItems: pagination.totalItems,
                                totalPages: pagination.totalPages,
                            }}
                        />
                    </div>
                </Container>
            </div>

            {/* ========================================== */}
            {/* DETAIL MODAL - Compact */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="Requisition Details"
                description={selectedRequisition?.pr_number}
                maxWidth="2xl"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDetailModal(false)}
                        >
                            Close
                        </Button>
                        {selectedRequisition?.status === 'pending' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        if (selectedRequisition)
                                            handleReject(selectedRequisition);
                                    }}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        if (selectedRequisition)
                                            handleApprove(selectedRequisition);
                                    }}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={
                                        !selectedRequisition?.approval_code
                                    }
                                >
                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Approve
                                </Button>
                            </>
                        )}
                    </div>
                }
            >
                {selectedRequisition && (
                    <>
                        {/* Header Info */}
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                        {selectedRequisition.pr_number}
                                    </h3>
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_CONFIG[selectedRequisition.priority]?.color || ''}`}
                                    >
                                        {
                                            PRIORITY_CONFIG[
                                                selectedRequisition.priority
                                            ]?.icon
                                        }
                                        {
                                            PRIORITY_CONFIG[
                                                selectedRequisition.priority
                                            ]?.label
                                        }
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[selectedRequisition.status]?.color || ''}`}
                                    >
                                        {
                                            STATUS_CONFIG[
                                                selectedRequisition.status
                                            ]?.icon
                                        }
                                        {
                                            STATUS_CONFIG[
                                                selectedRequisition.status
                                            ]?.label
                                        }
                                    </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Building className="h-3 w-3" />
                                    <span>
                                        {getDepartmentName(
                                            selectedRequisition.department_id,
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-3 flex-shrink-0 text-right">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Total
                                </p>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(
                                        selectedRequisition.estimated_total,
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Barcode */}
                        <div className="flex justify-center rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                            <svg ref={barcodeRef}></svg>
                        </div>

                        {/* Approval Code Display */}
                        {selectedRequisition.approval_code && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                            Approval Code
                                        </Label>
                                        <p className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                                            {selectedRequisition.approval_code}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Label className="text-[10px] text-blue-500 dark:text-blue-400">
                                            Expires
                                        </Label>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            {selectedRequisition.approval_code_expires_at
                                                ? formatDateTime(
                                                      selectedRequisition.approval_code_expires_at,
                                                  )
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-1 text-[10px] text-blue-500 dark:text-blue-400">
                                    Use this code to approve the requisition
                                </p>
                            </div>
                        )}

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Budget Code
                                </Label>
                                <p className="font-mono text-xs text-slate-800 dark:text-slate-200">
                                    {selectedRequisition.budget_code || 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Cost Center
                                </Label>
                                <p className="font-mono text-xs text-slate-800 dark:text-slate-200">
                                    {selectedRequisition.cost_center || 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Request Date
                                </Label>
                                <p className="flex items-center gap-1 text-xs text-slate-800 dark:text-slate-200">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    {formatDate(
                                        selectedRequisition.request_date,
                                    )}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Required By
                                </Label>
                                <p className="flex items-center gap-1 text-xs text-slate-800 dark:text-slate-200">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    {selectedRequisition.required_date
                                        ? formatDate(
                                              selectedRequisition.required_date,
                                          )
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Justification */}
                        {selectedRequisition.justification && (
                            <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                                <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Justification
                                </Label>
                                <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                                    {selectedRequisition.justification}
                                </p>
                            </div>
                        )}

                        {/* Items Table */}
                        {selectedRequisition.items &&
                            selectedRequisition.items.length > 0 && (
                                <div>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                            Items
                                        </Label>
                                        <Badge
                                            variant="outline"
                                            className="px-1.5 py-0.5 text-[10px]"
                                        >
                                            {selectedRequisition.items.length}
                                        </Badge>
                                    </div>
                                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-2 py-1.5 text-left text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                            Product
                                                        </th>
                                                        <th className="px-2 py-1.5 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                            Qty
                                                        </th>
                                                        <th className="px-2 py-1.5 text-right text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                            Price
                                                        </th>
                                                        <th className="px-2 py-1.5 text-right text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                            Total
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {selectedRequisition.items
                                                        .slice(0, 5)
                                                        .map((item) => (
                                                            <tr
                                                                key={item.id}
                                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                            >
                                                                <td className="px-2 py-1.5">
                                                                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                                        {item
                                                                            .product
                                                                            ?.product_name ||
                                                                            `Product #${item.product_id}`}
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-1.5 text-center">
                                                                    {parseFloat(
                                                                        item.quantity,
                                                                    ).toLocaleString()}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-right">
                                                                    {formatCurrency(
                                                                        item.estimated_unit_price,
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                                                                    {formatCurrency(
                                                                        item.estimated_total,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    {selectedRequisition.items
                                                        .length > 5 && (
                                                        <tr>
                                                            <td
                                                                colSpan={4}
                                                                className="px-2 py-1.5 text-center text-[10px] text-slate-400"
                                                            >
                                                                +{' '}
                                                                {selectedRequisition
                                                                    .items
                                                                    .length -
                                                                    5}{' '}
                                                                more items
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot className="border-t-2 border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800">
                                                    <tr>
                                                        <td
                                                            colSpan={3}
                                                            className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-300"
                                                        >
                                                            Total
                                                        </td>
                                                        <td className="px-2 py-1.5 text-right text-xs font-bold text-blue-600 dark:text-blue-400">
                                                            {formatCurrency(
                                                                selectedRequisition.estimated_total,
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-2 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <span>
                                Created:{' '}
                                {formatDateTime(selectedRequisition.created_at)}
                            </span>
                            {selectedRequisition.approved_at && (
                                <span className="text-green-600 dark:text-green-400">
                                    ✓ Approved:{' '}
                                    {formatDateTime(
                                        selectedRequisition.approved_at,
                                    )}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* APPROVE MODAL - With Approval Code */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showApproveModal}
                onClose={() => {
                    setShowApproveModal(false);
                    setApprovalCode('');
                }}
                title="Approve Requisition"
                description="Enter the approval code to authorize"
                maxWidth="md"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowApproveModal(false);
                                setApprovalCode('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmApprove}
                            disabled={isProcessing || !approvalCode.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Approve
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedRequisition && (
                    <>
                        {/* Requisition Summary */}
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Requisition #
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedRequisition.pr_number}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Department
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {getDepartmentName(
                                            selectedRequisition.department_id,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Total Amount
                                    </Label>
                                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(
                                            selectedRequisition.estimated_total,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Items
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedRequisition.items?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Approval Code Input */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="approvalCode"
                                className="text-xs font-medium"
                            >
                                Approval Code{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Key className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    id="approvalCode"
                                    type="password"
                                    className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                    placeholder="Enter approval code"
                                    value={approvalCode}
                                    onChange={(e) =>
                                        setApprovalCode(
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    autoComplete="off"
                                />
                            </div>
                            {selectedRequisition.approval_code && (
                                <p className="text-[10px] text-slate-400">
                                    Expected code:{' '}
                                    <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                                        {selectedRequisition.approval_code}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="space-y-1">
                            <Label
                                htmlFor="approvalComments"
                                className="text-xs font-medium"
                            >
                                Comments (Optional)
                            </Label>
                            <textarea
                                id="approvalComments"
                                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                placeholder="Add comments..."
                                value={approvalComments}
                                onChange={(e) =>
                                    setApprovalComments(e.target.value)
                                }
                                rows={2}
                            />
                        </div>

                        {/* Alert */}
                        <Alert className="border-green-200 bg-green-50 py-1.5 dark:border-green-800 dark:bg-green-900/20">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            <AlertTitle className="text-[10px] font-medium text-green-800 dark:text-green-300">
                                Approval Confirmation
                            </AlertTitle>
                            <AlertDescription className="text-[10px] text-green-700 dark:text-green-400">
                                This will approve the requisition for fund
                                release.
                            </AlertDescription>
                        </Alert>
                    </>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* REJECT MODAL - With Approval Code */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showRejectModal}
                onClose={() => {
                    setShowRejectModal(false);
                    setRejectCode('');
                }}
                title="Reject Requisition"
                description="Enter approval code and reason for rejection"
                maxWidth="md"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowRejectModal(false);
                                setRejectCode('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmReject}
                            disabled={
                                isProcessing ||
                                !rejectionReason.trim() ||
                                !rejectCode.trim()
                            }
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Reject
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedRequisition && (
                    <>
                        {/* Requisition Summary */}
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Requisition #
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedRequisition.pr_number}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Total
                                    </Label>
                                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(
                                            selectedRequisition.estimated_total,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Approval Code Input */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="rejectCode"
                                className="text-xs font-medium"
                            >
                                Approval Code{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Key className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    id="rejectCode"
                                    type="text"
                                    className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm uppercase focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                    placeholder="Enter approval code"
                                    value={rejectCode}
                                    onChange={(e) =>
                                        setRejectCode(
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {/* Rejection Reason */}
                        <div className="space-y-1">
                            <Label
                                htmlFor="rejectionReason"
                                className="text-xs font-medium"
                            >
                                Rejection Reason{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <textarea
                                id="rejectionReason"
                                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                placeholder="Explain why this is being rejected..."
                                value={rejectionReason}
                                onChange={(e) =>
                                    setRejectionReason(e.target.value)
                                }
                                rows={2}
                            />
                        </div>

                        {/* Alert */}
                        <Alert className="border-red-200 bg-red-50 py-1.5 dark:border-red-800 dark:bg-red-900/20">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                            <AlertTitle className="text-[10px] font-medium text-red-800 dark:text-red-300">
                                Rejection Confirmation
                            </AlertTitle>
                            <AlertDescription className="text-[10px] text-red-700 dark:text-red-400">
                                This action cannot be undone.
                            </AlertDescription>
                        </Alert>
                    </>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* DELETE MODAL - Compact */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Requisition"
                description="This action cannot be undone"
                maxWidth="sm"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmDelete}
                            disabled={isProcessing}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    Delete
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedRequisition && (
                    <>
                        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <Label className="text-[10px] text-red-600">
                                        Requisition #
                                    </Label>
                                    <p className="font-medium text-red-800 dark:text-red-300">
                                        {selectedRequisition.pr_number}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-red-600">
                                        Total
                                    </Label>
                                    <p className="font-semibold text-red-700 dark:text-red-300">
                                        {formatCurrency(
                                            selectedRequisition.estimated_total,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Alert className="border-red-200 bg-red-50 py-1.5 dark:border-red-800 dark:bg-red-900/20">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                            <AlertTitle className="text-[10px] font-medium text-red-800 dark:text-red-300">
                                Warning
                            </AlertTitle>
                            <AlertDescription className="text-[10px] text-red-700 dark:text-red-400">
                                This will permanently remove all associated
                                data.
                            </AlertDescription>
                        </Alert>
                    </>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* CONVERT TO PO MODAL - Compact */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showConvertModal}
                onClose={() => setShowConvertModal(false)}
                title="Convert to PO"
                description="Convert requisition to purchase order"
                maxWidth="sm"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConvertModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmConvert}
                            disabled={isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Converting...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-1.5 h-3.5 w-3.5" />
                                    Convert
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedRequisition && (
                    <>
                        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <Label className="text-[10px] text-blue-600">
                                        Requisition #
                                    </Label>
                                    <p className="font-medium text-blue-800 dark:text-blue-300">
                                        {selectedRequisition.pr_number}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-blue-600">
                                        Total
                                    </Label>
                                    <p className="font-semibold text-blue-700 dark:text-blue-300">
                                        {formatCurrency(
                                            selectedRequisition.estimated_total,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Alert className="border-blue-200 bg-blue-50 py-1.5 dark:border-blue-800 dark:bg-blue-900/20">
                            <AlertTriangle className="h-3.5 w-3.5 text-blue-600" />
                            <AlertTitle className="text-[10px] font-medium text-blue-800 dark:text-blue-300">
                                Confirmation
                            </AlertTitle>
                            <AlertDescription className="text-[10px] text-blue-700 dark:text-blue-400">
                                A new PO will be created automatically.
                            </AlertDescription>
                        </Alert>
                    </>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* RELEASE FUNDS MODAL - With Approval Code */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showReleaseFundsModal}
                onClose={() => {
                    setShowReleaseFundsModal(false);
                    setFundReleaseCode('');
                }}
                title="Release Funds"
                description="Enter approval code to release funds"
                maxWidth="md"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowReleaseFundsModal(false);
                                setFundReleaseCode('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmReleaseFunds}
                            disabled={isProcessing || !fundReleaseCode.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Wallet className="mr-1.5 h-3.5 w-3.5" />
                                    Release Funds
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedRequisition && (
                    <>
                        {/* Requisition Summary */}
                        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <Label className="text-[10px] text-emerald-600">
                                        Requisition #
                                    </Label>
                                    <p className="font-medium text-emerald-800 dark:text-emerald-300">
                                        {selectedRequisition.pr_number}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-emerald-600">
                                        Department
                                    </Label>
                                    <p className="font-medium text-emerald-800 dark:text-emerald-300">
                                        {getDepartmentName(
                                            selectedRequisition.department_id,
                                        )}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-[10px] text-emerald-600">
                                        Amount to Release
                                    </Label>
                                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatCurrency(
                                            selectedRequisition.estimated_total,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Approval Code Input */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="fundReleaseCode"
                                className="text-xs font-medium"
                            >
                                Approval Code{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Key className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    id="fundReleaseCode"
                                    type="text"
                                    className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm uppercase focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                    placeholder="Enter approval code"
                                    value={fundReleaseCode}
                                    onChange={(e) =>
                                        setFundReleaseCode(
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="space-y-1">
                            <Label
                                htmlFor="fundReleaseComments"
                                className="text-xs font-medium"
                            >
                                Comments (Optional)
                            </Label>
                            <textarea
                                id="fundReleaseComments"
                                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                placeholder="Add comments..."
                                value={fundReleaseComments}
                                onChange={(e) =>
                                    setFundReleaseComments(e.target.value)
                                }
                                rows={2}
                            />
                        </div>

                        {/* Alert */}
                        <Alert className="border-emerald-200 bg-emerald-50 py-1.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                            <AlertTitle className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                                Fund Release Confirmation
                            </AlertTitle>
                            <AlertDescription className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                Budget will be committed upon release.
                            </AlertDescription>
                        </Alert>
                    </>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* FUNDS RELEASED SUCCESS MODAL - Compact */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showFundsReleasedModal}
                onClose={() => setShowFundsReleasedModal(false)}
                title=""
                maxWidth="sm"
                showCloseButton={false}
                footer={
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                        onClick={() => setShowFundsReleasedModal(false)}
                    >
                        Done
                    </Button>
                }
            >
                <div className="py-2 text-center">
                    <div className="flex justify-center">
                        <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <h4 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                        Funds Released!
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Funds have been successfully released. Budget committed.
                    </p>
                </div>
            </CustomModal>

            {/* ========================================== */}
            {/* VIEW PURCHASE ORDER MODAL */}
            {/* ========================================== */}
            {selectedRequisition && (
                <ViewPurchaseOrderModal
                    isOpen={showViewPOModal}
                    onClose={() => {
                        setShowViewPOModal(false);
                        setSelectedRequisition(null);
                    }}
                    purchaseOrder={transformToPurchaseOrder(
                        selectedRequisition,
                    )}
                    onConvertToPO={
                        selectedRequisition.status === 'approved' &&
                        !selectedRequisition.converted_to_po_id
                            ? handleConvertedToPO
                            : undefined
                    }
                    onReleaseFunds={
                        selectedRequisition.status === 'approved' &&
                        !selectedRequisition.funds_released
                            ? () => handleReleaseFunds(selectedRequisition)
                            : undefined
                    }
                    userRole={
                        auth?.user?.is_admin
                            ? 'admin'
                            : auth?.user?.is_supervisor
                              ? 'supervisor'
                              : 'staff'
                    }
                />
            )}
        </AppLayout>
    );
}
