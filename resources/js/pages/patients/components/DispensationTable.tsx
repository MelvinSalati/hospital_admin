import {
    Package,
    Eye,
    ShoppingCart,
    CheckCircle,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DispensationTableProps {
    currentItems: any[];
    totalItems: number;
    startIndex: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (value: number) => void;
    itemsPerPageOptions: number[];
    onViewItems: (prescription: any) => void;
    onDispense: (prescription: any) => void;
    getPaidItemsCount: (items: any[]) => number;
    getTotalItems: (items: any[]) => number;
    getTotalQuantity: (items: any[]) => number;
    isItemPaid: (item: any) => boolean;
    areAllItemsPaid: (items: any[]) => boolean;
}

export default function DispensationTable({
    currentItems,
    totalItems,
    startIndex,
    itemsPerPage,
    currentPage,
    totalPages,
    onPageChange,
    onItemsPerPageChange,
    itemsPerPageOptions,
    onViewItems,
    onDispense,
    getPaidItemsCount,
    getTotalItems,
    getTotalQuantity,
    isItemPaid,
    areAllItemsPaid,
}: DispensationTableProps) {
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'dispensed':
                return 'bg-green-100 text-green-800';
            case 'partially_dispensed':
                return 'bg-blue-100 text-blue-800';
            case 'not_dispensed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid':
            case 'completed':
                return 'text-green-600 bg-green-50';
            case 'partial':
                return 'text-yellow-600 bg-yellow-50';
            case 'pending':
            case 'unpaid':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    if (!currentItems?.length) {
        return (
            <div className="rounded border bg-white py-8 text-center">
                <Package className="mx-auto h-10 w-10 text-gray-400 opacity-30" />
                <p className="text-sm text-gray-500">No prescriptions found</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded border bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Prescription #
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Date
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Items
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Qty
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Payment
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Status
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {currentItems.map((prescription) => {
                            const paidItemsCount = getPaidItemsCount(
                                prescription.items,
                            );
                            const totalItemsCount = getTotalItems(
                                prescription.items,
                            );
                            const allItemsPaid =
                                paidItemsCount === totalItemsCount &&
                                totalItemsCount > 0;

                            return (
                                <tr
                                    key={
                                        prescription.id ||
                                        prescription.prescription_number
                                    }
                                    className="hover:bg-gray-50"
                                >
                                    <td className="px-3 py-2 font-mono text-xs font-medium">
                                        {prescription.prescription_number}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">
                                        {new Date(
                                            prescription.date ||
                                                prescription.created_at,
                                        ).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                        <div>{totalItemsCount} item(s)</div>
                                        <div className="text-xs text-gray-400">
                                            {paidItemsCount}/{totalItemsCount}{' '}
                                            paid
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm font-medium">
                                        {getTotalQuantity(prescription.items)}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPaymentStatusColor(allItemsPaid ? 'paid' : 'pending')}`}
                                        >
                                            {allItemsPaid
                                                ? 'Paid'
                                                : `${paidItemsCount}/${totalItemsCount}`}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(prescription.status)}`}
                                        >
                                            {prescription.status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    onViewItems(prescription)
                                                }
                                                className="h-7 px-2 text-xs"
                                            >
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                            {prescription.status !==
                                                'dispensed' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        onDispense(prescription)
                                                    }
                                                    className={`h-7 px-2 text-xs ${!allItemsPaid ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                                    disabled={!allItemsPaid}
                                                >
                                                    <ShoppingCart className="h-3 w-3" />
                                                </Button>
                                            )}
                                            {prescription.status ===
                                                'dispensed' && (
                                                <span className="flex items-center gap-1 text-xs text-green-600">
                                                    <CheckCircle className="h-3 w-3" />
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t bg-gray-50 px-3 py-2 sm:flex-row">
                    <div className="text-xs text-gray-500">
                        {startIndex + 1}–
                        {Math.min(startIndex + itemsPerPage, totalItems)} of{' '}
                        {totalItems}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">Show:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) =>
                                    onItemsPerPageChange(Number(e.target.value))
                                }
                                className="rounded border px-1.5 py-0.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {itemsPerPageOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => onPageChange(1)}
                                disabled={currentPage === 1}
                                className="rounded border p-1 disabled:opacity-50"
                            >
                                <ChevronsLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="rounded border p-1 disabled:opacity-50"
                            >
                                <ChevronLeftIcon className="h-3.5 w-3.5" />
                            </button>
                            <span className="px-2 text-sm">
                                {currentPage}/{totalPages}
                            </span>
                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="rounded border p-1 disabled:opacity-50"
                            >
                                <ChevronRightIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => onPageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="rounded border p-1 disabled:opacity-50"
                            >
                                <ChevronsRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
