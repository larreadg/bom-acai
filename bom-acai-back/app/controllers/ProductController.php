<?php

declare(strict_types=1);

class ProductController
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService();
    }

    public function index(): void
    {
        ApiResponse::success('OK', $this->service->getAll())->send();
    }

    public function show(int $id): void
    {
        $product = $this->service->getById($id);

        if ($product === false) {
            ApiResponse::error('Product not found', 404)->send();
            return;
        }

        ApiResponse::success('OK', $product)->send();
    }

    public function store(): void
    {
        $body        = Flight::request()->data->getData();
        $name        = trim($body['name'] ?? '');
        $categoryId  = $body['category_id'] ?? null;

        if ($name === '' || $categoryId === null) {
            ApiResponse::error('name and category_id are required', 400)->send();
            return;
        }

        $id = $this->service->create($body);

        if ($id === false) {
            ApiResponse::error('Could not create product', 500)->send();
            return;
        }

        ApiResponse::success('Product created', $this->service->getById($id), 201)->send();
    }

    public function update(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Product not found', 404)->send();
            return;
        }

        $body = Flight::request()->data->getData();
        $ok   = $this->service->update($id, $body);

        if (!$ok) {
            ApiResponse::error('No changes applied', 400)->send();
            return;
        }

        ApiResponse::success('Product updated', $this->service->getById($id))->send();
    }

    public function destroy(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Product not found', 404)->send();
            return;
        }

        $this->service->delete($id);
        ApiResponse::success('Product deactivated')->send();
    }
}
