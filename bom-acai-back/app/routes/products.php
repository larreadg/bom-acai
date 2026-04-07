<?php

declare(strict_types=1);

Flight::route('GET /products',        function () { (new ProductController())->index(); });
Flight::route('GET /products/@id',    function (int $id) { (new ProductController())->show($id); });
Flight::route('POST /products',       function () { (new ProductController())->store(); });
Flight::route('PUT /products/@id',    function (int $id) { (new ProductController())->update($id); });
Flight::route('DELETE /products/@id', function (int $id) { (new ProductController())->destroy($id); });
