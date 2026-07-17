import { Head, router, usePage } from '@inertiajs/react';
import {
    Users,
    CalendarClock,
    CircleDollarSign,
    ReceiptText,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { StatCard } from '@/components/dashboard/cards/StatCard';
import { PaymentMethodsChart } from '@/components/dashboard/PaymentMethodsChart';
import { AgeDistributionChart } from '@/components/dashboard/AgeDistributionChart';
import { InvoiceTable } from '@/components/dashboard/InvoiceTable';
import type { DashboardProps } from '@/types/dashboard';

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Overview', href: '/dashboard' },
];

export default function Dashboard() {
    const { statistics, paymentMethods, ageDistribution, invoices } =
        usePage<DashboardProps>().props;

    // Add defensive checks for undefined data
    const safeStatistics = statistics || {
        totalPatients: 0,
        todayVisits: 0,
        revenueToday: 0,
        pendingBills: 0,
        totalPatientsTrend: 0,
        todayVisitsTrend: 0,
        revenueTodayTrend: 0,
        pendingBillsTrend: 0,
    };

    const safePaymentMethods = paymentMethods || [];
    const safeAgeDistribution = ageDistribution || [];
    const safeInvoices = invoices || {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    };

    function handlePageChange(page: number) {
        router.get(
            '/dashboard',
            { page },
            { preserveScroll: true, preserveState: true },
        );
    }

    const formatRevenue = (v: number) =>
        `ZMW ${v.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;

    // ── Define stat cards data for .map() ──────────────────────
    const statCards = [
        {
            title: 'Total Patients',
            value: safeStatistics.totalPatients.toLocaleString(),
            icon: <Users />,
            trend: safeStatistics.totalPatientsTrend,
            colorScheme: 'purple' as const,
        },
        {
            title: "Today's Visits",
            value: safeStatistics.todayVisits.toLocaleString(),
            icon: <CalendarClock />,
            trend: safeStatistics.todayVisitsTrend,
            colorScheme: 'blue' as const,
        },
        {
            title: 'Revenue Today',
            value: formatRevenue(safeStatistics.revenueToday),
            icon: <CircleDollarSign />,
            trend: safeStatistics.revenueTodayTrend,
            colorScheme: 'green' as const,
        },
        {
            title: 'Pending Bills',
            value: safeStatistics.pendingBills.toLocaleString(),
            icon: <ReceiptText />,
            trend: safeStatistics.pendingBillsTrend,
            colorScheme: 'yellow' as const,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-5 bg-slate-50 p-5 dark:bg-slate-900">
                {/* ── Section: Statistics ───────────────────────── */}
                <section aria-label="Summary statistics">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {statCards.map((card, idx) => (
                            <StatCard key={idx} {...card} />
                        ))}
                    </div>
                </section>

                {/* ── Section: Analytics Row ────────────────────── */}
                <section
                    aria-label="Analytics"
                    className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                    <PaymentMethodsChart data={safePaymentMethods} />
                    <AgeDistributionChart data={safeAgeDistribution} />
                </section>

                {/* ── Section: Invoice Management ───────────────── */}
                <section aria-label="Invoice management">
                    <InvoiceTable
                        invoices={safeInvoices}
                        onPageChange={handlePageChange}
                    />
                </section>
            </div>
        </AppLayout>
    );
}
