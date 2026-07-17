<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $userProfile = null;

        // If user is authenticated, load their profile
        if ($user) {
            // Eager load the profile relationship
            $user->load('profile');
            $userProfile = $user->profile;
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'user_uuid' => $user->user_uuid ?? null,
                    'profile' => $userProfile ? [
                        'id' => $userProfile->id,
                        'first_name' => $userProfile->first_name,
                        'surname' => $userProfile->surname,
                        'date_of_birth' => $userProfile->date_of_birth,
                        'gender' => $userProfile->gender,
                        'address' => $userProfile->address,
                        'mobile_phone_number' => $userProfile->mobile_phone_number,
                        'certificates' => $userProfile->certificates,
                        'degrees' => $userProfile->degrees,
                        'diplomas' => $userProfile->diplomas,
                        'profession_id' => $userProfile->profession_id,
                        'roles' => $userProfile->roles,
                        'license_expiry_date' => $userProfile->license_expiry_date,
                        'license_number' => $userProfile->license_number,
                        'license_document' => $userProfile->license_document,
                        'created_at' => $userProfile->created_at,
                        'updated_at' => $userProfile->updated_at,
                    ] : null,
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
