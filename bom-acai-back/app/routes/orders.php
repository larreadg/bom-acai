<?php

declare(strict_types=1);

Flight::route('POST /orders', function () { (new OrderController())->store(); });
