# AI trong dự án

Tài liệu này mô tả các tính năng AI hiện có, cách chạy và đánh giá chúng, dữ liệu nào được gửi tới model, cùng cách theo dõi việc sử dụng AI. Hướng dẫn triển khai demo/container và cách tạo tài khoản theo vai trò nằm trong [README.md](./README.md); rubric chấm có ánh xạ tới code nằm trong [EVALUATION_CRITERIA.md](./EVALUATION_CRITERIA.md).

## Tóm tắt hệ thống AI

AI inference chạy qua **Ollama**; dự án không tích hợp API model bên thứ ba. Ollama được gọi từ backend Node/Express, không gọi trực tiếp từ trình duyệt. Ứng dụng vẫn cần **Supabase bên ngoài** cho đăng nhập, phân quyền, dữ liệu học tập, tài liệu và vector store.

| Chức năng | Điểm gọi | Model mặc định/được cấu hình | Mục đích |
|---|---|---|---|
| Tạo câu hỏi cho giáo viên | `POST /api/generate-quiz` | Mặc định `deepseek-r1:8b`; với loại câu hỏi cụ thể, ưu tiên `OLLAMA_CHAT_MODEL` và các model chat đã cài | Tạo câu hỏi theo prompt, nội dung/bài học được giáo viên chọn và loại câu hỏi |
| Chat trợ lý học tập | `POST /api/ai-chat` | Ưu tiên `OLLAMA_CHAT_MODEL` hoặc model chat đã cài phù hợp | Trả lời tiếng Việt ngắn gọn dựa trên đoạn Markdown được truy xuất, có nguồn |
| Tạo embedding và truy xuất tri thức | Ollama `/api/embed` và Supabase RPC `match_chatbot_kb_chunks` | `nomic-embed-text` | Tìm đoạn phù hợp trong file Markdown lưu ở Supabase Storage |
| Phân tích nguy cơ học tập | `services/riskAssessment.js` và các controller liên quan | Không gọi LLM | Quy tắc xác định dựa trên điểm/lượt làm bài và bài quá hạn; không phải dự đoán của model AI |

Model chat có thể được chọn từ danh sách model đang cài; cấu hình tên model không tự tải model xuống. Trong Compose, cần tải các model qua container Ollama trước khi dùng các chức năng AI. Không đưa URL, khóa hay thông tin đăng nhập riêng tư vào prompt.

## Cách sử dụng

### Giáo viên: tạo câu hỏi

1. Đăng nhập tài khoản giáo viên hoặc quản trị viên.
2. Mở khu vực **Bài tập**, nhập yêu cầu hoặc chọn nội dung/bài học phù hợp; chọn số lượng và dạng câu hỏi nếu giao diện hỗ trợ.
3. Backend gửi system prompt và user prompt tới Ollama `/api/generate`. Khi model trả kết quả thiếu hoặc không hợp lệ, backend thử tối đa ba lượt; chỉ nhận câu hỏi qua bộ kiểm tra schema/dạng câu hỏi, loại câu trùng và giới hạn số câu xử lý.
4. Giáo viên xem, chỉnh sửa và duyệt nội dung trước khi giao cho học sinh.

Endpoint chỉ cho `teacher` và `admin`. Một số đầu vào của tính năng này có thể đến từ nội dung người dùng tải lên hoặc tài liệu bài học; hãy chỉ dùng tài liệu có quyền sử dụng và không tải dữ liệu cá nhân nhạy cảm lên prompt.

### Học sinh: hỏi đáp theo tài liệu

1. Đăng nhập, mở giao diện học tập và mở **Hỏi bài trong tài liệu**.
2. Đặt câu hỏi ngắn, liên quan tới tài liệu Markdown đã có trong kho tri thức.
3. Backend tạo embedding cho câu hỏi, tìm các đoạn liên quan trong Supabase pgvector, rồi loại đoạn không đủ ngưỡng tương đồng hoặc không có bằng chứng từ khóa.
4. Chỉ các đoạn còn phù hợp được gửi cùng câu hỏi cho model chat. UI hiện câu trả lời và nguồn; có thể bật **Xem các đoạn truy xuất** để kiểm tra các đoạn top-K và điểm tương đồng.
5. Nếu không tìm được bằng chứng hoặc model không trả ID nguồn hợp lệ, chatbot từ chối trả lời chắc chắn. Hội thoại chỉ tồn tại trong state trình duyệt hiện tại, không được lưu làm lịch sử chat.

Tài liệu tri thức là các file `.md` trong bucket Supabase Storage. `npm run kb:ingest` lập chỉ mục thủ công; luồng chatbot cũng đồng bộ file mới/thay đổi trước khi truy xuất. Việc ingest cần Supabase service role ở backend và Ollama embedding model.

## Prompt, grounding và giới hạn

- Prompt chat hiện được định nghĩa trong `services/aiPolicy.js`, phiên bản `ai-chat-v2`. Nó yêu cầu trả lời tiếng Việt ngắn gọn, chỉ dùng bằng chứng tường minh trong tài liệu, bỏ qua chỉ dẫn nhúng trong tài liệu và từ chối một số yêu cầu không an toàn/ngoài vai trò.
- Trước khi gọi model chat, `getRefusalReason` áp dụng các mẫu từ chối trên câu hỏi, sau khi chuẩn hóa dấu tiếng Việt. Đây là lớp lọc heuristic hẹp, **không phải** bộ phân loại an toàn toàn diện; prompt cũng không thể bảo đảm model không bao giờ sinh nội dung sai hoặc không phù hợp.
- Đầu vào chat được giới hạn tối đa 1.000 ký tự; `includeChunks` phải là boolean.
- `validateGroundedReply` chỉ chấp nhận phản hồi đúng cấu trúc có ít nhất một ID nguồn thuộc các đoạn đã truy xuất. ID nguồn không hợp lệ bị loại bỏ. Câu trả lời không nguồn sẽ bị abstain; một số câu hỏi quy trình có thể được xử lý bằng các bước trích trực tiếp từ tài liệu.
- Tạo câu hỏi không có phiên bản LLM cố định cho mọi prompt do giáo viên cung cấp system/user prompt. Telemetry đánh dấu luồng này là `quiz-generator-v1`; khi thay đổi logic/prompt mặc định, cập nhật version để so sánh kết quả theo phiên bản.
- Mọi câu trả lời AI cần được kiểm tra bởi giáo viên/người dùng; bộ kiểm thử policy không chứng minh tính chính xác học thuật của model.

## Đánh giá AI

Bộ đánh giá AI độc lập với test ứng dụng hiện có:

```sh
npm run ai:evaluate
node --test tests/ai-policy.test.js
```

`tests/ai-evaluation.js` có 24 ca: 8 bình thường, 8 biên và 8 cần từ chối. Các ca kiểm tra chính sách từ chối, giới hạn đầu vào, abstain khi thiếu nguồn và tính hợp lệ của trích dẫn. Nó chạy offline với đầu ra giả lập, vì vậy tái lập được nhưng **không** đo chất lượng suy luận của model.

| Phiên bản | Đạt | Tỷ lệ |
|---|---:|---:|
| Trước cải tiến — phát lại policy cũ, không có chốt từ chối sớm | 16/24 | 66,7% |
| Sau cải tiến — `ai-chat-v2` và chốt từ chối sớm | 24/24 | 100% |

Tăng **33,3 điểm phần trăm**. Ollama không phản hồi tại môi trường chạy đánh giá ban đầu, nên chưa có benchmark inference trực tiếp. Không diễn giải tỷ lệ policy này thành độ chính xác của model. Khi thay đổi policy/prompt, cập nhật các ca tương ứng và chạy cả bộ này lẫn unit test; unit test hiện có không thay thế 24 ca đánh giá.

## Ghi nhận sử dụng và quyền riêng tư

`services/aiUsage.js` ghi request từ `/api/ai-chat` và `/api/generate-quiz` vào `public.ai_usage_logs`. Dữ liệu gồm:

- Tính năng, version prompt, model, mã trạng thái và thời điểm ghi.
- Token input/output và latency tổng request (ms), dựa trên số liệu Ollama trả về.
- Danh sách tool đã dùng, ví dụ `knowledge_retrieval` hoặc `procedure_answer`.
- User ID để kiểm toán và chi phí ước tính theo giá cấu hình.

Không lưu câu hỏi, prompt, câu trả lời, nội dung tài liệu hay thông tin xác thực vào bảng telemetry. Supabase service role chỉ dùng ở backend; RLS bật, quyền `anon`/`authenticated` bị thu hồi. Log telemetry có thể chứa lỗi vận hành, nên log server cũng cần được bảo vệ như dữ liệu production.

Áp dụng migration [028_ai_usage_observability.sql](./supabase/028_ai_usage_observability.sql) trong Supabase SQL Editor. Dùng `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` ở backend để ghi log/tổng hợp; dùng `SUPABASE_ANON_KEY` cho các truy cập theo user session. Lỗi ghi telemetry được log ở server, nhưng không biến phản hồi AI thành lỗi.

Các token thống kê đến từ API Ollama; riêng embedding chỉ được cộng vào token input nếu endpoint embedding trả về `prompt_eval_count`. Vì vậy đây là số liệu token **được ghi nhận**, có thể không phản ánh đầy đủ token thực tế của mọi model/Ollama version. Nếu model không báo token, giá trị ghi là 0.

Ollama chạy local mặc định có chi phí API bằng 0; chi phí điện/phần cứng không được tính. Có thể cấu hình hai biến `AI_INPUT_COST_PER_MILLION_USD` và `AI_OUTPUT_COST_PER_MILLION_USD` cho backend tính phí; khi đó chi phí ước tính theo token input/output và mức giá do operator khai báo. Không cấu hình khóa bí mật hoặc dữ liệu giá chứa thông tin nhạy cảm ở frontend.

## Dashboard admin

`GET /api/admin/ai-usage` yêu cầu tài khoản `admin`, tổng hợp 30 ngày gần nhất và trả số request thành công/lỗi, token, tổng/chi phí trung bình, độ trễ trung bình và tối đa 10 request gần đây. Dashboard hiển thị trạng thái tải/lỗi/không có dữ liệu rõ ràng, không thay số liệu bằng số mẫu. Cần áp dụng migration trước; sau đó phát sinh các request AI để dashboard có dữ liệu thực.

## Triển khai container

`Dockerfile` build frontend và tạo image production Express; `compose.yaml` khởi động app cùng Ollama với volume lưu model. Supabase vẫn phải được cấu hình riêng trong `.env` và các migration cần thiết phải được áp dụng trước khi demo. Xem README, mục **Chạy demo bằng Docker Compose**, để cài model, mở app và tạo tài khoản thử nghiệm theo từng vai trò.
