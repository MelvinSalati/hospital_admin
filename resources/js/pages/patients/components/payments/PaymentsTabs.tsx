// components/payments/PaymentsTabs.tsx
import { FileText, Receipt, Wallet } from 'lucide-react';

const TABS = [
    { key: 'Invoices', icon: FileText, label: 'Invoices' },
    { key: 'Payment History', icon: Receipt, label: 'History' },
    { key: 'Payment Methods', icon: Wallet, label: 'Methods' },
];

interface PaymentsTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    invoiceCount?: number;
    methodCount?: number;
}

export default function PaymentsTabs({
    activeTab,
    onTabChange,
    invoiceCount = 0,
    methodCount = 0,
}: PaymentsTabsProps) {
    return (
        <div className="mb-3 border-b border-gray-200">
            <div className="flex  gap-0.5">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    const count =
                        tab.key === 'Invoices'
                            ? invoiceCount
                            : tab.key === 'Payment Methods'
                              ? methodCount
                              : 0;

                    return (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key)}
                            className={`relative flex items-center gap-1.5 px-5 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                            {count > 0 && (
                                <span
                                    className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                                        isActive
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
