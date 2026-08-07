<?php

namespace App\Models\BulkStores;

use App\Models\User;
use App\Models\Product;
use App\Models\Department;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class StockLedger extends Model
{
    use SoftDeletes;

    protected $table = 'stock_ledger';

    protected $fillable = [
        'ledger_uuid',
        'department_id',
        'product_id',
        'bulk_store_id',
        'ledger_date',
        'opening_balance',
        'total_in',
        'total_out',
        'closing_balance',
        'purchases_in',
        'returns_in',
        'transfers_in',
        'adjustments_in',
        'sales_out',
        'damage_out',
        'expiry_out',
        'transfers_out',
        'adjustments_out',
        'movement_count',
        'unique_batches',
        'avg_unit_cost',
        'created_by',
        'updated_by',
        'is_verified',
        'verified_at',
        'verified_by',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'ledger_date' => 'date',
        'opening_balance' => 'integer',
        'total_in' => 'integer',
        'total_out' => 'integer',
        'closing_balance' => 'integer',
        'purchases_in' => 'integer',
        'returns_in' => 'integer',
        'transfers_in' => 'integer',
        'adjustments_in' => 'integer',
        'sales_out' => 'integer',
        'damage_out' => 'integer',
        'expiry_out' => 'integer',
        'transfers_out' => 'integer',
        'adjustments_out' => 'integer',
        'movement_count' => 'integer',
        'unique_batches' => 'integer',
        'avg_unit_cost' => 'decimal:2',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->ledger_uuid)) {
                $model->ledger_uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName()
    {
        return 'ledger_uuid';
    }

    // Relationships
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function bulkStore()
    {
        return $this->belongsTo(BulkStore::class, 'bulk_store_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // Scopes
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeForDate($query, $date)
    {
        return $query->where('ledger_date', $date);
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('ledger_date', [$from, $to]);
    }

    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    // Accessors
    public function getIsVerifiedAttribute($value)
    {
        return (bool) $value;
    }

    public function getVerificationStatusAttribute(): string
    {
        return $this->is_verified ? 'Verified' : 'Pending Verification';
    }

    public function getVerificationStatusColorAttribute(): string
    {
        return $this->is_verified ? 'green' : 'yellow';
    }

    // Helper Methods
    public function getTotalMovement(): int
    {
        return $this->total_in + $this->total_out;
    }

    public function getNetMovement(): int
    {
        return $this->total_in - $this->total_out;
    }

    public function verify($userId, $notes = null)
    {
        $this->is_verified = true;
        $this->verified_at = now();
        $this->verified_by = $userId;

        if ($notes) {
            $this->notes = $notes;
        }

        $this->save();

        return $this;
    }

    public function unverify()
    {
        $this->is_verified = false;
        $this->verified_at = null;
        $this->verified_by = null;
        $this->save();

        return $this;
    }

    public function recalculate()
    {
        // Recalculate closing balance
        $this->closing_balance = $this->opening_balance + $this->total_in - $this->total_out;
        $this->save();

        return $this;
    }
}
