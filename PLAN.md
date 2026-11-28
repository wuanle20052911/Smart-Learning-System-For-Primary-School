# Kế hoạch thực hiện đề tài trong 2 tháng

**Đề tài:** Hệ thống hỗ trợ giao bài tập và đánh giá quá trình học tập cho học sinh tiểu học dựa trên Learning Analytics và Trí tuệ nhân tạo  
**Thời gian dự kiến:** 12/10/2026–12/12/2026  
**Cách chia tiến độ:** 4 đợt, mỗi đợt 2 tuần; 6 ngày cuối dùng để nghiệm thu và bàn giao.  
**Căn cứ:** `SRS_Learning_Analytics.docx`, mã nguồn và cấu trúc hiện có của dự án.

## 1. Mục tiêu trong 2 tháng

Hoàn thiện một phiên bản có thể trình diễn và nghiệm thu, tập trung vào luồng chính của bốn nhóm người dùng Học sinh, Giáo viên, Phụ huynh và Quản trị viên:

- Hoàn thiện việc ghi nhận và tổng hợp dữ liệu học tập thành các KPI, xu hướng và hồ sơ năng lực có thể giải thích.
- Hoàn thiện dashboard theo vai trò, cảnh báo rủi ro có lý do và khuyến nghị học tập dựa trên dữ liệu.
- Củng cố quản lý người dùng, RBAC, phạm vi xem dữ liệu và audit log cho thao tác nhạy cảm.
- Tích hợp chatbot học tập theo nội dung tài liệu, có trích dẫn nguồn, từ chối suy đoán khi thiếu căn cứ.
- Kiểm thử các luồng chính và luồng lỗi, sửa lỗi ưu tiên cao, chuẩn bị tài liệu triển khai và nghiệm thu.

## 2. Hiện trạng và phạm vi

### Hiện trạng ghi nhận từ dự án

Dự án hiện sử dụng React/Vite, Express, Supabase và Ollama. Đã có nền tảng đăng nhập và phân vai trò, quản lý bài học/lớp/bài tập, làm bài và lưu kết quả, cảnh báo rủi ro, tạo câu hỏi bằng AI và chatbot truy xuất tài liệu có nguồn trích dẫn. Có các migration Supabase và một số kiểm thử cho phân tích rủi ro, ngân hàng câu hỏi, quản lý lớp và kho kiến thức.

Các nội dung cần ưu tiên đối chiếu và hoàn thiện theo SRS gồm: định nghĩa KPI và snapshot analytics; mức độ đầy đủ của dashboard học sinh/giáo viên/phụ huynh; liên kết phụ huynh–học sinh; hồ sơ năng lực và khuyến nghị; quy trình quản trị người dùng/cấu hình; kiểm thử phân quyền toàn hệ thống; audit log; kiểm thử hiệu năng, sao lưu và nghiệm thu. Đây là các hạng mục cần xác nhận lại ở đợt 1, không mặc định rằng chức năng chưa có chỉ vì chưa thấy trên giao diện.

### Phạm vi ưu tiên

- **Ưu tiên hoàn thành:** FR-01–FR-12, FR-16–FR-19; các luồng học sinh, giáo viên, quản trị viên; Learning Analytics, cảnh báo, chatbot.
- **Hoàn thiện trong giới hạn dữ liệu và thời gian:** FR-13–FR-15 cho phụ huynh, bao gồm liên kết phụ huynh–học sinh, xem tiến độ/điểm mạnh-yếu và khuyến nghị.
- **Chatbot:** cấu hình vận hành cần thiết, quyền truy cập theo vai trò, truy vấn tài liệu có căn cứ và nguồn tham khảo. Việc đào tạo mô hình nền tảng mới nằm ngoài phạm vi.
- **Ngoài phạm vi MVP:** thi chuẩn hóa quy mô lớn, thanh toán, mạng xã hội, dự đoán có giá trị pháp lý và huấn luyện mô hình AI nền tảng.

## 3. Kế hoạch theo từng đợt 2 tuần

### Đợt 1 — Khảo sát, chốt phạm vi và thiết kế chi tiết
**12/10/2026–25/10/2026**

**Mục tiêu:** Có baseline thống nhất giữa SRS, sản phẩm đang chạy, dữ liệu và tiêu chí nghiệm thu.

**Công việc**

1. Rà soát 19 FR, các UC, 12 business rules và 15 NFR trong SRS; đối chiếu từng yêu cầu với giao diện, API, model, migration và kiểm thử hiện có.
2. Lập ma trận truy vết FR → UC → màn hình/API/dữ liệu → Acceptance Criteria → Test Case; đánh dấu đã có, còn thiếu, cần sửa hoặc chưa thể làm trong phạm vi.
3. Chốt công thức và quy tắc tính completion rate, điểm trung bình, xu hướng, hồ sơ năng lực, risk score, ngưỡng dữ liệu tối thiểu và thứ tự ưu tiên khuyến nghị.
4. Xác định các sự kiện học tập phải lưu, nguồn dữ liệu, kỳ tổng hợp snapshot và cách xử lý dữ liệu thiếu/trùng/quá hạn.
5. Chốt ma trận quyền theo vai trò và phạm vi dữ liệu: học sinh xem dữ liệu của mình; phụ huynh xem con đã liên kết; giáo viên xem lớp được phân công; quản trị viên quản lý theo quyền.
6. Thiết kế bổ sung schema/API cho analytics, quan hệ phụ huynh–học sinh, audit log và cấu hình chatbot nếu các phần này chưa đáp ứng SRS.
7. Tạo bộ dữ liệu thử đại diện và Test Case cho luồng chính, dữ liệu biên, người dùng sai quyền, thiếu dữ liệu và lỗi dịch vụ AI.

**Phụ trách chính:** Phân tích nghiệp vụ/điều phối chốt yêu cầu; Backend và Data chốt dữ liệu/API/công thức; Frontend phác thảo luồng màn hình; QA lập ma trận kiểm thử.

**Đầu ra**

- Ma trận truy vết và backlog ưu tiên có người phụ trách.
- Từ điển KPI/Analytics và ma trận phân quyền được thống nhất.
- Thiết kế dữ liệu/API, prototype các màn hình còn thiếu.
- Bộ test case và dữ liệu kiểm thử ban đầu.

**Điều kiện hoàn thành:** Mọi FR ưu tiên có tiêu chí kiểm chứng được; các công thức rủi ro và analytics được thống nhất; không còn quyết định chặn tiến độ cho đợt 2.

### Đợt 2 — Hoàn thiện dữ liệu học tập và Analytics cốt lõi
**26/10/2026–08/11/2026**

**Mục tiêu:** Dữ liệu học tập được ghi nhận nhất quán và tạo được các chỉ số nền cho dashboard/cảnh báo.

**Công việc**

1. Hoàn thiện thu thập dữ liệu bài tập, lượt làm, câu trả lời, điểm, thời gian, trạng thái nộp và hoạt động học tập; kiểm tra liên kết đúng học sinh/lớp/bài tập.
2. Hoàn thiện API hoặc truy vấn tổng hợp cho số bài được giao/đã nộp, tỷ lệ hoàn thành, điểm trung bình, kết quả theo kỹ năng và xu hướng theo khoảng thời gian.
3. Triển khai hoặc chỉnh sửa snapshot analytics theo chu kỳ đã chốt; tránh tính sai khi có bài quá hạn, bài chưa chấm hoặc thiếu dữ liệu.
4. Hoàn thiện hồ sơ năng lực học sinh theo kỹ năng/chủ đề và hiển thị tình trạng chưa đủ dữ liệu thay vì kết luận thiếu căn cứ.
5. Hoàn thiện màn hình/dashboard học sinh và dashboard lớp cho giáo viên, có bộ lọc phạm vi và thời gian phù hợp.
6. Hoàn thiện cảnh báo rủi ro: ngưỡng, mức độ, lý do và dữ liệu nguồn; cho phép giáo viên xem danh sách học sinh cần hỗ trợ.
7. Viết kiểm thử đơn vị/tích hợp cho công thức KPI, snapshot, phân trang/phạm vi dữ liệu và các trường hợp biên.

**Phụ trách chính:** Backend/Data xây dựng tổng hợp và quy tắc; Frontend hoàn thiện dashboard; QA kiểm tra công thức và quyền truy cập; Giáo viên/đại diện nghiệp vụ xác nhận tính dễ hiểu của cảnh báo.

**Đầu ra**

- API và dữ liệu analytics có thể truy vết về nguồn.
- Dashboard học sinh/giáo viên và hồ sơ năng lực bản hoàn chỉnh theo phạm vi MVP.
- Cảnh báo rủi ro có lý do và bộ test cho ngưỡng/thiếu dữ liệu.

**Điều kiện hoàn thành:** Các chỉ số mẫu tính đúng theo công thức đã duyệt; dashboard không làm lộ dữ liệu ngoài phạm vi vai trò; mỗi cảnh báo đều có lý do và bằng chứng dữ liệu.

### Đợt 3 — Khuyến nghị, phụ huynh, quản trị, phân quyền và chatbot
**09/11/2026–22/11/2026**

**Mục tiêu:** Khép kín các luồng cá nhân hóa và quản trị theo SRS, củng cố kiểm soát truy cập.

**Công việc**

1. Hoàn thiện khuyến nghị học tập dựa trên kỹ năng yếu, lỗi thường gặp, bài chưa hoàn thành và học liệu/bài tập phù hợp; lưu lý do và không để AI ghi đè điểm chính thức.
2. Hoàn thiện quan hệ phụ huynh–học sinh và các màn hình theo dõi tiến độ, điểm mạnh/yếu, khuyến nghị; giới hạn dữ liệu đúng học sinh đã liên kết.
3. Hoàn thiện các thao tác quản trị người dùng, trạng thái tài khoản, môn học/lớp học theo FR-16/FR-17; xác thực quyền ở backend, không chỉ ẩn nút trên giao diện.
4. Hoàn thiện chức năng cấu hình và phân quyền theo FR-18/FR-19 trong phạm vi hệ thống; kiểm tra cấu hình đầu vào và yêu cầu xác nhận với thao tác nhạy cảm.
5. Ghi audit log cho thay đổi người dùng, quyền, cấu hình, điểm hoặc dữ liệu quan trọng; ghi actor, thời gian, hành động và đối tượng bị tác động.
6. Củng cố chatbot: quyền gọi API theo vai trò đã thống nhất, cấu hình model/kho tài liệu/ngưỡng truy xuất, giới hạn đầu vào, xử lý timeout/lỗi và đảm bảo câu trả lời có nguồn.
7. Kiểm thử ma trận quyền cho toàn bộ API/màn hình nhạy cảm; kiểm thử học sinh, phụ huynh, giáo viên và quản trị viên truy cập đúng/sai phạm vi.

**Phụ trách chính:** Backend triển khai RBAC, API và audit log; Frontend hoàn thiện luồng phụ huynh/quản trị; Data/AI hoàn thiện khuyến nghị và chatbot; QA kiểm thử quyền và nội dung AI.

**Đầu ra**

- Khuyến nghị có căn cứ và giải thích.
- Luồng phụ huynh theo dõi con trong phạm vi dữ liệu được cấp.
- Chức năng quản trị, cấu hình và audit log.
- Chatbot hoạt động theo quyền và có nguồn tham khảo.
- Báo cáo kiểm thử permission matrix.

**Điều kiện hoàn thành:** Không thể truy cập chéo dữ liệu bằng cách gọi API trực tiếp; quyền được kiểm tra phía server; chatbot không trả lời như sự thật khi thiếu nguồn hỗ trợ.

### Đợt 4 — Tích hợp, kiểm thử hệ thống, sửa lỗi và phát hành
**23/11/2026–06/12/2026**

**Mục tiêu:** Ổn định toàn bộ luồng, đáp ứng tiêu chí nghiệm thu và chuẩn bị bản phát hành.

**Công việc**

1. Tích hợp hồi quy toàn bộ luồng: đăng nhập → giao bài → làm/nộp/chấm → analytics → cảnh báo/khuyến nghị → phụ huynh theo dõi → quản trị.
2. Chạy các test case main flow, exception flow và biên cho các UC; sửa lỗi theo mức độ Critical/High/Medium.
3. Đo hiệu năng các API/dashboard và batch analytics; xác nhận các ngưỡng SRS như p95, thời gian xử lý và tải mục tiêu trong môi trường thử nghiệm phù hợp.
4. Kiểm tra bảo mật: hết hạn phiên, phân quyền server-side, RLS, xác thực dữ liệu đầu vào, HTTPS ở môi trường triển khai và không lộ secret.
5. Kiểm thử backup/restore, log vận hành, lỗi Supabase/Ollama, timeout và khả năng phục hồi; ghi rõ các giới hạn phụ thuộc hạ tầng.
6. Kiểm tra giao diện responsive và usability với đại diện người dùng; sửa lỗi cản trở các tác vụ chính.
7. Đóng băng tính năng, thực hiện regression cuối, chuẩn bị hướng dẫn cài đặt/vận hành, hướng dẫn người dùng và biên bản nghiệm thu.

**Phụ trách chính:** QA điều phối kiểm thử/nghiệm thu; Backend/Frontend/Data sửa lỗi; DevOps hoặc người phụ trách triển khai cấu hình môi trường, backup và giám sát; điều phối đề tài xác nhận phạm vi và bàn giao.

**Đầu ra**

- Bản phát hành ứng viên (Release Candidate) và báo cáo test.
- Danh sách lỗi còn lại, rủi ro và giới hạn đã được chấp thuận.
- Tài liệu triển khai, vận hành, backup/restore và hướng dẫn sử dụng.
- Biên bản nghiệm thu theo FR/NFR.

**Điều kiện hoàn thành:** Không còn lỗi Critical/High; các luồng nghiệm thu chính đạt; quyền truy cập và dữ liệu đã được kiểm tra; bản triển khai có hướng dẫn phục hồi.

### Giai đoạn nghiệm thu và bàn giao
**07/12/2026–12/12/2026**

1. Demo theo vai trò và chạy lại các Acceptance Criteria với đại diện nghiệp vụ.
2. Xác nhận ma trận FR/UC/Test Case; ghi nhận các yêu cầu chưa hoàn thành và kế hoạch sau nghiệm thu.
3. Bàn giao mã nguồn, cấu hình mẫu không chứa secret, migration, hướng dẫn cài đặt/vận hành và tài liệu người dùng.
4. Chốt biên bản nghiệm thu và kế hoạch bảo trì.

**Đầu ra:** Biên bản demo/nghiệm thu, bộ tài liệu bàn giao và backlog giai đoạn tiếp theo.

## 4. Mốc đánh giá tiến độ

| Mốc | Ngày | Tiêu chí đánh giá |
|---|---|---|
| M1 | 25/10/2026 | Chốt phạm vi, KPI, quyền, ma trận truy vết và test case |
| M2 | 08/11/2026 | Analytics, dashboard cốt lõi và cảnh báo có thể kiểm thử |
| M3 | 22/11/2026 | Khuyến nghị, phụ huynh, quản trị, RBAC và chatbot tích hợp |
| M4 | 06/12/2026 | Hoàn tất regression, bảo mật, hiệu năng và bản phát hành ứng viên |
| Nghiệm thu | 12/12/2026 | Demo theo vai trò, bàn giao và chốt biên bản |

## 5. Tiêu chí nghiệm thu tổng thể

- Các FR trong phạm vi có trạng thái, bằng chứng triển khai và Test Case tương ứng.
- Các phép tính completion rate, điểm, xu hướng, hồ sơ năng lực và rủi ro đúng theo đặc tả đã chốt.
- Học sinh, phụ huynh, giáo viên và quản trị viên chỉ truy cập dữ liệu/chức năng thuộc quyền của mình; kiểm tra ở backend.
- Cảnh báo và khuyến nghị có lý do; dữ liệu chưa đủ được thể hiện rõ; AI không thay thế điểm chính thức.
- Chatbot chỉ trả lời theo tài liệu hỗ trợ, có trích dẫn phù hợp và từ chối khi không có căn cứ.
- Kiểm thử hồi quy, lỗi biên, backup/restore và các NFR ưu tiên có kết quả được ghi nhận.
- Tài liệu cài đặt, cấu hình, vận hành và bàn giao đầy đủ; không đưa secret vào mã nguồn.

## 6. Giả định, rủi ro và phương án xử lý

| Rủi ro/giả định | Ảnh hưởng | Phương án |
|---|---|---|
| Công thức KPI/rủi ro hoặc kỳ phân tích chưa được nghiệp vụ xác nhận | Dashboard và cảnh báo có thể phải sửa lại | Chốt và ký xác nhận ở đợt 1; mọi thay đổi sau đó đi qua backlog |
| Dữ liệu mẫu thiếu hoặc không nhất quán | Không thể đánh giá đúng analytics và khuyến nghị | Chuẩn bị bộ dữ liệu kiểm thử chuẩn; hiển thị “chưa đủ dữ liệu” khi thiếu bằng chứng |
| Luồng phụ huynh/quan hệ liên kết chưa đầy đủ | FR-13–FR-15 có thể vượt năng lực hai tháng | Ưu tiên đọc dữ liệu và liên kết an toàn; hoãn tính năng ngoài luồng tối thiểu nếu phát sinh |
| Ollama/model hoặc Supabase không sẵn sàng | Chatbot và demo có thể gián đoạn | Chuẩn bị dữ liệu/model thử nghiệm, thông báo lỗi rõ ràng và kịch bản demo dự phòng |
| Mục tiêu 1.000 người dùng đồng thời không thể xác minh trên hạ tầng hiện có | Không đủ căn cứ công bố đạt NFR-02 | Thực hiện load test trong môi trường phù hợp; báo cáo cấu hình, giới hạn và kết quả thực đo |
| Phạm vi SRS vượt thời gian hoặc nhân lực | Rủi ro trễ nghiệm thu | Ưu tiên bảo mật, dữ liệu đúng và luồng cốt lõi; điều phối phê duyệt cắt giảm trước khi lùi mốc |

## 7. Phân bổ nguồn lực đề xuất

Phân công theo vai trò, không gắn tên cá nhân khi chưa có danh sách thành viên:

- **Điều phối/Phân tích nghiệp vụ:** chốt phạm vi, công thức, backlog, theo dõi mốc và nghiệm thu.
- **Frontend:** dashboard, giao diện phụ huynh/quản trị, chatbot và xử lý trạng thái loading/lỗi.
- **Backend:** API, RBAC, kiểm tra phạm vi dữ liệu, audit log, tích hợp Supabase/Ollama.
- **Data/AI:** KPI, snapshot, risk assessment, recommendation và truy xuất tài liệu chatbot.
- **QA:** ma trận truy vết, test case, test hồi quy, kiểm tra phân quyền, hiệu năng và nghiệm thu.
- **Triển khai/Vận hành:** cấu hình môi trường, HTTPS, backup/restore, logging và hướng dẫn vận hành.

Mỗi đợt cần có kế hoạch đầu đợt, demo cuối đợt, rà soát lỗi và cập nhật ma trận truy vết để công việc được chia đều, không dồn kiểm thử và nghiệm thu vào tuần cuối.
