// components/payments/StatusBadge.tsx

export default function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon?: string }> =
        {
            paid: {
                bg: 'bg-green-100 dark:bg-green-900/30',
                text: 'text-green-700 dark:text-green-300',
            },
            unpaid: {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-300',
            },
            pending: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                text: 'text-yellow-700 dark:text-yellow-300',
            },
            overdue: {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-300',
            },
            partial: {
                bg: 'bg-amber-100 dark:bg-amber-900/30',
                text: 'text-amber-700 dark:text-amber-300',
            },
            draft: {
                bg: 'bg-gray-100 dark:bg-gray-800',
                text: 'text-gray-600 dark:text-gray-400',
            },
            sent: {
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                text: 'text-blue-700 dark:text-blue-300',
            },
            cancelled: {
                bg: 'bg-gray-100 dark:bg-gray-800',
                text: 'text-gray-500 dark:text-gray-400',
            },
        };

    const { bg, text } = config[status] || config.draft;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${bg} ${text}`}
        >
            {status || 'Unknown'}
        </span>
    );
}
