<?php

namespace App\Models\Laboratory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestParameter extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'test_parameters';

    protected $fillable = [
        'test_config_id',
        'parameter_name',
        'parameter_code',
        'data_type',
        'unit',
        'reference_range',
        'options',
        'is_required',
        'is_active',
        'display_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    public function testConfig()
    {
        return $this->belongsTo(TestConfig::class, 'test_config_id');
    }

    public function results()
    {
        return $this->hasMany(TestResult::class, 'parameter_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    public function getDataTypeLabelAttribute()
    {
        $labels = [
            'text' => 'Text',
            'number' => 'Number',
            'select' => 'Select',
            'textarea' => 'Text Area',
            'date' => 'Date',
            'time' => 'Time',
            'checkbox' => 'Checkbox',
            'file' => 'File',
        ];
        return $labels[$this->data_type] ?? $this->data_type;
    }
}
