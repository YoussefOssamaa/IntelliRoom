├── backend/                     # Node.js + Express API (MVC)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── services/            # business logic helpers
│   │   ├── uploads/             # image uploads (if local)
│   │   └── server.js
│   │
│   ├── tests/                   # Jest tests
│   ├── package.json
│   ├── .env
│   └── README.md

API Notes
=========

Plugins
-------
Base path: /api/plugins

GET /
  Query:
    search: string (matches plugin_name and plugin_description)
    sort: recent | rating | downloads | price
  Response: 200 [Plugin]

GET /:id
  Response: 200 Plugin

POST /
  Body: { plugin_name, plugin_description, plugin_price, what_is_included?, plugin_reviews?, number_of_downloads? }

PUT /:id
  Body: partial Plugin fields

DELETE /:id

Notes:
- plugin_author is populated with user_name and email.
- Create/update/delete currently use a test user ID until auth is wired.

Example
-------
curl "http://localhost:5000/api/plugins?search=style&sort=rating"
