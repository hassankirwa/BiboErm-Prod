<?php

namespace App\Enums\FieldInstallation;

enum DeliveryCondition: string
{
    case Complete = 'complete';
    case Partial = 'partial';
    case Rejected = 'rejected';
}
