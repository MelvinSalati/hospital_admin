<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class UserActivityLog extends Model
{
    public $timestamps = false;

    protected $table = 'user_activity_logs';

    protected $fillable = [
        'user_id',
        'action',
        'description',
        'method',
        'path',
        'status_code',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * Write one activity row. Never throws: logging must not break a request.
     */
    public static function record(
        int $userId,
        string $action,
        ?string $description = null,
        array $extra = []
    ): void {
        try {
            static::create([
                'user_id'     => $userId,
                'action'      => mb_substr($action, 0, 255),
                'description' => $description,
                'method'      => $extra['method'] ?? null,
                'path'        => isset($extra['path']) ? mb_substr($extra['path'], 0, 255) : null,
                'status_code' => $extra['status_code'] ?? null,
                'ip_address'  => $extra['ip_address'] ?? null,
                'user_agent'  => isset($extra['user_agent']) ? mb_substr($extra['user_agent'], 0, 255) : null,
                'created_at'  => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Could not write user activity log: ' . $e->getMessage());
        }
    }
}
