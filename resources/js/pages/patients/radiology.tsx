// pages/patients/components/PreviousOrdersTable.tsx (updated with null checks)
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    X,
    Search,
    Trash2,
    ShoppingCart,
    Eye,
    ChevronLeft,
    ChevronRight,
    Save,
} from 'lucide-react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
    id: number;
    service_name: string;
    category?: string;
    price: number;
    quantity: number;
    dosage?: string;
    frequency?: string;
    route?: string;
    notes?: string;
    priority?: string;
    modality?: string;
    body_part?: string;
    [key: string]: any;
}

export interface PreviousOrder {
    id: string;
    order_number: string;
    service_name: string;
    service_category: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: string;
    priority?: string;
    created_at: string;
    items?: any[];
}

interface PreviousOrdersTableProps {
    patientId: string;
    services: any[];
    previousOrders: PreviousOrder[] | null;
    onSaveOrder: (items: CartItem[], patientId: string) => Promise<void>;
    orderLabel: string;
}

// ─── Service Modal ──────────────────────────────────────────────────────────

const ServiceModal = ({
    isOpen,
    onClose,
    onSave,
    services = [], // Default to empty array
    patientId,
    orderLabel,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: CartItem[], patientId: string) => Promise<void>;
    services: any[];
    patientId: string;
    orderLabel: string;
}) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [showDetailForm, setShowDetailForm] = useState(false);
    const [itemFormData, setItemFormData] = useState<any>({});

    const isPrescription = orderLabel === 'Prescription';

    // Ensure services is an array before filtering
    const safeServices = Array.isArray(services) ? services : [];

    const filteredServices = safeServices.filter((s) => {
        if (!s || !s.service_name) return false;
        return s.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const getPrice = (service: any): number => {
        if (!service) return 0;
        const price = service.price;
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            const parsed = parseFloat(price);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    const handleSelectItem = (service: any) => {
        const price = getPrice(service);
        if (price <= 0) {
            Notiflix.Notify.warning(`No price set for ${service.service_name}`);
            return;
        }
        setSelectedItem({ ...service, price });

        // Set default form data based on type
        if (isPrescription) {
            setItemFormData({
                dosage: service.dosage || '',
                frequency: service.frequency || 'OD',
                route: service.route || '',
                notes: '',
                quantity: 1,
            });
        } else {
            setItemFormData({
                modality: service.modality || '',
                body_part: service.body_part || '',
                priority: 'routine',
                notes: '',
                quantity: 1,
            });
        }

        setShowDetailForm(true);
        setSearchTerm('');
    };

    const addToCart = () => {
        if (!selectedItem) return;

        const cartItem: CartItem = {
            id: selectedItem.id,
            service_name: selectedItem.service_name,
            category:
                selectedItem.service_category ||
                (isPrescription ? 'Pharmacy' : 'Imaging'),
            price: selectedItem.price,
            quantity: itemFormData.quantity || 1,
            notes: itemFormData.notes,
            priority: itemFormData.priority || 'routine',
            ...(isPrescription
                ? {
                      dosage: itemFormData.dosage,
                      frequency: itemFormData.frequency,
                      route: itemFormData.route,
                  }
                : {
                      modality: itemFormData.modality,
                      body_part: itemFormData.body_part,
                  }),
        };

        setCart([...cart, cartItem]);
        setShowDetailForm(false);
        setSelectedItem(null);
        Notiflix.Notify.success(`${selectedItem.service_name} added to cart`);
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    const updateQuantity = (id: number, quantity: number) => {
        if (quantity < 1) return;
        setCart(
            cart.map((item) => (item.id === id ? { ...item, quantity } : item)),
        );
    };

    const totalAmount = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    const handleSubmit = async () => {
        if (cart.length === 0) {
            Notiflix.Notify.warning(
                `Please add at least one ${orderLabel.toLowerCase()} to order`,
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(cart, patientId);
            setCart([]);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const renderDetailForm = () => {
        if (isPrescription) {
            const FREQUENCY_OPTIONS = [
                { value: 'OD', label: 'OD (Once Daily)' },
                { value: 'BD', label: 'BD (Twice Daily)' },
                { value: 'TDS', label: 'TDS (Three Times Daily)' },
                { value: 'QID', label: 'QID (Four Times Daily)' },
            ];
            const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical'];

            return (
                <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-3">
                        <p className="font-medium text-blue-700">
                            {selectedItem?.service_name}
                        </p>
                        <p className="text-sm text-blue-600">
                            ZMW {getPrice(selectedItem).toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Dosage
                        </label>
                        <input
                            type="text"
                            value={itemFormData.dosage || ''}
                            onChange={(e) =>
                                setItemFormData({
                                    ...itemFormData,
                                    dosage: e.target.value,
                                })
                            }
                            placeholder="e.g., 500mg"
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Frequency
                        </label>
                        <select
                            value={itemFormData.frequency || 'OD'}
                            onChange={(e) =>
                                setItemFormData({
                                    ...itemFormData,
                                    frequency: e.target.value,
                                })
                            }
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        >
                            {FREQUENCY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Route
                        </label>
                        <select
                            value={itemFormData.route || ''}
                            onChange={(e) =>
                                setItemFormData({
                                    ...itemFormData,
                                    route: e.target.value,
                                })
                            }
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="">Select route</option>
                            {ROUTES.map((route) => (
                                <option key={route} value={route}>
                                    {route}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Quantity
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={itemFormData.quantity || 1}
                            onChange={(e) =>
                                setItemFormData({
                                    ...itemFormData,
                                    quantity: parseInt(e.target.value) || 1,
                                })
                            }
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Notes
                        </label>
                        <textarea
                            value={itemFormData.notes || ''}
                            onChange={(e) =>
                                setItemFormData({
                                    ...itemFormData,
                                    notes: e.target.value,
                                })
                            }
                            rows={2}
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                    <Button onClick={addToCart} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add to Cart
                    </Button>
                </div>
            );
        }

        // Radiology/Imaging form
        return (
            <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-3">
                    <p className="font-medium text-blue-700">
                        {selectedItem?.service_name}
                    </p>
                    <p className="text-sm text-blue-600">
                        ZMW {getPrice(selectedItem).toFixed(2)}
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium">
                        Modality
                    </label>
                    <input
                        type="text"
                        value={itemFormData.modality || ''}
                        onChange={(e) =>
                            setItemFormData({
                                ...itemFormData,
                                modality: e.target.value,
                            })
                        }
                        placeholder="e.g., X-Ray, MRI, CT"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">
                        Body Part
                    </label>
                    <input
                        type="text"
                        value={itemFormData.body_part || ''}
                        onChange={(e) =>
                            setItemFormData({
                                ...itemFormData,
                                body_part: e.target.value,
                            })
                        }
                        placeholder="e.g., Chest, Knee, Head"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">
                        Priority
                    </label>
                    <select
                        value={itemFormData.priority || 'routine'}
                        onChange={(e) =>
                            setItemFormData({
                                ...itemFormData,
                                priority: e.target.value,
                            })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">
                        Quantity
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={itemFormData.quantity || 1}
                        onChange={(e) =>
                            setItemFormData({
                                ...itemFormData,
                                quantity: parseInt(e.target.value) || 1,
                            })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Notes</label>
                    <textarea
                        value={itemFormData.notes || ''}
                        onChange={(e) =>
                            setItemFormData({
                                ...itemFormData,
                                notes: e.target.value,
                            })
                        }
                        rows={2}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>
                <Button onClick={addToCart} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add to Cart
                </Button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <h2 className="text-xl font-semibold">
                            Order {orderLabel}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex min-h-[500px]">
                        {/* Left - Available Items */}
                        <div className="w-1/2 border-r p-4">
                            <div className="relative mb-4">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={`Search ${orderLabel.toLowerCase()}s...`}
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full rounded-md border py-2 pr-4 pl-9 text-sm"
                                />
                            </div>

                            {!showDetailForm ? (
                                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                                    {filteredServices.length === 0 ? (
                                        <div className="py-8 text-center text-gray-400">
                                            {searchTerm
                                                ? `No ${orderLabel.toLowerCase()}s found matching your search`
                                                : `No ${orderLabel.toLowerCase()}s available`}
                                        </div>
                                    ) : (
                                        filteredServices.map((service) => {
                                            const price = getPrice(service);
                                            const hasPrice = price > 0;
                                            return (
                                                <div
                                                    key={service.id}
                                                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                                                >
                                                    <div>
                                                        <div className="font-medium">
                                                            {
                                                                service.service_name
                                                            }
                                                        </div>
                                                        <div
                                                            className={`text-sm ${
                                                                hasPrice
                                                                    ? 'text-gray-500'
                                                                    : 'text-red-500'
                                                            }`}
                                                        >
                                                            {hasPrice
                                                                ? `ZMW ${price.toFixed(2)}`
                                                                : 'No price'}
                                                        </div>
                                                        {service.stock !==
                                                            undefined && (
                                                            <div className="text-xs text-gray-400">
                                                                Stock:{' '}
                                                                {service.stock}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            handleSelectItem(
                                                                service,
                                                            )
                                                        }
                                                        disabled={!hasPrice}
                                                    >
                                                        {hasPrice
                                                            ? 'Select'
                                                            : 'No Price'}
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto">
                                    <button
                                        onClick={() => {
                                            setShowDetailForm(false);
                                            setSelectedItem(null);
                                        }}
                                        className="mb-3 text-sm text-blue-600 hover:underline"
                                    >
                                        ← Back to search
                                    </button>
                                    {renderDetailForm()}
                                </div>
                            )}
                        </div>

                        {/* Right - Cart */}
                        <div className="w-1/2 bg-gray-50 p-4">
                            <h3 className="mb-3 font-semibold">
                                Cart ({cart.length} items)
                            </h3>

                            <div className="max-h-[400px] space-y-2 overflow-y-auto">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-lg bg-white p-3 shadow-sm"
                                    >
                                        <div className="flex justify-between">
                                            <div>
                                                <div className="font-medium">
                                                    {item.service_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    ZMW {item.price.toFixed(2)}{' '}
                                                    each
                                                </div>
                                                {isPrescription &&
                                                    item.dosage && (
                                                        <div className="text-xs text-gray-400">
                                                            {item.dosage} •{' '}
                                                            {item.frequency}
                                                        </div>
                                                    )}
                                                {!isPrescription &&
                                                    item.modality && (
                                                        <div className="text-xs text-gray-400">
                                                            {item.modality} •{' '}
                                                            {item.body_part}
                                                        </div>
                                                    )}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    removeFromCart(item.id)
                                                }
                                                className="text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                    className="h-6 w-6 rounded border"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                    className="h-6 w-6 rounded border"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="font-semibold">
                                                ZMW{' '}
                                                {(
                                                    item.price * item.quantity
                                                ).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <div className="py-8 text-center text-gray-400">
                                        <ShoppingCart className="mx-auto mb-2 h-12 w-12 opacity-30" />
                                        Cart is empty
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="mt-4 border-t pt-3">
                                    <div className="mb-3 flex justify-between">
                                        <span className="font-semibold">
                                            Total:
                                        </span>
                                        <span className="text-xl font-bold text-blue-600">
                                            ZMW {totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full bg-blue-600"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSubmitting
                                            ? 'Saving...'
                                            : `Save ${orderLabel} (ZMW ${totalAmount.toFixed(2)})`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Bundle Modal ──────────────────────────────────────────────────────────

const BundleModal = ({
    isOpen,
    onClose,
    order,
    orderLabel,
}: {
    isOpen: boolean;
    onClose: () => void;
    order: PreviousOrder | null;
    orderLabel: string;
}) => {
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    if (!isOpen || !order) return null;

    const items = order.items || [];
    const statusColors: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        completed: 'bg-gray-100 text-gray-600',
        cancelled: 'bg-red-100 text-red-700',
        pending: 'bg-yellow-100 text-yellow-700',
        scheduled: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-purple-100 text-purple-700',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />
                <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div>
                            <h2 className="text-xl font-semibold">
                                {orderLabel} Bundle
                            </h2>
                            <p className="text-sm text-gray-500">
                                #{order.order_number} • {items.length} item
                                {items.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="mb-4">
                            <Badge
                                className={
                                    statusColors[order.status] ||
                                    'bg-gray-100 text-gray-600'
                                }
                            >
                                Status:{' '}
                                {order.status.charAt(0).toUpperCase() +
                                    order.status.slice(1)}
                            </Badge>
                        </div>

                        {items.length > 0 ? (
                            <div className="overflow-hidden rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                                Items
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                                Details
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                                Qty
                                            </th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item: any, idx: number) => {
                                            const isExpanded =
                                                expandedItem ===
                                                (item.id?.toString() ||
                                                    String(idx));
                                            const itemId =
                                                item.id?.toString() ||
                                                String(idx);
                                            return (
                                                <React.Fragment key={itemId}>
                                                    <tr className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium">
                                                            {item.service_name ||
                                                                'Unknown'}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600">
                                                            {item.dosage && (
                                                                <div>
                                                                    {
                                                                        item.dosage
                                                                    }
                                                                    {item.frequency &&
                                                                        ` • ${item.frequency}`}
                                                                    {item.route &&
                                                                        ` • ${item.route}`}
                                                                </div>
                                                            )}
                                                            {item.modality && (
                                                                <div>
                                                                    {
                                                                        item.modality
                                                                    }
                                                                    {item.body_part &&
                                                                        ` • ${item.body_part}`}
                                                                </div>
                                                            )}
                                                            {!item.dosage &&
                                                                !item.modality &&
                                                                '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                                                            {item.quantity || 1}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.notes && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 text-xs"
                                                                    onClick={() =>
                                                                        setExpandedItem(
                                                                            isExpanded
                                                                                ? null
                                                                                : itemId,
                                                                        )
                                                                    }
                                                                >
                                                                    <ChevronLeft
                                                                        className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                                    />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExpanded &&
                                                        item.notes && (
                                                            <tr className="bg-gray-50">
                                                                <td
                                                                    colSpan={4}
                                                                    className="px-4 py-3"
                                                                >
                                                                    <div className="text-xs text-gray-600">
                                                                        <span className="font-medium text-gray-700">
                                                                            Notes:
                                                                        </span>
                                                                        <p className="mt-1 whitespace-pre-wrap">
                                                                            {
                                                                                item.notes
                                                                            }
                                                                        </p>
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
                            <div className="py-12 text-center text-gray-400">
                                No items found
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end border-t bg-gray-50 px-6 py-4">
                        <Button onClick={onClose} variant="outline">
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PreviousOrdersTable({
    patientId,
    services = [], // Default to empty array
    previousOrders,
    onSaveOrder,
    orderLabel,
}: PreviousOrdersTableProps) {
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PreviousOrder | null>(
        null,
    );
    const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            case 'active':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'scheduled':
                return 'bg-purple-100 text-purple-800';
            case 'in_progress':
                return 'bg-indigo-100 text-indigo-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleViewBundle = (order: PreviousOrder) => {
        setSelectedOrder(order);
        setIsBundleModalOpen(true);
    };

    // Ensure previousOrders is an array
    const safeOrders = Array.isArray(previousOrders) ? previousOrders : [];

    const enhancedOrders = safeOrders.map((order) => ({
        ...order,
        quantity: order.quantity ?? 1,
        unit_price: order.unit_price ?? 0,
        total_price: order.total_price ?? 0,
    }));

    const totalPages = Math.ceil(enhancedOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = enhancedOrders.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{orderLabel}s</h2>
                    <p className="text-sm text-gray-500">
                        {enhancedOrders.length} total {orderLabel.toLowerCase()}
                        s
                    </p>
                </div>
                <Button
                    onClick={() => setIsOrderModalOpen(true)}
                    className="bg-blue-600"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New {orderLabel}
                </Button>
            </div>

            {enhancedOrders.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-sm">
                                        {order.order_number}
                                    </TableCell>
                                    <TableCell>{order.service_name}</TableCell>
                                    <TableCell>{order.quantity}</TableCell>
                                    <TableCell>
                                        ZMW {order.unit_price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        ZMW {order.total_price.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={getStatusColor(
                                                order.status,
                                            )}
                                        >
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(
                                            order.created_at,
                                        ).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                handleViewBundle(order)
                                            }
                                            variant="outline"
                                        >
                                            <Eye className="mr-1 h-3 w-3" />{' '}
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <span className="text-sm text-gray-500">
                                Showing {startIndex + 1} to{' '}
                                {Math.min(
                                    startIndex + itemsPerPage,
                                    enhancedOrders.length,
                                )}{' '}
                                of {enhancedOrders.length}
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
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
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
                                                className={`h-8 w-8 p-0 ${currentPage === pageNum ? 'bg-blue-600' : ''}`}
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
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-lg border bg-gray-50 py-12 text-center">
                    <p className="text-gray-500">
                        No {orderLabel.toLowerCase()}s found
                    </p>
                    <Button
                        onClick={() => setIsOrderModalOpen(true)}
                        variant="link"
                    >
                        Create your first {orderLabel.toLowerCase()}
                    </Button>
                </div>
            )}

            <ServiceModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                onSave={onSaveOrder}
                services={services}
                patientId={patientId}
                orderLabel={orderLabel}
            />

            {isBundleModalOpen && (
                <BundleModal
                    isOpen={isBundleModalOpen}
                    onClose={() => {
                        setIsBundleModalOpen(false);
                        setSelectedOrder(null);
                    }}
                    order={selectedOrder}
                    orderLabel={orderLabel}
                />
            )}
        </div>
    );
}
