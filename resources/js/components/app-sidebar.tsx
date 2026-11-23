import { Link, usePage, router } from '@inertiajs/react';
import {
    ArrowLeftCircle,
    BarChart2,
    BarChart3,
    Barcode,
    Boxes,
    CalendarClock,
    CalendarDays,
    ChevronDown,
    ClipboardCheck,
    Cog,
    Coins,
    DollarSign,
    Download,
    FileText,
    LayoutGrid,
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
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

import routes from '@/constants/routes';
import { useEncounterCount } from '@/hooks/use-encounter-count';
import http from '@/utils/Http';
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
    /**
     * Shows the live encounter-count badge on this link.
     * The badge follows this flag, not the title, so the link can be renamed freely.
     * The count comes from /api/departments/{departmentId}/encounters/count.
     */
    badge?: 'encounters';
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
            badge: 'encounters',
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
            title: 'Employees',
            href: '/admin/manage-users',
            icon: Users,
        },
        {
            title: 'Budget',
            href: '/admin/budgets',
            icon: DollarSign,
            // children: [
            //     {
            //         title: 'Overview',
            //         href: '/admin/budgets/overview',
            //         icon: DollarSign,
            //     },
            //     {
            //         title: 'All Budgets',
            //         href: '/admin/budgets',
            //     },
            //     {
            //         title: 'Create Budget',
            //         href: '/admin/budgets/create',
            //     },
            //     {
            //         title: 'Planned Budgets',
            //         href: '/admin/budgets/planned',
            //     },
            //     {
            //         title: 'Petty Cash',
            //         href: '/admin/budgets/petty-cash',
            //     },
            // ],
        },
        {
            title: 'Finance',
            href: '/admin/finance',
            icon: Coins,
        },
        {
            title: 'Purchases',
            href: '/admin/purchase-requisitions', // not navigated to: group rows only toggle
            icon: ShoppingBag,
            children: [
                {
                    title: 'Requisitions',
                    href: '/admin/purchase-requisitions',
                },
                {
                    title: 'Orders',
                    href: '/admin/purchase-orders',
                },
            ],
        },

        {
            title: 'Manage Billables',
            href: '/billables/department',
            icon: TagIcon,
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
            title: 'Search Registry',
            href: '/nurses/registry',
            icon: Search,
        },
        {
            title: 'Treatment Room',
            href: '/nurses/treatment-room',
            icon: PillBottle,
        },
        {
            title: 'Appointments',
            href: '/nurses/appointments',
            icon: CalendarDays,
        },
        {
            title: 'Encounters',
            href: '/nurses/queue',
            icon: ClipboardCheck,
            badge: 'encounters',
        },
        {
            title: 'In Patient',
            href: '/nurses/in-patient',
            icon: Stethoscope,
        },

        {
            title: 'Bulk Store',
            href: '/nurses/bulk-store',
            icon: Boxes,
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
            title: 'Search Registry',
            href: '/reception/registry',
            icon: Search,
        },
        {
            title: 'Appointments',
            href: '/reception/appointments',
            icon: CalendarDays,
        },
        {
            title: 'Add Patient',
            href: '/reception/create',
            icon: UserPlus,
        },
        {
            title: 'Encounters',
            href: '/reception/visits',
            icon: Stethoscope,
            badge: 'encounters',
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
            badge: 'encounters',
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
            badge: 'encounters',
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
            badge: 'encounters',
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
            title: 'Encounters',
            href: '/dental/queue',
            icon: Users,
            badge: 'encounters',
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
            title: 'Encounters',
            href: '/opthalmology/queue',
            icon: Users,
            badge: 'encounters',
        },
        {
            title: 'Bulk Store',
            href: '/opthalmology/bulk-orders',
            icon: Barcode,
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
            title: 'Encounters',
            href: '/laboratory/encounters',
            icon: Users,
            badge: 'encounters',
        },
        // {
        //     title: 'Processed',
        //     href: '/laboratory/processed',
        //     icon: ArrowRightCircle,
        // },
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
            // Rename this freely: the badge follows `badge`, not the title.
            title: 'Encounters',
            href: '/radiology/encounter',
            icon: Users,
            badge: 'encounters',
        },

        {
            title: 'Bulk Store Orders',
            href: '/radiology/bulk-orders',
            icon: ShoppingBag,
        },
        // {
        //     title: 'Manage Billables',
        //     href: '/billables/department',
        //     icon: TagIcon,
        // },
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
        departmentRule('Encounters', '/laboratory/encounters'),
        departmentRule('Processed', '/laboratory/processed'), // add if needed
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
        departmentRule('Encounters', '/radiology/encounter'),
        departmentRule('Bulk Store Orders', '/radiology/bulk-orders'),
        departmentRule('Manage Billables', '/billables/department'),
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
        departmentRule('Encounters', '/opthalmology/queue'),
        departmentRule('Eye Examinations', '/opthalmology/examinations'),
        departmentRule('Procedures', '/opthalmology/procedures'),
        departmentRule('Processed', '/opthalmology/processed'),
        departmentRule('Bulk Store', '/opthalmology/bulk-orders'),
        billablesRule('/billables/department'),
        departmentRule('Reports', '/opthalmology/reports'),
    ],

    nurse: [
        departmentRule('Dashboard', '/nurses/dashboard'),
        departmentRule('Search Registry', '/nurses/registry'),
        departmentRule('Appointments', '/nurses/appointments'),
        departmentRule('Encounters', '/nurses/queue'),
        departmentRule('In Patient', '/nurses/in-patient'),
        departmentRule('Treatment Room', '/nurses/treatment-room'),
        departmentRule('Bulk Store', '/nurses/bulk-store'),
        departmentRule('Users', '/nurses/user-department'),
        departmentRule('Reports', '/nurses/reports'),
    ],

    receptionist: [
        departmentRule('Dashboard', '/reception/dashboard'),
        departmentRule('Search Registry', '/reception/registry'),
        departmentRule('Add Patient', '/reception/create'),
        departmentRule('Appointments', '/reception/appointments'),
        departmentRule('View Queues', '/reception/queues'),
        departmentRule('Encounters', '/reception/visits'),
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

        // `...item` keeps flags such as `badge` intact.
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
/* ENCOUNTER BADGE                                                            */
/* -------------------------------------------------------------------------- */

/** Vibrant gradient pill with a soft ping ring, used for live encounter counts. */
function EncounterBadge({ count }: { count: number }) {
    return (
        <span
            className="relative ml-auto flex group-data-[collapsible=icon]:hidden"
            aria-label={`${count} active encounters`}
        >
            <span className="absolute inset-0 animate-ping rounded-full bg-fuchsia-400 opacity-60 motion-reduce:animate-none" />

            <Badge className="relative h-5 min-w-[22px] justify-center rounded-full border-0 bg-red-600 px-1.5 text-xs font-bold text-white shadow-md shadow-rose-500/40 hover:from-fuchsia-600 hover:via-rose-600 hover:to-orange-600">
                {count > 99 ? '99+' : count}
            </Badge>
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* NAVIGATION LINK                                                            */
/* -------------------------------------------------------------------------- */

interface NavLinkProps {
    item: NavEntry;
    orderCount?: number | null;
    encounterCount?: number | null;
    variant?: 'default' | 'settings';
}

/**
 * Plain links navigate. Items with `children` (Manage Budgets, Reports, ...)
 * are collapsible groups: click the row to expand or collapse it.
 */
function NavLink({
    item,
    orderCount = null,
    encounterCount = null,
    variant = 'default',
}: NavLinkProps) {
    const { url } = usePage();
    const Icon = item.icon;

    const iconGap = variant === 'settings' ? 'gap-3' : 'gap-6';

    const path = url.split('?')[0];
    const matches = (href: string) =>
        path === href || path.startsWith(`${href}/`);

    const children = item.children ?? [];
    const hasChildren = children.length > 0;

    // Only the most specific child is highlighted, so "All Budgets"
    // (/admin/budgets) is not lit up while on /admin/budgets/create.
    const activeChildHref = children
        .filter((child) => matches(child.href))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    const hasActiveChild = Boolean(activeChildHref);
    const isActive = hasChildren ? hasActiveChild : matches(item.href);

    // Groups start open when you are inside them, and open again when
    // you navigate into one. Otherwise the user controls them.
    const [open, setOpen] = useState(hasActiveChild);

    useEffect(() => {
        if (hasActiveChild) setOpen(true);
    }, [hasActiveChild]);

    const showEncounterBadge = encounterCount !== null && encounterCount > 0;
    const showOrderBadge =
        !showEncounterBadge && orderCount !== null && orderCount > 0;

    // Same look for plain links and group headers
    const rowClass = `group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-all hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 ${
        isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-700 dark:text-gray-300'
    }`;

    const rowContent = (
        <>
            <div className={`flex items-center ${iconGap}`}>
                {Icon && (
                    <Icon className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                )}

                <span className="group-data-[collapsible=icon]:hidden">
                    {item.title}
                </span>
            </div>

            {showEncounterBadge && <EncounterBadge count={encounterCount} />}

            {showOrderBadge && (
                <Badge
                    variant="destructive"
                    className="ml-auto h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-xs font-medium text-white group-data-[collapsible=icon]:hidden hover:bg-red-600"
                >
                    {orderCount}
                </Badge>
            )}

            {hasChildren && (
                <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            )}
        </>
    );

    if (!hasChildren) {
        return (
            <div>
                <Link href={item.href} className={rowClass}>
                    {rowContent}
                </Link>
            </div>
        );
    }

    const panelId = `nav-group-${item.title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((prev) => !prev)}
                className={rowClass}
            >
                {rowContent}
            </button>

            {/* grid-rows trick gives a smooth height animation */}
            <div
                id={panelId}
                className={`grid transition-all duration-200 ease-out group-data-[collapsible=icon]:hidden motion-reduce:transition-none ${
                    open
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="mt-1 ml-9 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                        {children.map((child) => (
                            <Link
                                key={child.title}
                                href={child.href}
                                tabIndex={open ? 0 : -1}
                                className={`block rounded-md px-2 py-1.5 text-xs font-medium hover:text-blue-700 dark:hover:text-blue-400 ${
                                    child.href === activeChildHref
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                {child.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
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
    /* DERIVED NAVIGATION                                                     */
    /* (built first: the encounter badge depends on the `badge` flags)        */
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
    /* ENCOUNTER COUNT (per department)                                       */
    /* ---------------------------------------------------------------------- */

    // Only poll the count when this role has a link flagged with `badge`.
    const encounterBadgeEnabled = navItems.some(
        (item) => item.badge === 'encounters',
    );
    const encounterCount = useEncounterCount(
        encounterBadgeEnabled,
        departmentId,
    );

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

        const controller = new AbortController();

        const fetchOrderCounts = async () => {
            try {
                const { data } = await http.get('/api/order-counts', {
                    signal: controller.signal,
                });

                setOrderCounts({
                    bulkOrders: Number(data.bulkOrders) || 0,
                    labOrders: Number(data.labOrders) || 0,
                    pharmacyOrders: Number(data.pharmacyOrders) || 0,
                    allOrders: Number(data.allOrders) || 0,
                });
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Unable to fetch order counts:', error);
                }
            }
        };

        fetchOrderCounts();

        return () => {
            controller.abort();
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
                                    encounterCount={
                                        item.badge === 'encounters'
                                            ? encounterCount
                                            : null
                                    }
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
        </Sidebar>
    );
}
