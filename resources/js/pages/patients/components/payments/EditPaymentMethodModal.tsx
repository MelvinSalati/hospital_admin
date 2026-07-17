// components/payments/EditPaymentMethodModal.tsx
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';

interface EditPaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    paymentMethod: any;
}

export default function EditPaymentMethodModal({
    isOpen,
    onClose,
    onSuccess,
    paymentMethod,
}: EditPaymentMethodModalProps) {
    const [isDefault, setIsDefault] = useState(
        paymentMethod?.is_default || false,
    );
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !paymentMethod) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.put(
            `/payments/payment-method/${paymentMethod.id}`,
            { is_default: isDefault },
            {
                onSuccess: () => {
                    onSuccess();
                    onClose();
                },
                onError: (err) => setErrors(err),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <h2 className="text-base font-semibold">
                        Edit Payment Method
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_default"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                            htmlFor="is_default"
                            className="text-sm text-gray-700"
                        >
                            Set as default payment method
                        </label>
                    </div>

                    {errors.submit && (
                        <p className="text-xs text-red-500">{errors.submit}</p>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
