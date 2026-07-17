// components/dashboard/tables/DataTable.tsx
import React from 'react';
import { DashboardCard } from '../cards/DashboardCard';

interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    title?: string;
    icon?: string;
    action?: { label: string; href: string };
    onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id?: string | number }>({
    data,
    columns,
    title,
    icon,
    action,
    onRowClick
}: DataTableProps<T>) {
    return (
        <DashboardCard title={title} icon={icon} action={action}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="text-left text-sm text-gray-500 dark:text-gray-400">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key as string} className="pb-3 font-medium">
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {data.map((item, index) => (
                            <tr
                                key={item.id || index}
                                onClick={() => onRowClick?.(item)}
                                className={`border-b border-gray-100 last:border-0 dark:border-gray-700 ${
                                    onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''
                                }`}
                            >
                                {columns.map((column) => (
                                    <td key={column.key as string} className={`py-3 ${column.className || ''}`}>
                                        {column.render
                                            ? column.render(item)
                                            : (item[column.key as keyof T] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardCard>
    );
}