// resources/js/pages/bulkstore/components/modals/PurchaseOrderModal.tsx

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
    Printer,
    Download,
    Mail,
    Send,
    X,
    FileText,
    Package,
    Truck,
    Calendar,
    User,
    Building,
    Phone,
    Mail as MailIcon,
    MapPin,
    CreditCard,
    DollarSign,
    Hash,
    Barcode as BarcodeIcon,
    Copy,
    Check,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Http from '@/utils/Http';

// Types
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
    status: 'pending' | 'received' | 'partial' | 'cancelled';
}

interface PurchaseOrder {
    id: number;
    po_number: string;
    pr_number: string;
    supplier_id: number | null;
    supplier?: {
        id: number;
        supplier_name: string;
        supplier_code: string;
        email?: string;
        phone?: string;
        address?: string;
        contact_person?: string;
    } | null;
    supplier_name?: string;
    supplier_email?: string;
    supplier_phone?: string;
    supplier_address?: string;
    department_id: number;
    department?: {
        id: number;
        name: string;
        code: string;
    } | null;
    department_name?: string;
    budget_code: string;
    order_date?: string;
    expected_delivery_date: string;
    required_date?: string;
    delivery_date?: string;
    status: string;
    priority: string;
    total_amount: number;
    paid_amount?: number;
    balance_amount?: number;
    payment_status?: string;
    payment_terms?: string;
    shipping_terms?: string;
    shipping_method?: string;
    shipping_address?: string;
    special_instructions?: string;
    notes?: string;
    items: PurchaseOrderItem[];
    created_by?: number;
    created_by_name?: string;
    approved_by?: number | null;
    approved_by_name?: string | null;
    approved_at?: string | null;
    created_at: string;
    updated_at: string;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
    company_website?: string;
}

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseOrder: PurchaseOrder | null;
    onSendEmail?: (email: string, poId: number) => Promise<void>;
    onPrint?: () => void;
    onDownload?: () => void;
}

// Utility functions
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
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

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
        draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
        pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
        approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
        sent: { color: 'bg-purple-100 text-purple-800', label: 'Sent' },
        received: { color: 'bg-green-100 text-green-800', label: 'Received' },
        partial: { color: 'bg-orange-100 text-orange-800', label: 'Partial' },
        cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
        completed: {
            color: 'bg-emerald-100 text-emerald-800',
            label: 'Completed',
        },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
        >
            {config.label}
        </span>
    );
};

// Main Component
export default function PurchaseOrderModal({
    isOpen,
    onClose,
    purchaseOrder,
    onSendEmail,
    onPrint,
    onDownload,
}: PurchaseOrderModalProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [isSending, setIsSending] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [emailRecipient, setEmailRecipient] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Set default email recipient from supplier
    useEffect(() => {
        if (purchaseOrder?.supplier?.email) {
            setEmailRecipient(purchaseOrder.supplier.email);
        } else if (purchaseOrder?.supplier_email) {
            setEmailRecipient(purchaseOrder.supplier_email);
        }
    }, [purchaseOrder]);

    useEffect(() => {
        if (purchaseOrder) {
            setEmailSubject(
                `Purchase Order #${purchaseOrder.po_number} - ${purchaseOrder.supplier?.supplier_name || purchaseOrder.supplier_name || 'Supplier'}`,
            );
            setEmailMessage(
                `Dear Sir/Madam,\n\nPlease find attached Purchase Order #${purchaseOrder.po_number}.\n\nWe kindly request you to review and acknowledge receipt of this order.\n\nShould you have any questions, please don't hesitate to contact us.\n\nThank you for your cooperation.\n\nBest regards,\n${purchaseOrder.company_name || 'Purchasing Department'}`,
            );
        }
    }, [purchaseOrder]);

    if (!purchaseOrder) return null;

    const {
        id,
        po_number,
        pr_number,
        supplier,
        supplier_name,
        supplier_email,
        supplier_phone,
        supplier_address,
        department,
        department_name,
        budget_code,
        order_date,
        expected_delivery_date,
        required_date,
        delivery_date,
        status,
        priority,
        total_amount,
        paid_amount,
        balance_amount,
        payment_status,
        payment_terms,
        shipping_terms,
        shipping_method,
        shipping_address,
        notes,
        items,
        created_by_name,
        approved_by_name,
        approved_at,
        created_at,
        company_name,
        company_address,
        company_phone,
        company_email,
        company_website,
    } = purchaseOrder;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discount = total_amount * 0.1; // Example: 10% discount
    const tax = (subtotal - discount) * 0.12; // Example: 12% tax
    const shippingCost = 500; // Example shipping cost
    const grandTotal = subtotal - discount + tax + shippingCost;

    // Generate barcode data
    const barcodeData = JSON.stringify({
        po: po_number,
        pr: pr_number,
        supplier: supplier?.supplier_name || supplier_name,
        total: total_amount,
        date: order_date || created_at,
    });

    // Handle copy to clipboard
    const handleCopyPO = () => {
        const poData = `PO Number: ${po_number}\nPR Number: ${pr_number}\nSupplier: ${supplier?.supplier_name || supplier_name}\nTotal: ${formatCurrency(total_amount)}\nStatus: ${status}`;
        navigator.clipboard.writeText(poData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('PO details copied to clipboard');
    };

    // Handle print
    const handlePrint = () => {
        if (onPrint) {
            onPrint();
            return;
        }

        const printContent = printRef.current;
        if (!printContent) return;

        const originalContents = document.body.innerHTML;
        const printWindow = window.open('', '_blank', 'width=800,height=600');

        if (!printWindow) {
            toast.error('Please allow popups for printing');
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase Order #${po_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .po-container { max-width: 1100px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                        .company-info { }
                        .po-title { text-align: right; }
                        .po-title h1 { color: #1a56db; font-size: 28px; margin: 0; }
                        .po-number { font-size: 18px; color: #666; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                        .field { margin-bottom: 8px; }
                        .field-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
                        .field-value { font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th { background: #f3f4f6; text-align: left; padding: 12px; font-weight: 600; border: 1px solid #d1d5db; }
                        td { padding: 12px; border: 1px solid #d1d5db; }
                        .totals { margin-top: 20px; text-align: right; }
                        .totals table { width: 300px; margin-left: auto; }
                        .totals td { padding: 8px; border: none; }
                        .totals .total-row { font-weight: bold; font-size: 16px; }
                        .footer { margin-top: 40px; border-top: 1px solid #d1d5db; padding-top: 20px; font-size: 12px; color: #666; }
                        .barcode-container { margin: 20px 0; text-align: center; }
                        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
                        .status-draft { background: #e5e7eb; color: #374151; }
                        .status-pending { background: #fef3c7; color: #92400e; }
                        .status-approved { background: #dbeafe; color: #1e40af; }
                        .status-sent { background: #f3e8ff; color: #6b21a8; }
                        .status-received { background: #d1fae5; color: #065f46; }
                        .status-completed { background: #a7f3d0; color: #065f46; }
                        .status-cancelled { background: #fee2e2; color: #991b1b; }
                        .signature-section { display: flex; justify-content: space-between; margin-top: 40px; }
                        .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 30px; }
                        @media print { body { print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                    <script>
                        window.onload = function() { window.print(); }
                    <\/script>
                </body>
            </html>
        `);

        printWindow.document.close();
    };

    // Handle download as PDF
    const handleDownloadPDF = async () => {
        if (onDownload) {
            onDownload();
            return;
        }

        setIsGeneratingPDF(true);
        try {
            const element = printRef.current;
            if (!element) throw new Error('No content to print');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Purchase_Order_${po_number}.pdf`);

            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    // Handle send email
    const handleSendEmail = async () => {
        if (!emailRecipient) {
            toast.error('Please enter a recipient email address');
            return;
        }

        if (!emailRecipient.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsSending(true);
        try {
            // First generate PDF
            const element = printRef.current;
            if (!element) throw new Error('No content to print');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const pdfBase64 = pdf.output('datauristring');

            // Send email with attachment
            if (onSendEmail) {
                await onSendEmail(emailRecipient, id);
            } else {
                // Default email sending via API
                await Http.post(`/bulk-store/purchase-orders/${id}/email`, {
                    recipient: emailRecipient,
                    subject: emailSubject,
                    message: emailMessage,
                    pdf: pdfBase64,
                });
            }

            toast.success('Purchase Order sent successfully');
            setShowEmailForm(false);
        } catch (error) {
            console.error('Failed to send email:', error);
            toast.error('Failed to send email');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                Purchase Order
                            </DialogTitle>
                            <DialogDescription className="mt-1 flex items-center gap-2">
                                <span className="font-mono font-semibold">
                                    #{po_number}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="text-sm">PR: {pr_number}</span>
                                <span className="text-slate-300">|</span>
                                <StatusBadge status={status} />
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyPO}
                                className="flex items-center gap-1"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="flex items-center gap-1"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="flex items-center gap-1"
                            >
                                {isGeneratingPDF ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                PDF
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setShowEmailForm(!showEmailForm)}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                            >
                                <Mail className="h-4 w-4" />
                                Email
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Email Form */}
                    {showEmailForm && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                            <div className="mb-3 flex items-start gap-2">
                                <MailIcon className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-blue-800 dark:text-blue-300">
                                        Send Purchase Order via Email
                                    </h4>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowEmailForm(false)}
                                    className="h-6 w-6 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm font-medium">
                                        Recipient Email
                                    </Label>
                                    <Input
                                        type="email"
                                        value={emailRecipient}
                                        onChange={(e) =>
                                            setEmailRecipient(e.target.value)
                                        }
                                        placeholder="supplier@company.com"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">
                                        Subject
                                    </Label>
                                    <Input
                                        value={emailSubject}
                                        onChange={(e) =>
                                            setEmailSubject(e.target.value)
                                        }
                                        placeholder="Purchase Order subject"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">
                                        Message
                                    </Label>
                                    <textarea
                                        value={emailMessage}
                                        onChange={(e) =>
                                            setEmailMessage(e.target.value)
                                        }
                                        rows={4}
                                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                                        placeholder="Email message..."
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowEmailForm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSendEmail}
                                        disabled={isSending}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isSending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Send Email
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogHeader>

                {/* Printable Content */}
                <div
                    ref={printRef}
                    className="rounded-lg bg-white p-6 dark:bg-slate-800"
                >
                    {/* Company Header */}
                    <div className="mb-6 flex items-start justify-between border-b-2 border-slate-200 pb-6 dark:border-slate-700">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {company_name || 'Company Name'}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {company_address || 'Company Address'}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {company_phone && `Tel: ${company_phone}`}
                                {company_email && ` | Email: ${company_email}`}
                            </p>
                            {company_website && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {company_website}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                PURCHASE ORDER
                            </h2>
                            <div className="mt-2">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    P.O. Number:{' '}
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                        {po_number}
                                    </span>
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Date:{' '}
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {formatDate(order_date || created_at)}
                                    </span>
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    PR Number:{' '}
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                        {pr_number}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Supplier and Customer Info */}
                    <div className="mb-6 grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Supplier
                            </h3>
                            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    {supplier?.supplier_name ||
                                        supplier_name ||
                                        'N/A'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    {supplier?.address ||
                                        supplier_address ||
                                        'Address not provided'}
                                </p>
                                {supplier?.phone ||
                                    (supplier_phone && (
                                        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Phone className="h-3 w-3" />
                                            {supplier?.phone || supplier_phone}
                                        </p>
                                    ))}
                                {supplier?.email ||
                                    (supplier_email && (
                                        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <MailIcon className="h-3 w-3" />
                                            {supplier?.email || supplier_email}
                                        </p>
                                    ))}
                                {supplier?.contact_person && (
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        Contact: {supplier.contact_person}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Customer / Department
                            </h3>
                            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    {department?.name ||
                                        department_name ||
                                        'N/A'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Budget Code: {budget_code || 'N/A'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Created by: {created_by_name || 'N/A'}
                                </p>
                                {approved_by_name && (
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        Approved by: {approved_by_name}
                                        {approved_at &&
                                            ` on ${formatDateShort(approved_at)}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Shipping Information */}
                    <div className="mb-6 grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Shipping Terms
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {shipping_terms || 'Freight on Board'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Shipping Method
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {shipping_method || 'Standard'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Expected Delivery
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {formatDate(
                                    expected_delivery_date ||
                                        required_date ||
                                        'N/A',
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-6 overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-700">
                                    <th className="border border-slate-200 px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase dark:border-slate-600 dark:text-slate-300">
                                        Code
                                    </th>
                                    <th className="border border-slate-200 px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase dark:border-slate-600 dark:text-slate-300">
                                        Product Description
                                    </th>
                                    <th className="border border-slate-200 px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase dark:border-slate-600 dark:text-slate-300">
                                        Quantity
                                    </th>
                                    <th className="border border-slate-200 px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase dark:border-slate-600 dark:text-slate-300">
                                        Unit Price
                                    </th>
                                    <th className="border border-slate-200 px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase dark:border-slate-600 dark:text-slate-300">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                    >
                                        <td className="border border-slate-200 px-4 py-2 font-mono text-sm dark:border-slate-600">
                                            {item.product_code}
                                        </td>
                                        <td className="border border-slate-200 px-4 py-2 text-sm dark:border-slate-600">
                                            {item.product_name}
                                        </td>
                                        <td className="border border-slate-200 px-4 py-2 text-right text-sm dark:border-slate-600">
                                            {item.quantity}
                                        </td>
                                        <td className="border border-slate-200 px-4 py-2 text-right text-sm dark:border-slate-600">
                                            {formatCurrency(item.unit_price)}
                                        </td>
                                        <td className="border border-slate-200 px-4 py-2 text-right text-sm font-medium dark:border-slate-600">
                                            {formatCurrency(item.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-80">
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between py-1">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Subtotal
                                    </span>
                                    <span className="font-medium">
                                        {formatCurrency(subtotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Discount (10%)
                                    </span>
                                    <span className="font-medium text-red-600">
                                        -{formatCurrency(discount)}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Sales Tax (12%)
                                    </span>
                                    <span className="font-medium">
                                        {formatCurrency(tax)}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Shipping Cost
                                    </span>
                                    <span className="font-medium">
                                        {formatCurrency(shippingCost)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t-2 border-slate-200 py-2 text-base font-bold dark:border-slate-600">
                                    <span>Total</span>
                                    <span className="text-blue-600 dark:text-blue-400">
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {notes && (
                        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/10">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                <strong className="text-yellow-700 dark:text-yellow-500">
                                    Note:
                                </strong>{' '}
                                {notes}
                            </p>
                        </div>
                    )}

                    {/* Payment Terms */}
                    <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        <p>
                            Payment Terms:{' '}
                            {payment_terms ||
                                'Payment shall be 30 days upon receipt of the items above'}
                        </p>
                    </div>

                    {/* Barcode Section */}
                    <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
                        <div className="flex flex-col items-center">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600">
                                <Barcode
                                    value={barcodeData}
                                    width={1.5}
                                    height={60}
                                    format="CODE128"
                                    displayValue={true}
                                    font="monospace"
                                    fontSize={12}
                                    background="#ffffff"
                                    lineColor="#000000"
                                />
                            </div>
                            <div className="mt-2 font-mono text-xs text-slate-400 dark:text-slate-500">
                                PO: {po_number} | PR: {pr_number} | Total:{' '}
                                {formatCurrency(total_amount)}
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                                <span>Status: {status.toUpperCase()}</span>
                                <span>|</span>
                                <span>
                                    Created: {formatDateShort(created_at)}
                                </span>
                                <span>|</span>
                                <span>Priority: {priority.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="mt-8 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div className="grid grid-cols-3 gap-8">
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Prepared By
                                </p>
                                <div className="mt-6 w-40 border-t border-slate-300 dark:border-slate-600">
                                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                                        {created_by_name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Approved By
                                </p>
                                <div className="mt-6 w-40 border-t border-slate-300 dark:border-slate-600">
                                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                                        {approved_by_name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Received By
                                </p>
                                <div className="mt-6 w-40 border-t border-slate-300 dark:border-slate-600">
                                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                                        ________________
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 border-t border-slate-200 pt-4 text-center dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            This is a computer-generated document. No signature
                            is required.
                            <br />
                            Thank you for your business!
                        </p>
                    </div>
                </div>

                <DialogFooter className="border-t pt-4">
                    <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <FileText className="h-4 w-4" />
                            <span>{items.length} items</span>
                            <span className="text-slate-300">|</span>
                            <span>Total: {formatCurrency(total_amount)}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                            <Button
                                variant="default"
                                onClick={handlePrint}
                                className="flex items-center gap-2"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </Button>
                            <Button
                                variant="default"
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            >
                                {isGeneratingPDF ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
