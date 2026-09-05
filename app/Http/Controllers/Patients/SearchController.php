<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Patients\Patient;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    /**
     * Search patients by various criteria
     */
    public function search(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:255',
            'search_option' => 'required|string|in:all,name,patient_number,phone,alt_phone,nrc,passport,national_id,email,id_type,id_number',
            'status' => 'required|string|in:all,active,inactive',
        ]);

        $query = Patient::query();

        // Apply status filter
        if ($request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Apply search
        if ($request->filled('search')) {
            $search = $request->search;
            $option = $request->search_option;

            switch ($option) {
                case 'all':
                    $query->where(function ($q) use ($search) {
                        $q->where('patient_number', 'LIKE', "%{$search}%")
                            ->orWhere('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")
                            ->orWhere('phone', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%")
                            ->orWhere('id_type', 'LIKE', "%{$search}%")
                            ->orWhere('id_number', 'LIKE', "%{$search}%")
                            ->orWhere('nationality', 'LIKE', "%{$search}%")
                            ->orWhere('occupation', 'LIKE', "%{$search}%")
                            ->orWhere('address', 'LIKE', "%{$search}%");
                    });
                    break;
                case 'name':
                    $query->where(function ($q) use ($search) {
                        $q->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")
                            ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$search}%");
                    });
                    break;
                case 'patient_number':
                    $query->where('patient_number', 'LIKE', "%{$search}%");
                    break;
                case 'phone':
                    $query->where('phone', 'LIKE', "%{$search}%");
                    break;
                case 'alt_phone':
                    // Since there's no alt_phone column, search in emergency_phone
                    $query->where('emergency_phone', 'LIKE', "%{$search}%");
                    break;
                case 'nrc':
                    // Search in id_number where id_type is 'national_id' or 'nrc'
                    $query->where(function ($q) use ($search) {
                        $q->where('id_type', 'LIKE', '%national_id%')
                            ->orWhere('id_type', 'LIKE', '%nrc%')
                            ->orWhere('id_type', 'LIKE', '%NRC%');
                    })->where('id_number', 'LIKE', "%{$search}%");
                    break;
                case 'passport':
                    // Search in id_number where id_type is 'passport'
                    $query->where('id_type', 'LIKE', '%passport%')
                        ->where('id_number', 'LIKE', "%{$search}%");
                    break;
                case 'national_id':
                    // Search in id_number where id_type is 'national_id'
                    $query->where('id_type', 'LIKE', '%national_id%')
                        ->where('id_number', 'LIKE', "%{$search}%");
                    break;
                case 'email':
                    $query->where('email', 'LIKE', "%{$search}%");
                    break;
                case 'id_type':
                    $query->where('id_type', 'LIKE', "%{$search}%");
                    break;
                case 'id_number':
                    $query->where('id_number', 'LIKE', "%{$search}%");
                    break;
                default:
                    // Fallback to all fields
                    $query->where(function ($q) use ($search) {
                        $q->where('patient_number', 'LIKE', "%{$search}%")
                            ->orWhere('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")
                            ->orWhere('phone', 'LIKE', "%{$search}%");
                    });
                    break;
            }
        }

        // Order by created_at descending (newest first)
        $patients = $query->orderBy('created_at', 'desc')->get();

        // Transform the data to match the frontend expectations
        $transformedPatients = $patients->map(function ($patient) {
            return [
                'id' => $patient->id,
                'patient_uuid' => $patient->patient_uuid,
                'patient_number' => $patient->patient_number,
                'first_name' => $patient->first_name,
                'last_name' => $patient->last_name,
                'gender' => $patient->gender,
                'date_of_birth' => $patient->date_of_birth,
                'phone' => $patient->phone,
                'email' => $patient->email,
                'address' => $patient->address,
                'emergency_contact' => $patient->emergency_contact,
                'emergency_phone' => $patient->emergency_phone,
                'blood_group' => $patient->blood_group,
                'allergies' => $patient->allergies,
                'chronic_conditions' => $patient->chronic_conditions,
                'current_medications' => $patient->current_medications,
                'medical_history' => $patient->medical_history,
                'surgical_history' => $patient->surgical_history,
                'family_history' => $patient->family_history,
                'marital_status' => $patient->marital_status,
                'occupation' => $patient->occupation,
                'nationality' => $patient->nationality,
                'id_type' => $patient->id_type,
                'id_number' => $patient->id_number,
                'insurance_provider' => $patient->insurance_provider,
                'insurance_number' => $patient->insurance_number,
                'insurance_expiry' => $patient->insurance_expiry,
                'insurance_status' => $patient->insurance_status,
                'next_of_kin_name' => $patient->next_of_kin_name,
                'next_of_kin_relationship' => $patient->next_of_kin_relationship,
                'next_of_kin_phone' => $patient->next_of_kin_phone,
                'profile_photo' => $patient->profile_photo,
                'status' => $patient->status,
                'created_at' => $patient->created_at,
                'updated_at' => $patient->updated_at,
                // Alias fields for the frontend
                'nrc' => ($patient->id_type === 'national_id' || $patient->id_type === 'nrc' || $patient->id_type === 'NRC')
                    ? $patient->id_number
                    : null,
                'passport' => ($patient->id_type === 'passport')
                    ? $patient->id_number
                    : null,
                'national_id' => ($patient->id_type === 'national_id')
                    ? $patient->id_number
                    : null,
                'alt_phone' => $patient->emergency_phone,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformedPatients,
            'total' => $transformedPatients->count(),
            'filters' => [
                'search' => $request->search,
                'search_option' => $request->search_option,
                'status' => $request->status,
            ]
        ]);
    }

    /**
     * Advanced search with more specific criteria
     */
    public function advancedSearch(Request $request)
    {
        $request->validate([
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'patient_number' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'id_type' => 'nullable|string|max:255',
            'id_number' => 'nullable|string|max:255',
            'blood_group' => 'nullable|string|max:255',
            'nationality' => 'nullable|string|max:255',
            'marital_status' => 'nullable|string|max:255',
            'occupation' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,inactive',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $query = Patient::query();

        // Apply all filters
        if ($request->filled('first_name')) {
            $query->where('first_name', 'LIKE', "%{$request->first_name}%");
        }

        if ($request->filled('last_name')) {
            $query->where('last_name', 'LIKE', "%{$request->last_name}%");
        }

        if ($request->filled('patient_number')) {
            $query->where('patient_number', 'LIKE', "%{$request->patient_number}%");
        }

        if ($request->filled('phone')) {
            $query->where('phone', 'LIKE', "%{$request->phone}%");
        }

        if ($request->filled('email')) {
            $query->where('email', 'LIKE', "%{$request->email}%");
        }

        if ($request->filled('id_type')) {
            $query->where('id_type', 'LIKE', "%{$request->id_type}%");
        }

        if ($request->filled('id_number')) {
            $query->where('id_number', 'LIKE', "%{$request->id_number}%");
        }

        if ($request->filled('blood_group')) {
            $query->where('blood_group', 'LIKE', "%{$request->blood_group}%");
        }

        if ($request->filled('nationality')) {
            $query->where('nationality', 'LIKE', "%{$request->nationality}%");
        }

        if ($request->filled('marital_status')) {
            $query->where('marital_status', 'LIKE', "%{$request->marital_status}%");
        }

        if ($request->filled('occupation')) {
            $query->where('occupation', 'LIKE', "%{$request->occupation}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $patients = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $patients,
            'total' => $patients->count(),
        ]);
    }
}
