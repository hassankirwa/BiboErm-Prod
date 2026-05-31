<?php

namespace App\Support\Warehouse;

use App\Enums\Warehouse\DeckSlug;
use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\Section;
use Illuminate\Auth\Access\AuthorizationException;

class DeckAccess
{
    public static function canViewAll(User $user): bool
    {
        return $user->can('warehouse.stock.view_all');
    }

    public static function canManageDeck(User $user, DeckSlug|string $slug): bool
    {
        if (self::canViewAll($user)) {
            return true;
        }

        $slug = $slug instanceof DeckSlug ? $slug : DeckSlug::from($slug);

        return $user->hasRole($slug->managerRole());
    }

    public static function allowedDeckSlugs(User $user): array
    {
        if (self::canViewAll($user)) {
            return array_column(DeckSlug::cases(), 'value');
        }

        $slugs = [];

        if ($user->hasRole('warehouse_manager_aluminium')) {
            $slugs[] = DeckSlug::Aluminium->value;
            $slugs[] = DeckSlug::Offcuts->value;
        }

        if ($user->hasRole('warehouse_manager_accessories')) {
            $slugs[] = DeckSlug::Accessories->value;
            $slugs[] = DeckSlug::Rubbers->value;
        }

        return array_unique($slugs);
    }

    public static function binDeckSlug(Bin $bin): ?string
    {
        return $bin->section?->deck?->slug?->value;
    }

    public static function canManageBin(User $user, Bin $bin): bool
    {
        $bin->loadMissing('section.deck');
        $slug = self::binDeckSlug($bin);

        return $slug !== null && self::canManageDeck($user, $slug);
    }

    public static function assertCanManageBin(User $user, Bin $bin): void
    {
        if (! self::canManageBin($user, $bin)) {
            throw new AuthorizationException('You do not have permission to manage stock at this location.');
        }
    }

    public static function assertCanManageDeck(User $user, Deck $deck): void
    {
        if (! self::canManageDeck($user, self::deckSlug($deck))) {
            throw new AuthorizationException('You do not have permission to manage this deck.');
        }
    }

    public static function sectionDeckSlug(Section $section): ?string
    {
        return $section->deck?->slug?->value;
    }

    public static function deckSlug(Deck $deck): string
    {
        return $deck->slug instanceof DeckSlug ? $deck->slug->value : (string) $deck->slug;
    }
}
