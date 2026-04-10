//Viết một đoạn script ngắn trong Console của trình duyệt để fetch toàn bộ collection notes rồi console.log ra dạng JSON, sau đó copy lưu vào máy.

const MY_SECRET = "MAY_LA_AI";

const firebaseConfig = {
  apiKey: "AIzaSyAi125-uGQ3FiT2o5owdn1bpH4n2cPCGYw",
  authDomain: "ofice-the-core.firebaseapp.com",
  projectId: "ofice-the-core",
  storageBucket: "ofice-the-core.firebasestorage.app",
  messagingSenderId: "652458744400",
  appId: "1:652458744400:web:65fc2ac4d70516e43d0f55",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentTab = "excel";
let allNotes = [];
let inputTab = "excel";

// Chuyển Tab chính
function switchTab(tab) {
  currentTab = tab;
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  loadSidebar();
}

// Chọn Tab khi nhập liệu
function setInputTab(tab) {
  inputTab = tab;
  document
    .querySelectorAll('[id^="input-"]')
    .forEach((b) => (b.style.opacity = "0.4"));
  document.getElementById(`input-${tab}`).style.opacity = "1";
}

// Lưu Note mới
async function saveNote() {
  const input = document.getElementById("noteInput").value;

  if (!input.includes("||") || input.split(":::").length < 3) {
    alert(
      "Format: Title || Desciption ::: MS Content ::: GG Content ::: WPS Content",
    );
    return;
  }

  const firstPart = input.split("||");
  const title = firstPart[0].trim();

  const secondPart = firstPart[1].split(":::");
  const desc = secondPart[0].trim();
  const ms = secondPart[1].trim();
  const gg = secondPart[2].trim();
  const wps = secondPart[3].trim();

  try {
    if (window.editingId) {
      // NẾU ĐANG SỬA: Cập nhật tài liệu cũ
      await db.collection("notes").doc(window.editingId).update({
        tab: inputTab,
        title,
        desc,
        ms,
        gg,
        wps,
        passphrase: MY_SECRET
      });
      window.editingId = null; // Xoá ID sau khi sửa xong
      alert("Updated!");
    } else {
      // NẾU KHÔNG: Tạo mới như bình thường
      await db.collection("notes").add({
        tab: inputTab,
        title,
        desc,
        ms,
        gg,
        wps,
        passphrase: MY_SECRET,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      alert("Saved!");
    }
    document.getElementById("noteInput").value = "";
  } catch (e) {
    alert("Lỗi: Lêu lêu cái đồ không có mã truy cập 😛");
    console.error(e);
  }
}

// Load danh sách tiêu đề bên Sidebar
function loadSidebar() {
  db.collection("notes")
    .where("tab", "==", currentTab)
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      if (snapshot.empty) {
        document.getElementById("sidebarList").innerHTML =
          '<div class="text-xs italic text-gray-600">Empty...</div>';
        document.getElementById("mainContent").innerHTML =
          '<div class="text-gray-500 italic mt-20">Select a topic or add a new lesson...</div>';
        allNotes = [];
        return;
      }

      // Lưu vào biến tạm để dùng cho hàm Search
      allNotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      renderSidebar(allNotes); // Gọi hàm render riêng

      // Tự động hiển thị bài đầu tiên
      displayContent(allNotes[0].id);
    });
}

// Hiển thị nội dung chi tiết
async function displayContent(id) {
  try {
    const doc = await db.collection("notes").doc(id).get();
    if (!doc.exists) return;
    const data = doc.data();

    // Highligt tiêu đề đang chọn trên Sidebar
    document
      .querySelectorAll(".sidebar-item")
      .forEach((el) => el.classList.remove("active", "text-white"));
    document.getElementById(`item-${id}`).classList.add("active", "text-white");

    // Render nội dung, hỗ trợ Markdown
    const html = `
            <div class="animate-fade-in pr-20">
                <div class="flex space-x-2 mb-6">
                    <button onclick="editNote('${id}')" class="text-xs text-blue-400 hover:text-blue-300 hover:opacity-100 uppercase font-bold transition-all">Sửa</button>
                    <button onclick="deleteNote('${id}')" class="text-xs text-red-400 hover:text-red-300 hover:opacity-100 uppercase font-bold transition-all">Xoá</button>
                </div>
                
                <h1 class="text-4xl font-bold tracking-tight mb-3 text-white">${data.title}</h1>
                
                <div class="prose prose-invert prose-p:text-gray-400 prose-p:italic mb-12 max-w-none">
                    ${marked.parse(data.desc || "")}
                </div>
                
                <div class="comparison-grid">
                    <div class="platform-card">
                        <h4 class="text-blue-400">Microsoft Office</h4>
                        <div class="mt-3 prose prose-invert prose-xs leading-relaxed text-gray-300">
                            ${marked.parse(data.ms || "Updating...")}
                        </div>
                    </div>
                    <div class="platform-card">
                        <h4 class="text-green-400">Google Workspace</h4>
                        <div class="mt-3 prose prose-invert prose-xs leading-relaxed text-gray-300">
                            ${marked.parse(data.gg || "Updating...")}
                        </div>
                    </div>
                    <div class="platform-card">
                        <h4 class="text-red-400">WPS Office</h4>
                        <div class="mt-3 prose prose-invert prose-xs leading-relaxed text-gray-300">
                            ${marked.parse(data.wps || "Updating...")}
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.getElementById("mainContent").innerHTML = html;
  } catch (e) {
    console.error("Error:", e);
  }
}

// Hàm render sidebar từ một danh sách (dùng chung cho cả lúc load và lúc search)
function renderSidebar(notesList) {
  const listHtml = notesList
    .map(
      (note) => `
        <div class="sidebar-item" id="item-${note.id}" onclick="displayContent('${note.id}')">
            ${note.title}
        </div>
    `,
    )
    .join("");
  document.getElementById("sidebarList").innerHTML = listHtml;
}

// Lắng nghe sự kiện gõ phím trong ô Search
document.getElementById("searchInput").addEventListener("input", (e) => {
  const keyword = e.target.value.toLowerCase().trim();

  // Lọc danh sách allNotes dựa trên keyword
  const filtered = allNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(keyword) ||
      (note.desc && note.desc.toLowerCase().includes(keyword)),
  );

  renderSidebar(filtered);
});

// Thêm hàm Xóa
async function deleteNote(id) {
  if (confirm("You really want to delete it, right 🤨?")) {
    try {
      await db.collection("notes").doc(id).delete();
      alert("Deleted!");
      document.getElementById("mainContent").innerHTML = ""; // Xoá trắng màn hình chính
    } catch (e) {
      console.error(e);
    }
  }
}

// Thêm hàm Sửa (Đổ ngược dữ liệu vào Chatbox để sửa cho nhanh)
async function editNote(id) {
  const doc = await db.collection("notes").doc(id).get();
  const data = doc.data();

  // Đổ dữ liệu vào chatbox theo format cũ để bạn sửa
  const format = `${data.title} || ${data.desc} ::: ${data.ms} ::: ${data.gg} ::: ${data.wps}`;
  document.getElementById("noteInput").value = format;
  document.getElementById("noteInput").focus();

  // Tạm thời lưu ID đang sửa vào một biến toàn cục
  window.editingId = id;
  alert(
    "The data has been moved into the input field 👇🏻. After you finish editing, press the Send button to update!",
  );
}

// Khởi chạy
switchTab("excel");
setInputTab("excel");
