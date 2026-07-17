// app-sidebar.tsx
import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    Users,
    UserPlus,
    CalendarClock,
    Stethoscope,
    HeartPulse,
    Pill,
    FlaskConical,
    Scan,
    Wallet,
    Receipt,
    Package,
    Truck,
    Settings,
    CreditCard,
    FileText,
    TrendingUp,
    Shield,
    Building2,
    BarChart3,
    Microscope,
    BarChart2,
    DollarSignIcon,
    Calendar1Icon,
    UserPlus2Icon,
    ThermometerIcon,
    BoxIcon,
    BoxesIcon,
    UserSquare,
    User2,
    PillBottle,
    BabyIcon,
    Scissors,
    EyeIcon,
    ShoppingBagIcon,
    ArrowLeftCircleIcon,
    ArrowRightCircleIcon,
    Barcode,
    LogOut,
} from 'lucide-react';

import AppLogo from '@/components/app-logo';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

import type { NavItem } from '@/types';
import routes from '@/constants/routes';
import { usePage, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component

// Define navigation items for each role with order counts
const roleNavItems: Record<string, NavItem[]> = {
    doctor: [
        {
            title: 'Dashboard',
            href: '/consultation/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Consultations',
            href: '/consultation/queue',
            icon: Stethoscope,
        },
        {
            title: 'Appointments',
            href: '/consultation/appointment',
            icon: CalendarClock,
        },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    admin: [
        { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid },
        { title: 'Manage Queues', href: '/reception/queues', icon: User2 },
        { title: 'Manage Users', href: '/admin/users', icon: Users },
        { title: 'Departments', href: '/departments', icon: Building2 },
        { title: 'System Settings', href: '/settings', icon: Settings },
        { title: 'Registry', href: '/reception/registry', icon: Users },
        { title: 'MCH', href: '/mch', icon: BabyIcon },
        { title: 'Theater', href: '/theater', icon: Scissors },
        { title: 'Opthamology', href: '/opthamology', icon: EyeIcon },
        { title: 'Dental', href: '/dental', icon: Scissors },
        {
            title: 'Add Patient',
            href: '/reception/create',
            icon: UserPlus2Icon,
        },
        {
            title: 'Appointments',
            href: '/reception/appointments',
            icon: Calendar1Icon,
        },
        {
            title: 'Reception-Payments',
            href: '/reception/bills',
            icon: DollarSignIcon,
        },
        { title: 'Reports', href: '/reception', icon: BarChart2 },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
        {
            title: 'Consultations',
            href: '/consultation/queue',
            icon: Stethoscope,
        },
        { title: 'Laboratory', href: '/laboratory', icon: FlaskConical },
        {
            title: 'Bulk store - Lab',
            href: '/laboratory/bulk-store',
            icon: BoxesIcon,
        },
        { title: 'Vitals', href: '/vitals', icon: HeartPulse },
        { title: 'Admissions', href: '/admissions', icon: UserPlus },
        { title: 'Nurses Bay', href: '/nurses/queue', icon: ThermometerIcon },
        { title: 'Patients', href: '/patients', icon: Users },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    nurse: [
        { title: 'Dashboard', href: '/nurses/dashboard', icon: LayoutGrid },
        { title: 'Nurses Bay', href: '/nurses/queue', icon: ThermometerIcon },
        { title: 'Vitals', href: '/vitals', icon: HeartPulse },
        { title: 'Admissions', href: '/admissions', icon: UserPlus },
        { title: 'Patients', href: '/patients', icon: Users },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    receptionist: [
        { title: 'Dashboard', href: '/reception/dashboard', icon: LayoutGrid },
        { title: 'Registry', href: '/reception/registry', icon: Users },
        { title: 'Manage Queues', href: '/reception/queue', icon: User2 },
        {
            title: 'Add Patient',
            href: '/reception/create',
            icon: UserPlus2Icon,
        },
        {
            title: 'Appointments',
            href: '/reception/appointments',
            icon: Calendar1Icon,
        },
        {
            title: 'Reception-Payments',
            href: '/reception/bills',
            icon: DollarSignIcon,
        },
        { title: 'Reports', href: '/reception', icon: BarChart2 },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
        {
            title: 'Consultations',
            href: '/consultation/queue',
            icon: Stethoscope,
        },
        { title: 'Nurses Bay', href: '/nurses/queue', icon: ThermometerIcon },
        { title: 'Vitals', href: '/vitals', icon: HeartPulse },
        { title: 'Admissions', href: '/admissions', icon: UserPlus },
        { title: 'Patients', href: '/patients', icon: Users },
        { title: 'Laboratory', href: '/laboratory', icon: FlaskConical },
        {
            title: 'Bulk store - Lab',
            href: '/laboratory/bulk-store',
            icon: BoxesIcon,
        },
    ],
    pharmacist: [
        { title: 'Dashboard', href: '/pharmacy/dashboard', icon: LayoutGrid },
        { title: 'Queue', href: '/pharmacy', icon: Users },
        { title: 'Products', href: '/pharmacy/order-products', icon: Barcode },
        { title: 'Dispensed', href: '/pharmacy/dispensed', icon: Pill },
        // { title: 'Products', href: '/pharmacy/logistics', icon: Truck },
        // { title: 'Suppliers', href: '/pharmacy/suppliers', icon: Truck },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    bulkstore: [
        { title: 'Dashboard', href: '/bulkstore/dashboard', icon: LayoutGrid },
        { title: 'Products', href: '/pharmacy/logistics', icon: Barcode },
        { title: 'Orders', href: '/bulkstore/orders', icon: Pill },
        { title: 'Issues', href: '/bulkstore/issues', icon: LogOut },
        { title: 'Suppliers', href: '/bulkstore/suppliers', icon: Truck },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    lab_technician: [
        { title: 'Dashboard', href: 'laboratory/dashboard', icon: LayoutGrid },
        { title: 'Queues', href: '/laboratory', icon: Users },
        {
            title: 'Processed',
            href: '/laboratory/processed',
            icon: ArrowRightCircleIcon,
        },
        { title: 'Orders', href: '/laboratory/orders', icon: ShoppingBagIcon },
        {
            title: 'Logistics',
            href: '/laboratory/logistics',
            icon: LayoutGrid,
        },
        {
            title: 'Configurations',
            href: '../../laboratory/manage-tests',
            icon: Cog6ToothIcon,
        },
        {
            title: 'Reports',
            href: '../../laboratory/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    radiologist: [
        { title: 'Radiology', href: '/radiology', icon: Scan },
        { title: 'Ultrasound', href: '/ultrasound', icon: Microscope },
        { title: 'X-Ray', href: '/xray', icon: Scan },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    accountant: [
        { title: 'Patient Billing', href: '/billing', icon: Receipt },
        { title: 'Invoices', href: '/invoices', icon: FileText },
        { title: 'Revenue', href: '/finance/revenue', icon: TrendingUp },
        {
            title: 'Daily Collections',
            href: '/finance/collections',
            icon: Wallet,
        },
        { title: 'Expenses', href: '/finance/expenses', icon: Receipt },
        {
            title: 'Financial Reports',
            href: '/reports/financial',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    bulk_store_manager: [
        { title: 'Bulk Store', href: '/bulkstore/store', icon: BoxIcon },
        { title: 'Suppliers', href: '/suppliers', icon: Truck },
        { title: 'Stock Expiry', href: '/inventory/expiry', icon: Package },
        { title: 'Insurance Claims', href: '/insurance', icon: Shield },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
};

const commonNavItems: NavItem[] = [];

// Define which roles should show order badges and for which sections
const ORDER_BADGE_CONFIG = {
    bulkstore: { countKey: 'bulkOrders', href: '/bulkstore/orders' },
    lab_technician: { countKey: 'labOrders', href: '/laboratory/orders' },
    pharmacist: { countKey: 'pharmacyOrders', href: '/pharmacy/orders' },
    admin: {
        countKey: 'allOrders',
        href: '/admin/orders',
        subSections: {
            'Bulk store - Lab': 'bulkOrders',
            Laboratory: 'labOrders',
        },
    },
    receptionist: {
        countKey: 'allOrders',
        subSections: {
            'Bulk store - Lab': 'bulkOrders',
            Laboratory: 'labOrders',
        },
    },
};

export function AppSidebar() {
    const { props } = usePage();
    const [orderCounts, setOrderCounts] = useState({
        bulkOrders: 0,
        labOrders: 0,
        pharmacyOrders: 0,
        allOrders: 0,
    });

    let userRole =
        props.auth?.user?.profile?.roles ||
        props.auth?.profile?.role ||
        props.auth?.user?.role;

    if (Array.isArray(userRole)) {
        userRole = userRole[0];
    }

    const roles = props.auth?.user?.profile?.roles || [];

    // Fetch order counts based on user role
    useEffect(() => {
        const fetchOrderCounts = async () => {
            try {
                const response = await fetch('/api/order-counts', {
                    headers: {
                        'X-CSRF-TOKEN':
                            document
                                .querySelector('meta[name="csrf-token"]')
                                ?.getAttribute('content') || '',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setOrderCounts({
                        bulkOrders: data.bulkOrders || 0,
                        labOrders: data.labOrders || 0,
                        pharmacyOrders: data.pharmacyOrders || 0,
                        allOrders: data.allOrders || 0,
                    });
                }
            } catch (error) {
                console.error('Error fetching order counts:', error);
            }
        };

        // Fetch counts if user has relevant roles
        const relevantRoles = [
            'bulkstore',
            'lab_technician',
            'pharmacist',
            'admin',
            'receptionist',
        ];
        if (roles.some((role) => relevantRoles.includes(role))) {
            fetchOrderCounts();
        }
    }, [roles]);

    useEffect(() => {
        if (roles.length === 0) return;

        const currentPath = window.location.pathname;

        if (
            roles.includes('nurse') &&
            (currentPath === '/' || currentPath === '/dashboard')
        ) {
            router.visit('/nurses/dashboard');
        } else if (
            roles.includes('doctor') &&
            (currentPath === '/' || currentPath === '/dashboard')
        ) {
            router.visit('/consultation/dashboard');
        } else if (
            roles.includes('admin') &&
            (currentPath === '/' || currentPath === '/dashboard')
        ) {
            router.visit('/admin/dashboard');
        }
    }, [roles]);

    const roleSpecificItems = roleNavItems[userRole as string] || [];
    const navItems = [...commonNavItems, ...roleSpecificItems];

    const groupedItems = {
        main: navItems.filter(
            (item) =>
                !item.title.toLowerCase().includes('account') &&
                !item.title.toLowerCase().includes('settings'),
        ),
        settings: navItems.filter(
            (item) =>
                item.title.toLowerCase().includes('account') ||
                item.title.toLowerCase().includes('settings'),
        ),
    };

    // Function to get order count for a specific item
    const getOrderCountForItem = (itemTitle: string) => {
        const config = ORDER_BADGE_CONFIG[userRole as string];
        if (!config) return null;

        // For bulkstore users, show badge on Orders
        if (userRole === 'bulkstore' && itemTitle === 'Orders') {
            return orderCounts.bulkOrders;
        }

        // For lab technicians, show badge on Orders
        if (userRole === 'lab_technician' && itemTitle === 'Orders') {
            return orderCounts.labOrders;
        }

        // For pharmacists, show badge on Pharmacy
        if (userRole === 'pharmacist' && itemTitle === 'Pharmacy') {
            return orderCounts.pharmacyOrders;
        }

        // For admin and receptionist, show badges on specific sub-sections
        if (['admin', 'receptionist'].includes(userRole as string)) {
            if (config.subSections && config.subSections[itemTitle]) {
                const countKey = config.subSections[itemTitle];
                return orderCounts[countKey as keyof typeof orderCounts];
            }
        }

        return null;
    };

    return (
        <Sidebar collapsible="icon" variant="inset" className="font-poppins">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href="/dashboard"
                                prefetch
                                className="flex items-center gap-2"
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <div className="space-y-4 p-2">
                    {groupedItems.main.length > 0 && (
                        <div>
                            {groupedItems.main.map((item) => {
                                const orderCount = getOrderCountForItem(
                                    item.title,
                                );
                                return (
                                    <Link
                                        key={item.title}
                                        href={item.href}
                                        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm !text-gray-600 !no-underline hover:!bg-gray-600 hover:!text-white hover:!no-underline dark:!text-gray-400 dark:hover:!bg-gray-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon && (
                                                <item.icon className="h-4 w-4" />
                                            )}
                                            <span>{item.title}</span>
                                        </div>
                                        {orderCount !== null &&
                                            orderCount > 0 && (
                                                <Badge
                                                    variant="destructive"
                                                    className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-xs font-medium text-white"
                                                >
                                                    {orderCount}
                                                </Badge>
                                            )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {groupedItems.settings.length > 0 &&
                        groupedItems.main.length > 0 && (
                            <>
                                <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                                <div>
                                    {groupedItems.settings.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm !text-gray-600 !no-underline hover:!bg-gray-600 hover:!text-white hover:!no-underline dark:!text-gray-400 dark:hover:!bg-gray-800"
                                        >
                                            {item.icon && (
                                                <item.icon className="h-4 w-4" />
                                            )}
                                            <span>{item.title}</span>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                </div>
            </SidebarContent>

            <SidebarFooter />
        </Sidebar>
    );
}
