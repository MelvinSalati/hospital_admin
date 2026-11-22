import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Http from '@/utils/Http';

interface FilterOption {
    value: string;
    label: string;
}

interface Props {
    categories: FilterOption[];
    onCreated: () => void;
    onCancel: () => void;
}

const PAYMENT_METHODS: FilterOption[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' },
];

const inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';

const today = () => new Date().toISOString().slice(0, 10);

export default function CreateExpenseForm({
    categories,
    onCreated,
    onCancel,
}: Props) {
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<File | null>(null);
    const [form, setForm] = useState({
        expense_date: today(),
        category_id: '',
        payee_name: '',
        amount: '',
        payment_method: '',
        reference_number: '',
        budget_code: '',
        description: '',
    });

    const set = (key: keyof typeof form, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async () => {
        if (!form.category_id) return toast.error('Select a category');
        if (!form.payee_name.trim()) return toast.error('Enter the payee');
        if (!form.amount || Number(form.amount) <= 0)
            return toast.error('Enter a valid amount');

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
            if (v !== '') fd.append(k, v);
        });
        if (receipt) fd.append('receipt', receipt);

        setSubmitting(true);
        try {
            const res = await Http.post('/admin/finance/expenses', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(res.data.message || 'Expense submitted');
            onCreated();
        } catch (error: any) {
            const errors = error.response?.data?.errors;
            const first = errors ? Object.values(errors).flat()[0] : null;
            toast.error(
                (first as string) ||
                    error.response?.data?.message ||
                    'Failed to submit expense',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">
                    Record Expense
                </h2>
                <p className="text-sm text-slate-500">
                    Submitted expenses wait for approval before they count as
                    spending.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-slate-500">Date *</Label>
                    <input
                        type="date"
                        className={inputClass}
                        value={form.expense_date}
                        onChange={(e) => set('expense_date', e.target.value)}
                    />
                </div>
                <div>
                    <Label className="text-xs text-slate-500">Amount *</Label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={form.amount}
                        onChange={(e) => set('amount', e.target.value)}
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <Label className="text-xs text-slate-500">Category *</Label>
                    <select
                        className={inputClass}
                        value={form.category_id}
                        onChange={(e) => set('category_id', e.target.value)}
                    >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label className="text-xs text-slate-500">Payee *</Label>
                    <input
                        className={inputClass}
                        value={form.payee_name}
                        onChange={(e) => set('payee_name', e.target.value)}
                        placeholder="Who was paid?"
                    />
                </div>
                <div>
                    <Label className="text-xs text-slate-500">
                        Payment method
                    </Label>
                    <select
                        className={inputClass}
                        value={form.payment_method}
                        onChange={(e) => set('payment_method', e.target.value)}
                    >
                        <option value="">Select method</option>
                        {PAYMENT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label className="text-xs text-slate-500">Reference no.</Label>
                    <input
                        className={inputClass}
                        value={form.reference_number}
                        onChange={(e) => set('reference_number', e.target.value)}
                    />
                </div>
                <div>
                    <Label className="text-xs text-slate-500">
                        Budget code (optional)
                    </Label>
                    <input
                        className={inputClass}
                        value={form.budget_code}
                        onChange={(e) => set('budget_code', e.target.value)}
                        placeholder="e.g. BUD-2026-00020"
                    />
                </div>
                <div>
                    <Label className="text-xs text-slate-500">
                        Receipt (PDF / image)
                    </Label>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
                        onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                    />
                </div>
                <div className="col-span-2">
                    <Label className="text-xs text-slate-500">Description</Label>
                    <textarea
                        rows={3}
                        className={inputClass}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={onCancel} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-cyan-600 hover:bg-cyan-700"
                >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Expense
                </Button>
            </div>
        </div>
    );
}
