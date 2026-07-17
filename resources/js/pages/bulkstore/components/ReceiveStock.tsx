import { useState } from 'react';
import { Package, Plus, X } from 'lucide-react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';
import routes from '@/constants/routes';

interface ReceiveStockProps {
    productId?: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function ReceiveStock({
    productId,
    onSuccess,
    onCancel,
}: ReceiveStockProps) {
    const [quantity, setQuantity] = useState<number>(1);
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [unitCost, setUnitCost] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!quantity || quantity <= 0) {
            Notiflix.Notify.warning('Please enter a valid quantity');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                product_id: productId,
                quantity,
                batch_number: batchNumber || undefined,
                expiry_date: expiryDate || undefined,
                unit_cost: unitCost || undefined,
                notes: notes || undefined,
            };

            await Http.post(routes.api.bulkstore.receive, payload);
            Notiflix.Notify.success('Stock received successfully');

            // Reset form
            setQuantity(1);
            setBatchNumber('');
            setExpiryDate('');
            setUnitCost(0);
            setNotes('');

            if (onSuccess) onSuccess();
        } catch (error) {
            Notiflix.Notify.failure('Failed to receive stock');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Package size={20} />
                    Receive Stock
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

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Quantity *
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) =>
                                setQuantity(Number(e.target.value))
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            min="1"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Unit Cost
                        </label>
                        <input
                            type="number"
                            value={unitCost}
                            onChange={(e) =>
                                setUnitCost(Number(e.target.value))
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Batch Number
                        </label>
                        <input
                            type="text"
                            value={batchNumber}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="Enter batch number"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Expiry Date
                        </label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        rows={2}
                        placeholder="Optional notes"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Plus size={16} />
                        )}
                        {loading ? 'Processing...' : 'Receive Stock'}
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
