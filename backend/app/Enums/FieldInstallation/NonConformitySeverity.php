<?php

namespace App\Enums\FieldInstallation;

enum NonConformitySeverity: string
{
    case Critical = 'critical';
    case Major = 'major';
    case Minor = 'minor';
}
