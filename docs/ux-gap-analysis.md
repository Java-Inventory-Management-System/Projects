# Rà soát trải nghiệm người dùng — Bản dành cho người phụ trách kinh doanh

> Tài liệu này nhìn lại từng màn hình của phần mềm từ góc nhìn người sử dụng hàng ngày: chỗ nào người dùng dễ bấm nhầm, dễ mất dữ liệu, dễ hiểu nhầm, hoặc phải tự đoán.
> Cách đọc: mỗi mục có **chuyện gì đang xảy ra khi dùng phần mềm**, **vì sao phiền**, và mức độ: 🔴 **Nghiêm trọng** = sửa trước khi bàn giao · 🟠 **Nên xử lý** = sửa sớm · 🟡 **Nhỏ** = chỉnh khi có thời gian.
> Cuối tài liệu là danh sách **câu hỏi cần xác nhận nghiệp vụ** — một số chỗ chỉ sửa được sau khi con người quyết định hướng xử lý.
> Cập nhật: 2026-08-09 · Đối chiếu lại: 2026-08-10 (52 ✅ · 0 🟡)

---

## 1. Những hành động nguy hiểm không được báo trước (dễ bấm nhầm, dễ mất dữ liệu)

1. ✅ **Hoàn tất phiếu kiểm kho không cảnh báo hậu quả — đã sửa** — Khi bấm "Hoàn tất", phần mềm **tự động tạo phiếu điều chỉnh tồn kho và tự duyệt**, làm thay đổi số lượng hàng ngay lập tức. Người dùng không được báo trước chuyện này. — đã sửa: dialog xác nhận trước khi hoàn tất, nhắc "tự tạo phiếu điều chỉnh và tự duyệt" (stock-check-detail-page); thực tế phiếu điều chỉnh được tạo ở trạng thái chờ duyệt, tồn kho chỉ đổi sau khi duyệt thủ công — text nhắc hơi quá lời, chấp nhận được
   **Nên làm**: trước khi xác nhận, hiện cảnh báo: "Phiếu kiểm này sẽ tự tạo phiếu điều chỉnh tồn kho đã được duyệt. Tiếp tục?"

2. ✅ **Bật/tắt sản phẩm, khách hàng, tài khoản chỉ một cú bấm, không hỏi lại — đã sửa** — Bấm nhầm là vô hiệu hóa ngay, không hoàn tác được (tài khoản bị khóa lập tức). — đã sửa: ToggleActiveButton có AlertDialog xác nhận (sản phẩm/khách hàng/nhà cung cấp/tài khoản)
   **Nên làm**: hỏi xác nhận trước khi bật/tắt.

3. ✅ **Duyệt / từ chối phiếu điều chỉnh tồn kho không hỏi xác nhận — đã sửa** — Thay đổi tồn kho không thể hoàn tác; khi từ chối lại tự điền sẵn lý do, không hỏi người dùng. — đã sửa: dialog xác nhận duyệt/từ chối; lý do từ chối bắt buộc (>=5 ký tự)
   **Nên làm**: xác nhận trước khi duyệt/từ chối; bắt buộc nhập lý do khi từ chối.

4. ✅ **"Kiểm tra đạt" không hỏi xác nhận, không hoàn tác được — đã sửa** — Bấm nhầm là hàng về kho ngay. Nút "Trả hàng" bị mờ khi có máy đang chờ xử lý nhưng không giải thích vì sao. — đã sửa: QC đã có confirm mọi hành động (pass/hủy/gửi BH/trả) + hint card; nút "Kiểm tra đợt" không tồn tại trong FE
   **Nên làm**: hỏi xác nhận trước khi "kiểm tra đạt"; thêm chú thích cho nút bị mờ.

5. ✅ **Hủy đơn đặt hàng chỉ một cú bấm, không hỏi lại — đã sửa**. — đã sửa: Hủy đơn có dialog xác nhận
   **Nên làm**: hỏi xác nhận trước khi hủy.

6. ✅ **Mở hộp (gỡ niêm phong) không hỏi xác nhận — đã sửa**. — đã sửa: Mở hộp có dialog xác nhận
   **Nên làm**: hỏi xác nhận trước khi mở. (Lưu ý: hiện sau khi mở hộp phần mềm có phát hiện sai lệch — có thể là chủ đích; cần xác nhận với người phụ trách.)

7. ✅ **Cửa sổ chuyển hộp sang ô khác giữ thông tin cũ khi mở hộp mới — đã sửa** — Mở hộp B nhưng cửa sổ vẫn hiện ô cũ của hộp A → dễ chuyển nhầm. — đã sửa: state vị trí reset mỗi lần mở dialog, mỗi hộp có nút chuyển riêng (box-tab.tsx)
   **Nên làm**: làm mới thông tin mỗi khi mở cửa sổ.

---

## 2. Những chỗ bị chặn hoặc báo lỗi mà người dùng không hiểu vì sao

8. ✅ **Mọi người đều thấy mọi mục báo cáo — đã sửa** — Người không có quyền vẫn thấy các mục báo cáo trên màn hình chính; bấm vào mới nhận lỗi. — đã sửa: sidebar ẩn mục Dashboard/Audit theo vai trò (chỉ MANAGER/ADMIN thấy); vào thẳng URL bị chuyển sang trang 403; backend @PreAuthorize chặn mọi endpoint báo cáo
   **Nên làm**: chỉ hiển thị mục báo cáo cho người có quyền.

9. ✅ **Đang nhập dở phiếu nhập/đơn đặt hàng, bấm Quay lại thì "không có gì xảy ra" — đã sửa** — Phần mềm chặn rời trang để giữ dữ liệu nhưng không nói gì, người dùng tưởng bấm hỏng. — đã sửa: UnsavedChangesDialog nhắc rời trang sẽ mất dữ liệu (po-create, import-create)
   **Nên làm**: hiện lời nhắc "Dữ liệu chưa lưu. Rời trang sẽ mất hết?" với nút Tiếp tục / Hủy.

10. ✅ **Nút "Duyệt phiếu" hiện cho chính người tạo phiếu — đã sửa** — Người tạo phiếu nhập/xuất/trả hàng vẫn thấy nút Duyệt của phiếu mình; bấm vào bị hệ thống từ chối. — đã sửa: ẩn nút Duyệt khi người tạo (import/export detail)
    **Nên làm**: ẩn nút Duyệt với người tạo.

11. ✅ **Nút "Tạo phiếu kiểm kho" hiện cho người không có quyền — đã sửa** — Route guard `CAN_OPERATE_STOCK` cho /stock/ops/checks/new, /adjustments/new, /price-adjustments/new, /stock/units/box/new, /returns-qc/qc.

12. ✅ **Trang kho: các mục xem hàng không ẩn theo quyền — đã sửa** — Người không đủ quyền vẫn thấy và bấm được, lỗi chỉ lộ ra khi mở. — đã sửa: tab "Hộp hàng" giới hạn CAN_VIEW_INVENTORY (khớp BE — box GET chỉ cho MANAGER/ADMIN/STOCK); danh sách máy/tồn kho/phiếu xuất vẫn mở cho SALES vì BE cho (CAN_OPERATE) — đúng thiết kế vai trò; imports/ops đã giới hạn CAN_VIEW_INVENTORY từ đợt trước.

13. ✅ **Đang nhập dở thông tin sản phẩm, rời đi giữa chừng mất hết mà không được nhắc — đã sửa** — Một phần: trang **sửa** sản phẩm đã có cảnh báo rời trang (useBlocker + dialog) giữ bản nháp; trang **tạo mới** chưa có blocker và chưa lưu nháp → vẫn mất dữ liệu nếu rời giữa chừng. — đã sửa: trang tạo mới giờ có useBlocker + UnsavedChangesDialog nhắc khi đã nhập dữ liệu.
    **Nên làm**: nhắc "rời trang sẽ mất dữ liệu" khi đã nhập dữ liệu.

---

## 3. Những chỗ cho phép làm điều sai, đến cuối mới báo lỗi

14. ✅ **Phiếu xuất: chọn 1 trong 3 máy vẫn bấm Xác nhận được — đã sửa** — Đã chặn ở bước xác nhận: số serial chọn phải đủ số lượng phiếu (commit 2026-08-09).
15. ✅ **Phiếu xuất: chọn 5 máy cho phiếu chỉ cần 2 vẫn được — đã sửa** — Đã giới hạn số máy chọn theo số lượng phiếu.
16. ✅ **Phiếu trả hàng: lý do "đổi ý" sau 7 ngày bị mờ nhưng không nói vì sao — đã sửa**. — đã sửa: hint lý do "Đổi ý" hết hạn sau 7 ngày
    **Nên làm**: hiện dòng giải thích "lý do 'đổi ý' chỉ dùng trong 7 ngày kể từ khi xuất hàng" ngay cạnh nút mờ.

17. ✅ **Nhập số lượng 0 hoặc âm vẫn thêm được vào phiếu — đã sửa** — ✅ Phiếu xuất (cả "tạo phiếu" lẫn "thực xuất") đã chặn 0/âm (min={1} + guard JS); phiếu trả chặn khi gửi với toast báo; ⏳ phiếu nhập mới chỉ có min={1} trên ô nhập, chưa có guard kiểm tra đồng bộ. — đã sửa: ô số lượng phiếu nhập bị kẹp (clamp) ≥ 1 khi nhập, không thể đưa 0/âm vào phiếu; số lượng lệch (discrepancy) vốn đã chặn 0/âm.

18. ✅ **Đóng hộp với số lượng 0 vẫn qua được bước đầu — đã sửa** — Đã chặn `min=1` ở ô nhập + BE `BOX_UNIT_QTY_ZERO`.

19. ✅ **Bấm đúp nút bật/tắt — đã sửa** — Gửi 2 yêu cầu cùng lúc, có thể xảy ra lỗi. — đã sửa: nút bật/tắt bị khóa (disabled) trong lúc đang xử lý ở mọi màn hình dùng (danh mục, khách hàng, nhà cung cấp, sản phẩm, tài khoản)
    **Nên làm**: khóa nút trong lúc đang xử lý.

---

## 4. Những chỗ hiển thị dễ hiểu nhầm hoặc thiếu thông tin

20. ✅ **Kiểm kho theo khu hiển thị mã của một ô cụ thể — đã sửa** — Dễ hiểu nhầm là đã chọn ô đó. — đã sửa: phiếu kiểm theo khu hiển thị "Khu vực {mã khu}" từ đầu tới chi tiết, không lộ mã ô
    **Nên làm**: hiển thị rõ "Toàn bộ khu A".

21. ✅ **Cột "số lỗi" hiển thị "—" khi không có lỗi — đã sửa** — Nhìn như "không xác định" thay vì "không có lỗi". — đã sửa: cột số lỗi hiển thị số, 0 được tô mờ; "—" chỉ còn cho ô "chưa kiểm"
    **Nên làm**: hiển thị số 0.

22. ✅ **Nút "Tạo phiếu nhập" hiện cả khi đơn đặt hàng đã hủy — đã sửa** — Nhân viên bấm vào mới biết không dùng được. — đã sửa: ẩn nút "Tạo phiếu nhập" khi đơn đặt hàng ở trạng thái CANCELLED (po-detail-page)
    **Nên làm**: ẩn nút khi đơn đã hủy.

23. ✅ **Bộ lọc ngày bắt đầu lớn hơn ngày kết thúc không báo gì — đã sửa** — Kết quả rỗng âm thầm, người dùng tưởng không có dữ liệu. — đã sửa: lịch chặn ngày ngoài khoảng (from ≤ to / to ≥ from), không chọn được start > end ở mọi bộ lọc ngày
    **Nên làm**: báo "ngày bắt đầu không được sau ngày kết thúc".

---

## 5. Trải nghiệm lúc dùng thật (kể cả hàng lạ, trường hợp ngoài lệ)

24. ✅ **Mật khẩu tạm sau khi đặt lại hiển thị ngay trên màn hình thông báo — đã sửa** — Dễ bị người khác nhìn thấy, lại khó sao chép. — đã sửa: mật khẩu tạm ẩn mặc định (•••), có nút hiện/ẩn + nút Sao chép
    **Nên làm**: hiển thị trong cửa sổ riêng như màn hình tạo tài khoản (chỗ đó đang làm tốt).

25. ✅ **Đổi vai trò/quyền của tài khoản không cảnh báo hậu quả — đã sửa** — Người đó có thể mất quyền truy cập ngay sau khi đổi. — đã sửa: xác nhận 2 bước "Đổi vai trò của {tên} từ A thành B? Quyền truy cập thay đổi ngay lập tức" (users-page)
    **Nên làm**: mô tả hậu quả trước khi đổi.

26. ✅ **Không thể mở thẳng một mục cụ thể — đã sửa** — Ví dụ muốn gửi cho đồng nghiệp "mở ngay mục xem hàng theo lô" thì không làm được, phải bấm đi bấm lại từ đầu. — đã sửa: mọi trang chi tiết có đường dẫn thẳng (:id), bộ lọc giữ qua URL, tab trang kho giờ sync ?tab= khi bấm → F5/sao chép link giữ nguyên mục đang xem.
    **Nên làm**: giữ nguyên mục đang xem khi làm mới/đóng mở màn hình.

27. ✅ **Danh sách máy tìm kiếm xử lý quá nhiều dòng cùng lúc — đã sửa** — Khi dữ liệu lớn dần màn hình sẽ chậm rõ rệt. — đã sửa: phân trang server-side (page/pageSize) cho cả danh sách máy lẫn danh sách sản phẩm
    **Nên làm**: hiển thị theo từng trang.

28. ✅ **Danh sách hộp hàng không chia trang — đã sửa** — Khi nhiều hộp, màn hình sẽ chậm dần. — đã sửa: phân trang server-side, mặc định 20 hộp/trang
    **Nên làm**: chia trang như các danh sách khác.

---

## 6. Phiếu trả hàng & màn hình kiểm tra chất lượng (QC) — từng thao tác

### Khi lập phiếu trả
29. ✅ **Chọn máy không giới hạn theo số lượng trên phiếu — đã sửa** — Phiếu xuất 2 máy vẫn chọn 5 máy trong cửa sổ chọn, đến lúc gửi mới báo lỗi. — đã sửa: giới hạn cứng theo số lượng dòng, checkbox khóa khi đủ, hiển thị "đã chọn X/Y"
    **Nên làm**: hiện "đã chọn X/Y máy", chặn chọn vượt số lượng.

30. ✅ **Tìm nhanh máy chỉ lọc sản phẩm, không chọn luôn máy đó — đã sửa** — Bấm "Tìm sản phẩm" chỉ quay về danh sách, người dùng còn phải mở chọn số máy lần nữa → thao tác dư. — đã sửa: tra nhanh serial có nút "Thêm máy" thêm thẳng máy vào phiếu, không cần mở lại cửa sổ chọn

31. ✅ **Vị trí tự đề xuất khi nhập hàng chỉ quét các khu A-E — đã sửa** — Kho có thêm khu F, G... thì hàng không bao giờ được gợi ý đặt vào, người dùng phải tự chọn; không hề biết tính năng bỏ qua khu mới. — đã sửa: đề xuất quét toàn bộ khu trong bản đồ kho thực tế (ưu tiên khu còn sức chứa), bỏ danh sách khu cứng

32. ✅ **Chọn lý do "bảo hành" nhưng máy nguyên vẹn vẫn nằm trong phiếu — đã sửa** — Lý do "bảo hành" lẽ ra chỉ dành cho máy hư hỏng; nhưng màn hình vẫn cho phép kèm cả máy nguyên (máy nguyên ở đây chỉ làm "nhập kho", chẳng bảo hành gì) → phiếu cứ "bảo hành" lại có máy nguyên, vô nghĩa, đến lúc gửi mới báo lỗi. — đã sửa: chặn gửi phiếu khi lý do BH mà có máy nguyên
    **Nên làm**: khi chọn "Bảo hành", chỉ cho máy hư hỏng vào phiếu; có máy nguyên thì báo rõ ngay.

33. ✅ **Nút "Áp cho tất cả" ghi đè cả hàng nguyên lẫn hàng hỏng — đã sửa** — Lấy dòng đầu tiên rồi phủ lên mọi dòng, kể cả dòng có tình trạng khác (dòng 1 "nguyên → nhập kho" áp lên máy hỏng → thành "hỏng mà nhập kho", vô nghĩa) → gửi mới báo lỗi. — đã sửa: "Áp cho tất cả" bỏ qua row không hợp lệ + toast báo
    **Nên làm**: áp cho tất cả phải tự loại máy không hợp lệ và báo rõ, không để lỗi dồn đến lúc gửi.

34. ✅ **Chọn lý do "bảo hành" âm thầm đổi mọi máy hỏng thành "gửi bảo hành" — đã sửa** — Người dùng đã cố ý chọn "hủy bỏ" cho máy A, lỡ chọn lý do Bảo hành → máy A bị đổi thành "gửi bảo hành" không hỏi, không thông báo, và khi đổi lý do đi nơi khác vẫn không khôi phục (hái lần trước). — đã sửa: bảo toàn lý do đã chọn khi đổi reason, không âm thầm đổi
    **Nên làm**: hiện hộp xác nhận "đổi X máy sang gửi bảo hành?"; khi bỏ lý do bảo hành thì trả lại lựa chọn cũ.

35. ✅ **Cùng một máy có thể bị chọn trả 2 lần trong cùng 1 phiếu — đã sửa** — Phiếu xuất có 2 dòng cùng sản phẩm: người dùng mở chọn số máy của cả 2 dòng và chọn cùng 1 máy 2 lần → không bị chặn, máy bị trả 2 lần trong một phiếu. — đã sửa: chặn chọn trùng máy trong cùng phiếu
    **Nên làm**: máy đã chọn ở dòng nào thì ẩn khỏi danh sách các dòng khác.

36. ✅ **Tạo phiếu trả không lưu bản nháp — đã sửa** — F5 hoặc rời trang giữa chừng mất toàn bộ đã nhập (mô tả, ảnh, danh sách máy). Phiếu nhập/xuất đều khôi phục được bản nháp, riêng phiếu trả không. — đã sửa: lưu nháp phiếu trả — F5/rời trang không mất
    **Nên làm**: lưu nháp như phiếu nhập/xuất.

37. ✅ **Máy bảo hành bắt buộc kèm mô tả + ảnh chụp lỗi nhưng màn hình không nhắc sớm — đã sửa** — Phần mềm chỉ hiện ô ảnh khi người dùng tự biết mở; gửi phiếu mới báo thiếu, phải làm lại từ đầu. — đã sửa: mô tả + ô ảnh hiện inline cho dòng hỏng, nhắc đỏ "Bắt buộc kèm mô tả + ảnh chụp lỗi" ngay từng dòng trước khi gửi

### Khi xem/duyệt phiếu trả
38. ✅ **Nút "Duyệt" hiện cho chính người tạo phiếu trả — đã sửa** — Người tạo vẫn thấy và bấm được nút Duyệt phiếu của mình, hệ thống mới từ chối (cùng lúc với mục 10). — đã sửa: ẩn nút Duyệt phiếu trả khi người tạo
39. ✅ **Chi tiết phiếu trả hiển thị cụm từ tiếng Anh thô — đã sửa** — Lý do "bảo hành" và hành động "từ chối" không nằm trong bảng chú thích → người dùng thấy cụm kỹ thuật thay vì tiếng Việt quen thuộc. — đã sửa: lý do/hành động/tình trạng đều map sang nhãn tiếng Việt ("Bảo hành", "Từ chối")

### Màn hình kiểm tra chất lượng (QC)
40. ✅ **Nút "Hủy bỏ" và "Trả khách hàng" hiện được cho máy đang chờ gửi bảo hành — đã sửa** — ✅ BE cho phép xử lý hủy/trả cho cả đơn vị đang chờ xử lý ở khu QC (`PENDING_QC`, `RETURN_QC_HOLD`); ✅ FE ẩn/khóa nút không hợp lệ theo trạng thái máy đang chọn (DISPOSED khóa khi có máy WAITING_RMA_EXPORT; "Gửi bảo hành" chỉ hiện khi toàn bộ máy đang chờ; RETURN khóa khi có máy chờ bảo hành hoặc trộn lẫn — 2026-08-09).

41. ✅ **Màn hình QC không tìm kiếm/lọc theo máy hay sản phẩm** — Đã thêm ô tìm kiếm số máy/sản phẩm ở đầu trang QC.

42. ✅ **Hộp xác nhận QC chỉ hiện số lượng, không liệt kê máy** — Đã liệt kê số máy trong hộp xác nhận.

43. ✅ **"Gửi bảo hành" tự sinh phiếu xuất nhưng không thông báo mã phiếu** — Đã báo "đã tạo phiếu xuất EXP-xxx" kèm nút mở chi tiết.

44. ✅ **Mục "đã xử lý" coi "trả khách hàng" là xong — đã sửa** — Máy bị "từ chối trả hàng" hiển thị như đã xử lý xong. — đã sửa: REJECTED_RETURN ra khỏi tab "Đã xử lý", vào tab xử lý với 2 lối thoát: "Đưa về khu QC" (kiểm lại như hàng trả mới) và "Chuyển chờ hủy" (xử lý hủy/trả ở tab này)

---

## 6. Trang tổng quan (dashboard) — số liệu và thao tác

45. ✅ **Bộ lọc ngày trên báo cáo lệch 1 ngày so với lịch Việt Nam — đã sửa** — Phần mềm tính theo giờ quốc tế (cách giờ Việt Nam 7 tiếng): chọn "từ 01/08" thực tế mất 7 tiếng đầu ngày 01/08, "đến 09/08" lại kéo thêm 7 tiếng của ngày 10/08. Lịch mặc định cũng bị lệch → mọi báo cáo theo ngày đều cắt/tràn biên. — đã sửa: localDayStartUtc/localDayEndUtc quy đổi ngày Việt Nam sang mốc UTC đúng (+7h) trong utils/format.ts, mọi tab báo cáo đều dùng chung
    **Nên làm**: tính theo giờ Việt Nam cho các báo cáo ngày.

46. ✅ **Top 10 giá trị: đường lũy kế chạm 100% sau đúng 10 cột — đã sửa** — Đường "phần trăm cộng dồn" chỉ tính trên 10 mục đang hiển thị nên mốc 80% không còn nghĩa "80% giá trị kho"; biểu đồ ABC cùng kiểu ở thẻ giá trị lại tính trên toàn bộ — hai nơi hai cách. — đã sửa: % cộng dồn tính trên tổng giá trị toàn kho

47. ✅ **Mũi tên tăng/giảm "so với tháng trước" là con số ước tính, không ghi chú — đã sửa** — Được tính lấy giá trị hiện tại trừ đi số tiền mua vào 30 ngày gần nhất rồi cộng số tiền bán ra 30 ngày gần nhất; nếu kho xoay vòng nhanh có thể lệch xa thực tế, còn tự ẩn đi khi ra số âm — nhưng hiển thị chắc chắn như số thật. — đã sửa: ghi chú ước tính khi hover mũi tên delta
48. ✅ **Dashboard không tự cập nhật sau khi làm kho — đã sửa** — Sau khi nhập/xuất/kiểm kho xong, các ô tóm tắt và Top 10 vẫn giữ số cũ; muốn thấy số mới phải chờ vài phút hoặc tải lại trang. — đã sửa: bỏ refetchOnMount:false ở hooks báo cáo (mount lại là fetch mới); thao tác nhập/xuất/QC/kiểm kho/điều chỉnh giờ invalidate toàn bộ cache dashboard qua invalidateDashboard() (use-reports.ts)
49. ✅ **Trang "hoạt động gần đây": thay đổi khoảng ngày không trở về trang đầu — đã sửa** — Đang ở trang 2+ rồi thu hẹp ngày, bảng về trống và không có nút để quay về trang đầu. — đã sửa: đổi lọc ngày hoặc giá trị tự về trang đầu (cả dashboard lẫn trang audit)
50. ✅ **Xuất file danh sách "hàng sắp hết" chỉ lấy các dòng trên trang đang xem — đã sửa** — Đang trang 3/5, file xuất ra chỉ có 20 dòng của trang 3, không báo trước. — đã sửa: export tải lại toàn bộ dữ liệu (size = tổng số) trước khi xuất CSV, độc lập trang đang xem

**Các nút nhảy từ bảng điều khiển đi xử lý (đang phải):**
51. ✅ **Mục "hàng tồn lâu" bấm "Xử lý" chỉ về trang danh sách sản phẩm trắng — đã sửa** — Không sản phẩm nào được tô sáng/chọn trước. — đã sửa: "Xử lý" mở thẳng trang sửa sản phẩm
52. ✅ **"Chưa phân loại → Xem và phân loại" về trang sản phẩm nhưng không có bộ lọc sẵn — đã sửa** — Người dùng phải tự lọc lại từ đầu. — đã sửa: filter=uncategorized chọn sẵn bộ lọc "Chưa phân loại"

---

## 7. Những màn hình làm rất tốt (giữ nguyên chuẩn này khi sửa chỗ khác)

- **Đóng hộp hàng**: thanh tiến trình sức chứa, kiểm tra vượt sức chứa, quét mã vạch/camera, tự điền vị trí, kết thúc rõ ràng.
- **Tạo phiếu điều chỉnh tồn kho**: khôi phục bản nháp khi bị ngắt, lý do có sẵn, lịch sử máy + cảnh báo phiếu đang chờ duyệt, kết quả theo từng máy, ảnh chứng cứ.
- **Tạo phiếu điều chỉnh giá**: nhắc "dữ liệu chưa lưu" khi rời trang, hiển thị phần trăm chênh lệch trực tiếp, cảnh báo khi chênh lệch quá 50%, định dạng tiền đúng.
- **Chi tiết phiếu nhập/xuất**: mọi thao tác duyệt/hủy đều có xác nhận, xuất file, in, quyền hiển thị đúng.
- **Nhật ký hoạt động**: bộ lọc dễ bấm, so sánh trước/sau có màu, đếm kết quả.
- **Bản đồ kho**: phóng to theo cấp khu → kệ → ô, chế độ kéo thả có đếm ngược/số lượng, xác nhận trước khi xóa/tắt, chú giải màu theo mức đầy.
- **Đề xuất xuất kho**: khôi phục bản nháp, báo nhà cung cấp không khớp ngay khi nhập, giới hạn số lượng theo tồn.
- **Danh sách phiếu nhập/xuất**: duyệt/hủy đều xác nhận, mọi nút đều có chú thích.

---

## 8. Câu hỏi cần xác nhận nghiệp vụ

- **Q1**: Nút "Thêm khách hàng" nên hiển thị cho những ai? (hiện chỉ quản lý thấy, nhưng quyền thực tế rộng hơn)
- **Q2**: Duyệt phiếu nhập/xuất — hệ thống có chặn người tạo tự duyệt không? Nếu có, nên ẩn nút Duyệt với người tạo ngay trên màn hình.
- **Q3**: Hoàn tất phiếu kiểm kho sẽ tự tạo + tự duyệt phiếu điều chỉnh — có đúng ý định không? Nếu giữ, màn hình phải cảnh báo trước khi xác nhận.
- **Q4**: "Kiểm tra đạt" — có cần xác nhận/hoàn tác không, hay chấp nhận rủi ro bấm nhầm vì cần thao tác nhanh?
- **Q5**: Xuất thiếu máy so với số lượng phiếu — nên **chặn** (không cho xác nhận) hay **cảnh báo mạnh** (vẫn cho phép)?
- **Q6**: Đang điền dở dở, bấm Quay lại — nên hỏi "mất dữ liệu?" hay cho rời tự do? (đã có chức năng khôi phục bản nháp cho phiếu nhập/xuất, nên hỏi mỗi lần rời có thể hơi phiền)
- **Q7**: Từ chối phiếu điều chỉnh — có bắt buộc nhập lý do không?
- **Q8**: Mở hộp (gỡ niêm phong) — nên xác nhận trước hay giữ cơ chế hiện tại "mở rồi mới phát hiện sai lệch"?
