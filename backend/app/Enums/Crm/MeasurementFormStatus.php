<?php

namespace App\Enums\Crm;

enum MeasurementFormStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Approved = 'approved';
    case Locked = 'locked';
}
