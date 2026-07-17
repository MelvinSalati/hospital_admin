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
    service_uuid?: string;
    department_id?: number;
    service_name: string;
    service_category?: string;
    service_code?: string;
    description?: string;
    cash_price?: number | string;
    nhima_price?: number | string;
    insurance_price?: number | string;
    charity_price?: number | string;
    price?: number;
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
    prescription_number?: string;
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
    items?: PrescribedItem[];
    prescription_number?: string;
    drug_name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert any value to number safely */
const toNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

/** Validate and normalize scheme */
const normalizeScheme = (scheme: string | undefined): PricingScheme => {
    if (!scheme) return 'cash';
    const validSchemes: PricingScheme[] = ['cash', 'nhima', 'insurance', 'charity', 'mobile_money'];
    const lowerScheme = scheme.toLowerCase();
    if (validSchemes.includes(lowerScheme as PricingScheme)) {
        return lowerScheme as PricingScheme;
    }
    console.warn(`Invalid scheme: ${scheme}, defaulting to cash`);
    return 'cash';
};

/** Get price for service - uses the price property from backend */
const getPriceForScheme = (service: Service, scheme: PricingScheme | string): number | null => {
    try {
        if (service.price !== undefined && service.price !== null) {
            const price = toNumber(service.price);
            if (price !== null) return price;
        }
        
        const normalizedScheme = normalizeScheme(scheme);
        const effectiveScheme = getEffectiveScheme(normalizedScheme);
        const schemeMeta = SCHEME_META[effectiveScheme];
        
        if (!schemeMeta || !schemeMeta.dbField) {
            console.error(`Invalid scheme meta for: ${effectiveScheme}`);
            return null;
        }
        
        const fieldName = schemeMeta.dbField;
        const price = service[fieldName];
        return toNumber(price);
    } catch (error) {
        console.error('Error getting price for scheme:', error);
        return null;
    }
};

/** Format ZMW amount */
const zmw = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '—';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '—';
    return `ZMW ${num.toFixed(2)}`;
};

/** Get scheme meta safely */
const getSchemeMeta = (scheme: string | undefined) => {
    const defaultMeta = {
        label: 'Cash',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        dbField: 'cash_price'
    };
    
    if (!scheme) return defaultMeta;
    
    const normalizedScheme = normalizeScheme(scheme);
    const schemeMeta = SCHEME_META[normalizedScheme];
    
    if (!schemeMeta) {
        return defaultMeta;
    }
    
    return schemeMeta;
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

// ─── Prescription Bundle Modal ───────────────────────────────────────────────

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
    
    const actualItems = React.useMemo(() => {
        if (items.length > 0 && items[0].service_name) {
            return items;
        }
        
        if (prescription.items && prescription.items.length > 0) {
            const firstItem = prescription.items[0];
            if (firstItem.service_name) {
                return prescription.items;
            }
            if (firstItem.items && firstItem.items.length > 0) {
                return firstItem.items;
            }
        }
        
        return items;
    }, [items, prescription.items]);
    
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'completed': return 'bg-gray-100 text-gray-500';
            case 'cancelled': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Prescription Bundle
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            #{prescription.prescription_number || 'N/A'} • {actualItems.length} item{actualItems.length !== 1 ? 's' : ''} prescribed
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
                    <div className="mb-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(prescription.status)}`}>
                            Status: {prescription.status ? prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1) : 'Active'}
                        </span>
                    </div>

                    {actualItems.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Prescribed Items</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Dosage</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Frequency</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Route</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Qty</th>
                                        <th className="py-3 px-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {actualItems.map((item, idx) => {
                                        const quantity = item.quantity || 1;
                                        const isExpanded = expandedItem === (item.cartId || String(idx));
                                        const itemId = item.cartId || String(idx);
                                        
                                        return (
                                            <React.Fragment key={itemId}>
                                                <tr className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-gray-900">
                                                        {item.service_name || item.drug_name || 'Unknown'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {item.dosage || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {item.frequency || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {item.route || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 tabular-nums">
                                                        {quantity}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {item.notes && (
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
                                                {isExpanded && item.notes && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={6} className="py-3 px-4">
                                                            <div className="text-xs text-gray-600">
                                                                <span className="font-medium text-gray-700">Instructions:</span>
                                                                <p className="mt-1 whitespace-pre-wrap">{item.notes}</p>
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
                            No items found in this prescription
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <Button onClick={onClose} variant="outline" className="h-9 text-sm">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Prescribed Drugs Table ───────────────────────────────────────────────────

const PrescribedDrugsTable = ({ prescriptions: propPrescriptions }: { prescriptions: PrescribedItem[] }) => {
    const [selected, setSelected] = useState<PrescribedItem | null>(null);
    const [prescriptionsList, setPrescriptionsList] = useState<PrescribedItem[]>([]);
    const { prescriptions: pagePrescriptions } = usePage().props as { prescriptions?: PrescribedItem[] };
    
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
    
    const groupedPrescriptions = prescriptionsList.reduce((groups, item) => {
        const prescriptionNumber = item.prescription_number || `PRES-${item.id || 'unknown'}`;
        if (!groups[prescriptionNumber]) {
            groups[prescriptionNumber] = [];
        }
        groups[prescriptionNumber].push(item);
        return groups;
    }, {} as Record<string, PrescribedItem[]>);
    
    if (!prescriptionsList?.length) return null;
    
    return (
        <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Prescribed drugs</h3>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Prescription Number</th>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Items</th>
                            <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Status</th>
                            <th className="py-3 px-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {Object.entries(groupedPrescriptions).map(([prescriptionNumber, items]) => {
                            const firstItem = items[0];
                            const schemeMeta = getSchemeMeta(firstItem.scheme);
                            
                            return (
                                <tr key={prescriptionNumber} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="py-3 px-4 font-mono text-xs font-medium text-gray-900">
                                        {prescriptionNumber}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="space-y-1">
                                            {items.slice(0, 2).map((item, idx) => (
                                                <div key={idx} className="text-sm text-gray-700">
                                                    {item.service_name || item.drug_name || 'Prescription Item'}
                                                </div>
                                            ))}
                                            {items.length > 2 && (
                                                <div className="text-xs text-gray-400">
                                                    +{items.length - 2} more
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`
                                            text-xs px-2 py-0.5 rounded-full font-medium
                                            ${firstItem.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ''}
                                            ${firstItem.status === 'completed' ? 'bg-gray-100 text-gray-500' : ''}
                                            ${firstItem.status === 'cancelled' ? 'bg-red-100 text-red-600' : ''}
                                            ${!firstItem.status ? 'bg-gray-100 text-gray-500' : ''}
                                        `}>
                                            {firstItem.status ? firstItem.status.charAt(0).toUpperCase() + firstItem.status.slice(1) : 'Active'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-gray-500 hover:text-gray-900"
                                            onClick={() => setSelected({
                                                ...firstItem,
                                                items: items,
                                                prescription_number: prescriptionNumber,
                                            })}
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                            View Bundle
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {selected && (
                <PrescriptionBundleModal 
                    prescription={selected} 
                    items={selected.items || []}
                    onClose={() => setSelected(null)} 
                />
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
    paymentMethod,
}: {
    isOpen: boolean;
    onClose: () => void;
    services?: Service[];
    onSave: (items: CartItem[], scheme: PricingScheme) => Promise<void>;
    patientId: number;
    paymentMethod: PricingScheme;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [scheme] = useState<PricingScheme>(paymentMethod);
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

    const schemeMeta = getSchemeMeta(scheme);

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
            alert(`This drug does not have a price set for ${schemeMeta.label} scheme.`);
            return;
        }

        setSelectedDrug(service);
        setShowDrugForm(true);

        const defaultItemPerDose = service.default_item_per_dose || 1;
        const defaultFrequency = service.default_frequency || 'OD';
        const defaultDuration = service.default_duration || 7;
        const defaultDurationUnit = service.default_duration_unit || 'days';

        const initialQuantity = calculateQuantity(
            defaultItemPerDose,
            defaultFrequency,
            defaultDuration,
            defaultDurationUnit
        );

        setDrugFormData({
            presentation: service.presentation || '',
            strength: service.strength?.toString() || '',
            strengthUnit: service.strength_unit || 'mg',
            itemPerDose: defaultItemPerDose,
            frequency: defaultFrequency,
            duration: defaultDuration,
            durationUnit: defaultDurationUnit,
            route: service.route || '',
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
            cartId: `${selectedDrug.id}-${Date.now()}-${Math.random()}`,
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

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSave(cart, scheme);
            setCart([]);
            setSearchTerm('');
            onClose();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving prescription. Please try again.');
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
                            <span className={`ml-1 font-medium ${schemeMeta.color}`}>
                                Payment Method: {schemeMeta.label}
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
                                                const price = service.price !== undefined ? service.price : getPriceForScheme(service, scheme);
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
                                                                        let priceVal;
                                                                        if (s === scheme && service.price !== undefined) {
                                                                            priceVal = service.price;
                                                                        } else {
                                                                            const m = SCHEME_META[s];
                                                                            priceVal = service[m.dbField];
                                                                        }
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
                                        <p className="text-xs text-gray-400">Total · {schemeMeta.label}</p>
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

// ─── Prescriptions Tab ────────────────────────────────────────────────────────

const PrescriptionsTab = ({
    services,
    patientId,
    paymentMethod,
}: {
    services?: Service[];
    patientId: number;
    paymentMethod: PricingScheme;
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prescriptions, setPrescriptions] = useState<PrescribedItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch prescriptions on mount
    useEffect(() => {
        const fetchPrescriptions = async () => {
            try {
                const response = await Http.get(`/patients/${patientId}/prescriptions`);
                if (response.data.success) {
                    const fetchedPrescriptions = response.data.data.flatMap((prescription: any) => {
                        let items = [];
                        if (prescription.items && prescription.items.length > 0) {
                            if (prescription.items[0].service_name) {
                                items = prescription.items;
                            } else if (prescription.items[0].items) {
                                items = prescription.items[0].items;
                            }
                        }
                        
                        if (items.length === 0) {
                            items = [{
                                ...prescription,
                                service_name: prescription.drug_name || 'Unknown Drug',
                                quantity: prescription.quantity || 1,
                                scheme: normalizeScheme(prescription.invoice?.payment_scheme || paymentMethod),
                                prescribedDate: new Date(prescription.prescribed_date).toLocaleDateString(),
                            }];
                        }
                        
                        return items.map((item: any) => ({
                            ...item,
                            cartId: item.cartId || `${prescription.id}-${Math.random()}`,
                            prescribedDate: new Date(prescription.prescribed_date).toLocaleDateString(),
                            status: prescription.status || 'active',
                            scheme: normalizeScheme(item.scheme || prescription.invoice?.payment_scheme || paymentMethod),
                            patientId: patientId,
                            prescription_number: prescription.prescription_number,
                            service_name: item.service_name || item.drug_name || 'Unknown Drug',
                            quantity: item.quantity || 1,
                        }));
                    });
                    
                    setPrescriptions(fetchedPrescriptions);
                }
            } catch (error) {
                console.error('Error fetching prescriptions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrescriptions();
    }, [patientId, paymentMethod]);

    const handleSave = async (items: CartItem[], scheme: PricingScheme) => {
        const endpoint = `/patients/${patientId}/prescriptions`;
        
        try {
            const response = await Http.post(endpoint, {
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
                    scheme: normalizeScheme(scheme),
                    patientId,
                }));
                setPrescriptions(prev => [...prev, ...dated]);
                alert('Prescription created successfully!');
                setIsModalOpen(false);
            } else {
                alert('Error saving prescription: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving prescription. Please try again.');
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
                paymentMethod={paymentMethod}
            />
        </div>
    );
};

// ─── Root Component ──────────────────────────────────────────────────────────

export default function Prescription() {
    const { services, patient, payment_method } = usePage().props as { 
        services?: Service[]; 
        patient?: any;
        payment_method?: PricingScheme;
    };

    const patientId = patient?.id || (window.location.pathname.split('/')[2] as unknown as number);
    const paymentMethod = payment_method || 'cash';

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
                    <Link href="../../patients/" className="hover:text-blue-600 transition-colors">
                        Dashboard
                    </Link>
                </div>

                <div>
                    <PrescriptionsTab
                        services={services}
                        patientId={patientId}
                        paymentMethod={paymentMethod}
                    />
                </div>
            </div>
        </PatientLayout>
    );
}