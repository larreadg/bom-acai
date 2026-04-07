<?php

declare(strict_types=1);

Flight::route('GET /categories',         function () { (new CategoryController())->index(); });
Flight::route('GET /categories/@id',     function (int $id) { (new CategoryController())->show($id); });
Flight::route('POST /categories',        function () { (new CategoryController())->store(); });
Flight::route('PUT /categories/@id',     function (int $id) { (new CategoryController())->update($id); });
Flight::route('DELETE /categories/@id',  function (int $id) { (new CategoryController())->destroy($id); });
