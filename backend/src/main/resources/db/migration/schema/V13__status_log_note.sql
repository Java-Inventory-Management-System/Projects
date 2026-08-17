-- Lý do ghi kèm khi điều chỉnh xử lý hàng QC (dispose-confirm: hoàn kho / chờ thanh lý / thanh lý / trả NCC / gửi BH)
ALTER TABLE product_unit_status_logs ADD COLUMN note VARCHAR(500);