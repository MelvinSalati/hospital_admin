<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('department.{departmentId}', function ($user, $departmentId) {
    return (int) $user->department_id === (int) $departmentId;
});

Broadcast::channel('clinician.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});
