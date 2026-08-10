# HUETS

HUETS là ứng dụng hỗ trợ khám phá địa điểm và xây dựng lịch trình du lịch tại Huế. Dự án gồm:

- `FE`: giao diện React, Vite và Ant Design.
- `BE`: REST API Express, TypeScript và MongoDB.
- `docs`: tài liệu bổ sung của dự án.

## Yêu cầu hệ thống

Trước khi cài đặt, cần có:

- [Node.js](https://nodejs.org/) 22 trở lên (khuyến nghị dùng bản LTS).
- npm (được cài cùng Node.js).
- [MongoDB](https://www.mongodb.com/docs/manual/installation/) chạy trên máy, hoặc một MongoDB connection string từ MongoDB Atlas.
- Tài khoản [Cloudinary](https://cloudinary.com/) nếu cần sử dụng chức năng tải ảnh lên.

Kiểm tra phiên bản đã cài:

```bash
node --version
npm --version
```

## Cài đặt

### 1. Tải mã nguồn

```bash
git clone https://github.com/Nh4n1/HUETS.git
cd HUETS
```

### 2. Cài dependencies

Cài riêng dependencies cho backend và frontend:

```bash
cd BE
npm install
cd ../FE
npm install
cd ..
```

Có thể dùng `npm ci` thay cho `npm install` để cài chính xác theo `package-lock.json`.

### 3. Cấu hình backend

Tạo file `BE/.env` từ file mẫu:

```bash
cd BE
cp .env.example .env
```

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Cập nhật `BE/.env`:

```dotenv
PORT=3000
NODE_ENV=development
DEV_MONGO_URI=mongodb://localhost:27017/huetrip

CLIENT_ORIGIN=http://localhost:5173

CLOUDINARY_CLOUD_NAME=change_me
CLOUDINARY_API_KEY=change_me
CLOUDINARY_API_SECRET=change_me
CLOUDINARY_UPLOAD_FOLDER=location-images

JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
LOCATION_ASSET_TOKEN_SECRET=replace_with_a_long_random_secret
```

Lưu ý:

- Thay các giá trị `change_me` và secret trước khi sử dụng.
- Có thể bỏ qua thông tin Cloudinary khi chỉ chạy các chức năng không tải ảnh. Endpoint upload ảnh sẽ báo lỗi nếu thiếu cấu hình này.
- Nếu dùng MongoDB Atlas, thay `DEV_MONGO_URI` bằng connection string của cluster.
- `CLIENT_ORIGIN` hỗ trợ nhiều origin, phân tách bằng dấu phẩy.

### 4. Cấu hình frontend

Tạo file `FE/.env` từ file mẫu:

```bash
cd ../FE
cp .env.example .env
```

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Nội dung mặc định:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

## Chạy dự án

Đảm bảo MongoDB đang hoạt động, sau đó mở hai terminal.

Terminal 1 — backend:

```bash
cd BE
npm run dev
```

Backend mặc định chạy tại `http://localhost:3000`.

Terminal 2 — frontend:

```bash
cd FE
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, mặc định là `http://localhost:5173`.

## Các lệnh hữu ích

### Backend

Chạy test:

```bash
cd BE
npm test
```

Build và chạy bản production:

```bash
npm run build
npm start
```

### Frontend

```bash
cd FE
npm test
npm run lint
npm run build
npm run preview
```

## Cấu trúc thư mục

```text
HUETS/
├── BE/             # Express API, models, services và tests
├── FE/             # React UI, pages, components và API clients
├── docs/           # Tài liệu dự án
└── README.md
```

## Xử lý lỗi thường gặp

- **Không kết nối được MongoDB:** kiểm tra MongoDB service và giá trị `DEV_MONGO_URI`.
- **Frontend không gọi được API:** kiểm tra backend đang chạy, `VITE_API_BASE_URL` và `CLIENT_ORIGIN`.
- **Lỗi CORS:** thêm đúng origin của frontend vào `CLIENT_ORIGIN`, không thêm đường dẫn phía sau origin.
- **Không upload được ảnh:** kiểm tra ba biến `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET`.
- **Port đã được sử dụng:** đổi `PORT` của backend; nếu đổi port, cập nhật cả `VITE_API_BASE_URL`.

## Bảo mật

Không commit file `.env`, JWT secret, MongoDB connection string có mật khẩu hoặc thông tin xác thực Cloudinary lên Git.
