# Rà soát nghiệp vụ — Các vấn đề đang gặp phải

> Danh sách các vấn đề của phần mềm quản lý kho, sắp theo từng quy trình nghiệp vụ.
> Mức độ: 🔴 **Nghiêm trọng** = cần sửa trước khi đưa vào dùng · 🟠 **Nên xử lý** = sửa sớm · 🟡 **Nhỏ** = chỉnh khi có thời gian.
> Cập nhật: 2026-08-09 · Đối chiếu lại: 2026-08-09 (mục ✅ đã xử lý trong đợt sửa 2026-08-09)

---

## 1. Đăng nhập & tài khoản

1. ✅ **Khóa tài khoản không thực sự có hiệu lực — đã sửa** — Khi quản lý vô hiệu hóa một tài khoản, người đó không đăng nhập mới được, nhưng phiên làm việc đang mở vẫn tiếp tục dùng bình thường. (Đã chặn tài khoản INACTIVE ở mọi request qua filter — đợt sửa 2026-08-09.)
2. ✅ **Tài khoản mới tạo ra không vào được hệ thống — đã sửa** — Tài khoản vừa tạo nằm trong trạng thái "chờ kích hoạt", nhưng không có cách nào để kích hoạt. (Đã cho phép kích hoạt/đăng nhập đúng quy trình — đợt sửa 2026-08-09.)
3. ✅ **Nhân viên bán hàng không đổi được mật khẩu của chính mình — đã sửa** — Quyền đổi mật khẩu bị gắn nhầm với quyền quản lý kho nên nhân viên bán hàng (không có quyền kho) bị chặn. (Đã tách quyền đổi mật khẩu bản thân — đợt sửa 2026-08-09.)
4. ✅ **Không giới hạn số lần đăng nhập sai, không giới hạn gửi email quên mật khẩu — đã sửa** — (Đã giới hạn 5 lần đăng nhập sai với TOO_MANY_LOGIN_ATTEMPTS — đợt sửa 2026-08-09.)
5. ✅ **Đặt lại mật khẩu của quản lý cấp cao — đã siết** — Một quản trị viên có thể đặt lại mật khẩu của quản trị viên khác, không có phân cấp. (Đã thêm ràng buộc phân cấp — đợt sửa 2026-08-09.)
6. ✅ **Mật khẩu mới không được kiểm tra chất lượng — đã sửa** — (Đã kiểm tra độ dài tối thiểu thống nhất mọi nơi — đợt sửa 2026-08-09.)
7. ✅ **Tạo tài khoản với thông tin sai gây lỗi chung chung — đã sửa** — (Đã báo lỗi rõ cho từng trường hợp sai — đợt sửa 2026-08-09.)
8. ✅ **Kẻ xấu dò được tài khoản nào đang tồn tại — đã sửa** — (Đã thống nhất thông báo lỗi đăng nhập/quên mật khẩu — đợt sửa 2026-08-09.)
9. ✅ **Một tài khoản có thể mở 2 phiên cùng lúc ở 2 nơi — đã sửa** — (Đã giới hạn 1 phiên/tài khoản — đợt sửa 2026-08-09.)
10. ✅ **Đường dẫn đặt lại mật khẩu gửi qua email dùng 2 lần cùng lúc đều được chấp nhận — đã sửa** — (Đã chặn token dùng lại (TOKEN_ALREADY_USED) — đợt sửa 2026-08-09.)
11. ✅ **Mục "lần đăng nhập cuối" không có dữ liệu — đã sửa** — (Đã ghi lastLogin khi đăng nhập — đợt sửa 2026-08-09.)
12. ✅ **Một số quy định về quyền hạn không có hiệu lực — đã sửa** — Có quy định "quản trị viên không được đặt lại mật khẩu của người cấp trên" nhưng không được áp dụng. (Đã áp dụng ràng buộc phân cấp — đợt sửa 2026-08-09.)

---

## 2. Danh mục hàng hóa (sản phẩm, hãng, nhóm hàng, nhà cung cấp)

1. ✅ **Đổi cách quản lý sản phẩm khi đang có hàng tồn — đã chặn** — Mỗi sản phẩm được quản lý theo một trong hai kiểu: **từng chiếc** (mỗi máy có số riêng, biết chính xác chiếc nào còn trong kho) hoặc **theo lô** (chỉ đếm số lượng, ví dụ 50 mét dây). Phần mềm hiện cho phép đổi kiểu quản lý ngay cả khi sản phẩm **đang có hàng trong kho** — số liệu cũ trở nên vô nghĩa. (Đã chặn với TRACKING_CHANGE_BLOCKED — đợt sửa 2026-08-09.)
2. ✅ **Nhập sai đơn vị tính vẫn được lưu — đã sửa** — (Đã validate đơn vị hợp lệ với INVALID_UNIT — 2026-08-09.)
3. ✅ **Tên trùng: chỗ chặn, chỗ không — đã sửa** — Tên hãng trùng thì bị chặn, nhưng tên nhóm hàng trùng và tên nhà cung cấp trùng vẫn tạo được → danh mục bị trùng lặp. (Đã chặn trùng với CATEGORY_NAME_EXISTS / SUPPLIER_NAME_EXISTS — 2026-08-09.)
4. ✅ **Ảnh sản phẩm chưa được kiểm soát — đã sửa** — Có thể có 2 ảnh cùng đánh dấu là "ảnh chính"; không giới hạn số ảnh mỗi sản phẩm; gắn ảnh cho sản phẩm không tồn tại vẫn được. (Đã siết: 1 ảnh chính, giới hạn số ảnh IMAGE_LIMIT_REACHED — 2026-08-09.)
5. ✅ **Nhân viên kho thấy sản phẩm nhưng không thấy ảnh — đã sửa** — (Đã đồng bộ quyền xem ảnh với quyền xem sản phẩm — 2026-08-09.)
6. ✅ **Giá bán, ngưỡng cảnh báo hết hàng có thể nhập số âm — đã sửa** — (Đã chặn với NEGATIVE_PRICE / NEGATIVE_MIN_STOCK — 2026-08-09.)
7. ✅ **Sản phẩm bị tắt (ngừng kinh doanh) vẫn xuất hiện ở một số màn hình — đã sửa** — (Đã loại sản phẩm ngừng kinh doanh khỏi danh sách chọn khi nhập/xuất — 2026-08-09.)

---

## 3. Kho bãi — ô chứa hàng và chuyển hàng giữa các ô

1. ✅ **Chuyển hàng kéo theo cả hàng trong hộp niêm phong — đã sửa** — Khi chuyển hàng giữa các ô chứa, phần mềm có thể chuyển cả những chiếc **nằm trong hộp đã niêm phong** sang ô mới, nhưng bản thân cái hộp vẫn đứng ô cũ. Kết quả: trên sổ kho hộp "ở chỗ này" nhưng hàng trong hộp "ở chỗ kia" — không biết hàng thật sự đâu. (Đã chuyển hộp niêm phong cùng theo hàng khi di chuyển vị trí — 2026-08-08.)
2. ✅ **Hai người chuyển hàng cùng lúc có thể chuyển trùng — đã chặn** — Cùng một lô hàng bị chuyển 2 lần, hoặc ô chứa vượt quá sức chứa. (Đã khóa bản ghi khi chuyển vị trí — 2026-08-09.)
3. ✅ **Giảm sức chứa của ô khi ô đang đầy vẫn được — đã chặn** — (Đã chặn với LOCATION_CAPACITY_BELOW_USAGE — 2026-08-09.)
4. ✅ **Ô đã tạm ngừng sử dụng vẫn nhận hàng vào — đã chặn** — (Đã chặn với LOCATION_INACTIVE — 2026-08-09.)
5. ✅ **Tạo ô trùng mã — đã sửa** — Khi sửa thông tin ô, phần mềm không kiểm tra mã trùng; đến lúc lưu mới báo lỗi chung chung. (Đã kiểm tra mã trùng rõ ràng — 2026-08-09.)
6. ✅ **Chuyển hàng sang ô đã tạm ngừng vẫn được phép — đã chặn** — (Đã chặn tương tự mục 3.4 — 2026-08-09.)
7. ✅ **Chọn ô khi nhập kho không hiển thị sức chứa đã dùng — đã sửa** — Màn hình chọn vị trí không cho biết ô đã chứa bao nhiêu/sức chứa bao nhiêu; chọn ô đầy → đến bước xác nhận mới báo lỗi. (Đã hiển thị sức chứa đã dùng khi chọn vị trí + chặn ở từng bước — 2026-08-09.)

---

## 4. Đơn đặt hàng nhà cung cấp

1. ✅ **Chọn nhà cung cấp không tồn tại vẫn tạo được đơn — đã sửa** — Đến lúc lưu mới vỡ ra lỗi chung chung. (Đã chặn khi supplier không tồn tại — 2026-08-09.)
2. ✅ **Không kiểm tra số lượng, giá tiền trên đơn — đã sửa** — Để trống hoặc nhập số âm vẫn tạo được, tổng tiền đơn có thể ra số âm. (Đã validate ở BE + FE — 2026-08-09.)
3. ✅ **Hủy đơn khi đã nhập một phần — đã sửa** — Các phiếu nhập còn dang dở của đơn đó vẫn được xác nhận tiếp sau khi đơn đã hủy → nhập hàng cho đơn đã hủy. (Đã chặn hủy khi có phiếu nhập đang thực hiện; chặn duyệt phiếu nhập khi đơn đã hủy — 2026-08-09.)
4. ✅ **Đơn đã hủy có thể tự trở lại trạng thái hoạt động — đã sửa** — Nếu một phiếu nhập cũ của đơn đó được xác nhận muộn, đơn sẽ chuyển từ "đã hủy" sang "đang nhập/đủ hàng". (Đã chặn duyệt phiếu nhập của đơn đã hủy — 2026-08-09.)
5. ✅ **Đơn đặt hàng không có bước duyệt — khắc phục bằng audit log** — Người tạo đơn tự tạo, tự hủy đơn của mình, không ai kiểm tra lại. (Mọi thao tác tạo/hủy PO đều được ghi audit-log truy vết người thực hiện; bước duyệt (người khác xác nhận) sẽ cân nhắc thêm sau — 2026-08-09.)
6. ✅ **Tiến độ nhận hàng tính theo số lượng dự kiến, không theo số thực nhập — đã sửa** — Mục "số đã nhận" của đơn cộng theo số lượng ghi trên phiếu nhập (số dự kiến) chứ không đếm số máy/số hàng thực tế đã quét vào; nhà cung cấp giao thiếu vẫn coi đơn "nhận đủ". (Đã chuyển sang đếm theo đơn vị thực nhập — 2026-08-09.)

---

## 5. Nhập kho

1. ✅ **Hàng bán theo ống/trục (dây, ống keo, băng...) không nhập kho được — đã hỗ trợ** — Những mặt hàng này được quản lý theo lô (tính theo mét/trọng lượng) nhưng phần mềm không nhận dạng được đơn vị ống. (Đơn vị METER/KG/TUBE đã có ở cả FE lẫn BE, thuộc nhóm BULK — 2026-08-09.)
2. ✅ **Phiếu nhập chia 2 bước chứa hàng theo lô: duyệt xong không thấy hàng đâu — đã hỗ trợ** — Quy trình nhập 2 bước chỉ xử lý được hàng "từng chiếc". (Bước xác nhận (PENDING → PENDING_APPROVAL) đã tạo đơn vị BULK với số lượng khai báo — 2026-08-09.)
3. ✅ **Đơn đặt hàng đã hủy bị "tỉnh dậy" khi duyệt phiếu nhập — đã sửa** — Duyệt phiếu nhập của một đơn đã hủy sẽ đưa đơn đó trở lại trạng thái hoạt động. (Đã xử lý cùng mục 4.4 — chặn duyệt phiếu nhập khi PO đã hủy — 2026-08-09.)
4. ✅ **Nhập nhầm mặt hàng của phiếu khác vẫn được chấp nhận — đã chặn** — Khi xác nhận phiếu A, gửi kèm mặt hàng của phiếu B vẫn thành công. (Đã chặn với IMPORT_ITEM_NOT_IN_RECEIPT — 2026-08-09.)
5. ✅ **Nhập nhiều máy hơn số lượng khai báo — đã sửa** — Phiếu khai 5 chiếc nhưng gửi 10 số máy vẫn được duyệt → nhập vượt mà không ai phát hiện. (Đã chặn khi số lượng thực tế ≠ số khai báo — 2026-08-09.)
6. ✅ **Nhập số lượng 0 hoặc âm (hàng theo lô) không bị chặn — đã sửa** — (Đã chặn ở cả tạo phiếu 2 bước, xác nhận và nhập 1 bước với INVALID_QUANTITY — 2026-08-09.)
7. ✅ **Hàng nhập không có vị trí vẫn được duyệt — đã chặn** — Hàng không nằm ô nào thì không xuất được. (Đã bắt buộc vị trí tại cả 2 bước với IMPORT_LOCATION_REQUIRED — 2026-08-09.)
8. ✅ **Hủy phiếu nhập ảnh hưởng đến hộp niêm phong và phiếu kiểm đang làm dở — đã chặn** — Hàng trong hộp đã niêm phong hoặc đang trong phiếu kiểm kho vẫn bị đánh dấu "đã xóa". (Đã chặn hủy khi đơn vị nằm trong hộp niêm phong hoặc phiếu kiểm đang chạy — 2026-08-09.)
9. ✅ **Hàng chờ xử lý lỗi (khu kiểm tra chất lượng) không được gán vị trí — đã chặn** — Nếu khu vực này chưa được khai báo, hàng bị bỏ trống vị trí mà không có cảnh báo. (Đã trả lỗi QC_STAGING_LOCATION_MISSING khi khu QC chưa được khai báo trong bản đồ kho — 2026-08-09.)
10. ✅ **Nhà cung cấp trên phiếu nhập không khớp nhà cung cấp trên đơn đặt hàng vẫn được — đã chặn** — Nhập hàng của nhà cung cấp khác với đơn mà không ai hay. (Đã chặn với PO_SUPPLIER_MISMATCH — 2026-08-09.)
11. ✅ **Hai người nhập cùng một số máy cùng lúc — đã báo lỗi rõ** — Một người được lưu, người kia nhận lỗi chung chung không rõ lý do. (Đã bắt DataIntegrityViolation → trả SERIAL_ALREADY_EXISTS khi va chạm đồng thời — 2026-08-09.)
12. ✅ **Nhập lại cùng một đơn đặt hàng 2 lần không bị chặn — đã chặn** — Nhập 2 lần, số lượng hàng tăng gấp đôi âm thầm. (Đã chặn khi đơn đã có phiếu nhập với PO_ALREADY_IMPORTED — 2026-08-09.)
13. ✅ **Dán danh sách số máy bị cắt ngắn vẫn gửi được — đã sửa** — Các bước trước chỉ kiểm tra "có quét số máy hay không", không kiểm tra "đủ số lượng hay chưa": khai 8 máy mà dán được 2 máy vẫn cho gửi, đến bước cuối mới báo lỗi; số máy trùng giữa 2 phiếu/mặt hàng khác nhau cũng không phát hiện sớm. (Đã chặn khi số lượng thực tế ≠ số khai báo — 2026-08-09.)
14. ✅ **Hủy phiếu nhập làm hàng trong hộp niêm phong thành "đã xóa" nhưng không báo hộp bị ảnh hưởng — đã chặn** — Phần mềm đánh dấu "đã xóa" cho mọi máy của phiếu, kể cả máy đang nằm trong hộp đã niêm phong → hộp "có hàng" nhưng thực tế hàng không còn tồn tại (số liệu hộp sai, phiếu kiểm sau này kẹt). (Đã chặn hủy phiếu nhập khi có đơn vị nằm trong hộp niêm phong hoặc phiếu kiểm đang chạy — 2026-08-09.)
15. ✅ **Nhập hàng bảo hành về: phiếu xuất đã nhập về rồi vẫn hiện để chọn lại — đã sửa** — Danh sách phiếu không loại phiếu đã tạo phiếu nhập về; chọn lại phiếu cũ nhận lỗi khó hiểu. (Đã loại phiếu đã nhập về khỏi danh sách chọn ở FE và chặn ở BE với WARRANTY_IMPORT_ALREADY_RECEIVED — 2026-08-09.)

---

## 6. Trả hàng, kiểm tra chất lượng, bảo hành

1. ✅ **Hàng kiểm tra đạt không được chuyển về kệ bán** — Sau khi kiểm tra chất lượng đạt, hàng vẫn nằm lại khu kiểm tra. Khu này không bao giờ trống, hàng đủ điều kiện bán cứ "chôn" ở đó. — Đã sửa: `QcPassService` giờ đưa hàng QC pass ra kệ bán thường (ngoài zone QC, còn sức chứa); hết chỗ thì báo lỗi `QC_PASS_NO_SELLABLE_LOCATION`.
2. ✅ **Hàng gửi bảo hành có thể gửi nhầm nhà cung cấp — đã sửa** — Khi một sản phẩm có nhiều nhà cung cấp, phần mềm tự chọn **một nhà cung cấp bất kỳ** (thường là nhà cung cấp khai báo trước nhất) để gửi hàng bảo hành/trả lỗi — chưa chắc là nhà cung cấp đã bán lô hàng đó.
   - ✅ Trả nhà cung cấp: chọn tay được nhà cung cấp (xem mục 9.10) — màn hình QC có dropdown NCC khi trả NCC.
   - ✅ Gửi bảo hành (SEND_WARRANTY): đã thêm dropdown NCC giống trả NCC (2026-08-09) — BE vốn đã nhận `supplierId` cho cả 2 action; không chọn thì vẫn tự lấy NCC khai báo đầu tiên.
3. ✅ **Hàng "trả lại nhà cung cấp bị từ chối" không có lối thoát** — Trạng thái này không tạo được chứng từ nào, không đưa về kho được → hàng kẹt vĩnh viễn. — Đã sửa: `DisposeConfirmService` cho phép REJECTED_RETURN chuyển về QC hold hoặc chờ hủy, và tự đặt kệ (QC-01-01 / QC-01-04) thay vì để trống.
4. ✅ **Hai người trả cùng một máy cùng lúc** — Cả hai đều tạo được phiếu trả; phiếu duyệt sau đè lên kết quả phiếu trước. — Đã sửa: `ReturnReceiptService` lock dòng máy (`findByIdsForUpdate`) trước khi kiểm tra tạo phiếu trả.
5. ✅ **"Kiểm tra đạt" không hỏi xác nhận, không hoàn tác được** — Bấm nhầm là hàng về kho ngay. — Đã sửa: màn hình QC yêu cầu xác nhận (dialog liệt kê máy) trước khi QC pass.
6. ✅ **Nhập số máy không tồn tại khi xử lý: phần mềm lặng lẽ bỏ qua** — Không báo lỗi, tưởng đã xử lý xong thực ra không có gì xảy ra. — Đã sửa: duyệt phiếu trả giờ ném `PRODUCT_UNIT_NOT_FOUND` thay vì bỏ qua.
7. ✅ **Duyệt phiếu trả không kiểm tra lại tình trạng máy** — Máy bị đổi trạng thái giữa chừng vẫn bị duyệt đè. — Đã sửa: duyệt phiếu trả kiểm tra lại máy còn trạng thái EXPORTED, sai thì báo `RETURN_UNIT_NOT_SOLD (current: {0})`.
8. ✅ **Số lượng hàng theo lô trong chứng từ ghi sai** — Ghi "1" thay vì ghi số hàng thực tế còn lại. — Đã kiểm chứng: không hardcode "1", in đúng số lượng còn lại.
9. ✅ **Nhiều trạng thái đã thiết kế nhưng không bao giờ dùng** — Ví dụ "đã bán", "đặt trước", "bị lỗi" — tồn tại gây nhầm lẫn trong báo cáo. — Đã sửa: đánh dấu `@Deprecated` cho SOLD, RESERVED, DEFECTIVE.
10. ✅ **Trả hàng theo lô có thể bị trả 2 lần** — Không chống trùng khi trả hàng theo lô (chỉ hàng từng chiếc mới chống được). — Đã sửa: chặn trả trùng theo (phiếu xuất gốc, sản phẩm) với `RETURN_UNIT_ALREADY_RETURNED`.
11. ✅ **Đổi lý do phiếu trả không khôi phục thao tác đã chọn** — Chọn "bảo hành" (tự bật "gửi bảo hành" cho mọi máy lỗi) rồi đổi sang lý do khác: máy vẫn bị đánh dấu "gửi bảo hành" dù phiếu không còn là phiếu bảo hành. — Đã sửa: đổi lý do sang lý do khác sẽ xóa cờ "gửi bảo hành" (`clearWarranty`).
12. ✅ **Phiếu in hiện mã số nội bộ và trạng thái tiếng Anh** — Phiếu in trả hàng ghi "phiếu xuất gốc" là số nội bộ (17) thay vì mã phiếu (PX-...), trạng thái kết quả kiểm kê hiện chữ tiếng Anh (GOOD, MISSING...) ngay cả khi chọn in tiếng Việt → giấy in kèm hàng khó đối chiếu. — Đã sửa: phiếu in trả hàng hiện mã phiếu xuất gốc (PX-...); trạng thái kiểm kê dịch sang tiếng Việt khi in vi.

---

## 7. Đóng/mở hộp hàng

1. ✅ **Hàng theo lô tách vào hộp bị mất thông tin bảo hành** — Khi chia một phần lô hàng vào hộp, phần tách ra không còn thời hạn bảo hành, số bảo hành → không thể thực hiện bảo hành cho phần hàng đó. — Đã sửa: khi tách lô vào hộp, phần tách copy đầy đủ thời hạn bảo hành, số bảo hành, cờ bảo hành còn hiệu lực.
2. ✅ **Chỉ cần quyền "xem" là đóng/mở được hộp** — Thao tác làm thay đổi hàng hóa lại nằm dưới quyền xem; nếu sau này mở quyền xem cho vai trò khác thì họ cũng đóng/mở hộp được. — Đã sửa: đóng/mở/di chuyển/xóa hộp chuyển sang quyền thao tác kho (MANAGER/STOCK).
3. ✅ **Hàng đang trong phiếu kiểm kho dở vẫn đóng hộp được** — Khiến phiếu kiểm sau này không hoàn tất được (xem mục 8.1). — Đã sửa: đóng hộp từ chối máy đang nằm trong phiếu kiểm đang mở (`BOX_UNIT_IN_STOCK_CHECK`).
4. ✅ **Hộp có thể chứa hàng đã bị "xóa"** — Hủy phiếu nhập không dọn hàng ra khỏi hộp → hộp chứa hàng không còn thực tế. — Đã sửa: hủy phiếu nhập dọn hàng ra khỏi hộp đã mở và trả về vị trí của hộp.
5. ✅ **Hộp đã mở không thể đóng lại hay xóa** — Tồn tại vĩnh viễn trong danh sách. — Đã sửa: hộp đã mở xóa được (kèm xác nhận); hộp còn niêm phong thì không.
6. ✅ **Đóng hộp: nhập 0 vào số lượng hàng theo lô tách vẫn được chấp nhận** — Màn hình cho gõ 0 vào ô số lượng; gửi lên vẫn tạo ra phần hàng số lượng 0 trong hộp. — Đã sửa: chặn `min=1` ở ô nhập và chặn BE với `BOX_UNIT_QTY_ZERO`.
7. ✅ **Đóng hộp: chọn toàn bộ là hàng theo lô tách một phần → nút Xác nhận báo lỗi vô lý** — Màn hình hiển thị "đã chọn 10/20" nhưng gửi lên hệ thống lại báo lỗi "chưa chọn hàng", gây hiểu nhầm. — Đã sửa: số lượng 0 bị chặn sớm, lỗi hệ thống giờ chỉ xuất hiện khi thực sự chưa chọn hàng.
8. ✅ **Chuyển ô kéo theo hàng trong hộp niêm phong mà không chuyển hộp — đã sửa** — Trùng với mục 3.1: chuyển vị trí lấy mọi máy đang ở ô nguồn (kể cả máy nằm trong hộp niêm phong) chuyển sang ô mới nhưng hộp vẫn đứng tên ô cũ → hộp và hàng tách rời: bản đồ kho hiển thị sai, dung lượng ô mới không tính hàng trong hộp, hộp gần như "vô hình" với người kiểm kho. (Đã xử lý cùng mục 3.1 — 2026-08-08.)

---

## 8. Kiểm kho

1. ✅ **Kiểm kho theo khu vực mà có hộp niêm phong: muốn hoàn tất phiếu bắt buộc phải mở hộp — đã sửa** — Phần mềm đưa cả hàng trong hộp niêm phong vào phiếu kiểm, rồi chặn hoàn tất với lý do "hộp chưa được xác nhận" — người kiểm bắt buộc phải dừng việc, mở niêm phong từng hộp rồi mới hoàn tất được. Gây gián đoạn khi kiểm kho khu vực có hộp. (Đã thêm bước xác nhận hộp niêm phong khi hoàn tất phiếu kiểm — 2026-08-08.)
2. ✅ **Người kiểm kho tự duyệt phiếu điều chỉnh do chính mình tạo — đã sửa** — Khi hoàn tất phiếu kiểm, phần mềm tự tạo phiếu điều chỉnh tồn kho và tự duyệt — người duyệt chính là người vừa kiểm. Vi phạm nguyên tắc "người tạo không tự duyệt", dễ gian lận. (Đã chặn người tạo tự duyệt — đợt sửa 2026-08-09.)
3. ✅ **Một máy có thể nằm trong 2 phiếu kiểm đang mở cùng lúc** — Cả 2 phiếu hoàn tất sẽ điều chỉnh cùng một máy 2 lần. — Đã sửa: tạo phiếu kiểm từ chối khi máy đang nằm trong phiếu kiểm đang mở khác (`STOCK_CHECK_UNIT_IN_ANOTHER_CHECK`).
4. ✅ **Hàng theo lô thiếu 100 vẫn chỉ ghi điều chỉnh "1"** — Đếm thiếu 100 mét vẫn ghi mất 1 đơn vị → số liệu sai hoàn toàn. — Kiểm chứng 2026-08-09: điều chỉnh theo số lượng đếm thực tế đã đúng từ trước (test `complete_bulkShortage_createsLostAdjustmentWithRealQuantity`).
5. ✅ **Chức năng "bắt đầu kiểm" vô dụng** — Trạng thái "chưa bắt đầu" không bao giờ dùng được; phiếu tạo ra đã ở trạng thái "đang kiểm". — Đã sửa: tạo phiếu lập tức ở trạng thái "đang kiểm", bỏ trạng thái trung gian và nút "Bắt đầu kiểm" khỏi màn hình.
6. ✅ **Phiếu kiểm đã hoàn tất không mở lại được** — Không sửa được sai sót sau khi hoàn tất. — Đã sửa: thêm "Mở lại kiểm kho" cho phiếu đã hoàn tất (chặn nếu có điều chỉnh đã duyệt, xóa điều chỉnh chưa duyệt — `STOCK_CHECK_NOT_COMPLETED`, `STOCK_CHECK_HAS_APPROVED_ADJUSTMENTS`).
7. ✅ **Ghi trạng thái sai khi kiểm gây lỗi chung chung** — Phần mềm báo "sự cố" thay vì "trạng thái không hợp lệ". — Kiểm chứng 2026-08-09: `STOCK_CHECK_INVALID_STATUS` đã có sẵn (test `recordItems_rejectsInvalidActualStatus`).
8. ✅ **Máy hỏng khi kiểm kho bắt buộc kèm ảnh nhưng giao diện không nhắc** — Hệ thống yêu cầu ảnh chụp cho máy hư hỏng nhưng màn hình chỉ hiện icon nhỏ, không ngăn lưu sớm → lưu mới báo lỗi. — Đã sửa: nút chụp ảnh viền đỏ + nhãn "Bắt buộc chụp ảnh" cạnh mỗi máy chọn "hỏng trong kho" mà chưa có ảnh.
9. ✅ **Màn hình tạo phiếu kiểm cho chọn hộp niêm phong làm phạm vi** — Danh sách hộp không loại/khóa hộp đã niêm phong: tạo xong phiếu kiểm trên hộp đó thì phải mở hộp mới hoàn tất được (liên quan mục 8.1) — vấn đề chỉ lộ ở bước cuối, chọn ở bước đầu không hề bị ngăn. — Đã sửa: BE từ chối hộp niêm phong (`STOCK_CHECK_BOX_SEALED`), FE loại hộp niêm phong khỏi danh sách chọn.

---

## 9. Xuất kho

1. ✅ **Chọn khách hàng không tồn tại vẫn tạo được phiếu xuất — đã sửa** — Đến lúc lưu mới vỡ ra lỗi chung chung. (Đã kiểm tra khách hàng bắt buộc/đúng khi tạo phiếu — 2026-08-09.)
2. ✅ **Xuất hàng theo lô thiếu hàng vẫn hoàn tất phiếu — đã sửa** — Phiếu xuất 100 mét nhưng kho chỉ còn 60 mét (và không có hộp nào chứa hàng đó): phần mềm không báo lỗi, vẫn đánh dấu hoàn tất → 40 mét "bốc hơi" âm thầm, hàng xuất không đủ mà không ai biết. (Đã chặn ở `ExportFulfillmentService.fulfill`: lấy đủ hàng còn lại rồi nếu `remaining > 0` → kiểm tra hộp niêm phong, không có hộp thì throw `INSUFFICIENT_STOCK`; test `fulfill_bulkInsufficientStock_throws` — 2026-08-09.)
3. ✅ **Hàng chờ gửi bảo hành có 2 con đường gửi đi — đã kiểm chứng, không thể gửi 2 lần** — Có thể gửi qua phiếu xuất, cũng có thể gửi qua chức năng khác → cùng một máy gửi 2 lần, chứng từ không thống nhất. (Đã kiểm chứng 2026-08-09: cả 2 đường đều chuyển trạng thái unit sang `SENT_TO_MANUFACTURER` ngay trong cùng transaction; đường kia lúc sau thấy status không còn hợp lệ → reject: manual path chặn tại `ExportFulfillmentService` (khóa hàng `findByIdForUpdate`, check status), QC path chặn tại `ALLOWED_ACTIONS` của `DisposeConfirmService`; song song cũng an toàn nhờ pessimistic lock. Test `fulfill_warrantyReplacement_alreadySentUnit_rejected`.)
4. ✅ **Xuất thiếu so với phiếu vẫn hoàn tất — đã sửa** — Phiếu xuất 3 máy, chỉ chọn 2 máy vẫn được đánh dấu "hoàn tất" không kèm cảnh báo nào: bước xác nhận không kiểm tra số máy đã chọn so với số trên phiếu — xuất thiếu hàng âm thầm, số liệu kho/báo cáo lệch vĩnh viễn. (Đã chặn ở bước xác nhận — 2026-08-09.)
5. ✅ **Số lượng xuất thực tế không khớp phiếu vẫn thành công — đã sửa** — Xuất nhiều hơn hoặc ít hơn số lượng trên phiếu đều được. (Đã chặn khi thực xuất ≠ yêu cầu — 2026-08-09.)
6. ✅ **Chức năng "xuất hủy hàng" không xuất được hàng ở khu kiểm tra — đã sửa** — Phiếu xuất hủy chỉ nhận hàng ở kệ thường, không nhận hàng đang chờ xử lý ở khu kiểm tra → đúng đối tượng của nó lại không dùng được. (Đã cho phép chọn `PENDING_QC`/`RETURN_QC_HOLD` khi lý do DISPOSE — 2026-08-09.)
7. ✅ **Số lượng "hàng có thể xuất" hiển thị khác nhau giữa các màn hình — đã sửa** — Chỗ thì trừ hàng đang trong phiếu kiểm, chỗ thì không → nhân viên nhìn 2 số khác nhau. (Đã sửa 2026-08-09: `aggregateInStockByProduct`/`aggregateInStockByProductIdIn` (nguồn cho màn hình tồn kho + trang tạo phiếu xuất + dashboard) bổ sung loại trừ unit đang trong phiếu kiểm `IN_PROGRESS` — khớp với `getInStockQuantity` và danh sách máy xuất vốn đã loại trừ.)
8. ✅ **Lịch sử phiếu xuất ghi sai ngay từ lần đầu — đã sửa** — Trạng thái ghi trong lịch sử không đúng với thực tế. (Đã ghi lại lịch sử trạng thái đầy đủ từ khi tạo phiếu, hiển thị timeline — 2026-08-09.)
9. ✅ **Hai phiếu xuất cùng sản phẩm mở cùng lúc — đã sửa** — Người xuất sau có thể thất bại không hiểu lý do. (Đã sửa 2026-08-09: người xuất sau giờ nhận lỗi cụ thể từ BE — `INSUFFICIENT_STOCK` kèm số thực nhận/đề nghị, `EXPORT_SERIAL_NOT_AVAILABLE` kèm trạng thái hiện tại của máy, `EXPORT_QUANTITY_MISMATCH` kèm số thực tế/yêu cầu; FE fulfill page hiển thị thẳng `e.message` của BE.)
10. ✅ **Trả nhà cung cấp: không chọn tay được nhà cung cấp, tự lấy nhà cung cấp đầu tiên — đã sửa** — Khi chọn lý do "trả nhà cung cấp", hệ thống tự lấy nhà cung cấp khai báo đầu tiên của từng sản phẩm (liên quan mục 6.2 — cùng cơ chế gửi bảo hành); người dùng không có ô chọn nhà cung cấp. Nếu phiếu có 2 sản phẩm của 2 nhà cung cấp khác nhau → bị chặn tạo phiếu, không có cách xử lý ngoài việc tách phiếu. (Đã thêm dropdown chọn nhà cung cấp khi trả NCC trên màn hình QC — 2026-08-09.)
11. ✅ **Máy trong hộp niêm phong / đang trong phiếu kiểm kho vẫn hiện để chọn xuất — đã sửa** — Danh sách máy xuất không đánh dấu/loại máy thuộc hộp đã niêm phong hoặc máy đang trong phiếu kiểm; chọn xong tới bước hoàn tất mới báo lỗi. (Đã loại khỏi danh sách máy khả dụng — 2026-08-09.)
12. ✅ **Số lượng thực tế cho hàng theo lô có thể nhập 0 — đã sửa** — Ô nhập không chặn 0; gửi lên mới báo lỗi khó hiểu thay vì cảnh báo ngay. (Đã chặn `min=1` — 2026-08-09.)

---

## 10. Điều chỉnh tồn kho & giá

1. ✅ **Điều chỉnh "mất/hỏng" không kiểm tra tình trạng máy** — Máy đã bán, đã bị xóa, hoặc đang nằm trong hộp niêm phong vẫn bị đánh dấu "mất/hỏng" → ghi đè lịch sử hàng đã xuất, phá vỡ hộp hàng. — Đã sửa: `AdjustmentUnitService.assertAdjustableFor` (manual) chặn cả 3 trường hợp — status không thuộc `ADJUSTABLE_STATUSES` (`ADJUSTMENT_UNIT_NOT_ADJUSTABLE`), unit trong khu QC (`ADJUSTMENT_QC_ZONE_ADJUST_NOT_ALLOWED`), unit trong hộp niêm phong (`ADJUSTMENT_UNIT_IN_SEALED_BOX`), unit trong phiếu kiểm mở (`ADJUSTMENT_UNIT_IN_STOCK_CHECK`).
2. ✅ **Điều chỉnh giá nhập không cập nhật giá vốn của hàng đang tồn** — Giá nhập đổi nhưng hàng tồn vẫn tính giá vốn cũ → khi bán ra, giá vốn sai, số liệu lãi/lỗ sai. — Đã sửa: `PriceAdjustmentService.approve` cập nhật `unitPrice` của import item + `costPrice` của mọi unit theo item đó (`findByImportReceiptItemId` → `setCostPrice(newPrice)` → saveAll).
3. ✅ **Hàng ở khu kiểm tra bị xử lý không nhất quán** — Có thể bị đánh dấu "mất/hỏng" nhưng lại không được phép "tìm thấy/khôi phục". — Đã sửa: bỏ block `isInQcZone` khỏi `assertRestorable` — unit ở khu QC có status thuộc `RESTORABLE_STATUSES` (LOST/DAMAGED_IN_STORAGE/REMOVED) giờ khôi phục IN_STOCK được; unit QC-hold (RETURN_QC_HOLD/PENDING_QC) không nằm trong tập này nên không bị khôi phục nhầm.
4. ✅ **"Tìm thấy hàng" không kiểm tra máy có tồn tại, số máy có trùng không** — Số nhận diện tự sinh có thể trùng với số máy nhập vào sau này. — Đã sửa: kiểm tra trùng serial 2 tầng — khi tạo phiếu (`ADJUSTMENT_SERIAL_DUPLICATE` nếu serial đã tồn tại) và khi duyệt (`applyFoundNew` check lại `existsBySerialNumber` — chặn trường hợp serial bị nhập trùng giữa lúc tạo và lúc duyệt, kể cả serial tự sinh "FOUND-...").
5. ✅ **Điều chỉnh giá cho lô hàng chưa nhập xong vẫn được** — Điều chỉnh cả hàng chưa về kho. — Đã sửa: `PriceAdjustmentService.create` throw `PRICE_ADJ_RECEIPT_NOT_COMPLETED` khi import receipt chưa COMPLETED.
6. ✅ **Phiếu điều chỉnh không làm gì cả vẫn bị đánh dấu "đã duyệt"** — Tạo phiếu, duyệt, nhưng thực tế không có thay đổi nào — trạng thái đã duyệt gây hiểu nhầm. — Đã sửa: `applyFoundRestore` khi manual (sourceType = STOCK_ADJUSTMENT) và unit đã IN_STOCK → throw `ADJUSTMENT_NO_EFFECT`; auto (từ phiếu kiểm) vẫn silent return.
7. ✅ **Giá nhập bắt buộc là số nguyên** — Hàng tính theo mét/kg thường có giá lẻ nhưng không chỉnh được. — Đã sửa: input giá trên màn hình điều chỉnh giá dùng `parseInt` → `parseFloat` (nhận số thập phân, hiển thị tối đa 2 số lẻ); BE và DB (`unit_price DECIMAL(15,2)`) vốn đã hỗ trợ số thập phân, chỉ bị chặn ở tầng nhập liệu.
8. ✅ **Người tạo phiếu tự từ chối phiếu của mình** — Lệch với nguyên tắc "người tạo không tự duyệt" (chỗ này chỉ áp dụng cho việc duyệt, không áp dụng cho từ chối). — Đã sửa: `StockAdjustmentService.reject` + `PriceAdjustmentService.reject` (và `approve`) thêm `securityPolicy.requireNotCreator(createdBy)` — áp dụng 4-eyes cho cả duyệt lẫn từ chối.
9. ✅ **Hai phiếu điều chỉnh "mất/hỏng" cùng một máy mở song song** — Phần mềm không chặn tạo 2 phiếu cùng 1 máy (chỉ hiện cảnh báo màu hổ phách); phiếu duyệt sau ghi đè trạng thái của phiếu trước → "mất" xong thành "hỏng" mà không ai hay. — Đã sửa: `StockAdjustmentService.create` throw `ADJUSTMENT_PENDING_EXISTS` khi đã có phiếu PENDING cho cùng unit.
10. ✅ **"Tìm thấy hàng" cho máy ở khu kiểm tra/đã niêm phong: lỗi rơi vào người duyệt — đã sửa** — Người tạo được chọn mọi máy; đến bước duyệt người duyệt mới nhận lỗi "không thể khôi phục" — chặn sai người, sai thời điểm. (Đã chặn sớm ở bước tạo phiếu — 2026-08-09.)

---

## 11. Khách hàng, báo cáo, vận hành tự động

1. ✅ **Khách hàng trùng số điện thoại/email vẫn tạo được** — Có thể có 2 hồ sơ cho cùng một người. — Đã sửa: `CustomerService.create`/`update` check unique phone/email (`CUSTOMER_PHONE_EXISTS`/`CUSTOMER_EMAIL_EXISTS`), update loại trừ chính khách hàng đó.
2. ✅ **Khách hàng bị vô hiệu hóa vẫn bán hàng được** — Vẫn tạo được phiếu xuất cho khách đã bị tắt. — Đã sửa: `ExportReceiptService.create` loại SALE check `isActive`, throw `CUSTOMER_INACTIVE`.
3. ✅ **Chỉ số "biến động giá trị tồn kho" trên bảng điều khiển không đáng tin** — Con số này gộp 2 cách tính giá khác nhau, không có ý nghĩa kế toán, dễ gây hiểu nhầm khi báo cáo. — Đã sửa: `getInventorySummary` tính toàn bộ theo giá vốn (cost basis): tổng giá trị = Σ cost_value (aggregate `aggregateInStockByProduct` bổ sung cột cost_value: BULK = Σ remaining×cost_price, serialized = Σ cost_price); kỳ trước = tổng hiện tại − giá vốn nhập + giá vốn xuất (`sumCostPriceOfCompletedExports` trên `ExportReceiptItemUnitRepository`).
4. ✅ **Phiếu kiểm kho treo quá 1 ngày bị tự hủy thành trạng thái không lối thoát** — Sau đó không xử lý tiếp được gì với phiếu đó. — Đã sửa: `InventoryStateMachineConfig.stockCheckStateMachine` thêm `.allow(EXPIRED, IN_PROGRESS)`; `StockCheckService.reopen` nhận COMPLETED hoặc EXPIRED; FE reopen button hiện cho cả EXPIRED.
5. ✅ **Cảnh báo "hàng sắp hết, hàng tồn lâu" không đến tay ai** — Chỉ nằm trong nhật ký hệ thống, quản lý kho không nhận được thông báo nào. Riêng mặt hàng theo lô (mét/kg): con số so sánh sai đơn vị — phần mềm đếm "số lô" thay vì "số lượng còn lại" → cảnh báo gần như luôn sai với loại hàng này. — Đã sửa: `ScheduledTaskService.checkLowStock`/`checkDeadStock` gửi email cảnh báo cho user role MANAGER (template `system-alert.html`, gated bởi `spring.mail.enabled`); BULK đếm `sumQuantityByProductIdAndStatus` (sum remainingQuantity thay vì đếm số lô, có loại trừ stock check).
6. ✅ **Phiếu trả hàng chờ duyệt quá 30 ngày bị tự hủy mà không báo cho người tạo** — Người tạo quay lại thấy phiếu biến mất, không hiểu vì sao. — Đã sửa: `cancelStaleReturnReceipts` gửi email cho creator (template `system-alert.html`) kèm mã phiếu.
7. ✅ **Vô hiệu hóa khách hàng có lịch sử giao dịch không cảnh báo gì** — Đã sửa: `CustomerResponse` thêm `exportCount` (đếm phiếu xuất theo customer); FE customer page hiện cảnh báo xác nhận khi vô hiệu hóa khách có exportCount > 0.
8. ✅ **Số liệu hoạt động xuất kho bị thiếu** — Báo cáo hoạt động xuất luôn hiển thị 0 mặt hàng; chương trình cố định con số này bằng 0, không đếm dòng hàng thực tế. — Đã sửa: `ReportService.getActivity` đếm `exportReceiptItemRepository.findByReceiptId(...).size()`.
9. ✅ **Đếm "hàng sắp hết" không loại hàng đang trong phiếu kiểm** — Số liệu có thể báo cao hơn thực tế. — Đã sửa: `ReportService.getLowStock` dùng `findByProductIdInAndStatusNotInStockCheck`.

---

## 12. Quyền hạn hiển thị trên màn hình

1. ✅ **Màn hình hiện cho người không có quyền, bấm vào mới lỗi** — Một số trang (tạo phiếu kiểm kho, chỉnh danh mục, đóng hộp) hiển thị cho cả những người không được phép; bấm thao tác mới nhận lỗi từ hệ thống. Người dùng bối rối, nhân viên mất thời gian. — Đã sửa: route guards `PageGuard` trong `routes/index.tsx`: /stock/ops/checks/new, /adjustments/new, /price-adjustments/new, /stock/units/box/new, /returns-qc/qc → `CAN_OPERATE_STOCK`; /import-receipt mới → `ROLES.MANAGER`; /export-receipt/new + /returns-qc/returns/new → `CAN_CREATE_TRANSACTION`; /catalog-settings + /products/new + /products/:id → `CAN_MANAGE_CATALOG`.
2. ✅ **Quyền hiển thị trên màn hình không khớp chính xác với quyền thực tế** — Có người thấy được nút nhưng bấm không được, có người đủ quyền lại không thấy nút. — Đã sửa: `permissions.ts` bổ sung `CAN_CREATE_TRANSACTION` (MANAGER/STOCK/SALES), ADMIN vào `CAN_MANAGE_CATALOG`, SALES vào `CATALOG_VIEW`; nút Hủy phiếu xuất (list + detail) → `CAN_APPROVE`; nút tạo phiếu nhập → `ROLES.MANAGER`; nút tạo phiếu xuất/trả → `CAN_CREATE_TRANSACTION`; nút tạo phiếu kiểm/điều chỉnh/điều chỉnh giá → `CAN_OPERATE_STOCK`; nút thêm/sửa brand/category/supplier → `CAN_MANAGE_CATALOG`; approve/reject adjustment ẩn cho creator (4-eyes).

**Đề xuất chung**: với mỗi chức năng, xác định rõ "ai được làm" rồi áp dụng đồng bộ trên màn hình — người không đủ quyền thì không thấy, người đủ quyền thì thấy và làm được.

---

## 13. Phân quyền hệ thống — các vai trò bị chặn/lỏng không khớp nhau

1. ✅ **Quản trị viên (ADMIN) bị chặn khỏi các màn hình quản lý chính** — ADMIN xem được báo cáo, quản lý tài khoản, nhưng bấm vào danh mục sản phẩm/hãng/nhóm/NCC, đơn đặt hàng NCC, vị trí kho, sửa khách hàng → báo "không có quyền". Vai giám sát cao nhất mà không quản lý được dữ liệu nền của hệ thống. — Đã sửa: `ROLE_MANAGER` và `CAN_MANAGE_CATALOG` thêm ADMIN.
2. ✅ **Quyền đọc danh mục không nhất quán** — Nhân viên bán hàng xem được danh sách sản phẩm nhưng không xem được hãng/nhóm hàng/nhà cung cấp (màn hình lọc theo hãng bị trống). Cùng một nhóm "danh mục" mà hai mức quyền đọc khác nhau. — Đã sửa: Brand/Category/Supplier GET → `CAN_OPERATE`.
3. ✅ **Ai cũng hủy được phiếu xuất** — Phiếu xuất: nhân viên bán hàng/kho đều hủy được, kể cả phiếu do người khác tạo; trong khi hủy phiếu nhập chỉ có quản lý và quản trị viên. Hai thao tác cùng bản chất nhưng quyền chênh lệch. — Đã sửa: export cancel → `CAN_APPROVE` (cùng với import cancel).
4. ✅ **Quản trị viên tạo được phiếu xuất và phiếu trả hàng** — Trong khi vai quản trị viên được định hướng là giám sát (duyệt, xem báo cáo), không khởi tạo giao dịch nhập/xuất. — Đã sửa: thêm `CAN_CREATE_TRANSACTION` = SALES/STOCK/MANAGER, dùng cho export create + return create (loại ADMIN).
5. ✅ **Thao tác đóng/mở hộp niêm phong dùng quyền "xem tồn kho"** — Đóng/mở hộp, chuyển hộp được gắn chung quyền xem; người có quyền xem nào cũng thao tác hộp được, không tách riêng quyền thao tác. — Đã sửa: `BoxController` seal/unseal/move → `CAN_OPERATE_STOCK` (GET giữ `CAN_VIEW_INVENTORY`); FE /stock/units/box/new → `CAN_OPERATE_STOCK`.
6. ✅ **Nhân viên kho tự tạo được phiếu nhập** — Thường quy trình là quản lý lập phiếu, nhân viên kho nhập hàng; hiện nhân viên kho tạo phiếu được luôn. — Đã sửa: import create → `ROLE_MANAGER`; confirm giữ `CAN_OPERATE_STOCK` (nhân viên kho nhập hàng).
7. ✅ **Quản lý xem được toàn bộ nhật ký hoạt động của mọi người** — Không có bộ lọc theo phạm vi quản lý của mình. — Đã sửa: audit page có đầy đủ bộ lọc: action (combobox tìm kiếm), entity, status (SUCCESS/FAILED), user (combobox tìm theo tên/username), khoảng thời gian từ/đến; query params giữ trạng thái lọc khi reload, chip lọc + nút clear all. BE `/audit-logs` hỗ trợ `action/entity/userId/status/from/to`.
8. ✅ **Xử lý kiểm tra chất lượng được phép cho quá nhiều vai trò** — "Kiểm đạt", "Hủy bỏ hàng", "Gửi bảo hành", "Trả nhà cung cấp" ngoài nhân viên kho và quản lý, nhân viên bán hàng và quản trị viên cũng làm được — tức là nhân viên bán hàng cũng hủy được hàng hóa trong kho. — Đã sửa: 3 endpoint QC (list, qc-pass, dispose-confirm) → `CAN_OPERATE_STOCK` (MANAGER/STOCK).
