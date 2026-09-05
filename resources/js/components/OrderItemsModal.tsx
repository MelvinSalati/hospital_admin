// components/OrderModal.tsx
import { usePage } from '@inertiajs/react';
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
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================
interface LedgerStockItem {
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
    _original?: any;
}

interface CartItem extends LedgerStockItem {
    quantity: number;
}

interface OrderPayload {
    items: {
        product_id: number;
        quantity: number;
        unit_price: number;
        batch_number?: string | null;
        expiry_date?: string | null;
    }[];
}

interface OrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    aggregateDuplicates?: boolean;
}

// ============================================
// ADAPTER / MAPPER FUNCTIONS
// ============================================

/**
 * Helper function to generate product code from name and ID
 */
const generateProductCode = (
    productName: string,
    productId: number,
): string => {
    // Take first 3 letters of each word, max 6 chars
    const code = productName
        .split(' ')
        .map((word) => word.substring(0, 3))
        .join('')
        .toUpperCase()
        .substring(0, 8);

    return `${code}-${productId}`;
};

/**
 * Helper function to generate barcode
 */
const generateBarcode = (id: number, productId: number): string => {
    return `BAR${String(id).padStart(6, '0')}${String(productId).padStart(4, '0')}`;
};

/**
 * Helper function to determine unit of measure based on product type
 */
const determineUnitOfMeasure = (productName: string): string => {
    const lowercase = productName.toLowerCase();

    // Common medication units
    if (lowercase.includes('saline') || lowercase.includes('solution')) {
        return 'mL';
    }
    if (lowercase.includes('tablet') || lowercase.includes('pill')) {
        return 'Tablet';
    }
    if (lowercase.includes('capsule')) {
        return 'Capsule';
    }
    if (lowercase.includes('syrup') || lowercase.includes('liquid')) {
        return 'mL';
    }
    if (lowercase.includes('ointment') || lowercase.includes('cream')) {
        return 'g';
    }
    if (lowercase.includes('injection') || lowercase.includes('ampoule')) {
        return 'Ampoule';
    }
    if (lowercase.includes('patch')) {
        return 'Patch';
    }

    return 'Unit';
};

/**
 * Extracts the stock data array from various response formats
 */
const extractStockData = (response: any): any[] => {
    // If response is null or undefined
    if (!response) {
        console.error('Response is null or undefined');
        return [];
    }

    // If response is already an array
    if (Array.isArray(response)) {
        return response;
    }

    // If response has a data property
    if (response.data) {
        // If response.data is an array
        if (Array.isArray(response.data)) {
            return response.data;
        }
        // If response.data has a data property that is an array (nested)
        if (response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
        }
    }

    // If response has a data property that's a string (maybe JSON)
    if (response.data && typeof response.data === 'string') {
        try {
            const parsed = JSON.parse(response.data);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed.data && Array.isArray(parsed.data)) {
                return parsed.data;
            }
        } catch (e) {
            console.error('Failed to parse response data as JSON:', e);
        }
    }

    // Log the response structure for debugging
    console.error('Unable to extract stock data from response:', response);
    return [];
};

/**
 * Maps the raw API response to the LedgerStockItem format expected by the component
 */
const mapStockData = (apiData: any[]): LedgerStockItem[] => {
    if (!Array.isArray(apiData)) {
        console.error('mapStockData received non-array:', apiData);
        return [];
    }

    return apiData.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: generateProductCode(item.product_name, item.product_id),
        barcode: generateBarcode(item.id, item.product_id),
        unit_of_measure: determineUnitOfMeasure(item.product_name),
        unit_price: item.unit_price || 0,
        available_balance: item.quantity || 0,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
        _original: item,
    }));
};

/**
 * Aggregates duplicate products by product_id
 * Useful when same product appears with different batches/quantities
 */
const aggregateStockData = (apiData: any[]): LedgerStockItem[] => {
    // Ensure apiData is an array
    if (!Array.isArray(apiData)) {
        console.error('aggregateStockData received non-array:', apiData);
        return [];
    }

    const productMap = new Map<
        number,
        {
            id: number;
            product_id: number;
            product_name: string;
            quantity: number;
            unit_price: number | null;
            batch_numbers: (string | null)[];
            expiry_dates: (string | null)[];
            originalIds: number[];
        }
    >();

    apiData.forEach((item) => {
        const key = item.product_id;

        if (productMap.has(key)) {
            const existing = productMap.get(key)!;
            existing.quantity += item.quantity || 0;
            existing.batch_numbers.push(item.batch_number || null);
            existing.expiry_dates.push(item.expiry_date || null);
            existing.originalIds.push(item.id);

            // Keep the lowest unit price (or average if you prefer)
            if (
                item.unit_price !== null &&
                (existing.unit_price === null ||
                    item.unit_price < existing.unit_price)
            ) {
                existing.unit_price = item.unit_price;
            }
        } else {
            productMap.set(key, {
                id: item.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity || 0,
                unit_price: item.unit_price || null,
                batch_numbers: [item.batch_number || null],
                expiry_dates: [item.expiry_date || null],
                originalIds: [item.id],
            });
        }
    });

    // Convert aggregated data to LedgerStockItem format
    return Array.from(productMap.values()).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: generateProductCode(item.product_name, item.product_id),
        barcode: generateBarcode(item.id, item.product_id),
        unit_of_measure: determineUnitOfMeasure(item.product_name),
        unit_price: item.unit_price || 0,
        available_balance: item.quantity,
        batch_number:
            item.batch_numbers.length === 1 ? item.batch_numbers[0] : null,
        expiry_date:
            item.expiry_dates.length === 1 ? item.expiry_dates[0] : null,
        _original: {
            ...item,
            batch_numbers: item.batch_numbers,
            expiry_dates: item.expiry_dates,
            original_ids: item.originalIds,
        },
    }));
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function OrderModal({
    isOpen,
    onClose,
    onSuccess,
    aggregateDuplicates = true,
}: OrderModalProps) {
    const { auth, department, items } = usePage().props;
    const [availableItems, setAvailableItems] = useState<LedgerStockItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<LedgerStockItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<LedgerStockItem | null>(
        null,
    );
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [barcodeTimeout, setBarcodeTimeout] = useState<NodeJS.Timeout | null>(
        null,
    );

    // Load available stock
    useEffect(() => {
        if (isOpen) {
            fetchAvailableStock();
        }
    }, [isOpen]);

    // Filter items based on search
    useEffect(() => {
        const filtered = availableItems.filter(
            (item) =>
                item.product_name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                item.product_code
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                item.barcode.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredItems(filtered);
    }, [searchTerm, availableItems]);

    // Handle barcode scanning
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Don't intercept if focused on search input
            if (e.target instanceof HTMLInputElement) {
                // If focused on barcode input, let it handle normally
                if (e.target === barcodeInputRef.current) {
                    return;
                }
                // If focused on search input, let it handle normally
                if (e.target === searchInputRef.current) {
                    return;
                }
            }

            // If it's the Enter key and we have a barcode buffer
            if (e.key === 'Enter' && barcodeBuffer.length > 0) {
                e.preventDefault();
                setSearchTerm(barcodeBuffer);
                setBarcodeBuffer('');
                if (barcodeTimeout) {
                    clearTimeout(barcodeTimeout);
                    setBarcodeTimeout(null);
                }
                return;
            }

            // Accumulate barcode characters (only alphanumeric and dash)
            if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9\-]/)) {
                e.preventDefault();
                setBarcodeBuffer((prev) => prev + e.key);

                // Reset buffer after 100ms of inactivity
                if (barcodeTimeout) {
                    clearTimeout(barcodeTimeout);
                }
                const timeout = setTimeout(() => {
                    setBarcodeBuffer('');
                }, 100);
                setBarcodeTimeout(timeout);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
            if (barcodeTimeout) {
                clearTimeout(barcodeTimeout);
            }
        };
    }, [isOpen, barcodeBuffer, barcodeTimeout]);

    const fetchAvailableStock = async () => {
        setIsLoading(true);
        try {
            const response = await Http.get('/nurses/stock');
            console.log('Full response:', response);

            // Extract the stock data array from the response
            const stockData = extractStockData(response);
            console.log('Extracted stock data:', stockData);

            if (!Array.isArray(stockData) || stockData.length === 0) {
                console.warn('No stock data found or empty array');
                setAvailableItems([]);
                setFilteredItems([]);
                setIsLoading(false);
                return;
            }

            let mappedData: LedgerStockItem[];

            if (aggregateDuplicates) {
                mappedData = aggregateStockData(stockData);
                console.log('Aggregated stock data:', mappedData);
            } else {
                mappedData = mapStockData(stockData);
                console.log('Mapped stock data:', mappedData);
            }

            setAvailableItems(mappedData);
            setFilteredItems(mappedData);
        } catch (error) {
            console.error('Error fetching available stock:', error);
            toast.error('Error fetching available stock');
            setAvailableItems([]);
            setFilteredItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getRemainingStock = useCallback(
        (itemId: number) => {
            const cartItem = cart.find((item) => item.id === itemId);
            const stockItem = availableItems.find((item) => item.id === itemId);
            if (!stockItem) return 0;
            const cartQuantity = cartItem?.quantity || 0;
            return stockItem.available_balance - cartQuantity;
        },
        [cart, availableItems],
    );

    const handleItemSelect = (item: LedgerStockItem) => {
        setSelectedItem(item);
        const remaining = getRemainingStock(item.id);
        setQuantity(Math.min(1, remaining));
        setValidationError(null);
    };

    const handleQuantityChange = (value: number) => {
        if (!selectedItem) return;
        const remaining = getRemainingStock(selectedItem.id);

        if (value < 1) {
            setValidationError('Quantity must be at least 1');
            setQuantity(1);
            return;
        }

        if (value > remaining) {
            setValidationError(
                `Only ${remaining} units are available in BulkStore`,
            );
            setQuantity(remaining);
            return;
        }

        setValidationError(null);
        setQuantity(value);
    };

    const handleAddToCart = () => {
        if (!selectedItem) return;
        const remaining = getRemainingStock(selectedItem.id);

        if (quantity > remaining) {
            setValidationError(
                `Only ${remaining} units are available in BulkStore`,
            );
            return;
        }

        const existingItem = cart.find((item) => item.id === selectedItem.id);
        if (existingItem) {
            setCart(
                cart.map((item) =>
                    item.id === selectedItem.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item,
                ),
            );
        } else {
            setCart([
                ...cart,
                {
                    ...selectedItem,
                    quantity: quantity,
                },
            ]);
        }

        setSelectedItem(null);
        setQuantity(1);
        setValidationError(null);
        toast.success(`${selectedItem.product_name} added to order`);
    };

    const handleCartQuantityChange = (itemId: number, newQuantity: number) => {
        const stockItem = availableItems.find((item) => item.id === itemId);
        if (!stockItem) return;

        if (newQuantity < 1) {
            toast.error('Quantity must be at least 1');
            return;
        }

        if (newQuantity > stockItem.available_balance) {
            toast.error(
                `Only ${stockItem.available_balance} units are available`,
            );
            return;
        }

        setCart(
            cart.map((item) =>
                item.id === itemId ? { ...item, quantity: newQuantity } : item,
            ),
        );
    };

    const handleRemoveFromCart = (itemId: number) => {
        setCart(cart.filter((item) => item.id !== itemId));
        toast.error('Item removed from order');
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0,
    );

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.error('Please add items to your order');
            return;
        }

        setIsSubmitting(true);
        setValidationError(null);

        const payload: OrderPayload = {
            items: cart.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                batch_number: item.batch_number,
                expiry_date: item.expiry_date,
            })),
        };

        try {
            const response = await Http.post('/bulkstore/order/items', {
                payload,
            });

            console.log(payload);

            if (!response) {
                if (response.data.errors) {
                    const errorMessages = Object.values(response.data.errors).flat();
                    const errorMessage = errorMessages.join(', ');
                    setValidationError(errorMessage);
                    toast.error('Please correct the highlighted errors');

                    if (
                        errorMessages.some((msg) =>
                            msg.toLowerCase().includes('stock'),
                        )
                    ) {
                        await fetchAvailableStock();
                    }
                    return;
                }

                throw new Error(data.message || 'Failed to submit order');
            }

            toast.success('Order submitted successfully');
            setCart([]);
            setSelectedItem(null);
            setQuantity(1);
            setSearchTerm('');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            const errorMessage =
                error.message ||
                'Unable to submit the order. Please try again.';
            setValidationError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative flex max-h-[95vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Create BulkStore Order
                        </h2>
                        <p className="text-sm text-gray-500">
                            Select products and specify the quantities required
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">
                                {totalItems}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content - Rest of the component remains the same */}
                <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                    {/* Left Column - Available Stock */}
                    <div className="max-h-[60vh] w-full overflow-y-auto border-r border-gray-200 p-6 lg:max-h-[calc(95vh-180px)] lg:w-1/2">
                        {/* Search */}
                        <div className="mb-4 space-y-2">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search by name, code, or barcode"
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="relative">
                                <Barcode className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    placeholder="Scan barcode here..."
                                    className="w-full rounded-lg border border-gray-300 py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value) {
                                            setSearchTerm(value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Stock Items */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="py-12 text-center">
                                <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                <p className="text-gray-500">
                                    No products found
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map((item) => {
                                    const remaining = getRemainingStock(
                                        item.id,
                                    );
                                    const isSelected =
                                        selectedItem?.id === item.id;
                                    const isOutOfStock = remaining === 0;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() =>
                                                !isOutOfStock &&
                                                handleItemSelect(item)
                                            }
                                            className={`cursor-pointer rounded-lg border p-4 transition-all ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                    : isOutOfStock
                                                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                                                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="truncate text-sm font-medium text-gray-900">
                                                        {item.product_name}
                                                    </h4>
                                                    <p className="truncate text-xs text-gray-500">
                                                        Code:{' '}
                                                        {item.product_code} |
                                                        Barcode: {item.barcode}
                                                    </p>
                                                    {item._original
                                                        ?.batch_numbers &&
                                                        item._original
                                                            .batch_numbers
                                                            .length > 1 && (
                                                            <p className="text-xs text-amber-600">
                                                                Multiple batches
                                                                available
                                                            </p>
                                                        )}
                                                    <div className="mt-1 flex items-center gap-4">
                                                        <span
                                                            className={`text-sm font-medium ${
                                                                remaining === 0
                                                                    ? 'text-red-600'
                                                                    : 'text-green-600'
                                                            }`}
                                                        >
                                                            {remaining === 0
                                                                ? 'Out of Stock'
                                                                : `${remaining} available`}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {
                                                                item.unit_of_measure
                                                            }
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            $
                                                            {item.unit_price.toFixed(
                                                                2,
                                                            )}{' '}
                                                            /{' '}
                                                            {
                                                                item.unit_of_measure
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                                {isOutOfStock && (
                                                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                                                )}
                                            </div>

                                            {/* Quantity Controls - shown when selected */}
                                            {isSelected && !isOutOfStock && (
                                                <div className="mt-3 border-t border-blue-200 pt-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-gray-600">
                                                            Quantity to Order:
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleQuantityChange(
                                                                        quantity -
                                                                            1,
                                                                    );
                                                                }}
                                                                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                                                disabled={
                                                                    quantity <=
                                                                    1
                                                                }
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={quantity}
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const val =
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );
                                                                    if (
                                                                        !isNaN(
                                                                            val,
                                                                        )
                                                                    ) {
                                                                        handleQuantityChange(
                                                                            val,
                                                                        );
                                                                    }
                                                                }}
                                                                className="w-16 rounded border border-gray-300 py-1 text-center text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                                min={1}
                                                                max={remaining}
                                                            />
                                                            <button
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleQuantityChange(
                                                                        quantity +
                                                                            1,
                                                                    );
                                                                }}
                                                                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                                                disabled={
                                                                    quantity >=
                                                                    remaining
                                                                }
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddToCart();
                                                            }}
                                                            disabled={
                                                                quantity >
                                                                    remaining ||
                                                                quantity < 1
                                                            }
                                                            className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Add to Order
                                                        </button>
                                                    </div>
                                                    {validationError && (
                                                        <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
                                                            <AlertCircle className="h-4 w-4" />
                                                            {validationError}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Order Cart */}
                    <div className="max-h-[60vh] w-full overflow-y-auto bg-gray-50 p-6 lg:max-h-[calc(95vh-180px)] lg:w-1/2">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">
                                Order Cart
                            </h3>
                            <span className="text-sm text-gray-500">
                                {totalItems} items
                            </span>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex h-64 flex-col items-center justify-center">
                                <ShoppingCart className="mb-4 h-16 w-16 text-gray-300" />
                                <p className="font-medium text-gray-500">
                                    Your order is empty
                                </p>
                                <p className="text-sm text-gray-400">
                                    Search for a product and add items to your
                                    order
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 space-y-3">
                                    {cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900">
                                                        {item.product_name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500">
                                                        {item.product_code}
                                                    </p>
                                                    <p className="mt-1 text-sm text-blue-600">
                                                        $
                                                        {item.unit_price.toFixed(
                                                            2,
                                                        )}{' '}
                                                        / {item.unit_of_measure}
                                                    </p>
                                                    {item.batch_number && (
                                                        <p className="text-xs text-gray-400">
                                                            Batch:{' '}
                                                            {item.batch_number}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        handleRemoveFromCart(
                                                            item.id,
                                                        )
                                                    }
                                                    className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
                                                <span className="text-sm text-gray-600">
                                                    Qty:
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleCartQuantityChange(
                                                                item.id,
                                                                item.quantity -
                                                                    1,
                                                            )
                                                        }
                                                        className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                                        disabled={
                                                            item.quantity <= 1
                                                        }
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-10 text-center text-sm font-medium text-gray-900">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            handleCartQuantityChange(
                                                                item.id,
                                                                item.quantity +
                                                                    1,
                                                            )
                                                        }
                                                        className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                                        disabled={
                                                            item.quantity >=
                                                            item.available_balance
                                                        }
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <span className="ml-auto text-sm font-medium text-gray-700">
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

                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Total Items:
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {totalItems}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                        <span className="text-base font-medium text-gray-900">
                                            Total Amount:
                                        </span>
                                        <span className="text-lg font-bold text-blue-600">
                                            ${totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-shrink-0 items-center justify-between gap-4 rounded-b-xl border-t border-gray-200 bg-gray-50 p-6">
                    <div className="flex items-center gap-4">
                        {validationError && (
                            <div className="flex items-center gap-1 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                {validationError}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="rounded-lg px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={cart.length === 0 || isSubmitting}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting Order...
                                </>
                            ) : (
                                'Submit Order'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
