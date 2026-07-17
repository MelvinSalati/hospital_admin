<?php
namespace App\Models\Services;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Departments\Department;
class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_uuid',
        'service_category',
        'provider_id',
        'service_name',
        'department_id',
        'cash_price',
        'nhima_price',
        'insurance_price',
        'charity_price',
    ];

    protected $casts = [
        'service_uuid' => 'string',
        'provider_id' => 'integer',
        'cash_price' => 'decimal:2',
        'nhima_price' => 'decimal:2',
        'insurance_price' => 'decimal:2',
        'charity_price' => 'decimal:2',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
