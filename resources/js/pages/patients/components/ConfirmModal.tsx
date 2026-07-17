import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'default' | 'destructive';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmVariant = 'destructive',
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-w-md rounded-lg bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-center gap-3">
                    <div
                        className={`rounded-full p-2 ${confirmVariant === 'destructive' ? 'bg-red-100' : 'bg-amber-100'}`}
                    >
                        <AlertTriangle
                            className={`h-5 w-5 ${confirmVariant === 'destructive' ? 'text-red-600' : 'text-amber-600'}`}
                        />
                    </div>
                    <h3 className="text-base font-semibold">{title}</h3>
                </div>
                <p className="mb-5 text-sm text-gray-600">{message}</p>
                <div className="flex justify-end gap-2">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className={`text-sm ${confirmVariant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
