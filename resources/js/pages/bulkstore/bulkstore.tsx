import routes from '@/constants/routes';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';
import {
    Barcode,
    ChevronLeft,
    Package,
    ArrowDownToLine,
    ArrowUpFromLine,
    ArrowLeftRight,
    SlidersHorizontal,
    Search,
    X,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingDown,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReceiveStock from '../pharmacies/components/ReceiveStock';
import IssueStock from '../pharmacies/components/IssueStock';
import AdjustStock from '../pharmacies/components/AdjustStock';
import TransferStock from '../pharmacies/components/TransferStock';

interface Product {
    id: number;
    name: string;
    code: string;
    batch_number?: string;
    expiry_date?: string;
    quantity: number;
    reorder_level: number;
    unit_cost?: number;
}

export default function BulkStore() {
    const [activeTab, setActiveTab] = useState(1);
    const [searchCode, setSearchCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTab === 1) inputRef.current?.focus();
    }, [activeTab]);

    const search = async () => {
        if (!searchCode.trim()) return;
        setLoading(true);
        setSelectedProduct(null);

        try {
            const res = await Http.get(routes.api.bulkstore.search, {
                params: { code: searchCode },
            });

            if (!res.data || res.data.length === 0) {
                Notiflix.Notify.warning('No product found');
                setProducts([]);
            } else {
                setProducts(Array.isArray(res.data) ? res.data : [res.data]);
            }
        } catch {
            Notiflix.Notify.failure('Error searching');
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchCode('');
        setProducts([]);
        setSelectedProduct(null);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') search();
    };

    const ExpiryBadge = ({ date }: { date?: string }) => {
        if (!date) return <span className="text-gray-400">—</span>;
        const days = Math.ceil(
            (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (days < 0)
            return (
                <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                    Expired
                </span>
            );
        if (days <= 30)
            return (
                <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                    <Clock size={10} /> {days}d
                </span>
            );
        return <span className="text-sm text-gray-500">{date}</span>;
    };

    const StockBadge = ({ qty, reorder }: any) => {
        if (qty === 0)
            return (
                <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                    Out
                </span>
            );
        if (qty <= reorder)
            return (
                <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                    Low
                </span>
            );
        return (
            <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                OK
            </span>
        );
    };

    const renderProducts = () => (
        <div className="space-y-4">
            {/* Scanner Hint */}
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                <Barcode size={16} />
                Scan barcode or enter product code — press{' '}
                <kbd className="rounded border px-1">Enter</kbd>
            </div>

            {/* Search */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search
                        className="absolute top-2.5 left-3 text-gray-400"
                        size={16}
                    />
                    <input
                        ref={inputRef}
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full rounded-lg border py-2 pr-10 pl-10 focus:ring-2 focus:ring-blue-500"
                        placeholder="Product code"
                    />
                    {searchCode && (
                        <button
                            onClick={clearSearch}
                            className="absolute top-2 right-2 rounded p-1 hover:bg-gray-100"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button
                    onClick={search}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={16} />
                    ) : (
                        <Search size={16} />
                    )}
                    Search
                </button>
            </div>

            {/* Table */}
            {products.length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                            <tr>
                                <th className="p-3 text-left">Code</th>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3">Batch</th>
                                <th className="p-3">Expiry</th>
                                <th className="p-3 text-right">Qty</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => (
                                <tr
                                    key={p.id}
                                    className={`cursor-pointer hover:bg-gray-50 ${
                                        selectedProduct?.id === p.id
                                            ? 'bg-blue-50'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        setSelectedProduct(
                                            selectedProduct?.id === p.id
                                                ? null
                                                : p,
                                        )
                                    }
                                >
                                    <td className="p-3 font-mono">{p.code}</td>
                                    <td className="p-3 font-medium">
                                        {p.name}
                                    </td>
                                    <td className="p-3">
                                        {p.batch_number || '—'}
                                    </td>
                                    <td className="p-3">
                                        <ExpiryBadge date={p.expiry_date} />
                                    </td>
                                    <td className="p-3 text-right">
                                        <span
                                            className={
                                                p.quantity === 0
                                                    ? 'text-red-600'
                                                    : p.quantity <=
                                                        p.reorder_level
                                                      ? 'text-yellow-600'
                                                      : ''
                                            }
                                        >
                                            {p.quantity}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <StockBadge
                                            qty={p.quantity}
                                            reorder={p.reorder_level}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail */}
            {selectedProduct && (
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-lg font-semibold">
                        {selectedProduct.name}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-xs">Qty</p>
                            <p>{selectedProduct.quantity}</p>
                        </div>
                        <div>
                            <p className="text-xs">Reorder</p>
                            <p>{selectedProduct.reorder_level}</p>
                        </div>
                        <div>
                            <p className="text-xs">Cost</p>
                            <p>{selectedProduct.unit_cost || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs">Expiry</p>
                            <p>{selectedProduct.expiry_date || '—'}</p>
                        </div>
                    </div>

                    {selectedProduct.quantity <=
                        selectedProduct.reorder_level && (
                        <div className="flex gap-2 rounded bg-yellow-50 p-3 text-yellow-700">
                            <AlertTriangle size={16} />
                            Low stock warning
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab(2)}
                            className="rounded border px-3 py-2"
                        >
                            Receive
                        </button>
                        <button
                            onClick={() => setActiveTab(3)}
                            className="rounded border px-3 py-2"
                        >
                            Issue
                        </button>
                        <button
                            onClick={() => setActiveTab(4)}
                            className="rounded border px-3 py-2"
                        >
                            Transfer
                        </button>
                    </div>
                </div>
            )}

            {/* Empty */}
            {products.length === 0 && !loading && searchCode && (
                <div className="py-10 text-center text-gray-500">
                    <Package size={30} />
                    <p>No products found</p>
                </div>
            )}
        </div>
    );

    const renderReceiveStock = (label: string) => <ReceiveStock />;

    const renderIssueStock = (label: string) => <IssueStock />;
    const renderTransferStock = (label: string) => <TransferStock />;
    const renderAdjustStock = (label: string) => <AdjustStock />;

    return (
        <AppLayout>
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button className="rounded p-2 hover:bg-gray-100">
                        <ChevronLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold">Bulk Store</h1>
                        <p className="text-sm text-gray-500">Inventory</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b">
                    {['Products', 'Receive', 'Issue', 'Transfer', 'Adjust'].map(
                        (t, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i + 1)}
                                className={`px-4 py-2 text-sm ${
                                    activeTab === i + 1
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-500'
                                }`}
                            >
                                {t}
                            </button>
                        ),
                    )}
                </div>

                {activeTab === 1 && renderProducts()}
                {activeTab === 2 && renderReceiveStock('Receive')}
                {activeTab === 3 && renderIssueStock('Issue')}
                {activeTab === 4 && renderTransferStock('Transfer')}
                {activeTab === 5 && renderAdjustStock('Adjust')}
            </div>
        </AppLayout>
    );
}
