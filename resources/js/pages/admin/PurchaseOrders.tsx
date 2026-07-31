// resources/js/pages/bulkstore/PurchaseOrder.tsx

import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { useEffect, useState, useCallback } from 'react';
import Http from '@/utils/Http';
import { toast } from 'react-hot-toast';
import {
    Eye,
    Wallet,
    CheckCircle,
    XCircle,
    Clock,
    Send,
    Building,
    Package,
    Key,
    Loader2,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ViewPurchaseOrderModal from '@/components/modals/ViewPurchaseOrderModal';
import { usePage } from '@inertiajs/react';

// ============================================
// TYPES
// ============================================

interface PurchaseOrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity: number;
    unit_price: number;
    total: number;
    estimated_unit_price?: string | number;
    estimated_total?: string | number;
    received_quantity?: number;
    remaining_quantity?: number;
    status?: string;
    product?: {
        id: number;
        product_name: string;
        product_code: string;
        description?: string;
        strength?: string;
        form?: string;
        unit?: string;
    };
}

interface PurchaseOrder {
    id: number;
    po_number?: string;
    pr_number: string;
    requisition_id: number | null;
    supplier_id: number | null;
    supplier_name?: string;
    supplier_code?: string;
    supplier?: {
        id: number;
        supplier_name: string;
        supplier_code: string;
        address?: string;
        city?: string;
        country?: string;
        phone?: string;
        email?: string;
        contact_person?: string;
        payment_terms?: string;
        delivery_terms?: string;
        rating?: number;
        is_preferred?: boolean;
    };
    department_id: number;
    department_name?: string;
    department?: {
        id: number;
        name: string;
        code: string;
        description: string;
    };
    budget_code: string;
    budget_name?: string;
    order_date?: string;
    request_date?: string;
    expected_delivery_date?: string;
    required_date?: string;
    delivery_date?: string;
    status: string;
    priority: string;
    total_amount?: number;
    estimated_total?: string | number;
    paid_amount?: number;
    balance_amount?: number;
    payment_status?: string;
    shipping_address?: string;
    special_instructions?: string;
    items: PurchaseOrderItem[];
    created_by: number;
    created_by_name?: string;
    approved_by?: number;
    approved_by_name?: string;
    approved_at?: string;
    created_at: string;
    updated_at: string;
    justification?: string;
    items_count?: number;
    shipping_terms?: string;
    shipping_method?: string;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
    other_cost?: number;
    notes?: string;
    funds_released: boolean | number;
    funds_released_at?: string;
    funds_released_by?: number;
    converted_to_po_id?: number | null;
    budget_allocation?: any;
    approval_code?: string | null;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
    company_website?: string;
}

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
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                className={`relative ${maxWidthClasses[maxWidth]} flex max-h-[85vh] w-full animate-in flex-col rounded-lg bg-white shadow-2xl duration-200 fade-in zoom-in dark:bg-slate-800 ${className}`}
            >
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
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    {children}
                </div>
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
// TRANSFORM FUNCTION - Maps API data to modal format
// ============================================

const transformToPurchaseOrder = (requisition: any): any => {
    // Calculate total from items
    let calculatedTotal = 0;
    const transformedItems = (requisition.items || []).map((item: any) => {
        const unitPrice = parseFloat(item.estimated_unit_price || 0);
        const quantity = parseFloat(item.quantity || 0);
        const total = parseFloat(item.estimated_total || 0);
        calculatedTotal += total;

        return {
            id: item.id,
            product_id: item.product_id,
            product_name:
                item.product?.product_name || `Product #${item.product_id}`,
            product_code: item.product?.product_code || 'N/A',
            quantity: quantity,
            unit_price: unitPrice,
            total: total,
            estimated_unit_price: item.estimated_unit_price,
            estimated_total: item.estimated_total,
            product: item.product || {
                id: item.product_id,
                product_name:
                    item.product?.product_name || `Product #${item.product_id}`,
                product_code: item.product?.product_code || 'N/A',
                description: item.product?.description || '',
                strength: item.product?.strength || '',
                form: item.product?.form || '',
                unit: item.product?.unit || '',
            },
        };
    });

    const totalAmount = parseFloat(
        requisition.estimated_total || calculatedTotal || 0,
    );

    return {
        id: requisition.id,
        po_number: `PO-${requisition.pr_number}`,
        pr_number: requisition.pr_number,
        requisition_id: requisition.id,
        supplier_id: requisition.supplier_id || 0,
        supplier_name:
            requisition.supplier?.name || requisition.supplier_name || 'N/A',
        supplier_code:
            requisition.supplier?.code || requisition.supplier_code || '',
        supplier: requisition.supplier || {
            id: requisition.supplier_id || 0,
            supplier_name:
                requisition.supplier?.name ||
                requisition.supplier_name ||
                'N/A',
            supplier_code:
                requisition.supplier?.code || requisition.supplier_code || '',
            address: requisition.supplier?.address || '',
            phone: requisition.supplier?.phone || '',
            email: requisition.supplier?.email || '',
            contact_person: requisition.supplier?.contact_person || '',
            payment_terms: requisition.supplier?.payment_terms || 'Net 30',
        },
        department_id: requisition.department_id || 0,
        department_name:
            requisition.department?.name ||
            requisition.department_name ||
            'N/A',
        department: requisition.department || {
            id: requisition.department_id || 0,
            name:
                requisition.department?.name ||
                requisition.department_name ||
                'N/A',
            code: requisition.department?.code || '',
            description: requisition.department?.description || '',
        },
        budget_code: requisition.budget_code || 'N/A',
        budget_name: requisition.budget_allocation?.budget_name || '',
        order_date: requisition.request_date || requisition.created_at,
        request_date: requisition.request_date || requisition.created_at,
        expected_delivery_date:
            requisition.required_date ||
            requisition.request_date ||
            requisition.created_at,
        required_date: requisition.required_date,
        status: requisition.status,
        priority: requisition.priority,
        total_amount: totalAmount,
        paid_amount: 0,
        balance_amount: totalAmount,
        payment_status: requisition.funds_released ? 'Paid' : 'Unpaid',
        shipping_address: requisition.shipping_address || '',
        special_instructions: requisition.justification || '',
        items: transformedItems,
        created_by: requisition.requested_by || 0,
        created_by_name: requisition.requester?.name || 'N/A',
        approved_by: requisition.approved_by,
        approved_by_name: requisition.approver?.name || 'N/A',
        approved_at: requisition.approved_at,
        created_at: requisition.created_at,
        updated_at: requisition.updated_at,
        justification: requisition.justification || '',
        items_count: requisition.items?.length || 0,
        funds_released:
            requisition.funds_released === 1 ||
            requisition.funds_released === true,
        converted_to_po_id: requisition.converted_to_po_id,
        approval_code: requisition.approval_code || null,
        shipping_terms: requisition.shipping_terms || 'Freight on Board',
        shipping_method: requisition.shipping_method || 'Land',
        company_name: 'EasyBill Solutions',
        company_address: 'Plot 123, Lusaka, Zambia',
        company_phone: '+260 211 123 456',
        company_email: 'info@easybill.com',
        company_website: 'www.easybill.com',
    };
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PurchaseOrder() {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
        null,
    );
    const { auth } = usePage().props;
    const [showViewModal, setShowViewModal] = useState(false);
    const [showReleaseFundsModal, setShowReleaseFundsModal] = useState(false);
    const [showFundsReleasedModal, setShowFundsReleasedModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fundReleaseCode, setFundReleaseCode] = useState('');
    const [fundReleaseComments, setFundReleaseComments] = useState('');

    const fetchPurchaseOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await Http.get('/admin/purchase-orders/approved');
            if (response.data) {
                const orders = Array.isArray(response.data)
                    ? response.data
                    : response.data.orders || [];
                setPurchaseOrders(orders);
            } else {
                toast.error('Failed to fetch purchase orders');
            }
        } catch (error: any) {
            console.error('Failed to fetch purchase orders:', error);
            toast.error(
                error.response?.data?.message ||
                    'Failed to fetch purchase orders',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    const handleView = (order: PurchaseOrder) => {
        // Transform the order data before passing to modal
        const transformedOrder = transformToPurchaseOrder(order);
        setSelectedOrder(transformedOrder);
        setShowViewModal(true);
    };

    const handleReleaseFunds = (order: PurchaseOrder) => {
        // Transform first to ensure we have the right data
        const transformedOrder = transformToPurchaseOrder(order);
        setSelectedOrder(transformedOrder);
        setFundReleaseCode('');
        setFundReleaseComments('');
        setShowReleaseFundsModal(true);
    };

    const handleConfirmReleaseFunds = async () => {
        if (!selectedOrder) return;
        if (!fundReleaseCode.trim()) {
            toast.error('Please enter the approval code');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-order/${selectedOrder.id}/release-funds`,
                {
                    approval_code: fundReleaseCode,
                    comments: fundReleaseComments,
                    released_by: auth.user.id,
                },
            );

            if (response.data.success) {
                toast.success(
                    `Funds released for order ${selectedOrder.pr_number}`,
                );
                await fetchPurchaseOrders();
                setShowReleaseFundsModal(false);
                setShowFundsReleasedModal(true);
                setSelectedOrder(null);
                setFundReleaseCode('');
                setFundReleaseComments('');
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

    const handleConvertToPO = (order: PurchaseOrder) => {
        toast.success(`Converting order ${order.pr_number} to PO`);
    };

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return 'K 0.00';
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<
            string,
            { color: string; label: string; bg: string }
        > = {
            draft: {
                color: 'text-gray-800',
                label: 'Draft',
                bg: 'bg-gray-100',
            },
            pending: {
                color: 'text-yellow-800',
                label: 'Pending',
                bg: 'bg-yellow-100',
            },
            approved: {
                color: 'text-blue-800',
                label: 'Approved',
                bg: 'bg-blue-100',
            },
            sent: {
                color: 'text-purple-800',
                label: 'Sent',
                bg: 'bg-purple-100',
            },
            received: {
                color: 'text-green-800',
                label: 'Received',
                bg: 'bg-green-100',
            },
            partial: {
                color: 'text-orange-800',
                label: 'Partial',
                bg: 'bg-orange-100',
            },
            cancelled: {
                color: 'text-red-800',
                label: 'Cancelled',
                bg: 'bg-red-100',
            },
            completed: {
                color: 'text-emerald-800',
                label: 'Completed',
                bg: 'bg-emerald-100',
            },
        };
        return statusMap[status] || statusMap.draft;
    };

    const getPriorityBadge = (priority: string) => {
        const priorityMap: Record<
            string,
            { color: string; label: string; bg: string }
        > = {
            low: { color: 'text-blue-800', label: 'Low', bg: 'bg-blue-100' },
            medium: {
                color: 'text-yellow-800',
                label: 'Medium',
                bg: 'bg-yellow-100',
            },
            high: {
                color: 'text-orange-800',
                label: 'High',
                bg: 'bg-orange-100',
            },
            urgent: {
                color: 'text-red-800',
                label: 'Urgent',
                bg: 'bg-red-100',
            },
        };
        return priorityMap[priority] || priorityMap.medium;
    };

    // Column definitions for the table
    const columns = [
        {
            id: 'pr_number',
            label: 'PR #',
            minWidth: 120,
            format: (value: string) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'department',
            label: 'Department',
            minWidth: 120,
            format: (value: any) => {
                const name = value?.name || value?.department_name || 'N/A';
                return (
                    <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            {name}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'supplier',
            label: 'Supplier',
            minWidth: 130,
            format: (value: any) => {
                const name = value?.name || value?.supplier_name || 'N/A';
                return (
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {name}
                    </span>
                );
            },
        },
        {
            id: 'priority',
            label: 'Priority',
            minWidth: 100,
            format: (value: string) => {
                const config = getPriorityBadge(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.color}`}
                    >
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'estimated_total',
            label: 'Total',
            minWidth: 120,
            format: (value: string | number) => (
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(value)}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 110,
            format: (value: string) => {
                const config = getStatusBadge(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.color}`}
                    >
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'funds_released',
            label: 'Funds',
            minWidth: 100,
            format: (value: boolean | number) => {
                const isReleased = value === true || value === 1;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            isReleased
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                    >
                        {isReleased ? (
                            <CheckCircle className="h-3 w-3" />
                        ) : (
                            <Clock className="h-3 w-3" />
                        )}
                        {isReleased ? 'Released' : 'Pending'}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'request_date',
            label: 'Request Date',
            minWidth: 110,
            format: (value: string) => (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(value)}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'items',
            label: 'Items',
            minWidth: 80,
            format: (value: any[]) => {
                const count = value?.length || 0;
                return (
                    <span className="inline-flex items-center gap-1 text-sm">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        {count}
                    </span>
                );
            },
        },
    ];

    // Actions for the table
    const actions = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Release Funds',
            icon: <Wallet className="h-4 w-4" />,
            color: 'success',
            onClick: (row: PurchaseOrder) => handleReleaseFunds(row),
            show: (row: PurchaseOrder) => {
                const isReleased =
                    row.funds_released === true || row.funds_released === 1;
                return row.status === 'approved' && !isReleased;
            },
        },
        {
            label: 'Convert to PO',
            icon: <Send className="h-4 w-4" />,
            color: 'warning',
            onClick: (row: PurchaseOrder) => handleConvertToPO(row),
            show: (row: PurchaseOrder) =>
                row.status === 'approved' && !row.converted_to_po_id,
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Admin',
                    href: '',
                },
                {
                    title: 'Purchase Orders',
                    href: '',
                },
            ]}
        >
            <Container>
                <PageHeader
                    title={'Purchase Orders'}
                    subtitle="Manage all approved purchase orders for the release of funds"
                />

                <ReusableTable
                    title={'Purchase Orders'}
                    data={purchaseOrders}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    filterPlaceholder="Search by PR #, supplier, department..."
                    emptyMessage="No purchase orders found"
                    statusFilterKey="status"
                    statusOptions={[
                        { value: 'approved', label: 'Approved' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'completed', label: 'Completed' },
                    ]}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    defaultRowsPerPage={10}
                    defaultOrderBy="created_at"
                    defaultOrder="desc"
                />

                {/* View Purchase Order Modal */}
                {selectedOrder && (
                    <ViewPurchaseOrderModal
                        isOpen={showViewModal}
                        onClose={() => {
                            setShowViewModal(false);
                            setSelectedOrder(null);
                        }}
                        purchaseOrder={selectedOrder}
                        onConvertToPO={
                            selectedOrder.status === 'approved' &&
                            !selectedOrder.converted_to_po_id
                                ? () => handleConvertToPO(selectedOrder)
                                : undefined
                        }
                        onReleaseFunds={
                            selectedOrder.status === 'approved' &&
                            (selectedOrder.funds_released === false ||
                                selectedOrder.funds_released === 0 ||
                                selectedOrder.funds_released === null)
                                ? () => {
                                      handleReleaseFunds(selectedOrder);
                                      setShowViewModal(false);
                                  }
                                : undefined
                        }
                        isProcessing={isProcessing}
                        userRole={'admin'}
                    />
                )}

                {/* Release Funds Modal */}
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
                                disabled={
                                    isProcessing || !fundReleaseCode.trim()
                                }
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
                    {selectedOrder && (
                        <>
                            {/* Order Summary */}
                            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <Label className="text-[10px] text-emerald-600">
                                            Order #
                                        </Label>
                                        <p className="font-medium text-emerald-800 dark:text-emerald-300">
                                            {selectedOrder.pr_number}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-emerald-600">
                                            Department
                                        </Label>
                                        <p className="font-medium text-emerald-800 dark:text-emerald-300">
                                            {selectedOrder.department?.name ||
                                                selectedOrder.department_name ||
                                                'N/A'}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-[10px] text-emerald-600">
                                            Amount to Release
                                        </Label>
                                        <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                                            {formatCurrency(
                                                selectedOrder.estimated_total ||
                                                    selectedOrder.total_amount ||
                                                    0,
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
                                        type="password"
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
                                {selectedOrder.approval_code && (
                                    <p className="text-[10px] text-slate-400">
                                        Expected code:{' '}
                                        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                            {selectedOrder.approval_code}
                                        </span>
                                    </p>
                                )}
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

                {/* Funds Released Success Modal */}
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
                            Funds have been successfully released. Budget
                            committed.
                        </p>
                    </div>
                </CustomModal>
            </Container>
        </AppLayout>
    );
}
