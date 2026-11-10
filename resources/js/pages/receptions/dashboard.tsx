// pages/Dashboard.tsx

import { Head, usePage } from '@inertiajs/react';
import {
    Building2,
    FlaskConical,
    Pill,
    Stethoscope,
    HeartPulse,
    Activity,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import DepartmentDashboard from '@/components/dashboard';
import { useEffect } from 'react';

// ─── Shape of props from the controller ──────────────────────

interface PageProps {
    auth: {
        user: {
            id: number;
            name: string;
            role?: string;
            department?: string | null;
            departments?: string[];
        };
    };
}

// ─── Icon + title resolution based on the user's department(s) ─

function resolveDepartmentTheme(departments: string[]) {
    const primary = departments[0]?.toLowerCase() ?? '';

    if (primary.includes('lab')) {
        return {
            icon: <FlaskConical className="h-5 w-5 text-cyan-600" />,
            title: 'Laboratory Dashboard',
        };
    }
    if (primary.includes('pharm')) {
        return {
            icon: <Pill className="h-5 w-5 text-emerald-600" />,
            title: 'Pharmacy Dashboard',
        };
    }
    if (primary.includes('opd') || primary.includes('outpatient')) {
        return {
            icon: <Stethoscope className="h-5 w-5 text-blue-600" />,
            title: 'OPD Dashboard',
        };
    }
    if (primary.includes('matern')) {
        return {
            icon: <HeartPulse className="h-5 w-5 text-pink-600" />,
            title: 'Maternity Dashboard',
        };
    }
    if (departments.length > 1) {
        return {
            icon: <Activity className="h-5 w-5 text-purple-600" />,
            title: `${departments.length} Departments Dashboard`,
        };
    }
    return {
        icon: <Building2 className="h-5 w-5 text-slate-600" />,
        title: 'Department Dashboard',
    };
}

// ─── Page ─────────────────────────────────────────────────────

export default function Dashboard() {
    const {
        auth,
        currentUser,
        departmentStats,
        departmentTrend,
        totals,
        trendRangeDays,
    } = usePage<PageProps>().props;

    // get logged-in user's role and department(s) from currentUser or auth.user

    useEffect(() => {
        if (Array.isArray(auth.user.profile.roles)) {
            /**
             * save the role to localstorage
             */
            localStorage.setItem('userRole', auth.user.profile.roles[0]);
        }
    }, [auth.user.profile.roles[0]]);

    // Identity comes from auth.user; resolve departments consistently
    const departments = currentUser?.departments?.length
        ? currentUser.departments
        : Array.isArray(auth?.user?.departments) && auth.user.departments.length
          ? auth.user.departments
          : auth?.user?.department
            ? [auth.user.department]
            : ['General'];

    const resolvedUser = {
        name: currentUser?.name ?? auth?.user?.name ?? 'Unknown User',
        role: currentUser?.role ?? auth?.user?.role,
        departments,
    };

    const range = trendRangeDays ?? 7;
    const theme = resolveDepartmentTheme(departments);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                {
                    title: 'Laboratory',
                    href: '/dashboard',
                },
            ]}
        >
            <Head title={theme.title} />

            <DepartmentDashboard
                currentUser={resolvedUser}
                departmentStats={departmentStats}
                departmentTrend={departmentTrend}
                totals={totals}
                trendRangeDays={range}
                title={theme.title}
                description={`${resolvedUser.name}${resolvedUser.role ? ` · ${resolvedUser.role}` : ''} · last ${range} days`}
                icon={theme.icon}
            />
        </AppLayout>
    );
}
