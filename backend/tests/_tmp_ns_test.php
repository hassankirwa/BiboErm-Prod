<?php

$sheetXml = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Material Name</t></is></c></row></sheetData></worksheet>';
$sheet = simplexml_load_string($sheetXml);
var_dump(isset($sheet->sheetData));
try {
    foreach ($sheet->sheetData->row as $row) {
        echo "direct ok\n";
    }
} catch (Throwable $e) {
    echo 'ERR direct: '.$e->getMessage()."\n";
}

foreach ($sheet->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main')->sheetData->row as $row) {
    echo "ns ok\n";
}
