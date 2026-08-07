import { Head } from '@inertiajs/react';
import { DollarSign, RefreshCw, Edit, Eye, Wallet, Users } from 'lucide-react';
import { X, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import { ReusableTable } from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface Product {
    id: number;
    product_uuid: string;
    description: string;
    product_name: string;
    barcode: string | null;
    product_code: string;
    product_description: string | null;
    category_id: number;
    category?: {
        id: number;
        name: string;
        description: string;
    };
    strength: string | null;
    unit: string | null;
    form: string | null;
    supplier_id: number | null;
    supplier?: {
        id: number;
        supplier_name: string;
        supplier_code: string;
    };
    created_by: number | null;
    created_by_department: number | null;
    created_at: string;
    updated_at: string;
    // Pricing fields
    unit_cost?: number;
    cash_price?: number;
    insurance_price?: number;
    markup_percentage?: number;
    current_stock?: number;
    reorder_level?: number;
}

interface ProductStats {
    total: number;
    with_pricing: number;
    without_pricing: number;
    total_categories: number;
    total_suppliers: number;
}

// ============================================
// CUSTOM MODAL COMPONENT
// ============================================

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    showCloseButton?: boolean;
    className?: string;
    footer?: React.ReactNode;
}

const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = 'md',
    showCloseButton = true,
    className = '',
    footer,
}) => {
    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                className={`relative ${maxWidthClasses[maxWidth]} flex max-h-[85vh] w-full animate-in flex-col rounded-lg bg-white shadow-2xl duration-200 fade-in zoom-in dark:bg-slate-800 ${className}`}
            >
                <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-slate-800 dark:text-slate-200">
                            {title}
                        </h3>
                        {description && (
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="ml-2 flex-shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    {children}
                </div>
                {footer && (
                    <div className="flex-shrink-0 border-t border-slate-200 px-4 py-2.5 dark:border-slate-700">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// PRICE CALCULATION PREVIEW COMPONENT
// ============================================

const PricePreview = ({
    unitCost,
    cashPrice,
    insurancePrice,
    markupPercentage,
}: any) => {
    if (!unitCost || unitCost <= 0) return null;

    const insuranceMarkup =
        unitCost > 0 && insurancePrice > 0
            ? Math.round(((insurancePrice - unitCost) / unitCost) * 100)
            : 0;

    return (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Price Calculation Preview
            </p>

            {cashPrice > 0 && (
                <div className="flex items-center justify-between rounded bg-green-50 p-2 dark:bg-green-900/20">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                            Cash Price
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                            {new Intl.NumberFormat('en-ZM', {
                                style: 'currency',
                                currency: 'ZMW',
                            })
                                .format(cashPrice)
                                .replace('ZMW', 'ZK')}
                        </span>
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                            (Markup: {markupPercentage || 0}%)
                        </span>
                    </div>
                </div>
            )}

            {insurancePrice > 0 && (
                <div className="flex items-center justify-between rounded bg-blue-50 p-2 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            Insurance Price
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {new Intl.NumberFormat('en-ZM', {
                                style: 'currency',
                                currency: 'ZMW',
                            })
                                .format(insurancePrice)
                                .replace('ZMW', 'ZK')}
                        </span>
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                            (Markup: {insuranceMarkup}%)
                        </span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between rounded bg-slate-100 p-2 dark:bg-slate-700">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                    Unit Cost
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {new Intl.NumberFormat('en-ZM', {
                        style: 'currency',
                        currency: 'ZMW',
                    })
                        .format(unitCost)
                        .replace('ZMW', 'ZK')}
                </span>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function StockPricing() {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [supplierFilter, setSupplierFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('all');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [isProcessing, setIsProcessing] = useState(false);

    // Form states for editing
    const [editForm, setEditForm] = useState({
        unit_cost: 0,
        cash_price: 0,
        insurance_price: 0,
        markup_percentage: 0,
        reorder_level: 0,
    });

    // Stats
    const [stats, setStats] = useState<ProductStats>({
        total: 0,
        with_pricing: 0,
        without_pricing: 0,
        total_categories: 0,
        total_suppliers: 0,
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const formatCurrency = (amount: number) => {
        if (!amount || amount === 0) return 'ZK0.00';
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
            .format(amount)
            .replace('ZMW', 'ZK');
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getCategoryName = (categoryId: number | null) => {
        const categories: Record<number, string> = {
            1: 'Pharmaceuticals',
            2: 'Medical Supplies',
            3: 'Laboratory',
            4: 'IV Fluids',
            5: 'Surgical',
            6: 'Diagnostic',
        };
        return categoryId
            ? categories[categoryId] || `Category ${categoryId}`
            : 'Uncategorized';
    };

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
            };

            if (searchTerm) params.search = searchTerm;
            if (categoryFilter) params.category = categoryFilter;
            if (supplierFilter) params.supplier = supplierFilter;

            const response = await Http.get('/bulk-store/products/all');
            const productsData = response.data.products || [];

            setProducts(productsData);

            // Calculate stats
            const withPricing = productsData.filter(
                (p: Product) => p.unit_cost && p.unit_cost > 0,
            ).length;

            const categories = new Set(
                productsData.map((p: Product) => p.category_id),
            ).size;
            const suppliers = new Set(
                productsData.map((p: Product) => p.supplier_id),
            ).size;

            setStats({
                total: productsData.length || 0,
                with_pricing: withPricing,
                without_pricing: (productsData.length || 0) - withPricing,
                total_categories: categories,
                total_suppliers: suppliers,
            });

            setPagination((prev) => ({
                ...prev,
                totalItems: productsData.length || 0,
                totalPages: Math.ceil(
                    (productsData.length || 0) / prev.pageSize,
                ),
                currentPage: 1,
            }));
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [
        pagination.currentPage,
        pagination.pageSize,
        searchTerm,
        categoryFilter,
        supplierFilter,
    ]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleView = (product: Product) => {
        setSelectedProduct(product);
        setShowViewModal(true);
    };

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setEditForm({
            unit_cost: product.unit_cost || 0,
            cash_price: product.cash_price || 0,
            insurance_price: product.insurance_price || 0,
            markup_percentage: product.markup_percentage || 0,
            reorder_level: product.reorder_level || 0,
        });
        setShowEditModal(true);
    };

    const handleRefresh = () => {
        fetchProducts();
        toast.success('Data refreshed');
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleSavePricing = async () => {
        if (!selectedProduct) return;
        setIsProcessing(true);

        try {
            const response = await Http.put(
                `/bulk-store/products/${selectedProduct.id}/pricing`,
                {
                    unit_cost: editForm.unit_cost,
                    cash_price: editForm.cash_price,
                    insurance_price: editForm.insurance_price,
                    markup_percentage: editForm.markup_percentage,
                    reorder_level: editForm.reorder_level,
                },
            );

            if (response.data.success) {
                toast.success(
                    `Pricing updated for ${selectedProduct.product_name}`,
                );
                setShowEditModal(false);
                setSelectedProduct(null);
                await fetchProducts();
            } else {
                throw new Error(
                    response.data.message || 'Failed to update pricing',
                );
            }
        } catch (error: any) {
            console.error('Update failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to update pricing',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateForm = (field: string, value: number) => {
        const updatedForm = { ...editForm, [field]: value };

        // Auto-calculate markup percentage if unit_cost and cash_price are set
        if (field === 'unit_cost' || field === 'cash_price') {
            const unitCost = field === 'unit_cost' ? value : editForm.unit_cost;
            const cashPrice =
                field === 'cash_price' ? value : editForm.cash_price;
            if (unitCost > 0 && cashPrice > 0) {
                const markup = ((cashPrice - unitCost) / unitCost) * 100;
                updatedForm.markup_percentage = Math.round(markup * 100) / 100;
            }
        }

        // Auto-calculate cash_price if unit_cost and markup_percentage are set
        if (field === 'unit_cost' || field === 'markup_percentage') {
            const unitCost = field === 'unit_cost' ? value : editForm.unit_cost;
            const markup =
                field === 'markup_percentage'
                    ? value
                    : editForm.markup_percentage;
            if (unitCost > 0 && markup > 0) {
                updatedForm.cash_price = unitCost * (1 + markup / 100);
            }
        }

        setEditForm(updatedForm);
    };

    // ============================================
    // STATS CARDS
    // ============================================

    const StatCard = ({ title, value, color, icon, subtitle }: any) => (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={`rounded-full p-1.5 ${color}`}>{icon}</div>
            </div>
        </div>
    );

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<Product>[] = [
        {
            id: 'product_code',
            label: 'Code',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'product_name',
            label: 'Product Name',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {value || 'N/A'}
                    </div>
                    {row.strength && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {row.strength} {row.form ? `(${row.form})` : ''}
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'category_id',
            label: 'Category',
            minWidth: 120,
            format: (value) => (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    {getCategoryName(value)}
                </span>
            ),
        },
        {
            id: 'unit',
            label: 'Unit',
            minWidth: 80,
            format: (value) => (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    {value || 'N/A'}
                </span>
            ),
        },
        {
            id: 'unit_cost',
            label: 'Unit Cost',
            minWidth: 110,
            align: 'right',
            format: (value) => (
                <div className="text-right">
                    {value && value > 0 ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(value)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'cash_price',
            label: 'Cash Price',
            minWidth: 110,
            align: 'right',
            format: (value) => (
                <div className="text-right">
                    {value && value > 0 ? (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(value)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'insurance_price',
            label: 'Insurance Price',
            minWidth: 120,
            align: 'right',
            format: (value) => (
                <div className="text-right">
                    {value && value > 0 ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(value)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'markup_percentage',
            label: 'Markup %',
            minWidth: 90,
            align: 'right',
            format: (value) => (
                <div className="text-right">
                    {value && value > 0 ? (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {value}%
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">-</span>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'current_stock',
            label: 'Stock',
            minWidth: 80,
            align: 'center',
            format: (value, row) => (
                <div className="text-center">
                    <span
                        className={`font-semibold ${
                            (value || 0) <= (row.reorder_level || 0)
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-800 dark:text-slate-200'
                        }`}
                    >
                        {value || 0}
                    </span>
                    {row.reorder_level && row.reorder_level > 0 && (
                        <div className="text-[10px] text-slate-400">
                            Reorder: {row.reorder_level}
                        </div>
                    )}
                </div>
            ),
        },
    ];

    const actions: Action<Product>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Edit Pricing',
            icon: <Edit className="h-4 w-4" />,
            color: 'warning',
            onClick: handleEdit,
        },
    ];

    // Filter options
    const categoryOptions = [
        { value: '1', label: 'Pharmaceuticals' },
        { value: '2', label: 'Medical Supplies' },
        { value: '3', label: 'Laboratory' },
        { value: '4', label: 'IV Fluids' },
        { value: '5', label: 'Surgical' },
        { value: '6', label: 'Diagnostic' },
    ];

    const supplierOptions = [
        { value: '1', label: 'PharmaCare Ltd' },
        { value: '2', label: 'MediSupplies Inc' },
        { value: '3', label: 'HealthPlus Pharma' },
        { value: '4', label: 'GlobalMed Distributors' },
        { value: '5', label: 'ZamPharm Ltd' },
    ];

    // Tabs
    const tabs = [
        { key: 'all', label: 'All Products', count: stats.total },
        {
            key: 'with_pricing',
            label: 'With Pricing',
            count: stats.with_pricing,
        },
        {
            key: 'without_pricing',
            label: 'Without Pricing',
            count: stats.without_pricing,
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Bulk Store',
                    href: '/bulkstore',
                },
                {
                    title: 'Stock Pricing',
                    href: '/bulkstore/stock-pricing',
                },
            ]}
        >
            <Head title="Stock Pricing" />

            <div className="min-h-screen bg-blue-50 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        icon={<DollarSign className="h-6 w-6" />}
                        title="Stock Pricing"
                        subtitle="Manage stock pricing information for all products"
                        actions={[
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: handleRefresh,
                                variant: 'outline',
                                loading: loading,
                            },
                        ]}
                    />

              

                    {/* Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span
                                        className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                                            activeTab === tab.key
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="mt-6">
                        <ReusableTable
                            columns={columns}
                            data={products}
                            actions={actions}
                            loading={loading}
                            title="Products"
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="product_name"
                            defaultOrder="asc"
                            filterPlaceholder="Search by product name, code, or description..."
                            statusFilterKey="category_id"
                            statusOptions={categoryOptions}
                            additionalFilters={[
                                {
                                    key: 'supplier_id',
                                    label: 'Supplier',
                                    options: supplierOptions,
                                    value: supplierFilter,
                                    onChange: setSupplierFilter,
                                },
                            ]}
                            emptyMessage="No products found"
                            onSearchChange={(value) => {
                                setSearchTerm(value);
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: 1,
                                }));
                            }}
                            onPageChange={(page) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: page,
                                }));
                            }}
                            onPageSizeChange={(size) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    pageSize: size,
                                    currentPage: 1,
                                }));
                            }}
                            pagination={{
                                currentPage: pagination.currentPage,
                                pageSize: pagination.pageSize,
                                totalItems: pagination.totalItems,
                                totalPages: pagination.totalPages,
                            }}
                        />
                    </div>
                </Container>
            </div>

            {/* ========================================== */}
            {/* VIEW PRODUCT MODAL */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showViewModal}
                onClose={() => {
                    setShowViewModal(false);
                    setSelectedProduct(null);
                }}
                title="Product Details"
                description={selectedProduct?.product_code}
                maxWidth="2xl"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowViewModal(false);
                                setSelectedProduct(null);
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (selectedProduct) {
                                    setShowViewModal(false);
                                    handleEdit(selectedProduct);
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Edit className="mr-1.5 h-3.5 w-3.5" />
                            Edit Pricing
                        </Button>
                    </div>
                }
            >
                {selectedProduct && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {selectedProduct.product_name}
                                </h4>
                                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-mono">
                                        Code:{' '}
                                        {selectedProduct.product_code || 'N/A'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {getCategoryName(
                                            selectedProduct.category_id,
                                        )}
                                    </span>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {selectedProduct.unit || 'N/A'}
                            </Badge>
                        </div>

                        {/* Product Details */}
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    Strength
                                </Label>
                                <p className="text-sm text-slate-800 dark:text-slate-200">
                                    {selectedProduct.strength || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    Form
                                </Label>
                                <p className="text-sm text-slate-800 dark:text-slate-200">
                                    {selectedProduct.form || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    Supplier
                                </Label>
                                <p className="text-sm text-slate-800 dark:text-slate-200">
                                    {selectedProduct.supplier?.supplier_name ||
                                        'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">
                                    Description
                                </Label>
                                <p className="text-sm text-slate-800 dark:text-slate-200">
                                    {selectedProduct.description || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Pricing Details */}
                        <div>
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Pricing Information
                            </Label>
                            <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Unit Cost
                                    </Label>
                                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                        {formatCurrency(
                                            selectedProduct.unit_cost,
                                        )}
                                    </p>
                                </div>
                                <div className="border-l border-slate-200 pl-2 dark:border-slate-700">
                                    <Label className="text-[10px] text-slate-500">
                                        Cash Price
                                    </Label>
                                    <p className="text-base font-semibold text-green-600 dark:text-green-400">
                                        {formatCurrency(
                                            selectedProduct.cash_price,
                                        )}
                                    </p>
                                </div>
                                <div className="border-l border-slate-200 pl-2 dark:border-slate-700">
                                    <Label className="text-[10px] text-slate-500">
                                        Insurance Price
                                    </Label>
                                    <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(
                                            selectedProduct.insurance_price,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Stock Information */}
                        <div>
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Stock Information
                            </Label>
                            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Current Stock
                                    </Label>
                                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedProduct.current_stock || 0}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Reorder Level
                                    </Label>
                                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedProduct.reorder_level || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-2 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <span>
                                Created:{' '}
                                {formatDateTime(selectedProduct.created_at)}
                            </span>
                            <span>
                                Updated:{' '}
                                {formatDateTime(selectedProduct.updated_at)}
                            </span>
                        </div>
                    </div>
                )}
            </CustomModal>

            {/* ========================================== */}
            {/* EDIT PRICING MODAL */}
            {/* ========================================== */}
            <CustomModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedProduct(null);
                }}
                title="Edit Pricing"
                description={selectedProduct?.product_name}
                maxWidth="lg"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowEditModal(false);
                                setSelectedProduct(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSavePricing}
                            disabled={isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                                    Save Pricing
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedProduct && (
                    <div className="space-y-4">
                        {/* Product Info */}
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Product
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedProduct.product_name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Code
                                    </Label>
                                    <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                        {selectedProduct.product_code || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Category
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {getCategoryName(
                                            selectedProduct.category_id,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Unit
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedProduct.unit || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Form */}
                        <div className="space-y-3">
                            {/* Unit Cost */}
                            <div>
                                <Label
                                    htmlFor="unit_cost"
                                    className="text-xs font-medium"
                                >
                                    Unit Cost (ZK)
                                </Label>
                                <input
                                    id="unit_cost"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                    value={editForm.unit_cost}
                                    onChange={(e) =>
                                        handleUpdateForm(
                                            'unit_cost',
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                />
                            </div>

                            {/* Markup Percentage */}
                            <div>
                                <Label
                                    htmlFor="markup_percentage"
                                    className="text-xs font-medium"
                                >
                                    Markup Percentage (%)
                                </Label>
                                <input
                                    id="markup_percentage"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                    value={editForm.markup_percentage}
                                    onChange={(e) =>
                                        handleUpdateForm(
                                            'markup_percentage',
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                />
                            </div>

                            {/* Cash Price */}
                            <div>
                                <Label
                                    htmlFor="cash_price"
                                    className="text-xs font-medium"
                                >
                                    Cash Price (ZK)
                                </Label>
                                <div className="relative">
                                    <div className="absolute top-1/2 left-3 -translate-y-1/2">
                                        <Wallet className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        id="cash_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="mt-1 w-full rounded-lg border border-slate-300 py-2 pr-3 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                        value={editForm.cash_price}
                                        onChange={(e) =>
                                            handleUpdateForm(
                                                'cash_price',
                                                parseFloat(e.target.value) || 0,
                                            )
                                        }
                                    />
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                    Price for cash-paying customers
                                </p>
                            </div>

                            {/* Insurance Price */}
                            <div>
                                <Label
                                    htmlFor="insurance_price"
                                    className="text-xs font-medium"
                                >
                                    Insurance Price (ZK)
                                </Label>
                                <div className="relative">
                                    <div className="absolute top-1/2 left-3 -translate-y-1/2">
                                        <Users className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        id="insurance_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="mt-1 w-full rounded-lg border border-slate-300 py-2 pr-3 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                        value={editForm.insurance_price}
                                        onChange={(e) =>
                                            handleUpdateForm(
                                                'insurance_price',
                                                parseFloat(e.target.value) || 0,
                                            )
                                        }
                                    />
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                    Price for insurance-paying customers (e.g.,
                                    NHIMA, private insurance)
                                </p>
                            </div>

                            {/* Reorder Level */}
                            <div>
                                <Label
                                    htmlFor="reorder_level"
                                    className="text-xs font-medium"
                                >
                                    Reorder Level
                                </Label>
                                <input
                                    id="reorder_level"
                                    type="number"
                                    step="1"
                                    min="0"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                    value={editForm.reorder_level}
                                    onChange={(e) =>
                                        handleUpdateForm(
                                            'reorder_level',
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        {/* Price Preview */}
                        <PricePreview
                            unitCost={editForm.unit_cost}
                            cashPrice={editForm.cash_price}
                            insurancePrice={editForm.insurance_price}
                            markupPercentage={editForm.markup_percentage}
                        />
                    </div>
                )}
            </CustomModal>
        </AppLayout>
    );
}

// ============================================
// ADDITIONAL HELPERS
// ============================================

const formatDateTime = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
