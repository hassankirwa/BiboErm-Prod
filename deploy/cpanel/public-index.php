<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = '/home/biboco/bibo-erm/backend/storage/framework/maintenance.php')) {
    require $maintenance;
}

require '/home/biboco/bibo-erm/backend/vendor/autoload.php';

/** @var Application $app */
$app = require_once '/home/biboco/bibo-erm/backend/bootstrap/app.php';

$app->handleRequest(Request::capture());

