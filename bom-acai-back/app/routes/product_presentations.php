<?php

declare(strict_types=1);

Flight::route('GET /presentations',                      function () { (new ProductPresentationController())->index(); });
Flight::route('GET /presentations/@id',                  function (int $id) { (new ProductPresentationController())->show($id); });
Flight::route('GET /products/@productId/presentations',  function (int $productId) { (new ProductPresentationController())->byProduct($productId); });
Flight::route('POST /presentations',                     function () { (new ProductPresentationController())->store(); });
Flight::route('POST /presentations/@id',                 function (int $id) { (new ProductPresentationController())->updateForm($id); });
Flight::route('PUT /presentations/@id',                  function (int $id) { (new ProductPresentationController())->update($id); });
Flight::route('DELETE /presentations/@id',               function (int $id) { (new ProductPresentationController())->destroy($id); });
