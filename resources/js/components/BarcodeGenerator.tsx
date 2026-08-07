// resources/js/components/BarcodeGenerator.tsx

import JsBarcode from 'jsbarcode';
import { Printer, Download, RefreshCw, X, Barcode, AlertCircle } from 'lucide-react';
import React, { useRef, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
// Note: You need to install jsbarcode: npm install jsbarcode @types/jsbarcode

interface BarcodeGeneratorProps {
    product: {
        id: number;
        product_uuid: string;
        product_name: string;
        product_code: string;
        barcode: string | null;
        description?: string | null;
    } | null;
    onClose?: () => void;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ product, onClose }) => {
    const [barcodeFormat, setBarcodeFormat] = useState<'CODE128' | 'EAN13' | 'UPC' | 'CODE39'>('CODE128');
    const [barcodeWidth, setBarcodeWidth] = useState(2);
    const [barcodeHeight, setBarcodeHeight] = useState(60);
    const [displayValue, setDisplayValue] = useState(true);
    const [fontSize, setFontSize] = useState(16);
    const [textPosition, setTextPosition] = useState<'top' | 'bottom'>('bottom');
    const [copies, setCopies] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);

    const barcodeRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Generate barcode on mount and when settings change
    useEffect(() => {
        if (product && product.barcode) {
            generateBarcode();
        }
    }, [product, barcodeFormat, barcodeWidth, barcodeHeight, displayValue, fontSize, textPosition]);

    const generateBarcode = () => {
        if (!product || !product.barcode || !barcodeRef.current) return;

        try {
            setIsGenerating(true);

            // Clear previous barcode
            while (barcodeRef.current.firstChild) {
                barcodeRef.current.removeChild(barcodeRef.current.firstChild);
            }

            // Generate new barcode
            JsBarcode(barcodeRef.current, product.barcode, {
                format: barcodeFormat,
                width: barcodeWidth,
                height: barcodeHeight,
                displayValue: displayValue,
                fontSize: fontSize,
                textPosition: textPosition,
                font: 'monospace',
                textMargin: 5,
                background: '#ffffff',
                lineColor: '#000000',
                margin: 10,
            });

            // Add product name label above barcode
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', '50%');
            label.setAttribute('y', '15');
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '12');
            label.setAttribute('font-family', 'Arial, sans-serif');
            label.setAttribute('fill', '#333');
            label.textContent = product.product_name;
            barcodeRef.current.insertBefore(label, barcodeRef.current.firstChild);

        } catch (error) {
            console.error('Barcode generation error:', error);
            toast.error('Failed to generate barcode');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        if (!containerRef.current) return;

        const printContent = containerRef.current.innerHTML;
        const printWindow = window.open('', '_blank');

        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Barcode - ${product?.product_name}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 40px;
                            background: white;
                            display: flex;
                            flex-wrap: wrap;
                            gap: 30px;
                            justify-content: center;
                        }
                        .barcode-container {
                            text-align: center;
                            padding: 20px;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                            background: white;
                        }
                        .barcode-container svg {
                            max-width: 300px;
                            height: auto;
                        }
                        .product-name {
                            font-size: 14px;
                            font-weight: 600;
                            margin-bottom: 5px;
                            color: #1f2937;
                        }
                        .product-code {
                            font-size: 12px;
                            color: #6b7280;
                            margin-bottom: 10px;
                        }
                        @media print {
                            body { padding: 20px; }
                            .no-print { display: none; }
                            .barcode-container {
                                border: none;
                                padding: 10px;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${Array(copies).fill(0).map(() => `
                        <div class="barcode-container">
                            <div class="product-name">${product?.product_name}</div>
                            <div class="product-code">${product?.product_code}</div>
                            ${printContent}
                        </div>
                    `).join('')}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            toast.error('Please allow popups to print barcodes');
        }
    };

    const handleDownload = () => {
        if (!barcodeRef.current) return;

        try {
            const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Get SVG dimensions
            const svgElement = barcodeRef.current;
            const svgWidth = svgElement.viewBox.baseVal.width || 300;
            const svgHeight = svgElement.viewBox.baseVal.height || 120;

            canvas.width = svgWidth * 2;
            canvas.height = svgHeight * 2;

            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = function() {
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const link = document.createElement('a');
                link.download = `barcode-${product?.product_code}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
                URL.revokeObjectURL(url);
                toast.success('Barcode downloaded successfully');
            };

            img.src = url;
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download barcode');
        }
    };

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-700">
                    <Barcode className="h-8 w-8 text-slate-400" />
                </div>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    No product selected for barcode generation
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Generate Barcode
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {product.product_name} - {product.product_code}
                    </p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                )}
            </div>

            {/* Barcode Display */}
            <div
                ref={containerRef}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800"
            >
                <div className="text-center">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {product.product_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {product.product_code}
                    </div>
                    {product.barcode ? (
                        <div className="mt-2">
                            <svg ref={barcodeRef} className="mx-auto" />
                        </div>
                    ) : (
                        <div className="mt-4 flex flex-col items-center gap-2">
                            <AlertCircle className="h-12 w-12 text-amber-500" />
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                No barcode assigned to this product
                            </p>
                            <Badge variant="outline" className="text-xs">
                                Product ID: {product.id}
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            {/* Barcode Settings */}
            {product.barcode && (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                Format
                            </label>
                            <select
                                value={barcodeFormat}
                                onChange={(e) => setBarcodeFormat(e.target.value as any)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="CODE128">CODE128</option>
                                <option value="EAN13">EAN13</option>
                                <option value="UPC">UPC</option>
                                <option value="CODE39">CODE39</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                Width
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="0.5"
                                value={barcodeWidth}
                                onChange={(e) => setBarcodeWidth(parseFloat(e.target.value))}
                                className="w-full"
                            />
                            <div className="text-xs text-slate-500">{barcodeWidth}px</div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                Height
                            </label>
                            <input
                                type="range"
                                min="30"
                                max="120"
                                step="5"
                                value={barcodeHeight}
                                onChange={(e) => setBarcodeHeight(parseInt(e.target.value))}
                                className="w-full"
                            />
                            <div className="text-xs text-slate-500">{barcodeHeight}px</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                Font Size
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="24"
                                step="1"
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className="w-full"
                            />
                            <div className="text-xs text-slate-500">{fontSize}px</div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                Text Position
                            </label>
                            <select
                                value={textPosition}
                                onChange={(e) => setTextPosition(e.target.value as 'top' | 'bottom')}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="bottom">Bottom</option>
                                <option value="top">Top</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                Copies
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={copies}
                                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="displayValue"
                            checked={displayValue}
                            onChange={(e) => setDisplayValue(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                        />
                        <label htmlFor="displayValue" className="text-sm text-slate-600 dark:text-slate-400">
                            Display barcode value
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            <Printer className="h-4 w-4" />
                            Print Barcode
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                        >
                            <Download className="h-4 w-4" />
                            Download PNG
                        </button>
                        <button
                            onClick={generateBarcode}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                            Regenerate
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default BarcodeGenerator;
