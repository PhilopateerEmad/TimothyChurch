// CONFIGURATION: Replace this URL with your Google Apps Script Web App Deployment URL
const GOOGLE_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbwtuvc8mqkemeRnqlOzwl5I5CYQCdZ8Vk1ICgT25UhKoYDEnva4shNt6DuJADegwzWD_g/exec";

// Initial Mock Data (Fallback if Sheets API is not configured yet)
let students = [
  { rollNo: "CS-001", name: "Alice Johnson", classId: "CS-101", email: "alice@student.edu", status: "Present", remarks: "" },
  { rollNo: "CS-002", name: "Bob Smith", classId: "CS-101", email: "bob@student.edu", status: "Absent", remarks: "" },
  { rollNo: "MT-001", name: "Charlie Brown", classId: "MATH-202", email: "charlie@student.edu", status: "Present", remarks: "" }
];

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("attendanceDate").value = new Date().toISOString().split('T')[0];
  switchRole();
});

// Role Switch Handler
function switchRole() {
  const role = document.getElementById("roleSelector").value;
  const adminView = document.getElementById("adminView");
  const publicView = document.getElementById("publicView");
  const roleLabel = document.getElementById("currentRoleLabel");

  if (role === "PUBLIC") {
    adminView.classList.add("hidden");
    publicView.classList.remove("hidden");
    roleLabel.textContent = "Guest / Student Self Check-In Portal";
  } else {
    publicView.classList.add("hidden");
    adminView.classList.remove("hidden");
    roleLabel.textContent = role === "SUPER_ADMIN" ? "Super Admin (Global)" : "Class Admin";
    renderStudents();
  }
}

// Render student list into table
function renderStudents() {
  const selectedClass = document.getElementById("classSelect").value;
  const tbody = document.getElementById("studentTableBody");
  tbody.innerHTML = "";

  const filtered = students.filter(s => s.classId === selectedClass);

  filtered.forEach((st, idx) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="py-3 px-4 font-mono font-bold text-xs">${st.rollNo}</td>
      <td class="py-3 px-4 font-semibold">${st.name}</td>
      <td class="py-3 px-4 text-center">
        <span class="px-2.5 py-1 rounded text-xs font-bold ${
          st.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
          st.status === 'Absent' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
        }">${st.status || 'Unmarked'}</span>
      </td>
      <td class="py-3 px-4">
        <input type="text" value="${st.remarks || ''}" onchange="updateRemarks('${st.rollNo}', this.value)" placeholder="Add note..." class="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs w-full">
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="saveSingleRecord('${st.rollNo}')" class="bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 px-3 py-1 rounded text-xs font-bold">
          Save to Sheet
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateRemarks(rollNo, val) {
  const st = students.find(s => s.rollNo === rollNo);
  if (st) st.remarks = val;
}

function markAll(status) {
  const selectedClass = document.getElementById("classSelect").value;
  students.forEach(s => {
    if (s.classId === selectedClass) s.status = status;
  });
  renderStudents();
}

// --- GOOGLE SHEETS API INTEGRATION ---

// 1. Fetch Students from Google Sheets
async function fetchStudentsFromSheets() {
  if (GOOGLE_SCRIPT_API_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    alert("Please replace GOOGLE_SCRIPT_API_URL in app.js with your published Apps Script URL!");
    return;
  }

  try {
    const res = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=getStudents`);
    const data = await res.json();
    console.log("Fetched rows from Google Sheets:", data);
    alert("Successfully synced with Google Sheets database!");
  } catch (err) {
    console.error("Error fetching from Google Sheets:", err);
  }
}

// 2. Submit record back to Google Sheets
async function saveSingleRecord(rollNo) {
  const st = students.find(s => s.rollNo === rollNo);
  const date = document.getElementById("attendanceDate").value;

  if (GOOGLE_SCRIPT_API_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    alert(`[Simulated] Record for ${st.name} saved! (Set GOOGLE_SCRIPT_API_URL in app.js to sync directly to Google Sheets).`);
    return;
  }

  try {
    const payload = {
      action: "markAttendance",
      date: date,
      studentId: st.rollNo,
      classId: st.classId,
      status: st.status || "Present",
      remarks: st.remarks || "",
      markedBy: document.getElementById("roleSelector").value
    };

    const res = await fetch(GOOGLE_SCRIPT_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    if (result.status === "success") {
      alert(`Attendance for ${st.name} successfully saved to Google Sheet!`);
    }
  } catch (err) {
    console.error("Error saving record:", err);
  }
}

// 3. Public Self Check-in
function handleSelfCheckin(e) {
  e.preventDefault();
  const inputId = document.getElementById("checkinId").value.trim().toUpperCase();
  const alertBox = document.getElementById("checkinAlert");

  const student = students.find(s => s.rollNo === inputId);

  alertBox.classList.remove("hidden", "bg-emerald-100", "text-emerald-800", "bg-rose-100", "text-rose-800");

  if (student) {
    student.status = "Present";
    alertBox.classList.add("bg-emerald-100", "text-emerald-800");
    alertBox.textContent = `Check-in successful! Welcome, ${student.name}.`;
    saveSingleRecord(student.rollNo);
  } else {
    alertBox.classList.add("bg-rose-100", "text-rose-800");
    alertBox.textContent = "Roll Number / Student ID not found.";
  }
}
