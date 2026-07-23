# Team Workflow — Quy trình làm việc nhóm

> File này thay thế toàn bộ quy trình làm việc cũ.
> Áp dụng ngay khi đọc xong. Mọi thắc mắc → brainstorm, ko tự ý sửa ngoài quy trình.

---

## 1. Archive — Docs cũ

Toàn bộ `docs/` (plan cũ) đã được archive. Lý do:

- Được gen từ requirement, ko từ codebase → hallucination, ko fit code thực tế.
- Quy trình cũ (scrum-style: plan → code → review → ship) không phù hợp với vibecode:
  Với vibecode, codebase thay đổi từng ngày, doc phải bám codebase, ko phải codebase bám doc.
- Giữ lại để tham khảo lịch sử, nhưng **không dùng làm context cho agent** nếu chưa sync với codebase.

---

## 2. Tại sao cần thay đổi cách làm việc

### 2.1. Tốc độ thiếu trọng tâm tạo ra lãng phí

30+ commits được ship trong 2 ngày, nhưng role SALES bị vỡ hoàn toàn — 29 files phải sửa lại sau đó. Điều này cho thấy việc làm feature dàn trải song song mà không verify end-to-end cho từng role tạo ra rework, không phải tiến triển. Một cách tiếp cận flow-by-flow (cuốn chiếu theo luồng) sẽ loại bỏ lãng phí này: mỗi flow được làm xong hẳn cho tất cả role liên quan rồi mới chuyển sang flow tiếp theo.

### 2.2. Documentation phải bắt kịp code, không phải ngược lại

Các doc hiện tại có những phân tích domain hữu ích nhưng cũng chứa mâu thuẫn nội bộ (quyền import của SALES, thiếu role trong approval matrix, v.v.). Chờ doc hoàn chỉnh rồi mới code đi ngược với tinh thần vibecode — vì chính người viết doc cũng không theo doc đó khi code. Thay vào đó: build flow chạy trước, update doc để khớp với thực tế, không phải đợi doc xong mới code.

### 2.3. "Vibecode 100%" — cần cam kết đầy đủ

Đã thống nhất vibe-code. Nhưng nửa vời (plan theo waterfall, execute kiểu vibe) tạo ra friction: một người lên plan rộng, người kia đi fix bug từ plan đó. Cam kết đầy đủ nghĩa là:

- Agent build 1 flow end-to-end
- User verify flow chạy đúng với role đã định
- Xong hẳn flow đó mới sang flow tiếp theo

Cách này nhanh hơn, dễ dự đoán hơn, và dễ phối hợp hơn so với làm dàn trải.

---

## 3. Team Roles

| Người | Vai trò | Trách nhiệm |
|-------|---------|-------------|
| **Tùng Anh** | Project Owner | Quyết định scope, feature, business logic, priority. Viết scope + flow doc. |
| **Khánh** | Process Owner + Dev | Xây quy trình làm việc, vibe workflow, implement, verify. |
| **Hưng** | Dev | Implement, verify. Cùng quyền nhận việc như mọi thành viên. |

### Nguyên tắc chung

- **Project Owner** quyết định WHAT (làm gì, tại sao, business rule thế nào).
- **Process Owner** quyết định HOW (quy trình ra sao, vibe thế nào, verify kiểu gì).
- Khi implement, mọi thành viên đều có quyền tự nhận việc — ko phân công từ trên xuống.
- Không có "leader giao task." Có "danh sách việc cần làm, ai thấy phù hợp thì nhận."

---

## 4. Feature Pipeline

### 4.1. Scope + Flow Doc — Tùng Anh (Project Owner)

Tùng Anh viết 1 file `.md` ngắn cho từng feature:

- **Scope:** Feature này là gì, role nào liên quan, business rule cốt lõi.
- **Flow:** Luồng từ đầu đến cuối — ai làm gì, trạng thái nào, ai duyệt ai tạo. Viết dựa trên codebase hiện tại, ko phải requirement ảo.

Không cần chi tiết kỹ thuật (endpoints, routes, guard, entity mapping) — cái đó dev tự xử ở bước implement. Chỉ cần business logic đủ để dev hiểu "cần làm cái gì."

**Output:** Danh sách feature cần làm.

```
Feature List
├── Import Receipt (scope + flow done)
│   ├── STOCK tạo nhập → MANAGER duyệt → ADMIN backup
│   └── Gồm: draft → confirm → approve / cancel
├── Export Receipt (need scope)
├── Warranty (need scope)
└── ...
```

Danh sách này là **sống** — có thể thêm/bớt/reorder bất cứ lúc nào, ko cần sprint, ko cần backlog tool.

### 4.2. Tự nhận việc — Không phân công

- Ai muốn làm feature nào thì **tự nhận**, ko ai chỉ định.
- Feature khó quá hoặc ko ai tự tin → **brainstorm với team** hoặc **bỏ qua** (chuyển làm feature khác).
- Feature nhỏ nhưng ko ai nhận → Tùng Anh quyết định: hoặc tự làm, hoặc drop.
- Nhiều người nhận 1 feature → làm chung, ai làm phần đó tự quyết, ko cần chia nhỏ task.
- **Mục tiêu:** không có chuyện "thằng A ngồi chờ thằng B giao việc." Thấy việc thì nhận. Ko thấy thì hỏi.

### 4.3. Implement — Code chạy được trên MỌI máy

Implement theo flow doc. Agent gen từ **codebase hiện tại**, ko từ doc cũ — vì doc cũ ko fit codebase, agent dùng sẽ hallucinate.

**Nguyên tắc flow-by-flow:**

- **1 flow tại 1 thời điểm.** Hoàn thành flow đó cho tất cả role liên quan rồi mới chuyển.
- **Code trước, doc sau.** Build software chạy được, rồi update doc cho khớp — không chờ doc xong.
- **Role layering.** Test với STOCK trước, thêm MANAGER (duyệt), rồi ADMIN (backup duyệt).
- **Không làm feature ngoài flow.** Không UI polish, không map view, không thay đổi DB không liên quan.

**Cam kết bắt buộc (ko negotiate):**

> Code phải chạy ngon trên máy của **tất cả thành viên còn lại trong team.**
> Máy Khánh chạy, máy Hưng chết → chưa xong. Fix tiếp.
> Máy chạy local hết rồi mới commit + merge.

Lý do: Vibecode gen nhanh, nhưng gen xong ko kiểm tra kỹ dễ gây lỗi môi trường, lỗi merge, lỗi migration. Cam kết "chạy mọi máy" là rào chắn cuối trước khi lỗi vào codebase chung.

**Luật vibe khi implement:**

1. **Gen từ codebase** — đọc file thật trong project, ko dùng doc cũ làm context.
2. **1 flow 1 lần** — ko gen 2 feature cùng lúc. Xong hẳn flow A mới sang flow B.
3. **Verify liền** — gen xong test ngay với từng role, ko để đống rồi verify sau.
4. **Không ship bug cho người khác** — nếu thấy lỗi nhưng ko phải phần mình, vẫn phải báo. Im lặng = đồng lõa.
5. **Bug phát hiện → fix ngay trong flow**, không để tồn đọng.

### 4.4. Tổng hợp — Changelog ngắn

Sau khi implement + verify xong:

```markdown
## 2026-07-23 — Import Receipt flow
- BE: thêm endpoints, PreAuthorize constants
- FE: route guard, navigation, form
- Commit: 10ddc35, 69e6822
- Đã test với STOCK, MANAGER, ADMIN — chạy ổn
```

Ghi ngắn. Dùng để trace sau này. **Không phải backlog, không phải story point.**
Chỉ là "ai làm gì, commit nào, chạy được chưa."

---

## 5. Cam kết với nhau

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

## 6. Khi có bất đồng

1. Nói thẳng, nói sớm. Ko im lặng rồi tự sửa.
2. Nếu bất đồng về business — Tùng Anh quyết định.
3. Nếu bất đồng về kỹ thuật/quy trình — Khánh quyết định.
4. Nếu cả 2 đều ko chắc — cùng research, cùng brainstorm, ko ai tự quyết.
5. Ko có chuyện "thắng thua" — chỉ có "cái nào tốt cho project."

---

## 7. Merge main

- Ai cũng merge được. Không cần xin phép, không cần code review bắt buộc.
- Không có gatekeeper, không có leader duyệt.
- Nhưng merge xong phải **test chạy ổn trên máy của ít nhất 1 người khác.**
- Nếu merge main mà main die → người merge tự fix, ko đẩy cho người khác.
- Merge về main xong thì **tự chịu trách nhiệm** — main die là lỗi của người merge, ko phải lỗi "team không có quy trình."

---

*File này được viết để thay thế quy trình làm việc cũ. Đọc xong, nếu đồng ý — làm theo. Nếu không — phản biện, đừng tự sửa.*
