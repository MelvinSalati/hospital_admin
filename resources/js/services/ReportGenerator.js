// services/ReportGenerator.js

import ExcelJS from 'exceljs';

class ReportGenerator {
    /**
     * Generate Excel report from data
     */
    static async generateReport(data, options) {
        const workbook = new ExcelJS.Workbook();
        
        // Add worksheet
        const worksheet = workbook.addWorksheet(options.sheetName || 'Report');
        
        // Build and apply styles
        this.applyStyles(worksheet);
        
        // Add header
        this.addHeader(worksheet, options);
        
        // Add column definitions
        this.addColumns(worksheet, options.columns);
        
        // Add data
        this.addData(worksheet, data.data, options.columns);
        
        // Add summary
        this.addSummary(worksheet, data.metadata, options);
        
        // Add footer
        this.addFooter(worksheet, options);
        
        return workbook;
    }

    /**
     * Apply default styles
     */
    static applyStyles(worksheet) {
        // Default styles for the entire sheet
        worksheet.properties.defaultRowHeight = 25;
        
        // Set page setup
        worksheet.pageSetup = {
            paperSize: 9, // A4
            orientation: 'landscape',
            margins: {
                left: 0.7,
                right: 0.7,
                top: 0.75,
                bottom: 0.75,
                header: 0.3,
                footer: 0.3
            }
        };
    }

    /**
     * Add header to worksheet
     */
    static addHeader(worksheet, options) {
        const title = options.title || options.reportName || 'Report';
        
        // Title row
        const titleRow = worksheet.getRow(1);
        titleRow.height = 35;
        titleRow.getCell(1).value = title;
        titleRow.getCell(1).font = {
            name: 'Arial',
            size: 18,
            bold: true,
            color: { argb: 'FF2C3E50' }
        };
        
        // Merge title across columns
        if (options.columns) {
            const mergeRange = `A1:${String.fromCharCode(64 + options.columns.length)}1`;
            worksheet.mergeCells(mergeRange);
        }
        
        // Subtitle with date range
        if (options.dateRange) {
            const subRow = worksheet.getRow(2);
            subRow.getCell(1).value = `Period: ${options.dateRange.from} - ${options.dateRange.to}`;
            subRow.getCell(1).font = {
                name: 'Arial',
                size: 11,
                color: { argb: 'FF7F8C8D' }
            };
            
            if (options.columns) {
                const mergeRange = `A2:${String.fromCharCode(64 + options.columns.length)}2`;
                worksheet.mergeCells(mergeRange);
            }
        }
        
        // Add spacing row
        worksheet.getRow(3).height = 10;
    }

    /**
     * Add column definitions and headers
     */
    static addColumns(worksheet, columns) {
        const headerRow = worksheet.getRow(4);
        
        // Set header row properties
        headerRow.height = 30;
        
        // Style mapping for column types
        const styleMap = {
            date: { numFmt: 'yyyy-mm-dd' },
            currency: { numFmt: '$#,##0.00' },
            number: { numFmt: '#,##0' },
            percentage: { numFmt: '0.00%' },
            text: {},
            datetime: { numFmt: 'yyyy-mm-dd hh:mm:ss' }
        };
        
        columns.forEach((col, index) => {
            const cell = headerRow.getCell(index + 1);
            const colLetter = String.fromCharCode(65 + index);
            
            // Set header value
            cell.value = col.header || col.name;
            
            // Header style
            cell.font = {
                name: 'Arial',
                size: 12,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2C3E50' }
            };
            cell.border = {
                top: { style: 'medium' },
                left: { style: 'medium' },
                bottom: { style: 'medium' },
                right: { style: 'medium' }
            };
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle'
            };
            
            // Set column width
            worksheet.getColumn(colLetter).width = col.width || 15;
            
            // Apply column style
            const columnStyle = styleMap[col.type] || styleMap.text;
            if (col.type === 'currency') {
                worksheet.getColumn(colLetter).numFmt = '$#,##0.00';
            } else if (col.type === 'date') {
                worksheet.getColumn(colLetter).numFmt = 'yyyy-mm-dd';
            } else if (col.type === 'datetime') {
                worksheet.getColumn(colLetter).numFmt = 'yyyy-mm-dd hh:mm:ss';
            }
        });
    }

    /**
     * Add data rows
     */
    static addData(worksheet, data, columns) {
        if (!data || data.length === 0) {
            const row = worksheet.getRow(5);
            row.getCell(1).value = 'No data available for the selected period';
            row.getCell(1).font = { color: { argb: 'FFE74C3C' } };
            return;
        }
        
        data.forEach((item, rowIndex) => {
            const row = worksheet.getRow(rowIndex + 5);
            row.height = 22;
            
            columns.forEach((col, colIndex) => {
                const cell = row.getCell(colIndex + 1);
                const value = item[col.key];
                
                // Set value based on type
                if (col.type === 'date' && value) {
                    cell.value = new Date(value);
                    cell.numFmt = 'yyyy-mm-dd';
                } else if (col.type === 'datetime' && value) {
                    cell.value = new Date(value);
                    cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
                } else if (col.type === 'currency') {
                    cell.value = parseFloat(value) || 0;
                    cell.numFmt = '$#,##0.00';
                } else if (col.type === 'number') {
                    cell.value = parseFloat(value) || 0;
                    cell.numFmt = '#,##0';
                } else if (col.type === 'percentage') {
                    cell.value = parseFloat(value) || 0;
                    cell.numFmt = '0.00%';
                } else {
                    cell.value = value || '';
                }
                
                // Apply cell styling
                cell.font = {
                    name: 'Arial',
                    size: 11
                };
                
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFBDC3C7' } },
                    left: { style: 'thin', color: { argb: 'FFBDC3C7' } },
                    bottom: { style: 'thin', color: { argb: 'FFBDC3C7' } },
                    right: { style: 'thin', color: { argb: 'FFBDC3C7' } }
                };
                
                // Alignment based on type
                if (['currency', 'number', 'percentage'].includes(col.type)) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
                
                // Highlight based on status
                if (col.key === 'status') {
                    this.applyStatusColor(cell, value);
                }
            });
        });
    }

    /**
     * Apply status colors
     */
    static applyStatusColor(cell, value) {
        const colors = {
            'Approved': { argb: 'FF27AE60' },
            'Pending': { argb: 'FFF39C12' },
            'Rejected': { argb: 'FFE74C3C' },
            'Completed': { argb: 'FF2980B9' },
            'Out of Stock': { argb: 'FFE74C3C' },
            'Low Stock': { argb: 'FFF39C12' },
            'In Stock': { argb: 'FF27AE60' },
            'Reorder Soon': { argb: 'FFE67E22' }
        };
        
        if (colors[value]) {
            cell.font = {
                ...cell.font,
                color: colors[value],
                bold: true
            };
        }
    }

    /**
     * Add summary section
     */
    static addSummary(worksheet, metadata, options) {
        const startRow = worksheet.lastRow?.number + 2 || 10;
        
        // Add separator
        const separatorRow = worksheet.getRow(startRow);
        separatorRow.height = 1;
        
        // Summary header
        const summaryHeaderRow = worksheet.getRow(startRow + 1);
        summaryHeaderRow.getCell(1).value = 'SUMMARY';
        summaryHeaderRow.getCell(1).font = {
            name: 'Arial',
            size: 14,
            bold: true,
            color: { argb: 'FF2C3E50' }
        };
        
        if (options.columns) {
            const mergeRange = `A${startRow + 1}:${String.fromCharCode(64 + options.columns.length)}${startRow + 1}`;
            worksheet.mergeCells(mergeRange);
        }
        
        // Summary data
        const summary = metadata.summary || {};
        const summaryRows = [
            ['Total Records', summary.total_records || 0],
            ['Total Quantity', summary.total_quantity || 0],
            ['Total Value', summary.total_value || 0],
        ];
        
        // Add type breakdown
        if (summary.by_type) {
            Object.entries(summary.by_type).forEach(([type, count]) => {
                summaryRows.push([`${type} (count)`, count]);
            });
        }
        
        summaryRows.forEach(([label, value], index) => {
            const row = worksheet.getRow(startRow + 2 + index);
            
            const labelCell = row.getCell(1);
            labelCell.value = label;
            labelCell.font = { name: 'Arial', size: 11, bold: true };
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
            
            const valueCell = row.getCell(2);
            valueCell.value = typeof value === 'number' ? value : value;
            valueCell.font = { name: 'Arial', size: 11 };
            valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
            
            // Apply currency formatting to value cells
            if (label.includes('Value') || label.includes('Cost')) {
                valueCell.numFmt = '$#,##0.00';
            }
        });
    }

    /**
     * Add footer
     */
    static addFooter(worksheet, options) {
        const rowNumber = worksheet.lastRow?.number + 2 || 20;
        
        // Footer text
        const footerRow = worksheet.getRow(rowNumber);
        const footerText = `Generated on: ${new Date().toLocaleString()} | Prepared by: ${options.generatedBy || 'System'}`;
        footerRow.getCell(1).value = footerText;
        footerRow.getCell(1).font = {
            name: 'Arial',
            size: 9,
            color: { argb: 'FF7F8C8D' },
            italic: true
        };
        
        if (options.columns) {
            const mergeRange = `A${rowNumber}:${String.fromCharCode(64 + options.columns.length)}${rowNumber}`;
            worksheet.mergeCells(mergeRange);
        }
    }

    /**
     * Generate and download report
     */
    static async downloadReport(data, options) {
        const workbook = await this.generateReport(data, options);
        
        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Create blob and download
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${options.reportName || 'report'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}