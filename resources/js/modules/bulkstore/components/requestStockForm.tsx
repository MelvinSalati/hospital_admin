import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app/app-header-layout';
import { useForm } from '@inertiajs/react';
import { Barcode, BoxesIcon } from 'lucide-react';
import { useState } from 'react';

interface StockRequestItem {
    productId: number;
    productName: string;
    productUnit: string;
    quantityRequested: number;
}

interface StockRequestForm {
    departmentId: number;
    requestedBy: number;
    notes: string;
    requisitionDate: string;
    receivingDepartmentId: number;
    monthlyAverageConsumption: number;
    itemDetails: StockRequestItem[];
}

interface RequestStockFormProps {
    requestedBy: number;
    departmentId: number;
    receivingDepartmentId: number;
    requestedProducts?: StockRequestItem[];
}

export default function RequestStockForm({
    requestedBy,
    departmentId,
    receivingDepartmentId,
    requestedProducts = [],
}: RequestStockFormProps) {
    const { data, setData, post, processing, errors } =
        useForm<StockRequestForm>({
            departmentId,
            requestedBy,
            notes: '',
            requisitionDate: new Date().toISOString().split('T')[0],
            receivingDepartmentId,
            monthlyAverageConsumption: 0,
            itemDetails: requestedProducts,
        });
    const 

    const [productSearch, setProductSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = <K extends keyof StockRequestItem>(
        index: number,
        field: K,
        value: StockRequestItem[K],
    ) => {
        const updatedItems = [...data.itemDetails];

        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value,
        };

        setData('itemDetails', updatedItems);
    };

    const removeItem = (index: number) => {
        const updatedItems = data.itemDetails.filter(
            (_, itemIndex) => itemIndex !== index,
        );

        setData('itemDetails', updatedItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/bulkstore/request-stock');
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Bulk Store', href: '/bulkstore' },
                { title: 'Request Stock', href: '/bulkstore/request-stock' },
            ]}
        >
            <div className="h-full bg-blue-50 p-4">
                <PageHeader
                    icon={<BoxesIcon />}
                    title="Stock Requisitions"
                    subtitle="Request stock from the bulk store"
                />
                <div className="mb-4">
                    <div className="">
                        <Barcode className="h-6 w-6 text-gray-500" />
                        <span className="ml-2 text-gray-700">
                            <input
                                type="text"
                                className=""
                                onChange={(e) =>
                                    setProductSearch(e.target.value)
                                }
                                placeholder="Scan or enter product barcode"
                            />
                            <button className="ml-2 rounded bg-blue-500 px-2 py-1 text-white">
                                find Product
                            </button>
                        </span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
