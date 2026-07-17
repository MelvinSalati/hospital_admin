<?php

namespace App\Models\Laboratory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestConfig extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'test_configs';

    protected $fillable = [
        'test_name',
        'test_code',
        'category',
        'sample_type',
        'unit',
        'reference_range',
        'price',
        'turnaround_time',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function parameters()
    {
        return $this->hasMany(TestParameter::class, 'test_config_id')->orderBy('display_order');
    }

    public function activeParameters()
    {
        return $this->parameters()->where('is_active', true);
    }

    public function orders()
    {
        return $this->hasMany(TestOrder::class, 'test_config_id');
    }

    public function results()
    {
        return $this->hasMany(TestResult::class, 'test_config_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('test_name', 'LIKE', "%{$search}%")
                ->orWhere('test_code', 'LIKE', "%{$search}%");
        });
    }
}
