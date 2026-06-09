<?php

namespace App\Http\Controllers\Lookups;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class ExchangeRateLookupController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $from = strtoupper($request->string('from', 'USD')->toString());
        $to = strtoupper($request->string('to', 'KES')->toString());

        if ($from !== 'USD' || $to !== 'KES') {
            return response()->json(['message' => 'Only USD to KES conversion is supported.'], 422);
        }

        $fallback = (float) config('bibo.quotation.usd_to_kes_rate', 129.0);
        $cacheMinutes = (int) config('bibo.quotation.exchange_rate_cache_minutes', 60);
        $cacheKey = "exchange_rate.{$from}.{$to}";

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return response()->json(['data' => $cached]);
        }

        try {
            $response = Http::timeout(8)->get('https://api.frankfurter.app/latest', [
                'from' => $from,
                'to' => $to,
            ]);

            if ($response->successful()) {
                $body = $response->json();
                $rate = (float) ($body['rates'][$to] ?? 0);

                if ($rate > 0) {
                    $data = [
                        'from' => $from,
                        'to' => $to,
                        'rate' => round($rate, 4),
                        'source' => 'frankfurter',
                        'date' => $body['date'] ?? now()->toDateString(),
                        'fallback' => false,
                    ];

                    Cache::put($cacheKey, $data, now()->addMinutes($cacheMinutes));

                    return response()->json(['data' => $data]);
                }
            }
        } catch (Throwable) {
            // fall through to config fallback
        }

        $data = [
            'from' => $from,
            'to' => $to,
            'rate' => $fallback,
            'source' => 'config',
            'date' => now()->toDateString(),
            'fallback' => true,
        ];

        Cache::put($cacheKey, $data, now()->addMinutes(5));

        return response()->json(['data' => $data]);
    }
}
