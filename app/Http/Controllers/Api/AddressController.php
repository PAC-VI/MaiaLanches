<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddressResolveRequest;
use App\Http\Requests\AddressSuggestRequest;
use App\Services\AddressLookupService;
use App\Support\MapsLog;
use Illuminate\Validation\ValidationException;

class AddressController extends Controller
{
    public function suggest(AddressSuggestRequest $request, AddressLookupService $lookup)
    {
        try {
            return response()->json($lookup->suggest(
                (string) $request->validated('q'),
                (string) $request->validated('session_token'),
            ));
        } catch (\Throwable $exception) {
            MapsLog::error(
                'Falha inesperada ao sugerir endereço.',
                0,
                'unexpected',
                $exception->getMessage(),
                '',
            );

            return response()->json([
                'enabled' => false,
                'suggestions' => [],
            ]);
        }
    }

    public function resolve(AddressResolveRequest $request, AddressLookupService $lookup)
    {
        try {
            return response()->json($lookup->resolve(
                (string) $request->validated('place_id'),
                (string) $request->validated('session_token'),
            ));
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            MapsLog::error(
                'Falha inesperada ao confirmar endereço.',
                0,
                'unexpected',
                $exception->getMessage(),
                '',
            );

            throw ValidationException::withMessages([
                'place_id' => 'A busca de endereços está indisponível. Use a opção Não encontrei meu endereço.',
            ]);
        }
    }
}
