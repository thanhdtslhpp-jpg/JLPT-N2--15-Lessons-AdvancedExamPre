# 🤖 MASTER AGENT SYSTEM PROMPT: SỐ HÓA TOÀN DIỆN 15 BUỔI LUYỆN ĐỀ JLPT N2



> **Đường dẫn thư mục nguồn tài liệu gốc (Đồng bộ đa thiết bị Google Drive - Máy Nhà & Máy Công Ty):**  
>
> 🏢 **1. Khi làm việc trên Máy Tính Công Ty:**
> * **Đường dẫn Google Drive công ty:** `G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy\BÍ KÍP LUYỆN ĐỀ N2`  
> * *(Hoặc thư mục gốc shortcut:* `G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy`*)*
> * **Lý do & Quy định:** Máy tính công ty và ở nhà dùng chung Google Drive và tự động đồng bộ hóa với nhau. Khi người dùng làm việc trên máy tính công ty, Agent bắt buộc sử dụng thư mục Google Drive tại công ty (`G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy\BÍ KÍP LUYỆN ĐỀ N2`) để quét đệ quy, trích xuất và thực hiện toàn bộ công việc số hóa tài liệu.
>
> 🏠 **2. Khi làm việc trên Máy Tính Ở Nhà:**
> * **Đường dẫn Google Drive ở nhà:** `G:\.shortcut-targets-by-id\14u_Pa3_lz_o2_GM0U2922KTDUJqqlZda\(15 BUỔI) LUYỆN ĐỀ CHUYÊN SÂU`
>
> 🔄 **Cơ chế tự động phát hiện môi trường (Dynamic Auto-Detection):**
> * Agent luôn tự động kiểm tra sự tồn tại của thư mục nguồn trên máy đang thực thi (`os.path.exists`).
> * Nếu môi trường có thư mục Google Drive công ty `G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy\BÍ KÍP LUYỆN ĐỀ N2`, Agent lập tức sử dụng thư mục này để thực hiện số hóa không gián đoạn.
>
> **Mục tiêu tối thượng:**  

> Số hóa đầy đủ 100% các bài tập, câu hỏi theo từng buổi (từ Buổi 1 đến Buổi 15) từ thư mục gốc vào ứng dụng web `jlpt-n2-practice`. **Tuyệt đối không bỏ sót bất kỳ tài liệu nào, không bỏ sót bất kỳ câu hỏi/mondai nào** trong mỗi buổi: Từ Từ Vựng - Hán Tự (Mondai 1-6), Ngữ Pháp - Dấu Sao ★ (Mondai 7-9), Đọc Hiểu (Mondai 10-14), và **Đồng bộ hóa toàn diện phần Nghe Hiểu (Choukai Mondai 1-5)** với đầy đủ File Audio chuẩn cắt từng câu, Trình phát đa tốc độ, Lời thoại Script Nhật - Việt và Lời giải thích phân tích sư phạm.



---



## 1. 🎯 NGUYÊN TẮC CỐT LÕI (CORE MANDATES)



### 1.1. Nguyên tắc "Không bỏ sót" (Zero-loss Mandate)

- Trong thư mục của từng buổi (ví dụ `BUỔI 2`, `BUỔI 3`,...):

  - **Phải quét đệ quy (recursive)** tất cả các thư mục con và tất cả các file tài liệu (`.pdf`, `.docx`, `.txt`, thư mục `Đề thi`, `ĐÁP ÁN`, `Chuyên đề bổ trợ`).

  - **Trích xuất toàn bộ câu hỏi của tất cả các Mondai**: Từ Mondai 1 (Cách đọc Kanji) đến Mondai 14 (Tìm kiếm thông tin đọc hiểu).

  - Nếu một buổi có nhiều file (ví dụ: vừa có đề thi năm X vừa có chuyên đề từ vựng/đọc hiểu đi kèm), **phải số hóa TẤT CẢ các câu hỏi từ tất cả các file đó** và gộp vào đúng các phần của buổi thi, không được lược bớt câu nào vì lý do dung lượng hay tiết kiệm thời gian.



### 1.2. Nguyên tắc "Chuẩn hóa toàn diện Nghe hiểu Choukai" (Comprehensive Choukai Mandate)

- **Trích xuất & Cắt nhỏ Audio theo từng câu hỏi**:
  - Mỗi câu hỏi nghe hiểu bắt buộc đi kèm 1 file audio riêng biệt định dạng `.mp3`, lưu trong thư mục `audio/buoi_XX/` theo quy ước đặt tên: `m{mondai}_{stt:02d}.mp3` (Ví dụ: `audio/buoi_06/m1_01.mp3`, `audio/buoi_06/m2_01.mp3`).
  - Nếu file nguồn là cả đề dài (như ở Buổi 1, 2, 12): Sử dụng ffmpeg / python để cắt nhỏ chính xác từng câu từ lúc bắt đầu đọc câu hỏi/hội thoại đến khi kết thúc lựa chọn.
- **Đầy đủ 100% Lời thoại (Script) & Dịch nghĩa song ngữ**:
  - Bắt buộc có kịch bản hội thoại tiếng Nhật (`🎧 Nội dung bài nghe`), trong đó **bôi đậm (`<b>...</b>`)** câu hoặc từ khóa quyết định chốt hạ đáp án.
  - Có bản dịch toàn văn tiếng Việt chuẩn xác (`🇻🇳 Dịch nghĩa toàn bộ đoạn hội thoại`).
  - Phân tích chi tiết tại sao chọn phương án đúng và chỉ rõ các bẫy thường gặp của các phương án sai (`💡 Phân tích chọn đáp án`).
- **Tương thích hoàn hảo với Player trong ứng dụng**:
  - Hỗ trợ cả 2 trường `audio` và `audioSrc` để ứng dụng nhận diện ngay lập tức.
  - Gán cờ `isChoukai: true` và `type: "audio"` để app kích hoạt giao diện chuyên biệt cho nghe hiểu (bộ chỉnh tốc độ 0.8x, 1.0x, 1.2x và cơ chế ẩn/hiện script).



### 1.3. Nguyên tắc "Chuẩn hóa sư phạm" (Educational Quality)

- Mỗi câu hỏi trắc nghiệm phải có đủ **4 đáp án**.

- Mỗi câu hỏi **bắt buộc có trường `explanation` chi tiết bằng tiếng Việt**:

  - Dịch nghĩa câu văn sang tiếng Việt chuẩn xác.

  - Phân tích nghĩa của từ đúng và lý do các phương án còn lại sai.

  - Với phần ngữ pháp: Nêu rõ cấu trúc `～...`, ý nghĩa và ngữ cảnh sử dụng.

  - Với phần đọc hiểu: Nêu rõ vị trí thông tin trong bài khoanh vùng đáp án.



---




### 1.4. Nguyên tắc "Thực hiện code, kiểm tra kỹ lưỡng và Tự động Commit & Push lên GitHub" (Zero-Friction Git Automation)
- **Thực hiện code và kiểm tra kỹ lưỡng (Verification First):**
  - Mọi thay đổi mã nguồn (HTML, CSS, JavaScript, Data) phải được kiểm tra cú pháp (ví dụ `node -c`), logic hoạt động, giao diện hiển thị và tính tương thích responsive trên cả Desktop lẫn Mobile trước khi bàn giao cho người dùng.
- **Tự động Commit & Push thẳng lên GitHub (Automated Commit & Push):**
  - Sau mỗi lần thực hiện chỉnh sửa hoặc bổ sung tính năng thành công, Agent **tự động kiểm tra `git status`, gom file (`git add`), tạo commit với nội dung súc tích rõ ràng (`git commit -m "..."`) và đẩy thẳng lên kho lưu trữ từ xa (`git push origin main`)**.
  - Người dùng tuyệt đối không cần phải mở GitHub Desktop hay thực hiện các thao tác commit/push thủ công gây phiền toái.

---

### 1.5. Nguyên tắc "Đồng bộ Đa Thiết bị qua Google Drive (Máy Nhà & Máy Công Ty)" (Multi-Environment Sync Mandate)
- **Dùng chung Google Drive:** Máy tính công ty và máy tính ở nhà cùng dùng chung tài khoản Google Drive và đồng bộ dữ liệu liên tục với nhau.
- **Khi làm việc trên Máy tính Công ty:**
  - Agent sử dụng thư mục Google Drive tại công ty: `G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy\BÍ KÍP LUYỆN ĐỀ N2` (hoặc `G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy`).
  - Toàn bộ việc quét đệ quy, đọc và trích xuất tài liệu (PDF, docx, ảnh, audio) để số hóa đều lấy trực tiếp từ thư mục Google Drive công ty này.
- **Khi làm việc trên Máy tính Ở Nhà:**
  - Agent sử dụng thư mục Google Drive ở nhà: `G:\.shortcut-targets-by-id\14u_Pa3_lz_o2_GM0U2922KTDUJqqlZda\(15 BUỔI) LUYỆN ĐỀ CHUYÊN SÂU`.
- **Tự động thích ứng môi trường (Dynamic Environment Detection):**
  - Trước khi đọc dữ liệu, Agent dùng lệnh kiểm tra đường dẫn thư mục nào đang tồn tại trên máy hiện hành (`os.path.exists`) để tự động chọn đúng nguồn Google Drive tương ứng mà không làm gián đoạn người dùng.

---

## 2. 📁 TIẾN ĐỘ SỐ HÓA & ÁNH XẠ DỮ LIỆU ĐÍCH



| Buổi | Thư mục nguồn tại (15 BUỔI) LUYỆN ĐỀ CHUYÊN SÂU\ | File đích tại dự án | Tiến độ Đọc - Viết | Tiến độ Nghe hiểu (Choukai) |
| :--- | :--- | :--- | :---: | :---: |
| **Buổi 1** | BUỔI 1 *(Đề T12/2024, Đề 12/2015, Mondai 2, Sougou)* | data/buoi_01.js | ✅ **Hoàn thành** (71 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 2** | BUỔI 2 *(Đề Thi Thật 07/2024, Chokuzen 8, So sánh)* | data/buoi_02.js | ✅ **Hoàn thành** (161 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 3** | BUỔI 3 *(Mondai 6, Hán tự Tiền tố, Super NP, Choukai M2)* | data/buoi_03.js | ✅ **Hoàn thành** (80 câu) | ✅ **Hoàn thành** (6 câu Audio M2) |
| **Buổi 4** | BUỔI 4 *(Goukaku Moshi, Super NP, Choukai M3 & M4)* | data/buoi_04.js | ✅ **Hoàn thành** (168 câu) | ✅ **Hoàn thành** (17 câu Audio M3-M4) |
| **Buổi 5** | BUỔI 5 *(Đề T7/2016, Chuyên đề Dấu sao ★, Choukai M2-M3)* | data/buoi_05.js | ✅ **Hoàn thành** (109 câu) | ✅ **Hoàn thành** (10 câu Audio M2-M3) |
| **Buổi 6** | BUỔI 6 *(Đề 07/2018, Dấu sao ★, Choukai Mondai 1 & 2)* | data/buoi_06.js | ✅ **Hoàn thành** (165 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 7** | BUỔI 7 *(Đề Tổng hợp 합격시グナル, M4, M5, Choukai M1 & 2)* | data/buoi_07.js | ✅ **Hoàn thành** (177 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 8** | BUỔI 8 *(Đề Mô phỏng 2 3A, Super 3, Choukai M1 & 2)* | data/buoi_08.js | ✅ **Hoàn thành** (124 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 9** | BUỔI 9 *(Đề Mô phỏng 4, Phó từ, Shinkanzen, Choukai M1 & 2)* | data/buoi_09.js | ✅ **Hoàn thành** (122 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 10** | BUỔI 10 *(Đề Thi Thật 07/2025, Động từ & Tính từ, Choukai M1 & 2)* | data/buoi_10.js | ✅ **Hoàn thành** (172 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 11** | BUỔI 11 *(Đề Thi Thử Đề 5, Quán dụng ngữ, Choukai M1 & 2)* | data/buoi_11.js | ✅ **Hoàn thành** (179 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 12** | BUỔI 12 *(Đề Thi Thật 07/2021, Đọc hiểu chuyên sâu)* | data/buoi_12.js | ✅ **Hoàn thành** (138 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 13** | BUỔI 13 *(Kính ngữ, Goukaku Moshi Đề 2)* | data/buoi_13.js | ✅ **Hoàn thành** (140 câu) | ✅ **Hoàn thành** (12 câu Audio M1-M2) |
| **Buổi 14** | BUỔI 14 *(Đề Thi Thử HQ 1, Siêu chuyên đề 10)* | data/buoi_14.js | ✅ **Hoàn thành** (109 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 15** | BUỔI 15 *(Mock Test 3 Kanzen Moshi, Đại tổng ôn)* | data/buoi_15.js | ✅ **Hoàn thành** (110 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
> 🎧 **Tài nguyên Nghe hiểu:** Sử dụng nguồn audio trực tiếp trong từng thư mục buổi hoặc thư mục `LUYỆN TẬP NGHE HIỂU`. Các file audio đều được phân phối về thư mục chuẩn `audio/buoi_XX/`.



---



## 3. 📐 SCHEMA CẤU TRÚC FILE `data/buoi_XX.js`



File dữ liệu phải tuân thủ nghiêm ngặt 100% chuẩn JavaScript sau:



```javascript

window.JLPT_DATA = window.JLPT_DATA || {};

window.JLPT_DATA[SESSION_ID] = {

  id: SESSION_ID,

  title: "BUỔI X: [Tên buổi theo đúng tài liệu]",

  durationMinutes: 105,

  sections: [

    {

      id: "moji_goi",

      name: "文字・語彙 (Từ vựng & Chữ Hán)",

      icon: "fa-book",

      questions: [

        /* Mondai 1: Cách đọc Kanji (Dùng <ruby>Từ<rt>______</rt></ruby>)

           Mondai 2: Cách viết Kanji

           Mondai 3: Cấu tạo từ ghép

           Mondai 4: Chọn từ theo ngữ cảnh

           Mondai 5: Từ gần nghĩa / Thay thế

           Mondai 6: Cách dùng từ đúng (Sentence usage) */

      ]

    },

    {

      id: "bunpou",

      name: "文法 (Ngữ pháp & Dấu sao ★)",

      icon: "fa-pencil-alt",

      questions: [

        /* Mondai 7: Ngữ pháp câu đơn

           Mondai 8: Sắp xếp câu dấu sao (Xem cấu trúc đặc thù mục 3.2)

           Mondai 9: Ngữ pháp trong đoạn văn */

      ]

    },

    {

      id: "dokkai",

      name: "読解 (Đọc hiểu Đoản văn, Trung văn, So sánh, Trường văn, Tìm thông tin)",

      icon: "fa-file-alt",

      questions: [

        /* Mondai 10: Đoản văn (Khoảng 200 chữ, 1 câu hỏi/đoạn)

           Mondai 11: Trung văn (Khoảng 500 chữ, 3 câu hỏi/bài)

           Mondai 12: So sánh A - B (2 bài văn so sánh đối chiếu)

           Mondai 13: Trường văn (Khoảng 1000 chữ, chủ đề nghị luận)

           Mondai 14: Tìm kiếm thông tin (Thông báo, tờ rơi, bảng biểu) */

      ]

    },

    {

      id: "choukai",

      name: "聴解 (Nghe hiểu - Mondai 1 & 2 / Mondai 3 & 4)",

      icon: "fa-headphones",

      questions: [

        /* Mondai 1: 課題理解 (Xử lý tình huống có tranh/không tranh)

           Mondai 2: ポイント理解 (Nắm bắt điểm then chốt)

           Mondai 3: 概要理解 (Nắm bắt khái quát/chủ đề)

           Mondai 4: 即時応答 (Phản xạ tức thì)

           Mondai 5: 統合理解 (Nghe hiểu tổng hợp dài) */

      ]

    }

  ]

};

```



### 3.1. Cấu trúc câu hỏi trắc nghiệm thông thường (Mondai 1-7, 9)

```javascript

{

  id: 1, // ID số nguyên duy nhất tăng dần trong buổi (1..N)

  mondai: 1, // Số thứ tự Mondai từ 1 đến 14 (Rất quan trọng để app phân loại điểm chuẩn)

  mondaiName: "問題１：言葉の読み方 (Cách đọc Kanji)",

  sentence: "山本さんは<ruby>優秀<rt>______</rt></ruby>な社員だ。",

  targetWord: "優秀",

  options: ["ゆしゅう", "ゆうしゅ", "ゆしゅ", "ゆうしゅう"],

  correctAnswer: 4, // 1-based index (1, 2, 3 hoặc 4)

  explanation: "優秀（ゆうしゅう）：Ưu tú, xuất sắc.<br><b>Dịch nghĩa:</b> Anh Yamamoto là nhân viên xuất sắc."

}

```



### 3.2. Cấu trúc câu hỏi Dấu sao $\star$ Mondai 8 (`isStarQuestion: true`)

```javascript

{

  id: 41,

  mondai: 8,

  isStarQuestion: true,

  mondaiName: "問題８：文の組み立て (Sắp xếp câu dấu sao ★)",

  beforeText: "長く使っている電子レンジが壊れてしまった。古いものだし、修理に",

  afterText: "買い替えたほうがいいかもしれない。",

  starPositionIndex: 3, // Vị trí dấu sao: 1, 2, 3 hoặc 4

  fragments: [

    { id: 1, text: "もう" },

    { id: 2, text: "考えると" },

    { id: 3, text: "かかる" },

    { id: 4, text: "費用を" }

  ],

  correctOrder: [3, 4, 2, 1], // Thứ tự 4 mảnh ghép để tạo câu đúng

  correctStarOption: 2, // Phải luôn khớp: correctOrder[starPositionIndex - 1] === 2

  explanation: "Thứ tự sắp xếp đúng: 修理に <b>[かかる(3)] [費用を(4)] [★ 考えると(2)] [もう(1)]</b> 買い替えたほうがいいかもしれない。<br><b>Cấu trúc:</b> N + を考えると.<br><b>Đáp án chọn:</b> 2"

}

```



### 3.3. Cấu trúc câu hỏi Đọc hiểu (Mondai 10-14)

```javascript

{

  id: 52,

  mondai: 10,

  mondaiName: "問題10：短文読解 (Đoản văn)",

  passage: `Nội dung đoạn văn tiếng Nhật đầy đủ...`,

  questionText: "筆者によると、良いアイデアを生み出すために必要なことは何か。",

  options: [

    "Phương án 1...",

    "Phương án 2...",

    "Phương án 3...",

    "Phương án 4..."

  ],

  correctAnswer: 2,

  explanation: "<b>Dịch bài:</b> 'Ý tưởng không phải tự nhiên đến...'<br><b>Phân tích:</b> Theo dòng thứ 3 của bài viết... nên đáp án đúng là 2."

}

```

> *Lưu ý Đọc hiểu:* Nếu 1 bài đọc dài có nhiều câu hỏi (Mondai 11 Trung văn có 3 câu, Mondai 12 So sánh có 2 câu, Mondai 13 Trường văn có 3 câu, Mondai 14 có 2 câu), chỉ cần gắn `passage` vào câu đầu tiên của nhóm, các câu tiếp theo của cùng bài đó hệ thống sẽ tự động liên kết hiển thị hoặc gắn đầy đủ `passage` vào từng câu.

### 3.4. Cấu trúc câu hỏi Nghe hiểu (`isChoukai: true`, Mondai 1 - 5)

Mỗi câu hỏi nghe hiểu phải tuân thủ nghiêm ngặt cấu trúc dưới đây để tương thích 100% với trình phát audio đa tốc độ, hệ thống ẩn/hiện script và chấm điểm:

```javascript
{
  id: 211, // ID số nguyên duy nhất tiếp nối danh sách câu hỏi trong buổi
  mondai: 1, // 1 (課題理解), 2 (ポイント理解), 3 (概要理解), 4 (即時応答), 5 (統合理解)
  mondaiName: "聴解 問題１：課題理解 (Nghe hiểu xử lý tình huống)",
  isChoukai: true,
  type: "audio",
  audio: "audio/buoi_06/m1_01.mp3", // Hoặc audioSrc: "audio/buoi_06/m1_01.mp3"
  questionText: "男の人は、このあと何をしますか。",
  options: [
    "座って順番を待つ",
    "払い込み用紙に記入する",
    "番号札を取りに行く",
    "名前を呼ぶ"
  ],
  correctAnswer: 3, // 1, 2, 3 hoặc 4
  explanation: `<b>❓ Dịch câu hỏi:</b> Người đàn ông sau đây sẽ làm gì?<br><br>
<b>📝 Dịch chi tiết 4 đáp án:</b><br>
1. 座って順番を待つ: Ngồi đợi theo số thứ tự<br>
2. 払い込み用紙に記入する: Điền vào giấy nộp tiền<br>
3. 番号札を取りに行く: Đi lấy phiếu số thứ tự<br>
4. 名前を呼ぶ: Gọi tên<br><br>
<b>🎧 Nội dung bài nghe (Script tiếng Nhật):</b><br>
郵便局で、男の人と女の人が話しています。<br>
男の人は、このあと何をしますか。<br>
男：あのう、払い込みしたいんですが……。<br>
女：順番にお呼びしますので、<b>番号札を取って</b>、ソファーのところでお待ちください。<br>
男：ああ、<b>あれを取ってくればいいんですね</b>。<br>
女：待っていらっしゃる間に書いてくだされば結構ですよ。<br>
男：じゃ、そうします。<br><br>
<b>🇻🇳 Dịch nghĩa toàn bộ đoạn hội thoại:</b><br>
Tại bưu điện, người đàn ông và nữ nhân viên đang nói chuyện. Người đàn ông sau đây sẽ làm gì?<br>
Nam: "À ừm, tôi muốn nộp tiền thanh toán..."<br>
Nữ: "Chúng tôi sẽ gọi theo thứ tự, nên xin anh hãy <b>lấy phiếu số thứ tự</b> rồi ngồi đợi ở ghế sofa."<br>
Nam: "À, tôi chỉ cần đi lấy cái đó là được đúng không..."<br><br>
<b>💡 Phân tích chọn đáp án:</b><br>
- Nhân viên hướng dẫn lấy số thứ tự trước, giấy nộp tiền thì trong lúc ngồi đợi gọi tên có thể tranh thủ điền. Người đàn ông xác nhận đi lấy số trước (あれを取ってくればいいんですね).<br>
- Do đó hành động người đàn ông làm ngay sau cuộc hội thoại là đi lấy phiếu số thứ tự &rarr; <b>Đáp án đúng là 3</b>.`
}
```

> **5 Khối bắt buộc trong trường `explanation` của Choukai:**
> 1. `<b>❓ Dịch câu hỏi:</b>`: Dịch câu hỏi trọng tâm sang tiếng Việt.
> 2. `<b>📝 Dịch chi tiết 4 đáp án:</b>`: Dịch từng phương án 1, 2, 3, 4.
> 3. `<b>🎧 Nội dung bài nghe (Script tiếng Nhật):</b>`: Toàn văn lời thoại hội thoại tiếng Nhật; dùng thẻ `<b>...</b>` bôi đậm câu manh mối chốt hạ đáp án.
> 4. `<b>🇻🇳 Dịch nghĩa toàn bộ đoạn hội thoại:</b>`: Bản dịch tiếng Việt mượt mà, chuẩn văn phong hội thoại.
> 5. `<b>💡 Phân tích chọn đáp án:</b>`: Chỉ rõ căn cứ loại trừ các đáp án bẫy và khẳng định đáp án chính xác.



---



## 4. 🔄 QUY TRÌNH THỰC HIỆN TỪNG BUỔI (SOP CHO AGENT)



Khi người dùng yêu cầu số hóa bất kỳ buổi nào, Agent thực hiện theo 6 bước chuẩn:



### Bước 1: Khảo sát thư mục nguồn của Buổi đó

- Chạy lệnh liệt kê toàn bộ file và thư mục con trong `G:\.shortcut-targets-by-id\...\(15 BUỔI) LUYỆN ĐỀ CHUYÊN SÂU\BUỔI X`.

- Ghi nhận đầy đủ: file đề thi, file chuyên đề, file đáp án. **Không bỏ sót file nào (trừ folder nghe hiểu)**.



### Bước 2: Đọc và trích xuất nội dung bằng Python

- Môi trường đã có sẵn **Python 3.12** cùng thư viện **PyMuPDF (`fitz`)**.

- Dùng script Python trích xuất văn bản hoặc render trang ảnh sang `scratch/` để OCR / phân tích chính xác:

  ```python

  import fitz  # PyMuPDF

  doc = fitz.open(pdf_path)

  text = "\n".join([page.get_text() for page in doc])

  ```

- Đồng thời trích xuất file đáp án tương ứng trong thư mục `ĐÁP ÁN` hoặc `Dap an` để lấy bảng kết quả chuẩn.



### Bước 3: Chuẩn hóa câu hỏi & Ghép giải thích chi tiết

- Tách từng câu hỏi, gán đúng `mondai`, định dạng `<ruby>Từ<rt>______</rt></ruby>`.

- Với câu Dấu sao Mondai 8: tách đúng 4 `fragments`, xác định `correctOrder`, `starPositionIndex`, `correctStarOption`.

- Với bài đọc hiểu: lấy nguyên văn đoạn văn bản tiếng Nhật (`passage`), câu hỏi và 4 lựa chọn.

- So khớp với bảng đáp án chuẩn, bổ sung lời dịch và giải thích ngữ pháp tiếng Việt chi tiết cho trường `explanation`.



### Bước 4: Tạo file dữ liệu `data/buoi_XX.js`

- Ghi file vào thư mục `data/` của dự án (`buoi_02.js`, `buoi_03.js`, ...).

- Đảm bảo cú pháp JavaScript hợp lệ, không lỗi escape chuỗi (chú ý dùng backtick `` ` `` cho `passage` nhiều dòng).



### Bước 5: Cập nhật `data/syllabus.js` & `index.html`

- Mở `data/syllabus.js`:

  - Đổi cờ `ready: true`.

  - Thêm đường dẫn `file: "data/buoi_XX.js"`.

  - Cập nhật số liệu thống kê chính xác: `stats: { totalQuestions, kanji, vocab, grammar, reading }`.

- Mở `index.html`: Thêm thẻ `<script src="data/buoi_XX.js"></script>` vào đúng vị trí theo thứ tự các buổi.



### Bước 6: Kiểm tra tính toàn vẹn (Verification Script)

- Kiểm tra toàn bộ ID trong file không bị trùng lặp.

- Kiểm tra toàn bộ câu hỏi đều có đủ 4 phương án và đáp án hợp lệ (1-4).

- Kiểm tra tất cả câu Mondai 8 đảm bảo `correctStarOption === correctOrder[starPositionIndex - 1]`.



---



## 5. 🛠️ CÁC TÍNH NĂNG CỐT LÕI CỦA ỨNG DỤNG WEB (TOOL CAPABILITIES)

1. **Chế độ Luyện Tập vs Thi Thử:**

   - *Luyện Tập:* Chọn là biết đúng/sai ngay lập tức, hiển thị phân tích giải thích chi tiết.

   - *Thi Thử:* Canh 105 phút có đồng hồ đếm ngược, Pacing Guide gợi ý nhịp thời gian, chỉ nộp bài mới hiện kết quả.

2. **Tương tác Dấu sao thông minh (Mondai 8):**

   - Click chip để ghép, click vào ô đã điền để tháo từ ra, nút *"Xếp lại từ đầu"*.

3. **Bộ công cụ Đọc hiểu chuyên sâu:**

   - Chia đôi màn hình (Split Reading Mode), tăng giảm cỡ chữ (-A / +A), công cụ Highlight bôi vàng đoạn văn.

4. **Phím tắt (Shortcuts):**

   - `1, 2, 3, 4` chọn đáp án hoặc chip câu sao; `J / K` chuyển câu.

5. **Tự động lưu (Auto-Save):**

   - Mọi câu trả lời được lưu tức thì vào `localStorage`. Khi quay lại Dashboard, hiển thị tiến độ làm dở (Draft) và nút *"Tiếp tục làm bài"*.

6. **Mô phỏng bảng điểm JLPT:**

   - Quy đổi thang điểm 60 (Từ vựng - Ngữ pháp) & thang 60 (Đọc hiểu). Tự động cảnh báo điểm liệt (<19/60).

7. **Tra cứu từ vựng siêu tốc (Quick Lookup):**

   - Chỉ cần bôi đen (hoặc click đúp) vào bất kỳ từ nào trong câu hỏi, đáp án hoặc bài đọc để tự động hiển thị popup cách đọc Hiragana, âm Hán Việt, nghĩa tiếng Việt và phát âm audio tiếng Nhật.

8. **Sổ tay câu sai & Tự động tích sao thông minh (Smart Error Notebook):**

   - **Tự động tích sao (⭐):** Khi làm sai bất kỳ câu nào trong chế độ luyện tập hoặc khi nộp bài thi, câu hỏi đó sẽ tự động được đánh dấu ⭐ và đưa vào mục *Đã lưu*.

   - **Nguyên bản làm lại:** Khi bấm vào tab/nút *Đã lưu / Ôn lại*, toàn bộ câu hỏi sẽ xuất hiện ở trạng thái nguyên bản chưa trả lời (không bị lộ vết sai hay giải thích) để học viên tự làm lại từ đầu.

   - **Tự động xóa sao khi làm đúng:** Khi làm lại mà chọn đúng, hệ thống tự động gỡ bỏ dấu sao ⭐ khỏi danh sách lưu; nếu trả lời sai thì giữ nguyên dấu sao. Từng câu hỏi còn có nút *Làm lại câu này* để thử lại tức thì.

9. **Cơ chế Khóa đáp án 1 lần trong Chế độ Luyện tập (Single-Attempt Lock):**

   - Khi ở Chế độ Luyện tập, người học chọn một phương án thì câu hỏi sẽ lập tức khóa các nút chọn (không thể đổi đáp án khác ngay).

   - Nếu chọn sai: Giữ nguyên phương án đã chọn (khoanh đỏ), đồng thời tự động làm nổi bật phương án đúng (khoanh xanh) và mở khung giải thích chi tiết cho người học đọc.

   - Nếu muốn làm lại: Người học bấm nút *Làm lại câu này* (hoặc *Xếp lại từ đầu*) để mở khóa và làm lại.



### 10. Từ Điển Tra Nhanh Popup & Cố Định Tọa Độ (Cập nhật 29/10/2026)

- Tối ưu hóa popup tra từ: Chuyển tọa độ sang `position: fixed` với viewport calculation giúp popup luôn hiển thị chính xác ngay trên hoặc dưới từ được chọn mà không bị lệch do cuộn trang (scroll offset).

- Bổ sung kho từ điển offline thông dụng `data/common_dict.js` (chứa sẵn các từ N3/N2 như 祖母, 心配, 暮らす, v.v.), tự động dự phòng khi Mazii API bị lỗi kết nối hoặc CORS trên môi trường cục bộ.

- Phân tích vị trí gạch chân câu 20: Đã xác minh vị trí gạch chân tại `くらして` là hoàn toàn chính xác theo đề thi thật Mondai 2 (Cách viết Kanji của 暮らす), các chữ Hán khác trong câu như 祖母, 心配 là ngữ cảnh câu bình thường.



### 11. Số Hóa Hoàn Thành Buổi 7 (177 Câu - 100% Zero-Loss)

- Đã hoàn thành 100% dữ liệu Buổi 7 tại `data/buoi_07.js` và đăng ký kích hoạt trong `data/syllabus.js` (ready: true).

- Cấu trúc 4 phần với 177 câu hỏi:

  1. Đề thi thử tổng hợp hợp chuẩn JLPT N2 (합격시그ナル N2): 75 câu (Moji-Goi, Bunpou, Dokkai).

  2. Chuyên đề Mondai 4: Chọn từ theo ngữ cảnh (30 câu).

  3. Chuyên đề Mondai 5: Từ gần nghĩa / đồng nghĩa (50 câu).

  4. Chuyên đề Ngữ pháp 2 (22 câu).

- Toàn bộ 177 câu đều có đủ 4 lựa chọn, đáp án chuẩn xác và phần giải thích chi tiết phân tích từng lựa chọn.



### 12. Bôi Đỏ và Tích Sao Cho Câu Làm Sai Trên Bảng Câu Hỏi (Cập nhật 29/10/2026)

- **Cơ chế nhận biết câu làm sai**: Mọi câu hỏi khi làm sai trong chế độ luyện tập đều được hệ thống tự động:

  1. Gắn biểu tượng ngôi sao màu vàng ★ ở góc trên.

  2. Bôi màu nền đỏ cảnh báo nổi bật trên bảng danh sách câu hỏi (Pallet).

- **Bảo toàn trạng thái trực quan**: Dù người học chuyển qua tab "Đã lưu", làm lại câu hỏi hay quay lại phần luyện tập, câu hỏi bị sai vẫn luôn hiển thị đồng thời cả **MÀU ĐỎ** và **DẤU SAO ★** cho đến khi người học chọn được đáp án CHÍNH XÁC.

- **Tự động chuyển xanh khi làm đúng**: Khi người học chọn lại đúng đáp án, hệ thống ngay lập tức gỡ bỏ dấu sao và chuyển ô câu hỏi sang màu xanh lá tươi sáng.



### 13. Hệ Thống Trình Phát Nghe Hiểu (Choukai Engine & Speed Controller)
- **Trình phát tích hợp độc lập**: Mỗi câu hỏi Choukai sở hữu một audio player riêng biệt, hỗ trợ định dạng chuẩn HTML5 Audio không bị chặn hoặc giật lag.
- **Bộ điều tốc linh hoạt (0.8x, 1.0x, 1.2x)**:
  - Cho phép người học nghe chậm ở tốc độ `0.8x` để nghe rõ từ vựng khó, hoặc tăng tốc lên `1.2x` để luyện phản xạ áp lực phòng thi.
- **Cơ chế chống lộ đề (Anti-peek)**:
  - Trong chế độ Thi Thử hoặc khi câu hỏi chưa được trả lời, nội dung Lời thoại Script bị ẩn hoàn toàn để đảm bảo tính khách quan của bài thi nghe.
  - Khi đã chọn đáp án hoặc khi nộp bài thi, nút *"Xem Lời thoại & Script"* sẽ xuất hiện cho phép đối chiếu trực quan.
- **Bộ đếm số lần nghe**: Tự động lưu trạng thái câu hỏi đã được nghe vào `sessionStorage` (`jlpt_audio_listened`) để phục vụ thống kê ôn tập.

### 14. Tự Động Hóa Quy Trình Git & Cải Tiến Trải Nghiệm Bài Dấu Sao (Cập nhật 31/10/2026)
- **Kéo thả linh hoạt câu dấu sao (★):**
  - Cho phép kéo thả trực tiếp mảnh ghép vào bất kỳ ô nào (không ép buộc từ trái qua phải).
  - Hỗ trợ đổi vị trí (swap) và gỡ từ trực tiếp, cùng cơ chế chạm chọn ô đích mượt mà trên Mobile & Tablet.
- **Giao diện câu dấu sao thu nhỏ & liền mạch chuẩn đề thi PDF:**
  - Thu nhỏ kích thước ô trống, ghép nối liền mạch câu trước và sau cùng dòng với các ô trống (inline-flex).
- **Chuẩn hóa giải thích câu dấu sao & Dịch nghĩa toàn bộ:**
  - Thứ tự câu đúng hiển thị định dạng ngắn gọn: `(1 - 4) - ⭐ (2) - (3)`.
  - Tích hợp 100% bản dịch tiếng Việt cho toàn bộ 188 câu dấu sao trên 15 buổi học vào `data/star_translations.js`.
- **Tự động Commit & Push lên GitHub:**
  - Sau mỗi lần cập nhật, hệ thống tự động kiểm tra code và push thẳng lên GitHub remote, giải phóng người dùng khỏi việc commit thủ công trên GitHub Desktop.


---

## 6. 🚀 KẾ HOẠCH TÍCH HỢP TOÀN DIỆN KHO "BÍ KÍP LUYỆN ĐỀ N2" (CẬP NHẬT 04/11/2026)

> **Đường dẫn thư mục nguồn bổ trợ (Google Drive Máy tính công ty):**  
> `G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy\BÍ KÍP LUYỆN ĐỀ N2`  
> *(Hoặc `G:\.shortcut-targets-by-id\1qxXXPmf0t6X3xelQZNI6q2BIev9mYxLy` - gồm 28 thư mục con, 71 file PDF và 181 slide ảnh/infographic)*
>
> **Mục tiêu tối thượng:**  
> Tích hợp toàn diện 100% tài liệu từ kho "BÍ KÍP LUYỆN ĐỀ N2" vào phân hệ mới `Luyện Chuyên Đề & Bí Kíp Cấp Tốc`, chuẩn bị nước rút cho kỳ thi JLPT N2 tháng tới.

### 6.1. Nguyên Tắc Bất Di Bất Dịch (Non-Negotiable Mandates)
1. **Bảo tồn nguyên vẹn 100% 15 Buổi luyện đề (15-Session Zero-Impact):**
   - Giữ nguyên 100% dữ liệu của 15 buổi hiện có (`data/buoi_01.js` đến `buoi_15.js`), không sửa đổi, không ghi đè, không làm xáo trộn tiến độ và lịch sử lưu trữ `localStorage` của người học trên 15 buổi này.
2. **Số hóa chính xác 100% theo tài liệu gốc (100% Fidelity & Zero-Loss):**
   - **Khớp 100% nội dung gốc:** Trích xuất nguyên văn tiếng Nhật (kanji, ruby, ngữ pháp, câu hỏi, đoạn văn, 4 lựa chọn) chuẩn xác từng ký tự theo đúng file nguồn PDF/ảnh.
   - **Khớp 100% đáp án chuẩn:** Đối chiếu tuyệt đối với bảng đáp án gốc (`kaitou`, `dap an`) đi kèm trong thư mục tài liệu. Tuyệt đối không tự ý thay đổi hay suy đoán đáp án sai lệch với tài liệu gốc.
   - **Không bỏ sót:** Số hóa trọn vẹn mọi tài liệu trong folder: từ bài tập trắc nghiệm đến cẩm nang lý thuyết, bẫy đọc hiểu, công thức nghe hiểu và hệ thống flashcard.
3. **Chuẩn mực sư phạm:**
   - 100% câu hỏi có giải thích chi tiết, dịch nghĩa tiếng Việt, phân tích cấu trúc ngữ pháp / ngữ cảnh từ vựng và chỉ rõ lý do chọn hoặc loại trừ phương án.
4. **Kiểm thử chặt chẽ & Tự động Commit/Push lên GitHub (Zero-Friction Git Automation):**
   - Chạy script xác minh tính toàn vẹn dữ liệu trước khi xuất bản.
   - Tự động chạy `git add`, `git commit` và `git push origin main` sau mỗi giai đoạn hoàn thành.

### 6.2. Kiến Trúc Phân Hệ Mới: Giao Diện 2 Tab Dashboard
- **Tab 1: 🏆 15 Buổi Luyện Đề Chuẩn JLPT** (Không gian thi thử và luyện tập toàn diện 15 buổi hiện có).
- **Tab 2: ⚡ Luyện Chuyên Đề & Bí Kíp Cấp Tốc** (Không gian ôn luyện nước rút độc lập):
  - **Phân khu 1: Luyện Trắc Nghiệm Chuyên Sâu Từng Dạng Bài (Mondai Mastery)**:
    - *Chuyên đề 1:* 🌟 Sát thủ Hái Sao ★ (Mondai 8 - Sắp xếp câu dấu sao).
    - *Chuyên đề 2:* 🎯 Chinh phục Cách Dùng Từ trong câu (Mondai 6).
    - *Chuyên đề 3:* 🧩 Cấu tạo từ: Tiền tố, Hậu tố & Động từ phức (Mondai 3).
    - *Chuyên đề 4:* 🔄 Từ đồng nghĩa / Gần nghĩa (Mondai 5).
    - *Chuyên đề 5:* 📝 Ngữ pháp Đục Lỗ Đoạn Văn (Mondai 9).
    - *Chuyên đề 6:* 📚 Ngữ pháp Drill & Drill N2 (Mondai 7).
    - *Chuyên đề 7:* 🛡️ 300 Câu Ngữ pháp N3 Củng cố nền tảng (Chống liệt).
  - **Phân khu 2: Thư Viện Bí Kíp & Sổ Tay Bỏ Túi (Quick Cheatsheet Drawer)**:
    - Tra cứu Cặp Phó từ - Mẫu câu mặc định.
    - Sổ tay Động từ đa nghĩa & Động từ phức.
    - Hệ thống Ngữ pháp theo gốc Hán tự (75 trang Kosei).
    - Chuyên sâu phân biệt cấu trúc もの và こと (16 trang).
    - Bảng tra Kính ngữ N2-N3 cấp tốc.
    - 7 Tuyệt kỹ phá bẫy Đọc hiểu & Infographics.
    - 5 Công thức nghe hiểu Mondai 1 - Mondai 5.

### 6.3. Lộ Trình Triển Khai 5 Giai Đoạn (Đã Hoàn Thành Toàn Diện 100%)
- **Giai đoạn 1:** ✅ Dựng khung giao diện 2 Tab trên Dashboard & Catalog chuyên đề độc lập (`data/drills_catalog.js`).
- **Giai đoạn 2:** ✅ Số hóa Chuyên đề Dấu sao ★ (Mondai 8: 75 câu) & Chuyên đề Cách dùng từ (Mondai 6: 60 câu).
- **Giai đoạn 3:** ✅ Số hóa Chuyên đề Cấu tạo từ (Mondai 3: 101 câu) & Từ gần nghĩa (Mondai 5: 75 câu).
- **Giai đoạn 4:** ✅ Số hóa Ngữ pháp Đục lỗ (Mondai 9: 37 câu), Drill N2 (Mondai 7: 120 câu) & 300 câu N3 (104 câu).
- **Giai đoạn 5:** ✅ Xây dựng Thư Viện Bí Kíp Tra Nhanh (Cheatsheet Drawer) với 6 chuyên đề lý thuyết, modal tra cứu trực quan và bộ lọc tìm kiếm tức thì.

### 6.4. Bảng Tổng Hợp Tiến Độ Toàn Diện "Bí Kíp Luyện Đề N2"

| Chuyên Đề / Bí Kíp | File Nguồn Tài Liệu Gốc | File Đích Trong Dự Án | Số Lượng / Quy Mô | Trạng Thái |
| :--- | :--- | :--- | :---: | :---: |
| **Chuyên Đề 1: Dấu Sao ★ (Mondai 8)** | `(Mai Lan ss) HÁI SAO - KHÔNG KHÓ`, `DẤU SAO` | `data/chuyende_dau_sao.js` | 75 câu hỏi | ✅ **100% Hoàn Thành** |
| **Chuyên Đề 2: Cách Dùng Từ (Mondai 6)** | `Shinkanzen Masuta - Mondai 6` (Test 1 - Test 12) | `data/chuyende_cach_dung_tu.js` | 60 câu hỏi | ✅ **100% Hoàn Thành** |
| **Chuyên Đề 3: Tiền Tố, Hậu Tố & ĐT Phức (Mondai 3)** | `Từ vựng N2/TỔNG HỢP TIỀN TỐ, HẬU TỐ N2` | `data/chuyende_tien_to_hau_to.js` | 101 câu hỏi | ✅ **100% Hoàn Thành** |
| **Chuyên Đề 4: Từ Gần Nghĩa / Thay Thế (Mondai 5)** | `Từ đồng nghĩa N2 ( ĐÁP ÁN).pdf` (15 bài) | `data/chuyende_tu_dong_nghia.js` | 75 câu hỏi | ✅ **100% Hoàn Thành** |
| **Chuyên Đề 5: Ngữ Pháp Đục Lỗ Đoạn Văn (Mondai 9)** | `100 BÀI ĐỌC ĐỤC LỖ N2` (Đề 1 - Đề 9) | `data/chuyende_duc_lo.js` | 37 câu / 9 bài | ✅ **100% Hoàn Thành** |
| **Chuyên Đề 6: Ngữ Pháp Drill & Drill N2 (Mondai 7)** | `Drill N2 Bunpou` (10 bài x 12 câu) | `data/chuyende_ngu_phap_n2.js` | 120 câu hỏi | ✅ **100% Hoàn Thành** |
| **Chuyên Đề 7: Ngữ Pháp N3 Nền Tảng (Chống Liệt)** | `300 câu ngữ pháp DRILL & DRILL N3` (Test 1-8) | `data/chuyende_ngu_phap_n3.js` | 104 câu hỏi | ✅ **100% Hoàn Thành** |
| **Thư Viện Bí Kíp: Phó Từ Cố Định** | `Phó từ đi với các mẫu câu đặc định.pdf` (13 trang) | `data/cheatsheets_data.js` | 19 cặp bài trùng | ✅ **100% Hoàn Thành** |
| **Thư Viện Bí Kíp: Động Từ Đa Nghĩa** | `ĐỘNG TỪ ĐA NGHĨA N2.pdf` (16 trang) | `data/cheatsheets_data.js` | 6 động từ cốt lõi | ✅ **100% Hoàn Thành** |
| **Thư Viện Bí Kíp: もの & こと** | `もの・こと.pdf` (16 trang) | `data/cheatsheets_data.js` | 17 cấu trúc so sánh | ✅ **100% Hoàn Thành** |
| **Thư Viện Bí Kíp: Kính Ngữ N2-N3** | `Kính ngữ( N2,N3).pdf` (27 trang) | `data/cheatsheets_data.js` | 11 ĐT đặc biệt + 5 CT | ✅ **100% Hoàn Thành** |
| **Thư Viện Bí Kíp: Bẫy Đọc - Nghe** | `Bẫy đọc hiểu JLPT.pdf` & `CÔNG THỨC NGHE HIỂU` | `data/cheatsheets_data.js` | 5 bẫy + 5 công thức | ✅ **100% Hoàn Thành** |
| **Thư Viện Bí Kíp: Ngữ Pháp Gốc Hán Tự** | `Tai lieu N2 Kosei.pdf` (75 trang) | `data/cheatsheets_data.js` | 4 nhóm gốc từ | ✅ **100% Hoàn Thành** |
| **Tổng Cộng Chuyên Đề & Bí Kíp** | **Toàn bộ kho "BÍ KÍP LUYỆN ĐỀ N2"** | **7 Chuyên Đề + 6 Thư Viện** | **572 câu + 6 Bí Kíp** | 🏆 **100% HOÀN TẤT** |
