<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class BulkstoreSetting extends Model
{
    protected $table = 'bulk_store_settings';

    protected $fillable = [
        // Product Settings
        'product_auto_generate_code',
        'product_code_prefix',
        'product_allow_without_barcode',
        'product_duplicate_detection',
        'product_require_category',
        'product_require_generic_name',
        'product_enable_images',
        'product_enable_qr_codes',
        
        // Barcode Configuration
        'barcode_type',
        'barcode_auto_generate',
        'barcode_prefix',
        'barcode_starting_number',
        'barcode_label_size',
        'barcode_label_template',
        'barcode_print_on_create',
        'barcode_print_on_receive',
        'barcode_default_printer',
        'barcode_labels_to_print',
        'barcode_enable_verification',
        'barcode_scanner_input_mode',
        
        // Label Printer
        'label_printer_default',
        'label_printer_paper_size',
        'label_printer_width',
        'label_printer_height',
        'label_printer_resolution',
        'label_printer_auto_print',
        'label_printer_print_batch',
        'label_printer_print_expiry',
        'label_printer_print_code',
        'label_printer_print_price',
        'label_printer_print_qr',
        
        // Biometric
        'biometric_enable_fingerprint',
        'biometric_device',
        'biometric_require_for_issue',
        'biometric_require_for_adjustment',
        'biometric_require_for_purchase_approval',
        'biometric_require_for_disposal',
        'biometric_timeout',
        'biometric_backup_method',
        
        // Receiving
        'receiving_require_po',
        'receiving_allow_partial',
        'receiving_require_supplier',
        'receiving_require_batch',
        'receiving_require_expiry',
        'receiving_require_cost',
        'receiving_auto_generate_grn',
        'receiving_print_grn',
        
        // Stock Control
        'stock_enable_batch_tracking',
        'stock_enable_expiry_tracking',
        'stock_fefo',
        'stock_allow_negative',
        'stock_require_adjustment_reason',
        'stock_require_approval_for_adjustments',
        'stock_auto_recalculate',
        'stock_enable_bin_locations',
        'stock_enable_shelf_locations',
        
        // Issue Settings
        'issue_require_department',
        'issue_require_recipient',
        'issue_require_reason',
        'issue_block_expired',
        'issue_block_zero_stock',
        'issue_allow_emergency',
        'issue_print_voucher',
        
        // Transfer Settings
        'transfer_require_approval',
        'transfer_require_receiving_confirmation',
        'transfer_print_transfer_note',
        'transfer_track_in_transit',
        
        // Returns Settings
        'returns_allow_department_returns',
        'returns_allow_supplier_returns',
        'returns_require_reason',
        'returns_auto_restock',
        'returns_require_approval',
        
        // Purchase Settings
        'purchase_auto_generate_requisition',
        'purchase_auto_generate_po',
        'purchase_multi_level_approval',
        'purchase_budget_validation',
        'purchase_suggested_order_quantity',
        'purchase_supplier_lead_time',
        
        // Expiry Settings
        'expiry_near_expiry_alert',
        'expiry_critical_alert',
        'expiry_block_expired',
        'expiry_auto_quarantine',
        'expiry_enable_ai_analysis',
        'expiry_enable_redistribution',
        
        // Notifications
        'notif_low_stock',
        'notif_expiry',
        'notif_purchase_approval',
        'notif_adjustment',
        'notif_goods_received',
        'notif_transfer',
        'notif_dashboard',
        'notif_email',
        'notif_sms',
        
        // AI Configuration
        'ai_demand_forecasting',
        'ai_expiry_prediction',
        'ai_suggested_po',
        'ai_overstock_detection',
        'ai_understock_detection',
        'ai_redistribution_suggestions',
        'ai_confidence_threshold',
        'ai_analysis_frequency',
        
        // Hardware
        'hardware_barcode_scanner',
        'hardware_barcode_printer',
        'hardware_receipt_printer',
        'hardware_label_printer',
        'hardware_fingerprint_reader',
        'hardware_smart_card_reader',
        'hardware_rfid_reader',
        'hardware_digital_scale',
        'hardware_signature_pad',
        
        // Security
        'security_role_based_permissions',
        'security_approval_levels',
        'security_audit_trail',
        'security_session_timeout',
        'security_require_e_signature',
        'security_require_fingerprint_critical',
        
        // Numbering
        'num_product_prefix',
        'num_batch_prefix',
        'num_grn_prefix',
        'num_issue_prefix',
        'num_adjustment_prefix',
        'num_transfer_prefix',
        'num_return_prefix',
        'num_requisition_prefix',
        'num_po_prefix',
        
        // Audit
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        // Product Settings
        'product_auto_generate_code' => 'boolean',
        'product_allow_without_barcode' => 'boolean',
        'product_duplicate_detection' => 'boolean',
        'product_require_category' => 'boolean',
        'product_require_generic_name' => 'boolean',
        'product_enable_images' => 'boolean',
        'product_enable_qr_codes' => 'boolean',
        
        // Barcode
        'barcode_auto_generate' => 'boolean',
        'barcode_starting_number' => 'integer',
        'barcode_labels_to_print' => 'integer',
        'barcode_print_on_create' => 'boolean',
        'barcode_print_on_receive' => 'boolean',
        'barcode_enable_verification' => 'boolean',
        
        // Label Printer
        'label_printer_width' => 'decimal:2',
        'label_printer_height' => 'decimal:2',
        'label_printer_resolution' => 'integer',
        'label_printer_auto_print' => 'boolean',
        'label_printer_print_batch' => 'boolean',
        'label_printer_print_expiry' => 'boolean',
        'label_printer_print_code' => 'boolean',
        'label_printer_print_price' => 'boolean',
        'label_printer_print_qr' => 'boolean',
        
        // Biometric
        'biometric_enable_fingerprint' => 'boolean',
        'biometric_require_for_issue' => 'boolean',
        'biometric_require_for_adjustment' => 'boolean',
        'biometric_require_for_purchase_approval' => 'boolean',
        'biometric_require_for_disposal' => 'boolean',
        'biometric_timeout' => 'integer',
        
        // Receiving
        'receiving_require_po' => 'boolean',
        'receiving_allow_partial' => 'boolean',
        'receiving_require_supplier' => 'boolean',
        'receiving_require_batch' => 'boolean',
        'receiving_require_expiry' => 'boolean',
        'receiving_require_cost' => 'boolean',
        'receiving_auto_generate_grn' => 'boolean',
        'receiving_print_grn' => 'boolean',
        
        // Stock Control
        'stock_enable_batch_tracking' => 'boolean',
        'stock_enable_expiry_tracking' => 'boolean',
        'stock_fefo' => 'boolean',
        'stock_allow_negative' => 'boolean',
        'stock_require_adjustment_reason' => 'boolean',
        'stock_require_approval_for_adjustments' => 'boolean',
        'stock_auto_recalculate' => 'boolean',
        'stock_enable_bin_locations' => 'boolean',
        'stock_enable_shelf_locations' => 'boolean',
        
        // Issue Settings
        'issue_require_department' => 'boolean',
        'issue_require_recipient' => 'boolean',
        'issue_require_reason' => 'boolean',
        'issue_block_expired' => 'boolean',
        'issue_block_zero_stock' => 'boolean',
        'issue_allow_emergency' => 'boolean',
        'issue_print_voucher' => 'boolean',
        
        // Transfer Settings
        'transfer_require_approval' => 'boolean',
        'transfer_require_receiving_confirmation' => 'boolean',
        'transfer_print_transfer_note' => 'boolean',
        'transfer_track_in_transit' => 'boolean',
        
        // Returns Settings
        'returns_allow_department_returns' => 'boolean',
        'returns_allow_supplier_returns' => 'boolean',
        'returns_require_reason' => 'boolean',
        'returns_auto_restock' => 'boolean',
        'returns_require_approval' => 'boolean',
        
        // Purchase Settings
        'purchase_auto_generate_requisition' => 'boolean',
        'purchase_auto_generate_po' => 'boolean',
        'purchase_multi_level_approval' => 'boolean',
        'purchase_budget_validation' => 'boolean',
        'purchase_suggested_order_quantity' => 'boolean',
        'purchase_supplier_lead_time' => 'boolean',
        
        // Expiry Settings
        'expiry_near_expiry_alert' => 'integer',
        'expiry_critical_alert' => 'integer',
        'expiry_block_expired' => 'boolean',
        'expiry_auto_quarantine' => 'boolean',
        'expiry_enable_ai_analysis' => 'boolean',
        'expiry_enable_redistribution' => 'boolean',
        
        // Notifications
        'notif_low_stock' => 'boolean',
        'notif_expiry' => 'boolean',
        'notif_purchase_approval' => 'boolean',
        'notif_adjustment' => 'boolean',
        'notif_goods_received' => 'boolean',
        'notif_transfer' => 'boolean',
        'notif_dashboard' => 'boolean',
        'notif_email' => 'boolean',
        'notif_sms' => 'boolean',
        
        // AI Configuration
        'ai_demand_forecasting' => 'boolean',
        'ai_expiry_prediction' => 'boolean',
        'ai_suggested_po' => 'boolean',
        'ai_overstock_detection' => 'boolean',
        'ai_understock_detection' => 'boolean',
        'ai_redistribution_suggestions' => 'boolean',
        'ai_confidence_threshold' => 'integer',
        
        // Security
        'security_role_based_permissions' => 'boolean',
        'security_approval_levels' => 'integer',
        'security_audit_trail' => 'boolean',
        'security_session_timeout' => 'integer',
        'security_require_e_signature' => 'boolean',
        'security_require_fingerprint_critical' => 'boolean',
        
        // Audit
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ============================================
    // BOOT METHOD
    // ============================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->created_by = $model->created_by ?? Auth::id();
        });

        static::updating(function ($model) {
            $model->updated_by = Auth::id();
        });
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'updated_by');
    }

    // ============================================
    // ACCESSORS & MUTATORS
    // ============================================

    // Product Settings
    public function getProductSettingsAttribute(): array
    {
        return [
            'auto_generate_code' => (bool) $this->product_auto_generate_code,
            'code_prefix' => $this->product_code_prefix,
            'allow_without_barcode' => (bool) $this->product_allow_without_barcode,
            'duplicate_detection' => (bool) $this->product_duplicate_detection,
            'require_category' => (bool) $this->product_require_category,
            'require_generic_name' => (bool) $this->product_require_generic_name,
            'enable_images' => (bool) $this->product_enable_images,
            'enable_qr_codes' => (bool) $this->product_enable_qr_codes,
        ];
    }

    public function getBarcodeConfigAttribute(): array
    {
        return [
            'type' => $this->barcode_type,
            'auto_generate' => (bool) $this->barcode_auto_generate,
            'prefix' => $this->barcode_prefix,
            'starting_number' => (int) $this->barcode_starting_number,
            'label_size' => $this->barcode_label_size,
            'label_template' => $this->barcode_label_template,
            'print_on_create' => (bool) $this->barcode_print_on_create,
            'print_on_receive' => (bool) $this->barcode_print_on_receive,
            'default_printer' => $this->barcode_default_printer,
            'labels_to_print' => (int) $this->barcode_labels_to_print,
            'enable_verification' => (bool) $this->barcode_enable_verification,
            'scanner_input_mode' => $this->barcode_scanner_input_mode,
        ];
    }

    public function getLabelPrinterAttribute(): array
    {
        return [
            'default_printer' => $this->label_printer_default,
            'paper_size' => $this->label_printer_paper_size,
            'width' => (float) $this->label_printer_width,
            'height' => (float) $this->label_printer_height,
            'resolution' => (int) $this->label_printer_resolution,
            'auto_print' => (bool) $this->label_printer_auto_print,
            'print_batch' => (bool) $this->label_printer_print_batch,
            'print_expiry' => (bool) $this->label_printer_print_expiry,
            'print_code' => (bool) $this->label_printer_print_code,
            'print_price' => (bool) $this->label_printer_print_price,
            'print_qr' => (bool) $this->label_printer_print_qr,
        ];
    }

    public function getBiometricAttribute(): array
    {
        return [
            'enable_fingerprint' => (bool) $this->biometric_enable_fingerprint,
            'device' => $this->biometric_device,
            'require_for_issue' => (bool) $this->biometric_require_for_issue,
            'require_for_adjustment' => (bool) $this->biometric_require_for_adjustment,
            'require_for_purchase_approval' => (bool) $this->biometric_require_for_purchase_approval,
            'require_for_disposal' => (bool) $this->biometric_require_for_disposal,
            'timeout' => (int) $this->biometric_timeout,
            'backup_method' => $this->biometric_backup_method,
        ];
    }

    public function getReceivingAttribute(): array
    {
        return [
            'require_po' => (bool) $this->receiving_require_po,
            'allow_partial' => (bool) $this->receiving_allow_partial,
            'require_supplier' => (bool) $this->receiving_require_supplier,
            'require_batch' => (bool) $this->receiving_require_batch,
            'require_expiry' => (bool) $this->receiving_require_expiry,
            'require_cost' => (bool) $this->receiving_require_cost,
            'auto_generate_grn' => (bool) $this->receiving_auto_generate_grn,
            'print_grn' => (bool) $this->receiving_print_grn,
        ];
    }

    public function getStockControlAttribute(): array
    {
        return [
            'enable_batch_tracking' => (bool) $this->stock_enable_batch_tracking,
            'enable_expiry_tracking' => (bool) $this->stock_enable_expiry_tracking,
            'fefo' => (bool) $this->stock_fefo,
            'allow_negative' => (bool) $this->stock_allow_negative,
            'require_adjustment_reason' => (bool) $this->stock_require_adjustment_reason,
            'require_approval_for_adjustments' => (bool) $this->stock_require_approval_for_adjustments,
            'auto_recalculate' => (bool) $this->stock_auto_recalculate,
            'enable_bin_locations' => (bool) $this->stock_enable_bin_locations,
            'enable_shelf_locations' => (bool) $this->stock_enable_shelf_locations,
        ];
    }

    public function getIssueSettingsAttribute(): array
    {
        return [
            'require_department' => (bool) $this->issue_require_department,
            'require_recipient' => (bool) $this->issue_require_recipient,
            'require_reason' => (bool) $this->issue_require_reason,
            'block_expired' => (bool) $this->issue_block_expired,
            'block_zero_stock' => (bool) $this->issue_block_zero_stock,
            'allow_emergency' => (bool) $this->issue_allow_emergency,
            'print_voucher' => (bool) $this->issue_print_voucher,
        ];
    }

    public function getTransferSettingsAttribute(): array
    {
        return [
            'require_approval' => (bool) $this->transfer_require_approval,
            'require_receiving_confirmation' => (bool) $this->transfer_require_receiving_confirmation,
            'print_transfer_note' => (bool) $this->transfer_print_transfer_note,
            'track_in_transit' => (bool) $this->transfer_track_in_transit,
        ];
    }

    public function getReturnsSettingsAttribute(): array
    {
        return [
            'allow_department_returns' => (bool) $this->returns_allow_department_returns,
            'allow_supplier_returns' => (bool) $this->returns_allow_supplier_returns,
            'require_reason' => (bool) $this->returns_require_reason,
            'auto_restock' => (bool) $this->returns_auto_restock,
            'require_approval' => (bool) $this->returns_require_approval,
        ];
    }

    public function getPurchaseSettingsAttribute(): array
    {
        return [
            'auto_generate_requisition' => (bool) $this->purchase_auto_generate_requisition,
            'auto_generate_po' => (bool) $this->purchase_auto_generate_po,
            'multi_level_approval' => (bool) $this->purchase_multi_level_approval,
            'budget_validation' => (bool) $this->purchase_budget_validation,
            'suggested_order_quantity' => (bool) $this->purchase_suggested_order_quantity,
            'supplier_lead_time' => (bool) $this->purchase_supplier_lead_time,
        ];
    }

    public function getExpirySettingsAttribute(): array
    {
        return [
            'near_expiry_alert' => (int) $this->expiry_near_expiry_alert,
            'critical_alert' => (int) $this->expiry_critical_alert,
            'block_expired' => (bool) $this->expiry_block_expired,
            'auto_quarantine' => (bool) $this->expiry_auto_quarantine,
            'enable_ai_analysis' => (bool) $this->expiry_enable_ai_analysis,
            'enable_redistribution' => (bool) $this->expiry_enable_redistribution,
        ];
    }

    public function getNotificationsAttribute(): array
    {
        return [
            'low_stock' => (bool) $this->notif_low_stock,
            'expiry' => (bool) $this->notif_expiry,
            'purchase_approval' => (bool) $this->notif_purchase_approval,
            'adjustment' => (bool) $this->notif_adjustment,
            'goods_received' => (bool) $this->notif_goods_received,
            'transfer' => (bool) $this->notif_transfer,
            'dashboard' => (bool) $this->notif_dashboard,
            'email' => (bool) $this->notif_email,
            'sms' => (bool) $this->notif_sms,
        ];
    }

    public function getAiConfigAttribute(): array
    {
        return [
            'demand_forecasting' => (bool) $this->ai_demand_forecasting,
            'expiry_prediction' => (bool) $this->ai_expiry_prediction,
            'suggested_po' => (bool) $this->ai_suggested_po,
            'overstock_detection' => (bool) $this->ai_overstock_detection,
            'understock_detection' => (bool) $this->ai_understock_detection,
            'redistribution_suggestions' => (bool) $this->ai_redistribution_suggestions,
            'confidence_threshold' => (int) $this->ai_confidence_threshold,
            'analysis_frequency' => $this->ai_analysis_frequency,
        ];
    }

    public function getHardwareAttribute(): array
    {
        return [
            'barcode_scanner' => $this->hardware_barcode_scanner,
            'barcode_printer' => $this->hardware_barcode_printer,
            'receipt_printer' => $this->hardware_receipt_printer,
            'label_printer' => $this->hardware_label_printer,
            'fingerprint_reader' => $this->hardware_fingerprint_reader,
            'smart_card_reader' => $this->hardware_smart_card_reader,
            'rfid_reader' => $this->hardware_rfid_reader,
            'digital_scale' => $this->hardware_digital_scale,
            'signature_pad' => $this->hardware_signature_pad,
        ];
    }

    public function getSecurityAttribute(): array
    {
        return [
            'role_based_permissions' => (bool) $this->security_role_based_permissions,
            'approval_levels' => (int) $this->security_approval_levels,
            'audit_trail' => (bool) $this->security_audit_trail,
            'session_timeout' => (int) $this->security_session_timeout,
            'require_e_signature' => (bool) $this->security_require_e_signature,
            'require_fingerprint_critical' => (bool) $this->security_require_fingerprint_critical,
        ];
    }

    public function getNumberingAttribute(): array
    {
        return [
            'product_prefix' => $this->num_product_prefix,
            'batch_prefix' => $this->num_batch_prefix,
            'grn_prefix' => $this->num_grn_prefix,
            'issue_prefix' => $this->num_issue_prefix,
            'adjustment_prefix' => $this->num_adjustment_prefix,
            'transfer_prefix' => $this->num_transfer_prefix,
            'return_prefix' => $this->num_return_prefix,
            'requisition_prefix' => $this->num_requisition_prefix,
            'po_prefix' => $this->num_po_prefix,
        ];
    }

    // ============================================
    // SCOPES
    // ============================================

    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Get all settings as a flat array
     */
    public function getAllSettings(): array
    {
        return [
            'product_settings' => $this->product_settings,
            'barcode_config' => $this->barcode_config,
            'label_printer' => $this->label_printer,
            'biometric' => $this->biometric,
            'receiving' => $this->receiving,
            'stock_control' => $this->stock_control,
            'issue_settings' => $this->issue_settings,
            'transfer_settings' => $this->transfer_settings,
            'returns_settings' => $this->returns_settings,
            'purchase_settings' => $this->purchase_settings,
            'expiry_settings' => $this->expiry_settings,
            'notifications' => $this->notifications,
            'ai_config' => $this->ai_config,
            'hardware' => $this->hardware,
            'security' => $this->security,
            'numbering' => $this->numbering,
        ];
    }

    /**
     * Update settings from array
     */
    public function updateSettings(array $data): bool
    {
        $mappings = [
            'product_settings' => [
                'auto_generate_code' => 'product_auto_generate_code',
                'code_prefix' => 'product_code_prefix',
                'allow_without_barcode' => 'product_allow_without_barcode',
                'duplicate_detection' => 'product_duplicate_detection',
                'require_category' => 'product_require_category',
                'require_generic_name' => 'product_require_generic_name',
                'enable_images' => 'product_enable_images',
                'enable_qr_codes' => 'product_enable_qr_codes',
            ],
            'barcode_config' => [
                'type' => 'barcode_type',
                'auto_generate' => 'barcode_auto_generate',
                'prefix' => 'barcode_prefix',
                'starting_number' => 'barcode_starting_number',
                'label_size' => 'barcode_label_size',
                'label_template' => 'barcode_label_template',
                'print_on_create' => 'barcode_print_on_create',
                'print_on_receive' => 'barcode_print_on_receive',
                'default_printer' => 'barcode_default_printer',
                'labels_to_print' => 'barcode_labels_to_print',
                'enable_verification' => 'barcode_enable_verification',
                'scanner_input_mode' => 'barcode_scanner_input_mode',
            ],
            // ... add mappings for all sections
        ];

        $updates = [];

        foreach ($data as $section => $values) {
            if (isset($mappings[$section])) {
                foreach ($mappings[$section] as $key => $column) {
                    if (array_key_exists($key, $values)) {
                        $updates[$column] = $values[$key];
                    }
                }
            }
        }

        return $this->update($updates);
    }
}