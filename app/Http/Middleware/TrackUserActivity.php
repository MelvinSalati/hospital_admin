<?php

namespace App\Http\Middleware;

use App\Models\UserActivityLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps "last seen" fresh for logged-in users and records what they do:
 *  - every page they open (Inertia visits)
 *  - every create / update / delete request they make
 * Request bodies are never stored.
 */
class TrackUserActivity
{
    /** Paths handled by the Login / Logout events instead */
    private const AUTH_PATHS = ['login', 'logout', 'register', 'two-factor-challenge'];

    public function handle(Request $request, Closure $next): Response
    {
        // Resolve the user BEFORE the request runs (a logout request clears it)
        $user = $request->user();

        $response = $next($request);

        if ($user) {
            try {
                $this->track($request, $response, (int) $user->id);
            } catch (\Throwable $e) {
                Log::warning('User activity tracking failed: ' . $e->getMessage());
            }
        }

        return $response;
    }

    private function track(Request $request, Response $response, int $userId): void
    {
        $path   = trim($request->path(), '/');
        $status = $response->getStatusCode();

        if (in_array($path, self::AUTH_PATHS, true)) {
            return;
        }

        $now = now();

        // ---- Page view: a real page load (browser asks for HTML) or an Inertia visit.
        // Background polling calls (e.g. notifications/unread) are NOT page views. ----
        $isPageView = $request->isMethod('GET')
            && !$request->header('X-Inertia-Partial-Component')
            && ($request->header('X-Inertia') || str_contains((string) $request->header('Accept'), 'text/html'))
            && $response->isSuccessful();

        if ($isPageView) {
            $label = 'Viewing ' . $this->humanizePath($path);

            DB::table('users')->where('id', $userId)->update([
                'last_seen_at'     => $now,
                'last_activity_at' => $now,
                'current_activity' => mb_substr($label, 0, 255),
            ]);

            // Same page opened twice within 10s counts once
            if (Cache::add("user-view:{$userId}:" . md5($path), 1, 10)) {
                UserActivityLog::record($userId, $label, null, $this->context($request, $path, $status));
            }

            return;
        }

        // ---- Data change: create / update / delete ----
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $verb = match ($request->method()) {
                'POST'          => 'Submitted',
                'PUT', 'PATCH'  => 'Updated',
                'DELETE'        => 'Deleted',
                default         => 'Requested',
            };

            $action = ($status >= 400 ? 'Failed: ' : '') . $verb . ' ' . $this->humanizePath($path);

            DB::table('users')->where('id', $userId)->update([
                'last_seen_at'     => $now,
                'last_activity_at' => $now,
                'current_activity' => mb_substr($action, 0, 255),
            ]);

            UserActivityLog::record(
                $userId,
                $action,
                "{$request->method()} /{$path} (HTTP {$status})",
                $this->context($request, $path, $status)
            );

            return;
        }

        // ---- Anything else (background API reads): just keep "last seen" fresh, once a minute ----
        if (Cache::add("user-seen:{$userId}", 1, 60)) {
            DB::table('users')->where('id', $userId)->update(['last_seen_at' => $now]);
        }
    }

    private function context(Request $request, string $path, int $status): array
    {
        return [
            'method'      => $request->method(),
            'path'        => '/' . $path,
            'status_code' => $status,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ];
    }

    /** "patients/12/prescriptions" => "patients / #12 / prescriptions" */
    private function humanizePath(string $path): string
    {
        if ($path === '') {
            return 'home';
        }

        $parts = array_map(
            fn(string $segment) => ctype_digit($segment) ? '#' . $segment : str_replace(['-', '_'], ' ', $segment),
            explode('/', $path)
        );

        return implode(' / ', $parts);
    }
}
