// components/payments/PaymentsHeader.tsx
import { Link } from '@inertiajs/react';
import { ChevronLeft, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentsHeaderProps {
    patientId: string;
    patientName?: string;
    activeTab: string;
    onRefresh: () => void;
    onAddMethod?: () => void;
}

export default function PaymentsHeader({
    patientId,
    patientName,
    activeTab,
    onRefresh,
    onAddMethod,
}: PaymentsHeaderProps) {
    return (
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Link
                    href={`/patients/${patientId}`}
                    className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Link>
                {patientName && (
                    <span className="text-sm text-gray-400">|</span>
                )}
                {patientName && (
                    <span className="text-sm text-gray-600">
                        <span className="font-medium">{patientName}</span>
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                {activeTab === 'Payment Methods' && onAddMethod && (
                    <Button
                        size="sm"
                        onClick={onAddMethod}
                        className="h-8 gap-1.5 text-sm"
                    >
                        <Plus className="h-3.5 w-3.5" /> Add Method
                    </Button>
                )}
                <Button
                    size="sm"
                    onClick={onRefresh}
                    variant="outline"
                    className="h-8 gap-1.5 text-sm"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
