var zakatDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

var zakatEditDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

function initZakatDatePicker() {
  var dropdown = document.getElementById("zakatDateDropdown");
  var trigger = document.getElementById("zakatDateDropdownTrigger");
  var valueDisplay = document.getElementById("zakatDateDropdownValue");
  var menu = document.getElementById("zakatDateDropdownMenu");
  var hiddenInput = document.getElementById("zakatFormTanggal");

  if (dropdown && trigger && valueDisplay && menu && hiddenInput) {
    if (typeof zakatDatePickerState === "undefined") {
      zakatDatePickerState = {
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        selectedDate: null,
      };
    }

    // Hormati tanggal yang sudah ada (mode edit); default hari ini.
    var initial = zakatParseIsoDate_(hiddenInput.value) || new Date();
    valueDisplay.textContent = formatDateDisplay(initial);
    hiddenInput.value = formatDateInput(initial);
    zakatDatePickerState.selectedDate = initial;
    zakatDatePickerState.currentMonth = initial.getMonth();
    zakatDatePickerState.currentYear = initial.getFullYear();

    renderZakatDatePickerMenu(
      dropdown,
      menu,
      valueDisplay,
      hiddenInput,
      zakatDatePickerState,
    );

    var newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    var newTriggerElement = document.getElementById("zakatDateDropdownTrigger");
    if (newTriggerElement) {
      newTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleZakatDatePicker(dropdown);
      });
    }
  }

  var editDropdown = document.getElementById("zakatEditDateDropdown");
  var editTrigger = document.getElementById("zakatEditDateDropdownTrigger");
  var editValueDisplay = document.getElementById("zakatEditDateDropdownValue");
  var editMenu = document.getElementById("zakatEditDateDropdownMenu");
  var editHiddenInput = document.getElementById("zakatEditHeaderTanggal");

  if (
    editDropdown &&
    editTrigger &&
    editValueDisplay &&
    editMenu &&
    editHiddenInput
  ) {
    if (typeof zakatEditDatePickerState === "undefined") {
      zakatEditDatePickerState = {
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        selectedDate: null,
      };
    }

    // Hormati tanggal yang sudah ada (mode edit); default hari ini.
    var editInitial = zakatParseIsoDate_(editHiddenInput.value) || new Date();
    editValueDisplay.textContent = formatDateDisplay(editInitial);
    editHiddenInput.value = formatDateInput(editInitial);
    zakatEditDatePickerState.selectedDate = editInitial;
    zakatEditDatePickerState.currentMonth = editInitial.getMonth();
    zakatEditDatePickerState.currentYear = editInitial.getFullYear();

    renderZakatDatePickerMenu(
      editDropdown,
      editMenu,
      editValueDisplay,
      editHiddenInput,
      zakatEditDatePickerState,
    );

    var newEditTrigger = editTrigger.cloneNode(true);
    editTrigger.parentNode.replaceChild(newEditTrigger, editTrigger);

    var newEditTriggerElement = document.getElementById(
      "zakatEditDateDropdownTrigger",
    );
    if (newEditTriggerElement) {
      newEditTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleZakatDatePicker(editDropdown);
      });
    }

    if (!window.__zakatEditDdBound) {
      window.__zakatEditDdBound = true;
      document.addEventListener("click", function (e) {
        var dd = document.getElementById("zakatEditDateDropdown");
        if (dd && !dd.contains(e.target)) {
          dd.classList.remove("open");
          var trig = document.getElementById("zakatEditDateDropdownTrigger");
          if (trig) trig.setAttribute("aria-expanded", "false");
          removeZakatDatePickerBackdrop();
        }
      });
    }
  }
}

/** Parse "YYYY-MM-DD" -> Date lokal (null bila invalid). */
function zakatParseIsoDate_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null;
  }
  return d;
}

function renderZakatDatePickerMenu(
  dropdown,
  menu,
  valueDisplay,
  hiddenInput,
  state,
) {
  if (!menu || !dropdown) return;

  const pickerState = state || zakatDatePickerState;
  const year = pickerState.currentYear;
  const month = pickerState.currentMonth;

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
      pickerState.selectedDate &&
      pickerState.selectedDate.getDate() === i &&
      pickerState.selectedDate.getMonth() === month &&
      pickerState.selectedDate.getFullYear() === year;

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

  const currentDate = pickerState.selectedDate;
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
        class="date-picker-manual-input"
        placeholder="dd-mm-yyyy"
        value="${currentDateStr}"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" class="date-picker-apply">
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

  const manualInput = menu.querySelector(".date-picker-manual-input");
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
        applyZakatManualDate(
          this.value,
          dropdown,
          valueDisplay,
          hiddenInput,
          pickerState,
        );
      }
      if (e.key === "Escape") {
        closeZakatDatePicker(dropdown);
      }
    });
  }

  const applyBtn = menu.querySelector(".date-picker-apply");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const input = this.closest(".date-picker-input-wrap").querySelector(
        ".date-picker-manual-input",
      );
      if (input) {
        applyZakatManualDate(
          input.value,
          dropdown,
          valueDisplay,
          hiddenInput,
          pickerState,
        );
      }
    });
  }

  menu.querySelectorAll(".date-picker-nav").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const direction = this.dataset.direction;
      if (direction === "prev") {
        pickerState.currentMonth--;
        if (pickerState.currentMonth < 0) {
          pickerState.currentMonth = 11;
          pickerState.currentYear--;
        }
      } else {
        pickerState.currentMonth++;
        if (pickerState.currentMonth > 11) {
          pickerState.currentMonth = 0;
          pickerState.currentYear++;
        }
      }
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        pickerState,
      );
    });
  });

  menu.querySelectorAll(".date-picker-day").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const day = parseInt(this.dataset.day);
      const month = parseInt(this.dataset.month);
      const year = parseInt(this.dataset.year);
      const date = new Date(year, month, day);
      selectZakatDate(date, dropdown, valueDisplay, hiddenInput, pickerState);
    });
  });

  const todayBtn = menu.querySelector(".date-picker-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const today = new Date();
      selectZakatDate(today, dropdown, valueDisplay, hiddenInput, pickerState);
    });
  }

  const clearBtn = menu.querySelector(".date-picker-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      clearZakatDate(dropdown, valueDisplay, hiddenInput, pickerState);
    });
  }

  setTimeout(function () {
    const rect = dropdown.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (menuRect.bottom > viewportHeight - 20) {
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 8px)";
      menu.style.maxHeight =
        Math.min(280, viewportHeight - rect.top - 40) + "px";
    }

    if (menuRect.top < 20) {
      menu.style.top = "calc(100% + 8px)";
      menu.style.bottom = "auto";
      menu.style.maxHeight =
        Math.min(280, viewportHeight - rect.bottom - 40) + "px";
    }
  }, 50);
}

function toggleZakatDatePicker(dropdown) {
  if (!dropdown) return;

  var isOpen = dropdown.classList.contains("open");
  var trigger = dropdown.querySelector(".filter-dropdown-trigger");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      var trig = el.querySelector(".filter-dropdown-trigger");
      if (trig) trig.setAttribute("aria-expanded", "false");
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");

    var menu = dropdown.querySelector(".filter-dropdown-menu");
    var valueDisplay = dropdown.parentElement?.querySelector(
      ".filter-dropdown-value",
    );
    var hiddenInput = dropdown.parentElement?.querySelector(
      'input[type="hidden"]',
    );

    if (menu) {
      var state =
        dropdown.id === "zakatDateDropdown"
          ? zakatDatePickerState
          : zakatEditDatePickerState;

      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        state,
      );
    }

    adjustDatePickerPosition(dropdown);

    setTimeout(function () {
      var manualInput = dropdown.querySelector(".date-picker-manual-input");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 150);

    if (window.innerWidth <= 480) {
      addZakatDatePickerBackdrop(dropdown);
    }
  }
}

function selectZakatDate(date, dropdown, valueDisplay, hiddenInput, state) {
  if (!date || isNaN(date.getTime())) return;

  state.selectedDate = date;
  state.currentMonth = date.getMonth();
  state.currentYear = date.getFullYear();

  if (valueDisplay) {
    valueDisplay.textContent = formatDateDisplay(date);
  }

  if (hiddenInput) {
    hiddenInput.value = formatDateInput(date);
  }

  closeZakatDatePicker(dropdown);

  if (hiddenInput) {
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
    hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function applyZakatManualDate(
  dateStr,
  dropdown,
  valueDisplay,
  hiddenInput,
  state,
) {
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
  selectZakatDate(date, dropdown, valueDisplay, hiddenInput, state);
}

function adjustDatePickerPosition(dropdown) {
  const menu = dropdown.querySelector(".filter-dropdown-menu");
  if (!menu) return;

  setTimeout(function () {
    const rect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownRect = dropdown.getBoundingClientRect();

    menu.style.top = "";
    menu.style.bottom = "";
    menu.style.maxHeight = "";

    if (rect.bottom > viewportHeight - 10) {
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 4px)";
      menu.style.maxHeight = Math.min(320, dropdownRect.top - 20) + "px";
    } else {
      menu.style.top = "calc(100% + 4px)";
      menu.style.bottom = "auto";
      const availableHeight = viewportHeight - rect.top - 20;
      if (availableHeight < 200) {
        menu.style.maxHeight = Math.min(320, availableHeight) + "px";
      }
    }
  }, 50);
}

function clearZakatDate(dropdown, valueDisplay, hiddenInput, state) {
  if (valueDisplay) valueDisplay.textContent = "Pilih tanggal";
  if (hiddenInput) hiddenInput.value = "";
  state.selectedDate = null;
  closeZakatDatePicker(dropdown);
}

function truncateNameToThreeWords(name) {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  const firstThree = words.slice(0, 3);
  return firstThree.join(" ");
}

function closeZakatDatePicker(dropdown) {
  if (!dropdown) return;
  dropdown.classList.remove("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
  removeZakatDatePickerBackdrop();
}

function addZakatDatePickerBackdrop(dropdown) {
  removeZakatDatePickerBackdrop();
  const backdrop = document.createElement("div");
  backdrop.id = "zakatDatePickerBackdrop";
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease;
  `;
  backdrop.addEventListener("click", function () {
    closeZakatDatePicker(dropdown);
  });
  document.body.appendChild(backdrop);
}

function removeZakatDatePickerBackdrop() {
  const backdrop = document.getElementById("zakatDatePickerBackdrop");
  if (backdrop) backdrop.remove();
}
