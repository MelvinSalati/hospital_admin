import React from 'react';

interface GRNPrintViewProps {
    grn: any;
}

export const GRNPrintView: React.FC<GRNPrintViewProps> = ({ grn }) => {
    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div id="grn-print-area" className="">
            {/* Hospital Header */}
            <div className="header-section text-center">
                <h1 className="text-xl font-bold text-blue-700">
                    ALTAF MEMORIAL HOSPITAL
                </h1>
                <p className="text-sm text-gray-600">
                    Chipata, Eastern Province, Zambia
                </p>
                <p className="text-xs text-gray-500">
                    Tel: +260 123 456 789 | Email: info@altamemorial.com | P.O.
                    Box 123, Chipata
                </p>
                <div className="mt-2">
                    <h2 className="text-lg font-bold">GOODS RECEIVED NOTE</h2>
                    <p className="font-mono text-sm text-blue-700">
                        {grn?.grn_number}
                    </p>
                </div>
            </div>

            {/* GRN Details */}
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                    <p className="text-xs text-gray-500">Supplier</p>
                    <p className="font-medium">
                        {grn?.supplier?.supplier_name || 'N/A'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Received Date</p>
                    <p className="font-medium">
                        {formatDate(grn?.received_date)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Delivery Note #</p>
                    <p className="font-medium">
                        {grn?.delivery_note_number || 'N/A'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Invoice #</p>
                    <p className="font-medium">
                        {grn?.invoice_number || 'N/A'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Received By</p>
                    <p className="font-medium">{grn?.received_by || 'N/A'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Inspected By</p>
                    <p className="font-medium">{grn?.inspected_by || 'N/A'}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="mb-3 w-full text-sm">
                <thead>
                    <tr>
                        <th className="px-2 py-1.5 text-left">#</th>
                        <th className="px-2 py-1.5 text-left">Product</th>
                        <th className="px-2 py-1.5 text-left">Batch #</th>
                        <th className="px-2 py-1.5 text-center">Quantity</th>
                        <th className="px-2 py-1.5 text-left">Expiry Date</th>
                        <th className="px-2 py-1.5 text-left">Location</th>
                    </tr>
                </thead>
                <tbody>
                    {grn?.items?.map((item: any, index: number) => (
                        <tr key={item.id}>
                            <td className="px-2 py-1.5 text-center">
                                {index + 1}
                            </td>
                            <td className="px-2 py-1.5">
                                {item.product?.product_name ||
                                    `Product #${item.product_id}`}
                            </td>
                            <td className="px-2 py-1.5 font-mono">
                                {item.batch_number}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                                {parseFloat(item.quantity).toLocaleString()}
                            </td>
                            <td className="px-2 py-1.5">
                                {formatDate(item.expiry_date)}
                            </td>
                            <td className="px-2 py-1.5">
                                {item.location ||
                                    grn?.storage_location ||
                                    'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Notes */}
            {grn?.notes && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm">{grn.notes}</p>
                </div>
            )}

            {/* Status */}
            <div className="mb-3">
                <p className="text-xs text-gray-500">Status</p>
                <span
                    className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${
                        grn?.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : grn?.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                    }`}
                >
                    {grn?.status?.toUpperCase()}
                </span>
            </div>

            {/* Signatures */}
            <div className="mt-4 grid grid-cols-2 gap-8 border-t pt-4">
                <div>
                    <p className="text-xs font-medium">Received By</p>
                    <div className="signature-line"></div>
                    <p className="mt-1 text-xs text-gray-500">
                        {grn?.received_by || '________________'}
                    </p>
                    <p className="text-xs text-gray-500">
                        Date: {formatDate(grn?.received_date)}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium">Inspected By</p>
                    <div className="signature-line"></div>
                    <p className="mt-1 text-xs text-gray-500">
                        {grn?.inspected_by || '________________'}
                    </p>
                </div>
            </div>

            {/* Distribution */}
            <div className="mt-4 border-t pt-4 text-xs text-gray-500">
                <p className="font-medium text-gray-600">GRN Distribution:</p>
                <div className="grid grid-cols-2 gap-1">
                    <span>1. Original (White) - Finance Copy</span>
                    <span>2. Pink - Transporter Copy</span>
                    <span>3. Green - Transporter Invoice Copy</span>
                    <span>4. Yellow - Warehouse Copy</span>
                    <span>5. Blue - Laborers Payment Copy</span>
                    <span>6. White - Pharmacy Copy</span>
                </div>
            </div>
        </div>
    );
};
