module.exports = {
  generator: `DẠNG: multiple-choice (trắc nghiệm).
Đúng 4 options khác nhau về giá trị, chỉ một đáp án đúng. Phương án nhiễu hợp lý, cùng dạng/đơn vị. Không dùng tất cả đều đúng/không có đáp án.
correctIndex là chỉ số từ 0 đến 3. Tự kiểm tra cả 4 phương án, kể cả phân số tương đương.
Explanation dùng nội dung/phép tính, không dùng nhãn A/B/C/D hoặc thứ tự phương án vì giao diện đảo lựa chọn.
Ví dụ một phần tử questions: {"type":"multiple-choice","question":"Kết quả của phép tính 12 + 7 là bao nhiêu?","options":["18","19","20","21"],"correctIndex":1,"explanation":"Cộng 12 với 7 được 19."}`,
  reviewer: `DẠNG: multiple-choice. Tự giải rồi thử từng option. Phải có đúng một phương án đúng và correctIndex trỏ tới phương án đó. Loại phương án trùng giá trị như 1/2 và 2/4; kiểm tra đơn vị và giải thích. Explanation không được dựa vào nhãn/thứ tự phương án.`
};
