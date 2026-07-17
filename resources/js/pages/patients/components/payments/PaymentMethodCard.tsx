// components/payments/PaymentMethodCard.tsx
import {
    Shield,
    Smartphone,
    CreditCard,
    Landmark,
    Star,
    Eye,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ICON_MAP: Record<string, any> = {
    insurance: Shield,
    mobile_money: Smartphone,
    bank_card: CreditCard,
    bank_account: Landmark,
};

interface PaymentMethodCardProps {
    method: any;
    onSetDefault: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (method: any) => void;
}

export default function PaymentMethodCard({
    method,
    onSetDefault,
    onDelete,
    onEdit,
}: PaymentMethodCardProps) {
    const Icon = ICON_MAP[method.type] || Wallet;

    const getDetails = () => {
        switch (method.type) {
            case 'insurance':
                return `${method.provider} • ${method.scheme_name || 'N/A'}`;
            case 'mobile_money':
                return `${method.provider} • ${method.phone_number}`;
            case 'bank_card':
                return `•••• ${method.card_number?.slice(-4)}`;
            case 'bank_account':
                return `${method.provider} • ••••${method.account_number?.slice(-4)}`;
            default:
                return method.provider;
        }
    };

    const getSubDetails = () => {
        switch (method.type) {
            case 'insurance':
                return method.policy_number
                    ? `Policy: ${method.policy_number}`
                    : null;
            case 'bank_card':
                return method.expiry_date
                    ? `Expires: ${method.expiry_date}`
                    : null;
            default:
                return null;
        }
    };

    return (
        <div
            className={`rounded-lg border p-3 transition-all ${method.is_default ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div
                        className={`rounded-lg p-2 ${method.is_default ? 'bg-blue-100' : 'bg-gray-100'}`}
                    >
                        <Icon
                            className={`h-5 w-5 ${method.is_default ? 'text-blue-600' : 'text-gray-500'}`}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                                {method.type.replace('_', ' ')}
                            </span>
                            {method.is_default && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                                    <Star className="h-2.5 w-2.5" /> Default
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600">{getDetails()}</p>
                        {getSubDetails() && (
                            <p className="text-xs text-gray-400">
                                {getSubDetails()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-0.5">
                    {!method.is_default && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSetDefault(method.id)}
                            className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700"
                        >
                            <Star className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(method)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(method.id)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
