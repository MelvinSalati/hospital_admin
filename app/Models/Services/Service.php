<?php

namespace App\Models\Services;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Service extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'scheme_type',
        'commodity_id',
        'service_uuid',
        'product_uuid',
        'department_id',
        'service_name',
        'service_category',
        'service_code',
        'description',
        'price',
        'is_active',
    ];

    protected $casts = [
        'scheme_type'   => 'integer',
        'commodity_id'  => 'integer',
        'department_id' => 'integer',
        'price'         => 'decimal:2',
        'is_active'     => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Service $service) {
            if (blank($service->service_uuid)) {
                $service->service_uuid = (string) Str::uuid();
            }
        });
    }

    public function commodity()
    {
        return $this->belongsTo(Product::class, 'commodity_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
