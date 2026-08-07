import { Link } from '@inertiajs/react';
import {
    ArrowLeftCircle,
    ChevronLeft,
    Plus,
    RefreshCw,
    Download,
    Printer,
    Filter,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface ActionButton {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
    href?: string;
    variant?:
        | 'primary'
        | 'secondary'
        | 'success'
        | 'danger'
        | 'warning'
        | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    icon?: ReactNode; // Added icon prop
    iconClassName?: string; // Optional className for icon customization
    backUrl?: string;
    backLabel?: string;
    actions?: ActionButton[];
    children?: ReactNode;
    className?: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
}

export default function PageHeader({
    title,
    subtitle,
    icon,
    iconClassName = 'h-8 w-8 mr-3 text-blue-600 dark:text-blue-400', // Default size and styling
    backUrl,
    backLabel = 'Back',
    actions = [],
    children,
    className = '',
    breadcrumbs = [],
}: PageHeaderProps) {
    // Button variant styles
    const variantStyles = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary:
            'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
        success:
            'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        warning:
            'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
        outline:
            'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
    };

    const sizeStyles = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const renderActionButton = (action: ActionButton, index: number) => {
        const variant = action.variant || 'primary';
        const size = action.size || 'md';

        const buttonContent = (
            <>
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
                {action.loading && (
                    <svg
                        className="ml-2 h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
            </>
        );

        const className = `
            inline-flex items-center rounded-lg font-medium transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            ${action.disabled || action.loading ? 'opacity-50 cursor-not-allowed' : ''}
            ${action.className || ''}
        `;

        if (action.href) {
            return (
                <Link key={index} href={action.href} className={className}>
                    {buttonContent}
                </Link>
            );
        }

        return (
            <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={className}
            >
                {buttonContent}
            </button>
        );
    };

    return (
        <div
            className={`mb-4 w-full rounded-lg bg-white p-3 dark:bg-slate-800 ${className}`}
        >
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
                <nav className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    <ol className="flex items-center space-x-2">
                        {breadcrumbs.map((crumb, index) => (
                            <li key={index} className="flex items-center">
                                {index > 0 && (
                                    <span className="mx-2 text-gray-300 dark:text-gray-600">
                                        /
                                    </span>
                                )}
                                {crumb.href ? (
                                    <Link
                                        href={crumb.href}
                                        className="hover:text-blue-600 dark:hover:text-blue-400"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {crumb.label}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            )}

            {/* Header Content */}
            <div className="m-2 flex flex-wrap items-start justify-between gap-4">
                {/* Left side - Back link, Icon, and Title */}
                <div className="min-w-[200px] flex-1">
                    {backUrl && (
                        <div className="mb-2">
                            <Link
                                href={backUrl}
                                className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                                <ChevronLeft className="h-4 w-4 text-blue-600" />
                                {backLabel}
                            </Link>
                        </div>
                    )}

                    {/* Title with Icon */}
                    {(title || icon) && (
                        <div className="flex items-center">
                            {icon && (
                                <span className={iconClassName}>{icon}</span>
                            )}
                            <div>
                                {title && (
                                    <h1 className="text-2xl font-bold text-blue-800 dark:text-gray-100">
                                        {title}
                                    </h1>
                                )}
                                {subtitle && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side - Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {actions.map((action, index) =>
                        renderActionButton(action, index),
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}
