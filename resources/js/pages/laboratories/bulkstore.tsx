import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Link, usePage } from '@inertiajs/react';
import { BoxesIcon, BoxIcon, ChevronLeftIcon } from 'lucide-react';
import { title } from 'process';
import { href } from 'react-router-dom';
import { useState } from 'react';
import AddLabProduct from '@/components/forms/laboratories/addproducts';
import Stock from './components/stock';
import StockAlerts from './components/stock';
import { Spinner } from '@/components/ui/spinner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
const breadCrumbs = [
    {
        title: 'Laboratory',
        href: '',
    },
    {
        title: 'Bulk Store',
        href: '',
    },
];
const activeTabs = [
    {
        key: 1,
        title: 'Laboratory',
        name: 'Laboratory products',
    },
    {
        key: 2,
        title: 'products',
        name: 'Add Product',
    },
    {
        key: 3,
        title: 'Stock',
        name: 'Stock Notification',
    },
    {
        key: 3,
        title: 'Settings',
        name: 'Settings',
    },
];

const renderTabContent = (activeTab, products, cartalogueHandler) => {
    return (
        <>
            {activeTab === 'Laboratory' && (
                <div className="mt-4 p-2">
                    <div>
                        {products.length > 0 ? (
                            <>
                                {' '}
                                <div className="hidden overflow-x-auto p-2 md:block">
                                    <div className="mb-1b mt-1 flex w-1/3 gap-2">
                                        <div className="">
                                            <input
                                                type="text"
                                                placeholder="Enter product barcode"
                                                className="rounded-sm bg-gray-100 p-2"
                                            />
                                        </div>
                                        <div className="m-auto w-1/2">
                                            <div className="flex gap-2">
                                                <Spinner className="text-green-500" />
                                            </div>
                                        </div>
                                    </div>
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Barcode
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Quantity
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Expiry Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Registered
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {products.length > 0 ? (
                                                products.map((patient) => (
                                                    <tr
                                                        key={patient.id}
                                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    >
                                                        <td className="p-2 text-sm font-semibold whitespace-nowrap text-blue-900 dark:text-blue-400">
                                                            {
                                                                patient.product_code
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {
                                                                    patient.product_name
                                                                }
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                <div>
                                                                    {
                                                                        patient.quantity
                                                                    }
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 capitalize dark:text-gray-400">
                                                            {
                                                                patient.expiry_date
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                            {new Date(
                                                                patient.created_at,
                                                            ).toLocaleDateString()}
                                                        </td>
                                                        <td className="text-right text-sm font-medium whitespace-nowrap">
                                                            <Button
                                                                className="rounded-3xl"
                                                                onClick={
                                                                    cartalogueHandler
                                                                }
                                                            >
                                                                Open Cart
                                                            </Button>
                                                        </td>
                                                        <td className="text-right text-sm font-medium whitespace-nowrap">
                                                            <Button
                                                                href={`/patients/${patient.id}`}
                                                                className="rounded-lg bg-black p-1 text-white"
                                                            >
                                                                - Count
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <svg
                                                                className="mb-3 h-12 w-12 text-gray-400"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                            <p className="text-lg font-medium">
                                                                No patients
                                                                found
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* No products managed in the Medical Laboratory */}
                                <div className="mt-10">
                                    <div className="m-auto w-1/2 items-center rounded-lg bg-red-100 p-2 text-center text-red-500 shadow-lg">
                                        <center>
                                            {' '}
                                            <BoxIcon className="items-center text-center" />
                                            <h1>No products found!</h1>
                                        </center>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'products' && (
                <div className="mt-4 p-2">
                    <div>
                        <AddLabProduct />
                    </div>
                </div>
            )}
            {activeTab === 'Stock' && (
                <div className="mt-4 p-2">
                    <div>
                        <StockAlerts />
                    </div>
                </div>
            )}
        </>
    );
};

export default function BulkStore() {
    const [activeTab, setActiveTab] = useState('Laboratory');
    const { props } = usePage();
    const [products] = useState(props.products);
    const [cartModal, setCartModal] = useState(false);
    const cartalogueHandler = () => {
        setCartModal(true);
    };
    return (
        <AppLayout breadcrumbs={breadCrumbs}>
            <div className="">
                <div className="">
                    <div className="mn-4 mt-4 flex gap-2">
                        <ChevronLeftIcon />
                        <Link href={'/laboratory'}>Main Laboratory</Link>
                    </div>
                </div>

                {/* tabs  */}

                {activeTabs.map((item) => (
                    <Button
                        className={`${
                            activeTab === item.title
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        } rounded-none bg-transparent px-4 py-2 text-sm font-medium hover:bg-gray-50`}
                        variant="ghost"
                        key={item.key}
                        onClick={() => setActiveTab(item.title)}
                    >
                        {item.name}
                    </Button>
                ))}
                {/* render tab content */}
                {renderTabContent(activeTab, products, cartalogueHandler)}
            </div>
            <Dialog open={cartModal} onOpenChange={() => setCartModal(false)}>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Physical Count</DialogTitle>
                    </DialogHeader>
                    {/* book applications */}
                    <h1>{}</h1>
                    <div className="" style={{ height: 400 }}>
                        <div className="flex gap-2">
                            <div className="mt-10">
                                <input
                                    type="text"
                                    placeholder="Balance Brought Forward"
                                    className="h-10 rounded-sm bg-gray-100 p-2"
                                />
                            </div>
                            <div className="mt-10">
                                <input
                                    type="text"
                                    placeholder="Phyiscal Count!"
                                    className="h-10 rounded-sm bg-gray-100 p-4"
                                />
                            </div>
                        </div>
                             <div>
                                <textarea
                                    placeholder="Explain disparities if any"
                                    className="mt-10 p-4 rounded-lg bg-gray-100">

                                </textarea>
                            </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
