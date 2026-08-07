import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Link } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
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
    ArrowRightLeft,
    ArrowLeftCircle,
    PackageMinus,
    PackageCheck,
    Boxes,
    PlusIcon,
    ClipboardCheck,
    History,
    CogIcon,
    CheckCircle2Icon,
    UserCircle,
    FileTextIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import AppLogo from '@/components/app-logo';
import { Badge } from '@/components/ui/badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import routes from '@/constants/routes';
import type { NavItem } from '@/types';

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
        {
            title: 'Dashboard',
            href: '/admin/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'User Management',
            href: '/admin/manage-users',
            icon: Users,
            children: [
                {
                    title: 'Users',
                    href: '/admin/manage-users',
                },
                {
                    title: 'Roles & Permissions',
                    href: '/admin/roles',
                },
            ],
        },
        {
            title: 'Human Resources',
            href: '/admin/hr',
            icon: UserCircle,
        },
        {
            title: 'Manage Budgets',
            href: '/admin/budgets',
            icon: DollarSignIcon,
        },
        {
            title: 'Purchase Requistions',
            href: '/admin/purchase-requisitions',
            icon: BoxesIcon,
        },
        {
            title: 'Purchase Orders',
            href: '/admin/purchase-orders',
            icon: FileTextIcon,
        },
        {
            title: 'Inventory Oversight',
            href: '/admin/inventory',
            icon: BoxesIcon,
        },
        {
            title: 'Approvals',
            href: '/admin/approvals',
            icon: CheckCircle2Icon,
            children: [
                {
                    title: 'Purchase Requisitions',
                    href: '/admin/approvals/purchase-requisitions',
                },
                {
                    title: 'Purchase Orders',
                    href: '/admin/approvals/purchase-orders',
                },
                {
                    title: 'Stock Adjustments',
                    href: '/admin/approvals/stock-adjustments',
                },
                {
                    title: 'Refunds',
                    href: '/admin/approvals/refunds',
                },
            ],
        },
        {
            title: 'Reports',
            href: '/admin/reports',
            icon: BarChart3,
            children: [
                {
                    title: 'System Reports',
                    href: '/admin/reports/system',
                },
                {
                    title: 'Financial Reports',
                    href: '/admin/reports/financial',
                },
                {
                    title: 'Audit Reports',
                    href: '/admin/reports/audit',
                },
                {
                    title: 'Usage Analytics',
                    href: '/admin/reports/analytics',
                },
            ],
        },
        {
            title: 'Administration',
            href: '/admin/administration',
            icon: Building2,
            children: [
                {
                    title: 'Facilities',
                    href: '/admin/facilities',
                },
                {
                    title: 'Branches',
                    href: '/admin/branches',
                },
                {
                    title: 'Services',
                    href: '/admin/services',
                },
                {
                    title: 'Wards',
                    href: '/admin/wards',
                },
                {
                    title: 'Insurance Providers',
                    href: '/admin/insurance',
                },
            ],
        },
        {
            title: 'Configurations',
            href: '/admin/settings',
            icon: CogIcon,
            children: [
                {
                    title: 'General Settings',
                    href: '/admin/settings/general',
                },
                {
                    title: 'Billing Settings',
                    href: '/admin/settings/billing',
                },
                {
                    title: 'Number Sequences',
                    href: '/admin/settings/sequences',
                },
                {
                    title: 'Notifications',
                    href: '/admin/settings/notifications',
                },
                {
                    title: 'Integrations',
                    href: '/admin/settings/integrations',
                },
                {
                    title: 'Backup & Restore',
                    href: '/admin/settings/backup',
                },
                {
                    title: 'System Logs',
                    href: '/admin/settings/logs',
                },
            ],
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
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    bulkstore: [
        { title: 'Dashboard', href: '/bulkstore/dashboard', icon: LayoutGrid },
        { title: 'Products', href: '/bulkstore/products', icon: Barcode },
        {
            title: 'Stock Adjustments',
            href: '/bulkstore/adjustments',
            icon: Boxes,
        },
        {
            title: 'Receive Stock',
            href: '/bulkstore/receive',
            icon: PackageCheck,
        },
        {
            title: 'Stock Pricing',
            href: '/bulkstore/stock-pricing',
            icon: DollarSignIcon,
        },
        { title: 'Issue Stock', href: '/bulkstore/issues', icon: PackageMinus },
        { title: 'Returns', href: '/bulkstore/returns', icon: ArrowLeftCircle },
        {
            title: 'Transfers',
            href: '/bulkstore/transfers',
            icon: ArrowRightLeft,
        },
        {
            title: 'Purchase Orders',
            href: '/bulkstore/purchase-orders',
            icon: FileText,
        },
        {
            title: 'Purchase Requisitions',
            href: '/bulkstore/purchase-requisition',
            icon: FileText,
        },
        { title: 'Suppliers', href: '/bulkstore/suppliers', icon: Truck },
        { title: 'Batch Management', href: '/bulkstore/batches', icon: Boxes },
        {
            title: 'Expiry Tracking',
            href: '/bulkstore/expiry',
            icon: CalendarClock,
        },
        {
            title: 'Barcode Management',
            href: '/bulkstore/barcode-manage',
            icon: Barcode,
        },
        { title: 'Reports', href: '/bulkstore/reports', icon: BarChart3 },
        { title: 'Audit Trail', href: '/bulkstore/audit-trail', icon: History },
        {
            title: 'Configurations',
            href: '/bulkstore/module-settings',
            icon: Cog6ToothIcon,
        },
        {
            title: 'Account',
            href: `../../${routes.web.user.account}`,
            icon: UserSquare,
        },
    ],
    lab_technician: [
        { title: 'Dashboard', href: '/laboratory/dashboard', icon: LayoutGrid },
        { title: 'Queues', href: '/laboratory', icon: Users },
        {
            title: 'Processed',
            href: '/laboratory/processed',
            icon: ArrowRightCircleIcon,
        },
        { title: 'Orders', href: '/laboratory/orders', icon: ShoppingBagIcon },
        { title: 'Logistics', href: '/laboratory/logistics', icon: LayoutGrid },
        {
            title: 'Configurations',
            href: '/laboratory/manage-tests',
            icon: Cog6ToothIcon,
        },
        { title: 'Reports', href: '/laboratory/reports', icon: BarChart3 },
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

const ORDER_BADGE_CONFIG: Record<string, any> = {
    bulkstore: {
        countKey: 'bulkOrders',
        href: '/bulkstore/orders',
        titleMapping: {
            'Purchase Orders': 'bulkOrders',
            'Receive Stock': 'bulkOrders',
            'Issue Stock': 'bulkOrders',
        },
    },
    lab_technician: {
        countKey: 'labOrders',
        href: '/laboratory/orders',
        titleMapping: {
            Orders: 'labOrders',
        },
    },
    pharmacist: {
        countKey: 'pharmacyOrders',
        href: '/pharmacy/orders',
        titleMapping: {
            Queue: 'pharmacyOrders',
        },
    },
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

interface OrderCounts {
    bulkOrders: number;
    labOrders: number;
    pharmacyOrders: number;
    allOrders: number;
}

export default function AppSidebar() {
    const { props } = usePage();
    const [orderCounts, setOrderCounts] = useState<OrderCounts>({
        bulkOrders: 0,
        labOrders: 0,
        pharmacyOrders: 0,
        allOrders: 0,
    });
    const [isCollapsed, setIsCollapsed] = useState(false);

    let userRole =
        props.auth?.user?.profile?.roles ||
        props.auth?.profile?.role ||
        props.auth?.user?.role;

    if (Array.isArray(userRole)) {
        userRole = userRole[0];
    }

    const roles = props.auth?.user?.profile?.roles || [];

    // Fetch order counts - wrapped in try/catch to handle 404
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
                } else {
                    // Silent fail - don't show error for missing API
                    console.debug('Order counts API not available');
                }
            } catch (error) {
                // Silent fail for missing API
                console.debug('Order counts API not available');
            }
        };

        const relevantRoles = [
            'bulkstore',
            'lab_technician',
            'pharmacist',
            'admin',
            'receptionist',
            'humanresources',
            'accountant',
            '',
        ];
        if (roles.some((role) => relevantRoles.includes(role))) {
            fetchOrderCounts();
        }
    }, [roles]);

    // Role-based redirect
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
                !item.title.toLowerCase().includes('settings') &&
                !item.title.toLowerCase().includes('configurations'),
        ),
        settings: navItems.filter(
            (item) =>
                item.title.toLowerCase().includes('account') ||
                item.title.toLowerCase().includes('settings') ||
                item.title.toLowerCase().includes('configurations'),
        ),
    };

    const getOrderCountForItem = (itemTitle: string) => {
        const config = ORDER_BADGE_CONFIG[userRole as string];
        if (!config) return null;

        if (config.titleMapping && config.titleMapping[itemTitle]) {
            const countKey = config.titleMapping[itemTitle];
            return orderCounts[countKey as keyof OrderCounts];
        }

        if (['admin', 'receptionist'].includes(userRole as string)) {
            if (config.subSections && config.subSections[itemTitle]) {
                const countKey = config.subSections[itemTitle];
                return orderCounts[countKey as keyof OrderCounts];
            }
        }

        return null;
    };

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="font-poppins border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        >
            <SidebarHeader className="border-b border-gray-200 pb-2 dark:border-gray-700">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            {/* FIXED: Removed nested Link - AppLogo now handles the link */}
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 py-3">
                <div className="space-y-4">
                    {groupedItems.main.length > 0 && (
                        <div className="space-y-1">
                            {groupedItems.main.map((item) => {
                                const orderCount = getOrderCountForItem(
                                    item.title,
                                );
                                return (
                                    <Link
                                        key={item.title}
                                        href={item.href}
                                        className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon && (
                                                <item.icon className="h-4 w-4 text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                                            )}
                                            <span>{item.title}</span>
                                        </div>
                                        {orderCount !== null &&
                                            orderCount > 0 && (
                                                <Badge
                                                    variant="destructive"
                                                    className="ml-auto h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-xs font-medium text-white hover:bg-red-600"
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
                                <div className="space-y-1">
                                    {groupedItems.settings.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon && (
                                                    <item.icon className="h-4 w-4 text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                                                )}
                                                <span>{item.title}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t border-gray-200 pt-2 dark:border-gray-700">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {props.auth?.user?.name || 'Guest'}
                        </p>
                        <p className="text-[10px] text-gray-400 capitalize dark:text-gray-500">
                            {userRole || 'No Role'}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            router.post('/logout');
                        }}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
