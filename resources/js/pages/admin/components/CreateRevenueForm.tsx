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

const REVENUE_CATEGORIES: FilterOption[] = [
    { value: 1, label: 'Grants' },
    { value: 2, label: 'Donations' },
    { value: 3, label: 'Insurance Claims' },
    { value: 4, label: 'Government Subsidies' },
    { value: 5, label: 'Service Fees' },
    { value: 6, label: 'Rental Income' },
    { value: 7, label: 'Training & Workshop Fees' },
    { value: 8, label: 'Interest Income' },
    { value: 9, label: 'Sale of Assets' },
    { value: 10, label: 'Other Income' },
];

const SOURCE_TYPES: FilterOption[] = [
    { value: 'grant', label: 'Grant' },
    { value: 'donation', label: 'Donation' },
    { value: 'insurance_claim', label: 'Insurance Claim' },
    { value: 'service_fee', label: 'Service Fee' },
    { value: 'other', label: 'Other' },
];

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

export default function CreateRevenueForm({
    categories,
    onCreated,
    onCancel,
}: Props) {
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<File | null>(null);
    const [form, setForm] = useState({
        revenue_date: today(),
        category_id: '',
        source_type: 'other',
        payer_name: '',
        amount: '',
        payment_method: '',
        reference_number: '',
        description: '',
        status: 'received',
    });

    const set = (key: keyof typeof form, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async () => {
        if (!form.category_id) return toast.error('Select a category');
        if (!form.amount || Number(form.amount) <= 0)
            return toast.error('Enter a valid amount');

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
            if (v !== '') fd.append(k, v);
        });
        if (receipt) fd.append('receipt', receipt);

        setSubmitting(true);
        try {
            const res = await Http.post('/admin/finance/revenues', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(res.data.message || 'Revenue recorded');
            onCreated();
        } catch (error: any) {
            const errors = error.response?.data?.errors;
            const first = errors ? Object.values(errors).flat()[0] : null;
            toast.error(
                (first as string) ||
                    error.response?.data?.message ||
                    'Failed to record revenue',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">
                    Record Revenue
                </h2>
                <p className="text-sm text-slate-500">
                    Grants, donations, insurance payments and other income.
                    Patient collections are picked up automatically.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-slate-500">Date *</Label>
                    <input
                        type="date"
                        className={inputClass}
                        value={form.revenue_date}
                        onChange={(e) => set('revenue_date', e.target.value)}
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
                        {REVENUE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label className="text-xs text-slate-500">Source *</Label>
                    <select
                        className={inputClass}
                        value={form.source_type}
                        onChange={(e) => set('source_type', e.target.value)}
                    >
                        {SOURCE_TYPES.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-span-2">
                    <Label className="text-xs text-slate-500">
                        Payer / Source name
                    </Label>
                    <input
                        className={inputClass}
                        value={form.payer_name}
                        onChange={(e) => set('payer_name', e.target.value)}
                        placeholder="e.g. Ministry of Health, Donor name"
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
                    <Label className="text-xs text-slate-500">
                        Reference no.
                    </Label>
                    <input
                        className={inputClass}
                        value={form.reference_number}
                        onChange={(e) =>
                            set('reference_number', e.target.value)
                        }
                    />
                </div>
                <div>
                    <Label className="text-xs text-slate-500">Status</Label>
                    <select
                        className={inputClass}
                        value={form.status}
                        onChange={(e) => set('status', e.target.value)}
                    >
                        <option value="received">Received</option>
                        <option value="pending">Pending (expected)</option>
                    </select>
                </div>
                <div>
                    <Label className="text-xs text-slate-500">
                        Receipt (PDF / image)
                    </Label>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
                        onChange={(e) =>
                            setReceipt(e.target.files?.[0] ?? null)
                        }
                    />
                </div>
                <div className="col-span-2">
                    <Label className="text-xs text-slate-500">
                        Description
                    </Label>
                    <textarea
                        rows={3}
                        className={inputClass}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-cyan-600 hover:bg-cyan-700"
                >
                    {submitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Revenue
                </Button>
            </div>
        </div>
    );
}
