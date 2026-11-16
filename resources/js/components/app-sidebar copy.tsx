import { Link, usePage, router } from '@inertiajs/react';
import {
    ArrowLeftCircle,
    ArrowRightCircle,
    BarChart2,
    BarChart3,
    Barcode,
    Baby,
    Boxes,
    Building2,
    CalendarClock,
    CalendarDays,
    ClipboardCheck,
    Cog,
    CreditCard,
    DollarSign,
    Download,
    Eye,
    FileText,
    HeartPulse,
    LayoutGrid,
    LogOut,
    PackageCheck,
    PackageMinus,
    Pill,
    PillBottle,
    PlusCircle,
    Receipt,
    Search,
    Shield,
    ShoppingBag,
    Scissors,
    Stethoscope,
    TrendingUp,
    Truck,
    UserCircle,
    UserPlus,
    UserSquare,
    Users,
    Wallet,
    TagIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface OrderCounts {
    bulkOrders: number;
    labOrders: number;
    pharmacyOrders: number;
    allOrders: number;
}

interface OrderBadgeConfig {
    countKey: keyof OrderCounts;
    href: string;
    titleMapping?: Record<string, keyof OrderCounts>;
    subSections?: Record<string, keyof OrderCounts>;
}

interface DepartmentHrefRule {
    match: (item: NavItem) => boolean;
    build: (item: NavItem, departmentId: string | number | null) => string;
}

interface AuthUser {
    id?: number;
    name?: string;
    role?: string;
    profile?: {
        role?: string;
        roles?: string[] | string;
        department_id?: string | number | null;
        departmentId?: string | number | null;
    };
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const ACCOUNT_HREF = `../../${routes.web.user.account}`;

const DEFAULT_REDIRECT = '/reception/dashboard';

const SETTINGS_SECTION_KEYWORDS = ['account', 'settings', 'configurations'];

const ORDER_COUNT_ROLES = [
    'bulkstore',
    'lab_technician',
    'pharmacist',
    'admin',
    'receptionist',
    'humanresources',
    'accountant',
];

/* -------------------------------------------------------------------------- */
/* ROLE NAVIGATION                                                            */
/* -------------------------------------------------------------------------- */

const roleNavItems: Record<string, NavItem[]> = {
    doctor: [
        {
            title: 'Dashboard',
            href: '/consultation/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Search',
            href: '/reception/registry',
            icon: Search,
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
            href: ACCOUNT_HREF,
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
            title: 'Manage Budgets',
            href: '/admin/budgets',
            icon: DollarSign,
        },
        {
            title: 'Purchase Requisitions',
            href: '/admin/purchase-requisitions',
            icon: Boxes,
        },
        {
            title: 'Purchase Orders',
            href: '/admin/purchase-orders',
            icon: FileText,
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
        // {
        //     title: 'Administration',
        //     href: '/admin/settings',
        //     icon: Building2,
        //     children: [
        //         {
        //             title: 'Facilities',
        //             href: '/admin/facilities',
        //         },
        //         {
        //             title: 'Branches',
        //             href: '/admin/branches',
        //         },
        //         {
        //             title: 'Services',
        //             href: '/admin/services',
        //         },
        //         {
        //             title: 'Wards',
        //             href: '/admin/wards',
        //         },
        //         {
        //             title: 'Insurance Providers',
        //             href: '/admin/insurance',
        //         },
        //     ],
        // },
    ],

    nurse: [
        {
            title: 'Dashboard',
            href: '/nurses/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Search',
            href: '/nurses/registry',
            icon: Search,
        },
        {
            title: 'Appointments',
            href: '/nurses/appointments',
            icon: CalendarDays,
        },
        {
            title: 'Queue & Check-in',
            href: '/nurses/queue',
            icon: ClipboardCheck,
        },
        {
            title: 'In Patient',
            href: '/nurses/in-patient',
            icon: Stethoscope,
        },
        {
            title: 'Treatment Room',
            href: '/nurses/treatment-room',
            icon: PillBottle,
        },
        {
            title: 'Bulk Store',
            href: '/nurses/bulk-store',
            icon: Boxes,
        },
        {
            title: 'Users',
            href: '/nurses/user-department',
            icon: UserPlus,
        },
        {
            title: 'Reports',
            href: '/nurses/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: '/users/manage-account',
            icon: UserCircle,
        },
    ],

    receptionist: [
        {
            title: 'Dashboard',
            href: '/reception/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Search',
            href: '/reception/registry',
            icon: Search,
        },
        {
            title: 'Add Patient',
            href: '/reception/create',
            icon: UserPlus,
        },
        {
            title: 'Appointments',
            href: '/reception/appointments',
            icon: CalendarDays,
        },
        {
            title: 'Queue & Check-in',
            href: '/reception/queue',
            icon: ClipboardCheck,
        },
        {
            title: 'View Queues',
            href: '/reception/queues',
            icon: Users,
        },
        {
            title: 'Visits',
            href: '/reception/visits',
            icon: Stethoscope,
        },
        {
            title: 'Billing',
            href: '/reception/bills',
            icon: DollarSign,
        },
        {
            title: 'Payments',
            href: '/reception/payments',
            icon: CreditCard,
        },
        {
            title: 'Insurance & Schemes',
            href: '/reception/insurance',
            icon: Shield,
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
            title: 'Add User',
            href: '/user/create',
            icon: PlusCircle,
        },
        {
            title: 'Reports',
            href: '/reception/reports',
            icon: BarChart2,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    pharmacist: [
        {
            title: 'Dashboard',
            href: '/pharmacy/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Prescriptions',
            href: '/pharmacy/prescriptions',
            icon: Pill,
        },
        {
            title: 'Bulk Store',
            href: '/pharmacy/bulk-orders',
            icon: Barcode,
        },
        {
            title: 'Dispensed',
            href: '/pharmacy/dispensed',
            icon: Pill,
        },
        {
            title: 'Manage Products',
            href: '/pharmacy/stock-monitoring',
            icon: Boxes,
        },
        {
            title: 'Reports',
            href: '/pharmacy/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    maternal_child_health: [
        {
            title: 'Dashboard',
            href: '/maternal-child-health/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Appointments',
            href: '/maternal-child-health/appointments',
            icon: CalendarClock,
        },
        {
            title: 'Queue',
            href: '/maternal-child-health/queue',
            icon: Users,
        },
        {
            title: 'Attended',
            href: '/maternal-child-health/processed',
            icon: ClipboardCheck,
        },
        {
            title: 'Bulk Store',
            href: '/maternal-child-health/bulk-orders',
            icon: Barcode,
        },
        {
            title: 'Reports',
            href: '/maternal-child-health/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    theatre: [
        {
            title: 'Dashboard',
            href: '/theatre/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Appointments',
            href: '/theatre/schedule',
            icon: CalendarClock,
        },
        {
            title: 'Theatre Queue',
            href: '/theatre/queue',
            icon: Users,
        },

        {
            title: 'Manage Billables',
            href: '/theatre',
            icon: Barcode,
        },

        {
            title: 'Bulk Store',
            href: '/theatre/bulk-orders',
            icon: Barcode,
        },
        {
            title: 'Reports',
            href: '/theatre/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    dental: [
        {
            title: 'Dashboard',
            href: '/dental/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Appointments',
            href: '/dental/appointments',
            icon: CalendarClock,
        },
        {
            title: 'Manage Queue',
            href: '/dental/queue',
            icon: Users,
        },

        {
            title: 'Manage Billables',
            href: '/dental/billables',
            icon: ClipboardCheck,
        },
        {
            title: 'Bulk Store',
            href: '/dental/bulk-orders',
            icon: Barcode,
        },
        {
            title: 'Reports',
            href: '/dental/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    // Keep this spelling consistent with the existing Laravel route prefix.
    opthalmology: [
        {
            title: 'Dashboard',
            href: '/opthalmology/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Appointments',
            href: '/opthalmology/appointments',
            icon: CalendarClock,
        },
        {
            title: 'Manage Queue',
            href: '/opthalmology/queue',
            icon: Users,
        },
        // {
        //     title: 'Eye Examinations',
        //     href: '/opthalmology/examinations',
        //     icon: Eye,
        // },
        // {
        //     title: 'Procedures',
        //     href: '/opthalmology/procedures',
        //     icon: Stethoscope,
        // },
        // {
        //     title: 'Processed',
        //     href: '/opthalmology/processed',
        //     icon: ClipboardCheck,
        // },
        {
            title: 'Bulk Store',
            href: '/opthalmology/bulk-orders',
            icon: Barcode,
        },
        {
            title: 'Manage Billables',
            href: '/billables/department', // lowercase, more consistent
            icon: TagIcon,
        },
        {
            title: 'Reports',
            href: '/opthalmology/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    bulkstore: [
        {
            title: 'Dashboard',
            href: '/bulkstore/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Products',
            href: '/bulkstore/products',
            icon: Barcode,
        },
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
            title: 'Goods Received Note',
            href: '/bulkstore/goods-received-note',
            icon: Download,
        },
        {
            title: 'Stock Pricing',
            href: '/bulkstore/stock-pricing',
            icon: DollarSign,
        },
        {
            title: 'Issue Stock',
            href: '/bulkstore/issues',
            icon: PackageMinus,
        },
        {
            title: 'Returns',
            href: '/bulkstore/returns',
            icon: ArrowLeftCircle,
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
        {
            title: 'Suppliers',
            href: '/bulkstore/suppliers',
            icon: Truck,
        },
        {
            title: 'Batch Management',
            href: '/bulkstore/batches',
            icon: Boxes,
        },
        {
            title: 'Expiry Tracking',
            href: '/bulkstore/expiry',
            icon: CalendarClock,
        },
        {
            title: 'Reports',
            href: '/bulkstore/reports',
            icon: BarChart3,
        },
        {
            title: 'Configurations',
            href: '/bulkstore/module-settings',
            icon: Cog,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    lab_technician: [
        {
            title: 'Dashboard',
            href: '/laboratory/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Queues',
            href: '/laboratory',
            icon: Users,
        },
        {
            title: 'Processed',
            href: '/laboratory/processed',
            icon: ArrowRightCircle,
        },
        {
            title: 'Bulk Store Orders',
            href: '/laboratory/bulk-orders',
            icon: ShoppingBag,
        },
        {
            title: 'Reports',
            href: '/laboratory/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    radiologist: [
        {
            title: 'Dashboard',
            href: '/radiology/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Queues',
            href: '/radiology/queue',
            icon: Users,
        },
        {
            title: 'Images Seen',
            href: '/radiology/processed',
            icon: ArrowRightCircle,
        },
        {
            title: 'Bulk Store Orders',
            href: '/radiology/bulk-orders',
            icon: ShoppingBag,
        },
        {
            title: 'Reports',
            href: '/radiology/reports',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    accountant: [
        {
            title: 'Patient Billing',
            href: '/billing',
            icon: Receipt,
        },
        {
            title: 'Invoices',
            href: '/invoices',
            icon: FileText,
        },
        {
            title: 'Revenue',
            href: '/finance/revenue',
            icon: TrendingUp,
        },
        {
            title: 'Daily Collections',
            href: '/finance/collections',
            icon: Wallet,
        },
        {
            title: 'Expenses',
            href: '/finance/expenses',
            icon: Receipt,
        },
        {
            title: 'Financial Reports',
            href: '/reports/financial',
            icon: BarChart3,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],

    bulk_store_manager: [
        {
            title: 'Bulk Store',
            href: '/bulkstore/store',
            icon: Boxes,
        },
        {
            title: 'Suppliers',
            href: '/suppliers',
            icon: Truck,
        },
        {
            title: 'Stock Expiry',
            href: '/inventory/expiry',
            icon: PillBottle,
        },
        {
            title: 'Insurance Claims',
            href: '/insurance',
            icon: Shield,
        },
        {
            title: 'Account',
            href: ACCOUNT_HREF,
            icon: UserSquare,
        },
    ],
};

/* -------------------------------------------------------------------------- */
/* DEPARTMENT ROUTE RULES                                                     */
/* -------------------------------------------------------------------------- */

/** Builds a rule that appends the department id to a reception route. */
const receptionRule = (title: string, path: string): DepartmentHrefRule => ({
    match: (item) => item.title === title,
    build: (_item, id) => (id ? `${path}/${id}` : path),
});

const DEPARTMENT_HREF_RULES: Record<string, DepartmentHrefRule[]> = {
    lab_technician: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id ? `/laboratory/dashboard/${id}` : '/laboratory/dashboard',
        },
        {
            match: (item) => item.title === 'Bulk Store Orders',
            build: (_item, id) =>
                id
                    ? `/laboratory/bulk-orders/${id}`
                    : '/laboratory/bulk-orders',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/laboratory/reports/${id}` : '/laboratory/reports',
        },
    ],

    pharmacist: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id ? `/pharmacy/dashboard/${id}` : '/pharmacy/dashboard',
        },
        {
            match: (item) => item.title === 'Bulk Store',
            build: (_item, id) =>
                id ? `/pharmacy/bulk-orders/${id}` : '/pharmacy/bulk-orders',
        },
        {
            match: (item) => item.title === 'Department Stock',
            build: (_item, id) =>
                id
                    ? `/pharmacy/department-stock/${id}`
                    : '/pharmacy/department-stock',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/pharmacy/reports/${id}` : '/pharmacy/reports',
        },
    ],

    radiologist: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id ? `/radiology/dashboard/${id}` : '/radiology/dashboard',
        },
        {
            match: (item) => item.title === 'Queues',
            build: (_item, id) =>
                id ? `/radiology/queue/${id}` : '/radiology/queue',
        },
        {
            match: (item) => item.title === 'Bulk Store Orders',
            build: (_item, id) =>
                id ? `/radiology/bulk-orders/${id}` : '/radiology/bulk-orders',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/radiology/reports/${id}` : '/radiology/reports',
        },
    ],

    maternal_child_health: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id
                    ? `/maternal-child-health/dashboard/${id}`
                    : '/maternal-child-health/dashboard',
        },
        {
            match: (item) => item.title === 'Appointments',
            build: (_item, id) =>
                id
                    ? `/maternal-child-health/appointments/${id}`
                    : '/maternal-child-health/appointments',
        },
        {
            match: (item) => item.title === 'Queue',
            build: (_item, id) =>
                id
                    ? `/maternal-child-health/queue/${id}`
                    : '/maternal-child-health/queue',
        },
        {
            match: (item) => item.title === 'Bulk Store',
            build: (_item, id) =>
                id
                    ? `/maternal-child-health/bulk-orders/${id}`
                    : '/maternal-child-health/bulk-orders',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id
                    ? `/maternal-child-health/reports/${id}`
                    : '/maternal-child-health/reports',
        },
    ],

    theatre: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id ? `/theatre/dashboard/${id}` : '/theatre/dashboard',
        },
        {
            match: (item) => item.title === 'Appointments',
            build: (_item, id) =>
                id ? `/theatre/schedule/${id}` : '/theatre/schedule',
        },
        {
            match: (item) => item.title === 'Theatre Queue',
            build: (_item, id) =>
                id ? `/theatre/queue/${id}` : '/theatre/queue',
        },
        {
            match: (item) => item.title === 'Procedures',
            build: (_item, id) =>
                id ? `/theatre/procedures/${id}` : '/theatre/procedures',
        },
        {
            match: (item) => item.title === 'Manage Billables',
            build: (_item, id) =>
                id ? `/billables/department/${id}` : '/theatre',
        },
        {
            match: (item) => item.title === 'Processed',
            build: (_item, id) =>
                id ? `/theatre/processed/${id}` : '/theatre/processed',
        },
        {
            match: (item) => item.title === 'Bulk Store',
            build: (_item, id) =>
                id ? `/theatre/bulk-orders/${id}` : '/theatre/bulk-orders',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/theatre/reports/${id}` : '/theatre/reports',
        },
    ],
    dental: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id ? `/dental/dashboard/${id}` : '/dental/dashboard',
        },
        {
            match: (item) => item.title === 'Appointments',
            build: (_item, id) =>
                id ? `/dental/appointments/${id}` : '/dental/appointments',
        },
        {
            match: (item) => item.title === 'Manage Queue',
            build: (_item, id) =>
                id ? `/dental/queue/${id}` : '/dental/queue',
        },
        {
            match: (item) => item.title === 'Manage Billables',
            build: (_item, id) =>
                id ? `/billables/department/${id}` : '/billables/department',
        },
        {
            match: (item) => item.title === 'Bulk Store',
            build: (_item, id) =>
                id ? `/dental/bulk-orders/${id}` : '/dental/bulk-orders',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/dental/reports/${id}` : '/dental/reports',
        },
    ],

    // OPHTHALMOLOGY DEPARTMENT
    opthalmology: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id
                    ? `/opthalmology/dashboard/${id}`
                    : '/opthalmology/dashboard',
        },
        {
            match: (item) => item.title === 'Appointments',
            build: (_item, id) =>
                id
                    ? `/opthalmology/appointments/${id}`
                    : '/opthalmology/appointments',
        },
        {
            match: (item) => item.title === 'Manage Queue',
            build: (_item, id) =>
                id ? `/opthalmology/queue/${id}` : '/opthalmology/queue',
        },
        {
            match: (item) => item.title === 'Eye Examinations',
            build: (_item, id) =>
                id
                    ? `/opthalmology/examinations/${id}`
                    : '/opthalmology/examinations',
        },
        {
            match: (item) => item.title === 'Procedures',
            build: (_item, id) =>
                id
                    ? `/opthalmology/procedures/${id}`
                    : '/opthalmology/procedures',
        },
        {
            match: (item) => item.title === 'Processed',
            build: (_item, id) =>
                id
                    ? `/opthalmology/processed/${id}`
                    : '/opthalmology/processed',
        },
        {
            match: (item) => item.title === 'Bulk Store',
            build: (_item, id) =>
                id
                    ? `/opthalmology/bulk-orders/${id}`
                    : '/opthalmology/bulk-orders',
        },
        {
            match: (item) => item.title === 'Manage Billables',
            build: (_item, id) =>
                id ? `/billables/department/${id}` : '/billables/department',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/opthalmology/reports/${id}` : '/opthalmology/reports',
        },
    ],

    // RECEPTION DEPARTMENT
    receptionist: [
        receptionRule('Dashboard', '/reception/dashboard'),
        receptionRule('Search', '/reception/registry'),
        receptionRule('Add Patient', '/reception/create'),
        receptionRule('Appointments', '/reception/appointments'),
        receptionRule('Queue & Check-in', '/reception/queue'),
        receptionRule('View Queues', '/reception/queues'),
        receptionRule('Visits', '/reception/visits'),
        receptionRule('Billing', '/reception/bills'),
        receptionRule('Payments', '/reception/payments'),
        receptionRule('Insurance & Schemes', '/reception/insurance'),
        receptionRule('Reports', '/reception/reports'),
    ],
};

/* -------------------------------------------------------------------------- */
/* ORDER BADGE CONFIGURATION                                                  */
/* -------------------------------------------------------------------------- */

const ORDER_BADGE_CONFIG: Record<string, OrderBadgeConfig> = {
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
            'Bulk Store Orders': 'labOrders',
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
        href: '/admin/orders',
        subSections: {
            'Bulk store - Lab': 'bulkOrders',
            Laboratory: 'labOrders',
        },
    },
};

/* -------------------------------------------------------------------------- */
/* AUTHENTICATION HELPERS                                                     */
/* -------------------------------------------------------------------------- */

function normalizeRoles(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.filter(
            (role): role is string =>
                typeof role === 'string' && role.length > 0,
        );
    }

    if (typeof raw === 'string' && raw.length > 0) {
        return [raw];
    }

    return [];
}

function resolveUserRoles(user?: AuthUser): string[] {
    const raw = user?.profile?.roles ?? user?.profile?.role ?? user?.role;

    return normalizeRoles(raw);
}

function resolveUserRole(user?: AuthUser): string {
    return resolveUserRoles(user)[0] ?? 'receptionist';
}

function resolveDepartmentId(user?: AuthUser): string | number | null {
    return user?.profile?.department_id ?? user?.profile?.departmentId ?? null;
}

/* -------------------------------------------------------------------------- */
/* NAVIGATION HELPERS                                                         */
/* -------------------------------------------------------------------------- */

function isSettingsItem(item: NavItem): boolean {
    const title = item.title.toLowerCase();

    return SETTINGS_SECTION_KEYWORDS.some((keyword) => title.includes(keyword));
}

function patchDepartmentHrefs(
    userRole: string,
    items: NavItem[],
    departmentId: string | number | null,
): NavItem[] {
    const rules = DEPARTMENT_HREF_RULES[userRole];

    if (!rules) {
        return items;
    }

    return items.map((item) => {
        const rule = rules.find((candidate) => candidate.match(item));

        if (!rule) {
            return item;
        }

        return {
            ...item,
            href: rule.build(item, departmentId),
        };
    });
}

function getRoleDashboard(
    role: string,
    departmentId: string | number | null,
): string {
    const departmentRoutes: Record<string, string> = {
        lab_technician: '/laboratory/dashboard',
        radiologist: '/radiology/dashboard',
        maternal_child_health: '/maternal-child-health/dashboard',
        theatre: '/theatre/dashboard',
        dental: '/dental/dashboard',
        opthalmology: '/opthalmology/dashboard',
        receptionist: '/reception/dashboard',
    };

    const normalRoutes: Record<string, string> = {
        nurse: '/nurses/dashboard',
        doctor: '/consultation/dashboard',
        admin: '/admin/dashboard',
        pharmacist: '/pharmacy/dashboard',
        bulkstore: '/bulkstore/dashboard',
    };

    if (departmentRoutes[role]) {
        const base = departmentRoutes[role];

        return departmentId ? `${base}/${departmentId}` : base;
    }

    return normalRoutes[role] ?? DEFAULT_REDIRECT;
}

/* -------------------------------------------------------------------------- */
/* NAVIGATION LINK                                                            */
/* -------------------------------------------------------------------------- */

interface NavLinkProps {
    item: NavItem;
    orderCount?: number | null;
    variant?: 'default' | 'settings';
}

function NavLink({
    item,
    orderCount = null,
    variant = 'default',
}: NavLinkProps) {
    const Icon = item.icon;

    const iconGap = variant === 'settings' ? 'gap-3' : 'gap-6';

    return (
        <Link
            href={item.href}
            className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
        >
            <div className={`flex items-center ${iconGap}`}>
                {Icon && (
                    <Icon className="h-4 w-4 text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                )}

                <span>{item.title}</span>
            </div>

            {orderCount !== null && orderCount > 0 && (
                <Badge
                    variant="destructive"
                    className="ml-auto h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                    {orderCount}
                </Badge>
            )}
        </Link>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN SIDEBAR                                                               */
/* -------------------------------------------------------------------------- */

export default function AppSidebar() {
    const { props } = usePage();

    const authUser = (props.auth as { user?: AuthUser } | undefined)?.user;

    const userRole = resolveUserRole(authUser);
    const roles = resolveUserRoles(authUser);
    const departmentId = resolveDepartmentId(authUser);

    const [orderCounts, setOrderCounts] = useState<OrderCounts>({
        bulkOrders: 0,
        labOrders: 0,
        pharmacyOrders: 0,
        allOrders: 0,
    });

    /* ---------------------------------------------------------------------- */
    /* FETCH ORDER COUNTS                                                     */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        const shouldFetch = roles.some((role) =>
            ORDER_COUNT_ROLES.includes(role),
        );

        if (!shouldFetch) {
            return;
        }

        let cancelled = false;

        const fetchOrderCounts = async () => {
            try {
                const response = await fetch('/api/order-counts', {
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document
                                .querySelector<HTMLMetaElement>(
                                    'meta[name="csrf-token"]',
                                )
                                ?.getAttribute('content') ?? '',
                    },
                });

                if (!response.ok) {
                    return;
                }

                const data = await response.json();

                if (cancelled) {
                    return;
                }

                setOrderCounts({
                    bulkOrders: Number(data.bulkOrders) || 0,
                    labOrders: Number(data.labOrders) || 0,
                    pharmacyOrders: Number(data.pharmacyOrders) || 0,
                    allOrders: Number(data.allOrders) || 0,
                });
            } catch (error) {
                console.error('Unable to fetch order counts:', error);
            }
        };

        fetchOrderCounts();

        return () => {
            cancelled = true;
        };
    }, [roles.join(',')]);

    /* ---------------------------------------------------------------------- */
    /* ROOT REDIRECT                                                          */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        const currentPath = window.location.pathname;

        if (currentPath !== '/' && currentPath !== '/dashboard') {
            return;
        }

        const destination = getRoleDashboard(userRole, departmentId);

        if (currentPath !== destination) {
            router.visit(destination, {
                replace: true,
            });
        }
    }, [userRole, departmentId]);

    /* ---------------------------------------------------------------------- */
    /* DERIVED NAVIGATION                                                     */
    /* ---------------------------------------------------------------------- */

    const navItems = useMemo(() => {
        const items = roleNavItems[userRole] ?? [];

        return patchDepartmentHrefs(userRole, items, departmentId);
    }, [userRole, departmentId]);

    const { main, settings } = useMemo(() => {
        return {
            main: navItems.filter((item) => !isSettingsItem(item)),
            settings: navItems.filter(isSettingsItem),
        };
    }, [navItems]);

    /* ---------------------------------------------------------------------- */
    /* ORDER BADGES                                                           */
    /* ---------------------------------------------------------------------- */

    const getOrderCountForItem = (itemTitle: string): number | null => {
        const config = ORDER_BADGE_CONFIG[userRole];

        if (!config) {
            return null;
        }

        const mappedKey =
            config.titleMapping?.[itemTitle] ?? config.subSections?.[itemTitle];

        if (mappedKey) {
            return orderCounts[mappedKey];
        }

        return null;
    };

    /* ---------------------------------------------------------------------- */
    /* RENDER                                                                 */
    /* ---------------------------------------------------------------------- */

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
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 py-2">
                <div className="space-y-4 font-semibold">
                    {main.length > 0 && (
                        <div className="space-y-4">
                            {main.map((item) => (
                                <NavLink
                                    key={item.title}
                                    item={item}
                                    orderCount={getOrderCountForItem(
                                        item.title,
                                    )}
                                />
                            ))}
                        </div>
                    )}

                    {settings.length > 0 && main.length > 0 && (
                        <>
                            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

                            <div className="space-y-1">
                                {settings.map((item) => (
                                    <NavLink
                                        key={item.title}
                                        item={item}
                                        variant="settings"
                                    />
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
                            {authUser?.name ?? 'Guest'}
                        </p>

                        <p className="text-[10px] text-gray-400 capitalize dark:text-gray-500">
                            {userRole.replaceAll('_', ' ')}
                        </p>

                        {departmentId !== null && (
                            <p className="text-[10px] text-gray-400">
                                Department ID: {departmentId}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
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
