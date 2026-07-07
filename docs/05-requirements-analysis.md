# Requirements Analysis Table

> Traceability matrix: từ yêu cầu → user story → domain entity/table.
>
> **Loại**: F = Functional, N = Non-functional, T = Technical constraint
> **Priority**: MoSCoW (Must / Should / Could / Won't)

## Auth & Security

| ID    | Yêu cầu                               | Loại | Nguồn      | Pri   | Actor | US    |
| ----- | ------------------------------------- | ---- | ---------- | ----- | ----- | ----- |
| RQ-01 | Đăng nhập bằng username/password      | F    | Phỏng vấn  | Must  | User  | US-30 |
| RQ-02 | Refresh token tự động                 | F    | Phỏng vấn  | Must  | HT    | US-30 |
| RQ-03 | Đổi mật khẩu                          | F    | Phỏng vấn  | Must  | User  | US-29 |
| RQ-04 | Forgot/reset password bằng token      | F    | Phỏng vấn  | Must  | User  | US-29 |
| RQ-05 | Admin tạo/khoá/mở user                | F    | Phỏng vấn  | Must  | AD    | US-28 |
| RQ-06 | Admin gán role cho user (≠ ADMIN)     | F    | Phỏng vấn  | Must  | AD    | US-28 |
| RQ-07 | Admin không tự gán ADMIN cho bản thân | N    | SAD review | Must  | AD    | US-28 |
| RQ-08 | Admin không thể tạo user role ADMIN   | N    | SAD review | Must  | AD    | US-28 |
| RQ-09 | CRUD role                             | F    | SAD review | Could | AD    | US-37 |

## Catalog

| ID    | Yêu cầu                                  | Loại | Nguồn     | Pri   | Actor    | US    |
| ----- | ---------------------------------------- | ---- | --------- | ----- | -------- | ----- |
| RQ-10 | CRUD brand/category/supplier             | F    | Phỏng vấn | Must  | AD/QL    | US-25 |
| RQ-11 | CRUD sản phẩm (kèm unit ↔ tracking_type) | F    | Phỏng vấn | Must  | AD/QL    | US-26 |
| RQ-12 | Upload ảnh sản phẩm (tối đa 5)           | F    | Phỏng vấn | Could | AD/QL    | US-27 |
| RQ-13 | CRUD vị trí kho (zone-shelf-bin)         | F    | Phỏng vấn | Must  | AD/QL    | US-35 |
| RQ-14 | CRUD khách hàng (NV: xem + thêm)         | F    | Phỏng vấn | Must  | AD/QL/NV | US-36 |

## Inventory

| ID    | Yêu cầu                                | Loại | Nguồn     | Pri    | Actor | US    |
| ----- | -------------------------------------- | ---- | --------- | ------ | ----- | ----- |
| RQ-15 | Tạo phiếu nhập (chọn NCC, ngày)        | F    | Phỏng vấn | Must   | NV    | US-01 |
| RQ-16 | Thêm dòng sản phẩm vào phiếu nhập      | F    | Phỏng vấn | Must   | NV    | US-02 |
| RQ-17 | Nhập serial (tay/Excel/barcode)        | F    | Phỏng vấn | Must   | NV    | US-03 |
| RQ-18 | Gán vị trí kho cho từng dòng/lô        | F    | Phỏng vấn | Should | NV    | US-04 |
| RQ-19 | Xác nhận phiếu nhập (1 transaction)    | F    | Phỏng vấn | Must   | NV    | US-05 |
| RQ-20 | Sửa serial sau nhập (nếu chưa xuất)    | F    | Phỏng vấn | Should | QL    | US-06 |
| RQ-21 | Hủy phiếu nhập (soft-delete, terminal) | F    | Phỏng vấn | Must   | QL    | US-07 |
| RQ-22 | Tạo phiếu xuất (chọn lý do, KH)        | F    | Phỏng vấn | Must   | NV    | US-08 |
| RQ-23 | FIFO tự động khi xuất                  | F    | Phỏng vấn | Must   | NV    | US-09 |
| RQ-24 | Báo tồn tối đa khi xuất thiếu          | F    | Phỏng vấn | Must   | NV    | US-10 |
| RQ-25 | Xác nhận phiếu xuất (kích hoạt BH)     | F    | Phỏng vấn | Must   | NV    | US-11 |
| RQ-26 | Đổi serial thay thế trước xuất         | F    | Phỏng vấn | Could  | NV    | US-12 |
| RQ-27 | Hủy phiếu xuất (reset BH nếu có)       | F    | Phỏng vấn | Must   | QL    | US-13 |
| RQ-28 | Xuất lẻ (bulk: meter/kg)               | F    | Phỏng vấn | Must   | NV    | US-33 |

## Warranty

| ID    | Yêu cầu                        | Loại | Nguồn     | Pri    | Actor | US    |
| ----- | ------------------------------ | ---- | --------- | ------ | ----- | ----- |
| RQ-29 | Tra cứu BH theo serial (fuzzy) | F    | Phỏng vấn | Must   | NV    | US-14 |
| RQ-30 | Tiếp nhận yêu cầu BH           | F    | Phỏng vấn | Must   | NV    | US-15 |
| RQ-31 | Xử lý BH (đổi/RMA/sửa/từ chối) | F    | Phỏng vấn | Must   | NV    | US-16 |
| RQ-32 | Hoàn tất phiếu BH + audit      | F    | Phỏng vấn | Must   | NV    | US-17 |
| RQ-33 | Xử lý hết tồn khi đổi BH       | F    | Phỏng vấn | Should | NV    | US-18 |

## Stock Adjustment & Check

| ID | Yêu cầu | Loại | Nguồn | Pri | Actor | US |
|---|---|---|---|---|---|---|
| RQ-34 | Tạo phiếu điều chỉnh tồn | F | Phỏng vấn | Must | NV | US-19 |
| RQ-35 | Duyệt phiếu điều chỉnh (4-eyes) | F | Phỏng vấn | Must | QL/AD | US-20 |
| RQ-36 | Found không rõ serial (fallback) | F | Phỏng vấn | Should | HT | US-21 |
| RQ-37 | Tạo phiếu kiểm kê | F | Phỏng vấn | Should | QL | US-22 |
| RQ-38 | Ghi nhận trạng thái thực tế khi kiểm kê | F | Phỏng vấn | Should | NV | US-23 |
| RQ-39 | Duyệt kết quả kiểm kê lệch | F | Phỏng vấn | Should | QL/AD | US-24 |
| RQ-40 | Xử lý hàng thừa khi kiểm kê (có/không serial) | F | Phỏng vấn | Should | NV | US-34 |

## Audit & Monitoring

| ID    | Yêu cầu                                      | Loại | Nguồn         | Pri    | Actor | US           |
| ----- | -------------------------------------------- | ---- | ------------- | ------ | ----- | ------------ |
| RQ-41 | Audit log mọi thay đổi dữ liệu               | F    | Phỏng vấn     | Must   | HT    | US-31, US-32 |
| RQ-42 | Audit log afterCommit (tránh phantom)        | T    | Domain review | Must   | HT    | US-32        |
| RQ-43 | Admin xem toàn bộ audit log, QL xem kho mình | F    | Phỏng vấn     | Should | AD/QL | US-31        |
| RQ-44 | Cảnh báo tồn dưới min_stock                  | F    | Domain review | Should | QL    | US-38        |
| RQ-45 | Gắn nhãn dead stock (>90 ngày)               | F    | Domain review | Could  | QL    | US-39        |

## Non-functional

| ID | Yêu cầu | Loại | Nguồn | Pri | Actor | US |
|---|---|---|---|---|---|---|
| RQ-46 | 4-eyes principle: created_by ≠ approved_by | N | SAD review | Must | HT | US-20, US-42, ADR 7.9 |
| RQ-47 | Không cho phép tồn âm (mặc định) | N | Domain review | Must | HT | US-10 |
| RQ-48 | Mapping unit ↔ tracking_type cứng | T | Domain review | Must | HT | US-26 |

## Gaps chưa có US

| ID    | Yêu cầu                             | Loại | Nguồn         | Pri | Ghi chú                                    |
| ----- | ----------------------------------- | ---- | ------------- | --- | ------------------------------------------ |
| RQ-49 | Quy trình trả hàng khách (ngoài BH) | F    | Edge cases    | TBD | Thiếu bảng `return_receipts`, audit action |
| RQ-50 | Điều chỉnh giá nhập sau xác nhận    | F    | Edge cases    | TBD | Thiếu bảng `price_adjustments`             |
| RQ-51 | Retention policy audit log          | N    | Domain review | TBD | Chưa có yêu cầu từ business                |
| RQ-52 | Backup duyệt khi QL vắng            | N    | SAD review    | TBD | Chưa có luồng escalation                   |
