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
        $price = $body['price'] ?? null;

        if ($name === '' || $price === null) {
            ApiResponse::error('name and price are required', 400)->send();
            return;
        }

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
        $ok   = $this->service->update($id, $body);

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
