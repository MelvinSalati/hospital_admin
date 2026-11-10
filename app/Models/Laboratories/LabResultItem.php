<?php

namespace App\Models\Laboratories;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Models\Patients\LabOrder;
use App\Models\Patients\Patient;

class LabResultItem extends Model
{
    use SoftDeletes;

    protected $table = 'lab_result_items';

    protected $fillable = [
        'lab_order_id',
        'patient_id',
        'order_number',
        'test_id',
        'test_name',
        'test_category',
        'status',
        'priority',
        'result_value',
        'value',     // string / free-text result  e.g. "Positive", "Reactive"
        'numeric_value',     // numeric result            e.g. 12.5, 98.6
        'reference_range',
        'interpretation',
        'unit',
        'notes',
        'performed_by',
        'performed_date',
        'created_by',
        'quantity',
        'unit_price',
        'total_price',
        'visit_token',
    ];

    protected $casts = [
        'result_value'   => 'string',
        'numeric_value'  => 'float',
        'performed_date' => 'datetime',
        'created_at'     => 'datetime',
        'updated_at'     => 'datetime',
    ];

    /**
     * Unified display value — prefers numeric_value when present, then result_value.
     */
    protected function displayResult(): Attribute
    {
        return Attribute::make(
            get: function () {
                // 1. Prefer numeric_value if it's set and non-empty
                if ($this->numeric_value !== null && $this->numeric_value !== '') {
                    return (string) $this->numeric_value;
                }

                // 2. Fall back to result_value
                if (!is_null($this->result_value) && $this->result_value !== '') {
                    return (string) $this->result_value;
                }

                // 3. Nothing available
                return null;
            },
        );
    }

    /**
     * True if this item actually has a result (either numeric or text).
     */
    protected function hasResult(): Attribute
    {
        return Attribute::make(
            get: fn() => !is_null($this->display_result) && $this->display_result !== '',
        );
    }

    public function labOrder()
    {
        return $this->belongsTo(LabOrder::class, 'lab_order_id', 'id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
