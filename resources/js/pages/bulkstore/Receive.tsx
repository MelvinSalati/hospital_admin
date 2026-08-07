import { usePage } from '@inertiajs/react';
import {
    BoxesIcon,
    Eye,
    Package,
    FileText,
    Truck,
    Undo2,
    X,
    Plus,
    RefreshCw,
    Download,
    Printer,
    CheckCircle,
    Clock,
    Building,
    Calendar,
    User,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import ViewPurchaseOrderModal from '@/components/modals/ViewPurchaseOrderModal';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import { ReusableTable } from '@/components/ReusableTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

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
    supplier: {
        id: number;
        supplier_name: string;
        supplier_code: string;
        contact_person?: string;
        email?: string;
        phone?: string;
        address?: string;
    } | null;
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
// STATUS CONFIG
// ============================================

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
        icon: <X className="h-3 w-3" />,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <X className="h-3 w-3" />,
    },
    completed: {
        label: 'Completed',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
};

// ============================================
// CUSTOM MODAL COMPONENT
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
                {/* Header */}
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

                {/* Body */}
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    {children}
                </div>

                {/* Footer */}
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

export default function Receive() {
    const { props } = usePage();
    const { auth } = props;

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
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showGrnModal, setShowGrnModal] = useState(false);
    const [showViewPOModal, setShowViewPOModal] = useState(false);

    // Form states
    const [receiveItems, setReceiveItems] = useState<any[]>([]);
    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [grnData, setGrnData] = useState<any>(null);
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

    const userRole = auth?.user?.is_admin
        ? 'admin'
        : auth?.user?.is_supervisor
          ? 'supervisor'
          : 'staff';

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

    const getSupplierName = (requisition: PurchaseRequisition) => {
        if (requisition.supplier) {
            return requisition.supplier.supplier_name || 'N/A';
        }
        return requisition.supplier_name || 'N/A';
    };

    // Transform requisition to purchase order format for the modal
    const transformToPurchaseOrder = (requisition: PurchaseRequisition) => {
        const supplierName = getSupplierName(requisition);
        return {
            id: requisition.id,
            po_number: requisition.po_number || `PO-${requisition.pr_number}`,
            pr_number: requisition.pr_number,
            requisition_id: requisition.id,
            supplier_id: requisition.supplier_id || 0,
            supplier_name: supplierName,
            supplier_code:
                requisition.supplier?.supplier_code ||
                requisition.supplier_code ||
                '',
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
            supplier: {
                id: requisition.supplier_id || 0,
                supplier_name: supplierName,
                supplier_code: requisition.supplier?.supplier_code || '',
                address: requisition.shipping_address || '',
                phone: requisition.supplier?.phone || '',
                email: requisition.supplier?.email || '',
                contact_person: requisition.supplier?.contact_person || '',
            },
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
                status: 'approved', // Only fetch approved requisitions for receiving
            };

            if (searchTerm) params.search = searchTerm;
            if (statusFilter) params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (departmentFilter) params.department = departmentFilter;
            if (activeTab !== 'all' && activeTab !== 'approved')
                params.status = activeTab;

            const response = await Http.get(
                '/bulk-store/purchase-requisitions/approved',
                { params },
            );
            const data = response.data;

            // The data is in data.data (Laravel pagination format)
            const orders = data.data || [];

            // Transform the data to ensure we have supplier_name
            const transformedOrders = orders.map(
                (order: PurchaseRequisition) => {
                    // If supplier is an object, extract the name
                    let supplierName = order.supplier_name || 'N/A';
                    if (order.supplier && typeof order.supplier === 'object') {
                        supplierName = order.supplier.supplier_name || 'N/A';
                    }
                    return {
                        ...order,
                        supplier_name: supplierName,
                    };
                },
            );

            setRequisitions(transformedOrders);

            // Calculate stats from all data (not just paginated)
            const allData = data.data || [];
            const totalValue = allData.reduce(
                (sum: number, order: PurchaseRequisition) =>
                    sum + parseFloat(order.estimated_total || 0),
                0,
            );

            setStats({
                total: data.total || allData.length || 0,
                pending: allData.filter(
                    (o: PurchaseRequisition) => o.status === 'pending',
                ).length,
                approved: allData.filter(
                    (o: PurchaseRequisition) => o.status === 'approved',
                ).length,
                rejected: allData.filter(
                    (o: PurchaseRequisition) => o.status === 'rejected',
                ).length,
                total_value: totalValue,
                urgent_count: allData.filter(
                    (o: PurchaseRequisition) => o.priority === 'urgent',
                ).length,
                high_priority_count: allData.filter(
                    (o: PurchaseRequisition) => o.priority === 'high',
                ).length,
                funds_released: allData.filter(
                    (o: PurchaseRequisition) => o.funds_released === true,
                ).length,
            });

            setPagination((prev) => ({
                ...prev,
                totalItems: data.total || orders.length || 0,
                totalPages: data.last_page || 1,
                currentPage: data.current_page || 1,
            }));
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
    // Check if all items are fully received
    const canReceive = () => {
        if (receiveItems.length === 0) return false;

        // Check if all items have at least one batch
        const hasBatches = receiveItems.some(
            (item) => item.batches && item.batches.length > 0,
        );
        if (!hasBatches) return false;

        // Check if all items are fully received
        const allFullyReceived = receiveItems.every((item) => {
            const totalReceived =
                item.batches?.reduce(
                    (sum: number, batch: any) => sum + batch.quantity,
                    0,
                ) || 0;
            return totalReceived >= parseFloat(item.quantity);
        });

        // Check if any batch has expired date in the past
        const hasExpiredBatch = receiveItems.some((item) =>
            item.batches?.some((batch: any) => {
                if (!batch.expiry_date) return false;
                return new Date(batch.expiry_date) < new Date();
            }),
        );

        if (hasExpiredBatch) {
            toast.error('Some batches have expired. Please remove them.');
            return false;
        }

        return allFullyReceived;
    };
    const handleView = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setShowViewPOModal(true);
    };

    const handleReceiveStock = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setReceiveItems(
            requisition.items?.map((item) => ({
                ...item,
                receive_quantity: 0,
                batch_number: '',
                expiry_date: '',
                manufacturing_date: '',
                batches: [],
            })) || [],
        );
        setShowReceiveModal(true);
    };

    const handleReturnStock = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setReturnItems([]);
        setShowReturnModal(true);
    };

    const handleGenerateGRN = (requisition: PurchaseRequisition) => {
        toast.success(
            `GRN generated automatically for ${requisition.pr_number}`,
        );
    };

    const handleGenerateDeliveryNote = (requisition: PurchaseRequisition) => {
        toast.success(`Delivery note generated for ${requisition.pr_number}`);
    };

    const handleAddBatch = (itemIndex: number) => {
        const updatedItems = [...receiveItems];
        const item = updatedItems[itemIndex];
        if (item.receive_quantity && item.receive_quantity > 0) {
            const newBatch = {
                id: Date.now().toString(),
                batch_number: item.batch_number || `BATCH-${Date.now()}`,
                expiry_date: item.expiry_date || '',
                manufacturing_date: item.manufacturing_date || '',
                quantity: item.receive_quantity,
            };
            item.batches = [...(item.batches || []), newBatch];
            item.batch_number = '';
            item.expiry_date = '';
            item.manufacturing_date = '';
            item.receive_quantity = 0;
        } else {
            toast.error('Please enter a quantity to add as batch');
        }
        setReceiveItems(updatedItems);
    };

    const handleRemoveBatch = (itemIndex: number, batchId: string) => {
        const updatedItems = [...receiveItems];
        const item = updatedItems[itemIndex];
        item.batches =
            item.batches?.filter((batch: any) => batch.id !== batchId) || [];
        setReceiveItems(updatedItems);
    };

    const handleConfirmReceive = async () => {
        if (!selectedRequisition) return;
        setIsProcessing(true);

        // Get supplier_id from selected requisition
        const supplierId =
            selectedRequisition.supplier_id ||
            selectedRequisition.supplier?.id ||
            null;

        const payload = {
            purchase_requisition_id: selectedRequisition.id,
            purchase_order_id: selectedRequisition.converted_to_po_id || null,
            supplier_id: supplierId, // ← Add supplier_id here
            department_id: selectedRequisition.department_id,
            bulk_store_id: null, // You can add this if needed
            items: receiveItems.flatMap((item) =>
                item.batches.map((batch: any) => ({
                    requisition_item_id: item.id,
                    product_id: item.product_id,
                    quantity: batch.quantity,
                    batch_number: batch.batch_number,
                    expiry_date: batch.expiry_date,
                    manufacturing_date: batch.manufacturing_date,
                    purchase_order_item_id: null, // You can get this from the requisition item if available
                    location: null,
                    notes: null,
                })),
            ),
            created_by: auth.user.id,
        };

        console.log(payload);

        try {
            const response = await Http.post('/bulk-store/receiving', payload);

            if (response.data.success) {
                toast.success(
                    `Stock received successfully for ${selectedRequisition.pr_number}`,
                );
                setShowReceiveModal(false);
                setSelectedRequisition(null);
                setReceiveItems([]);
                await fetchRequisitions();

                if (response.data.grn) {
                    setGrnData(response.data.grn);
                    setShowGrnModal(true);
                }
            } else {
                throw new Error(
                    response.data.message || 'Failed to receive stock',
                );
            }
        } catch (error: any) {
            console.error('Receive failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to receive stock',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddReturnItem = () => {
        setReturnItems([
            ...returnItems,
            {
                commodity: '',
                batch_number: '',
                expiry_date: '',
                quantity: 0,
                reason: 'Damaged',
            },
        ]);
    };

    const handleRemoveReturnItem = (index: number) => {
        const updated = [...returnItems];
        updated.splice(index, 1);
        setReturnItems(updated);
    };

    const handleUpdateReturnItem = (
        index: number,
        field: string,
        value: any,
    ) => {
        const updated = [...returnItems];
        updated[index] = { ...updated[index], [field]: value };
        setReturnItems(updated);
    };

    const handleSubmitReturn = async () => {
        if (returnItems.length === 0) {
            toast.error('Please add at least one item to return');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await Http.post('/bulk-store/returns', {
                purchase_requisition_id: selectedRequisition?.id,
                grn_id: grnData?.id,
                items: returnItems,
            });

            if (response.data.success) {
                toast.success('Return processed successfully');
                setShowReturnModal(false);
                setSelectedRequisition(null);
                setReturnItems([]);
                await fetchRequisitions();
            } else {
                throw new Error(
                    response.data.message || 'Failed to process return',
                );
            }
        } catch (error: any) {
            console.error('Return failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to process return',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintGRN = () => {
        window.print();
    };

    const handleDownloadGRN = () => {
        toast.success('Downloading GRN...');
    };

    const handleRefresh = () => {
        fetchRequisitions();
        toast.success('Data refreshed');
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
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 130,
            format: (value, row) => {
                const supplierName = getSupplierName(row);
                return (
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        {supplierName}
                    </div>
                );
            },
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
        {
            id: 'required_date',
            label: 'Expected Delivery',
            minWidth: 90,
            format: (value) => (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                    {value ? formatDate(value) : 'N/A'}
                </div>
            ),
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
    ];

    const actions: Action<PurchaseRequisition>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Receive Stock',
            icon: <Package className="h-4 w-4" />,
            color: 'success',
            onClick: handleReceiveStock,
            show: (row) => row.status === 'approved',
        },
        {
            label: 'GRN',
            icon: <FileText className="h-4 w-4" />,
            color: 'info',
            onClick: handleGenerateGRN,
            show: (row) =>
                row.status === 'approved' || row.status === 'completed',
        },
        {
            label: 'Delivery Note',
            icon: <Truck className="h-4 w-4" />,
            color: 'secondary',
            onClick: handleGenerateDeliveryNote,
            show: (row) =>
                row.status !== 'cancelled' && row.status !== 'rejected',
        },
        {
            label: 'Return Stock',
            icon: <Undo2 className="h-4 w-4" />,
            color: 'error',
            onClick: handleReturnStock,
            show: (row) =>
                row.status === 'approved' || row.status === 'completed',
        },
    ];

    // Filter options
    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    const priorityOptions = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' },
    ];

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
            icon: <X className="h-4 w-4" />,
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Bulk Store', href: '' },
                { title: 'Receive Stock', href: '' },
                {
                    title: 'Previously Received Items',
                    href: 'bulkstore/received-stock',
                },
            ]}
        >
            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        icon={<BoxesIcon className="h-6 w-6" />}
                        title="Receive Stock"
                        subtitle="Receive approved supplier deliveries and generate GRNs"
                        actions={[
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: handleRefresh,
                                variant: 'outline',
                                loading: loading,
                            },
                        ]}
                    />

                    {/* Stats Cards */}
                    {/* <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total"
                            value={stats.total}
                            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            icon={<FileText className="h-4 w-4" />}
                        />
                        <StatCard
                            title="Approved"
                            value={stats.approved}
                            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            icon={<CheckCircle className="h-4 w-4" />}
                        />
                        <StatCard
                            title="Pending"
                            value={stats.pending}
                            color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            icon={<Clock className="h-4 w-4" />}
                        />
                        <StatCard
                            title="Total Value"
                            value={formatCurrency(stats.total_value)}
                            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            icon={<FileText className="h-4 w-4" />}
                            subtitle={`${stats.urgent_count} urgent`}
                        />
                    </div> */}

                    {/* Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setStatusFilter('');
                                    setPagination((prev) => ({
                                        ...prev,
                                        currentPage: 1,
                                    }));
                                }}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count > 0 && (
                                    <span
                                        className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                                            activeTab === tab.key
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="mt-6">
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
                            filterPlaceholder="Search by PR #, supplier, department..."
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
                    userRole={userRole}
                />
            )}

            {/* ========================================== */}
            {/* RECEIVE STOCK MODAL */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showReceiveModal}
                onClose={() => {
                    setShowReceiveModal(false);
                    setSelectedRequisition(null);
                    setReceiveItems([]);
                }}
                title="Receive Stock"
                description={selectedRequisition?.pr_number}
                maxWidth="3xl"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowReceiveModal(false);
                                setSelectedRequisition(null);
                                setReceiveItems([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmReceive}
                            disabled={isProcessing || !canReceive()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Package className="mr-1.5 h-3.5 w-3.5" />
                                    Receive Stock
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedRequisition && (
                    <div className="flex h-[500px] gap-4">
                        {/* LEFT SIDE - Entry Form */}
                        <div className="flex-1 overflow-y-auto pr-2">
                            <div className="space-y-3">
                                {/* PR Information */}
                                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <div>
                                            <Label className="text-[10px] text-slate-500">
                                                PR Number
                                            </Label>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {selectedRequisition.pr_number}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-[10px] text-slate-500">
                                                Supplier
                                            </Label>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {getSupplierName(
                                                    selectedRequisition,
                                                )}
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
                                    </div>
                                </div>

                                {/* Item Entry Form */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Add Items
                                    </Label>

                                    {receiveItems.map((item, index) => {
                                        const totalReceived =
                                            item.batches?.reduce(
                                                (sum: number, batch: any) =>
                                                    sum + batch.quantity,
                                                0,
                                            ) || 0;
                                        const isFullyReceived =
                                            totalReceived >=
                                            parseFloat(item.quantity);

                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded-lg border p-2 ${
                                                    isFullyReceived
                                                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                                                        : 'border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="mb-1.5 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-slate-800 dark:text-slate-200">
                                                            {item.product
                                                                ?.product_name ||
                                                                `Product #${item.product_id}`}
                                                        </p>
                                                        {isFullyReceived && (
                                                            <Badge className="bg-green-500 text-[10px]">
                                                                <CheckCircle className="mr-0.5 h-3 w-3" />
                                                                Fully Received
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {item.product?.strength && (
                                                        <p className="text-[10px] text-slate-500">
                                                            {
                                                                item.product
                                                                    .strength
                                                            }{' '}
                                                            -{' '}
                                                            {item.product.form}
                                                        </p>
                                                    )}
                                                    <div className="mt-1 flex gap-2 text-[10px] text-slate-500">
                                                        <span>
                                                            Ordered:{' '}
                                                            {parseFloat(
                                                                item.quantity,
                                                            ).toLocaleString()}
                                                        </span>
                                                        <span>|</span>
                                                        <span>
                                                            Received:{' '}
                                                            {totalReceived}
                                                        </span>
                                                        <span>|</span>
                                                        <span>
                                                            Remaining:{' '}
                                                            {parseFloat(
                                                                item.quantity,
                                                            ) - totalReceived}
                                                        </span>
                                                    </div>
                                                </div>

                                                {!isFullyReceived && (
                                                    <>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            <input
                                                                type="number"
                                                                placeholder="Qty"
                                                                className="rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                                value={
                                                                    item.receive_quantity ||
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const value =
                                                                        parseFloat(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ) || 0;
                                                                    const remaining =
                                                                        parseFloat(
                                                                            item.quantity,
                                                                        ) -
                                                                        totalReceived;
                                                                    if (
                                                                        value >
                                                                        remaining
                                                                    ) {
                                                                        toast.error(
                                                                            `Cannot receive more than remaining quantity (${remaining})`,
                                                                        );
                                                                        return;
                                                                    }
                                                                    const updated =
                                                                        [
                                                                            ...receiveItems,
                                                                        ];
                                                                    updated[
                                                                        index
                                                                    ].receive_quantity =
                                                                        value;
                                                                    setReceiveItems(
                                                                        updated,
                                                                    );
                                                                }}
                                                                max={
                                                                    parseFloat(
                                                                        item.quantity,
                                                                    ) -
                                                                    totalReceived
                                                                }
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Batch #"
                                                                className="rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                                value={
                                                                    item.batch_number ||
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const updated =
                                                                        [
                                                                            ...receiveItems,
                                                                        ];
                                                                    updated[
                                                                        index
                                                                    ].batch_number =
                                                                        e.target.value;
                                                                    setReceiveItems(
                                                                        updated,
                                                                    );
                                                                }}
                                                            />
                                                            <input
                                                                type="date"
                                                                className="rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                                value={
                                                                    item.expiry_date ||
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const selectedDate =
                                                                        new Date(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );
                                                                    const today =
                                                                        new Date();
                                                                    today.setHours(
                                                                        0,
                                                                        0,
                                                                        0,
                                                                        0,
                                                                    );

                                                                    if (
                                                                        selectedDate <
                                                                        today
                                                                    ) {
                                                                        toast.error(
                                                                            'Expiry date cannot be in the past',
                                                                        );
                                                                        return;
                                                                    }

                                                                    const updated =
                                                                        [
                                                                            ...receiveItems,
                                                                        ];
                                                                    updated[
                                                                        index
                                                                    ].expiry_date =
                                                                        e.target.value;
                                                                    setReceiveItems(
                                                                        updated,
                                                                    );
                                                                }}
                                                                min={
                                                                    new Date()
                                                                        .toISOString()
                                                                        .split(
                                                                            'T',
                                                                        )[0]
                                                                }
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={() =>
                                                                handleAddBatch(
                                                                    index,
                                                                )
                                                            }
                                                            disabled={
                                                                !item.receive_quantity ||
                                                                !item.batch_number ||
                                                                !item.expiry_date ||
                                                                item.receive_quantity >
                                                                    parseFloat(
                                                                        item.quantity,
                                                                    ) -
                                                                        totalReceived
                                                            }
                                                            className="mt-1.5 w-full rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <Plus className="inline h-3 w-3" />{' '}
                                                            Add to List
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Alert */}
                                <Alert className="border-blue-200 bg-blue-50 py-1.5 dark:border-blue-800 dark:bg-blue-900/20">
                                    <AlertTriangle className="h-3.5 w-3.5 text-blue-600" />
                                    <AlertTitle className="text-[10px] font-medium text-blue-800 dark:text-blue-300">
                                        GRN Auto-Generation
                                    </AlertTitle>
                                    <AlertDescription className="text-[10px] text-blue-700 dark:text-blue-400">
                                        GRN will be automatically generated in
                                        the backend upon confirmation.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </div>

                        {/* RIGHT SIDE - Updated Items List */}
                        <div className="w-1/2 border-l border-slate-200 pl-4 dark:border-slate-700">
                            <div className="flex h-full flex-col">
                                <div className="mb-2 flex items-center justify-between">
                                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Items to Receive
                                    </Label>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                    >
                                        {receiveItems.reduce(
                                            (total, item) =>
                                                total +
                                                (item.batches?.length || 0),
                                            0,
                                        )}{' '}
                                        batches
                                    </Badge>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {receiveItems.every(
                                        (item) =>
                                            !item.batches ||
                                            item.batches.length === 0,
                                    ) ? (
                                        <div className="flex h-full flex-col items-center justify-center text-slate-400">
                                            <Package className="h-12 w-12" />
                                            <p className="mt-2 text-sm">
                                                No items added yet
                                            </p>
                                            <p className="text-xs">
                                                Add items from the left panel
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {receiveItems.map((item, index) => {
                                                const totalReceived =
                                                    item.batches?.reduce(
                                                        (
                                                            sum: number,
                                                            batch: any,
                                                        ) =>
                                                            sum +
                                                            batch.quantity,
                                                        0,
                                                    ) || 0;
                                                const isFullyReceived =
                                                    totalReceived >=
                                                    parseFloat(item.quantity);

                                                return (
                                                    item.batches &&
                                                    item.batches.length > 0 && (
                                                        <div
                                                            key={item.id}
                                                            className={`rounded-lg border p-2 ${
                                                                isFullyReceived
                                                                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                                                                    : 'border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                                    {item
                                                                        .product
                                                                        ?.product_name ||
                                                                        `Product #${item.product_id}`}
                                                                </p>
                                                                <div className="flex items-center gap-1">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px]"
                                                                    >
                                                                        {
                                                                            item
                                                                                .batches
                                                                                .length
                                                                        }{' '}
                                                                        batches
                                                                    </Badge>
                                                                    {isFullyReceived && (
                                                                        <Badge className="bg-green-500 text-[10px]">
                                                                            <CheckCircle className="mr-0.5 h-3 w-3" />
                                                                            Done
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mt-1 space-y-1">
                                                                {item.batches.map(
                                                                    (
                                                                        batch: any,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                batch.id
                                                                            }
                                                                            className="flex items-center justify-between rounded bg-slate-50 p-1.5 text-xs dark:bg-slate-700/50"
                                                                        >
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                                                    {
                                                                                        batch.batch_number
                                                                                    }
                                                                                </span>
                                                                                <span className="text-slate-500">
                                                                                    Qty:{' '}
                                                                                    {
                                                                                        batch.quantity
                                                                                    }
                                                                                </span>
                                                                                {batch.expiry_date && (
                                                                                    <span
                                                                                        className={`text-slate-500 ${
                                                                                            new Date(
                                                                                                batch.expiry_date,
                                                                                            ) <
                                                                                            new Date()
                                                                                                ? 'text-red-500'
                                                                                                : ''
                                                                                        }`}
                                                                                    >
                                                                                        Exp:{' '}
                                                                                        {formatDate(
                                                                                            batch.expiry_date,
                                                                                        )}
                                                                                        {new Date(
                                                                                            batch.expiry_date,
                                                                                        ) <
                                                                                            new Date() && (
                                                                                            <span className="ml-1 text-red-500">
                                                                                                ⚠️
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleRemoveBatch(
                                                                                        index,
                                                                                        batch.id,
                                                                                    )
                                                                                }
                                                                                className="text-red-500 hover:text-red-700"
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>

                                                            {/* Progress bar */}
                                                            <div className="mt-1.5">
                                                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                                    <span>
                                                                        Progress
                                                                    </span>
                                                                    <span>
                                                                        {Math.round(
                                                                            (totalReceived /
                                                                                parseFloat(
                                                                                    item.quantity,
                                                                                )) *
                                                                                100,
                                                                        )}
                                                                        %
                                                                    </span>
                                                                </div>
                                                                <div className="mt-0.5 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                                                                    <div
                                                                        className={`h-1 rounded-full transition-all ${
                                                                            isFullyReceived
                                                                                ? 'bg-green-500'
                                                                                : 'bg-blue-500'
                                                                        }`}
                                                                        style={{
                                                                            width: `${Math.min((totalReceived / parseFloat(item.quantity)) * 100, 100)}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Summary */}
                                {receiveItems.some(
                                    (item) =>
                                        item.batches && item.batches.length > 0,
                                ) && (
                                    <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                                        <div className="grid grid-cols-2 gap-1 text-xs">
                                            <div>
                                                <Label className="text-[10px] text-slate-500">
                                                    Total Batches
                                                </Label>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                                    {receiveItems.reduce(
                                                        (total, item) =>
                                                            total +
                                                            (item.batches
                                                                ?.length || 0),
                                                        0,
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-slate-500">
                                                    Total Quantity
                                                </Label>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                                    {receiveItems.reduce(
                                                        (total, item) =>
                                                            total +
                                                            (item.batches?.reduce(
                                                                (
                                                                    sum: number,
                                                                    batch: any,
                                                                ) =>
                                                                    sum +
                                                                    batch.quantity,
                                                                0,
                                                            ) || 0),
                                                        0,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* GRN MODAL */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showGrnModal}
                onClose={() => {
                    setShowGrnModal(false);
                    setGrnData(null);
                }}
                title="Goods Received Note"
                description={grnData?.grn_number}
                maxWidth="2xl"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowGrnModal(false);
                                setGrnData(null);
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadGRN}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Download
                        </Button>
                        <Button
                            size="sm"
                            onClick={handlePrintGRN}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Print
                        </Button>
                    </div>
                }
            >
                {grnData && (
                    <div className="space-y-3">
                        {/* GRN Info */}
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    GRN Number
                                </Label>
                                <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                    {grnData.grn_number}
                                </p>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    Supplier
                                </Label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {grnData.supplier_name || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    Received Date
                                </Label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {formatDate(grnData.received_date)}
                                </p>
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Received Items
                                </Label>
                                <Badge
                                    variant="outline"
                                    className="px-1.5 py-0.5 text-[10px]"
                                >
                                    {grnData.items?.length || 0}
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
                                                    Quantity
                                                </th>
                                                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    Batch Number
                                                </th>
                                                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    Expiry Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {grnData.items?.map(
                                                (item: any, index: number) => (
                                                    <tr
                                                        key={index}
                                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                    >
                                                        <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200">
                                                            {item.product_name ||
                                                                'N/A'}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300">
                                                            {item.batch_number ||
                                                                'N/A'}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">
                                                            {item.expiry_date
                                                                ? formatDate(
                                                                      item.expiry_date,
                                                                  )
                                                                : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* RETURN STOCK MODAL */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showReturnModal}
                onClose={() => {
                    setShowReturnModal(false);
                    setSelectedRequisition(null);
                    setReturnItems([]);
                }}
                title="Return Stock"
                description={selectedRequisition?.pr_number}
                maxWidth="3xl"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowReturnModal(false);
                                setSelectedRequisition(null);
                                setReturnItems([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSubmitReturn}
                            disabled={isProcessing || returnItems.length === 0}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                                    Submit Return
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedRequisition && (
                    <div className="space-y-4">
                        {/* Info */}
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    PR Number
                                </Label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {selectedRequisition.pr_number}
                                </p>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    Supplier
                                </Label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {getSupplierName(selectedRequisition)}
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
                        </div>

                        {/* Return Items */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Return Items
                                </Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddReturnItem}
                                    className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                >
                                    <Plus className="mr-1 h-3 w-3" /> Add Item
                                </Button>
                            </div>

                            {returnItems.length === 0 ? (
                                <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-600 dark:text-slate-400">
                                    <Package className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-1 text-sm">
                                        No return items added yet
                                    </p>
                                    <p className="text-xs">
                                        Click "Add Item" to start
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {returnItems.map((item, index) => (
                                        <div
                                            key={index}
                                            className="grid grid-cols-1 gap-1 rounded border border-slate-200 p-2 sm:grid-cols-5 dark:border-slate-700"
                                        >
                                            <input
                                                type="text"
                                                placeholder="Product"
                                                className="rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                value={item.commodity}
                                                onChange={(e) =>
                                                    handleUpdateReturnItem(
                                                        index,
                                                        'commodity',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <input
                                                type="text"
                                                placeholder="Batch #"
                                                className="rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                value={item.batch_number}
                                                onChange={(e) =>
                                                    handleUpdateReturnItem(
                                                        index,
                                                        'batch_number',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <input
                                                type="date"
                                                className="rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                value={item.expiry_date}
                                                onChange={(e) =>
                                                    handleUpdateReturnItem(
                                                        index,
                                                        'expiry_date',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                className="rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                value={item.quantity || ''}
                                                onChange={(e) =>
                                                    handleUpdateReturnItem(
                                                        index,
                                                        'quantity',
                                                        parseFloat(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                            />
                                            <div className="flex gap-1">
                                                <select
                                                    className="flex-1 rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                                    value={item.reason}
                                                    onChange={(e) =>
                                                        handleUpdateReturnItem(
                                                            index,
                                                            'reason',
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="Damaged">
                                                        Damaged
                                                    </option>
                                                    <option value="Expired">
                                                        Expired
                                                    </option>
                                                    <option value="Wrong Product">
                                                        Wrong Product
                                                    </option>
                                                    <option value="Quantity Difference">
                                                        Qty Difference
                                                    </option>
                                                    <option value="Quality Issue">
                                                        Quality Issue
                                                    </option>
                                                </select>
                                                <button
                                                    onClick={() =>
                                                        handleRemoveReturnItem(
                                                            index,
                                                        )
                                                    }
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CustomModal>
        </AppLayout>
    );
}
