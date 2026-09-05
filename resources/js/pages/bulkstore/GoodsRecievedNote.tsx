import { usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    FileText,
    Eye,
    Printer,
    Download,
    Mail,
    CheckCircle,
    Send,
    AlertCircle,
    X,
    Loader2,
    User,
    Building,
    Users,
    Calendar,
    DollarSign,
    Clock,
    Check,
    XCircle,
    Ban,
    FileQuestion,
    Package,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import ResusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import GRNModal from '../components/modals/GrnModal';

// Status configuration
const STATUS_CONFIG = {
    draft: {
        label: 'Draft',
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: React.createElement(FileQuestion, { className: 'h-3 w-3' }),
    },
    pending_approval: {
        label: 'Pending Approval',
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: React.createElement(Clock, { className: 'h-3 w-3' }),
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: React.createElement(Check, { className: 'h-3 w-3' }),
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: React.createElement(XCircle, { className: 'h-3 w-3' }),
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: React.createElement(Ban, { className: 'h-3 w-3' }),
    },
};

// Helper functions
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value))
        return 'ZMW 0.00';
    return `ZMW ${parseFloat(value).toFixed(2)}`;
};

const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const getSupplierName = (row) => {
    return row.supplier?.supplier_name || row.supplier?.name || 'N/A';
};

const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
};

// Render Products Table Function
const renderProductsTable = (grnItems) => {
    if (!grnItems || grnItems.length === 0) {
        return React.createElement(
            'div',
            {
                className:
                    'text-center py-8 text-slate-500 dark:text-slate-400',
            },
            'No products found for this GRN',
        );
    }

    // Check if any item has price data
    const hasPriceData = grnItems.some((item) => {
        const price = parseFloat(item.unit_price) || 0;
        return price > 0;
    });

    return React.createElement(
        'div',
        { className: 'overflow-x-auto mt-4' },
        React.createElement(
            'table',
            { className: 'w-full text-sm' },
            React.createElement(
                'thead',
                { className: 'bg-slate-50 dark:bg-slate-800/50' },
                React.createElement(
                    'tr',
                    null,
                    [
                        '#',
                        'Product Name',
                        'Unit Type',
                        'Units Received',
                        'Units Damaged',
                        'Lot/Batch No.',
                        ...(hasPriceData ? ['Unit Price', 'Total Amount'] : []),
                        'Condition',
                        'Price Source',
                    ].map((header) =>
                        React.createElement(
                            'th',
                            {
                                key: header,
                                className:
                                    'px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider',
                            },
                            header,
                        ),
                    ),
                ),
            ),
            React.createElement(
                'tbody',
                {
                    className:
                        'divide-y divide-slate-200 dark:divide-slate-700',
                },
                grnItems.map((item, index) => {
                    const productName =
                        item.product?.product_name ||
                        item.product?.name ||
                        'Unknown Product';
                    const unitType = item.product?.unit || item.unit || 'Piece';
                    const batchNumber = item.batch_number || 'N/A';

                    const unitsReceived =
                        parseFloat(item.quantity_received) || 0;
                    const unitsDamaged =
                        parseFloat(item.quantity_rejected) || 0;

                    // Get price data
                    const unitPrice = parseFloat(item.unit_price) || 0;
                    const totalPrice =
                        parseFloat(item.total_price) ||
                        unitPrice * unitsReceived;
                    const priceSource = item.price_source || 'unknown';

                    const statusColors = {
                        pending:
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                        accepted:
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        rejected:
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    };
                    const statusColor =
                        statusColors[item.quality_status] ||
                        statusColors.pending;

                    const priceSourceLabels = {
                        requisition: {
                            label: 'From Requisition',
                            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        },
                        requisition_fallback: {
                            label: 'From Requisition',
                            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        },
                        product: {
                            label: 'From Product',
                            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        },
                        default: {
                            label: 'Default',
                            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                        },
                        none: {
                            label: 'No Price',
                            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        },
                    };
                    const sourceConfig =
                        priceSourceLabels[priceSource] ||
                        priceSourceLabels.none;

                    return React.createElement(
                        'tr',
                        {
                            key: item.id || index,
                            className:
                                'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                        },
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 text-slate-600 dark:text-slate-400',
                            },
                            index + 1,
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 font-medium text-slate-900 dark:text-slate-100',
                            },
                            productName,
                            item.product?.strength &&
                                React.createElement(
                                    'span',
                                    {
                                        className:
                                            'ml-1 text-xs text-slate-400 dark:text-slate-500',
                                    },
                                    `(${item.product.strength})`,
                                ),
                            item.product?.form &&
                                React.createElement(
                                    'span',
                                    {
                                        className:
                                            'ml-1 text-xs text-slate-400 dark:text-slate-500',
                                    },
                                    `- ${item.product.form}`,
                                ),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 text-slate-600 dark:text-slate-400',
                            },
                            unitType,
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 text-slate-600 dark:text-slate-400 text-right',
                            },
                            unitsReceived.toFixed(2),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 text-slate-600 dark:text-slate-400 text-right',
                            },
                            unitsDamaged.toFixed(2),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400',
                            },
                            batchNumber,
                        ),
                        ...(hasPriceData
                            ? [
                                  React.createElement(
                                      'td',
                                      {
                                          key: 'unit-price',
                                          className:
                                              'px-4 py-3 text-slate-600 dark:text-slate-400 text-right font-medium',
                                      },
                                      unitPrice > 0
                                          ? formatCurrency(unitPrice)
                                          : React.createElement(
                                                'span',
                                                { className: 'text-slate-400' },
                                                'N/A',
                                            ),
                                  ),
                                  React.createElement(
                                      'td',
                                      {
                                          key: 'total-amount',
                                          className:
                                              'px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 text-right',
                                      },
                                      totalPrice > 0
                                          ? formatCurrency(totalPrice)
                                          : React.createElement(
                                                'span',
                                                { className: 'text-slate-400' },
                                                'N/A',
                                            ),
                                  ),
                              ]
                            : []),
                        React.createElement(
                            'td',
                            { className: 'px-4 py-3' },
                            React.createElement(
                                'span',
                                {
                                    className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`,
                                },
                                item.quality_status || 'pending',
                            ),
                        ),
                        React.createElement(
                            'td',
                            { className: 'px-4 py-3' },
                            React.createElement(
                                'span',
                                {
                                    className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${sourceConfig.color}`,
                                },
                                sourceConfig.label,
                            ),
                        ),
                    );
                }),
            ),
            // Footer with totals
            hasPriceData &&
                React.createElement(
                    'tfoot',
                    {
                        className:
                            'bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-medium',
                    },
                    React.createElement(
                        'tr',
                        null,
                        React.createElement('td', {
                            className: 'px-4 py-3',
                            colSpan: 3,
                        }),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right',
                            },
                            'Totals:',
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right',
                            },
                            grnItems
                                .reduce(
                                    (sum, item) =>
                                        sum +
                                        (parseFloat(item.quantity_received) ||
                                            0),
                                    0,
                                )
                                .toFixed(2),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right',
                            },
                            grnItems
                                .reduce(
                                    (sum, item) =>
                                        sum +
                                        (parseFloat(item.quantity_rejected) ||
                                            0),
                                    0,
                                )
                                .toFixed(2),
                        ),
                        React.createElement('td', { className: 'px-4 py-3' }),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right',
                            },
                            formatCurrency(
                                grnItems.reduce(
                                    (sum, item) =>
                                        sum +
                                        (parseFloat(item.unit_price) || 0),
                                    0,
                                ),
                            ),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-4 py-3 font-bold text-slate-900 dark:text-slate-100 text-right',
                            },
                            formatCurrency(
                                grnItems.reduce((sum, item) => {
                                    const total =
                                        parseFloat(item.total_price) ||
                                        (parseFloat(item.unit_price) || 0) *
                                            (parseFloat(
                                                item.quantity_received,
                                            ) || 0);
                                    return sum + total;
                                }, 0),
                            ),
                        ),
                        React.createElement('td', {
                            className: 'px-4 py-3',
                            colSpan: 2,
                        }),
                    ),
                ),
        ),
    );
};

// Email GRN Modal Component
const EmailGRNModal = ({
    isOpen,
    onClose,
    grn,
    recipients,
    selectedRecipients,
    onRecipientChange,
    onSend,
    isSending,
    hospitalDetails,
}) => {
    if (!isOpen || !grn) return null;

    const recipientOptions = [
        {
            key: 'supplier',
            label: 'Supplier',
            icon: React.createElement(User, { className: 'h-4 w-4' }),
            email: recipients.supplier,
            description: 'Send original copy to supplier',
            copyType: 'Original',
            copyColor:
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        },
        {
            key: 'accounts',
            label: 'Accounts Department',
            icon: React.createElement(Building, { className: 'h-4 w-4' }),
            email: recipients.accounts,
            description: 'Send duplicate copy to accounts',
            copyType: 'Duplicate',
            copyColor:
                'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        },
        {
            key: 'pharmacy',
            label: 'Pharmacy Department',
            icon: React.createElement(Users, { className: 'h-4 w-4' }),
            email: recipients.pharmacy,
            description: 'Send triplicate copy to pharmacy',
            copyType: 'Triplicate',
            copyColor:
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        },
    ];

    const isAnyRecipientSelected = Object.values(selectedRecipients).some(
        (value) => value === true,
    );

    const handleSend = () => {
        if (!isAnyRecipientSelected) {
            toast.error('Please select at least one recipient');
            return;
        }
        onSend(selectedRecipients);
    };

    return React.createElement(
        'div',
        { className: 'fixed inset-0 z-50 flex items-center justify-center' },
        React.createElement('div', {
            className:
                'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity',
            onClick: onClose,
        }),
        React.createElement(
            'div',
            {
                className:
                    'relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl mx-4 animate-fadeIn',
            },
            // Header
            React.createElement(
                'div',
                {
                    className:
                        'flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700',
                },
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-3' },
                    React.createElement(
                        'div',
                        {
                            className:
                                'p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg',
                        },
                        React.createElement(Mail, {
                            className:
                                'h-5 w-5 text-purple-600 dark:text-purple-400',
                        }),
                    ),
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'h2',
                            {
                                className:
                                    'text-lg font-semibold text-slate-900 dark:text-slate-100',
                            },
                            'Send GRN Copies',
                        ),
                        React.createElement(
                            'p',
                            {
                                className:
                                    'text-sm text-slate-500 dark:text-slate-400',
                            },
                            grn?.grn_number,
                        ),
                    ),
                ),
                React.createElement(
                    'button',
                    {
                        onClick: onClose,
                        className:
                            'p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors',
                    },
                    React.createElement(X, {
                        className: 'h-5 w-5 text-slate-500 dark:text-slate-400',
                    }),
                ),
            ),
            // Body
            React.createElement(
                'div',
                { className: 'p-6 space-y-6' },
                // GRN Info
                React.createElement(
                    'div',
                    {
                        className:
                            'grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg',
                    },
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'p',
                            {
                                className:
                                    'text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider',
                            },
                            'Total Amount',
                        ),
                        React.createElement(
                            'p',
                            {
                                className:
                                    'text-lg font-semibold text-slate-900 dark:text-slate-100',
                            },
                            formatCurrency(grn?.total_amount),
                        ),
                    ),
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'p',
                            {
                                className:
                                    'text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider',
                            },
                            'Status',
                        ),
                        React.createElement(
                            'div',
                            { className: 'mt-1' },
                            React.createElement(
                                'span',
                                {
                                    className:
                                        'inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium',
                                },
                                React.createElement(CheckCircle, {
                                    className: 'h-3 w-3',
                                }),
                                'Approved & Authorized',
                            ),
                        ),
                    ),
                ),
                // Recipient Selection
                React.createElement(
                    'div',
                    null,
                    React.createElement(
                        'p',
                        {
                            className:
                                'text-sm font-medium text-slate-700 dark:text-slate-300 mb-3',
                        },
                        'Select recipients for GRN copies:',
                    ),
                    React.createElement(
                        'div',
                        { className: 'space-y-3' },
                        recipientOptions.map((option) =>
                            React.createElement(
                                'label',
                                {
                                    key: option.key,
                                    className: `flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                                        selectedRecipients[option.key]
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    } ${!option.email ? 'opacity-50 cursor-not-allowed' : ''}`,
                                },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked:
                                        selectedRecipients[option.key] || false,
                                    onChange: (e) =>
                                        onRecipientChange(
                                            option.key,
                                            e.target.checked,
                                        ),
                                    disabled: !option.email || isSending,
                                    className:
                                        'mt-1 h-4 w-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-800',
                                }),
                                React.createElement(
                                    'div',
                                    { className: 'flex-1' },
                                    React.createElement(
                                        'div',
                                        {
                                            className:
                                                'flex items-center gap-2 flex-wrap',
                                        },
                                        React.createElement(
                                            'div',
                                            {
                                                className:
                                                    'flex items-center gap-2',
                                            },
                                            option.icon,
                                            React.createElement(
                                                'span',
                                                {
                                                    className:
                                                        'font-medium text-slate-900 dark:text-slate-100',
                                                },
                                                option.label,
                                            ),
                                        ),
                                        React.createElement(
                                            'span',
                                            {
                                                className: `text-xs px-2 py-0.5 rounded-full ${option.copyColor}`,
                                            },
                                            option.copyType + ' Copy',
                                        ),
                                        !option.email &&
                                            React.createElement(
                                                'span',
                                                {
                                                    className:
                                                        'text-xs text-red-500 dark:text-red-400',
                                                },
                                                '(No email configured)',
                                            ),
                                    ),
                                    React.createElement(
                                        'p',
                                        {
                                            className:
                                                'text-sm text-slate-500 dark:text-slate-400 mt-0.5',
                                        },
                                        option.description,
                                    ),
                                    option.email &&
                                        React.createElement(
                                            'p',
                                            {
                                                className:
                                                    'text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono',
                                            },
                                            option.email,
                                        ),
                                ),
                            ),
                        ),
                    ),
                ),
                // Info Note
                React.createElement(
                    'div',
                    {
                        className:
                            'flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50',
                    },
                    React.createElement(AlertCircle, {
                        className:
                            'h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5',
                    }),
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'p',
                            {
                                className:
                                    'text-sm text-blue-700 dark:text-blue-300',
                            },
                            'Each recipient will receive a PDF copy of the GRN with their designated copy (Original, Duplicate, or Triplicate) for their records.',
                        ),
                        React.createElement(
                            'p',
                            {
                                className:
                                    'text-xs text-blue-600 dark:text-blue-400 mt-1',
                            },
                            'Copies will be sent as email attachments.',
                        ),
                    ),
                ),
            ),
            // Footer
            React.createElement(
                'div',
                {
                    className:
                        'flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700',
                },
                React.createElement(
                    'button',
                    {
                        onClick: onClose,
                        className:
                            'px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors',
                        disabled: isSending,
                    },
                    'Cancel',
                ),
                React.createElement(
                    'button',
                    {
                        onClick: handleSend,
                        disabled: !isAnyRecipientSelected || isSending,
                        className: `px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-all ${
                            !isAnyRecipientSelected || isSending
                                ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/40'
                        }`,
                    },
                    isSending
                        ? [
                              React.createElement(Loader2, {
                                  key: 'loader',
                                  className: 'h-4 w-4 animate-spin',
                              }),
                              'Sending...',
                          ]
                        : [
                              React.createElement(Send, {
                                  key: 'send',
                                  className: 'h-4 w-4',
                              }),
                              'Send Copies',
                          ],
                ),
            ),
        ),
    );
};

export default function GoodsRecievedNote() {
    // shared inertia props
    const { hospitalDetails, goodsReceivedNotes } = usePage().props;
    console.log(goodsReceivedNotes, 'goodsReceivedNotes');
    const [grnModal, setGrnModal] = useState(false);
    const [selectedGRN, setSelectedGRN] = useState(null);
    const [modalMode, setModalMode] = useState('view'); // 'view', 'print', or 'email'
    const [isEmailing, setIsEmailing] = useState(false);
    const [emailRecipients, setEmailRecipients] = useState({
        supplier: false,
        accounts: false,
        pharmacy: false,
    });

    // Check if GRN is approved
    const isGRNApproved = (grn) => {
        return grn?.status === 'approved';
    };

    // Define table columns with proper formatting
    const columns = [
        {
            id: 'grn_number',
            label: 'GRN #',
            minWidth: 100,
            format: (value) =>
                React.createElement(
                    'span',
                    {
                        className:
                            'font-mono text-sm font-medium text-blue-600 dark:text-blue-400',
                    },
                    value || 'N/A',
                ),
            sortable: true,
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 130,
            format: (value, row) => {
                const supplierName = getSupplierName(row);
                return React.createElement(
                    'div',
                    { className: 'flex items-center gap-2' },
                    React.createElement(Building, {
                        className:
                            'h-3.5 w-3.5 text-slate-400 dark:text-slate-500',
                    }),
                    React.createElement(
                        'span',
                        {
                            className:
                                'text-sm text-slate-700 dark:text-slate-300',
                        },
                        supplierName,
                    ),
                );
            },
            sortable: true,
        },
        {
            id: 'total_items',
            label: 'Items',
            minWidth: 60,
            format: (value, row) => {
                const count = row.grn_item?.length || 0;
                return React.createElement(
                    'span',
                    {
                        className: `inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                            count > 0
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`,
                    },
                    count,
                );
            },
            sortable: true,
        },
        {
            id: 'received_date',
            label: 'Received Date',
            minWidth: 90,
            format: (value) =>
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-1.5' },
                    React.createElement(Calendar, {
                        className:
                            'h-3.5 w-3.5 text-slate-400 dark:text-slate-500',
                    }),
                    React.createElement(
                        'span',
                        {
                            className:
                                'text-sm text-slate-600 dark:text-slate-400',
                        },
                        formatDate(value),
                    ),
                ),
            sortable: true,
        },
        {
            id: 'total_amount',
            label: 'Total Amount',
            minWidth: 100,
            format: (value) =>
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-1.5' },
                    React.createElement(DollarSign, {
                        className:
                            'h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400',
                    }),
                    React.createElement(
                        'span',
                        {
                            className:
                                'text-sm font-semibold text-slate-800 dark:text-slate-200',
                        },
                        formatCurrency(value),
                    ),
                ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 90,
            format: (value) => {
                const config = getStatusConfig(value);
                return React.createElement(
                    'span',
                    {
                        className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`,
                    },
                    config.icon,
                    config.label,
                );
            },
            sortable: true,
        },
    ];

    // Format data for the table with unique keys
    const tableData =
        goodsReceivedNotes?.map((grn) => {
            // Calculate total amount from grn items
            const calculatedTotal =
                grn.grn_item?.reduce((sum, item) => {
                    const itemTotal =
                        parseFloat(item.total_price) ||
                        (parseFloat(item.unit_price) || 0) *
                            (parseFloat(item.quantity_received) || 0);
                    return sum + itemTotal;
                }, 0) || 0;

            return {
                ...grn,
                id:
                    grn.id ||
                    grn.grn_number ||
                    Math.random().toString(36).substr(2, 9),
                supplier_name:
                    grn.supplier?.supplier_name || grn.supplier?.name || 'N/A',
                grn_item: grn.grn_item || [],
                total_items: grn.grn_item?.length || 0,
                total_amount: calculatedTotal, // Use calculated total
                key:
                    grn.id ||
                    grn.grn_number ||
                    Math.random().toString(36).substr(2, 9),
            };
        }) || [];

    // Define actions for the table
    const actions = [
        {
            label: 'View',
            icon: React.createElement(Eye, { className: 'h-4 w-4' }),
            onClick: (row) => handleViewGRN(row),
            className:
                'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
        },
        {
            label: 'Print',
            icon: React.createElement(Printer, { className: 'h-4 w-4' }),
            onClick: (row) => handleGRNPrintView(row),
            className:
                'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300',
        },
        {
            label: 'Download',
            icon: React.createElement(Download, { className: 'h-4 w-4' }),
            onClick: (row) => handleDownloadGRN(row),
            className:
                'text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300',
        },
        {
            label: 'Email Copies',
            icon: React.createElement(Mail, { className: 'h-4 w-4' }),
            onClick: (row) => handleEmailGRNCopies(row),
            className:
                'text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300',
            disabled: (row) => !isGRNApproved(row),
            disabledMessage: 'GRN must be approved to email copies',
        },
    ];

    // Handle view GRN
    const handleViewGRN = (grn) => {
        setSelectedGRN(grn);
        setModalMode('view');
        setGrnModal(true);
    };

    // Handle print view
    const handleGRNPrintView = (grn) => {
        setSelectedGRN(grn);
        setModalMode('print');
        setGrnModal(true);
    };

    // Handle download GRN
    const handleDownloadGRN = (grn) => {
        window.open(`/grn/${grn.id}/download`, '_blank');
    };

    // Handle email GRN copies
    const handleEmailGRNCopies = (grn) => {
        if (!isGRNApproved(grn)) {
            toast.error('Cannot email copies. GRN must be approved first.');
            return;
        }

        setSelectedGRN(grn);
        setEmailRecipients({
            supplier: true,
            accounts: true,
            pharmacy: true,
        });
        setModalMode('email');
        setGrnModal(true);
    };

    // Send email with GRN copies
    const sendGRNEmails = async (recipients) => {
        if (!selectedGRN) return;

        setIsEmailing(true);
        try {
            const response = await axios.post(
                `/grn/${selectedGRN.id}/send-emails`,
                {
                    grn_id: selectedGRN.id,
                    recipients: Object.keys(recipients).filter(
                        (key) => recipients[key],
                    ),
                    accounts_email: hospitalDetails?.accounts_email,
                    pharmacy_email: hospitalDetails?.pharmacy_email,
                },
            );

            if (response.data.success) {
                toast.success(
                    `GRN copies sent successfully to ${response.data.sent_to.join(', ')}`,
                );
                const updatedGRN = {
                    ...selectedGRN,
                    email_sent_to: response.data.sent_to,
                    email_sent_at: new Date().toISOString(),
                };
                setSelectedGRN(updatedGRN);
            }
        } catch (error) {
            console.error('Error sending emails:', error);
            toast.error(
                error.response?.data?.message ||
                    'Failed to send email copies. Please try again.',
            );
        } finally {
            setIsEmailing(false);
            handleCloseModal();
        }
    };

    // Handle modal close
    const handleCloseModal = () => {
        setGrnModal(false);
        setSelectedGRN(null);
        setModalMode('view');
        setEmailRecipients({
            supplier: false,
            accounts: false,
            pharmacy: false,
        });
    };

    // Handle print action from modal
    const handlePrint = () => {
        window.print();
    };

    // Get recipient email addresses
    const getRecipientEmails = () => {
        if (!selectedGRN) return {};

        return {
            supplier: selectedGRN.supplier?.email || '',
            accounts: hospitalDetails?.accounts_email || '',
            pharmacy: hospitalDetails?.pharmacy_email || '',
        };
    };

    return React.createElement(
        AppLayout,
        {
            breadcrumbs: [
                { title: 'Home', href: '/' },
                { title: 'Inventory', href: '/inventory' },
                { title: 'GRN', href: '/grn' },
            ],
        },
        React.createElement(
            'div',
            { className: 'p-6 bg-blue-50 h-full' },
            React.createElement(PageHeader, {
                icon: React.createElement(FileText, { className: 'h-6 w-6' }),
                subtitle: 'Manage Goods Received Notes',
                title: 'Goods Received Notes',
            }),
            React.createElement(
                'div',
                { className: 'mt-6' },
                React.createElement(ResusableTable, {
                    data: tableData,
                    columns: columns,
                    actions: actions,
                    searchable: true,
                    searchPlaceholder:
                        'Search GRN by number, supplier, or invoice...',
                    pagination: true,
                    itemsPerPage: 10,
                    className:
                        'bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden',
                    emptyMessage: React.createElement(
                        'div',
                        { className: 'text-center py-12' },
                        React.createElement(FileText, {
                            className:
                                'h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-4',
                        }),
                        React.createElement(
                            'p',
                            { className: 'text-slate-500 dark:text-slate-400' },
                            'No Goods Received Notes found.',
                        ),
                        React.createElement(
                            'p',
                            {
                                className:
                                    'text-sm text-slate-400 dark:text-slate-500 mt-1',
                            },
                            'Create your first GRN by clicking the "New GRN" button.',
                        ),
                    ),
                }),
            ),
            modalMode === 'email' &&
                selectedGRN &&
                React.createElement(EmailGRNModal, {
                    isOpen: grnModal,
                    onClose: handleCloseModal,
                    grn: selectedGRN,
                    recipients: getRecipientEmails(),
                    selectedRecipients: emailRecipients,
                    onRecipientChange: (key, checked) => {
                        setEmailRecipients((prev) => ({
                            ...prev,
                            [key]: checked,
                        }));
                    },
                    onSend: sendGRNEmails,
                    isSending: isEmailing,
                    hospitalDetails: hospitalDetails,
                }),
            (modalMode === 'view' || modalMode === 'print') &&
                React.createElement(GRNModal, {
                    isOpen: grnModal,
                    onClose: handleCloseModal,
                    data: {
                        ...selectedGRN,
                        items: selectedGRN?.grn_item || [],
                    },
                    mode: modalMode,
                    hospitalDetails: hospitalDetails,
                    onPrint: handlePrint,
                    isApprovedAndAuthorized: isGRNApproved(selectedGRN),
                    renderProductsTable: renderProductsTable,
                }),
        ),
    );
}
