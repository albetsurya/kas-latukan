function renderChart() {
  const ctx = document.getElementById("saldoChart");
  if (!ctx) {
    console.warn("⚠️ saldoChart canvas not found");
    return;
  }

  ctx.style.display = "block";

  let chartWrapper = document.getElementById("chartWrapper");
  if (!chartWrapper) {
    const parent = ctx.closest(".card");
    if (parent) {
      parent.id = "chartWrapper";
      chartWrapper = parent;
    }
  }

  if (chartWrapper) {
    const skeleton = chartWrapper.querySelector(".chart-skeleton");
    if (skeleton) skeleton.remove();
  }

  const chartData = getChartData(chartState.type);
  const labels = chartData.labels;
  const data = chartData.data;
  const color = chartState.colors[chartState.type] || "#10b981";
  const label = chartState.labelsMap[chartState.type] || "Saldo";
  const title = chartState.titlesMap[chartState.type] || "Tren Saldo Bulanan";

  const titleEl = document.getElementById("chartTitle");
  if (titleEl) {
    titleEl.textContent = title;
  }

  const legendDot = document.getElementById("chartLegendDot");
  const legendLabel = document.getElementById("chartLegendLabel");
  if (legendDot) legendDot.style.background = color;
  if (legendLabel) legendLabel.textContent = label;

  const scopeLabel = document.getElementById("chartScopeLabel");
  if (scopeLabel) {
    const monthCount = labels.length;
    scopeLabel.textContent =
      monthCount > 0 ? `${monthCount} bulan` : "seluruh periode";
  }

  if (!labels.length) {
    const now = new Date();
    const currentMonthKey =
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    labels.push(getMonthShortLabel(currentMonthKey));
    data.push(0);
  }

  const lastValue = data[data.length - 1] || 0;
  const firstValue = data[0] || 0;
  const change =
    firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  const lastValueEl = document.getElementById("chartLastValue");
  if (lastValueEl) {
    lastValueEl.textContent = fmtRp(lastValue);
  }

  const changeEl = document.getElementById("chartChange");
  if (changeEl) {
    if (change > 0) {
      changeEl.textContent = `▲ +${change.toFixed(1)}%`;
      changeEl.style.color = "var(--pos)";
    } else if (change < 0) {
      changeEl.textContent = `▼ ${change.toFixed(1)}%`;
      changeEl.style.color = "var(--neg)";
    } else {
      changeEl.textContent = "▬ 0%";
      changeEl.style.color = "var(--ink-soft)";
    }
  }

  const dark = currentTheme() === "dark";
  const tickColor = dark ? "#475569" : "#94a3b8";
  const gridColor = dark ? "rgba(71,85,105,0.15)" : "rgba(148,163,184,0.12)";

  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 160);
  const gradientColor1 = dark ? `${color}40` : `${color}25`;
  const gradientColor2 = dark ? `${color}05` : `${color}02`;
  gradient.addColorStop(0, gradientColor1);
  gradient.addColorStop(1, gradientColor2);

  if (state.chart) {
    try {
      state.chart.destroy();
    } catch (e) {
      console.warn("Chart destroy error:", e);
    }
    state.chart = null;
  }

  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
          borderColor: color,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          pointBorderColor: dark ? "#1e293b" : "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: dark
            ? "rgba(30,41,59,0.92)"
            : "rgba(255,255,255,0.92)",
          titleColor: dark ? "#f1f5f9" : "#0f172a",
          bodyColor: dark ? "#e2e8f0" : "#334155",
          borderColor: dark ? "rgba(71,85,105,0.2)" : "rgba(148,163,184,0.2)",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: function (context) {
              return fmtRp(context.parsed.y);
            },
            title: function (items) {
              return items[0].label;
            },
          },
        },
      },
      scales: {
        x: {
          type: "category",
          ticks: {
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
            font: {
              size: 8,
              weight: "500",
            },
            color: tickColor,
            padding: 4,
          },
          grid: {
            display: false,
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
        y: {
          display: true,
          position: "right",
          ticks: {
            font: {
              size: 8,
              weight: "500",
            },
            color: tickColor,
            padding: 6,
            maxTicksLimit: 6,
            callback: function (value) {
              if (value >= 1000000) return (value / 1000000).toFixed(0) + "jt";
              if (value >= 1000) return (value / 1000).toFixed(0) + "rb";
              return value.toFixed(0);
            },
          },
          grid: {
            color: gridColor,
            drawBorder: false,
            lineWidth: 0.8,
          },
          border: {
            display: false,
          },
        },
      },
      elements: {
        line: {
          tension: 0.4,
        },
        point: {
          hoverRadius: 6,
        },
      },
      animation: {
        duration: 800,
        easing: "easeOutQuart",
      },
    },
  });

  ctx.style.display = "block";

  console.log("✅ Chart rendered with type:", chartState.type);
}

function resizeChart() {
  if (state.chart) {
    try {
      state.chart.resize();
    } catch (e) {
      console.warn("Chart resize error:", e);
    }
  }
}

function renderChartWhenVisible() {
  const screen = document.getElementById("screen-home");
  const canvas = document.getElementById("saldoChart");
  if (!screen || !canvas) return;

  if (!state.transactions || !state.transactions.length) {
    return;
  }

  const isVisible =
    screen.classList.contains("active") &&
    screen.offsetParent !== null &&
    canvas.offsetParent !== null;

  if (!isVisible) {
    requestAnimationFrame(renderChartWhenVisible);
    return;
  }

  const parent = canvas.parentElement;
  if (parent && (parent.clientWidth < 50 || parent.clientHeight < 50)) {
    requestAnimationFrame(renderChartWhenVisible);
    return;
  }

  renderChart();
  requestAnimationFrame(function () {
    resizeChart();
  });
}

function showChartSkeleton() {
  const canvas = document.getElementById("saldoChart");
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;

  if (parent.querySelector(".chart-skeleton")) return;

  canvas.style.display = "none";

  const sk = document.createElement("div");
  sk.className = "chart-skeleton";

  sk.innerHTML = `
    <div class="chart-skeleton-grid">
      <div class="chart-skeleton-grid-line"></div>
      <div class="chart-skeleton-grid-line"></div>
      <div class="chart-skeleton-grid-line"></div>
      <div class="chart-skeleton-grid-line"></div>
    </div>
    <div class="chart-skeleton-wave">
      <svg viewBox="0 0 300 100" preserveAspectRatio="none">
        <g class="wave-group">
          <path class="wave-path" d="M 5 75 Q 35 40, 65 60 T 125 50 T 185 35 T 245 55 T 295 30" />
          <circle class="wave-dot" cx="5"   cy="75" r="3" />
          <circle class="wave-dot" cx="65"  cy="60" r="3" />
          <circle class="wave-dot" cx="125" cy="50" r="3" />
          <circle class="wave-dot" cx="185" cy="35" r="3" />
          <circle class="wave-dot" cx="245" cy="55" r="3" />
          <circle class="wave-dot" cx="295" cy="30" r="3" />
        </g>
      </svg>
    </div>
  `;

  parent.appendChild(sk);
}

function hideChartSkeleton() {
  const canvas = document.getElementById("saldoChart");
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;

  const sk = parent.querySelector(".chart-skeleton");
  if (sk) sk.remove();

  canvas.style.display = "block";
}

function getChartData(type) {
  const months = [
    ...new Set(state.transactions.map((t) => getMonthKey(t.tanggal))),
  ]
    .filter(Boolean)
    .sort();

  const labels = [];
  const data = [];

  const accountMap = {
    infak_ir: [
      "INFAK IR",
      "PEMASUKAN INFAK IR",
      "INFAQ IR",
      "INFAK IR (SUSULAN)",
    ],
    uang_sambung: [
      "UANG SAMBUNG",
      "PEMASUKAN UANG SAMBUNG",
      "INFAK SAMBUNG",
      "PEMASUKAN INFAK SAMBUNG",
    ],
    ukhro_mt: ["UKHRO MT", "PEMASUKAN UKHRO MT", "UKHRO"],
  };

  months.forEach((m) => {
    const monthTx = state.transactions.filter(
      (t) => getMonthKey(t.tanggal) === m,
    );
    if (!monthTx.length) return;

    let value = 0;

    if (type === "saldo") {
      const lastTx = monthTx[monthTx.length - 1];
      value = lastTx ? lastTx.saldo || 0 : 0;
    } else {
      const accountList = accountMap[type] || [];
      value = monthTx
        .filter((t) => {
          const account = (t.account || "").toUpperCase().trim();
          return accountList.some(
            (acc) => account === acc || account.includes(acc),
          );
        })
        .reduce((sum, t) => sum + (t.debet || 0), 0);
    }

    labels.push(getMonthShortLabel(m));
    data.push(value);
  });

  return { labels, data };
}

function initChartFilterDropdown() {
  const dropdown = document.getElementById("chartFilterDropdown");
  const trigger = document.getElementById("chartFilterTrigger");
  const valueDisplay = document.getElementById("chartFilterValue");
  const menu = document.getElementById("chartFilterMenu");

  if (!dropdown || !trigger || !valueDisplay || !menu) return;

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
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
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });

  menu.querySelectorAll(".filter-dropdown-option").forEach(function (option) {
    option.addEventListener("click", function (e) {
      e.stopPropagation();
      const type = this.dataset.chartType;
      const label = this.textContent.trim();

      menu.querySelectorAll(".filter-dropdown-option").forEach(function (el) {
        el.classList.remove("active");
        el.setAttribute("aria-selected", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-selected", "true");

      valueDisplay.textContent = label;

      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");

      chartState.type = type;

      const canvas = document.getElementById("saldoChart");
      if (canvas) {
        canvas.style.display = "block";
        const parent = canvas.parentElement;
        if (parent) {
          parent.style.height = "160px";
          parent.style.position = "relative";
        }
      }

      requestAnimationFrame(function () {
        renderChartWhenVisible();
      });

      console.log("🔄 Chart type changed to:", type);
    });
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("resize", function () {
    resizeChart();
  });

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      requestAnimationFrame(function () {
        renderChartWhenVisible();
      });
    }
  });
}
