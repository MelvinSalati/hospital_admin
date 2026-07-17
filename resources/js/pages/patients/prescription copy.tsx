import React, { useState, useEffect } from 'react';
import PatientLayout from "@/layouts/patients/PatientLayout";
import { Button } from '@/components/ui/button';
import { usePage, Link } from '@inertiajs/react';
import {
    X,
    Plus,
    Trash2,
    Edit2,
    Search,
    Save,
    Eye,
    Minus,
    CheckCircle2,
    ShoppingCart,
    AlertTriangle,
    ChevronDown,
    ChevronLeftIcon,
} from 'lucide-react';
import Http from '@/utils/Http';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'prescriptions', name: 'Prescriptions' },
    { id: 'bills', name: 'Bills' },
] as const;

type TabId = typeof TABS[number]['id'];

export type PricingScheme = 'cash' | 'nhima' | 'insurance' | 'charity' | 'mobile_money';

// Map mobile_money to cash for pricing
const getEffectiveScheme = (scheme: PricingScheme): PricingScheme => {
    return scheme === 'mobile_money' ? 'cash' : scheme;
};

const SCHEME_META: Record<PricingScheme, { label: string; color: string; bg: string; dbField: string }> = {
    cash:         { label: 'Cash',         color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dbField: 'cash_price' },
    nhima:        { label: 'NHIMA',        color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       dbField: 'nhima_price' },
    insurance:    { label: 'Insurance',    color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',   dbField: 'insurance_price' },
    charity:      { label: 'Charity',      color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     dbField: 'charity_price' },
    mobile_money: { label: 'Mobile Money', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dbField: 'cash_price' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
    id: number;
    service_uuid: string;
    department_id: number;
    service_name: string;
    service_category: string;
    service_code?: string;
    description?: string;
    cash_price?: number | string;
    nhima_price?: number | string;
    insurance_price?: number | string;
    charity_price?: number | string;
    provider_id?: number;
    duration_minutes?: number;
    requires_approval?: number;
    is_active?: number;
    dosage?: string;
    frequency?: string;
    stock?: number;
    presentation?: string;
    strength?: number;
    strength_unit?: string;
    default_item_per_dose?: number;
    default_frequency?: string;
    default_duration?: number;
    default_duration_unit?: string;
    route?: string;
    [key: string]: any;
}

interface CartItem extends Service {
    cartId: string;
    quantity: number;
    notes?: string;
}

interface PrescribedItem extends CartItem {
    prescribedDate: string;
    status: 'active' | 'completed' | 'cancelled';
    scheme: PricingScheme;
    patientId: number;
}

interface PatientPricing {
    patient_id: number;
    default_scheme: PricingScheme;
    cash_discount?: number;
    nhima_discount?: number;
    insurance_discount?: number;
    charity_discount?: number;
    mobile_money_discount?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert any value to number safely */
const toNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

/** Return the price for a given scheme based on database field mapping */
const getPriceForScheme = (service: Service, scheme: PricingScheme): number | null => {
    const effectiveScheme = getEffectiveScheme(scheme);
    const fieldName = SCHEME_META[effectiveScheme].dbField;
    const price = service[fieldName];
    return toNumber(price);
};

/** Format ZMW amount - safely handles null/undefined/string values */
const zmw = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '—';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '—';
    return `ZMW ${num.toFixed(2)}`;
};

// ─── Small reusable UI ────────────────────────────────────────────────────────

const StepIndicator = ({ step }: { step: 1 | 2 | 3 }) => {
    const steps = [
        { label: 'Search drugs', num: 1 },
        { label: 'Review cart',  num: 2 },
        { label: 'Save',         num: 3 },
    ];
    return (
        <div className="flex items-center gap-1.5">
            {steps.map((s, i) => {
                const done   = step > s.num;
                const active = step === s.num;
                return (
                    <div key={s.num} className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className={`
                                w-5 h-5 rounded-full text-[10px] font-medium flex items-center justify-center
                                ${done   ? 'bg-emerald-100 text-emerald-700' : ''}
                                ${active ? 'bg-blue-600 text-white' : ''}
                                ${!done && !active ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                            `}>
                                {done ? <CheckCircle2 className="w-3 h-3" /> : s.num}
                            </span>
                            <span className={`text-xs ${active ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-5 h-px ${step > s.num ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const CategoryBadge = ({ category }: { category?: string }) => {
    if (!category) return <span className="text-gray-400 text-xs">—</span>;
    return (
        <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium whitespace-nowrap">
            {category}
        </span>
    );
};

const StockIndicator = ({ stock }: { stock?: number }) => {
    if (stock === undefined) return <span className="text-gray-400 text-xs">N/A</span>;
    if (stock <= 5) return (
        <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />{stock}
        </span>
    );
    return <span className="text-gray-600 text-xs">{stock}</span>;
};

// ─── Cart Item Card ───────────────────────────────────────────────────────────

const CartItemCard = ({
    item,
    scheme,
    isEditing,
    editingItem,
    onEdit,
    onRemove,
    onUpdateQty,
    onEditChange,
    onSaveEdit,
    onCancelEdit,
}: {
    item: CartItem;
    scheme: PricingScheme;
    isEditing: boolean;
    editingItem: CartItem | null;
    onEdit: (item: CartItem) => void;
    onRemove: (cartId: string) => void;
    onUpdateQty: (cartId: string, qty: number) => void;
    onEditChange: (item: CartItem) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
}) => {
    const unitPrice = getPriceForScheme(item, scheme);
    const lineTotal = unitPrice != null ? unitPrice * item.quantity : null;

    if (isEditing && editingItem) {
        return (
            <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/40 space-y-2">
                <p className="text-xs font-medium text-blue-700 mb-1">Editing — {item.service_name}</p>
                <div>
                    <label className="text-[11px] text-gray-500 mb-0.5 block">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        value={editingItem.quantity}
                        onChange={e => onEditChange({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                        className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="text-[11px] text-gray-500 mb-0.5 block">Instructions / notes</label>
                    <textarea
                        value={editingItem.notes || ''}
                        onChange={e => onEditChange({ ...editingItem, notes: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="e.g. Take with food, full course required..."
                        rows={2}
                    />
                </div>
                <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={onSaveEdit} className="h-7 text-xs">
                        <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={onCancelEdit} className="h-7 text-xs">
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-gray-100 rounded-lg p-3 bg-white hover:border-gray-200 transition-colors">
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.service_name}</p>
                    <CategoryBadge category={item.service_category} />
                </div>
                <div className="flex gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(item)}
                        className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                        title="Edit"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onRemove(item.cartId)}
                        className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                        title="Remove"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onUpdateQty(item.cartId, item.quantity - 1)}
                        className="w-[22px] h-[22px] rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center tabular-nums">{item.quantity}</span>
                    <button
                        onClick={() => onUpdateQty(item.cartId, item.quantity + 1)}
                        className="w-[22px] h-[22px] rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] text-gray-400 ml-0.5">units</span>
                </div>
                <div className="text-right">
                    {unitPrice != null ? (
                        <>
                            <p className="text-sm font-semibold text-gray-900 tabular-nums">{zmw(lineTotal!)}</p>
                            <p className="text-[10px] text-gray-400 tabular-nums">{zmw(unitPrice)} / unit</p>
                        </>
                    ) : (
                        <p className="text-xs text-gray-400">No price for {SCHEME_META[scheme].label}</p>
                    )}
                </div>
            </div>

            {item.notes && (
                <p className="mt-1.5 text-[11px] text-gray-500 italic leading-snug line-clamp-2">
                    📝 {item.notes}
                </p>
            )}
        </div>
    );
};

// ─── Add Prescription Modal ───────────────────────────────────────────────────

const AddPrescriptionModal = ({
    isOpen,
    onClose,
    services,
    onSave,
    patientId,
    patientPricing,
}: {
    isOpen: boolean;
    onClose: () => void;
    services?: Service[];
    onSave: (items: CartItem[], scheme: PricingScheme) => Promise<void>;
    patientId: number;
    patientPricing?: PatientPricing;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [scheme] = useState<PricingScheme>(patientPricing?.default_scheme || 'cash');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const DURATION_UNITS = ['days', 'weeks', 'months'];
    const PRESENTATIONS = ['Tablet', 'Capsule', 'Ml', 'Mg', 'Gm', 'Injection', 'Syrup', 'Drops', 'Inhaler', 'Patch'];
    const ROUTES = [
        'Oral', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous (SC)',
        'Topical', 'Inhalation', 'Sublingual', 'Rectal', 'Ophthalmic', 'Otic', 'Nasal', 'Other'
    ];

    const FREQUENCY_OPTIONS = [
        { value: 'OD', label: 'OD (Once Daily)', timesPerDay: 1 },
        { value: 'BD', label: 'BD (Twice Daily)', timesPerDay: 2 },
        { value: 'TDS', label: 'TDS (Three Times Daily)', timesPerDay: 3 },
        { value: 'QID', label: 'QID (Four Times Daily)', timesPerDay: 4 },
        { value: 'Q4H', label: 'Q4H (Every 4 hours)', timesPerDay: 6 },
        { value: 'Q6H', label: 'Q6H (Every 6 hours)', timesPerDay: 4 },
        { value: 'Q8H', label: 'Q8H (Every 8 hours)', timesPerDay: 3 },
        { value: 'Q12H', label: 'Q12H (Every 12 hours)', timesPerDay: 2 },
        { value: 'Weekly', label: 'Weekly (Once a week)', timesPerDay: 1/7 },
        { value: 'Bi-Weekly', label: 'Bi-Weekly (Twice a week)', timesPerDay: 2/7 },
        { value: 'Monthly', label: 'Monthly (Once a month)', timesPerDay: 1/30 },
        { value: 'PRN', label: 'PRN (As needed)', timesPerDay: 0 },
    ];

    const [selectedDrug, setSelectedDrug] = useState<Service | null>(null);
    const [showDrugForm, setShowDrugForm] = useState(false);
    const [drugFormData, setDrugFormData] = useState({
        presentation: '',
        strength: '',
        strengthUnit: 'mg',
        itemPerDose: 1,
        frequency: 'OD',
        duration: 7,
        durationUnit: 'days',
        route: '',
        startDate: new Date().toISOString().split('T')[0],
        notes: '',
        calculatedQuantity: 0,
    });

    const effectiveScheme = getEffectiveScheme(scheme);
    const effectiveSchemeMeta = SCHEME_META[effectiveScheme];

    const filteredServices = services?.filter(s =>
        s.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.service_category?.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];

    const getTimesPerDay = (frequencyValue: string): number => {
        const option = FREQUENCY_OPTIONS.find(opt => opt.value === frequencyValue);
        return option?.timesPerDay || 0;
    };

    const calculateQuantity = (
        itemPerDose: number,
        frequencyValue: string,
        duration: number,
        durationUnit: string
    ): number => {
        const timesPerDay = getTimesPerDay(frequencyValue);
        if (timesPerDay === 0) return itemPerDose;

        let durationMultiplier = 1;
        switch (durationUnit) {
            case 'days': durationMultiplier = 1; break;
            case 'weeks': durationMultiplier = 7; break;
            case 'months': durationMultiplier = 30; break;
            default: durationMultiplier = 1;
        }

        const totalDays = duration * durationMultiplier;
        const totalQuantity = Math.ceil(itemPerDose * timesPerDay * totalDays);
        return totalQuantity;
    };

    const updateCalculatedQuantity = (updates: Partial<typeof drugFormData>) => {
        const newData = { ...drugFormData, ...updates };
        const quantity = calculateQuantity(
            newData.itemPerDose,
            newData.frequency,
            newData.duration,
            newData.durationUnit
        );
        setDrugFormData({ ...newData, calculatedQuantity: quantity });
    };

    const handleSelectDrug = (service: Service) => {
        const price = getPriceForScheme(service, scheme);
        if (!price) {
            alert(`This drug does not have a price set for ${effectiveSchemeMeta.label} scheme.`);
            return;
        }

        setSelectedDrug(service);
        setShowDrugForm(true);

        const defaultItemPerDose = (service as any).default_item_per_dose || 1;
        const defaultFrequency = (service as any).default_frequency || 'OD';
        const defaultDuration = (service as any).default_duration || 7;
        const defaultDurationUnit = (service as any).default_duration_unit || 'days';

        const initialQuantity = calculateQuantity(
            defaultItemPerDose,
            defaultFrequency,
            defaultDuration,
            defaultDurationUnit
        );

        setDrugFormData({
            presentation: (service as any).presentation || '',
            strength: (service as any).strength?.toString() || '',
            strengthUnit: (service as any).strength_unit || 'mg',
            itemPerDose: defaultItemPerDose,
            frequency: defaultFrequency,
            duration: defaultDuration,
            durationUnit: defaultDurationUnit,
            route: (service as any).route || '',
            startDate: new Date().toISOString().split('T')[0],
            notes: '',
            calculatedQuantity: initialQuantity,
        });

        setSearchTerm('');
    };

    const addToCartWithDetails = () => {
        if (!selectedDrug) return;

        const coursePrice = getPriceForScheme(selectedDrug, scheme);
        if (!coursePrice) return;

        const frequencyLabel = FREQUENCY_OPTIONS.find(opt => opt.value === drugFormData.frequency)?.label || drugFormData.frequency;

        const displayName = `${selectedDrug.service_name} ${drugFormData.strength}${drugFormData.strengthUnit} ${drugFormData.presentation}`;

        const cartItem: CartItem = {
            ...selectedDrug,
            service_name: displayName,
            cartId: `${selectedDrug.id}-${Date.now()}`,
            quantity: drugFormData.calculatedQuantity,
            notes: `
${drugFormData.notes}

Prescription Details:
• Presentation: ${drugFormData.itemPerDose} × ${drugFormData.presentation} (${drugFormData.strength}${drugFormData.strengthUnit})
• Frequency: ${frequencyLabel}
• Duration: ${drugFormData.duration} ${drugFormData.durationUnit}
• Route: ${drugFormData.route}
• Start Date: ${drugFormData.startDate}
• Total units to dispense: ${drugFormData.calculatedQuantity}
            `.trim(),
            dosage: `${drugFormData.strength}${drugFormData.strengthUnit}`,
            frequency: frequencyLabel,
            route: drugFormData.route,
        };

        setCart([...cart, cartItem]);
        setShowDrugForm(false);
        setSelectedDrug(null);
        setDrugFormData({
            presentation: '',
            strength: '',
            strengthUnit: 'mg',
            itemPerDose: 1,
            frequency: 'OD',
            duration: 7,
            durationUnit: 'days',
            route: '',
            startDate: new Date().toISOString().split('T')[0],
            notes: '',
            calculatedQuantity: 0,
        });
    };

    const removeFromCart = (cartId: string) => setCart(cart.filter(i => i.cartId !== cartId));

    const updateCartQuantity = (cartId: string, qty: number) => {
        if (qty < 1) return;
        setCart(cart.map(i => i.cartId === cartId ? { ...i, quantity: qty } : i));
    };

    const saveEdit = () => {
        if (editingItem) {
            setCart(cart.map(i => i.cartId === editingItem.cartId ? editingItem : i));
            setEditingItem(null);
        }
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSave(cart, scheme);
            setCart([]);
            setSearchTerm('');
            onClose();
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const total = cart.reduce((sum, item) => sum + (getPriceForScheme(item, scheme) ?? 0), 0);
    const step: 1 | 2 | 3 = cart.length === 0 ? 1 : 2;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />

            <div
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
                style={{ maxHeight: 'min(90vh, 680px)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">New Prescription</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Patient ID: {patientId} |
                            <span className={`ml-1 font-medium ${SCHEME_META[scheme].color}`}>
                                Payment Method: {SCHEME_META[scheme].label}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <StepIndicator step={step} />
                        <button onClick={onClose} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search drugs by name or category..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-0">
                    <div className="w-[58%] border-r border-gray-100 flex flex-col overflow-hidden">
                        {!showDrugForm ? (
                            <>
                                <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100">
                                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                        Available drugs
                                        {searchTerm && ` · ${filteredServices.length} result${filteredServices.length !== 1 ? 's' : ''}`}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {filteredServices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                                            <Search className="w-8 h-8 opacity-30" />
                                            <p className="text-sm">No drugs match your search</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {filteredServices.map(service => {
                                                const price = getPriceForScheme(service, scheme);
                                                const hasPrice = price != null;
                                                const isExpanded = expandedId === service.id;

                                                return (
                                                    <div key={service.id} className="p-3 hover:bg-gray-50/70 transition-colors">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-medium text-gray-900 text-sm">{service.service_name}</p>
                                                                    <CategoryBadge category={service.service_category} />
                                                                </div>
                                                                {service.description && (
                                                                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
                                                                )}
                                                                <div className="flex items-center gap-3 mt-1.5">
                                                                    <span className={`text-xs font-medium tabular-nums ${hasPrice ? 'text-gray-800' : 'text-red-500'}`}>
                                                                        {hasPrice ? zmw(price) : 'No price'}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400">(per course)</span>
                                                                    <StockIndicator stock={service.stock} />
                                                                    <button
                                                                        onClick={() => setExpandedId(isExpanded ? null : service.id)}
                                                                        className="text-gray-300 hover:text-gray-500"
                                                                    >
                                                                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleSelectDrug(service)}
                                                                disabled={!hasPrice}
                                                                className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap ${
                                                                    !hasPrice
                                                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                                        : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                            >
                                                                Select Drug
                                                            </button>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="mt-3 pt-2 border-t border-gray-100">
                                                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">All pricing schemes (per course)</p>
                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                                                    {(Object.keys(SCHEME_META) as PricingScheme[]).map(s => {
                                                                        const priceVal = getPriceForScheme(service, s);
                                                                        const m = SCHEME_META[s];
                                                                        return (
                                                                            <div key={s} className="flex justify-between">
                                                                                <span className={`text-[11px] ${m.color}`}>{m.label}</span>
                                                                                <span className="text-[11px] text-gray-600 tabular-nums">
                                                                                    {priceVal != null ? zmw(priceVal) : '—'}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wide">
                                            Prescribing: {selectedDrug?.service_name}
                                        </span>
                                        <p className="text-[10px] text-blue-600 mt-0.5">
                                            Course Price: {zmw(getPriceForScheme(selectedDrug!, scheme))}
                                            <span className="text-gray-400 ml-1">(fixed price per prescription)</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowDrugForm(false)}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        ← Back to search
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-2">
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Presentation *</label>
                                            <select
                                                value={drugFormData.presentation}
                                                onChange={e => updateCalculatedQuantity({ presentation: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="">-- Select --</option>
                                                {PRESENTATIONS.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Strength</label>
                                            <input
                                                type="text"
                                                value={drugFormData.strength}
                                                onChange={e => updateCalculatedQuantity({ strength: e.target.value })}
                                                placeholder="e.g., 200, 500"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Unit</label>
                                            <select
                                                value={drugFormData.strengthUnit}
                                                onChange={e => updateCalculatedQuantity({ strengthUnit: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="mg">mg</option>
                                                <option value="g">g</option>
                                                <option value="mcg">mcg</option>
                                                <option value="ml">ml</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Item Per Dose *</label>
                                            <input
                                                type="number"
                                                min="0.5"
                                                step="0.5"
                                                value={drugFormData.itemPerDose}
                                                onChange={e => updateCalculatedQuantity({ itemPerDose: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">e.g., 2 capsules per dose</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Route *</label>
                                            <select
                                                value={drugFormData.route}
                                                onChange={e => updateCalculatedQuantity({ route: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="">-- Select route --</option>
                                                {ROUTES.map(route => (
                                                    <option key={route} value={route}>{route}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-700 block mb-1">Frequency *</label>
                                        <select
                                            value={drugFormData.frequency}
                                            onChange={e => updateCalculatedQuantity({ frequency: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {FREQUENCY_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Duration *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={drugFormData.duration}
                                                onChange={e => updateCalculatedQuantity({ duration: parseInt(e.target.value) || 1 })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Duration Unit</label>
                                            <select
                                                value={drugFormData.durationUnit}
                                                onChange={e => updateCalculatedQuantity({ durationUnit: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                {DURATION_UNITS.map(unit => (
                                                    <option key={unit} value={unit}>{unit}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-700 block mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={drugFormData.startDate}
                                            onChange={e => updateCalculatedQuantity({ startDate: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Units to Dispense</p>
                                                <p className="text-2xl font-bold text-gray-800">{drugFormData.calculatedQuantity}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {drugFormData.itemPerDose} × {FREQUENCY_OPTIONS.find(opt => opt.value === drugFormData.frequency)?.label || drugFormData.frequency} × {drugFormData.duration} {drugFormData.durationUnit}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-500">Course Price (Fixed)</p>
                                                <p className="text-lg font-bold text-emerald-600">
                                                    {zmw(getPriceForScheme(selectedDrug!, scheme))}
                                                </p>
                                                <p className="text-[9px] text-gray-400">No quantity multiplication</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-700 block mb-1">Instructions / Notes</label>
                                        <textarea
                                            value={drugFormData.notes}
                                            onChange={e => setDrugFormData({ ...drugFormData, notes: e.target.value })}
                                            rows={2}
                                            placeholder="Additional instructions for the patient..."
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 border-t border-gray-100 bg-gray-50/60">
                                    <Button onClick={addToCartWithDetails} className="w-full h-9 text-sm">
                                        <Plus className="w-4 h-4 mr-1.5" />
                                        Add to Cart • {zmw(getPriceForScheme(selectedDrug!, scheme))} (fixed course price)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-[42%] flex flex-col overflow-hidden bg-gray-50/40">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50/60 border-b border-gray-100">
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Prescription cart</span>
                            {cart.length > 0 && (
                                <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-gray-400">
                                    <ShoppingCart className="w-10 h-10 opacity-25" />
                                    <p className="text-sm">Cart is empty</p>
                                    <p className="text-xs">Search and select a drug to add</p>
                                </div>
                            ) : (
                                cart.map(item => {
                                    const coursePrice = getPriceForScheme(item, scheme);
                                    return (
                                        <div key={item.cartId} className="border border-gray-100 rounded-lg p-3 bg-white">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{item.service_name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="text-xs text-emerald-600 font-medium">
                                                            {zmw(coursePrice)} (course)
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            Dispense: {item.quantity} units
                                                        </span>
                                                        {item.frequency && (
                                                            <span className="text-[10px] text-blue-600">
                                                                {item.frequency}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.cartId)}
                                                    className="text-gray-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {item.notes && (
                                                <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">{item.notes.substring(0, 100)}</p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-xs text-gray-400">Total · {SCHEME_META[scheme].label}</p>
                                        <p className="text-lg font-semibold text-gray-900 tabular-nums">{zmw(total)}</p>
                                        <p className="text-[9px] text-gray-400">Sum of course prices (not per unit)</p>
                                    </div>
                                </div>
                                <Button onClick={handleSaveClick} disabled={isSaving} className="w-full h-9 text-sm">
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {isSaving ? 'Saving...' : 'Save prescription'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Prescription Details Modal ───────────────────────────────────────────────

const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
    </div>
);

const PrescriptionDetailsModal = ({
    item,
    onClose,
}: {
    item: PrescribedItem;
    onClose: () => void;
}) => {
    const unitPrice = getPriceForScheme(item, item.scheme);
    const effectiveScheme = getEffectiveScheme(item.scheme);
    const effectiveSchemeMeta = SCHEME_META[effectiveScheme];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Prescription details</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <Field label="Drug / service" value={item.service_name} />
                    <Field label="Quantity"        value={String(item.quantity)} />
                    <Field label="Prescribed date" value={item.prescribedDate} />
                    <Field label="Patient ID"      value={String(item.patientId)} />
                    <Field label="Payment Method"  value={SCHEME_META[item.scheme].label} />
                    {item.scheme === 'mobile_money' && (
                        <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                            Mobile money payment uses cash pricing
                        </div>
                    )}
                    {item.dosage    && <Field label="Dosage"    value={item.dosage} />}
                    {item.frequency && <Field label="Frequency" value={item.frequency} />}
                    {item.description && <Field label="Description" value={item.description} />}

                    <div>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Billing Information</p>
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-600">
                                    Unit price ({effectiveSchemeMeta.label})
                                    {item.scheme === 'mobile_money' && ' (cash pricing)'}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {unitPrice != null ? zmw(unitPrice) : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                <span className="text-xs font-medium text-gray-600">Total billed</span>
                                <span className="text-base font-bold text-gray-900">
                                    {unitPrice != null ? zmw(unitPrice * item.quantity) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {item.notes && (
                        <div>
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Instructions / notes</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                {item.notes}
                            </p>
                        </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                        <span className={`
                            text-xs px-2.5 py-1 rounded-full font-medium
                            ${item.status === 'active'    ? 'bg-emerald-100 text-emerald-700' : ''}
                            ${item.status === 'completed' ? 'bg-gray-100 text-gray-500'       : ''}
                            ${item.status === 'cancelled' ? 'bg-red-100 text-red-600'         : ''}
                        `}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                    </div>
                </div>
                <div className="px-5 pb-5">
                    <Button onClick={onClose} variant="outline" className="w-full h-9 text-sm">Close</Button>
                </div>
            </div>
        </div>
    );
};

// ─── Prescribed Drugs Table ───────────────────────────────────────────────────

const PrescribedDrugsTable = ({ prescriptions: propPrescriptions }: { prescriptions: PrescribedItem[] }) => {
    const [selectedBundle, setSelectedBundle] = useState<{ prescription: PrescribedItem; items: PrescribedItem[] } | null>(null);
    const [prescriptionsList, setPrescriptionsList] = useState<PrescribedItem[]>([]);
    const { prescriptions: pagePrescriptions } = usePage().props as { prescriptions?: PrescribedItem[] };
    
    // Effect to update the array when either source changes
    useEffect(() => {
        const allPrescriptions = [
            ...(propPrescriptions || []),
            ...(pagePrescriptions || [])
        ];
        
        if (allPrescriptions.length > 0) {
            setPrescriptionsList(prevList => {
                const itemsMap = new Map();
                prevList.forEach(item => {
                    itemsMap.set(item.cartId, item);
                });
                allPrescriptions.forEach(item => {
                    itemsMap.set(item.cartId, item);
                });
                return Array.from(itemsMap.values());
            });
        }
    }, [propPrescriptions, pagePrescriptions]);
    
    // Get status badge color
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'completed': return 'bg-gray-100 text-gray-500';
            case 'cancelled': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-500';
        }
    };
    
    // Group prescriptions by prescription number
    const groupedPrescriptions = React.useMemo(() => {
        const groups: Record<string, PrescribedItem[]> = {};
        
        prescriptionsList.forEach(prescription => {
            let items: PrescribedItem[] = [];
            
            if (prescription.items && prescription.items.length > 0) {
                items = prescription.items;
            } else if (prescription.service_name) {
                items = [prescription];
            } else {
                items = [{ ...prescription, service_name: prescription.drug_name || 'Unknown Drugret' }];
            }
            
            const prescriptionNumber = prescription.prescription_number || `PRES-${prescription.id || 'unknown'}`;
            
            if (!groups[prescriptionNumber]) {
                groups[prescriptionNumber] = [];
            }
            
            groups[prescriptionNumber].push(...items);
        });
        
        return groups;
    }, [prescriptionsList]);
    
    if (!prescriptionsList?.length) return null;
    
    return (
        <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Prescribed Drugs</h3>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Prescription #</th>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Drugs Prescribed</th>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total Items</th>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Prescribed Date</th>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Status</th>
                            <th className="py-3 px-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {Object.entries(groupedPrescriptions).map(([prescriptionNumber, items]) => {
                            const totalItems = items.length;
                            const firstItem = items[0];
                            const status = firstItem.status || 'active';
                            
                            // Get unique drugs list for display
                            const drugNames = items.map(item => item.service_name || item.drug_name || 'Unknown');
                            const uniqueDrugs = [...new Set(drugNames)];
                            
                            return (
                                <tr key={prescriptionNumber} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="py-3 px-4 font-mono text-xs font-medium text-gray-900">
                                        {prescriptionNumber}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="space-y-1">
                                            {uniqueDrugs.slice(0, 3).map((drug, idx) => (
                                                <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                    {drug}
                                                </div>
                                            ))}
                                            {uniqueDrugs.length > 3 && (
                                                <div className="text-xs text-gray-400 mt-1">
                                                    +{uniqueDrugs.length - 3} more drug{uniqueDrugs.length - 3 !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm">
                                            {totalItems}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 text-sm">
                                        {firstItem.prescribedDate ? new Date(firstItem.prescribedDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(status)}`}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-gray-500 hover:text-gray-900"
                                            onClick={() => setSelectedBundle({ prescription: firstItem, items })}
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                            View Details
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Bundle Details Modal */}
            {selectedBundle && (
                <PrescriptionBundleModal
                    prescription={selectedBundle.prescription}
                    items={selectedBundle.items}
                    onClose={() => setSelectedBundle(null)}
                />
            )}
        </div>
    );
};

// PrescriptionBundleModal - No financial metrics, purely clinical
const PrescriptionBundleModal = ({ 
    prescription, 
    items, 
    onClose 
}: { 
    prescription: PrescribedItem; 
    items: PrescribedItem[]; 
    onClose: () => void;
}) => {
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    
    // Get status badge color
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'completed': return 'bg-gray-100 text-gray-500';
            case 'cancelled': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-500';
        }
    };
    
    // Get dosage instructions
    const getDosageInstructions = (item: PrescribedItem) => {
        const parts = [];
        if (item.dosage) parts.push(item.dosage);
        if (item.frequency) parts.push(item.frequency);
        if (item.route) parts.push(item.route);
        return parts.join(' • ') || '—';
    };
    
    // Parse duration and notes from item
    const getItemDetails = (item: PrescribedItem) => {
        let duration = '—';
        let instructions = item.notes || '';
        
        // Try to extract duration from notes if not explicitly set
        if (!duration && instructions) {
            const durationMatch = instructions.match(/Duration:\s*(\d+)\s*(\w+)/i);
            if (durationMatch) {
                duration = `${durationMatch[1]} ${durationMatch[2]}`;
            }
        }
        
        return { duration, instructions };
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Prescription Details
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            #{prescription.prescription_number || 'N/A'} • {items.length} medication{items.length !== 1 ? 's' : ''} prescribed
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Prescription Summary - Clinical Only */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] font-medium text-gray-400 uppercase">Total Medications</p>
                            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] font-medium text-gray-400 uppercase">Prescribed Date</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {prescription.prescribedDate ? new Date(prescription.prescribedDate).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] font-medium text-gray-400 uppercase">Status</p>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium inline-block ${getStatusColor(prescription.status)}`}>
                                {prescription.status ? prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1) : 'Active'}
                            </span>
                        </div>
                    </div>

                    {/* Medications Table - Clinical Details Only */}
                    {items.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700">Prescribed Medications</h4>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Medication</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Dosage & Frequency</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Route</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Quantity</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Duration</th>
                                        <th className="py-3 px-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item, idx) => {
                                        const isExpanded = expandedItem === item.cartId || expandedItem === String(idx);
                                        const itemId = item.cartId || String(idx);
                                        const dosageInstructions = getDosageInstructions(item);
                                        const { duration, instructions } = getItemDetails(item);
                                        
                                        return (
                                            <React.Fragment key={itemId}>
                                                <tr className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-gray-900">
                                                        {item.service_name || item.drug_name || 'Unknown'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {dosageInstructions}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {item.route || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 tabular-nums">
                                                        {item.quantity || 1} unit{item.quantity !== 1 ? 's' : ''}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {duration}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {instructions && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() => setExpandedItem(isExpanded ? null : itemId)}
                                                            >
                                                                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {isExpanded && instructions && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={6} className="py-3 px-4">
                                                            <div className="text-xs text-gray-600">
                                                                <span className="font-medium text-gray-700">Prescribing Instructions:</span>
                                                                <p className="mt-1 whitespace-pre-wrap leading-relaxed">{instructions}</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            No medications found in this prescription
                        </div>
                    )}

                    {/* Clinical Notes Section */}
                    {prescription.clinical_notes && (
                        <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Clinical Notes</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{prescription.clinical_notes}</p>
                        </div>
                    )}

                    {/* Dispensing Information */}
                    {prescription.dispensed_date && (
                        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Dispensing Information</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Dispensed Date:</span>
                                    <p className="font-medium text-gray-700">{new Date(prescription.dispensed_date).toLocaleDateString()}</p>
                                </div>
                                {prescription.dispensing_notes && (
                                    <div className="col-span-2">
                                        <span className="text-gray-500">Dispensing Notes:</span>
                                        <p className="text-gray-700 mt-1">{prescription.dispensing_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <Button onClick={onClose} variant="outline" className="h-9 text-sm">
                        Close
                    </Button>
                    <Button className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700">
                        Print Prescription
                    </Button>
                </div>
            </div>
        </div>
    );
};
// Updated PrescriptionBundleModal without pricing focus
// const PrescriptionBundleModal = ({ 
//     prescription, 
//     items, 
//     onClose 
// }: { 
//     prescription: PrescribedItem; 
//     items: PrescribedItem[]; 
//     onClose: () => void;
// }) => {
//     const [expandedItem, setExpandedItem] = useState<string | null>(null);
//     const schemeMeta = getSchemeMeta(prescription.scheme);
    
//     // Get status badge color
//     const getStatusColor = (status: string) => {
//         switch (status?.toLowerCase()) {
//             case 'active': return 'bg-emerald-100 text-emerald-700';
//             case 'completed': return 'bg-gray-100 text-gray-500';
//             case 'cancelled': return 'bg-red-100 text-red-600';
//             default: return 'bg-gray-100 text-gray-500';
//         }
//     };
    
//     // Group items by type (medications, instructions, etc.)
//     const medications = items.filter(item => item.service_name || item.drug_name);
    
//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
//             <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
//             <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
//                 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
//                     <div>
//                         <h3 className="text-lg font-semibold text-gray-900">
//                             Prescription Details
//                         </h3>
//                         <p className="text-xs text-gray-500 mt-1">
//                             #{prescription.prescription_number || 'N/A'} • {items.length} item{items.length !== 1 ? 's' : ''} prescribed
//                         </p>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
//                     >
//                         <X className="w-4 h-4" />
//                     </button>
//                 </div>

//                 <div className="flex-1 overflow-y-auto p-6">
//                     {/* Prescription Summary */}
//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Total Medications</p>
//                             <p className="text-2xl font-bold text-gray-900">{medications.length}</p>
//                         </div>
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Payment Method</p>
//                             <p className={`text-sm font-semibold ${schemeMeta.color}`}>{schemeMeta.label}</p>
//                         </div>
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Prescribed Date</p>
//                             <p className="text-sm font-semibold text-gray-900">
//                                 {prescription.prescribedDate ? new Date(prescription.prescribedDate).toLocaleDateString() : 'N/A'}
//                             </p>
//                         </div>
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Status</p>
//                             <span className={`text-xs px-2 py-1 rounded-full font-medium inline-block ${getStatusColor(prescription.status)}`}>
//                                 {prescription.status ? prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1) : 'Active'}
//                             </span>
//                         </div>
//                     </div>

//                     {/* Medications Table */}
//                     {medications.length > 0 ? (
//                         <div className="border border-gray-200 rounded-lg overflow-hidden">
//                             <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
//                                 <h4 className="text-sm font-semibold text-gray-700">Prescribed Medications</h4>
//                             </div>
//                             <table className="w-full text-sm">
//                                 <thead className="bg-gray-50 border-b border-gray-200">
//                                     <tr>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Medication</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Dosage</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Frequency</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Route</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Quantity</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Duration</th>
//                                         <th className="py-3 px-4"></th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                     {medications.map((item, idx) => {
//                                         const isExpanded = expandedItem === item.cartId || expandedItem === String(idx);
//                                         const itemId = item.cartId || String(idx);
                                        
//                                         // Parse duration from notes if available
//                                         let duration = '—';
//                                         if (item.notes) {
//                                             const durationMatch = item.notes.match(/Duration: (\d+) (\w+)/);
//                                             if (durationMatch) {
//                                                 duration = `${durationMatch[1]} ${durationMatch[2]}`;
//                                             }
//                                         }
                                        
//                                         return (
//                                             <React.Fragment key={itemId}>
//                                                 <tr className="hover:bg-gray-50/60 transition-colors">
//                                                     <td className="py-3 px-4 font-medium text-gray-900">
//                                                         {item.service_name || item.drug_name || 'Unknown'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {item.dosage || '—'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {item.frequency || '—'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {item.route || '—'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600 tabular-nums">
//                                                         {item.quantity || 1}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {duration}
//                                                     </td>
//                                                     <td className="py-3 px-4">
//                                                         {item.notes && (
//                                                             <Button
//                                                                 variant="ghost"
//                                                                 size="sm"
//                                                                 className="h-7 text-xs"
//                                                                 onClick={() => setExpandedItem(isExpanded ? null : itemId)}
//                                                             >
//                                                                 <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
//                                                             </Button>
//                                                         )}
//                                                     </td>
//                                                 </tr>
//                                                 {isExpanded && item.notes && (
//                                                     <tr className="bg-gray-50">
//                                                         <td colSpan={7} className="py-3 px-4">
//                                                             <div className="text-xs text-gray-600">
//                                                                 <span className="font-medium text-gray-700">Prescribing Instructions:</span>
//                                                                 <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.notes}</p>
//                                                             </div>
//                                                         </td>
//                                                     </tr>
//                                                 )}
//                                             </React.Fragment>
//                                         );
//                                     })}
//                                 </tbody>
//                             </table>
//                         </div>
//                     ) : (
//                         <div className="text-center py-12 text-gray-400">
//                             No medications found in this prescription
//                         </div>
//                     )}

//                     {/* Additional Clinical Notes */}
//                     {prescription.clinical_notes && (
//                         <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
//                             <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-2">Clinical Notes</p>
//                             <p className="text-sm text-gray-700">{prescription.clinical_notes}</p>
//                         </div>
//                     )}
//                 </div>

//                 <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
//                     <Button onClick={onClose} variant="outline" className="h-9 text-sm">
//                         Close
//                     </Button>
//                     <Button className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700">
//                         Print Prescription
//                     </Button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// Updated PrescriptionBundleModal without pricing focus
// const PrescriptionBundleModal = ({ 
//     prescription, 
//     items, 
//     onClose 
// }: { 
//     prescription: PrescribedItem; 
//     items: PrescribedItem[]; 
//     onClose: () => void;
// }) => {
//     const [expandedItem, setExpandedItem] = useState<string | null>(null);
//     const schemeMeta = getSchemeMeta(prescription.scheme);
    
//     // Get status badge color
//     const getStatusColor = (status: string) => {
//         switch (status?.toLowerCase()) {
//             case 'active': return 'bg-emerald-100 text-emerald-700';
//             case 'completed': return 'bg-gray-100 text-gray-500';
//             case 'cancelled': return 'bg-red-100 text-red-600';
//             default: return 'bg-gray-100 text-gray-500';
//         }
//     };
    
//     // Group items by type (medications, instructions, etc.)
//     const medications = items.filter(item => item.service_name || item.drug_name);
    
//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
//             <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
//             <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
//                 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
//                     <div>
//                         <h3 className="text-lg font-semibold text-gray-900">
//                             Prescription Details
//                         </h3>
//                         <p className="text-xs text-gray-500 mt-1">
//                             #{prescription.prescription_number || 'N/A'} • {items.length} item{items.length !== 1 ? 's' : ''} prescribed
//                         </p>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
//                     >
//                         <X className="w-4 h-4" />
//                     </button>
//                 </div>

//                 <div className="flex-1 overflow-y-auto p-6">
//                     {/* Prescription Summary */}
//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Total Medications</p>
//                             <p className="text-2xl font-bold text-gray-900">{medications.length}</p>
//                         </div>
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Payment Method</p>
//                             <p className={`text-sm font-semibold ${schemeMeta.color}`}>{schemeMeta.label}</p>
//                         </div>
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Prescribed Date</p>
//                             <p className="text-sm font-semibold text-gray-900">
//                                 {prescription.prescribedDate ? new Date(prescription.prescribedDate).toLocaleDateString() : 'N/A'}
//                             </p>
//                         </div>
//                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
//                             <p className="text-[10px] font-medium text-gray-400 uppercase">Status</p>
//                             <span className={`text-xs px-2 py-1 rounded-full font-medium inline-block ${getStatusColor(prescription.status)}`}>
//                                 {prescription.status ? prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1) : 'Active'}
//                             </span>
//                         </div>
//                     </div>

//                     {/* Medications Table */}
//                     {medications.length > 0 ? (
//                         <div className="border border-gray-200 rounded-lg overflow-hidden">
//                             <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
//                                 <h4 className="text-sm font-semibold text-gray-700">Prescribed Medications</h4>
//                             </div>
//                             <table className="w-full text-sm">
//                                 <thead className="bg-gray-50 border-b border-gray-200">
//                                     <tr>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Medication</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Dosage</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Frequency</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Route</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Quantity</th>
//                                         <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Duration</th>
//                                         <th className="py-3 px-4"></th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                     {medications.map((item, idx) => {
//                                         const isExpanded = expandedItem === item.cartId || expandedItem === String(idx);
//                                         const itemId = item.cartId || String(idx);
                                        
//                                         // Parse duration from notes if available
//                                         let duration = '—';
//                                         if (item.notes) {
//                                             const durationMatch = item.notes.match(/Duration: (\d+) (\w+)/);
//                                             if (durationMatch) {
//                                                 duration = `${durationMatch[1]} ${durationMatch[2]}`;
//                                             }
//                                         }
                                        
//                                         return (
//                                             <React.Fragment key={itemId}>
//                                                 <tr className="hover:bg-gray-50/60 transition-colors">
//                                                     <td className="py-3 px-4 font-medium text-gray-900">
//                                                         {item.service_name || item.drug_name || 'Unknown'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {item.dosage || '—'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {item.frequency || '—'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {item.route || '—'}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600 tabular-nums">
//                                                         {item.quantity || 1}
//                                                     </td>
//                                                     <td className="py-3 px-4 text-gray-600">
//                                                         {duration}
//                                                     </td>
//                                                     <td className="py-3 px-4">
//                                                         {item.notes && (
//                                                             <Button
//                                                                 variant="ghost"
//                                                                 size="sm"
//                                                                 className="h-7 text-xs"
//                                                                 onClick={() => setExpandedItem(isExpanded ? null : itemId)}
//                                                             >
//                                                                 <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
//                                                             </Button>
//                                                         )}
//                                                     </td>
//                                                 </tr>
//                                                 {isExpanded && item.notes && (
//                                                     <tr className="bg-gray-50">
//                                                         <td colSpan={7} className="py-3 px-4">
//                                                             <div className="text-xs text-gray-600">
//                                                                 <span className="font-medium text-gray-700">Prescribing Instructions:</span>
//                                                                 <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.notes}</p>
//                                                             </div>
//                                                         </td>
//                                                     </tr>
//                                                 )}
//                                             </React.Fragment>
//                                         );
//                                     })}
//                                 </tbody>
//                             </table>
//                         </div>
//                     ) : (
//                         <div className="text-center py-12 text-gray-400">
//                             No medications found in this prescription
//                         </div>
//                     )}

//                     {/* Additional Clinical Notes */}
//                     {prescription.clinical_notes && (
//                         <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
//                             <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-2">Clinical Notes</p>
//                             <p className="text-sm text-gray-700">{prescription.clinical_notes}</p>
//                         </div>
//                     )}
//                 </div>

//                 <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
//                     <Button onClick={onClose} variant="outline" className="h-9 text-sm">
//                         Close
//                     </Button>
//                     <Button className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700">
//                         Print Prescription
//                     </Button>
//                 </div>
//             </div>
//         </div>
//     );
// };


// ─── Prescriptions Tab ────────────────────────────────────────────────────────

const PrescriptionsTab = ({
    services,
    patientId,
    patientPricing
}: {
    services?: Service[];
    patientId: number;
    patientPricing?: PatientPricing;
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prescriptions, setPrescriptions] = useState<PrescribedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const defaultScheme = patientPricing?.default_scheme || 'cash';
    const effectiveScheme = getEffectiveScheme(defaultScheme);

    // Fetch prescriptions on mount
    useEffect(() => {
        const fetchPrescriptions = async () => {
            try {
                const response = await Http.get(`/patients/${patientId}/prescriptions`);
                if (response.data.success) {
                    const fetchedPrescriptions = response.data.data.map((prescription: any) => ({
                        ...prescription,
                        prescribedDate: new Date(prescription.prescribed_date).toLocaleDateString(),
                        status: prescription.status,
                        scheme: prescription.invoice?.payment_scheme || 'cash',
                        patientId: patientId,
                        ...(prescription.items?.[0] || {})
                    }));
                    setPrescriptions(fetchedPrescriptions);
                }
            } catch (error) {
                console.error('Error fetching prescriptions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrescriptions();
    }, [patientId]);

    const handleSave = async (items: CartItem[], scheme: PricingScheme) => {
        const response = await Http.post(`/patients/${patientId}/prescriptions`, {
            items: items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                dosage: item.dosage,
                frequency: item.frequency,
                route: item.route,
                notes: item.notes,
            })),
            scheme: scheme,
            clinical_notes: null,
        });

        if (response.data.success) {
            const dated: PrescribedItem[] = items.map(item => ({
                ...item,
                prescribedDate: new Date().toLocaleDateString(),
                status: 'active',
                scheme,
                patientId,
            }));
            setPrescriptions(prev => [...prev, ...dated]);
            alert('Prescription and invoice created successfully!');
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading prescriptions...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b p-2">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Prescriptions</h2>
                  
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="h-9 text-sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    New prescription
                </Button>
            </div>
            <PrescribedDrugsTable prescriptions={prescriptions} />

            <AddPrescriptionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                services={services}
                onSave={handleSave}
                patientId={patientId}
                patientPricing={patientPricing}
            />
        </div>
    );
};

// ─── Bills Tab ────────────────────────────────────────────────────────────────

// ─── Bills Tab (SHOWS ALL BILLING/PAYMENT INFO) ───────────────────────────────

const BillsTab = ({ patientId }: { patientId: number }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const response = await Http.get(`/patients/${patientId}/invoices`);
                if (response.data.success) {
                    setInvoices(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [patientId]);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-100 text-emerald-700';
            case 'draft': return 'bg-gray-100 text-gray-600';
            case 'sent': return 'bg-blue-100 text-blue-700';
            case 'overdue': return 'bg-red-100 text-red-600';
            case 'cancelled': return 'bg-gray-100 text-gray-500';
            default: return 'bg-amber-100 text-amber-700';
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading invoices...</div>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
                <p className="text-xs text-gray-400 mt-0.5">View all invoices and payment details</p>
            </div>

            {invoices.length > 0 ? (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Invoice #</th>
                                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Date</th>
                                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Payment Method</th>
                                <th className="text-right py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Subtotal</th>
                                <th className="text-right py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total</th>
                                <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Status</th>
                                <th className="py-3 px-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.map((invoice) => {
                                const schemeMeta = SCHEME_META[invoice.payment_scheme || 'cash'];
                                return (
                                    <tr key={invoice.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="py-3 px-4 font-mono text-xs text-gray-600">
                                            {invoice.invoice_number}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {new Date(invoice.issue_date).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${schemeMeta.bg} ${schemeMeta.color}`}>
                                                {schemeMeta.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-700 tabular-nums">
                                            {zmw(invoice.subtotal)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-gray-900 tabular-nums">
                                            {zmw(invoice.total)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                                                {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-gray-500"
                                                onClick={() => setSelectedInvoice(invoice)}
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-100">
                            <tr>
                                <td colSpan={4} className="py-3 px-4 text-right text-sm font-medium text-gray-700">
                                    Total Outstanding:
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
                                    {zmw(invoices.reduce((sum, inv) => sum + (inv.due_amount || 0), 0))}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : (
                <div className="text-gray-400 text-sm text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                    No invoices found for this patient
                </div>
            )}

            {/* Invoice Details Modal */}
            {selectedInvoice && (
                <InvoiceDetailsModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
            )}
        </div>
    );
};

// ─── Invoice Details Modal (Shows Full Billing Info) ──────────────────────────

const InvoiceDetailsModal = ({ invoice, onClose }: { invoice: any; onClose: () => void }) => {
    const schemeMeta = SCHEME_META[invoice.payment_scheme || 'cash'];
    const isPaid = invoice.status?.toLowerCase() === 'paid';
    const dueAmount = invoice.due_amount || (invoice.total - (invoice.paid_amount || 0));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            Invoice #{invoice.invoice_number}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Issued: {new Date(invoice.issue_date).toLocaleString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 bg-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-5">
                    {/* Payment Scheme and Status */}
                    <div className="flex justify-between items-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${schemeMeta.bg} ${schemeMeta.color}`}>
                            {schemeMeta.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {invoice.status?.toUpperCase()}
                        </span>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Customer Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-500">Name:</span> {invoice.customer_name}</div>
                            <div><span className="text-gray-500">Email:</span> {invoice.customer_email || 'N/A'}</div>
                            <div><span className="text-gray-500">Phone:</span> {invoice.customer_phone || 'N/A'}</div>
                            <div><span className="text-gray-500">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    {/* Invoice Items */}
                    <div>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Billed Items</p>
                        <div className="space-y-2">
                            {(invoice.items || []).map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <div>
                                        <p className="font-medium text-gray-900">{item.drug_name}</p>
                                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-medium text-gray-900 tabular-nums">{zmw(item.total || item.price)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-gray-900 tabular-nums">{zmw(invoice.subtotal)}</span>
                            </div>
                            {invoice.tax > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tax</span>
                                    <span className="font-medium text-gray-900 tabular-nums">{zmw(invoice.tax)}</span>
                                </div>
                            )}
                            {invoice.discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Discount</span>
                                    <span className="font-medium text-red-600 tabular-nums">-{zmw(invoice.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="font-semibold text-gray-900">Total</span>
                                <span className="font-bold text-gray-900 tabular-nums">{zmw(invoice.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Paid Amount</span>
                                <span className="font-medium text-emerald-600 tabular-nums">{zmw(invoice.paid_amount || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Due Amount</span>
                                <span className="font-bold text-amber-600 tabular-nums">{zmw(dueAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Prescription Reference */}
                    {invoice.prescription && (
                        <div className="text-xs text-gray-500 text-center">
                            Related Prescription: #{invoice.prescription.prescription_number}
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                    <Button onClick={onClose} variant="outline" className="flex-1 h-9 text-sm">
                        Close
                    </Button>
                    {!isPaid && dueAmount > 0 && (
                        <Button className="flex-1 h-9 text-sm">
                            Make Payment
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Prescription() {
    const [activeTab, setActiveTab] = useState<TabId>('prescriptions');
    const { services, patient } = usePage().props as { services?: Service[]; patient?: any };

    const patientId = patient?.id || (window.location.pathname.split('/')[2] as unknown as number);

    const [patientPricing, setPatientPricing] = useState<PatientPricing | undefined>(undefined);
    const [loadingPricing, setLoadingPricing] = useState(true);

    useEffect(() => {
        const fetchPatientPricing = async () => {
            try {
                const response = await Http.get(`/patients/${patientId}/pricing`);
                if (response.data.success) {
                    setPatientPricing(response.data.data);
                } else {
                    setPatientPricing({
                        patient_id: patientId,
                        default_scheme: 'cash',
                        cash_discount: 0,
                        nhima_discount: 5,
                        insurance_discount: 10,
                        charity_discount: 15,
                        mobile_money_discount: 0,
                    });
                }
            } catch (error) {
                console.error('Error fetching patient pricing:', error);
                setPatientPricing({
                    patient_id: patientId,
                    default_scheme: 'cash',
                });
            } finally {
                setLoadingPricing(false);
            }
        };

        if (patientId) {
            fetchPatientPricing();
        }
    }, [patientId]);

    if (loadingPricing) {
        return (
            <PatientLayout breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: 'Prescription', href: '' },
            ]}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading patient data...</div>
                </div>
            </PatientLayout>
        );
    }

    const defaultScheme = patientPricing?.default_scheme || 'cash';

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: 'Prescription', href: '' },
            ]}
        >
            <div className="space-y-6 p-2">
                <div className="flex gap-3 font-bold items-center">
                    <ChevronLeftIcon className="w-4 h-4" />
                    <Link href={`../../patients/`} className="hover:text-blue-600 transition-colors">
                        Dashboard
                    </Link>
                   
                    {defaultScheme === 'mobile_money' && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            Using cash prices
                        </span>
                    )}
                </div>

                <div className="flex gap-0 border-b border-gray-200">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                relative px-4 py-2.5 text-sm font-medium transition-all duration-150
                                ${activeTab === tab.id
                                    ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }
                            `}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div>
                    {activeTab === 'prescriptions' && (
                        <PrescriptionsTab
                            services={services}
                            patientId={patientId}
                            patientPricing={patientPricing}
                        />
                    )}
                    {activeTab === 'bills' && <BillsTab patientId={patientId} />}
                </div>
            </div>
        </PatientLayout>
    );
}
