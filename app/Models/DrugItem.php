<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Services\Service;
use App\Models\Patients\PrescriptionItem;
use App\Models\Pharmacy\DrugBatch;

class DrugItem extends Model
{
    use HasFactory;

    protected $table = 'drug_items';

    protected $fillable = [
        'drug_code',
        'drug_name',
        'generic_name',
        'brand_name',
        'barcode',
        'qr_code',
        'category_id',
        'service_id',
        'therapeutic_class',
        'schedule_class',
        'strength',
        'dosage_form',
        'route_of_administration',
        'unit_of_measure',
        'pack_size',
        'minimum_stock_level',
        'maximum_stock_level',
        'reorder_level',
        'purchase_price',
        'selling_price',
        'insurance_price',
        'is_arv',
        'is_tb_drug',
        'is_emergency',
        'is_controlled',
        'track_batches',
        'track_expiry',
        'allow_negative_stock',
        'is_active',
        'discontinued',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_arv' => 'boolean',
        'is_tb_drug' => 'boolean',
        'is_emergency' => 'boolean',
        'is_controlled' => 'boolean',
        'track_batches' => 'boolean',
        'track_expiry' => 'boolean',
        'allow_negative_stock' => 'boolean',
        'is_active' => 'boolean',
        'discontinued' => 'boolean',
        'purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'insurance_price' => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(DrugCategory::class, 'category_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function batches()
    {
        return $this->hasMany(DrugBatch::class, 'drug_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockLedger::class, 'drug_id');
    }

    public function prescriptionItems()
    {
        return $this->hasMany(PrescriptionItem::class, 'drug_id');
    }

    public function dispensationItems()
    {
        return $this->hasMany(DispensationItem::class, 'drug_id');
    }
}
