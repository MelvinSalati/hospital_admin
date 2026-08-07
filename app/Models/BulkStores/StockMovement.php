<?php


namespace App\Models\BulkStores;

use App\Models\Audits\AuditLog;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StockMovement extends Model
{
    protected $table = 'stock_movements';

    protected $fillable = [
        'movement_uuid',
        'store_id',
        'product_id',
        'bulk_store_item_id',
        'batch_number',
        'type',
        'quantity',
        'unit_cost',
        'total_cost',
        'reference_type',
        'reference_id',
        'from_store_id',
        'to_store_id',
        'reason',
        'notes',
        'performed_by',
        'approved_by',
        'approved_at', 
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    // Movement types
    const TYPE_RECEIVING = 'receiving';
    const TYPE_ISSUING = 'issuing';
    const TYPE_TRANSFER_IN = 'transfer_in';
    const TYPE_TRANSFER_OUT = 'transfer_out';
    const TYPE_ADJUSTMENT = 'adjustment';
    const TYPE_RETURN = 'return';
    const TYPE_DAMAGE = 'damage';
    const TYPE_EXPIRY = 'expiry';
    const TYPE_RESERVATION = 'reservation';

    // Boot method
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->movement_uuid)) {
                $model->movement_uuid = (string) Str::uuid();
            }

           
        });
    }

    // Relationships
    public function store()
    {
        return $this->belongsTo(BulkStore::class, 'store_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function bulkStoreItem()
    {
        return $this->belongsTo(BulkStoreItem::class, 'bulk_store_item_id');
    }

    public function fromStore()
    {
        return $this->belongsTo(BulkStore::class, 'from_store_id');
    }

    public function toStore()
    {
        return $this->belongsTo(BulkStore::class, 'to_store_id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function auditLog()
    {
        return $this->belongsTo(AuditLog::class, 'audit_log_id');
    }

    // Scopes
    public function scopeType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeReceiving($query)
    {
        return $query->where('type', self::TYPE_RECEIVING);
    }

    public function scopeIssuing($query)
    {
        return $query->where('type', self::TYPE_ISSUING);
    }

    public function scopeTransfers($query)
    {
        return $query->whereIn('type', [self::TYPE_TRANSFER_IN, self::TYPE_TRANSFER_OUT]);
    }

    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    // Accessors
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            self::TYPE_RECEIVING => 'Receiving',
            self::TYPE_ISSUING => 'Issuing',
            self::TYPE_TRANSFER_IN => 'Transfer In',
            self::TYPE_TRANSFER_OUT => 'Transfer Out',
            self::TYPE_ADJUSTMENT => 'Adjustment',
            self::TYPE_RETURN => 'Return',
            self::TYPE_DAMAGE => 'Damage',
            self::TYPE_EXPIRY => 'Expiry',
            self::TYPE_RESERVATION => 'Reservation',
            default => ucfirst($this->type),
        };
    }

    public function getTypeColorAttribute(): string
    {
        return match ($this->type) {
            self::TYPE_RECEIVING => 'success',
            self::TYPE_ISSUING => 'danger',
            self::TYPE_TRANSFER_IN => 'info',
            self::TYPE_TRANSFER_OUT => 'warning',
            self::TYPE_ADJUSTMENT => 'secondary',
            self::TYPE_RETURN => 'primary',
            self::TYPE_DAMAGE => 'danger',
            self::TYPE_EXPIRY => 'danger',
            self::TYPE_RESERVATION => 'info',
            default => 'secondary',
        };
    }

    public function getIsApprovedAttribute(): bool
    {
        return !is_null($this->approved_at) && !is_null($this->approved_by);
    }

    public function getDirectionAttribute(): string
    {
        return in_array($this->type, [self::TYPE_RECEIVING, self::TYPE_TRANSFER_IN])
            ? 'inbound'
            : 'outbound';
    }

    public function getAuditSummaryAttribute(): string
    {
        $productName = $this->product->product_name ?? 'Unknown Product';
        $storeName = $this->store->name ?? 'Unknown Store';

        return match ($this->type) {
            self::TYPE_RECEIVING => "Received {$this->quantity} of {$productName} at {$storeName}",
            self::TYPE_ISSUING => "Issued {$this->quantity} of {$productName} from {$storeName}",
            self::TYPE_TRANSFER_IN => "Transferred in {$this->quantity} of {$productName} to {$storeName}",
            self::TYPE_TRANSFER_OUT => "Transferred out {$this->quantity} of {$productName} from {$storeName}",
            self::TYPE_ADJUSTMENT => "Adjusted {$this->quantity} of {$productName} at {$storeName}",
            self::TYPE_DAMAGE => "Damaged {$this->quantity} of {$productName} at {$storeName}",
            self::TYPE_EXPIRY => "Expired {$this->quantity} of {$productName} at {$storeName}",
            default => "Movement of {$this->quantity} of {$productName} at {$storeName}",
        };
    }
}
