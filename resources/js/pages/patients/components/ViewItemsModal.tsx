import {
    X,
    CheckCircle,
    AlertTriangle,
    CreditCard,
    ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prescription: any;
    onDispense: (prescription: any) => void;
    getPaidItemsCount: (items: any[]) => number;
    getTotalItems: (items: any[]) => number;
    getTotalQuantity: (items: any[]) => number;
    isItemPaid: (item: any) => boolean;
}

export default function ViewItemsModal({
    isOpen,
    onClose,
    prescription,
    onDispense,
    getPaidItemsCount,
    getTotalItems,
    getTotalQuantity,
    isItemPaid,
}: ViewItemsModalProps) {
    if (!isOpen || !prescription) return null;

    const paidCount = getPaidItemsCount(prescription.items);
    const totalCount = getTotalItems(prescription.items);
    const allPaid = paidCount === totalCount && totalCount > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Prescription Details
                        </h2>
                        <p className="text-xs text-gray-500">
                            #{prescription.prescription_number}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 hover:bg-gray-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Items List */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold">
                                Prescribed Items ({totalCount})
                            </h3>
                            <div className="space-y-2">
                                {prescription.items?.map((item, idx) => {
                                    const paid = isItemPaid(item);
                                    return (
                                        <div
                                            key={idx}
                                            className={`rounded border p-3 ${paid ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-medium">
                                                            {item.name ||
                                                                item.drug_name ||
                                                                item.medicine_name}
                                                        </h4>
                                                        <span
                                                            className={`rounded-full px-1.5 py-0.5 text-xs ${paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                        >
                                                            {paid
                                                                ? 'Paid'
                                                                : 'Unpaid'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-gray-500">
                                                        {item.dosage ||
                                                            item.strength}{' '}
                                                        | {item.frequency} |{' '}
                                                        {item.route || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-500">
                                                        Qty:
                                                    </span>{' '}
                                                    {item.quantity ||
                                                        item.dosage_amount ||
                                                        1}
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">
                                                        Price:
                                                    </span>{' '}
                                                    ZMW {item.price || 0}
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-gray-500">
                                                        Total:
                                                    </span>{' '}
                                                    ZMW{' '}
                                                    {(item.price || 0) *
                                                        (item.quantity || 1)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-3">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <CreditCard className="h-4 w-4 text-blue-600" />{' '}
                                    Payment Summary
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-blue-100 pb-1">
                                        <span className="text-gray-600">
                                            Total Items:
                                        </span>
                                        <span className="font-semibold">
                                            {totalCount}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-blue-100 pb-1">
                                        <span className="text-gray-600">
                                            Paid:
                                        </span>
                                        <span className="font-semibold text-green-600">
                                            {paidCount}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-blue-100 pb-1">
                                        <span className="text-gray-600">
                                            Unpaid:
                                        </span>
                                        <span className="font-semibold text-red-600">
                                            {totalCount - paidCount}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="font-medium">
                                            Total:
                                        </span>
                                        <span className="font-bold text-blue-600">
                                            ZMW {prescription.total_amount || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <ShoppingCart className="h-4 w-4 text-green-600" />{' '}
                                    Dispense Action
                                </h3>
                                <div className="space-y-3">
                                    <div className="rounded border border-yellow-100 bg-yellow-50 p-2 text-xs text-yellow-800">
                                        Only paid items can be dispensed.
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={onClose}
                                            variant="outline"
                                            className="flex-1 text-sm"
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                onClose();
                                                onDispense(prescription);
                                            }}
                                            disabled={paidCount === 0}
                                            className={`flex-1 text-sm ${paidCount === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                        >
                                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />{' '}
                                            Dispense
                                        </Button>
                                    </div>
                                    {paidCount > 0 &&
                                        paidCount < totalCount && (
                                            <p className="text-center text-xs text-amber-600">
                                                {paidCount} of {totalCount}{' '}
                                                items will be dispensed.
                                            </p>
                                        )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
