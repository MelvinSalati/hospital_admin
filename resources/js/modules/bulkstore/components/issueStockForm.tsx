import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';

export default function IssueStockForm({ issuedBy, departmentId, requestedProducts}) {
    // Main form state
    const { data, setData, post, processing, errors } = useForm({
        department: departmentId || '',
        issuedBy: issuedBy || '', // This will be auto-filled from logged-in user
        requestNumber: '',
        requestDate: format(new Date(), 'yyyy-MM-dd'),
        priority: 'Normal',
        items: [
            {
                id: Date.now(),
                product: '',
                productCode: '',
                unit: '',
                availableQuantity: 0,
                requestedQuantity: 0,
                approvedQuantity: 0,
                issuedQuantity: 0,
                reason: 'Routine replenishment',
                notes: '',
            },
        ],
        notes: '',
    });

    // Auto-generate request number (SR-YYYY-XXXXXX)
    const generateRequestNumber = () => {
        const year = new Date().getFullYear();
        const random = String(Math.floor(Math.random() * 1000000)).padStart(
            6,
            '0',
        );
        return `SR-${year}-${random}`;
    };

    // Set request number on form load
    React.useEffect(() => {
        setData('requestNumber', generateRequestNumber());
    }, []);

    // Add new item row
    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                id: Date.now(),
                product: '',
                productCode: '',
                unit: '',
                availableQuantity: 0,
                requestedQuantity: 0,
                approvedQuantity: 0,
                issuedQuantity: 0,
                reason: 'Routine replenishment',
                notes: '',
            },
        ]);
    };

    // Remove item row
    const removeItem = (id) => {
        if (data.items.length > 1) {
            setData(
                'items',
                data.items.filter((item) => item.id !== id),
            );
        }
    };

    // Update item field
    const updateItem = (id, field, value) => {
        setData(
            'items',
            data.items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item,
            ),
        );
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        post('/issue-stock', {
            preserveScroll: true,
            onSuccess: () => {
                // Reset form or show success message
            },
        });
    };

    // Priority options
    const priorityOptions = ['Normal', 'Urgent', 'Emergency'];

    // Reason options
    const reasonOptions = [
        'Routine replenishment',
        'Patient care',
        'Emergency',
        'Department consumption',
        'Other',
    ];

    // Department options
    const departmentOptions = [
        'Nursing',
        'Pharmacy',
        'Laboratory',
        'MCH',
        'Dental',
        'Radiology',
        'Surgery',
        'Outpatient',
        'Inpatient',
        'Administration',
    ];

    return (
        <div className="mx-auto max-w-7xl rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-gray-800">
                Issue Stock Request Form
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Department */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Department *
                        </label>
                        <select
                            value={data.department}
                            onChange={(e) =>
                                setData('department', e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                        >
                            <option value="">Select Department</option>
                            {departmentOptions.map((dept) => (
                                <option key={dept} value={dept}>
                                    {dept}
                                </option>
                            ))}
                        </select>
                        {errors.department && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.department}
                            </p>
                        )}
                    </div>

                    {/* Request Number (Auto-generated) */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Request Number
                        </label>
                        <input
                            type="text"
                            value={data.requestNumber}
                            className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2"
                            disabled
                        />
                    </div>

                    {/* Request Date */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Request Date
                        </label>
                        <input
                            type="date"
                            value={data.requestDate}
                            onChange={(e) =>
                                setData('requestDate', e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Priority *
                        </label>
                        <select
                            value={data.priority}
                            onChange={(e) =>
                                setData('priority', e.target.value)
                            }
                            className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                data.priority === 'Emergency'
                                    ? 'border-red-500 bg-red-50'
                                    : data.priority === 'Urgent'
                                      ? 'border-orange-500 bg-orange-50'
                                      : 'border-gray-300'
                            }`}
                            required
                        >
                            {priorityOptions.map((priority) => (
                                <option key={priority} value={priority}>
                                    {priority}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">
                            Requested Items
                        </h3>
                        <button
                            type="button"
                            onClick={addItem}
                            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            + Add Item
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Product
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Code
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Unit
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Available
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Requested
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Approved
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Issued
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Reason
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Notes
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {data.items.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={item.product}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'product',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                placeholder="Product name"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={item.productCode}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'productCode',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                placeholder="Code"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'unit',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                placeholder="Unit"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={item.availableQuantity}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'availableQuantity',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={item.requestedQuantity}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'requestedQuantity',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                min="0"
                                                required
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={item.approvedQuantity}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'approvedQuantity',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={item.issuedQuantity}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'issuedQuantity',
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={item.reason}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'reason',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            >
                                                {reasonOptions.map((reason) => (
                                                    <option
                                                        key={reason}
                                                        value={reason}
                                                    >
                                                        {reason}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={item.notes}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        'notes',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded border border-gray-300 px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                placeholder="Notes"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeItem(item.id)
                                                }
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                disabled={
                                                    data.items.length <= 1
                                                }
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Overall Notes */}
                <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Overall Notes / Instructions
                    </label>
                    <textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        rows="3"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Additional notes or instructions for this request..."
                    />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 border-t pt-4">
                    <button
                        type="reset"
                        className="rounded-md border border-gray-300 px-6 py-2 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:outline-none"
                        onClick={() => window.location.reload()}
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>
        </div>
    );
}
