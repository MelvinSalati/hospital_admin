// services/ReportService.js

class ReportService {
    /**
     * Fetch report data from backend
     */
    static async fetchReportData(options) {
        const response = await fetch('/api/reports/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
            },
            body: JSON.stringify({
                report_type: options.reportType,
                report_name: options.reportName || `${options.reportType}_report`,
                date_from: options.dateFrom || null,
                date_to: options.dateTo || null,
                filters: options.filters || {},
                fields: options.fields || null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }
}