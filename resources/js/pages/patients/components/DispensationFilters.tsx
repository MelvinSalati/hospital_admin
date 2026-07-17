import { Search } from 'lucide-react';

interface DispensationFiltersProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    filterStatus: string;
    onFilterChange: (status: string) => void;
}

export default function DispensationFilters({
    searchTerm,
    onSearchChange,
    filterStatus,
    onFilterChange,
}: DispensationFiltersProps) {
    const filters = [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Dispensed', value: 'dispensed' },
    ];

    return (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="max-w-md flex-1">
                <div className="relative">
                    <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by prescription number..."
                        value={searchTerm}
                        onChange={onSearchChange}
                        className="w-full rounded border py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex gap-1.5">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => onFilterChange(filter.value)}
                        className={`rounded px-3 py-1.5 text-xs transition-colors ${
                            filterStatus === filter.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
