// resources/js/components/modals/ViewPurchaseOrderModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    X,
    Printer,
    Download,
    CheckCircle,
    FileText,
    Package,
    Building,
    Truck,
    Calendar,
    DollarSign,
    Clock,
    AlertTriangle,
    Barcode,
    Phone,
    Mail,
    MapPin,
    Globe,
    User,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import JsBarcode from 'jsbarcode';

interface PurchaseOrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity: number;
    unit_price: number;
    total: number;
    received_quantity?: number;
    remaining_quantity?: number;
    status?: string;
}

interface PurchaseOrder {
    id: number;
    po_number: string;
    pr_number: string;
    requisition_id: number;
    supplier_id: number;
    supplier_name: string;
    supplier_code: string;
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
    department_name: string;
    department?: {
        id: number;
        name: string;
        code: string;
        description: string;
    };
    budget_code: string;
    budget_name?: string;
    order_date: string;
    expected_delivery_date: string;
    required_date?: string;
    delivery_date?: string;
    status: string;
    priority: string;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    payment_status: string;
    shipping_address?: string;
    special_instructions?: string;
    items: PurchaseOrderItem[];
    created_by: number;
    created_by_name: string;
    approved_by?: number;
    approved_by_name?: string;
    approved_at?: string;
    created_at: string;
    updated_at: string;
    justification?: string;
    request_date?: string;
    items_count?: number;
    shipping_terms?: string;
    shipping_method?: string;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
    other_cost?: number;
    notes?: string;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
    company_website?: string;
}

interface ViewPurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseOrder: PurchaseOrder | null;
    onConvertToPO?: () => void;
    userRole?: string;
}

export default function ViewPurchaseOrderModal({
    isOpen,
    onClose,
    purchaseOrder,
    onConvertToPO,
    userRole = 'staff',
}: ViewPurchaseOrderModalProps) {
    const [isPrinting, setIsPrinting] = useState(false);
    const [converting, setConverting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const barcodeRef = useRef<HTMLDivElement>(null);
    const barcodeFooterRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const printContentRef = useRef<HTMLDivElement>(null);

    const companyDetails = {
        name: purchaseOrder?.company_name || 'EasyBill Solutions',
        address: purchaseOrder?.company_address || 'Plot 123, Lusaka, Zambia',
        phone: purchaseOrder?.company_phone || '+260 211 123 456',
        email: purchaseOrder?.company_email || 'info@easybill.com',
        website: purchaseOrder?.company_website || 'www.easybill.com',
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateShort = (date: string) => {
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

    // Generate barcodes when modal opens
    useEffect(() => {
        if (isOpen && purchaseOrder) {
            setTimeout(() => {
                // Main barcode
                if (barcodeRef.current) {
                    try {
                        barcodeRef.current.innerHTML = '';
                        const svg = document.createElementNS(
                            'http://www.w3.org/2000/svg',
                            'svg',
                        );
                        svg.setAttribute(
                            'id',
                            `barcode-main-${purchaseOrder.id}`,
                        );
                        barcodeRef.current.appendChild(svg);

                        JsBarcode(
                            `#barcode-main-${purchaseOrder.id}`,
                            purchaseOrder.pr_number,
                            {
                                format: 'CODE128',
                                width: 1.5,
                                height: 40,
                                displayValue: true,
                                fontSize: 12,
                                font: 'monospace',
                                textAlign: 'center',
                                textPosition: 'bottom',
                                textMargin: 3,
                                margin: 3,
                                background: '#ffffff',
                                lineColor: '#000000',
                            },
                        );
                    } catch (error) {
                        console.error(
                            'Failed to generate main barcode:',
                            error,
                        );
                    }
                }

                // Footer barcode
                if (barcodeFooterRef.current) {
                    try {
                        barcodeFooterRef.current.innerHTML = '';
                        const svg = document.createElementNS(
                            'http://www.w3.org/2000/svg',
                            'svg',
                        );
                        svg.setAttribute(
                            'id',
                            `barcode-footer-${purchaseOrder.id}`,
                        );
                        barcodeFooterRef.current.appendChild(svg);

                        JsBarcode(
                            `#barcode-footer-${purchaseOrder.id}`,
                            purchaseOrder.pr_number,
                            {
                                format: 'CODE128',
                                width: 1,
                                height: 25,
                                displayValue: true,
                                fontSize: 10,
                                font: 'monospace',
                                textAlign: 'center',
                                textPosition: 'bottom',
                                textMargin: 2,
                                margin: 2,
                                background: '#ffffff',
                                lineColor: '#000000',
                            },
                        );
                    } catch (error) {
                        console.error(
                            'Failed to generate footer barcode:',
                            error,
                        );
                    }
                }
            }, 100);
        }
    }, [isOpen, purchaseOrder]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Handle body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setIsVisible(true);
        } else {
            document.body.style.overflow = 'unset';
            setIsVisible(false);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        toast.success('Downloading purchase order...');
    };

    const handleConvertToPO = async () => {
        if (!purchaseOrder || !onConvertToPO) return;
        setConverting(true);
        try {
            onConvertToPO();
        } catch (error) {
            console.error('Failed to convert to PO:', error);
            toast.error('Failed to convert to Purchase Order');
        } finally {
            setConverting(false);
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!purchaseOrder) return null;

    const statusInfo = getStatusBadge(purchaseOrder.status);
    const priorityInfo = getPriorityBadge(purchaseOrder.priority);
    const supplier = purchaseOrder.supplier || {
        supplier_name: purchaseOrder.supplier_name,
        supplier_code: purchaseOrder.supplier_code,
    };
    const department = purchaseOrder.department || {
        name: purchaseOrder.department_name,
    };

    const subtotal = purchaseOrder.total_amount || 0;
    const discountAmount = purchaseOrder.discount_amount || 0;
    const taxAmount = purchaseOrder.tax_amount || 0;
    const otherCost = purchaseOrder.other_cost || 0;
    const grandTotal = subtotal - discountAmount + taxAmount + otherCost;

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={handleOverlayClick}
            >
                {/* Modal */}
                <div
                    ref={modalRef}
                    className={`relative flex max-h-[90vh] flex-col overflow-hidden bg-slate-100 shadow-2xl transition-all duration-300 dark:bg-slate-800 ${
                        isFullscreen
                            ? 'fixed inset-4 h-auto w-auto rounded-2xl'
                            : 'w-[95vw] max-w-[1400px] rounded-2xl'
                    }`}
                    style={{
                        animation: isVisible
                            ? 'modalSlideIn 0.3s ease-out'
                            : 'modalSlideOut 0.2s ease-in',
                    }}
                >
                    {/* Modal Header - Compact */}
                    <div className="modal-controls flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Purchase Order
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {purchaseOrder.pr_number}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handlePrint}
                                disabled={isPrinting}
                                className="h-7 px-2 text-xs"
                            >
                                <Printer className="h-3 w-3" />
                            </Button>
                            {onConvertToPO && (
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={handleConvertToPO}
                                    disabled={converting}
                                    className="h-7 px-2 text-xs"
                                >
                                    <FileText className="h-3 w-3" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleFullscreen}
                                className="h-7 px-2"
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="h-3 w-3" />
                                ) : (
                                    <Maximize2 className="h-3 w-3" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-7 px-2 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Scrollable Content - Compact */}
                    <div
                        ref={printContentRef}
                        className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-6"
                        id="print-area"
                    >
                        {/* Company Header - Compact */}
                        <div className="border-b-2 border-slate-300 pb-3 dark:border-slate-600">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {companyDetails.name}
                                    </h1>
                                    <div className="mt-0.5 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                                        <p>{companyDetails.address}</p>
                                        <p>Phone: {companyDetails.phone}</p>
                                        <p>Email: {companyDetails.email}</p>
                                        <p>{companyDetails.website}</p>
                                    </div>
                                </div>
                                <div className="mt-2 text-left md:mt-0 md:text-right">
                                    <div className="inline-block bg-blue-600 px-4 py-1 text-white">
                                        <span className="text-xs font-bold tracking-wider uppercase">
                                            PURCHASE ORDER
                                        </span>
                                    </div>
                                    <div className="mt-1 space-y-0.5 text-xs">
                                        <p>
                                            <span className="font-semibold">
                                                P.O. NUMBER:
                                            </span>{' '}
                                            <span className="font-mono">
                                                {purchaseOrder.po_number ||
                                                    purchaseOrder.pr_number}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold">
                                                DATE:
                                            </span>{' '}
                                            {formatDateShort(
                                                purchaseOrder.order_date ||
                                                    purchaseOrder.created_at,
                                            )}
                                        </p>
                                        <p className="font-mono text-blue-600">
                                            PR: {purchaseOrder.pr_number}
                                        </p>
                                        {/* Barcode */}
                                        <div className="mt-1 flex justify-end">
                                            <div
                                                ref={barcodeRef}
                                                className="inline-block rounded border border-slate-200 bg-white p-0.5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Supplier & Customer - Compact */}
                        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 py-2 md:grid-cols-2 dark:border-slate-700">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    SUPPLIER
                                </p>
                                <div className="mt-0.5 space-y-0.5 text-xs">
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {supplier.supplier_name || 'N/A'}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        {supplier.address ||
                                            'No address provided'}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Phone: {supplier.phone || 'N/A'}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Email: {supplier.email || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="md:text-right">
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    CUSTOMER / DEPARTMENT
                                </p>
                                <div className="mt-0.5 space-y-0.5 text-xs">
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {department.name || 'N/A'}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Code:{' '}
                                        {purchaseOrder.department?.code ||
                                            'N/A'}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Budget:{' '}
                                        {purchaseOrder.budget_code || 'N/A'}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Requested by:{' '}
                                        {purchaseOrder.created_by_name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Details - Compact */}
                        <div className="grid grid-cols-3 gap-3 border-b border-slate-200 py-2 dark:border-slate-700">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    Shipping Terms
                                </p>
                                <p className="text-xs font-medium text-slate-900 dark:text-white">
                                    {purchaseOrder.shipping_terms ||
                                        'Freight on Board'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    Shipping Method
                                </p>
                                <p className="text-xs font-medium text-slate-900 dark:text-white">
                                    {purchaseOrder.shipping_method || 'Land'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    Delivery Date
                                </p>
                                <p className="text-xs font-medium text-slate-900 dark:text-white">
                                    {formatDateShort(
                                        purchaseOrder.expected_delivery_date ||
                                            purchaseOrder.required_date,
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Items Table - Compact */}
                        <div className="py-2">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="border-y border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-700/50">
                                        <th className="px-2 py-1.5 text-left font-semibold text-slate-600 uppercase dark:text-slate-300">
                                            Code
                                        </th>
                                        <th className="px-2 py-1.5 text-left font-semibold text-slate-600 uppercase dark:text-slate-300">
                                            Description
                                        </th>
                                        <th className="px-2 py-1.5 text-center font-semibold text-slate-600 uppercase dark:text-slate-300">
                                            Qty
                                        </th>
                                        <th className="px-2 py-1.5 text-right font-semibold text-slate-600 uppercase dark:text-slate-300">
                                            Unit Price
                                        </th>
                                        <th className="px-2 py-1.5 text-right font-semibold text-slate-600 uppercase dark:text-slate-300">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchaseOrder.items &&
                                    purchaseOrder.items.length > 0 ? (
                                        purchaseOrder.items.map(
                                            (item, index) => (
                                                <tr
                                                    key={item.id || index}
                                                    className="border-b border-slate-200 dark:border-slate-700"
                                                >
                                                    <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-400">
                                                        {item.product_code ||
                                                            'N/A'}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-slate-800 dark:text-slate-200">
                                                        {item.product_name}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center text-slate-800 dark:text-slate-200">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right text-slate-800 dark:text-slate-200">
                                                        {formatCurrency(
                                                            item.unit_price,
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right font-medium text-slate-800 dark:text-slate-200">
                                                        {formatCurrency(
                                                            item.total,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-2 py-4 text-center text-slate-500 dark:text-slate-400"
                                            >
                                                No items found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Notes & Totals - Compact */}
                        <div className="grid grid-cols-5 gap-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                            <div className="col-span-3 space-y-1.5">
                                {purchaseOrder.justification && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                            Note / Justification
                                        </p>
                                        <p className="text-xs text-slate-600 italic dark:text-slate-400">
                                            {purchaseOrder.justification}
                                        </p>
                                    </div>
                                )}
                                {purchaseOrder.special_instructions && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                            Special Instructions
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {purchaseOrder.special_instructions}
                                        </p>
                                    </div>
                                )}
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    <p>
                                        Payment shall be 30 days upon receipt of
                                        the items above.
                                    </p>
                                    <p>
                                        Terms:{' '}
                                        {purchaseOrder.supplier
                                            ?.payment_terms || 'Net 30'}
                                    </p>
                                </div>
                            </div>
                            <div className="col-span-2 space-y-0.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Subtotal
                                    </span>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {formatCurrency(subtotal)}
                                    </span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Discount (
                                            {purchaseOrder.discount_percentage ||
                                                0}
                                            %)
                                        </span>
                                        <span className="font-medium text-red-600 dark:text-red-400">
                                            -{formatCurrency(discountAmount)}
                                        </span>
                                    </div>
                                )}
                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Sales Tax (
                                            {purchaseOrder.tax_percentage || 0}
                                            %)
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(taxAmount)}
                                        </span>
                                    </div>
                                )}
                                {otherCost > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Other Cost
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(otherCost)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-bold dark:border-slate-600">
                                    <span className="text-slate-900 dark:text-white">
                                        Total
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400">
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status & Additional Info - Compact */}
                        <div className="mt-2 grid grid-cols-4 gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    Status
                                </p>
                                <span
                                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.bg} ${statusInfo.color}`}
                                >
                                    {statusInfo.label}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    Priority
                                </p>
                                <span
                                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityInfo.bg} ${priorityInfo.color}`}
                                >
                                    {priorityInfo.label}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    Payment
                                </p>
                                <span className="mt-0.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                                    {purchaseOrder.payment_status || 'Unpaid'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                                    Items
                                </p>
                                <p className="text-xs font-medium text-slate-900 dark:text-white">
                                    {purchaseOrder.items_count ||
                                        purchaseOrder.items?.length ||
                                        0}
                                </p>
                            </div>
                        </div>

                        {/* Approval Info */}
                        {purchaseOrder.approved_at && (
                            <div className="mt-2 rounded bg-green-50 p-2 dark:bg-green-900/20">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                    <p className="text-xs text-green-800 dark:text-green-300">
                                        Approved by{' '}
                                        {purchaseOrder.approved_by_name ||
                                            'N/A'}{' '}
                                        on{' '}
                                        {formatDate(purchaseOrder.approved_at)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Footer with Barcode */}
                        <div className="mt-3 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <p className="font-medium text-slate-700 dark:text-slate-300">
                                Thank you for your business!
                            </p>
                            <p>
                                This is a computer-generated document. No
                                signature required.
                            </p>
                            <div className="mt-1 flex justify-center">
                                <div
                                    ref={barcodeFooterRef}
                                    className="inline-block"
                                />
                            </div>
                            <p className="mt-0.5 font-mono text-blue-600">
                                PR: {purchaseOrder.pr_number}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Styles */}
            <style>{`
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes modalSlideOut {
                    from {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.95) translateY(20px);
                    }
                }
                
                /* Print Styles - Match the PDF output */
                @media print {
                    /* Hide everything except the print area */
                    body * {
                        visibility: hidden !important;
                    }
                    #print-area, #print-area * {
                        visibility: visible !important;
                    }
                    #print-area {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 20px !important;
                        background: white !important;
                        color: #1a1a1a !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                    
                    /* Hide modal controls */
                    .modal-controls {
                        display: none !important;
                    }
                    
                    /* Reset backgrounds for print */
                    .bg-slate-100 {
                        background: white !important;
                    }
                    .bg-white {
                        background: white !important;
                    }
                    
                    /* Keep badge colors */
                    .bg-blue-100 { background: #dbeafe !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-yellow-100 { background: #fef3c7 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-green-100 { background: #d1fae5 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-red-100 { background: #fee2e2 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-orange-100 { background: #ffedd5 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-gray-100 { background: #f3f4f6 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-emerald-100 { background: #d1fae5 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-blue-600 { background: #2563eb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .bg-green-50 { background: #f0fdf4 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    
                    /* Text colors */
                    .text-blue-600 { color: #2563eb !important; }
                    .text-blue-800 { color: #1e40af !important; }
                    .text-yellow-800 { color: #92400e !important; }
                    .text-green-800 { color: #065f46 !important; }
                    .text-red-800 { color: #991b1b !important; }
                    .text-orange-800 { color: #9a3412 !important; }
                    .text-gray-800 { color: #1f2937 !important; }
                    .text-emerald-800 { color: #065f46 !important; }
                    .text-slate-900 { color: #0f172a !important; }
                    .text-slate-700 { color: #334155 !important; }
                    .text-slate-600 { color: #475569 !important; }
                    .text-slate-500 { color: #64748b !important; }
                    .text-white { color: white !important; }
                    
                    /* Border colors */
                    .border-slate-300 { border-color: #cbd5e1 !important; }
                    .border-slate-200 { border-color: #e2e8f0 !important; }
                    
                    /* Table styles */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th {
                        background: #f3f4f6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    th, td {
                        padding: 6px 8px !important;
                        border: 1px solid #e2e8f0 !important;
                    }
                    
                    /* Remove shadows */
                    .shadow-2xl, .shadow-sm {
                        box-shadow: none !important;
                    }
                    
                    /* Full width */
                    .max-w-\\[1400px\\], .max-w-\\[95vw\\] {
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    .max-h-\\[90vh\\] {
                        max-height: none !important;
                    }
                    
                    /* Fix positioning */
                    .fixed {
                        position: static !important;
                    }
                    .inset-0 {
                        inset: auto !important;
                    }
                    .z-50 {
                        z-index: auto !important;
                    }
                    .bg-black\\/50 {
                        background: transparent !important;
                    }
                    .backdrop-blur-sm {
                        backdrop-filter: none !important;
                    }
                    .rounded-2xl {
                        border-radius: 0 !important;
                    }
                    
                    /* Page break control */
                    tr {
                        page-break-inside: avoid !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    
                    /* Barcode visibility */
                    svg {
                        max-width: 100% !important;
                    }
                    
                    /* Ensure content fits */
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                }
            `}</style>
        </>
    );
}
