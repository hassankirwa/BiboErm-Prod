<?php

namespace App\Enums\FieldInstallation;

enum NonConformityType: string
{
    case Shortage = 'shortage';
    case WrongItem = 'wrong_item';
    case WrongMeasurement = 'wrong_measurement';
    case DimensionMismatch = 'dimension_mismatch';
    case DamageTransit = 'damage_transit';
    case DamageSite = 'damage_site';
    case MissingHardware = 'missing_hardware';
    case IncorrectQuantity = 'incorrect_quantity';
    case DeliveryDelay = 'delivery_delay';
    case SiteNotReady = 'site_not_ready';
    case ToolFailure = 'tool_failure';
    case DocumentationError = 'documentation_error';
    case Other = 'other';
}
