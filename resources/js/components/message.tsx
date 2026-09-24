import { AlertCircle } from 'lucide-react';

interface MessageProps {
    message: string;
    title?: string;
}

export default function Message({
    message,
    title = 'Information',
}: MessageProps) {
    return (
        <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-2 text-slate-800">
            <div className="mt-0.5 shrink-0">
                <AlertCircle size={38} className="h-10 w-10 text-blue-600" />
            </div>

            <div className="space-y-1">
                <p className="text-2xl font-bold">{title}</p>

                <p className="text-sm leading-6 text-blue-700">{message}</p>
            </div>
        </div>
    );
}
