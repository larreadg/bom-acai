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
        $body       = Flight::request()->data->getData();
        $name       = trim($body['name']       ?? '');
        $categoryId = $body['category_id']     ?? null;

        if ($name === '') {
            ApiResponse::error('name is required', 400)->send();
            return;
        }

        if (strlen($name) > 80) {
            ApiResponse::error('name must not exceed 80 characters', 400)->send();
            return;
        }

        if ($categoryId === null) {
            ApiResponse::error('category_id is required', 400)->send();
            return;
        }

        if (!$this->service->categoryExists((int) $categoryId)) {
            ApiResponse::error('Category not found', 404)->send();
            return;
        }

        if ($this->service->existsByName($name)) {
            ApiResponse::error('Product name already exists', 409)->send();
            return;
        }

        $body['name']        = $name;
        $body['category_id'] = (int) $categoryId;

        // Trim description if present
        if (array_key_exists('description', $body)) {
            $desc              = trim((string) ($body['description'] ?? ''));
            $body['description'] = $desc !== '' ? $desc : null;
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
                ApiResponse::error('Product name already exists', 409)->send();
                return;
            }

            $body['name'] = $name;
        }

        if (isset($body['category_id'])) {
            if (!$this->service->categoryExists((int) $body['category_id'])) {
                ApiResponse::error('Category not found', 404)->send();
                return;
            }

            $body['category_id'] = (int) $body['category_id'];
        }

        if (array_key_exists('description', $body)) {
            $desc                = trim((string) ($body['description'] ?? ''));
            $body['description'] = $desc !== '' ? $desc : null;
        }

        $ok = $this->service->update($id, $body);

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
