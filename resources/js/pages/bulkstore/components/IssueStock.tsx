import { useState } from 'react';
import { ArrowUpFromLine, X } from 'lucide-react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';
import routes from '@/constants/routes';

interface IssueStockProps {
    productId?: number;
    currentStock?: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function IssueStock({
    productId,
    currentStock = 0,
    onSuccess,
    onCancel,
}: IssueStockProps) {
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

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

        setLoading(true);
        try {
            const payload = {
                product_id: productId,
                quantity,
                reason: reason || 'Issued',
            };

            await Http.post(routes.api.bulkstore.issue, payload);
            Notiflix.Notify.success('Stock issued successfully');

            setQuantity(1);
            setReason('');

            if (onSuccess) onSuccess();
        } catch (error) {
            Notiflix.Notify.failure('Failed to issue stock');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ArrowUpFromLine size={20} />
                    Issue Stock
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
                        Quantity to Issue *
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
                    {currentStock > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                            Max: {currentStock} units
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Reason
                    </label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="">Select reason...</option>
                        <option value="Sale">Sale</option>
                        <option value="Damage">Damage</option>
                        <option value="Expired">Expired</option>
                        <option value="Return">Return</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || currentStock === 0}
                        className="flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <ArrowUpFromLine size={16} />
                        )}
                        {loading ? 'Processing...' : 'Issue Stock'}
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
