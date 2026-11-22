import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, X, FileText, Loader2, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Http from '@/utils/Http';

interface BudgetOption {
    id: number;
    budget_code: string;
    budget_name: string;
    available_amount: string;
    status: string;
}

interface CreateTransactionFormProps {
    budgets: BudgetOption[];
    onCreated: () => void;
    onCancel: () => void;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'mobile_money', label: 'Mobile Money (Airtel / MTN)' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
];

const TRANSACTION_TYPES = [
    { value: 'expense', label: 'Expense (Proof of Spend)' },
    { value: 'actual', label: 'Actual Spend' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'refund', label: 'Refund' },
];

export default function CreateTransactionForm({
    budgets,
    onCreated,
    onCancel,
}: CreateTransactionFormProps) {
    const [loading, setLoading] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        budget_allocation_id: '',
        budget_code: '',
        transaction_type: 'expense',
        transaction_date: new Date().toISOString().slice(0, 10),
        item_name: '',
        quantity: '1',
        unit_cost: '',
        amount: '',
        description: '',
        payee_name: '',
        payment_method: 'cash',
        reference_number: '',
    });

    const activeBudgets = budgets.filter((b) => b.status === 'active');

    // Auto-calculate amount when qty * unit_cost changes
    useEffect(() => {
        const qty = parseFloat(form.quantity) || 0;
        const unit = parseFloat(form.unit_cost) || 0;
        if (qty > 0 && unit > 0) {
            setForm((prev) => ({
                ...prev,
                amount: (qty * unit).toFixed(2),
            }));
        }
    }, [form.quantity, form.unit_cost]);

    const handleBudgetChange = (value: string) => {
        const budget = activeBudgets.find((b) => String(b.id) === value);
        setForm((prev) => ({
            ...prev,
            budget_allocation_id: value,
            budget_code: budget?.budget_code ?? '',
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
        ];
        if (!allowed.includes(file.type)) {
            toast.error('Only JPEG, PNG, WebP or PDF allowed');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File must be under 5 MB');
            return;
        }

        setReceiptFile(file);
        if (file.type.startsWith('image/')) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(null);
        }
    };

    const clearReceipt = () => {
        setReceiptFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.budget_allocation_id) {
            toast.error('Please select a budget');
            return;
        }
        if (!form.amount || parseFloat(form.amount) <= 0) {
            toast.error('Amount must be greater than zero');
            return;
        }
        if (!form.description.trim()) {
            toast.error('Description is required');
            return;
        }

        setLoading(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (v !== '' && v !== null) fd.append(k, String(v));
            });
            if (receiptFile) {
                fd.append('receipt', receiptFile);
            }

            const response = await Http.post('/admin/budget-transactions', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                toast.success(
                    `Transaction ${response.data.transaction?.transaction_no ?? ''} recorded`,
                );
                onCreated();
            } else {
                throw new Error(response.data.message || 'Failed');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(
                err.response?.data?.message || 'Failed to create transaction',
            );
        } finally {
            setLoading(false);
        }
    };

    const selectedBudget = activeBudgets.find(
        (b) => String(b.id) === form.budget_allocation_id,
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
            <div className="flex items-center gap-2 border-b pb-3">
                <Receipt className="h-5 w-5 text-cyan-600" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        Record Transaction / Proof of Spend
                    </h2>
                    <p className="text-sm text-slate-500">
                        Attach receipt and allocate against an active budget
                    </p>
                </div>
            </div>

            {/* Budget Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>
                        Budget <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={form.budget_allocation_id}
                        onValueChange={handleBudgetChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select budget..." />
                        </SelectTrigger>
                        <SelectContent>
                            {activeBudgets.length === 0 && (
                                <SelectItem value="__none" disabled>
                                    No active budgets
                                </SelectItem>
                            )}
                            {activeBudgets.map((b) => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                    {b.budget_code} — {b.budget_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedBudget && (
                        <p className="text-xs text-emerald-600">
                            Available:{' '}
                            {new Intl.NumberFormat('en-ZM', {
                                style: 'currency',
                                currency: 'ZMW',
                            }).format(
                                parseFloat(selectedBudget.available_amount) ||
                                    0,
                            )}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>
                        Transaction Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={form.transaction_type}
                        onValueChange={(v) =>
                            setForm((p) => ({ ...p, transaction_type: v }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TRANSACTION_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Item Details */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="mb-3 text-sm font-medium text-slate-700">
                    Item / Spend Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-2">
                        <Label>Item Name</Label>
                        <Input
                            value={form.item_name}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    item_name: e.target.value,
                                }))
                            }
                            placeholder="e.g. Office stationery, Fuel, Catering..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Transaction Date</Label>
                        <Input
                            type="date"
                            value={form.transaction_date}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    transaction_date: e.target.value,
                                }))
                            }
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.quantity}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    quantity: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Unit Cost (ZMW)</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.unit_cost}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    unit_cost: e.target.value,
                                }))
                            }
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Total Amount (ZMW){' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.amount}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    amount: e.target.value,
                                }))
                            }
                            required
                            className="font-semibold"
                        />
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label>
                    Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                    value={form.description}
                    onChange={(e) =>
                        setForm((p) => ({
                            ...p,
                            description: e.target.value,
                        }))
                    }
                    placeholder="What was this spend for? Include any relevant context..."
                    rows={3}
                    required
                />
            </div>

            {/* Payee & Payment */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                    <Label>Payee / Vendor</Label>
                    <Input
                        value={form.payee_name}
                        onChange={(e) =>
                            setForm((p) => ({
                                ...p,
                                payee_name: e.target.value,
                            }))
                        }
                        placeholder="Name of person or business paid"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                        value={form.payment_method}
                        onValueChange={(v) =>
                            setForm((p) => ({ ...p, payment_method: v }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Reference / Receipt No.</Label>
                    <Input
                        value={form.reference_number}
                        onChange={(e) =>
                            setForm((p) => ({
                                ...p,
                                reference_number: e.target.value,
                            }))
                        }
                        placeholder="Invoice / receipt number"
                    />
                </div>
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
                <Label>Proof of Spending (Receipt)</Label>
                <div
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
                        receiptFile
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-300 bg-slate-50 hover:border-cyan-400'
                    }`}
                >
                    {receiptFile ? (
                        <div className="flex w-full items-center gap-3">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Receipt preview"
                                    className="h-16 w-16 rounded object-cover"
                                />
                            ) : (
                                <FileText className="h-10 w-10 text-slate-500" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {receiptFile.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {(receiptFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearReceipt}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Upload className="mb-2 h-8 w-8 text-slate-400" />
                            <p className="text-sm text-slate-600">
                                Click or drag receipt here
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                JPEG, PNG, WebP or PDF · max 5 MB
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Choose File
                            </Button>
                        </>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-cyan-600 hover:bg-cyan-700"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Wallet className="mr-2 h-4 w-4" />
                            Record Transaction
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
