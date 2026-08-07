// components/modals/PurchaseRequisition.tsx

import {usePage} from '@inertiajs/react'
import axios from 'axios';
import {
    X,
    Package,
    AlertTriangle,
    CheckCircle,
    Trash2,
    Send,
    Loader2,
    RefreshCw,
    Search,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface Budget {
    id: number;
    budget_code: string;
    budget_name: string;
    available: number | string;
    utilization: number;
    allocated?: number;
    category?: string;
    status?: string;
    is_sufficient?: boolean;
    department?: string;
}

interface Product {
    id: number;
    product_name: string;
    product_code?: string;
    full_name?: string;
    strength?: string;
    form?: string;
    stock?: number;
    unit?: string;
    price?: number;
}

interface Department {
    id: number;
    name: string;
    code?: string;
}

interface Supplier {
    id: number;
    name: string;
    code?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
}

interface RequisitionItem {
    product_id: number;
    product_name?: string;
    product_code?: string;
    quantity: number;
    estimated_unit_price: number;
    required_by_date: string;
    notes: string;
    temp_id?: string;
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
}

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
// MAIN COMPONENT
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
}: PurchaseRequisitionModalProps) {
    // ============================================
    // STATE
    // ============================================

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [budgetCheck, setBudgetCheck] = useState<any>(null);
    const [items, setItems] = useState<RequisitionItem[]>([]);

    // Product search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [quantity, setQuantity] = useState<number>(1);
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const {auth}         = usePage().props;
    // Form state
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
        requester: auth.user.name,
        requester_id: auth.user.id
    });
 

 
    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && editData) {
                loadEditData(editData);
            } else {
                resetForm();
            }
        }
    }, [isOpen, mode, editData]);

    // Search products
    useEffect(() => {
        if (searchQuery.length >= 2) {
            const results = products.filter(
                (product) =>
                    product.product_name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    (product.product_code &&
                        product.product_code
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())),
            );
            setSearchResults(results.slice(0, 10));
            setShowSearchResults(true);
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
    }, [searchQuery, products]);

    // Check budget when budget code or total changes
    useEffect(() => {
        if (form.budget_code) {
            const total = calculateTotal();
            const timeout = setTimeout(
                () => handleBudgetCheck(form.budget_code, total),
                500,
            );
            return () => clearTimeout(timeout);
        } else {
            setBudgetCheck(null);
        }
    }, [form.budget_code, items]);

    // ============================================
    // BUDGET CHECK HANDLER
    // ============================================

    const handleBudgetCheck = async (budgetCode: string, amount: number) => {
        if (!budgetCode || !amount || !onCheckBudget) return;

        setBudgetCheck({
            loading: true,
            request: { amount, is_sufficient: false },
        });

        try {
            const result = await onCheckBudget(budgetCode, amount);

            if (result) {
                if (result.success === false) {
                    toast.error(result.message || 'Budget check failed');
                    setBudgetCheck({
                        request: {
                            amount: amount,
                            is_sufficient: false,
                        },
                        budget: result.budget || null,
                        recommendation:
                            result.recommendation ||
                            'Budget check failed. Please try again.',
                    });
                } else {
                    setBudgetCheck(result);
                }
            } else {
                setBudgetCheck({
                    request: {
                        amount: amount,
                        is_sufficient: false,
                    },
                    budget: null,
                    recommendation:
                        'Unable to verify budget. Please try again.',
                });
            }
        } catch (err: any) {
            console.error('Budget check error:', err);
            toast.error(err.message || 'Budget check failed');
            setBudgetCheck({
                request: {
                    amount: amount,
                    is_sufficient: false,
                },
                budget: null,
                recommendation:
                    err.message || 'Budget check service unavailable.',
            });
        }
    };

    // ============================================
    // LOAD EDIT DATA
    // ============================================

    const loadEditData = (data: any) => {
        setForm({
            department_id: data.department_id || defaultDepartmentId || '',
            budget_code: data.budget_code || '',
            required_date: data.required_date || '',
            priority: data.priority || 'medium',
            justification: data.justification || '',
            supplier_id: data.supplier_id || '',
            delivery_required: data.delivery_required || false,
            delivery_address: data.delivery_address || '',
            special_instructions: data.special_instructions || '',
            cost_center: data.cost_center || '',
        });
        if (data.items?.length) {
            setItems(
                data.items.map((item: any) => ({
                    product_id: item.product_id,
                    product_name: item.product_name || '',
                    product_code: item.product_code || '',
                    quantity: item.quantity,
                    estimated_unit_price: item.estimated_unit_price,
                    required_by_date: item.required_by_date || '',
                    notes: item.notes || '',
                    temp_id: `t_${Date.now()}_${Math.random()}`,
                })),
            );
        }
    };

    // ============================================
    // HELPERS
    // ============================================

    const calculateTotal = () =>
        items.reduce((sum, i) => sum + i.quantity * i.estimated_unit_price, 0);

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
        });
        setItems([]);
        setBudgetCheck(null);
        setError(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedProduct(null);
        setQuantity(1);
        setEstimatedPrice(0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const getBudgetAvailable = (budget: Budget) => {
        return typeof budget.available === 'number'
            ? budget.available
            : parseFloat(budget.available as string) || 0;
    };

    // ============================================
    // FORM VALIDATION
    // ============================================

    const isFormValid = () => {
        if (!form.department_id) return false;
        if (!form.budget_code) return false;
        if (!form.required_date) return false;
        if (!form.justification || form.justification.length < 10) return false;
        if (items.length === 0) return false;
        if (!budgetCheck) return false;
        if (budgetCheck.loading) return false;
        if (!budgetCheck.request?.is_sufficient) return false;
        return true;
    };

    const getDisabledReason = () => {
        if (!form.department_id) return 'Please select a department';
        if (!form.budget_code) return 'Please select a budget code';
        if (!form.required_date) return 'Please select a required date';
        if (!form.justification || form.justification.length < 10) {
            return 'Please provide a justification (minimum 10 characters)';
        }
        if (items.length === 0) return 'Please add at least one product';
        if (!budgetCheck) return 'Checking budget availability...';
        if (budgetCheck.loading) return 'Checking budget...';
        if (!budgetCheck.request?.is_sufficient) {
            const shortfall =
                (budgetCheck.request?.amount || 0) -
                (budgetCheck.budget?.available || 0);
            return `Insufficient budget. Shortfall: ${formatCurrency(shortfall || 0)}`;
        }
        return null;
    };

    // ============================================
    // ITEM MANAGEMENT
    // ============================================

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
                quantity: updatedItems[existingIndex].quantity + quantity,
                estimated_unit_price: estimatedPrice,
                required_by_date: form.required_date,
            };
            setItems(updatedItems);
            toast.success(`Updated ${selectedProduct.product_name} quantity`);
        } else {
            const newItem: RequisitionItem = {
                product_id: selectedProduct.id,
                product_name: selectedProduct.product_name,
                product_code: selectedProduct.product_code || 'N/A',
                quantity: quantity,
                estimated_unit_price: estimatedPrice,
                required_by_date: form.required_date,
                notes: '',
                temp_id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            setItems([...items, newItem]);
            toast.success(
                `${selectedProduct.product_name} added to requisition`,
            );
        }

        setSelectedProduct(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
        setQuantity(1);
        setEstimatedPrice(0);
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
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

    // ============================================
    // SUBMIT HANDLER
    // ============================================

    const validateForm = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!form.department_id) {
            errors.push('Please select a department');
        }
        if (!form.budget_code) {
            errors.push('Please select a budget code');
        }
        if (!form.required_date) {
            errors.push('Please select a required date');
        }
        if (!form.justification || form.justification.length < 10) {
            errors.push(
                'Please provide a justification (minimum 10 characters)',
            );
        }
        if (items.length === 0) {
            errors.push('Please add at least one product to the requisition');
        }
        if (!budgetCheck?.request?.is_sufficient) {
            errors.push(
                'Insufficient budget. Please adjust quantities or select a different budget.',
            );
        }

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
          // In your React component - handleSubmit
const payload = {
    department_id: parseInt(form.department_id),
    budget_code: form.budget_code,
    required_date: form.required_date,
    priority: form.priority,
    justification: form.justification,
    supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
    cost_center: form.cost_center || null,
    delivery_required: form.delivery_required,
    delivery_address: form.delivery_address || null,
    special_instructions: form.special_instructions || null,
    requested_by: auth.user.id,  // Use existing field
    items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        estimated_unit_price: item.estimated_unit_price,
        required_by_date: item.required_by_date || form.required_date,
        notes: item.notes || '',
    })),
    total_amount: calculateTotal(),
};
console.log(payload)
            if (onSubmit) {
                await onSubmit(payload);
            } else {
                const url =
                    mode === 'edit' && editData
                        ? `/api/purchasing/requisition/${editData.id}`
                        : `/bulk-store/purchase/requisition/${auth.user.id}/create`;
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

                if (!response.data.success) {
                    throw new Error(
                        response.data.message || 'Failed to submit',
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
                err.response?.data?.message ||
                err.message ||
                'Failed to submit requisition';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================

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
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[editData.status]?.color || 'bg-gray-100'}`}
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
                                        className={`h-4 w-4 text-slate-500 ${showLoading ? 'animate-spin' : ''}`}
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
                            className={`max-h-[calc(95vh-160px)] overflow-y-auto p-4 ${isViewMode ? 'opacity-80' : ''}`}
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
                                                {departments.map((d) => (
                                                    <option
                                                        key={d.id}
                                                        value={d.id}
                                                    >
                                                        {d.name}
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
                                                {suppliers.map((s) => (
                                                    <option
                                                        key={s.id}
                                                        value={s.id}
                                                    >
                                                        {s.supplier_name}
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
                                                const code = e.target.value;
                                                setForm({
                                                    ...form,
                                                    budget_code: code,
                                                });
                                                setBudgetCheck(null);
                                            }}
                                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                            disabled={isViewMode}
                                        >
                                            <option value="">
                                                Select Budget
                                            </option>
                                            {budgets.map((b) => (
                                                <option
                                                    key={b.id}
                                                    value={b.budget_code}
                                                >
                                                    {b.budget_code} -{' '}
                                                    {b.budget_name}
                                                    {getBudgetAvailable(b) >
                                                        0 &&
                                                        ` (${formatCurrency(getBudgetAvailable(b))})`}
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

                                    {/* Budget Check Result */}
                                    {budgetCheck && !budgetCheck.loading && (
                                        <div
                                            className={`rounded p-3 text-xs ${
                                                budgetCheck.request
                                                    ?.is_sufficient
                                                    ? budgetCheck.budget
                                                          ?.utilization >= 75
                                                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                                        : 'bg-green-50 dark:bg-green-900/20'
                                                    : 'bg-red-50 dark:bg-red-900/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">
                                                    {budgetCheck.budget?.code ||
                                                        form.budget_code}
                                                </span>
                                                <span
                                                    className={
                                                        budgetCheck.request
                                                            ?.is_sufficient
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                    }
                                                >
                                                    {budgetCheck.request
                                                        ?.is_sufficient
                                                        ? '✓ Sufficient'
                                                        : '✗ Insufficient'}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex gap-3 text-[11px]">
                                                <span>
                                                    Avail:{' '}
                                                    {formatCurrency(
                                                        budgetCheck.budget
                                                            ?.available || 0,
                                                    )}
                                                </span>
                                                <span>
                                                    Req:{' '}
                                                    {formatCurrency(
                                                        budgetCheck.request
                                                            ?.amount || 0,
                                                    )}
                                                </span>
                                                <span>
                                                    Util:{' '}
                                                    {budgetCheck.budget
                                                        ?.utilization || 0}
                                                    %
                                                </span>
                                            </div>
                                            {budgetCheck.budget
                                                ?.alert_triggered && (
                                                <div className="mt-1.5 rounded bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                                    ⚠️{' '}
                                                    {budgetCheck.budget
                                                        ?.alert_message ||
                                                        'Budget alert triggered'}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Budget Check Loading */}
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

                                    {/* Insufficient Budget Warning */}
                                    {budgetCheck &&
                                        !budgetCheck.loading &&
                                        !budgetCheck.request?.is_sufficient && (
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
                                                                ?.amount || 0,
                                                        )}
                                                        <br />
                                                        Available:{' '}
                                                        {formatCurrency(
                                                            budgetCheck.budget
                                                                ?.available ||
                                                                0,
                                                        )}
                                                        <br />
                                                        Shortfall:{' '}
                                                        {formatCurrency(
                                                            (budgetCheck.request
                                                                ?.amount || 0) -
                                                                (budgetCheck
                                                                    .budget
                                                                    ?.available ||
                                                                    0),
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

                            {/* ============================================ */}
                            {/* PRODUCT SEARCH SECTION */}
                            {/* ============================================ */}

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
                                                        searchQuery.length >=
                                                            2 &&
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
                                                                                product.price ||
                                                                                    0,
                                                                            );
                                                                            setSearchQuery(
                                                                                product.product_name,
                                                                            );
                                                                            setShowSearchResults(
                                                                                false,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <div className="font-medium text-gray-800 dark:text-white">
                                                                            {
                                                                                product.product_name
                                                                            }
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                            {
                                                                                product.product_code
                                                                            }{' '}
                                                                            |{' '}
                                                                            {product.unit ||
                                                                                'Each'}
                                                                            {product.stock !==
                                                                                undefined &&
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

                            {/* ============================================ */}
                            {/* ITEMS TABLE */}
                            {/* ============================================ */}

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
                                                                {item.product_name ||
                                                                    `Product ID: ${item.product_id}`}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {item.product_code ||
                                                                    'N/A'}
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
                                                                item.quantity *
                                                                    item.estimated_unit_price,
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
                                                        {formatCurrency(
                                                            calculateTotal(),
                                                        )}
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
                                {items.length} items •{' '}
                                {formatCurrency(calculateTotal())}
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
