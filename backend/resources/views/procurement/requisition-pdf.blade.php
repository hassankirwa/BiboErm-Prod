<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Purchase Requisition {{ $requisition->reference }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; }
        .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }
        .brand { display: table; width: 100%; }
        .brand-left, .brand-right { display: table-cell; vertical-align: top; }
        .brand-right { text-align: right; }
        .logo { max-height: 58px; margin-bottom: 8px; }
        h1 { font-size: 20px; margin: 0 0 4px; color: #0f172a; }
        .muted { color: #6b7280; }
        .meta { width: 100%; margin-top: 14px; }
        .meta td { padding: 4px 0; vertical-align: top; }
        table.lines { width: 100%; border-collapse: collapse; margin-top: 18px; }
        .lines th, .lines td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        .lines th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; color: #374151; }
        .numeric { text-align: right; }
        .notes { margin-top: 18px; padding: 12px; background: #f8fafc; border: 1px solid #e5e7eb; }
        .signatures { width: 100%; margin-top: 28px; }
        .signatures td { width: 50%; padding-right: 18px; vertical-align: top; }
        .sign-label { font-weight: bold; margin-bottom: 34px; }
        .sign-line { border-top: 1px solid #9ca3af; padding-top: 6px; color: #6b7280; }
        .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #ecfeff; color: #155e75; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <div class="brand-left">
                @if ($logoDataUri)
                    <img src="{{ $logoDataUri }}" alt="Bibo logo" class="logo">
                @endif
                <h1>Purchase Requisition</h1>
                <div class="muted">Bibo ERP procurement document</div>
            </div>
            <div class="brand-right">
                <div><strong>{{ $requisition->reference }}</strong></div>
                <div class="muted">Created {{ $requisition->created_at?->format('d M Y H:i') ?? '—' }}</div>
                <div style="margin-top: 8px;">
                    <span class="pill">{{ str((string) ($requisition->status?->value ?? $requisition->status))->replace('_', ' ')->title() }}</span>
                </div>
            </div>
        </div>

        <table class="meta">
            <tr>
                <td><strong>Project</strong><br>{{ $requisition->project?->reference ? $requisition->project->reference.' · '.$requisition->project->name : ($requisition->project?->name ?? 'General procurement') }}</td>
                <td><strong>Requester</strong><br>{{ $requisition->requester?->name ?? 'System' }}</td>
                <td><strong>Submitted</strong><br>{{ $requisition->submitted_at?->format('d M Y H:i') ?? 'Pending submission' }}</td>
            </tr>
            <tr>
                <td><strong>Supplier</strong><br>{{ $requisition->supplier?->name ?? '—' }}</td>
                <td><strong>Required by</strong><br>{{ $requisition->required_by?->format('d M Y') ?? '—' }}</td>
                <td><strong>Approved</strong><br>{{ $requisition->approved_at?->format('d M Y H:i') ?? 'Pending approval' }}</td>
            </tr>
        </table>
    </div>

    <table class="lines">
        <thead>
            <tr>
                <th style="width: 32px;">#</th>
                <th>Material</th>
                <th>SKU / Code</th>
                <th>Source</th>
                <th class="numeric">Required</th>
                <th class="numeric">Order Qty</th>
                <th class="numeric">Overage</th>
                <th>UOM</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($requisition->lines as $index => $line)
                @php
                    $requiredQty = $line->required_quantity ?? $line->quantity;
                    $orderQty = $line->quantity;
                    $overageQty = bccomp((string) $orderQty, (string) $requiredQty, 3) === 1
                        ? bcsub((string) $orderQty, (string) $requiredQty, 3)
                        : null;
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $line->description }}</td>
                    <td>{{ $line->sku ?? $line->warehouseItem?->sku ?? '—' }}</td>
                    <td>{{ str((string) ($line->trigger_type?->value ?? $line->trigger_type))->replace('_', ' ')->title() }}</td>
                    <td class="numeric">{{ number_format((float) $requiredQty, 3) }}</td>
                    <td class="numeric">{{ number_format((float) $orderQty, 3) }}</td>
                    <td class="numeric">{{ $overageQty !== null ? number_format((float) $overageQty, 3) : '—' }}</td>
                    <td>{{ $line->unit_of_measure ?? $line->warehouseItem?->unit_of_measure ?? '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if ($requisition->notes)
        <div class="notes">
            <strong>Notes</strong><br>
            <span class="muted">{{ $requisition->notes }}</span>
        </div>
    @endif

    <table class="signatures">
        <tr>
            <td>
                <div class="sign-label">Prepared by</div>
                <div class="sign-line">{{ $requisition->requester?->name ?? 'Requester signature' }}</div>
            </td>
            <td>
                <div class="sign-label">Admin approval sign-off</div>
                <div class="sign-line">Name, signature &amp; date</div>
            </td>
        </tr>
    </table>
</body>
</html>
