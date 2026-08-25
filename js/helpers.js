// ============================================================
// HELPER FUNCTIONS UNTUK LABEL BULAN
// ============================================================

function getShortMonthLabel(monthKey) {
  if (!monthKey || monthKey.length !== 7) return monthKey;
  const [y, m] = monthKey.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return monthNames[parseInt(m) - 1] + "-" + y.slice(2, 4);
}

function renderShodaqohFilters() {
  const months = [
    { value: "", label: "Semua" },
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const statuses = [
    { value: "ALL", label: "Semua" },
    { value: "LUNAS", label: "Lunas" },
    { value: "BELUM", label: "Belum" },
  ];

  const years = [
    ...new Set(
      state.shodaqoh.payments
        .map((p) => String(p.tanggal).slice(0, 4))
        .filter(Boolean)
        .concat([String(state.shodaqoh.selectedMonth).slice(0, 4)]),
    ),
  ]
    .sort()
    .reverse();

  const members = [
    { value: "", label: "Semua" },
    ...(state.shodaqoh.members || []).map(function (m) {
      return { value: m.member_id, label: m.nama };
    }),
  ];

  renderFilterDropdown("shodYear", years, state.shodaqoh.filters.year || "");
  renderFilterDropdown("shodMonth", months, state.shodaqoh.filters.month || "");
  renderFilterDropdown(
    "shodMember",
    members,
    state.shodaqoh.filters.memberId || "",
  );
  renderFilterDropdown(
    "shodStatus",
    statuses,
    state.shodaqoh.filters.status || "ALL",
  );
}

function renderFilterDropdown(prefix, items, selectedValue) {
  const menu = $(prefix + "DropdownMenu");
  const value = $(prefix + "DropdownValue");
  const trigger = $(prefix + "DropdownTrigger");

  if (!menu || !value) return;

  if (Array.isArray(items) && items.length > 0) {
    const selectedItem = items.find(function (item) {
      const itemVal = item.value !== undefined ? item.value : item;
      return String(itemVal) === String(selectedValue);
    });
    if (selectedItem) {
      value.textContent =
        selectedItem.label || selectedItem.nama || selectedItem;
    } else {
      value.textContent = "Semua";
    }
  }

  menu.innerHTML = items
    .map(function (item) {
      const val = item.value !== undefined ? item.value : item;
      const label = item.label || item.nama || item;
      const isSelected = String(val) === String(selectedValue);
      return `<button type="button"
        class="filter-dropdown-option ${isSelected ? "active" : ""}"
        data-value="${val}"
        role="option"
        aria-selected="${isSelected}">
        <span>${label}</span>
      </button>`;
    })
    .join("");

  trigger.onclick = function (event) {
    event.stopPropagation();
    const dropdown = $(prefix + "Dropdown");
    const isOpen = dropdown.classList.contains("open");
    document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
      if (el.id !== dropdown.id) {
        el.classList.remove("open");
        el.querySelector(".filter-dropdown-trigger")?.setAttribute(
          "aria-expanded",
          "false",
        );
      }
    });
    dropdown.classList.toggle("open");
    dropdown
      .querySelector(".filter-dropdown-trigger")
      ?.setAttribute("aria-expanded", String(!isOpen));
  };

  menu.querySelectorAll(".filter-dropdown-option").forEach(function (option) {
    option.onclick = function (event) {
      event.stopPropagation();
      const val = this.dataset.value;
      const label = this.textContent.trim();
      const dropdown = $(prefix + "Dropdown");
      dropdown.classList.remove("open");
      dropdown
        .querySelector(".filter-dropdown-trigger")
        ?.setAttribute("aria-expanded", "false");

      const filterKey = prefix.replace("shod", "").toLowerCase();

      if (filterKey === "year") {
        state.shodaqoh.filters.year = val || "";
        value.textContent = label || "Semua";
        renderPaymentHistory();
      } else if (filterKey === "month") {
        state.shodaqoh.filters.month = val || "";
        value.textContent = label || "Semua";
        const p =
          state.shodaqoh.filters.year + "-" + state.shodaqoh.filters.month;
        if (state.shodaqoh.filters.year && state.shodaqoh.filters.month) {
          loadShodaqohData(p);
        } else {
          loadShodaqohData("");
        }
      } else if (filterKey === "member") {
        state.shodaqoh.filters.memberId = val || "";
        value.textContent = label || "Semua";
        renderShodaqohMonitoring();
        renderPaymentHistory();
      } else if (filterKey === "status") {
        state.shodaqoh.filters.status = val || "ALL";
        value.textContent = label || "Semua";
        renderShodaqohMonitoring();
      }

      menu.querySelectorAll(".filter-dropdown-option").forEach(function (el) {
        el.classList.toggle("active", el.dataset.value === val);
        el.setAttribute("aria-selected", el.dataset.value === val);
      });
    };
  });
}

document.addEventListener("click", function (event) {
  document
    .querySelectorAll(".filter-dropdown.open")
    .forEach(function (dropdown) {
      if (!dropdown.contains(event.target)) {
        dropdown.classList.remove("open");
        dropdown
          .querySelector(".filter-dropdown-trigger")
          ?.setAttribute("aria-expanded", "false");
      }
    });
});

const shodUploadInput = document.getElementById("shodUploadInput");
const shodUploadFileName = document.getElementById("shodUploadFileName");

if (shodUploadInput && shodUploadFileName) {
  shodUploadInput.addEventListener("change", function (e) {
    const fileName = this.files[0]?.name || "Pilih foto rekap";
    shodUploadFileName.textContent = fileName;
  });
}

function setButtonLoading(btn, isLoading) {
  if (!btn) return;

  if (isLoading) {
    btn._originalContent ||= btn.innerHTML;
    btn.innerHTML =
      btn.id === "fabPostToKas"
        ? `<span style="display:inline-block;width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span>`
        : `<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:-2px;margin-right:7px"></span> Memproses...`;

    btn.disabled = true;
    btn.style.opacity = "0.7";
  } else {
    btn.innerHTML =
      btn._originalContent ||
      (btn.id === "fabPostToKas"
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7"/><polyline points="15 3 21 3 21 9"/><line x1="9" y1="15" x2="21" y2="3"/></svg>`
        : "Post ke Kas");

    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

function initShodMemberDropdown() {
  const dropdown = document.getElementById("shodPaymentMemberDropdown");
  const trigger = document.getElementById("shodPaymentMemberTrigger");
  const valueDisplay = document.getElementById("shodPaymentMemberValue");
  const menu = document.getElementById("shodPaymentMemberMenu");
  const hiddenInput = document.getElementById("shodPaymentMember");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    return;
  }

  renderMemberDropdownMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleMemberDropdown();
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleMemberDropdown();
    }
    if (e.key === "Escape") {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function toggleMemberDropdown() {
  const dropdown = document.getElementById("shodPaymentMemberDropdown");
  const trigger = document.getElementById("shodPaymentMemberTrigger");
  const isOpen = dropdown.classList.contains("open");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderMemberDropdownMenu();
  }
}

function renderMemberDropdownMenu() {
  const menu = document.getElementById("shodPaymentMemberMenu");
  const hiddenInput = document.getElementById("shodPaymentMember");
  if (!menu) return;

  const members = state.shodaqoh.members || [];
  const selectedId = hiddenInput?.value || "";

  if (members.length === 0) {
    menu.innerHTML = `
      <button type="button" class="filter-dropdown-option" disabled style="opacity:0.5;cursor:not-allowed;">
        Belum ada anggota
      </button>
    `;
    return;
  }

  menu.innerHTML = members
    .map(function (m) {
      const isSelected = String(m.member_id) === String(selectedId);
      return `
      <button type="button" 
        class="filter-dropdown-option ${isSelected ? "active" : ""}"
        data-member-id="${escapeHtml(m.member_id)}"
        data-member-name="${escapeHtml(m.nama)}"
        role="option"
        aria-selected="${isSelected}">
        ${escapeHtml(m.nama)}
      </button>
    `;
    })
    .join("");

  menu.querySelectorAll(".filter-dropdown-option").forEach(function (option) {
    option.addEventListener("click", function (e) {
      e.stopPropagation();
      const memberId = this.dataset.memberId;
      const memberName = this.dataset.memberName;
      selectMember(memberId, memberName);
    });
  });
}

function selectMember(memberId, memberName) {
  const valueDisplay = document.getElementById("shodPaymentMemberValue");
  const hiddenInput = document.getElementById("shodPaymentMember");
  const dropdown = document.getElementById("shodPaymentMemberDropdown");
  const trigger = document.getElementById("shodPaymentMemberTrigger");

  if (valueDisplay) valueDisplay.textContent = memberName || "Pilih anggota";
  if (hiddenInput) hiddenInput.value = memberId || "";

  if (dropdown) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  }

  renderMemberDropdownMenu();
}

let datePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

function initShodDatePicker() {
  const dropdown = document.getElementById("shodDateDropdown");
  const trigger = document.getElementById("shodDateDropdownTrigger");
  const valueDisplay = document.getElementById("shodDateDropdownValue");
  const menu = document.getElementById("shodDateDropdownMenu");
  const hiddenInput = document.getElementById("shodPaymentDate");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    return;
  }

  const today = new Date();
  valueDisplay.textContent = formatDateDisplay(today);
  hiddenInput.value = formatDateInput(today);
  datePickerState.selectedDate = today;
  datePickerState.currentMonth = today.getMonth();
  datePickerState.currentYear = today.getFullYear();

  renderDatePickerMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleDatePicker(dropdown);
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      closeDatePicker(dropdown);
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDatePicker(dropdown);
    }
    if (e.key === "Escape") {
      closeDatePicker(dropdown);
    }
  });
}

function toggleDatePicker(dropdown) {
  const isOpen = dropdown.classList.contains("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    removeDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderDatePickerMenu();

    // ✅ TAMBAHKAN INI
    adjustDatePickerPosition(dropdown);

    setTimeout(function () {
      const manualInput = document.getElementById("shodDateManualInput");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addDatePickerBackdrop(dropdown);
    }
  }
}

function addDatePickerBackdrop(dropdown) {
  removeDatePickerBackdrop();
  const backdrop = document.createElement("div");
  backdrop.id = "datePickerBackdrop";
  backdrop.addEventListener("click", function () {
    closeDatePicker(dropdown);
  });
  document.body.appendChild(backdrop);
}

function removeDatePickerBackdrop() {
  const backdrop = document.getElementById("datePickerBackdrop");
  if (backdrop) backdrop.remove();
}

function closeDatePicker(dropdown) {
  dropdown.classList.remove("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");
  trigger?.setAttribute("aria-expanded", "false");
  removeDatePickerBackdrop();
}

function renderDatePickerMenu() {
  const menu = document.getElementById("shodDateDropdownMenu");
  if (!menu) return;

  const year = datePickerState.currentYear;
  const month = datePickerState.currentMonth;

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let daysHtml = "";
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const prevMonthDays = firstDay;
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${day}" data-month="${month - 1}" data-year="${year}">${day}</button>`;
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      i === todayDate && month === todayMonth && year === todayYear;
    const isSelected =
      datePickerState.selectedDate &&
      datePickerState.selectedDate.getDate() === i &&
      datePickerState.selectedDate.getMonth() === month &&
      datePickerState.selectedDate.getFullYear() === year;

    let classes = "date-picker-day";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";

    daysHtml += `<button type="button" class="${classes}" data-day="${i}" data-month="${month}" data-year="${year}">${i}</button>`;
  }

  const totalDays = prevMonthDays + daysInMonth;
  const remainingDays = 42 - totalDays;
  for (let i = 1; i <= remainingDays; i++) {
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${i}" data-month="${month + 1}" data-year="${year}">${i}</button>`;
  }

  const currentDate = datePickerState.selectedDate;
  let currentDateStr = "";
  if (currentDate) {
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    currentDateStr = `${day}-${month}-${year}`;
  }

  menu.innerHTML = `
    <div class="date-picker-input-wrap">
      <input 
        type="text" 
        id="shodDateManualInput"
        class="date-picker-manual-input"
        placeholder="dd-mm-yyyy"
        value="${currentDateStr}"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" id="shodDateManualApply" class="date-picker-apply">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
    </div>

    <div class="date-picker-divider"></div>

    <div class="date-picker-header">
      <button type="button" class="date-picker-nav" data-direction="prev">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="date-picker-month-year">${monthNames[month]} ${year}</span>
      <button type="button" class="date-picker-nav" data-direction="next">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>

    <div class="date-picker-weekdays">
      <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span>
      <span>Kam</span><span>Jum</span><span>Sab</span>
    </div>

    <div class="date-picker-days">
      ${daysHtml}
    </div>

    <div class="date-picker-footer">
      <button type="button" class="date-picker-today">Hari Ini</button>
      <button type="button" class="date-picker-clear">Hapus</button>
    </div>
  `;

  const manualInput = document.getElementById("shodDateManualInput");
  if (manualInput) {
    manualInput.addEventListener("input", function (e) {
      let value = this.value.replace(/\D/g, "");
      if (value.length > 8) value = value.slice(0, 8);
      if (value.length > 2) {
        value = value.slice(0, 2) + "-" + value.slice(2);
      }
      if (value.length > 5) {
        value = value.slice(0, 5) + "-" + value.slice(5);
      }
      this.value = value;
    });

    manualInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyManualDate(this.value);
      }
      if (e.key === "Escape") {
        const dropdown = document.getElementById("shodDateDropdown");
        closeDatePicker(dropdown);
      }
    });
  }

  const applyBtn = document.getElementById("shodDateManualApply");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const input = document.getElementById("shodDateManualInput");
      if (input) {
        applyManualDate(input.value);
      }
    });
  }

  menu.querySelectorAll(".date-picker-nav").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const direction = this.dataset.direction;
      if (direction === "prev") {
        datePickerState.currentMonth--;
        if (datePickerState.currentMonth < 0) {
          datePickerState.currentMonth = 11;
          datePickerState.currentYear--;
        }
      } else {
        datePickerState.currentMonth++;
        if (datePickerState.currentMonth > 11) {
          datePickerState.currentMonth = 0;
          datePickerState.currentYear++;
        }
      }
      renderDatePickerMenu();
    });
  });

  menu.querySelectorAll(".date-picker-day").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const day = parseInt(this.dataset.day);
      const month = parseInt(this.dataset.month);
      const year = parseInt(this.dataset.year);
      const date = new Date(year, month, day);
      selectDate(date);
    });
  });

  const todayBtn = menu.querySelector(".date-picker-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const today = new Date();
      selectDate(today);
    });
  }

  const clearBtn = menu.querySelector(".date-picker-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      clearDate();
    });
  }
}

function applyManualDate(dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return;
  if (day < 1 || day > 31) return;
  if (month < 0 || month > 11) return;
  if (year < 1900 || year > 2100) return;
  const date = new Date(year, month, day);
  if (date.getDate() !== day) return;
  selectDate(date);
}

function selectDate(date) {
  if (!date || isNaN(date.getTime())) return;

  datePickerState.selectedDate = date;
  datePickerState.currentMonth = date.getMonth();
  datePickerState.currentYear = date.getFullYear();

  const valueDisplay = document.getElementById("shodDateDropdownValue");
  const hiddenInput = document.getElementById("shodPaymentDate");
  const manualInput = document.getElementById("shodDateManualInput");

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const formattedManualDate = `${day}-${month}-${year}`;

  if (valueDisplay) {
    valueDisplay.textContent = formatDateDisplay(date);
  }

  if (hiddenInput) {
    hiddenInput.value = formatDateInput(date);
  }

  if (manualInput) {
    manualInput.value = formattedManualDate;
  }

  const dropdown = document.getElementById("shodDateDropdown");

  closeDatePicker(dropdown);

  if (hiddenInput) {
    hiddenInput.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );

    hiddenInput.dispatchEvent(
      new Event("change", {
        bubbles: true,
      }),
    );
  }
}

function clearDate() {
  const valueDisplay = document.getElementById("shodDateDropdownValue");
  const hiddenInput = document.getElementById("shodPaymentDate");
  const manualInput = document.getElementById("shodDateManualInput");

  if (valueDisplay) valueDisplay.textContent = "Pilih tanggal";
  if (hiddenInput) hiddenInput.value = "";
  if (manualInput) manualInput.value = "";

  datePickerState.selectedDate = null;

  const dropdown = document.getElementById("shodDateDropdown");
  closeDatePicker(dropdown);
}

let txDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

function initTxDatePicker() {
  const dropdown = document.getElementById("txDateDropdown");
  const trigger = document.getElementById("txDateDropdownTrigger");
  const valueDisplay = document.getElementById("txDateDropdownValue");
  const menu = document.getElementById("txDateDropdownMenu");
  const hiddenInput = document.getElementById("txTanggal");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    return;
  }

  const today = new Date();
  valueDisplay.textContent = formatDateDisplay(today);
  hiddenInput.value = formatDateInput(today);
  txDatePickerState.selectedDate = today;
  txDatePickerState.currentMonth = today.getMonth();
  txDatePickerState.currentYear = today.getFullYear();

  renderTxDatePickerMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleTxDatePicker(dropdown);
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      closeTxDatePicker(dropdown);
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTxDatePicker(dropdown);
    }
    if (e.key === "Escape") {
      closeTxDatePicker(dropdown);
    }
  });
}

function toggleTxDatePicker(dropdown) {
  const isOpen = dropdown.classList.contains("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    removeTxDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderTxDatePickerMenu();

    // ✅ TAMBAHKAN INI
    adjustDatePickerPosition(dropdown);

    setTimeout(function () {
      const manualInput = document.getElementById("txDateManualInput");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addTxDatePickerBackdrop(dropdown);
    }
  }
}

function addTxDatePickerBackdrop(dropdown) {
  removeTxDatePickerBackdrop();
  const backdrop = document.createElement("div");
  backdrop.id = "txDatePickerBackdrop";
  backdrop.addEventListener("click", function () {
    closeTxDatePicker(dropdown);
  });
  document.body.appendChild(backdrop);
}

function removeTxDatePickerBackdrop() {
  const backdrop = document.getElementById("txDatePickerBackdrop");
  if (backdrop) backdrop.remove();
}

function closeTxDatePicker(dropdown) {
  dropdown.classList.remove("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");
  trigger?.setAttribute("aria-expanded", "false");
  removeTxDatePickerBackdrop();
}

function renderTxDatePickerMenu() {
  const menu = document.getElementById("txDateDropdownMenu");
  if (!menu) return;

  const year = txDatePickerState.currentYear;
  const month = txDatePickerState.currentMonth;

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let daysHtml = "";
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const prevMonthDays = firstDay;
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${day}" data-month="${month - 1}" data-year="${year}">${day}</button>`;
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      i === todayDate && month === todayMonth && year === todayYear;
    const isSelected =
      txDatePickerState.selectedDate &&
      txDatePickerState.selectedDate.getDate() === i &&
      txDatePickerState.selectedDate.getMonth() === month &&
      txDatePickerState.selectedDate.getFullYear() === year;

    let classes = "date-picker-day";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";

    daysHtml += `<button type="button" class="${classes}" data-day="${i}" data-month="${month}" data-year="${year}">${i}</button>`;
  }

  const totalDays = prevMonthDays + daysInMonth;
  const remainingDays = 42 - totalDays;
  for (let i = 1; i <= remainingDays; i++) {
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${i}" data-month="${month + 1}" data-year="${year}">${i}</button>`;
  }

  const currentDate = txDatePickerState.selectedDate;
  let currentDateStr = "";
  if (currentDate) {
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    currentDateStr = `${day}-${month}-${year}`;
  }

  menu.innerHTML = `
    <div class="date-picker-input-wrap">
      <input 
        type="text" 
        id="txDateManualInput"
        class="date-picker-manual-input"
        placeholder="dd-mm-yyyy"
        value="${currentDateStr}"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" id="txDateManualApply" class="date-picker-apply">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
    </div>

    <div class="date-picker-divider"></div>

    <div class="date-picker-header">
      <button type="button" class="date-picker-nav" data-direction="prev">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="date-picker-month-year">${monthNames[month]} ${year}</span>
      <button type="button" class="date-picker-nav" data-direction="next">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>

    <div class="date-picker-weekdays">
      <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span>
      <span>Kam</span><span>Jum</span><span>Sab</span>
    </div>

    <div class="date-picker-days">
      ${daysHtml}
    </div>

    <div class="date-picker-footer">
      <button type="button" class="date-picker-today">Hari Ini</button>
      <button type="button" class="date-picker-clear">Hapus</button>
    </div>
  `;

  const manualInput = document.getElementById("txDateManualInput");
  if (manualInput) {
    manualInput.addEventListener("input", function (e) {
      let value = this.value.replace(/\D/g, "");
      if (value.length > 8) value = value.slice(0, 8);
      if (value.length > 2) {
        value = value.slice(0, 2) + "-" + value.slice(2);
      }
      if (value.length > 5) {
        value = value.slice(0, 5) + "-" + value.slice(5);
      }
      this.value = value;
    });

    manualInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyTxManualDate(this.value);
      }
      if (e.key === "Escape") {
        const dropdown = document.getElementById("txDateDropdown");
        closeTxDatePicker(dropdown);
      }
    });
  }

  const applyBtn = document.getElementById("txDateManualApply");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const input = document.getElementById("txDateManualInput");
      if (input) {
        applyTxManualDate(input.value);
      }
    });
  }

  menu.querySelectorAll(".date-picker-nav").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const direction = this.dataset.direction;
      if (direction === "prev") {
        txDatePickerState.currentMonth--;
        if (txDatePickerState.currentMonth < 0) {
          txDatePickerState.currentMonth = 11;
          txDatePickerState.currentYear--;
        }
      } else {
        txDatePickerState.currentMonth++;
        if (txDatePickerState.currentMonth > 11) {
          txDatePickerState.currentMonth = 0;
          txDatePickerState.currentYear++;
        }
      }
      renderTxDatePickerMenu();
    });
  });

  menu.querySelectorAll(".date-picker-day").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const day = parseInt(this.dataset.day);
      const month = parseInt(this.dataset.month);
      const year = parseInt(this.dataset.year);
      const date = new Date(year, month, day);
      selectTxDate(date);
    });
  });

  const todayBtn = menu.querySelector(".date-picker-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const today = new Date();
      selectTxDate(today);
    });
  }

  const clearBtn = menu.querySelector(".date-picker-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      clearTxDate();
    });
  }
}

function applyTxManualDate(dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return;
  if (day < 1 || day > 31) return;
  if (month < 0 || month > 11) return;
  if (year < 1900 || year > 2100) return;
  const date = new Date(year, month, day);
  if (date.getDate() !== day) return;
  selectTxDate(date);
}

function selectTxDate(date) {
  if (!date || isNaN(date.getTime())) return;

  txDatePickerState.selectedDate = date;
  txDatePickerState.currentMonth = date.getMonth();
  txDatePickerState.currentYear = date.getFullYear();

  const valueDisplay = document.getElementById("txDateDropdownValue");
  const hiddenInput = document.getElementById("txTanggal");
  const manualInput = document.getElementById("txDateManualInput");

  const formattedDate = formatDateInput(date);

  if (valueDisplay) {
    valueDisplay.textContent = formatDateDisplay(date);
  }

  if (hiddenInput) {
    hiddenInput.value = formattedDate;
  }

  if (manualInput) {
    manualInput.value = formattedDate;
  }

  const dropdown = document.getElementById("txDateDropdown");
  closeTxDatePicker(dropdown);

  if (hiddenInput) {
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function clearTxDate() {
  const valueDisplay = document.getElementById("txDateDropdownValue");
  const hiddenInput = document.getElementById("txTanggal");
  const manualInput = document.getElementById("txDateManualInput");

  if (valueDisplay) valueDisplay.textContent = "Pilih tanggal";
  if (hiddenInput) hiddenInput.value = "";
  if (manualInput) manualInput.value = "";

  txDatePickerState.selectedDate = null;

  const dropdown = document.getElementById("txDateDropdown");
  closeTxDatePicker(dropdown);
}

const ACCOUNT_CATEGORIES = [
  "SALDO AWAL",
  "PEMASUKAN INFAK SAMBUNG",
  "INFAK IR",
  "PEMASUKAN UANG SAMBUNG",
  "PEMASUKAN INFAK JUMAT",
  "JIMPITAN",
  "SIAR-SIAR",
  "KAFAN",
  "INFAK SERIBUAN",
  "PEMASUKAN UKHRO MT",
  "SETOR INFAK SAMBUNG",
  "SETOR 2/3 INFAK JUMAT",
  "INFAQ SAMBUNG DESA",
  "INFAQ SAMBUNG DAERAH",
  "UKHRO MT",
  "BEBAN OPERASIONAL BULAN BERJALAN",
  "BEBAN PENGELUARAN LAIN-LAIN",
  "PEMASUKAN LAIN-LAIN",
];

function initTxAccountDropdown() {
  const dropdown = document.getElementById("txAccountDropdown");
  const trigger = document.getElementById("txAccountDropdownTrigger");
  const valueDisplay = document.getElementById("txAccountDropdownValue");
  const menu = document.getElementById("txAccountDropdownMenu");
  const hiddenInput = document.getElementById("txAccount");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    return;
  }

  renderTxAccountDropdownMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleTxAccountDropdown();
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTxAccountDropdown();
    }
    if (e.key === "Escape") {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function toggleTxAccountDropdown() {
  const dropdown = document.getElementById("txAccountDropdown");
  const trigger = document.getElementById("txAccountDropdownTrigger");
  const isOpen = dropdown.classList.contains("open");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderTxAccountDropdownMenu();
  }
}

function renderTxAccountDropdownMenu() {
  const menu = document.getElementById("txAccountDropdownMenu");
  const hiddenInput = document.getElementById("txAccount");
  if (!menu) return;

  const selectedValue = hiddenInput?.value || "";

  menu.innerHTML = ACCOUNT_CATEGORIES.map(function (account) {
    const isSelected = account === selectedValue;
    return `
        <button type="button" 
          class="filter-dropdown-option ${isSelected ? "active" : ""}"
          data-account="${escapeHtml(account)}"
          role="option"
          aria-selected="${isSelected}">
          ${escapeHtml(account)}
        </button>
      `;
  }).join("");
}

function selectTxAccount(account) {
  const valueDisplay = document.getElementById("txAccountDropdownValue");
  const hiddenInput = document.getElementById("txAccount");
  const dropdown = document.getElementById("txAccountDropdown");
  const trigger = document.getElementById("txAccountDropdownTrigger");

  if (valueDisplay) valueDisplay.textContent = account || "Pilih kategori";
  if (hiddenInput) hiddenInput.value = account || "";

  if (dropdown) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  }

  renderTxAccountDropdownMenu();
}

function initTxForm() {
  initTxDatePicker();
  initTxAccountDropdown();

  document.addEventListener("click", function (e) {
    const option = e.target.closest(
      "#txAccountDropdownMenu .filter-dropdown-option",
    );
    if (option) {
      e.preventDefault();
      const account = option.dataset.account;
      if (account) {
        selectTxAccount(account);
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    initTxForm();
  }, 200);
});

function formatDateDisplay(date) {
  const bulan = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const day = String(date.getDate()).padStart(2, "0");
  const month = bulan[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderShodaqohSkeleton() {
  const container = document.querySelector("#screen-shodaqoh");
  if (!container) return;

  // Hapus skeleton lama jika ada
  container
    .querySelectorAll(".shod-skeleton-wrapper")
    .forEach((el) => el.remove());

  // SEMBUNYIKAN SEMUA KONTEN ASLI
  const children = container.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.classList && child.classList.contains("shod-skeleton-wrapper"))
      continue;
    child.style.display = "none";
  }

  // Buat wrapper skeleton
  const wrapper = document.createElement("div");
  wrapper.className = "shod-skeleton-wrapper";
  wrapper.style.cssText = "display:block;width:100%;";

  wrapper.innerHTML = `
    <!-- Skeleton: Header (judul + tombol) -->
    <div class="flex items-center justify-between gap-3 skeleton-loading" style="margin-bottom:12px;">
      <div>
        <div class="skeleton-line" style="width:80px;height:10px;border-radius:4px;margin-bottom:4px;"></div>
        <div class="skeleton-line" style="width:200px;height:24px;border-radius:4px;margin-bottom:4px;"></div>
        <div class="skeleton-line" style="width:120px;height:14px;border-radius:4px;"></div>
      </div>
      <div class="flex items-center gap-2">
        <div class="skeleton-line" style="width:34px;height:34px;border-radius:8px;"></div>
        <div class="skeleton-line" style="width:34px;height:34px;border-radius:8px;"></div>
      </div>
    </div>

    <!-- Skeleton: Dashboard 4 card (grid 2x2) -->
    <div class="grid grid-cols-2 gap-3" style="margin-bottom:12px;">
      ${[1, 2, 3, 4]
        .map(
          () => `
        <div class="card p-4 skeleton-loading">
          <div class="skeleton-line" style="width:40%;height:10px;border-radius:4px;margin-bottom:6px;"></div>
          <div class="skeleton-line" style="width:60%;height:20px;border-radius:4px;"></div>
        </div>
      `,
        )
        .join("")}
    </div>

    <!-- Skeleton: Rincian Alokasi Pembayaran -->
    <div class="card p-4" style="margin-bottom:12px;">
      <div class="skeleton-line" style="width:50%;height:14px;border-radius:4px;margin-bottom:12px;"></div>
      <div class="grid grid-cols-2 gap-2">
        ${[1, 2, 3, 4, 5, 6, 7, 8]
          .map(
            () => `
          <div class="card p-3 skeleton-loading">
            <div class="skeleton-line" style="width:60%;height:8px;border-radius:4px;margin-bottom:4px;"></div>
            <div class="skeleton-line" style="width:50%;height:16px;border-radius:4px;"></div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <!-- Skeleton: Filter (4 dropdown) -->
    <div class="card p-4" style="margin-bottom:12px;">
      <div class="grid grid-cols-2 gap-3 skeleton-loading">
        ${[1, 2, 3, 4]
          .map(
            () => `
          <div>
            <div class="skeleton-line" style="width:30%;height:8px;border-radius:4px;margin-bottom:4px;"></div>
            <div class="skeleton-line" style="width:100%;height:34px;border-radius:8px;"></div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <!-- Skeleton: Tabs (3 tab) -->
    <div style="margin-bottom:8px;">
      <div class="shod-tabs" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
        ${[1, 2, 3]
          .map(
            () => `
          <div style="height:34px;border:1px solid var(--line);border-radius:8px;background:var(--surface);display:flex;align-items:center;justify-content:center;">
            <span class="skeleton-line" style="display:block;width:48px;height:10px;border-radius:4px;"></span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <!-- Skeleton: Monitoring Table -->
    <div class="card p-4">
      <!-- Header table -->
      <div class="flex items-center justify-between mb-3 skeleton-loading">
        <div class="flex items-center gap-3">
          <span class="skeleton-line" style="display:inline-block;width:80px;height:12px;border-radius:4px;"></span>
          <span class="skeleton-line" style="display:inline-block;width:60px;height:10px;border-radius:4px;"></span>
        </div>
        <div class="flex items-center gap-3">
          <span class="skeleton-line" style="display:inline-block;width:50px;height:10px;border-radius:4px;"></span>
          <span class="skeleton-line" style="display:inline-block;width:50px;height:10px;border-radius:4px;"></span>
        </div>
      </div>
      
      <!-- Table header -->
      <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 0.8fr 1fr;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--line);">
        ${["Anggota", "Target", "Dibayar", "Status", "Tgl Bayar"]
          .map(
            () =>
              `<span class="skeleton-line" style="height:10px;border-radius:4px;"></span>`,
          )
          .join("")}
      </div>
      
      <!-- Table rows -->
      ${[1, 2, 3, 4, 5, 6, 7]
        .map(
          () => `
        <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 0.8fr 1fr;gap:8px;padding:10px 0;border-bottom:1px solid var(--line);">
          ${[1, 2, 3, 4, 5]
            .map(
              () =>
                `<span class="skeleton-line" style="height:12px;border-radius:4px;"></span>`,
            )
            .join("")}
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  // Masukkan skeleton di awal container (sebelum konten asli)
  container.insertBefore(wrapper, container.firstChild);
}

function renderShodaqohError(message) {
  const container = document.querySelector("#screen-shodaqoh");
  if (!container) return;

  const monitoringTab = container.querySelector(
    ".shod-tab-content-shod-monitoring",
  );

  if (monitoringTab) {
    monitoringTab.innerHTML = `
      <div class="card p-5">
        <div
          class="flex flex-col items-center justify-center text-center py-8"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            style="background:var(--neg-soft);color:var(--neg);"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 8v4"></path>
              <path d="M12 16h.01"></path>
            </svg>
          </div>

          <p
            class="text-xs mt-3"
            style="color:var(--neg);"
          >
            Gagal memuat data
          </p>

          <button
            type="button"
            id="btnRetryShodaqoh"
            class="btn-primary mt-4"
          >
            Coba lagi
          </button>
        </div>
      </div>
    `;

    const retryBtn = $("btnRetryShodaqoh");

    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        loadShodaqohData(state.shodaqoh.selectedMonth);
      });
    }
  }

  const membersTab = container.querySelector(".shod-tab-content-shod-members");

  const paymentsTab = container.querySelector(
    ".shod-tab-content-shod-payments",
  );

  if (membersTab) {
    membersTab.style.display = "none";
  }

  if (paymentsTab) {
    paymentsTab.style.display = "none";
  }
}

function renderHomeSkeleton() {
  const saldoAkhir = $("homeSaldoAkhir");
  if (saldoAkhir) {
    saldoAkhir.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:140px;height:30px;border-radius:4px;"></span>`;
  }

  const periodeText = $("homePeriodeText");
  if (periodeText) {
    periodeText.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:120px;height:14px;border-radius:4px;"></span>`;
  }

  const totalTx = $("homeTotalTx");
  if (totalTx) {
    totalTx.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:60px;height:14px;border-radius:4px;"></span>`;
  }

  const saldoAwal = $("homeSaldoAwal");
  if (saldoAwal) {
    saldoAwal.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:16px;border-radius:4px;"></span>`;
  }

  const debet = $("homeDebet");
  if (debet) {
    debet.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:18px;border-radius:4px;"></span>`;
  }

  const kredit = $("homeKredit");
  if (kredit) {
    kredit.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:18px;border-radius:4px;"></span>`;
  }

  const surplus = $("homeSurplus");
  if (surplus) {
    surplus.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:18px;border-radius:4px;"></span>`;
  }

  const surplusBadge = $("homeSurplusBadge");
  if (surplusBadge) {
    surplusBadge.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:50px;height:16px;border-radius:999px;"></span>`;
  }

  const chartWrapper = document.getElementById("chartWrapper");
  if (chartWrapper) {
    const oldSkeleton = chartWrapper.querySelector(".chart-skeleton");
    if (oldSkeleton) oldSkeleton.remove();

    const canvas = chartWrapper.querySelector("#saldoChart");
    if (canvas) canvas.style.display = "none";

    const skeleton = document.createElement("div");
    skeleton.className = "chart-skeleton";
    skeleton.innerHTML = `
      <div class="chart-skeleton-content">
        <div class="chart-skeleton-grid">
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
        </div>
        <div class="chart-skeleton-wave">
          <div class="chart-skeleton-wave-line"></div>
        </div>
        <div class="chart-skeleton-labels">
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
        </div>
      </div>
    `;
    chartWrapper.appendChild(skeleton);
  }

  const recentList = $("homeRecentList");
  if (recentList) {
    recentList.innerHTML = `
      ${[1, 2, 3, 4, 5]
        .map(
          () => `
        <div class="tx-card skeleton-loading">
          <div class="tx-icon skeleton-line" style="width:34px;height:34px;border-radius:8px;flex-shrink:0;"></div>
          <div class="flex-1">
            <div class="skeleton-line" style="width:60%;height:16px;border-radius:4px;"></div>
            <div class="skeleton-line mt-2" style="width:40%;height:12px;border-radius:4px;"></div>
            <div class="skeleton-line mt-1" style="width:30%;height:10px;border-radius:4px;"></div>
          </div>
          <div class="text-right">
            <div class="skeleton-line" style="width:60px;height:16px;border-radius:4px;margin-left:auto;"></div>
            <div class="skeleton-line mt-2" style="width:40px;height:12px;border-radius:4px;margin-left:auto;"></div>
          </div>
        </div>
      `,
        )
        .join("")}
    `;
  }

  const chartScope = $("chartScopeLabel");
  if (chartScope) {
    chartScope.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:12px;border-radius:4px;"></span>`;
  }
}

function renderHistorySkeleton() {
  const saldoAwal = $("rySaldoAwal");
  if (saldoAwal) {
    saldoAwal.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:16px;border-radius:4px;"></span>`;
  }

  const saldoAkhir = $("rySaldoAkhir");
  if (saldoAkhir) {
    saldoAkhir.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:16px;border-radius:4px;"></span>`;
  }

  const periodHint = $("periodHint");
  if (periodHint) {
    periodHint.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:180px;height:14px;border-radius:4px;"></span>`;
  }

  const txList = $("txList");
  if (txList) {
    txList.innerHTML = `
      ${[1, 2, 3, 4, 5, 6, 7, 8]
        .map(
          () => `
        <div class="tx-card skeleton-loading">
          <div class="tx-icon skeleton-line" style="width:34px;height:34px;border-radius:8px;flex-shrink:0;"></div>
          <div class="flex-1">
            <div class="skeleton-line" style="width:60%;height:16px;border-radius:4px;"></div>
            <div class="skeleton-line mt-2" style="width:40%;height:12px;border-radius:4px;"></div>
            <div class="skeleton-line mt-1" style="width:30%;height:10px;border-radius:4px;"></div>
          </div>
          <div class="text-right">
            <div class="skeleton-line" style="width:60px;height:16px;border-radius:4px;margin-left:auto;"></div>
            <div class="skeleton-line mt-2" style="width:40px;height:12px;border-radius:4px;margin-left:auto;"></div>
          </div>
        </div>
      `,
        )
        .join("")}
    `;
  }

  const txEmpty = $("txEmpty");
  if (txEmpty) {
    txEmpty.classList.add("hidden");
  }
}

function renderRecapSkeleton() {
  const recapList = $("recapList");
  if (recapList) {
    recapList.innerHTML = `
      ${[1, 2, 3, 4, 5, 6]
        .map(
          () => `
        <div class="card p-4 skeleton-loading">
          <div class="flex items-center justify-between">
            <div class="skeleton-line" style="width:120px;height:18px;border-radius:4px;"></div>
            <div class="skeleton-line" style="width:20px;height:16px;border-radius:4px;"></div>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-3">
            <div>
              <div class="skeleton-line" style="width:30px;height:10px;border-radius:4px;"></div>
              <div class="skeleton-line mt-1" style="width:60px;height:14px;border-radius:4px;"></div>
            </div>
            <div>
              <div class="skeleton-line" style="width:30px;height:10px;border-radius:4px;"></div>
              <div class="skeleton-line mt-1" style="width:60px;height:14px;border-radius:4px;"></div>
            </div>
            <div>
              <div class="skeleton-line" style="width:30px;height:10px;border-radius:4px;"></div>
              <div class="skeleton-line mt-1" style="width:60px;height:14px;border-radius:4px;"></div>
            </div>
          </div>
        </div>
      `,
        )
        .join("")}
    `;
  }
}

function normalizeShodOcrText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[|]/g, "i")
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9.,\-+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOcrWord(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function shodMatchField(text) {
  const n = normalizeShodOcrText(text);

  if (
    /\bpersenan\b/.test(n) ||
    /\bpersen\b/.test(n) ||
    /\b(infak|infaq)\s+ir\b/.test(n) ||
    /\b(shodaqoh|shodagoh)\s+ir\b/.test(n)
  ) {
    return "susulan_ir";
  }

  if (
    /\bsambung\b/.test(n) ||
    /\buang\s+sambung\b/.test(n) ||
    /\b(shodaqoh|shodagoh)\s+sambung\b/.test(n)
  ) {
    return "uang_sambung";
  }

  if (/\bjimpitan\b/.test(n)) {
    return "jimpitan";
  }

  if (/\bsiar[\s-]*siar\b/.test(n)) {
    return "siar_siar";
  }

  if (/\bseribuan\b/.test(n)) {
    return "seribuan";
  }

  if (n === "kf" || n === "kaf" || /\bkafan\b/.test(n)) {
    return "kafan";
  }

  if (
    n === "mt" ||
    /\bmt\b/.test(n) ||
    /\bukhro\s*mt\b/.test(n) ||
    /\bukro\s*mt\b/.test(n)
  ) {
    return "ukhro_mt";
  }

  return null;
}

function shodAmountFromText(value) {
  let s = String(value || "").trim();

  s = s
    .replace(/[oO]/g, "0")
    .replace(/[lI|]/g, "1")
    .replace(/[sS]/g, "5")
    .replace(/[zZ]/g, "2")
    .replace(/[bB]/g, "8");

  const matches = s.match(/\d{1,3}(?:[.,\-\s]\d{3})+|\d{4,}/g);

  if (!matches || !matches.length) {
    return 0;
  }

  const values = matches
    .map((m) => Number(String(m).replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  return values.length ? Math.max(...values) : 0;
}

function shodParseTable(text) {
  const result = {
    total: 0,
    susulan_ir: 0,
    susulan_bulan: [],
    uang_sambung: 0,
    jimpitan: 0,
    siar_siar: 0,
    seribuan: 0,
    kafan: 0,
    ukhro_mt: 0,
    keterangan: "",
    rawText: String(text || ""),
  };

  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const normalized = normalizeShodOcrText(line);

    if (!normalized) continue;

    if (/\btotal\b/.test(normalized)) {
      const total = shodAmountFromText(line);

      if (total > 0) {
        result.total = total;
      }

      continue;
    }

    const field = shodMatchField(normalized);

    if (!field) {
      continue;
    }

    const amount = shodAmountFromText(line);

    if (amount > 0) {
      result[field] = amount;
    }
  }

  if (!result.total) {
    result.total =
      Number(result.susulan_ir || 0) +
      Number(result.uang_sambung || 0) +
      Number(result.jimpitan || 0) +
      Number(result.siar_siar || 0) +
      Number(result.seribuan || 0) +
      Number(result.kafan || 0) +
      Number(result.ukhro_mt || 0);
  }

  return result;
}

async function prepareShodOcrImage(dataUrl, rotation = 0, threshold = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = function () {
      const originalW = img.naturalWidth;
      const originalH = img.naturalHeight;

      const maxSide = 3000;
      const scale = Math.min(1, maxSide / Math.max(originalW, originalH));

      const w = Math.round(originalW * scale);
      const h = Math.round(originalH * scale);

      const rotated = rotation === 90 || rotation === 270;

      const canvas = document.createElement("canvas");

      canvas.width = rotated ? h : w;
      canvas.height = rotated ? w : h;

      const ctx = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      ctx.save();

      ctx.translate(canvas.width / 2, canvas.height / 2);

      ctx.rotate((rotation * Math.PI) / 180);

      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      ctx.restore();

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        let gray =
          0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];

        gray = (gray - 128) * 1.35 + 128;

        gray = Math.max(0, Math.min(255, gray));

        if (threshold) {
          gray = gray > 170 ? 255 : 0;
        }

        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };

    img.onerror = function () {
      reject(new Error("Gagal memproses gambar untuk OCR."));
    };

    img.src = dataUrl;
  });
}

function scoreShodOcrResult(text) {
  const n = normalizeShodOcrText(text);

  let score = 0;

  const keywords = [
    "persenan",
    "persen",
    "sambung",
    "jimpitan",
    "siar",
    "seribuan",
    "kafan",
    "kf",
    "mt",
    "ukhro",
    "total",
    "jumlah",
    "shodaqoh",
    "shodagoh",
    "infak",
    "infaq",
  ];

  keywords.forEach((keyword) => {
    if (n.includes(keyword)) {
      score += 10;
    }
  });

  const numbers = n.match(/\d{3,}/g);

  if (numbers) {
    score += numbers.length * 3;
  }

  const lines = text.split(/\r?\n/).filter((x) => x.trim());

  score += Math.min(lines.length, 20);

  return score;
}

async function runShodOcrMultiPass(dataUrl) {
  if (!window.Tesseract) {
    throw new Error("Tesseract.js belum dimuat.");
  }

  const candidates = [];

  const rotations = [0, 90, 180, 270];

  const thresholds = [false, true];

  for (const rotation of rotations) {
    for (const threshold of thresholds) {
      try {
        const processed = await prepareShodOcrImage(
          dataUrl,
          rotation,
          threshold,
        );

        const result = await Tesseract.recognize(processed, "eng", {
          logger: function (message) {},
        });

        const text = result?.data?.text || "";

        const words = result?.data?.words || [];

        const score = scoreShodOcrResult(text);

        candidates.push({
          rotation,
          threshold,
          score,
          text,
          words,
          confidence: Number(result?.data?.confidence || 0),
        });
      } catch (err) {
        console.warn("OCR candidate gagal:", rotation, threshold, err);
      }
    }
  }

  if (!candidates.length) {
    throw new Error("Semua proses OCR gagal.");
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.confidence - a.confidence;
  });

  return candidates[0];
}

function detectShodField(text) {
  const n = normalizeOcrWord(text);

  if (
    n.includes("persenan") ||
    n.includes("persen") ||
    n.includes("infaqir") ||
    n.includes("infakir") ||
    n.includes("shodaqohir") ||
    n.includes("shodakohir")
  ) {
    return "susulan_ir";
  }

  if (
    n.includes("sambung") ||
    n.includes("uangsambung") ||
    n.includes("shodaqohsambung") ||
    n.includes("shodakohsambung")
  ) {
    return "uang_sambung";
  }

  if (n.includes("jimpitan")) {
    return "jimpitan";
  }

  if (n.includes("siarsiar") || n.includes("siar")) {
    return "siar_siar";
  }

  if (n.includes("seribuan")) {
    return "seribuan";
  }

  if (n === "kf" || n.includes("kafan")) {
    return "kafan";
  }

  if (n === "mt" || n.includes("ukhromt") || n.includes("ukhro")) {
    return "ukhro_mt";
  }

  return null;
}

async function extractShodaqohWithAI() {
  if (!window.shodUploadedImage || !window.shodUploadedImage.dataUrl) {
    showToast("Pilih foto rekap terlebih dahulu.", "error");
    return;
  }

  const extractBtn = document.getElementById("shodUploadExtract");

  const originalText = extractBtn?.innerHTML;

  try {
    if (extractBtn) {
      extractBtn.disabled = true;

      extractBtn.innerHTML = `
        <span
          style="
            width:14px;
            height:14px;
            border:2px solid currentColor;
            border-right-color:transparent;
            border-radius:50%;
            display:inline-block;
            animation:spin .6s linear infinite;
          "
        ></span>

        <span>Menganalisis...</span>
      `;
    }

    const dataUrl = window.shodUploadedImage.dataUrl;

    const result = await callShodaqohAI(dataUrl);

    if (!result || !result.success) {
      throw new Error(result?.message || "AI gagal membaca foto.");
    }

    const data = result.data;

    applyShodaqohAIResult(data);

    showToast(
      "Data berhasil dibaca AI. Silakan periksa sebelum menyimpan.",
      "success",
    );
  } catch (err) {
    console.error("Gemini OCR gagal:", err);

    showToast(err.message || "Gagal membaca foto.", "error");
  } finally {
    if (extractBtn) {
      extractBtn.disabled = false;
      extractBtn.innerHTML = originalText;
    }
  }
}

function applyShodaqohAIResult(data) {
  const fieldMap = {
    total: "shodPaymentAmount",

    susulan_ir: "shod_susulan_ir",

    uang_sambung: "shod_uang_sambung",

    jimpitan: "shod_jimpitan",

    siar_siar: "shod_siar_siar",

    seribuan: "shod_seribuan",

    kafan: "shod_kafan",

    ukhro_mt: "shod_ukhro_mt",
  };

  Object.entries(fieldMap).forEach(([key, elementId]) => {
    const input = document.getElementById(elementId);

    if (!input) {
      console.warn("Field tidak ditemukan:", elementId);
      return;
    }

    const value = Number(data?.[key] || 0);

    input.value = value > 0 ? value : "";

    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );
  });

  const keterangan = document.getElementById("shodKeterangan");

  if (keterangan && data?.keterangan) {
    keterangan.value = data.keterangan;
  }

  const total = document.getElementById("shodPaymentAmount");

  if (total) {
    total.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );

    total.dispatchEvent(
      new Event("change", {
        bubbles: true,
      }),
    );
  }
}

async function callShodaqohAI(dataUrl) {
  const response = await fetch(CONFIG.WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "extractShodaqoh",
      dataUrl: dataUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server error: HTTP ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Gagal mengekstrak data dari foto.");
  }

  return result;
}

let chartState = {
  type: "saldo", // 'saldo' | 'infak_ir' | 'uang_sambung' | 'ukhro_mt'
  labels: [],
  data: [],
  colors: {
    saldo: "#10b981",
    infak_ir: "#3b82f6",
    uang_sambung: "#f59e0b",
    ukhro_mt: "#8b5cf6",
  },
  labelsMap: {
    saldo: "Saldo",
    infak_ir: "Infak IR",
    uang_sambung: "Uang Sambung",
    ukhro_mt: "Ukhro MT",
  },
  titlesMap: {
    saldo: "Tren Saldo Bulanan",
    infak_ir: "Tren Pemasukan Infak IR",
    uang_sambung: "Tren Pemasukan Uang Sambung",
    ukhro_mt: "Tren Pemasukan Ukhro MT",
  },
};

function truncateNameToThreeWords(name) {
  if (!name) return "";

  // Cari posisi kata "dan" (case insensitive)
  const danIndex = name.toLowerCase().indexOf(" dan ");

  // Jika ada kata "dan", ambil teks sebelum "dan"
  if (danIndex !== -1) {
    return name.substring(0, danIndex).trim();
  }

  // Jika tidak ada "dan", ambil 3 kata pertama (fallback)
  const words = name.trim().split(/\s+/);
  const firstThree = words.slice(0, 3);
  return firstThree.join(" ");
}
