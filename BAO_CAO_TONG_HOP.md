# BÁO CÁO TỔNG HỢP ĐỀ TÀI

## Hệ thống hỗ trợ giao bài tập và đánh giá quá trình học tập cho học sinh tiểu học dựa trên Learning Analytics và Trí tuệ nhân tạo

> **Tên sản phẩm:** MathJoy  
> **Nhóm thực hiện:** [Bổ sung tên nhóm]  
> **Thành viên:** [Bổ sung họ tên và mã số sinh viên]  
> **Giảng viên hướng dẫn:** [Bổ sung thông tin]  
> **Năm học:** 2026–2027

> **Lưu ý về phạm vi thông tin:** Nội dung dưới đây tổng hợp theo tài liệu yêu cầu, kế hoạch và mã nguồn hiện có trong repository tại thời điểm 27/10/2026. Cần cập nhật các phần trong dấu ngoặc vuông và chỉ bổ sung số liệu kiểm thử, kết quả thực nghiệm hoặc thông tin triển khai khi nhóm có bằng chứng xác thực.

## Tóm tắt

MathJoy là hệ thống web hỗ trợ tổ chức hoạt động học tập và theo dõi quá trình học của học sinh tiểu học. Hệ thống kết nối bài học, lớp học, bài tập, bài nộp và kết quả làm bài trên cùng một nền tảng. Học sinh có thể học bài, làm bài và xem lại kết quả; giáo viên có thể quản lý lớp, giao bài, theo dõi bài nộp và xem các chỉ số tổng hợp.

Hệ thống ứng dụng Learning Analytics để tổng hợp dữ liệu học tập, đưa ra một số cảnh báo theo quy tắc và gợi ý nội dung cần ôn tập. AI được sử dụng để hỗ trợ giáo viên tạo câu hỏi và để tra cứu nội dung trong kho học liệu. Các kết quả AI và cảnh báo nhằm hỗ trợ quá trình dạy học, không thay thế quyết định chuyên môn của giáo viên.

Ứng dụng hiện có các vai trò học sinh, giáo viên và quản trị viên. Vai trò phụ huynh được đề cập trong tài liệu yêu cầu nhưng chưa xác nhận có giao diện, API và quy trình hoàn chỉnh trong mã nguồn hiện tại.

## 1. Giới thiệu đề tài

### 1.1. Bối cảnh và vấn đề

Trong quá trình dạy và học, bài học, bài tập và kết quả của học sinh có thể được lưu trữ ở nhiều nơi khác nhau. Việc theo dõi tiến độ của từng học sinh và nhận biết sớm học sinh cần hỗ trợ vì vậy có thể tốn thời gian. Học sinh cũng cần được cung cấp thông tin dễ hiểu về bài tập cần hoàn thành và nội dung nên ôn tập.

Đề tài hướng đến việc xây dựng một nền tảng liên kết các hoạt động học tập và sử dụng dữ liệu đã ghi nhận để hỗ trợ học sinh, giáo viên theo dõi quá trình học. AI được sử dụng trong một số tác vụ có phạm vi cụ thể, như hỗ trợ sinh câu hỏi và tìm câu trả lời dựa trên tài liệu học tập.

### 1.2. Mục tiêu

- Xây dựng hệ thống quản lý bài học, lớp học, bài tập và bài nộp.
- Hỗ trợ học sinh làm bài, xem kết quả và theo dõi lịch sử học tập.
- Hỗ trợ giáo viên quản lý lớp, giao bài và theo dõi tình hình học tập.
- Tổng hợp một số chỉ số học tập và tạo cảnh báo có giải thích dựa trên dữ liệu hiện có.
- Ứng dụng AI để hỗ trợ tạo câu hỏi và hỏi đáp dựa trên kho học liệu.
- Kiểm soát quyền truy cập theo vai trò người dùng.

### 1.3. Phạm vi

Phạm vi chức năng đã thể hiện trong ứng dụng gồm hoạt động của học sinh, giáo viên và quản trị viên; quản lý bài học, lớp, bài tập, bài nộp; hồ sơ và lịch sử làm bài; phân tích học tập; một số chức năng AI.

Các nội dung như theo dõi học sinh bởi phụ huynh, audit log đầy đủ, thông báo/push notification và kiểm thử nghiệm thu quy mô lớn cần được đối chiếu riêng với yêu cầu trong SRS và tiến độ thực hiện. Không xem các nội dung này là chức năng hoàn tất nếu chưa có bằng chứng từ mã nguồn và kiểm thử.

## 2. Đối tượng sử dụng

| Vai trò | Chức năng chính hiện có | Giá trị sử dụng |
|---|---|---|
| Học sinh | Xem bài học đã xuất bản; làm bài được giao hoặc luyện tập; xem kết quả, giải thích, lịch sử và hồ sơ năng lực | Theo dõi bài học, bài tập và kết quả của bản thân |
| Giáo viên | Xem lớp được phân công, quản lý danh sách học sinh; tạo bài học, câu hỏi và bài tập; giao bài; xem bài nộp, nhận xét, phân tích và cảnh báo | Tổ chức hoạt động học tập và xác định trường hợp cần quan tâm |
| Quản trị viên | Quản lý tài khoản và lớp; tạo tài khoản giáo viên; khóa/mở tài khoản; xem telemetry sử dụng AI | Quản lý vận hành hệ thống |
| Phụ huynh | Có trong yêu cầu SRS về theo dõi tiến độ của con; chưa xác nhận có vai trò và màn hình/API đầy đủ trong ứng dụng | Đối tượng hướng tới trong phạm vi phát triển tiếp theo |

## 3. Phân tích chức năng và luồng sử dụng

### 3.1. Luồng học sinh

1. Đăng nhập vào hệ thống.
2. Chọn bài học đã được xuất bản theo môn hoặc chương.
3. Làm bài tập được giao hoặc bài luyện tập.
4. Xem kết quả, đáp án và giải thích sau khi làm bài.
5. Xem lịch sử làm bài và hồ sơ năng lực tổng hợp theo bài/chủ đề.
6. Tham khảo gợi ý học tập nếu dữ liệu hiện có đáp ứng điều kiện của hệ thống.

### 3.2. Luồng giáo viên

1. Xem lớp được phân công, quản lý danh sách học sinh và bổ sung học sinh vào lớp theo quyền được cấp.
2. Tạo bài học, chọn học liệu hoặc liên kết tài liệu.
3. Tạo câu hỏi thủ công hoặc dùng AI hỗ trợ sinh câu hỏi.
4. Kiểm tra, chỉnh sửa câu hỏi và lưu vào ngân hàng câu hỏi nếu cần.
5. Giao bài cho lớp và thiết lập hạn nộp.
6. Theo dõi bài nộp, xem kết quả và gửi nhận xét.
7. Xem dashboard, hồ sơ học sinh và cảnh báo phân tích học tập.

### 3.3. Luồng quản trị viên

Quản trị viên có thể quản lý tài khoản học sinh và giáo viên, tạo tài khoản giáo viên, khóa hoặc mở tài khoản, quản lý lớp và theo dõi một số thông tin vận hành liên quan đến việc sử dụng AI.

## 4. Trí tuệ nhân tạo trong hệ thống

### 4.1. Hỗ trợ tạo câu hỏi

Giáo viên có thể cung cấp nội dung bài học bằng cách nhập văn bản hoặc sử dụng tài liệu được hỗ trợ, chẳng hạn PDF, DOCX, TXT và Markdown. Hệ thống gọi Ollama local để hỗ trợ sinh câu hỏi trắc nghiệm nhiều lựa chọn. Các loại câu hỏi khác chưa được hỗ trợ trong luồng tạo hiện tại.

Sau khi sinh, hệ thống có các bước kiểm tra cấu trúc và đáp án, đồng thời có thể loại câu không đạt điều kiện. Số câu thực tế được trả về có thể ít hơn số lượng yêu cầu. Giáo viên cần xem lại và chỉnh sửa nội dung trước khi giao cho học sinh.

### 4.2. Hỏi đáp dựa trên học liệu (RAG)

Chatbot sử dụng phương pháp truy xuất tăng cường bằng sinh nội dung (Retrieval-Augmented Generation, RAG). Tài liệu Markdown trong kho học liệu được chia thành các đoạn, tạo embedding bằng Ollama và lưu trữ để phục vụ tìm kiếm. Khi có câu hỏi, hệ thống tìm các đoạn liên quan và sử dụng chúng làm căn cứ tạo câu trả lời.

Phạm vi trả lời phụ thuộc vào nội dung đã được đưa vào kho và cấu hình dịch vụ. Không nên mô tả chatbot là có thể trả lời chính xác mọi câu hỏi hoặc bao quát toàn bộ kiến thức ngoài các tài liệu được cung cấp.

### 4.3. Gợi ý học tập

Hệ thống có logic gợi ý dựa trên dữ liệu và quy tắc nghiệp vụ, ví dụ ưu tiên bài chưa nộp gần hạn, nội dung cần ôn dựa trên kết quả hoặc bài học tiếp theo. Đây không phải mô hình dự đoán cá nhân hóa đã được huấn luyện và kiểm định hiệu quả.

### 4.4. Telemetry AI

Backend ghi nhận một số thông tin vận hành như tính năng, model, phiên bản prompt, token, độ trễ và trạng thái yêu cầu. Quản trị viên có thể xem thống kê sử dụng AI. Telemetry này phục vụ quan sát hoạt động kỹ thuật, không phải thước đo trực tiếp chất lượng học tập hoặc hiệu quả sư phạm.

## 5. Learning Analytics và cảnh báo

### 5.1. Dữ liệu đầu vào

Các dữ liệu được sử dụng hoặc thể hiện trong luồng phân tích gồm lượt làm bài đã lưu, điểm và số câu đúng, bài tập được giao, hạn nộp, trạng thái bài nộp và danh sách học sinh trong lớp.

### 5.2. Chỉ số và kết quả hiển thị

Dashboard có thể hiển thị số học sinh được theo dõi, số lượt làm, điểm trung bình, độ chính xác, tình hình nộp bài quá hạn, học sinh cần hỗ trợ và trạng thái “Chưa đủ dữ liệu”.

### 5.3. Nguyên tắc cảnh báo

Cảnh báo hiện dựa trên các ngưỡng và quy tắc nghiệp vụ. Ví dụ, hệ thống yêu cầu một số lượt làm tối thiểu trước khi xét mức điểm; mức điểm thấp hoặc xu hướng giảm có thể làm phát sinh cảnh báo. Tình trạng nộp muộn được xem xét khi có đủ dữ liệu bài quá hạn. Cảnh báo có lý do và có thể được cập nhật hoặc đóng khi phân tích lại.

Các ngưỡng cụ thể được mô tả trong tài liệu brief hiện tại, nhưng cần được nhóm xác nhận lại với đặc tả và mã nguồn trước khi đưa vào báo cáo chính thức. Khi thiếu dữ liệu, không nên kết luận học sinh có rủi ro.

**Giới hạn diễn giải:** Đây là cơ chế hỗ trợ giáo viên ưu tiên quan sát, không phải chẩn đoán, kết luận năng lực hoặc quyết định thay giáo viên. Không nên gọi đây là mô hình machine learning dự báo đã được kiểm chứng.

## 6. Kiến trúc và công nghệ

### 6.1. Các thành phần chính

| Thành phần | Công nghệ/chức năng |
|---|---|
| Frontend | React 19 và Vite; giao diện được tổ chức theo vai trò và chức năng |
| Backend | Node.js và Express; cung cấp API, xử lý nghiệp vụ và kết nối dịch vụ |
| Xác thực và dữ liệu | Supabase Auth và PostgreSQL |
| Phân quyền dữ liệu | Supabase Row Level Security (RLS) cùng kiểm tra vai trò trong ứng dụng |
| AI | Ollama local cho tạo câu hỏi, embedding và hỏi đáp theo học liệu |
| Đóng gói môi trường | Có Dockerfile và Docker Compose; Supabase vẫn là dịch vụ bên ngoài cần cấu hình |

### 6.2. Luồng kiến trúc tổng quát

```text
Trình duyệt
  React + Vite
       │ API / phiên đăng nhập
       ▼
Backend Node.js + Express
  ├── Xác thực, phân quyền, API và nghiệp vụ học tập
  ├── Tạo và kiểm tra câu hỏi ─────────► Ollama local
  ├── Truy xuất học liệu / chatbot ─────► Ollama local
  └── Ghi nhận telemetry AI
       │
       ▼
Supabase bên ngoài
  Auth + PostgreSQL + RLS + Storage + pgvector
```

Để chạy đầy đủ, môi trường cần cấu hình Supabase và Ollama. Khóa service-role, nếu sử dụng, chỉ được đặt ở backend và không được đưa vào frontend hoặc tài liệu công khai.

## 7. Dữ liệu và phân quyền

Các thực thể dữ liệu chính thể hiện trong schema và migration gồm hồ sơ người dùng, bài học, lớp và thành viên lớp, môn/chủ đề/kỹ năng, bài tập, câu hỏi, bài nộp, phản hồi, lượt làm bài, ngân hàng câu hỏi, cảnh báo rủi ro, kho kiến thức và telemetry AI.

Các kiểm soát hiện thấy gồm:

- Các vai trò ứng dụng chính: học sinh, giáo viên và quản trị viên.
- Giao diện và API có kiểm tra vai trò cho một số chức năng dành cho giáo viên/quản trị viên.
- RLS được bật cho nhiều bảng dữ liệu.
- Đăng ký công khai tạo tài khoản học sinh; việc tạo tài khoản giáo viên thuộc luồng quản trị.
- Hạn nộp được kiểm tra ở phía API/database đối với các luồng liên quan.
- Khóa service-role được sử dụng phía server, không đưa vào mã frontend.

Không nên tuyên bố hệ thống đã được kiểm thử bảo mật toàn diện nếu chưa thực hiện và lưu báo cáo kiểm thử tương ứng.

## 8. Kiểm thử và đánh giá

Repository có các bài kiểm thử cho một số nhóm chức năng như AI policy/usage, tạo câu hỏi, study intent/study plan, OAuth, quản lý tài khoản/lớp, deadline, phép tính tiểu học, kho kiến thức và risk assessment/alerts. Ngoài ra có script đánh giá AI riêng.

Trong báo cáo chính thức, cần ghi rõ:

- Lệnh kiểm thử đã chạy và môi trường chạy.
- Phạm vi test và các chức năng được bao phủ.
- Kết quả thực tế, bao gồm test đạt, test lỗi và lỗi còn tồn tại.
- Dữ liệu hoặc cấu hình cần thiết để tái hiện kết quả.

Việc repository có test không đồng nghĩa với việc đã có kết quả benchmark về độ chính xác AI hoặc hiệu quả học tập. Không đưa ra số liệu về người dùng, độ chính xác mô hình, mức tăng thành tích, uptime hoặc hiệu quả can thiệp nếu nhóm chưa đo và có bằng chứng.

## 9. Hiện trạng, hạn chế và hướng phát triển

### 9.1. Hiện trạng đã thể hiện trong repository

- Luồng bài học, lớp, bài tập, bài nộp và lịch sử làm bài.
- Các chức năng chính cho học sinh, giáo viên và quản trị viên.
- Hỗ trợ AI tạo câu hỏi, có bước kiểm tra và giáo viên duyệt.
- Chatbot truy xuất học liệu Markdown theo hướng RAG.
- Hồ sơ năng lực, phân tích lớp và cảnh báo theo quy tắc.
- Migration Supabase, một số test và cấu hình Docker Compose.

### 9.2. Hạn chế cần trình bày

- Phụ huynh có trong yêu cầu nhưng chưa xác nhận có role, màn hình và API hoàn chỉnh.
- Cảnh báo và gợi ý hiện dựa trên quy tắc nghiệp vụ, không phải kết quả của mô hình dự báo đã được kiểm định.
- Chất lượng câu hỏi AI cần giáo viên xác nhận; số câu trả về có thể thấp hơn yêu cầu.
- Chatbot phụ thuộc vào tài liệu đã nạp vào kho và cấu hình Ollama/Supabase.
- Một số dữ liệu giao diện như thời gian học hoặc streak có thể được lưu ở local storage, không nên xem là dữ liệu analytics phía máy chủ.
- Repo không cung cấp URL deployment công khai hoặc tài khoản demo dùng chung.
- Các tuyên bố về bảo mật toàn diện, hiệu năng, khả năng mở rộng và hiệu quả học tập cần có kết quả kiểm thử riêng.

### 9.3. Hướng phát triển theo kế hoạch

Theo kế hoạch dự án, các hướng cần ưu tiên đối chiếu và hoàn thiện gồm:

1. Hoàn thiện định nghĩa KPI, snapshot analytics và ma trận truy vết yêu cầu–kiểm thử.
2. Củng cố dashboard, hồ sơ năng lực và cảnh báo với dữ liệu nguồn có thể truy vết.
3. Phát triển luồng phụ huynh và quan hệ liên kết phụ huynh–học sinh nếu nằm trong phạm vi được duyệt.
4. Kiểm thử đầy đủ ma trận phân quyền và bổ sung audit log cho thao tác nhạy cảm.
5. Hoàn thiện cấu hình, giới hạn và xử lý lỗi cho chatbot.
6. Chạy kiểm thử tích hợp, hồi quy, hiệu năng, bảo mật và backup/restore trong môi trường xác định.
7. Chuẩn bị tài liệu cài đặt, vận hành, hướng dẫn người dùng và nghiệm thu.

Các nội dung trên là kế hoạch/hướng phát triển; cần cập nhật trạng thái theo tiến độ thực tế trước khi nộp báo cáo.

## 10. Kết luận

MathJoy xây dựng một quy trình học tập có liên kết giữa bài học, bài tập và kết quả làm bài. Hệ thống cung cấp các chức năng cho học sinh, giáo viên và quản trị viên; đồng thời ứng dụng Learning Analytics theo quy tắc để hỗ trợ theo dõi lớp học và AI để hỗ trợ tạo câu hỏi, tra cứu học liệu.

Giá trị chính của hệ thống là hỗ trợ tổ chức hoạt động học tập và cung cấp thêm thông tin cho giáo viên khi theo dõi tiến độ. Các kết quả phân tích và AI cần được hiểu trong giới hạn dữ liệu và phạm vi đã triển khai. Những nội dung chưa hoàn thiện, đặc biệt là luồng phụ huynh, kiểm thử toàn diện và các chỉ số đánh giá thực nghiệm, cần được nêu rõ thay vì trình bày như kết quả đã đạt được.

## 11. Thông tin nhóm cần bổ sung trước khi nộp

- [ ] Tên trường, khoa, lớp, nhóm và thành viên.
- [ ] Phân công công việc cụ thể của từng thành viên.
- [ ] Thời gian thực hiện thực tế và các mốc hoàn thành.
- [ ] Ảnh chụp giao diện đã che thông tin cá nhân.
- [ ] Môi trường demo, dữ liệu demo và cấu hình cần thiết.
- [ ] Lệnh kiểm thử đã chạy và kết quả thực tế.
- [ ] Các lỗi còn tồn tại và cách xử lý hoặc kế hoạch khắc phục.
- [ ] Tài liệu tham khảo theo định dạng mà giảng viên yêu cầu.
- [ ] Cập nhật trạng thái từng chức năng so với mã nguồn tại thời điểm nộp.

## Tài liệu đối chiếu trong repository

- [PRESENTATION_BRIEF.md](./PRESENTATION_BRIEF.md) — nội dung thuyết trình và ghi chú phạm vi tính năng.
- [PLAN.md](./PLAN.md) — kế hoạch theo giai đoạn và tiêu chí nghiệm thu.
- [SRS_Learning_Analytics.docx](./SRS_Learning_Analytics.docx) — đặc tả yêu cầu hệ thống.
- [README.md](./README.md) — hướng dẫn cài đặt, cấu hình và mô tả hệ thống.
- `src/`, `routes/`, `controllers/`, `models/`, `services/` — giao diện, API và nghiệp vụ.
- `supabase/` — schema, policy và migration dữ liệu.
- `tests/` — kiểm thử và script đánh giá.

## 12. Báo cáo phần việc cá nhân

Trong đề tài MathJoy, phần việc cá nhân em tập trung vào các chức năng thuộc User Story 3, 4, 6, 9 và 10, liên quan đến học liệu, chuẩn bị/giao bài, theo dõi kết quả và vận hành AI. Các mục dưới đây mô tả phần em tham gia theo phạm vi báo cáo và đối chiếu với mã nguồn hiện tại; không hàm ý em là tác giả duy nhất của toàn bộ các tệp được dẫn. Git ghi nhận một số thay đổi của em, gồm xử lý tài liệu/chương bài học (`6243093`, `fce717c`), tạo câu hỏi ôn tập theo chương (`d9ee58c`), điều chỉnh telemetry (`c12320d`) và tài liệu đánh giá AI (`720a5d8`). Commit chỉ xác nhận tác giả và nội dung thay đổi, không xác định riêng phần nào do AI hỗ trợ.

### 12.1. Giao diện giáo viên em thực hiện

Em tham gia phát triển và hoàn thiện trang làm việc dành cho giáo viên với các khu vực **Tổng quan, Lớp học, Bài học, Bài tập, Ngân hàng câu hỏi, Học sinh, Bài nộp & nhận xét và Phân tích học tập**. Trang tổng quan hiển thị dữ liệu từ bài tập, bài nộp, lượt làm và lớp được phân công; có trạng thái tải dữ liệu, báo lỗi và thao tác thử tải lại.

Trong khu vực lớp/học sinh, giáo viên xem lớp được phân công, thêm học sinh vào lớp theo email, xem danh sách học sinh và mở hồ sơ kết quả theo bài/chương. Việc tạo lớp và phân công giáo viên thuộc luồng quản trị viên, không nằm trong thao tác của giáo viên.

### 12.2. Các chức năng theo User Story

**US03 — Quản lý bài học:** Em tham gia hoàn thiện luồng bài học theo môn/chương và xử lý học liệu, gồm nhập văn bản hoặc chọn/tải tài liệu PDF, DOCX, TXT, Markdown. Các commit của em ghi nhận phần nhóm bài học theo chương nguồn, đọc tài liệu và hiển thị bài học từ Storage. Giao diện hiện có các thao tác lưu, sửa, xóa để giáo viên quản lý bài học đã tạo.

**US04 — Tạo và giao bài tập có hạn nộp:** Em tham gia luồng dùng bài học/chương làm nguồn để tạo câu hỏi ôn tập. Commit của em ghi nhận chức năng tạo câu hỏi luyện tập theo chương từ bài học. Trong hệ thống hiện tại, giáo viên còn có thể đặt tên bài, chọn lớp, đặt hạn nộp; backend kiểm tra dữ liệu và chặn nộp bài khi đến hạn.

**US06 — Hỗ trợ tạo câu hỏi bằng AI:** Em tham gia luồng chọn nội dung và số lượng câu cần tạo. Hệ thống hiện hỗ trợ câu hỏi trắc nghiệm bốn phương án; bản nháp được kiểm tra cấu trúc và đáp án trước khi hiển thị. Giáo viên có thể sửa/xóa/thêm câu hỏi, lưu câu vào ngân hàng và xem lại trước khi xuất bản. Nếu AI chỉ tạo được một phần số câu, giao diện báo số câu đạt kiểm tra thay vì tự chèn câu mẫu.

**US09 — Theo dõi tiến độ và cảnh báo học tập:** Em tham gia rà soát và trình bày luồng giáo viên theo dõi điểm trung bình, độ chính xác, lượt làm, tỷ lệ nộp, xu hướng điểm, kết quả theo chủ đề và danh sách học sinh cần theo dõi. Hệ thống cảnh báo có lý do và lịch sử; khi thiếu dữ liệu, hệ thống thể hiện trạng thái chưa đủ dữ liệu thay vì kết luận rủi ro. Các ngưỡng hiện cấu hình là tối thiểu 3 lượt làm có điểm để đánh giá; điểm trung bình dưới 65% cần theo dõi, dưới 50% là mức cao; từ 4 lượt mới xét xu hướng giảm (giảm ít nhất 10 điểm phần trăm để theo dõi, 15 điểm để mức cao); cần ít nhất 2 bài quá hạn trước khi đánh giá việc chưa nộp. Cảnh báo mức cao do quá hạn khi có ít nhất 2 bài chưa nộp hoặc tỷ lệ chưa nộp từ 60%. Đây là quy tắc hiện tại, chưa được giáo viên xác nhận/hiệu chỉnh; không phải mô hình dự báo đã được kiểm định.

**US10 — Theo dõi hoạt động AI:** Em tham gia hoàn thiện cách báo cáo mức sử dụng AI, trong đó có commit loại bỏ phần ước tính chi phí không có căn cứ. Telemetry hiện ghi nhận tính năng, model, phiên bản prompt, token đầu vào/đầu ra, độ trễ, công cụ và mã trạng thái; trang quản trị tổng hợp số yêu cầu thành công/lỗi, độ trễ trung bình, token và yêu cầu gần đây trong 30 ngày, cập nhật qua SSE. Đây là màn hình quản trị viên, không thuộc dashboard giáo viên.

### 12.3. Vị trí code và luồng xử lý

| Story/chức năng | Vị trí code | Trách nhiệm chính |
|---|---|---|
| **US03 — Giao diện bài học** | `src/features/lessons/LessonStudio.jsx`: `selectFile`, `selectSampleFile`, `saveLesson`, `editLesson`, `deleteLesson` | Đọc/chọn tài liệu; tạo hoặc cập nhật nội dung bài học; tải tài liệu lên API; làm mới danh sách sau thao tác. |
| **US03 — API bài học/Storage** | `controllers/lessonController.js`: `normalizeLesson`, `uploadMaterial`, `create`, `update`, `remove`, `listPublished`, `listMine`, `getMaterial`; `routes/lessonRoutes.js`; `models/lessonModel.js` | Kiểm tra dữ liệu và quyền giáo viên; lưu metadata, upload Storage; cung cấp bài học của giáo viên/bài đã xuất bản và URL tài liệu có thời hạn. |
| **US04 — Soạn và xuất bản bài** | `src/features/assignments/AssignmentStudio.jsx`: `selectLesson`, `generate`, `publish`, `saveToQuestionBank`; `src/features/assignments/AssignmentQuestionReview.jsx` | Lấy học liệu, gọi API tạo câu hỏi, hiển thị trình biên tập câu hỏi, lưu câu hỏi và gửi bài tập cùng lớp/hạn nộp lên backend. |
| **US04 — Kiểm tra hạn và nhận bài** | `controllers/assignmentController.js`: `normalize`, `create`; `services/assignmentDeadline.js`: `normalizeDueAt`, `isAssignmentClosed`; `controllers/submissionController.js`: `create`, `addFeedback`; `routes/assignmentRoutes.js`, `routes/submissionRoutes.js` | Xác thực dữ liệu bài; từ chối hạn không hợp lệ hoặc đã qua khi xuất bản; chấm bài, lưu bài nộp và phản hồi; từ chối bài nộp đã hết hạn. |
| **US06 — Tạo/duyệt câu hỏi AI** | `server.js`: endpoint `POST /api/generate-quiz`; `services/quizGeneration.js`: `validateInput`, `chooseModel`, `generateQuiz` và hàm nội bộ `ask`; `prompts/quiz.js` | Endpoint giới hạn quyền teacher/admin; chọn model Ollama; gọi bước tạo và reviewer; kiểm tra schema/đáp án, thử lại có giới hạn và trả trạng thái kết quả một phần. |
| **US06 — Sửa/lưu câu hỏi** | `src/features/assignments/AssignmentQuestionReview.jsx`; `src/features/assignments/TeacherQuestionBank.jsx`; `controllers/questionBankController.js`; `models/questionBankModel.js` | Cho phép giáo viên sửa câu hỏi trước khi giao, lưu câu được chọn và quản lý/xóa câu hỏi trong ngân hàng. |
| **US09 — Dashboard và số liệu** | `src/features/teacher/TeacherOverview.jsx`; `src/features/teacher/TeacherAnalytics.jsx`; `src/features/teacher/TeacherStudents.jsx`; `controllers/quizAttemptController.js`: `analyticsForTeacher` | Kết hợp lượt làm, bài giao/nộp, roster; tính/hiển thị chỉ số tổng quan, kết quả chủ đề, xu hướng tuần, hồ sơ học sinh và cảnh báo. |
| **US09 — Quy tắc cảnh báo** | `services/riskAssessment.js`: `assessStudentRisk`, `MIN_SCORE_ATTEMPTS`, `MIN_OVERDUE_ASSIGNMENTS`; `models/riskAlertModel.js`: `syncTeacherRiskAlerts`, `alertPayload` | Đánh giá theo số lượt làm/điểm và bài quá hạn; lưu lý do, cập nhật cảnh báo đang mở, giữ lịch sử cảnh báo đã đóng. |
| **US10 — Ghi nhận và xem telemetry** | `server.js`: callback `onUsage` và `recordAIUsage` trong endpoint quiz/chat; `services/quizGeneration.js`: `generateQuiz`; `services/knowledgeBase.js`: `embedTexts`, `retrieveKnowledge`; `services/aiUsage.js`: `recordAIUsage`, `getAdminAIUsageSummary`; `controllers/aiUsageController.js`: `getSummary`, `streamSummary`; `src/pages/AdminPage.jsx`; migrations `028_ai_usage_observability.sql`, `032_remove_ai_usage_costs.sql` | Ghi event usage vào Supabase, tổng hợp cho admin bằng RPC, phát dữ liệu qua SSE và hiển thị chỉ số trong trang quản trị. |

### 12.4. Cách tính và hiển thị token

Hệ thống **không tự ước lượng token bằng số ký tự/từ**. Backend lấy các bộ đếm usage do Ollama trả về sau mỗi lần gọi model:

- **Prompt/input token:** trường `prompt_eval_count`.
- **Completion/output token:** trường `eval_count`.
- **Token của một lượt gọi có nội dung:** `prompt_eval_count + eval_count`.
- **Token của một yêu cầu có nhiều lượt gọi:** cộng lần lượt token từng lượt gọi vào hai bộ tích lũy riêng `promptTokens` và `completionTokens`.

Với tạo câu hỏi AI, `services/quizGeneration.js` gọi `onUsage` sau mỗi phản hồi từ `/api/chat`. `generateQuiz` có thể gọi model nhiều lần để tạo câu hỏi, nhờ reviewer kiểm tra và thử lại câu chưa đạt; `server.js` cộng token của tất cả các phản hồi đó vào cùng một bản ghi telemetry của yêu cầu. Vì vậy, lượng token ghi nhận có thể lớn hơn một lượt tạo câu hỏi đơn lẻ.

Với chatbot, `services/knowledgeBase.js` lấy `prompt_eval_count` từ lần tạo embedding cho câu hỏi truy vấn và chuyển qua callback `onUsage`; `server.js` cộng giá trị đó vào `promptTokens`. Nếu chatbot tiếp tục gọi model để viết câu trả lời, backend cộng thêm `prompt_eval_count` vào prompt và `eval_count` vào completion. Do đó, trường **promptTokens của chatbot gồm token truy vấn embedding và token prompt của lần sinh câu trả lời** (khi có gọi model). Các luồng từ chối sớm hoặc trả lời trực tiếp từ đoạn trích có thể không phát sinh completion token; trường hợp Ollama không trả bộ đếm tương ứng thì code dùng giá trị 0.

Trong `services/aiUsage.js`, hai bộ đếm được ép thành số nguyên không âm trước khi ghi vào `ai_usage_logs`. Migration `supabase/032_remove_ai_usage_costs.sql` tổng hợp riêng `SUM(prompt_tokens)` và `SUM(completion_tokens)` trong khoảng từ `period_start`, đồng thời tính số request, tỷ lệ thành công/lỗi và độ trễ trung bình. Trên trang quản trị, `src/pages/AdminPage.jsx` hiển thị tổng input/output tách biệt; ở danh sách request gần đây, mỗi dòng hiển thị tổng của request bằng `prompt_tokens + completion_tokens`.

**Ví dụ:** nếu một lần gọi báo `prompt_eval_count = 1.200` và `eval_count = 350`, lượt đó có 1.200 prompt token, 350 completion token, tổng cộng 1.550 token. Nếu một yêu cầu quiz có ba lần gọi lần lượt báo (1.200, 300), (900, 200), (800, 100), bản ghi của yêu cầu sẽ có 2.900 prompt token và 600 completion token, tổng 3.500 token.

Số token là **mức sử dụng/tính toán của model**, không phải số tiền. Bản triển khai hiện tổng hợp token nhưng không tính chi phí tiền tệ; migration mới nhất còn xóa cột `cost_usd`. Do model chạy qua Ollama local, báo cáo không quy đổi token thành USD nếu không có bảng giá và phương thức đo chi phí phần cứng phù hợp.

### 12.5. Kiểm thử phần việc

Trong lần kiểm tra cục bộ ngày 27/10/2026, bộ kiểm thử tự động đạt **76/76, 0 lỗi**, và bản build frontend hoàn tất. Smoke test với `node server.js` xác nhận `/health` hoạt động và `GET /api/lessons/mine` không có Bearer token bị từ chối với HTTP 401. Đây là kiểm tra cục bộ, không thay thế kiểm thử giao diện end-to-end hoặc nghiệm thu tích hợp quyền truy cập/Storage trên Supabase. Chưa chạy CRUD với phiên đăng nhập giáo viên/học sinh hoặc kiểm tra kết quả Storage; các ngưỡng cảnh báo ở US09 cũng chưa được giáo viên rà soát.

Để so sánh phiên bản prompt tạo câu hỏi, em chạy [tests/quiz-generation-evaluation.js](./tests/quiz-generation-evaluation.js) với model `qwen2.5:3b`, prompt nền `quiz-generator-v2` (commit `5a786d7`) và prompt hiện tại `quiz-generator-v3`. Bộ cố định gồm 22 ca: 8 bình thường, 6 biên và 8 ca đầu vào phải từ chối. Kết quả tổng thể tăng từ **8/22 (36,4%) lên 11/22 (50,0%)**, tương đương **+13,6 điểm phần trăm**. Tuy nhiên, 8 ca từ chối đều được validator đầu vào hiện tại chặn trước khi gọi model ở cả hai phiên bản; riêng 14 ca thực sự gọi Ollama, tỷ lệ được chấp nhận chỉ tăng từ **0/14 lên 3/14**. Do đó kết quả này chưa cho thấy chất lượng sinh câu hỏi đã đủ tốt và giáo viên vẫn cần kiểm tra/chỉnh sửa.

Ở 14 ca có gọi model, latency p50/p95 là **14.865/27.569 ms** với prompt v2 và **10.456/22.276 ms** với prompt v3. Token trung bình mỗi ca (generator và reviewer cộng lại) lần lượt là **1.589** và **1.230**. Đây là phép đo inference cục bộ theo đúng model/prompt/bộ ca nêu trên, không gồm UI, API, Supabase hoặc Storage; thông số phần cứng chưa được ghi lại. Bảng đầy đủ theo từng ca, kết quả trước/sau, latency và token được in bởi script đánh giá.

### 12.6. Tệp mã nguồn tham chiếu chính

- Trang giáo viên và tổng quan: [src/pages/TeacherPage.jsx](./src/pages/TeacherPage.jsx), [src/features/teacher/TeacherOverview.jsx](./src/features/teacher/TeacherOverview.jsx).
- Bài học và bài tập: [src/features/lessons/LessonStudio.jsx](./src/features/lessons/LessonStudio.jsx), [src/features/assignments/AssignmentStudio.jsx](./src/features/assignments/AssignmentStudio.jsx), [src/features/assignments/AssignmentQuestionReview.jsx](./src/features/assignments/AssignmentQuestionReview.jsx).
- Học sinh, bài nộp và phân tích: [src/features/teacher/TeacherStudents.jsx](./src/features/teacher/TeacherStudents.jsx), [src/features/assignments/TeacherSubmissions.jsx](./src/features/assignments/TeacherSubmissions.jsx), [src/features/teacher/TeacherAnalytics.jsx](./src/features/teacher/TeacherAnalytics.jsx), [services/riskAssessment.js](./services/riskAssessment.js).
- Telemetry AI: [src/pages/AdminPage.jsx](./src/pages/AdminPage.jsx), [controllers/aiUsageController.js](./controllers/aiUsageController.js), [services/aiUsage.js](./services/aiUsage.js).
