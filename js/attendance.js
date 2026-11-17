/**
 * =====================================================
 * ⚠️ CRITICAL ATTENDANCE LOGIC
 * Do NOT rewrite or refactor automatically.
 * Do NOT touch HTML or Cyrillic text.
 * Edit JS logic only.
 * =====================================================
 */

// Google Sheets configuration (public in this static page).
const SHEET_URL = "https://script.google.com/macros/s/AKfycbx4yo_NMIjqVB9fRBDGpRLIyjkhHGzdT6IovX6K9YIe06JB9VjTlYOZKFmtC6bCLcR55g/exec";
const SHEET_TOKEN = "Bagsh2026Irts7K9m4P2x";

/* ================= DOM READY ================= */
document.addEventListener("DOMContentLoaded", async () => {
  initShiftLabels();
  updateCurrentDate();
  await loadClassRosters();
  initElectiveRows();
  initTotals();
  initValidation();
  initNameMultiSelects();
  initLateStudentRows();
  initLateStudentDropdowns();
  initExportToolbar();
  initDutySignatures();
  initTeacherTimeControl();
  restoreDraft();
  updateExpectedStudentCounts();
  initAttendanceCountControls();
  initMobileLabels();
  initMobileInputs();
  calculateTotals();
  validateAttendance();
  initYearlyLateCounts();


  document.addEventListener("input", () => {
    calculateTotals();
    saveDraft();
  });

  document.addEventListener("change", () => {
    calculateTotals();
    saveDraft();
  });

});

function shiftDisplayName(shift = document.body.dataset.shift || "1") {
  return String(shift) === "2" ? "Өдрийн ээлж" : "Өглөөний ээлж";
}

function initShiftLabels() {
  const shift = document.body.dataset.shift || "1";
  const header = document.querySelector(".sheet-header");
  if (header && !header.querySelector(".shift-heading")) {
    const panel = document.createElement("div");
    panel.className = "shift-heading";
    const lines = [...header.querySelectorAll(".top-line, h1, .sub-line")];
    if (lines.length) {
      lines[0].before(panel);
      panel.append(...lines);
    }
  }
  const title = document.querySelector(".sheet-header h1");
  if (title) title.textContent = shiftDisplayName(shift);
  const total = document.querySelector(".attendance-table .total-label");
  if (total) total.textContent = `${shiftDisplayName(shift)} нийт:`;
  const toggle = document.querySelector(".shift-toggle");
  if (toggle) {
    const target = shiftDisplayName(shift === "1" ? "2" : "1");
    toggle.textContent = target;
    toggle.setAttribute("aria-label", `${target} рүү шилжих`);
  }
}

function initDutySignatures() {
  const section = document.querySelector(".duty-teacher-notes");
  if (!section || section.querySelector(".duty-signatures")) return;
  const fields = document.createElement("div");
  fields.className = "duty-signatures";
  [
    ["general-duty-teacher", "Жижүүр багшийн ажилтай танилцсан: Ерөнхий жижүүр"],
    ["completed-duty-teacher", "Жижүүр хийсэн багш"],
    ["next-duty-teacher", "Дараагийн жижүүр"]
  ].forEach(([id, title]) => {
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = title;
    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.className = "duty-signature-input";
    label.append(input);
    fields.append(label);
  });
  section.append(fields);
}

function initTeacherTimeControl() {
  const notes = document.querySelector(".duty-teacher-notes");
  if (!notes || document.querySelector(".teacher-time-control")) return;
  const section = document.createElement("section");
  section.className = "teacher-time-control";
  const heading = document.createElement("h2");
  heading.id = "teacher-time-control-title";
  heading.textContent = "Багш нарын хичээлийн цаг ашиглалтанд тавих хяналт";
  section.setAttribute("aria-labelledby", heading.id);
  const table = document.createElement("table");
  table.className = "teacher-time-table";
  const headers = ["№", "Хоцорсон", "Өвчтэй", "Чөлөөтэй", "Шалтгаангүй"];
  const headerRow = table.createTHead().insertRow();
  headers.forEach(title => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = title;
    headerRow.append(th);
  });
  const body = table.createTBody();
  const addRow = () => {
    const index = body.rows.length;
    const row = body.insertRow();
    row.insertCell().textContent = index + 1;
    headers.slice(1).forEach(title => {
      const cell = row.insertCell();
      cell.dataset.label = title;
      const input = document.createElement("input");
      input.type = "text";
      input.setAttribute("aria-label", `${index + 1}-р мөр: ${title} багшийн нэр, цаг`);
      cell.append(input);
    });
    return row;
  };
  addRow();
  addRow();
  table.addTimeRow = addRow;
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "teacher-time-add";
  const addIcon = document.createElement("span");
  addIcon.className = "teacher-time-add-icon";
  addIcon.textContent = "+";
  addIcon.setAttribute("aria-hidden", "true");
  addButton.append(addIcon, document.createTextNode("Мөр нэмэх"));
  addButton.addEventListener("click", () => {
    const row = addRow();
    saveDraft();
    row.querySelector("input").focus();
  });
  const addFooter = table.createTFoot();
  addFooter.className = "teacher-time-actions";
  const addCell = addFooter.insertRow().insertCell();
  addCell.colSpan = headers.length;
  addCell.append(addButton);
  section.append(heading, table);
  notes.before(section);
}

function currentDutyTeacherName() {
  return document.getElementById("completed-duty-teacher")?.value.trim() || "";
}

function dutyNotesWithSignatures() {
  const notes = document.getElementById("duty-teacher-notes")?.value || "";
  const signatures = [...document.querySelectorAll(".duty-signature-input")]
    .filter(input => input.value.trim())
    .map(input => `${input.parentElement.firstChild.textContent}: ${input.value.trim()}`);
  const control = [...document.querySelectorAll(".teacher-time-table tbody tr")]
    .map(row => [...row.querySelectorAll("input")]
      .filter(input => input.value.trim())
      .map(input => `${input.parentElement.dataset.label}: ${input.value.trim()}`).join("; "))
    .filter(Boolean);
  const controlText = control.length
    ? ["Багш нарын хичээлийн цаг ашиглалтанд тавих хяналт", ...control].join("\n") : "";
  return [controlText, notes, ...signatures].filter(Boolean).join("\n");
}

function updateCurrentDate() {
  const dateLine = document.querySelector(".sub-line");
  if (!dateLine) return;

  const today = new Date();
  dateLine.textContent = `${today.getFullYear()} оны ${today.getMonth() + 1} сарын ${today.getDate()}-ны өдөр`;
}

/* Presentation only: preserve cell order and the existing form controls. */
function initMobileLabels() {
  document.querySelectorAll(".attendance-table, .elective-table, .late-students-table").forEach(table => {
    const headers = [];
    [...table.tHead.rows].forEach((row, rowIndex) => {
      let column = 0;
      [...row.cells].forEach(header => {
        while (headers[rowIndex]?.[column]) column++;
        const text = header.innerHTML.replace(/<br\s*\/?\s*>/gi, " ");
        const label = document.createElement("span");
        label.innerHTML = text;
        for (let r = rowIndex; r < rowIndex + header.rowSpan; r++) {
          headers[r] ||= [];
          for (let c = column; c < column + header.colSpan; c++) {
            headers[r][c] = label.textContent.replace(/\s+/g, " ").trim();
          }
        }
        column += header.colSpan;
      });
    });
    const labels = headers[headers.length - 1];
    table.querySelectorAll("tbody tr, tfoot tr").forEach(row => {
      let column = 0;
      [...row.cells].forEach(cell => {
        cell.dataset.label = labels[column] || "";
        column += cell.colSpan;
      });
    });
  });
}

function initMobileInputs() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.setAttribute("inputmode", "numeric");
    input.setAttribute("pattern", "[0-9]*");
  });
  document.addEventListener("focusin", event => {
    if (window.matchMedia("(max-width: 720px)").matches &&
        event.target.matches('input:not([type="checkbox"]), select, textarea')) {
      requestAnimationFrame(() => event.target.scrollIntoView({ block: "center" }));
    }
  });
}

/* ================= REFRESH-SAFE DRAFT ================= */
const DRAFT_STORAGE_KEY = `attendance-draft-v${document.body.dataset.shift || "1"}`;

function currentDraftDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formControlValues(row) {
  return [...row.querySelectorAll("input, select, textarea")]
    .filter(control => control.type !== "checkbox")
    .map(control => control.value);
}

function restoreControlValues(row, values = []) {
  [...row.querySelectorAll("input, select, textarea")]
    .filter(control => control.type !== "checkbox")
    .forEach((control, index) => {
      if (values[index] !== undefined) control.value = values[index];
    });
}

function saveDraft() {
  try {
    const draft = {
      date: currentDraftDate(),
      attendance: Object.fromEntries([...document.querySelectorAll(".attendance-table tbody tr")]
        .filter(row => normaliseGroupName(row.cells[2]?.textContent))
        .map(row => [normaliseGroupName(row.cells[2]?.textContent), {
        values: [3, 4, 5, 6, 7].map(index => row.cells[index]?.querySelector("input")?.value || ""),
        absentNames: selectedNames(row.cells[8]),
        leaveNames: selectedNames(row.cells[9])
      }])),
      elective: [...document.querySelectorAll(".elective-table tbody tr")].map(formControlValues),
      dutyTeacherName: currentDutyTeacherName(),
      dutyTeacherNotes: document.getElementById("duty-teacher-notes")?.value || "",
      dutySignatures: Object.fromEntries([...document.querySelectorAll(".duty-signature-input")].map(input => [input.id, input.value])),
      teacherTimeControl: [...document.querySelectorAll(".teacher-time-table tbody tr")].map(formControlValues),
      late: [...document.querySelectorAll(".late-students-table tbody tr")].map(row => ({
        values: formControlValues(row),
        studentNames: selectedNames(row.cells[2])
      }))
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn("Attendance draft could not be saved.", error);
  }
}

function restoreDraft() {
  try {
    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return;
    const draft = JSON.parse(rawDraft);
    if (!draft || draft.date !== currentDraftDate() || !draft.attendance ||
        typeof draft.attendance !== "object" || Array.isArray(draft.attendance)) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }

    [...document.querySelectorAll(".attendance-table tbody tr")].forEach(row => {
      const group = normaliseGroupName(row.cells[2]?.textContent);
      const savedRow = draft.attendance[group];
      if (!group || !savedRow || typeof savedRow !== "object") return;
      [3, 4, 5, 6, 7].forEach((cellIndex, valueIndex) => {
        const input = row.cells[cellIndex]?.querySelector("input");
        if (input && savedRow.values?.[valueIndex] !== undefined) input.value = savedRow.values[valueIndex];
      });
      [[8, savedRow.absentNames], [9, savedRow.leaveNames]].forEach(([cellIndex, names]) => {
        const selected = new Set(String(names || "").split(", ").filter(Boolean));
        row.cells[cellIndex]?.querySelectorAll(".name-multiselect input").forEach(input => {
          input.checked = selected.has(input.value);
        });
        const control = row.cells[cellIndex]?.querySelector(".name-multiselect");
        if (control) updateNameMultiSelect(control);
      });
    });

    const savedElectives = Array.isArray(draft.elective) ? [...draft.elective] : [];
    while (savedElectives.length > 3 && !savedElectives.at(-1)?.some(value => String(value || "").trim() && String(value) !== "0")) {
      savedElectives.pop();
    }
    const electiveTable = document.querySelector(".elective-table");
    while (electiveTable && electiveTable.tBodies[0].rows.length < savedElectives.length) electiveTable.addElectiveRow();
    [...document.querySelectorAll(".elective-table tbody tr")]
      .forEach((row, index) => restoreControlValues(row, draft.elective?.[index]));

    const dutyTeacherName = document.getElementById("duty-teacher-name");
    if (dutyTeacherName) dutyTeacherName.value = draft.dutyTeacherName || "";
    const dutyTeacherNotes = document.getElementById("duty-teacher-notes");
    if (dutyTeacherNotes) dutyTeacherNotes.value = draft.dutyTeacherNotes || "";
    const savedTimeRows = Array.isArray(draft.teacherTimeControl) ? [...draft.teacherTimeControl] : [];
    // Older drafts included five rows even when the last three were empty.
    while (savedTimeRows.length > 2 && !savedTimeRows.at(-1)?.some(value => String(value || "").trim())) {
      savedTimeRows.pop();
    }
    while (document.querySelectorAll(".teacher-time-table tbody tr").length < savedTimeRows.length) {
      document.querySelector(".teacher-time-table").addTimeRow();
    }
    document.querySelectorAll(".teacher-time-table tbody tr").forEach((row, index) => {
      restoreControlValues(row, savedTimeRows[index]);
    });
    document.querySelectorAll(".duty-signature-input").forEach(input => {
      input.value = draft.dutySignatures?.[input.id] || "";
    });
    const completedTeacher = document.getElementById("completed-duty-teacher");
    if (completedTeacher && !draft.dutySignatures?.["completed-duty-teacher"] && draft.dutyTeacherName) {
      completedTeacher.value = draft.dutyTeacherName;
    }

    const savedLateRows = Array.isArray(draft.late) ? [...draft.late] : [];
    while (savedLateRows.length > 3) {
      const last = savedLateRows.at(-1);
      const values = Array.isArray(last) ? last : last?.values;
      if (last?.studentNames || values?.some(value => String(value || "").trim())) break;
      savedLateRows.pop();
    }
    const lateTable = document.querySelector(".late-students-table");
    while (lateTable && lateTable.tBodies[0].rows.length < savedLateRows.length) lateTable.addLateRow();
    [...document.querySelectorAll(".late-students-table tbody tr")].forEach((row, index) => {
      const savedRow = draft.late?.[index];
      if (!savedRow) return;
      const values = Array.isArray(savedRow) ? savedRow : savedRow.values;
      const classSelect = row.querySelector(".late-class-select");
      if (classSelect && values[0] !== undefined) {
        classSelect.value = values[0];
        classSelect.dispatchEvent(new Event("change"));
      }
      restoreControlValues(row, values);
      const selected = new Set(String(savedRow.studentNames || "").split(", ").filter(Boolean));
      row.cells[2]?.querySelectorAll(".name-multiselect input").forEach(input => {
        input.checked = selected.has(input.value);
      });
      const control = row.cells[2]?.querySelector(".name-multiselect");
      if (control) updateNameMultiSelect(control);
    });
  } catch (error) {
    console.warn("Attendance draft could not be restored.", error);
  } finally {
    validateAttendance();
  }
}

/* ================= STUDENT ROSTER DATA ================= */
let CLASS_ROSTERS = {};
let CLASS_SHIFTS = {};
const ROSTER_CACHE_KEY = "attendance-roster-cache-v1";
let rosterLoadFailed = false;

async function loadClassRosters() {
  const errorBox = document.querySelector(".floating-error");

  try {
    if (typeof XLSX === "undefined") {
      throw new Error("Excel library could not be loaded");
    }
    if (location.protocol === "file:") throw new Error("Select the updated workbook when opening a local file");

    const response = await fetch("students_by_class.xlsx", { cache: "no-store" });
    if (!response.ok) throw new Error(`Workbook request failed (${response.status})`);

    const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
    CLASS_ROSTERS = rostersFromWorkbook(workbook);
    if (!Object.keys(CLASS_ROSTERS).length) {
      throw new Error("Workbook contains no readable student list");
    }

    if (errorBox) errorBox.textContent = "";
  } catch (error) {
    rosterLoadFailed = true;
    console.warn("Student roster workbook could not be loaded.", error);
    let cached;
    try { cached = JSON.parse(localStorage.getItem(ROSTER_CACHE_KEY)); } catch (_) {}
    if (cached && cached.rosters && cached.shifts) {
      CLASS_ROSTERS = normaliseRosters(cached.rosters);
      CLASS_SHIFTS = cached.shifts;
    } else {
      CLASS_ROSTERS = await readFallbackRosters();
    }

    if (!Object.keys(CLASS_ROSTERS).length) {
      if (errorBox) {
        errorBox.textContent = "";
      }
      return;
    }

    if (errorBox) {
      errorBox.textContent = "";
    }
  }
}

function initRosterFilePicker() {
  const notice = document.querySelector('.floating-error');
  if (!notice || !rosterLoadFailed) return;
  notice.textContent = "";
  notice.classList.add('roster-file-picker');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toolbar-btn';
  button.textContent = 'Excel жагсаалт сонгох';
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.xlsx';
  picker.hidden = true;
  button.addEventListener('click', () => { picker.value = ''; picker.click(); });
  picker.addEventListener('change', async () => {
    const file = picker.files[0];
    if (!file) return;
    button.disabled = true;
    const previousRosters = CLASS_ROSTERS;
    const previousShifts = CLASS_SHIFTS;
    const previousCounts = [...document.querySelectorAll('.attendance-table tbody tr')].map(row =>
      row.cells[3].querySelector('input').value);
    let nextRosters;
    let nextShifts;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      nextRosters = rostersFromWorkbook(workbook);
      nextShifts = CLASS_SHIFTS;
      if (!Object.keys(nextRosters).length) throw new Error('Empty roster');
    } catch (error) {
      CLASS_SHIFTS = previousShifts;
      button.textContent = 'Файл уншсангүй — дахин сонгох';
      button.disabled = false;
      return;
    }
    saveDraft();
    CLASS_ROSTERS = nextRosters;
    CLASS_SHIFTS = nextShifts;
    initNameMultiSelects(false);
    initLateStudentDropdowns();
    restoreDraft();
    document.querySelectorAll('.attendance-table tbody tr').forEach((row, index) => {
      const group = normaliseGroupName(row.cells[2].textContent);
      if (nextRosters[group] && (previousCounts[index] === '' ||
          Number(previousCounts[index]) === previousRosters[group]?.length)) {
        row.cells[3].querySelector('input').value = nextRosters[group].length;
      }
    });
    calculateTotals();
    validateAttendance();
    saveDraft();
    try {
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify({ rosters: CLASS_ROSTERS, shifts: CLASS_SHIFTS }));
    } catch (_) {}
    button.textContent = 'Жагсаалт шинэчлэгдлээ — өөр файл сонгох';
    button.disabled = false;
  });
  notice.append(button, picker);
}

function normaliseGroupName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^0+/, "")
    .replace(/^(\d+)([а-яёөүе])$/i, "$1-$2");
}

function normaliseRosters(rosters) {
  return Object.fromEntries(Object.entries(rosters)
    .map(([group, students]) => [group.trim(), [...new Set((students || [])
      .map(name => String(name).trim()).filter(Boolean))]])
    .filter(([group, students]) => group && students.length));
}

function updateExpectedStudentCounts(force = false) {
  document.querySelectorAll(".attendance-table tbody tr").forEach(row => {
    const input = row.cells[3]?.querySelector("input");
    if (!input) return;

    input.step = "1";
    const group = normaliseGroupName(row.cells[2]?.textContent);
    const students = CLASS_ROSTERS[group];
    if (force || input.value === "") {
      input.value = students ? String(students.length) : "";
    }
  });
}

function initAttendanceCountControl(cell, input, index, countDescription) {
  input.step = "1";
  input.setAttribute("aria-label", `${index + 1}-р ангийн ${countDescription}`);

  const control = document.createElement("div");
  control.className = "attendance-count-control";

  const buttons = document.createElement("div");
  buttons.className = "attendance-count-control__buttons";

  [
    { label: `${countDescription} нэмэх`, symbol: "▲", amount: 1 },
    { label: `${countDescription} хасах`, symbol: "▼", amount: -1 }
  ].forEach(({ label, symbol, amount }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "attendance-count-control__button";
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    button.addEventListener("click", () => {
      const current = Number.parseInt(input.value, 10) || 0;
      input.value = String(Math.max(0, current + amount));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    buttons.appendChild(button);
  });

  cell.replaceChildren(control);
  control.append(input, buttons);
}

function initAttendanceCountControls() {
  document.querySelectorAll(".attendance-table tbody tr").forEach((row, index) => {
    const expectedCell = row.cells[3];
    const expectedInput = expectedCell?.querySelector("input");
    if (expectedCell && expectedInput) {
      initAttendanceCountControl(expectedCell, expectedInput, index, "ирэх сурагчийн тоо");
    }

    const presentCell = row.cells[4];
    const presentInput = presentCell?.querySelector("input");
    if (presentCell && presentInput) {
      initAttendanceCountControl(presentCell, presentInput, index, "ирсэн сурагчийн тоо");
    }
  });
}

async function readFallbackRosters() {
  if (location.protocol === "file:") {
    CLASS_SHIFTS = { ...BUNDLED_CLASS_SHIFTS };
    return normaliseRosters(BUNDLED_CLASS_ROSTERS);
  }
  try {
    const response = await fetch("data/students.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Roster request failed (${response.status})`);
    const data = await response.json();
    return normaliseRosters(data);
  } catch (error) {
    console.warn("Fallback student roster could not be loaded.", error);
    CLASS_SHIFTS = { ...BUNDLED_CLASS_SHIFTS };
    return normaliseRosters(BUNDLED_CLASS_ROSTERS);
  }
}

function rostersFromWorkbook(workbook) {
  const rosters = {};
  CLASS_SHIFTS = {};

  workbook.SheetNames.forEach(sheetName => {
    if (["Заавар", "Guide", "Instructions"].includes(sheetName)) return;

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
    const students = rows.slice(1).map(row => {
      const ovog = String(row[2] || "").trim();
      const givenName = String(row[1] || "").trim();
      return [ovog, givenName].filter(Boolean).join(" ");
    });

    const cleanStudents = [...new Set(students.filter(Boolean))];
    if (cleanStudents.length) {
      const normalizedGroup = normaliseGroupName(sheetName);
      rosters[normalizedGroup] = cleanStudents;
      const shifts = [...new Set(rows.slice(1)
        .map(row => String(row[6] || "").trim()).filter(Boolean))];
      if (shifts.length === 1) CLASS_SHIFTS[normalizedGroup] = shifts[0];
    }
  });

  return normaliseRosters(rosters);
}

function initElectiveRows() {
  const table = document.querySelector(".elective-table");
  if (!table || table.querySelector(".elective-row-add")) return;
  const body = table.tBodies[0];
  const template = body.rows[0].cloneNode(true);
  while (body.rows.length > 3) body.deleteRow(-1);
  table.addElectiveRow = () => {
    const row = template.cloneNode(true);
    row.querySelectorAll("input").forEach(input => {
      input.value = input.classList.contains("spinner-input") ? "0" : "";
    });
    body.append(row);
    initMobileLabels();
    initMobileInputs();
    return row;
  };
  const footer = table.createTFoot();
  footer.className = "teacher-time-actions";
  const cell = footer.insertRow().insertCell();
  cell.colSpan = 7;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "teacher-time-add elective-row-add";
  const icon = document.createElement("span");
  icon.className = "teacher-time-add-icon";
  icon.textContent = "+";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon, document.createTextNode("Мөр нэмэх"));
  button.addEventListener("click", () => {
    const row = table.addElectiveRow();
    saveDraft();
    row.querySelector("input")?.focus();
  });
  cell.append(button);
}

let yearlyLateHistory = null;
function lateHistoryKey(group, name) {
  return JSON.stringify([String(group).trim().toLowerCase(), String(name).trim().replace(/\s+/g, " ").toLowerCase()]);
}

function refreshLateCounts() {
  document.querySelectorAll(".late-students-table tbody tr").forEach(row => {
    const input = row.cells[5]?.querySelector("input");
    if (!input) return;
    input.readOnly = true;
    const group = row.querySelector(".late-class-select")?.value;
    const names = selectedNames(row.cells[2]).split(", ").filter(Boolean);
    const values = names.map(name => {
      const full = yearlyLateHistory?.[lateHistoryKey(group, name)] || 0;
      const short = displayStudentName(name);
      const legacy = short === name ? 0 : yearlyLateHistory?.[lateHistoryKey(group, short)] || 0;
      return { name: displayStudentName(name), count: full + legacy + 1 };
    });
    input.value = yearlyLateHistory && group && values.length ? Math.max(...values.map(item => item.count)) : "";
    input.placeholder = yearlyLateHistory ? "Автомат" : "Хүлээж байна";
    input.title = yearlyLateHistory ? values.map(item => `${item.name}: ${item.count}`).join("\n") : "Өмнөх хоцролтын мэдээлэл ачаалагдаагүй байна.";
    let detail = row.cells[5].querySelector(".late-count-detail");
    if (!detail) {
      detail = document.createElement("small");
      detail.className = "late-count-detail";
      row.cells[5].append(detail);
    }
    detail.textContent = yearlyLateHistory && values.length > 1 ? values.map(item => `${item.name}: ${item.count}`).join("; ") : "";
  });
}

async function initYearlyLateCounts() {
  refreshLateCounts();
  const table = document.querySelector(".late-students-table");
  if (!table) return;
  table.addEventListener("change", refreshLateCounts);
  const hint = document.createElement("p");
  hint.className = "late-history-status";
  hint.setAttribute("role", "status");
  table.before(hint);
  hint.textContent = "Хичээлийн жилийн өмнөх хоцролтыг ачаалж байна…";
  try {
    const response = await fetch(SHEET_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "lateHistory", token: SHEET_TOKEN, date: currentDraftDate() }),
      signal: AbortSignal.timeout(30000)
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true || !result.lateCounts) throw new Error("history_unavailable");
    yearlyLateHistory = result.lateCounts;
    refreshLateCounts();
    hint.textContent = "Хоцорсон давталтыг хичээлийн жилээр автоматаар тооцно. Нэг өдрийг нэг удаа тоолно.";
  } catch (_) {
    hint.textContent = "Өмнөх хоцролтыг ачаалж чадсангүй. Apps Script-ийн шинэ хувилбарыг нийтэлсэн эсэх болон холболтоо шалгаад хуудсаа шинэчилнэ үү.";
  }
}

function initLateStudentRows() {
  const table = document.querySelector(".late-students-table");
  if (!table || table.querySelector(".late-row-add")) return;
  const body = table.tBodies[0];
  const template = body.rows[0].cloneNode(true);
  while (body.rows.length > 3) body.deleteRow(-1);
  table.addLateRow = () => {
    const row = template.cloneNode(true);
    const number = body.rows.length + 1;
    row.cells[0].textContent = number;
    row.querySelectorAll("input").forEach(input => {
      input.value = "";
      const label = input.getAttribute("aria-label");
      if (label) input.setAttribute("aria-label", label.replace(/^\d+/, number));
    });
    body.append(row);
    initLateStudentDropdowns(row);
    refreshLateCounts();
    initMobileLabels();
    initMobileInputs();
    return row;
  };
  const footer = table.createTFoot();
  footer.className = "teacher-time-actions";
  const cell = footer.insertRow().insertCell();
  cell.colSpan = 6;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "teacher-time-add late-row-add";
  const icon = document.createElement("span");
  icon.className = "teacher-time-add-icon";
  icon.textContent = "+";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon, document.createTextNode("Мөр нэмэх"));
  button.addEventListener("click", () => {
    const row = table.addLateRow();
    saveDraft();
    row.querySelector("select, input")?.focus();
  });
  cell.append(button);
}

/* ================= LATE STUDENT DROPDOWNS ================= */
function initLateStudentDropdowns(root = document) {
  const shift = document.body.dataset.shift || "1";
  const classGroups = Object.keys(CLASS_ROSTERS)
    .filter(group => CLASS_SHIFTS[group] === `${shift}-р ээлж`);

  const rows = root.matches?.("tr") ? [root] : root.querySelectorAll(".late-students-table tbody tr");
  rows.forEach(row => {
    const classCell = row.cells[1];
    const studentCell = row.cells[2];
    if (!classCell || !studentCell) return;

    const classSelect = document.createElement("select");
    classSelect.className = "late-dropdown late-class-select";
    classSelect.setAttribute("aria-label", "Анги бүлэг сонгох");
    classSelect.innerHTML = '<option value="">Анги сонгох</option>';
    classGroups.forEach(group => classSelect.add(new Option(group, group)));

    const populateStudents = () => {
      const selected = selectedNames(studentCell).split(", ").filter(Boolean);
      const emptyLabel = classSelect.value
        ? "Сурагчийн жагсаалт алга"
        : "Эхлээд анги сонгоно уу";
      createNameMultiSelect(studentCell, selected, classSelect.value, emptyLabel);
    };

    classSelect.addEventListener("change", populateStudents);
    classCell.replaceChildren(classSelect);
    populateStudents();
  });
}

/* ================= STUDENT NAME MULTI-SELECTS ================= */

function initNameMultiSelects(bindEvents = true) {
  document.querySelectorAll(".attendance-table tbody tr").forEach(row => {
    [8, 9].forEach(index => {
      const cell = row.cells[index];
      if (!cell) return;
      const classGroup = row.cells[2]?.textContent.trim();

      const selected = [...cell.querySelectorAll("option:checked, .name-multiselect input:checked")]
        .map(option => option.value || option.textContent.trim())
        .filter(Boolean);
      createNameMultiSelect(cell, selected, classGroup);
    });
  });

  if (!bindEvents) return;
  document.addEventListener("click", event => {
    if (!event.target.closest(".name-multiselect")) {
      document.querySelectorAll(".name-multiselect.is-open")
        .forEach(closeNameMultiSelect);
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".name-multiselect.is-open").forEach(control => {
        closeNameMultiSelect(control);
        control.querySelector(".name-multiselect__toggle").focus();
      });
    }
  });
}

function closeNameMultiSelect(control) {
  control.classList.remove("is-open");
  control.querySelector(".name-multiselect__toggle").setAttribute("aria-expanded", "false");
}

function createNameMultiSelect(cell, selected = [], classGroup = "", emptyLabel = "Жагсаалт оруулаагүй") {
  cell.replaceChildren();
  const control = document.createElement("div");
  control.className = "name-multiselect";
  control.dataset.emptyLabel = emptyLabel;
  control.innerHTML = `
    <button type="button" class="name-multiselect__toggle" aria-expanded="false">
      <span class="name-multiselect__value"></span><span aria-hidden="true">⌄</span>
    </button>
    <div class="name-multiselect__menu" role="group" aria-label="Сурагч сонгох"></div>`;

  const menu = control.querySelector(".name-multiselect__menu");
  const students = CLASS_ROSTERS[normaliseGroupName(classGroup)] || [];
  students.forEach(name => {
    const label = document.createElement("label");
    label.className = "name-multiselect__option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = name;
    checkbox.checked = selected.includes(name);
    label.append(checkbox, document.createTextNode(displayStudentName(name)));
    menu.appendChild(label);
  });

  if (!students.length) {
    const notice = document.createElement("span");
    notice.className = "name-multiselect__empty";
    notice.textContent = emptyLabel;
    menu.appendChild(notice);
  }

  const toggle = control.querySelector(".name-multiselect__toggle");
  const backdrop = document.createElement("div");
  backdrop.className = "name-multiselect__backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.addEventListener("click", () => closeNameMultiSelect(control));
  control.appendChild(backdrop);
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "name-multiselect__close";
  closeButton.textContent = "Хаах";
  closeButton.addEventListener("click", () => {
    closeNameMultiSelect(control);
    toggle.focus();
  });
  menu.appendChild(closeButton);
  toggle.addEventListener("click", event => {
    event.stopPropagation();
    const opening = !control.classList.contains("is-open");
    document.querySelectorAll(".name-multiselect.is-open")
      .forEach(closeNameMultiSelect);
    control.classList.toggle("is-open", opening);
    toggle.setAttribute("aria-expanded", String(opening));
  });

  menu.addEventListener("change", () => {
    updateNameMultiSelect(control);
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });

  cell.appendChild(control);
  updateNameMultiSelect(control, students.length > 0);
}

function updateNameMultiSelect(control, hasRoster = !control.querySelector(".name-multiselect__empty")) {
  const names = [...control.querySelectorAll("input:checked")].map(input => input.value);
  control.querySelector(".name-multiselect__value").textContent = names.length
    ? names.map(displayStudentName).join("\n")
    : hasRoster ? "Сурагч сонгох" : control.dataset.emptyLabel || "Жагсаалт оруулаагүй";
  control.title = names.map(displayStudentName).join(", ");
}

function displayStudentName(name) {
  const [ovog, ...givenNames] = String(name).trim().split(/\s+/);
  return givenNames.length ? `${[...ovog][0]}. ${givenNames.join(" ")}` : name;
}

function selectedNames(cell) {
  return [...cell.querySelectorAll(".name-multiselect input:checked")]
    .map(input => input.value)
    .join(", ");
}

function displaySelectedNames(cell) {
  return selectedNames(cell)
    .split(", ")
    .filter(Boolean)
    .map(displayStudentName)
    .join(", ");
}

/* ================= TOTAL CALCULATION ================= */
function initTotals() {
  calculateTotals();
}

function calculateTotals() {
  let incomingSum = 0;
  let presentSum = 0;
  const absenceSums = [0, 0, 0];
  const studentNameSums = [[], []];

  document.querySelectorAll(".attendance-table tbody tr").forEach(row => {
    const tds = row.querySelectorAll("td");
    const incoming = parseInt(tds[3]?.querySelector("input")?.value || 0, 10);
    const present  = parseInt(tds[4]?.querySelector("input")?.value || 0, 10);

    incomingSum += isNaN(incoming) ? 0 : incoming;
    presentSum  += isNaN(present)  ? 0 : present;

    [5, 6, 7].forEach((cellIndex, sumIndex) => {
      const value = parseInt(tds[cellIndex]?.querySelector("input")?.value || 0, 10);
      absenceSums[sumIndex] += isNaN(value) ? 0 : value;
    });

    [8, 9].forEach((cellIndex, sumIndex) => {
      const names = displaySelectedNames(tds[cellIndex]);
      if (names) studentNameSums[sumIndex].push(`${tds[2].innerText.trim()}: ${names}`);
    });
  });

  const incomingTotal = document.getElementById("incoming-total");
  const presentTotal  = document.getElementById("present-total");

  if (incomingTotal) incomingTotal.value = incomingSum;
  if (presentTotal)  presentTotal.value  = presentSum;

  const totalCells = document.querySelectorAll(".attendance-table tfoot tr td");
  [3, 4, 5].forEach((cellIndex, sumIndex) => {
    const totalInput = totalCells[cellIndex]?.querySelector("input");
    if (totalInput) {
      totalInput.value = absenceSums[sumIndex];
      totalInput.readOnly = true;
    }
  });

  [6, 7].forEach((cellIndex, sumIndex) => {
    const totalCell = totalCells[cellIndex];
    if (totalCell) totalCell.textContent = studentNameSums[sumIndex].join("; ");
  });
}

/* ================= VALIDATION ================= */
const attendanceValidators = [];

function validateAttendance() {
  attendanceValidators.forEach(validate => validate());
}

function initValidation() {
  document.querySelectorAll(".attendance-table tbody tr").forEach(row => {
    const tds = row.querySelectorAll("td");

    const incomingInput = tds[3]?.querySelector("input");
    const presentInput  = tds[4]?.querySelector("input");
    const spinners = [
      tds[5]?.querySelector("input"),
      tds[6]?.querySelector("input"),
      tds[7]?.querySelector("input")
    ];

    if (!incomingInput || !presentInput) return;

    const errorBox = document.createElement("div");
    errorBox.className = "cell-error";
    errorBox.style.color = "red";
    errorBox.style.fontSize = "11px";
    tds[7].classList.add("spinner-cell");
    tds[7].appendChild(errorBox);

    const validate = () => {
      const incoming = parseInt(incomingInput.value || 0, 10);
      const present  = parseInt(presentInput.value || 0, 10);
      const spinnerSum = spinners.reduce((s, i) => s + (parseInt(i?.value || 0, 10)), 0);

      errorBox.textContent = "";
      if (presentInput.value === "" && spinnerSum === 0) return;

      if (present > incoming) {
        errorBox.textContent = "Ирсэн > Ирэх";
      } else if (spinnerSum !== incoming - present) {
        errorBox.textContent = "Ирцийн нийлбэр зөрүүтэй";
      }
    };

    [incomingInput, presentInput, ...spinners].forEach(i => {
      if (i) i.addEventListener("input", validate);
    });
    attendanceValidators.push(validate);
  });
}

/* ================= EXPORT TOOLBAR ================= */
function initExportToolbar() {
  const toolbar = document.querySelector(".export-toolbar");
  if (!toolbar) return;

  document.querySelectorAll('[data-action="sheet"]').forEach(button => {
    button.textContent = "Ирцийн мэдээ илгээх";
  });
  document.querySelectorAll('[data-action="gmail"]').forEach(button => {
    button.textContent = "📧 Gmail";
  });
  if (!toolbar.querySelector(".submission-hint")) {
    const hint = document.createElement("p");
    hint.className = "submission-hint";
    hint.textContent = "Ирцийн мэдээллийг бүрэн бөглөж, нягталсны дараа «Ирцийн мэдээ илгээх» товчийг дарна уу.";
    toolbar.append(hint);
  }

  toolbar.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "excel")  exportExcel();
    if (action === "gmail")  exportToGmail();
    if (action === "pdf")    exportPDF();
    if (action === "sheet")  sendToSheet();
    if (action === "exit")   resetInputs(); // 🧹 цэвэрлэх
  });
}

/* ================= GOOGLE SHEETS ================= */
function buildSheetPayload() {
  const rows = selector => [...document.querySelectorAll(selector)].map(row =>
    [...row.cells].map(cell => {
      const input = cell.querySelector('input[type="number"]');
      if (input) return Number(input.value);
      if (cell.querySelector('.name-multiselect')) return cell.closest('.late-students-table') ? selectedNames(cell) : displaySelectedNames(cell);
      const field = cell.querySelector('input, select, textarea');
      return field ? field.value.trim() : cell.textContent.trim();
    }));
  return {
    token: SHEET_TOKEN,
    date: currentDraftDate(),
    shift: document.body.dataset.shift || "1",
    teacher: currentDutyTeacherName(),
    notes: dutyNotesWithSignatures(),
    attendance: rows(".attendance-table tbody tr").filter(row => row[2]).map(row =>
      row.map((value, index) => index >= 3 && index <= 7 ? Number(value) : value)),
    electives: rows(".elective-table tbody tr").map(row =>
      row.map((value, index) => index >= 1 && index <= 5 ? Number(value) : value)),
    late: rows(".late-students-table tbody tr").filter(row => row.slice(1).some(Boolean))
      .flatMap(row => String(row[2]).split(", ").map(name => row.map((value, index) => index === 2 ? name : value)))
  };
}

async function sendToSheet() {
  const button = document.querySelector('[data-action="sheet"]');
  const status = document.querySelector('.sheet-send-status');
  if (!button || button.disabled) return;
  const message = (text, ok = false) => {
    status.textContent = text;
    status.dataset.state = ok ? "success" : "error";
  };
  calculateTotals();
  validateAttendance();
  saveDraft();
  const unassignedRow = [...document.querySelectorAll('.attendance-table tbody tr')].find(row =>
    !row.cells[2].textContent.trim() && (
      [...row.querySelectorAll('input[type="number"]')].some(input => Number(input.value) !== 0) ||
      [8, 9].some(index => selectedNames(row.cells[index]))));
  if (unassignedRow) {
    message(`№${unassignedRow.cells[0].textContent.trim()} мөрөнд анги оноогоогүй байна. Энэ хоосон мөрийн мэдээллийг зөв ангийн мөрөнд шилжүүлнэ үү. Ноорог хадгалагдсан.`);
    unassignedRow.scrollIntoView({ block: "center" });
    return;
  }
  const error = [...document.querySelectorAll('.cell-error')].find(box => box.textContent);
  const invalidNumber = [...document.querySelectorAll('input[type="number"]')]
    .find(input => !input.checkValidity() || (input.value !== "" && !Number.isInteger(Number(input.value))));
  if (error || invalidNumber) {
    message("Ирцийн тооны зөрүүг засна уу.");
    (invalidNumber || error).scrollIntoView({ block: "center" });
    return;
  }
  if (SHEET_URL === "ЭНД_APPS_SCRIPT_URL" || SHEET_TOKEN === "ЭНД_TOKEN") {
    message("Google Sheet-ийн URL болон TOKEN-ийг тохируулна уу.");
    return;
  }
  if (yearlyLateHistory === null && [...document.querySelectorAll(".late-students-table tbody tr")].some(row => selectedNames(row.cells[2]))) {
    message("Хоцролтын өмнөх мэдээлэл ачаалагдаагүй байна. Apps Script-ийг шинэчилж, хуудсаа дахин ачаална уу.");
    return;
  }
  if (window.matchMedia("(max-width: 720px)").matches) {
    const classes = [...document.querySelectorAll(".attendance-table tbody tr")]
      .filter(row => row.cells[2]?.textContent.trim());
    const completed = classes.filter(row => row.cells[4]?.querySelector("input")?.value.trim() !== "").length;
    const remaining = classes.length - completed;
    const review = [
      "Ирцийн мэдээг илгээх үү?",
      `${shiftDisplayName()} · ${currentDraftDate()}`,
      `Жижүүр багш: ${currentDutyTeacherName() || "Нэр оруулаагүй"}`,
      `Бөглөсөн анги: ${completed} / ${classes.length}`,
      remaining ? `Анхаар: ${remaining} ангийн ирсэн сурагчийн тоог бөглөөгүй байна.` : "",
      "Мэдээллээ бүрэн бөглөж, нягталсан бол OK дарна уу. Бөглөж үргэлжлүүлэх бол Цуцлах дарна уу."
    ].filter(Boolean).join("\n\n");
    if (!window.confirm(review)) return;
  }
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Илгээж байна...";
  status.textContent = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(buildSheetPayload()),
      redirect: "follow",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`http_${response.status}`);
    let result;
    try {
      result = await response.json();
    } catch (_) {
      throw new Error("invalid_response");
    }
    if (result.ok !== true) throw new Error(result.error || "server");
    if (result.lateCounts) {
      yearlyLateHistory = result.lateCounts;
      refreshLateCounts();
      saveDraft();
    }
    message("Google Sheet-д амжилттай хадгаллаа.", true);
  } catch (error) {
    const errors = {
      unauthorized: "TOKEN буруу байна. Apps Script-ийн TOKEN болон SHEET_TOKEN ижил эсэхийг шалгана уу.",
      invalid_payload: "Илгээсэн мэдээлэл шаардлага хангахгүй байна. Ирцийн нийлбэр, хоцорсон сурагчийн анги болон нэрийг шалгана уу.",
      save_failed: "Apps Script мэдээллийг хадгалж чадсангүй. SPREADSHEET_ID, хүснэгтэд хандах эрх, баганын толгойг шалгана уу. Apps Script-ийн Executions хэсэгт дэлгэрэнгүй алдаа байна.",
      busy: "Өөр илгээлт боловсруулж байна. Түр хүлээгээд дахин илгээнэ үү.",
      invalid_response: "Apps Script JSON хариу өгсөнгүй. Deploy-ийн Web app URL болон Who has access: Anyone тохиргоог шалгана уу."
    };
    const detail = errors[error.message] || (error.name === "AbortError"
      ? "Илгээлт 30 секундэд дууссангүй. Дахин оролдоно уу."
      : /^http_/.test(error.message)
        ? `Сервер HTTP ${error.message.slice(5)} алдаа буцаалаа. Web app URL болон Deploy-ийн хандах эрхийг шалгана уу.`
        : "Apps Script-тэй холбогдож чадсангүй. Web app URL, Who has access: Anyone тохиргоо болон сүлжээг шалгана уу.");
    message(`${detail} Ноорог хадгалагдсан.`);
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    button.textContent = label;
  }
}

/* ================= RESET ================= */
function resetInputs() {
  if (!confirm("Бүх өгөгдлийг цэвэрлэх үү?")) return;

  document.querySelectorAll("input").forEach(input => {
    if (input.type === "number") input.value = "0";
    else if (input.type === "checkbox") input.checked = false;
    else input.value = "";
  });
  document.querySelectorAll("textarea").forEach(textarea => {
    textarea.value = "";
  });

  document.querySelectorAll(".late-students-table select").forEach(select => {
    select.selectedIndex = 0;
    if (select.classList.contains("late-class-select")) {
      select.dispatchEvent(new Event("change"));
    }
  });

  document.querySelectorAll(".name-multiselect").forEach(updateNameMultiSelect);

  document.querySelectorAll(".attendance-table tbody tr").forEach(row => {
    const presentInput = row.cells[4]?.querySelector("input");
    if (presentInput) presentInput.value = "";
  });
  updateExpectedStudentCounts(true);
  calculateTotals();
  validateAttendance();
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

/* ================= EXCEL EXPORT ================= */
function exportExcel(download = true) {
  if (typeof XLSX === "undefined") {
    alert("Excel library ачаалагдаагүй байна");
    return false;
  }

  const title = "2026-2027 оны хичээлийн жилийн сурагчдын ирцийн тэмдэглэл";
  const headers = ["№","Анги №","Анги бүлэг","Ирэх","Ирсэн","Өвчтэй","Чөлөөтэй","Тасалсан","Тасалсан","Чөлөө"];
  const shift = document.body.dataset.shift || "1";
  const dateStamp = currentDraftDate();
  const dutyTeacherName = currentDutyTeacherName();
  const data = [[title], [`${shiftDisplayName(shift)} · ${dateStamp}`], [`Жижүүр багшийн нэр: ${dutyTeacherName}`], headers];

  document.querySelectorAll(".attendance-table tbody tr").forEach(row => {
    const tds = row.querySelectorAll("td");
    data.push([
      tds[0].innerText.trim(), tds[1].innerText.trim(), tds[2].innerText.trim(),
      Number(tds[3].querySelector("input").value), Number(tds[4].querySelector("input").value),
      Number(tds[5].querySelector("input").value), Number(tds[6].querySelector("input").value),
      Number(tds[7].querySelector("input").value),
      displaySelectedNames(tds[8]), displaySelectedNames(tds[9])
    ]);
  });

  const totals = [3, 4, 5, 6, 7].map(columnIndex =>
    data.slice(4).reduce((sum, row) => sum + row[columnIndex], 0));
  data.push(["", "", "НИЙТ", ...totals]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  formatExportSheet(ws, data.length, 10, "A4:J4", [6, 12, 12, 9, 9, 12, 14, 14, 32, 32]);
  ws["!merges"] = ["A1:J1", "A2:J2", "A3:J3"].map(range => XLSX.utils.decode_range(range));
  XLSX.utils.book_append_sheet(wb, ws, "Ирц");

  const electiveData = [["Сонгон судлах хичээлийн ирц"], [],
    ["Хичээл", "Ирэх", "Ирсэн", "Өвчтэй", "Чөлөөтэй", "Тасалсан", "Багшийн нэр, анги бүлэг"]];
  document.querySelectorAll(".elective-table tbody tr").forEach(row => {
    electiveData.push([...row.querySelectorAll("td")].map((cell, index) => {
      const value = exportCellValue(cell);
      return index >= 1 && index <= 5 ? Number(value) : value;
    }));
  });
  const electiveWs = XLSX.utils.aoa_to_sheet(electiveData);
  formatExportSheet(electiveWs, electiveData.length, 7, "A4:G4", [28, 9, 9, 12, 14, 14, 34]);
  electiveWs["!merges"] = [XLSX.utils.decode_range("A1:G1")];
  XLSX.utils.book_append_sheet(wb, electiveWs, "Сонгон хичээл");

  const lateData = [["Хоцорсон сурагчдын бүртгэл"], [],
    ["№", "Анги бүлэг", "Сурагчийн нэр", "Асран хамгаалагчийн утас", "Гэрийн хаяг", "Хоцорсон давталт"]];
  document.querySelectorAll(".late-students-table tbody tr").forEach(row => {
    lateData.push([...row.querySelectorAll("td")].map(cell => exportCellValue(cell)));
  });
  const lateWs = XLSX.utils.aoa_to_sheet(lateData);
  formatExportSheet(lateWs, lateData.length, 6, "A4:F4", [6, 12, 25, 23, 30, 18]);
  lateWs["!merges"] = [XLSX.utils.decode_range("A1:F1")];
  XLSX.utils.book_append_sheet(wb, lateWs, "Хоцорсон");

  const dutyTeacherNotes = document.getElementById("duty-teacher-notes");
  if (dutyTeacherNotes) {
    const notesData = [["Жижүүр багшийн тэмдэглэл"], [dutyNotesWithSignatures()]];
    const notesWs = XLSX.utils.aoa_to_sheet(notesData);
    notesWs["!cols"] = [{ wch: 100 }];
    notesWs["!rows"] = [{ hpt: 22 }, { hpt: 100 }];
    XLSX.utils.book_append_sheet(wb, notesWs, "Багшийн тэмдэглэл");
  }

  const fileName = `irts_${shift}_${dateStamp}.xlsx`;
  if (download) {
    XLSX.writeFile(wb, fileName);
    return true;
  }
  return {
    fileName,
    fileBase64: XLSX.write(wb, { bookType: "xlsx", type: "base64" })
  };
}

function exportToGmail() {
  if (!exportExcel()) return;

  const shift = document.body.dataset.shift || "1";
  const dateStamp = currentDraftDate();
  const dutyTeacherName = currentDutyTeacherName();
  const composeUrl = new URL("https://mail.google.com/mail/");
  composeUrl.searchParams.set("view", "cm");
  composeUrl.searchParams.set("fs", "1");
  composeUrl.searchParams.set("to", "t.suwdaa8306@gmail.com");
  composeUrl.searchParams.set("cc", "sundui920@gmail.com");
  composeUrl.searchParams.set("su", `${shiftDisplayName(shift)}ийн ирцийн тайлан Жижүүр багш ${dutyTeacherName} - ${dateStamp}`);
  composeUrl.searchParams.set(
    "body",
    `Сайн байна уу,\n\nИрцийн тайлангийн татаж авсан "irts_${shift}_${dateStamp}.xlsx" файлыг энэ имэйлд гараар хавсаргана уу.\n`
  );
  window.open(composeUrl.toString(), "_blank", "noopener");
}

function exportCellValue(cell) {
  const nameSelector = cell.querySelector(".name-multiselect");
  if (nameSelector) return displaySelectedNames(cell);
  return cell.querySelector("input, select")?.value?.trim() || cell.textContent.trim();
}

function formatExportSheet(ws, rowCount, columnCount, filterRange, widths) {
  ws["!cols"] = widths.map(wch => ({ wch }));
  ws["!autofilter"] = { ref: filterRange };
  ws["!margins"] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  ws["!pageSetup"] = { orientation: "landscape", paperSize: "9", fitToWidth: 1, fitToHeight: 0 };
  ws["!rows"] = Array.from({ length: rowCount }, (_, index) => ({ hpt: index < 2 ? 22 : 18 }));
  const endCell = XLSX.utils.encode_cell({ r: rowCount - 1, c: columnCount - 1 });
  ws["!ref"] = `A1:${endCell}`;
}

/* ================= PDF EXPORT ================= */
function exportPDF() {
  window.print();
}

// Offline snapshot of students_by_class.xlsx; used when workbook loading is unavailable.
const BUNDLED_CLASS_ROSTERS = {"12-а":["Амгаабазар Анар","Баттулга Анужин","Чулуун Анхбаяр","Баттулга Бат-Ирээдүй","Төгсжаргал Баяржаргал","Мөнхзул Билэгт","Бат-Орших Даваадорж","Мөнхбат Есүй","Батбаяр Зоригт","Хүрэлхүү Маралгоо","Одбилэг Маралмаа","Гантөгс Молор-Эрдэнэ","Золбаяр Мөнхжаргал","Шинэбаяр Мөнхтулга","Дөлгөөн Намуун","Цэнгэлжаргал Намуунзаяа","Цэдэвдорж Наранбаатар","Баянмөнх Насанбуян","Энхжаргал Төгс-Эрдэнэ","Болортуяа Түвшинбат","Гөлгөө Түвшинбаяр","Эрдэнэбилэг Түвшинжаргал","Мөнхбаяр Тэмүүжин","Цогтбаатар Хонгорзул","Үүрийнцолмон Цэлмүүн","Цэрэнчунт Цэлмэг","Мөнхболд Чинбилэгт","Мөнхболд Чингүүн","Отгонжаргал Энхбаяр","Эрдэнэбат Энхцэцэг","Батзаяа Эрдэнэмөнх","Баасанбаатар Эрхсаран"],"12-б":["Эрдэнэжаргал Анар-Эрдэнэ","Батжаргал Анударь","Ганзориг Анунгоо","Төмөрчөдөр Анххүслэн","Баднаабаяр Баасанхүү","Мөнх-Эрдэнэ Болоржин","Ганбаяр Ган-Очир","Баасансүрэн Гэрэлтуяа","Батбаатар Дүүрэнбилэг","Эрдэнэбаатар Жавхлан","Мягмарсүх Марал","Ганхүү Мөнхгэрэл","Амгалан Мөнхтулга","Өлзийсайхан Нарангэрэл","Бямбадорж Номинжин","Отгонсүрэн Номинзул","Отгончимэг Нямсүрэн","Ууганбаяр Одгэрэл","Энх-Оюун Өлзийдарь","Даваасамбуу Саранжаргал","Сүрэнхүү Сарнай","Бямбадорж Содбилгүүн","Батдорж Содбилэг","Баярзолбоо Төгөлдөрсайхан","Мөнхжаргал Тэлмэнбаяр","Дүгэрсүрэн Ундармаа","Ганболд Хорлоо","Бат-Очир Хүслэн","Баярхүү Элбэгсайхан","Баасанцэрэн Энхжаргал","Ганзориг Энхжин","Мөнхцэцэг Энхтүшиг","Саруул Эрхзаяа"],"12-в":["Амарсанаа Амар","Тэмүүжин Амаржаргал","Батбямба Анар","Намжил Анударь","Баттулга Батзориг","Батзориг Бат-Орших","Түмэндэмбэрэл Гандөл","Хашбаатар Ганцэцэг","Отгонбаяр Гүнжилмаа","Цэндсүрэн Даваанасан","Эрдэнэхүү Дэлгэрдалай","Адъяадорж Дэмчиг","Эрдэнээ Маралгоо","Одон Мөнхзул","Ажрахгүй Мөнхсайхан","Оч-Эрдэнэ Мөнхцэнгэл","Даваадорж Мөнх-Амгалан","Мөнхбат Мөнх-Учрал","Мэндбаяр Намуунцэцэг","Одхүү Нандин-Эрдэнэ","Гантулга Номинжин","Ган-Эрдэнэ Номин-Эрдэнэ","Туяа Пүрэвдорж","Ёолк Төгсбилэг","Баярсайхан Урангоо","Төмөр-Очир Хатанцэцэг","Мэндбаяр Хулан","Одхүү Хулан","Энх-Идэр Хүслэн","Төмөрхуяг Цэлмүүн","Амартүвшин Энхбаяр","Энхтүвшин Энхзул","Одхүү Энх-Эрдэнэ"],"12-г":["Цэрэнбат Аззаяа","Озотбек Айтолкын","Буянтогтох Алтанхүү","Өлзийжаргал Анар","Батсүх Анужин","Гантулга Анхзаяа","Ганбат Ариунбат","Бат-Ирээдүй Ариунзаяа","Өлзийбаатар Бат-Өлзий","Лхагвасүрэн Баярсайхан","Бүрэнтогтох Билгүдэй","Ганбаатар Билгүүн","Лхагвадорж Буяннэмэх","Цэрэнпунцаг Ганбагана","Ууганбаатар Ганбаяр","Ганрагчаа Ганболор","Батжаргал Гончогсүрэн","Дэлгэрцогт Дагвадорж","Жанцанхорлоо Дашмягмар","Шинэ-Идэр Жавхлантөгс","Бат-Эрдэнэ Ишцог","Мөнхдаваа Минжэн","Эрдэнэ-Отгон Мишээл","Баяраа Солонго","Баярмагнай Төгөлдөр","Нямцээрэн Тунгалаг","Энхбат Түвшинбаяр","Бат-Орших Хангайбазар","Батбаяр Хаш-Эрдэнэ","Баянбат Хишигзаяа","Энхтайван Хулан","Золбоот Цэлмүүн","Мөнхөө Эгшиглэн"],"12-д":["Батбаяр Агиймаа","Болор-Эрдэнэ Амаржаргал","Батсайхан Амгалан","Энхболд Ариун-Эрдэнэ","Өнөртүшиг Батдэлгэр","Баянмөнх Батлхагва","Буджав Билгүүн","Цогт Билгүүн","Энхбаяр Боргил","Амарсайхан Ганжаргал","Пүрэвзагд Дарханбаяр","Ганзориг Дөлгөөн","Түмэннаст Маралжингоо","Оюунзул Мөнгөлдэй","Ганхуяг Мөнгөншагай","Хурцбаатар Мөнхжин","Мөнхбаатар Мөнх-Уянга","Ариунболд Нандинболор","Ганзориг Нандин-Эрдэнэ","Нямрагчаа Номин-Эрдэнэ","Эрдэнэдаваа Номин-Эрдэнэ","Хүрэлчулуун Сарангэрэл","Эрдэнэдаваа Саранзүг","Гансүх Солонго","Эрдэнэжаргал Төгөлдөр","Баярцогт Тэмүүлэн","Бямба Ундармаа","Баянтэрбиш Хосбаяр","Бямбадорж Хувьтөгөлдөр","Нямдорж Шинэгэрэл","Чинбат Энхзаяа","Ганбаатар Эрхсаран"],"12-е":["Дорждагва Азжаргал","Батбилэг Алтансувд","Жамсран Амарсайхан","Хишгээ Анар-Эрдэнэ","Батлхагва Батсүрэн","Нармандах Буянжаргал","Алтанбагана Гоомарал","Очирваань Лхагва-Очир","Отгонбаяр Маргад","Чулуунбат Мөнхжин","Даваасүрэн Мөнхнаран","Уранбаатар Мөнхчимэг","Ганбат Мөнх-Оргил","Гэрэлт-Од Нандин-Эрдэнэ","Одхүү Нармандах","Жигжидлхам Нямбат","Ганбаатар Санчир","Батбаяр Солонго","Дашжамц Ундрал","Батсүх Ууганбаяр","Дашжамц Учрал","Оюун Халиун","Бадрах Хосбаяр","Амар-Эрдэнэ Цасчихэр","Амартүвшин Цогзолмаа","Санчир Чин-Итгэл","Нямдорж Энхжин","Батсайхан Энхцэцэг","Түмэндэлгэр Энх-Учрал","Дагвадорж Эрдэнэтуяа","Шаравдорж Эрхсаран","Ууганбат Эрхэмбаяр"],"11-а":["Нямдолгор Алтангэрэл","Дандар Анар","Пүрэвдорж Баяржаргал","Мөнх-Ирээдүй Билгүүн","Энхбат Билэгдэмбэрэл","Ягаанцэцэг Ганцэцэг","Баянбат Даваажаргал","Алтандаваа Даваасүрэн","Пүрэвдорж Давхарбаяр","Товуудорж Должин","Очирхуяг Дөлгөөн","Гантулга Золбоо","Шинэбаяр Золжаргал","Алтаншагай Итгэл","Золбоо-Учрал Мишээл","Даваа Мөнхболд","Баяр-Эрдэнэ Мөнх-Ундрага","Ганболор Номин","Ганцолмон Номинзул","Анхбаяр Нямгэрэл","Амгалан Содгэрэл","Шижирбат Төрбат","Майпүрэв Төртүвшин","Энхбат Тунгалагтоль","Ганболд Тэлмэн","Ариунзаяа Тэмүүлэн","Пүрэвсүрэн Ундрахбаяр","Энхболд Уянга","Баасан Халиун","Хишигсүрэн Хоролсүрэн","Нарандулам Цасангоо","Мөнхзул Цэнгүүнзаяа","Зундуйсэнгэ Цэрэндамба","Урангэрэл Чингүүн","Ганбат Эгшиглэн","Төмөрсүх Энхжин","Ганчулуун Энхцацрал","Хишигдорж Эрдэнэсувд","Хишигдорж Эрдэнэтуяа","Батод Эрдэнэт-Од","Тамирбаатар Эрхэмзаяа"],"11-б":["Мягмаржаргал Амгалан","Отгонбаяр Анужин","Хүрэлбаатар Анужин","Цэцэгсүрэн Аръяа","Баасанжаргал Баасантөгс","Эрдэнэсүх Батпүрэв","Баасанжав Бат-Эрдэнэ","Батсайхан Бат-Эрдэнэ","Даваабаяр Баярхүү","Гансүх Бишрэлт","Алтанхуяг Дашням","Лхамдорж Дүүрэнжаргал","Отгонбаяр Жавхаа","Гямц Жамъяндагва","Чинзоригт Жасрай","Даваадорж Мандухай","Эрдэнэцогт Маргад","Цэдэн-Иш Минжинсор","Эрдэнэтөгс Мөнхбаяр","Ганхуяг Мөнхзаяа","Пүрэвхүү Мөнх-Эрдэнэ","Ганчимэг Мягмарнаран","Хонгорзул Намуунаа","Доньдгарьд Нандин-Эрдэнэ","Одгэрэл Отгонжаргал","Ганбаатар Төрболд","Ганбаяр Туяацэцэг","Батсүх Тэнгис","Мөнхжаргал Тэргэл","Давааням Үжин","Батмөнх Хонгорзул","Цогбаяр Хулан","Алтантулга Цогзолмаа","Энхчулуун Энхжэн","Ганхуяг Энхзаяа","Гангааням Энхзул","Эрдэнэбулган Энх-Эрдэнэ","Батбаяр Эрхэмбилэг"],"11-в":["Сэр-Од Ананд","Баатар Ариунбат","Мөнхбаяр Бадар-Ууган","Дагвасүрэн Батмөнх","Отгонбаатар Баяр","Машбат Билгүүн","Онолбаатар Бямбажаргал","Ган-Эрдэнэ Ган-Оч","Амгалан Дамдинпүрэв","Бямбатогтох Жавзансүрэн","Хүрэлбаатар Итгэл","Шижирболд Мөнгөншагай","Лундаажанцан Мөнхсаран","Алтангэрэл Нарангарав","Тогтохбаяр Нармандах","Шоовдор Номин-Эрдэнэ","Дөлгөөн Оюун","Гантулга Пүрэвмаа","Эрдэнэбаатар Пүрэвчулуун","Энхжаргал Саранцацралт","Цэцэгмаа Сувд-Эрдэнэ","Батсүх Сумъяарагчаа","Батбаяр Төгөлдөр","Батхуяг Төгсбилэг","Соронзонболд Тэмүүлэн","Лхагвасүрэн Тэмүүлээ","Төрмөнх Удвал","Эрдэнэцогт Уугандарь","Очбаяр Халиун","Тогтохбаатар Халиун","Нямцоож Хасчулуун","Үүрцайх Чингүн","Отгонбаяр Элбэгням","Бат-Эрдэнэ Энхжин","Энхболд Энхзул","Дэлгэрсайхан Энххүслэн","Ган-Эрдэнэ Эрдэнэдалай","Түвшинтөгс Эрдэнэхүү"],"11-г":["Алтанхуяг Анандбазар","Эрдэнэдаваа Анударь","Жамсранжав Баасандорж","Төрбат Батзаяа","Баярбат Батцагаан","Одбаяр Бат-Ирээдүй","Батбаатар Баянмөнх","Ариунтуяа Буяндэлгэр","Мягмардорж Буянтөгс","Ганхүү Бүрэнтөгс","Эрдэнэдалай Ганзолбоо","Төгс Гантөгс","Амарсанаа Жавхлан","Эрдэнэбаатар Мишээл","Сууринтогтох Мөнхцэцэг","Сумъяахүү Мянганбаяр","Цогбадрах Намуун","Самбуу Нарантунгалаг","Анхбаяр Номин-Эрдэнэ","Отгонбаатар Номин-Эрдэнэ","Гантулга Нэмэхбаяр","Ишгэн Очирбат","Өвгөнхүү Оюун-Эрдэнэ","Мөнхдаваа Хүслэн","Ням-Очир Хүслэн","Гарьдрагчаа Цогзолбоо","Бадамжав Цэлмүүн","Отгонбаатар Чинтулга","Батболд Шинэцэцэг","Отгонбаатар Шинэ-Од","Лутсүх Энхжин","Гансүх Энххүслэн","Пүрэв-Очир Энххүслэн","Өлзийбүрэн Энхцэцэг","Энэбиш Эрдэнэбат","Түмэн-Эрдэнэ Эрдэнэ-Очир"],"11-д":["Гомбо Ананд","Ганзориг Анар","Цогтбаатар Анар","Сайнбилэг Анхгэрэл","Нямдаваа Ариун-Эрдэнэ","Золбоо Барс","Ням-Эрдэнэ Баярзул","Доржзовд Бумрэнцэн","Эрдэнэцогт Бүжинлхам","Мягмаржав Бэлгүтэй","Отгонхишиг Бэршагай","Сүхболд Ганцолмон","Пүрэвсүрэн Гэгээнээ","Ганзориг Дөлгөөн","Энхтүвшин Дөлгөөн","Сундуй Мичидмаа","Баяржаргал Мөнхжаргал","Нямдорж Мөнхсайхан","Орхонбаатар Мөнхцас","Заяабаатар Мянгансарнай","Хишигдаваа Нандин-Эрдэнэ","Отгонцэцэг Наранбаатар","Баярсайхан Номунбилэг","Мөнх-Эрдэнэ Номунгоо","Нямгарав Од-Эрхэс","Цолмон Отгонцэцэг","Наранбаатар Тэмүүжин","Цэрэндаш Тэмүүжин","Дармаа Тэнүүнбаяр","Цоггэрэл Халиун","Анударь Хулан","Цоггэрэл Хулан","Ганхуяг Цолмон","Наранбаатар Цэлмүүн","Батжаргал Цэрэндүг","Батдорж Чинболор","Ганхуяг Чингүн","Батбаатар Шаравжамц","Энхбаатар Энхсөд"],"10-а":["Баттулга Аминхүслэн","Очирбаатар Анар","Даваабаяр Ариунболд","Мөнхбаяр Баттулга","Эрдэнэсүрэн Баянжаргал","Эрдэнэжаргал Баярбаясгалан","Эрдэнэбат Билгүүнбаяр","Дэмчиг Болор-Эгшиглэн","Ариунболд Булган-Өлзий","Амарсайхан Ганчимэг","Бадамсүрэн Маргад","Буман-Өлзий Мишээл","Эрдэнэчухал Мишээл","Мөнх-Эрдэнэ Нандинбулаг","Энхнаран Наранбаяр","Ганбаатар Нямцэцэг","Батбаатар Одбаясах","Батдэлгэр Сувд","Оюун-Эрдэнэ Тэлмүүн","Мөнхбаяр Урангоо","Бат-Эрдэнэ Ууганбилэг","Мөнхбаатар Үүрцайх","Ганзориг Халиунболд","Хурцбаатар Хатанзоригт","Жаргалсайхан Хүслэн","Үүрийнцолмон Цолмонзаяа","Зоригоо Цэлмэгдорж","Монхор Цэнгүүн","Баянмөнх Цэнд-Аюуш","Эрдэнэсайхан Цэрэнпунцаг","Авирмэд Цэцэгдарь","Батдорж Цэцэнбилэг","Батболд Энхболд","Гансүх Энхжин","Түвшинхүү Энхмөрөн"],"10-б":["Гантулга Амартүвшин","Баттөгс Аминаа","Батзул Амин-Эрдэнэ","Сэрчмаа Арьяа","Батхуяг Батхүслэн","Амартүвшин Болд","Ганцоож Буянзаяа","Баяржаргал Гантөгс","Мөнхбат Гэрэлт","Гантулга Золжаргал","Бат-Эрдэнэ Ичинхорлоо","Ган-Эрдэнэ Ичинхорлоо","Насанбат Мичидмаа","Мөнхтүшиг Мөнхжин","Мөнхбат Мөнхномин","Мядагмаа Мөнхсаран","Отгонбаатар Мөнхсүлд","Мөнхбаатар Номин-Эрдэнэ","Батцэнгэл Сансармаа","Билгүүн Саруул","Гүррагчаа Төгссайхан","Цэрэгхүү Тэмүүлэн","Сэр-Од Тэмүүн","Болор-Эрдэнэ Үүлэнсолонго","Оргил Хатантуул","Соёл-Эрдэнэ Хувьт","Чинзориг Хүслэн","Эрдэнэбаяр Цэлмэг","Энхдэмбэрэл Чинхүсэл","Ариунболд Шинэзул","Ганболд Шинэтуяа","Эрхэмбаяр Эгшиглэн","Алтансүх Энхдөл","Мөнхболд Энэрэл","Номин-Эрдэнэ Эрдэнэзаяа","Чоймбол Эрхэм-Эрдэнэ"],"10-в":["Янжинлхам Анударь","Одонтунгалаг Анхбаяр","Төмөрчөдөр Анхчимэг","Отгонбаатар Ариунболд","Чулуунбаатар Ариунболд","Батмөнх Бадамцэцэг","Одсэр Батзул","Жамсран Батсайхан","Одбаяр Билгүүн","Нямдорж Бум-Эрдэнэ","Саранбаатар Марал","Тэрбиш Нарансолонго","Ганболд Наранцэцэг","Ганхуяг Номин-Эрдэнэ","Даваахүү Оргил","Энхболд Оюунтөгс","Ганболд Саранцэцэг","Лхагва Саруул","Эрдэнэбаяр Соёл-Эрдэнэ","Гантулга Соёмбо","Батболд Төгөлдөр","Наранцогт Тэлмүүн","Наранцогт Тэмүгэн","Наранбат Хулан","Ганхуяг Хулангоо","Тэмүүжин Хүслэн","Одсүрэн Цэнгүүн","Мягмарцэрэн Чингүүн","Бат-Ирээдүй Шандас","Энхжаргал Шинэ-Эрдэнэ","Баасанжаргал Шүрээ","Ууганбаяр Энгүүн","Амарбаясгалан Энхбаясгалан","Золбаяр Энхдаваа","Анхбаяр Энхжин","Энхзул Энхсаруул","Төгсбаяр Энхтүвшин","Галхүү Энххүслэн","Баярцогт Энэрэлод"],"10-г":["Баатарзоригт Анужин","Цэрэннамжил Анхням","Отгонбанди Ариун-Эрдэнэ","Титов Ариун-Эрдэнэ","Бямбасүрэн Болд-Эрдэнэ","Оюунбат Буянхишиг","Баасанжаргал Бүжинлхам","Даваабаатар Бүрэнбаатар","Хишигбаяр Бүрэнтөгс","Батсайхан Дөлгөөн","Чулуунбаатар Дөлгөөн","Эрдэнэбаатар Дүүрэнжаргал","Баттөр Зуун-Эрдэнэ","Пүрэвзагд Маралмаа","Мөнхбаяр Марал-Од","Батбаатар Мөнгөн-Эрдэнэ","Содномпил Мөнхбат","Сайнхүү Мөнхгэрэл","Бат-Эрдэнэ Мөнхжин","Мөнхтулга Мөнххүслэн","Мэндсайхан Мэндбаяр","Бямбадорж Намуундарь","Энхтөр Номин","Гантулга Номин-Эрдэнэ","Мөнхбат Отгон-Эрдэнэ","Мөнхбат Оюунбаяр","Жигжид Оюунтогос","Ариунбаяр Содбилэг","Жамъянсүрэн Түвшинбаяр","Гантулга Ууганбаяр","Ганзүрх Хишигдүүрэн","Ууганбаяр Хулан","Батболд Хүслэн","Пүрэвдорж Хүслэн","Ганбилэг Цэнгэл","Мөнгөн Энхтуул","Түдэвдагва Энхэлгэн","Чинзориг Энх-Амгалан","Отгонбаяр Энх-Ирээдүй"],"10-д":["Батбилэг Алтантүлхүүр","Пүрэв Алтан-Од","Төрбаяр Ангараг-Од","Анхболд Анх-Эрдэнэ","Охиноо Ариунболор","Батболд Аялгуу","Батсайхан Бат-Энх","Найрамдал Баярцэцэг","Батбаяр Бямбацогт","Цагаанхүү Бямба-Эрхэс","Энхмэл Гүнжлхам","Эрдэнэбаяр Гүнжлхам","Отгонням Дөлгөөн","Анхбаяр Зүсүм","Түвшинтогтох Маргад","Батсайхан Мөнхбилгүүн","Батбаатар Мягмарбаяр","Болдбаатар Намсрай","Ганбаатар Нандин-Эрдэнэ","Бат-Эрдэнэ Номин-Эрдэнэ","Мөнхболд Номин-Эрдэнэ","Батсуурь Отгонсувд","Батмөнх Оюундарь","Самданжамц Сарангэрэл","Баясгалан Тогтуун","Тогтохжаргал Төгөлдөр","Уламбаяр Түвшинбаяр","Энхзаяа Тэлмүүн","Ганбаатар Улсболд","Тогтохбаяр Хишигням","Батхүү Цогтбаатар","Баасанхүү Цэнд-Аюуш","Наранбаатар Шинэбаяр","Мөнхбаяр Энхнаран","Чулуунхүү Энхриймаа","Ариунболд Энххүслэн","Отгонбаатар Эрдэнэцэцэг","Энхсаруул Эрхсаран","Хүрэлсүх Эрхэмбаяр"],"10-е":["Урансүх Амин-Аялгуу","Жамбалбаатар Ананд","Мягмардалай Анар-Эрдэнэ","Батхүү Анужин","Отгонжаргал Анужин","Алтанхуяг Бат-Очир","Мөнхбаяр Баярмаа","Батбаяр Бөхбилэгт","Гэрэлт-Од Гүнжзул","Наранбаатар Есүй","Болорхүү Жаргалсайхан","Одгэрэл Мөнгөнжигүүр","Шарав Мөнгөнчимэг","Батдалай Мөнхбаяр","Батболд Мөнх-Эрдэнэ","Амармэнд Мэндбаясал","Энхбаясгалан Нандин-Эрдэнэ","Энхтүвшин Одгамид","Жанцанхорол Оюу-Эрдэнэ","Цэнддорж Өсөх-Ирээдүй","Эрдэнэтөгс Тодгэрэл","Баттулга Төрболд","Бүрэнтогтох Тэмүүлэн","Амгаланбаатар Учрал","Ууганбаяр Уянга","Сүхчулуун Халиун","Батжаргал Хүрэлтулга","Ганбат Хүслэн","Баяраа Цасанчимэг","Наранбаатар Чинбаяр","Отгонбор Чинзүрх","Эрдэнэбат Эгшиглэн","Нямдаваа Энхмэнд","Ганзориг Эрхэмбаяр","Одбилэг Эрхэс","Төгсжаргал Янжинлхам"],"9-а":["Энх-Идэр Алтангэрэл","Гэрэлт-Од Алтан-Од","Санчир Амин-Итгэл","Энхбат Ананд","Очирхуяг Анхжин","Ганбаяр Аръяасүрэн","Золзаяа Бат","Азбилэг Батбилэг","Батбаяр Батболд","Ганхуяг Батцэцэг","Отгонбаяр Баярзул","Цэрэннамжил Баярням","Амарсанаа Баясах","Төгсбаяр Билэгт","Баатарцогт Гандөл","Очирхуяг Ган-Эрдэнэ","Эрдэнэчулуун Дүүрэнжаргал","Мөнх-Эрдэнэ Золбоот","Баттогтох Намуунаа","Намсрай Номин-Эрдэнэ","Анхбаяр Номуун","Мөнхтогтох Оюунбаатар","Нямсүрэн Оюу-Ухаан","Үржинбаатар Сүлд-Очир","Буянжаргал Төгөлдөр","Ундармаа Түвшинхангай","Баянжаргал Тэнгис","Эрдэнэжаргал Тэнүүн","Ууганбаяр Тэргэл","Мөнхдаваа Үүрцайх","Батзул Хүслэн","Энхтөр Хүслэн","Цогтбаатар Хүсэлоргил","Гантулга Чингүн","Батбаяр Энхболд","Баттулга Эрдэнэзаяа","Сүхбаатар Эрдэнэ-Очир","Зоригтбаатар Эрхэмбаяр"],"9-б":["Мөнхзул Азжаргал","Бат Алтангадас","Өлзийжаргал Ананд","Ариунаа Анударь","Анхбаяр Баярсайхан","Октябрь Баясгалан","Анхбаяр Булгансондор","Цэнгүүн Булгантамир","Эрдэнэ-Очир Ганбат","Бат-Эрдэнэ Гандөш","Дашжаргал Гэгээнээ","Эрдэнэтөгс Даваагэрэл","Элдэв-Очир Дөлгөөнтамир","Наранбаатар Зулаа","Батбаяр Зул-Эрдэнэ","Энхболд Марал","Батбаатар Мөнгөнжигүүр","Номин-Эрдэнэ Мөнхжин","Болор-Эрдэнэ Мөнх-Эрдэнэ","Цэндсүрэн Намсрай","Ганзориг Нармандах","Ууганбаяр Номуун","Цэнд-Аюуш Одхүү","Отгонбаяр Од-Эрдэнэ","Пүрэвдорж Өсөхбаяр","Ариунболд Пүрэвдаваа","Энхжаргал Сарнай","Отгончимэг Сүлд-Эрдэнэ","Мөнх-Эрдэнэ Төгөлдөр","Эрхбаатар Төгсбилэг","Эрхэмбаяр Тэлмүүн","Чинзориг Тэргэл","Амгаланбаатар Ундрал","Гантөмөр Хосбаяр","Чулуун Хосбаяр","Отгонбаасай Хулан","Бандихүү Хүслэн","Эрдэнэбаяр Чингүүн","Ууганбаяр Энхдөлгөөн","Ням-Очир Энхжин","Чулуунбаатар Энэрэл","Хадбаатар Эрдэнэбат","Төмөрсүх Эрхсаран"],"9-в":["Бат-Эрдэнэ Азжаргал","Амарбаясгалан Алтаншагай","Буянхишиг Анхжин","Батсайхан Анхмаа","Эрдэнэбилэг Ариунгэрэл","Энхболд Ариунсайхан","Ганзориг Ариунсондор","Эрдэнэбилэг Ариун-Эрдэнэ","Амарсайхан Батзориг","Тулга Баясгалант","Тэрбиш Бүрэнтөгс","Од-Эрдэнэ Гоомарал","Угтахбаяр Гоомарал","Амартүвшин Гэрэлттуяа","Саранзаяа Дөлгөөн","Цогтбаатар Жавхлантөр","Баян-Өлзий Мандах-Эрдэнэ","Энхмандах Маралаа","Бат-Эрдэнэ Мишээл","Баттулга Мөнхбат","Мөнхбаатар Мөнхболор","Мөнхнасан Мөнхнаран","Эрдэнэцогт Мөнх-Ундрам","Энхболд Намуунгоо","Батболд Намуунцэцэг","Чинбат Номуун","Даваасүрэн Өлзийхишиг","Батчулуун Сайханцэцэг","Батболд Содбилэг","Гөлөгзээвэн Солонго","Пүрэвбат Төрмөнх","Пүрэвдорж Түвшинбаяр","Лхагвасүрэн Тэлмэн","Найдансүрэн Тэнгис","Батхуяг Урангоо","Болд-Эрдэнэ Хас-Эрдэнэ","Соронзонбаатар Хоролсүрэн","Цогбаяр Хэрлэн","Баярбаатар Цэнхүсэл","Даваахүү Цэрэн-Очир","Эрдэнэбаяр Энхсаран","Дэлгэрдалай Эрхэм"],"9-г":["Лодойдамба Агар-Эрдэнэ","Мэндсайхан Амгалан","Нямдорж Ананд","Нямдорж Анар","Алтангэрэл Ариунболд","Түмэндэмбэрэл Бат-Эрдэнэ","Шижирболд Билгүүн-Очир","Алтангэрэл Буянтогтох","Отгонбаатар Ганбаяр","Алтанбагана Гоо-Үжин","Идэрбат Дөлгөөн","Баттогтох Дэлгэрмаа","Жамсран Жаргалан","Ууганбаатар Зулбадрах","Ганболд Маралмаа","Ариунзаяа Мишээл","Мөнгөншагай Мөнхсүлд","Цэвэлмаа Мөнхсэргэлэн","Отгонбаяр Намсрайдорж","Соёмбо Намуун","Энхбат Нандин-Эрдэнэ","Ариунтуяа Номинсолонго","Мөнхбаатар Олонбаяр","Мөнхбат Очир","Эрдэнэбаясгалан Өлзийбаяр","Төгсболд Солонго","Алтангэрэл Сувд-Эрдэнэ","Дөлгөөн Сэргэлэн","Орхонтуул Ургахнаран","Баянжаргал Усанболор","Бямбадорж Учралт","Бямбадорж Уянга","Нямжав Ханхүү","Ганбаяр Хулан","Одонтуяа Хүслэнбаяр","Даваасүрэн Цолмон","Хадбаатар Цолмонгэрэл","Батзориг Цэлмүүн","Баяр Цэлмэг","Баярсайхан Цэндээ","Одбаяр Чингүүн","Бямбадорж Эрдэнэлянхуа","Эрдэнэхүү Эрхэмбаяр"],"9-д":["Пүрэвгарьд Анхням","Сумьяахүү Ариунцолмон","Ариунзаяа Баттулга","Хангал Биндэряа","Ариунбат Буянмандах","Тэлмэн Бүжинлхам","Түмэн-Өлзий Гандөл","Мөнгөншагай Ганхуяг","Батхуяг Гоомарал","Батжаргал Гэгээ","Тулгабаатар Дөлгөөн","Дашнамжил Жавзмаа","Ёндондорж Лодойжамц","Цогтсайхан Мандахбаяр","Батбаяр Марал-Эрдэнэ","Эрдэнэхуяг Маргад","Гэрэл-Эрдэнэ Маргадмаа","Эрдэнэжаргал Маргад-Эрдэнэ","Төрмөнх Минжин","Батням Мишээл","Ганбат Мишээл","Энхбаатар Мөнхнягт","Отгонсүрэн Мөнхсаран","Батгэрэл Мөнхтулга","Сайнхүү Намуун","Тулгабаатар Намуун","Ариунболд Номин","Говьхангай Номин-Эрдэнэ","Одбаяр Нямбаяр","Баттөр Одбаяр","Хүрэлбаатар Очир-Эрдэнэ","Төмөрчулуун Саран-Эрдэнэ","Ганзориг Төгөлдөр","Батмөрөн Төмөржин","Баасандамба Тэргэл","Энхбилэг Тэргэл","Баярсайхан Ухаанзаяа","Ганзориг Чинбат","Мягмарцэрэн Энхжин","Төрбаяр Энхмаа","Энх-Эрдэнэ Энх-Амгалан","Эрдэнэ-Очир Эрхэс"],"9-е":["Бакатжан Айнур","Мөнхжаргал Амартайван","Оюунболд Ананд","Мөнхбаяр Ангараг","Батбаяр Батням","Баясгалан Баярт","Батдэлгэр Билгүүн","Баярсайхан Дөлгөөн","Эрхэмсайхан Марал","Эрдэнэбаяр Марал-Эрдэнэ","Эрхэмсайхан Маргад","Бат-Амгалан Мишээл","Ган-Очир Мишээл","Мөнхмаа Мишээл","Заяажаргал Мөнхжаргал","Алтансүх Мөнхжин","Мөнхболд Мөнхжин","Дорж Намуундарь","Ганзориг Номин","Сэр-Од Одбаяр","Дашням Орчлон","Гантулга Очир-Эрдэнэ","Энх-Амгалан Очир-Эрдэнэ","Лхагва Оюун-Эрдэнэ","Эрдэнэбаяр Санчир","Баттулга Сүлд-Очир","Эрдэнэ-Очир Төгөлдөр","Лхамдорж Төгсжаргал","Эрдэнэзул Тэргэл","Батхишиг Удвалцэцэг","Дугаржав Хоролсүрэн","Бат-Ундрах Хулан","Азбаяр Хүслэн","Энхбат Чингүүн","Баяржаргал Эмүжин","Баатарзоригт Энхжин","Мөнх-Эрдэнэ Энхмаа","Бат-Амгалан Энххүслэн","Эрдэнэдүүрэн Энххүслэн","Эрдэнэбаяр Эрдэнэ-Очир","Маньбадар Эрхсаран"],"8-а":["Отгонбаатар Амарбаясгалан","Амгалан Амгаланбаяр","Уртнасан Анунгоо","Уугантөр Ану-Үжин","Амарсайхан Анхгэрэл","Содбаатар Аялгуу","Мягмарсүрэн Бадамцэцэг","Батпүрэв Батбилэг","Өлзийбат Баттүшиг","Даалхай Биндэръяа","Бүүвэйбаатар Дүүриймаа","Бямбадорж Золжаргал","Эрдэнэбаатар Их-Эрдэнэ","Эрдэнэбаатар Маралгоо","Ёндон Мөнхжин","Хүдэрмөнх Мөнх-Аялгуу","Оюунболд Нандин-Од","Алтанхуяг Номиндэлгэр","Баярсайхан Нямбаяр","Ганболд Оргил","Баттулга Өсөх-Ирээдүй","Амгалан Содбилэг","Амарбаяр Төрмандах","Гантулга Тэмүүжин","Мөнхболд Тэмүүжин","Ууганбаяр Тэмүүлэн","Алтанхуяг Тэнүүн","Энхмаа Хос-Эрдэнэ","Гансүх Хулан","Болдсайхан Хүслэн","Батсайхан Цасжин","Эрдэнэтуяа Чингүүн","Анхбаяр Эгшиглэн","Бат-Эрдэнэ Энгүүн","Эрдэнэбаатар Энхжин","Очирсүрэн Энхрийлэн","Тогтоодулам Энх-Эрдэнэ","Эрдэнэболд Энх-Эрдэнэ","Эрдэнэбаяр Эрхэс","Амарбат Янжинлхам"],"8-б":["Мөнгөншагай Алтанбумба","Гомбо Анар","Анхбаяр Ану","Түмэнхас Анужин","Чинзориг Батбаясгалан","Батсайхан Баттүшиг","Галбадрах Батхишиг","Анхбаяр Будмаа","Марал-Од Гүнбилэг","Намхайнямбуу Дөлгөөн","Ганзориг Зулаа","Ононхүү Маралгоо","Лхагвасүрэн Мөнхжаргал","Батжаргал Мөнх-Ирээдүй","Батчулуун Мэндсайхан","Ариунболд Номин-Эрдэнэ","Гомбо Номунзул","Оюунбаатар Нямбаяр","Мөнгөнбагана Нямдарь","Азхүү Сарандулам","Батбаатар Содномпил","Галбадрах Сувданцэцэг","Баттөр Төгөлдөр","Эрдэнэбаяр Төрбаяр","Уламбаяр Түвшинзаяа","Ариунболд Түвшинтөр","Мөнх-Эрдэнэ Тэмүүжин","Мөнхжаргал Уламбаяр","Ганболд Ундрах-Эрдэм","Мягмарцэрэн Уянга","Энхбилэг Үжингоо","Батжаргал Хишиг-Эрдэнэ","Гантулга Хүчитбаатар","Цэдэнбатаа Цэлмүүн","Балжинням Цэлмэг","Зундуйсэнгэ Цэрэнханд","Батхуяг Цэцэнбилиг","Лхагвасүрэн Эгшиглэн","Лхагвасүрэн Энхжаргал","Энхбат Энхжин","Бөхбаатар Энхнаран","Өлзийжаргал Энхрийлэн","Мягмаржав Эрхэм"],"8-в":["Балжинням Амин-Эрдэнэ","Батбаяр Ананд","Октябрь Аниймаа","Түвшинбаяр Анужин","Батболд Ариунзаяа","Жаргалсайхан Аръяама","Отгонбаяр Бадамцэцэг","Алтанбагана Бат-Итгэл","Мөнхбаяр Буянбат","Цэнд-Аюуш Галт","Ганбаатар Ган-Эрдэнэ","Батбаяр Гэгээн","Мянганбаатар Долгор","Цогтсайхан Дөлгөөн","Түмэннаст Дэлгэрдалай","Золжаргал Зоригт","Энхтүвшин Ирмүүн","Цэнд-Очир Мандарваа","Гэрэл-Эрдэнэ Мишээл","Анхбаяр Мөнхнаран","Баярмагнай Мөнх-Учрал","Баатар Нандин-Эрдэнэ","Галхүү Номин","Мөнхөө Оджаргал","Цэцэгмаа Өсөхбаяр","Нямдорж Пүрэвдаваг","Пүрэвхүү Содбилэг","Маргад-Эрдэнэ Төгссайхан","Мөнхбат Тэнүүн","Далайцэрэн Урангоо","Гэрэлт-Од Ханхүү","Гансүх Хулан","Эрдэнэмөнх Чиндарьяа","Ганболд Энхрий-Эрдэнэ","Ганбат Энххүслэн","Энхбаатар Энх-Амгалан","Батдорж Энэрэл","Болортуяа Эрдэнэбаяр","Ванчинсүрэн Эрдэнэболор"],"8-г":["Үүрцайх Азжаргал","Солонго Ананд","Азхүү Анар","Нэмэхбаяр Анирлан","Ганхүү Ану","Батсүх Анужин","Мөнхбаяр Байгаль","Лхагва-Эрдэнэ Билгүүнтулга","Бат-Амгалан Биндэръяа","Баянмөнх Болор-Од","Одбаясах Буян-Очир","Эрдэнэбаяр Ганзориг","Ганзориг Гансүх","Цэрэнчимэд Гоомарал","Даваацэрэн Гүнчин","Орхонбаатар Гэгээлэн","Энхсайхан Есүгэн","Мягмарсүх Мандухай","Батбаатар Маргад","Баясгалан Маргад","Соронзонболд Маргад-Эрдэнэ","Төгөлдөр Минжин","Батжаргал Мишээл","Амарбаатар Мөнгөнжигүүр","Адилбиш Мөнгөнсор","Одон Мөнхжаргал","Баянмөнх Мөнх-Оргил","Эрдэнэ-Очир Номин","Эрдэнэбаяр Норов","Ням-Эрдэнэ Одхүү","Энхбат Оргил","Энхболд Оюундалай","Мөнхтөр Санчир","Ганболд Солонго","Намуунгэрэл Тэнүүн","Лхагвасүрэн Ухаанзаяа","Баяннүрзэд Хулан","Ихбаяр Энгүүн","Эрдэнэбаатар Энхболор","Батдорж Энхмаа","Батболд Энхцацрал","Мөнхсүлд Энх-Орчлон","Мөнхбаатар Энэрэл","Доржпалам Эрдэнэ"],"8-д":["Анхтуяа Амин-Эрдэнэ","Бат-Өлзий Бат-Оргил","Ганбат Билгүүнсаран","Алтансүх Биндэръяа","Бямбажав Ваанчигсүрэн","Алтангэрэл Гүнбилэг","Мөнхбат Гэрэлт-Ирээдүй","Ууганбаяр Дэлгэрмаа","Сугарсүрэн Жаргалсүрэн","Энх-Амгалан Зоригтбаатар","Батхүү Маргад-Эрдэнэ","Амартүвшин Мишээл","Ганболд Мөнхнаран","Ядамсүрэн Наранбаатар","Оюунбат Нарансолонго","Оюунбат Нямдаваа","Ганхуяг Отгоншагай","Уламбаяр Очирмаа","Угтахбаяр Өсөхбаяр","Цэнддорж Өсөхбаяр","Самданжамц Саранцогт","Эрдэнэбаяр Соёмбо-Эрдэнэ","Мөнхсүлд Тамир","Ганпүрэв Түвшинбаяр","Эрдэнэбаатар Түвшинжаргал","Эрдэнэзориг Тэмүүжин","Саруул-Эрдэнэ Тэмүүлэн","Энхтулга Тэмүүлэн","Энх-Өлзий Тэмүүлэн","Батболд Тэнгис","Аюуш Тэргэл","Доржготов Урангоо","Доржсүрэн Хишигжаргал","Баянбат Хишигзул","Анхбаяр Хулан","Буянмөнх Хүслэн","Эрдэнэмөнх Цэлмүүн","Сэр-Од Чинхүсэл","Сундуй Шинэсаран","Отгонбаяр Эрхсаран","Батцэцэг Эрхэмбаяр"],"8-е":["Доржсүрэн Алтангэрэл","Энхболд Амаржаргал","Гэрэлт-Од Амархүү","Лхагвахорол Ананд","Буянхишиг Анударь","Сүхбаатар Анунгоо","Октябрь Ану-Үжин","Энхсаруул Анхбаяр","Төмөрчөдөр Анхбилэг","Болд-Эрдэнэ Ариунболд","Чойжамц Баасанжаргал","Хишигбат Батбаяр","Алтансүх Батболд","Ганхолбоо Бату","Сүхбаатар Бат-Очир","Анхбаяр Билгүүн","Соёл-Эрдэнэ Билэгт","Батням Бямбасүрэн","Баянбилэг Золзаяа","Цогоо Лхагвадорж","Амарсанаа Мишээл","Нямдорж Мишээл","Бат-Өлзий Мөнхнаран","Мөнхбат Намуун","Тулга Намуундарь","Эрдэнэдалай Номин","Батдэлгэр Сарангоо","Энхбаатар Сүлд-Эрдэнэ","Амартүвшин Сэргэлэнбилиг","Цогбадрах Төгс-Эрдэнэ","Саруул Тэмүгэ","Буян-Аривжих Тэмүүжин","Чинзориг Ухаанзаяа","Тулга Хангарьд","Отгонсүрэн Хүслэн","Цоггэрэл Цэлмүүн","Баттөр Цэлмэг","Бадрахбаяр Чингүүн","Энхбат Энхжин","Батболд Энхсаран","Дагвасүрэн Эрдэнэбаяр"],"8-ё":["Батхуяг Амархүү","Баасанхүү Ананд","Хишигдорж Ананд","Солонго Анар","Эрдэнэсүх Анужин","Цогбаяр Анхилуун","Мижиддорж Ариунзаяа","Цолмонбаатар Ариунхолбоо","Лхагвасүрэн Бадрах","Шижирбат Баттөгөлдөр","Пүрэвлхам Бат-Эрдэнэ","Батбаяр Билгүүн","Баяраа Гоомарал","Отгонбат Гуамарал","Ганбаатар Дэлгэрцэцэг","Энх-Амгалан Маргад","Амгалан Мөнхзаяа","Отгонбаатар Мөнхзаяа","Мөнхзул Очирзаяа","Алтансүх Оюунномин","Гомбодорж Өсөхбаяр","Эрдэнэбат Сувдмаа","Баярлхагва Сүлдбаяр","Сайнбилэг Төгөлдөр","Шаравсамбуу Төрбат","Пүрэвдорж Төртогтох","Гантулга Түвшинбаяр","Буджав Тэмүүжин","Бямбадорж Тэмүүлэн","Ганзориг Тэмүүлэн","Даваахүү Тэнгис","Ганболд Уранзаяа","Зоригтбаатар Уянга","Мөнх-Отгон Үүрийнзаяа","Энхтөр Цэрэнбанзад","Ганцэцэг Чингүн","Батцэнгэл Элбэгзаяа","Амар-Эрдэнэ Энхжин","Золзаяа Энхсаруул","Саруулгэрэл Энхтүшиг","Эрдэнэчулуун Энэрэлт","Эрдэнэтуяа Эрдэнэмөнх"],"8-ж":["Сайнбилэг Анхтуяа","Амартүвшин Анх-Эрдэнэ","Өлзийсайхан Ашид-Амгалан","Даваадорж Батнасан","Батдаваа Билгүүнмягмар","Бүрэнтогос Борцэцэн","Ган-Эрдэнэ Буян-Эрдэнэ","Буянбат Бямба-Очир","Бямбагэрэл Дөлгөөнтамир","Эрдэнэбилэг Золбоо","Отгонбор Инжгоо","Бямбасүрэн Мандал","Бүрэнчулуун Маралгоо","Дарханбаяр Маралжингоо","Давгасүрэн Мөнхбат","Мөнхтэнгэр Мөнхжин","Баянмөнх Мөнхтэнгэр","Төртогтох Мөнххүслэн","Тэлмэн Намуун","Одхүү Нарансолонго","Лхагважаргал Номин","Дамбасүрэн Номин-Эрдэнэ","Сугар Нямхүү","Лхагва Оюунбат","Гантулга Сумъяабазар","Батсайхан Тайванаа","Андрей Тимүр","Энхбаатар Тодбаяр","Отгонхишиг Түвшиншагай","Эрхэмбаяр Улсболд","Золзаяа Учрал","Шүрэн Хангай","Отгон-Эрдэнэ Хулан","Эрдэнэсайхан Хүсэл-Эрдэнэ","Энхбаяр Цэлмэг","Батмөнх Энгүүн","Пүрэвбаасан Энхбаясгалан","Чинзориг Энхриймаа","Отгонбаяр Энххүслэн","Батболд Энх-Учрал","Батболд Эрмүүн","Жангараа Эрхэмбаяр"],"7-а":["Гантөр Аззаяа","Өлзийжаргал Ану-Эрдэнэ","Шижирболд Ариунгоо","Эрдэнэцэцэг Ариунтунгалаг","Жавхлантөгс Билгүүнтөгс","Сайнбилэг Бишрэлт","Ганзориг Болор-Эрдэнэ","Содгэрэл Буянхишиг","Эрдэнэбаяр Буянхишиг","Ганзориг Гансүлд","Ганбат Ганцэцэг","Эрдэнэ-Очир Ганцэцэг","Батбаатар Далайбаяр","Болдзориг Ирмүүн","Буянхишиг Мишээл","Цогтбаатар Мишээл","Бат-Итгэлт Мөнхцэлмэг","Эрдэнэбулган Мягмаржаргал","Энхжин Намуулин","Бадарч Номин","Эрдэнэхүү Одбаяр","Батбаяр Очирбат","Даваадорж Оюунбилэг","Эрдэнэбаяр Оюунтунгалаг","Мөнх-Эрдэнэ Өнөмөнх","Батаа Санчиртайван","Ууганбаяр Солонго","Цэндсүрэн Сүхбат","Бат-Эрдэнэ Түмэнжаргал","Мөнхжаргал Тэгшбаяр","Анхбаяр Тэмүүжин","Гантулга Тэмүүлэн","Адъяа Цогбадрах","Сүхчулуун Цэлмэгариун","Түмэнжаргал Цэрэнбадам","Гантөр Энхзаяа","Мөнхөө Энхмаа","Алтантөгс Энэрэл","Баттулга Эрдэнэбаяр","Энхтулга Эрдэнэбүрэн","Амгаланбаатар Эрдэнэсайхан","Энхбат Эрхсаран","Батхишиг Эрхэмбаяр"],"7-б":["Алтангэрэл Анударь","Билгүүн Анхбаяр","Алтан-Эрдэнэ Анх-Эрдэнэ","Баярсайхан Ариунзаяа","Гантөмөр Батчимэг","Бат-Өлзий Баяржавхлан","Эрдэнэбат Билгүүнсар","Гэрэлчулуун Болорзаяа","Оюунбаяр Булгантамир","Цэрэнбат Бүжинлхам","Энхбаатар Ганзүрх","Баяржаргал Гүнжлхам","Батдэлгэр Дөлгөөн","Мөнгөншагай Дэлгэрэхертөнц","Мөнхтуяа Ирмүүн","Мөнгөншагай Минжинсор","Чинбат Мичидмаа","Батсайхан Мишээл","Барсболд Мөнхдөлгөөн","Бат-Эрдэнэ Мөнхжаргал","Жаргалсайхан Мөнх-Ундрал","Баярсайхан Нандин-Эрдэнэ","Отгонбанди Нандин-Эрдэнэ","Мөнх-Эрдэнэ Очир-Эрдэнэ","Батсуурь Пүрэвбат","Батбаатар Пүрэвжаргал","Анхзаяа Содбилэгт","Хүрэлсүх Сумъяадорж","Дүүрэнбаяр Сүндэрмаа","Мэндбаяр Тогтохтөр","Алтанхуяг Халиунаа","Наранбат Халиунаа","Баярсайхан Хангай","Батбаяр Хулан","Алтанбагана Хүслэн","Гантөмөр Цогоюун","Энхбат Цогтөгөлдөр","Дашдэнзэн Цэлмэг","Буянхишиг Шинэцэцэг","Одбилэг Энгүүн","Энхболд Энххүслэн","Мөнх-Амьдрал Энх-Ивээл","Батмөнх Энэрлэн","Энхсайхан Эрдэнэс"],"7-в":["Бизьяа Ананд","Дармаа Анударь","Одбаяр Анударь","Батхуяг Анунгоо","Баасанбямба Анхбаяр","Эрдэнэбаяр Батгарьд","Батсайхан Болорчимэг","Ариунбаатар Дүүрэнбаяр","Нямдаваа Ихбаяр","Одгийв Мандах-Эрдэнэ","Азбаяр Марал","Цэрэнчимэд Мичидмарал","Цэнгэл Мөнгөнсоёмбо","Түмэннаст Мягмарсүрэн","Чинзориг Номин","Батзаяа Номинзул","Мөнхбат Номин-Эрдэнэ","Алтантогтох Одбаяр","Гэрэлт-Од Одбаяр","Пүрэвдорж Отгонмөнх","Алтанбагана Отгонтуяа","Батцэрэн Очир-Эрдэнэ","Эрдэнэсувд Өнөрбаяр","Цэндхүү Сайнзаяа","Эрдэнэбаатар Сийлэн","Энхтүвшин Сувдан-Эрдэнэ","Даваахүү Сэргэлэн","Пүрэвбат Төрмандах","Жүгдэррэнцэн Түвшинбаяр","Баттогтох Тэгшбаяр","Анхбаяр Тэмүжин","Саранбаатар Тэмүүжин","Лхагвацэрэн Тэмүүлэн","Дашжамц Уянга","Батбаатар Үжин","Энхболд Үүрийнтуяа","Батболд Үүрцайх","Гал-Эрдэнэ Халиун","Мөнхбат Хүслэн-Эрдэнэ","Энхдалай Энхболор","Мөнхсайхан Энхжин","Ариунжаргал Энх-Орчлон","Од-Эрдэнэ Энх-Учрал","Доржпүрэв Эрдэнэжаргал"],"7-г":["Ууганбаяр Азжаргал","Гантогтох Амирлан","Батдархан Ананд","Жанчивсэмбэ Анархүү","Мягмаржав Ану-Үжин","Эрдэнэбат Ариунгоо","Ууганбаяр Ариунжаргал","Цэрэнпунцаг Аюми","Энхтөр Бат-Энх","Ганбаатар Билгүүн","Мянганбаяр Билгүүн","Хүдэрбаатар Билэгжаргал","Батбаяр Билэгт","Гончигсүрэн Бямбадорж","Чинболд Гантулга","Ганбаатар Гэгээлэн","Мөнхбат Даваажаргал","Мягмардалай Есүйжин","Эрдэнэбаяр Итгэл","Мөнхбаатар Лхамноржин","Очирбат Марал","Бат-Эрдэнэ Мишээл","Бямбасүх Мишээл","Алтанхундага Мөнгөнхундага","Сайнхүү Мягмарсүрэн","Нармандах Очирмаа","Батсүх Өсөхбаяр","Отгонбаяр Өсөхбаяр","Нэргүйбаатар Сэрсэндэмид","Чинзориг Төгөлдөр","Түмэн-Өлзий Төгсбилэг","Энхбаатар Түмэнбаясах","Ган-Эрдэнэ Түмэн-Өлзий","Эрдэнэболд Ханбазар","Дарамсүрэн Хос-Эрдэнэ","Майцэцэг Хувьтөгөлдөр","Даш-Амар Хулан","Ариунболд Хулангоо","Мөнгөн Цэлмүүн","Ган-Од Эгшиглэн","Сайнхүү Энхгэрэл","Сайнбилэг Энх-Амар"],"7-д":["Батбаатар Амгаланбаатар","Идэрсайхан Анирлан","Төмөрчөдөр Ариунгоо","Сэр-Од Балжинням","Мөнх-Оргил Балжмаа","Даваа-Очир Батбаясгалан","Бадарч Баттогтох","Мөнх-Очир Билэгт","Баатархүү Гантулга","Өгөөмөр Гэрэлтмичид","Эрхэмбаяр Должинсүрэн","Төгсбаяр Есөнтөгөлдөр","Эрдэнэбат Марал-Эрдэнэ","Ганжууржав Мишээл","Мөнхдаваа Мишээл","Отгонсүрэн Мишээл","Хөхөөсүрэн Мишээл","Шүхэрт Мөнхдолгион","Тэмүүлэн Мөнхжин","Отгонтуяа Мөнхмандах","Болдбаатар Мөнххүслэн","Баяржаргал Мөнх-Амьдрал","Амармэнд Мэргэнбаатар","Ганболд Оргих-Эрдэм","Хишигсүрэн Оюунхорол","Хүрэлбаатар Санчирдорж","Ганзориг Сод-Эрдэнэ","Чинбат Сүлд-Эрдэнэ","Билгүүн Төгөлдөр","Пүрэвсүрэн Тулга-Очир","Мягмарсэд Түвшинбаяр","Мөнхбат Тэмүүжин","Аюуш Тэмүүлэн","Мөнхбаяр Тэнүүн","Наранбаатар Улсболд","Нямхүү Цэлмэг","Мөнх-Эрдэнэ Цэцэйхэн","Мягмарцэрэн Чинбилэг","Энх-Амгалан Чинсувд","Цогтбаатар Эмүжин","Цогтбаатар Энхжин","Энхбаатар Энх-Анир"],"7-е":["Төр-Эрдэнэ Азжаргал","Зууннаст Алтжин","Дугаржав Амина","Одбаяр Амудари","Дагвасамбуу Ананд","Гансүх Анхилуун","Эрдэнэбулган Ариунхүслэн","Бүжидмаа Базархүү","Даарий Батсуурь","Гунгаа Бат-Эрдэнэ","Хуанган Бейбарыс","Батхуяг Билгүүнтөгс","Лэгвэрээ Буян-Эрдэнэ","Саруул Бүрэнсан","Болдбаатар Ганзориг","Батжаргал Гүнжлхам","Тогтохбаатар Дөлгөөн","Дэлгэрсайхан Дэлгэрмөрөн","Батбаяр Маралгоо","Бат-Эрдэнэ Монголжин","Галбадрах Мөнхбадрах","Очирцэрэн Мөнхбат","Даваадорж Мөнхзаяа","Мөнхбаатар Мөнх-Ундарга","Энх-Амгалан Мөнх-Ундрал","Гүррагчаа Номин","Баасанхүү Номин-Эрдэнэ","Дорждагва Оргилболд","Батсүх Өлзийхутаг","Батцэнгэл Санчирмаа","Тэгшбаяр Төгсбаяр","Даваацэрэн Төгс-Эрдэнэ","Ганбанди Тэмүүлэн","Норолхоо Тэмүүлэн","Баярмөнх Урангоо","Ганзориг Хатанзориг","Батсүх Хүслэн-Эрдэнэ","Билгүүн Эгшиглэн","Адъяасүрэн Элбэгзаяа","Лхагвадорж Элбэгсайхан","Лхагва Энхдэлгэр","Гантогтох Энэрэл","Пүрэвсүрэн Эрхэс","Баасандорж Эрхэттөр"],"7-ё":["Сундуйжамц Алтантуяа","Буяннэмэх Амармэнд","Ням-Очир Аминхүсэл","Ёндонжамц Амин-Эрдэнэ","Равжиртогтох Анар","Алтаншагай Анхбаяр","Ууган-Эрдэнэ Ариунболд","Нармандах Аялгуунаа","Цэенцогзол Бадамлянхуа","Төгөлдөр Батнаран","Батжаргал Баянмөнх","Мягмар Баянсайхан","Сарангэрэл Билгүүнгэрэл","Баяраа Билгүүнундрага","Дэлгэрсайхан Болоршагай","Баттулга Буяндэлгэр","Эрдэнээ Ганжаргал","Дэлгэрдалай Гантөгс","Банзрагч Гоомарал","Мөнгөншагай Дөлгөөн","Эрдэнэбулган Дэлгэрмаа","Ганбаатар Есүй","Гантулга Маргад","Гантөмөр Мишээл","Эрдэнэбаяр Монголжингоо","Чулуунсүрэн Нарангэрэл","Баяржаргал Сайнбаяр","Одгэрэл Содбаяр","Сүхбаатар Сумъяа","Дамба Сэнгүн","Болор-Эрдэнэ Тэнгис","Баттулга Урангоо","Алтангэрэл Хулан","Соронзон-Од Цолмон","Гантулга Цэнгэлзаяа","Галпүрэв Цэрэнханд","Ням-Очир Энхтайван","Гантулга Энхтуул","Загдсүрэн Эрхмаа","Мөнх-Ирээдүй Эрхэс"]};
const BUNDLED_CLASS_SHIFTS = {"12-а":"1-р ээлж","12-б":"1-р ээлж","12-в":"1-р ээлж","12-г":"1-р ээлж","12-д":"1-р ээлж","12-е":"1-р ээлж","11-а":"1-р ээлж","11-б":"1-р ээлж","11-в":"1-р ээлж","11-г":"1-р ээлж","11-д":"1-р ээлж","10-а":"1-р ээлж","10-б":"1-р ээлж","10-в":"1-р ээлж","10-г":"1-р ээлж","10-д":"1-р ээлж","10-е":"1-р ээлж","9-а":"1-р ээлж","9-б":"1-р ээлж","9-в":"2-р ээлж","9-г":"2-р ээлж","9-д":"2-р ээлж","9-е":"2-р ээлж","8-а":"2-р ээлж","8-б":"2-р ээлж","8-в":"2-р ээлж","8-г":"2-р ээлж","8-д":"2-р ээлж","8-е":"2-р ээлж","8-ё":"2-р ээлж","8-ж":"2-р ээлж","7-а":"2-р ээлж","7-б":"2-р ээлж","7-в":"2-р ээлж","7-г":"2-р ээлж","7-д":"2-р ээлж","7-е":"2-р ээлж","7-ё":"2-р ээлж"};
