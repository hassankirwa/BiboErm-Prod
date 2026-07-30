<?php

namespace App\Enums\QualityControl;

enum QcInspectionResult: string
{
    case Pending = 'pending';
    case Pass = 'pass';
    case Fail = 'fail';
    case ConditionalPass = 'conditional_pass';
    case Skipped = 'skipped';
}
