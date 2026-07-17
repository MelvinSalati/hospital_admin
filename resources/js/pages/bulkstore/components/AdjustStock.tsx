import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';
import routes from '@/constants/routes';

interface AdjustStockProps {
    productId?: number;
    currentStock?: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function AdjustStock({
    productId,
    currentStock = 0,
    onSuccess,
    onCancel,
}: AdjustStockProps) {
    const [newQuantity, setNewQuantity] = useState<number>(currentStock);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newQuantity < 0) {
            Notiflix.Notify.warning('Quantity cannot be negative');
            return;
        }

        if (newQuantity === currentStock) {
            Notiflix.Notify.warning('No change in quantity');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                product_id: productId,
                quantity: newQuantity,
                reason: reason || 'Manual adjustment',
            };

            await Http.post(routes.api.bulkstore.adjust, payload);
            Notiflix.Notify.success('Stock adjusted successfully');

            setReason('');

            if (onSuccess) onSuccess();
        } catch (error) {
            Notiflix.Notify.failure('Failed to adjust stock');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const difference = newQuantity - currentStock;

    return (
        <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <SlidersHorizontal size={20} />
                    Adjust Stock
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

            <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3 text-sm">
                <div>
                    <span className="text-gray-500">Current Stock</span>
                    <p className="font-bold">{currentStock}</p>
                </div>
                <div>
                    <span className="text-gray-500">New Stock</span>
                    <p className="font-bold">{newQuantity}</p>
                </div>
                {difference !== 0 && (
                    <div className="col-span-2">
                        <span className="text-gray-500">Change</span>
                        <p
                            className={`font-bold ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                            {difference > 0 ? '+' : ''}
                            {difference} units
                        </p>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        New Quantity *
                    </label>
                    <input
                        type="number"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(Number(e.target.value))}
                        className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        min="0"
                        required
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Reason
                    </label>
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Reason for adjustment"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || newQuantity === currentStock}
                        className="flex items-center gap-2 rounded-lg bg-yellow-600 px-6 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <SlidersHorizontal size={16} />
                        )}
                        {loading ? 'Processing...' : 'Adjust Stock'}
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
