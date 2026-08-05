# Team Workflow — Quy trình làm việc nhóm

> Thay thế quy trình cũ. Mọi thắc mắc → brainstorm, ko tự ý sửa ngoài quy trình.

---

## 1. Tại sao cần thay đổi cách làm việc

Vibecode flow-by-flow nhanh hơn scrum-style (plan → code → review → ship). Lý do:

- **Flow-by-flow:** hoàn thành 1 flow cho tất cả role liên quan rồi mới chuyển. Ko feature sprawl, ko rework.
- **Code trước, doc sau:** codebase mới là thật, doc bám codebase, ko phải codebase bám doc.
- **Verify liền:** gen xong test ngay với từng role, ko để đống rồi verify sau.
- **Tốc độ:** agent gen nhanh, verify nhanh, ko chờ doc hoàn chỉnh.

---

## 2. Team Roles

| Người | Vai trò | Trách nhiệm |
|-------|---------|-------------|
| **Tùng Anh** | Project Owner | Quyết định scope, feature, business logic, priority. Viết scope + flow doc. Implement, verify như member khác. |
| **Khánh** | Process Owner + Dev | Xây quy trình làm việc, vibe workflow, implement, verify. |
| **Hưng** | Dev | Implement, verify. Cùng quyền nhận việc như mọi thành viên. |

### Nguyên tắc chung

- **Project Owner** quyết định WHAT (làm gì, tại sao, business rule thế nào).
- **Process Owner** quyết định HOW (quy trình ra sao, vibe thế nào, verify kiểu gì).
- Khi implement, mọi thành viên đều có quyền tự nhận việc — ko phân công từ trên xuống.
- Không có "leader giao task." Có "danh sách việc cần làm, ai thấy phù hợp thì nhận."

---

## 3. Feature Pipeline

### 3.1. Scope + Flow Doc — Tùng Anh

Viết 1 file `.md` cho mỗi flow trong `docs/flows/`. Format:

```markdown
# {n} — {Tên Flow}

## Scope
**Input:** dữ liệu cần có để flow bắt đầu và vận hành.
**Output:** kết quả sau từng bước trong flow (không chỉ kết cuối).

## Object Lifecycle
Domain object chính đi qua những trạng thái nào, transition gì, business rule gì.

Ví dụ — Import:
- ImportReceipt: DRAFT → (confirm) → PENDING_APPROVAL → (approve) → COMPLETED
- ProductUnit: PENDING_QC → IN_STOCK → SOLD / DEFECTIVE / DISPOSED
- Rule: người tạo ko approve phiếu mình
- Rule: cancel chỉ khi chưa COMPLETED

Nếu thêm business mới — ghi rõ: cái này làm gì, vì sao cần, input gì, output gì.

## Flow
Option — mermaid flowchart / sequence nếu cần.
```

Chỉ cần business logic đủ để dev hiểu. Ko cần endpoints, routes, guard, entity mapping — dev tự xử ở bước implement.

Đây là **snapshot codebase hiện tại**. Nếu viết cái gì chưa có trong codebase → phải nói rõ lý do.

Sau khi implement + verify + merge main → rename file thành `{n}-{name}_done.md`.

### 3.2. Tự nhận việc — Không phân công

- Ai muốn làm feature nào thì **tự nhận**, ko ai chỉ định.
- Feature khó quá hoặc ko ai tự tin → **brainstorm với team** hoặc **bỏ qua**.
- Feature nhỏ nhưng ko ai nhận → Tùng Anh quyết định: hoặc tự làm, hoặc drop.
- Nhiều người nhận 1 feature → làm chung, ai làm phần đó tự quyết.
- **Mục tiêu:** không có chuyện ngồi chờ người khác giao việc.

### 3.3. Implement — Code chạy được trên MỌI máy

> **Trước khi implement:** đọc codebase, so sánh với flow doc. Nếu có gap (codebase thiếu, doc sai, hoặc business cần thứ mới) → confirm với teamate liên quan rồi mới code. Hoặc tự implement nhưng phải đảm bảo ko conflict với phần còn lại.

#### Context cho agent

- **Context duy nhất:** `docs/flows/` + codebase. 
- Các file khác trong `docs/` (`01-domain-model.md`, `02-sop-nghiep-vu.md`, `flow-be.md`, `flow-fe.md`, `role-capabilities.md`...) — chỉ con người đọc. Agent **ko dùng làm context** nếu chưa được verify với codebase.
- **Plan mode:** đọc codebase, tìm gap trong flow. Có gap → hỏi user, ko tự implement.
- **Build mode:** đọc codebase, phát hiện gap → báo user + **dừng implement**.

#### Luật vibe khi implement

1. **Gen từ codebase** — đọc file thật trong project, ko dùng doc cũ làm context.
2. **1 flow 1 lần** — ko gen 2 feature cùng lúc. Xong hẳn flow A mới sang flow B.
3. **Verify liền** — gen xong test ngay với từng role, ko để đống rồi verify sau.
4. **Không ship bug cho người khác** — nếu thấy lỗi nhưng ko phải phần mình, vẫn phải báo. Im lặng = đồng lõa.
5. **Bug phát hiện → fix ngay trong flow**, không để tồn đọng.

#### Cam kết bắt buộc

> Code phải chạy ngon trên máy của **tất cả thành viên còn lại trong team.**
> Máy Khánh chạy, máy Hưng chết → chưa xong. Fix tiếp.
> Máy chạy local hết rồi mới commit + merge.

### 3.4. Tổng hợp — Changelog ngắn

Sau khi implement + verify xong:

```markdown
## 2026-08-05 - Box flow (Phase 4 gap)
- Box: BULK split khi seal (quantity < remaining -> tách dòng), lock PESSIMISTIC_WRITE qua findByIdsForUpdate (không loại unit đang trong phiếu kiểm - B.9)
- Export: khi lẻ không đủ -> message "còn X trong hộp [boxCode] tại [vị trí]" (EXPORT_NOT_ENOUGH_LOOSE)
- FE: xác nhận nguyên hộp + đóng vào hộp trong phiếu kiểm, tạo phiếu kiểm khi unseal lệch, seal dialog dùng chung (BULK qty input)
- Tests: BoxServiceTests (4), StockCheckServiceTests (3), box-flow integration +3 assertions, +1 test B.9

## 2026-07-24 - Export Receipt flow
- BE: thêm endpoints, PreAuthorize constants
- FE: route guard, navigation, form
- Commit: 10ddc35, 69e6822
- Đã test với SALES, STOCK, MANAGER, ADMIN - chạy ổn
```

Ghi ngắn. Dùng để trace sau này.

---

## Nguyên tắc Box (B.3 - ghi nguyên văn)

**SEALED chặn ở tầng vận hành (export không lấy unit trong box), không chặn ở tầng đổi status của domain khác.**

- Unit trong box SEALED vẫn thuộc quyền kiểm soát kho: vẫn xuất hiện trong kiểm kho (scope ZONE/BOX), vẫn đổi status bởi các domain khác (ex: kiểm kho ghi nhận LOST/DAMAGED) - chỉ cấm thao tác xuất kho lấy hàng ra khỏi hộp khi hộp chưa mở.
- Mở hộp (unseal) trả unit về lẻ với locationId = location của hộp (sync location khi move).
- Chặn tại chỗ nào lấy unit ra khỏi hộp khi xuất: tại query chọn unit khả dụng (boxId IS NULL) + chặn serial cụ thể đang trong hộp SEALED.

---

## 4. Cam kết với nhau

1. **Doc là living — codebase mới là thật.**
   Nếu doc sai, sửa doc theo codebase. Ko bao giờ sửa codebase cho khớp doc cũ.

2. **Việc tự nhận, không phân công.**
   Không có chuyện ngồi chờ task. Không có chuyện đổ tại "ko ai giao việc."

3. **Code chạy mọi máy mới xong.**
   Không có "máy tôi chạy được." Nếu máy khác không chạy, sửa đến khi chạy được mới merge.

4. **Bug phát hiện → báo ngay, fix ngay, ko dồn.**
   Bug nhỏ để quên → cuối ngày thành bug to → cuối tuần thành critical.

5. **Không tự ý sửa ngoài quy trình.**
   Không thêm feature ko có trong scope. Không sửa kiến trúc ko bàn trước.
   Nếu muốn thay đổi — brainstorm với team trước, ko tự code rồi merge.

6. **Tôn trọng thời gian của nhau.**
   Commit có test = tôn trọng. Commit xong để người khác dọn = ko tôn trọng.

---

## 5. Khi có bất đồng

1. Nói thẳng, nói sớm. Ko im lặng rồi tự sửa.
2. Nếu bất đồng về business — Tùng Anh quyết định.
3. Nếu bất đồng về kỹ thuật/quy trình — Khánh quyết định.
4. Nếu cả 2 đều ko chắc — cùng research, cùng brainstorm, ko ai tự quyết.
5. Ko có chuyện "thắng thua" — chỉ có "cái nào tốt cho project."

---

## 6. Merge main

- Ai cũng merge được. Không cần xin phép, không cần code review bắt buộc.
- Không có gatekeeper, không có leader duyệt.
- Nhưng merge xong phải **test chạy ổn trên máy của ít nhất 1 người khác.**
- Nếu merge main mà main die → người merge tự fix, ko đẩy cho người khác.
- Merge về main xong thì **tự chịu trách nhiệm** — main die là lỗi của người merge, ko phải lỗi "team không có quy trình."

---

*Đọc xong, nếu đồng ý — làm theo. Nếu không — phản biện, đừng tự sửa.*
