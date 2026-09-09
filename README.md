# Culinary King

Culinary King is a responsive food storefront with an Express and MongoDB backend. It includes account authentication, API-backed products, a persistent cart, responsive static pages, and a lightweight test suite.

## Requirements

- Node.js 18 or newer
- MongoDB locally or a MongoDB Atlas database

## Setup

```bash
npm install
Copy-Item .env.example .env
```

Update `.env` with a MongoDB connection string and a long random `JWT_SECRET`.

Seed the product catalog:

```bash
npm run seed
```

Start the application:

```bash
npm run dev
```

Open `http://localhost:5000` in a browser. The server serves the existing HTML pages and the API from the same origin.

## Available Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with nodemon |
| `npm start` | Start the production server |
| `npm run seed` | Replace the database catalog with sample products |
| `npm run check` | Check browser and server JavaScript syntax |
| `npm test` | Run API smoke tests |

## API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart`

Authentication uses bcrypt password hashes and JWTs stored in HTTP-only cookies. Cart routes require an authenticated user. Never commit `.env` or database credentials.

## Testing

The default test suite verifies static page serving, unauthenticated cart protection, and early signup validation without requiring MongoDB. Run the full signup, product, and cart persistence flows with a configured MongoDB instance before deployment.
