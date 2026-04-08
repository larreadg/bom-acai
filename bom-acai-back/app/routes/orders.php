<?php

declare(strict_types=1);

Flight::route('GET /orders',                           function ()            { (new OrderController())->index(); });
Flight::route('POST /orders',                          function ()            { (new OrderController())->store(); });
Flight::route('PATCH /orders/@id:[0-9]+/cancel',       function (string $id)  { (new OrderController())->cancel((int) $id); });
