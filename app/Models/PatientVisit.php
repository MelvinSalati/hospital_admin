<?php

namespace App\Models;

use App\Models\Departments\Department;
use App\Models\Patients\VisitToken;
use Illuminate\Database\Eloquent\Model;
use App\Models\Patients\Patient;
use App\Models\Patients\Invoice;
class PatientVisit extends Model
{
    protected $fillable = [
        'patient_id',
        'visit_uuid',
        'created_by',
        'visit_type',
        'department_id',
        'token',
        'to_queue',
        'priority',
        'status'
    ];

    // public function visitToken()
    // {
    //     return $this->hasOne(VisitToken::class, 'patient_id', 'patient_id');
    // } 

    public function patient(){
       return  $this->belongsTo(Patient::class,'patient_id');
    }

    public function assignedBy(){
       return $this->belongsTo(User::class,'assigned_by');
    }

    public function assignedStaff()
    {
        return $this->belongsTo(User::class, 'assigned_staff');
    }

    public function assignedDepartment()
    {
        return $this->belongsTo(Department::class, 'department_id');
    } 
    public function visitToken(){
        return $this->belongsTo(VisitToken::class,'patient_id');
    } 

    public function invoice(){
        return $this->belongsTo(Invoice::class,'patient_id');
    }
 
}
