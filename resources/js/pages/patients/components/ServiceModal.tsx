// components/ServiceModal.tsx
import { useState, useEffect, useCallback } from 'react';
import {
    X,
    Search,
    Plus,
    ShoppingCart,
    Trash2,
    Save,
    ArrowLeft,
    Tag,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Service {
    id: number;
    service_name: string;
    service_category?: string;
    price: number | string;
}

export interface CartItem extends Service {
    cartId: string;
    quantity: number;
    notes?: string;
    // price is always number in CartItem (resolved at add time)
    price: number;
}

export interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Async save handler. Throws on error so the modal can display it. */
    onSave: (items: CartItem[], identifier: string) => Promise<void>;
    identifier: string;
    services: Service[];
    title?: string;
    emptyMessage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolvePrice = (service: Service | null): number => {
    if (!service) return 0;
    const p =
        typeof service.price === 'string'
            ? parseFloat(service.price)
            : service.price;
    return isNaN(p) ? 0 : p;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CartEmpty = () => (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
        <ShoppingCart className="h-10 w-10 opacity-20" />
        <p className="text-sm font-medium">Cart is empty</p>
        <p className="text-xs">Select services from the list</p>
    </div>
);

const CartItemRow = ({
    item,
    onRemove,
    onQtyChange,
    onNotesChange,
}: {
    item: CartItem;
    onRemove: (id: string) => void;
    onQtyChange: (id: string, qty: number) => void;
    onNotesChange: (id: string, notes: string) => void;
}) => (
    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800">
                    {item.service_name}
                </p>
                {item.service_category && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <Tag className="h-3 w-3" />
                        {item.service_category}
                    </p>
                )}
            </div>
            <button
                type="button"
                onClick={() => onRemove(item.cartId)}
                className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label={`Remove ${item.service_name}`}
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
                <label className="text-xs text-gray-500">Qty</label>
                <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                        onQtyChange(item.cartId, parseInt(e.target.value) || 1)
                    }
                    className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none"
                />
            </div>
            <div>
                <label className="text-xs text-gray-500">Subtotal</label>
                <p className="mt-0.5 rounded-md border border-transparent bg-gray-50 px-2 py-1 text-sm font-medium text-gray-700 tabular-nums">
                    ZMW {(item.price * item.quantity).toFixed(2)}
                </p>
            </div>
        </div>

        <div className="mt-2">
            <label className="text-xs text-gray-500">Notes</label>
            <input
                type="text"
                value={item.notes ?? ''}
                onChange={(e) => onNotesChange(item.cartId, e.target.value)}
                placeholder="Special instructions…"
                className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none"
            />
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ServiceModal = ({
    isOpen,
    onClose,
    onSave,
    identifier,
    services = [],
    title = 'Select Service',
    emptyMessage = 'No services found',
}: ServiceModalProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedService, setSelectedService] = useState<Service | null>(
        null,
    );
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    console.log(services);
    // ── Reset on close ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setCart([]);
            setSelectedService(null);
            setQuantity(1);
            setNotes('');
            setIsSaving(false);
        }
    }, [isOpen]);

    // ── Derived ────────────────────────────────────────────────────────────────
    const filteredServices = Array.isArray(services)
        ? services.filter((s) =>
              s?.service_name?.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : [];

    const cartTotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );
    const selectedPrice = resolvePrice(selectedService);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleSelectService = useCallback((service: Service) => {
        const price = resolvePrice(service);
        if (price <= 0) {
            Notiflix.Notify.warning(
                `"${service.service_name}" has no price set.`,
            );
            return;
        }
        setSelectedService(service);
        setQuantity(1);
        setNotes('');
        setSearchTerm('');
    }, []);

    const handleCancelSelection = useCallback(() => {
        setSelectedService(null);
        setQuantity(1);
        setNotes('');
    }, []);

    const handleAddToCart = useCallback(() => {
        if (!selectedService) return;
        const price = resolvePrice(selectedService);
        const cartItem: CartItem = {
            ...selectedService,
            price, // always number in cart
            cartId: `${selectedService.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            quantity,
            notes: notes.trim() || undefined,
        };
        setCart((prev) => [...prev, cartItem]);
        setSelectedService(null);
        setQuantity(1);
        setNotes('');
        Notiflix.Notify.success(
            `${selectedService.service_name} added to cart`,
        );
    }, [selectedService, quantity, notes]);

    const removeFromCart = useCallback((cartId: string) => {
        setCart((prev) => prev.filter((i) => i.cartId !== cartId));
    }, []);

    const updateQuantity = useCallback((cartId: string, qty: number) => {
        if (qty < 1) return;
        setCart((prev) =>
            prev.map((i) =>
                i.cartId === cartId ? { ...i, quantity: qty } : i,
            ),
        );
    }, []);

    const updateNotes = useCallback((cartId: string, newNotes: string) => {
        setCart((prev) =>
            prev.map((i) =>
                i.cartId === cartId ? { ...i, notes: newNotes } : i,
            ),
        );
    }, []);

    const handleSave = async () => {
        if (cart.length === 0) {
            Notiflix.Notify.warning(
                'Your cart is empty. Add at least one service.',
            );
            return;
        }
        setIsSaving(true);
        try {
            await onSave(cart, identifier);
            onClose();
            Notiflix.Notify.success(`${title} saved successfully!`);
        } catch (err: any) {
            Notiflix.Notify.failure(
                err?.message ?? `Failed to save ${title.toLowerCase()}.`,
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-500" />
                        <h3 className="text-base font-semibold text-gray-900">
                            {title}
                        </h3>
                        {cart.length > 0 && (
                            <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                                {cart.length}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ── Search (only shown on service list view) ───────────── */}
                {!selectedService && (
                    <div className="border-b border-gray-100 px-6 py-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="search"
                                placeholder={`Search ${title.toLowerCase()}s…`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* ── Body ──────────────────────────────────────────────── */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left – Service list OR quantity form */}
                    <div className="flex w-[58%] flex-col overflow-hidden border-r border-gray-100">
                        {selectedService ? (
                            /* ── Quantity form ─────────────────────────────── */
                            <div className="flex flex-1 flex-col overflow-y-auto">
                                {/* Service summary header */}
                                <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-5 py-4">
                                    <button
                                        type="button"
                                        onClick={handleCancelSelection}
                                        className="rounded-lg p-1 text-blue-500 transition hover:bg-blue-100"
                                        aria-label="Back to list"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                    <div>
                                        <p className="font-semibold text-blue-800">
                                            {selectedService.service_name}
                                        </p>
                                        <p className="text-sm text-blue-600">
                                            ZMW {selectedPrice.toFixed(2)} per
                                            unit
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Quantity
                                        </label>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setQuantity((q) =>
                                                        Math.max(1, q - 1),
                                                    )
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:opacity-40"
                                                disabled={quantity <= 1}
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                value={quantity}
                                                onChange={(e) =>
                                                    setQuantity(
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 1,
                                                    )
                                                }
                                                className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setQuantity((q) => q + 1)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <p className="mt-2 text-sm font-medium text-gray-700">
                                            Total:{' '}
                                            <span className="text-blue-700">
                                                ZMW{' '}
                                                {(
                                                    selectedPrice * quantity
                                                ).toFixed(2)}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Notes{' '}
                                            <span className="font-normal text-gray-400">
                                                (optional)
                                            </span>
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) =>
                                                setNotes(e.target.value)
                                            }
                                            rows={4}
                                            placeholder="Special instructions or clinical notes…"
                                            className="mt-1.5 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Form actions */}
                                <div className="flex gap-2 border-t border-gray-100 p-4">
                                    <Button
                                        type="button"
                                        onClick={handleCancelSelection}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleAddToCart}
                                        className="flex-1"
                                    >
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        Add to Cart
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* ── Service list ──────────────────────────────── */
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredServices.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
                                        <Search className="h-8 w-8 opacity-20" />
                                        <p className="text-sm">
                                            {searchTerm
                                                ? 'No matches found'
                                                : emptyMessage}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredServices.map((service) => {
                                            const price = resolvePrice(service);
                                            const hasPrice = price > 0;
                                            return (
                                                <div
                                                    key={service.id}
                                                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                                                        hasPrice
                                                            ? 'cursor-pointer hover:border-blue-200 hover:bg-blue-50/60'
                                                            : 'opacity-60'
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-gray-800">
                                                            {
                                                                service.service_name
                                                            }
                                                        </p>
                                                        <p
                                                            className={`text-sm ${
                                                                hasPrice
                                                                    ? 'text-gray-500'
                                                                    : 'text-red-400'
                                                            }`}
                                                        >
                                                            {hasPrice
                                                                ? `ZMW ${price.toFixed(2)}`
                                                                : 'Price not set'}
                                                        </p>
                                                        {service.service_category && (
                                                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                                                                <Tag className="h-3 w-3" />
                                                                {
                                                                    service.service_category
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={() =>
                                                            handleSelectService(
                                                                service,
                                                            )
                                                        }
                                                        size="sm"
                                                        disabled={!hasPrice}
                                                        variant={
                                                            hasPrice
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        className="ml-3 shrink-0"
                                                    >
                                                        {hasPrice
                                                            ? 'Select'
                                                            : 'No price'}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right – Cart */}
                    <div className="flex w-[42%] flex-col bg-gray-50">
                        <div className="border-b border-gray-100 bg-white px-4 py-3">
                            <h4 className="text-sm font-semibold text-gray-700">
                                Cart ({cart.length}{' '}
                                {cart.length === 1 ? 'item' : 'items'})
                            </h4>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3">
                            {cart.length === 0 ? (
                                <CartEmpty />
                            ) : (
                                <div className="space-y-2">
                                    {cart.map((item) => (
                                        <CartItemRow
                                            key={item.cartId}
                                            item={item}
                                            onRemove={removeFromCart}
                                            onQtyChange={updateQuantity}
                                            onNotesChange={updateNotes}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cart footer */}
                        {cart.length > 0 && (
                            <div className="border-t border-gray-200 bg-white p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">
                                        Total
                                    </span>
                                    <span className="text-lg font-bold text-gray-900 tabular-nums">
                                        ZMW {cartTotal.toFixed(2)}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSaving ? 'Saving…' : `Save ${title}`}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceModal;
