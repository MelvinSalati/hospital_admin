// components/pharmacy/PrintLabelModal.tsx

import React, { useState, useRef } from 'react';
import {
    X,
    Printer,
    Barcode,
    Package,
    Calendar,
    User,
    Building2,
    FileText,
    Check,
    AlertCircle,
    Hash,
    Tag,
    Layers,
    Clock,
} from 'lucide-react';

interface PrintLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    drug: {
        id: number;
        drug_name: string;
        drug_code: string;
        generic_name: string | null;
        brand_name: string | null;
        barcode: string | null;
        strength: string | null;
        dosage_form: string | null;
        unit_of_measure: string | null;
        pack_size: number | null;
        current_stock?: number;
    } | null;
    onPrint: (data: PrintLabelData) => void;
}

interface PrintLabelData {
    quantity: number;
    includeBarcode: boolean;
    includePrice: boolean;
    includeExpiry: boolean;
    notes: string;
}

export function PrintLabelModal({
    isOpen,
    onClose,
    drug,
    onPrint,
}: PrintLabelModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [includeBarcode, setIncludeBarcode] = useState(true);
    const [includePrice, setIncludePrice] = useState(false);
    const [includeExpiry, setIncludeExpiry] = useState(false);
    const [notes, setNotes] = useState('');
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !drug) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPrint({
            quantity,
            includeBarcode,
            includePrice,
            includeExpiry,
            notes,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm">
            <div className="w-full max-w-lg animate-in rounded-xl bg-white shadow-2xl duration-200 fade-in zoom-in dark:bg-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                            <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Print Label
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {drug.drug_name} • {drug.drug_code}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5">
                        {/* Two-Column Grid */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Left Column */}
                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Layers className="h-3 w-3" />
                                        Quantity to Print
                                    </label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) =>
                                            setQuantity(
                                                Math.max(
                                                    1,
                                                    parseInt(e.target.value) ||
                                                        1,
                                                ),
                                            )
                                        }
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        min="1"
                                        max="50"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Barcode className="h-3 w-3" />
                                        Label Options
                                    </label>
                                    <div className="mt-1 space-y-1.5">
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={includeBarcode}
                                                onChange={(e) =>
                                                    setIncludeBarcode(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                                Include Barcode
                                            </span>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={includePrice}
                                                onChange={(e) =>
                                                    setIncludePrice(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                                Include Price
                                            </span>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={includeExpiry}
                                                onChange={(e) =>
                                                    setIncludeExpiry(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                                Include Expiry Date
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Clock className="h-3 w-3" />
                                        Print Date
                                    </label>
                                    <input
                                        type="date"
                                        defaultValue={
                                            new Date()
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <User className="h-3 w-3" />
                                        Printed By
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Your name"
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <FileText className="h-3 w-3" />
                                        Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) =>
                                            setNotes(e.target.value)
                                        }
                                        placeholder="Optional notes..."
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Label Preview */}
                        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-slate-500" />
                                    <div>
                                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            {drug.drug_name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                            {drug.drug_code} •{' '}
                                            {drug.strength || ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        ×{quantity}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {drug.unit_of_measure || 'units'}
                                    </div>
                                </div>
                            </div>
                            {includeBarcode && drug.barcode && (
                                <div className="mt-1.5 flex justify-center border-t border-slate-200 pt-1.5 dark:border-slate-700">
                                    <div className="h-8 w-48 rounded bg-white">
                                        {/* Barcode placeholder - in production use a barcode library */}
                                        <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                                            {drug.barcode}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {quantity} label{quantity > 1 ? 's' : ''} to print
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print Label
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
