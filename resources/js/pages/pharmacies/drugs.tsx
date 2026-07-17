import AppLayout from '@/layouts/app-layout';
import PageHeader from '@/components/PageHeader';
export default function logistics() {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pharmacy', href: '/pharmacy' },
                { title: 'Logistics', href: '/pharmacy/logistics' },
            ]}
        >
            <PageHeader
                title="Pharmacy Products"
                subtitle="Manage all pharmacy elated products"
            />
        </AppLayout>
    );
}
