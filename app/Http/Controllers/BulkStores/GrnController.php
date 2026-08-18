<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GrnController extends Controller
{
    public function index(){
        return Inertia::render('BulkStores/GoodsReceivedNote',[
            'isAuthorized'  => \App\Models\BulkStores\GoodsReceivedNote::with(['goods_recieved_item'])->get()
        ]);
    }
}
