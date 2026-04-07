<?php

declare(strict_types=1);

class CategoryController
{
    private CategoryService $service;

    public function __construct()
    {
        $this->service = new CategoryService();
    }

    public function index(): void
    {
        $data = $this->service->getAll();
        ApiResponse::success('OK', $data)->send();
    }

    public function show(int $id): void
    {
        $category = $this->service->getById($id);

        if ($category === false) {
            ApiResponse::error('Category not found', 404)->send();
            return;
        }

        ApiResponse::success('OK', $category)->send();
    }

    public function store(): void
    {
        $body = Flight::request()->data->getData();
        $name = trim($body['name'] ?? '');

        if ($name === '') {
            ApiResponse::error('name is required', 400)->send();
            return;
        }

        if ($this->service->existsByName($name)) {
            ApiResponse::error('Category name already exists', 409)->send();
            return;
        }

        $body['name'] = $name;

        $id = $this->service->create($body);

        if ($id === false) {
            ApiResponse::error('Could not create category', 500)->send();
            return;
        }

        ApiResponse::success('Category created', $this->service->getById($id), 201)->send();
    }

    public function update(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Category not found', 404)->send();
            return;
        }

        $body = Flight::request()->data->getData();

        if (array_key_exists('name', $body)) {
            $name = trim((string) $body['name']);

            if ($name === '') {
                ApiResponse::error('name is required', 400)->send();
                return;
            }

            if ($this->service->existsByName($name, $id)) {
                ApiResponse::error('Category name already exists', 409)->send();
                return;
            }

            $body['name'] = $name;
        }

        $ok   = $this->service->update($id, $body);

        if (!$ok) {
            ApiResponse::error('No changes applied', 400)->send();
            return;
        }

        ApiResponse::success('Category updated', $this->service->getById($id))->send();
    }

    public function destroy(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Category not found', 404)->send();
            return;
        }

        $this->service->delete($id);
        ApiResponse::success('Category deactivated')->send();
    }
}
