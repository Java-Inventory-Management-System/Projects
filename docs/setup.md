# Hướng dẫn môi trường

## 1. Development — chạy local từng service

Dành cho dev muốn chạy BE trong IDE, FE bằng `npm run dev`.

### Yêu cầu

- Docker + Docker Compose
- Java 25 (cho backend)
- Node 22 (cho frontend)

### Cấu hình env

> `.env` files nằm trong `.gitignore` — không được push lên git. Khi clone repo về, phải tự tạo.

```bash
# 1. Root .env — cho Docker Compose
cp .env.example .env                    # nếu có, hoặc tự tạo với nội dung bên dưới

# 2. Backend .env — cho backend chạy local
cp backend/.env.template backend/.env

# 3. Frontend .env — cho frontend chạy local
cp frontend/.env.example frontend/.env
```

Nếu không có `.env.example` ở root, tạo file `.env` với nội dung sau (chạy được ngay cho dev):

```bash
JWT_SECRET=dev-secret-key-change-in-prod
JWT_EXPIRATION=86400000
JWT_REFRESH_EXPIRATION=86400000
JWT_COOKIE_NAME=dawn-jwt
JWT_COOKIE_REFRESH_NAME=dawn-jwt-refresh
FRONTEND_URL=http://localhost
DB_USER=root
DB_PASS=123456
DB_DRIVER=com.mysql.cj.jdbc.Driver
MAIL_ENABLED=false
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=dummy
MAIL_PASSWORD=dummy
MAIL_FROM=noreply@test.local
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPLOAD_PATH=./uploads
VITE_BASE_API_URL=/api/v1
MYSQL_DATABASE=inventory_db
```

Các biến cần lưu ý:

- **JWT_SECRET**: đặt giá trị riêng trong production, dev để mặc định
- **Mail**: mặc định `MAIL_ENABLED=false`. Nếu cần test mail, copy `backend/.env.template` và điền thông tin Mailtrap
- **Cloudinary**: bỏ trống được, upload lưu local. Có Cloudinary thì điền API key ở cả root `.env` và `backend/.env`

### Bước 1 — Khởi động MySQL

```bash
make infra
# hoặc: docker compose up mysql -d
```

MySQL chạy ở `localhost:3307`, database `inventory_db`.

### Bước 2 — Chạy backend

Mở `backend/` trong IDE, chạy `BackendApplication.java`.
Config tự động load từ `backend/.env` → kết nối MySQL ở `localhost:3307`.

API ở `http://localhost:8888/api/v1`

### Bước 3 — Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

App ở `http://localhost:5173`, gọi API qua `http://localhost:8888/api/v1`.

---

## 2. Full Docker — chạy nguyên cục

Dùng khi cần preview tích hợp hoặc không muốn cài JDK/Node local.

```bash
make dev
# hoặc: docker compose up -d
```

Truy cập `http://localhost` (qua nginx) hoặc từng service trực tiếp.

Tắt: `make clean` hoặc `docker compose down -v`.

---

## 3. CI/CD — GitHub Actions

Mỗi lần push lên `develop` / PR vào `main`, pipeline tự động chạy:

1. Build images backend + frontend
2. Start MySQL + backend
3. Chạy integration tests
4. Start frontend + nginx
5. Chạy E2E tests
6. Dọn dẹp

Xem file `.github/workflows/setup.yml`.

---

## Makefile reference

| Lệnh | Mục đích |
|------|----------|
| `make infra` | Chỉ MySQL (cho dev local) |
| `make dev` | Full stack Docker |
| `make test` | Chạy integration + E2E |
| `make clean` | Tắt hết, xoá volumes |

> Chi tiết kiến trúc nghiệp vụ xem `docs/workflow.md`.
