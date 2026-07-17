import React, { useState, useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Plus,
    X,
    Search,
    Trash2,
    Save,
    ShoppingCart,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Drug {
    id: number;
    service_name?: string;
    drug_name?: string;
    name?: string;
    service_category?: string;
    category?: string;
    price: number | string;
    selling_price?: number | string;
    purchase_price?: number | string;
    dosage?: string;
    dosage_form?: string;
    frequency?: string;
    route?: string;
    route_of_administration?: string;
    stock?: number;
    [key: string]: any;
}

interface PrescribedDrug extends Drug {
    prescribedDate: string;
    status: 'active' | 'completed' | 'cancelled';
    prescriptionNumber?: string;
    patientId: number;
    quantity: number;
    notes?: string;
}

interface CartItem extends Drug {
    cartId: string;
    quantity: number;
    notes?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
}

type AdministrationStatus =
    | 'swallowed'
    | 'injected'
    | 'vomitted'
    | 'did_not_swallow'
    | 'refused'
    | 'partial';

interface AdministrationRecord {
    id: number;
    drugId: number;
    drugName: string;
    dose: string;
    administeredAt: string;
    scheduledTime: string;
    signedBy: string;
    status: AdministrationStatus;
    notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
    { value: 'OD', label: 'OD (Once Daily)' },
    { value: 'BD', label: 'BD (Twice Daily)' },
    { value: 'TDS', label: 'TDS (Three Times Daily)' },
    { value: 'QID', label: 'QID (Four Times Daily)' },
];

const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical'];
const STATUS_OPTIONS = [
    { value: 'swallowed', label: 'Swallowed' },
    { value: 'injected', label: 'Injected' },
    { value: 'vomitted', label: 'Vomitted' },
    { value: 'did_not_swallow', label: 'Did Not Swallow' },
    { value: 'refused', label: 'Refused' },
    { value: 'partial', label: 'Partial' },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const getDrugName = (drug: any): string => {
    return (
        drug?.service_name || drug?.drug_name || drug?.name || 'Unknown Drug'
    );
};

const getDrugPrice = (drug: any): number => {
    if (!drug) return 0;
    const price = drug.price || drug.selling_price || drug.purchase_price || 0;
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
        const parsed = parseFloat(price);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const getDrugDosage = (drug: any): string => {
    return drug?.dosage || drug?.dosage_form || '';
};

const getDrugRoute = (drug: any): string => {
    return drug?.route || drug?.route_of_administration || '';
};

const getDrugCategory = (drug: any): string => {
    return drug?.service_category || drug?.category || '';
};

// ─── Prescribe Modal with Overlay ──────────────────────────────────────────

const PrescribeModal = ({
    isOpen,
    onClose,
    onSave,
    admissionNumber,
    services: propServices,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: CartItem[], admissionNumber: string) => Promise<void>;
    admissionNumber: string;
    services?: any[];
}) => {
    const { props } = usePage();
    const patientId = (props as any).patientId;
    const availableDrugs = propServices || (props as any).services || [];

    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
    const [showDrugForm, setShowDrugForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [drugFormData, setDrugFormData] = useState({
        dosage: '',
        frequency: 'OD',
        route: '',
        notes: '',
        quantity: 1,
    });

    const filteredDrugs = availableDrugs.filter((d: any) => {
        const name = getDrugName(d);
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSelectDrug = (drug: any) => {
        const price = getDrugPrice(drug);
        if (price <= 0) {
            Notiflix.Notify.warning(`No price set for ${getDrugName(drug)}`);
            return;
        }
        setSelectedDrug({ ...drug, price });
        setDrugFormData({
            dosage: getDrugDosage(drug),
            frequency: drug.frequency || 'OD',
            route: getDrugRoute(drug),
            notes: '',
            quantity: 1,
        });
        setShowDrugForm(true);
        setSearchTerm('');
    };

    const addToCart = () => {
        if (!selectedDrug) return;
        const cartItem: CartItem = {
            ...selectedDrug,
            service_name: getDrugName(selectedDrug),
            cartId: `${selectedDrug.id}-${Date.now()}`,
            quantity: drugFormData.quantity,
            dosage: drugFormData.dosage,
            frequency: drugFormData.frequency,
            route: drugFormData.route,
            notes: drugFormData.notes,
            price: getDrugPrice(selectedDrug),
        };
        setCart([...cart, cartItem]);
        setShowDrugForm(false);
        setSelectedDrug(null);
        Notiflix.Notify.success(`${getDrugName(selectedDrug)} added to cart`);
    };

    const removeFromCart = (cartId: string) => {
        setCart(cart.filter((item) => item.cartId !== cartId));
    };

    const handleSave = async () => {
        if (cart.length === 0) {
            Notiflix.Notify.warning('Cart is empty');
            return;
        }
        setIsSaving(true);
        try {
            await onSave(cart, admissionNumber);
            setCart([]);
            onClose();
            Notiflix.Notify.success('Prescription saved successfully!');
        } catch (error: any) {
            Notiflix.Notify.failure(
                error?.message || 'Error saving prescription',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const total = cart.reduce(
        (sum, item) => sum + getDrugPrice(item) * item.quantity,
        0,
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-4 py-2">
                    <h3 className="text-base font-semibold">
                        New Prescription
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded p-1 hover:bg-gray-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="border-b px-4 py-2">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search drugs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded border py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div
                    className="flex flex-1 overflow-hidden"
                    style={{ minHeight: '400px' }}
                >
                    <div className="w-[55%] overflow-y-auto border-r">
                        {!showDrugForm ? (
                            <div className="p-3">
                                {filteredDrugs.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-gray-400">
                                        {searchTerm
                                            ? 'No drugs found'
                                            : 'No drugs available'}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {filteredDrugs.map((drug: any) => {
                                            const price = getDrugPrice(drug);
                                            const hasPrice = price > 0;
                                            const name = getDrugName(drug);
                                            return (
                                                <div
                                                    key={drug.id}
                                                    className="flex items-center justify-between rounded border p-2 hover:bg-gray-50"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">
                                                            {name}
                                                        </p>
                                                        <p
                                                            className={`text-xs ${hasPrice ? 'text-gray-500' : 'text-red-500'}`}
                                                        >
                                                            {hasPrice
                                                                ? `ZMW ${price.toFixed(2)}`
                                                                : 'No price'}
                                                        </p>
                                                        {drug.stock !==
                                                            undefined && (
                                                            <p className="text-xs text-gray-400">
                                                                Stock:{' '}
                                                                {drug.stock}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        onClick={() =>
                                                            handleSelectDrug(
                                                                drug,
                                                            )
                                                        }
                                                        size="sm"
                                                        disabled={!hasPrice}
                                                        className="ml-2 h-7 px-2 text-xs"
                                                    >
                                                        {hasPrice
                                                            ? 'Select'
                                                            : 'No Price'}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-full flex-col">
                                <div className="border-b bg-blue-50 px-3 py-2">
                                    <p className="text-sm font-medium text-blue-700">
                                        {getDrugName(selectedDrug)}
                                    </p>
                                    <p className="text-xs text-blue-600">
                                        ZMW{' '}
                                        {getDrugPrice(selectedDrug).toFixed(2)}
                                    </p>
                                </div>
                                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                                    <div>
                                        <label className="block text-xs font-medium">
                                            Dosage
                                        </label>
                                        <input
                                            type="text"
                                            value={drugFormData.dosage}
                                            onChange={(e) =>
                                                setDrugFormData({
                                                    ...drugFormData,
                                                    dosage: e.target.value,
                                                })
                                            }
                                            placeholder="e.g., 500mg"
                                            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">
                                            Frequency
                                        </label>
                                        <select
                                            value={drugFormData.frequency}
                                            onChange={(e) =>
                                                setDrugFormData({
                                                    ...drugFormData,
                                                    frequency: e.target.value,
                                                })
                                            }
                                            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
                                        >
                                            {FREQUENCY_OPTIONS.map((opt) => (
                                                <option
                                                    key={opt.value}
                                                    value={opt.value}
                                                >
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">
                                            Route
                                        </label>
                                        <select
                                            value={drugFormData.route}
                                            onChange={(e) =>
                                                setDrugFormData({
                                                    ...drugFormData,
                                                    route: e.target.value,
                                                })
                                            }
                                            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
                                        >
                                            <option value="">
                                                Select route
                                            </option>
                                            {ROUTES.map((route) => (
                                                <option
                                                    key={route}
                                                    value={route}
                                                >
                                                    {route}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={drugFormData.quantity}
                                            onChange={(e) =>
                                                setDrugFormData({
                                                    ...drugFormData,
                                                    quantity:
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 1,
                                                })
                                            }
                                            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">
                                            Notes
                                        </label>
                                        <textarea
                                            value={drugFormData.notes}
                                            onChange={(e) =>
                                                setDrugFormData({
                                                    ...drugFormData,
                                                    notes: e.target.value,
                                                })
                                            }
                                            rows={2}
                                            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="border-t p-2">
                                    <Button
                                        onClick={addToCart}
                                        className="h-8 w-full text-sm"
                                    >
                                        <Plus className="mr-1.5 h-3.5 w-3.5" />{' '}
                                        Add to Cart
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex w-[45%] flex-col bg-gray-50">
                        <div className="border-b px-3 py-2">
                            <h4 className="text-sm font-medium">
                                Cart ({cart.length})
                            </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {cart.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-gray-400">
                                    <div className="text-center">
                                        <ShoppingCart className="mx-auto mb-1 h-8 w-8 opacity-25" />
                                        <p className="text-sm">Empty</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {cart.map((item) => (
                                        <div
                                            key={item.cartId}
                                            className="rounded border bg-white p-2"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {item.service_name ||
                                                            getDrugName(item)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        ZMW{' '}
                                                        {getDrugPrice(
                                                            item,
                                                        ).toFixed(2)}{' '}
                                                        × {item.quantity}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        removeFromCart(
                                                            item.cartId,
                                                        )
                                                    }
                                                    className="ml-2 text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <div className="border-t bg-white p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">
                                        Total
                                    </span>
                                    <span className="text-base font-bold">
                                        ZMW {total.toFixed(2)}
                                    </span>
                                </div>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="h-8 w-full text-sm"
                                >
                                    <Save className="mr-1.5 h-3.5 w-3.5" />
                                    {isSaving
                                        ? 'Saving...'
                                        : 'Save Prescription'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Administer Modal ────────────────────────────────────────────────────────

const AdministerModal = ({
    drug,
    onConfirm,
    onClose,
    userName,
}: {
    drug: PrescribedDrug;
    onConfirm: (data: { status: AdministrationStatus; notes: string }) => void;
    onClose: () => void;
    userName: string;
}) => {
    const [status, setStatus] = useState<AdministrationStatus>('swallowed');
    const [notes, setNotes] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-semibold">Administer Drug</h3>
                <p className="mt-1 text-sm text-gray-500">
                    {getDrugName(drug)}
                </p>

                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) =>
                                setStatus(
                                    e.target.value as AdministrationStatus,
                                )
                            }
                            className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Administered By
                        </label>
                        <p className="mt-1 text-sm font-medium text-blue-600">
                            {userName}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={() => onConfirm({ status, notes })}>
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DrugAdministrationTab({
    admissionNumber,
    page,
    services: propServices,
}: {
    admissionNumber: string;
    page: string;
    services?: any[];
}) {
    const { props } = usePage();
    const patientId = (props as any).patientId;
    const authUser = (props as any).auth?.user;
    const prescriptionsFromProps = (props as any).prescriptions || [];
    const availableServices = propServices || (props as any).services || [];

    console.log(
        'DrugAdministrationTab - availableServices:',
        availableServices,
    );
    console.log(
        'DrugAdministrationTab - availableServices length:',
        availableServices?.length,
    );

    const [prescribedDrugs, setPrescribedDrugs] = useState<PrescribedDrug[]>(
        [],
    );
    const [administrationHistory, setAdministrationHistory] = useState<
        AdministrationRecord[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [selectedDrug, setSelectedDrug] = useState<PrescribedDrug | null>(
        null,
    );
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showPrescribeModal, setShowPrescribeModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const loadData = async () => {
            try {
                if (prescriptionsFromProps.length > 0) {
                    const drugs = prescriptionsFromProps.flatMap(
                        (prescription: any) =>
                            (prescription.items || []).map((item: any) => ({
                                ...item,
                                id: item.id || item.drug_id,
                                service_name:
                                    item.service_name ||
                                    item.drug_name ||
                                    item.name ||
                                    'Unknown',
                                price: item.price || item.selling_price || 0,
                                dosage: item.dosage || item.dosage_form || '',
                                route:
                                    item.route ||
                                    item.route_of_administration ||
                                    '',
                            })),
                    );
                    setPrescribedDrugs(drugs);
                }

                const response = await Http.get(
                    `/patients/${patientId}/drug-administrations`,
                );
                if (response.data.success) {
                    setAdministrationHistory(response.data.data);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [patientId]);

    const handleSavePrescription = async (
        items: CartItem[],
        admissionNumber: string,
    ) => {
        const response = await Http.post(
            `/patients/${patientId}/prescriptions`,
            {
                items: items.map((item) => ({
                    id: item.id,
                    name: item.service_name || getDrugName(item),
                    quantity: item.quantity,
                    dosage: item.dosage,
                    frequency: item.frequency,
                    route: item.route,
                    notes: item.notes,
                })),
                admission_number: admissionNumber,
            },
        );

        if (response.data.success) {
            const newDrugs = items.map((item) => ({
                ...item,
                service_name: item.service_name || getDrugName(item),
                prescribedDate: new Date().toLocaleDateString(),
                status: 'active' as const,
                patientId,
                prescriptionNumber: response.data.prescription_number,
            }));
            setPrescribedDrugs((prev) => [...prev, ...newDrugs]);
            Notiflix.Notify.success('Prescription saved!');
        }
    };

    const handleAdminister = async (data: {
        status: AdministrationStatus;
        notes: string;
    }) => {
        if (!selectedDrug) return;
        try {
            const response = await Http.post(
                `/patients/${patientId}/drug-administrations`,
                {
                    drug_id: selectedDrug.id,
                    drug_name:
                        selectedDrug.service_name || getDrugName(selectedDrug),
                    dose: selectedDrug.dosage || '',
                    status: data.status,
                    notes: data.notes,
                    signed_by: authUser?.name || 'Unknown',
                },
            );

            if (response.data.success) {
                setAdministrationHistory((prev) => [
                    ...prev,
                    response.data.data,
                ]);
                setShowAdminModal(false);
                setSelectedDrug(null);
                Notiflix.Notify.success('Administration recorded');
            }
        } catch (error) {
            Notiflix.Notify.failure('Error recording administration');
        }
    };

    const filteredDrugs = prescribedDrugs.filter((d) => {
        const name = d.service_name || getDrugName(d);
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const totalPages = Math.ceil(filteredDrugs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedDrugs = filteredDrugs.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center text-sm">
                Loading...
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">
                    {page || 'Prescription'}
                </h2>
                <Button
                    onClick={() => setShowPrescribeModal(true)}
                    className="h-8 text-sm"
                >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Prescribe
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search prescribed drugs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded border py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            {filteredDrugs.length === 0 ? (
                <div className="rounded border py-8 text-center text-sm text-gray-400">
                    {searchTerm
                        ? 'No matching drugs found'
                        : 'No prescribed drugs'}
                </div>
            ) : (
                <div className="overflow-hidden rounded border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Drug
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Dosage
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Price
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Status
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {paginatedDrugs.map((drug, index) => {
                                const history = administrationHistory.filter(
                                    (r) => r.drugId === drug.id,
                                );
                                const lastAdmin = history[0];
                                const name =
                                    drug.service_name || getDrugName(drug);
                                return (
                                    <tr
                                        key={`${drug.id}-${index}`}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-3 py-2">
                                            <p className="text-sm font-medium">
                                                {name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Qty: {drug.quantity}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2">
                                            <p className="text-sm">
                                                {drug.dosage || '—'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {drug.frequency}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            ZMW {Number(drug.price).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs ${
                                                    drug.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {drug.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                {admissionNumber === 'null' ? (
                                                    <Link
                                                        href={`../../../patients/pharmacy/dispense/${patientId}`}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Dispense
                                                    </Link>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => {
                                                            setSelectedDrug(
                                                                drug,
                                                            );
                                                            setShowAdminModal(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        Administer
                                                    </Button>
                                                )}
                                                {lastAdmin && (
                                                    <span className="text-xs text-gray-400">
                                                        Last:{' '}
                                                        {new Date(
                                                            lastAdmin.administeredAt,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t px-3 py-2">
                            <span className="text-xs text-gray-500">
                                {startIndex + 1}–
                                {Math.min(
                                    startIndex + itemsPerPage,
                                    filteredDrugs.length,
                                )}{' '}
                                of {filteredDrugs.length}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.max(1, p - 1),
                                        )
                                    }
                                    disabled={currentPage === 1}
                                    className="h-7 w-7 p-0"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                {Array.from(
                                    { length: Math.min(5, totalPages) },
                                    (_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5 && currentPage > 3) {
                                            pageNum = currentPage - 3 + i;
                                            if (pageNum > totalPages)
                                                return null;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={
                                                    currentPage === pageNum
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    setCurrentPage(pageNum)
                                                }
                                                className={`h-7 w-7 p-0 text-xs ${currentPage === pageNum ? 'bg-blue-600' : ''}`}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    },
                                ).filter(Boolean)}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={currentPage === totalPages}
                                    className="h-7 w-7 p-0"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <PrescribeModal
                isOpen={showPrescribeModal}
                onClose={() => setShowPrescribeModal(false)}
                onSave={handleSavePrescription}
                admissionNumber={admissionNumber}
                services={availableServices}
            />

            {showAdminModal && selectedDrug && (
                <AdministerModal
                    drug={selectedDrug}
                    onConfirm={handleAdminister}
                    onClose={() => {
                        setShowAdminModal(false);
                        setSelectedDrug(null);
                    }}
                    userName={authUser?.name || 'Unknown'}
                />
            )}
        </div>
    );
}
