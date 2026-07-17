import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import queuePage from '@/constants/queuePage';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import React, { useState } from 'react';
import ActiveInQueue from './components/ActiveInQueue';

interface QueueItem {
    key: number;
    title: string;
}

const Queues = () => {
    const { active, completed } = usePage().props;
    console.log(active);

    // page tabs
    const [activeTabItem, setActiveTabItem] = useState<number>(1);

    const renderTabItems = () => {
        return (
            <div className="flex gap-2 p-4">
                {queuePage.map((item: QueueItem) => (
                    <Button
                        key={item.key}
                        onClick={() => setActiveTabItem(item.key)}
                    >
                        {item.icon} {item.title}
                    </Button>
                ))}
            </div>
        );
    };

    if (!queuePage || queuePage.length === 0) {
        return <div>No queues available</div>;
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reception', href: '/' },
                { title: 'Queues', href: '/' },
            ]}
        >
            <PageHeader
                title="Queues"
                subtitle="View clients/patients in a queue"
            />
            {renderTabItems()}
            {activeTabItem === 1 && (
                <>
                    <ActiveInQueue patients={active} />{' '}
                </>
            )}
            {activeTabItem === 2 && (
                <>
                    <ActiveInQueue patients={completed} />
                </>
            )}
        </AppLayout>
    );
};

export default Queues;
