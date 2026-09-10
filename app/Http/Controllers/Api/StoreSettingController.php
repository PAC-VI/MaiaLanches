<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\Request;

class StoreSettingController extends Controller
{
    public function show()
    {
        return StoreSetting::current();
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'is_open' => ['sometimes', 'boolean'],
            'delivery_time_minutes' => ['sometimes', 'integer', 'min:0'],
            'pickup_time_minutes' => ['sometimes', 'integer', 'min:0'],
        ]);

        $settings = StoreSetting::current();
        $settings->update($data);

        return $settings;
    }
}
