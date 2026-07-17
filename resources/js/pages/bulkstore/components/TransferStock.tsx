import { useState, useEffect } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';
import routes from '@/constants/routes';

interface Pharmacy {
    id: number;
    name: string;
}

interface TransferStockProps {
    productId?: number;
    currentStock?: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function TransferStock({
    productId,
    currentStock = 0,
    onSuccess,
    onCancel,
}: TransferStockProps) {
    const [quantity, setQuantity] = useState<number>(1);
    const [fromPharmacy, setFromPharmacy] = useState<string>('');
    const [toPharmacy, setToPharmacy] = useState<string>('');
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingPharmacies, setLoadingPharmacies] = useState(false);

    useEffect(() => {
        loadPharmacies();
    }, []);

    const loadPharmacies = async () => {
        setLoadingPharmacies(true);
        try {
            const res = await Http.get(routes.api.pharmacies.list);
            setPharmacies(res.data || []);
        } catch (error) {
            console.error('Failed to load pharmacies:', error);
        } finally {
            setLoadingPharmacies(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!quantity || quantity <= 0) {
            Notiflix.Notify.warning('Please enter a valid quantity');
            return;
        }

        if (quantity > currentStock) {
            Notiflix.Notify.warning(`Only ${currentStock} items available`);
            return;
        }

        if (!toPharmacy) {
            Notiflix.Notify.warning('Please select a destination pharmacy');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                product_id: productId,
                quantity,
                from_pharmacy: fromPharmacy || undefined,
                to_pharmacy: toPharmacy,
            };

            await Http.post(routes.api.bulkstore.transfer, payload);
            Notiflix.Notify.success('Stock transferred successfully');

            setQuantity(1);
            setToPharmacy('');

            if (onSuccess) onSuccess();
        } catch (error) {
            Notiflix.Notify.failure('Failed to transfer stock');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ArrowLeftRight size={20} />
                    Transfer Stock
                </h3>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="rounded p-1 hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm">
                <span className="font-medium">Available Stock:</span>{' '}
                <span className="font-bold">{currentStock}</span> units
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Quantity *
                    </label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        min="1"
                        max={currentStock}
                        required
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Transfer From
                    </label>
                    <select
                        value={fromPharmacy}
                        onChange={(e) => setFromPharmacy(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="">Current Pharmacy</option>
                        {pharmacies.map((pharmacy) => (
                            <option key={pharmacy.id} value={pharmacy.id}>
                                {pharmacy.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Transfer To *
                    </label>
                    <select
                        value={toPharmacy}
                        onChange={(e) => setToPharmacy(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        required
                    >
                        <option value="">Select destination...</option>
                        {pharmacies.map((pharmacy) => (
                            <option key={pharmacy.id} value={pharmacy.id}>
                                {pharmacy.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || currentStock === 0 || !toPharmacy}
                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <ArrowLeftRight size={16} />
                        )}
                        {loading ? 'Processing...' : 'Transfer Stock'}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-lg border px-6 py-2 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
