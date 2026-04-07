<?php

declare(strict_types=1);

class ProductPresentationController
{
    private ProductPresentationService $service;
    private ImageService               $imageService;

    public function __construct()
    {
        $this->service      = new ProductPresentationService();
        $this->imageService = new ImageService();
    }

    public function index(): void
    {
        ApiResponse::success('OK', $this->service->getAll())->send();
    }

    public function byProduct(int $productId): void
    {
        ApiResponse::success('OK', $this->service->getByProduct($productId))->send();
    }

    public function show(int $id): void
    {
        $presentation = $this->service->getById($id);

        if ($presentation === false) {
            ApiResponse::error('Presentation not found', 404)->send();
            return;
        }

        ApiResponse::success('OK', $presentation)->send();
    }

    /**
     * POST /api/presentations — multipart/form-data
     */
    public function store(): void
    {
        $name      = trim($_POST['name']   ?? '');
        $productId = $_POST['product_id']  ?? null;
        $price     = $_POST['price']       ?? null;
        $active    = isset($_POST['active']) ? (int) $_POST['active'] : 1;

        if ($name === '') {
            ApiResponse::error('name is required', 400)->send();
            return;
        }

        if (strlen($name) > 80) {
            ApiResponse::error('name must not exceed 80 characters', 400)->send();
            return;
        }

        if ($productId === null) {
            ApiResponse::error('product_id is required', 400)->send();
            return;
        }

        $productId = (int) $productId;

        if (!$this->service->productExists($productId)) {
            ApiResponse::error('Product not found', 404)->send();
            return;
        }

        if ($price === null || !is_numeric($price) || (float) $price < 0) {
            ApiResponse::error('price must be a number >= 0', 400)->send();
            return;
        }

        if ($this->service->existsByNameAndProduct($name, $productId)) {
            ApiResponse::error('A presentation with that name already exists for this product', 409)->send();
            return;
        }

        $data = [
            'product_id' => $productId,
            'name'       => $name,
            'price'      => (float) $price,
            'image_path' => null,
            'active'     => $active,
        ];

        $id = $this->service->create($data);

        if ($id === false) {
            ApiResponse::error('Could not create presentation', 500)->send();
            return;
        }

        if (!empty($_FILES['image']['name'])) {
            $imagePath = $this->imageService->save($_FILES['image'], $id);

            if ($imagePath !== false) {
                $this->service->update($id, ['image_path' => $imagePath]);
            }
        }

        ApiResponse::success('Presentation created', $this->service->getById($id), 201)->send();
    }

    /**
     * POST /api/presentations/:id — multipart/form-data (form save in edit mode)
     */
    public function updateForm(int $id): void
    {
        $existing = $this->service->getById($id);

        if ($existing === false) {
            ApiResponse::error('Presentation not found', 404)->send();
            return;
        }

        $data = [];

        if (isset($_POST['name'])) {
            $name = trim($_POST['name']);

            if ($name === '') {
                ApiResponse::error('name is required', 400)->send();
                return;
            }

            if (strlen($name) > 80) {
                ApiResponse::error('name must not exceed 80 characters', 400)->send();
                return;
            }

            $data['name'] = $name;
        }

        if (isset($_POST['product_id'])) {
            $productId = (int) $_POST['product_id'];

            if (!$this->service->productExists($productId)) {
                ApiResponse::error('Product not found', 404)->send();
                return;
            }

            $data['product_id'] = $productId;
        }

        if (isset($_POST['price'])) {
            $price = $_POST['price'];

            if (!is_numeric($price) || (float) $price < 0) {
                ApiResponse::error('price must be a number >= 0', 400)->send();
                return;
            }

            $data['price'] = (float) $price;
        }

        if (isset($_POST['active'])) {
            $data['active'] = (int) $_POST['active'];
        }

        // Uniqueness: check name + product_id combo (excluding self)
        $checkName      = $data['name']       ?? $existing['name'];
        $checkProductId = (int) ($data['product_id'] ?? $existing['product_id']);

        if ($this->service->existsByNameAndProduct($checkName, $checkProductId, $id)) {
            ApiResponse::error('A presentation with that name already exists for this product', 409)->send();
            return;
        }

        // Image handling
        $removeImage = ($_POST['remove_image'] ?? '0') === '1';

        if (!empty($_FILES['image']['name'])) {
            if ($existing['image_path']) {
                $this->imageService->delete($existing['image_path']);
            }

            $imagePath          = $this->imageService->save($_FILES['image'], $id);
            $data['image_path'] = $imagePath !== false ? $imagePath : $existing['image_path'];

        } elseif ($removeImage) {
            if ($existing['image_path']) {
                $this->imageService->delete($existing['image_path']);
            }

            $data['image_path'] = null;
        }

        if (empty($data)) {
            ApiResponse::error('No changes applied', 400)->send();
            return;
        }

        $this->service->update($id, $data);
        ApiResponse::success('Presentation updated', $this->service->getById($id))->send();
    }

    /**
     * PUT /api/presentations/:id — JSON, restricted to toggling active only
     */
    public function update(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Presentation not found', 404)->send();
            return;
        }

        $body = Flight::request()->data->getData();

        if (!isset($body['active'])) {
            ApiResponse::error('No changes applied', 400)->send();
            return;
        }

        $ok = $this->service->update($id, ['active' => (int) $body['active']]);

        if (!$ok) {
            ApiResponse::error('No changes applied', 400)->send();
            return;
        }

        ApiResponse::success('Presentation updated', $this->service->getById($id))->send();
    }

    public function destroy(int $id): void
    {
        if ($this->service->getById($id) === false) {
            ApiResponse::error('Presentation not found', 404)->send();
            return;
        }

        $this->service->delete($id);
        ApiResponse::success('Presentation deactivated')->send();
    }
}
