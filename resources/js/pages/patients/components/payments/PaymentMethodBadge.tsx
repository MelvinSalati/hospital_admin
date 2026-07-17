// components/payments/PaymentMethodBadge.tsx
import {
    Banknote,
    CreditCard,
    Building,
    Receipt,
    Smartphone,
} from 'lucide-react';

const METHOD_CONFIG: Record<
    string,
    { icon: any; color: string; label: string }
> = {
    cash: { icon: Banknote, color: 'green', label: 'Cash' },
    card: { icon: CreditCard, color: 'blue', label: 'Card' },
    insurance: { icon: Building, color: 'purple', label: 'Insurance' },
    bank_transfer: { icon: Receipt, color: 'orange', label: 'Bank Transfer' },
    mobile_money: { icon: Smartphone, color: 'teal', label: 'Mobile Money' },
};

export default function PaymentMethodBadge({ method }: { method: string }) {
    const config = METHOD_CONFIG[method] || METHOD_CONFIG.cash;
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-${config.color}-100 text-${config.color}-700`}
        >
            <Icon className="h-3 w-3" />
            {config.label}
        </span>
    );
}
