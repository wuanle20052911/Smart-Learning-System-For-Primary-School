# Brief thuyết trình — Smart Learning System for Primary School

> Tài liệu đầu vào cho AI tạo slide và người thuyết trình. Nội dung được đối chiếu với mã nguồn hiện có, `README.md`, `PLAN.md` và SRS tại ngày 26/10/2026. Repo đã cập nhật tới `main` / commit `e57aa7a`.
>
> **Nguyên tắc quan trọng:** phân biệt rõ tính năng đã có trong ứng dụng với yêu cầu trong SRS hoặc kế hoạch tương lai. Không tự thêm số liệu kết quả, người dùng, triển khai production hay tính năng chưa có bằng chứng.

## 1. Tóm tắt dự án

**Tên đề tài:** Hệ thống hỗ trợ giao bài tập và đánh giá quá trình học tập cho học sinh tiểu học dựa trên Learning Analytics và Trí tuệ nhân tạo.

**Tên sản phẩm trên giao diện:** MathJoy.

**Một câu giới thiệu:** MathJoy kết nối bài học, bài tập và kết quả học tập để học sinh có thể luyện tập, giáo viên theo dõi lớp và dùng AI hỗ trợ tạo câu hỏi, tra cứu học liệu, đưa ra gợi ý có căn cứ.

**Vấn đề giải quyết:** tài liệu, bài tập và kết quả của học sinh thường nằm rời rạc; giáo viên khó nhìn nhanh ai cần hỗ trợ; học sinh cần biết nên học gì tiếp theo. Hệ thống gom các hoạt động học tập vào cùng một quy trình và dùng dữ liệu đã ghi nhận để hỗ trợ quyết định của giáo viên, không thay thế giáo viên.

**Trạng thái thực tế:** repo chứa ứng dụng web có thể chạy cục bộ, frontend/backend, migration Supabase, kiểm thử và cấu hình Docker Compose. Cần cấu hình Supabase và Ollama riêng. Repo không cung cấp URL deployment công khai hay tài khoản demo dùng chung.

## 2. Người dùng và trạng thái chức năng

| Nhóm | Hiện có trong ứng dụng | Giá trị |
|---|---|---|
| Học sinh | Đăng nhập/đăng ký, xem bài học đã xuất bản, làm bài được giao và luyện tập, xem kết quả/lịch sử/hồ sơ năng lực, nhận gợi ý học tập, xem bảng xếp hạng lớp | Biết mình đang học gì, bài nào cần làm và kết quả thay đổi ra sao |
| Giáo viên | Quản lý lớp và học sinh, tạo bài học, tạo/chỉnh sửa/giao bài tập, dùng ngân hàng câu hỏi, xem bài nộp/nhận xét, dashboard phân tích và cảnh báo | Tổ chức hoạt động học tập, xem bằng chứng học tập và ưu tiên hỗ trợ |
| Quản trị viên | Tạo tài khoản giáo viên, quản lý tài khoản học sinh/giáo viên, khóa/mở tài khoản, quản lý lớp và giáo viên phụ trách, xem telemetry sử dụng AI | Quản lý vận hành ở cấp hệ thống |
| Phụ huynh | Có yêu cầu trong SRS về theo dõi tiến độ, điểm mạnh/yếu và khuyến nghị của con; **chưa thấy role, màn hình hoặc API dành cho phụ huynh trong code hiện tại** | Trình bày như hướng phát triển/yêu cầu cần hoàn thiện, không giới thiệu là chức năng đã chạy |

Đăng ký công khai tạo tài khoản học sinh. Tài khoản giáo viên được quản trị viên tạo; tài khoản quản trị đầu tiên được bootstrap qua Supabase. OAuth Google là tùy chọn khi cấu hình Supabase.

## 3. Luồng sử dụng tiêu biểu

### Luồng học sinh

1. Đăng nhập và vào trang học tập.
2. Chọn bài học đã xuất bản theo môn/chương; xem học liệu.
3. Làm bài giáo viên giao hoặc luyện tập từ ngân hàng câu hỏi gắn với bài học.
4. Hệ thống chấm theo đáp án, hiển thị kết quả và giải thích; bài làm được lưu để xem lại.
5. Hồ sơ năng lực tổng hợp lượt làm, số câu đúng và độ chính xác theo bài/chủ đề.
6. Trợ lý có thể gợi ý bài tiếp theo, bài cần ôn hoặc bài tập chưa nộp dựa trên dữ liệu hiện có.

### Luồng giáo viên

1. Tạo lớp và thêm học sinh bằng email; quản lý danh sách lớp.
2. Tạo bài học, chọn học liệu hoặc liên kết file lưu trong Supabase Storage.
3. Tạo bài tập từ nội dung bài học hoặc tài liệu; chọn dạng/số câu.
4. Giáo viên xem, sửa, thêm/bớt câu hỏi trước khi xuất bản cho lớp và có thể đặt hạn nộp.
5. Theo dõi bài nộp, xem bài làm và gửi nhận xét.
6. Xem phân tích lớp, hồ sơ học sinh, cảnh báo đang mở và lịch sử cảnh báo đã đóng.

### Luồng AI tạo câu hỏi

`Chọn bài học/tài liệu → trích xuất nội dung → chọn loại câu hỏi và số lượng → Ollama tạo câu hỏi → kiểm tra cấu trúc/đáp án và phản biện AI → giáo viên xem/sửa → giao cho lớp`

## 4. Chức năng theo vai trò

### Học sinh

- Danh mục bài học theo chương; chỉ hiển thị bài học được xuất bản.
- Bài tập được giao, hạn nộp và trạng thái đã làm/chưa làm/quá hạn.
- Trắc nghiệm, đúng/sai, điền khuyết, trả lời ngắn và nối cặp.
- Kết quả, đáp án, giải thích và lịch sử bài làm.
- Hồ sơ năng lực tổng hợp độ chính xác theo bài/chương.
- Trợ lý học tập và khuyến nghị theo bài tập, kết quả và bài học hiện có.
- Điểm học tập, mục tiêu học hằng ngày, chuỗi ngày học và bảng xếp hạng lớp. Thời gian học và streak ở giao diện dùng local storage; không nên giới thiệu chúng là phép đo analytics phía máy chủ.

### Giáo viên

- Dashboard tổng quan và các khu vực: lớp, bài học, bài tập, ngân hàng câu hỏi, học sinh, bài nộp/nhận xét, phân tích học tập.
- Tạo/sửa/xóa/xuất bản bài học; liên kết file học liệu.
- Tạo câu hỏi bằng AI, kiểm tra và chỉnh sửa trước khi giao; lưu câu hỏi vào ngân hàng để tái sử dụng.
- Giao bài cho lớp, cấu hình hạn nộp; hệ thống chặn nộp bài quá hạn ở phía API/database theo migration.
- Xem kết quả, hồ sơ học sinh, các chỉ số tổng hợp và lý do cảnh báo.

### Quản trị viên

- Quản lý tài khoản học sinh và giáo viên, khóa/mở tài khoản.
- Tạo tài khoản giáo viên; tạo/sửa lớp và gán giáo viên phụ trách; thêm học sinh vào lớp.
- Dashboard quan sát AI: số yêu cầu thành công/thất bại, độ trễ trung bình, token vào/ra và yêu cầu gần đây. Đây là telemetry vận hành, không phải thước đo chất lượng học tập.

## 5. AI làm gì trong sản phẩm?

AI là các luồng xử lý trong sản phẩm, không chỉ là một cửa sổ chat chuyển tiếp prompt.

### A. Tạo và kiểm tra câu hỏi

- Chạy model qua **Ollama local**; không gọi API AI thương mại bên ngoài trong luồng sinh câu hỏi.
- Giáo viên cung cấp nội dung bài học hoặc tải tài liệu dạng PDF, DOCX, TXT, Markdown; có thể nhập nội dung thủ công.
- Hỗ trợ năm dạng: trắc nghiệm, đúng/sai, điền chỗ trống, trả lời ngắn, nối cặp.
- Có giới hạn lớp 1–5, độ khó, số câu (1–10), kích thước học liệu và hướng dẫn bổ sung.
- Hệ thống xác thực cấu trúc, phương án/đáp án, câu hỏi trùng; có kiểm tra phép tính số học và một lượt phản biện câu hỏi bằng model.
- Câu không qua kiểm tra có thể bị loại; số câu trả về có thể thấp hơn yêu cầu. Giáo viên vẫn là người duyệt và chỉnh sửa cuối cùng.

### B. Hỏi đáp từ học liệu (RAG)

- Nguồn là các file Markdown trong Supabase Storage; dữ liệu được chia đoạn, embedding bởi Ollama và lưu trong Supabase với pgvector.
- Khi hỏi, hệ thống tìm đoạn liên quan, áp dụng ngưỡng tương đồng và gửi bằng chứng cho model trả lời.
- Câu trả lời cần dẫn ID nguồn hợp lệ; nếu không có bằng chứng/trích dẫn phù hợp thì hệ thống từ chối trả lời thay vì đoán.
- Giao diện hiển thị nguồn; có tùy chọn xem các đoạn truy xuất và điểm tương đồng để kiểm tra.
- Nội dung hội thoại chỉ ở trạng thái giao diện hiện tại, không lưu làm lịch sử chat trong Supabase; tải lại/đóng phiên sẽ mất hội thoại.

### C. Gợi ý học tập theo dữ liệu và ý định

- Trợ lý phân biệt câu hỏi về bài tập, gợi ý học gì và câu hỏi kiến thức.
- Ý định được nhận diện bằng luật từ khóa trước, sau đó có thể dùng model Ollama; nếu local AI lỗi thì dùng fallback xác định.
- Gợi ý là logic nghiệp vụ: ưu tiên bài chưa nộp gần hạn, bài cần ôn theo kết quả, rồi bài học tiếp theo. Ví dụ bài yếu chỉ được xét khi có ít nhất 3 câu trả lời được ghi nhận và độ chính xác dưới 70%.
- Không nên mô tả đây là mô hình dự đoán cá nhân hóa đã được huấn luyện hoặc đã chứng minh hiệu quả.

### D. Telemetry

- Backend ghi nhận feature/model/prompt version, token, độ trễ, công cụ và mã trạng thái cho các yêu cầu AI.
- Quản trị viên xem thống kê 30 ngày và luồng cập nhật realtime.
- Migration mới nhất bỏ dữ liệu chi phí AI ước tính; không trình bày chi phí AI như số liệu được hệ thống hiện đo.

## 6. Learning Analytics và cảnh báo

**Dữ liệu đầu vào:** lượt làm bài đã lưu, điểm/số câu, bài tập đã giao, hạn nộp, bài nộp và danh sách học sinh trong lớp.

**Chỉ số đang hiển thị:** số học sinh theo dõi, lượt làm, điểm trung bình, độ chính xác, tỷ lệ bài quá hạn đã nộp, học sinh cần hỗ trợ và trạng thái “chưa đủ dữ liệu”.

**Quy tắc cảnh báo hiện có (rule-based):**

- Chỉ xét mức điểm khi có ít nhất 3 lượt làm hợp lệ.
- Điểm trung bình dưới 50%: nguy cơ cao; dưới 65%: cần theo dõi.
- Khi có ít nhất 4 lượt làm, so sánh hai lượt gần nhất với hai lượt trước đó: giảm từ 15 điểm phần trăm trở lên là cao; từ 10 điểm trở lên là cần theo dõi.
- Chỉ xét nộp muộn khi có ít nhất 2 bài quá hạn; nhiều bài chưa nộp hoặc tỷ lệ chưa nộp cao có thể nâng mức cảnh báo.
- Khi thiếu bằng chứng tối thiểu, hiển thị “Chưa đủ dữ liệu”, không kết luận rủi ro.
- Cảnh báo có lý do hiển thị được, được lưu và cập nhật/đóng khi phân tích lại.

**Thông điệp khi thuyết trình:** đây là cảnh báo hỗ trợ giáo viên ưu tiên quan sát; không phải chẩn đoán, kết luận năng lực hay quyết định thay giáo viên. Công thức hiện tại là các ngưỡng nghiệp vụ, không phải mô hình ML dự báo đã được kiểm định.

## 7. Kiến trúc kỹ thuật

```text
Trình duyệt
  React 19 + Vite
       │ API / phiên Supabase
       ▼
Backend Node.js 22 + Express
  ├── Auth, RBAC, routes/controllers/models
  ├── AI quiz generation/review ───────► Ollama local
  ├── chatbot RAG/embeddings ─────────► Ollama local
  └── telemetry AI
       │
       ▼
Supabase bên ngoài
  Auth + PostgreSQL + Row Level Security
  Storage + pgvector
```

- **Frontend:** React, Vite; các trang chính được phân theo vai trò.
- **Backend:** Express, tổ chức theo routes/controllers/models/services.
- **Auth và dữ liệu:** Supabase Auth, PostgreSQL, policy RLS; service-role key chỉ nằm ở backend.
- **AI:** Ollama chạy model local; Compose có service Ollama riêng.
- **Triển khai:** Docker Compose chạy ứng dụng và Ollama; Supabase vẫn là dịch vụ bên ngoài cần cấu hình.
- **Dev:** Vite ở `5173` proxy request `/api` đến Express `3000`; backend có `/health`.
- **Cấu hình cần có:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`; `SUPABASE_SERVICE_ROLE_KEY` cho các luồng backend cần quyền admin/đồng bộ KB; `OLLAMA_BASE_URL` và model cần thiết.

## 8. Dữ liệu và quyền truy cập

Các thực thể chính thể hiện qua migration: người dùng/profile; bài học và file nguồn; lớp và thành viên; môn/chủ đề/kỹ năng; bài tập/câu hỏi/bài nộp/feedback; lượt làm bài; câu hỏi ngân hàng; cảnh báo rủi ro; các đoạn và metadata của kho kiến thức; log sử dụng AI; lượt hoàn thành bài học.

Các kiểm soát hiện thấy trong code/schema gồm:

- Role ứng dụng hiện có: `student`, `teacher`, `admin`; route giao diện và API có kiểm tra role cho thao tác quản trị/giáo viên.
- Supabase RLS được bật cho nhiều bảng; dữ liệu học tập gắn với người dùng, lớp và giáo viên phụ trách.
- Đăng ký công khai tạo học sinh; tạo giáo viên dành cho quản trị viên.
- Deadline được kiểm tra ở API/database để không phụ thuộc riêng giao diện.
- Khóa service-role chỉ dùng phía server; không ghi secret thật vào tài liệu slide hoặc ảnh demo.

Không nên tuyên bố “đã kiểm thử bảo mật toàn diện” nếu chưa có báo cáo kiểm thử riêng. Phụ huynh và audit log tổng quát là các nội dung cần đối chiếu/hoàn thiện theo SRS.

## 9. Phạm vi: đã có, chưa xác nhận và ngoài mục tiêu

| Chủ đề | Trạng thái khi rà soát |
|---|---|
| Bài học, lớp, bài tập, nộp bài, lịch sử và nhận xét | Có frontend/API/schema trong repo |
| AI tạo câu hỏi từ học liệu, bước kiểm tra, giáo viên duyệt | Có trong code; chất lượng nội dung cần giáo viên xác nhận |
| Chatbot RAG có nguồn từ Markdown | Có trong code; cần Supabase, cấu hình Ollama và kho tài liệu đã nạp |
| Hồ sơ năng lực học sinh và phân tích lớp/cảnh báo theo luật | Có UI/API/schema trong repo |
| Quản lý tài khoản/lớp và telemetry AI | Có UI/API/schema trong repo |
| Phụ huynh theo dõi con | Có trong SRS/kế hoạch; chưa thấy role/API/UI tương ứng trong code |
| Thông báo/push notification, audit log đầy đủ | Có yêu cầu/định hướng trong SRS/kế hoạch; không khẳng định đã hoàn tất |
| Huấn luyện mô hình nền tảng mới | Ngoài phạm vi MVP theo SRS |
| Thi chuẩn hóa quy mô lớn, thanh toán, mạng xã hội | Ngoài phạm vi theo SRS |

## 10. Kiểm thử và giới hạn cần trình bày trung thực

- Repo có các test cho AI policy/usage, tạo câu hỏi, study intent/study plan, OAuth, quản lý tài khoản/lớp, deadline, phép tính tiểu học, kho kiến thức, risk assessment/alerts.
- Có script đánh giá AI riêng; kết quả benchmark không tự suy ra từ việc có test file.
- Không đưa số liệu về độ chính xác mô hình, mức tăng thành tích, số học sinh/giáo viên sử dụng, uptime, tải hệ thống hoặc hiệu quả can thiệp nếu chưa tự chạy đo và có bằng chứng.
- AI chạy local cần tải model và tài nguyên máy; Supabase vẫn cần Internet và cấu hình dự án.
- RAG hiện đọc Markdown trong Storage; không gọi đây là chatbot đã hiểu mọi file hoặc mọi kiến thức ngoài tài liệu.
- Không coi thời gian học/streak local storage là dữ liệu analytics đáng tin cậy phía máy chủ.
- README hiện có một số liên kết/mô tả tài liệu cũ (ví dụ `AI_USAGE.md`, `docs/PROJECT_DESIGN.md`, `EVALUATION_CRITERIA.md`) không hiện diện trong danh sách file của commit mới nhất; dùng mã nguồn, migration và SRS làm căn cứ cho slide.

## 11. Dàn ý slide đề xuất (12–14 slide)

1. **Trang bìa** — tên đề tài, tên MathJoy, nhóm/thành viên và năm học; để chỗ trống cho thông tin nhóm.
2. **Vấn đề** — tài liệu/kết quả phân tán, khó phát hiện học sinh cần hỗ trợ, học sinh thiếu định hướng tiếp theo.
3. **Mục tiêu và giá trị** — kết nối hoạt động học, đo tiến độ, hỗ trợ giáo viên ra quyết định; AI hỗ trợ chứ không thay thế con người.
4. **Người dùng** — học sinh, giáo viên, quản trị viên đang có; phụ huynh là mục tiêu trong SRS nhưng chưa triển khai.
5. **Bản đồ chức năng** — giao diện học sinh, dashboard giáo viên và quản trị viên.
6. **Demo luồng học sinh** — mở bài, làm bài/nộp bài, xem giải thích, tiến độ/hồ sơ.
7. **Demo luồng giáo viên** — chọn học liệu, tạo câu hỏi, duyệt/chỉnh sửa, giao cho lớp, theo dõi bài nộp.
8. **AI tạo câu hỏi** — Ollama local, kiểm tra schema/đáp án, giáo viên duyệt; thể hiện cả trường hợp AI trả thiếu câu.
9. **Chatbot RAG** — Markdown → chia đoạn/embedding → pgvector → truy xuất → trả lời có trích dẫn hoặc từ chối khi thiếu căn cứ.
10. **Learning Analytics** — dữ liệu vào, KPI và ví dụ cảnh báo có giải thích; nhấn mạnh ngưỡng rule-based và giới hạn dữ liệu.
11. **Kiến trúc và dữ liệu** — React/Vite → Express → Supabase/Ollama; thể hiện Supabase là dịch vụ ngoài.
12. **Bảo mật và trách nhiệm AI** — Auth/RLS/role, service key backend, AI local, nguồn trích dẫn, không tự quyết định thay giáo viên.
13. **Tiến độ và giới hạn** — những phần đã có, phần phụ huynh/audit/notification cần hoàn thiện; roadmap theo `PLAN.md` nếu nhóm muốn trình bày.
14. **Kết luận & hỏi đáp** — giá trị cốt lõi, demo/QR nếu có deployment do nhóm tự cung cấp; không tự tạo URL/tài khoản.

Với bài thuyết trình khoảng 30 phút, dành khoảng 3 phút mở đầu/bối cảnh, 8–10 phút demo luồng, 6–8 phút giải thích AI/analytics, 4–5 phút kiến trúc và giới hạn, phần còn lại cho kết luận và hỏi đáp.

## 12. Kịch bản demo đề xuất

1. Đăng nhập bằng tài khoản demo do nhóm tự tạo (không chiếu mật khẩu).
2. Giáo viên mở lớp có dữ liệu thử, chọn bài học/tài liệu mẫu.
3. Tạo một bộ câu hỏi ngắn; cho thấy bước AI tạo, kiểm tra và màn hình giáo viên duyệt/chỉnh sửa.
4. Xuất bản bài cho lớp; chuyển sang tài khoản học sinh và làm bài.
5. Xem kết quả/giải thích; mở hồ sơ năng lực.
6. Hỏi trợ lý câu hỏi có trong tài liệu để hiển thị nguồn; thử một câu ngoài tài liệu để minh họa cơ chế từ chối nếu môi trường demo sẵn sàng.
7. Quay lại tài khoản giáo viên để xem Analytics/cảnh báo. Nếu thiếu dữ liệu, minh họa trạng thái “Chưa đủ dữ liệu”, không tạo cảnh báo giả.

**Chuẩn bị trước:** Supabase schema/migration đã áp dụng, có tài khoản từng role, học liệu Markdown đã nạp vào Storage, Ollama đã chạy và tải model. Không phụ thuộc Internet ngoài Supabase trong lúc demo chatbot/quiz local.

## 13. Gợi ý hình ảnh và phong cách

- Phong cách gần gũi học sinh tiểu học, sáng, thân thiện; đồng thời giữ dashboard giáo viên rõ ràng, ít trang trí.
- Dùng sơ đồ luồng và sơ đồ kiến trúc thay cho đoạn văn dài.
- Hình đề xuất: học sinh học trên laptop, giáo viên xem biểu đồ lớp, thẻ câu hỏi, sơ đồ RAG, bảng cảnh báo có lý do.
- Dùng số liệu minh họa được gắn nhãn **“dữ liệu demo”**; không trình bày số giả như kết quả thực nghiệm.
- Bảo vệ dữ liệu cá nhân khi chụp màn hình; dùng tài khoản và tên học sinh giả lập.
- Giữ thuật ngữ nhất quán: “Learning Analytics”, “RAG”, “Ollama local”, “Supabase”, “cảnh báo theo luật”.

## 14. Prompt có thể đưa trực tiếp cho AI làm slide

> Tạo bài thuyết trình tiếng Việt khoảng 12–14 slide, thời lượng khoảng 30 phút, cho đề tài “Hệ thống hỗ trợ giao bài tập và đánh giá quá trình học tập cho học sinh tiểu học dựa trên Learning Analytics và Trí tuệ nhân tạo”, sản phẩm MathJoy. Dùng nội dung trong brief này làm nguồn sự thật. Trình bày mạch lạc: vấn đề → mục tiêu → người dùng → luồng học sinh/giáo viên → AI tạo câu hỏi → chatbot RAG có trích dẫn → Learning Analytics/cảnh báo → kiến trúc → bảo mật và giới hạn → roadmap → kết luận. Phân biệt tính năng hiện có với phần nằm trong SRS/kế hoạch; nói rõ phụ huynh chưa có role/màn hình/API được xác nhận trong code hiện tại. Không bịa số liệu, kết quả benchmark, deployment, URL, tài khoản demo hoặc hiệu quả AI. Gắn nhãn “dữ liệu demo” cho mọi số minh họa. Dùng sơ đồ và ảnh giao diện thay cho chữ dày; thêm ghi chú thuyết trình ngắn và đề xuất minh họa cho mỗi slide.

## 15. Nguồn đối chiếu trong repository

- `README.md` — cài đặt, cấu hình, kiến trúc và mô tả vận hành (có một số đoạn tham chiếu tài liệu cũ).
- `SRS_Learning_Analytics.docx` — mục tiêu, actors, FR/UC, NFR và giới hạn yêu cầu.
- `PLAN.md` — kế hoạch hai tháng, trạng thái nền và hạng mục cần đối chiếu/hoàn thiện.
- `src/App.jsx`, `src/pages/`, `src/features/` — điều hướng và chức năng giao diện.
- `server.js`, `routes/`, `controllers/`, `models/`, `services/` — API và logic backend.
- `supabase/*.sql` — schema, policy/RLS và migration.
- `tests/` — kiểm thử tự động và script đánh giá.
- `package.json`, `Dockerfile`, `compose.yaml`, `.env.example` — công nghệ, chạy và cấu hình môi trường.
