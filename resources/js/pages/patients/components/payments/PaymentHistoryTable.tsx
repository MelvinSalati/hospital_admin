// components/payments/PaymentHistoryTable.tsx
import { useState } from 'react';
import { Search, Eye, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import PaymentMethodBadge from './PaymentMethodBadge';

interface Payment {
    id: string;
    payment_date: string;
    reference_number: string;
    payment_method: string;
    amount: number;
    status: string;
}

interface PaymentHistoryTableProps {
    payments: Payment[];
    onView: (payment: Payment) => void;
}

export default function PaymentHistoryTable({
    payments,
    onView,
}: PaymentHistoryTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMethod, setFilterMethod] = useState('all');

    const filtered = payments.filter((p) => {
        const matchSearch =
            p.reference_number
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || p.status === filterStatus;
        const matchMethod =
            filterMethod === 'all' || p.payment_method === filterMethod;
        return matchSearch && matchStatus && matchMethod;
    });

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/50 p-3">
                <div className="min-w-[160px] flex-1">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full rounded border border-gray-200 py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                </select>
                <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Ref
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Method
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                Amount
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Status
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((payment) => (
                            <tr
                                key={payment.id}
                                className="transition-colors hover:bg-gray-50/60"
                            >
                                <td className="px-4 py-2.5 text-sm text-gray-600">
                                    {payment.payment_date}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                                    {payment.reference_number || '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                    <PaymentMethodBadge
                                        method={payment.payment_method}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                                    ZMW {payment.amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5">
                                    <StatusBadge status={payment.status} />
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onView(payment)}
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="py-10 text-center">
                    <Receipt className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                        No payments found
                    </p>
                </div>
            )}
        </div>
    );
}
