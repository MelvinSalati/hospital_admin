RequisitionViewModal; // components/modals/RequisitionViewModal.tsx

import React from 'react';
import {
    X,
    Package,
    FileText,
    Building2,
    User,
    Calendar,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Printer,
    Download,
} from 'lucide-react';

interface RequisitionViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    requisition: any;
    onApprove?: () => void;
    onReject?: () => void;
    formatCurrency: (amount: number) => string;
    formatDate: (date: string) => string;
}

const STATUS_CONFIG = {
    draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: FileText,
    },
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
    },
    converted: {
        label: 'Converted',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: Package,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: XCircle,
    },
};

const ITEM_STATUS_CONFIG = {
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: XCircle,
    },
};

export default function RequisitionViewModal({
    isOpen,
    onClose,
    requisition,
    onApprove,
    onReject,
    formatCurrency,
    formatDate,
}: RequisitionViewModalProps) {
    if (!isOpen || !requisition) return null;

    const statusInfo =
        STATUS_CONFIG[requisition.status as keyof typeof STATUS_CONFIG] ||
        STATUS_CONFIG.draft;
    const StatusIcon = statusInfo.icon;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                    Requisition Details
                                </h3>
                                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                                    {requisition.pr_number}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}
                            >
                                <StatusIcon className="h-4 w-4" />
                                {statusInfo.label}
                            </span>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Department
                                </p>
                                <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                                    {requisition.department_name || 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Budget
                                </p>
                                <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                                    {requisition.budget_code}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {requisition.budget_name}
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Total Amount
                                </p>
                                <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
                                    {formatCurrency(
                                        requisition.total_amount || 0,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Required By
                                </p>
                                <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                                    {formatDate(requisition.required_date)}
                                </p>
                            </div>
                        </div>

                        {/* Justification */}
                        {requisition.justification && (
                            <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Justification
                                </p>
                                <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                                    {requisition.justification}
                                </p>
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="mt-6">
                            <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                Requisition Items
                            </h4>
                            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Product
                                            </th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Qty
                                            </th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Unit Price
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Total
                                            </th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {requisition.items?.map((item: any) => {
                                            const itemStatus =
                                                ITEM_STATUS_CONFIG[
                                                    item.status as keyof typeof ITEM_STATUS_CONFIG
                                                ] || ITEM_STATUS_CONFIG.pending;
                                            const ItemIcon = itemStatus.icon;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                >
                                                    <td className="px-4 py-2">
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                            {item.product_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.product_code}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-sm text-slate-600 dark:text-slate-300">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-sm text-slate-600 dark:text-slate-300">
                                                        {formatCurrency(
                                                            item.estimated_unit_price,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                                                        {formatCurrency(
                                                            item.total ||
                                                                item.quantity *
                                                                    item.estimated_unit_price,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${itemStatus.color}`}
                                                        >
                                                            <ItemIcon className="h-3 w-3" />
                                                            {itemStatus.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-4 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300"
                                            >
                                                Total:
                                            </td>
                                            <td className="px-4 py-2 text-right text-sm font-bold text-slate-800 dark:text-slate-100">
                                                {formatCurrency(
                                                    requisition.total_amount ||
                                                        0,
                                                )}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Actions */}
                        {(requisition.status === 'pending' ||
                            requisition.status === 'draft') && (
                            <div className="mt-6 flex gap-3">
                                {requisition.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={onApprove}
                                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={onReject}
                                            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Reject
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                Created: {formatDate(requisition.created_at)}
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                                    <Printer className="h-4 w-4" />
                                    Print
                                </button>
                                <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                                    <Download className="h-4 w-4" />
                                    Download
                                </button>
                                <button
                                    onClick={onClose}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
