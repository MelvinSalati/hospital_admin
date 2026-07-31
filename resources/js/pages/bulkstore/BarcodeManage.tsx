// resources/js/pages/bulkstore/StockCounts.tsx

import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import {
    QrCode,
    Barcode,
    Eye,
    Download,
    Printer,
    Copy,
    Check,
    X,
    Package,
    Building2,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    Tag,
    Hash,
    DollarSign,
    Image,
    FileText,
    Smartphone,
    Link,
    ExternalLink,
    RefreshCw,
    Plus,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import AddProductModal from './components/modals/AddProduct';

// ============================================
// TYPES
// ============================================

interface Product {
    id: number;
    product_name: string;
    product_code: string;
    barcode: string;
    category: string;
    supplier_name: string;
    supplier_contact: string;
    supplier_email: string;
    supplier_address: string;
    quantity: number;
    unit_price: number;
    created_at: string;
    updated_at: string;
    description?: string;
    batch_number?: string;
    expiry_date?: string;
    storage_conditions?: string;
}

interface ProductDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onPrint: () => void;
    onDownload: () => void;
}

// ============================================
// PRODUCT DETAILS MODAL
// ============================================

function ProductDetailsModal({
    isOpen,
    onClose,
    product,
    onPrint,
    onDownload,
}: ProductDetailsModalProps) {
    const [copied, setCopied] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const barcodeRef = useRef<SVGSVGElement>(null);
    const qrRef = useRef<HTMLCanvasElement>(null);

    if (!product) return null;

    // Generate QR Code
    useEffect(() => {
        if (isOpen && product) {
            // Generate QR Code
            QRCode.toDataURL(
                product.barcode || product.product_code,
                {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#1e293b',
                        light: '#ffffff',
                    },
                },
                (err: any, url: string) => {
                    if (!err) {
                        setQrCodeDataUrl(url);
                    }
                },
            );

            // Generate Barcode
            if (barcodeRef.current) {
                try {
                    JsBarcode(
                        barcodeRef.current,
                        product.barcode || product.product_code,
                        {
                            format: 'CODE128',
                            width: 2,
                            height: 60,
                            displayValue: true,
                            font: 'monospace',
                            fontSize: 16,
                            textMargin: 4,
                            margin: 10,
                            background: '#ffffff',
                            lineColor: '#1e293b',
                        },
                    );
                } catch (error) {
                    console.error('Barcode generation failed:', error);
                }
            }
        }
    }, [isOpen, product]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-ZM', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Copied to clipboard!');
        });
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'block' : 'hidden'}`}
        >
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-900">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-900/30">
                                <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Product Details
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {product.product_code}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onPrint}
                                className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                                <Printer className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onDownload}
                                className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Barcode & QR Section */}
                    <div className="mb-6 grid grid-cols-2 gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="flex flex-col items-center">
                            <h4 className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Barcode
                            </h4>
                            <div className="rounded-lg bg-white p-3 dark:bg-slate-800">
                                <svg ref={barcodeRef} className="h-16 w-full" />
                            </div>
                            <button
                                onClick={() =>
                                    copyToClipboard(
                                        product.barcode || product.product_code,
                                    )
                                }
                                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        Copy Code
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <h4 className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                QR Code
                            </h4>
                            <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                                {qrCodeDataUrl ? (
                                    <img
                                        src={qrCodeDataUrl}
                                        alt="QR Code"
                                        className="h-24 w-24"
                                    />
                                ) : (
                                    <div className="h-24 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                )}
                            </div>
                            <span className="mt-2 font-mono text-xs text-slate-400 dark:text-slate-500">
                                {product.product_code}
                            </span>
                        </div>
                    </div>

                    {/* Product Info Grid */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Package className="h-4 w-4" />
                                Product Name
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                                {product.product_name}
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Hash className="h-4 w-4" />
                                Product Code
                            </div>
                            <p className="mt-1 font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                                {product.product_code}
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Tag className="h-4 w-4" />
                                Category
                            </div>
                            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                                {product.category || 'N/A'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <DollarSign className="h-4 w-4" />
                                Unit Price
                            </div>
                            <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(product.unit_price)}
                            </p>
                        </div>
                    </div>

                    {/* Supplier Info */}
                    <div className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4" />
                            Supplier Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Supplier
                                </p>
                                <p className="text-sm text-slate-900 dark:text-slate-100">
                                    {product.supplier_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Contact
                                </p>
                                <p className="text-sm text-slate-900 dark:text-slate-100">
                                    {product.supplier_contact}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Email
                                </p>
                                <p className="text-sm text-slate-900 dark:text-slate-100">
                                    {product.supplier_email}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Address
                                </p>
                                <p className="text-sm text-slate-900 dark:text-slate-100">
                                    {product.supplier_address}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="h-4 w-4" />
                            <span>
                                Created: {formatDate(product.created_at)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-4 w-4" />
                            <span>
                                Updated: {formatDate(product.updated_at)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Package className="h-4 w-4" />
                            <span>Quantity: {product.quantity || 0}</span>
                        </div>
                    </div>

                    {/* Batch & Expiry Info */}
                    {(product.batch_number || product.expiry_date) && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                            <div className="flex flex-wrap gap-4 text-sm">
                                {product.batch_number && (
                                    <div>
                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                            Batch
                                        </span>
                                        <p className="font-mono font-medium text-amber-900 dark:text-amber-300">
                                            {product.batch_number}
                                        </p>
                                    </div>
                                )}
                                {product.expiry_date && (
                                    <div>
                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                            Expiry
                                        </span>
                                        <p className="font-medium text-amber-900 dark:text-amber-300">
                                            {formatDate(product.expiry_date)}
                                        </p>
                                    </div>
                                )}
                                {product.storage_conditions && (
                                    <div>
                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                            Storage
                                        </span>
                                        <p className="text-amber-900 dark:text-amber-300">
                                            {product.storage_conditions}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Stock Counts',
        href: '/bulkstore/stockcounts',
    },
];

export default function StockCounts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [showModal, setShowModal] = useState(false);
    const [addProductModal, setAddProductModal] = useState(false);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await Http.get('/bulkstore/products');
                setProducts(response.data.data || []);
            } catch (error) {
                console.error('Failed to fetch products:', error);
                toast.error('Failed to load products');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Handlers
    const handleView = (product: Product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };

    const handleAddProduct = () => {
        setAddProductModal(true);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        toast.success('Download started');
    };

    const handleGenerateBarcode = (product: Product) => {
        toast.success(`Generating barcode for ${product.product_name}`);
    };

    // Table Columns
    const columns: Column<Product>[] = [
        {
            id: 'product_name',
            label: 'Product',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                        {value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.product_code}
                    </p>
                </div>
            ),
        },
        {
            id: 'barcode',
            label: 'Barcode',
            minWidth: 120,
            format: (value) => (
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    {value || 'N/A'}
                </span>
            ),
        },
        {
            id: 'category',
            label: 'Category',
            minWidth: 100,
        },
        {
            id: 'unit_price',
            label: 'Price',
            minWidth: 80,
            align: 'right',
            format: (value) => (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat('en-ZM', {
                        style: 'currency',
                        currency: 'ZMW',
                        minimumFractionDigits: 2,
                    }).format(value || 0)}
                </span>
            ),
        },
        {
            id: 'quantity',
            label: 'Qty',
            minWidth: 60,
            align: 'center',
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 120,
        },
        {
            id: 'created_at',
            label: 'Added',
            minWidth: 100,
            format: (value) =>
                new Date(value).toLocaleDateString('en-ZM', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                }),
        },
    ];

    const actions: Action<Product>[] = [
        {
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Generate Barcode',
            icon: <Barcode className="h-4 w-4" />,
            color: 'info',
            onClick: (row) => handleGenerateBarcode(row),
        },
        {
            label: 'Print',
            icon: <Printer className="h-4 w-4" />,
            color: 'secondary',
            onClick: (row) => handlePrint(),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stock Counts" />

            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    <PageHeader
                        title="Barcode Management"
                        subtitle="Create and manage barcodes for products"
                        icon={<QrCode className="h-6 w-6" />}
                        actions={[
                            {
                                label: 'Add Product',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: () => handleAddProduct(true),
                                variant: 'primary',
                            },
                        ]}
                    />

                    <div className="mt-6">
                        <ReusableTable
                            title="Product List"
                            columns={columns}
                            data={products}
                            actions={actions}
                            loading={loading}
                            rowsPerPageOptions={[10, 25, 50]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="created_at"
                            defaultOrder="desc"
                            filterPlaceholder="Search products by name, code, or supplier..."
                            emptyMessage="No products found"
                            onRowClick={(row) => handleView(row)}
                        />
                    </div>
                </Container>
            </div>

            {/* Product Details Modal */}
            <ProductDetailsModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
                onPrint={handlePrint}
                onDownload={handleDownload}
            />

            <AddProductModal
                isOpen={addProductModal}
                onClose={() => {
                    setAddProductModal(false);
                }}
                onSuccess={()=>{
                    setAddProductModal(false)
                }}
            />
        </AppLayout>
    );
}
