<?php

namespace App\Enums\FieldInstallation;

enum FieldPhotoAttachableType: string
{
    case DailyLog = 'daily_log';
    case Delivery = 'delivery';
    case NonConformity = 'non_conformity';
    case UnitProgress = 'unit_progress';
    case General = 'general';
}
