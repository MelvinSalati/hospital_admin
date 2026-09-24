// components/OrderModal.tsx
import {
    ShoppingCart,
    Search,
    Barcode,
    Plus,
    Minus,
    Trash2,
    AlertCircle,
    Loader2,
    Package,
    X,
    Check,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface StockItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    barcode: string;
    unit_of_measure: string;
    unit_price: number;
    available_balance: number;
    batch_number: string | null;
    expiry_date: string | null;
}

interface CartItem extends StockItem {
    quantity: number;
}

interface OrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

// ============================================
// UTILITIES
// ============================================

const normalizeResponse = (res: any): StockItem[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
};

const mapItem = (item: any): StockItem => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_code: item.product_code || `P${String(item.id).padStart(6, '0')}`,
    barcode: item.barcode || `BAR${String(item.id).padStart(8, '0')}`,
    unit_of_measure: item.unit_of_measure || 'Unit',
    unit_price: item.unit_price || 0,
    available_balance: item.available_balance || item.quantity || 0,
    batch_number: item.batch_number || null,
    expiry_date: item.expiry_date || null,
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function OrderModal({
    isOpen,
    onClose,
    onSuccess,
    authenticated,
}: OrderModalProps) {
    // ─── State ──────────────────────────────────────────
    const [items, setItems] = useState<StockItem[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selected, setSelected] = useState<StockItem | null>(null);
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);
    const barcodeRef = useRef<HTMLInputElement>(null);

    // ─── Derived ────────────────────────────────────────
    const remainingMap = useMemo(() => {
        const map = new Map<number, number>();
        items.forEach((i) => {
            const reserved = cart.find((c) => c.id === i.id)?.quantity || 0;
            map.set(i.id, i.available_balance - reserved);
        });
        return map;
    }, [items, cart]);

    const getRemaining = (id: number) => remainingMap.get(id) || 0;

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return q
            ? items.filter(
                  (i) =>
                      i.product_name.toLowerCase().includes(q) ||
                      i.product_code.toLowerCase().includes(q) ||
                      i.barcode.toLowerCase().includes(q),
              )
            : items;
    }, [search, items]);

    const summary = useMemo(
        () => ({
            count: cart.length,
            qty: cart.reduce((s, i) => s + i.quantity, 0),
            total: cart.reduce((s, i) => s + i.quantity * i.unit_price, 0),
        }),
        [cart],
    );

    // ─── Effects ────────────────────────────────────────
    useEffect(() => {
        if (isOpen) fetchStock();
    }, [isOpen]);

    // ─── API ────────────────────────────────────────────
    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await Http.get('/nurses/stock');
            setItems(normalizeResponse(res).map(mapItem));
        } catch {
            toast.error('Failed to load stock');
        } finally {
            setLoading(false);
        }
    };

    const submitOrder = async () => {
        if (!cart.length) {
            toast.error('Cart is empty');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                requestedBy: authenticated.user.id ?? 0,
                department: authenticated.user.departmentId ?? 0,
                items: cart.map((i) => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    batch_number: i.batch_number,
                    expiry_date: i.expiry_date,
                })),
            };
            console.log(payload);

            const res = await Http.post('/bulk-store/order/items', payload);

            if (res.status === 200 || res.status === 201) {
                toast.success('Order submitted');
                setCart([]);
                setSelected(null);
                setSearch('');
                onSuccess?.();
                onClose();
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Submission failed';
            setError(msg);
            toast.error(msg);
            if (err.response?.status === 422) await fetchStock();
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Cart Actions ────────────────────────────────────
    const addToCart = () => {
        if (!selected) return;
        const remaining = getRemaining(selected.id);
        if (qty > remaining) {
            setError(`Only ${remaining} available`);
            return;
        }

        setCart((prev) => {
            const existing = prev.find((c) => c.id === selected.id);
            return existing
                ? prev.map((c) =>
                      c.id === selected.id
                          ? { ...c, quantity: c.quantity + qty }
                          : c,
                  )
                : [...prev, { ...selected, quantity: qty }];
        });

        setSelected(null);
        setQty(1);
        setError(null);
        toast.success(`${selected.product_name} added`);
    };

    const updateQty = (id: number, val: number) => {
        if (val < 1) return;
        const stock = items.find((i) => i.id === id);
        if (stock && val > stock.available_balance) {
            toast.error(`Max ${stock.available_balance}`);
            return;
        }
        setCart((prev) =>
            prev.map((c) => (c.id === id ? { ...c, quantity: val } : c)),
        );
    };

    const removeItem = (id: number) => {
        setCart((prev) => prev.filter((c) => c.id !== id));
        toast.success('Removed');
    };

    const clearCart = () => {
        if (cart.length) {
            setCart([]);
            toast.info('Cart cleared');
        }
    };

    // ─── Render ──────────────────────────────────────────
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
            <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl">
                {/* ─── Header ──────────────────────────── */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Request Products
                        </h2>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-700">
                            {summary.count}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="text-sm text-red-500 hover:text-red-700"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* ─── Body (600px max height) ────────── */}
                <div className="flex h-[600px] max-h-[600px] flex-col overflow-hidden lg:flex-row">
                    {/* Left: Products (60%) */}
                    <div className="flex flex-1 flex-col overflow-hidden border-r border-gray-200 p-4 lg:w-3/5">
                        {/* Search */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Search products..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="relative w-36">
                                <Barcode className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={barcodeRef}
                                    type="text"
                                    placeholder="Scan barcode"
                                    className="w-full rounded border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    onChange={(e) => {
                                        const val = e.target.value.trim();
                                        if (val) {
                                            setSearch(val);
                                            e.target.value = '';
                                            const match = items.find(
                                                (i) => i.barcode === val,
                                            );
                                            if (match) setSelected(match);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Product List */}
                        <div className="mt-3 flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                                    <p className="text-sm text-gray-500">
                                        No products found
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filtered.map((item) => {
                                        const remaining = getRemaining(item.id);
                                        const isSelected =
                                            selected?.id === item.id;
                                        const outOfStock = remaining === 0;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() =>
                                                    !outOfStock &&
                                                    setSelected(item)
                                                }
                                                className={`cursor-pointer rounded border p-3 transition-all ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : outOfStock
                                                          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                                                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="truncate text-sm font-medium text-gray-900">
                                                                {
                                                                    item.product_name
                                                                }
                                                            </h4>
                                                            <span
                                                                className={`text-sm font-medium ${outOfStock ? 'text-red-500' : 'text-green-600'}`}
                                                            >
                                                                {outOfStock
                                                                    ? 'Out'
                                                                    : remaining}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                                            <span>
                                                                {
                                                                    item.product_code
                                                                }
                                                            </span>
                                                            <span>·</span>
                                                            <span>
                                                                $
                                                                {item.unit_price.toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                            <span>·</span>
                                                            <span>
                                                                {
                                                                    item.unit_of_measure
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {!outOfStock && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelected(
                                                                    item,
                                                                );
                                                            }}
                                                            className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
                                                        >
                                                            Add
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Quick quantity controls */}
                                                {isSelected && !outOfStock && (
                                                    <div className="mt-3 flex items-center gap-3 border-t border-blue-100 pt-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setQty(
                                                                    Math.max(
                                                                        1,
                                                                        qty - 1,
                                                                    ),
                                                                );
                                                            }}
                                                            className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
                                                            disabled={qty <= 1}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={qty}
                                                            onChange={(e) => {
                                                                const val =
                                                                    parseInt(
                                                                        e.target
                                                                            .value,
                                                                    );
                                                                if (
                                                                    !isNaN(
                                                                        val,
                                                                    ) &&
                                                                    val > 0
                                                                ) {
                                                                    setQty(
                                                                        Math.min(
                                                                            val,
                                                                            remaining,
                                                                        ),
                                                                    );
                                                                }
                                                            }}
                                                            className="w-16 rounded border border-gray-300 py-1 text-center text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                            min={1}
                                                            max={remaining}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setQty(
                                                                    Math.min(
                                                                        remaining,
                                                                        qty + 1,
                                                                    ),
                                                                );
                                                            }}
                                                            className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
                                                            disabled={
                                                                qty >= remaining
                                                            }
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart();
                                                            }}
                                                            disabled={
                                                                qty >
                                                                    remaining ||
                                                                qty < 1
                                                            }
                                                            className="ml-auto rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            Add to Cart
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Cart (40%) */}
                    <div className="flex w-full flex-col bg-gray-50 p-4 lg:w-2/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900">
                                Cart
                            </h3>
                            <span className="text-sm text-gray-500">
                                {summary.qty} units · $
                                {summary.total.toFixed(2)}
                            </span>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                                <div className="text-center">
                                    <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                    <p className="text-sm text-gray-500">
                                        Cart is empty
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Add items from the left
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
                                    {cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded border border-gray-200 bg-white p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="truncate text-sm font-medium text-gray-900">
                                                        {item.product_name}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                                        <span>
                                                            {item.product_code}
                                                        </span>
                                                        <span>·</span>
                                                        <span>
                                                            $
                                                            {item.unit_price.toFixed(
                                                                2,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        removeItem(item.id)
                                                    }
                                                    className="rounded p-1 text-red-400 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="mt-2 flex items-center gap-3">
                                                <button
                                                    onClick={() =>
                                                        updateQty(
                                                            item.id,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                    className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
                                                    disabled={
                                                        item.quantity <= 1
                                                    }
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="w-10 text-center text-sm font-medium">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        updateQty(
                                                            item.id,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                    className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
                                                    disabled={
                                                        item.quantity >=
                                                        item.available_balance
                                                    }
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                                <span className="ml-auto text-sm font-medium text-gray-900">
                                                    $
                                                    {(
                                                        item.quantity *
                                                        item.unit_price
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">
                                            Total
                                        </span>
                                        <span className="font-bold text-blue-600">
                                            ${summary.total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ─── Footer with submit on right ────── */}
                <div className="flex shrink-0 items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 px-5 py-3">
                    {error ? (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400">
                            {cart.length > 0
                                ? `${cart.length} items in cart`
                                : 'No items selected'}
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitOrder}
                            disabled={cart.length === 0 || submitting}
                            className="flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    <span>Submit Order</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
