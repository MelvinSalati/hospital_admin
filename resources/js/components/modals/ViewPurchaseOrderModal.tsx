// resources/js/components/modals/ViewPurchaseOrderModal.tsx

import JsBarcode from 'jsbarcode';
import {
    X,
    Printer,
    CheckCircle,
    FileText,
    Calendar,
    Wallet,
    Send,
    Maximize2,
    Minimize2,
    Loader2,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

interface PurchaseOrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    product?: {
        service_name?: string;
        service_code?: string;
        service_category?: string | null;
        description?: string | null;
    } | null;
    quantity: number;
    unit_price: number;
    total: number;
    received_quantity?: number;
    remaining_quantity?: number;
    status?: string;
}

interface ViewPurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseOrder: PurchaseOrder | null;
    onConvertToPO?: () => void;
    onReleaseFunds?: () => void;
    userRole?: string;
}

export default function ViewPurchaseOrderModal({
    isOpen,
    onClose,
    purchaseOrder,
    onConvertToPO,
    onReleaseFunds,
    userRole = 'staff',
}: ViewPurchaseOrderModalProps) {
    const [converting, setConverting] = useState(false);
    const [releasing, setReleasing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const barcodeRef = useRef<HTMLDivElement>(null);
    const barcodeFooterRef = useRef<HTMLDivElement>(null);
    const printContentRef = useRef<HTMLDivElement>(null);

    const companyDetails = {
        name: purchaseOrder?.company_name || 'Altaf Memorial Hospital',
        address:
            purchaseOrder?.company_address ||
            'Pererenyatwa RD, Chipata, Zambia',
        phone: purchaseOrder?.company_phone || '+260776798007',
        email: purchaseOrder?.company_email || 'info@altaf.com',
        website: purchaseOrder?.company_website || 'www.altaf.com',
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { color: string; label: string }> = {
            draft: {
                color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
                label: 'Draft',
            },
            pending: {
                color: 'bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-300',
                label: 'Pending',
            },
            approved: {
                color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300',
                label: 'Approved',
            },
            sent: {
                color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
                label: 'Sent',
            },
            received: {
                color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300',
                label: 'Received',
            },
            partial: {
                color: 'bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-300',
                label: 'Partial',
            },
            cancelled: {
                color: 'bg-red-50 text-red-700 dark:bg-red-900/25 dark:text-red-300',
                label: 'Cancelled',
            },
            completed: {
                color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300',
                label: 'Completed',
            },
        };
        return map[status] || map.draft;
    };

    const getPriorityBadge = (priority: string) => {
        const map: Record<string, { color: string; label: string }> = {
            low: {
                color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
                label: 'Low',
            },
            medium: {
                color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
                label: 'Medium',
            },
            high: {
                color: 'bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-300',
                label: 'High',
            },
            urgent: {
                color: 'bg-red-50 text-red-700 dark:bg-red-900/25 dark:text-red-300',
                label: 'Urgent',
            },
        };
        return map[priority] || map.medium;
    };

    // Barcode generation
    useEffect(() => {
        if (!isOpen || !purchaseOrder) return;
        const t = setTimeout(() => {
            if (barcodeRef.current) {
                try {
                    barcodeRef.current.innerHTML = '';
                    const svg = document.createElementNS(
                        'http://www.w3.org/2000/svg',
                        'svg',
                    );
                    svg.id = `barcode-main-${purchaseOrder.id}`;
                    barcodeRef.current.appendChild(svg);
                    JsBarcode(
                        `#barcode-main-${purchaseOrder.id}`,
                        purchaseOrder.pr_number,
                        {
                            format: 'CODE128',
                            width: 1.4,
                            height: 36,
                            displayValue: true,
                            fontSize: 11,
                            font: 'monospace',
                            textAlign: 'center',
                            textPosition: 'bottom',
                            textMargin: 2,
                            margin: 2,
                            background: '#ffffff',
                            lineColor: '#000000',
                        },
                    );
                } catch (e) {
                    console.error('Main barcode failed:', e);
                }
            }
            if (barcodeFooterRef.current) {
                try {
                    barcodeFooterRef.current.innerHTML = '';
                    const svg = document.createElementNS(
                        'http://www.w3.org/2000/svg',
                        'svg',
                    );
                    svg.id = `barcode-footer-${purchaseOrder.id}`;
                    barcodeFooterRef.current.appendChild(svg);
                    JsBarcode(
                        `#barcode-footer-${purchaseOrder.id}`,
                        purchaseOrder.pr_number,
                        {
                            format: 'CODE128',
                            width: 1,
                            height: 24,
                            displayValue: true,
                            fontSize: 9,
                            font: 'monospace',
                            textAlign: 'center',
                            textPosition: 'bottom',
                            textMargin: 2,
                            margin: 2,
                            background: '#ffffff',
                            lineColor: '#000000',
                        },
                    );
                } catch (e) {
                    console.error('Footer barcode failed:', e);
                }
            }
        }, 120);
        return () => clearTimeout(t);
    }, [isOpen, purchaseOrder]);

    // Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Body scroll lock + mount animation
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handlePrint = () => window.print();

    const handleConvertToPO = async () => {
        if (!purchaseOrder || !onConvertToPO) return;
        setConverting(true);
        try {
            await onConvertToPO();
        } catch (e) {
            console.error(e);
            toast.error('Failed to convert to Purchase Order');
        } finally {
            setConverting(false);
        }
    };

    const handleReleaseFunds = async () => {
        if (!purchaseOrder || !onReleaseFunds) return;
        setReleasing(true);
        try {
            onReleaseFunds();
        } finally {
            setReleasing(false);
        }
    };

    if (!isOpen || !purchaseOrder) return null;

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

    const canConvert =
        !!onConvertToPO &&
        purchaseOrder.status === 'approved' &&
        !purchaseOrder.converted_to_po_id;
    const canReleaseFunds =
        !!onReleaseFunds &&
        purchaseOrder.status === 'approved' &&
        !purchaseOrder.funds_released;

    return (
        <>
            {/* ================ OVERLAY ================ */}
            <div
                className={`fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
                aria-modal="true"
                role="dialog"
            >
                {/* ================ DRAWER PANEL ================ */}
                <div
                    className={`relative flex h-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-900 ${
                        isVisible ? 'translate-x-0' : 'translate-x-full'
                    } ${
                        isFullscreen
                            ? 'w-full'
                            : 'w-full max-w-full sm:w-[92vw] md:w-[70vw] lg:w-[58vw] xl:w-[640px] 2xl:w-[720px]'
                    }`}
                >
                    {/* ---- HEADER ---- */}
                    <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 dark:border-slate-700">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate text-[clamp(0.85rem,1.4vw,0.95rem)] font-semibold text-slate-900 dark:text-white">
                                    Purchase Order
                                </h2>
                                <p className="truncate font-mono text-[clamp(0.65rem,1.1vw,0.72rem)] text-slate-500 dark:text-slate-400">
                                    {purchaseOrder.pr_number}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                            <button
                                onClick={handlePrint}
                                className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Print"
                            >
                                <Printer className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setIsFullscreen((v) => !v)}
                                className="hidden rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 sm:block dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title={
                                    isFullscreen
                                        ? 'Exit fullscreen'
                                        : 'Fullscreen'
                                }
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/25 dark:hover:text-red-400"
                                title="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* ---- SCROLLABLE BODY ---- */}
                    <div
                        ref={printContentRef}
                        id="print-area"
                        className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 print:overflow-visible print:p-6"
                    >
                        {/* COMPANY HEADER */}
                        <div className="border-b border-slate-200 pb-3 dark:border-slate-700">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <h1 className="text-[clamp(1rem,2vw,1.2rem)] font-bold tracking-tight text-slate-900 dark:text-white">
                                        {companyDetails.name}
                                    </h1>
                                    <div className="mt-1 space-y-0.5 text-[clamp(0.68rem,1.2vw,0.75rem)] leading-relaxed text-slate-500 dark:text-slate-400">
                                        <p className="truncate">
                                            {companyDetails.address}
                                        </p>
                                        <p className="truncate">
                                            Phone: {companyDetails.phone}
                                        </p>
                                        <p className="truncate">
                                            Email: {companyDetails.email}
                                        </p>
                                        <p className="truncate">
                                            {companyDetails.website}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-left sm:text-right">
                                    <div className="inline-block rounded-sm bg-slate-900 px-3 py-1 text-white dark:bg-slate-100 dark:text-slate-900">
                                        <span className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-widest uppercase">
                                            Purchase Order
                                        </span>
                                    </div>
                                    <div className="mt-1.5 space-y-0.5 text-[clamp(0.68rem,1.2vw,0.75rem)] text-slate-600 dark:text-slate-300">
                                        <p>
                                            <span className="font-semibold">
                                                P.O.:
                                            </span>{' '}
                                            <span className="font-mono">
                                                {purchaseOrder.po_number ||
                                                    purchaseOrder.pr_number}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold">
                                                Date:
                                            </span>{' '}
                                            {formatDate(
                                                purchaseOrder.order_date ||
                                                    purchaseOrder.created_at,
                                            )}
                                        </p>
                                        <p className="font-mono text-blue-600 dark:text-blue-400">
                                            PR: {purchaseOrder.pr_number}
                                        </p>
                                    </div>
                                    <div className="mt-1.5 flex justify-start sm:justify-end">
                                        <div
                                            ref={barcodeRef}
                                            className="inline-block rounded border border-slate-200 bg-white p-0.5 dark:border-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PARTIES */}
                        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 py-3 sm:grid-cols-2 dark:border-slate-700">
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Supplier
                                </p>
                                <div className="mt-1 space-y-0.5 text-[clamp(0.72rem,1.3vw,0.8rem)] leading-relaxed">
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
                            <div className="sm:text-right">
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Customer / Department
                                </p>
                                <div className="mt-1 space-y-0.5 text-[clamp(0.72rem,1.3vw,0.8rem)] leading-relaxed">
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

                        {/* SHIPPING */}
                        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 py-3 sm:grid-cols-3 dark:border-slate-700">
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Shipping Terms
                                </p>
                                <p className="text-[clamp(0.72rem,1.3vw,0.8rem)] font-medium text-slate-900 dark:text-white">
                                    {purchaseOrder.shipping_terms ||
                                        'Freight on Board'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Method
                                </p>
                                <p className="text-[clamp(0.72rem,1.3vw,0.8rem)] font-medium text-slate-900 dark:text-white">
                                    {purchaseOrder.shipping_method || 'Land'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Delivery Date
                                </p>
                                <p className="text-[clamp(0.72rem,1.3vw,0.8rem)] font-medium text-slate-900 dark:text-white">
                                    {formatDate(
                                        purchaseOrder.expected_delivery_date ||
                                            purchaseOrder.required_date,
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* ITEMS TABLE */}
                        <div className="py-3">
                            <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                                <table className="w-full border-collapse text-[clamp(0.7rem,1.2vw,0.78rem)]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60">
                                            <th className="px-2.5 py-2 text-left font-semibold text-slate-600 uppercase dark:text-slate-300">
                                                Code
                                            </th>
                                            <th className="px-2.5 py-2 text-left font-semibold text-slate-600 uppercase dark:text-slate-300">
                                                Description
                                            </th>
                                            <th className="px-2.5 py-2 text-center font-semibold text-slate-600 uppercase dark:text-slate-300">
                                                Qty
                                            </th>
                                            <th className="px-2.5 py-2 text-right font-semibold text-slate-600 uppercase dark:text-slate-300">
                                                Unit
                                            </th>
                                            <th className="px-2.5 py-2 text-right font-semibold text-slate-600 uppercase dark:text-slate-300">
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
                                                        className="border-t border-slate-200 dark:border-slate-700"
                                                    >
                                                        <td className="px-2.5 py-2 font-mono text-slate-600 dark:text-slate-400">
                                                            {item.product_code ||
                                                                'N/A'}
                                                        </td>
                                                        <td className="px-2.5 py-2 text-slate-800 dark:text-slate-200">
                                                            {item.product_name}
                                                        </td>
                                                        <td className="px-2.5 py-2 text-center text-slate-800 dark:text-slate-200">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-2.5 py-2 text-right text-slate-800 dark:text-slate-200">
                                                            {formatCurrency(
                                                                item.unit_price,
                                                            )}
                                                        </td>
                                                        <td className="px-2.5 py-2 text-right font-medium text-slate-800 dark:text-slate-200">
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
                                                    className="px-2.5 py-6 text-center text-slate-500 dark:text-slate-400"
                                                >
                                                    No items found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* NOTES + TOTALS */}
                        <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-3 sm:grid-cols-5 dark:border-slate-700">
                            <div className="space-y-2 sm:col-span-3">
                                {purchaseOrder.justification && (
                                    <div>
                                        <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                            Note / Justification
                                        </p>
                                        <p className="text-[clamp(0.72rem,1.3vw,0.8rem)] text-slate-600 italic dark:text-slate-400">
                                            {purchaseOrder.justification}
                                        </p>
                                    </div>
                                )}
                                {purchaseOrder.special_instructions && (
                                    <div>
                                        <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                            Special Instructions
                                        </p>
                                        <p className="text-[clamp(0.72rem,1.3vw,0.8rem)] text-slate-600 dark:text-slate-400">
                                            {purchaseOrder.special_instructions}
                                        </p>
                                    </div>
                                )}
                                <div className="text-[clamp(0.68rem,1.2vw,0.75rem)] text-slate-500 dark:text-slate-400">
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
                            <div className="space-y-1 sm:col-span-2">
                                <div className="flex justify-between text-[clamp(0.72rem,1.3vw,0.8rem)]">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        Subtotal
                                    </span>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {formatCurrency(subtotal)}
                                    </span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-[clamp(0.72rem,1.3vw,0.8rem)]">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Discount
                                        </span>
                                        <span className="font-medium text-red-600 dark:text-red-400">
                                            -{formatCurrency(discountAmount)}
                                        </span>
                                    </div>
                                )}
                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-[clamp(0.72rem,1.3vw,0.8rem)]">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Tax
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(taxAmount)}
                                        </span>
                                    </div>
                                )}
                                {otherCost > 0 && (
                                    <div className="flex justify-between text-[clamp(0.72rem,1.3vw,0.8rem)]">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Other
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(otherCost)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between border-t border-slate-300 pt-1.5 dark:border-slate-600">
                                    <span className="text-[clamp(0.8rem,1.5vw,0.9rem)] font-bold text-slate-900 dark:text-white">
                                        Total
                                    </span>
                                    <span className="text-[clamp(0.9rem,1.8vw,1.05rem)] font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* STATUS ROW */}
                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-4 dark:border-slate-700">
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Status
                                </p>
                                <span
                                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[clamp(0.65rem,1.1vw,0.72rem)] font-medium ${statusInfo.color}`}
                                >
                                    {statusInfo.label}
                                </span>
                            </div>
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Priority
                                </p>
                                <span
                                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[clamp(0.65rem,1.1vw,0.72rem)] font-medium ${priorityInfo.color}`}
                                >
                                    {priorityInfo.label}
                                </span>
                            </div>
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Payment
                                </p>
                                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[clamp(0.65rem,1.1vw,0.72rem)] font-medium text-slate-700 dark:bg-slate-700/40 dark:text-slate-300">
                                    {purchaseOrder.payment_status || 'Unpaid'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[clamp(0.6rem,1vw,0.68rem)] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Items
                                </p>
                                <p className="text-[clamp(0.72rem,1.3vw,0.8rem)] font-medium text-slate-900 dark:text-white">
                                    {purchaseOrder.items_count ||
                                        purchaseOrder.items?.length ||
                                        0}
                                </p>
                            </div>
                        </div>

                        {/* APPROVED INFO */}
                        {purchaseOrder.approved_at && (
                            <div className="mt-3 rounded-md bg-slate-50 p-2.5 dark:bg-slate-800/60">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-[clamp(0.68rem,1.2vw,0.75rem)] text-slate-700 dark:text-slate-300">
                                        Approved by{' '}
                                        {purchaseOrder.approved_by_name ||
                                            'N/A'}{' '}
                                        on{' '}
                                        {formatDate(purchaseOrder.approved_at)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* FOOTER BARCODE */}
                        <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-slate-700">
                            <p className="text-[clamp(0.7rem,1.2vw,0.78rem)] font-medium text-slate-700 dark:text-slate-300">
                                Thank you for your business!
                            </p>
                            <p className="text-[clamp(0.62rem,1vw,0.7rem)] text-slate-500 dark:text-slate-400">
                                This is a computer-generated document. No
                                signature required.
                            </p>
                            <div className="mt-1.5 flex justify-center">
                                <div
                                    ref={barcodeFooterRef}
                                    className="inline-block"
                                />
                            </div>
                            <p className="mt-1 font-mono text-[clamp(0.65rem,1.1vw,0.72rem)] text-blue-600 dark:text-blue-400">
                                PR: {purchaseOrder.pr_number}
                            </p>
                        </div>
                    </div>

                    {/* ---- STICKY FOOTER ---- */}
                    <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5 dark:border-slate-700 dark:bg-slate-900">
                        {canConvert && (
                            <Button
                                onClick={handleConvertToPO}
                                disabled={converting}
                                size="sm"
                                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                            >
                                {converting ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        Converting…
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-1.5 h-3.5 w-3.5" />
                                        Convert to PO
                                    </>
                                )}
                            </Button>
                        )}
                        {canReleaseFunds && (
                            <Button
                                onClick={handleReleaseFunds}
                                disabled={releasing}
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {releasing ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        Releasing…
                                    </>
                                ) : (
                                    <>
                                        <Wallet className="mr-1.5 h-3.5 w-3.5" />
                                        Release Funds
                                    </>
                                )}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>

            {/* ================ PRINT STYLES ================ */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #print-area, #print-area * { visibility: visible !important; }
                    #print-area {
                        position: fixed !important;
                        inset: 0 !important;
                        width: 100% !important;
                        padding: 18px !important;
                        background: white !important;
                        color: #1a1a1a !important;
                        overflow: visible !important;
                    }
                    .bg-slate-50, .bg-slate-100 { background: #f8fafc !important; }
                    .bg-slate-900, .bg-slate-100 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table { width: 100% !important; border-collapse: collapse !important; }
                    th, td { padding: 5px 7px !important; border: 1px solid #e2e8f0 !important; }
                    tr { page-break-inside: avoid !important; }
                    thead { display: table-header-group !important; }
                }
            `}</style>
        </>
    );
}
