import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from 'react';
import {
    Search,
    Barcode,
    Package,
    Loader2,
    AlertCircle,
    Minus,
    Plus,
    X,
    Calendar,
    Flag,
    MessageSquare,
    Hash,
    ShoppingCart,
    ClipboardCheck,
    Clock,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Info,
} from 'lucide-react';
import Message from '@/components/message';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';
type RequestStatus =
    | 'draft'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'fulfilled';

interface Product {
    id: number;
    productId: number;
    productName: string;
    genericName: string | null;
    productCode: string;
    barcode: string;
    sku: string | null;
    unitOfMeasure: string;
    unitPrice: number;
    availableQuantity: number;
    monthlyAverageConsumption: number | null;
    batchNumbers: string[];
    batches: StockBatch[];
    departmentStock: number | null;
    reorderLevel: number | null;
    maximumStock: number | null;
    minimumStock: number | null;
    nearestExpiryDate: string | null;
}

interface StockBatch {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    manufactureDate?: string;
    isExpired: boolean;
    daysToExpiry: number | null;
}

interface CartItem {
    id: string; // Unique cart item ID
    product: Product;
    quantity: number;
    unitOfMeasure: string;
    requiredDate: string;
    priority: RequestPriority;
    batchNumber: string | null;
    amc: number | null;
    justification: string;
    comments: string;
    reservedQuantity: number;
}

interface Notification {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
}

interface RequisitionSummary {
    id: number;
    number: string;
    status: RequestStatus;
    items: number;
    totalQuantity: number;
    createdAt: string;
}

interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    status?: number;
}

// ============================================
// PRODUCT NORMALIZATION
// ============================================

function normalizeProduct(apiProduct: any): Product {
    // Normalize batch data
    const rawBatches = apiProduct.batches || apiProduct.batch_numbers || [];
    const batches: StockBatch[] = Array.isArray(rawBatches)
        ? rawBatches.map((batch: any) => ({
              batchNumber: batch.batch_number || batch.batchNumber || batch,
              quantity: batch.quantity || batch.available_quantity || 0,
              expiryDate:
                  batch.expiry_date ||
                  batch.expiryDate ||
                  batch.expiry ||
                  '9999-12-31',
              manufactureDate:
                  batch.manufacture_date || batch.manufactureDate || null,
              isExpired: false, // calculated below
              daysToExpiry: null, // calculated below
          }))
        : [];

    // Calculate expiry status
    const today = new Date();
    batches.forEach((batch) => {
        const expiry = new Date(batch.expiryDate);
        batch.isExpired = expiry < today;
        const diffTime = expiry.getTime() - today.getTime();
        batch.daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });

    // Get nearest expiry
    const validBatches = batches.filter((b) => !b.isExpired);
    const nearestExpiryDate =
        validBatches.length > 0
            ? validBatches.reduce((a, b) =>
                  new Date(a.expiryDate) < new Date(b.expiryDate) ? a : b,
              ).expiryDate
            : null;

    return {
        id: apiProduct.id || apiProduct.product_id,
        productId: apiProduct.id || apiProduct.product_id,
        productName:
            apiProduct.product_name || apiProduct.name || 'Unknown Product',
        genericName: apiProduct.generic_name || apiProduct.genericName || null,
        productCode: apiProduct.product_code || apiProduct.code || 'N/A',
        barcode: apiProduct.barcode || 'N/A',
        sku: apiProduct.sku || null,
        unitOfMeasure: apiProduct.unit_of_measure || apiProduct.unit || 'unit',
        unitPrice: parseFloat(apiProduct.unit_price || apiProduct.price || 0),
        availableQuantity: parseInt(
            apiProduct.available_quantity ||
                apiProduct.available_stock ||
                apiProduct.stock ||
                apiProduct.quantity ||
                0,
        ),
        monthlyAverageConsumption:
            apiProduct.monthly_average_consumption ||
            apiProduct.amc ||
            apiProduct.monthlyAverageConsumption ||
            null,
        batchNumbers: batches.map((b) => b.batchNumber),
        batches,
        departmentStock:
            apiProduct.department_stock || apiProduct.current_stock || null,
        reorderLevel: apiProduct.reorder_level || null,
        maximumStock: apiProduct.maximum_stock || null,
        minimumStock: apiProduct.minimum_stock || null,
        nearestExpiryDate,
    };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RequestStock() {
    // ==========================================
    // STATE
    // ==========================================

    const [products, setProducts] = useState<Product[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});
    const [showSummary, setShowSummary] = useState(false);

    // Form state for modal
    const [formData, setFormData] = useState({
        quantity: 1,
        requiredDate: '',
        priority: 'normal' as RequestPriority,
        batchNumber: '',
        justification: '',
        comments: '',
    });

    // ==========================================
    // REFS
    // ==========================================

    const searchInputRef = useRef<HTMLInputElement>(null);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // ==========================================
    // DERIVED STATE
    // ==========================================

    // Calculate reserved quantities per product
    const reservedQuantities = useMemo(() => {
        const map = new Map<number, number>();
        cartItems.forEach((item) => {
            const current = map.get(item.product.id) || 0;
            map.set(item.product.id, current + item.quantity);
        });
        return map;
    }, [cartItems]);

    // Calculate display available stock
    const getDisplayAvailable = useCallback(
        (productId: number): number => {
            const product = products.find((p) => p.id === productId);
            if (!product) return 0;
            const reserved = reservedQuantities.get(productId) || 0;
            return Math.max(0, product.availableQuantity - reserved);
        },
        [products, reservedQuantities],
    );

    // Filter products
    const filteredProducts = useMemo(() => {
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return products;

        return products.filter((product) => {
            return (
                product.productName.toLowerCase().includes(searchLower) ||
                (product.genericName?.toLowerCase().includes(searchLower) ??
                    false) ||
                product.productCode.toLowerCase().includes(searchLower) ||
                product.barcode.toLowerCase().includes(searchLower) ||
                (product.sku?.toLowerCase().includes(searchLower) ?? false)
            );
        });
    }, [products, searchTerm]);

    // Cart summary
    const cartSummary = useMemo(() => {
        const totalItems = cartItems.length;
        const totalQuantity = cartItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
        );
        const urgentItems = cartItems.filter(
            (item) => item.priority === 'urgent',
        ).length;
        const highPriorityItems = cartItems.filter(
            (item) => item.priority === 'high',
        ).length;

        return {
            totalItems,
            totalQuantity,
            urgentItems,
            highPriorityItems,
            hasUrgent: urgentItems > 0,
            hasHigh: highPriorityItems > 0,
        };
    }, [cartItems]);

    // ==========================================
    // EFFECTS
    // ==========================================

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification && notification.duration !== 0) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, notification.duration || 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Keyboard shortcut: Escape to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen]);

    // ==========================================
    // API FUNCTIONS
    // ==========================================

    async function fetchProducts() {
        setIsLoading(true);
        setError(null);

        try {
            const response = await Http.get('nurses/stock');
            let rawProducts: any[] = [];

            if (response.data?.data) {
                rawProducts = response.data.data;
            } else if (Array.isArray(response.data)) {
                rawProducts = response.data;
            } else if (response.data?.items) {
                rawProducts = response.data.items;
            } else {
                console.warn('Unknown response structure:', response.data);
                rawProducts = [];
            }

            if (!Array.isArray(rawProducts)) {
                rawProducts = [];
            }

            const normalizedProducts = rawProducts.map(normalizeProduct);
            setProducts(normalizedProducts);

            if (normalizedProducts.length === 0) {
                setNotification({
                    type: 'info',
                    title: 'No Products Available',
                    message:
                        'No stock items are currently available in the Bulk Store.',
                    duration: 5000,
                });
            }
        } catch (err: any) {
            console.error('Error fetching products:', err);
            const errorMessage = handleApiError(err);
            setError(errorMessage);
            setNotification({
                type: 'error',
                title: 'Failed to Load Products',
                message: errorMessage,
                duration: 7000,
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function submitRequest() {
        if (cartItems.length === 0) {
            setNotification({
                type: 'warning',
                title: 'Cart is Empty',
                message: 'Please add at least one item to your requisition.',
                duration: 4000,
            });
            return;
        }

        // Validate all items
        const invalidItems = cartItems.filter(
            (item) => !item.requiredDate || item.quantity < 1,
        );
        if (invalidItems.length > 0) {
            setNotification({
                type: 'error',
                title: 'Invalid Cart Items',
                message:
                    'All items must have a required date and valid quantity.',
                duration: 5000,
            });
            return;
        }

        // Show summary confirmation
        if (!showSummary) {
            setShowSummary(true);
            return;
        }

        setIsSubmitting(true);
        setNotification(null);

        try {
            const payload = {
                items: cartItems.map((item) => ({
                    product_id: item.product.id,
                    quantity_requested: item.quantity,
                    unit_of_measure: item.unitOfMeasure,
                    required_date: item.requiredDate,
                    priority: item.priority,
                    batch_number: item.batchNumber || null,
                    amc: item.amc || null,
                    justification: item.justification || null,
                    comments: item.comments || null,
                })),
                total_items: cartItems.length,
                total_quantity: cartItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                ),
                request_date: new Date().toISOString(),
            };

            const response = await Http.post('nurses/request-stock', payload);

            if (response.status === 200 || response.status === 201) {
                const data = response.data;
                const requisitionNumber =
                    data.requisition_number ||
                    data.requisition_id ||
                    `REQ-${Date.now()}`;

                setNotification({
                    type: 'success',
                    title: 'Stock Requisition Submitted',
                    message: `Requisition ${requisitionNumber} has been submitted successfully.`,
                    duration: 8000,
                });

                // Clear cart
                setCartItems([]);
                setShowSummary(false);
            }
        } catch (err: any) {
            console.error('Error submitting request:', err);
            const errorMessage = handleApiError(err);
            setNotification({
                type: 'error',
                title: 'Submission Failed',
                message: errorMessage,
                duration: 7000,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    // ==========================================
    // HELPERS
    // ==========================================

    function handleApiError(err: any): string {
        if (err.response) {
            switch (err.response.status) {
                case 401:
                    return 'Your session has expired. Please log in again.';
                case 403:
                    return 'You do not have permission to request stock.';
                case 404:
                    return 'The requested resource was not found. Please contact support.';
                case 422:
                    const errors = err.response.data?.errors;
                    if (errors) {
                        const messages = Object.values(errors).flat();
                        return messages.join(' ');
                    }
                    return (
                        err.response.data?.message || 'Invalid data provided.'
                    );
                case 500:
                    return 'Something went wrong while submitting the requisition. Please try again.';
                default:
                    return (
                        err.response.data?.message ||
                        'An unexpected error occurred.'
                    );
            }
        }
        return err.message || 'Network error. Please check your connection.';
    }

    function getStockStatus(
        available: number,
    ): 'in-stock' | 'low-stock' | 'out-of-stock' {
        if (available <= 0) return 'out-of-stock';
        if (available < 10) return 'low-stock';
        return 'in-stock';
    }

    function getPriorityColor(priority: RequestPriority): string {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'normal':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'low':
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    }

    function formatDate(dateString: string): string {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    }

    function getExpiryWarning(days: number | null): string | null {
        if (days === null) return null;
        if (days < 0) return 'Expired';
        if (days < 30) return `Expires in ${days} days`;
        if (days < 90) return `Expires in ${days} days`;
        return null;
    }

    function generateCartItemId(
        productId: number,
        batchNumber: string | null = null,
    ): string {
        return `${productId}-${batchNumber || 'default'}`;
    }

    // ==========================================
    // MODAL FUNCTIONS
    // ==========================================

    function openModal(product: Product) {
        setSelectedProduct(product);
        setFormData({
            quantity: 1,
            requiredDate: '',
            priority: 'normal',
            batchNumber:
                product.batches.length > 0
                    ? product.batches[0]?.batchNumber || ''
                    : '',
            justification: '',
            comments: '',
        });
        setValidationErrors({});
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setSelectedProduct(null);
        setValidationErrors({});
    }

    function validateForm(): boolean {
        const errors: Record<string, string> = {};

        if (formData.quantity < 1) {
            errors.quantity = 'Quantity must be at least 1.';
        }

        if (selectedProduct) {
            const available = getDisplayAvailable(selectedProduct.id);
            if (formData.quantity > available) {
                errors.quantity = `Only ${available} units available.`;
            }
        }

        if (!formData.requiredDate) {
            errors.requiredDate = 'Required date is required.';
        }

        if (formData.requiredDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const requiredDate = new Date(formData.requiredDate);
            if (requiredDate < today) {
                errors.requiredDate = 'Required date cannot be in the past.';
            }
        }

        if (!formData.priority) {
            errors.priority = 'Priority is required.';
        }

        if (formData.priority === 'urgent' && !formData.justification.trim()) {
            errors.justification =
                'Justification is required for urgent requests.';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function handleAddToCart() {
        if (!selectedProduct) return;

        if (!validateForm()) {
            return;
        }

        const displayAvailable = getDisplayAvailable(selectedProduct.id);

        // Check if we have enough stock
        if (formData.quantity > displayAvailable) {
            setValidationErrors({
                quantity: `Only ${displayAvailable} units available.`,
            });
            return;
        }

        const cartItemId = generateCartItemId(
            selectedProduct.id,
            formData.batchNumber || null,
        );

        // Check if product already in cart (with same batch)
        const existingIndex = cartItems.findIndex(
            (item) =>
                item.product.id === selectedProduct.id &&
                (item.batchNumber === formData.batchNumber ||
                    (!item.batchNumber && !formData.batchNumber)),
        );

        let updatedCart: CartItem[];

        if (existingIndex >= 0) {
            // Update existing item
            const existing = cartItems[existingIndex];
            const newQuantity = existing.quantity + formData.quantity;

            // Check if total would exceed available
            if (newQuantity > selectedProduct.availableQuantity) {
                setValidationErrors({
                    quantity: `Total quantity would exceed available stock (${selectedProduct.availableQuantity}).`,
                });
                return;
            }

            updatedCart = [...cartItems];
            updatedCart[existingIndex] = {
                ...existing,
                quantity: newQuantity,
                requiredDate: formData.requiredDate,
                priority: formData.priority,
                batchNumber: formData.batchNumber || null,
                justification: formData.justification,
                comments: formData.comments,
            };
        } else {
            // Create new cart item
            const newItem: CartItem = {
                id: cartItemId,
                product: selectedProduct,
                quantity: formData.quantity,
                unitOfMeasure: selectedProduct.unitOfMeasure,
                requiredDate: formData.requiredDate,
                priority: formData.priority,
                batchNumber: formData.batchNumber || null,
                amc: selectedProduct.monthlyAverageConsumption,
                justification: formData.justification,
                comments: formData.comments,
                reservedQuantity: formData.quantity,
            };
            updatedCart = [...cartItems, newItem];
        }

        setCartItems(updatedCart);

        setNotification({
            type: 'success',
            title: 'Item Added',
            message: `${selectedProduct.productName} (${formData.quantity} ${selectedProduct.unitOfMeasure}) added to requisition.`,
            duration: 3000,
        });

        closeModal();
    }

    function updateCartItem(index: number, updates: Partial<CartItem>) {
        const updatedCart = [...cartItems];
        const item = updatedCart[index];
        updatedCart[index] = { ...item, ...updates };
        setCartItems(updatedCart);
    }

    function removeCartItem(index: number) {
        const item = cartItems[index];
        const updatedCart = cartItems.filter((_, i) => i !== index);
        setCartItems(updatedCart);

        setNotification({
            type: 'info',
            title: 'Item Removed',
            message: `${item.product.productName} removed from requisition.`,
            duration: 2000,
        });
    }

    function clearCart() {
        if (cartItems.length === 0) return;

        setCartItems([]);
        setShowSummary(false);

        setNotification({
            type: 'info',
            title: 'Cart Cleared',
            message: 'All items have been removed from the requisition.',
            duration: 3000,
        });
    }

    // ==========================================
    // RENDER HELPERS
    // ==========================================

    function renderNotification() {
        if (!notification) return null;

        const icons = {
            success: <CheckCircle className="h-5 w-5 text-green-500" />,
            error: <XCircle className="h-5 w-5 text-red-500" />,
            warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            info: <Info className="h-5 w-5 text-blue-500" />,
        };

        const colors = {
            success: 'bg-green-50 border-green-200',
            error: 'bg-red-50 border-red-200',
            warning: 'bg-yellow-50 border-yellow-200',
            info: 'bg-blue-50 border-blue-200',
        };

        return (
            <div
                className={`fixed top-4 right-4 z-50 max-w-md rounded-lg border p-4 shadow-lg ${colors[notification.type]}`}
                role="alert"
            >
                <div className="flex items-start gap-3">
                    {icons[notification.type]}
                    <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                            {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                            {notification.message}
                        </p>
                    </div>
                    <button
                        onClick={() => setNotification(null)}
                        className="rounded-full p-1 hover:bg-gray-200/50"
                        aria-label="Dismiss notification"
                    >
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>
            </div>
        );
    }

    function renderSummary() {
        if (!showSummary || cartItems.length === 0) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                    <div className="mb-4 flex items-center justify-between border-b pb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Requisition Summary
                            </h3>
                            <p className="text-sm text-gray-500">
                                Please review your requisition before submitting
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSummary(false)}
                            className="rounded-full p-1 hover:bg-gray-100"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="max-h-96 space-y-3 overflow-y-auto">
                        {cartItems.map((item, index) => (
                            <div
                                key={item.id}
                                className="rounded-lg border border-gray-200 p-3"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-gray-900">
                                            {item.product.productName}
                                        </h4>
                                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                            <span>
                                                Code: {item.product.productCode}
                                            </span>
                                            <span>•</span>
                                            <span>Qty: {item.quantity}</span>
                                            <span>•</span>
                                            <span>
                                                Unit: {item.unitOfMeasure}
                                            </span>
                                            {item.priority && (
                                                <>
                                                    <span>•</span>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 ${getPriorityColor(item.priority)}`}
                                                    >
                                                        {item.priority
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            item.priority.slice(
                                                                1,
                                                            )}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {item.requiredDate && (
                                            <p className="text-xs text-gray-500">
                                                Required:{' '}
                                                {formatDate(item.requiredDate)}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {item.quantity} × {item.unitOfMeasure}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                                Total Items:{' '}
                                <span className="font-medium text-gray-900">
                                    {cartSummary.totalItems}
                                </span>
                            </span>
                            <span className="text-gray-500">
                                Total Quantity:{' '}
                                <span className="font-medium text-gray-900">
                                    {cartSummary.totalQuantity}
                                </span>
                            </span>
                            {cartSummary.hasUrgent && (
                                <span className="font-medium text-red-600">
                                    {cartSummary.urgentItems} Urgent
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            onClick={() => setShowSummary(false)}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Edit Cart
                        </button>
                        <button
                            onClick={submitRequest}
                            disabled={isSubmitting}
                            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Confirm & Submit'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    function renderModal() {
        if (!isModalOpen || !selectedProduct) return null;

        const displayAvailable = getDisplayAvailable(selectedProduct.id);
        const isOutOfStock = displayAvailable === 0;
        const stockStatus = getStockStatus(displayAvailable);
        const amc = selectedProduct.monthlyAverageConsumption;
        const hasBatches = selectedProduct.batches.length > 0;

        // Check for expired batches
        const expiredBatches = selectedProduct.batches.filter(
            (b) => b.isExpired,
        );
        const validBatches = selectedProduct.batches.filter(
            (b) => !b.isExpired,
        );
        const hasValidBatches = validBatches.length > 0;

        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="request-modal-title"
            >
                <div
                    ref={modalRef}
                    className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 border-b border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                            <div className="bg-blue-50">
                                <h3
                                    id="request-modal-title"
                                    className="text-lg font-semibold text-gray-900"
                                >
                                    Request Stock
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {selectedProduct.productName}
                                    {selectedProduct.genericName && (
                                        <span className="ml-2 text-gray-400">
                                            ({selectedProduct.genericName})
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-full p-1 transition-colors hover:bg-gray-100"
                                aria-label="Close modal"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6 p-6">
                        {/* Product Info */}
                        <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
                            <div>
                                <span className="text-xs text-gray-500">
                                    Product Code
                                </span>
                                <p className="font-medium text-gray-900">
                                    {selectedProduct.productCode}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">
                                    Barcode
                                </span>
                                <p className="font-medium text-gray-900">
                                    {selectedProduct.barcode}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">
                                    Unit of Measure
                                </span>
                                <p className="font-medium text-gray-900">
                                    {selectedProduct.unitOfMeasure}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">
                                    AMC
                                </span>
                                <p className="font-medium text-gray-900">
                                    {amc
                                        ? `${amc} ${selectedProduct.unitOfMeasure}/month`
                                        : 'Not available'}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        Available Stock
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {displayAvailable}{' '}
                                        {selectedProduct.unitOfMeasure}
                                    </span>
                                </div>
                                {stockStatus === 'out-of-stock' && (
                                    <div className="mt-1 flex items-center gap-1 text-sm text-red-600">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Out of Stock</span>
                                    </div>
                                )}
                                {stockStatus === 'low-stock' && (
                                    <div className="mt-1 flex items-center gap-1 text-sm text-yellow-600">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Low Stock</span>
                                    </div>
                                )}
                            </div>
                            {selectedProduct.nearestExpiryDate && (
                                <div className="col-span-2">
                                    <span className="text-xs text-gray-500">
                                        Nearest Expiry
                                    </span>
                                    <p className="text-sm text-gray-900">
                                        {formatDate(
                                            selectedProduct.nearestExpiryDate,
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Quantity Requested
                                <span className="ml-1 text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newVal = Math.max(
                                            1,
                                            formData.quantity - 1,
                                        );
                                        setFormData((prev) => ({
                                            ...prev,
                                            quantity: newVal,
                                        }));
                                    }}
                                    className="rounded border border-gray-300 p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={
                                        formData.quantity <= 1 || isOutOfStock
                                    }
                                    aria-label="Decrease quantity"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val >= 0) {
                                            setFormData((prev) => ({
                                                ...prev,
                                                quantity: val,
                                            }));
                                        }
                                    }}
                                    className="w-24 rounded border border-gray-300 py-1 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    min={1}
                                    max={displayAvailable}
                                    disabled={isOutOfStock}
                                    aria-label="Quantity"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newVal = Math.min(
                                            displayAvailable,
                                            formData.quantity + 1,
                                        );
                                        setFormData((prev) => ({
                                            ...prev,
                                            quantity: newVal,
                                        }));
                                    }}
                                    className="rounded border border-gray-300 p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={
                                        formData.quantity >= displayAvailable ||
                                        isOutOfStock
                                    }
                                    aria-label="Increase quantity"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-gray-500">
                                    Max: {displayAvailable}
                                </span>
                            </div>
                            {validationErrors.quantity && (
                                <p className="mt-1 text-sm text-red-600">
                                    {validationErrors.quantity}
                                </p>
                            )}
                            {!isOutOfStock && displayAvailable > 0 && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Remaining after request:{' '}
                                    {displayAvailable - formData.quantity}{' '}
                                    {selectedProduct.unitOfMeasure}
                                </p>
                            )}
                            {amc && formData.quantity > 0 && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Coverage:{' '}
                                    {(formData.quantity / amc).toFixed(1)}{' '}
                                    months of AMC
                                </p>
                            )}
                        </div>

                        {/* Required Date */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Required Date
                                <span className="ml-1 text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={formData.requiredDate}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            requiredDate: e.target.value,
                                        }))
                                    }
                                    className={`w-full rounded-lg border py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors.requiredDate
                                            ? 'border-red-500'
                                            : 'border-gray-300'
                                    }`}
                                    min={new Date().toISOString().split('T')[0]}
                                    disabled={isOutOfStock}
                                    aria-required="true"
                                />
                            </div>
                            {validationErrors.requiredDate && (
                                <p className="mt-1 text-sm text-red-600">
                                    {validationErrors.requiredDate}
                                </p>
                            )}
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Priority
                                <span className="ml-1 text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Flag className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={formData.priority}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            priority: e.target
                                                .value as RequestPriority,
                                        }))
                                    }
                                    className={`w-full rounded-lg border py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors.priority
                                            ? 'border-red-500'
                                            : 'border-gray-300'
                                    }`}
                                    disabled={isOutOfStock}
                                    aria-required="true"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            {validationErrors.priority && (
                                <p className="mt-1 text-sm text-red-600">
                                    {validationErrors.priority}
                                </p>
                            )}
                        </div>

                        {/* Justification (shown for urgent) */}
                        {formData.priority === 'urgent' && (
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Justification
                                    <span className="ml-1 text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <MessageSquare className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                    <textarea
                                        value={formData.justification}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                justification: e.target.value,
                                            }))
                                        }
                                        className={`w-full rounded-lg border py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                                            validationErrors.justification
                                                ? 'border-red-500'
                                                : 'border-gray-300'
                                        }`}
                                        rows={2}
                                        placeholder="Why is this request urgent?"
                                        disabled={isOutOfStock}
                                        aria-required="true"
                                    />
                                </div>
                                {validationErrors.justification && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {validationErrors.justification}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Batch Selection */}
                        {hasBatches && (
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Batch Number
                                </label>
                                <div className="relative">
                                    <Hash className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={formData.batchNumber}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                batchNumber: e.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        disabled={
                                            isOutOfStock || !hasValidBatches
                                        }
                                    >
                                        {validBatches.length === 0 && (
                                            <option value="">
                                                No valid batches available
                                            </option>
                                        )}
                                        {validBatches.map((batch) => {
                                            const warning = getExpiryWarning(
                                                batch.daysToExpiry,
                                            );
                                            return (
                                                <option
                                                    key={batch.batchNumber}
                                                    value={batch.batchNumber}
                                                >
                                                    {batch.batchNumber} (
                                                    {batch.quantity} available)
                                                    {warning && ` - ${warning}`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                {expiredBatches.length > 0 && (
                                    <p className="mt-1 flex items-center gap-1 text-sm text-yellow-600">
                                        <AlertTriangle className="h-4 w-4" />
                                        {expiredBatches.length} batch(es) are
                                        expired and unavailable
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Comments */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Comments / Remarks
                            </label>
                            <div className="relative">
                                <MessageSquare className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                <textarea
                                    value={formData.comments}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            comments: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                    placeholder="Add any additional notes or requirements..."
                                    disabled={isOutOfStock}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 border-t pt-4">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={
                                    isOutOfStock || displayAvailable === 0
                                }
                                className={`rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                    isOutOfStock || displayAvailable === 0
                                        ? 'cursor-not-allowed bg-gray-400'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // MAIN RENDER
    // ==========================================

    return (
        <div className="space-y-6">
            {renderNotification()}
            {renderSummary()}
            {renderModal()}

            {/* Header */}
            <div className="flex flex-col gap-2 bg-blue-50 p-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Request Stock
                    </h1>
                    <p className="text-sm text-gray-500">
                        Request medical supplies, medicines and consumables from
                        the Bulk Store.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="rounded-lg bg-blue-50 px-4 py-2 text-center">
                        <span className="text-xs text-gray-500">
                            Available Products
                        </span>
                        <p className="text-lg font-semibold text-blue-700">
                            {products.length}
                        </p>
                    </div>
                    <div className="rounded-lg bg-green-50 px-4 py-2 text-center">
                        <span className="text-xs text-gray-500">
                            Items in Request
                        </span>
                        <p className="text-lg font-semibold text-green-700">
                            {cartSummary.totalItems}
                        </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 px-4 py-2 text-center">
                        <span className="text-xs text-gray-500">
                            Total Quantity
                        </span>
                        <p className="text-lg font-semibold text-purple-700">
                            {cartSummary.totalQuantity}
                        </p>
                    </div>
                    {cartSummary.hasUrgent && (
                        <div className="rounded-lg bg-red-50 px-4 py-2 text-center">
                            <span className="text-xs text-gray-500">
                                Urgent Items
                            </span>
                            <p className="text-lg font-semibold text-red-700">
                                {cartSummary.urgentItems}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
                {/* Left Panel - Products */}
                <div className="w-full lg:w-1/2">
                    <div className="rounded-lg border border-gray-200 bg-slate-50">
                        {/* Search */}
                        <div className="space-y-3 border-b border-gray-200 p-4">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search by name, code, or barcode..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 py-2.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    aria-label="Search products"
                                />
                            </div>
                        </div>

                        {/* Product List */}
                        <div className="max-h-[50vh] overflow-y-auto p-4">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                    <span className="ml-2 text-gray-500">
                                        Loading products...
                                    </span>
                                </div>
                            ) : error ? (
                                <div className="rounded-lg bg-red-50 p-4 text-center text-red-700">
                                    <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                                    <p className="font-medium">
                                        Failed to load products
                                    </p>
                                    <p className="text-sm">{error}</p>
                                    <button
                                        onClick={fetchProducts}
                                        className="mt-2 rounded bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                    <p className="text-gray-500">
                                        {searchTerm
                                            ? 'No products found matching your search'
                                            : 'No products available'}
                                    </p>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="mt-2 text-sm text-blue-500 hover:underline"
                                        >
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredProducts.map((product) => {
                                        const displayAvailable =
                                            getDisplayAvailable(product.id);
                                        const isOutOfStock =
                                            displayAvailable === 0;
                                        const stockStatus =
                                            getStockStatus(displayAvailable);
                                        const amc =
                                            product.monthlyAverageConsumption;

                                        return (
                                            <div
                                                key={product.id}
                                                onClick={() =>
                                                    !isOutOfStock &&
                                                    openModal(product)
                                                }
                                                className={`rounded-lg border p-4 transition-all ${
                                                    isOutOfStock
                                                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                                                        : 'cursor-pointer border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                }`}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (
                                                        (e.key === 'Enter' ||
                                                            e.key === ' ') &&
                                                        !isOutOfStock
                                                    ) {
                                                        e.preventDefault();
                                                        openModal(product);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="truncate text-sm font-medium text-gray-900">
                                                            {
                                                                product.productName
                                                            }
                                                        </h4>
                                                        {product.genericName && (
                                                            <p className="truncate text-xs text-gray-500">
                                                                Generic:{' '}
                                                                {
                                                                    product.genericName
                                                                }
                                                            </p>
                                                        )}
                                                        <p className="truncate text-xs text-gray-500">
                                                            Code:{' '}
                                                            {
                                                                product.productCode
                                                            }
                                                            {product.barcode !==
                                                                'N/A' &&
                                                                ` | Barcode: ${product.barcode}`}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                                                                    isOutOfStock
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : stockStatus ===
                                                                            'low-stock'
                                                                          ? 'bg-yellow-100 text-yellow-700'
                                                                          : 'bg-green-100 text-green-700'
                                                                }`}
                                                            >
                                                                {isOutOfStock ? (
                                                                    <>
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        Out of
                                                                        Stock
                                                                    </>
                                                                ) : stockStatus ===
                                                                  'low-stock' ? (
                                                                    <>
                                                                        <AlertTriangle className="h-3 w-3" />
                                                                        {
                                                                            displayAvailable
                                                                        }{' '}
                                                                        available
                                                                    </>
                                                                ) : (
                                                                    `${displayAvailable} available`
                                                                )}
                                                            </span>
                                                            <span className="text-gray-500">
                                                                {
                                                                    product.unitOfMeasure
                                                                }
                                                            </span>
                                                            {amc && (
                                                                <span className="text-gray-500">
                                                                    AMC: {amc}
                                                                    /month
                                                                </span>
                                                            )}
                                                            {product.nearestExpiryDate && (
                                                                <span className="text-gray-500">
                                                                    Exp:{' '}
                                                                    {formatDate(
                                                                        product.nearestExpiryDate,
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!isOutOfStock && (
                                                        <span className="ml-2 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                            Add
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Cart */}
                <div className="w-full lg:w-1/2">
                    <div className="rounded-lg border border-gray-200 bg-white">
                        <div className="border-b border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5 text-gray-500" />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Requisition Cart
                                    </h3>
                                    {cartSummary.totalItems > 0 && (
                                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-700">
                                            {cartSummary.totalItems}
                                        </span>
                                    )}
                                </div>
                                {cartSummary.totalItems > 0 && (
                                    <button
                                        onClick={clearCart}
                                        className="text-sm text-red-600 hover:text-red-700 hover:underline"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            {cartSummary.totalItems > 0 && (
                                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                    <span className="text-gray-500">
                                        Total:{' '}
                                        <span className="font-medium text-gray-900">
                                            {cartSummary.totalQuantity} units
                                        </span>
                                    </span>
                                    {cartSummary.hasUrgent && (
                                        <span className="font-medium text-red-600">
                                            {cartSummary.urgentItems} urgent
                                        </span>
                                    )}
                                    {cartSummary.hasHigh && (
                                        <span className="font-medium text-orange-600">
                                            {cartSummary.highPriorityItems} high
                                            priority
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto p-4">
                            {cartSummary.totalItems === 0 ? (
                                <div className="py-12 text-center">
                                    <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                    <p className="text-gray-500">
                                        Your requisition cart is empty
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Select products to add to your request
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cartItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="rounded-lg border border-gray-200 p-3"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium text-gray-900">
                                                        {
                                                            item.product
                                                                .productName
                                                        }
                                                    </h4>
                                                    <p className="text-xs text-gray-500">
                                                        Code:{' '}
                                                        {
                                                            item.product
                                                                .productCode
                                                        }
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {item.quantity}{' '}
                                                            {item.unitOfMeasure}
                                                        </span>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(item.priority)}`}
                                                        >
                                                            {item.priority
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                item.priority.slice(
                                                                    1,
                                                                )}
                                                        </span>
                                                        {item.requiredDate && (
                                                            <span className="text-xs text-gray-500">
                                                                Due:{' '}
                                                                {formatDate(
                                                                    item.requiredDate,
                                                                )}
                                                            </span>
                                                        )}
                                                        {item.amc && (
                                                            <span className="text-xs text-gray-500">
                                                                AMC: {item.amc}
                                                                /month
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.comments && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {item.comments}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-start gap-1">
                                                    <button
                                                        onClick={() => {
                                                            // Re-open modal with this item's data for editing
                                                            setSelectedProduct(
                                                                item.product,
                                                            );
                                                            setFormData({
                                                                quantity:
                                                                    item.quantity,
                                                                requiredDate:
                                                                    item.requiredDate,
                                                                priority:
                                                                    item.priority,
                                                                batchNumber:
                                                                    item.batchNumber ||
                                                                    '',
                                                                justification:
                                                                    item.justification,
                                                                comments:
                                                                    item.comments,
                                                            });
                                                            setIsModalOpen(
                                                                true,
                                                            );
                                                            // Remove from cart when editing
                                                            removeCartItem(
                                                                index,
                                                            );
                                                        }}
                                                        className="rounded-full p-1 text-blue-500 transition-colors hover:bg-blue-50"
                                                        aria-label="Edit item"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            removeCartItem(
                                                                index,
                                                            )
                                                        }
                                                        className="rounded-full p-1 text-red-500 transition-colors hover:bg-red-50"
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Submit Button */}
                                    <button
                                        onClick={() => setShowSummary(true)}
                                        disabled={isSubmitting}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardCheck className="h-4 w-4" />
                                                Review & Submit (
                                                {cartSummary.totalItems} items)
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
