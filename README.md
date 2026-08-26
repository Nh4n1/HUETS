# HueTrip

HueTrip là nền tảng web hỗ trợ **khám phá địa điểm và xây dựng lịch trình du lịch tại Thành phố Huế**.

Hệ thống tập trung thông tin địa điểm du lịch, cho phép người dùng khám phá, đóng góp và đánh giá địa điểm, xây dựng lịch trình cá nhân, lưu các nội dung quan tâm và sử dụng AI để hỗ trợ tìm kiếm cũng như lập kế hoạch chuyến đi.

## Chức năng chính

* Đăng ký, đăng nhập và quản lý tài khoản cá nhân.
* Khám phá, tìm kiếm và lọc các địa điểm tại Huế.
* Xem thông tin chi tiết và vị trí địa điểm trên bản đồ.
* Đóng góp địa điểm mới và theo dõi trạng thái kiểm duyệt.
* Đánh giá và xếp hạng địa điểm.
* Lưu địa điểm và lịch trình yêu thích.
* Tạo và quản lý lịch trình du lịch nhiều ngày.
* Tìm kiếm địa điểm bằng ngôn ngữ tự nhiên với sự hỗ trợ của AI.
* Hỗ trợ tạo lịch trình bằng AI.
* Báo cáo và kiểm duyệt nội dung.
* Hỗ trợ chủ sở hữu quản lý địa điểm.
* Quản lý voucher, nhận voucher và xác nhận sử dụng ưu đãi.
* Hệ thống thông báo cho người dùng.
* Trang quản trị dành cho Moderator và Admin.

## Công nghệ sử dụng

### Frontend

* React
* Vite
* JavaScript / JSX
* Ant Design
* React Router
* Axios
* Leaflet / React Leaflet
* Vitest

### Backend

* Node.js
* Express.js
* TypeScript
* MongoDB
* Mongoose
* Zod
* Vitest

### Dịch vụ tích hợp

* Google GenAI
* Cloudinary

## Cấu trúc project

```text
HUETS/
├── BE/             # Backend REST API
├── FE/             # Frontend React
└── README.md
```

## Yêu cầu hệ thống

* Node.js 22 trở lên
* npm
* MongoDB hoặc MongoDB Atlas

## Cài đặt và chạy project

Clone repository:

```bash
git clone https://github.com/Nh4n1/HUETS.git
cd HUETS
```

### Backend

```bash
cd BE
npm install
cp .env.example .env
npm run dev
```

Backend mặc định chạy tại:

```text
http://localhost:3000
```

### Frontend

Mở terminal khác:

```bash
cd FE
npm install
cp .env.example .env
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

> Cần cấu hình các biến môi trường trong `BE/.env` và `FE/.env` trước khi sử dụng đầy đủ các chức năng của hệ thống.

## Mục đích dự án

HueTrip được phát triển phục vụ mục đích học tập và nghiên cứu về xây dựng nền tảng web du lịch cộng đồng, kết hợp các chức năng quản lý địa điểm, lập lịch trình và ứng dụng trí tuệ nhân tạo để hỗ trợ trải nghiệm du lịch tại Huế.
