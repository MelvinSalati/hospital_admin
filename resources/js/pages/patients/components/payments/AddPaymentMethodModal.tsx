// components/payments/AddPaymentMethodModal.tsx
import { useState } from 'react';
import {
    X,
    Shield,
    Smartphone,
    CreditCard,
    Landmark,
    Plus,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';

interface AddPaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: string;
    insuranceProviders: any[];
}

export default function AddPaymentMethodModal({
    isOpen,
    onClose,
    onSuccess,
    patientId,
    insuranceProviders,
}: AddPaymentMethodModalProps) {
    const [methodType, setMethodType] = useState('insurance');
    const [formData, setFormData] = useState({
        type: 'insurance',
        provider: '',
        scheme_id: '',
        policy_number: '',
        phone_number: '',
        card_number: '',
        expiry_date: '',
        account_number: '',
        is_default: false,
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(
            '/payments/add-payment-method',
            { ...formData, patient_id: patientId },
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

    const methodTypes = [
        { value: 'insurance', icon: Shield, label: 'Insurance' },
        { value: 'mobile_money', icon: Smartphone, label: 'Mobile Money' },
        { value: 'bank_card', icon: CreditCard, label: 'Bank Card' },
        { value: 'bank_account', icon: Landmark, label: 'Bank Account' },
    ];

    const getProviders = () => {
        switch (methodType) {
            case 'insurance':
                return insuranceProviders;
            case 'mobile_money':
                return ['MTN Mobile Money', 'Airtel Money', 'Zamtel Kwacha'];
            case 'bank_card':
                return ['Visa', 'Mastercard', 'American Express'];
            case 'bank_account':
                return ['Zanaco', 'Stanbic', 'ABSA', 'FNB'];
            default:
                return [];
        }
    };

    const providers = getProviders();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
                    <h2 className="text-base font-semibold">
                        Add Payment Method
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    {/* Method Type */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Method Type *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {methodTypes.map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setMethodType(value)}
                                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs transition-all ${
                                        methodType === value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Provider */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Provider *
                        </label>
                        <select
                            name="provider"
                            value={formData.provider}
                            onChange={handleChange}
                            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="">Select Provider</option>
                            {providers.map((p: any) => (
                                <option key={p.id || p} value={p.id || p}>
                                    {p.name || p}
                                </option>
                            ))}
                        </select>
                        {errors.provider && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.provider}
                            </p>
                        )}
                    </div>

                    {/* Insurance fields */}
                    {methodType === 'insurance' && formData.provider && (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Scheme *
                                </label>
                                <select
                                    name="scheme_id"
                                    value={formData.scheme_id}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">Select Scheme</option>
                                    {insuranceProviders
                                        .find(
                                            (p: any) =>
                                                p.id === formData.provider,
                                        )
                                        ?.schemes?.map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} (
                                                {s.coverage_percentage}%)
                                            </option>
                                        ))}
                                </select>
                                {errors.scheme_id && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.scheme_id}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Policy Number *
                                </label>
                                <input
                                    type="text"
                                    name="policy_number"
                                    value={formData.policy_number}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Enter policy number"
                                />
                                {errors.policy_number && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.policy_number}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* Mobile Money */}
                    {methodType === 'mobile_money' && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="0977123456"
                            />
                            {errors.phone_number && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.phone_number}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Bank Card */}
                    {methodType === 'bank_card' && (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Card Number *
                                </label>
                                <input
                                    type="text"
                                    name="card_number"
                                    value={formData.card_number}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="1234 5678 9012 3456"
                                    maxLength={19}
                                />
                                {errors.card_number && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.card_number}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Expiry Date *
                                </label>
                                <input
                                    type="month"
                                    name="expiry_date"
                                    value={formData.expiry_date}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                {errors.expiry_date && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.expiry_date}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* Bank Account */}
                    {methodType === 'bank_account' && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Account Number *
                            </label>
                            <input
                                type="text"
                                name="account_number"
                                value={formData.account_number}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter account number"
                            />
                            {errors.account_number && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.account_number}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Default */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="is_default"
                            id="is_default"
                            checked={formData.is_default}
                            onChange={handleChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                            htmlFor="is_default"
                            className="text-xs text-gray-700"
                        >
                            Set as default
                        </label>
                    </div>

                    {errors.submit && (
                        <p className="text-xs text-red-500">{errors.submit}</p>
                    )}

                    {/* Actions */}
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
                                <>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
