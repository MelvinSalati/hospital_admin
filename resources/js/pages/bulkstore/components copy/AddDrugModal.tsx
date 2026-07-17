// components/pharmacy/AddDrugModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Check,
    Package,
    Barcode,
    Tag,
    Pill,
    Syringe,
    DollarSign,
    Shield,
    AlertCircle,
    Hash,
    Box,
    Calendar,
    ClipboardList,
    Building2,
    User,
    FileText,
    Plus,
    Minus,
    Layers,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface AddDrugModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddDrug: (drugData: DrugFormData) => void;
    searchQuery?: string;
}

interface DrugFormData {
    drug_code: string;
    drug_name: string;
    generic_name: string;
    brand_name: string;
    barcode: string;
    category_id: number | null;
    therapeutic_class: string;
    schedule_class: string;
    strength: string;
    dosage_form: string;
    route_of_administration: string;
    unit_of_measure: string;
    pack_size: number;
    minimum_stock_level: number;
    maximum_stock_level: number;
    reorder_level: number;
    purchase_price: number;
    selling_price: number;
    insurance_price: number;
    is_arv: boolean;
    is_tb_drug: boolean;
    is_emergency: boolean;
    is_controlled: boolean;
    track_batches: boolean;
    track_expiry: boolean;
    allow_negative_stock: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

const FormField: React.FC<{
    label: string;
    name: string;
    value: string | number | boolean;
    onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    icon?: React.ReactNode;
    options?: { value: string | number; label: string }[];
    className?: string;
}> = ({
    label,
    name,
    value,
    onChange,
    type = 'text',
    placeholder,
    required = false,
    icon,
    options,
    className = '',
}) => {
    return (
        <div className={`space-y-0.5 ${className}`}>
            <label className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">
                {icon}
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {options ? (
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="h-7 w-full rounded border border-slate-200 px-1.5 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                    <option value="">Select...</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    className="h-7 w-full rounded border border-slate-200 px-1.5 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
            )}
        </div>
    );
};

const CheckboxField: React.FC<{
    label: string;
    name: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, name, checked, onChange }) => {
    return (
        <label className="flex cursor-pointer items-center gap-1.5">
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
            />
            <span className="text-[10px] text-slate-600 dark:text-slate-400">
                {label}
            </span>
        </label>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function AddDrugModal({
    isOpen,
    onClose,
    onAddDrug,
    searchQuery = '',
}: AddDrugModalProps) {
    const [formData, setFormData] = useState<DrugFormData>({
        drug_code: '',
        drug_name: '',
        generic_name: '',
        brand_name: '',
        barcode: '',
        category_id: null,
        therapeutic_class: '',
        schedule_class: '',
        strength: '',
        dosage_form: '',
        route_of_administration: '',
        unit_of_measure: '',
        pack_size: 1,
        minimum_stock_level: 10,
        maximum_stock_level: 100,
        reorder_level: 20,
        purchase_price: 0,
        selling_price: 0,
        insurance_price: 0,
        is_arv: false,
        is_tb_drug: false,
        is_emergency: false,
        is_controlled: false,
        track_batches: true,
        track_expiry: true,
        allow_negative_stock: false,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const modalRef = useRef<HTMLDivElement>(null);

    // Pre-fill drug name from search query
    useEffect(() => {
        if (searchQuery && isOpen) {
            setFormData((prev) => ({
                ...prev,
                drug_name: searchQuery,
            }));
        }
    }, [searchQuery, isOpen]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : type === 'number'
                      ? parseFloat(value) || 0
                      : value,
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: checked }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.drug_name.trim()) {
            newErrors.drug_name = 'Drug name is required';
        }
        if (!formData.drug_code.trim()) {
            newErrors.drug_code = 'Drug code is required';
        }
        if (!formData.dosage_form) {
            newErrors.dosage_form = 'Dosage form is required';
        }
        if (formData.purchase_price < 0) {
            newErrors.purchase_price = 'Price cannot be negative';
        }
        if (formData.selling_price < 0) {
            newErrors.selling_price = 'Price cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            onAddDrug(formData);
            setIsSubmitting(false);
            onClose();
            // Reset form
            setFormData({
                drug_code: '',
                drug_name: '',
                generic_name: '',
                brand_name: '',
                barcode: '',
                category_id: null,
                therapeutic_class: '',
                schedule_class: '',
                strength: '',
                dosage_form: '',
                route_of_administration: '',
                unit_of_measure: '',
                pack_size: 1,
                minimum_stock_level: 10,
                maximum_stock_level: 100,
                reorder_level: 20,
                purchase_price: 0,
                selling_price: 0,
                insurance_price: 0,
                is_arv: false,
                is_tb_drug: false,
                is_emergency: false,
                is_controlled: false,
                track_batches: true,
                track_expiry: true,
                allow_negative_stock: false,
            });
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="relative max-h-[95vh] w-full max-w-4xl animate-in duration-200 fade-in zoom-in"
            >
                <div className="overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Add New Drug
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Drug not found in inventory - create new
                                    entry
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded p-0.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    {/* Form - Scrollable */}
                    <div className="max-h-[calc(95vh-140px)] overflow-y-auto p-4">
                        <form onSubmit={handleSubmit}>
                            {/* Two-Column Grid */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {/* Left Column */}
                                <div className="space-y-2">
                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <Package className="h-3 w-3" />
                                            Basic Information
                                        </h4>
                                        <div className="space-y-1.5">
                                            <FormField
                                                label="Drug Name"
                                                name="drug_name"
                                                value={formData.drug_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Amoxicillin 500mg"
                                                required
                                                icon={
                                                    <Pill className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Drug Code"
                                                name="drug_code"
                                                value={formData.drug_code}
                                                onChange={handleChange}
                                                placeholder="e.g., AMX-001"
                                                required
                                                icon={
                                                    <Hash className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Generic Name"
                                                name="generic_name"
                                                value={formData.generic_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Amoxicillin Trihydrate"
                                                icon={
                                                    <FileText className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Brand Name"
                                                name="brand_name"
                                                value={formData.brand_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Amoxil"
                                                icon={
                                                    <Tag className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Barcode"
                                                name="barcode"
                                                value={formData.barcode}
                                                onChange={handleChange}
                                                placeholder="Scan or enter barcode"
                                                icon={
                                                    <Barcode className="h-3 w-3" />
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <Box className="h-3 w-3" />
                                            Classification
                                        </h4>
                                        <div className="space-y-1.5">
                                            <FormField
                                                label="Therapeutic Class"
                                                name="therapeutic_class"
                                                value={
                                                    formData.therapeutic_class
                                                }
                                                onChange={handleChange}
                                                placeholder="e.g., Antibiotic"
                                                icon={
                                                    <ClipboardList className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Schedule Class"
                                                name="schedule_class"
                                                value={formData.schedule_class}
                                                onChange={handleChange}
                                                placeholder="e.g., Schedule 4"
                                                icon={
                                                    <Shield className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Dosage Form"
                                                name="dosage_form"
                                                value={formData.dosage_form}
                                                onChange={handleChange}
                                                placeholder="e.g., Tablet, Capsule, Syrup"
                                                required
                                                icon={
                                                    <Syringe className="h-3 w-3" />
                                                }
                                                options={[
                                                    {
                                                        value: 'Tablet',
                                                        label: 'Tablet',
                                                    },
                                                    {
                                                        value: 'Capsule',
                                                        label: 'Capsule',
                                                    },
                                                    {
                                                        value: 'Syrup',
                                                        label: 'Syrup',
                                                    },
                                                    {
                                                        value: 'Injection',
                                                        label: 'Injection',
                                                    },
                                                    {
                                                        value: 'Cream',
                                                        label: 'Cream',
                                                    },
                                                    {
                                                        value: 'Ointment',
                                                        label: 'Ointment',
                                                    },
                                                    {
                                                        value: 'Suspension',
                                                        label: 'Suspension',
                                                    },
                                                    {
                                                        value: 'Powder',
                                                        label: 'Powder',
                                                    },
                                                ]}
                                            />
                                            <FormField
                                                label="Route of Administration"
                                                name="route_of_administration"
                                                value={
                                                    formData.route_of_administration
                                                }
                                                onChange={handleChange}
                                                placeholder="e.g., Oral, Topical, IV"
                                                options={[
                                                    {
                                                        value: 'Oral',
                                                        label: 'Oral',
                                                    },
                                                    {
                                                        value: 'Topical',
                                                        label: 'Topical',
                                                    },
                                                    {
                                                        value: 'Intravenous',
                                                        label: 'Intravenous',
                                                    },
                                                    {
                                                        value: 'Intramuscular',
                                                        label: 'Intramuscular',
                                                    },
                                                    {
                                                        value: 'Subcutaneous',
                                                        label: 'Subcutaneous',
                                                    },
                                                    {
                                                        value: 'Inhalation',
                                                        label: 'Inhalation',
                                                    },
                                                    {
                                                        value: 'Ophthalmic',
                                                        label: 'Ophthalmic',
                                                    },
                                                    {
                                                        value: 'Otic',
                                                        label: 'Otic',
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-2">
                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <DollarSign className="h-3 w-3" />
                                            Pricing & Stock
                                        </h4>
                                        <div className="space-y-1.5">
                                            <FormField
                                                label="Unit of Measure"
                                                name="unit_of_measure"
                                                value={formData.unit_of_measure}
                                                onChange={handleChange}
                                                placeholder="e.g., Tablet, ML, GM"
                                                icon={
                                                    <Box className="h-3 w-3" />
                                                }
                                                options={[
                                                    {
                                                        value: 'Tablet',
                                                        label: 'Tablet',
                                                    },
                                                    {
                                                        value: 'Capsule',
                                                        label: 'Capsule',
                                                    },
                                                    {
                                                        value: 'ML',
                                                        label: 'ML',
                                                    },
                                                    {
                                                        value: 'GM',
                                                        label: 'GM',
                                                    },
                                                    {
                                                        value: 'Vial',
                                                        label: 'Vial',
                                                    },
                                                    {
                                                        value: 'Ampoule',
                                                        label: 'Ampoule',
                                                    },
                                                ]}
                                            />
                                            <FormField
                                                label="Pack Size"
                                                name="pack_size"
                                                value={formData.pack_size}
                                                onChange={handleChange}
                                                type="number"
                                                placeholder="e.g., 10"
                                                icon={
                                                    <Layers className="h-3 w-3" />
                                                }
                                            />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <FormField
                                                    label="Min Stock"
                                                    name="minimum_stock_level"
                                                    value={
                                                        formData.minimum_stock_level
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    icon={
                                                        <Minus className="h-3 w-3" />
                                                    }
                                                />
                                                <FormField
                                                    label="Max Stock"
                                                    name="maximum_stock_level"
                                                    value={
                                                        formData.maximum_stock_level
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    icon={
                                                        <Plus className="h-3 w-3" />
                                                    }
                                                />
                                            </div>
                                            <FormField
                                                label="Reorder Level"
                                                name="reorder_level"
                                                value={formData.reorder_level}
                                                onChange={handleChange}
                                                type="number"
                                                placeholder="e.g., 20"
                                                icon={
                                                    <AlertCircle className="h-3 w-3" />
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <DollarSign className="h-3 w-3" />
                                            Pricing
                                        </h4>
                                        <div className="space-y-1.5">
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <FormField
                                                    label="Purchase Price"
                                                    name="purchase_price"
                                                    value={
                                                        formData.purchase_price
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    placeholder="0.00"
                                                    icon={
                                                        <DollarSign className="h-3 w-3" />
                                                    }
                                                />
                                                <FormField
                                                    label="Selling Price"
                                                    name="selling_price"
                                                    value={
                                                        formData.selling_price
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    placeholder="0.00"
                                                    icon={
                                                        <DollarSign className="h-3 w-3" />
                                                    }
                                                />
                                                <FormField
                                                    label="Insurance Price"
                                                    name="insurance_price"
                                                    value={
                                                        formData.insurance_price
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    placeholder="0.00"
                                                    icon={
                                                        <DollarSign className="h-3 w-3" />
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <Shield className="h-3 w-3" />
                                            Flags & Tracking
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            <CheckboxField
                                                label="ARV Drug"
                                                name="is_arv"
                                                checked={formData.is_arv}
                                                onChange={handleCheckboxChange}
                                            />
                                            <CheckboxField
                                                label="TB Drug"
                                                name="is_tb_drug"
                                                checked={formData.is_tb_drug}
                                                onChange={handleCheckboxChange}
                                            />
                                            <CheckboxField
                                                label="Emergency"
                                                name="is_emergency"
                                                checked={formData.is_emergency}
                                                onChange={handleCheckboxChange}
                                            />
                                            <CheckboxField
                                                label="Controlled"
                                                name="is_controlled"
                                                checked={formData.is_controlled}
                                                onChange={handleCheckboxChange}
                                            />
                                            <CheckboxField
                                                label="Track Batches"
                                                name="track_batches"
                                                checked={formData.track_batches}
                                                onChange={handleCheckboxChange}
                                            />
                                            <CheckboxField
                                                label="Track Expiry"
                                                name="track_expiry"
                                                checked={formData.track_expiry}
                                                onChange={handleCheckboxChange}
                                            />
                                            <CheckboxField
                                                label="Allow Negative Stock"
                                                name="allow_negative_stock"
                                                checked={
                                                    formData.allow_negative_stock
                                                }
                                                onChange={handleCheckboxChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error Summary */}
                            {Object.keys(errors).length > 0 && (
                                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-1.5 dark:border-red-900 dark:bg-red-950/30">
                                    <p className="text-[10px] text-red-600 dark:text-red-400">
                                        Please fix the following errors:
                                    </p>
                                    <ul className="list-inside list-disc text-[9px] text-red-500">
                                        {Object.values(errors).map(
                                            (error, idx) => (
                                                <li key={idx}>{error}</li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-3 flex justify-end gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            Add Drug
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
