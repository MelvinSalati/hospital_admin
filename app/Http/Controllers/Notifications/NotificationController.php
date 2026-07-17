<?php

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;

class NotificationController extends Controller
{
    public function create(array $notification) : void {
        Notification::create($notification);
    } 

    public function getDepartmentNotifications($departmentId): mixed{
        return Notification::where('department_id', $departmentId)->get();
    } 

    public function updateStatus($notificationId):void{
        Notification::where('id', $notificationId)->update([
            'read_status' => 1
        ]);
    }
}
