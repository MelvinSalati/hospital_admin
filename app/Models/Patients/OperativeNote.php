<?php

namespace App\Models\Patients;


use App\Models\Patients\Patient;          // adjust namespace if different
use App\Models\Patients\PatientVisit;     // adjust namespace if different
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OperativeNote extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SIGNED = 'signed';

    /** Team roles stored in operative_note_team.role */
    public const ROLE_CO_SURGEON = 'co_surgeon';
    public const ROLE_ASSISTANT = 'assistant';
    public const ROLE_ANAESTHETIST = 'anaesthetist';
    public const ROLE_SCRUB_NURSE = 'scrub_nurse';
    public const ROLE_CIRCULATING_NURSE = 'circulating_nurse';

    protected $guarded = ['id', 'status', 'signed_by', 'signed_at', 'created_by'];

    protected $casts = [
        'operation_date' => 'date',
        'specimens' => 'array',
        'post_op_plan' => 'array',
        'complications_occurred' => 'boolean',
        'signed_at' => 'datetime',
    ];

    public function isSigned(): bool
    {
        return $this->status === self::STATUS_SIGNED;
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(TheaterOrderItem::class, 'theater_order_item_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(PatientVisit::class, 'patient_visit_id');
    }

    public function leadSurgeon(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_surgeon_id');
    }

    public function signer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_by');
    }

    public function team(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'operative_note_team')
            ->withPivot('role')
            ->withTimestamps();
    }

    /** IDs of team members holding a given role. */
    public function teamIds(string $role): array
    {
        return $this->team->where('pivot.role', $role)->pluck('id')->values()->all();
    }
}
