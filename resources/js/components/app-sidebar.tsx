import { Link, usePage, router } from '@inertiajs/react';
import {
    ArrowLeftCircle,
    ArrowRightCircle,
    BarChart2,
    BarChart3,
    Barcode,
    Boxes,
    CalendarClock,
    CalendarDays,
    ClipboardCheck,
    Cog,
    DollarSign,
    Download,
    FileText,
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

/** NavItem plus optional sub-links (used by the admin menu). */
type NavEntry = NavItem & {
    children?: { title: string; href: string }[];
};

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

// NOTE: this is a relative path, so it resolves differently depending on the
// current URL. Prefer an absolute path if your routes constant allows it.
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

const roleNavItems: Record<string, NavEntry[]> = {
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
            icon: CalendarDays,
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
            title: 'Visits',
            href: '/reception/visits',
            icon: Stethoscope,
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
        {
            title: 'Bulk Store',
            href: '/opthalmology/bulk-orders',
            icon: Barcode,
        },
        {
            title: 'Manage Billables',
            href: '/billables/department',
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

/** Rule that appends the department id to a path: `/path/{id}` or `/path`. */
const departmentRule = (title: string, path: string): DepartmentHrefRule => ({
    match: (item) => item.title === title,
    build: (_item, id) => (id ? `${path}/${id}` : path),
});

/** Rule for shared billables pages: `/billables/department/{id}`. */
const billablesRule = (
    fallback: string,
    title = 'Manage Billables',
): DepartmentHrefRule => ({
    match: (item) => item.title === title,
    build: (_item, id) => (id ? `/billables/department/${id}` : fallback),
});

const DEPARTMENT_HREF_RULES: Record<string, DepartmentHrefRule[]> = {
    doctor: [
        departmentRule('Dashboard', '/consultation/dashboard'),
        departmentRule('Consultations', '/consultation/queue'),
        departmentRule('Appointments', '/consultation/appointment'),
    ],

    lab_technician: [
        departmentRule('Dashboard', '/laboratory/dashboard'),
        departmentRule('Bulk Store Orders', '/laboratory/bulk-orders'),
        departmentRule('Reports', '/laboratory/reports'),
    ],

    pharmacist: [
        departmentRule('Dashboard', '/pharmacy/dashboard'),
        departmentRule('Bulk Store', '/pharmacy/bulk-orders'),
        departmentRule('Department Stock', '/pharmacy/department-stock'),
        departmentRule('Reports', '/pharmacy/reports'),
    ],

    radiologist: [
        departmentRule('Dashboard', '/radiology/dashboard'),
        departmentRule('Queues', '/radiology/queue'),
        departmentRule('Bulk Store Orders', '/radiology/bulk-orders'),
        departmentRule('Reports', '/radiology/reports'),
    ],

    maternal_child_health: [
        departmentRule('Dashboard', '/maternal-child-health/dashboard'),
        departmentRule('Appointments', '/maternal-child-health/appointments'),
        departmentRule('Queue', '/maternal-child-health/queue'),
        departmentRule('Bulk Store', '/maternal-child-health/bulk-orders'),
        departmentRule('Reports', '/maternal-child-health/reports'),
    ],

    theatre: [
        departmentRule('Dashboard', '/theatre/dashboard'),
        departmentRule('Appointments', '/theatre/schedule'),
        departmentRule('Theatre Queue', '/theatre/queue'),
        departmentRule('Procedures', '/theatre/procedures'),
        billablesRule('/theatre'),
        departmentRule('Processed', '/theatre/processed'),
        departmentRule('Bulk Store', '/theatre/bulk-orders'),
        departmentRule('Reports', '/theatre/reports'),
    ],

    dental: [
        departmentRule('Dashboard', '/dental/dashboard'),
        departmentRule('Appointments', '/dental/appointments'),
        departmentRule('Manage Queue', '/dental/queue'),
        billablesRule('/dental/billables'),
        departmentRule('Bulk Store', '/dental/bulk-orders'),
        departmentRule('Reports', '/dental/reports'),
    ],

    opthalmology: [
        departmentRule('Dashboard', '/opthalmology/dashboard'),
        departmentRule('Appointments', '/opthalmology/appointments'),
        departmentRule('Manage Queue', '/opthalmology/queue'),
        departmentRule('Eye Examinations', '/opthalmology/examinations'),
        departmentRule('Procedures', '/opthalmology/procedures'),
        departmentRule('Processed', '/opthalmology/processed'),
        departmentRule('Bulk Store', '/opthalmology/bulk-orders'),
        billablesRule('/billables/department'),
        departmentRule('Reports', '/opthalmology/reports'),
    ],

    nurse: [
        departmentRule('Dashboard', '/nurses/dashboard'),
        departmentRule('Search', '/nurses/registry'),
        departmentRule('Appointments', '/nurses/appointments'),
        departmentRule('Queue & Check-in', '/nurses/queue'),
        departmentRule('In Patient', '/nurses/in-patient'),
        departmentRule('Treatment Room', '/nurses/treatment-room'),
        departmentRule('Bulk Store', '/nurses/bulk-store'),
        departmentRule('Users', '/nurses/user-department'),
        departmentRule('Reports', '/nurses/reports'),
    ],

    receptionist: [
        departmentRule('Dashboard', '/reception/dashboard'),
        departmentRule('Search', '/reception/registry'),
        departmentRule('Add Patient', '/reception/create'),
        departmentRule('Appointments', '/reception/appointments'),
        departmentRule('View Queues', '/reception/queues'),
        departmentRule('Visits', '/reception/visits'),
        departmentRule('Reports', '/reception/reports'),
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

/** Returns the first non-empty role list (an empty array no longer blocks fallbacks). */
function resolveUserRoles(user?: AuthUser): string[] {
    const candidates = [user?.profile?.roles, user?.profile?.role, user?.role];

    for (const candidate of candidates) {
        const roles = normalizeRoles(candidate);

        if (roles.length > 0) {
            return roles;
        }
    }

    return [];
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
    const title = (item.title ?? '').toLowerCase();

    return SETTINGS_SECTION_KEYWORDS.some((keyword) => title.includes(keyword));
}

function patchDepartmentHrefs(
    userRole: string,
    items: NavEntry[],
    departmentId: string | number | null,
): NavEntry[] {
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
    // Roles whose dashboard URL is scoped to a department id.
    const departmentRoutes: Record<string, string> = {
        lab_technician: '/laboratory/dashboard',
        radiologist: '/radiology/dashboard',
        maternal_child_health: '/maternal-child-health/dashboard',
        theatre: '/theatre/dashboard',
        dental: '/dental/dashboard',
        opthalmology: '/opthalmology/dashboard',
        receptionist: '/reception/dashboard',
        nurse: '/nurses/dashboard',
        doctor: '/consultation/dashboard',
    };

    // Roles with a single, unscoped dashboard.
    const normalRoutes: Record<string, string> = {
        admin: '/admin/dashboard',
        pharmacist: '/pharmacy/dashboard',
        bulkstore: '/bulkstore/dashboard',
        accountant: '/billing',
        bulk_store_manager: '/bulkstore/store',
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
    item: NavEntry;
    orderCount?: number | null;
    variant?: 'default' | 'settings';
}

function NavLink({
    item,
    orderCount = null,
    variant = 'default',
}: NavLinkProps) {
    const { url } = usePage();
    const Icon = item.icon;

    const iconGap = variant === 'settings' ? 'gap-3' : 'gap-6';

    const path = url.split('?')[0];
    const isActive = path === item.href || path.startsWith(`${item.href}/`);
    const hasActiveChild =
        item.children?.some((child) => path.startsWith(child.href)) ?? false;
    const expanded = isActive || hasActiveChild;

    return (
        <div>
            <Link
                href={item.href}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 ${
                    isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                }`}
            >
                <div className={`flex items-center ${iconGap}`}>
                    {Icon && (
                        <Icon className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                    )}

                    <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                    </span>
                </div>

                {orderCount !== null && orderCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="ml-auto h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-xs font-medium text-white group-data-[collapsible=icon]:hidden hover:bg-red-600"
                    >
                        {orderCount}
                    </Badge>
                )}
            </Link>

            {item.children && expanded && (
                <div className="mt-1 ml-9 space-y-1 border-l border-gray-200 pl-3 group-data-[collapsible=icon]:hidden dark:border-gray-700">
                    {item.children.map((child) => (
                        <Link
                            key={child.title}
                            href={child.href}
                            className={`block rounded-md px-2 py-1.5 text-xs font-medium hover:text-blue-700 dark:hover:text-blue-400 ${
                                path.startsWith(child.href)
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            {child.title}
                        </Link>
                    ))}
                </div>
            )}
        </div>
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
    const rolesKey = roles.join(',');
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
        const shouldFetch = rolesKey
            .split(',')
            .some((role) => ORDER_COUNT_ROLES.includes(role));

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
    }, [rolesKey]);

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
                    <div className="flex-1 group-data-[collapsible=icon]:hidden">
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
