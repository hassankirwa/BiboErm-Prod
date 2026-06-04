<?php

namespace App\Enums\FieldInstallation;

enum NonConformityStatus: string
{
    case Open = 'open';
    case Acknowledged = 'acknowledged';
    case Resolved = 'resolved';
    case Waived = 'waived';
}
