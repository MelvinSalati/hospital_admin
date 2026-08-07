import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app-layout';
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
