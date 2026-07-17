import AppLayout from '@/layouts/app-layout';

export default function processed() {
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Laboratory',
                    href: 'laboratory/dashboard',
                },
                {
                    title: 'Processed',
                    href: 'laboratory/dashboard',
                },
            ]}
        ></AppLayout>
    );
}
