import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    UserPlus,
    CalendarClock,
    Stethoscope,
    HeartPulse,
    Pill,
    FlaskConical,
    Scan,
    Receipt,
    CreditCard,
    FileText,
    Hospital,
    ChevronRight,
    BabyIcon,
    Scissors,
    Eye,
    ScissorsIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

import AppLogo from './app-logo';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type SubNavItem = {
    title: string;
    href: (id: string) => string;
    icon?: React.ComponentType<{ className?: string }>;
};

type PatientNavItem = {
    title: string;
    href: (id: string) => string;
    icon: React.ComponentType<{ className?: string }>;
    children?: SubNavItem[];
};

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

const patientNavItems: PatientNavItem[] = [
    {
        title: 'Dashboard',
        href: (id) => `/patients/dashboard/${id}`,
        icon: LayoutGrid,
    },
    {
        title: 'Admissions',
        href: (id) => `/patients/admissions/${id}`,
        icon: UserPlus,
    },
    {
        title: 'Appointments',
        href: (id) => `/patients/appointments/${id}`,
        icon: CalendarClock,
    },
    {
        title: 'Consultations',
        href: (id) => `/patients/consultations/${id}`,
        icon: Stethoscope,
    },
    {
        title: 'Vitals',
        href: (id) => `/patients/vital-signs/${id}`,
        icon: HeartPulse,
    },
    {
        title: 'Procedures',
        href: (id) => `/patients/procedures/${id}`,
        icon: ScissorsIcon,
    },
    {
        title: 'Laboratory',
        href: (id) => `/patients/lab/${id}`,
        icon: FlaskConical,
    },
    {
        title: 'Radiology',
        href: (id) => `/patients/radiology/${id}`,
        icon: Scan,
    },

    // ── Grouped: Pharmacy ──
    {
        title: 'Pharmacy',
        href: (id) => `/patients/pharmacy/dispense/${id}`,
        icon: Pill,
        children: [
            {
                title: 'Dispensing',
                href: (id) => `/patients/pharmacy/dispense/${id}`,
                icon: Pill,
            },
            {
                title: 'Prescriptions',
                href: (id) => `/patients/pharmacy/prescriptions/${id}`,
                icon: FileText,
            },
        ],
    },

    // ── Grouped: Payment ──
    {
        title: 'Payment',
        href: (id) => `/patients/billing/${id}`,
        icon: Receipt,
        children: [
            {
                title: 'Billing',
                href: (id) => `/patients/billing/${id}`,
                icon: Receipt,
            },
            {
                title: 'Payments',
                href: (id) => `/patients/payments/${id}`,
                icon: CreditCard,
            },
        ],
    },

    { title: 'Martenal', href: (id) => `/patients/mch/${id}`, icon: BabyIcon },
    {
        title: 'Theater',
        href: (id) => `/patients/theater/${id}`,
        icon: Scissors,
    },
    {
        title: 'Opthamology',
        href: (id) => `/patients/opthamology/${id}`,
        icon: Eye,
    },
    { title: 'Dental', href: (id) => `/patients/dental/${id}`, icon: Scissors },
];

/* -------------------------------------------------------------------------- */
/* Shared class strings — kept in one place so styling stays consistent        */
/* -------------------------------------------------------------------------- */

const linkBase =
    'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ' +
    'text-gray-700 transition-all ' +
    'hover:bg-blue-50 hover:text-blue-700 ' +
    'dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400';

const subLinkBase =
    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ' +
    'text-gray-600 transition-all ' +
    'hover:bg-blue-50 hover:text-blue-700 ' +
    'dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400';

const iconBase =
    'h-4 w-4 text-gray-500 transition-colors ' +
    'group-hover:text-blue-600 ' +
    'dark:text-gray-400 dark:group-hover:text-blue-400';

/* -------------------------------------------------------------------------- */
/* Collapsible parent with children                                            */
/* -------------------------------------------------------------------------- */

function CollapsibleNavItem({
    item,
    patientId,
}: {
    item: PatientNavItem;
    patientId: string;
}) {
    const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : '';

    const isChildActive = (item.children ?? []).some((child) =>
        currentPath.startsWith(child.href(patientId).split('?')[0]),
    );

    const [open, setOpen] = useState(isChildActive);

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`${linkBase} w-full`}
                aria-expanded={open}
            >
                <div className="flex items-center gap-6">
                    <item.icon className={iconBase} />
                    <span>{item.title}</span>
                </div>
                <ChevronRight
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        open ? 'rotate-90' : ''
                    }`}
                />
            </button>

            {open && (
                <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                    {item.children!.map((child) => (
                        <Link
                            key={child.title}
                            href={child.href(patientId)}
                            className={subLinkBase}
                        >
                            {child.icon && <child.icon className={iconBase} />}
                            <span>{child.title}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                     */
/* -------------------------------------------------------------------------- */

export function PatientSidebar({ patient }: { patient?: any }) {
    const { props } = usePage();
    const [patientId, setPatientId] = useState<string | null>(null);

    useEffect(() => {
        const p: any = (props as any).patient ?? patient;
        if (p?.id) {
            setPatientId(String(p.id));
        } else if ((props as any).patientId) {
            setPatientId(String((props as any).patientId));
        } else {
            const pathname = window.location.pathname;
            const match = pathname.match(/\/(\d+)(\/?$|\/)/);
            if (match) setPatientId(match[1]);
        }
    }, [props, patient]);

    /* ---------- Loading skeleton (same look as AppSidebar) ---------- */
    if (!patientId) {
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
                <SidebarContent className="px-2 py-3">
                    <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
                            />
                        ))}
                    </div>
                </SidebarContent>
            </Sidebar>
        );
    }

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

            <SidebarContent className="px-2 py-3">
                <div className="space-y-1 font-semibold">
                    {patientNavItems.map((item) => {
                        if (item.children?.length) {
                            return (
                                <CollapsibleNavItem
                                    key={item.title}
                                    item={item}
                                    patientId={patientId}
                                />
                            );
                        }

                        return (
                            <Link
                                key={item.title}
                                href={item.href(patientId)}
                                className={linkBase}
                            >
                                <div className="flex items-center gap-6">
                                    <item.icon className={iconBase} />
                                    <span>{item.title}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </SidebarContent>
        </Sidebar>
    );
}
