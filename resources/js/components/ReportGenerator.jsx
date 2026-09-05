// components/ReportGenerator.jsx

import React, { useState } from 'react';
import ReportService from '../services/ReportService';
import ReportGenerator from '../services/ReportGenerator';

const ReportGeneratorComponent = () => {
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('adjustment');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filters, setFilters] = useState({});
    const [error, setError] = useState(null);

    const columnConfigs = {
        adjustment: [
            { key: 'date', header: 'Date', type: 'date', width: 15 },
            { key: 'sku', header: 'SKU', type: 'text', width: 12 },
            { key: 'product_name', header: 'Product Name', type: 'text', width: 30 },
            { key: 'location', header: 'Location', type: 'text', width: 18 },
            { key: 'adjustment_type', header: 'Adjustment Type', type: 'text', width: 16 },
            { key: 'quantity', header: 'Quantity', type: 'number', width: 12 },
            { key: 'reason', header: 'Reason', type: 'text', width: 25 },
            { key: 'adjusted_by', header: 'Adjusted By', type: 'text', width: 18 },
            { key: 'approved_by', header: 'Approved By', type: 'text', width: 18 },
            { key: 'total_value', header: 'Total Value', type: 'currency', width: 14 }
        ],
        current_stock: [
            { key: 'sku', header: 'SKU', type: 'text', width: 12 },
            { key: 'product_name', header: 'Product Name', type: 'text', width: 30 },
            { key: 'category', header: 'Category', type: 'text', width: 20 },
            { key: 'location', header: 'Location', type: 'text', width: 18 },
            { key: 'quantity', header: 'Quantity', type: 'number', width: 12 },
            { key: 'reorder_level', header: 'Reorder Level', type: 'number', width: 14 },
            { key: 'unit_cost', header: 'Unit Cost', type: 'currency', width: 14 },
            { key: 'total_value', header: 'Total Value', type: 'currency', width: 14 },
            { key: 'status', header: 'Status', type: 'text', width: 14 },
            { key: 'last_movement', header: 'Last Movement', type: 'date', width: 14 }
        ],
        stock_movement: [
            { key: 'date', header: 'Date', type: 'datetime', width: 18 },
            { key: 'sku', header: 'SKU', type: 'text', width: 12 },
            { key: 'product_name', header: 'Product Name', type: 'text', width: 30 },
            { key: 'location', header: 'Location', type: 'text', width: 18 },
            { key: 'movement_type', header: 'Movement Type', type: 'text', width: 16 },
            { key: 'quantity', header: 'Quantity', type: 'number', width: 12 },
            { key: 'reference', header: 'Reference', type: 'text', width: 20 },
            { key: 'user', header: 'User', type: 'text', width: 18 }
        ],
        requisition: [
            { key: 'requisition_no', header: 'Requisition No.', type: 'text', width: 16 },
            { key: 'department', header: 'Department', type: 'text', width: 22 },
            { key: 'requested_by', header: 'Requested By', type: 'text', width: 18 },
            { key: 'request_date', header: 'Request Date', type: 'date', width: 15 },
            { key: 'status', header: 'Status', type: 'text', width: 14 },
            { key: 'items', header: 'Items', type: 'number', width: 10 },
            { key: 'total_quantity', header: 'Total Qty', type: 'number', width: 12 },
            { key: 'total_value', header: 'Total Value', type: 'currency', width: 14 },
            { key: 'approved_by', header: 'Approved By', type: 'text', width: 18 },
            { key: 'approval_date', header: 'Approval Date', type: 'date', width: 15 }
        ]
    };

    const reportTypes = [
        { value: 'adjustment', label: 'Adjustment Report' },
        { value: 'current_stock', label: 'Current Stock Report' },
        { value: 'stock_movement', label: 'Stock Movement Report' },
        { value: 'requisition', label: 'Requisition Report' }
    ];

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch data from backend
            const response = await ReportService.fetchReportData({
                reportType: reportType,
                reportName: `${reportType}_report`,
                dateFrom: dateFrom || null,
                dateTo: dateTo || null,
                filters: filters
            });

            if (!response.success) {
                throw new Error('Failed to fetch report data');
            }

            // Generate and download report
            await ReportGenerator.downloadReport(response, {
                reportName: `${reportType}_report`,
                title: reportTypes.find(r => r.value === reportType)?.label || 'Report',
                columns: columnConfigs[reportType],
                sheetName: 'Report',
                generatedBy: 'User',
                dateRange: {
                    from: dateFrom || 'All',
                    to: dateTo || 'All'
                }
            });

        } catch (err) {
            setError(err.message);
            console.error('Report generation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="report-generator">
            <h2>Generate Report</h2>
            
            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            <div className="form-group">
                <label>Report Type</label>
                <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                >
                    {reportTypes.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label>Date From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Date To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>Filters (JSON)</label>
                <textarea
                    value={JSON.stringify(filters, null, 2)}
                    onChange={(e) => {
                        try {
                            setFilters(JSON.parse(e.target.value));
                        } catch {
                            // Invalid JSON, ignore
                        }
                    }}
                    rows={3}
                    placeholder='{"location_id": [1, 2, 3]}'
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="generate-button"
            >
                {loading ? 'Generating...' : 'Generate Report'}
            </button>
        </div>
    );
};

export default ReportGeneratorComponent;