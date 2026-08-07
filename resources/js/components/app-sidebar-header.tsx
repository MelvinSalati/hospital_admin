// resources/js/components/AppSidebarHeader.tsx
import { usePage, router } from '@inertiajs/react';
import {
    User,
    LogOut,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Notifications } from './notifications';

export default function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { props } = usePage();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-3">
                <Notifications />
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 rounded-full focus:ring-2 focus:ring-sidebar-ring focus:outline-none">
                            <Avatar className="h-9 w-9 ring-2 ring-violet-200 dark:ring-violet-800/50">
                                <AvatarImage src="/avatars/user.jpg" alt="User" />
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-semibold text-white">
                                    {props.auth.user?.name?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                                {props.auth.user?.name || 'User'}
                            </span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                        <DropdownMenuLabel className="text-center font-semibold">
                            Manage Account
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => router.visit('/profile')}
                            className="mt-2 cursor-pointer rounded-lg"
                        >
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile manager</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => router.post('/logout')}
                            className="mt-1 mb-2 cursor-pointer rounded-lg text-red-500 focus:text-red-500"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Logout</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}