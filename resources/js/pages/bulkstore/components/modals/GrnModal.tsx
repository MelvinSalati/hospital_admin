import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Printer,
    Download,
    Mail,
    CheckCircle,
    FileText,
    Calendar,
    Building,
    User,
    Package,
    Clock,
    Check,
    XCircle,
    Shield,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import QRCode from 'qrcode';

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

const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getStatusConfig = (status) => {
    const configs = {
        draft: {
            label: 'Draft',
            color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            icon: React.createElement(Clock, { className: 'h-3 w-3' }),
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
            icon: React.createElement(XCircle, { className: 'h-3 w-3' }),
        },
    };
    return configs[status] || configs.draft;
};

// GRN QR Code Component - Redirects to Approval Page
const GRNQRCode = ({ grnNumber, grnId, supplier, totalAmount, status }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            // Create the approval URL - this will redirect when scanned
            const approvalUrl = `${window.location.origin}/bulkstore/grn/approve/${grnId}`;

            QRCode.toCanvas(
                canvasRef.current,
                approvalUrl, // Just the URL - no JSON
                {
                    width: 180,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff',
                    },
                    errorCorrectionLevel: 'H',
                },
                (error) => {
                    if (error) {
                        console.error('Error generating QR code:', error);
                    }
                },
            );
        }
    }, [grnId]);

    const viewQRCode = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            const newWindow = window.open('', '_blank', 'width=450,height=550');
            if (newWindow) {
                newWindow.document.write(
                    `<html><head><title>GRN QR - ${grnNumber}</title>`,
                );
                newWindow.document.write(`<style>
                    body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5;font-family:Arial,sans-serif;}
                    .container{background:white;padding:30px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;}
                    h2{color:#333;margin-bottom:10px;font-size:16px;}
                    .info{color:#666;font-size:12px;margin:3px 0;}
                    .scan-instruction{color:#999;font-size:11px;margin-top:10px;font-style:italic;}
                    .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-top:5px;}
                    .status-pending{background:#fef3c7;color:#92400e;}
                    .status-approved{background:#d1fae5;color:#065f46;}
                    .status-rejected{background:#fee2e2;color:#991b1b;}
                </style></head><body>`);
                newWindow.document.write(`<div class="container">`);
                newWindow.document.write(`<h2>${grnNumber}</h2>`);
                newWindow.document.write(
                    `<img src="${dataUrl}" style="max-width:280px;"/>`,
                );
                newWindow.document.write(
                    `<p class="info">Supplier: ${supplier?.supplier_name || 'N/A'}</p>`,
                );
                newWindow.document.write(
                    `<p class="info">Total: ${formatCurrency(totalAmount)}</p>`,
                );
                newWindow.document.write(
                    `<p class="scan-instruction">📱 Scan this QR code to approve the GRN</p>`,
                );
                newWindow.document.write(
                    `<p style="font-size:10px;color:#aaa;margin-top:8px;">You will be redirected to the approval page</p>`,
                );
                newWindow.document.write(`</div></body></html>`);
                newWindow.document.close();
            }
        }
    };

    return React.createElement(
        'div',
        {
            className:
                'flex flex-col items-center cursor-pointer hover:opacity-90 transition-opacity',
            onClick: viewQRCode,
            title: 'Scan to approve GRN',
        },
        React.createElement('canvas', {
            ref: canvasRef,
            className: 'w-40 h-40',
        }),
        React.createElement(
            'div',
            { className: 'flex items-center gap-1.5 mt-1' },
            React.createElement(Shield, {
                className: 'h-3 w-3 text-emerald-600 dark:text-emerald-400',
            }),
            React.createElement(
                'p',
                {
                    className:
                        'text-[10px] text-emerald-600 dark:text-emerald-400 font-medium',
                },
                'Scan to Approve',
            ),
        ),
    );
};

// Render Products Table
const renderProductsTable = (grnItems) => {
    if (!grnItems || grnItems.length === 0) {
        return React.createElement(
            'div',
            {
                className:
                    'text-center py-6 text-slate-500 dark:text-slate-400 text-sm',
            },
            'No products found for this GRN',
        );
    }

    const hasPriceData = grnItems.some(
        (item) => parseFloat(item.unit_price) > 0,
    );

    const totalReceived = grnItems.reduce(
        (sum, item) => sum + (parseFloat(item.quantity_received) || 0),
        0,
    );
    const totalDamaged = grnItems.reduce(
        (sum, item) => sum + (parseFloat(item.quantity_rejected) || 0),
        0,
    );
    const totalUnitPrice = grnItems.reduce(
        (sum, item) => sum + (parseFloat(item.unit_price) || 0),
        0,
    );
    const totalAmount = grnItems.reduce((sum, item) => {
        const total =
            parseFloat(item.total_price) ||
            (parseFloat(item.unit_price) || 0) *
                (parseFloat(item.quantity_received) || 0);
        return sum + total;
    }, 0);

    return React.createElement(
        'div',
        { className: 'overflow-x-auto' },
        React.createElement(
            'table',
            { className: 'w-full text-xs' },
            React.createElement(
                'thead',
                { className: 'bg-slate-50 dark:bg-slate-800/50' },
                React.createElement(
                    'tr',
                    null,
                    [
                        '#',
                        'Product',
                        'Qty Rcvd',
                        'Qty Damaged',
                        'Batch',
                        ...(hasPriceData ? ['Unit Price', 'Total'] : []),
                        'Status',
                    ].map((header) =>
                        React.createElement(
                            'th',
                            {
                                key: header,
                                className:
                                    'px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] sticky top-0 bg-slate-50 dark:bg-slate-800/50',
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
                        'Unknown';
                    const batchNumber = item.batch_number || 'N/A';
                    const unitsReceived =
                        parseFloat(item.quantity_received) || 0;
                    const unitsDamaged =
                        parseFloat(item.quantity_rejected) || 0;
                    const unitPrice = parseFloat(item.unit_price) || 0;
                    const totalPrice =
                        parseFloat(item.total_price) ||
                        unitPrice * unitsReceived;
                    const priceSource = item.price_source || 'none';

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
                            label: 'R',
                            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        },
                        product: {
                            label: 'P',
                            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        },
                        default: {
                            label: 'D',
                            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                        },
                        none: {
                            label: 'N',
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
                            { className: 'px-3 py-2 text-slate-500' },
                            index + 1,
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-3 py-2 font-medium text-slate-800 dark:text-slate-200',
                            },
                            productName,
                            item.product?.strength &&
                                React.createElement(
                                    'span',
                                    { className: 'ml-1 text-slate-400' },
                                    `(${item.product.strength})`,
                                ),
                            hasPriceData &&
                                React.createElement(
                                    'span',
                                    {
                                        className: `ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${sourceConfig.color}`,
                                        title: `Price from: ${sourceConfig.label === 'R' ? 'Requisition' : sourceConfig.label === 'P' ? 'Product' : 'Default'}`,
                                    },
                                    sourceConfig.label,
                                ),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-3 py-2 text-slate-600 text-right',
                            },
                            unitsReceived.toFixed(2),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-3 py-2 text-slate-600 text-right',
                            },
                            unitsDamaged.toFixed(2),
                        ),
                        React.createElement(
                            'td',
                            {
                                className:
                                    'px-3 py-2 font-mono text-slate-500 text-xs',
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
                                              'px-3 py-2 text-slate-600 text-right font-medium',
                                      },
                                      unitPrice > 0
                                          ? formatCurrency(unitPrice)
                                          : '-',
                                  ),
                                  React.createElement(
                                      'td',
                                      {
                                          key: 'total',
                                          className:
                                              'px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 text-right',
                                      },
                                      totalPrice > 0
                                          ? formatCurrency(totalPrice)
                                          : '-',
                                  ),
                              ]
                            : []),
                        React.createElement(
                            'td',
                            { className: 'px-3 py-2' },
                            React.createElement(
                                'span',
                                {
                                    className: `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`,
                                },
                                item.quality_status || 'pending',
                            ),
                        ),
                    );
                }),
            ),
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
                        className: 'px-3 py-2',
                        colSpan: 2,
                    }),
                    React.createElement(
                        'td',
                        {
                            className:
                                'px-3 py-2 text-slate-700 dark:text-slate-300 text-right',
                        },
                        totalReceived.toFixed(2),
                    ),
                    React.createElement(
                        'td',
                        {
                            className:
                                'px-3 py-2 text-slate-700 dark:text-slate-300 text-right',
                        },
                        totalDamaged.toFixed(2),
                    ),
                    React.createElement('td', { className: 'px-3 py-2' }),
                    ...(hasPriceData
                        ? [
                              React.createElement(
                                  'td',
                                  {
                                      key: 'total-unit-price',
                                      className:
                                          'px-3 py-2 text-slate-700 dark:text-slate-300 text-right',
                                  },
                                  formatCurrency(totalUnitPrice),
                              ),
                              React.createElement(
                                  'td',
                                  {
                                      key: 'grand-total',
                                      className:
                                          'px-3 py-2 font-bold text-slate-900 dark:text-slate-100 text-right text-sm',
                                  },
                                  formatCurrency(totalAmount),
                              ),
                          ]
                        : []),
                    React.createElement('td', { className: 'px-3 py-2' }),
                ),
            ),
        ),
    );
};

const GRNModal = ({
    isOpen,
    onClose,
    data,
    mode,
    hospitalDetails,
    onPrint,
    isApprovedAndAuthorized,
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isEmailing, setIsEmailing] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    const statusConfig = getStatusConfig(data.status);
    const isPrintMode = mode === 'print';
    const grnItems = data?.grn_item || data?.items || [];

    const totalAmount = grnItems.reduce((sum, item) => {
        const total =
            parseFloat(item.total_price) ||
            (parseFloat(item.unit_price) || 0) *
                (parseFloat(item.quantity_received) || 0);
        return sum + total;
    }, 0);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await axios.get(`/grn/${data.id}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `GRN-${data.grn_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('GRN downloaded successfully');
        } catch (error) {
            toast.error('Failed to download GRN');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleEmail = async () => {
        if (!isApprovedAndAuthorized) {
            toast.error('GRN must be approved to email');
            return;
        }
        setIsEmailing(true);
        try {
            const response = await axios.post(`/grn/${data.id}/email`, {
                grn_id: data.id,
                email: hospitalDetails?.accounts_email || '',
            });
            if (response.data.success) {
                toast.success('GRN emailed successfully');
            }
        } catch (error) {
            toast.error('Failed to email GRN');
        } finally {
            setIsEmailing(false);
        }
    };

    const hospitalPhone =
        hospitalDetails?.phone || '+260 970 684 418 / +260 770 798 007';

    return React.createElement(
        'div',
        { className: 'fixed inset-0 z-50 overflow-y-auto' },
        React.createElement(
            'div',
            { className: 'flex min-h-screen items-center justify-center p-3' },
            React.createElement('div', {
                className: 'fixed inset-0 bg-black/40 backdrop-blur-sm',
                onClick: onClose,
            }),
            React.createElement(
                'div',
                {
                    ref: modalRef,
                    className: `relative w-[900px] max-w-6xl bg-white dark:bg-slate-900 rounded-lg mx-auto flex flex-col max-h-[95vh]`,
                },
                // Fixed Header - No Overflow
                !isPrintMode &&
                    React.createElement(
                        'div',
                        {
                            className:
                                'flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 rounded-t-lg',
                        },
                        React.createElement(
                            'div',
                            { className: 'flex items-center gap-2 min-w-0' },
                            React.createElement(FileText, {
                                className:
                                    'h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0',
                            }),
                            React.createElement(
                                'span',
                                {
                                    className:
                                        'font-semibold text-slate-800 dark:text-slate-200 text-sm truncate',
                                },
                                data.grn_number,
                            ),
                            React.createElement(
                                'span',
                                {
                                    className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color} flex-shrink-0`,
                                },
                                statusConfig.icon,
                                statusConfig.label,
                            ),
                            totalAmount > 0 &&
                                React.createElement(
                                    'span',
                                    {
                                        className:
                                            'ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[10px] font-medium flex-shrink-0',
                                    },
                                    formatCurrency(totalAmount),
                                ),
                        ),
                        React.createElement(
                            'div',
                            {
                                className:
                                    'flex items-center gap-1 flex-shrink-0',
                            },
                            React.createElement(
                                'button',
                                {
                                    onClick: handleDownload,
                                    disabled: isDownloading,
                                    className:
                                        'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors',
                                },
                                isDownloading
                                    ? React.createElement('div', {
                                          className:
                                              'h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent',
                                      })
                                    : React.createElement(Download, {
                                          className: 'h-4 w-4 text-slate-500',
                                      }),
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: handleEmail,
                                    disabled:
                                        isEmailing || !isApprovedAndAuthorized,
                                    className: `p-1.5 rounded transition-colors ${isApprovedAndAuthorized ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : 'opacity-50 cursor-not-allowed'}`,
                                },
                                isEmailing
                                    ? React.createElement('div', {
                                          className:
                                              'h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent',
                                      })
                                    : React.createElement(Mail, {
                                          className: 'h-4 w-4 text-slate-500',
                                      }),
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: onPrint,
                                    className:
                                        'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors',
                                },
                                React.createElement(Printer, {
                                    className: 'h-4 w-4 text-slate-500',
                                }),
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: onClose,
                                    className:
                                        'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors',
                                },
                                React.createElement(X, {
                                    className: 'h-4 w-4 text-slate-500',
                                }),
                            ),
                        ),
                    ),
                // Scrollable Body
                React.createElement(
                    'div',
                    {
                        className: `flex-1 overflow-y-auto p-4 ${isPrintMode ? 'print:p-3' : ''}`,
                    },
                    // Top Row: QR Code Left | Hospital Details Right
                    React.createElement(
                        'div',
                        {
                            className:
                                'flex items-start gap-6 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700',
                        },
                        React.createElement(
                            'div',
                            { className: 'flex-shrink-0' },
                            React.createElement(GRNQRCode, {
                                grnNumber: data.grn_number,
                                grnId: data.id,
                                supplier: data.supplier,
                                totalAmount: totalAmount,
                                status: data.status,
                            }),
                        ),
                        React.createElement(
                            'div',
                            { className: 'flex-1 text-right min-w-0' },
                            React.createElement(
                                'h2',
                                {
                                    className:
                                        'text-lg font-bold text-slate-900 dark:text-slate-100',
                                },
                                hospitalDetails?.name ||
                                    'Altaf Memorial Hospital',
                            ),
                            React.createElement(
                                'p',
                                {
                                    className:
                                        'text-xs text-slate-500 dark:text-slate-400 mt-0.5',
                                },
                                'Plot 21/22 Parerenyatwa Road, Moth, Chipata, Eastern Province, Zambia',
                            ),
                            React.createElement(
                                'p',
                                {
                                    className:
                                        'text-xs text-slate-500 dark:text-slate-400',
                                },
                                'Landmark: Opposite Wildlife',
                            ),
                            React.createElement(
                                'p',
                                {
                                    className:
                                        'text-xs text-slate-500 dark:text-slate-400',
                                },
                                `Phone: ${hospitalPhone}`,
                            ),
                            React.createElement(
                                'p',
                                {
                                    className:
                                        'text-xs text-slate-500 dark:text-slate-400',
                                },
                                `Email: ${hospitalDetails?.email || 'info@hospital.com'}`,
                            ),
                            React.createElement(
                                'div',
                                { className: 'mt-2' },
                                React.createElement(
                                    'h3',
                                    {
                                        className:
                                            'text-sm font-bold text-blue-600 dark:text-blue-400',
                                    },
                                    'GOODS RECEIVED NOTE',
                                ),
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5',
                                    },
                                    data.grn_number,
                                ),
                            ),
                        ),
                    ),
                    // GRN Details - 2 Rows x 2 Columns
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-2 gap-4 mb-4' },
                        React.createElement(
                            'div',
                            { className: 'grid grid-cols-2 gap-4 col-span-2' },
                            // Supplier
                            React.createElement(
                                'div',
                                {
                                    className:
                                        'p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg',
                                },
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'text-[10px] font-medium text-slate-400 uppercase tracking-wider',
                                    },
                                    'Supplier',
                                ),
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'font-medium text-slate-800 dark:text-slate-200 text-sm',
                                    },
                                    data.supplier?.supplier_name || 'N/A',
                                ),
                                data.supplier?.address &&
                                    React.createElement(
                                        'p',
                                        {
                                            className:
                                                'text-xs text-slate-500 dark:text-slate-400',
                                        },
                                        data.supplier.address,
                                    ),
                                data.supplier?.phone &&
                                    React.createElement(
                                        'p',
                                        {
                                            className:
                                                'text-xs text-slate-500 dark:text-slate-400',
                                        },
                                        `Tel: ${data.supplier.phone}`,
                                    ),
                            ),
                            // Received By
                            React.createElement(
                                'div',
                                {
                                    className:
                                        'p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg',
                                },
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'text-[10px] font-medium text-slate-400 uppercase tracking-wider',
                                    },
                                    'Received By',
                                ),
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'font-medium text-slate-800 dark:text-slate-200 text-sm',
                                    },
                                    data.received_by?.name ||
                                        data.received_by_name ||
                                        'N/A',
                                ),
                                data.received_by?.email &&
                                    React.createElement(
                                        'p',
                                        {
                                            className:
                                                'text-xs text-slate-500 dark:text-slate-400',
                                        },
                                        data.received_by.email,
                                    ),
                            ),
                        ),
                        React.createElement(
                            'div',
                            { className: 'grid grid-cols-2 gap-4 col-span-2' },
                            // PO Reference
                            React.createElement(
                                'div',
                                {
                                    className:
                                        'p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg',
                                },
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'text-[10px] font-medium text-slate-400 uppercase tracking-wider',
                                    },
                                    'PO Reference',
                                ),
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'font-mono text-slate-600 dark:text-slate-400 text-sm',
                                    },
                                    data.purchase_order_id
                                        ? `PO-${data.purchase_order_id}`
                                        : 'N/A',
                                ),
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'text-xs text-slate-500 dark:text-slate-400',
                                    },
                                    `Received: ${formatDate(data.received_date)}`,
                                ),
                            ),
                            // Total Value
                            React.createElement(
                                'div',
                                {
                                    className:
                                        'p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800/50',
                                },
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider',
                                    },
                                    'Total Value',
                                ),
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'font-bold text-emerald-600 dark:text-emerald-400 text-lg',
                                    },
                                    formatCurrency(totalAmount),
                                ),
                                React.createElement(
                                    'p',
                                    {
                                        className:
                                            'text-xs text-emerald-500 dark:text-emerald-400',
                                    },
                                    `${grnItems.length} item${grnItems.length !== 1 ? 's' : ''}`,
                                ),
                            ),
                        ),
                    ),
                    // Products Table
                    React.createElement(
                        'div',
                        null,
                        React.createElement(
                            'div',
                            {
                                className:
                                    'flex items-center justify-between mb-2',
                            },
                            React.createElement(
                                'h4',
                                {
                                    className:
                                        'text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5',
                                },
                                React.createElement(Package, {
                                    className: 'h-3.5 w-3.5 text-slate-400',
                                }),
                                `Products Received (${grnItems.length})`,
                            ),
                            React.createElement(
                                'span',
                                { className: 'text-[10px] text-slate-400' },
                                'R = Requisition • P = Product',
                            ),
                        ),
                        renderProductsTable(grnItems),
                    ),
                ),
                // Fixed Footer - No Overflow
                !isPrintMode &&
                    React.createElement(
                        'div',
                        {
                            className:
                                'flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 rounded-b-lg',
                        },
                        React.createElement(
                            'span',
                            null,
                            `Generated: ${formatDateTime(new Date().toISOString())}`,
                        ),
                        React.createElement(
                            'span',
                            null,
                            `GRN #${data.grn_number}`,
                        ),
                        isApprovedAndAuthorized &&
                            React.createElement(
                                'span',
                                {
                                    className:
                                        'flex items-center gap-1 text-green-600 dark:text-green-400 font-medium',
                                },
                                React.createElement(CheckCircle, {
                                    className: 'h-3 w-3',
                                }),
                                'Approved',
                            ),
                    ),
            ),
        ),
    );
};

export default GRNModal;
