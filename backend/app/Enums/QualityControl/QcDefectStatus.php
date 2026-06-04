<?php

namespace App\Enums\QualityControl;

enum QcDefectStatus: string
{
    case Open = 'open';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Waived = 'waived';
}
