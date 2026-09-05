import {
    X,
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    Syringe,
    Stethoscope,
    Bandage,
    Heart,
    Bone,
    Droplets,
    Scissors,
    Package,
    ChevronRight,
    ArrowLeft,
    Loader2,
    ClipboardCheck,
    Pill,
    User,
    Calendar,
    MoreHorizontal,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw service/procedure record as it comes from the backend. */
interface Service {
    id: number;
    service_name?: string;
    /** Some callers send `name` instead of `service_name` — both are supported. */
    name?: string;
    service_category?: string;
    price?: string | number;
    unit?: string;
    description?: string;
    inStock?: boolean;
}

interface CartItem {
    id: number;
    item_id: number;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
    category: string;
}

/** Normalized/derived shape used internally for rendering. */
interface MappedService {
    id: number;
    name: string;
    category: string;
    price: number;
    unit: string;
    inStock: boolean;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    isProcedure: boolean;
    isItem: boolean;
}

interface ProcedureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (
        items: CartItem[],
        procedureId?: number | null,
        patientId?: string | number,
    ) => void | Promise<void>;
    procedures?: Service[];
    patientId?: string | number;
    isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Injection: Syringe,
    'Injection Supplies': Syringe,
    'Wound Care': Bandage,
    'Wound Care Supplies': Bandage,
    'Vital Signs': Heart,
    'Clinical Supplies': Package,
    Laboratory: Droplets,
    'Laboratory Supplies': Droplets,
    Procedures: Scissors,
    'Surgical Supplies': Scissors,
    Imaging: Bone,
    'Imaging Supplies': Bone,
    Consultation: Stethoscope,
    General: Package,
    Drugs: Pill,
    Medication: Pill,
    'Initial Visit': User,
    'Subsequent Visit': Calendar,
    Others: MoreHorizontal,
};

const COLOR_MAP: Record<string, string> = {
    Injection: 'bg-blue-100 text-blue-700',
    'Injection Supplies': 'bg-blue-100 text-blue-700',
    'Wound Care': 'bg-emerald-100 text-emerald-700',
    'Wound Care Supplies': 'bg-emerald-100 text-emerald-700',
    'Vital Signs': 'bg-red-100 text-red-700',
    'Clinical Supplies': 'bg-slate-100 text-slate-700',
    Laboratory: 'bg-purple-100 text-purple-700',
    'Laboratory Supplies': 'bg-purple-100 text-purple-700',
    Procedures: 'bg-indigo-100 text-indigo-700',
    'Surgical Supplies': 'bg-indigo-100 text-indigo-700',
    Imaging: 'bg-cyan-100 text-cyan-700',
    'Imaging Supplies': 'bg-cyan-100 text-cyan-700',
    Consultation: 'bg-emerald-100 text-emerald-700',
    General: 'bg-slate-100 text-slate-700',
    Drugs: 'bg-rose-100 text-rose-700',
    Medication: 'bg-rose-100 text-rose-700',
    'Initial Visit': 'bg-blue-100 text-blue-700',
    'Subsequent Visit': 'bg-purple-100 text-purple-700',
    Others: 'bg-slate-100 text-slate-700',
};

const PROCEDURE_CATEGORIES = new Set([
    'Initial Visit',
    'Subsequent Visit',
    'Consultation',
    'Others',
    'Procedures',
]);

const ITEM_CATEGORIES = new Set([
    'Injection',
    'Injection Supplies',
    'Wound Care',
    'Wound Care Supplies',
    'Clinical Supplies',
    'Laboratory Supplies',
    'General',
    'Drugs',
    'Medication',
    'Vital Signs',
]);

const getIconForCategory = (category: string) => ICON_MAP[category] || Package;
const getColorForCategory = (category: string) =>
    COLOR_MAP[category] || 'bg-slate-100 text-slate-700';
const isProcedureCategory = (category: string) =>
    PROCEDURE_CATEGORIES.has(category);
const isItemCategory = (category: string) => ITEM_CATEGORIES.has(category);

const getPriceAsNumber = (price: unknown): number => {
    if (price === null || price === undefined) return 0;
    if (typeof price === 'number') return Number.isFinite(price) ? price : 0;
    if (typeof price === 'string') {
        const parsed = parseFloat(price);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const formatCurrency = (amount: unknown) => {
    const num =
        typeof amount === 'number' ? amount : parseFloat(String(amount));
    const safeNum = Number.isFinite(num) ? num : 0;
    return `ZMW ${safeNum.toFixed(2)}`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProcedureModal: React.FC<ProcedureModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    procedures = [],
    patientId,
    isLoading = false,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProcedure, setSelectedProcedure] =
        useState<MappedService | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentItems, setCurrentItems] = useState<MappedService[]>([]);

    // Monotonically increasing id source for cart rows — avoids collisions
    // that Date.now() could produce when items are added within the same ms.
    const cartRowId = useRef(0);
    const nextCartRowId = () => {
        cartRowId.current += 1;
        return cartRowId.current;
    };

    // Reset state whenever the modal closes.
    useEffect(() => {
        if (!isOpen) {
            setSelectedProcedure(null);
            setCart([]);
            setCurrentItems([]);
            setSearchTerm('');
            setActiveCategory('all');
        }
    }, [isOpen]);

    const busy = isSubmitting || isLoading;

    const mappedServices: MappedService[] = (procedures || []).map(
        (service) => {
            const category = service.service_category || 'General';
            return {
                id: service.id,
                name: service.service_name || service.name || 'Unnamed Service',
                category,
                price: getPriceAsNumber(service.price),
                unit: service.unit || 'pc',
                inStock: service.inStock ?? true,
                description: service.description || '',
                icon: getIconForCategory(category),
                color: getColorForCategory(category),
                isProcedure: isProcedureCategory(category),
                isItem: isItemCategory(category),
            };
        },
    );

    const handleServiceClick = (service: MappedService) => {
        if (busy) return;

        if (service.isItem) {
            addToCart(service);
            return;
        }

        // Procedure selected: show the catalog of billable items underneath it.
        // Note: the backend doesn't currently link individual items to a
        // specific procedure, so all items are shown here regardless of which
        // procedure was clicked.
        setSelectedProcedure(service);
        setCurrentItems(mappedServices.filter((s) => s.isItem));
        setActiveCategory('all');
        setSearchTerm('');
    };

    const handleBackToAllServices = () => {
        setSelectedProcedure(null);
        setCurrentItems([]);
        setActiveCategory('all');
        setSearchTerm('');
    };

    const categories = [
        'all',
        ...Array.from(new Set(currentItems.map((item) => item.category))),
    ];

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredItems = currentItems.filter(
        (item) =>
            (activeCategory === 'all' || item.category === activeCategory) &&
            item.name.toLowerCase().includes(normalizedSearch),
    );

    const filteredAllServices = mappedServices.filter((service) =>
        service.name.toLowerCase().includes(normalizedSearch),
    );

    const addToCart = (item: MappedService) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.item_id === item.id);
            if (existing) {
                return prev.map((c) =>
                    c.item_id === item.id
                        ? {
                              ...c,
                              quantity: c.quantity + 1,
                              total: (c.quantity + 1) * c.price,
                          }
                        : c,
                );
            }
            return [
                ...prev,
                {
                    id: nextCartRowId(),
                    item_id: item.id,
                    name: item.name,
                    quantity: 1,
                    unit: item.unit,
                    price: item.price,
                    total: item.price,
                    category: item.category,
                },
            ];
        });
    };

    const removeFromCart = (id: number) => {
        setCart((prev) => prev.filter((c) => c.id !== id));
    };

    const updateQuantity = (id: number, change: number) => {
        setCart((prev) =>
            prev.map((c) => {
                if (c.id === id) {
                    const newQty = Math.max(1, c.quantity + change);
                    return { ...c, quantity: newQty, total: newQty * c.price };
                }
                return c;
            }),
        );
    };

    const totalCartAmount = cart.reduce((sum, item) => sum + item.total, 0);

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.error('Please add items to cart');
            return;
        }

        setIsSubmitting(true);
        try {
            const procedureId = selectedProcedure?.id ?? null;
            await onConfirm(cart, procedureId, patientId);
            setCart([]);
            setSelectedProcedure(null);
            setCurrentItems([]);
            onClose();
        } catch (error) {
            console.error('Failed to submit cart:', error);
            toast.error('Failed to submit cart');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="relative h-[90vh] w-[95%] max-w-7xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/25">
                            <ClipboardCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Select Services
                            </h2>
                            <p className="text-xs text-slate-500">
                                Click on an item to add to cart, or select a
                                procedure to view its items
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="border-b border-slate-200 bg-white px-6 py-3">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={busy}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-4 pl-9 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="flex h-[calc(90vh-180px)]">
                    {/* Left Column */}
                    <div className="flex-1 overflow-y-auto bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                                {selectedProcedure && (
                                    <button
                                        type="button"
                                        onClick={handleBackToAllServices}
                                        disabled={busy}
                                        aria-label="Back to all services"
                                        className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        Back
                                    </button>
                                )}
                                <h3 className="truncate text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                    {selectedProcedure
                                        ? `Items for ${selectedProcedure.name}`
                                        : 'All Services'}
                                </h3>
                            </div>
                            {selectedProcedure && categories.length > 1 && (
                                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                    {categories.map((cat) => (
                                        <button
                                            type="button"
                                            key={cat}
                                            onClick={() =>
                                                setActiveCategory(cat)
                                            }
                                            disabled={busy}
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                                activeCategory === cat
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat === 'all' ? 'All' : cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedProcedure ? (
                            // Show items for the selected procedure
                            filteredItems.length === 0 ? (
                                <div className="py-12 text-center text-sm text-slate-500">
                                    <Package className="mx-auto h-10 w-10 text-slate-300" />
                                    <p className="mt-2">
                                        No items available for this procedure
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {filteredItems.map((item) => {
                                        const isInCart = cart.some(
                                            (c) => c.item_id === item.id,
                                        );
                                        const Icon = item.icon;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`group rounded-lg border p-3 transition-all ${
                                                    isInCart
                                                        ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                                                        : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50/50 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className={`rounded-lg p-2 ${item.color}`}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {item.name}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {item.category}{' '}
                                                                • {item.unit}
                                                            </p>
                                                            <p className="mt-1 text-sm font-semibold text-blue-600">
                                                                {formatCurrency(
                                                                    item.price,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            addToCart(item)
                                                        }
                                                        disabled={busy}
                                                        aria-label={`Add ${item.name} to cart`}
                                                        className="ml-2 rounded-lg bg-blue-600 p-1.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : filteredAllServices.length === 0 ? (
                            <div className="py-12 text-center text-sm text-slate-500">
                                <Package className="mx-auto h-10 w-10 text-slate-300" />
                                <p className="mt-2">
                                    No services match your search
                                </p>
                            </div>
                        ) : (
                            // Show all services — both procedures and items
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {filteredAllServices.map((service) => {
                                    const isInCart = cart.some(
                                        (c) => c.item_id === service.id,
                                    );
                                    const Icon = service.icon;

                                    return (
                                        <div
                                            key={service.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`group cursor-pointer rounded-lg border p-3 transition-all ${
                                                isInCart
                                                    ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                                                    : service.isProcedure
                                                      ? 'border-purple-200 hover:border-purple-400 hover:bg-purple-50/50'
                                                      : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50/50 hover:shadow-sm'
                                            }`}
                                            onClick={() =>
                                                handleServiceClick(service)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === 'Enter' ||
                                                    e.key === ' '
                                                ) {
                                                    e.preventDefault();
                                                    handleServiceClick(service);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`rounded-lg p-2 ${service.color}`}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {service.name}
                                                        </p>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="text-xs text-slate-500">
                                                                {
                                                                    service.category
                                                                }
                                                            </span>
                                                            {service.isProcedure && (
                                                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                                                    Procedure
                                                                </span>
                                                            )}
                                                            {service.isItem && (
                                                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                                                    Item
                                                                </span>
                                                            )}
                                                        </div>
                                                        {service.isItem && (
                                                            <p className="mt-1 text-sm font-semibold text-blue-600">
                                                                {formatCurrency(
                                                                    service.price,
                                                                )}
                                                            </p>
                                                        )}
                                                        {service.isProcedure && (
                                                            <p className="mt-1 text-xs text-purple-600">
                                                                Click to view
                                                                items
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {service.isItem && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(service);
                                                        }}
                                                        disabled={busy}
                                                        aria-label={`Add ${service.name} to cart`}
                                                        className="ml-2 rounded-lg bg-blue-600 p-1.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {service.isProcedure && (
                                                    <ChevronRight className="h-5 w-5 shrink-0 text-purple-400" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Cart */}
                    <div className="w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50/50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Cart
                            </h3>
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                {cart.length} items
                            </span>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex h-[300px] flex-col items-center justify-center">
                                <ShoppingCart className="h-12 w-12 text-slate-300" />
                                <p className="mt-2 text-sm text-slate-500">
                                    Cart is empty
                                </p>
                                <p className="text-xs text-slate-400">
                                    Click on any item to add it
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    {cart.map((item) => {
                                        const Icon = getIconForCategory(
                                            item.category,
                                        );
                                        const color = getColorForCategory(
                                            item.category,
                                        );

                                        return (
                                            <div
                                                key={item.id}
                                                className="rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-blue-200 hover:shadow-sm"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-2.5">
                                                        <div
                                                            className={`rounded-lg p-1.5 ${color}`}
                                                        >
                                                            <Icon className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-700">
                                                                {item.name}
                                                            </p>
                                                            <div className="text-xs text-slate-500">
                                                                {formatCurrency(
                                                                    item.price,
                                                                )}{' '}
                                                                / {item.unit}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeFromCart(
                                                                item.id,
                                                            )
                                                        }
                                                        disabled={busy}
                                                        aria-label={`Remove ${item.name} from cart`}
                                                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                -1,
                                                            )
                                                        }
                                                        disabled={busy}
                                                        aria-label={`Decrease quantity of ${item.name}`}
                                                        className="rounded-lg p-0.5 text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-50"
                                                    >
                                                        <Minus className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span className="w-6 text-center text-sm font-medium text-slate-700">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                1,
                                                            )
                                                        }
                                                        disabled={busy}
                                                        aria-label={`Increase quantity of ${item.name}`}
                                                        className="rounded-lg p-0.5 text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-50"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span className="ml-2 text-sm font-medium text-blue-600">
                                                        {formatCurrency(
                                                            item.total,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 rounded-lg border-t border-slate-200 bg-white p-3">
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">
                                                Subtotal
                                            </span>
                                            <span className="font-medium text-slate-700">
                                                {formatCurrency(
                                                    totalCartAmount,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">
                                                Tax (5%)
                                            </span>
                                            <span className="font-medium text-slate-700">
                                                {formatCurrency(
                                                    totalCartAmount * 0.05,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-200 pt-1.5">
                                            <span className="font-semibold text-slate-900">
                                                Total
                                            </span>
                                            <span className="text-lg font-bold text-blue-600">
                                                {formatCurrency(
                                                    totalCartAmount * 1.05,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-white px-6 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4 text-sm text-slate-500">
                            <span className="shrink-0">
                                {cart.length} items in cart
                            </span>
                            <span className="h-4 w-px shrink-0 bg-slate-200" />
                            <span className="shrink-0">
                                Total: {formatCurrency(totalCartAmount * 1.05)}
                            </span>
                            {selectedProcedure && (
                                <>
                                    <span className="h-4 w-px shrink-0 bg-slate-200" />
                                    <span className="truncate text-purple-600">
                                        Procedure: {selectedProcedure.name}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={busy}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={cart.length === 0 || busy}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-700 hover:shadow-blue-600/40 disabled:opacity-50 disabled:shadow-none"
                            >
                                {busy ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="h-4 w-4" />
                                        Add to Cart
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcedureModal;
