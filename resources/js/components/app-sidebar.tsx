import { Link, usePage, router } from '@inertiajs/react';
import {
    ArrowLeftCircle,
    ArrowRightCircleIcon,
    BarChart2,
    BarChart3,
    Barcode,
    Boxes,
    BoxesIcon,
    Building2,
    Calendar1Icon,
    CalendarClock,
    CheckCircle2Icon,
    ClipboardCheck,
    CogIcon,
    CreditCard,
    DollarSignIcon,
    DownloadIcon,
    FileText,
    FileTextIcon,
    LayoutGrid,
    LogOut,
    PackageCheck,
    PackageMinus,
    Pill,
    PillBottle,
    PillBottleIcon,
    PlusCircle,
    Receipt,
    Search,
    SearchIcon,
    Shield,
    ShoppingBagIcon,
    Stethoscope,
    TrendingUp,
    Truck,
    UserCircle,
    UserPlus2Icon,
    UserSquare,
    Users,
    Wallet,
    Baby,
    Scissors,
    Smile,
    Eye,
    HeartPulse,
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
/*                                   Types                                    */
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

/**
 * Declarative rule for patching a `NavItem.href` with a department id.
 * `build(item, departmentId)` returns the new href (or the original).
 */
interface DepartmentHrefRule {
    match: (item: NavItem) => boolean;
    build: (item: NavItem, departmentId: string | number | null) => string;
}

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const ACCOUNT_HREF = `../../${routes.web.user.account}`;

/** Titles that belong in the "settings/account" footer section of the sidebar. */
const SETTINGS_SECTION_KEYWORDS = [
    'account',
    'settings',
    'configurations',
] as const;

/** Roles that should hit `/api/order-counts`. */
const ORDER_COUNT_ROLES = [
    'bulkstore',
    'lab_technician',
    'pharmacist',
    'admin',
    'receptionist',
    'humanresources',
    'accountant',
] as const;

/** Default landing path when we cannot resolve a role. */
const DEFAULT_REDIRECT = '/reception/dashboard';

/* -------------------------------------------------------------------------- */
/*                               Nav definitions                              */
/* -------------------------------------------------------------------------- */

const roleNavItems: Record<string, NavItem[]> = {
    doctor: [
        {
            title: 'Dashboard',
            href: '/consultation/dashboard',
            icon: LayoutGrid,
        },
        { title: 'Search', href: '/reception/registry', icon: SearchIcon },
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
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],
    admin: [
        { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid },
        {
            title: 'User Management',
            href: '/admin/manage-users',
            icon: Users,
            children: [
                { title: 'Users', href: '/admin/manage-users' },
                { title: 'Roles & Permissions', href: '/admin/roles' },
            ],
        },
        // { title: 'Human Resources', href: '/admin/hr', icon: UserCircle },
        {
            title: 'Manage Budgets',
            href: '/admin/budgets',
            icon: DollarSignIcon,
        },
        {
            title: 'Purchase Requisitions',
            href: '/admin/purchase-requisitions',
            icon: BoxesIcon,
        },
        {
            title: 'Purchase Orders',
            href: '/admin/purchase-orders',
            icon: FileTextIcon,
        },
        // {
        //     title: 'Inventory Oversight',
        //     href: '/admin/inventory',
        //     icon: BoxesIcon,
        // },
        // {
        //     title: 'Approvals',
        //     href: '/admin/approvals',
        //     icon: CheckCircle2Icon,
        //     children: [
        //         {
        //             title: 'Purchase Requisitions',
        //             href: '/admin/approvals/purchase-requisitions',
        //         },
        //         {
        //             title: 'Purchase Orders',
        //             href: '/admin/approvals/purchase-orders',
        //         },
        //         {
        //             title: 'Stock Adjustments',
        //             href: '/admin/approvals/stock-adjustments',
        //         },
        //         { title: 'Refunds', href: '/admin/approvals/refunds' },
        //     ],
        // },
        {
            title: 'Reports',
            href: '/admin/reports',
            icon: BarChart3,
            children: [
                { title: 'System Reports', href: '/admin/reports/system' },
                {
                    title: 'Financial Reports',
                    href: '/admin/reports/financial',
                },
                { title: 'Audit Reports', href: '/admin/reports/audit' },
                { title: 'Usage Analytics', href: '/admin/reports/analytics' },
            ],
        },
        {
            title: 'Administration',
            href: '/admin/settings',
            icon: Building2,
            children: [
                { title: 'Facilities', href: '/admin/facilities' },
                { title: 'Branches', href: '/admin/branches' },
                { title: 'Services', href: '/admin/services' },
                { title: 'Wards', href: '/admin/wards' },
                { title: 'Insurance Providers', href: '/admin/insurance' },
            ],
        },
        // {
        //     title: 'Configurations',
        //     href: '/admin/settings',
        //     icon: CogIcon,
        //     children: [
        //         { title: 'General Settings', href: '/admin/settings/general' },
        //         { title: 'Billing Settings', href: '/admin/settings/billing' },
        //         {
        //             title: 'Number Sequences',
        //             href: '/admin/settings/sequences',
        //         },
        //         {
        //             title: 'Notifications',
        //             href: '/admin/settings/notifications',
        //         },
        //         { title: 'Integrations', href: '/admin/settings/integrations' },
        //         { title: 'Backup & Restore', href: '/admin/settings/backup' },
        //         { title: 'System Logs', href: '/admin/settings/logs' },
        //     ],
        // },
    ],
    nurse: [
        { title: 'Dashboard', href: '/nurses/dashboard', icon: LayoutGrid },
        { title: 'Search', href: '/nurses/registry', icon: SearchIcon },
        {
            title: 'Appointments',
            href: '/nurses/appointments',
            icon: Calendar1Icon,
        },
        {
            title: 'Queue & Check-in',
            href: '/nurses/queue',
            icon: ClipboardCheck,
        },
        { title: 'In Patient', href: '/nurses/in-patient', icon: Stethoscope },
        {
            title: 'Treatment Room',
            href: '/nurses/treatment-room',
            icon: PillBottleIcon,
        },
        { title: 'Bulk Store', href: '/nurses/bulk-store', icon: Boxes },
        {
            title: 'Users',
            href: '/nurses/user-department',
            icon: UserPlus2Icon,
        },
        { title: 'Reports', href: '/nurses/reports', icon: BarChart3 },
        { title: 'Account', href: '/users/manage-account', icon: UserCircle },
    ],
    receptionist: [
        { title: 'Dashboard', href: '/reception/dashboard', icon: LayoutGrid },
        { title: 'Search', href: '/reception/registry', icon: Search },
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
            title: 'Queue & Check-in',
            href: '/reception/queue',
            icon: ClipboardCheck,
        },
        { title: 'Visits', href: '/reception/visits', icon: Stethoscope },
        { title: 'Billing', href: '/reception/bills', icon: DollarSignIcon },
        { title: 'Payments', href: '/reception/payments', icon: CreditCard },
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
                { title: 'Users', href: '/admin/manage-users' },
                { title: 'Roles & Permissions', href: '/admin/roles' },
            ],
        },
        { title: 'Add User', href: '/user/create', icon: PlusCircle },
        { title: 'Reports', href: '/reception/reports', icon: BarChart2 },
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],
    pharmacist: [
        { title: 'Dashboard', href: '/pharmacy/dashboard', icon: LayoutGrid },
        { title: 'Prescriptions', href: '/pharmacy/prescriptions', icon: Pill },
        {
            title: 'Bulk Store',
            href: '/pharmacy/bulk-orders',
            icon: Barcode,
        },
        { title: 'Dispensed', href: '/pharmacy/dispensed', icon: Pill },
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
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
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
            title: 'Queue & Check-in',
            href: '/maternal-child-health/queue',
            icon: Users,
        },
        {
            title: 'Maternal Care',
            href: '/maternal-child-health/maternal-care',
            icon: HeartPulse,
        },
        {
            title: 'Child Health',
            href: '/maternal-child-health/child-health',
            icon: Baby,
        },
        {
            title: 'Processed',
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
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],

    theatre: [
        {
            title: 'Dashboard',
            href: '/theatre/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Surgery Schedule',
            href: '/theatre/schedule',
            icon: CalendarClock,
        },
        {
            title: 'Queue',
            href: '/theatre/queue',
            icon: Users,
        },
        {
            title: 'Procedures',
            href: '/theatre/procedures',
            icon: Scissors,
        },
        {
            title: 'Processed',
            href: '/theatre/processed',
            icon: ClipboardCheck,
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
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
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
            title: 'Queue',
            href: '/dental/queue',
            icon: Users,
        },
        {
            title: 'Dental Procedures',
            href: '/dental/procedures',
            icon: Stethoscope,
        },
        {
            title: 'Processed',
            href: '/dental/processed',
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
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],

    ophthalmology: [
        {
            title: 'Dashboard',
            href: '/ophthalmology/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Appointments',
            href: '/ophthalmology/appointments',
            icon: CalendarClock,
        },
        {
            title: 'Queue',
            href: '/ophthalmology/queue',
            icon: Users,
        },
        {
            title: 'Eye Examinations',
            href: '/ophthalmology/examinations',
            icon: Eye,
        },
        {
            title: 'Procedures',
            href: '/ophthalmology/procedures',
            icon: Stethoscope,
        },
        {
            title: 'Processed',
            href: '/ophthalmology/processed',
            icon: ClipboardCheck,
        },
        {
            title: 'Bulk Store',
            href: '/ophthalmology/bulk-orders',
            icon: Barcode,
        },
        {
            title: 'Reports',
            href: '/ophthalmology/reports',
            icon: BarChart3,
        },
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
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
            title: 'Goods Received Note',
            href: '/bulkstore/goods-received-note',
            icon: DownloadIcon,
        },
        {
            title: 'Stock Pricing',
            href: '/bulkstore/stock-pricing',
            icon: DollarSignIcon,
        },
        { title: 'Issue Stock', href: '/bulkstore/issues', icon: PackageMinus },
        { title: 'Returns', href: '/bulkstore/returns', icon: ArrowLeftCircle },
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
        { title: 'Reports', href: '/bulkstore/reports', icon: BarChart3 },
        {
            title: 'Configurations',
            href: '/bulkstore/module-settings',
            icon: CogIcon,
        },
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],
    lab_technician: [
        // href patched in-component (needs department_id)
        { title: 'Dashboard', href: '/laboratory/dashboard', icon: LayoutGrid },
        { title: 'Queues', href: '/laboratory', icon: Users },
        {
            title: 'Processed',
            href: '/laboratory/processed',
            icon: ArrowRightCircleIcon,
        },
        // href patched in-component (needs department_id)
        {
            title: 'Bulk Store Orders',
            href: '/laboratory/bulk-orders',
            icon: ShoppingBagIcon,
        },
        { title: 'Reports', href: '/laboratory/reports', icon: BarChart3 },
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],
    radiologist: [
        // href patched in-component (needs department_id)
        { title: 'Dashboard', href: '/radiology/dashboard', icon: LayoutGrid },
        { title: 'Queues', href: '/radiology/queue', icon: Users },
        {
            title: 'Images Seen',
            href: '/radiology/processed',
            icon: ArrowRightCircleIcon,
        },
        // href patched in-component (needs department_id)
        {
            title: 'Bulk Store Orders',
            href: '/radiology/bulk-orders',
            icon: ShoppingBagIcon,
        },
        {
            title: 'Reports',
            href: '/radiology/reports',
            icon: BarChart3,
        },
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
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
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],
    bulk_store_manager: [
        { title: 'Bulk Store', href: '/bulkstore/store', icon: Boxes },
        { title: 'Suppliers', href: '/suppliers', icon: Truck },
        { title: 'Stock Expiry', href: '/inventory/expiry', icon: PillBottle },
        { title: 'Insurance Claims', href: '/insurance', icon: Shield },
        { title: 'Account', href: ACCOUNT_HREF, icon: UserSquare },
    ],
};

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
        titleMapping: { Orders: 'labOrders' },
    },
    pharmacist: {
        countKey: 'pharmacyOrders',
        href: '/pharmacy/orders',
        titleMapping: { Queue: 'pharmacyOrders' },
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

/**
 * Roles whose nav items need a `/{departmentId}` suffix appended.
 * Add a new role here instead of writing another `if` in the component.
 */
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
        // ✅ ADDED — lab reports also need departmentId
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
        // ✅ ADDED — this is the missing rule
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
            match: (item) => item.title === 'Bulk Store Orders',
            build: (_item, id) =>
                id ? `/radiology/bulk-orders/${id}` : '/radiology/bulk-orders',
        },
        // ✅ ADDED — this is the missing rule
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/radiology/reports/${id}` : '/radiology/reports',
        },
    ],
    // ✅ ADDED — maternal child health inherits laboratory-style rules
    maternal_child_health: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id
                    ? `/maternal-child-health/dashboard/${id}`
                    : '/maternal-child-health/dashboard',
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
    // ✅ ADDED — theatre inherits laboratory-style rules
    theatre: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id ? `/theatre/dashboard/${id}` : '/theatre/dashboard',
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
    // ✅ ADDED — dental inherits laboratory-style rules
    dental: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id ? `/dental/dashboard/${id}` : '/dental/dashboard',
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
    // ✅ ADDED — ophthalmology inherits laboratory-style rules
    ophthalmology: [
        {
            match: (item) => item.title === 'Dashboard',
            build: (_item, id) =>
                id
                    ? `/ophthalmology/dashboard/${id}`
                    : '/ophthalmology/dashboard',
        },
        {
            match: (item) => item.title === 'Bulk Store',
            build: (_item, id) =>
                id
                    ? `/ophthalmology/bulk-orders/${id}`
                    : '/ophthalmology/bulk-orders',
        },
        {
            match: (item) => item.title === 'Reports',
            build: (_item, id) =>
                id ? `/ophthalmology/reports/${id}` : '/ophthalmology/reports',
        },
    ],
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function resolveUserRole(props: any): string {
    const raw =
        props.auth?.user?.profile?.roles ??
        props.auth?.profile?.role ??
        props.auth?.user?.role;
    if (Array.isArray(raw)) return raw[0] || '';
    return raw || 'receptionist';
}

function resolveDepartmentId(props: any): string | number | null {
    return (
        props.auth?.user?.profile?.department_id ??
        props.auth?.user?.profile?.departmentId ??
        null
    );
}

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
    if (!rules) return items;

    return items.map((item) => {
        const rule = rules.find((r) => r.match(item));
        return rule ? { ...item, href: rule.build(item, departmentId) } : item;
    });
}

/* -------------------------------------------------------------------------- */
/*                                Subcomponents                               */
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
/*                                   Main                                     */
/* -------------------------------------------------------------------------- */

export default function AppSidebar() {
    const { props } = usePage();

    const [orderCounts, setOrderCounts] = useState<OrderCounts>({
        bulkOrders: 0,
        labOrders: 0,
        pharmacyOrders: 0,
        allOrders: 0,
    });

    const roles: string[] = props.auth?.user?.profile?.roles ?? [];
    const userRole = resolveUserRole(props);
    const departmentId = resolveDepartmentId(props);

    /* ---------------- Order counts ---------------- */
    useEffect(() => {
        if (!roles.some((role) => ORDER_COUNT_ROLES.includes(role as any)))
            return;

        let cancelled = false;

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
                if (!response.ok) return;
                const data = await response.json();
                if (cancelled) return;
                setOrderCounts({
                    bulkOrders: data.bulkOrders || 0,
                    labOrders: data.labOrders || 0,
                    pharmacyOrders: data.pharmacyOrders || 0,
                    allOrders: data.allOrders || 0,
                });
            } catch {
                /* silent */
            }
        };

        fetchOrderCounts();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roles.join(',')]);

    /* ---------------- Root redirect ---------------- */
    useEffect(() => {
        const path = window.location.pathname;
        if (path !== '/' && path !== '/dashboard') return;

        const redirectMap: Record<string, string> = {
            nurse: '/nurses/dashboard',
            doctor: '/consultation/dashboard',
            admin: '/admin/dashboard',
            receptionist: '/reception/dashboard',
            pharmacist: '/pharmacy/dashboard',
            bulkstore: '/bulkstore/dashboard',
            lab_technician: departmentId
                ? `/laboratory/dashboard/${departmentId}`
                : '/laboratory/dashboard',
            radiologist: departmentId
                ? `/radiology/dashboard/${departmentId}`
                : '/radiology/dashboard',
            // ✅ ADDED — these roles previously fell back to reception dashboard
            maternal_child_health: departmentId
                ? `/maternal-child-health/dashboard/${departmentId}`
                : '/maternal-child-health/dashboard',
            theatre: departmentId
                ? `/theatre/dashboard/${departmentId}`
                : '/theatre/dashboard',
            dental: departmentId
                ? `/dental/dashboard/${departmentId}`
                : '/dental/dashboard',
            ophthalmology: departmentId
                ? `/ophthalmology/dashboard/${departmentId}`
                : '/ophthalmology/dashboard',
        };

        const matchedRole = roles.find((r) => redirectMap[r]);
        router.visit(matchedRole ? redirectMap[matchedRole] : DEFAULT_REDIRECT);
    }, [roles, departmentId]);

    /* ---------------- Derived nav ---------------- */
    const navItems = useMemo(
        () =>
            patchDepartmentHrefs(
                userRole,
                roleNavItems[userRole] ?? [],
                departmentId,
            ),
        [userRole, departmentId],
    );

    const { main, settings } = useMemo(
        () => ({
            main: navItems.filter((item) => !isSettingsItem(item)),
            settings: navItems.filter(isSettingsItem),
        }),
        [navItems],
    );

    const getOrderCountForItem = (itemTitle: string): number | null => {
        const config = ORDER_BADGE_CONFIG[userRole];
        if (!config) return null;

        if (config.titleMapping?.[itemTitle]) {
            return orderCounts[config.titleMapping[itemTitle]];
        }
        if (config.subSections?.[itemTitle]) {
            return orderCounts[config.subSections[itemTitle]];
        }
        return null;
    };

    /* ---------------- Render ---------------- */
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
                            {props.auth?.user?.name || 'Guest'}
                        </p>
                        <p className="text-[10px] text-gray-400 capitalize dark:text-gray-500">
                            {userRole || 'No Role'}
                        </p>
                    </div>
                    <button
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
