import {
    X,
    CheckCircle,
    AlertTriangle,
    ShoppingCart,
    ClipboardList,
    Pill,
} from 'lucide-react';
import React from 'react';
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
    price?: number | string;
    priority?: string;
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

interface ViewItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prescription: Prescription | null;
    onDispense: (prescription: Prescription) => void;
    getTotalItems: (items?: PrescriptionItem[]) => number;
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

const getItemQuantity = (item: PrescriptionItem): number =>
    item.quantity ?? item.dosage_amount ?? 1;

const getItemDosage = (item: PrescriptionItem): string => {
    const parts: string[] = [];
    if (item.dosage || item.strength)
        parts.push(item.dosage || item.strength || '');
    if (item.frequency) parts.push(item.frequency);
    if (item.route) parts.push(item.route);
    return parts.filter(Boolean).join(' | ') || 'N/A';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ViewItemsModal({
    isOpen,
    onClose,
    prescription,
    onDispense,
    getTotalItems,
    getTotalQuantity,
    getTotalAmount,
}: ViewItemsModalProps) {
    if (!isOpen || !prescription) return null;

    const items = prescription.items || [];
    const totalCount = getTotalItems(items);
    const totalQty = getTotalQuantity(items);
    const totalAmount = getTotalAmount(items);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 p-2">
                            <ClipboardList className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">
                                Prescription Details
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
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Items List */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold">
                                Prescribed Items ({totalCount})
                            </h3>
                            <div className="space-y-2">
                                {items.length === 0 ? (
                                    <div className="rounded border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-400">
                                        No items on this prescription.
                                    </div>
                                ) : (
                                    items.map((item, idx) => (
                                        <div
                                            key={item.id ?? idx}
                                            className="rounded border border-gray-200 bg-white p-3"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex flex-1 items-start gap-2">
                                                    <div className="rounded bg-blue-50 p-1.5 text-blue-600">
                                                        <Pill className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-gray-900">
                                                            {getItemName(item)}
                                                        </h4>
                                                        <div className="mt-0.5 text-xs text-gray-500">
                                                            {getItemDosage(
                                                                item,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-500">
                                                        Qty:
                                                    </span>{' '}
                                                    <span className="font-medium text-gray-800">
                                                        {getItemQuantity(item)}
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

                                            {item.notes && (
                                                <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-400 italic">
                                                    {item.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-3">
                            {/* Prescription Summary */}
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <CheckCircle className="h-4 w-4 text-blue-600" />
                                    Prescription Summary
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
                                            Total Quantity:
                                        </span>
                                        <span className="font-semibold">
                                            {totalQty}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="font-medium">
                                            Total:
                                        </span>
                                        <span className="font-bold text-blue-600">
                                            ZMW {totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Dispense Action */}
                            <div className="rounded-lg border p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <ShoppingCart className="h-4 w-4 text-green-600" />
                                    Dispense Action
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2 rounded border border-blue-100 bg-blue-50 p-2 text-xs text-blue-800">
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            Payment is processed after
                                            dispensation.
                                        </span>
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
                                            disabled={totalCount === 0}
                                            className="flex-1 bg-green-600 text-sm hover:bg-green-700"
                                        >
                                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                                            Dispense
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
