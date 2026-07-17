<?php

namespace App\Http\Controllers\Administrations;

use App\Helpers\PasswordGenerator;
use App\Http\Controllers\Controller;
use App\Jobs\SendPasswordEmailJob;
use App\Services\Admins\AdminService;
use Illuminate\Support\Facades\Validator;
use App\Models\Departments\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    protected $userService;

    public function __construct(AdminService $userService)
    {
        $this->userService   = $userService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('users/register',[
            'departments' => Department::all()
        ]);
    }
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
           
            $users = $request->input('data', []);

            if (!is_array($users)) {
                return response()->json([
                    'status' => false,
                    'message' => 'Invalid payload format',
                    'errors' => ['data' => ['Data must be an array']]
                ], 400);
            }

            // Validate input
            $validator = Validator::make($users, [
                'first_name' => 'required|string|max:255',
                'surname' => 'required|string|max:255',
                'date_of_birth' => 'required|date',
                'gender' => 'nullable|string|max:20',
                'address' => 'nullable|string|max:500',
                'email' => 'nullable|email|unique:users,email',
                'roles' => 'nullable|array',
                'mobile_phone_number' => 'nullable|string|max:20',
            ]);

            $role = $users['roles'];

            Log::info('roles captured',[$role]);

            // Validation failure
            if ($validator->fails()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $userRole = is_array($role) ? implode(', ', $role) : (string)$role;

            // Merge generated password
            $data = array_merge($users, [
                'self_gen_password' => PasswordGenerator::generate(8),
                
            ]);
            
            
            // Call service
            $response = $this->userService->create($data);
            
            $email = [
                "email"  => $users['email'],
                'self_gen_password' => $data['self_gen_password'],
                'name' => $users['first_name'],
                'role' => $userRole,
                'department_id' => $request->deaprtment_id
            ];

             /**
              * EMail verification 
              */
            
            SendPasswordEmailJob::dispatch($email);
        
            return $response;

        } catch (\Illuminate\Database\QueryException $e) {
           return response()->json([
                'status' => false,
                'message' => 'Database error occurred',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        } catch (\Exception $e) {
            // General errors
            Log::error('Unexpected error during user creation', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Something went wrong',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    } 

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
