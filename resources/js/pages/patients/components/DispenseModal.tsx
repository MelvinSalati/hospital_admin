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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionItem {
    id?: number;
    drug_id?: number;
    name?: string;
    medicine_name?: string;
    drug_name?: string;
    service_name?: string;
    dosage?: string;
    strength?: string;
    frequency?: string;
    route?: string;
    notes?: string;
    quantity?: number;
    dosage_amount?: number;
    quantity_dispensed?: number;
    original_quantity?: number;
    price?: number | string;
    priority?: string;
    // Working-copy fields added by Dispensation.tsx
    status?: string;
    is_removed?: boolean;
    reason_not_dispensed?: string | null;
}

interface Prescription {
    id?: number;
    prescription_number: string;
    status: string;
    items: PrescriptionItem[];
    priority?: string;
    created_at?: string;
    prescribed_date?: string;
    patient_name?: string;
    patient_number?: string;
}

interface DispenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    prescription: Prescription | null;
    editedItems: PrescriptionItem[];
    isDispensing: boolean;
    onUpdateQuantity: (index: number, quantity: number) => void;
    onRemoveItem: (index: number) => void;
    onDispenseAll: () => void;
    getTotalDispensedQuantity: (items?: PrescriptionItem[]) => number;
    getTotalQuantity: (items?: PrescriptionItem[]) => number;
    getTotalAmount: (items?: PrescriptionItem[]) => number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parsePrice = (raw: unknown): number => {
    if (typeof raw === 'number') return isFinite(raw) ? raw : 0;
    if (typeof raw === 'string') {
        const n = parseFloat(raw.replace(/[^0-9.-]/g, ''));
        return isFinite(n) ? n : 0;
    }
    return 0;
};

const getItemName = (item: PrescriptionItem): string =>
    item.name ||
    item.medicine_name ||
    item.drug_name ||
    item.service_name ||
    'Drug';

const getItemDosage = (item: PrescriptionItem): string => {
    const parts: string[] = [];
    if (item.dosage || item.strength)
        parts.push(item.dosage || item.strength || '');
    if (item.frequency) parts.push(item.frequency);
    if (item.route) parts.push(item.route);
    return parts.filter(Boolean).join(' | ') || 'N/A';
};

// ─── Component ────────────────────────────────────────────────────────────────

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
    getTotalAmount,
}: DispenseModalProps) {
    if (!isOpen || !prescription) return null;

    // Items that will actually be dispensed (qty > 0, not removed)
    const dispenseItems = editedItems.filter(
        (i) => (i.quantity_dispensed ?? 0) > 0 && !i.is_removed,
    );
    const removedCount = editedItems.filter((i) => i.is_removed).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-3">
                        {/* ⬇️ Icon on the left of the title */}
                        <div className="rounded-full bg-green-100 p-2">
                            <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                Dispense Prescription
                            </h2>
                            <p className="font-mono text-xs text-gray-500">
                                #{prescription.prescription_number}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 hover:bg-gray-100"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Items List — 2/3 width */}
                        <div className="space-y-3 lg:col-span-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">
                                    Items to Dispense
                                </h3>
                                <span className="text-xs text-gray-500">
                                    {editedItems.length} item(s)
                                </span>
                            </div>

                            <div className="space-y-2">
                                {editedItems.length === 0 ? (
                                    <div className="rounded border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-400">
                                        No items to dispense.
                                    </div>
                                ) : (
                                    editedItems.map((item, idx) => (
                                        <div
                                            key={item.id ?? idx}
                                            className={`rounded border p-3 ${
                                                item.is_removed
                                                    ? 'border-gray-200 bg-gray-50 opacity-60'
                                                    : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-medium text-gray-900">
                                                        {getItemName(item)}
                                                    </h4>
                                                    <div className="mt-0.5 text-xs text-gray-500">
                                                        {getItemDosage(item)}
                                                    </div>
                                                    {item.notes && (
                                                        <div className="mt-1 text-xs text-gray-400 italic">
                                                            {item.notes}
                                                        </div>
                                                    )}
                                                </div>
                                                {!item.is_removed && (
                                                    <button
                                                        onClick={() =>
                                                            onRemoveItem(idx)
                                                        }
                                                        className="rounded p-1 text-red-600 hover:bg-red-50"
                                                        aria-label="Remove item"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-xs">
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Prescribed:
                                                        </span>{' '}
                                                        <span className="font-medium text-gray-800">
                                                            {item.original_quantity ??
                                                                item.quantity ??
                                                                1}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">
                                                            Price:
                                                        </span>{' '}
                                                        <span className="font-medium text-gray-800">
                                                            ZMW{' '}
                                                            {parsePrice(
                                                                item.price,
                                                            ).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {!item.is_removed ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-600">
                                                            Dispense:
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() =>
                                                                    onUpdateQuantity(
                                                                        idx,
                                                                        (item.quantity_dispensed ??
                                                                            0) -
                                                                            1,
                                                                    )
                                                                }
                                                                className="rounded border p-0.5 hover:bg-gray-50"
                                                                aria-label="Decrease quantity"
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={
                                                                    item.quantity_dispensed ??
                                                                    0
                                                                }
                                                                onChange={(e) =>
                                                                    onUpdateQuantity(
                                                                        idx,
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                            10,
                                                                        ) || 0,
                                                                    )
                                                                }
                                                                className="w-14 rounded border px-1 py-0.5 text-center text-sm"
                                                                min="0"
                                                                max={
                                                                    item.original_quantity ??
                                                                    item.quantity ??
                                                                    1
                                                                }
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    onUpdateQuantity(
                                                                        idx,
                                                                        (item.quantity_dispensed ??
                                                                            0) +
                                                                            1,
                                                                    )
                                                                }
                                                                className="rounded border p-0.5 hover:bg-gray-50"
                                                                aria-label="Increase quantity"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-red-600">
                                                        Not Dispensed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Summary — 1/3 width */}
                        <div className="space-y-3">
                            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <Package className="h-4 w-4 text-green-600" />
                                    Summary
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-green-100 pb-1">
                                        <span className="text-gray-600">
                                            Total Items:
                                        </span>
                                        <span className="font-semibold">
                                            {editedItems.length}
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
                                    {removedCount > 0 && (
                                        <div className="flex justify-between border-b border-green-100 pb-1">
                                            <span className="text-gray-600">
                                                Removed:
                                            </span>
                                            <span className="font-semibold text-red-600">
                                                {removedCount}
                                            </span>
                                        </div>
                                    )}
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
                                            {getTotalAmount(
                                                editedItems,
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                    <div className="text-xs text-blue-800">
                                        <p className="font-medium">
                                            Instructions:
                                        </p>
                                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                                            <li>Review each medication</li>
                                            <li>Adjust quantities as needed</li>
                                            <li>
                                                Use the trash icon to remove
                                                items not dispensed
                                            </li>
                                            <li>
                                                Payment is processed after
                                                dispensation
                                            </li>
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
