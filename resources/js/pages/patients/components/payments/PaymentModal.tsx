// components/payments/CheckoutModal.tsx

import { useState, useEffect } from 'react';
import {
    X,
    Banknote,
    CreditCard,
    Smartphone,
    Building,
    Shield,
    Check,
    Loader2,
    Wallet,
    AlertCircle,
    Landmark,
    Phone,
    FileText,
    User,
    Calendar,
    Lock,
    Fingerprint,
    Receipt,
    Printer,
    UserCircle,
    DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';

// ============================================================================
// Types
// ============================================================================

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    invoice: {
        id: number;
        invoice_number: string;
        total: number;
        due_amount: number;
        paid_amount: number;
        status: string;
        due_date: string;
        items?: any[];
        patient_id?: number;
    };
    patient: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
    };
}

interface PaymentMethod {
    id: string;
    label: string;
    icon: any;
    description: string;
    fields?: PaymentField[];
}

interface PaymentField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date' | 'tel' | 'email';
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
}

// ============================================================================
// Payment Methods Configuration
// ============================================================================

const PAYMENT_METHODS: PaymentMethod[] = [
    {
        id: 'cash',
        label: 'Cash',
        icon: Banknote,
        description: 'Pay with cash',
        fields: [
            {
                id: 'amount_tendered',
                label: 'Amount Tendered',
                type: 'number',
                placeholder: '0.00',
                required: true,
            },
            {
                id: 'cash_received_by',
                label: 'Received By',
                type: 'text',
                placeholder: 'Staff name',
                required: false,
            },
        ],
    },
    {
        id: 'card',
        label: 'Card',
        icon: CreditCard,
        description: 'VISA, Mastercard, Amex',
        fields: [
            {
                id: 'card_number',
                label: 'Card Number',
                type: 'text',
                placeholder: '**** **** **** ****',
                required: true,
            },
            {
                id: 'card_holder',
                label: 'Card Holder Name',
                type: 'text',
                placeholder: 'John Doe',
                required: true,
            },
            {
                id: 'expiry_date',
                label: 'Expiry Date',
                type: 'text',
                placeholder: 'MM/YY',
                required: true,
            },
            {
                id: 'cvv',
                label: 'CVV',
                type: 'text',
                placeholder: '***',
                required: true,
            },
        ],
    },
    {
        id: 'mobile_money',
        label: 'Mobile Money',
        icon: Smartphone,
        description: 'Airtel Money, MTN MoMo, etc.',
        fields: [
            {
                id: 'phone_number',
                label: 'Phone Number',
                type: 'tel',
                placeholder: '0712345678',
                required: true,
            },
            {
                id: 'provider',
                label: 'Provider',
                type: 'select',
                required: true,
                options: [
                    { value: 'airtel', label: 'Airtel Money' },
                    { value: 'mtn', label: 'MTN MoMo' },
                    { value: 'zamtel', label: 'Zamtel Kwacha' },
                ],
            },
            {
                id: 'reference',
                label: 'Reference',
                type: 'text',
                placeholder: 'TXN-12345',
                required: false,
            },
        ],
    },
    {
        id: 'insurance',
        label: 'Insurance',
        icon: Shield,
        description: 'Medical Insurance Claim',
        fields: [
            {
                id: 'insurance_provider',
                label: 'Provider',
                type: 'select',
                required: true,
                options: [
                    { value: 'nhima', label: 'NHIMA' },
                    { value: 'zima', label: 'ZIMA' },
                    { value: 'madison', label: 'Madison' },
                    { value: 'sanlam', label: 'Sanlam' },
                    { value: 'pru', label: 'Prudential' },
                    { value: 'other', label: 'Other' },
                ],
            },
            {
                id: 'policy_number',
                label: 'Policy Number',
                type: 'text',
                placeholder: 'Enter policy number',
                required: true,
            },
            {
                id: 'authorization_code',
                label: 'Auth Code',
                type: 'text',
                placeholder: 'Authorization code',
                required: false,
            },
            {
                id: 'claim_notes',
                label: 'Claim Notes',
                type: 'text',
                placeholder: 'Additional details',
                required: false,
            },
        ],
    },
    {
        id: 'bank_transfer',
        label: 'Bank Transfer',
        icon: Landmark,
        description: 'Direct Bank Transfer',
        fields: [
            {
                id: 'bank_name',
                label: 'Bank Name',
                type: 'text',
                placeholder: 'e.g., ZANACO',
                required: true,
            },
            {
                id: 'reference_number',
                label: 'Reference',
                type: 'text',
                placeholder: 'TRF-2024-001',
                required: true,
            },
            {
                id: 'account_name',
                label: 'Account Name',
                type: 'text',
                placeholder: 'Account holder',
                required: true,
            },
        ],
    },
];

// ============================================================================
// Main Component
// ============================================================================

export default function CheckoutModal({
    isOpen,
    onClose,
    onSuccess,
    invoice,
    patient,
}: CheckoutModalProps) {
    const { auth } = usePage().props;
    const [selectedMethod, setSelectedMethod] = useState<string>('cash');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentUser = auth?.user;
    const staffName = currentUser?.name || currentUser?.first_name || 'Staff';
    const currentMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
    const dueAmount = invoice?.due_amount || invoice?.total || 0;
    const amountTendered = formData.amount_tendered || 0;
    const change = amountTendered > dueAmount ? amountTendered - dueAmount : 0;
    const isShort = amountTendered > 0 && amountTendered < dueAmount;

    useEffect(() => {
        if (isOpen) {
            setFormData({
                amount: dueAmount,
                payment_date: new Date().toISOString().split('T')[0],
                cash_received_by: staffName,
                amount_tendered: dueAmount,
            });
            setErrors({});
        }
    }, [isOpen, dueAmount, staffName]);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        return `ZMW ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldId]: value }));
        if (errors[fieldId]) setErrors((prev) => ({ ...prev, [fieldId]: '' }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.amount || formData.amount <= 0) {
            newErrors.amount = 'Amount is required';
        } else if (formData.amount > dueAmount) {
            newErrors.amount = `Cannot exceed ${formatCurrency(dueAmount)}`;
        }

        if (selectedMethod === 'cash') {
            const tendered = formData.amount_tendered || 0;
            if (tendered <= 0) {
                newErrors.amount_tendered = 'Amount tendered is required';
            } else if (tendered < dueAmount) {
                newErrors.amount_tendered = `Insufficient: ${formatCurrency(tendered)} < ${formatCurrency(dueAmount)}`;
            }
        }

        if (currentMethod?.fields) {
            currentMethod.fields.forEach((field) => {
                if (field.id === 'cash_received_by') return;
                const value = formData[field.id];
                if (field.required && !value) {
                    newErrors[field.id] = `${field.label} is required`;
                }
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        const payload = {
            invoice_id: invoice?.id,
            patient_id: patient?.id,
            amount: formData.amount,
            payment_method: selectedMethod,
            payment_date: formData.payment_date,
            amount_tendered: formData.amount_tendered,
            change: change,
            received_by: formData.cash_received_by || staffName,
            ...formData,
        };

        try {
            const response = await Http.post('/payments/process', payload);

            if (response.data.success) {
                Notiflix.Notify.success(
                    response.data.message || 'Payment processed successfully',
                );

                // Call onSuccess callback
                onSuccess();

                // Close modal after short delay
                setTimeout(() => {
                    onClose();
                }, 500);
            } else {
                Notiflix.Notify.failure(
                    response.data.message || 'Failed to process payment',
                );
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            const errorMessage =
                error?.response?.data?.message ||
                'Failed to process payment. Please try again.';
            Notiflix.Notify.failure(errorMessage);

            if (error?.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMethodColor = (methodId: string) => {
        const colors: Record<string, string> = {
            cash: 'from-emerald-500 to-teal-500',
            card: 'from-blue-500 to-indigo-500',
            mobile_money: 'from-purple-500 to-pink-500',
            insurance: 'from-cyan-500 to-blue-500',
            bank_transfer: 'from-orange-500 to-amber-500',
        };
        return colors[methodId] || 'from-slate-500 to-gray-500';
    };

    const getMethodIcon = (methodId: string) => {
        const method = PAYMENT_METHODS.find((m) => m.id === methodId);
        return method?.icon || Wallet;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-5xl animate-in duration-200 fade-in zoom-in">
                <div className="relative rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                                <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Checkout
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Invoice #{invoice?.invoice_number} •{' '}
                                    {patient?.name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-0 md:grid-cols-4">
                        {/* Payment Methods Sidebar */}
                        <div className="border-r border-slate-200 p-3 md:col-span-1 dark:border-slate-700">
                            <p className="mb-2 text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                Payment Methods
                            </p>
                            <div className="space-y-1">
                                {PAYMENT_METHODS.map((method) => {
                                    const Icon = method.icon;
                                    return (
                                        <button
                                            key={method.id}
                                            onClick={() => {
                                                setSelectedMethod(method.id);
                                                setErrors({});
                                            }}
                                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                                                selectedMethod === method.id
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <Icon
                                                className={`h-3.5 w-3.5 ${
                                                    selectedMethod === method.id
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : 'text-slate-400'
                                                }`}
                                            />
                                            <span className="flex-1">
                                                {method.label}
                                            </span>
                                            {selectedMethod === method.id && (
                                                <Check className="h-3 w-3 text-blue-600" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Order Summary */}
                            <div className="mt-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                <p className="text-[9px] font-medium text-slate-500 uppercase dark:text-slate-400">
                                    Summary
                                </p>
                                <div className="mt-1 space-y-0.5 text-[10px]">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Total
                                        </span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {formatCurrency(
                                                invoice?.total || 0,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            Paid
                                        </span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(
                                                invoice?.paid_amount || 0,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-0.5 dark:border-slate-600">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            Due
                                        </span>
                                        <span className="font-bold text-amber-600 dark:text-amber-400">
                                            {formatCurrency(dueAmount)}
                                        </span>
                                    </div>
                                    {selectedMethod === 'cash' &&
                                        amountTendered > 0 && (
                                            <div className="flex justify-between border-t border-emerald-200 pt-0.5 dark:border-emerald-800">
                                                <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                                    Change
                                                </span>
                                                <span
                                                    className={`text-[10px] font-bold ${
                                                        change > 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-slate-500'
                                                    }`}
                                                >
                                                    {formatCurrency(change)}
                                                </span>
                                            </div>
                                        )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Form - Right Side */}
                        <div className="p-4 md:col-span-3">
                            <form onSubmit={handleSubmit} className="space-y-3">
                                {/* Method Header */}
                                <div
                                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r p-2 text-white"
                                    style={{
                                        background: `linear-gradient(135deg, ${getMethodColor(selectedMethod)})`,
                                    }}
                                >
                                    {(() => {
                                        const Icon =
                                            getMethodIcon(selectedMethod);
                                        return <Icon className="h-4 w-4" />;
                                    })()}
                                    <span className="text-xs font-medium capitalize">
                                        {selectedMethod.replace('_', ' ')}{' '}
                                        Payment
                                    </span>
                                    <span className="ml-auto text-[9px] opacity-75">
                                        Secure
                                    </span>
                                    <Lock className="h-3 w-3 opacity-75" />
                                </div>

                                {/* Tender Amount Section - Compact & Professional */}
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {/* Amount to Pay */}
                                    <div>
                                        <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            Amount to Pay{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <div className="relative mt-0.5">
                                            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                ZMW
                                            </span>
                                            <input
                                                type="number"
                                                value={formData.amount || ''}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        'amount',
                                                        parseFloat(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className="h-8 w-full rounded-lg border border-slate-200 pr-2 pl-12 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                step="0.01"
                                                min="0.01"
                                                max={dueAmount}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {errors.amount && (
                                            <p className="mt-0.5 text-[9px] text-red-500">
                                                {errors.amount}
                                            </p>
                                        )}
                                        <p className="mt-0.5 text-[9px] text-slate-400">
                                            Max: {formatCurrency(dueAmount)}
                                        </p>
                                    </div>

                                    {/* Cash Tendered (only for cash) */}
                                    {selectedMethod === 'cash' && (
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                Amount Tendered{' '}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <div className="relative mt-0.5">
                                                <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    ZMW
                                                </span>
                                                <input
                                                    type="number"
                                                    value={
                                                        formData.amount_tendered ||
                                                        ''
                                                    }
                                                    onChange={(e) => {
                                                        const val =
                                                            parseFloat(
                                                                e.target.value,
                                                            ) || 0;
                                                        handleFieldChange(
                                                            'amount_tendered',
                                                            val,
                                                        );
                                                        if (
                                                            val > 0 &&
                                                            val <= dueAmount
                                                        )
                                                            handleFieldChange(
                                                                'amount',
                                                                val,
                                                            );
                                                    }}
                                                    className={`h-8 w-full rounded-lg border pr-2 pl-12 text-xs focus:ring-1 focus:outline-none ${
                                                        isShort
                                                            ? 'border-red-400 focus:border-red-400 focus:ring-red-400 dark:border-red-600'
                                                            : amountTendered >=
                                                                    dueAmount &&
                                                                amountTendered >
                                                                    0
                                                              ? 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-400 dark:border-emerald-600'
                                                              : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400 dark:border-slate-700'
                                                    } dark:bg-slate-800 dark:text-slate-100`}
                                                    step="0.01"
                                                    min="0.01"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            {errors.amount_tendered && (
                                                <p className="mt-0.5 text-[9px] text-red-500">
                                                    {errors.amount_tendered}
                                                </p>
                                            )}
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[9px]">
                                                {isShort && (
                                                    <span className="flex items-center gap-1 text-red-500">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Short by{' '}
                                                        {formatCurrency(
                                                            dueAmount -
                                                                amountTendered,
                                                        )}
                                                    </span>
                                                )}
                                                {amountTendered >= dueAmount &&
                                                    amountTendered > 0 && (
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                            <Check className="h-3 w-3" />
                                                            {amountTendered ===
                                                            dueAmount
                                                                ? 'Exact amount'
                                                                : `Change: ${formatCurrency(change)}`}
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Received By (for cash) */}
                                    {selectedMethod === 'cash' && (
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                Received By
                                            </label>
                                            <div className="relative mt-0.5">
                                                <UserCircle className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={
                                                        formData.cash_received_by ||
                                                        staffName
                                                    }
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            'cash_received_by',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 w-full rounded-lg border border-slate-200 pr-2 pl-8 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                    placeholder="Staff name"
                                                />
                                            </div>
                                            <p className="mt-0.5 text-[9px] text-slate-400">
                                                Auto-filled: {staffName}
                                            </p>
                                        </div>
                                    )}

                                    {/* Payment Date */}
                                    <div>
                                        <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            Payment Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.payment_date || ''}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'payment_date',
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Fields for selected method */}
                                {currentMethod?.fields && (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {currentMethod.fields.map((field) => {
                                            if (
                                                field.id ===
                                                    'cash_received_by' ||
                                                field.id === 'amount_tendered'
                                            )
                                                return null;
                                            return (
                                                <div
                                                    key={field.id}
                                                    className={
                                                        field.id ===
                                                        'claim_notes'
                                                            ? 'sm:col-span-2'
                                                            : ''
                                                    }
                                                >
                                                    <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                        {field.label}{' '}
                                                        {field.required && (
                                                            <span className="text-red-500">
                                                                *
                                                            </span>
                                                        )}
                                                    </label>
                                                    {field.type === 'select' ? (
                                                        <select
                                                            value={
                                                                formData[
                                                                    field.id
                                                                ] || ''
                                                            }
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    field.id,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                            required={
                                                                field.required
                                                            }
                                                        >
                                                            <option value="">
                                                                Select...
                                                            </option>
                                                            {field.options?.map(
                                                                (opt) => (
                                                                    <option
                                                                        key={
                                                                            opt.value
                                                                        }
                                                                        value={
                                                                            opt.value
                                                                        }
                                                                    >
                                                                        {
                                                                            opt.label
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={field.type}
                                                            value={
                                                                formData[
                                                                    field.id
                                                                ] || ''
                                                            }
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    field.id,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder={
                                                                field.placeholder
                                                            }
                                                            className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                            required={
                                                                field.required
                                                            }
                                                        />
                                                    )}
                                                    {errors[field.id] && (
                                                        <p className="mt-0.5 text-[9px] text-red-500">
                                                            {errors[field.id]}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className="flex-1 text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            isSubmitting ||
                                            formData.amount <= 0 ||
                                            (selectedMethod === 'cash' &&
                                                amountTendered < dueAmount)
                                        }
                                        className={`flex-1 text-xs ${
                                            selectedMethod === 'cash' &&
                                            amountTendered >= dueAmount
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        } disabled:opacity-50`}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <>
                                                <DollarSign className="mr-1 h-3.5 w-3.5" />
                                                {selectedMethod === 'cash' &&
                                                amountTendered > dueAmount
                                                    ? `Pay ${formatCurrency(formData.amount)} • Change ${formatCurrency(change)}`
                                                    : `Pay ${formatCurrency(formData.amount || 0)}`}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-2 dark:border-slate-700">
                        <div className="flex items-center gap-3 text-[9px] text-slate-500 dark:text-slate-400">
                            <Fingerprint className="h-3 w-3" />
                            <span>Secured</span>
                            <span className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                            <span>Encrypted</span>
                            <span className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                            <span>Staff: {staffName}</span>
                        </div>
                        <button className="flex gap-1 text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <Printer className="h-3 w-3" />
                            <span>Receipt</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
