# Smart Learning System for Primary School

Dự án web hỗ trợ học tập cho học sinh tiểu học, dùng Ollama chạy local cho tạo câu hỏi và chatbot tra cứu tài liệu. Ứng dụng dùng Supabase bên ngoài cho đăng nhập và dữ liệu; xem [AI_USAGE.md](./AI_USAGE.md) để biết kiến trúc AI, cách sử dụng, đánh giá và telemetry.

Tài liệu thiết kế, user stories, bảng truy vết, sơ đồ kiến trúc và ADR nằm trong [docs/PROJECT_DESIGN.md](./docs/PROJECT_DESIGN.md). Ánh xạ rubric và checklist deliverables nằm trong [EVALUATION_CRITERIA.md](./EVALUATION_CRITERIA.md).

## Tính năng

- Tạo tự động câu hỏi trắc nghiệm từ nội dung đầu vào
- Hỗ trợ upload file văn bản `.txt`, `.docx`, `.pdf` hoặc nhập nội dung thủ công
- Sinh câu hỏi theo chủ đề và số lượng yêu cầu
- Tự động kiểm tra và lọc câu hỏi không hợp lệ
- Xuất câu hỏi ra file HTML hoặc TXT
- Chatbot hỏi đáp chỉ dựa trên Markdown trong Supabase Storage, tìm kiếm bằng Ollama embedding và hiển thị nguồn trích dẫn
- Hội thoại chatbot chỉ tồn tại trong phiên giao diện hiện tại, không lưu vào Supabase
- Model AI chạy local qua Ollama, không cần API key của nhà cung cấp AI
- Có thể chạy ứng dụng và Ollama trong Docker Compose; Supabase vẫn là dịch vụ bên ngoài

## Yêu cầu hệ thống

- Node.js 18+
- Ollama đã được cài đặt
- RAM đủ để chạy model local (khuyến nghị model `deepseek-r1:8b` trên máy mạnh)

## Cài đặt

1. Cài đặt Ollama tại: https://ollama.com/download
2. Mở terminal và bắt đầu Ollama:

   ```bash
   ollama serve
   ```

3. Pull model dùng cho dự án:

   ```bash
   ollama pull deepseek-r1:8b
   ollama pull llama3.2:3b
   ollama pull nomic-embed-text
   ```

4. Cài đặt dependency của project:

   ```bash
   npm install
   ```

5. Tạo file `.env` từ `.env.example`, rồi tự điền cấu hình Supabase và Ollama cho môi trường của bạn. Không đưa giá trị bí mật vào README, image, frontend hoặc Git. Danh sách tên biến được ghi ở mục [Biến môi trường](#biến-môi-trường).

   `SUPABASE_SERVICE_ROLE_KEY` chỉ đặt ở backend `.env`, không bao giờ đưa vào React/frontend hoặc commit lên Git.

   Ollama tạo câu hỏi theo luồng để tránh timeout khi model cần thời gian khởi động hoặc sinh nội dung dài. Nếu vẫn gặp timeout, kiểm tra Ollama tại `http://localhost:11434` và đảm bảo model trong `OLLAMA_MODEL` đã được tải.

6. Tạo bảng profile người dùng trong Supabase:

   - Mở **SQL Editor** trong Supabase.
   - Chạy nội dung file `supabase/001_create_users.sql`.
   - Supabase Auth vẫn quản lý mật khẩu trong `auth.users`; bảng `public.users` chỉ lưu profile và role.

7. Bật đăng nhập Google (tùy chọn):

   - Trong Supabase Dashboard, mở **Authentication → Sign In / Providers → Google**, bật provider và nhập OAuth Client ID/Secret lấy từ Google Cloud Console.
   - Thêm URL callback do Supabase hiển thị (dạng `https://<project-ref>.supabase.co/auth/v1/callback`) vào **Authorized redirect URIs** của OAuth Client trong Google Cloud.
   - Trong **Authentication → URL Configuration**, đặt Site URL và thêm các URL ứng dụng được phép chuyển hướng, ví dụ `http://localhost:3000/auth/callback`, `http://localhost:5173/auth/callback` và URL production tương ứng.
   - Dùng nút **Tiếp tục với Google** trên màn hình đăng nhập/đăng ký. Tài khoản mới qua Google được tạo mặc định với vai trò học sinh; quản lý có thể đổi role từ Supabase như các tài khoản hiện có.

8. Tạo bảng bài học:

   - Trong **SQL Editor**, chạy tiếp nội dung file `supabase/002_create_lessons.sql`.
   - Nếu đã có tài khoản giáo viên từ trước, chạy thêm `supabase/003_sync_existing_user_roles.sql` để đồng bộ role.
   - Chạy `supabase/004_add_lesson_content.sql` để thêm nơi lưu nội dung Word/PDF của từng bài học.
   - Nếu bấm lưu vẫn bị lỗi quyền, chạy thêm `supabase/005_fix_lesson_policies.sql`.
   - Chạy `supabase/006_create_quiz_attempts.sql` để lưu lịch sử làm bài và cho phép giáo viên theo dõi kết quả.
   - Nếu đã chạy các migration trước đó, chạy thêm `supabase/009_store_quiz_answers.sql` để lưu đề, đáp án đã chọn và các câu trả lời sai.
   - Chạy `supabase/010_add_profile_details.sql` để cho phép học sinh cập nhật họ tên, giới tính và ngày sinh; lớp học chỉ được hiển thị.
   - Chạy `supabase/011_add_student_to_class.sql` để giáo viên thêm học sinh vào lớp bằng email.
   - Chạy `supabase/007_create_mvp_learning.sql` để tạo lớp học, môn/chủ đề/kỹ năng, bài tập, câu hỏi và lượt nộp bài.
   - Nếu gặp lỗi `infinite recursion detected in policy for relation classes/class_members`, chạy thêm `supabase/008_fix_class_rls_recursion.sql`.
   - Chạy `supabase/016_create_feedback.sql` để giáo viên xem bài nộp chi tiết và lưu nhận xét cho học sinh.
   - Chạy `supabase/023_create_risk_alerts.sql` để lưu riêng cảnh báo Learning Analytics, cập nhật cảnh báo đang mở và giữ lịch sử cảnh báo đã đóng.
   - Chạy `supabase/024_enforce_assignment_deadlines.sql` để chặn bài nộp hết hạn trực tiếp tại Supabase; bài tập không có hạn tiếp tục nhận bài.
   - Chạy `supabase/027_chatbot_supabase_storage.sql` để tạo vector store pgvector cho chatbot và các bảng lịch sử có RLS theo tài khoản.
   - Chạy `supabase/028_ai_usage_observability.sql` để lưu telemetry và cấp quyền tổng hợp thống kê AI cho backend.
   - Nếu đã áp dụng migration thống kê AI trước đây, chạy `supabase/032_remove_ai_usage_costs.sql` để bỏ dữ liệu chi phí ước tính khỏi database.
   - Nếu trước đây đã tạo bảng `lesson_chunks`, chạy `supabase/026_remove_lesson_chunks.sql` để xóa bảng và hàm tìm kiếm cũ.

  - Chạy `supabase/017_lesson_chapters_storage.sql` để liên kết bài học với chương, tạo bucket riêng tư `lesson-materials` và policy đọc các bucket mẫu `Math4`/`Chapter1`.
  - Tài khoản **Giáo viên** mở `http://localhost:3000/teacher` → **Bài học** để chọn môn, tạo chương, thêm, sửa hoặc xóa bài học và chọn nguồn file từ máy hoặc các bucket chương hiện có (`Math4`, `Chapter1`–`Chapter3`). Nội dung bài được lưu trong `public.lessons`; `source_bucket` và `source_path` giữ địa chỉ file để backend mở lại bằng signed URL.
  - Nếu danh sách môn/chương thiếu dữ liệu từ các bài học đã có, chạy `supabase/019_sync_catalog_from_lessons.sql` trong Supabase SQL Editor để đồng bộ `subjects`, `topics` và `lessons.topic_id` từ `lessons.subject`/`lessons.topic`. Có thể chạy lại an toàn sau khi thêm bài học; tải lại trang **Bài học** sau khi chạy.
  - Chạy `supabase/019_backfill_lesson_source_filenames.sql` để điền `source_filename` còn thiếu từ `source_path` cho bài học thuộc `Chapter1`–`Chapter3`.
  - Chạy `supabase/022_fix_chapter_lesson_material_paths.sql` để sửa liên kết `C2B4.docx`–`C2B6.docx` sang các file thực có `Chapter1/C1B4.docx`–`C1B6.docx`.
  - Chạy `supabase/018_create_question_bank.sql` để tạo bảng `questions`, nơi giáo viên lưu và tái sử dụng câu hỏi trong ngân hàng câu hỏi.
  - Chạy `supabase/020_link_questions_to_lessons.sql` để lưu liên kết lesson trên bài tập, từng câu hỏi trong bài tập và câu hỏi ngân hàng; migration cũng gắn lesson cho các câu hỏi thuộc bài tập đã có.
  - Chạy `supabase/021_student_practice_question_access.sql` để cho phép học sinh đọc câu hỏi ngân hàng thuộc bài học đã xuất bản và dùng nút **Luyện tập ngay** trong bài học.
  - Tài khoản đăng ký với vai trò **Giáo viên** có thể mở `http://localhost:3000/teacher` để thêm, sửa, xoá và xuất bản bài học.
  - Trong **Bài tập**, giáo viên chọn một bài học (kể cả bản nháp) làm nguồn, tạo câu hỏi bằng AI local, kiểm tra/chỉnh sửa rồi xuất bản cho lớp. Học sinh chỉ làm các bài tập giáo viên đã giao; API tạo câu hỏi AI chỉ cho phép giáo viên/quản trị viên.
  - Trong mục **Bài tập**, nút **Nạp toàn bộ file mẫu từ Supabase Storage** đọc các file PDF, DOCX, TXT, Markdown, CSV và JSON từ cả hai bucket `Math4` và `Chapter1`; nội dung đã trích xuất được dùng trực tiếp làm nguồn cho AI tạo câu hỏi.

   - Trang học sinh chỉ hiển thị các bài học đã được giáo viên xuất bản.

8. Chạy frontend ở chế độ phát triển:

   ```bash
   npm run dev
   ```

9. Tạo hoặc cập nhật vector store cho chatbot từ Supabase Storage:

   ```bash
   npm run kb:ingest
   ```

   Chạy lần lượt migration `supabase/027_chatbot_supabase_storage.sql`, `supabase/028_chatbot_multi_file_search.sql` và `supabase/029_disable_chat_history_storage.sql` trong Supabase SQL Editor; migration đầu tạo bucket riêng tư `Math4mdfile`, migration thứ hai bật tìm kiếm trên nhiều file, migration cuối vô hiệu hóa quyền và hàm lưu lịch sử cũ mà không xóa dữ liệu đã tồn tại. Tải file `.md` lên bucket đó (có thể đặt trong thư mục con). `KB_STORAGE_BUCKET` chọn bucket; `KB_STORAGE_PREFIX` không bắt buộc và có thể giới hạn việc quét vào một thư mục. Khi có câu hỏi, chatbot quét danh sách file Markdown, tự thêm file mới, cập nhật file đã đổi và bỏ vector của file đã xóa; vì vậy file mới được nạp tự động trước khi chatbot trả lời câu hỏi kế tiếp. Lệnh `npm run kb:ingest` cũng quét và đồng bộ toàn bucket thủ công. Chatbot tải Markdown bằng service role ở backend, chia theo mục, tạo embedding bằng Ollama (`nomic-embed-text`) và lưu vector trong Supabase pgvector. `SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng ở server, không đưa vào frontend. Vector được xếp hạng bằng cosine similarity; mặc định lấy 4 đoạn gần nhất và chỉ dùng đoạn đạt ngưỡng tương đồng cấu hình. Nội dung chat chỉ nằm trong giao diện hiện tại; đóng hoặc tải lại trang sẽ mất. Có thể ép tạo lại toàn bộ vector:

   ```bash
   npm run kb:ingest -- --rebuild
   ```

   Cả embedding lẫn model trả lời đều chạy qua Ollama. Chatbot chỉ gửi các đoạn có bằng chứng vào model, kiểm tra ID nguồn model trả về và từ chối câu trả lời không có trích dẫn hợp lệ. Nút **Xem các đoạn truy xuất** trong cửa sổ chat hiển thị các đoạn top‑K cùng điểm tương đồng để kiểm tra luồng tìm kiếm.

   Vite sẽ chạy tại `http://localhost:5173` và chuyển tiếp các request `/api`
   tới backend ở port `3000`. Trong một terminal khác, chạy backend:

   ```bash
   npm run serve
   ```

   Hoặc chạy cả quy trình production:

   ```bash
   npm start
   ```
9. Mở trình duyệt tại:

   ```text
   http://localhost:3000
   ```

   Trang đăng nhập/đăng ký nằm tại `/` (route `/auth` sẽ chuyển về `/`).

## Chạy demo bằng Docker Compose

Compose chạy app Express/React và Ollama trong hai container. Supabase Auth, database, Storage và pgvector vẫn dùng project Supabase bên ngoài; chuẩn bị các biến Supabase trước khi khởi động.

1. Cài Docker Desktop hoặc Docker Engine kèm Docker Compose plugin.
2. Sao chép `.env.example` thành `.env` (PowerShell: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`) và điền cấu hình Supabase của riêng bạn. Không chia sẻ hoặc commit `.env`.
3. Trong Supabase SQL Editor, áp dụng các migration ứng dụng cần thiết theo thứ tự trong phần **Cài đặt**, bao gồm `supabase/027_chatbot_supabase_storage.sql`, `supabase/028_chatbot_multi_file_search.sql`, `supabase/029_disable_chat_history_storage.sql` và `supabase/028_ai_usage_observability.sql` để bật thống kê AI. Nếu database đã dùng phiên bản migration thống kê cũ, áp dụng thêm `supabase/032_remove_ai_usage_costs.sql`.
4. Khởi động container:

   ```bash
   docker compose up --build -d
   ```

5. Tải các model vào volume của Ollama (có thể mất thời gian và cần nhiều dung lượng):

   ```bash
   docker compose exec ollama ollama pull deepseek-r1:8b
   docker compose exec ollama ollama pull llama3.2:3b
   docker compose exec ollama ollama pull nomic-embed-text
   ```

   Nếu cần đồng bộ kho tài liệu chatbot từ container, chạy `docker compose exec app npm run kb:ingest`. File Markdown nguồn cần có trong Supabase Storage bucket đã cấu hình; chatbot cũng tự đồng bộ khi nhận câu hỏi đầu tiên.

6. Mở `http://localhost:3000`. Kiểm tra trạng thái app bằng `http://localhost:3000/health`.

Các lệnh quản lý:

```bash
docker compose ps
docker compose logs -f app
docker compose down
```

Model Ollama được giữ trong volume `ollama-data` qua các lần dừng/chạy. Xóa volume sẽ xóa các model đã tải. Cần cân nhắc RAM/CPU của máy; có thể cần cấu hình GPU riêng cho Docker nếu muốn tăng tốc.

### Tài khoản demo và kiểm tra theo vai trò

Repository không chứa URL deployment công khai hoặc tài khoản/mật khẩu demo dùng chung. Tài khoản phải được tạo trong project Supabase của từng môi trường; không dùng thông tin đăng nhập mẫu hoặc mật khẩu dùng chung trong tài liệu.

| Vai trò | Cách tạo tài khoản demo |
|---|---|
| Học sinh | Đăng ký ở trang đăng nhập. Tài khoản đăng ký công khai được cấp vai trò học sinh. |
| Giáo viên | Đăng nhập bằng tài khoản quản trị, tạo giáo viên tại mục quản lý nhanh, rồi đăng nhập bằng tài khoản giáo viên vừa tạo. |
| Quản trị viên đầu tiên | Chủ project tạo user qua Supabase Auth Admin/Dashboard, xác nhận hồ sơ ở `public.users`, rồi cập nhật role `admin` trong Supabase SQL Editor bằng UUID của user vừa tạo. Không cấp role admin cho tài khoản công khai. |

Để demo, đăng nhập từng vai trò bằng tài khoản do bạn tự tạo, kiểm tra quyền tương ứng, và tạo lớp/bài tập/dữ liệu học thử. Dùng tài khoản thử nghiệm riêng, không đưa mật khẩu hoặc access token vào README, issue hay ảnh chụp màn hình.

Ví dụ cấp vai trò quản trị cho user bootstrap (thay placeholder bằng UUID lấy từ Supabase Auth Dashboard; chỉ chủ project thực hiện):

```sql
update public.users
set role = 'admin'
where id = '<AUTH_USER_UUID>';
```

### Biến môi trường

README chỉ liệt kê **tên** biến; `.env.example` là mẫu rỗng để sao chép. Không điền giá trị thật trong README.

| Biến | Mục đích |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_ANON_KEY` | Khóa public/anon dùng phía server cho truy cập theo phiên người dùng |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa quản trị chỉ dùng ở backend |
| `PORT` | Cổng HTTP của ứng dụng |
| `OLLAMA_BASE_URL` | Địa chỉ Ollama; Compose tự trỏ app tới service `ollama` |
| `OLLAMA_MODEL` | Model mặc định cho tạo câu hỏi |
| `OLLAMA_QUIZ_MODEL` | Model riêng cho tạo và kiểm tra bài tập; ưu tiên qwen2.5:7b khi chưa cấu hình |
| `OLLAMA_CHAT_MODEL` | Model ưu tiên cho chatbot |
| `OLLAMA_EMBEDDING_MODEL` | Model tạo embedding cho truy xuất tài liệu |
| `KB_TOP_K` | Số đoạn tài liệu lấy khi truy xuất |
| `KB_MIN_SIMILARITY` | Ngưỡng tương đồng tối thiểu của đoạn truy xuất |
| `KB_STORAGE_BUCKET` | Bucket Supabase Storage chứa tài liệu Markdown |
| `KB_STORAGE_PREFIX` | Thư mục con tùy chọn trong bucket |

## Kiến trúc ứng dụng

Frontend sử dụng React và Vite:

- `index.html`: entrypoint của Vite.
- `src/main.jsx`: khởi tạo React và render `App`.
- `src/App.jsx`: điều hướng client-side, kiểm tra session và phân quyền.
- `src/pages/AdminPage.jsx`: trang quản trị hệ thống.
- `src/pages/TeacherPage.jsx`: dashboard giáo viên.
- `src/pages/StudentHomePage.jsx`: trang học tập của học sinh.
- `src/pages/AuthPage.jsx`: đăng nhập và đăng ký.
- `src/pages/AccountPage.jsx`: thông tin cá nhân và lịch sử làm bài.
- `src/components/`: các thành phần UI dùng chung như header, thương hiệu và phân quyền.
- `src/features/assignments/`: tạo bài tập AI, bài tập được giao và xử lý nộp bài.
- `src/features/lessons/`: hiển thị bài học và khởi tạo bài tập AI từ bài học.
- `services/knowledgeBase.js`, `services/aiPolicy.js`, `services/aiUsage.js`: lập chỉ mục/truy xuất tài liệu, policy chat và telemetry AI ở backend.
- `src/services/`: gọi API, đọc session, điều hướng và đăng xuất.
- `src/styles.css`: style dùng chung của ứng dụng React.
- `public/css/`: style theo từng khu vực, được tải theo route.

Backend sử dụng Express theo mô hình routes/controllers/models:

- `routes/authRoutes.js`: định tuyến đăng nhập và API tạo tài khoản giáo viên dành riêng cho quản lý.
- `controllers/authController.js`: kiểm tra input và định dạng response.
- `models/userModel.js`: giao tiếp với Supabase Auth.
- `supabase/002_create_lessons.sql`: bảng bài học và chính sách RLS.
- `supabase/016_create_feedback.sql`: bảng nhận xét bài nộp và chính sách truy cập cho giáo viên/học sinh.
- `server.js`: khởi tạo Express, đăng ký API, phục vụ thư mục `dist` và tài nguyên tĩnh.

Các giao diện HTML/JavaScript cũ trong `views/`, `client/` và `public/js/`
đã được loại bỏ; toàn bộ giao diện hiện tại chạy từ React/Vite.

## API chính

Các API tạo và tải đề yêu cầu access token Supabase trong header
`Authorization: Bearer <access_token>`. Người dùng chưa đăng nhập sẽ được
chuyển tới `/auth`.

### POST /api/generate-quiz

Tạo câu hỏi trắc nghiệm từ `systemPrompt` và `userPrompt`.

Request mẫu:

```json
{
  "systemPrompt": "Bạn là giáo viên tiểu học. Hãy tạo câu hỏi trắc nghiệm theo đúng định dạng JSON.",
  "userPrompt": "Tạo 5 câu hỏi môn Toán lớp 3 về phép cộng và trừ."
}
```

Response mẫu:

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctIndex\":0,\"explanation\":\"...\"}]"
    }
  ],
  "raw": {
    "questionsGenerated": 5,
    "requestedCount": 5
  }
}
```

### POST /api/download-quiz

Xuất bộ câu hỏi ra file HTML hoặc TXT.

```json
{
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ],
  "format": "html",
  "filename": "de-on-tap"
}
```

## Lưu ý

- Dự án dùng model local Ollama, không cần API key nhà cung cấp AI; tuy nhiên ứng dụng cần cấu hình Supabase để xác thực và lưu dữ liệu.
- Nếu Ollama chưa chạy hoặc model chưa được pull, server sẽ trả lỗi rõ ràng.
- Nếu máy bạn mạnh hơn, bạn có thể thay model ở `.env` thành `deepseek-r1:14b` hoặc các model khác phù hợp.
- Bản mặc định hiện đang dùng: `deepseek-r1:8b`.
- Kết quả đánh giá policy, cách chạy bộ kiểm thử và giới hạn của benchmark được ghi trong [AI_USAGE.md](./AI_USAGE.md).

## Xử lý sự cố

Nếu app không chạy:

```bash
ollama serve
ollama list
```

Nếu model chưa có:

```bash
ollama pull deepseek-r1:8b
```

Sau đó chạy lại:

```bash
npm start
```
### Chat trợ lý học tập

Chat sử dụng model Ollama được cấu hình trong `OLLAMA_CHAT_MODEL`. Nội dung hội thoại không được lưu trên server hoặc gửi làm lịch sử cho model; các câu hỏi được trả lời dựa trên nội dung truy xuất từ kho tài liệu.

### Chất lượng câu hỏi giáo viên
Chọn lớp, mức độ và yêu cầu riêng trước khi tạo. Backend dùng JSON schema theo dạng câu hỏi, kiểm tra số học đơn giản bằng phân số chính xác, rồi gọi model phản biện đáp án. Câu không đạt được tạo bù tối đa ba lượt; có thể trả bộ ngắn hơn số yêu cầu để không chèn câu sai. Trắc nghiệm và vế phải nối cặp được đảo nhưng giữ đúng chỉ số đáp án. Giáo viên vẫn cần duyệt nội dung trước khi giao. Prompt nằm trong prompts/quiz.js, phiên bản quiz-generator-v2. Thời gian chờ toàn bộ tối đa 180 giây.
