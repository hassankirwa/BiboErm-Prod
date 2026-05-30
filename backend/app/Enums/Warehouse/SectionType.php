<?php

namespace App\Enums\Warehouse;

enum SectionType: string
{
    case ProfileFamily = 'profile_family';
    case OffcutProfile = 'offcut_profile';
    case DoorAccessories = 'door_accessories';
    case BathroomAccessories = 'bathroom_accessories';
    case GeneralAccessories = 'general_accessories';
    case RubberProfile = 'rubber_profile';
}
