<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Department; 
class BulkStoreRequest extends Model
{
    use SoftDeletes;

    protected $table = 'bulk_store_requests';

    // Use default auto-increment (no need to specify keyType)

    protected $fillable = [
        'request_number',
        'department_id',
        'request_date',
        'required_by_date',
        'status',
        'priority',
        'total_amount',
        'notes',
        'created_by',
        'approved_by',
        'dispatched_by',
        'received_by',
        'approved_at',
        'dispatched_at',
        'received_at',
        'is_active',
    ];

    protected $casts = [
        'request_date' => 'date',
        'required_by_date' => 'date',
        'approved_at' => 'datetime',
        'dispatched_at' => 'datetime',
        'received_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'total_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            // Auto-generate request number
            if (empty($model->request_number)) {
                $model->request_number = self::generateRequestNumber();
            }
            if (empty($model->request_date)) {
                $model->request_date = now();
            }
            if (empty($model->status)) {
                $model->status = 'pending';
            }
            if (empty($model->priority)) {
                $model->priority = 'medium';
            }
            if (empty($model->is_active)) {
                $model->is_active = true;
            }
        });
    }

    public static function generateRequestNumber(): string
    {
        $prefix = 'REQ';
        $date = now()->format('Ymd');
        $count = self::whereDate('created_at', today())->count() + 1;
        return $prefix . '-' . $date . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BulkStoreRequestItem::class, 'request_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function dispatchedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dispatched_by');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
