// components/profile-dropdown.tsx (updated)
import React, { useState, useRef, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    User, 
    Settings, 
    LogOut, 
    ChevronDown
} from 'lucide-react';
import { NotificationsPanel } from './notifications-panel';

interface ProfileDropdownProps {
    user: {
        name: string;
        email: string;
        avatar?: string;
        role: string;
    };
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex items-center gap-3">
            {/* Notifications Panel */}
            <NotificationsPanel />

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <div className="flex items-center gap-2">
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-sm font-medium text-white">
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="hidden text-left md:block">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700 md:hidden">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>

                        <Link
                            href="/profile"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                            onClick={() => setIsOpen(false)}
                        >
                            <User className="h-4 w-4" />
                            Your Profile
                        </Link>

                        <Link
                            href="/settings"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>

                        <div className="border-t border-gray-200 dark:border-gray-700"></div>

                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                            onClick={() => setIsOpen(false)}
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};