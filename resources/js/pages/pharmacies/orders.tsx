// pages/Pharmacy/Orders.tsx

import React, { useState, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import {
    Search,
    Package,
    AlertCircle,
    X,
    Plus,
    Minus,
    Truck,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types
interface Product {
    id: number;
    product_code: string;
    product_name: string;
    generic_name: string | null;
    barcode: string | null;
    category_name?: string;
    current_stock: number;
    reorder_level: number | null;
    selling_price: number | null;
    unit_of_measure: string | null;
    pack_size: number | null;
    dosage_form: string | null;
    strength: string | null;
}

interface OrdersProps {
    products: {
        data: Product[];
        meta: any;
    };
    lowStockProducts: Product[];
    categories: any[];
    filters: any;
}

export default function Orders() {
    const {
        auth,
        products,
        lowStockProducts = [],
        categories = [],
    } = usePage<OrdersProps>().props;
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'out_of_stock', 'low_stock', 'in_stock'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const productData = products?.data || [];

    // Apply filters
    const filtered = useMemo(() => {
        let result = productData;

        // Search filter
        if (search) {
            result = result.filter(
                (p) =>
                    p.product_name
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    p.product_code
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    p.barcode?.includes(search),
            );
        }

        // Category filter
        if (categoryFilter) {
            result = result.filter((p) => p.category_name === categoryFilter);
        }

        // Stock filter
        if (stockFilter === 'out_of_stock') {
            result = result.filter((p) => p.current_stock <= 0);
        } else if (stockFilter === 'low_stock') {
            result = result.filter(
                (p) =>
                    p.current_stock > 0 &&
                    p.current_stock <= (p.reorder_level || 0),
            );
        } else if (stockFilter === 'in_stock') {
            result = result.filter((p) => p.current_stock > 0);
        }

        return result;
    }, [productData, search, categoryFilter, stockFilter]);

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filtered.slice(start, end);
    }, [filtered, currentPage, itemsPerPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const getStockStatus = (stock: number, reorderLevel: number | null) => {
        if (stock <= 0) {
            return {
                label: 'Out of Stock',
                color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
            };
        }
        if (reorderLevel && stock <= reorderLevel) {
            return {
                label: 'Low Stock',
                color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            };
        }
        return {
            label: 'In Stock',
            color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
        };
    };

    const handleOrder = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const res = await Http.post('/pharmacy/order-products', {
                product_id: selected.id,
                created_by: auth.user.id,
                quantity,
                notes,
            });
            if (res.data.success) {
                toast.success(`Order placed for ${selected.product_name}`);
                setSelected(null);
                setSearch('');
                setQuantity(1);
                setNotes('');
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Order failed');
        } finally {
            setLoading(false);
        }
    };

    // Get stock counts
    const outOfStockCount = productData.filter(
        (p) => p.current_stock <= 0,
    ).length;
    const lowStockCount = productData.filter(
        (p) => p.current_stock > 0 && p.current_stock <= (p.reorder_level || 0),
    ).length;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pharmacy', href: '/pharmacy' },
                { title: 'Orders', href: '' },
            ]}
        >
            <div className="flex h-full flex-col gap-3 bg-slate-50 p-4 dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
                            Product Management
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Currently managing {productData.length} products in
                            this department, order and view stock availability
                        </p>
                    </div>
                    <button
                        onClick={() => setSelected({} as Product)}
                        className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white"
                    >
                        <Package className="h-3.5 w-3.5" />
                        New Order
                    </button>
                </div>

                {/* Low Stock Alert */}
                {lowStockProducts.length > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs dark:border-amber-800 dark:bg-amber-950/30">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-amber-700 dark:text-amber-400">
                            {lowStockProducts.length} products need reordering
                        </span>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by name, code, or barcode..."
                            className="h-9 w-full rounded-lg border border-slate-200 pr-2 pl-7 text-sm focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-700"
                        />
                    </div>

                    {categories.length > 0 && (
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-700"
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Stock Filter Dropdown */}
                    <div className="relative">
                        <select
                            value={stockFilter}
                            onChange={(e) => {
                                setStockFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-9 appearance-none rounded-lg border border-slate-200 pr-8 pl-3 text-sm focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-700"
                        >
                            <option value="all">All Stock</option>
                            <option value="out_of_stock">
                                Out of Stock ({outOfStockCount})
                            </option>
                            <option value="low_stock">
                                Low Stock ({lowStockCount})
                            </option>
                            <option value="in_stock">In Stock</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                {/* Product Table */}
                <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Product
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Code
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Category
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Stock Status
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-800/50">
                                {paginatedData.map((p) => {
                                    const status = getStockStatus(
                                        p.current_stock,
                                        p.reorder_level,
                                    );
                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={() => setSelected(p)}
                                            className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                        >
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-600">
                                                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                                                            <Package className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                            {p.product_name}
                                                        </div>
                                                        {p.generic_name && (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                {p.generic_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                {p.product_code}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                                    {p.category_name ||
                                                        'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                                                    >
                                                        {p.current_stock <=
                                                        0 ? (
                                                            <AlertCircle className="h-3.5 w-3.5" />
                                                        ) : p.current_stock <=
                                                          (p.reorder_level ||
                                                              0) ? (
                                                            <AlertCircle className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Package className="h-3.5 w-3.5" />
                                                        )}
                                                        {status.label}
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        ({p.current_stock}{' '}
                                                        {p.unit_of_measure ||
                                                            'units'}
                                                        )
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelected(p);
                                                    }}
                                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition ${
                                                        p.current_stock <= 0
                                                            ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                                                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                    }`}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Order
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paginatedData.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                                        >
                                            No products found matching your
                                            filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Frontend Pagination */}
                    {filtered.length > 0 && (
                        <div className="border-t border-slate-200 px-4 py-2.5 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Showing{' '}
                                    {(currentPage - 1) * itemsPerPage + 1} to{' '}
                                    {Math.min(
                                        currentPage * itemsPerPage,
                                        filtered.length,
                                    )}{' '}
                                    of {filtered.length} items
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() =>
                                            handlePageChange(currentPage - 1)
                                        }
                                        disabled={currentPage === 1}
                                        className="rounded border border-slate-200 px-3 py-0.5 text-xs disabled:opacity-50 dark:border-slate-700"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>

                                    {/* Page numbers */}
                                    {Array.from(
                                        { length: Math.min(totalPages, 5) },
                                        (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (
                                                currentPage >=
                                                totalPages - 2
                                            ) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() =>
                                                        handlePageChange(
                                                            pageNum,
                                                        )
                                                    }
                                                    className={`min-w-[32px] rounded px-2 py-0.5 text-xs ${
                                                        currentPage === pageNum
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        },
                                    )}

                                    <button
                                        onClick={() =>
                                            handlePageChange(currentPage + 1)
                                        }
                                        disabled={currentPage === totalPages}
                                        className="rounded border border-slate-200 px-3 py-0.5 text-xs disabled:opacity-50 dark:border-slate-700"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                    Order Products
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setSelected(null);
                                    setSearch('');
                                }}
                                className="rounded p-1 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Left - Search & Results */}
                                <div>
                                    <div className="relative">
                                        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) =>
                                                setSearch(e.target.value)
                                            }
                                            placeholder="Search by name or barcode..."
                                            className="h-9 w-full rounded-lg border border-slate-200 pr-2 pl-8 text-sm focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-700"
                                        />
                                    </div>
                                    <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                                        {productData
                                            .filter(
                                                (p) =>
                                                    p.product_name
                                                        .toLowerCase()
                                                        .includes(
                                                            search.toLowerCase(),
                                                        ) ||
                                                    p.product_code
                                                        .toLowerCase()
                                                        .includes(
                                                            search.toLowerCase(),
                                                        ),
                                            )
                                            .slice(0, 20)
                                            .map((p) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelected(p);
                                                        setSearch('');
                                                    }}
                                                    className={`cursor-pointer rounded px-2 py-1.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                                                        selected?.id === p.id
                                                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                                            {p.product_name}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {p.current_stock} in
                                                            stock
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {p.product_code}
                                                    </div>
                                                </div>
                                            ))}
                                        {productData.filter(
                                            (p) =>
                                                p.product_name
                                                    .toLowerCase()
                                                    .includes(
                                                        search.toLowerCase(),
                                                    ) ||
                                                p.product_code
                                                    .toLowerCase()
                                                    .includes(
                                                        search.toLowerCase(),
                                                    ),
                                        ).length === 0 && (
                                            <div className="py-4 text-center text-sm text-slate-400">
                                                No products found
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right - Order Form */}
                                {selected ? (
                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                                        {selected.product_name}
                                                    </h4>
                                                    <div className="text-xs text-slate-500">
                                                        {selected.product_code}
                                                    </div>
                                                    {selected.dosage_form && (
                                                        <div className="text-xs text-slate-400">
                                                            {
                                                                selected.dosage_form
                                                            }{' '}
                                                            {selected.strength}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-slate-500">
                                                        Stock
                                                    </div>
                                                    <div
                                                        className={`text-base font-bold ${
                                                            selected.current_stock <=
                                                            0
                                                                ? 'text-red-600'
                                                                : 'text-slate-800'
                                                        }`}
                                                    >
                                                        {selected.current_stock}{' '}
                                                        {selected.unit_of_measure ||
                                                            'units'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                                <span>
                                                    Reorder:{' '}
                                                    {selected.reorder_level ||
                                                        0}
                                                </span>
                                                {selected.pack_size && (
                                                    <span>
                                                        • Pack:{' '}
                                                        {selected.pack_size}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Quantity
                                                </label>
                                                <div className="mt-0.5 flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            setQuantity(
                                                                Math.max(
                                                                    1,
                                                                    quantity -
                                                                        1,
                                                                ),
                                                            )
                                                        }
                                                        className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={quantity}
                                                        onChange={(e) =>
                                                            setQuantity(
                                                                Math.max(
                                                                    1,
                                                                    parseInt(
                                                                        e.target
                                                                            .value,
                                                                    ) || 1,
                                                                ),
                                                            )
                                                        }
                                                        className="h-8 w-20 rounded border border-slate-200 px-2 text-center text-sm focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-700"
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            setQuantity(
                                                                quantity + 1,
                                                            )
                                                        }
                                                        className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Notes
                                                </label>
                                                <textarea
                                                    value={notes}
                                                    onChange={(e) =>
                                                        setNotes(e.target.value)
                                                    }
                                                    className="mt-0.5 h-16 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-700"
                                                    placeholder="Special instructions..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                        Select a product to order
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setSelected(null);
                                        setSearch('');
                                    }}
                                    className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleOrder}
                                    disabled={!selected || loading}
                                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Truck className="h-4 w-4" />
                                    )}
                                    Place Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
