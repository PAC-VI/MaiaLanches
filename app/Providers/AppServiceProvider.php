<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by((string) $request->ip());
        });

        RateLimiter::for('admin-login', function (Request $request) {
            $email = Str::lower(trim((string) $request->input('email')));
            $ip = (string) $request->ip();

            return [
                Limit::perMinute(5)->by($email.'|'.$ip),
                Limit::perMinute(20)->by($ip),
            ];
        });

        RateLimiter::for('public-orders', function (Request $request) {
            $ip = (string) $request->ip();

            $limits = [
                Limit::perMinute(5)->by('minute|'.$ip),
                Limit::perHour(30)->by('hour|'.$ip),
            ];

            $rawPhone = $request->input('customer_phone');

            if (is_string($rawPhone)) {
                $phone = preg_replace('/\D+/', '', $rawPhone) ?? '';

                if ($phone !== '') {
                    $limits[] = Limit::perHour(8)->by('phone|'.$phone);
                }
            }

            return $limits;
        });
    }
};
