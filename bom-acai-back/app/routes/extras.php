<?php

declare(strict_types=1);

Flight::route('GET /extras',         function () { (new ExtraController())->index(); });
Flight::route('GET /extras/@id',     function (int $id) { (new ExtraController())->show($id); });
Flight::route('POST /extras',        function () { (new ExtraController())->store(); });
Flight::route('PUT /extras/@id',     function (int $id) { (new ExtraController())->update($id); });
Flight::route('DELETE /extras/@id',  function (int $id) { (new ExtraController())->destroy($id); });
