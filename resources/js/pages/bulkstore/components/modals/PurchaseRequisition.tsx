import { usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    X,
    Package,
    AlertTriangle,
    Trash2,
    Send,
    Loader2,
    RefreshCw,
    Search,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface Budget {
    id: number;
    budget_code: string | null;
    budget_name: string | null;
    available: number | string | null;
    utilization: number | null;
    allocated?: number | null;
    category?: string | null;
    status?: string | null;
    is_sufficient?: boolean;
    department?: string | null;
    available_amount?: number | string | null;
    utilization_percentage?: number | string | null;
    alert_triggered?: boolean;
    alert_message?: string | null;
}

interface Product {
    id: number;
    product_name: string | null;
    product_code?: string | null;
    full_name?: string | null;
    strength?: string | null;
    form?: string | null;
    stock?: number | null;
    unit?: string | null;
    price?: number | null;
    pack_size?: string | null;
}

interface Department {
    id: number;
    name: string | null;
    code?: string | null;
}

interface Supplier {
    id: number;
    supplier_name: string | null;
    supplier_code?: string | null;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
}

interface RequisitionItem {
    product_id: number;
    product_name?: string | null;
    product_code?: string | null;
    quantity: number;
    estimated_unit_price: number;
    required_by_date: string | null;
    notes: string;
    temp_id?: string;
}

interface NormalizedBudgetCheck {
    loading?: boolean;
    raw?: any;
    budget: {
        code: string | null;
        available: number;
        utilization: number;
        alert_triggered: boolean;
        alert_message: string | null;
    } | null;
    request: {
        amount: number;
        is_sufficient: boolean;
    };
    recommendation?: string | null;
}

interface PurchaseRequisitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultDepartmentId?: number;
    editData?: any;
    mode?: 'create' | 'edit' | 'view';
    budgets?: Budget[];
    suppliers?: Supplier[];
    departments?: Department[];
    products?: Product[];
    isLoading?: boolean;
    onRefresh?: () => void;
    onCheckBudget?: (budgetCode: string, amount: number) => Promise<any>;
    onSubmit?: (data: any) => Promise<any>;
    userId?: number | null;
}

// ============================================
// HELPERS
// ============================================

const safeLower = (value: unknown): string =>
    value === null || value === undefined ? '' : String(value).toLowerCase();

const safeText = (value: unknown, fallback = '—'): string => {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
};

const asArray = <T,>(value: unknown): T[] =>
    Array.isArray(value) ? (value as T[]) : [];

const toNumber = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : fallback;
};

const pickNumber = (source: any, keys: string[], fallback = 0): number => {
    if (!source) return fallback;
    for (const key of keys) {
        const v = source?.[key];
        if (v !== null && v !== undefined && v !== '') {
            const n = toNumber(v, NaN);
            if (Number.isFinite(n)) return n;
        }
    }
    return fallback;
};

const pickBoolean = (
    source: any,
    keys: string[],
    fallback = false,
): boolean => {
    if (!source) return fallback;
    for (const key of keys) {
        const v = source?.[key];
        if (v === true || v === false) return v;
        if (v === 1 || v === '1' || v === 'true') return true;
        if (v === 0 || v === '0' || v === 'false') return false;
    }
    return fallback;
};

const normalizeBudgetCheck = (
    input: any,
    fallbackAmount: number,
): NormalizedBudgetCheck => {
    const raw = input ?? {};
    const rawBudget = raw.budget ?? null;
    const rawContext = raw.context ?? raw.request ?? null;

    const available = pickNumber(
        rawBudget,
        ['available', 'available_amount', 'uncommitted_amount'],
        0,
    );
    const utilization = pickNumber(
        rawBudget,
        ['utilization', 'utilization_percentage'],
        0,
    );
    const code =
        rawBudget?.budget_code ?? rawBudget?.code ?? raw?.budget_code ?? null;

    const amount = pickNumber(
        rawContext,
        ['amount', 'requested_amount', 'total'],
        fallbackAmount,
    );

    let isSufficient: boolean;
    const explicit =
        rawContext?.is_sufficient ??
        rawBudget?.is_sufficient ??
        (typeof raw.success === 'boolean' ? raw.success : undefined);

    if (typeof explicit === 'boolean') {
        isSufficient = explicit;
    } else {
        isSufficient = available >= amount;
    }

    if (raw.success === false && !rawBudget) {
        isSufficient = false;
    }

    return {
        loading: false,
        raw,
        budget: rawBudget
            ? {
                  code,
                  available,
                  utilization,
                  alert_triggered: pickBoolean(rawBudget, ['alert_triggered']),
                  alert_message: rawBudget?.alert_message ?? null,
              }
            : null,
        request: { amount, is_sufficient: isSufficient },
        recommendation: raw?.recommendation ?? raw?.message ?? null,
    };
};

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    converted: {
        label: 'Converted',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
};

// ============================================
// MAIN COMPONENT  (default export at bottom)
// ============================================

export default function PurchaseRequisitionModal({
    isOpen,
    onClose,
    onSuccess,
    defaultDepartmentId,
    editData,
    mode = 'create',
    budgets = [],
    suppliers = [],
    departments = [],
    products = [],
    isLoading = false,
    onRefresh,
    onCheckBudget,
    onSubmit,
    userId = null,
}: PurchaseRequisitionModalProps) {
    // ---------- STATE ----------
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [budgetCheck, setBudgetCheck] =
        useState<NormalizedBudgetCheck | null>(null);
    const [items, setItems] = useState<RequisitionItem[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [quantity, setQuantity] = useState<number>(1);
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const budgetCheckRequestId = useRef(0);
    const { auth } = usePage().props as any;

    const safeProducts = asArray<Product>(products);
    const safeSuppliers = asArray<Supplier>(suppliers);
    const safeDepartments = asArray<Department>(departments);
    const safeBudgets = asArray<Budget>(budgets);

    const [form, setForm] = useState({
        department_id: defaultDepartmentId || '',
        budget_code: '',
        required_date: '',
        priority: 'medium',
        justification: '',
        supplier_id: '',
        delivery_required: false,
        delivery_address: '',
        special_instructions: '',
        cost_center: '',
        requester: auth?.user?.name ?? '',
        requester_id: auth?.user?.id ?? null,
    });

    // ---------- DERIVED ----------
    const total = useMemo(
        () =>
            items.reduce(
                (sum, i) =>
                    sum +
                    toNumber(i.quantity) * toNumber(i.estimated_unit_price),
                0,
            ),
        [items],
    );

    const calculateTotal = () => total;

    const formatCurrency = (amount: number | null | undefined) => {
        const n = Number(amount);
        const safe = Number.isFinite(n) ? n : 0;
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(safe);
    };

    const getBudgetAvailable = (budget: Budget) =>
        pickNumber(budget, ['available', 'available_amount'], 0);

    // ---------- EFFECTS ----------
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && editData) {
                loadEditData(editData);
            } else {
                resetForm();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode, editData]);

    useEffect(() => {
        const term = safeLower(searchQuery).trim();
        if (term.length >= 2) {
            const results = safeProducts.filter((product) => {
                const name = safeLower(product?.product_name);
                const code = safeLower(product?.product_code);
                const fullName = safeLower(product?.full_name);
                return (
                    name.includes(term) ||
                    code.includes(term) ||
                    fullName.includes(term)
                );
            });
            setSearchResults(results.slice(0, 10));
            setShowSearchResults(true);
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, products]);

    useEffect(() => {
        if (mode === 'view') return;

        const requestId = ++budgetCheckRequestId.current;

        if (!form.budget_code) {
            setBudgetCheck(null);
            return;
        }

        if (total <= 0) {
            setBudgetCheck(null);
            return;
        }

        if (!onCheckBudget) {
            const selected = safeBudgets.find(
                (b) => b.budget_code === form.budget_code,
            );
            if (selected) {
                setBudgetCheck(
                    normalizeBudgetCheck(
                        {
                            success: true,
                            budget: selected,
                            context: { amount: total },
                        },
                        total,
                    ),
                );
            } else {
                setBudgetCheck(null);
            }
            return;
        }

        setBudgetCheck({
            loading: true,
            budget: null,
            request: { amount: total, is_sufficient: false },
        });

        const timeout = setTimeout(async () => {
            try {
                const result = await onCheckBudget(form.budget_code, total);

                if (requestId !== budgetCheckRequestId.current) return;

                if (!result) {
                    setBudgetCheck({
                        budget: null,
                        request: { amount: total, is_sufficient: false },
                        recommendation:
                            'Unable to verify budget. Please try again.',
                    });
                    return;
                }

                const normalized = normalizeBudgetCheck(result, total);
                setBudgetCheck(normalized);

                if (!normalized.request.is_sufficient) {
                    toast.error(
                        result?.message ||
                            'Insufficient budget for this requisition',
                    );
                }
            } catch (err: any) {
                if (requestId !== budgetCheckRequestId.current) return;
                console.error('Budget check error:', err);
                toast.error(err?.message || 'Budget check failed');
                setBudgetCheck({
                    budget: null,
                    request: { amount: total, is_sufficient: false },
                    recommendation:
                        err?.message || 'Budget check service unavailable.',
                });
            }
        }, 500);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.budget_code, total, items, mode]);

    // ---------- LOAD EDIT ----------
    const loadEditData = (data: any) => {
        setForm({
            department_id: data?.department_id ?? defaultDepartmentId ?? '',
            budget_code: data?.budget_code ?? '',
            required_date: data?.required_date ?? '',
            priority: data?.priority ?? 'medium',
            justification: data?.justification ?? '',
            supplier_id: data?.supplier_id ?? '',
            delivery_required: data?.delivery_required ?? false,
            delivery_address: data?.delivery_address ?? '',
            special_instructions: data?.special_instructions ?? '',
            cost_center: data?.cost_center ?? '',
            requester: data?.requester ?? auth?.user?.name ?? '',
            requester_id: data?.requested_by ?? auth?.user?.id ?? null,
        });

        if (Array.isArray(data?.items) && data.items.length) {
            setItems(
                data.items.map((item: any) => ({
                    product_id: item.product_id,
                    product_name: item.product_name ?? '',
                    product_code: item.product_code ?? '',
                    quantity: toNumber(item.quantity, 0),
                    estimated_unit_price: toNumber(
                        item.estimated_unit_price,
                        0,
                    ),
                    required_by_date: item.required_by_date ?? '',
                    notes: item.notes ?? '',
                    temp_id: `t_${Date.now()}_${Math.random()}`,
                })),
            );
        } else {
            setItems([]);
        }
    };

    const resetForm = () => {
        setForm({
            department_id: defaultDepartmentId || '',
            budget_code: '',
            required_date: '',
            priority: 'medium',
            justification: '',
            supplier_id: '',
            delivery_required: false,
            delivery_address: '',
            special_instructions: '',
            cost_center: '',
            requester: auth?.user?.name ?? '',
            requester_id: auth?.user?.id ?? null,
        });
        setItems([]);
        setBudgetCheck(null);
        setError(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedProduct(null);
        setQuantity(1);
        setEstimatedPrice(0);
        budgetCheckRequestId.current++;
    };

    // ---------- VALIDATION ----------
    const isFormValid = () => {
        if (!form.department_id) return false;
        if (!form.budget_code) return false;
        if (!form.required_date) return false;
        if (!form.justification || form.justification.length < 10) return false;
        if (items.length === 0) return false;
        if (total <= 0) return false;
        if (!budgetCheck) return false;
        if (budgetCheck.loading) return false;
        if (!budgetCheck.request.is_sufficient) return false;
        return true;
    };

    const getDisabledReason = () => {
        if (!form.department_id) return 'Please select a department';
        if (!form.budget_code) return 'Please select a budget code';
        if (!form.required_date) return 'Please select a required date';
        if (!form.justification || form.justification.length < 10)
            return 'Please provide a justification (minimum 10 characters)';
        if (items.length === 0) return 'Please add at least one product';
        if (total <= 0) return 'Add items with a quantity and price';
        if (!budgetCheck) return 'Checking budget availability...';
        if (budgetCheck.loading) return 'Checking budget...';
        if (!budgetCheck.request.is_sufficient) {
            const available = budgetCheck.budget?.available ?? 0;
            const shortfall = Math.max(0, total - available);
            return `Insufficient budget. Shortfall: ${formatCurrency(shortfall)}`;
        }
        return null;
    };

    // ---------- ITEMS ----------
    const addProductToRequisition = () => {
        if (!selectedProduct) {
            toast.error('Please search and select a product first');
            return;
        }
        if (quantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }
        if (estimatedPrice < 0) {
            toast.error('Unit price cannot be negative');
            return;
        }

        const existingIndex = items.findIndex(
            (item) => item.product_id === selectedProduct.id,
        );

        if (existingIndex !== -1) {
            const updatedItems = [...items];
            updatedItems[existingIndex] = {
                ...updatedItems[existingIndex],
                quantity:
                    toNumber(updatedItems[existingIndex].quantity) + quantity,
                estimated_unit_price: estimatedPrice,
                required_by_date: form.required_date,
            };
            setItems(updatedItems);
            toast.success(
                `Updated ${safeText(selectedProduct.product_name, 'product')} quantity`,
            );
        } else {
            const newItem: RequisitionItem = {
                product_id: selectedProduct.id,
                product_name: selectedProduct.product_name ?? '',
                product_code: selectedProduct.product_code ?? 'N/A',
                quantity,
                estimated_unit_price: estimatedPrice,
                required_by_date: form.required_date,
                notes: '',
                temp_id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            };
            setItems([...items, newItem]);
            toast.success(
                `${safeText(selectedProduct.product_name, 'Product')} added to requisition`,
            );
        }

        setSelectedProduct(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
        setQuantity(1);
        setEstimatedPrice(0);
        searchInputRef.current?.focus();
    };

    const removeItem = (tempId: string) => {
        setItems(items.filter((item) => item.temp_id !== tempId));
        toast.success('Item removed from requisition');
    };

    const updateItemQuantity = (tempId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.temp_id === tempId
                    ? { ...item, quantity: newQuantity }
                    : item,
            ),
        );
    };

    const updateItemPrice = (tempId: string, newPrice: number) => {
        if (newPrice < 0) {
            toast.error('Price cannot be negative');
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.temp_id === tempId
                    ? { ...item, estimated_unit_price: newPrice }
                    : item,
            ),
        );
    };

    // ---------- SUBMIT ----------
    const validateForm = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        if (!form.department_id) errors.push('Please select a department');
        if (!form.budget_code) errors.push('Please select a budget code');
        if (!form.required_date) errors.push('Please select a required date');
        if (!form.justification || form.justification.length < 10)
            errors.push(
                'Please provide a justification (minimum 10 characters)',
            );
        if (items.length === 0)
            errors.push('Please add at least one product to the requisition');
        if (total <= 0)
            errors.push('Requisition total must be greater than zero');
        if (!budgetCheck?.request.is_sufficient)
            errors.push(
                'Insufficient budget. Please adjust quantities or select a different budget.',
            );
        return { valid: errors.length === 0, errors };
    };

    const handleSubmit = async () => {
        const validation = validateForm();
        if (!validation.valid) {
            validation.errors.forEach((err) => toast.error(err));
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                department_id: form.department_id
                    ? parseInt(String(form.department_id), 10)
                    : null,
                budget_code: form.budget_code,
                required_date: form.required_date,
                priority: form.priority,
                justification: form.justification,
                supplier_id: form.supplier_id
                    ? parseInt(String(form.supplier_id), 10)
                    : null,
                cost_center: form.cost_center || null,
                delivery_required: form.delivery_required,
                delivery_address: form.delivery_address || null,
                special_instructions: form.special_instructions || null,
                requested_by: auth?.user?.id ?? null,
                items: items.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    estimated_unit_price: item.estimated_unit_price,
                    required_by_date:
                        item.required_by_date || form.required_date,
                    notes: item.notes || '',
                })),
                total_amount: total,
                requestedBy: userId ?? null,
            };

            if (onSubmit) {
                await onSubmit(payload);
            } else {
                const url =
                    mode === 'edit' && editData
                        ? `/api/purchasing/requisition/${editData.id}`
                        : `/bulk-store/purchase/requisition/${auth?.user?.id ?? 'self'}/create`;
                const method = mode === 'edit' && editData ? 'PUT' : 'POST';

                const response = await axios({
                    method,
                    url,
                    data: payload,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            document
                                .querySelector('meta[name="csrf-token"]')
                                ?.getAttribute('content') || '',
                    },
                });

                if (!response.data?.success) {
                    throw new Error(
                        response.data?.message || 'Failed to submit',
                    );
                }
            }

            toast.success(
                `Requisition ${mode === 'edit' ? 'updated' : 'created'} successfully!`,
            );
            onSuccess();
            onClose();
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to submit requisition';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- RENDER ----------
    if (!isOpen) return null;

    const isViewMode = mode === 'view';
    const showLoading = isLoading || loading;
    const totalItems = items.length;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="relative max-h-[95vh] w-full max-w-4xl rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* HEADER */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="rounded bg-blue-100 p-1.5 dark:bg-blue-900/30">
                                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    {isViewMode
                                        ? 'Requisition Details'
                                        : mode === 'edit'
                                          ? 'Edit Requisition'
                                          : 'New Requisition'}
                                </h3>
                                {editData?.pr_number && (
                                    <span className="font-mono text-xs text-slate-400">
                                        #{editData.pr_number}
                                    </span>
                                )}
                                {editData?.status && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            STATUS_CONFIG[editData.status]
                                                ?.color || 'bg-gray-100'
                                        }`}
                                    >
                                        {STATUS_CONFIG[editData.status]
                                            ?.label || editData.status}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {onRefresh && (
                                <button
                                    onClick={onRefresh}
                                    className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    title="Refresh"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 text-slate-500 ${
                                            showLoading ? 'animate-spin' : ''
                                        }`}
                                    />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <X className="h-4 w-4 text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div className="mx-4 mt-2 rounded bg-red-50 p-3 dark:bg-red-900/20">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-700 dark:text-red-400">
                                    {error}
                                </span>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LOADING */}
                    {showLoading ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div
                            className={`max-h-[calc(95vh-160px)] overflow-y-auto p-4 ${
                                isViewMode ? 'opacity-80' : ''
                            }`}
                        >
                            {/* TWO COLUMN FORM */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* LEFT COLUMN */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Department *
                                            </label>
                                            <select
                                                value={form.department_id}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        department_id:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                                disabled={isViewMode}
                                            >
                                                <option value="">Select</option>
                                                {safeDepartments.map((d) => (
                                                    <option
                                                        key={d.id}
                                                        value={d.id}
                                                    >
                                                        {safeText(d.name)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Required By *
                                            </label>
                                            <input
                                                type="date"
                                                value={form.required_date}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        required_date:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                                disabled={isViewMode}
                                                min={
                                                    new Date()
                                                        .toISOString()
                                                        .split('T')[0]
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Priority
                                            </label>
                                            <select
                                                value={form.priority}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        priority:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                                disabled={isViewMode}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">
                                                    Medium
                                                </option>
                                                <option value="high">
                                                    High
                                                </option>
                                                <option value="urgent">
                                                    Urgent
                                                </option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Supplier
                                            </label>
                                            <select
                                                value={form.supplier_id}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        supplier_id:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                                disabled={isViewMode}
                                            >
                                                <option value="">Select</option>
                                                {safeSuppliers.map((s) => (
                                                    <option
                                                        key={s.id}
                                                        value={s.id}
                                                    >
                                                        {safeText(
                                                            s.supplier_name,
                                                            `Supplier #${s.id}`,
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Budget Code *
                                        </label>
                                        <select
                                            value={form.budget_code}
                                            onChange={(e) => {
                                                setForm({
                                                    ...form,
                                                    budget_code: e.target.value,
                                                });
                                                setBudgetCheck(null);
                                            }}
                                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                            disabled={isViewMode}
                                        >
                                            <option value="">
                                                Select Budget
                                            </option>
                                            {safeBudgets.map((b) => (
                                                <option
                                                    key={b.id}
                                                    value={b.budget_code ?? ''}
                                                >
                                                    {safeText(b.budget_code)}
                                                    {' - '}
                                                    {safeText(b.budget_name)}
                                                    {getBudgetAvailable(b) > 0
                                                        ? ` (${formatCurrency(getBudgetAvailable(b))})`
                                                        : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Cost Center
                                            </label>
                                            <input
                                                type="text"
                                                value={form.cost_center}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        cost_center:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                                placeholder="CC-001"
                                                disabled={isViewMode}
                                            />
                                        </div>
                                        <div className="flex items-end pb-1">
                                            {!isViewMode && (
                                                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            form.delivery_required
                                                        }
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                delivery_required:
                                                                    e.target
                                                                        .checked,
                                                            })
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                                    />
                                                    Delivery Required
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {form.delivery_required && !isViewMode && (
                                        <input
                                            type="text"
                                            value={form.delivery_address}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    delivery_address:
                                                        e.target.value,
                                                })
                                            }
                                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                            placeholder="Delivery address..."
                                        />
                                    )}
                                </div>

                                {/* RIGHT COLUMN */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Justification *
                                        </label>
                                        <textarea
                                            value={form.justification}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    justification:
                                                        e.target.value,
                                                })
                                            }
                                            rows={3}
                                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                            placeholder="Why is this needed?"
                                            disabled={isViewMode}
                                        />
                                    </div>

                                    {budgetCheck && !budgetCheck.loading && (
                                        <div
                                            className={`rounded p-3 text-xs ${
                                                budgetCheck.request
                                                    .is_sufficient
                                                    ? budgetCheck.budget &&
                                                      budgetCheck.budget
                                                          .utilization >= 75
                                                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                                        : 'bg-green-50 dark:bg-green-900/20'
                                                    : 'bg-red-50 dark:bg-red-900/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">
                                                    {safeText(
                                                        budgetCheck.budget
                                                            ?.code,
                                                        form.budget_code,
                                                    )}
                                                </span>
                                                <span
                                                    className={
                                                        budgetCheck.request
                                                            .is_sufficient
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                    }
                                                >
                                                    {budgetCheck.request
                                                        .is_sufficient
                                                        ? '✓ Sufficient'
                                                        : '✗ Insufficient'}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex gap-3 text-[11px]">
                                                <span>
                                                    Avail:{' '}
                                                    {formatCurrency(
                                                        budgetCheck.budget
                                                            ?.available ?? 0,
                                                    )}
                                                </span>
                                                <span>
                                                    Req:{' '}
                                                    {formatCurrency(
                                                        budgetCheck.request
                                                            .amount,
                                                    )}
                                                </span>
                                                <span>
                                                    Util:{' '}
                                                    {budgetCheck.budget
                                                        ?.utilization ?? 0}
                                                    %
                                                </span>
                                            </div>
                                            {budgetCheck.budget
                                                ?.alert_triggered && (
                                                <div className="mt-1.5 rounded bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                                    ⚠️{' '}
                                                    {budgetCheck.budget
                                                        .alert_message ||
                                                        'Budget alert triggered'}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {budgetCheck && budgetCheck.loading && (
                                        <div className="rounded bg-blue-50 p-3 dark:bg-blue-900/20">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                                <span className="text-sm text-blue-700 dark:text-blue-400">
                                                    Checking budget
                                                    availability...
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {budgetCheck &&
                                        !budgetCheck.loading &&
                                        !budgetCheck.request.is_sufficient && (
                                            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                                                    <div className="text-sm text-red-700 dark:text-red-400">
                                                        <strong>
                                                            Insufficient Budget!
                                                        </strong>
                                                        <br />
                                                        Required:{' '}
                                                        {formatCurrency(
                                                            budgetCheck.request
                                                                .amount,
                                                        )}
                                                        <br />
                                                        Available:{' '}
                                                        {formatCurrency(
                                                            budgetCheck.budget
                                                                ?.available ??
                                                                0,
                                                        )}
                                                        <br />
                                                        Shortfall:{' '}
                                                        {formatCurrency(
                                                            Math.max(
                                                                0,
                                                                budgetCheck
                                                                    .request
                                                                    .amount -
                                                                    (budgetCheck
                                                                        .budget
                                                                        ?.available ??
                                                                        0),
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Special Instructions
                                        </label>
                                        <textarea
                                            value={form.special_instructions}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    special_instructions:
                                                        e.target.value,
                                                })
                                            }
                                            rows={2}
                                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                            placeholder="Special instructions..."
                                            disabled={isViewMode}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PRODUCT SEARCH */}
                            {!isViewMode && (
                                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                                    <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                                        Add Products to Requisition
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                        <div className="relative md:col-span-2">
                                            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                                                Search Product
                                            </label>
                                            <div className="relative">
                                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    placeholder="Search by name or code..."
                                                    value={searchQuery}
                                                    onChange={(e) =>
                                                        setSearchQuery(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                                    onFocus={() =>
                                                        (searchQuery ?? '')
                                                            .length >= 2 &&
                                                        setShowSearchResults(
                                                            true,
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        setTimeout(
                                                            () =>
                                                                setShowSearchResults(
                                                                    false,
                                                                ),
                                                            200,
                                                        )
                                                    }
                                                />
                                                {showSearchResults &&
                                                    searchResults.length >
                                                        0 && (
                                                        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-700">
                                                            {searchResults.map(
                                                                (product) => (
                                                                    <div
                                                                        key={
                                                                            product.id
                                                                        }
                                                                        className="cursor-pointer px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-600"
                                                                        onMouseDown={() => {
                                                                            setSelectedProduct(
                                                                                product,
                                                                            );
                                                                            setEstimatedPrice(
                                                                                toNumber(
                                                                                    product.price,
                                                                                    0,
                                                                                ),
                                                                            );
                                                                            setSearchQuery(
                                                                                product.product_name ??
                                                                                    '',
                                                                            );
                                                                            setShowSearchResults(
                                                                                false,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <div className="font-medium text-gray-800 dark:text-white">
                                                                            {safeText(
                                                                                product.product_name,
                                                                                `Product #${product.id}`,
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                            {safeText(
                                                                                product.product_code,
                                                                                'N/A',
                                                                            )}
                                                                            {
                                                                                ' | '
                                                                            }
                                                                            {safeText(
                                                                                'Package: ' +
                                                                                    product.pack_size,
                                                                                'Each',
                                                                            )}
                                                                            {product.stock !=
                                                                                null &&
                                                                                ` | Stock: ${product.stock}`}
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>

                                        {selectedProduct && (
                                            <>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                                                        Quantity
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={quantity}
                                                        onChange={(e) =>
                                                            setQuantity(
                                                                Math.max(
                                                                    0.01,
                                                                    parseFloat(
                                                                        e.target
                                                                            .value,
                                                                    ) || 0,
                                                                ),
                                                            )
                                                        }
                                                        min="0.01"
                                                        step="0.01"
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                                                        Unit Price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={estimatedPrice}
                                                        onChange={(e) =>
                                                            setEstimatedPrice(
                                                                Math.max(
                                                                    0,
                                                                    parseFloat(
                                                                        e.target
                                                                            .value,
                                                                    ) || 0,
                                                                ),
                                                            )
                                                        }
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            addProductToRequisition
                                                        }
                                                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                                    >
                                                        Add Product
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ITEMS TABLE */}
                            <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Requisition Items ({totalItems}) *
                                    </label>
                                </div>

                                {totalItems === 0 ? (
                                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
                                        <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
                                        <p className="mt-2 text-gray-500 dark:text-slate-400">
                                            No products added yet
                                        </p>
                                        <p className="text-sm text-gray-400 dark:text-slate-500">
                                            Search and add products using the
                                            form above
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                            <thead className="bg-gray-50 dark:bg-slate-800/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400">
                                                        Product
                                                    </th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
                                                        Qty
                                                    </th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
                                                        Unit Price
                                                    </th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                                                        Total
                                                    </th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
                                                        Action
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                                {items.map((item) => (
                                                    <tr
                                                        key={item.temp_id}
                                                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50"
                                                    >
                                                        <td className="px-4 py-2">
                                                            <div className="font-medium text-gray-800 dark:text-white">
                                                                {safeText(
                                                                    item.product_name,
                                                                    `Product ID: ${item.product_id}`,
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {safeText(
                                                                    item.product_code,
                                                                    'N/A',
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {isViewMode ? (
                                                                <span className="text-gray-800 dark:text-white">
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={
                                                                        item.quantity
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateItemQuantity(
                                                                            item.temp_id!,
                                                                            Math.max(
                                                                                0.01,
                                                                                parseFloat(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                ) ||
                                                                                    0,
                                                                            ),
                                                                        )
                                                                    }
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {isViewMode ? (
                                                                <span className="text-gray-800 dark:text-white">
                                                                    {formatCurrency(
                                                                        item.estimated_unit_price,
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={
                                                                        item.estimated_unit_price
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateItemPrice(
                                                                            item.temp_id!,
                                                                            Math.max(
                                                                                0,
                                                                                parseFloat(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                ) ||
                                                                                    0,
                                                                            ),
                                                                        )
                                                                    }
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-24 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-medium text-gray-800 dark:text-white">
                                                            {formatCurrency(
                                                                toNumber(
                                                                    item.quantity,
                                                                ) *
                                                                    toNumber(
                                                                        item.estimated_unit_price,
                                                                    ),
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {!isViewMode && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeItem(
                                                                            item.temp_id!,
                                                                        )
                                                                    }
                                                                    className="font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 dark:bg-slate-800/50">
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-300"
                                                    >
                                                        Total:
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-white">
                                                        {formatCurrency(total)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FOOTER */}
                    <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                                {items.length} items • {formatCurrency(total)}
                            </span>
                            <div className="flex gap-3">
                                {!isViewMode ? (
                                    <>
                                        <button
                                            onClick={onClose}
                                            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={
                                                submitting ||
                                                showLoading ||
                                                !isFormValid()
                                            }
                                            className="group relative flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            title={getDisabledReason() || ''}
                                        >
                                            {submitting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            {mode === 'edit'
                                                ? 'Update'
                                                : 'Submit'}
                                            {!isFormValid() &&
                                                getDisabledReason() && (
                                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-3 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                        {getDisabledReason()}
                                                    </span>
                                                )}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={onClose}
                                        className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
