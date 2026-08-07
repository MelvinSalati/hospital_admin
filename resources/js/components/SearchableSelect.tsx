// components/SearchableSelect.tsx

import { Search, ChevronDown, X } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

interface Option {
    value: string | number;
    label: string;
    data?: any;
}

interface SearchableSelectProps {
    options: Option[];
    value?: Option | null;
    onChange?: (option: Option | null) => void;
    placeholder?: string;
    label?: string;
    isClearable?: boolean;
    disabled?: boolean;
    className?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Search...',
    label,
    isClearable = true,
    disabled = false,
    className = '',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const filtered = options.filter((opt) =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredOptions(filtered);
    }, [searchTerm, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: Option) => {
        onChange?.(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = () => {
        onChange?.(null);
        setSearchTerm('');
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {label && (
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            )}

            <div
                className={`flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 ${
                    disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:border-blue-500'
                }`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex-1 truncate">
                    {value ? (
                        <span className="text-slate-800 dark:text-slate-200">
                            {value.label}
                        </span>
                    ) : (
                        <span className="text-slate-400 dark:text-slate-500">
                            {placeholder}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isClearable && value && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-600"
                        >
                            <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    )}
                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-700">
                    <div className="border-b border-slate-200 p-2 dark:border-slate-600">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search options..."
                                className="w-full rounded border border-slate-200 py-1.5 pr-3 pl-8 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-600"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={String(option.value)}
                                    className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                                        value?.value === option.value
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
