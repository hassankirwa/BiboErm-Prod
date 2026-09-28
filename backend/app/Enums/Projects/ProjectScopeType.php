<?php

namespace App\Enums\Projects;

enum ProjectScopeType: string
{
    case Floor = 'floor';
    case Room = 'room';
    case Custom = 'custom';
}
