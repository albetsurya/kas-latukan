function postShodaqohToKas() {
  if (!isAdminUser()) {
    showToast("Hanya admin yang dapat melakukan posting ke Kas.", "error");
    return;
  }

  const monthKey = state.shodaqoh.selectedMonth;
  if (!monthKey) {
    showToast("Pilih bulan terlebih dahulu.", "error");
    return;
  }

  const payments = state.shodaqoh.payments || [];
  const alreadyPosted =
    payments.length > 0 &&
    payments.every(function (p) {
      return String(p.kas_transaction_no || "").includes("POSTED");
    });

  if (alreadyPosted) {
    showToast("Bulan ini sudah diposting ke Kas Utama.", "error");
    return;
  }

  const totalPayments = payments.reduce(function (s, p) {
    return s + (p.total || 0);
  }, 0);

  if (totalPayments === 0) {
    showToast("Tidak ada pembayaran untuk bulan ini.", "error");
    return;
  }

  showPostConfirmModal(monthKey, totalPayments);
}

function showPostConfirmModal(monthKey, totalPayments) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "postConfirmOverlay";
  overlay.innerHTML = ` <div class="card modal-box p-5" style="max-width:400px;"> <div class="modal-icon" style="background:var(--gold-soft);color:var(--gold);"> <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <path d="M21 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" /> <polyline points="15 3 21 3 21 9" /> <line x1="9" y1="15" x2="21" y2="3" /> </svg> </div> <h3 class="font-display text-[16px] font-extrabold text-center mt-3"> Posting ke Kas Utama? </h3> <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5"> Semua pembayaran Infak Bulanan bulan <b>${getMonthLabel(monthKey)}</b> akan diposting ke Kas Utama. </p> <div class="mt-3 p-3 bg-[color:var(--surface-alt)] rounded-lg"> <p class="text-[10px] text-[color:var(--ink-faint)] font-bold uppercase tracking-wide"> Total yang akan diposting </p> <p class="mono text-[17px] font-extrabold text-center"> ${fmtRp(totalPayments)} </p> </div> <p class="text-[10.5px] text-[color:var(--ink-faint)] text-center mt-2"> Transaksi akan dibuat per kategori alokasi. </p> <div class="flex gap-2.5 pt-4"> <button type="button" data-post-action="close" class="btn-ghost flex-1" style="padding:12px 0;" > Batal </button> <button type="button" data-post-action="confirm" class="btn-primary flex-1" style="background:var(--gold);color:#fff;padding:12px 0;" > Lanjutkan </button> </div> </div> `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", async function (e) {
    e.stopPropagation();
    if (e.target === overlay) {
      const confirmButton = overlay.querySelector(
        '[data-post-action="confirm"]',
      );
      if (confirmButton && confirmButton.disabled) {
        return;
      }
      overlay.remove();
      return;
    }
    const action = e.target.closest("[data-post-action]");
    if (!action) return;
    if (action.dataset.postAction === "close") {
      if (action.disabled) return;
      overlay.remove();
      return;
    }
    if (action.dataset.postAction === "confirm") {
      if (action.disabled) return;
      const closeButton = overlay.querySelector('[data-post-action="close"]');
      const confirmButton = overlay.querySelector(
        '[data-post-action="confirm"]',
      );
      if (closeButton) {
        closeButton.disabled = true;
        closeButton.style.opacity = "0.6";
        closeButton.style.cursor = "not-allowed";
      }
      if (confirmButton) {
        setButtonLoading(confirmButton, true);
        confirmButton.disabled = true;
      }
      try {
        const res = await executePostToKas(monthKey);
        if (!res || !res.success) {
          throw new Error((res && res.message) || "Gagal melakukan posting.");
        }
        if (typeof refreshAllDataWithShodaqoh === "function") {
          await refreshAllDataWithShodaqoh();
        }
        showToast(res.message);
        await new Promise(function (resolve) {
          setTimeout(resolve, 350);
        });
        const confirmOverlay = document.getElementById("postConfirmOverlay");
        if (confirmOverlay) {
          confirmOverlay.remove();
        }
        if (res.details && res.details.length > 0) {
          showPostResultModal(res);
        }
      } catch (err) {
        showToast(err.message, "error");
        if (closeButton) {
          closeButton.disabled = false;
          closeButton.style.opacity = "";
          closeButton.style.cursor = "";
        }
        if (confirmButton) {
          setButtonLoading(confirmButton, false);
          confirmButton.disabled = false;
        }
      }
    }
  });
}

async function executePostToKas(monthKey) {
  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }
  const btn = $("btnShodPostToKas") || $("fabPostToKas");
  if (btn) {
    setButtonLoading(btn, true);
  }
  try {
    const res = await apiPost({
      action: "postShodaqohToKas",
      token: session.token,
      monthKey: monthKey,
    });
    if (!res.success) {
      throw new Error(res.message);
    }
    return res;
  } catch (err) {
    showToast(err.message, "error");
    throw err;
  } finally {
    if (btn) {
      setButtonLoading(btn, false);
    }
  }
}

function showPostResultModal(res) {
  const totalAmount = res.totalDebet || res.total || 0;
  let detailRows = "";

  if (res.details && res.details.length > 0) {
    detailRows = res.details
      .map(function (d) {
        const amount = d.debet || d.kredit || d.amount || 0;
        const account = d.account || d.keterangan || "Unknown";
        const type = d.debet > 0 ? "Debet" : d.kredit > 0 ? "Kredit" : "";

        return `
          <div class="flex items-center justify-between py-2 border-b border-[color:var(--line)] last:border-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium">${account}</span>
              ${type ? `<span class="text-[9px] text-[color:var(--ink-faint)]">${type}</span>` : ""}
            </div>
            <span class="mono text-xs font-bold">${fmtRp(amount)}</span>
          </div>
        `;
      })
      .join("");
  } else {
    detailRows = `
      <div class="flex items-center justify-between py-2">
        <span class="text-xs font-medium">Total Posting</span>
        <span class="mono text-xs font-bold">${fmtRp(totalAmount)}</span>
      </div>
    `;
  }

  const resultOverlay = document.createElement("div");
  resultOverlay.className = "modal-overlay";
  resultOverlay.id = "postResultOverlay";
  resultOverlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:400px;">
      <div class="modal-icon" style="background:var(--pos-soft);color:var(--pos);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 class="font-display text-[16px] font-extrabold text-center mt-3">
        Posting Berhasil!
      </h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        ${res.details && res.details.length > 0 ? res.details.length : 0} transaksi berhasil dibuat di Kas Utama:
      </p>
      <div class="mt-3 p-3 bg-[color:var(--surface-alt)] rounded-lg max-h-52 overflow-y-auto">
        ${detailRows}
      </div>
      <div class="flex items-center justify-between mt-3 pt-2 border-t border-[color:var(--line)]">
        <span class="text-xs font-bold">TOTAL DEBET</span>
        <span class="mono text-sm font-extrabold" style="color:var(--pos);">${fmtRp(totalAmount)}</span>
      </div>
      ${
        res.totalKredit
          ? `
      <div class="flex items-center justify-between mt-1 pt-1 border-b border-[color:var(--line)]">
        <span class="text-xs font-bold">TOTAL KREDIT</span>
        <span class="mono text-sm font-extrabold" style="color:var(--neg);">${fmtRp(res.totalKredit)}</span>
      </div>
      `
          : ""
      }
      <div class="flex items-center justify-between mt-1 pt-1">
        <span class="text-[9px] text-[color:var(--ink-faint)]">No. Transaksi</span>
        <span class="text-[9px] mono font-mono text-[color:var(--ink-faint)]">${res.transactionNo || "-"}</span>
      </div>
      <button type="button" id="btnResultClose" class="btn-primary w-full mt-4" style="padding:12px 0;">Tutup</button>
    </div>
  `;
  document.body.appendChild(resultOverlay);

  document
    .getElementById("btnResultClose")
    .addEventListener("click", function () {
      if (document.getElementById("postResultOverlay")) {
        document.getElementById("postResultOverlay").remove();
      }
    });

  resultOverlay.addEventListener("click", function (e) {
    if (e.target === resultOverlay) {
      if (document.getElementById("postResultOverlay")) {
        document.getElementById("postResultOverlay").remove();
      }
    }
  });
}

async function cancelPostShodaqohToKas() {
  if (!isAdminUser()) {
    showToast("Hanya admin yang dapat membatalkan posting ke Kas.", "error");
    return;
  }

  const monthKey = state.shodaqoh.selectedMonth;
  if (!monthKey) {
    showToast("Pilih bulan terlebih dahulu.", "error");
    return;
  }

  const payments = state.shodaqoh.payments || [];
  const isPosted = payments.some(function (p) {
    return String(p.kas_transaction_no || "").includes("POSTED");
  });

  if (!isPosted) {
    showToast("Bulan ini belum diposting ke Kas Utama.", "error");
    return;
  }

  showCancelPostConfirmModal(monthKey);
}

function showCancelPostConfirmModal(monthKey) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "cancelPostConfirmOverlay";
  overlay.innerHTML = ` <div class="card modal-box p-5" style="max-width:400px;"> <div class="modal-icon" style="background:var(--neg-soft);color:var(--neg);"> <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /> </svg> </div> <h3 class="font-display text-[16px] font-extrabold text-center mt-3"> Batalkan Posting ke Kas? </h3> <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5"> Seluruh transaksi Kas Utama hasil posting Shodaqoh bulan <b>${getMonthLabel(monthKey)}</b> akan dihapus dan status posting dikembalikan seperti semula. </p> <p class="text-[10.5px] text-[color:var(--ink-faint)] text-center mt-2"> Tindakan ini tidak dapat dibatalkan. </p> <div class="flex gap-2.5 pt-4"> <button type="button" data-cancel-post-action="close" class="btn-ghost flex-1" style="padding:12px 0;" > Batal </button> <button type="button" data-cancel-post-action="confirm" class="btn-primary flex-1" style="background:var(--neg);color:#fff;padding:12px 0;" > Ya, Batalkan </button> </div> </div> `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", async function (e) {
    e.stopPropagation();
    if (e.target === overlay) {
      const confirmButton = overlay.querySelector(
        '[data-cancel-post-action="confirm"]',
      );
      if (confirmButton && confirmButton.disabled) return;
      overlay.remove();
      return;
    }

    const action = e.target.closest("[data-cancel-post-action]");
    if (!action) return;

    if (action.dataset.cancelPostAction === "close") {
      if (action.disabled) return;
      overlay.remove();
      return;
    }

    if (action.dataset.cancelPostAction === "confirm") {
      if (action.disabled) return;

      const closeButton = overlay.querySelector(
        '[data-cancel-post-action="close"]',
      );
      const confirmButton = overlay.querySelector(
        '[data-cancel-post-action="confirm"]',
      );

      if (closeButton) {
        closeButton.disabled = true;
        closeButton.style.opacity = "0.6";
        closeButton.style.cursor = "not-allowed";
      }
      if (confirmButton) {
        setButtonLoading(confirmButton, true);
        confirmButton.disabled = true;
      }

      try {
        const res = await executeCancelPostToKas(monthKey);
        if (!res || !res.success) {
          throw new Error((res && res.message) || "Gagal membatalkan posting.");
        }

        if (typeof refreshAllDataWithShodaqoh === "function") {
          await refreshAllDataWithShodaqoh();
        }

        const confirmOverlay = document.getElementById(
          "cancelPostConfirmOverlay",
        );
        if (confirmOverlay) {
          confirmOverlay.remove();
        }

        showToast(res.message);

        if (res.details && res.details.length > 0) {
          showCancelPostResultModal(res, monthKey);
        } else {
          showCancelPostResultModal(
            {
              details: [],
              totalRemoved: res.totalRemoved || 0,
              transactionNo: res.transactionNo || "-",
              message: res.message || "Posting berhasil dibatalkan.",
            },
            monthKey,
          );
        }
      } catch (err) {
        showToast(err.message || "Terjadi kesalahan.", "error");
        if (closeButton) {
          closeButton.disabled = false;
          closeButton.style.opacity = "";
          closeButton.style.cursor = "";
        }
        if (confirmButton) {
          setButtonLoading(confirmButton, false);
          confirmButton.disabled = false;
        }
      }
    }
  });
}

async function executeCancelPostToKas(monthKey) {
  const session = typeof getSession === "function" ? getSession() : null;

  if (!session) {
    throw new Error("Sesi admin berakhir, silakan login ulang.");
  }

  const btn =
    typeof $ === "function"
      ? $("btnShodCancelPostToKas")
      : document.getElementById("btnShodCancelPostToKas");

  if (btn && typeof setButtonLoading === "function") {
    setButtonLoading(btn, true);
  }

  try {
    const res = await apiPost({
      action: "cancelPostShodaqohToKas",
      token: session.token,
      monthKey: monthKey,
    });

    if (!res || !res.success) {
      throw new Error((res && res.message) || "Gagal membatalkan posting.");
    }

    return res;
  } catch (err) {
    throw err;
  } finally {
    if (btn && typeof setButtonLoading === "function") {
      setButtonLoading(btn, false);
    }
  }
}

function showCancelPostResultModal(res, monthKey) {
  const totalRemoved = res.totalRemoved || res.total || 0;

  let detailRows = "";

  if (res.details && res.details.length > 0) {
    detailRows = res.details
      .map(function (d) {
        const amount = d.debet || d.kredit || d.amount || 0;
        const account = d.account || d.keterangan || "Unknown";
        const type = d.debet > 0 ? "Debet" : d.kredit > 0 ? "Kredit" : "";

        return `
          <div class="flex items-center justify-between py-2 border-b border-[color:var(--line)] last:border-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium">${escapeHtml(account)}</span>
              ${type ? `<span class="text-[9px] text-[color:var(--ink-faint)]">${escapeHtml(type)}</span>` : ""}
            </div>
            <span class="mono text-xs font-bold" style="color:var(--neg);">-${fmtRp(amount)}</span>
          </div>
        `;
      })
      .join("");
  } else {
    detailRows = `
      <div class="flex items-center justify-between py-2">
        <span class="text-xs font-medium">Total Transaksi Dihapus</span>
        <span class="mono text-xs font-bold" style="color:var(--neg);">-${fmtRp(totalRemoved)}</span>
      </div>
    `;
  }

  const resultOverlay = document.createElement("div");
  resultOverlay.className = "modal-overlay";
  resultOverlay.id = "cancelPostResultOverlay";
  resultOverlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:400px;">
      <div class="modal-icon" style="background:var(--warning-soft);color:var(--warning);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v4M12 17h.01" />
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        </svg>
      </div>
      <h3 class="font-display text-[16px] font-extrabold text-center mt-3">
        Posting Berhasil Dibatalkan!
      </h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Transaksi Kas Utama untuk bulan <b>${getMonthLabel(monthKey)}</b> telah dihapus:
      </p>
      <div class="mt-3 p-3 bg-[color:var(--surface-alt)] rounded-lg max-h-52 overflow-y-auto">
        ${detailRows}
      </div>
      <div class="flex items-center justify-between mt-3 pt-2 border-t border-[color:var(--line)]">
        <span class="text-xs font-bold">TOTAL DIHAPUS</span>
        <span class="mono text-sm font-extrabold" style="color:var(--neg);">-${fmtRp(totalRemoved)}</span>
      </div>
      ${
        res.transactionNo
          ? `
      <div class="flex items-center justify-between mt-1 pt-1">
        <span class="text-[9px] text-[color:var(--ink-faint)]">No. Transaksi</span>
        <span class="text-[9px] mono font-mono text-[color:var(--ink-faint)]">${escapeHtml(res.transactionNo)}</span>
      </div>
      `
          : ""
      }
      <div class="mt-4 flex gap-2.5">
        <button type="button" id="btnCancelResultClose" class="btn-primary flex-1" style="padding:12px 0;">Tutup</button>
      </div>
    </div>
  `;
  document.body.appendChild(resultOverlay);

  document
    .getElementById("btnCancelResultClose")
    .addEventListener("click", function () {
      const modal = document.getElementById("cancelPostResultOverlay");
      if (modal) {
        modal.remove();
      }
    });

  resultOverlay.addEventListener("click", function (e) {
    if (e.target === resultOverlay) {
      const modal = document.getElementById("cancelPostResultOverlay");
      if (modal) {
        modal.remove();
      }
    }
  });

  const escHandler = function (e) {
    if (e.key === "Escape") {
      const modal = document.getElementById("cancelPostResultOverlay");
      if (modal) {
        modal.remove();
      }
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
}
