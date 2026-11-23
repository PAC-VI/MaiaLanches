<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeliveryQuoteRequest;
use App\Services\DeliveryQuoteService;
use App\Support\AddressToken;

class DeliveryQuoteController extends Controller
{
    public function store(DeliveryQuoteRequest $request, DeliveryQuoteService $quotes, AddressToken $tokens)
    {
        $addressToken = $request->validated('address_token');
        $street = is_string($addressToken) && $addressToken !== ''
            ? $tokens->open($addressToken)['street']
            : (string) $request->validated('street');

        $quote = $quotes->quote($street, (string) $request->validated('number'));

        return response()->json([
            'distance_km' => (float) $quote['distance_km'],
            'fee_amount' => (float) $quote['fee_amount'],
        ]);
    }
}
