import AppLayout from '@/layouts/app-layout';

export default function reports() {
    return (
        <AppLayout breadcrumbs={[
                {
                    title: 'Laboratory',
                    href: 'laboratory/dashboard',
                },
                {
                    title: 'Reports',
                    href: 'laboratory/reports',
                },
            ]}
        ></AppLayout>
    );
}
