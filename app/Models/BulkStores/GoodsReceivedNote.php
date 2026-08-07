<?php

namespace App\Models\BulkStores;

use App\Models\User;
use App\Models\Supplier;
use App\Models\PurchaseRequisition;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class GoodsReceivedNote extends Model
{
    use SoftDeletes;

    protected $table = 'goods_received_notes';

    protected $fillable = [
        'grn_uuid',
        'grn_number',
        'purchase_requisition_id',
        'purchase_order_id',
        'supplier_id',
        'department_id',
        'received_date',
        'received_by',
        'approved_by',
        'approved_at',
        'status',
        'total_quantity',
        'total_value',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'received_date' => 'date',
        'approved_at' => 'datetime',
        'total_quantity' => 'integer',
        'total_value' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    const STATUS_DRAFT = 'draft';
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_CANCELLED = 'cancelled';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->grn_uuid)) {
                $model->grn_uuid = (string) Str::uuid();
            }
            if (empty($model->grn_number)) {
                $model->grn_number = 'GRN-' . date('Ymd') . '-' . strtoupper(uniqid());
            }
        });
    }

    public function getRouteKeyName()
    {
        return 'grn_uuid';
    }

    // Relationships
    public function purchaseRequisition()
    {
        return $this->belongsTo(PurchaseRequisition::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items()
    {
        return $this->hasMany(GoodsReceivedNoteItem::class, 'grn_id');
    }

    // Scopes
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    // Accessors
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_DRAFT => 'Draft',
            self::STATUS_PENDING => 'Pending Approval',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_REJECTED => 'Rejected',
            self::STATUS_CANCELLED => 'Cancelled',
            default => ucfirst($this->status),
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_DRAFT => 'gray',
            self::STATUS_PENDING => 'yellow',
            self::STATUS_APPROVED => 'green',
            self::STATUS_REJECTED => 'red',
            self::STATUS_CANCELLED => 'gray',
            default => 'gray',
        };
    }
}
