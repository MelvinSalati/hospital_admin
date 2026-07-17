import { Head, router, usePage } from '@inertiajs/react';
import { Users, CalendarClock, CircleDollarSign, ReceiptText } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { StatCard } from '@/components/dashboard/cards/StatCard';
import { PaymentMethodsChart } from '@/components/dashboard/charts/PaymentMethodsChart';
import { AgeDistributionChart } from '@/components/dashboard/charts/AgeDistributionChart';
import { InvoiceTable } from '@/components/dashboard/tables/InvoiceTable';
import type { DashboardProps } from '@/types/dashboard';

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Overview', href: '/dashboard' },
];

export default function Dashboard() {
    const { statistics, paymentMethods, ageDistribution, invoices } =
        usePage<DashboardProps>().props;

    function handlePageChange(page: number) {
        router.get(
            '/dashboard',
            { page },
            { preserveScroll: true, preserveState: true },
        );
    }

    const formatRevenue = (v: number) =>
        `ZMW ${v.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-5 bg-slate-50 p-5 dark:bg-slate-900 min-h-screen">

                {/* ── Section: Statistics ───────────────────────── */}
                <section aria-label="Summary statistics">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Total Patients"
                            value={statistics.totalPatients.toLocaleString()}
                            icon={<Users />}
                            trend={statistics.totalPatientsTrend}
                        />
                        <StatCard
                            title="Today's Visits"
                            value={statistics.todayVisits.toLocaleString()}
                            icon={<CalendarClock />}
                            trend={statistics.todayVisitsTrend}
                        />
                        <StatCard
                            title="Revenue Today"
                            value={formatRevenue(statistics.revenueToday)}
                            icon={<CircleDollarSign />}
                            trend={statistics.revenueTodayTrend}
                        />
                        <StatCard
                            title="Pending Bills"
                            value={statistics.pendingBills.toLocaleString()}
                            icon={<ReceiptText />}
                            trend={statistics.pendingBillsTrend}
                        />
                    </div>
                </section>

                {/* ── Section: Analytics Row ────────────────────── */}
                <section aria-label="Analytics" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <PaymentMethodsChart data={paymentMethods} />
                    <AgeDistributionChart data={ageDistribution} />
                </section>

                {/* ── Section: Invoice Management ───────────────── */}
                <section aria-label="Invoice management">
                    <InvoiceTable
                        invoices={invoices}
                        onPageChange={handlePageChange}
                    />
                </section>

            </div>
        </AppLayout>
    );
}
