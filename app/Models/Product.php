<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Supplier;
use App\Models\Category;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';

    protected $fillable = [
        'product_uuid',
        'product_name',
        'generic_name',
        'product_code',
        'barcode',
        'category_id',
        'unit',
        'description',
        'is_active',
        'brand_name',
        'therapeutic_class',
        'schedule_class',
        'strength',
        'dosage_form',
        'route_of_administration',
        'pack_size',
        'reorder_level',
        'is_arv',
        'is_tb_drug',
        'is_emergency',
        'is_controlled',
        'track_batches',
        'track_expiry',
        'allow_negative_stock',
    ];

    protected $dates = [
        'created_at',
        'updated_at',
        'expiry_date'
    ];

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function fromDepartment()
    {
        return $this->belongsTo(Department::class, 'from_deparment_id');
    }

    public function toDepartment()
    {
        return $this->belongsTo(Department::class, 'to_department_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}
