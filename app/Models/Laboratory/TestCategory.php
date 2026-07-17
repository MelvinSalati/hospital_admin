<?php

namespace App\Models\Laboratory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'test_categories';

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function tests()
    {
        return $this->hasMany(TestConfig::class, 'category', 'name');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getTestCountAttribute()
    {
        return $this->tests()->count();
    }
}
