<?php

namespace App\Models\Pharmacies;


use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Departments\Department;
use App\Models\Patients\DispensedItem;


class DepartmentStockLedger extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'department_stock_ledger';

    protected $fillable = [
        'reference_no',
        'department_id',
        'counterpart_department_id',
        'transaction_type',
        'transaction_date',
        'patient_id',
        'prescription_id',
        'status',
        'remarks',
        'created_by',
        'posted_by',
        'posted_at',
        'voided_by',
        'voided_at',
        'void_reason',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'posted_at'        => 'datetime',
        'voided_at'        => 'datetime',
    ];

    // ---------- Relationships ----------

    public function items()
    {
        return $this->hasMany(DepartmentStockLedgerItem::class, 'ledger_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function counterpartDepartment()
    {
        return $this->belongsTo(Department::class, 'counterpart_department_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function postedBy()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function voidedBy()
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function dispensedItems()
    {
        return $this->hasMany(DispensedItem::class, 'ledger_id');
    }

    // ---------- Scopes ----------

    public function scopePosted($q)
    {
        return $q->where('status', 'posted')->whereNull('voided_at');
    }

    public function scopeVoided($q)
    {
        return $q->whereNotNull('voided_at');
    }

    public function scopeForDepartment($q, int $departmentId)
    {
        return $q->where('department_id', $departmentId);
    }

    // ---------- Helpers ----------

    public function isPosted(): bool
    {
        return $this->status === 'posted' && is_null($this->voided_at);
    }

    public function isVoided(): bool
    {
        return ! is_null($this->voided_at);
    }
}
