# Backend API implementation roadmap

This plan is based on the existing frontend calls in the root app and in frontend-expo.

## Goal
Build only what your frontend already expects under:
- Base path: `/api/v1`
- Example full URL: `http://<your-laptop-ip>:4000/api/v1/...`

---

## Phase 0 (already scaffolded)
- Config and bootstrapping
- MongoDB connection
- Health route

Done files:
- `backend/server.js`
- `backend/app.js`
- `backend/config/index.js`
- `backend/config/db.js`

---

## Phase 1: Auth and users (start here)

### 1) POST /users/register
Used by:
- root: `Screens/User/Register.js`
- replica: `frontend-expo/Screens/User/Register.js`

Auth:
- Public

Content type:
- `multipart/form-data`

Request body fields:
- `name` (string, required)
- `email` (string, required, unique)
- `password` (string, required)
- `phone` (string, required)
- `isAdmin` (boolean or string "true"/"false", optional, default false)
- `image` (file, optional)

Success response:
- Status: `200` or `201`
- Body:
```json
{
  "success": true,
  "user": {
    "id": "<userId>",
    "name": "John",
    "email": "john@example.com",
    "phone": "09123456789",
    "image": "http://.../uploads/profile.jpg",
    "isAdmin": false
  }
}
```

Error responses:
- `400` validation error
- `409` email already exists
- `500` server error

### 2) POST /users/login
Used by:
- root: `Context/Actions/Auth.actions.js`
- replica: `frontend-expo/Context/Actions/Auth.actions.js`

Auth:
- Public

Content type:
- `application/json`

Request body:
```json
{
  "email": "john@example.com",
  "password": "plain-password"
}
```

Success response:
- Status: `200`
- Body (must include token):
```json
{
  "token": "<jwt>",
  "user": {
    "userId": "<userId>",
    "email": "john@example.com",
    "isAdmin": false
  }
}
```

Notes:
- Frontend decodes JWT and stores it in AsyncStorage key `jwt`.
- JWT payload should contain at least `userId` and `isAdmin`.

Error responses:
- `401` invalid credentials
- `500` server error

### 3) GET /users/:id
Used by:
- root: `Screens/User/UserProfile.js`
- replica: `frontend-expo/Screens/User/UserProfile.js`

Auth:
- Bearer token required

Success response:
- Status: `200`
- Body:
```json
{
  "id": "<userId>",
  "name": "John",
  "email": "john@example.com",
  "phone": "09123456789",
  "image": "http://.../uploads/profile.jpg",
  "isAdmin": false
}
```

Error responses:
- `401` missing/invalid token
- `403` forbidden (optional rule)
- `404` user not found

---

## Phase 2: Catalog read endpoints

### 4) GET /products
Used by:
- root: `Screens/Product/ProductContainer.js`, `Screens/Admin/Products.js`
- replica: same files under `frontend-expo/Screens/...`

Auth:
- Public

Success response:
- Status: `200`
- Body: array of product objects

Product shape expected by frontend:
```json
{
  "id": "<productId>",
  "name": "Laptop",
  "brand": "Brand",
  "description": "...",
  "richDescription": "...",
  "image": "http://.../uploads/p1.jpg",
  "images": [],
  "price": 50000,
  "category": {
    "id": "<categoryId>",
    "name": "Electronics"
  },
  "countInStock": 5,
  "rating": 4,
  "numReviews": 2,
  "isFeatured": false,
  "dateCreated": "2026-02-21T00:00:00.000Z"
}
```

Important compatibility note:
- Some screens use `id`, others support `_id` too.
- Best practice: return both for now while integrating:
  - `id: _id`
  - `_id: <mongodb id>`

### 5) GET /categories
Used by:
- root: `Screens/Product/ProductContainer.js`, `Screens/Admin/Categories.js`, `Screens/Admin/ProductForm.js`
- replica: same files under `frontend-expo/Screens/...`

Auth:
- Public

Success response:
- Status: `200`
- Body:
```json
[
  { "id": "<categoryId>", "name": "Electronics", "color": "#00A" }
]
```

---

## Phase 3: Admin write endpoints

### 6) POST /products
Used by:
- root: `Screens/Admin/ProductForm.js`
- replica: `frontend-expo/Screens/Admin/ProductForm.js`

Auth:
- Bearer token required
- Admin role required

Content type:
- `multipart/form-data`

Request fields:
- `name`, `brand`, `price`, `description`, `category`, `countInStock`
- optional: `richDescription`, `rating`, `numReviews`, `isFeatured`
- `image` file optional/required by your rule

Success response:
- `201` created product object

### 7) PUT /products/:id
Used by:
- root: `Screens/Admin/ProductForm.js`
- replica: same file under `frontend-expo`

Auth:
- Bearer token + admin

Content type:
- `multipart/form-data`

Success response:
- `200` updated product object

### 8) DELETE /products/:id
Used by:
- root: `Screens/Admin/Products.js`
- replica: `frontend-expo/Screens/Admin/Products.js`

Auth:
- Bearer token + admin

Success response:
- `200` or `204`

### 9) POST /categories
Used by:
- root: `Screens/Admin/Categories.js`
- replica: `frontend-expo/Screens/Admin/Categories.js`

Auth:
- Bearer token + admin

Request:
```json
{ "name": "New Category" }
```

Success response:
- `201` created category

### 10) DELETE /categories/:id
Used by:
- root: `Screens/Admin/Categories.js`
- replica: `frontend-expo/Screens/Admin/Categories.js`

Auth:
- Bearer token + admin

Success response:
- `200` or `204`

---

## Phase 4: Orders flow

### 11) POST /orders
Used by:
- root: `Screens/Checkout/Confirm.js`
- replica: `frontend-expo/Screens/Checkout/Confirm.js`

Auth:
- Bearer token required

Content type:
- `application/json`

Request (frontend sends this shape):
```json
{
  "orderItems": [
    { "product": "<productId>", "quantity": 1 }
  ],
  "shippingAddress1": "...",
  "shippingAddress2": "...",
  "city": "...",
  "zip": "...",
  "country": "...",
  "phone": "...",
  "status": "3",
  "user": "<userId>"
}
```

Success response:
- `201` created order object

### 12) GET /orders
Used by:
- root: `Screens/Admin/Orders.js`
- replica: `frontend-expo/Screens/Admin/Orders.js`

Auth:
- Recommended: Bearer token + admin

Success response:
- `200` array of orders

Order object fields used by UI:
- `id` or `_id`
- `status` (`3` pending, `2` shipped, `1` delivered)
- `shippingAddress1`, `shippingAddress2`, `city`, `country`, `zip`
- `dateOrdered`
- `totalPrice`
- `orderItems`
- `user`

### 13) PUT /orders/:id
Used by:
- root: `Shared/OrderCard.js`
- replica: `frontend-expo/Shared/OrderCard.js`

Auth:
- Bearer token + admin

Purpose:
- Update order status (usually only status)

Request body:
```json
{
  "status": "2"
}
```

Success response:
- `200` updated order object

---

## Data models to prepare before coding endpoints
- User
- Product
- Category
- Order
- OrderItem (embedded or referenced)

---

## Security and middleware checklist
- JWT auth middleware
- Admin guard middleware
- Request body validation (basic first)
- Multer upload middleware for image routes
- Central error handler

---

## Suggested implementation order (actual coding)
1. User model + register + login + auth middleware
2. Get user profile endpoint
3. Category model + GET categories + POST/DELETE categories
4. Product model + GET products + POST/PUT/DELETE products
5. Order model + POST orders + GET orders + PUT order status
6. Tighten validation and role checks

---

## Done-when checklist
- Login returns JWT that frontend can decode and store
- Register works with and without image
- Home screen shows products and categories
- Admin can add/edit/delete product and categories
- Checkout can place order
- Admin can view and update order status
- All routes respond under `/api/v1`
