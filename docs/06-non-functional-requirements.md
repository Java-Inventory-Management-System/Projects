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
| NFR-10 | Serial lookup         | Tra cứu serial hỗ trợ fuzzy match (O/0, I/l) — index trên `serial_number`                         | Could    |
| NFR-11 | Dashboard performance | Dead stock >90 ngày — background job, không realtime                                              | Could    |

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
| NFR-16 | Unit ↔ Tracking mapping | Hard-code ở Service layer; thêm UOM mới phải sửa code                                              | Should   |
| NFR-17 | API versioning          | `/api/v1` prefix qua WebConfig (base package scan)                                                 | Must     |

## 5. Compliance & Legal

| ID     | Requirement     | Mô tả                                                                              | Priority |
| ------ | --------------- | ---------------------------------------------------------------------------------- | -------- |
| NFR-18 | Audit retention | Chưa có yêu cầu — cần xác nhận với business (tối thiểu 1 năm theo luật kế toán VN) | TBD      |
| NFR-19 | Warranty policy | Kế thừa hạn BH cũ khi đổi serial — cần xác nhận đúng luật BVND VN                  | TBD      |

## 6. Operations

| ID     | Requirement    | Mô tả                                             | Priority |
| ------ | -------------- | ------------------------------------------------- | -------- |
| NFR-20 | Docker Compose | MySQL 8, Mailtrap (disabled mặc định)             | Must     |
| NFR-21 | Backup/duyệt   | Khi QL vắng mặt — chưa có luồng escalation/backup | TBD      |

## 7. Constraints

| ID   | Constraint        | Mô tả                                           |
| ---- | ----------------- | ----------------------------------------------- |
| C-01 | Backend           | Spring Boot 4 + Java 25                         |
| C-02 | Frontend          | React 19 + Vite + TypeScript + TailwindCSS v4   |
| C-03 | Database          | MySQL 8 (docker), Flyway migration              |
| C-04 | ORM               | JPA/Hibernate                                   |
| C-05 | External services | Cloudinary (ảnh), không mail server (trong dev) |
