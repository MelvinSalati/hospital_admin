import JsBarcode from 'jsbarcode';
import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Check,
    Package,
    Barcode,
    Tag,
    Pill,
    Syringe,
    Shield,
    Hash,
    Box,
    ClipboardList,
    FileText,
    Plus,
    Calendar,
    QrCode,
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
    is_arv: boolean;
    is_tb_drug: boolean;
    is_emergency: boolean;
    is_controlled: boolean;
    track_batches: boolean;
    track_expiry: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

interface Category {
    id: number;
    name: string;
}

const MAX_VISIBLE = 50;

const CategoryCombobox: React.FC<{
    label: string;
    categories: Category[];
    selectedId: number | null;
    onSelect: (category: Category | null) => void;
    icon?: React.ReactNode;
    placeholder?: string;
}> = ({ label, categories, selectedId, onSelect, icon, placeholder }) => {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selected = categories.find((c) => c.id === selectedId) ?? null;

    // Debounce so filtering doesn't run on every keystroke
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 150);
        return () => clearTimeout(t);
    }, [query]);

    // Filter first, then cap what gets rendered
    const { visible, totalMatches } = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        const matches = q
            ? categories.filter((c) => c.name.toLowerCase().includes(q))
            : categories;
        return {
            visible: matches.slice(0, MAX_VISIBLE),
            totalMatches: matches.length,
        };
    }, [categories, debouncedQuery]);

    useEffect(() => setHighlight(0), [debouncedQuery]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const choose = (c: Category | null) => {
        onSelect(c);
        setOpen(false);
        setQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, visible.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter' && open && visible[highlight]) {
            e.preventDefault(); // don't submit the form
            choose(visible[highlight]);
        } else if (e.key === 'Escape' && open) {
            e.stopPropagation(); // don't close the whole modal
            setOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative space-y-0.5">
            <label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-700 dark:text-slate-300">
                {icon}
                {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    value={open ? query : (selected?.name ?? '')}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder ?? 'Search category...'}
                    autoComplete="off"
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-8 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {selected && (
                    <button
                        type="button"
                        onClick={() => choose(null)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="Clear selection"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {open && (
                <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {visible.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-slate-500">
                            No matching categories
                        </li>
                    ) : (
                        visible.map((c, i) => (
                            <li
                                key={c.id}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    choose(c);
                                }}
                                onMouseEnter={() => setHighlight(i)}
                                className={`cursor-pointer px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 ${
                                    i === highlight
                                        ? 'bg-blue-50 dark:bg-slate-700'
                                        : ''
                                } ${c.id === selectedId ? 'font-semibold' : ''}`}
                            >
                                {c.name}
                            </li>
                        ))
                    )}
                    {totalMatches > MAX_VISIBLE && (
                        <li className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400 dark:border-slate-700">
                            Showing {MAX_VISIBLE} of {totalMatches}. Keep typing
                            to narrow down.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};

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
            <label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-700 dark:text-slate-300">
                {icon}
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {options ? (
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
        <label className="flex cursor-pointer items-center gap-2">
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
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
    categories
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
        is_arv: false,
        is_tb_drug: false,
        is_emergency: false,
        is_controlled: false,
        track_batches: true,
        track_expiry: true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [barcodeGenerated, setBarcodeGenerated] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const barcodeRef = useRef<SVGSVGElement | null>(null);

    // Generate barcode when barcode value changes
    useEffect(() => {
        if (
            formData.barcode &&
            formData.barcode.length > 0 &&
            barcodeRef.current
        ) {
            try {
                JsBarcode(barcodeRef.current, formData.barcode, {
                    format: 'CODE128',
                    width: 1.5,
                    height: 50,
                    displayValue: true,
                    fontSize: 14,
                    font: 'monospace',
                    textMargin: 4,
                    background: '#ffffff',
                    lineColor: '#1e293b',
                });
                setBarcodeGenerated(true);
            } catch (error) {
                console.error('Error generating barcode:', error);
                setBarcodeGenerated(false);
            }
        } else {
            setBarcodeGenerated(false);
        }
    }, [formData.barcode]);

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
                is_arv: false,
                is_tb_drug: false,
                is_emergency: false,
                is_controlled: false,
                track_batches: true,
                track_expiry: true,
            });
            setBarcodeGenerated(false);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="relative w-full max-w-4xl animate-in duration-200 fade-in zoom-in"
            >
                <div className="overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                    Add New Drug
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Drug not found in inventory - create new
                                    entry
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Form - No overflow, fits content */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit}>
                            {/* Two-Column Grid */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Left Column */}
                                <div className="space-y-3">
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
                                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase dark:text-slate-300">
                                            <Package className="h-4 w-4" />
                                            Basic Information
                                        </h4>
                                        <div className="space-y-3">
                                            <FormField
                                                label="Drug Name"
                                                name="drug_name"
                                                value={formData.drug_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Amoxicillin 500mg"
                                                required
                                                icon={
                                                    <Pill className="h-4 w-4" />
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
                                                    <Hash className="h-4 w-4" />
                                                }
                                            />
                                            <FormField
                                                label="Generic Name"
                                                name="generic_name"
                                                value={formData.generic_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Amoxicillin Trihydrate"
                                                icon={
                                                    <FileText className="h-4 w-4" />
                                                }
                                            />
                                            <FormField
                                                label="Brand Name"
                                                name="brand_name"
                                                value={formData.brand_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Amoxil"
                                                icon={
                                                    <Tag className="h-4 w-4" />
                                                }
                                            />
                                            <FormField
                                                label="Barcode"
                                                name="barcode"
                                                value={formData.barcode}
                                                onChange={handleChange}
                                                placeholder="Scan or enter barcode"
                                                icon={
                                                    <Barcode className="h-4 w-4" />
                                                }
                                            />
                                            {/* Barcode Display */}
                                            {barcodeGenerated &&
                                                formData.barcode && (
                                                    <div className="mt-2 flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                                                        <div className="flex items-center gap-2 self-start">
                                                            <QrCode className="h-4 w-4 text-slate-500" />
                                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                                Generated
                                                                Barcode
                                                            </span>
                                                        </div>
                                                        <svg
                                                            ref={barcodeRef}
                                                            className="mt-1 w-full max-w-[280px]"
                                                        />
                                                    </div>
                                                )}
                                            {!barcodeGenerated &&
                                                formData.barcode &&
                                                formData.barcode.length > 0 && (
                                                    <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-center dark:border-yellow-900 dark:bg-yellow-950/30">
                                                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                                            Invalid barcode
                                                            format. Please enter
                                                            a valid barcode.
                                                        </p>
                                                    </div>
                                                )}
                                            <FormField
                                                label="Strength"
                                                name="strength"
                                                value={formData.strength}
                                                onChange={handleChange}
                                                placeholder="e.g., 500mg, 10mg/ml"
                                                icon={
                                                    <Box className="h-4 w-4" />
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}

                                <div className="space-y-3">
                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
                                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase dark:text-slate-300">
                                            <Box className="h-4 w-4" />
                                            Classification
                                        </h4>
                                        <div className="space-y-3">
                                            <CategoryCombobox
                                                label="Therapeutic Class"
                                                categories={categories}
                                                selectedId={
                                                    formData.category_id
                                                }
                                                icon={
                                                    <ClipboardList className="h-4 w-4" />
                                                }
                                                onSelect={(c) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        category_id:
                                                            c?.id ?? null,
                                                        therapeutic_class:
                                                            c?.name ?? '',
                                                    }))
                                                }
                                            />
                                            <FormField
                                                label="Schedule Class"
                                                name="schedule_class"
                                                value={formData.schedule_class}
                                                onChange={handleChange}
                                                placeholder="e.g., Schedule 4"
                                                icon={
                                                    <Shield className="h-4 w-4" />
                                                }
                                            />
                                            <FormField
                                                label="Dosage Form"
                                                name="dosage_form"
                                                value={formData.dosage_form}
                                                onChange={handleChange}
                                                placeholder="Select dosage form"
                                                required
                                                icon={
                                                    <Syringe className="h-4 w-4" />
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
                                                    {
                                                        value: 'Inhaler',
                                                        label: 'Inhaler',
                                                    },
                                                    {
                                                        value: 'Solution',
                                                        label: 'Solution',
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
                                                placeholder="Select route"
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
                                                    {
                                                        value: 'Rectal',
                                                        label: 'Rectal',
                                                    },
                                                    {
                                                        value: 'Vaginal',
                                                        label: 'Vaginal',
                                                    },
                                                ]}
                                            />
                                            <FormField
                                                label="Unit of Measure"
                                                name="unit_of_measure"
                                                value={formData.unit_of_measure}
                                                onChange={handleChange}
                                                placeholder="Select unit"
                                                icon={
                                                    <Box className="h-4 w-4" />
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
                                                    {
                                                        value: 'Each',
                                                        label: 'Each',
                                                    },
                                                    {
                                                        value: 'Unit',
                                                        label: 'Unit',
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                    {/* <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
                                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase dark:text-slate-300">
                                            <Shield className="h-4 w-4" />
                                            Drug Classification
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
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
                                                label="Emergency Drug"
                                                name="is_emergency"
                                                checked={formData.is_emergency}
                                                onChange={handleCheckboxChange}
                                            />
                                            <CheckboxField
                                                label="Controlled Substance"
                                                name="is_controlled"
                                                checked={formData.is_controlled}
                                                onChange={handleCheckboxChange}
                                            />
                                        </div>
                                    </div> */}

                                    {/* <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
                                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase dark:text-slate-300">
                                            <Calendar className="h-4 w-4" />
                                            Tracking Options
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
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
                                        </div>
                                    </div> */}

                                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
                                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase dark:text-slate-300">
                                            <Box className="h-4 w-4" />
                                            Packaging
                                        </h4>
                                        <FormField
                                            label="Pack Size"
                                            name="pack_size"
                                            value={formData.pack_size}
                                            onChange={handleChange}
                                            type="number"
                                            placeholder="e.g., 10"
                                            icon={<Box className="h-4 w-4" />}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Error Summary */}
                            {Object.keys(errors).length > 0 && (
                                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                        Please fix the following errors:
                                    </p>
                                    <ul className="list-inside list-disc text-sm text-red-500">
                                        {Object.values(errors).map(
                                            (error, idx) => (
                                                <li key={idx}>{error}</li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Footer with buttons - Always visible */}
                            <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
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
