<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Models\Notification;

Route::prefix('v1/')->group(function () {
    // Get notifications for a specific user
    Route::get('notifications/{notifiableId}', function ($notifiableId) {
        $notifications = Notification::where('notifiable_id', $notifiableId)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $notifications->map(function ($notification) {
                $data = $notification->data;
                return [
                    'id' => $notification->id,
                    'title' => $data['title'] ?? 'Notification',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'read' => $notification->read_at !== null,
                    'read_at' => $notification->read_at,
                    'created_at' => $notification->created_at,
                    'time' => $notification->created_at->diffForHumans(),
                    'url' => $data['url'] ?? null,
                    'data' => $data,
                    'notifiable_type' => $notification->notifiable_type,
                    'notifiable_id' => $notification->notifiable_id,
                ];
            }),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'last_page' => $notifications->lastPage(),
            ],
        ]);
    })->name('api.notifications.index');

    // Get unread notifications for a specific user
    Route::get('notifications/{notifiableId}/unread', function ($notifiableId) {
        $notifications = Notification::where('notifiable_id', $notifiableId)
            ->whereNull('read_at')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $notifications->map(function ($notification) {
                $data = $notification->data;
                return [
                    'id' => $notification->id,
                    'title' => $data['title'] ?? 'New Notification',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'read' => false,
                    'read_at' => null,
                    'created_at' => $notification->created_at,
                    'time' => $notification->created_at->diffForHumans(),
                    'url' => $data['url'] ?? null,
                    'data' => $data,
                ];
            }),
            'unread_count' => Notification::where('notifiable_id', $notifiableId)
                ->whereNull('read_at')
                ->count(),
        ]);
    })->name('api.notifications.unread');

    // Mark notification as read
    Route::post('notifications/{id}/mark-as-read', function ($id, Request $request) {
        $notification = Notification::find($id);
        
        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found',
            ], 404);
        }

        // Verify the user owns this notification
        if ($notification->notifiable_id != $request->user()?->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
        ]);
    });

    // Mark all notifications as read for a user
    Route::post('notifications/{notifiableId}/mark-all-as-read', function ($notifiableId, Request $request) {
        Notification::where('notifiable_id', $notifiableId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
            'updated_count' => Notification::where('notifiable_id', $notifiableId)
                ->whereNotNull('read_at')
                ->count(),
        ]);
    })->name('api.notifications.mark-all-as-read');

    // Delete a notification
    Route::delete('notifications/{id}', function ($id, Request $request) {
        $notification = Notification::find($id);
        
        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found',
            ], 404);
        }

        // Verify the user owns this notification
        if ($notification->notifiable_id != $request->user()?->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted',
        ]);
    })->name('api.notifications.delete');

    // Get notification count for a user
    Route::get('notifications/{notifiableId}/count', function ($notifiableId) {
        $unreadCount = Notification::where('notifiable_id', $notifiableId)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $unreadCount,
                'total_count' => Notification::where('notifiable_id', $notifiableId)->count(),
            ],
        ]);
    })->name('api.notifications.count');
});