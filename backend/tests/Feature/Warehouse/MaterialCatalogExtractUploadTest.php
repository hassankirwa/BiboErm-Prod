<?php

namespace Tests\Feature\Warehouse;

use Illuminate\Http\UploadedFile;

class MaterialCatalogExtractUploadTest extends WarehouseFeatureTestCase
{
    public function test_extract_returns_clear_error_when_php_rejects_the_file(): void
    {
        $file = new UploadedFile(
            __FILE__,
            'PREMIUM.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            UPLOAD_ERR_INI_SIZE,
            true,
        );

        $response = $this->actingAsSanctum($this->warehouseAluminiumManager())
            ->post('/api/v1/warehouse/master-data/material-catalog/extract', [
                'file' => $file,
                'catalog_tier' => 'premium',
            ], $this->spaApiHeaders());

        $response->assertStatus(422)
            ->assertJsonPath('error', 'upload_max_filesize_exceeded')
            ->assertJsonPath('limits.filename', 'PREMIUM.xlsx');

        $this->assertStringContainsString('upload_max_filesize', (string) $response->json('message'));
        $this->assertStringContainsString('PREMIUM.xlsx', (string) $response->json('errors.file.0'));
    }

    public function test_extract_returns_clear_413_when_post_body_exceeds_php_limit(): void
    {
        $postMaxBytes = $this->postMaxBytes();
        if ($postMaxBytes <= 0) {
            $this->markTestSkipped('PHP post_max_size is unlimited in this environment.');
        }

        $oversized = $postMaxBytes + (1024 * 1024);

        $response = $this->actingAsSanctum($this->warehouseAluminiumManager())
            ->call(
                'POST',
                '/api/v1/warehouse/master-data/material-catalog/extract',
                ['catalog_tier' => 'balustrade'],
                [],
                [],
                array_merge($this->spaApiServerHeaders(), [
                    'CONTENT_LENGTH' => (string) $oversized,
                    'CONTENT_TYPE' => 'multipart/form-data; boundary=----test',
                ]),
            );

        $response->assertStatus(413)
            ->assertJsonPath('error', 'post_too_large');
        $this->assertStringContainsString('post_max_size', (string) $response->json('message'));
        $this->assertSame($oversized, $response->json('limits.content_length_bytes'));
    }

    /**
     * @return array<string, string>
     */
    protected function spaApiServerHeaders(): array
    {
        $headers = [];
        foreach ($this->spaApiHeaders() as $name => $value) {
            $headers['HTTP_'.strtoupper(str_replace('-', '_', $name))] = $value;
        }

        return $headers;
    }

    protected function postMaxBytes(): int
    {
        $value = (string) ini_get('post_max_size');
        if ($value === '' || $value === '-1') {
            return 0;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        $metric = strtoupper(substr($value, -1));
        $number = (int) $value;

        return match ($metric) {
            'K' => $number * 1024,
            'M' => $number * 1024 * 1024,
            'G' => $number * 1024 * 1024 * 1024,
            default => $number,
        };
    }
}
