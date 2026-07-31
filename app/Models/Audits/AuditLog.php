<?php


namespace App\Models\Audits;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    public $timestamps = false;

    protected $fillable = [
        'audit_uuid',
        'user_id',
        'user_name',
        'user_role',
        'user_ip',
        'user_agent',
        'action',
        'module',
        'table_name',
        'record_id',
        'record_uuid',
        'old_values',
        'new_values',
        'changes',
        'summary',
        'severity',
        'session_id',
        'request_id',
        'created_at',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'changes' => 'array',
        'created_at' => 'datetime',
    ];

    // Boot method
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->audit_uuid)) {
                $model->audit_uuid = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeByModule($query, $module)
    {
        return $query->where('module', $module);
    }

    public function scopeByAction($query, $action)
    {
        return $query->where('action', $action);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    public function scopeSeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    // Accessors
    public function getActionLabelAttribute(): string
    {
        $labels = [
            'CREATE' => 'Created',
            'UPDATE' => 'Updated',
            'DELETE' => 'Deleted',
            'RECEIVE' => 'Received Stock',
            'ISSUE' => 'Issued Stock',
            'TRANSFER' => 'Transferred Stock',
            'ADJUST' => 'Adjusted Stock',
            'RETURN' => 'Returned Stock',
            'APPROVE' => 'Approved',
            'REJECT' => 'Rejected',
            'CANCEL' => 'Cancelled',
            'EXPIRE' => 'Expired',
            'SYNC' => 'Synced',
        ];
        return $labels[$this->action] ?? $this->action;
    }

    public function getSeverityColorAttribute(): string
    {
        return match ($this->severity) {
            'critical' => 'danger',
            'warning' => 'warning',
            'info' => 'info',
            default => 'secondary',
        };
    }

    public function getFormattedChangesAttribute(): array
    {
        if (empty($this->changes)) {
            return [];
        }

        $formatted = [];
        foreach ($this->changes as $field => $change) {
            $formatted[] = [
                'field' => $field,
                'old' => $change['old'] ?? null,
                'new' => $change['new'] ?? null,
                'label' => $this->getFieldLabel($field),
            ];
        }
        return $formatted;
    }

    private function getFieldLabel($field): string
    {
        $labels = [
            'product_name' => 'Product Name',
            'quantity' => 'Quantity',
            'unit_cost' => 'Unit Cost',
            'selling_price' => 'Selling Price',
            'expiry_date' => 'Expiry Date',
            'batch_number' => 'Batch Number',
            'status' => 'Status',
            'quality_status' => 'Quality Status',
            'manufacturer' => 'Manufacturer',
            'storage_location' => 'Storage Location',
            'store_id' => 'Store',
            'supplier_id' => 'Supplier',
        ];
        return $labels[$field] ?? ucwords(str_replace('_', ' ', $field));
    }

    // Helper methods
    public function getAuditDetails(): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->audit_uuid,
            'user' => $this->user_name,
            'action' => $this->action_label,
            'module' => $this->module,
            'summary' => $this->summary,
            'changes' => $this->formatted_changes,
            'severity' => $this->severity,
            'severity_color' => $this->severity_color,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'created_ago' => $this->created_at->diffForHumans(),
        ];
    }
}
