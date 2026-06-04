<?php

namespace App\Enums\QualityControl;

enum QcChecklistItemType: string
{
    case PassFail = 'pass_fail';
    case YesNo = 'yes_no';
    case Numeric = 'numeric';
    case Text = 'text';
    case PhotoRequiredOnFail = 'photo_required_on_fail';
}
