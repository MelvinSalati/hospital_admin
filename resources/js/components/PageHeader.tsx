import { ArrowLeftCircle, ChevronLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    backUrl?: string;
    backLabel?: string;
}

export default function PageHeader({
    title,
    subtitle,
    backUrl,
    backLabel = 'Back',
}: PageHeaderProps) {
    return (
        <div className="p-4">
            {/* Back Link */}
            <div className="flex items-center gap-2 border-b-1 py-2 text-sm text-gray-600">
                <ArrowLeftCircle className="h-6 w-6" />
                <Link href={backUrl} className="transition-colors">
                    <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                    <p className="text-sm text-gray-400">{subtitle}</p>
                </Link>
            </div>
        </div>
    );
}
