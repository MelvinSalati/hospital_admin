// components/payments/InvoiceDetailsModal.tsx
import { X, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';

interface InvoiceDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
}

export default function InvoiceDetailsModal({
    isOpen,
    onClose,
    invoice,
}: InvoiceDetailsModalProps) {
    if (!isOpen || !invoice) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Invoice Details
                        </h2>
                        <p className="text-xs text-gray-500">
                            #{invoice.invoice_number}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 p-5">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Status</span>
                        <StatusBadge status={invoice.status} />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">
                                Invoice Date
                            </p>
                            <p className="font-medium">{invoice.created_at}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Due Date</p>
                            <p className="font-medium">{invoice.due_date}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Items</h3>
                        <div className="overflow-hidden rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">
                                            Item
                                        </th>
                                        <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">
                                            Qty
                                        </th>
                                        <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">
                                            Unit Price
                                        </th>
                                        <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invoice.items?.map(
                                        (item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-1.5 text-sm text-gray-900">
                                                    {item.description}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-sm text-gray-900">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-sm text-gray-900">
                                                    ZMW{' '}
                                                    {item.unit_price?.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-sm text-gray-900">
                                                    ZMW{' '}
                                                    {item.total?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-3 py-1.5 text-right text-sm font-semibold"
                                        >
                                            Total:
                                        </td>
                                        <td className="px-3 py-1.5 text-right text-sm font-bold">
                                            ZMW{' '}
                                            {invoice.amount?.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Paid status */}
                    {invoice.paid_at && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-800">
                                Paid on: {invoice.paid_at}
                            </span>
                        </div>
                    )}

                    {/* Action */}
                    {invoice.status !== 'paid' && (
                        <Button className="w-full bg-blue-600 text-sm hover:bg-blue-700">
                            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />{' '}
                            Proceed to Checkout
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
