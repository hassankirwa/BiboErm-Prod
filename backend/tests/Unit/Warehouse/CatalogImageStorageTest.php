<?php

namespace Tests\Unit\Warehouse;

use App\Services\Warehouse\MasterData\CatalogImageStorage;
use App\Support\BiboStorage;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogImageStorageTest extends TestCase
{
    protected CatalogImageStorage $images;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(BiboStorage::diskName());
        $this->images = app(CatalogImageStorage::class);
    }

    public function test_extract_images_write_under_extract_token_folder(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
        $this->assertIsString($png);

        $stored = $this->images->storeExtractBinary($png, 'image/png', 'PY08', 'token-abc-12345');

        $this->assertNotNull($stored);
        $this->assertTrue($this->images->isExtractPath($stored['path']));
        $this->assertStringContainsString('/extract-token-abc-12345/', $stored['path']);
        Storage::disk(BiboStorage::diskName())->assertExists($stored['path']);
    }

    public function test_promote_moves_extract_image_to_tier_folder_and_cleanup_removes_temp(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
        $token = 'promote-token-99';
        $stored = $this->images->storeExtractBinary($png, 'image/png', 'PY08', $token);
        $this->assertNotNull($stored);

        $promoted = $this->images->promoteExtractPath($stored['path'], 'PY08', 'premium');
        $this->assertNotNull($promoted);
        $this->assertFalse($this->images->isExtractPath($promoted['path']));
        $this->assertStringContainsString('/premium/', $promoted['path']);
        Storage::disk(BiboStorage::diskName())->assertExists($promoted['path']);
        Storage::disk(BiboStorage::diskName())->assertMissing($stored['path']);

        $this->images->storeExtractBinary($png, 'image/png', 'OTHER', $token);
        $this->images->cleanupExtractToken($token);
        $this->assertFalse(
            Storage::disk(BiboStorage::diskName())
                ->exists('public/warehouse-catalog/extract-promote-token-99')
        );
    }

    public function test_cleanup_stale_extracts_skips_recent_folders(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
        $stored = $this->images->storeExtractBinary($png, 'image/png', 'PY08', 'fresh-token-01');
        $this->assertNotNull($stored);

        $result = $this->images->cleanupStaleExtracts(24);
        $this->assertSame(0, $result['deleted_tokens']);
        Storage::disk(BiboStorage::diskName())->assertExists($stored['path']);
    }
}
