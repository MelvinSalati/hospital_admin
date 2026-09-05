import { router, usePage } from '@inertiajs/react';
import {
    Building2,
    Package,
    ArrowRight,
    X,
    FileText,
    Calendar,
    ClipboardList,
    User,
    Search,
    Filter,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronRight,
    Plus,
    Minus,
    Truck,
    ListChecks,
    Boxes,
    MapPin,
    Send,
    Eye,
    MoreVertical,
    Check,
    AlertTriangle,
    ChevronLeft,
    ChevronsLeft,
    ChevronRight as ChevronRightIcon,
    ChevronsRight,
    Outdent,
    Edit,
    Trash2,
    PlusCircle,
    FolderPlus,
    Tag,
    Hash,
    DollarSign,
    Shield,
    Layers,
    PackageOpen,
    Warehouse,
    Box,
    Ruler,
    Scale,
    CircleDot,
    List,
    Grid,
    Info,
    QrCode,
    Barcode as BarcodeIcon,
    Activity,
    TrendingUp,
    TrendingDown,
    PackageCheck,
    PackageX,
    History,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import AddDrugModal from './AddDrugModal';

// ============================================================================
// Types
// ============================================================================

interface Product {
    id: number;
    product_uuid?: string;
    name: string;
    generic_name?: string;
    legacy_code?: string;
    code: string;
    sku: string;
    barcode?: string;
    product_code?: string;
    unit_of_measure: string;
    category_id: number | null;
    category_name?: string;
    reorder_level: number;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    brand_name?: string;
    therapeutic_class?: string;
    schedule_class?: string;
    strength?: string;
    dosage_form?: string;
    route_of_administration?: string;
    pack_size?: number;
    is_arv?: boolean;
    is_tb_drug?: boolean;
    is_emergency?: boolean;
    is_controlled?: boolean;
    track_batches?: boolean;
    track_expiry?: boolean;
    allow_negative_stock?: boolean;
    current_stock?: number;
    expiry_date?: string;
    location?: string;
    category?: {
        id: number;
        name: string;
        code: string;
    };
    total_stock?: number;
    total_batches?: number;
    nearest_expiry?: string;
    days_remaining?: number | null;
    expiry_status?: string;
    stock_status?: string;
}

interface Category {
    id: number;
    name: string;
    code: string;
    description?: string;
    parent_id?: number | null;
    icon?: string;
    color?: string;
    product_count?: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface StockMovement {
    id: number;
    date: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    balance: number;
    reference: string;
    notes: string;
    batch_number?: string;
    expiry_date?: string;
    unit_of_measure: string;
}

interface ProductDetail extends Product {
    stock_movements: StockMovement[];
    total_stock_in: number;
    total_stock_out: number;
    current_balance: number;
    batches: Array<{
        batch_number: string;
        expiry_date: string;
        quantity: number;
        location: string;
        days_remaining?: number;
        expiry_status?: string;
    }>;
}

interface FilterOption {
    value: string;
    label: string;
}

// ============================================================================
// Constants
// ============================================================================

const breadcrumbs = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Products',
        href: '/bulkstore/products',
    },
];

// ============================================================================
// Helper Functions
// ============================================================================

const getProductDisplayCode = (product: Product): string => {
    return product.product_code || product.barcode || product.code || 'N/A';
};

const getStockStatusColor = (stock: number, reorderLevel: number) => {
    if (stock <= 0) {
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    if (stock <= reorderLevel) {
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
};

const getStockStatusLabel = (stock: number, reorderLevel: number) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
};

const getStockStatusIcon = (stock: number, reorderLevel: number) => {
    if (stock <= 0) return <AlertCircle className="h-3 w-3" />;
    if (stock <= reorderLevel) return <AlertTriangle className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
};

const getExpiryStatusColor = (status?: string) => {
    switch (status) {
        case 'EXPIRED':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'CRITICAL':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
        case 'WARNING':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'UPCOMING':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        case 'NO_STOCK':
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        default:
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
};

const getExpiryStatusLabel = (status?: string) => {
    switch (status) {
        case 'EXPIRED':
            return 'Expired';
        case 'CRITICAL':
            return 'Critical (< 30 days)';
        case 'WARNING':
            return 'Warning (30-90 days)';
        case 'UPCOMING':
            return 'Upcoming (90-180 days)';
        case 'NORMAL':
            return 'Normal (> 180 days)';
        case 'NO_STOCK':
            return 'No Stock';
        default:
            return 'Unknown';
    }
};

const getExpiryStatusIcon = (status?: string) => {
    switch (status) {
        case 'EXPIRED':
            return <AlertCircle className="h-3 w-3" />;
        case 'CRITICAL':
            return <AlertTriangle className="h-3 w-3" />;
        case 'WARNING':
            return <Clock className="h-3 w-3" />;
        case 'UPCOMING':
            return <Calendar className="h-3 w-3" />;
        case 'NORMAL':
            return <CheckCircle className="h-3 w-3" />;
        case 'NO_STOCK':
            return <PackageX className="h-3 w-3" />;
        default:
            return <Package className="h-3 w-3" />;
    }
};

const getStockStatusBadge = (status?: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
        in_stock: {
            color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            label: 'In Stock',
        },
        low_stock: {
            color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            label: 'Low Stock',
        },
        out_of_stock: {
            color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            label: 'Out of Stock',
        },
        warning: {
            color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
            label: 'Warning',
        },
        normal: {
            color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            label: 'Normal',
        },
    };

    const defaultStatus = {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        label: 'Unknown',
    };
    return statusMap[status || ''] || defaultStatus;
};

const getMovementTypeIcon = (type: string) => {
    switch (type) {
        case 'in':
            return <TrendingUp className="h-4 w-4 text-green-500" />;
        case 'out':
            return <TrendingDown className="h-4 w-4 text-red-500" />;
        case 'adjustment':
            return <Activity className="h-4 w-4 text-orange-500" />;
        default:
            return <Package className="h-4 w-4 text-gray-500" />;
    }
};

const getMovementTypeColor = (type: string) => {
    switch (type) {
        case 'in':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        case 'out':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'adjustment':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
};

const mapProductData = (product: any): Product => {
    const codeValue =
        product.product_code || product.barcode || product.code || '';
    const stock = product.total_stock ?? 0;

    return {
        id: product.id,
        product_uuid: product.product_uuid || null,
        name: product.product_name || product.name || '',
        code: codeValue,
        sku: codeValue,
        barcode: product.product_code || product.barcode || null,
        product_code: product.product_code || null,
        unit_of_measure: product.unit || product.unit_of_measure || 'Unit',
        category_id: product.category_id || null,
        category_name: product.category?.name || product.category_name || null,
        category: product.category || null,
        reorder_level: product.reorder_level || 0,
        description: product.description || '',
        is_active: product.is_active !== undefined ? product.is_active : true,
        created_at: product.created_at,
        updated_at: product.updated_at,
        generic_name: product.generic_name || null,
        brand_name: product.brand_name || null,
        strength: product.strength || null,
        dosage_form: product.dosage_form || product.form || null,
        current_stock: stock,
        expiry_date: product.nearest_expiry || null,
        location: product.location || null,
        total_stock: stock,
        total_batches: product.total_batches ?? 0,
        nearest_expiry: product.nearest_expiry || null,
        days_remaining: product.days_remaining ?? null,
        expiry_status: product.expiry_status || null,
        stock_status: product.stock_status || null,
    };
};

// ============================================================================
// Main Component
// ============================================================================

export default function Products() {
    const { props } = usePage();

    // Get products and filters from props
    const productsProp = props.products;
    const filters = props.filters || {};

    // Map the products data
    let mappedProducts: Product[] = [];
    if (Array.isArray(productsProp)) {
        mappedProducts = productsProp.map(mapProductData);
    } else if (
        productsProp &&
        typeof productsProp === 'object' &&
        'data' in productsProp
    ) {
        mappedProducts = (productsProp.data || []).map(mapProductData);
    }

    // State
    const [products, setProducts] = useState<Product[]>(mappedProducts);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [categoryFilter, setCategoryFilter] = useState<string>(
        filters.category || 'all',
    );
    const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>(
        filters.expiry_status || 'all',
    );
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 15,
        totalItems: mappedProducts.length || 0,
        totalPages: 1,
    });

    // Modal states
    const [isAddDrugModalOpen, setIsAddDrugModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] =
        useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] =
        useState(false);
    const [isProductDetailModalOpen, setIsProductDetailModalOpen] =
        useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(
        null,
    );
    const [productDetail, setProductDetail] = useState<ProductDetail | null>(
        null,
    );
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Category form state
    const [categoryForm, setCategoryForm] = useState<Partial<Category>>({
        name: '',
        code: '',
        description: '',
        is_active: true,
    });

    // Fetch categories and update products
    useEffect(() => {
        if (props.categories) {
            setCategories(props.categories);
        }
        if (props.products) {
            let newMappedProducts: Product[] = [];
            if (Array.isArray(props.products)) {
                newMappedProducts = props.products.map(mapProductData);
            } else if (
                props.products &&
                typeof props.products === 'object' &&
                'data' in props.products
            ) {
                newMappedProducts = (props.products.data || []).map(
                    mapProductData,
                );
            }
            setProducts(newMappedProducts);
            setPagination((prev) => ({
                ...prev,
                totalItems: newMappedProducts.length,
                totalPages: Math.ceil(newMappedProducts.length / prev.pageSize),
            }));
        }
    }, [props.categories, props.products]);

    // Debug: Log product data
    useEffect(() => {
        if (products.length > 0) {
            console.log('Products loaded:', products.length);
            console.log('Expiry status values:', [
                ...new Set(products.map((p) => p.expiry_status)),
            ]);
        }
    }, [products]);

    // ========================================================================
    // Product Detail View
    // ========================================================================

    const handleViewProduct = async (product: Product) => {
        setSelectedProduct(product);
        setIsProductDetailModalOpen(true);
        setLoadingDetail(true);

        try {
            const uuid = product.product_uuid || product.id;
            const response = await Http.get(
                `/bulk-store/products/${uuid}/details`,
            );
            if (response.data) {
                setProductDetail(response.data);
            } else {
                setProductDetail({
                    ...product,
                    stock_movements: [],
                    total_stock_in: 0,
                    total_stock_out: 0,
                    current_balance: product.current_stock || 0,
                    batches: [],
                });
                toast.error('Could not load full product details');
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            setProductDetail({
                ...product,
                stock_movements: [],
                total_stock_in: 0,
                total_stock_out: 0,
                current_balance: product.current_stock || 0,
                batches: [],
            });
        } finally {
            setLoadingDetail(false);
        }
    };

    // ========================================================================
    // Product CRUD Operations
    // ========================================================================

    const handleAddDrug = async (drugData: any) => {
        setIsProcessing(true);

        try {
            const productData = {
                product_name: drugData.drug_name,
                generic_name: drugData.generic_name,
                product_code: drugData.drug_code,
                barcode: drugData.barcode || drugData.drug_code,
                category_id: drugData.category_id,
                unit: drugData.unit_of_measure,
                reorder_level: drugData.reorder_level,
                description: `Brand: ${drugData.brand_name || 'N/A'}\nStrength: ${drugData.strength || 'N/A'}\nDosage Form: ${drugData.dosage_form || 'N/A'}\nRoute: ${drugData.route_of_administration || 'N/A'}\nTherapeutic Class: ${drugData.therapeutic_class || 'N/A'}\nSchedule: ${drugData.schedule_class || 'N/A'}`,
                is_active: true,
                brand_name: drugData.brand_name,
                therapeutic_class: drugData.therapeutic_class,
                schedule_class: drugData.schedule_class,
                strength: drugData.strength,
                dosage_form: drugData.dosage_form,
                route_of_administration: drugData.route_of_administration,
                pack_size: drugData.pack_size,
                is_arv: drugData.is_arv,
                is_tb_drug: drugData.is_tb_drug,
                is_emergency: drugData.is_emergency,
                is_controlled: drugData.is_controlled,
                track_batches: drugData.track_batches,
                track_expiry: drugData.track_expiry,
                allow_negative_stock: drugData.allow_negative_stock,
            };

            router.post('/bulkstore/products', productData, {
                onSuccess: () => {
                    toast.success('Product added successfully');
                    setIsAddDrugModalOpen(false);
                    router.reload({ only: ['products'] });
                },
                onError: (errors) => {
                    toast.error(errors.message || 'Failed to add product');
                },
                onFinish: () => {
                    setIsProcessing(false);
                },
            });
        } catch (error) {
            console.error('Error adding product:', error);
            toast.error('Failed to add product');
            setIsProcessing(false);
        }
    };

    const handleDeleteProduct = () => {
        if (!selectedProduct) return;
        setIsProcessing(true);

        router.delete(`/bulkstore/products/${selectedProduct.id}`, {
            onSuccess: () => {
                toast.success('Product deleted successfully');
                setIsDeleteModalOpen(false);
                setSelectedProduct(null);
                router.reload({ only: ['products'] });
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to delete product');
            },
            onFinish: () => {
                setIsProcessing(false);
            },
        });
    };

    // ========================================================================
    // Category CRUD Operations
    // ========================================================================

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        router.post('/bulkstore/categories', categoryForm, {
            onSuccess: () => {
                toast.success('Category added successfully');
                setIsAddCategoryModalOpen(false);
                resetCategoryForm();
                router.reload({ only: ['categories', 'products'] });
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to add category');
            },
            onFinish: () => {
                setIsProcessing(false);
            },
        });
    };

    const handleEditCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;
        setIsProcessing(true);

        router.put(
            `/bulkstore/categories/${selectedCategory.id}`,
            categoryForm,
            {
                onSuccess: () => {
                    toast.success('Category updated successfully');
                    setIsEditCategoryModalOpen(false);
                    resetCategoryForm();
                    setSelectedCategory(null);
                    router.reload({ only: ['categories', 'products'] });
                },
                onError: (errors) => {
                    toast.error(errors.message || 'Failed to update category');
                },
                onFinish: () => {
                    setIsProcessing(false);
                },
            },
        );
    };

    const handleDeleteCategory = () => {
        if (!selectedCategory) return;
        setIsProcessing(true);

        router.delete(`/bulkstore/categories/${selectedCategory.id}`, {
            onSuccess: () => {
                toast.success('Category deleted successfully');
                setIsCategoryDeleteModalOpen(false);
                setSelectedCategory(null);
                router.reload({ only: ['categories', 'products'] });
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to delete category');
            },
            onFinish: () => {
                setIsProcessing(false);
            },
        });
    };

    // ========================================================================
    // Form Helpers
    // ========================================================================

    const resetCategoryForm = () => {
        setCategoryForm({
            name: '',
            code: '',
            description: '',
            is_active: true,
        });
    };

    const openDeleteProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsDeleteModalOpen(true);
    };

    const openDeleteCategory = (category: Category) => {
        setSelectedCategory(category);
        setIsCategoryDeleteModalOpen(true);
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        router.get(
            '/bulkstore/products',
            {
                search: value,
                category: categoryFilter,
                expiry_status: expiryStatusFilter,
            },
            {
                preserveState: true,
                replace: true,
                only: ['products'],
            },
        );
    };

    const handleCategoryFilter = (value: string) => {
        setCategoryFilter(value);
        router.get(
            '/bulkstore/products',
            {
                search: searchTerm,
                category: value,
                expiry_status: expiryStatusFilter,
            },
            {
                preserveState: true,
                replace: true,
                only: ['products'],
            },
        );
    };

    const handleExpiryStatusFilter = (value: string) => {
        setExpiryStatusFilter(value);
        router.get(
            '/bulkstore/products',
            {
                search: searchTerm,
                category: categoryFilter,
                expiry_status: value,
            },
            {
                preserveState: true,
                replace: true,
                only: ['products'],
            },
        );
    };

    // ========================================================================
    // Table Columns
    // ========================================================================

    const columns: Column<Product>[] = [
        {
            id: 'name',
            label: 'Product',
            minWidth: 200,
            format: (value, row) => {
                const displayCode = getProductDisplayCode(row);
                return (
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                {row.name}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {displayCode !== 'N/A'
                                    ? `Code: ${displayCode}`
                                    : 'No code'}
                            </p>
                            {row.strength && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {row.strength}
                                </p>
                            )}
                        </div>
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'category_name',
            label: 'Category',
            minWidth: 120,
            format: (value, row) => (
                <Badge variant="outline" className="text-xs">
                    {row.category_name || row.category?.name || 'Uncategorized'}
                </Badge>
            ),
            sortable: true,
        },
        {
            id: 'current_stock',
            label: 'Stock',
            minWidth: 120,
            align: 'center',
            format: (value, row) => {
                // ✅ FIX: Use total_stock from the row, not current_stock
                const stock = row.total_stock ?? row.current_stock ?? 0;
                return (
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {stock} {row.unit_of_measure}
                        </span>
                        <Badge
                            className={`flex w-fit items-center gap-1 text-[10px] ${getStockStatusColor(stock, row.reorder_level)}`}
                        >
                            {getStockStatusIcon(stock, row.reorder_level)}
                            {getStockStatusLabel(stock, row.reorder_level)}
                        </Badge>
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'expiry_status',
            label: 'Expiry Status',
            minWidth: 160,
            format: (value, row) => {
                const stock = row.total_stock || row.current_stock || 0;
                const status =
                    row.expiry_status || (stock <= 0 ? 'NO_STOCK' : 'NORMAL');
                const days = row.days_remaining;

                // If no stock, show NO_STOCK
                if (stock <= 0 || status === 'NO_STOCK') {
                    return (
                        <div className="flex flex-col items-center gap-0.5">
                            <Badge className="flex items-center gap-1 bg-gray-100 text-[10px] text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                <PackageX className="h-3 w-3" />
                                No Stock
                            </Badge>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col items-center gap-0.5">
                        <Badge
                            className={`flex items-center gap-1 text-[10px] ${getExpiryStatusColor(status)}`}
                        >
                            {getExpiryStatusIcon(status)}
                            {getExpiryStatusLabel(status)}
                        </Badge>
                        {days !== null && days !== undefined && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {days < 0
                                    ? `${Math.abs(days)} days overdue`
                                    : `${days} days left`}
                            </span>
                        )}
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'reorder_level',
            label: 'Reorder Level',
            minWidth: 100,
            align: 'center',
            format: (value, row) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    {value} {row.unit_of_measure}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'product_code',
            label: 'Product Code',
            minWidth: 120,
            format: (value, row) => {
                const displayCode = getProductDisplayCode(row);
                return (
                    <div className="flex items-center gap-1.5">
                        <BarcodeIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {displayCode}
                        </span>
                    </div>
                );
            },
            sortable: true,
        },
    ];

    const actions: Action<Product>[] = [
        {
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleViewProduct,
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'danger',
            onClick: openDeleteProduct,
        },
    ];

    // ========================================================================
    // Filter Options
    // ========================================================================

    const categoryOptions: FilterOption[] = [
        { value: 'all', label: 'All Categories' },
        ...categories.map((cat) => ({
            value: cat.id.toString(),
            label: cat.name,
        })),
    ];

    const expiryStatusOptions: FilterOption[] = [
        { value: 'all', label: 'All Expiry Status' },
        { value: 'EXPIRED', label: '⚠️ Expired' },
        { value: 'CRITICAL', label: '🔴 Critical (< 30 days)' },
        { value: 'WARNING', label: '🟡 Warning (30-90 days)' },
        { value: 'UPCOMING', label: '🔵 Upcoming (90-180 days)' },
        { value: 'NORMAL', label: '🟢 Normal (> 180 days)' },
        { value: 'NO_STOCK', label: '⚪ No Stock' },
    ];

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full bg-blue-50 p-4 dark:bg-slate-900">
                <PageHeader
                    icon={<Boxes className="h-6 w-6" />}
                    title="Product Management"
                    subtitle="Manage products, inventory, and categories in the bulk store"
                    actions={[
                        {
                            label: 'Add Category',
                            icon: <FolderPlus className="h-4 w-4" />,
                            onClick: () => {
                                resetCategoryForm();
                                setIsAddCategoryModalOpen(true);
                            },
                        },
                        {
                            label: 'Add Product',
                            icon: <PlusCircle className="h-4 w-4" />,
                            onClick: () => {
                                setIsAddDrugModalOpen(true);
                            },
                        },
                    ]}
                />

                {/* Table */}
                <div className="mt-4">
                    <ReusableTable
                        columns={columns}
                        data={products}
                        actions={actions}
                        loading={loading}
                        title="Products"
                        rowsPerPageOptions={[10, 15, 25, 50, 100]}
                        defaultRowsPerPage={15}
                        defaultOrderBy="name"
                        defaultOrder="asc"
                        filterPlaceholder="Search by product name or code..."
                        statusFilterKey="expiry_status"
                        statusOptions={expiryStatusOptions}
                        emptyMessage="No products found"
                        onSearchChange={handleSearch}
                        onStatusChange={handleExpiryStatusFilter}
                        onPageChange={(page) => {
                            router.get(
                                '/bulkstore/products',
                                {
                                    page,
                                    search: searchTerm,
                                    category: categoryFilter,
                                    expiry_status: expiryStatusFilter,
                                },
                                {
                                    preserveState: true,
                                    replace: true,
                                    only: ['products'],
                                },
                            );
                        }}
                        onPageSizeChange={(size) => {
                            router.get(
                                '/bulkstore/products',
                                {
                                    per_page: size,
                                    search: searchTerm,
                                    category: categoryFilter,
                                    expiry_status: expiryStatusFilter,
                                },
                                {
                                    preserveState: true,
                                    replace: true,
                                    only: ['products'],
                                },
                            );
                        }}
                        pagination={pagination}
                        actionButton={{
                            label: 'Add Product',
                            icon: <PlusCircle className="h-4 w-4" />,
                            onClick: () => {
                                setIsAddDrugModalOpen(true);
                            },
                        }}
                    />
                </div>

                {/* Add Drug Modal */}
                <AddDrugModal
                    isOpen={isAddDrugModalOpen}
                    onClose={() => setIsAddDrugModalOpen(false)}
                    onAddDrug={handleAddDrug}
                />

                {/* Product Detail Modal */}
                {isProductDetailModalOpen && selectedProduct && (
                    <ProductDetailModal
                        isOpen={isProductDetailModalOpen}
                        product={selectedProduct}
                        productDetail={productDetail}
                        loading={loadingDetail}
                        onClose={() => {
                            setIsProductDetailModalOpen(false);
                            setSelectedProduct(null);
                            setProductDetail(null);
                        }}
                    />
                )}

                {/* Category Modals */}
                {isAddCategoryModalOpen && (
                    <CategoryFormModal
                        isOpen={isAddCategoryModalOpen}
                        title="Add New Category"
                        formData={categoryForm}
                        setFormData={setCategoryForm}
                        onClose={() => {
                            setIsAddCategoryModalOpen(false);
                            resetCategoryForm();
                        }}
                        onSubmit={handleAddCategory}
                        isProcessing={isProcessing}
                        submitLabel="Add Category"
                    />
                )}

                {isEditCategoryModalOpen && selectedCategory && (
                    <CategoryFormModal
                        isOpen={isEditCategoryModalOpen}
                        title="Edit Category"
                        formData={categoryForm}
                        setFormData={setCategoryForm}
                        onClose={() => {
                            setIsEditCategoryModalOpen(false);
                            resetCategoryForm();
                            setSelectedCategory(null);
                        }}
                        onSubmit={handleEditCategory}
                        isProcessing={isProcessing}
                        submitLabel="Update Category"
                        isEdit
                    />
                )}

                {/* Delete Confirmations */}
                {isDeleteModalOpen && selectedProduct && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        title="Delete Product"
                        itemName={selectedProduct.name}
                        itemCode={getProductDisplayCode(selectedProduct)}
                        details={[
                            {
                                label: 'Category',
                                value:
                                    selectedProduct.category_name ||
                                    selectedProduct.category?.name ||
                                    'Uncategorized',
                            },
                            {
                                label: 'Unit',
                                value: selectedProduct.unit_of_measure,
                            },
                            {
                                label: 'Code',
                                value: getProductDisplayCode(selectedProduct),
                            },
                            {
                                label: 'Expiry Status',
                                value: getExpiryStatusLabel(
                                    selectedProduct.expiry_status,
                                ),
                            },
                            {
                                label: 'Stock',
                                value: `${selectedProduct.total_stock || 0} ${selectedProduct.unit_of_measure}`,
                            },
                        ]}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setSelectedProduct(null);
                        }}
                        onConfirm={handleDeleteProduct}
                        isProcessing={isProcessing}
                        type="product"
                    />
                )}

                {isCategoryDeleteModalOpen && selectedCategory && (
                    <DeleteConfirmationModal
                        isOpen={isCategoryDeleteModalOpen}
                        title="Delete Category"
                        itemName={selectedCategory.name}
                        itemCode={selectedCategory.code}
                        details={[
                            {
                                label: 'Description',
                                value: selectedCategory.description || 'N/A',
                            },
                            {
                                label: 'Product Count',
                                value:
                                    selectedCategory.product_count?.toString() ||
                                    '0',
                            },
                        ]}
                        onClose={() => {
                            setIsCategoryDeleteModalOpen(false);
                            setSelectedCategory(null);
                        }}
                        onConfirm={handleDeleteCategory}
                        isProcessing={isProcessing}
                        type="category"
                    />
                )}
            </div>
        </AppLayout>
    );
}

// ============================================================================
// Product Detail Modal
// ============================================================================

interface ProductDetailModalProps {
    isOpen: boolean;
    product: Product;
    productDetail: ProductDetail | null;
    loading: boolean;
    onClose: () => void;
}

function ProductDetailModal({
    isOpen,
    product,
    productDetail,
    loading,
    onClose,
}: ProductDetailModalProps) {
    if (!isOpen) return null;

    const detail = productDetail || {
        ...product,
        stock_movements: [],
        total_stock_in: 0,
        total_stock_out: 0,
        current_balance: product.current_stock || 0,
        batches: [],
    };

    const getProductDisplayCode = (p: Product): string => {
        return p.product_code || p.barcode || p.code || 'N/A';
    };

    const getExpiryStatusColor = (status?: string) => {
        switch (status) {
            case 'EXPIRED':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'CRITICAL':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'WARNING':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'UPCOMING':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default:
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        }
    };

    const getExpiryStatusLabel = (status?: string) => {
        switch (status) {
            case 'EXPIRED':
                return 'Expired';
            case 'CRITICAL':
                return 'Critical';
            case 'WARNING':
                return 'Warning';
            case 'UPCOMING':
                return 'Upcoming';
            case 'NORMAL':
                return 'Normal';
            case 'NO_STOCK':
                return 'No Stock';
            default:
                return 'Unknown';
        }
    };

    const getStockStatusBadge = (status?: string) => {
        const statusMap: Record<string, { color: string; label: string }> = {
            in_stock: {
                color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                label: 'In Stock',
            },
            low_stock: {
                color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                label: 'Low Stock',
            },
            out_of_stock: {
                color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                label: 'Out of Stock',
            },
            warning: {
                color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                label: 'Warning',
            },
            normal: {
                color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                label: 'Normal',
            },
        };
        return (
            statusMap[status || ''] || {
                color: 'bg-gray-100',
                label: 'Unknown',
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {product.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {getProductDisplayCode(product)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {product.expiry_status && (
                            <Badge
                                className={getExpiryStatusColor(
                                    product.expiry_status,
                                )}
                            >
                                {getExpiryStatusLabel(product.expiry_status)}
                            </Badge>
                        )}
                        {product.stock_status && (
                            <Badge
                                className={
                                    getStockStatusBadge(product.stock_status)
                                        .color
                                }
                            >
                                {
                                    getStockStatusBadge(product.stock_status)
                                        .label
                                }
                            </Badge>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-96 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-slate-500">
                            Loading product details...
                        </span>
                    </div>
                ) : (
                    <div className="p-5">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {/* Left Column - QR Code & Basic Info */}
                            <div className="md:col-span-1">
                                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
                                    <div className="flex flex-col items-center">
                                        <div className="relative">
                                            <div className="h-48 w-48 rounded-lg bg-white p-4 dark:bg-slate-900">
                                                <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                                                    <QrCode className="h-24 w-24 text-slate-400" />
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {getProductDisplayCode(product)}
                                            </div>
                                        </div>

                                        <div className="mt-4 w-full space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    Name:
                                                </span>
                                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                                    {product.name}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    Category:
                                                </span>
                                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                                    {product.category_name ||
                                                        product.category
                                                            ?.name ||
                                                        'Uncategorized'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    Unit:
                                                </span>
                                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                                    {product.unit_of_measure}
                                                </span>
                                            </div>
                                            {product.strength && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">
                                                        Strength:
                                                    </span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-100">
                                                        {product.strength}
                                                    </span>
                                                </div>
                                            )}
                                            {product.dosage_form && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">
                                                        Dosage Form:
                                                    </span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-100">
                                                        {product.dosage_form}
                                                    </span>
                                                </div>
                                            )}
                                            {product.nearest_expiry && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">
                                                        Nearest Expiry:
                                                    </span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-100">
                                                        {new Date(
                                                            product.nearest_expiry,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                            {product.days_remaining !== null &&
                                                product.days_remaining !==
                                                    undefined && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-500 dark:text-slate-400">
                                                            Days Remaining:
                                                        </span>
                                                        <span
                                                            className={`font-medium ${product.days_remaining < 0 ? 'text-red-600' : ''}`}
                                                        >
                                                            {product.days_remaining <
                                                            0
                                                                ? `${Math.abs(product.days_remaining)} days overdue`
                                                                : `${product.days_remaining} days`}
                                                        </span>
                                                    </div>
                                                )}
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    Total Stock:
                                                </span>
                                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                                    {product.total_stock || 0}{' '}
                                                    {product.unit_of_measure}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    Stock Status:
                                                </span>
                                                <Badge
                                                    className={`text-[10px] ${getStockStatusBadge(product.stock_status).color}`}
                                                >
                                                    {
                                                        getStockStatusBadge(
                                                            product.stock_status,
                                                        ).label
                                                    }
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Stock & Movements */}
                            <div className="space-y-4 md:col-span-2">
                                {/* Stock Summary Cards */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                                        <p className="text-[10px] text-green-600 dark:text-green-400">
                                            Current Stock
                                        </p>
                                        <p className="text-xl font-bold text-green-700 dark:text-green-300">
                                            {detail.current_balance}{' '}
                                            {product.unit_of_measure}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                                            Total Received
                                        </p>
                                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                            {detail.total_stock_in}{' '}
                                            {product.unit_of_measure}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/30">
                                        <p className="text-[10px] text-orange-600 dark:text-orange-400">
                                            Total Issued
                                        </p>
                                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                                            {detail.total_stock_out}{' '}
                                            {product.unit_of_measure}
                                        </p>
                                    </div>
                                </div>

                                {/* Batch Information */}
                                {detail.batches &&
                                    detail.batches.length > 0 && (
                                        <div>
                                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                <PackageCheck className="h-3.5 w-3.5" />
                                                Batches ({detail.batches.length}
                                                )
                                            </h4>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                        <tr>
                                                            <th className="px-3 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Batch
                                                            </th>
                                                            <th className="px-3 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Expiry
                                                            </th>
                                                            <th className="px-3 py-1.5 text-right text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Quantity
                                                            </th>
                                                            <th className="px-3 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Status
                                                            </th>
                                                            <th className="px-3 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Location
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {detail.batches.map(
                                                            (batch, index) => (
                                                                <tr
                                                                    key={index}
                                                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                                >
                                                                    <td className="px-3 py-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                                                                        {
                                                                            batch.batch_number
                                                                        }
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                                        {new Date(
                                                                            batch.expiry_date,
                                                                        ).toLocaleDateString()}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                        {
                                                                            batch.quantity
                                                                        }
                                                                    </td>
                                                                    <td className="px-3 py-1.5">
                                                                        {batch.expiry_status && (
                                                                            <Badge
                                                                                className={`text-[10px] ${getExpiryStatusColor(batch.expiry_status)}`}
                                                                            >
                                                                                {
                                                                                    batch.expiry_status
                                                                                }
                                                                            </Badge>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                                        {batch.location ||
                                                                            'N/A'}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                {/* Stock Movements */}
                                {detail.stock_movements &&
                                    detail.stock_movements.length > 0 && (
                                        <div>
                                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                <History className="h-3.5 w-3.5" />
                                                Recent Stock Movements
                                            </h4>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                        <tr>
                                                            <th className="px-3 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Date
                                                            </th>
                                                            <th className="px-3 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Type
                                                            </th>
                                                            <th className="px-3 py-1.5 text-right text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Qty
                                                            </th>
                                                            <th className="px-3 py-1.5 text-right text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Balance
                                                            </th>
                                                            <th className="px-3 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                                                Reference
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {detail.stock_movements
                                                            .slice(0, 10)
                                                            .map((movement) => (
                                                                <tr
                                                                    key={
                                                                        movement.id
                                                                    }
                                                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                                >
                                                                    <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                                        {new Date(
                                                                            movement.date,
                                                                        ).toLocaleDateString()}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-xs">
                                                                        <Badge
                                                                            className={getMovementTypeColor(
                                                                                movement.type,
                                                                            )}
                                                                        >
                                                                            {getMovementTypeIcon(
                                                                                movement.type,
                                                                            )}
                                                                            {
                                                                                movement.type
                                                                            }
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                        {
                                                                            movement.quantity
                                                                        }
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                        {
                                                                            movement.balance
                                                                        }
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                                        {movement.reference ||
                                                                            'N/A'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                {(!detail.stock_movements ||
                                    detail.stock_movements.length === 0) && (
                                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-slate-600">
                                        <PackageX className="mx-auto h-8 w-8 text-slate-400" />
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            No stock movements recorded for this
                                            product
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Category Form Modal
// ============================================================================

interface CategoryFormModalProps {
    isOpen: boolean;
    title: string;
    formData: Partial<Category>;
    setFormData: (data: Partial<Category>) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isProcessing: boolean;
    submitLabel: string;
    isEdit?: boolean;
}

function CategoryFormModal({
    isOpen,
    title,
    formData,
    setFormData,
    onClose,
    onSubmit,
    isProcessing,
    submitLabel,
    isEdit = false,
}: CategoryFormModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                            <FolderPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {title}
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {isEdit
                                    ? 'Update category details'
                                    : 'Create a new product category'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="space-y-4 p-5">
                        <div>
                            <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                Category Name{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                className="mt-0.5 h-8 w-full rounded-lg border border-blue-600 border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                placeholder="Enter category name"
                                required
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                Category Code{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.code || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        code: e.target.value,
                                    })
                                }
                                className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                placeholder="Enter category code"
                                required
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                Description
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                className="mt-0.5 h-16 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                placeholder="Category description"
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active !== false}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            is_active: e.target.checked,
                                        })
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                                />
                                Active
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-3.5 w-3.5" />
                                    {submitLabel}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    title: string;
    itemName: string;
    itemCode: string;
    details: Array<{ label: string; value: string }>;
    onClose: () => void;
    onConfirm: () => void;
    isProcessing: boolean;
    type: 'product' | 'category';
}

function DeleteConfirmationModal({
    isOpen,
    title,
    itemName,
    itemCode,
    details,
    onClose,
    onConfirm,
    isProcessing,
    type,
}: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    const iconColors = {
        product: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        category:
            'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className={`rounded-lg p-1.5 ${iconColors[type]}`}>
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <div className="p-5">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {itemName}
                        </span>
                        ?
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        This action cannot be undone. The {type} will be
                        permanently removed.
                    </p>

                    <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                        <div className="grid grid-cols-2 gap-1 text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                                Code:
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                {itemCode}
                            </span>
                            {details.map((detail, index) => (
                                <React.Fragment key={index}>
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {detail.label}:
                                    </span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {detail.value}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            type === 'product'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete{' '}
                                {type === 'product' ? 'Product' : 'Category'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
