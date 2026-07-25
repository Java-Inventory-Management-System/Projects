# Non-Functional Requirements

> Các yêu cầu phi chức năng cho hệ thống Quản lý Kho Linh Kiện Máy Tính.

## 1. Security

| ID     | Requirement               | Mô tả                                                                                                       | Priority |
| ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| NFR-01 | Authentication            | JWT-based, access + refresh token, access token hết hạn 1h                                                  | Must     |
| NFR-02 | Password policy           | Reset bắt buộc lần đầu; forgot password qua email (console khi MAIL_ENABLED=false)                          | Must     |
| NFR-03 | 4-eyes principle          | `created_by ≠ approved_by` cho mọi hành động duyệt — enfore ở Service layer                                 | Must     |
| NFR-04 | Role-based access control | 4 role: ADMIN, MANAGER, STOCK, SALES; endpoint security bằng Spring Security + method-level `@PreAuthorize` | Must     |
| NFR-05 | Không tự assign ADMIN     | ADMIN không thể gán role ADMIN cho chính mình; không thể tạo user role ADMIN                                | Must     |
| NFR-06 | Audit bất biến            | Audit log không thể bị xoá/sửa bởi bất kỳ role nào (kể cả ADMIN)                                            | Must     |
| NFR-07 | Input validation          | Validate tất cả đầu vào ở Service layer; không tin tưởng client                                             | Must     |

## 2. Performance

| ID     | Requirement           | Mô tả                                                                                             | Priority |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| NFR-08 | Transaction nghiệp vụ | Nhập/xuất kho trong 1 DB transaction; dùng `SELECT ... FOR UPDATE` để tránh race condition        | Must     |
| NFR-09 | Audit log async       | Audit log afterCommit (SUCCESS) / @Async REQUIRES_NEW (FAILED) — không ảnh hưởng main transaction | Must     |
| NFR-10 | Serial lookup         | Tra cứu serial hỗ trợ fuzzy match (O/0, I/l) — index trên `serial_number`                         | Must     |
| NFR-11 | Dashboard performance | Dead stock — ngưỡng mặc định 90 ngày, configurable qua system_settings.dead_stock_threshold_days (không hard-code) — background job, không realtime | Could    |

## 3. Availability & Reliability

| ID     | Requirement       | Mô tả                                                 | Priority |
| ------ | ----------------- | ----------------------------------------------------- | -------- |
| NFR-12 | Dữ liệu không mất | Mọi thay đổi đều được ghi audit log trước/sau giá trị | Must     |
| NFR-13 | Downtime          | Hệ thống đơn server (giai đoạn đầu), không yêu cầu HA | Won't    |

## 4. Maintainability

| ID     | Requirement             | Mô tả                                                                                              | Priority |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| NFR-14 | Feature-based structure | Backend: domain packages (auth/, catalog/); Frontend: features/<name>/{api,components,store,types} | Must     |
| NFR-15 | Domain isolation        | Entity domain không import entity domain khác; chỉ dùng FK ID                                      | Must     |
| NFR-16 | Unit ↔ Tracking mapping | Hard-code ở Service layer; thêm UOM mới phải sửa code                                              | Must     |
| NFR-17 | API versioning          | `/api/v1` prefix qua WebConfig (base package scan)                                                 | Must     |

## 5. Compliance & Legal

| ID     | Requirement     | Mô tả                                                                              | Priority |
| ------ | --------------- | ---------------------------------------------------------------------------------- | -------- |
| NFR-18 | Audit retention | Tối thiểu 2 năm. Không làm archive/purge job ở phase 1. | Must |
| NFR-19  | Warranty policy — cách làm | Kế thừa hạn BH cũ khi đổi serial — giữ nguyên `warranty_start_date` gốc, không reset (đã chốt ở SOP §6.2) | Must |
| NFR-19b | Warranty policy — pháp lý  | Giả định chấp nhận trong phạm vi đồ án. Cần review pháp lý trước go-live thật (không phải blocker cho đồ án). | TBD  |

## 6. Operations

| ID     | Requirement    | Mô tả                                             | Priority |
| ------ | -------------- | ------------------------------------------------- | -------- |
| NFR-20 | Docker Compose | MySQL 8, Mailtrap (disabled mặc định)             | Must     |
| NFR-21 | Backup/duyệt   | Khi QL vắng mặt — Admin duyệt thay | Must |

## 7. Constraints

| ID   | Constraint        | Mô tả                                           |
| ---- | ----------------- | ----------------------------------------------- |
| C-01 | Backend           | Spring Boot 4 + Java 25                         |
| C-02 | Frontend          | React 19 + Vite + TypeScript + TailwindCSS v4   |
| C-03 | Database          | MySQL 8 (docker), Flyway migration              |
| C-04 | ORM               | JPA/Hibernate                                   |
| C-05 | External services | Cloudinary (ảnh), không mail server (trong dev) |
