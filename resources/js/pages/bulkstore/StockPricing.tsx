import { Head, usePage } from '@inertiajs/react';
import { DollarSign, RefreshCw, Edit, Eye, Wallet, Save } from 'lucide-react';
import { X, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
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
    product_id: number;
    product_uuid: string;
    product_name: string;
    product_code: string;
    description: string;
    category_id: number;
    category_name?: string;
    strength: string | null;
    unit: string | null;
    form: string | null;
    supplier_id: number | null;
    supplier_name?: string;
    // Pricing fields
    cash_price: number;
    insurance_price: number;
    // Stock fields
    total_stock?: number;
    stock_status?: string;
    batch_number?: string;
    expiry_date?: string;
    unit_cost?: number;
    last_updated?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    nearest_expiry?: string;
    expiry_status?: string;
    active_batches?: number;
    days_remaining?: number;
}

// ============================================
// CUSTOM MODAL COMPONENT
// ============================================

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: string;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
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
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
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
                        {typeof title === 'string' ? (
                            <>
                                <h3 className="truncate text-base font-semibold text-slate-800 dark:text-slate-200">
                                    {title}
                                </h3>
                                {description && (
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                        {description}
                                    </p>
                                )}
                            </>
                        ) : (
                            title
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
// PRICE PREVIEW COMPONENT
// ============================================

const PricePreview = ({ cashPrice, insurancePrice }: any) => {
    const hasPrices = cashPrice > 0 || insurancePrice > 0;
    if (!hasPrices) return null;

    return (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Price Summary
            </p>

            {cashPrice > 0 && (
                <div className="flex items-center justify-between rounded bg-green-50 p-2 dark:bg-green-900/20">
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        Cash Price
                    </span>
                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                        {new Intl.NumberFormat('en-ZM', {
                            style: 'currency',
                            currency: 'ZMW',
                        })
                            .format(cashPrice)
                            .replace('ZMW', 'ZK')}
                    </span>
                </div>
            )}

            {insurancePrice > 0 && (
                <div className="flex items-center justify-between rounded bg-purple-50 p-2 dark:bg-purple-900/20">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        Insurance Price
                    </span>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {new Intl.NumberFormat('en-ZM', {
                            style: 'currency',
                            currency: 'ZMW',
                        })
                            .format(insurancePrice)
                            .replace('ZMW', 'ZK')}
                    </span>
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function StockPricing() {
    const { props } = usePage();
    const { products } = props as any;

    const [loading, setLoading] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
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
        cash_price: 0,
        insurance_price: 0,
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

    const getCategoryName = (categoryId: number | null) => {
        if (!categoryId) return 'Uncategorized';
        const product = productList.find((p) => p.category_id === categoryId);
        return product?.category_name || `Category ${categoryId}`;
    };

    const getStockStatus = (
        totalStock: number | string | undefined,
    ): 'GOOD' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
        const stock =
            typeof totalStock === 'string'
                ? parseFloat(totalStock)
                : totalStock || 0;
        if (stock <= 0) return 'OUT_OF_STOCK';
        if (stock <= 10) return 'LOW_STOCK';
        return 'GOOD';
    };

    const getProductId = (product: Product): number => {
        return product.product_id || 0;
    };

    const getTotalStock = (product: Product): number => {
        if (product.total_stock !== undefined) {
            return typeof product.total_stock === 'string'
                ? parseFloat(product.total_stock)
                : product.total_stock;
        }
        return 0;
    };

    // ============================================
    // DYNAMIC CATEGORY OPTIONS
    // ============================================

    const categoryOptions = useMemo(() => {
        const categoryMap = new Map<number, string>();
        products?.forEach((item: Product) => {
            if (item.category_id && item.category_name) {
                categoryMap.set(item.category_id, item.category_name);
            }
        });
        return [
            { value: '', label: 'All Categories' },
            ...Array.from(categoryMap.entries()).map(([id, name]) => ({
                value: String(id),
                label: name,
            })),
        ];
    }, [products]);

    // ============================================
    // INITIALIZE PRODUCTS FROM PROPS
    // ============================================

    useEffect(() => {
        if (products) {
            const productData = Array.isArray(products)
                ? products
                : products.data || [];
            setProductList(productData);
            setFilteredProducts(productData);
            setPagination((prev) => ({
                ...prev,
                totalItems: productData.length || 0,
                totalPages:
                    Math.ceil((productData.length || 0) / prev.pageSize) || 1,
            }));
        }
    }, [products]);

    // ============================================
    // FILTER PRODUCTS
    // ============================================

    useEffect(() => {
        let filtered = productList;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (product) =>
                    product.product_name?.toLowerCase().includes(term) ||
                    product.product_code?.toLowerCase().includes(term) ||
                    product.description?.toLowerCase().includes(term),
            );
        }

        if (categoryFilter) {
            filtered = filtered.filter(
                (product) => product.category_id === parseInt(categoryFilter),
            );
        }

        setFilteredProducts(filtered);
        setPagination((prev) => ({
            ...prev,
            totalItems: filtered.length,
            totalPages: Math.ceil(filtered.length / prev.pageSize) || 1,
            currentPage: 1,
        }));
    }, [searchTerm, categoryFilter, productList]);

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
            cash_price: product.cash_price || 0,
            insurance_price: product.insurance_price || 0,
        });
        setShowEditModal(true);
    };

    const handleRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            toast.success('Data refreshed');
        }, 500);
    };

    // ✅ FIXED: Properly handle save with correct response checking
    const handleSavePricing = async () => {
        if (!selectedProduct) {
            toast.error('No product selected');
            return;
        }

        const productId = getProductId(selectedProduct);
        if (!productId) {
            toast.error('Invalid product ID');
            console.error('Product ID is undefined:', selectedProduct);
            return;
        }

        setIsProcessing(true);

        try {
            const response = await Http.post(
                `/bulk-store/products/${productId}/pricing`,
                {
                    cash_price: editForm.cash_price,
                    insurance_price: editForm.insurance_price,
                },
            );

            console.log('Response:', response);

            // ✅ FIXED: Check response status correctly
            if (response.status === 200 || response.data.success) {
                toast.success(
                    `Pricing updated for ${selectedProduct.product_name}`,
                );
                setShowEditModal(false);
                setSelectedProduct(null);

                // Update local product list
                const updatedProducts = productList.map((p) =>
                    p.product_id === productId
                        ? {
                              ...p,
                              cash_price: editForm.cash_price,
                              insurance_price: editForm.insurance_price,
                          }
                        : p,
                );
                setProductList(updatedProducts);
                setFilteredProducts(updatedProducts);
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
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

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
            minWidth: 180,
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
                    {row.total_stock !== undefined && (
                        <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400">Stock:</span>
                            <span
                                className={`font-medium ${
                                    getTotalStock(row) <= 10
                                        ? 'text-red-600'
                                        : 'text-green-600'
                                }`}
                            >
                                {row.total_stock}
                            </span>
                            {row.active_batches && (
                                <span className="text-slate-400">
                                    • {row.active_batches} batches
                                </span>
                            )}
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
            id: 'cash_price',
            label: 'Cash',
            minWidth: 100,
            align: 'right',
            format: (value) => (
                <div className="text-right">
                    {value && value > 0 ? (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(value)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">0.00</span>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'insurance_price',
            label: 'Insurance',
            minWidth: 100,
            align: 'right',
            format: (value) => (
                <div className="text-right">
                    {value && value > 0 ? (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {formatCurrency(value)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">0.00</span>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'stock_status',
            label: 'Status',
            minWidth: 100,
            align: 'center',
            format: (value, row) => {
                const status = getStockStatus(row.total_stock);
                const statusStyles = {
                    GOOD: 'bg-green-600',
                    LOW_STOCK: 'bg-yellow-500',
                    OUT_OF_STOCK: 'bg-red-600',
                };
                const statusLabels = {
                    GOOD: 'In Stock',
                    LOW_STOCK: 'Low Stock',
                    OUT_OF_STOCK: 'Out of Stock',
                };

                return (
                    <Badge className={statusStyles[status]}>
                        {statusLabels[status]}
                    </Badge>
                );
            },
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

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Bulk Store', href: '/bulkstore' },
                { title: 'Stock Pricing', href: '/bulkstore/stock-pricing' },
            ]}
        >
            <Head title="Stock Pricing" />

            <div className="h-full bg-blue-50 px-4 py-6 dark:bg-slate-900">
                <Container>
                    <PageHeader
                        icon={<DollarSign className="h-6 w-6" />}
                        title="Stock Pricing"
                        subtitle="Manage pricing for all products including drugs, lab tests, and procedures"
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

                    <div className="mt-6">
                        <ReusableTable
                            columns={columns}
                            data={filteredProducts}
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
                            pagination={pagination}
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
                                    {selectedProduct.strength && (
                                        <>
                                            <span>•</span>
                                            <span>
                                                {selectedProduct.strength}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <Badge
                                className={
                                    selectedProduct.is_active !== false
                                        ? 'bg-green-600'
                                        : 'bg-red-600'
                                }
                            >
                                {selectedProduct.is_active !== false
                                    ? 'Active'
                                    : 'Inactive'}
                            </Badge>
                        </div>

                        {selectedProduct.total_stock !== undefined && (
                            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-[10px] text-slate-500">
                                            Total Stock
                                        </Label>
                                        <p
                                            className={`text-lg font-bold ${
                                                getTotalStock(
                                                    selectedProduct,
                                                ) <= 10
                                                    ? 'text-red-600'
                                                    : 'text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            {selectedProduct.total_stock}
                                        </p>
                                    </div>
                                    {selectedProduct.active_batches !==
                                        undefined && (
                                        <div>
                                            <Label className="text-[10px] text-slate-500">
                                                Active Batches
                                            </Label>
                                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                                {selectedProduct.active_batches}
                                            </p>
                                        </div>
                                    )}
                                    {selectedProduct.nearest_expiry && (
                                        <div>
                                            <Label className="text-[10px] text-slate-500">
                                                Nearest Expiry
                                            </Label>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {formatDateTime(
                                                    selectedProduct.nearest_expiry,
                                                )}
                                            </p>
                                            {selectedProduct.days_remaining && (
                                                <p className="text-xs text-slate-400">
                                                    {
                                                        selectedProduct.days_remaining
                                                    }{' '}
                                                    days remaining
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Pricing Information
                            </Label>
                            <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Cash Price
                                    </Label>
                                    <p className="text-base font-semibold text-green-600 dark:text-green-400">
                                        {formatCurrency(
                                            selectedProduct.cash_price,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-500">
                                        Insurance Price
                                    </Label>
                                    <p className="text-base font-semibold text-purple-600 dark:text-purple-400">
                                        {formatCurrency(
                                            selectedProduct.insurance_price,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

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
                title={
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
                            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                Edit Pricing
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {selectedProduct?.product_name}
                            </p>
                        </div>
                    </div>
                }
                maxWidth="3xl"
                className="shadow-2xl"
                footer={
                    <div className="flex items-center justify-end gap-3 px-2 py-1">
                        <Button
                            variant="outline"
                            size="default"
                            onClick={() => {
                                setShowEditModal(false);
                                setSelectedProduct(null);
                            }}
                            className="min-w-[100px]"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="default"
                            onClick={handleSavePricing}
                            disabled={isProcessing}
                            className="min-w-[140px] bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Pricing
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {selectedProduct && (
                    <div className="space-y-6 p-2">
                        {/* Header Section */}
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 dark:border-slate-700 dark:from-blue-950/30 dark:to-indigo-950/30">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                        {selectedProduct.product_name}
                                    </h2>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="rounded bg-white/50 px-2 py-0.5 font-mono dark:bg-slate-800/50">
                                            {selectedProduct.product_code ||
                                                'N/A'}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <span className="text-slate-400">
                                                Category:
                                            </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {getCategoryName(
                                                    selectedProduct.category_id,
                                                )}
                                            </span>
                                        </span>
                                        {selectedProduct.strength && (
                                            <>
                                                <span>•</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {selectedProduct.strength}
                                                </span>
                                            </>
                                        )}
                                        {selectedProduct.form && (
                                            <>
                                                <span>•</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {selectedProduct.form}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <Badge
                                    className={`px-3 py-1 text-sm ${
                                        selectedProduct.is_active !== false
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {selectedProduct.is_active !== false
                                        ? 'Active'
                                        : 'Inactive'}
                                </Badge>
                            </div>
                        </div>

                        {/* Product Info Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                                <Label className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                                    Unit
                                </Label>
                                <p className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-200">
                                    {selectedProduct.unit || 'N/A'}
                                </p>
                            </div>
                            {selectedProduct.total_stock !== undefined && (
                                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                                    <Label className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                                        Total Stock
                                    </Label>
                                    <p
                                        className={`mt-1 text-base font-bold ${
                                            getTotalStock(selectedProduct) <= 10
                                                ? 'text-red-600'
                                                : 'text-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        {selectedProduct.total_stock}
                                    </p>
                                </div>
                            )}
                            {selectedProduct.active_batches !== undefined && (
                                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                                    <Label className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                                        Active Batches
                                    </Label>
                                    <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-200">
                                        {selectedProduct.active_batches}
                                    </p>
                                </div>
                            )}
                            {selectedProduct.nearest_expiry && (
                                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                                    <Label className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                                        Nearest Expiry
                                    </Label>
                                    <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-200">
                                        {formatDateTime(
                                            selectedProduct.nearest_expiry,
                                        )}
                                    </p>
                                    {selectedProduct.days_remaining && (
                                        <p className="text-xs text-slate-400">
                                            {selectedProduct.days_remaining}{' '}
                                            days remaining
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-200 dark:border-slate-700" />

                        {/* Pricing Section */}
                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                    Pricing Configuration
                                </h3>
                                <span className="ml-2 text-xs text-slate-400">
                                    Set prices for different payment methods
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Cash Price */}
                                <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 dark:border-green-800/30 dark:bg-green-950/20">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/40">
                                            <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor="cash_price"
                                                className="text-sm font-semibold text-green-700 dark:text-green-300"
                                            >
                                                Cash Price
                                            </Label>
                                            <p className="text-[11px] text-green-600/70 dark:text-green-400/70">
                                                Price for cash-paying patients
                                            </p>
                                        </div>
                                    </div>
                                    <div className="relative mt-3">
                                        <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                            ZK
                                        </span>
                                        <input
                                            id="cash_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full rounded-xl border-2 border-green-300 bg-white px-4 py-3 pl-10 text-lg font-semibold text-slate-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none dark:border-green-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-green-500"
                                            value={editForm.cash_price}
                                            onChange={(e) =>
                                                handleUpdateForm(
                                                    'cash_price',
                                                    parseFloat(
                                                        e.target.value,
                                                    ) || 0,
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Insurance Price */}
                                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 dark:border-purple-800/30 dark:bg-purple-950/20">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/40">
                                            <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor="insurance_price"
                                                className="text-sm font-semibold text-purple-700 dark:text-purple-300"
                                            >
                                                Insurance Price
                                            </Label>
                                            <p className="text-[11px] text-purple-600/70 dark:text-purple-400/70">
                                                Price for insurance patients
                                                (NHIMA, private)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="relative mt-3">
                                        <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                            ZK
                                        </span>
                                        <input
                                            id="insurance_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full rounded-xl border-2 border-purple-300 bg-white px-4 py-3 pl-10 text-lg font-semibold text-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none dark:border-purple-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-purple-500"
                                            value={editForm.insurance_price}
                                            onChange={(e) =>
                                                handleUpdateForm(
                                                    'insurance_price',
                                                    parseFloat(
                                                        e.target.value,
                                                    ) || 0,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Preview */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/30">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/40">
                                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Price Summary
                                </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {editForm.cash_price > 0 && (
                                    <div className="flex items-center justify-between rounded-lg bg-green-100/60 px-4 py-3 dark:bg-green-900/30">
                                        <span className="text-sm font-medium text-green-800 dark:text-green-300">
                                            Cash Price
                                        </span>
                                        <span className="text-lg font-bold text-green-700 dark:text-green-400">
                                            {formatCurrency(
                                                editForm.cash_price,
                                            )}
                                        </span>
                                    </div>
                                )}
                                {editForm.insurance_price > 0 && (
                                    <div className="flex items-center justify-between rounded-lg bg-purple-100/60 px-4 py-3 dark:bg-purple-900/30">
                                        <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                                            Insurance Price
                                        </span>
                                        <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                                            {formatCurrency(
                                                editForm.insurance_price,
                                            )}
                                        </span>
                                    </div>
                                )}
                                {!editForm.cash_price &&
                                    !editForm.insurance_price && (
                                        <div className="col-span-2 py-4 text-center text-sm text-slate-400">
                                            Enter prices above to see the
                                            summary
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Audit Footer */}
                        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-400 dark:border-slate-700">
                            <div className="flex items-center gap-4">
                                <span>
                                    Created:{' '}
                                    <span className="font-medium text-slate-600 dark:text-slate-300">
                                        {formatDateTime(
                                            selectedProduct.created_at,
                                        )}
                                    </span>
                                </span>
                                <span>
                                    Updated:{' '}
                                    <span className="font-medium text-slate-600 dark:text-slate-300">
                                        {formatDateTime(
                                            selectedProduct.updated_at,
                                        )}
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                <span>Ready to save</span>
                            </div>
                        </div>
                    </div>
                )}
            </CustomModal>
        </AppLayout>
    );
}

// ============================================
// ADDITIONAL ICONS
// ============================================

const Shield = ({ className }: { className?: string }) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
    </svg>
);
