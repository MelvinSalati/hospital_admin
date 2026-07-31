<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\BulkStoreSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BulkStoreSettingController extends Controller
{
    /**
     * Get all settings
     */
    public function index()
    {
        try {
            $settings = BulkStoreSetting::latest()->first();

            if (!$settings) {
                // Create default settings if none exist
                $settings = $this->createDefaultSettings();
            }

            return response()->json([
                'success' => true,
                'data' => $settings->getAllSettings(),
                'raw' => $settings,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch settings: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific section of settings
     */
    public function getSection(string $section)
    {
        try {
            $settings = BulkStoreSetting::latest()->first();

            if (!$settings) {
                $settings = $this->createDefaultSettings();
            }

            $sections = [
                'product' => 'product_settings',
                'barcode' => 'barcode_config',
                'label-printer' => 'label_printer',
                'biometric' => 'biometric',
                'receiving' => 'receiving',
                'stock' => 'stock_control',
                'issue' => 'issue_settings',
                'transfer' => 'transfer_settings',
                'returns' => 'returns_settings',
                'purchase' => 'purchase_settings',
                'expiry' => 'expiry_settings',
                'notifications' => 'notifications',
                'ai' => 'ai_config',
                'hardware' => 'hardware',
                'security' => 'security',
                'numbering' => 'numbering',
            ];

            if (!isset($sections[$section])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid section: ' . $section,
                ], 400);
            }

            $method = $sections[$section];

            return response()->json([
                'success' => true,
                'data' => $settings->$method,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch section: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update settings
     */
    public function update(Request $request)
    {
        try {
            $settings = BulkStoreSetting::latest()->first();

            if (!$settings) {
                $settings = $this->createDefaultSettings();
            }

            // Validate request
            $validator = $this->validateSettings($request->all());

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Update settings
            $settings->updateSettings($request->all());

            // Update audit trail
            $settings->updated_by = Auth::id();
            $settings->save();

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => $settings->getAllSettings(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset settings to default
     */
    public function reset()
    {
        try {
            // Delete existing settings
            BulkStoreSetting::truncate();

            // Create default settings
            $settings = $this->createDefaultSettings();

            return response()->json([
                'success' => true,
                'message' => 'Settings reset to default values',
                'data' => $settings->getAllSettings(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset settings: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create default settings
     */
    private function createDefaultSettings(): BulkStoreSetting
    {
        return BulkStoreSetting::create([
            // Product Settings
            'product_auto_generate_code' => true,
            'product_code_prefix' => 'PRD',
            'product_allow_without_barcode' => true,
            'product_duplicate_detection' => true,
            'product_require_category' => true,
            'product_require_generic_name' => false,
            'product_enable_images' => true,
            'product_enable_qr_codes' => true,

            // Barcode Configuration
            'barcode_type' => 'code128',
            'barcode_auto_generate' => true,
            'barcode_prefix' => 'BAR',
            'barcode_starting_number' => 1000,
            'barcode_label_size' => 'medium',
            'barcode_label_template' => 'standard',
            'barcode_print_on_create' => true,
            'barcode_print_on_receive' => false,
            'barcode_default_printer' => 'Zebra ZD620',
            'barcode_labels_to_print' => 2,
            'barcode_enable_verification' => true,
            'barcode_scanner_input_mode' => 'keyboard',

            // Label Printer
            'label_printer_default' => 'Zebra ZD620',
            'label_printer_paper_size' => '4x6',
            'label_printer_width' => 4.00,
            'label_printer_height' => 6.00,
            'label_printer_resolution' => 203,
            'label_printer_auto_print' => true,
            'label_printer_print_batch' => true,
            'label_printer_print_expiry' => true,
            'label_printer_print_code' => true,
            'label_printer_print_price' => false,
            'label_printer_print_qr' => true,

            // Biometric
            'biometric_enable_fingerprint' => false,
            'biometric_device' => 'SecuGen Hamster IV',
            'biometric_require_for_issue' => false,
            'biometric_require_for_adjustment' => false,
            'biometric_require_for_purchase_approval' => false,
            'biometric_require_for_disposal' => false,
            'biometric_timeout' => 30,
            'biometric_backup_method' => 'pin',

            // Receiving
            'receiving_require_po' => true,
            'receiving_allow_partial' => true,
            'receiving_require_supplier' => true,
            'receiving_require_batch' => true,
            'receiving_require_expiry' => true,
            'receiving_require_cost' => true,
            'receiving_auto_generate_grn' => true,
            'receiving_print_grn' => true,

            // Stock Control
            'stock_enable_batch_tracking' => true,
            'stock_enable_expiry_tracking' => true,
            'stock_fefo' => true,
            'stock_allow_negative' => false,
            'stock_require_adjustment_reason' => true,
            'stock_require_approval_for_adjustments' => true,
            'stock_auto_recalculate' => true,
            'stock_enable_bin_locations' => false,
            'stock_enable_shelf_locations' => false,

            // Issue Settings
            'issue_require_department' => true,
            'issue_require_recipient' => true,
            'issue_require_reason' => true,
            'issue_block_expired' => true,
            'issue_block_zero_stock' => true,
            'issue_allow_emergency' => true,
            'issue_print_voucher' => true,

            // Transfer Settings
            'transfer_require_approval' => true,
            'transfer_require_receiving_confirmation' => true,
            'transfer_print_transfer_note' => true,
            'transfer_track_in_transit' => true,

            // Returns Settings
            'returns_allow_department_returns' => true,
            'returns_allow_supplier_returns' => true,
            'returns_require_reason' => true,
            'returns_auto_restock' => true,
            'returns_require_approval' => true,

            // Purchase Settings
            'purchase_auto_generate_requisition' => true,
            'purchase_auto_generate_po' => true,
            'purchase_multi_level_approval' => true,
            'purchase_budget_validation' => true,
            'purchase_suggested_order_quantity' => true,
            'purchase_supplier_lead_time' => true,

            // Expiry Settings
            'expiry_near_expiry_alert' => 90,
            'expiry_critical_alert' => 30,
            'expiry_block_expired' => true,
            'expiry_auto_quarantine' => true,
            'expiry_enable_ai_analysis' => true,
            'expiry_enable_redistribution' => true,

            // Notifications
            'notif_low_stock' => true,
            'notif_expiry' => true,
            'notif_purchase_approval' => true,
            'notif_adjustment' => true,
            'notif_goods_received' => true,
            'notif_transfer' => true,
            'notif_dashboard' => true,
            'notif_email' => true,
            'notif_sms' => false,

            // AI Configuration
            'ai_demand_forecasting' => true,
            'ai_expiry_prediction' => true,
            'ai_suggested_po' => true,
            'ai_overstock_detection' => true,
            'ai_understock_detection' => true,
            'ai_redistribution_suggestions' => true,
            'ai_confidence_threshold' => 85,
            'ai_analysis_frequency' => 'daily',

            // Hardware
            'hardware_barcode_scanner' => 'USB Scanner',
            'hardware_barcode_printer' => 'Zebra ZD620',
            'hardware_receipt_printer' => 'Epson TM-T88',
            'hardware_label_printer' => 'Zebra ZD620',
            'hardware_fingerprint_reader' => 'SecuGen Hamster IV',
            'hardware_smart_card_reader' => 'ACR38U',
            'hardware_rfid_reader' => 'Impinj R700',
            'hardware_digital_scale' => 'Mettler Toledo',
            'hardware_signature_pad' => 'Topaz Systems',

            // Security
            'security_role_based_permissions' => true,
            'security_approval_levels' => 2,
            'security_audit_trail' => true,
            'security_session_timeout' => 30,
            'security_require_e_signature' => false,
            'security_require_fingerprint_critical' => false,

            // Numbering
            'num_product_prefix' => 'PRD',
            'num_batch_prefix' => 'BAT',
            'num_grn_prefix' => 'GRN',
            'num_issue_prefix' => 'ISS',
            'num_adjustment_prefix' => 'ADJ',
            'num_transfer_prefix' => 'TRF',
            'num_return_prefix' => 'RET',
            'num_requisition_prefix' => 'REQ',
            'num_po_prefix' => 'PO',

            'created_by' => Auth::id(),
        ]);
    }

    /**
     * Validate settings
     */
    private function validateSettings(array $data): \Illuminate\Validation\Validator
    {
        $rules = [
            // Product Settings
            'product_settings.auto_generate_code' => 'sometimes|boolean',
            'product_settings.code_prefix' => 'sometimes|string|max:10',
            'product_settings.allow_without_barcode' => 'sometimes|boolean',
            'product_settings.duplicate_detection' => 'sometimes|boolean',
            'product_settings.require_category' => 'sometimes|boolean',
            'product_settings.require_generic_name' => 'sometimes|boolean',
            'product_settings.enable_images' => 'sometimes|boolean',
            'product_settings.enable_qr_codes' => 'sometimes|boolean',

            // Barcode Configuration
            'barcode_config.type' => 'sometimes|in:code128,code39,ean13,qr',
            'barcode_config.auto_generate' => 'sometimes|boolean',
            'barcode_config.prefix' => 'sometimes|string|max:10',
            'barcode_config.starting_number' => 'sometimes|integer|min:0',
            'barcode_config.label_size' => 'sometimes|in:small,medium,large',
            'barcode_config.print_on_create' => 'sometimes|boolean',
            'barcode_config.print_on_receive' => 'sometimes|boolean',
            'barcode_config.labels_to_print' => 'sometimes|integer|min:1|max:10',
            'barcode_config.enable_verification' => 'sometimes|boolean',
            'barcode_config.scanner_input_mode' => 'sometimes|in:keyboard,serial',

            // Label Printer
            'label_printer.width' => 'sometimes|numeric|min:1|max:10',
            'label_printer.height' => 'sometimes|numeric|min:1|max:10',
            'label_printer.resolution' => 'sometimes|integer|min:72|max:600',

            // Biometric
            'biometric.timeout' => 'sometimes|integer|min:5|max:300',

            // Security
            'security.approval_levels' => 'sometimes|integer|min:1|max:10',
            'security.session_timeout' => 'sometimes|integer|min:5|max:120',

            // Expiry
            'expiry_settings.near_expiry_alert' => 'sometimes|integer|min:1|max:365',
            'expiry_settings.critical_alert' => 'sometimes|integer|min:1|max:180',

            // AI
            'ai_config.confidence_threshold' => 'sometimes|integer|min:0|max:100',
            'ai_config.analysis_frequency' => 'sometimes|in:daily,weekly,monthly',

            // Notifications
            'notifications.*' => 'sometimes|boolean',

            // Numbering
            'numbering.*_prefix' => 'sometimes|string|max:10',
        ];

        return Validator::make($data, $rules);
    }
}