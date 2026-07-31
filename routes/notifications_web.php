<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {
    // ==========================================
    // NOTIFICATIONS PAGE
    // ==========================================
    
    // Option 1: If your file is at resources/js/pages/admin/Notifications.tsx
    Route::inertia('/notifications', 'admin/Notifications')->name('notifications');
    
    // Option 2: If your file is at resources/js/pages/Notifications/Index.tsx
    // Route::inertia('/notifications', 'Notifications/Index')->name('notifications');
    
    // Option 3: If your file is at resources/js/pages/Notifications.tsx
    // Route::inertia('/notifications', 'Notifications')->name('notifications');

    // ==========================================
    // API ROUTES (for the full notifications page)
    // ==========================================
    
    // Get all notifications with pagination (for the full page)
    Route::get('/notifications/api', function (Request $request) {
        $user = $request->user();
        $perPage = $request->input('page_size', 10);
        $page = $request->input('page', 1);

        $notifications = $user->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        // Transform the data
        $transformed = $notifications->through(function ($notification) {
            $data = $notification->data;
            return [
                'id' => $notification->id,
                'title' => $data['title'] ?? 'New Notification',
                'message' => $data['message'] ?? '',
                'type' => $data['type'] ?? 'info',
                'adjustment_id' => $data['adjustment_id'] ?? null,
                'adjustment_number' => $data['adjustment_number'] ?? null,
                'pr_number' => $data['pr_number'] ?? null,
                'total_amount' => $data['total_amount'] ?? null,
                'url' => $data['url'] ?? null,
                'data' => $data,
                'read' => $notification->read_at !== null,
                'read_at' => $notification->read_at,
                'created_at' => $notification->created_at,
                'time' => $notification->created_at->diffForHumans(),
            ];
        });

        return response()->json([
            'current_page' => $notifications->currentPage(),
            'data' => $transformed,
            'first_page_url' => $notifications->url(1),
            'from' => $notifications->firstItem(),
            'last_page' => $notifications->lastPage(),
            'last_page_url' => $notifications->url($notifications->lastPage()),
            'next_page_url' => $notifications->nextPageUrl(),
            'path' => $notifications->path(),
            'per_page' => $notifications->perPage(),
            'prev_page_url' => $notifications->previousPageUrl(),
            'to' => $notifications->lastItem(),
            'total' => $notifications->total(),
        ]);
    })->name('notifications.api');

    // ==========================================
    // UNREAD NOTIFICATIONS (for the dropdown)
    // ==========================================
    
    Route::get('/notifications/unread', function (Request $request) {
        $user = $request->user();
        $notifications = $user->unreadNotifications()
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($notification) {
                $data = $notification->data;
                return [
                    'id' => $notification->id,
                    'title' => $data['title'] ?? 'New Notification',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'adjustment_id' => $data['adjustment_id'] ?? null,
                    'adjustment_number' => $data['adjustment_number'] ?? null,
                    'pr_number' => $data['pr_number'] ?? null,
                    'total_amount' => $data['total_amount'] ?? null,
                    'url' => $data['url'] ?? null,
                    'created_at' => $notification->created_at,
                    'read' => $notification->read_at !== null,
                    'time' => $notification->created_at->diffForHumans(),
                ];
            });

        return response()->json($notifications);
    })->name('notifications.unread');

    // ==========================================
    // NOTIFICATION ACTIONS
    // ==========================================
    
    Route::post('/notifications/{id}/mark-as-read', function ($id, Request $request) {
        $notification = $request->user()->notifications()->find($id);
        if ($notification) {
            $notification->markAsRead();
            return response()->json(['success' => true]);
        }
        return response()->json(['error' => 'Not found'], 404);
    })->name('notifications.mark-as-read');

    Route::post('/notifications/mark-all-as-read', function (Request $request) {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['success' => true]);
    })->name('notifications.mark-all-as-read');

    Route::delete('/notifications/{id}', function ($id, Request $request) {
        $notification = $request->user()->notifications()->find($id);
        if ($notification) {
            $notification->delete();
            return response()->json(['success' => true]);
        }
        return response()->json(['error' => 'Not found'], 404);
    })->name('notifications.delete');
});