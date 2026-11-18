<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    // Table only has created_at (DB default), no updated_at
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
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'changes'    => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record an audit entry. User, role, IP, user agent, session and request id
     * are filled in automatically; pass anything in $attributes to override.
     *
     * Required: $action, $module.
     */
    public static function record(string $action, string $module, array $attributes = []): self
    {
        $user = Auth::user();
        $request = request();

        $old = $attributes['old_values'] ?? null;
        $new = $attributes['new_values'] ?? null;

        return static::create(array_merge([
            'audit_uuid' => (string) Str::uuid(),
            'user_id'    => $user?->id,
            'user_name'  => $user?->name,
            'user_role'  => static::resolveRole($user),
            'user_ip'    => $request?->ip(),
            'user_agent' => (string) $request?->userAgent(),
            'action'     => $action,
            'module'     => $module,
            'changes'    => static::diff($old, $new),
            'severity'   => 'info',
            'session_id' => ($request && $request->hasSession()) ? $request->session()->getId() : null,
            'request_id' => $request?->header('X-Request-Id') ?: (string) Str::uuid(),
        ], $attributes));
    }

    /**
     * { field: { old, new } } for every field that differs.
     * For a delete ($new = null) every old field is listed with new = null.
     */
    public static function diff(?array $old, ?array $new): ?array
    {
        if ($old === null && $new === null) {
            return null;
        }

        $old ??= [];
        $new ??= [];
        $changes = [];

        foreach (array_unique(array_merge(array_keys($old), array_keys($new))) as $key) {
            $o = $old[$key] ?? null;
            $n = $new[$key] ?? null;

            if ($o !== $n) {
                $changes[$key] = ['old' => $o, 'new' => $n];
            }
        }

        return $changes ?: null;
    }

    /** Works with Spatie roles, a `role` column, or neither. */
    protected static function resolveRole($user): ?string
    {
        if (! $user) {
            return null;
        }

        if (method_exists($user, 'getRoleNames')) {
            return $user->getRoleNames()->implode(', ') ?: null;
        }

        return isset($user->role) ? (string) $user->role : null;
    }
}
