<?php

declare(strict_types=1);

Flight::route('GET /qz/certificate', function () { (new QzController())->certificate(); });
Flight::route('POST /qz/sign', function () { (new QzController())->sign(); });
