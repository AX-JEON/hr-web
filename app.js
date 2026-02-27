const STORAGE_KEY = "hr_employees";

function loadEmployees() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse employees from storage", e);
    return [];
  }
}

function saveEmployees(list) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function findEmployeeById(id) {
  const employees = loadEmployees();
  return employees.find((emp) => emp.id === id) || null;
}

function showMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error", "success");
  if (type) {
    element.classList.add(type);
  }
}

async function loginWithSupabase(id, password) {
  if (!window.supabaseClient) {
    return { ok: false, reason: "no_client" };
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("employees")
      .select("employee_id, name, password")
      .eq("employee_id", id)
      .maybeSingle();

    if (error) {
      console.error("[Supabase] 로그인 조회 오류", error);
      return { ok: false, reason: "error" };
    }

    if (!data) {
      return { ok: false, reason: "not_found" };
    }

    if (data.password !== password) {
      return { ok: false, reason: "wrong_password", name: data.name };
    }

    return {
      ok: true,
      name: data.name,
      employeeId: data.employee_id,
    };
  } catch (e) {
    console.error("[Supabase] 로그인 예외", e);
    return { ok: false, reason: "error" };
  }
}

function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const idInput = document.getElementById("login-id");
  const pwInput = document.getElementById("login-password");
  const messageBox = document.getElementById("login-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = idInput.value.trim();
    const password = pwInput.value;

    if (!id || !password) {
      showMessage(messageBox, "ID와 비밀번호를 모두 입력해주세요.", "error");
      return;
    }

    const result = await loginWithSupabase(id, password);

    if (!result.ok) {
      if (result.reason === "not_found") {
        showMessage(messageBox, "해당 ID의 사원이 존재하지 않습니다.", "error");
        return;
      }
      if (result.reason === "wrong_password") {
        showMessage(messageBox, "비밀번호가 일치하지 않습니다.", "error");
        return;
      }

      const employee = findEmployeeById(id);
      if (!employee) {
        showMessage(messageBox, "해당 ID의 사원이 존재하지 않습니다.", "error");
        return;
      }
      if (employee.password !== password) {
        showMessage(messageBox, "비밀번호가 일치하지 않습니다.", "error");
        return;
      }

      showMessage(
        messageBox,
        `${employee.name || employee.id} 님 환영합니다! (로컬 데이터 기준)`,
        "success"
      );
      return;
    }

    try {
      window.sessionStorage.setItem(
        "hr_current_employee",
        JSON.stringify({
          id: result.employeeId,
          name: result.name || result.employeeId,
          loginAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn("세션 저장 실패", e);
    }

    window.location.href = "dashboard.html";
  });
}

function initRegisterForm() {
  const form = document.getElementById("register-form");
  if (!form) return;

  const idInput = document.getElementById("reg-id");
  const nameInput = document.getElementById("reg-name");
  const birthInput = document.getElementById("reg-birth");
  const genderSelect = document.getElementById("reg-gender");
  const addressInput = document.getElementById("reg-address");
  const phoneInput = document.getElementById("reg-phone");
  const emailInput = document.getElementById("reg-email");
  const deptSelect = document.getElementById("reg-dept");
  const jobTitleInput = document.getElementById("reg-job-title");
  const startDateInput = document.getElementById("reg-start-date");
  const pwInput = document.getElementById("reg-password");
  const pwConfirmInput = document.getElementById("reg-password-confirm");
  const typeHiddenInput = document.getElementById("reg-type");
  const typeButtons = document.querySelectorAll(".type-toggle-btn");
  const messageBox = document.getElementById("register-message");

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedType = btn.getAttribute("data-type");
      typeHiddenInput.value = selectedType;

      typeButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = idInput.value.trim();
    const name = nameInput.value.trim();
    const birthDate = birthInput.value;
    const gender = genderSelect.value || null;
    const address = addressInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const dept = deptSelect.value;
    const jobTitle = jobTitleInput.value.trim();
    const startDate = startDateInput.value;
    const employmentType = typeHiddenInput.value || "regular";
    const password = pwInput.value;
    const pwConfirm = pwConfirmInput.value;

    if (
      !id ||
      !name ||
      !birthDate ||
      !address ||
      !phone ||
      !email ||
      !dept ||
      !jobTitle ||
      !startDate ||
      !password ||
      !pwConfirm
    ) {
      showMessage(messageBox, "필수 항목을 모두 입력해주세요.", "error");
      return;
    }

    if (password !== pwConfirm) {
      showMessage(messageBox, "비밀번호와 비밀번호 확인이 일치하지 않습니다.", "error");
      return;
    }

    if (window.supabaseClient) {
      try {
        const { data: existsRow, error: existsError } = await window.supabaseClient
          .from("employees")
          .select("employee_id")
          .eq("employee_id", id)
          .maybeSingle();

        if (existsError) {
          console.error("[Supabase] ID 중복 조회 오류", existsError);
          showMessage(
            messageBox,
            "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error"
          );
          return;
        }

        if (existsRow) {
          showMessage(messageBox, "이미 사용 중인 사원 ID입니다.", "error");
          return;
        }

        const payload = {
          employee_id: id,
          name,
          employment_type: employmentType,
          birth_date: birthDate,
          gender,
          address,
          phone,
          email,
          department: dept || null,
          job_title: jobTitle,
          start_date: startDate,
          password,
        };

        const { error: insertError } = await window.supabaseClient
          .from("employees")
          .insert([payload]);

        if (insertError) {
          console.error("[Supabase] 사원 등록 오류", insertError);
          showMessage(
            messageBox,
            "사원 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error"
          );
          return;
        }

        showMessage(
          messageBox,
          "사원 등록이 완료되었습니다. 이제 로그인할 수 있습니다.",
          "success"
        );
      } catch (e) {
        console.error("[Supabase] 사원 등록 예외", e);
        showMessage(
          messageBox,
          "사원 등록 중 알 수 없는 오류가 발생했습니다.",
          "error"
        );
        return;
      }
    } else {
      const employees = loadEmployees();
      const exists = employees.some((emp) => emp.id === id);
      if (exists) {
        showMessage(messageBox, "이미 사용 중인 사원 ID입니다.", "error");
        return;
      }

      const newEmployee = {
        id,
        name,
        employmentType,
        birthDate,
        gender,
        address,
        phone,
        email,
        department: dept || null,
        jobTitle,
        startDate,
        password,
        createdAt: new Date().toISOString(),
      };

      employees.push(newEmployee);
      saveEmployees(employees);

      showMessage(
        messageBox,
        "사원 등록이 완료되었습니다. (로컬 데이터 기준)",
        "success"
      );
    }

    form.reset();
    deptSelect.value = "";
    typeHiddenInput.value = "regular";
    typeButtons.forEach((b) => {
      const isRegular = b.getAttribute("data-type") === "regular";
      b.classList.toggle("active", isRegular);
      b.setAttribute("aria-pressed", String(isRegular));
    });
  });
}

async function initDashboardPage() {
  const listEl = document.getElementById("employee-list");
  const userEl = document.getElementById("dashboard-user");
  const countEl = document.getElementById("employee-count");
  const messageEl = document.getElementById("dashboard-message");
  const logoutBtn = document.getElementById("logout-btn");

  if (!listEl || !countEl) return;

  try {
    const raw = window.sessionStorage.getItem("hr_current_employee");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.name && userEl) {
        userEl.textContent = `${parsed.name} 님 로그인 중`;
      }
    } else if (userEl) {
      userEl.textContent = "로그인 정보 없음";
    }
  } catch (e) {
    console.warn("세션 정보 파싱 실패", e);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      try {
        window.sessionStorage.removeItem("hr_current_employee");
      } catch (_) {}
      window.location.href = "index.html";
    });
  }

  if (!window.supabaseClient) {
    showMessage(messageEl, "서버 연결 정보를 찾을 수 없습니다.", "error");
    return;
  }

  showMessage(messageEl, "사원 목록을 불러오는 중입니다...", null);

  try {
    const { data, error } = await window.supabaseClient
      .from("employees")
      .select(
        "employee_id, name, department, job_title, employment_type, start_date, phone, email"
      )
      .order("inserted_at", { ascending: false });

    if (error) {
      console.error("[Supabase] 사원 목록 조회 오류", error);
      showMessage(
        messageEl,
        "사원 목록을 불러오는 중 오류가 발생했습니다.",
        "error"
      );
      return;
    }

    listEl.innerHTML = "";

    if (!data || data.length === 0) {
      countEl.textContent = "사원 0명";
      const empty = document.createElement("div");
      empty.className = "employee-sub";
      empty.textContent = "등록된 사원이 없습니다.";
      listEl.appendChild(empty);
      showMessage(messageEl, "", null);
      return;
    }

    countEl.textContent = `사원 ${data.length}명`;

    data.forEach((emp) => {
      const row = document.createElement("div");
      row.className = "employee-row";

      const main = document.createElement("div");
      main.className = "employee-row-main";

      const left = document.createElement("div");

      const nameEl = document.createElement("div");
      nameEl.className = "employee-name";
      nameEl.textContent = emp.name || emp.employee_id;

      const meta = document.createElement("div");
      meta.className = "employee-meta";
      const dept = emp.department || "부서 미지정";
      const job = emp.job_title || "직무 미지정";
      const type = emp.employment_type || "구분 미지정";
      meta.textContent = `${dept} · ${job} · ${type}`;

      left.appendChild(nameEl);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "employee-meta";
      const start = emp.start_date
        ? new Date(emp.start_date).toLocaleDateString("ko-KR")
        : "-";
      right.textContent = `입사(예정): ${start}`;

      main.appendChild(left);
      main.appendChild(right);

      const sub = document.createElement("div");
      sub.className = "employee-sub";
      const phoneText = emp.phone || "-";
      const emailText = emp.email || "-";
      sub.textContent = `연락처: ${phoneText} · 이메일: ${emailText}`;

      row.appendChild(main);
      row.appendChild(sub);

      listEl.appendChild(row);
    });

    showMessage(messageEl, "", null);
  } catch (e) {
    console.error("[Supabase] 사원 목록 조회 예외", e);
    showMessage(
      messageEl,
      "사원 목록을 불러오는 중 알 수 없는 오류가 발생했습니다.",
      "error"
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initRegisterForm();
  initDashboardPage();
});

const STORAGE_KEY = "hr_employees";

function loadEmployees() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse employees from storage", e);
    return [];
  }
}

function saveEmployees(list) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function findEmployeeById(id) {
  const employees = loadEmployees();
  return employees.find((emp) => emp.id === id) || null;
}

function showMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error", "success");
  if (type) {
    element.classList.add(type);
  }
}

async function loginWithSupabase(id, password) {
  if (!window.supabaseClient) {
    return { ok: false, reason: "no_client" };
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("employees")
      .select(
        "employee_id, name, password"
      )
      .eq("employee_id", id)
      .maybeSingle();

    if (error) {
      console.error("[Supabase] 로그인 조회 오류", error);
      return { ok: false, reason: "error" };
    }

    if (!data) {
      return { ok: false, reason: "not_found" };
    }

    if (data.password !== password) {
      return { ok: false, reason: "wrong_password", name: data.name };
    }

    return {
      ok: true,
      name: data.name,
      employeeId: data.employee_id,
    };
  } catch (e) {
    console.error("[Supabase] 로그인 예외", e);
    return { ok: false, reason: "error" };
  }
}

function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const idInput = document.getElementById("login-id");
  const pwInput = document.getElementById("login-password");
  const messageBox = document.getElementById("login-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = idInput.value.trim();
    const password = pwInput.value;

    if (!id || !password) {
      showMessage(messageBox, "ID와 비밀번호를 모두 입력해주세요.", "error");
      return;
    }

    // 1차: Supabase 로그인 시도
    const result = await loginWithSupabase(id, password);

    if (!result.ok) {
      if (result.reason === "not_found") {
        showMessage(messageBox, "해당 ID의 사원이 존재하지 않습니다.", "error");
        return;
      }
      if (result.reason === "wrong_password") {
        showMessage(messageBox, "비밀번호가 일치하지 않습니다.", "error");
        return;
      }

      // Supabase 사용 불가 시 LocalStorage로 폴백
      const employee = findEmployeeById(id);
      if (!employee) {
        showMessage(messageBox, "해당 ID의 사원이 존재하지 않습니다.", "error");
        return;
      }
      if (employee.password !== password) {
        showMessage(messageBox, "비밀번호가 일치하지 않습니다.", "error");
        return;
      }

      showMessage(
        messageBox,
        `${employee.name || employee.id} 님 환영합니다! (로컬 데이터 기준)`,
        "success"
      );
      return;
    }

    // 세션 저장 (간단히 sessionStorage 사용)
    try {
      window.sessionStorage.setItem(
        "hr_current_employee",
        JSON.stringify({
          id: result.employeeId,
          name: result.name || result.employeeId,
          loginAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn("세션 저장 실패", e);
    }

    window.location.href = "dashboard.html";
  });
}

function initRegisterForm() {
  const form = document.getElementById("register-form");
  if (!form) return;

  const idInput = document.getElementById("reg-id");
  const nameInput = document.getElementById("reg-name");
  const birthInput = document.getElementById("reg-birth");
  const genderSelect = document.getElementById("reg-gender");
  const addressInput = document.getElementById("reg-address");
  const phoneInput = document.getElementById("reg-phone");
  const emailInput = document.getElementById("reg-email");
  const deptSelect = document.getElementById("reg-dept");
  const positionInput = document.getElementById("reg-position");
  const jobTitleInput = document.getElementById("reg-job-title");
  const startDateInput = document.getElementById("reg-start-date");
  const eduLevelSelect = document.getElementById("reg-edu-level");
  const careerYearsInput = document.getElementById("reg-career-years");
  const careerSummaryTextarea = document.getElementById("reg-career-summary");
  const certTextarea = document.getElementById("reg-cert");
  const emergencyContactInput = document.getElementById("reg-emergency-contact");
  const noteTextarea = document.getElementById("reg-note");
  const pwInput = document.getElementById("reg-password");
  const pwConfirmInput = document.getElementById("reg-password-confirm");
  const typeHiddenInput = document.getElementById("reg-type");
  const typeButtons = document.querySelectorAll(".type-toggle-btn");
  const messageBox = document.getElementById("register-message");

  // 정직원 / 프리랜서 토글 클릭 이벤트
  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedType = btn.getAttribute("data-type");
      typeHiddenInput.value = selectedType;

      typeButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = idInput.value.trim();
    const name = nameInput.value.trim();
    const birthDate = birthInput.value;
    const gender = genderSelect.value || null;
    const address = addressInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const dept = deptSelect.value;
    const position = positionInput.value.trim();
    const jobTitle = jobTitleInput.value.trim();
    const startDate = startDateInput.value;
    const eduLevel = eduLevelSelect.value;
    const careerYearsRaw = careerYearsInput.value;
    const careerYears =
      careerYearsRaw && !Number.isNaN(Number(careerYearsRaw))
        ? Number(careerYearsRaw)
        : null;
    const careerSummary = careerSummaryTextarea.value.trim();
    const certificates = certTextarea.value.trim();
    const emergencyContact = emergencyContactInput.value.trim();
    const note = noteTextarea.value.trim();
    const employmentType = typeHiddenInput.value || "regular";
    const password = pwInput.value;
    const pwConfirm = pwConfirmInput.value;

    if (
      !id ||
      !name ||
      !birthDate ||
      !address ||
      !phone ||
      !email ||
      !dept ||
      !startDate ||
      !eduLevel ||
      !password ||
      !pwConfirm
    ) {
      showMessage(messageBox, "필수 항목을 모두 입력해주세요.", "error");
      return;
    }

    if (password !== pwConfirm) {
      showMessage(messageBox, "비밀번호와 비밀번호 확인이 일치하지 않습니다.", "error");
      return;
    }

    // Supabase 클라이언트가 있는 경우, Supabase에 등록
    if (window.supabaseClient) {
      try {
        // ID 중복 체크
        const { data: existsRow, error: existsError } = await window.supabaseClient
          .from("employees")
          .select("employee_id")
          .eq("employee_id", id)
          .maybeSingle();

        if (existsError) {
          console.error("[Supabase] ID 중복 조회 오류", existsError);
          showMessage(
            messageBox,
            "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error"
          );
          return;
        }

        if (existsRow) {
          showMessage(messageBox, "이미 사용 중인 사원 ID입니다.", "error");
          return;
        }

        const payload = {
          employee_id: id,
          name,
          employment_type: employmentType,
          birth_date: birthDate,
          gender,
          address,
          phone,
          email,
          department: dept || null,
          position: position || null,
          job_title: jobTitle,
          start_date: startDate,
          edu_level: eduLevel,
          career_years: careerYears,
          career_summary: careerSummary,
          certificates,
          emergency_contact: emergencyContact,
          note,
          password,
        };

        const { error: insertError } = await window.supabaseClient
          .from("employees")
          .insert([payload]);

        if (insertError) {
          console.error("[Supabase] 사원 등록 오류", insertError);
          showMessage(
            messageBox,
            "사원 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error"
          );
          return;
        }

        showMessage(
          messageBox,
          "사원 등록이 완료되었습니다. 이제 로그인할 수 있습니다.",
          "success"
        );
      } catch (e) {
        console.error("[Supabase] 사원 등록 예외", e);
        showMessage(
          messageBox,
          "사원 등록 중 알 수 없는 오류가 발생했습니다.",
          "error"
        );
        return;
      }
    } else {
      // Supabase 사용 불가 시 LocalStorage에 저장 (개발/오프라인용)
      const employees = loadEmployees();
      const exists = employees.some((emp) => emp.id === id);
      if (exists) {
        showMessage(messageBox, "이미 사용 중인 사원 ID입니다.", "error");
        return;
      }

      const newEmployee = {
        id,
        name,
        employmentType,
        birthDate,
        gender,
        address,
        phone,
        email,
        department: dept || null,
        position: position || null,
        jobTitle,
        startDate,
        eduLevel,
        careerYears,
        careerSummary,
        certificates,
        emergencyContact,
        note,
        password,
        createdAt: new Date().toISOString(),
      };

      employees.push(newEmployee);
      saveEmployees(employees);

      showMessage(
        messageBox,
        "사원 등록이 완료되었습니다. (로컬 데이터 기준)",
        "success"
      );
    }

    form.reset();
    deptSelect.value = "";
    typeHiddenInput.value = "regular";
    typeButtons.forEach((b) => {
      const isRegular = b.getAttribute("data-type") === "regular";
      b.classList.toggle("active", isRegular);
      b.setAttribute("aria-pressed", String(isRegular));
    });

    // 로그인 화면으로 바로 이동하고 싶다면 아래 주석을 해제하세요.
    // window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initRegisterForm();
  initDashboardPage();
});

async function initDashboardPage() {
  const listEl = document.getElementById("employee-list");
  const userEl = document.getElementById("dashboard-user");
  const countEl = document.getElementById("employee-count");
  const messageEl = document.getElementById("dashboard-message");
  const logoutBtn = document.getElementById("logout-btn");

  // 대시보드 페이지가 아닐 때는 아무 것도 하지 않음
  if (!listEl || !countEl) return;

  // 로그인 사용자 정보 표시
  try {
    const raw = window.sessionStorage.getItem("hr_current_employee");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.name && userEl) {
        userEl.textContent = `${parsed.name} 님 로그인 중`;
      }
    } else if (userEl) {
      userEl.textContent = "로그인 정보 없음";
    }
  } catch (e) {
    console.warn("세션 정보 파싱 실패", e);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      try {
        window.sessionStorage.removeItem("hr_current_employee");
      } catch (_) {}
      window.location.href = "index.html";
    });
  }

  if (!window.supabaseClient) {
    showMessage(messageEl, "서버 연결 정보를 찾을 수 없습니다.", "error");
    return;
  }

  showMessage(messageEl, "사원 목록을 불러오는 중입니다...", null);

  try {
    const { data, error } = await window.supabaseClient
      .from("employees")
      .select(
        "employee_id, name, department, job_title, employment_type, start_date, phone, email"
      )
      .order("inserted_at", { ascending: false });

    if (error) {
      console.error("[Supabase] 사원 목록 조회 오류", error);
      showMessage(
        messageEl,
        "사원 목록을 불러오는 중 오류가 발생했습니다.",
        "error"
      );
      return;
    }

    listEl.innerHTML = "";

    if (!data || data.length === 0) {
      countEl.textContent = "사원 0명";
      const empty = document.createElement("div");
      empty.className = "employee-sub";
      empty.textContent = "등록된 사원이 없습니다.";
      listEl.appendChild(empty);
      showMessage(messageEl, "", null);
      return;
    }

    countEl.textContent = `사원 ${data.length}명`;

    data.forEach((emp) => {
      const row = document.createElement("div");
      row.className = "employee-row";

      const main = document.createElement("div");
      main.className = "employee-row-main";

      const left = document.createElement("div");

      const nameEl = document.createElement("div");
      nameEl.className = "employee-name";
      nameEl.textContent = emp.name || emp.employee_id;

      const meta = document.createElement("div");
      meta.className = "employee-meta";
      const dept = emp.department || "부서 미지정";
      const job = emp.job_title || "직무 미지정";
      const type = emp.employment_type || "구분 미지정";
      meta.textContent = `${dept} · ${job} · ${type}`;

      left.appendChild(nameEl);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "employee-meta";
      const start = emp.start_date
        ? new Date(emp.start_date).toLocaleDateString("ko-KR")
        : "-";
      right.textContent = `입사(예정): ${start}`;

      main.appendChild(left);
      main.appendChild(right);

      const sub = document.createElement("div");
      sub.className = "employee-sub";
      const phone = emp.phone || "-";
      const email = emp.email || "-";
      sub.textContent = `연락처: ${phone} · 이메일: ${email}`;

      row.appendChild(main);
      row.appendChild(sub);

      listEl.appendChild(row);
    });

    showMessage(messageEl, "", null);
  } catch (e) {
    console.error("[Supabase] 사원 목록 조회 예외", e);
    showMessage(
      messageEl,
      "사원 목록을 불러오는 중 알 수 없는 오류가 발생했습니다.",
      "error"
    );
  }
}

