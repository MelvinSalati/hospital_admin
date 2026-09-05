<?php

namespace App\Repositories\BulkStores;

use App\Models\BulkStores\Product;
use App\Repositories\Contracts\PatientRepositoryInterface;
use App\Models\BulkStores\ProductAdjustment;
use Illuminate\Support\Facades\DB;

class ProductRepository implements PatientRepositoryInterface
{
    public function findProductByBarcode(int $barcode)
    {
        return Product::all();
    }

    /**
     * Get all products with stock, expiry data, and category name as flat JSON
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProducts()
    {
        $query = "
            SELECT
                p.id AS product_id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name AS category_name,
                p.barcode,
                p.created_at,
                p.updated_at,

                /* Total current stock */
                COALESCE(SUM(sb.remaining_quantity), 0) AS total_stock,

                /* Number of active batches */
                COUNT(sb.id) AS active_batches,

                /* Earliest expiry among batches with stock */
                MIN(
                    CASE
                        WHEN sb.remaining_quantity > 0
                        THEN sb.expiry_date
                    END
                ) AS nearest_expiry,

                /* Days remaining to nearest expiry */
                DATEDIFF(
                    MIN(
                        CASE
                            WHEN sb.remaining_quantity > 0
                            THEN sb.expiry_date
                        END
                    ),
                    CURDATE()
                ) AS days_remaining,

                /* Stock status */
                CASE
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) = 0
                        THEN 'OUT_OF_STOCK'

                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 10
                        THEN 'LOW_STOCK'

                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 50
                        THEN 'WARNING'

                    ELSE 'NORMAL'
                END AS stock_status,

                /* Expiry status */
                CASE
                    WHEN MIN(
                        CASE
                            WHEN sb.remaining_quantity > 0
                            THEN sb.expiry_date
                        END
                    ) IS NULL
                        THEN 'NO_STOCK'

                    WHEN MIN(
                        CASE
                            WHEN sb.remaining_quantity > 0
                            THEN sb.expiry_date
                        END
                    ) < CURDATE()
                        THEN 'EXPIRED'

                    WHEN DATEDIFF(
                        MIN(
                            CASE
                                WHEN sb.remaining_quantity > 0
                                THEN sb.expiry_date
                            END
                        ),
                        CURDATE()
                    ) < 30
                        THEN 'CRITICAL'

                    WHEN DATEDIFF(
                        MIN(
                            CASE
                                WHEN sb.remaining_quantity > 0
                                THEN sb.expiry_date
                            END
                        ),
                        CURDATE()
                    ) < 90
                        THEN 'WARNING'

                    WHEN DATEDIFF(
                        MIN(
                            CASE
                                WHEN sb.remaining_quantity > 0
                                THEN sb.expiry_date
                            END
                        ),
                        CURDATE()
                    ) < 180
                        THEN 'UPCOMING'

                    ELSE 'NORMAL'
                END AS expiry_status

            FROM products p

            LEFT JOIN categories c
                ON c.id = p.category_id
             

            LEFT JOIN stock_batches sb
                ON sb.product_id = p.id
                AND sb.remaining_quantity > 0
                AND sb.deleted_at IS NULL

           

            GROUP BY
                p.id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name,
                p.barcode,
                p.created_at,
                p.updated_at

            ORDER BY
                CASE
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) = 0
                        THEN 1
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 10
                        THEN 2
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 50
                        THEN 3
                    ELSE 4
                END,
                nearest_expiry ASC,
                p.product_name ASC
        ";

        return DB::select($query);
    }  

public function getProductAdjustment(?string $product = null)
{
    $query = "
        SELECT
            p.id AS product_id,
            p.product_uuid,
            p.product_code,
            p.product_name,
            p.generic_name,
            p.description,
            p.strength,
            p.form,
            p.unit,
            p.category_id,
            c.name AS category_name,
            p.barcode,
            p.created_at,
            p.updated_at,

            /* Current stock */
            SUM(sb.remaining_quantity) AS total_stock,

            /* Active batches with stock */
            COUNT(sb.id) AS active_batches,

            /* Earliest expiry */
            MIN(sb.expiry_date) AS nearest_expiry,

            /* Days to nearest expiry */
            DATEDIFF(
                MIN(sb.expiry_date),
                CURDATE()
            ) AS days_remaining,

            /* Stock status */
            CASE
                WHEN SUM(sb.remaining_quantity) <= 10
                    THEN 'LOW_STOCK'

                WHEN SUM(sb.remaining_quantity) <= 50
                    THEN 'WARNING'

                ELSE 'NORMAL'
            END AS stock_status,

            /* Expiry status */
            CASE
                WHEN MIN(sb.expiry_date) IS NULL
                    THEN 'NO_EXPIRY'

                WHEN MIN(sb.expiry_date) < CURDATE()
                    THEN 'EXPIRED'

                WHEN DATEDIFF(
                    MIN(sb.expiry_date),
                    CURDATE()
                ) < 30
                    THEN 'CRITICAL'

                WHEN DATEDIFF(
                    MIN(sb.expiry_date),
                    CURDATE()
                ) < 90
                    THEN 'WARNING'

                WHEN DATEDIFF(
                    MIN(sb.expiry_date),
                    CURDATE()
                ) < 180
                    THEN 'UPCOMING'

                ELSE 'NORMAL'
            END AS expiry_status

        FROM products p

        INNER JOIN stock_batches sb
            ON sb.product_id = p.id
            AND sb.remaining_quantity > 0
            AND sb.deleted_at IS NULL

        LEFT JOIN categories c
            ON c.id = p.category_id
    ";

    $bindings = [];

    /*
     * Search only when a search term is supplied.
     */
    if (!empty($product)) {

        $search = '%' . trim($product) . '%';

        $query .= "
            WHERE
                p.product_name LIKE ?
                OR p.generic_name LIKE ?
                OR p.barcode LIKE ?
                OR p.product_code LIKE ?
        ";

        $bindings = [
            $search,
            $search,
            $search,
            $search,
        ];
    }

    $query .= "
        GROUP BY
            p.id,
            p.product_uuid,
            p.product_code,
            p.product_name,
            p.generic_name,
            p.description,
            p.strength,
            p.form,
            p.unit,
            p.category_id,
            c.name,
            p.barcode,
            p.created_at,
            p.updated_at

        ORDER BY
            CASE
                WHEN SUM(sb.remaining_quantity) <= 10
                    THEN 1

                WHEN SUM(sb.remaining_quantity) <= 50
                    THEN 2

                ELSE 3
            END,

            nearest_expiry ASC,
            p.product_name ASC
    ";

    return DB::select($query, $bindings);
}  

public function addPrice(array $serviceDetails){
    $service        =   array_merge($serviceDetails, [
        'service_category'  => 'drugs',
        'department_id' => 1,
        'service_name'  => 'drugs',
        'description'  => 'Pharmaceutical and non-pharmaceutical products',
        'service_code'  => 'DRG000126',
        'service_uuid'  => \Illuminate\Support\Str::uuid(),
        ''
    ]);
    return \App\Models\Services\Service::create($service);
}

public function getProductsWithStock(?string $product = null)
{
    $query = "
        SELECT
            p.id AS product_id,
            p.product_uuid,
            p.product_code,
            p.product_name,
            p.generic_name,
            p.description,
            p.strength,
            p.form,
            p.unit,
            p.category_id,
            c.name AS category_name,
            p.barcode,
            p.created_at,
            p.updated_at,

            /* Current stock */
            SUM(sb.remaining_quantity) AS total_stock,

            /* Active batches with stock */
            COUNT(sb.id) AS active_batches,

            /* Earliest expiry */
            MIN(sb.expiry_date) AS nearest_expiry,

            /* Days to nearest expiry */
            DATEDIFF(
                MIN(sb.expiry_date),
                CURDATE()
            ) AS days_remaining,

            /* Stock status */
            CASE
                WHEN SUM(sb.remaining_quantity) <= 10
                    THEN 'LOW_STOCK'

                WHEN SUM(sb.remaining_quantity) <= 50
                    THEN 'WARNING'

                ELSE 'NORMAL'
            END AS stock_status,

            /* Expiry status */
            CASE
                WHEN MIN(sb.expiry_date) IS NULL
                    THEN 'NO_EXPIRY'

                WHEN MIN(sb.expiry_date) < CURDATE()
                    THEN 'EXPIRED'

                WHEN DATEDIFF(
                    MIN(sb.expiry_date),
                    CURDATE()
                ) < 30
                    THEN 'CRITICAL'

                WHEN DATEDIFF(
                    MIN(sb.expiry_date),
                    CURDATE()
                ) < 90
                    THEN 'WARNING'

                WHEN DATEDIFF(
                    MIN(sb.expiry_date),
                    CURDATE()
                ) < 180
                    THEN 'UPCOMING'

                ELSE 'NORMAL'
            END AS expiry_status

        FROM products p

        INNER JOIN stock_batches sb
            ON sb.product_id = p.id
            AND sb.remaining_quantity > 0
            AND sb.deleted_at IS NULL

        LEFT JOIN categories c
            ON c.id = p.category_id
    ";

    $bindings = [];

    /*
     * Search only when a search term is supplied.
     */
    if (!empty($product)) {

        $search = '%' . trim($product) . '%';

        $query .= "
            WHERE
                p.product_name LIKE ?
                OR p.generic_name LIKE ?
                OR p.barcode LIKE ?
                OR p.product_code LIKE ?
        ";

        $bindings = [
            $search,
            $search,
            $search,
            $search,
        ];
    }

    $query .= "
        GROUP BY
            p.id,
            p.product_uuid,
            p.product_code,
            p.product_name,
            p.generic_name,
            p.description,
            p.strength,
            p.form,
            p.unit,
            p.category_id,
            c.name,
            p.barcode,
            p.created_at,
            p.updated_at

        ORDER BY
            CASE
                WHEN SUM(sb.remaining_quantity) <= 10
                    THEN 1

                WHEN SUM(sb.remaining_quantity) <= 50
                    THEN 2

                ELSE 3
            END,

            nearest_expiry ASC,
            p.product_name ASC
    ";

    return DB::select($query, $bindings);
}


    public function getAdjustedStock(){
       return ProductAdjustment::with(['product'])->get();
    }

    public function create(array $productDetails){
        return Product::create($productDetails);
    }

    /**
     * Get products with pagination as flat JSON
     */
    public function getProductsPaginated($perPage = 15)
    {
        $query = "
            SELECT
                p.id AS product_id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name AS category_name,
                p.barcode,
                p.created_at,
                p.updated_at,
                COALESCE(SUM(sb.remaining_quantity), 0) AS total_stock,
                COUNT(sb.id) AS active_batches,
                MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) AS nearest_expiry,
                DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) AS days_remaining,
                CASE
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) = 0 THEN 'OUT_OF_STOCK'
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 10 THEN 'LOW_STOCK'
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 50 THEN 'WARNING'
                    ELSE 'NORMAL'
                END AS stock_status,
                CASE
                    WHEN MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) IS NULL THEN 'NO_STOCK'
                    WHEN MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) < CURDATE() THEN 'EXPIRED'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 30 THEN 'CRITICAL'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 90 THEN 'WARNING'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 180 THEN 'UPCOMING'
                    ELSE 'NORMAL'
                END AS expiry_status
            FROM products p
            LEFT JOIN categories c
                ON c.id = p.category_id
                AND c.deleted_at IS NULL
            LEFT JOIN stock_batches sb
                ON sb.product_id = p.id
                AND sb.remaining_quantity > 0
               
            WHERE p.deleted_at IS NULL
            GROUP BY
                p.id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name,
                p.barcode,
                p.created_at,
                p.updated_at
            ORDER BY
                CASE
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) = 0 THEN 1
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 10 THEN 2
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 50 THEN 3
                    ELSE 4
                END,
                nearest_expiry ASC,
                p.product_name ASC
            LIMIT ? OFFSET ?
        ";

        // Get total count for pagination
        $countQuery = "
            SELECT COUNT(DISTINCT p.id) as total
            FROM products p
          
        ";

        $total = DB::select($countQuery)[0]->total;
        $offset = ($perPage - 1) * $perPage;

        $data = DB::select($query, [$perPage, $offset]);

        return $data;
    }

    /**
     * Get a single product by ID with category name as flat JSON
     */
    public function getProductById($id)
    {
        $query = "
            SELECT
                p.id AS product_id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name AS category_name,
                p.barcode,
                p.created_at,
                p.updated_at,
                COALESCE(SUM(sb.remaining_quantity), 0) AS total_stock,
                COUNT(sb.id) AS active_batches,
                MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) AS nearest_expiry,
                DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) AS days_remaining,
                CASE
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) = 0 THEN 'OUT_OF_STOCK'
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 10 THEN 'LOW_STOCK'
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 50 THEN 'WARNING'
                    ELSE 'NORMAL'
                END AS stock_status,
                CASE
                    WHEN MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) IS NULL THEN 'NO_STOCK'
                    WHEN MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) < CURDATE() THEN 'EXPIRED'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 30 THEN 'CRITICAL'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 90 THEN 'WARNING'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 180 THEN 'UPCOMING'
                    ELSE 'NORMAL'
                END AS expiry_status
            FROM products p
            LEFT JOIN categories c
                ON c.id = p.category_id
                AND c.deleted_at IS NULL
            LEFT JOIN stock_batches sb
                ON sb.product_id = p.id
                AND sb.remaining_quantity > 0
                AND sb.deleted_at IS NULL
            WHERE p.deleted_at IS NULL
                AND p.id = ?
            GROUP BY
                p.id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name,
                p.barcode,
                p.created_at,
                p.updated_at
        ";

        $result = DB::select($query, [$id]);

        if (empty($result)) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        return response()->json($result[0]);
    }

    /**
     * Get products filtered by category with category name
     */
    public function getProductsByCategory($categoryId)
    {
        $query = "
            SELECT
                p.id AS product_id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name AS category_name,
                p.barcode,
                p.created_at,
                p.updated_at,
                COALESCE(SUM(sb.remaining_quantity), 0) AS total_stock,
                COUNT(sb.id) AS active_batches,
                MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) AS nearest_expiry,
                DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) AS days_remaining,
                CASE
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) = 0 THEN 'OUT_OF_STOCK'
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 10 THEN 'LOW_STOCK'
                    WHEN COALESCE(SUM(sb.remaining_quantity), 0) <= 50 THEN 'WARNING'
                    ELSE 'NORMAL'
                END AS stock_status,
                CASE
                    WHEN MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) IS NULL THEN 'NO_STOCK'
                    WHEN MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END) < CURDATE() THEN 'EXPIRED'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 30 THEN 'CRITICAL'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 90 THEN 'WARNING'
                    WHEN DATEDIFF(MIN(CASE WHEN sb.remaining_quantity > 0 THEN sb.expiry_date END), CURDATE()) < 180 THEN 'UPCOMING'
                    ELSE 'NORMAL'
                END AS expiry_status
            FROM products p
            LEFT JOIN categories c
                ON c.id = p.category_id
                AND c.deleted_at IS NULL
            LEFT JOIN stock_batches sb
                ON sb.product_id = p.id
                AND sb.remaining_quantity > 0
                AND sb.deleted_at IS NULL
            WHERE p.deleted_at IS NULL
                AND p.category_id = ?
            GROUP BY
                p.id,
                p.product_uuid,
                p.product_code,
                p.product_name,
                p.description,
                p.strength,
                p.form,
                p.unit,
                p.category_id,
                c.name,
                p.barcode,
                p.created_at,
                p.updated_at
            ORDER BY p.product_name ASC
        ";

        return response()->json(DB::select($query, [$categoryId]));
    }

    /**
     * Get all categories for dropdown
     */
    public function getCategories()
    {
        $query = "
            SELECT
                id,
                name,
                description,
                is_active
            FROM categories
            WHERE deleted_at IS NULL
                AND is_active = 1
            ORDER BY name ASC
        ";

        return response()->json(DB::select($query));
    }
}
