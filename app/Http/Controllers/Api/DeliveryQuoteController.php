<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeliveryQuoteRequest;
use App\Services\DeliveryQuoteService;

class DeliveryQuoteController extends Controller
{
    public function store(DeliveryQuoteRequest $request, DeliveryQuoteService $quotes)
    {
        $quote = $quotes->quote(
            $request->validated('street'),
            $request->validated('number'),
            $request->validated('neighborhood'),
        );

        return response()->json([
            'distance_km' => (float) $quote['distance_km'],
            'fee_amount' => (float) $quote['fee_amount'],
        ]);
    }
}
