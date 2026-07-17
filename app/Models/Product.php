<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Supplier;
use App\Models\Category;

class Product extends Model
{
    use HasFactory;

    protected $table = 'drug_items';

    protected $fillable = [
        'product_uuid',
        'description',
        'product_name',
        'product_code',
        'category_id',
        'strength',
        'unit',
        'wholesale',
        'retail',
        'form',
        'quantity',
        'expiry_date',
        'transaction_type',
        'from_deparment_id',
        'to_department_id',
        'supplier_id',
        'created_by',
        'created_by_department'
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
