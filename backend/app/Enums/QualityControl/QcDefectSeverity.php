<?php

namespace App\Enums\QualityControl;

enum QcDefectSeverity: string
{
    case Critical = 'critical';
    case Major = 'major';
    case Minor = 'minor';
}
