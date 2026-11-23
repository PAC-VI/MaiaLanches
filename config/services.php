<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    | Chave só no servidor. O front nunca recebe esse valor.
    | Restrinja a chave à Routes API e à Places API (New), e ao IP do servidor.
    | Os tetos ficam abaixo do free tier de 10.000 chamadas por SKU.
    */
    'google_maps' => [
        'key' => env('GOOGLE_MAPS_API_KEY'),
        'limits' => [
            'autocomplete' => (int) env('MAPS_LIMIT_AUTOCOMPLETE', 8000),
            'details' => (int) env('MAPS_LIMIT_DETAILS', 8000),
            'routes' => (int) env('MAPS_LIMIT_ROUTES', 8000),
        ],
    ],

];
