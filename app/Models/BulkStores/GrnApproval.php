<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Model;

class GrnApproval extends Model
{
    protected $table = 'grn_approvals';

    public $timestamps = false;

    protected $fillable = [
        'goods_received_note_id',
        'approver_id',
        'action',
        'approval_channel',
        'approved_at',
        'ip_address',
        'remarks',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function goodsReceivedNote()
    {
        return $this->belongsTo(
            GoodsReceivedNote::class,
            'goods_received_note_id'
        );
    }

    public function approver()
    {
        return $this->belongsTo(
            \App\Models\User::class,
            'approver_id'
        );
    }
}
