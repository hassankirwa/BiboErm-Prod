<?php

$path = realpath(__DIR__ . '/../docs/BEATRICE20260423.xlsx');
if (!$path) {
    echo "xlsx not found\n";
    exit(1);
}

$zip = new ZipArchive();
$zip->open($path);
echo "Media files in BEATRICE20260423.xlsx:\n";
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if (str_contains($name, 'media/') || str_contains($name, 'drawing')) {
        echo "  $name\n";
    }
}
$zip->close();

require __DIR__ . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$reader = IOFactory::createReaderForFile($path);
$reader->setReadDataOnly(false);
$spreadsheet = $reader->load($path);

echo "\nSheets and drawing counts:\n";
foreach ($spreadsheet->getAllSheets() as $sheet) {
    $drawings = $sheet->getDrawingCollection();
    echo "  {$sheet->getTitle()}: " . count($drawings) . " drawing(s)\n";
}
