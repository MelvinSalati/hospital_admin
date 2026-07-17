// components/payments/LoadingState.tsx
import { Loader2 } from 'lucide-react';

export default function LoadingState() {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm text-gray-500">Loading...</p>
            </div>
        </div>
    );
}
