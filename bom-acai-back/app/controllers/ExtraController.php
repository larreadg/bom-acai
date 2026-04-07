<?php

declare(strict_types=1);

class ExtraController
{
    private ExtraService $service;

    public function __construct()
    {
        $this->service = new ExtraService();
    }

    public function index(): void
    {
        ApiResponse::success('OK', $this->service->getAll())->send();
    }

    public function show(int $id): void
    {
        $extra = $this->service->getById($id);

        if ($extra === false) {
            ApiResponse::error('Extra not found', 404)->send();
            return;
        }

        ApiResponse::success('OK', $extra)->send();
    }

    public function store(): void
    {
        $body  = Flight::request()->data->getData();
        $name  = trim($body['name']  ?? '');
        $price = $body['price']      ?? null;

        if ($name === '') {
            ApiResponse::error('name is required', 400)->send();
            return;
        }

        if (strlen($name) > 80) {
            ApiResponse::error('name must not exceed 80 characters', 400)->send();
            return;
        }

        if ($price === null || !is_numeric($price) || (float) $price < 0) {
            ApiResponse::error('price must be a number >= 0', 400)->send();
            return;
        }

        if ($this->service->existsByName($name)) {
            ApiResponse::error('Extra name already exists', 409)->send();
            return;
        }

        $body['name']  = $name;
        $body['price'] = (float) $price;

        $id = $this->service->create($body);

        if ($id === false) {
            ApiResponse::error('Could not create extra', 500)->send();
            return;
        }

        ApiResponse::success('Extra created', $this->service->getById($id), 201)->send();
    }

    public function update(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Extra not found', 404)->send();
            return;
        }

        $body = Flight::request()->data->getData();

        if (array_key_exists('name', $body)) {
            $name = trim((string) $body['name']);

            if ($name === '') {
                ApiResponse::error('name is required', 400)->send();
                return;
            }

            if (strlen($name) > 80) {
                ApiResponse::error('name must not exceed 80 characters', 400)->send();
                return;
            }

            if ($this->service->existsByName($name, $id)) {
                ApiResponse::error('Extra name already exists', 409)->send();
                return;
            }

            $body['name'] = $name;
        }

        if (array_key_exists('price', $body)) {
            $price = $body['price'];

            if (!is_numeric($price) || (float) $price < 0) {
                ApiResponse::error('price must be a number >= 0', 400)->send();
                return;
            }

            $body['price'] = (float) $price;
        }

        $ok = $this->service->update($id, $body);

        if (!$ok) {
            ApiResponse::error('No changes applied', 400)->send();
            return;
        }

        ApiResponse::success('Extra updated', $this->service->getById($id))->send();
    }

    public function destroy(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Extra not found', 404)->send();
            return;
        }

        $this->service->delete($id);
        ApiResponse::success('Extra deactivated')->send();
    }
}
