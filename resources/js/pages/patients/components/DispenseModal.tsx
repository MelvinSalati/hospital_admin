import {
    X,
    Package,
    CheckCircle,
    AlertTriangle,
    Trash2,
    Minus,
    Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DispenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    prescription: any;
    editedItems: any[];
    isDispensing: boolean;
    onUpdateQuantity: (index: number, quantity: number) => void;
    onRemoveItem: (index: number) => void;
    onDispenseAll: () => void;
    getTotalDispensedQuantity: (items: any[]) => number;
    getTotalQuantity: (items: any[]) => number;
    getTotalPaidAmount: (items: any[]) => number;
}

export default function DispenseModal({
    isOpen,
    onClose,
    prescription,
    editedItems,
    isDispensing,
    onUpdateQuantity,
    onRemoveItem,
    onDispenseAll,
    getTotalDispensedQuantity,
    getTotalQuantity,
    getTotalPaidAmount,
}: DispenseModalProps) {
    if (!isOpen || !prescription) return null;

    const paidItems = editedItems.filter((i) => i.is_paid);
    const dispenseItems = editedItems.filter(
        (i) => i.quantity_dispensed > 0 && i.is_paid,
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Dispense Prescription
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
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Items List - 2/3 width */}
                        <div className="space-y-3 lg:col-span-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">
                                    Items to Dispense
                                </h3>
                                <span className="text-xs text-gray-500">
                                    {paidItems.length} paid item(s)
                                </span>
                            </div>
                            <div className="space-y-2">
                                {editedItems.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`rounded border p-3 ${
                                            item.is_removed
                                                ? 'border-gray-200 bg-gray-50'
                                                : item.is_paid
                                                  ? 'border-green-200 bg-white'
                                                  : 'border-red-200 bg-red-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium">
                                                        {item.name ||
                                                            item.medicine_name ||
                                                            item.drug_name}
                                                    </h4>
                                                    <span
                                                        className={`rounded-full px-1.5 py-0.5 text-xs ${
                                                            item.is_paid
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                        }`}
                                                    >
                                                        {item.is_paid
                                                            ? 'Paid'
                                                            : 'Unpaid'}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 text-xs text-gray-500">
                                                    {item.dosage ||
                                                        item.strength}{' '}
                                                    | {item.frequency} |{' '}
                                                    {item.route}
                                                </div>
                                            </div>
                                            {item.is_paid &&
                                                !item.is_removed && (
                                                    <button
                                                        onClick={() =>
                                                            onRemoveItem(idx)
                                                        }
                                                        className="p-1 text-red-600"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                        </div>

                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="text-xs">
                                                <span className="text-gray-600">
                                                    Prescribed:
                                                </span>
                                                <span className="font-medium">
                                                    {item.original_quantity}
                                                </span>
                                            </div>
                                            {item.is_paid &&
                                            !item.is_removed ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-600">
                                                        Dispense:
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                onUpdateQuantity(
                                                                    idx,
                                                                    item.quantity_dispensed -
                                                                        1,
                                                                )
                                                            }
                                                            className="rounded border p-0.5 hover:bg-gray-50"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={
                                                                item.quantity_dispensed
                                                            }
                                                            onChange={(e) =>
                                                                onUpdateQuantity(
                                                                    idx,
                                                                    parseInt(
                                                                        e.target
                                                                            .value,
                                                                    ) || 0,
                                                                )
                                                            }
                                                            className="w-14 rounded border px-1 py-0.5 text-center text-sm"
                                                            min="0"
                                                            max={
                                                                item.original_quantity
                                                            }
                                                        />
                                                        <button
                                                            onClick={() =>
                                                                onUpdateQuantity(
                                                                    idx,
                                                                    item.quantity_dispensed +
                                                                        1,
                                                                )
                                                            }
                                                            className="rounded border p-0.5 hover:bg-gray-50"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : item.is_removed ? (
                                                <span className="text-xs text-red-600">
                                                    Not Dispensed
                                                </span>
                                            ) : (
                                                <span className="text-xs text-red-600">
                                                    Payment Required
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary - 1/3 width */}
                        <div className="space-y-3">
                            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <Package className="h-4 w-4 text-green-600" />{' '}
                                    Summary
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-green-100 pb-1">
                                        <span className="text-gray-600">
                                            Paid Items:
                                        </span>
                                        <span className="font-semibold text-green-600">
                                            {paidItems.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-green-100 pb-1">
                                        <span className="text-gray-600">
                                            Unpaid:
                                        </span>
                                        <span className="font-semibold text-red-600">
                                            {
                                                editedItems.filter(
                                                    (i) => !i.is_paid,
                                                ).length
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-green-100 pb-1">
                                        <span className="text-gray-600">
                                            To Dispense:
                                        </span>
                                        <span className="font-semibold">
                                            {dispenseItems.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-green-100 pb-1">
                                        <span className="text-gray-600">
                                            Quantity:
                                        </span>
                                        <span className="font-semibold">
                                            {getTotalDispensedQuantity(
                                                editedItems,
                                            )}{' '}
                                            /{' '}
                                            {getTotalQuantity(
                                                prescription.items,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="font-medium">
                                            Total:
                                        </span>
                                        <span className="font-bold text-green-600">
                                            ZMW{' '}
                                            {getTotalPaidAmount(editedItems)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 text-blue-600" />
                                    <div className="text-xs text-blue-800">
                                        <p className="font-medium">
                                            Instructions:
                                        </p>
                                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                                            <li>Review each medication</li>
                                            <li>
                                                Only paid items can be dispensed
                                            </li>
                                            <li>Adjust quantities as needed</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={onClose}
                                    variant="outline"
                                    className="flex-1 text-sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={onDispenseAll}
                                    disabled={
                                        isDispensing ||
                                        dispenseItems.length === 0
                                    }
                                    className="flex-1 bg-green-600 text-sm hover:bg-green-700"
                                >
                                    {isDispensing ? (
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />{' '}
                                            Processing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle className="h-3.5 w-3.5" />{' '}
                                            Dispense
                                        </span>
                                    )}
                                </Button>
                            </div>
                            {dispenseItems.length === 0 && (
                                <p className="text-center text-xs text-red-600">
                                    No items selected for dispensing.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
