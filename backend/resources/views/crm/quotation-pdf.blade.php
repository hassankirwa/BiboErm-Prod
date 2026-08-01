<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Quotation {{ $quotation->quotation_number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .meta { margin-bottom: 16px; }
        .totals { margin-top: 16px; text-align: right; }
    </style>
</head>
<body>
    <h1>Quotation {{ $quotation->quotation_number }}</h1>
    <div class="meta">
        <p><strong>Account:</strong> {{ $quotation->account?->name }}</p>
        <p><strong>Contact:</strong> {{ $quotation->contact?->name }}</p>
        <p><strong>Valid until:</strong> {{ $quotation->valid_until?->format('d M Y') ?? '—' }}</p>
        <p><strong>Status:</strong> {{ $quotation->status?->value ?? $quotation->status }}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            @php
                $usdPriced = $quotation->hasUsdPricing();
                $kesRate = $usdPriced ? $quotation->usdToKesRate() : 1.0;
            @endphp
            @foreach ($quotation->lines as $index => $line)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $line->description }}</td>
                    <td>{{ $line->quantity }}</td>
                    <td>{{ number_format((float) $line->unit_price * $kesRate, 2) }}</td>
                    <td>{{ number_format((float) $line->line_total * $kesRate, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <div class="totals">
        <p>Subtotal: KES {{ number_format((float) $quotation->subtotal * $kesRate, 2) }}</p>
        <p>Discount: KES {{ number_format((float) $quotation->discount_amount * $kesRate, 2) }}</p>
        <p>Tax: KES {{ number_format((float) $quotation->tax_amount * $kesRate, 2) }}</p>
        <p><strong>Total: KES {{ number_format($quotation->totalAmountKes(), 2) }}</strong></p>
    </div>
    @if ($quotation->terms_conditions)
        <p><strong>Terms &amp; conditions</strong></p>
        <p>{{ $quotation->terms_conditions }}</p>
    @endif
</body>
</html>
