# 🤖 MASTER AGENT SYSTEM PROMPT: SỐ HÓA TOÀN DIỆN 15 BUỔI LUYỆN ĐỀ JLPT N2



> **Đường dẫn thư mục nguồn tài liệu gốc:**  

> `G:\.shortcut-targets-by-id\14u_Pa3_lz_o2_GM0U2922KTDUJqqlZda\(15 BUỔI) LUYỆN ĐỀ CHUYÊN SÂU`

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



## 2. 📁 TIẾN ĐỘ SỐ HÓA & ÁNH XẠ DỮ LIỆU ĐÍCH



| Buổi | Thư mục nguồn tại `(15 BUỔI) LUYỆN ĐỀ CHUYÊN SÂU\` | File đích tại dự án | Tiến độ Đọc - Viết | Tiến độ Nghe hiểu (Choukai) |
| :--- | :--- | :--- | :---: | :---: |
| **Buổi 1** | `BUỔI 1` *(Đề T12/2024, Đề 12/2015, Mondai 2, Sougou)* | `data/buoi_01.js` | ✅ **Hoàn thành** (71 câu) | ⏳ Chờ cắt audio đề 12/2024 |
| **Buổi 2** | `BUỔI 2` *(Đề Thi Thật 07/2024, Chokuzen 8, So sánh)* | `data/buoi_02.js` | ✅ **Hoàn thành** (161 câu) | ⏳ Chờ cắt audio đề 07/2024 |
| **Buổi 3** | `BUỔI 3` *(Mondai 6, Hán tự Tiền tố, Super NP, Choukai M2)* | `data/buoi_03.js` | ✅ **Hoàn thành** (80 câu) | ✅ **Hoàn thành** (6 câu Audio M2) |
| **Buổi 4** | `BUỔI 4` *(Goukaku Moshi, Super NP, Choukai M3 & M4)* | `data/buoi_04.js` | ✅ **Hoàn thành** (168 câu) | ✅ **Hoàn thành** (17 câu Audio M3-M4) |
| **Buổi 5** | `BUỔI 5` *(Đề T7/2016, Chuyên đề Dấu sao ★, Choukai M2-M3)* | `data/buoi_05.js` | ✅ **Hoàn thành** (123 câu) | ⚠️ Sẵn sàng nạp 10 câu Audio M2-M3 |
| **Buổi 6** | `BUỔI 6` *(Đề 07/2018, Dấu sao ★, Choukai Mondai 1 & 2)* | `data/buoi_06.js` | ✅ **Hoàn thành** (210 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 7** | `BUỔI 7` *(Đề Tổng hợp 합격시그ナル, M4, M5, Choukai M1 & 2)* | `data/buoi_07.js` | ✅ **Hoàn thành** (177 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 8** | `BUỔI 8` *(Đề Mô phỏng 2 3A, Super 3, Choukai M1 & 2)* | `data/buoi_08.js` | ✅ **Hoàn thành** (124 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 9** | `BUỔI 9` *(Đề Mô phỏng 4, Phó từ, Shinkanzen, Choukai M1 & 2)* | `data/buoi_09.js` | ✅ **Hoàn thành** (122 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 10** | `BUỔI 10` *(Đề Thi Thật 07/2025, Động từ & Tính từ, Choukai M1 & 2)* | `data/buoi_10.js` | ✅ **Hoàn thành** (130 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 11** | `BUỔI 11` *(Đề Thi Thử Đề 5, Quán dụng ngữ, Choukai M1 & 2)* | `data/buoi_11.js` | ✅ **Hoàn thành** (128 câu) | ✅ **Hoàn thành** (11 câu Audio M1-M2) |
| **Buổi 12** | `BUỔI 12` *(Đề Thi Thật 07/2021, Đọc hiểu chuyên sâu)* | `data/buoi_12.js` | ✅ **Hoàn thành** (112 câu) | ⏳ Chờ cắt audio đề 07/2021 |
| **Buổi 13** | `BUỔI 13` *(Kính ngữ, Goukaku Moshi Đề 2)* | `data/buoi_13.js` | ✅ **Hoàn thành** (105 câu) | ⏳ Chờ nạp 12 track audio CD |
| **Buổi 14** | `BUỔI 14` *(Đề Thi Thử HQ 1, Siêu chuyên đề 10)* | `data/buoi_14.js` | ✅ **Hoàn thành** (98 câu) | ⏳ Chờ nạp 51 track audio CD |
| **Buổi 15** | `BUỔI 15` *(Mock Test 3 Kanzen Moshi, Đại tổng ôn)* | `data/buoi_15.js` | ✅ **Hoàn thành** (108 câu) | ⏳ Chờ nạp 43 track audio CD |

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