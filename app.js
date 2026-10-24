// CONFIGURATION: Published Google Apps Script Web App Endpoint
const GOOGLE_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbw6zFrADRca6RrvxpLzjT56f8GWO_nL2nd2nkqbjFOfgCjskNsfR0SAnrBncXHc1Sa6/exec";

let classesList = [];
let students = [];

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("attendanceDate").value = new Date().toISOString().split('T')[0];
  await loadDatabase();
  switchRole();
});

// Load Classes and Students dynamically from Google Sheets
async function loadDatabase() {
  try {
    console.log("Loading database from Google Sheets...");
    
    // Fetch Classes
    const classRes = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=getClasses`);
    classesList = await classRes.json();
    populateClassDropdown();

    // Fetch Students
    const studentRes = await fetch(`${GOOGLE_SCRIPT_API_URL}?action=getStudents`);
    students = await studentRes.json();
    
    console.log(`Loaded ${classesList.length} classes and ${students.length} students.`);
    renderStudents();
  } catch (err) {
    console.error("Error loading database from Google Sheets:", err);
  }
}

function populateClassDropdown() {
  const select = document.getElementById("classSelect");
  select.innerHTML = "";
  
  classesList.forEach(cls => {
    const opt = document.createElement("option");
    opt.value = cls.classId; // e.g. "CLS-101"
    opt.textContent = `${cls.classId}: ${cls.className}`;
    select.appendChild(opt);
  });
}

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

function renderStudents() {
  const selectedClass = document.getElementById("classSelect").value;
  const tbody = document.getElementById("studentTableBody");
  tbody.innerHTML = "";

  const filtered = students.filter(s => s.classId === selectedClass);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400">No students found for class ${selectedClass}.</td></tr>`;
    return;
  }

  filtered.forEach((st) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="py-3 px-4 font-mono font-bold text-xs">${st.studentId} (${st.rollNo})</td>
      <td class="py-3 px-4 font-semibold">${st.name}</td>
      <td class="py-3 px-4 text-center">
        <span class="px-2.5 py-1 rounded text-xs font-bold ${
          st.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
          st.status === 'Absent' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
        }">${st.status || 'Unmarked'}</span>
      </td>
      <td class="py-3 px-4">
        <input type="text" value="${st.remarks || ''}" onchange="updateRemarks('${st.studentId}', this.value)" placeholder="Add note..." class="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs w-full">
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="saveSingleRecord('${st.studentId}')" class="bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 px-3 py-1 rounded text-xs font-bold">
          Save to Sheet
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateRemarks(studentId, val) {
  const st = students.find(s => s.studentId === studentId);
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

async function saveSingleRecord(studentId) {
  const st = students.find(s => s.studentId === studentId);
  const date = document.getElementById("attendanceDate").value;
  const role = document.getElementById("roleSelector").value;

  try {
    const params = new URLSearchParams({
      action: "markAttendance",
      date: date,
      studentId: st.studentId,
      classId: st.classId,
      status: st.status || "Present",
      remarks: st.remarks || "",
      markedBy: role
    });

    const res = await fetch(`${GOOGLE_SCRIPT_API_URL}?${params.toString()}`);
    const result = await res.json();
    
    if (result.status === "success") {
      alert(`Attendance for ${st.name} successfully saved to Attendance_Logs!`);
    } else {
      alert("Error saving attendance to Sheet.");
    }
  } catch (err) {
    console.error("Error saving record:", err);
    alert("Failed to save attendance. Check console for details.");
  }
}

function handleSelfCheckin(e) {
  e.preventDefault();
  const inputId = document.getElementById("checkinId").value.trim().toUpperCase();
  const alertBox = document.getElementById("checkinAlert");

  const student = students.find(s => s.studentId === inputId || s.rollNo.toUpperCase() === inputId);

  alertBox.classList.remove("hidden", "bg-emerald-100", "text-emerald-800", "bg-rose-100", "text-rose-800");

  if (student) {
    student.status = "Present";
    alertBox.classList.add("bg-emerald-100", "text-emerald-800");
    alertBox.textContent = `Check-in successful! Welcome, ${student.name}.`;
    saveSingleRecord(student.studentId);
  } else {
    alertBox.classList.add("bg-rose-100", "text-rose-800");
    alertBox.textContent = "Student ID or Roll Number not found in database.";
  }
}
