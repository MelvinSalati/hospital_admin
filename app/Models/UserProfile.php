<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UserProfile extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'user_id', // Add this
        'first_name',
        'department_id',
        'surname',
        'date_of_birth',
        'gender',
        'address',
        'mobile_phone_number',
        'certificates',
        'degrees',
        'diplomas',
        'email',
        'profession_id',
        'roles',
        'license_expiry_date',
        'license_number',
        'license_document',
    ];

    /**
     * Get the user that owns this profile.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'certificates' => 'array',
        'degrees' => 'array',
        'diplomas' => 'array',
        'roles' => 'array',
        'date_of_birth' => 'date',
        'license_expiry_date' => 'date',
    ];
    public function profile()
    {
        return $this->hasOne(UserProfile::class, 'user_id', 'id');
    }

    /**
     * Get the user's department ID from their profile.
     */
    public function getDepartmentId()
    {
        // Check if user has a profile with department_id
        if ($this->profile && $this->profile->department_id) {
            return $this->profile->department_id;
        }

        // Fallback: check if user has department_id directly
        if ($this->department_id) {
            return $this->department_id;
        }

        // If still no department, try to determine from roles
        $roles = is_array($this->roles) ? $this->roles : json_decode($this->roles ?? '[]', true);

        $roleDepartmentMap = [
            'pharmacist' => '1',
            'pharmacy' => '1',
            'lab_technician' => '3',
            'laboratory' => '3',
            'nurse' => '6',
            'nursing' => '6',
            'doctor' => '2',
            'receptionist' => '4',
            'admin' => '1',
            'bulkstore' => '8',
        ];

        foreach ($roles as $role) {
            if (isset($roleDepartmentMap[$role])) {
                return $roleDepartmentMap[$role];
            }
        }

        // Default to Pharmacy
        return '1';
    }

    /**
     * Get the user's department name.
     */
    public function getDepartmentName()
    {
        $departmentId = $this->getDepartmentId();

        if (!$departmentId) {
            return 'Unknown Department';
        }

        $department = Department::find($departmentId);
        return $department?->name ?? 'Unknown Department';
    }

    /**
     * Get the user's department relationship.
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }
}
