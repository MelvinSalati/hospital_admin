// resources/js/pages/bulkstore/Settings.tsx

import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Settings as SettingsIcon,
    Bell,
    AlertTriangle,
    Shield,
    Save,
    Undo,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Package,
    Barcode,
    Tag,
    Hash,
    Box,
    Truck,
    ArrowLeftRight,
    Undo2,
    ShoppingCart,
    Calendar,
    Brain,
    Cpu,
    Fingerprint,
    QrCode,
    Printer as PrinterIcon,
    ShieldCheck,
    Key,
    UserCheck,
    Search,
    X,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app-layout';

// ============================================
// TYPES
// ============================================

interface SettingsData {
    product_settings: {
        auto_generate_code: boolean;
        code_prefix: string;
        allow_without_barcode: boolean;
        duplicate_detection: boolean;
        require_category: boolean;
        require_generic_name: boolean;
        enable_images: boolean;
        enable_qr_codes: boolean;
    };
    barcode_config: {
        type: 'code128' | 'code39' | 'ean13' | 'qr';
        auto_generate: boolean;
        prefix: string;
        starting_number: number;
        label_size: 'small' | 'medium' | 'large';
        label_template: string;
        print_on_create: boolean;
        print_on_receive: boolean;
        default_printer: string;
        labels_to_print: number;
        enable_verification: boolean;
        scanner_input_mode: 'keyboard' | 'serial';
    };
    label_printer: {
        default_printer: string;
        paper_size: string;
        label_width: number;
        label_height: number;
        print_resolution: number;
        auto_print: boolean;
        print_batch: boolean;
        print_expiry: boolean;
        print_code: boolean;
        print_price: boolean;
        print_qr: boolean;
    };
    biometric: {
        enable_fingerprint: boolean;
        device: string;
        require_for_issue: boolean;
        require_for_adjustment: boolean;
        require_for_purchase_approval: boolean;
        require_for_disposal: boolean;
        timeout: number;
        backup_method: 'pin' | 'password';
    };
    receiving: {
        require_po: boolean;
        allow_partial: boolean;
        require_supplier: boolean;
        require_batch: boolean;
        require_expiry: boolean;
        require_cost: boolean;
        auto_generate_grn: boolean;
        print_grn: boolean;
    };
    stock_control: {
        enable_batch_tracking: boolean;
        enable_expiry_tracking: boolean;
        fefo: boolean;
        allow_negative: boolean;
        require_adjustment_reason: boolean;
        require_approval_for_adjustments: boolean;
        auto_recalculate: boolean;
        enable_bin_locations: boolean;
        enable_shelf_locations: boolean;
    };
    issue_settings: {
        require_department: boolean;
        require_recipient: boolean;
        require_reason: boolean;
        block_expired: boolean;
        block_zero_stock: boolean;
        allow_emergency: boolean;
        print_voucher: boolean;
    };
    transfer_settings: {
        require_approval: boolean;
        require_receiving_confirmation: boolean;
        print_transfer_note: boolean;
        track_in_transit: boolean;
    };
    returns_settings: {
        allow_department_returns: boolean;
        allow_supplier_returns: boolean;
        require_reason: boolean;
        auto_restock: boolean;
        require_approval: boolean;
    };
    purchase_settings: {
        auto_generate_requisition: boolean;
        auto_generate_po: boolean;
        multi_level_approval: boolean;
        budget_validation: boolean;
        suggested_order_quantity: boolean;
        supplier_lead_time: boolean;
    };
    expiry_settings: {
        near_expiry_alert: number;
        critical_alert: number;
        block_expired: boolean;
        auto_quarantine: boolean;
        enable_ai_analysis: boolean;
        enable_redistribution: boolean;
    };
    notifications: {
        low_stock: boolean;
        expiry: boolean;
        purchase_approval: boolean;
        adjustment: boolean;
        goods_received: boolean;
        transfer: boolean;
        dashboard: boolean;
        email: boolean;
        sms: boolean;
    };
    ai_config: {
        demand_forecasting: boolean;
        expiry_prediction: boolean;
        suggested_po: boolean;
        overstock_detection: boolean;
        understock_detection: boolean;
        redistribution_suggestions: boolean;
        confidence_threshold: number;
        analysis_frequency: 'daily' | 'weekly' | 'monthly';
    };
    hardware: {
        barcode_scanner: string;
        barcode_printer: string;
        receipt_printer: string;
        label_printer: string;
        fingerprint_reader: string;
        smart_card_reader: string;
        rfid_reader: string;
        digital_scale: string;
        signature_pad: string;
    };
    security: {
        role_based_permissions: boolean;
        approval_levels: number;
        audit_trail: boolean;
        session_timeout: number;
        require_e_signature: boolean;
        require_fingerprint_critical: boolean;
    };
    numbering: {
        product_prefix: string;
        batch_prefix: string;
        grn_prefix: string;
        issue_prefix: string;
        adjustment_prefix: string;
        transfer_prefix: string;
        return_prefix: string;
        requisition_prefix: string;
        po_prefix: string;
    };
}

interface SettingsSection {
    key: string;
    title: string;
    icon: React.ReactNode;
    keywords: string[];
}

// ============================================
// BREADCRUMBS
// ============================================

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Settings',
        href: '/bulkstore/settings',
    },
];

// ============================================
// SETTINGS SECTION COMPONENT
// ============================================

interface SettingsSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    isVisible?: boolean;
}

function SettingsSection({
    title,
    icon,
    children,
    defaultOpen = false,
    isVisible = true,
}: SettingsSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!isVisible) return null;

    return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
            >
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                        {icon}
                    </div>
                    <span className="font-medium text-gray-900">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
            </button>
            {isOpen && (
                <div className="border-t border-gray-100 px-4 py-4">
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================
// SETTING TOGGLE COMPONENT
// ============================================

interface SettingToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

function SettingToggle({
    label,
    description,
    checked,
    onChange,
    disabled,
}: SettingToggleProps) {
    return (
        <div className="flex items-start gap-3 py-2">
            <button
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                    checked ? 'bg-blue-600' : 'bg-gray-300'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0.5'
                    } mt-0.5`}
                />
            </button>
            <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                {description && (
                    <p className="text-xs text-gray-500">{description}</p>
                )}
            </div>
        </div>
    );
}

// ============================================
// SETTING SELECT COMPONENT
// ============================================

interface SettingSelectProps {
    label: string;
    value: string | number;
    options: { value: string | number; label: string }[];
    onChange: (value: string | number) => void;
}

function SettingSelect({
    label,
    value,
    options,
    onChange,
}: SettingSelectProps) {
    return (
        <div className="flex items-center gap-3 py-2">
            <label className="min-w-[140px] text-sm font-medium text-gray-700">
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ============================================
// SETTING INPUT COMPONENT
// ============================================

interface SettingInputProps {
    label: string;
    value: string | number;
    onChange: (value: string | number) => void;
    type?: 'text' | 'number' | 'password';
    placeholder?: string;
    className?: string;
}

function SettingInput({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    className = '',
}: SettingInputProps) {
    return (
        <div className={`flex items-center gap-3 py-2 ${className}`}>
            <label className="min-w-[140px] text-sm font-medium text-gray-700">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) =>
                    onChange(
                        type === 'number'
                            ? parseInt(e.target.value) || 0
                            : e.target.value,
                    )
                }
                placeholder={placeholder}
                className="w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [settings, setSettings] = useState<SettingsData>({
        product_settings: {
            auto_generate_code: true,
            code_prefix: 'PRD',
            allow_without_barcode: true,
            duplicate_detection: true,
            require_category: true,
            require_generic_name: false,
            enable_images: true,
            enable_qr_codes: true,
        },
        barcode_config: {
            type: 'code128',
            auto_generate: true,
            prefix: 'BAR',
            starting_number: 1000,
            label_size: 'medium',
            label_template: 'standard',
            print_on_create: true,
            print_on_receive: false,
            default_printer: 'Zebra ZD620',
            labels_to_print: 2,
            enable_verification: true,
            scanner_input_mode: 'keyboard',
        },
        label_printer: {
            default_printer: 'Zebra ZD620',
            paper_size: '4x6',
            label_width: 4,
            label_height: 6,
            print_resolution: 203,
            auto_print: true,
            print_batch: true,
            print_expiry: true,
            print_code: true,
            print_price: false,
            print_qr: true,
        },
        biometric: {
            enable_fingerprint: false,
            device: 'SecuGen Hamster IV',
            require_for_issue: false,
            require_for_adjustment: false,
            require_for_purchase_approval: false,
            require_for_disposal: false,
            timeout: 30,
            backup_method: 'pin',
        },
        receiving: {
            require_po: true,
            allow_partial: true,
            require_supplier: true,
            require_batch: true,
            require_expiry: true,
            require_cost: true,
            auto_generate_grn: true,
            print_grn: true,
        },
        stock_control: {
            enable_batch_tracking: true,
            enable_expiry_tracking: true,
            fefo: true,
            allow_negative: false,
            require_adjustment_reason: true,
            require_approval_for_adjustments: true,
            auto_recalculate: true,
            enable_bin_locations: false,
            enable_shelf_locations: false,
        },
        issue_settings: {
            require_department: true,
            require_recipient: true,
            require_reason: true,
            block_expired: true,
            block_zero_stock: true,
            allow_emergency: true,
            print_voucher: true,
        },
        transfer_settings: {
            require_approval: true,
            require_receiving_confirmation: true,
            print_transfer_note: true,
            track_in_transit: true,
        },
        returns_settings: {
            allow_department_returns: true,
            allow_supplier_returns: true,
            require_reason: true,
            auto_restock: true,
            require_approval: true,
        },
        purchase_settings: {
            auto_generate_requisition: true,
            auto_generate_po: true,
            multi_level_approval: true,
            budget_validation: true,
            suggested_order_quantity: true,
            supplier_lead_time: true,
        },
        expiry_settings: {
            near_expiry_alert: 90,
            critical_alert: 30,
            block_expired: true,
            auto_quarantine: true,
            enable_ai_analysis: true,
            enable_redistribution: true,
        },
        notifications: {
            low_stock: true,
            expiry: true,
            purchase_approval: true,
            adjustment: true,
            goods_received: true,
            transfer: true,
            dashboard: true,
            email: true,
            sms: false,
        },
        ai_config: {
            demand_forecasting: true,
            expiry_prediction: true,
            suggested_po: true,
            overstock_detection: true,
            understock_detection: true,
            redistribution_suggestions: true,
            confidence_threshold: 85,
            analysis_frequency: 'daily',
        },
        hardware: {
            barcode_scanner: 'USB Scanner',
            barcode_printer: 'Zebra ZD620',
            receipt_printer: 'Epson TM-T88',
            label_printer: 'Zebra ZD620',
            fingerprint_reader: 'SecuGen Hamster IV',
            smart_card_reader: 'ACR38U',
            rfid_reader: 'Impinj R700',
            digital_scale: 'Mettler Toledo',
            signature_pad: 'Topaz Systems',
        },
        security: {
            role_based_permissions: true,
            approval_levels: 2,
            audit_trail: true,
            session_timeout: 30,
            require_e_signature: false,
            require_fingerprint_critical: false,
        },
        numbering: {
            product_prefix: 'PRD',
            batch_prefix: 'BAT',
            grn_prefix: 'GRN',
            issue_prefix: 'ISS',
            adjustment_prefix: 'ADJ',
            transfer_prefix: 'TRF',
            return_prefix: 'RET',
            requisition_prefix: 'REQ',
            po_prefix: 'PO',
        },
    });

    // ============================================
    // SETTINGS SECTIONS DEFINITION
    // ============================================

    const settingsSections: SettingsSection[] = [
        {
            key: 'product',
            title: 'Product Settings',
            icon: <Package className="h-4 w-4" />,
            keywords: [
                'product',
                'code',
                'barcode',
                'category',
                'generic',
                'image',
                'qr',
                'duplicate',
            ],
        },
        {
            key: 'barcode',
            title: 'Barcode Configuration',
            icon: <Barcode className="h-4 w-4" />,
            keywords: [
                'barcode',
                'code',
                'label',
                'printer',
                'scan',
                'verification',
                'prefix',
            ],
        },
        {
            key: 'label_printer',
            title: 'Label Printer Configuration',
            icon: <PrinterIcon className="h-4 w-4" />,
            keywords: [
                'printer',
                'label',
                'paper',
                'resolution',
                'batch',
                'expiry',
                'price',
                'qr',
            ],
        },
        {
            key: 'biometric',
            title: 'Biometric Configuration',
            icon: <Fingerprint className="h-4 w-4" />,
            keywords: [
                'fingerprint',
                'biometric',
                'authentication',
                'pin',
                'password',
                'timeout',
            ],
        },
        {
            key: 'receiving',
            title: 'Receiving Settings',
            icon: <Truck className="h-4 w-4" />,
            keywords: [
                'receive',
                'purchase order',
                'supplier',
                'batch',
                'expiry',
                'cost',
                'grn',
            ],
        },
        {
            key: 'stock_control',
            title: 'Stock Control',
            icon: <Box className="h-4 w-4" />,
            keywords: [
                'stock',
                'batch',
                'expiry',
                'fefo',
                'negative',
                'adjustment',
                'bin',
                'shelf',
            ],
        },
        {
            key: 'issue',
            title: 'Issue Settings',
            icon: <Package className="h-4 w-4" />,
            keywords: [
                'issue',
                'department',
                'recipient',
                'expired',
                'emergency',
                'voucher',
            ],
        },
        {
            key: 'transfer',
            title: 'Transfer Settings',
            icon: <ArrowLeftRight className="h-4 w-4" />,
            keywords: ['transfer', 'approval', 'confirmation', 'transit'],
        },
        {
            key: 'returns',
            title: 'Returns Settings',
            icon: <Undo2 className="h-4 w-4" />,
            keywords: [
                'return',
                'department',
                'supplier',
                'restock',
                'approval',
            ],
        },
        {
            key: 'purchase',
            title: 'Purchase Settings',
            icon: <ShoppingCart className="h-4 w-4" />,
            keywords: [
                'purchase',
                'requisition',
                'order',
                'approval',
                'budget',
                'lead time',
            ],
        },
        {
            key: 'expiry',
            title: 'Expiry Settings',
            icon: <Calendar className="h-4 w-4" />,
            keywords: ['expiry', 'alert', 'quarantine', 'redistribution', 'ai'],
        },
        {
            key: 'notifications',
            title: 'Notifications',
            icon: <Bell className="h-4 w-4" />,
            keywords: ['notification', 'alert', 'email', 'sms', 'dashboard'],
        },
        {
            key: 'ai',
            title: 'AI Configuration',
            icon: <Brain className="h-4 w-4" />,
            keywords: [
                'ai',
                'forecast',
                'prediction',
                'overstock',
                'understock',
                'redistribution',
                'confidence',
            ],
        },
        {
            key: 'hardware',
            title: 'Hardware Integration',
            icon: <Cpu className="h-4 w-4" />,
            keywords: [
                'hardware',
                'scanner',
                'printer',
                'fingerprint',
                'rfid',
                'scale',
                'signature',
            ],
        },
        {
            key: 'security',
            title: 'Security',
            icon: <ShieldCheck className="h-4 w-4" />,
            keywords: [
                'security',
                'permission',
                'audit',
                'timeout',
                'signature',
                'fingerprint',
            ],
        },
        {
            key: 'numbering',
            title: 'Numbering Configuration',
            icon: <Hash className="h-4 w-4" />,
            keywords: [
                'number',
                'prefix',
                'code',
                'batch',
                'grn',
                'issue',
                'adjustment',
                'transfer',
                'return',
                'po',
            ],
        },
    ];

    // ============================================
    // FILTERED SECTIONS
    // ============================================

    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) {
            return settingsSections.map((s) => ({ ...s, isVisible: true }));
        }

        const query = searchQuery.toLowerCase().trim();
        return settingsSections.map((section) => {
            const matchesTitle = section.title.toLowerCase().includes(query);
            const matchesKeywords = section.keywords.some((keyword) =>
                keyword.toLowerCase().includes(query),
            );
            return {
                ...section,
                isVisible: matchesTitle || matchesKeywords,
            };
        });
    }, [searchQuery, settingsSections]);

    const hasVisibleSections = filteredSections.some((s) => s.isVisible);

    // ============================================
    // LOAD SETTINGS
    // ============================================

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/settings/bulkstore');
            if (response.data.success) {
                setSettings(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await axios.put(
                '/api/settings/bulkstore',
                settings,
            );
            if (response.data.success) {
                toast.success('Settings saved successfully!');
            } else {
                toast.error('Failed to save settings');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Reset all settings to default values?')) return;

        setSaving(true);
        try {
            const response = await axios.post('/api/settings/bulkstore/reset');
            if (response.data.success) {
                setSettings(response.data.data);
                toast.success('Settings reset to default values!');
            } else {
                toast.error('Failed to reset settings');
            }
        } catch (error) {
            console.error('Failed to reset settings:', error);
            toast.error('Failed to reset settings');
        } finally {
            setSaving(false);
        }
    };

    const updateSettings = (
        section: keyof SettingsData,
        updates: Partial<any>,
    ) => {
        setSettings((prev) => ({
            ...prev,
            [section]: { ...prev[section], ...updates },
        }));
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bulk Store Settings" />

            <div className="min-h-screen bg-slate-100">
                <div className="p-6">
                    {/* Page Header */}
                    <PageHeader
                        title="Bulk Store Settings"
                        subtitle="Configure inventory, barcode, printer, and store operations"
                        icon={
                            <SettingsIcon className="h-6 w-6 text-blue-600" />
                        }
                        actions={[
                            {
                                label: 'Reset to Defaults',
                                icon: <Undo className="h-4 w-4" />,
                                onClick: handleReset,
                                variant: 'outline',
                            },
                            {
                                label: 'Save Settings',
                                icon: saving ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                ),
                                onClick: handleSave,
                                variant: 'primary',
                                disabled: saving,
                            },
                        ]}
                    />

                    {/* Search Bar */}
                    <div className="mt-6">
                        <div className="relative max-w-md">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search settings..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-2 pr-10 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <p className="mt-1 text-xs text-gray-500">
                                {
                                    filteredSections.filter((s) => s.isVisible)
                                        .length
                                }{' '}
                                of {settingsSections.length} sections match your
                                search
                            </p>
                        )}
                    </div>

                    {/* Settings Grid - Scrollable Container */}
                    <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mt-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                        <div className="space-y-4">
                            {filteredSections.map((section) => {
                                // Render the actual section content based on key
                                let content = null;

                                switch (section.key) {
                                    case 'product':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Auto-generate Product Code"
                                                    description="Automatically generate product codes"
                                                    checked={
                                                        settings
                                                            .product_settings
                                                            .auto_generate_code
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                auto_generate_code:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Product Code Prefix"
                                                    value={
                                                        settings
                                                            .product_settings
                                                            .code_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                code_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Allow Products Without Barcode"
                                                    description="Allow products without a barcode"
                                                    checked={
                                                        settings
                                                            .product_settings
                                                            .allow_without_barcode
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                allow_without_barcode:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Duplicate Product Detection"
                                                    description="Detect duplicate products"
                                                    checked={
                                                        settings
                                                            .product_settings
                                                            .duplicate_detection
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                duplicate_detection:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Product Category"
                                                    description="Require category when creating products"
                                                    checked={
                                                        settings
                                                            .product_settings
                                                            .require_category
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                require_category:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Generic Name"
                                                    description="Require generic name for products"
                                                    checked={
                                                        settings
                                                            .product_settings
                                                            .require_generic_name
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                require_generic_name:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Enable Product Images"
                                                    description="Allow product images"
                                                    checked={
                                                        settings
                                                            .product_settings
                                                            .enable_images
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                enable_images:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Enable QR Codes"
                                                    description="Generate QR codes for products"
                                                    checked={
                                                        settings
                                                            .product_settings
                                                            .enable_qr_codes
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'product_settings',
                                                            {
                                                                enable_qr_codes:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'barcode':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingSelect
                                                    label="Barcode Type"
                                                    value={
                                                        settings.barcode_config
                                                            .type
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            { type: value },
                                                        )
                                                    }
                                                    options={[
                                                        {
                                                            value: 'code128',
                                                            label: 'Code 128',
                                                        },
                                                        {
                                                            value: 'code39',
                                                            label: 'Code 39',
                                                        },
                                                        {
                                                            value: 'ean13',
                                                            label: 'EAN-13',
                                                        },
                                                        {
                                                            value: 'qr',
                                                            label: 'QR Code',
                                                        },
                                                    ]}
                                                />
                                                <SettingToggle
                                                    label="Auto-generate Barcodes"
                                                    checked={
                                                        settings.barcode_config
                                                            .auto_generate
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                auto_generate:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Barcode Prefix"
                                                    value={
                                                        settings.barcode_config
                                                            .prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                prefix: String(
                                                                    value,
                                                                ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Starting Number"
                                                    value={
                                                        settings.barcode_config
                                                            .starting_number
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                starting_number:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingSelect
                                                    label="Label Size"
                                                    value={
                                                        settings.barcode_config
                                                            .label_size
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                label_size:
                                                                    value,
                                                            },
                                                        )
                                                    }
                                                    options={[
                                                        {
                                                            value: 'small',
                                                            label: 'Small',
                                                        },
                                                        {
                                                            value: 'medium',
                                                            label: 'Medium',
                                                        },
                                                        {
                                                            value: 'large',
                                                            label: 'Large',
                                                        },
                                                    ]}
                                                />
                                                <SettingToggle
                                                    label="Print Barcode After Product Creation"
                                                    checked={
                                                        settings.barcode_config
                                                            .print_on_create
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                print_on_create:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Print Barcode After Stock Receiving"
                                                    checked={
                                                        settings.barcode_config
                                                            .print_on_receive
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                print_on_receive:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Default Printer"
                                                    value={
                                                        settings.barcode_config
                                                            .default_printer
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                default_printer:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Number of Labels to Print"
                                                    value={
                                                        settings.barcode_config
                                                            .labels_to_print
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                labels_to_print:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingToggle
                                                    label="Enable Barcode Verification"
                                                    checked={
                                                        settings.barcode_config
                                                            .enable_verification
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                enable_verification:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingSelect
                                                    label="Scanner Input Mode"
                                                    value={
                                                        settings.barcode_config
                                                            .scanner_input_mode
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'barcode_config',
                                                            {
                                                                scanner_input_mode:
                                                                    value,
                                                            },
                                                        )
                                                    }
                                                    options={[
                                                        {
                                                            value: 'keyboard',
                                                            label: 'Keyboard Wedge',
                                                        },
                                                        {
                                                            value: 'serial',
                                                            label: 'Serial Port',
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'label_printer':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingInput
                                                    label="Default Printer"
                                                    value={
                                                        settings.label_printer
                                                            .default_printer
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'label_printer',
                                                            {
                                                                default_printer:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Paper Size"
                                                    value={
                                                        settings.label_printer
                                                            .paper_size
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'label_printer',
                                                            {
                                                                paper_size:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Label Width (in)"
                                                    value={
                                                        settings.label_printer
                                                            .label_width
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'label_printer',
                                                            {
                                                                label_width:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingInput
                                                    label="Label Height (in)"
                                                    value={
                                                        settings.label_printer
                                                            .label_height
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'label_printer',
                                                            {
                                                                label_height:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingInput
                                                    label="Print Resolution (DPI)"
                                                    value={
                                                        settings.label_printer
                                                            .print_resolution
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'label_printer',
                                                            {
                                                                print_resolution:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingToggle
                                                    label="Auto Print Labels"
                                                    checked={
                                                        settings.label_printer
                                                            .auto_print
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'label_printer',
                                                            {
                                                                auto_print:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <SettingToggle
                                                        label="Print Batch Number"
                                                        checked={
                                                            settings
                                                                .label_printer
                                                                .print_batch
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'label_printer',
                                                                {
                                                                    print_batch:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Print Expiry Date"
                                                        checked={
                                                            settings
                                                                .label_printer
                                                                .print_expiry
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'label_printer',
                                                                {
                                                                    print_expiry:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Print Product Code"
                                                        checked={
                                                            settings
                                                                .label_printer
                                                                .print_code
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'label_printer',
                                                                {
                                                                    print_code:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Print Price"
                                                        checked={
                                                            settings
                                                                .label_printer
                                                                .print_price
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'label_printer',
                                                                {
                                                                    print_price:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Print QR Code"
                                                        checked={
                                                            settings
                                                                .label_printer
                                                                .print_qr
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'label_printer',
                                                                {
                                                                    print_qr:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        );
                                        break;

                                    case 'biometric':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Enable Fingerprint Authentication"
                                                    checked={
                                                        settings.biometric
                                                            .enable_fingerprint
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                enable_fingerprint:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Fingerprint Device"
                                                    value={
                                                        settings.biometric
                                                            .device
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                device: String(
                                                                    value,
                                                                ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require for Stock Issue"
                                                    checked={
                                                        settings.biometric
                                                            .require_for_issue
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                require_for_issue:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require for Stock Adjustments"
                                                    checked={
                                                        settings.biometric
                                                            .require_for_adjustment
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                require_for_adjustment:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require for Purchase Approval"
                                                    checked={
                                                        settings.biometric
                                                            .require_for_purchase_approval
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                require_for_purchase_approval:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require for Disposal Approval"
                                                    checked={
                                                        settings.biometric
                                                            .require_for_disposal
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                require_for_disposal:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Timeout (seconds)"
                                                    value={
                                                        settings.biometric
                                                            .timeout
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                timeout:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingSelect
                                                    label="Backup Authentication"
                                                    value={
                                                        settings.biometric
                                                            .backup_method
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'biometric',
                                                            {
                                                                backup_method:
                                                                    value,
                                                            },
                                                        )
                                                    }
                                                    options={[
                                                        {
                                                            value: 'pin',
                                                            label: 'PIN',
                                                        },
                                                        {
                                                            value: 'password',
                                                            label: 'Password',
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'receiving':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Require Purchase Order"
                                                    checked={
                                                        settings.receiving
                                                            .require_po
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                require_po:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Allow Partial Deliveries"
                                                    checked={
                                                        settings.receiving
                                                            .allow_partial
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                allow_partial:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Supplier"
                                                    checked={
                                                        settings.receiving
                                                            .require_supplier
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                require_supplier:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Batch Number"
                                                    checked={
                                                        settings.receiving
                                                            .require_batch
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                require_batch:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Expiry Date"
                                                    checked={
                                                        settings.receiving
                                                            .require_expiry
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                require_expiry:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Cost Price"
                                                    checked={
                                                        settings.receiving
                                                            .require_cost
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                require_cost:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Auto-generate GRN Number"
                                                    checked={
                                                        settings.receiving
                                                            .auto_generate_grn
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                auto_generate_grn:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Print Goods Received Note"
                                                    checked={
                                                        settings.receiving
                                                            .print_grn
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'receiving',
                                                            {
                                                                print_grn:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'stock_control':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Enable Batch Tracking"
                                                    checked={
                                                        settings.stock_control
                                                            .enable_batch_tracking
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                enable_batch_tracking:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Enable Expiry Tracking"
                                                    checked={
                                                        settings.stock_control
                                                            .enable_expiry_tracking
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                enable_expiry_tracking:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="FEFO (First Expiry, First Out)"
                                                    checked={
                                                        settings.stock_control
                                                            .fefo
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            { fefo: checked },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Allow Negative Stock"
                                                    checked={
                                                        settings.stock_control
                                                            .allow_negative
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                allow_negative:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Adjustment Reason"
                                                    checked={
                                                        settings.stock_control
                                                            .require_adjustment_reason
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                require_adjustment_reason:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Approval for Adjustments"
                                                    checked={
                                                        settings.stock_control
                                                            .require_approval_for_adjustments
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                require_approval_for_adjustments:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Auto Recalculate Stock"
                                                    checked={
                                                        settings.stock_control
                                                            .auto_recalculate
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                auto_recalculate:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Enable Bin Locations"
                                                    checked={
                                                        settings.stock_control
                                                            .enable_bin_locations
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                enable_bin_locations:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Enable Shelf Locations"
                                                    checked={
                                                        settings.stock_control
                                                            .enable_shelf_locations
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'stock_control',
                                                            {
                                                                enable_shelf_locations:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'issue':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Require Department"
                                                    checked={
                                                        settings.issue_settings
                                                            .require_department
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'issue_settings',
                                                            {
                                                                require_department:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Recipient"
                                                    checked={
                                                        settings.issue_settings
                                                            .require_recipient
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'issue_settings',
                                                            {
                                                                require_recipient:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Issue Reason"
                                                    checked={
                                                        settings.issue_settings
                                                            .require_reason
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'issue_settings',
                                                            {
                                                                require_reason:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Block Expired Stock"
                                                    checked={
                                                        settings.issue_settings
                                                            .block_expired
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'issue_settings',
                                                            {
                                                                block_expired:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Block Zero Stock"
                                                    checked={
                                                        settings.issue_settings
                                                            .block_zero_stock
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'issue_settings',
                                                            {
                                                                block_zero_stock:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Allow Emergency Issue"
                                                    checked={
                                                        settings.issue_settings
                                                            .allow_emergency
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'issue_settings',
                                                            {
                                                                allow_emergency:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Print Issue Voucher"
                                                    checked={
                                                        settings.issue_settings
                                                            .print_voucher
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'issue_settings',
                                                            {
                                                                print_voucher:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'transfer':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Require Approval"
                                                    checked={
                                                        settings
                                                            .transfer_settings
                                                            .require_approval
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'transfer_settings',
                                                            {
                                                                require_approval:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Receiving Confirmation"
                                                    checked={
                                                        settings
                                                            .transfer_settings
                                                            .require_receiving_confirmation
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'transfer_settings',
                                                            {
                                                                require_receiving_confirmation:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Print Transfer Note"
                                                    checked={
                                                        settings
                                                            .transfer_settings
                                                            .print_transfer_note
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'transfer_settings',
                                                            {
                                                                print_transfer_note:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Track In-Transit Stock"
                                                    checked={
                                                        settings
                                                            .transfer_settings
                                                            .track_in_transit
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'transfer_settings',
                                                            {
                                                                track_in_transit:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'returns':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Allow Department Returns"
                                                    checked={
                                                        settings
                                                            .returns_settings
                                                            .allow_department_returns
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'returns_settings',
                                                            {
                                                                allow_department_returns:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Allow Supplier Returns"
                                                    checked={
                                                        settings
                                                            .returns_settings
                                                            .allow_supplier_returns
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'returns_settings',
                                                            {
                                                                allow_supplier_returns:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Return Reason"
                                                    checked={
                                                        settings
                                                            .returns_settings
                                                            .require_reason
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'returns_settings',
                                                            {
                                                                require_reason:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Auto Restock"
                                                    checked={
                                                        settings
                                                            .returns_settings
                                                            .auto_restock
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'returns_settings',
                                                            {
                                                                auto_restock:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Approval"
                                                    checked={
                                                        settings
                                                            .returns_settings
                                                            .require_approval
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'returns_settings',
                                                            {
                                                                require_approval:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'purchase':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Auto-generate Requisition Number"
                                                    checked={
                                                        settings
                                                            .purchase_settings
                                                            .auto_generate_requisition
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'purchase_settings',
                                                            {
                                                                auto_generate_requisition:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Auto-generate Purchase Order Number"
                                                    checked={
                                                        settings
                                                            .purchase_settings
                                                            .auto_generate_po
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'purchase_settings',
                                                            {
                                                                auto_generate_po:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Multi-level Approval"
                                                    checked={
                                                        settings
                                                            .purchase_settings
                                                            .multi_level_approval
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'purchase_settings',
                                                            {
                                                                multi_level_approval:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Budget Validation"
                                                    checked={
                                                        settings
                                                            .purchase_settings
                                                            .budget_validation
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'purchase_settings',
                                                            {
                                                                budget_validation:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Suggested Order Quantity (AMC)"
                                                    checked={
                                                        settings
                                                            .purchase_settings
                                                            .suggested_order_quantity
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'purchase_settings',
                                                            {
                                                                suggested_order_quantity:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Supplier Lead Time"
                                                    checked={
                                                        settings
                                                            .purchase_settings
                                                            .supplier_lead_time
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'purchase_settings',
                                                            {
                                                                supplier_lead_time:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'expiry':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingInput
                                                    label="Near Expiry Alert (Days)"
                                                    value={
                                                        settings.expiry_settings
                                                            .near_expiry_alert
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'expiry_settings',
                                                            {
                                                                near_expiry_alert:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingInput
                                                    label="Critical Alert (Days)"
                                                    value={
                                                        settings.expiry_settings
                                                            .critical_alert
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'expiry_settings',
                                                            {
                                                                critical_alert:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingToggle
                                                    label="Block Expired Stock"
                                                    checked={
                                                        settings.expiry_settings
                                                            .block_expired
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'expiry_settings',
                                                            {
                                                                block_expired:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Automatic Quarantine"
                                                    checked={
                                                        settings.expiry_settings
                                                            .auto_quarantine
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'expiry_settings',
                                                            {
                                                                auto_quarantine:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Enable AI Expiry Analysis"
                                                    checked={
                                                        settings.expiry_settings
                                                            .enable_ai_analysis
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'expiry_settings',
                                                            {
                                                                enable_ai_analysis:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Enable Redistribution Recommendations"
                                                    checked={
                                                        settings.expiry_settings
                                                            .enable_redistribution
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'expiry_settings',
                                                            {
                                                                enable_redistribution:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'notifications':
                                        content = (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <SettingToggle
                                                        label="Low Stock Alerts"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .low_stock
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    low_stock:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Expiry Alerts"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .expiry
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    expiry: checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Purchase Approval Alerts"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .purchase_approval
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    purchase_approval:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Stock Adjustment Alerts"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .adjustment
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    adjustment:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Goods Received Alerts"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .goods_received
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    goods_received:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Transfer Alerts"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .transfer
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    transfer:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="mt-2 border-t border-gray-200 pt-2">
                                                    <SettingToggle
                                                        label="Dashboard Notifications"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .dashboard
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    dashboard:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Email Notifications"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .email
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    email: checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="SMS Notifications"
                                                        checked={
                                                            settings
                                                                .notifications
                                                                .sms
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'notifications',
                                                                {
                                                                    sms: checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        );
                                        break;

                                    case 'ai':
                                        content = (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <SettingToggle
                                                        label="Demand Forecasting"
                                                        checked={
                                                            settings.ai_config
                                                                .demand_forecasting
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'ai_config',
                                                                {
                                                                    demand_forecasting:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Expiry Prediction"
                                                        checked={
                                                            settings.ai_config
                                                                .expiry_prediction
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'ai_config',
                                                                {
                                                                    expiry_prediction:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Suggested Purchase Orders"
                                                        checked={
                                                            settings.ai_config
                                                                .suggested_po
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'ai_config',
                                                                {
                                                                    suggested_po:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Overstock Detection"
                                                        checked={
                                                            settings.ai_config
                                                                .overstock_detection
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'ai_config',
                                                                {
                                                                    overstock_detection:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Understock Detection"
                                                        checked={
                                                            settings.ai_config
                                                                .understock_detection
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'ai_config',
                                                                {
                                                                    understock_detection:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                    <SettingToggle
                                                        label="Redistribution Suggestions"
                                                        checked={
                                                            settings.ai_config
                                                                .redistribution_suggestions
                                                        }
                                                        onChange={(checked) =>
                                                            updateSettings(
                                                                'ai_config',
                                                                {
                                                                    redistribution_suggestions:
                                                                        checked,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <SettingInput
                                                    label="Confidence Threshold (%)"
                                                    value={
                                                        settings.ai_config
                                                            .confidence_threshold
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'ai_config',
                                                            {
                                                                confidence_threshold:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingSelect
                                                    label="Analysis Frequency"
                                                    value={
                                                        settings.ai_config
                                                            .analysis_frequency
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'ai_config',
                                                            {
                                                                analysis_frequency:
                                                                    value,
                                                            },
                                                        )
                                                    }
                                                    options={[
                                                        {
                                                            value: 'daily',
                                                            label: 'Daily',
                                                        },
                                                        {
                                                            value: 'weekly',
                                                            label: 'Weekly',
                                                        },
                                                        {
                                                            value: 'monthly',
                                                            label: 'Monthly',
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'hardware':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingInput
                                                    label="Barcode Scanner"
                                                    value={
                                                        settings.hardware
                                                            .barcode_scanner
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                barcode_scanner:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Barcode Printer"
                                                    value={
                                                        settings.hardware
                                                            .barcode_printer
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                barcode_printer:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Receipt Printer"
                                                    value={
                                                        settings.hardware
                                                            .receipt_printer
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                receipt_printer:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Label Printer"
                                                    value={
                                                        settings.hardware
                                                            .label_printer
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                label_printer:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Fingerprint Reader"
                                                    value={
                                                        settings.hardware
                                                            .fingerprint_reader
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                fingerprint_reader:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Smart Card Reader"
                                                    value={
                                                        settings.hardware
                                                            .smart_card_reader
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                smart_card_reader:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="RFID Reader"
                                                    value={
                                                        settings.hardware
                                                            .rfid_reader
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                rfid_reader:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Digital Scale"
                                                    value={
                                                        settings.hardware
                                                            .digital_scale
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                digital_scale:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Signature Pad"
                                                    value={
                                                        settings.hardware
                                                            .signature_pad
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'hardware',
                                                            {
                                                                signature_pad:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'security':
                                        content = (
                                            <div className="space-y-2">
                                                <SettingToggle
                                                    label="Role-Based Permissions"
                                                    checked={
                                                        settings.security
                                                            .role_based_permissions
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'security',
                                                            {
                                                                role_based_permissions:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Approval Levels"
                                                    value={
                                                        settings.security
                                                            .approval_levels
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'security',
                                                            {
                                                                approval_levels:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingToggle
                                                    label="Audit Trail"
                                                    checked={
                                                        settings.security
                                                            .audit_trail
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'security',
                                                            {
                                                                audit_trail:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Session Timeout (minutes)"
                                                    value={
                                                        settings.security
                                                            .session_timeout
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'security',
                                                            {
                                                                session_timeout:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    type="number"
                                                />
                                                <SettingToggle
                                                    label="Require Electronic Signature"
                                                    checked={
                                                        settings.security
                                                            .require_e_signature
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'security',
                                                            {
                                                                require_e_signature:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingToggle
                                                    label="Require Fingerprint for Critical Transactions"
                                                    checked={
                                                        settings.security
                                                            .require_fingerprint_critical
                                                    }
                                                    onChange={(checked) =>
                                                        updateSettings(
                                                            'security',
                                                            {
                                                                require_fingerprint_critical:
                                                                    checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    case 'numbering':
                                        content = (
                                            <div className="grid grid-cols-2 gap-2">
                                                <SettingInput
                                                    label="Product Code Prefix"
                                                    value={
                                                        settings.numbering
                                                            .product_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                product_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Batch Number Prefix"
                                                    value={
                                                        settings.numbering
                                                            .batch_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                batch_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="GRN Number Prefix"
                                                    value={
                                                        settings.numbering
                                                            .grn_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                grn_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Issue Voucher Prefix"
                                                    value={
                                                        settings.numbering
                                                            .issue_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                issue_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Adjustment Prefix"
                                                    value={
                                                        settings.numbering
                                                            .adjustment_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                adjustment_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Transfer Prefix"
                                                    value={
                                                        settings.numbering
                                                            .transfer_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                transfer_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Return Prefix"
                                                    value={
                                                        settings.numbering
                                                            .return_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                return_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Requisition Prefix"
                                                    value={
                                                        settings.numbering
                                                            .requisition_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                requisition_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                                <SettingInput
                                                    label="Purchase Order Prefix"
                                                    value={
                                                        settings.numbering
                                                            .po_prefix
                                                    }
                                                    onChange={(value) =>
                                                        updateSettings(
                                                            'numbering',
                                                            {
                                                                po_prefix:
                                                                    String(
                                                                        value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                        break;

                                    default:
                                        content = null;
                                }

                                return (
                                    <SettingsSection
                                        key={section.key}
                                        title={section.title}
                                        icon={section.icon}
                                        defaultOpen={
                                            section.key === 'product' ||
                                            !searchQuery
                                        }
                                        isVisible={section.isVisible}
                                    >
                                        {content}
                                    </SettingsSection>
                                );
                            })}
                        </div>

                        {!hasVisibleSections && searchQuery && (
                            <div className="py-12 text-center">
                                <div className="mx-auto h-12 w-12 text-gray-300">
                                    <Search className="h-12 w-12" />
                                </div>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">
                                    No settings found
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    No settings match your search. Try a
                                    different keyword.
                                </p>
                                <button
                                    onClick={clearSearch}
                                    className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
