<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .muted { color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .totals td { font-weight: bold; }
    </style>
</head>
<body>
    <h1>BIBO Windows &amp; Doors</h1>
    <p class="muted">Payslip for {{ sprintf('%02d/%d', $run->period_month, $run->period_year) }}</p>

    <p><strong>{{ $employee->name }}</strong><br>
        {{ $employee->email }}<br>
        @if($profile?->employee_number) Employee #: {{ $profile->employee_number }} @endif
        @if($profile?->job_title)<br>{{ $profile->job_title }}@endif
    </p>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Amount (KES)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Gross salary</td>
                <td>{{ number_format((float) $entry->gross_salary, 2) }}</td>
            </tr>
            @php
                $lines = is_array($entry->line_items) ? $entry->line_items : [];
            @endphp
            @forelse($lines as $line)
                @if(($line['kind'] ?? '') === 'addition')
                    <tr>
                        <td>{{ $line['name'] ?? 'Addition' }}</td>
                        <td>{{ number_format((float) ($line['amount'] ?? 0), 2) }}</td>
                    </tr>
                @endif
            @empty
            @endforelse
            @forelse($lines as $line)
                @if(($line['kind'] ?? '') === 'deduction')
                    <tr>
                        <td>{{ $line['name'] ?? 'Deduction' }}</td>
                        <td>-{{ number_format((float) ($line['amount'] ?? 0), 2) }}</td>
                    </tr>
                @endif
            @empty
                @if((float) $entry->shif > 0)
                <tr>
                    <td>SHIF</td>
                    <td>-{{ number_format((float) $entry->shif, 2) }}</td>
                </tr>
                @endif
                <tr>
                    <td>NSSF</td>
                    <td>-{{ number_format((float) $entry->nssf, 2) }}</td>
                </tr>
                <tr>
                    <td>PAYE</td>
                    <td>-{{ number_format((float) $entry->paye, 2) }}</td>
                </tr>
                @if((float) $entry->other_deductions > 0)
                <tr>
                    <td>Other deductions</td>
                    <td>-{{ number_format((float) $entry->other_deductions, 2) }}</td>
                </tr>
                @endif
            @endforelse
            <tr class="totals">
                <td>Net pay</td>
                <td>{{ number_format((float) $entry->net_pay, 2) }}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
