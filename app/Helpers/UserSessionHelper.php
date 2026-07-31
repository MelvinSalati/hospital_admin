<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Session;

class UserSessionHelper
{
    /**
     * Get authenticated user from Inertia shared data.
     */
    public static function user(): ?array
    {
        $shared = Session::get('_inertia_shared', []);
        return $shared['auth']['user'] ?? null;
    }

    /**
     * Get authenticated user ID.
     */
    public static function id(): ?int
    {
        return self::user()['id'] ?? null;
    }

    /**
     * Check if user is authenticated.
     */
    public static function check(): bool
    {
        return self::user() !== null;
    }

    /**
     * Check if user is admin.
     */
    public static function isAdmin(): bool
    {
        return self::user()['is_admin'] ?? false;
    }

    /**
     * Check if user is supervisor.
     */
    public static function isSupervisor(): bool
    {
        return self::user()['is_supervisor'] ?? false;
    }

    /**
     * Check if user can approve.
     */
    public static function canApprove(): bool
    {
        return self::isAdmin() || self::isSupervisor();
    }

    /**
     * Check if user can release funds.
     */
    public static function canReleaseFunds(): bool
    {
        return self::isAdmin();
    }

    /**
     * Get user role.
     */
    public static function role(): string
    {
        if (!self::check()) return 'guest';
        if (self::isAdmin()) return 'admin';
        if (self::isSupervisor()) return 'supervisor';
        return 'staff';
    }

    /**
     * Get user details.
     */
    public static function details(): ?array
    {
        $user = self::user();
        if (!$user) return null;

        return [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => self::role(),
            'is_admin' => $user['is_admin'] ?? false,
            'is_supervisor' => $user['is_supervisor'] ?? false,
        ];
    }
}