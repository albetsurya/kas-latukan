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
  overlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:400px;">
      <div class="modal-icon" style="background:var(--gold-soft);color:var(--gold);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="9" y1="15" x2="21" y2="3" />
        </svg>
      </div>
      <h3 class="font-display text-[16px] font-extrabold text-center mt-3">
        Posting ke Kas Utama?
      </h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Semua pembayaran Infak Bulanan bulan <b>${getMonthLabel(monthKey)}</b> akan diposting ke Kas Utama.
      </p>
      <div class="mt-3 p-3 bg-[color:var(--surface-alt)] rounded-lg">
        <p class="text-[10px] text-[color:var(--ink-faint)] font-bold uppercase tracking-wide">Total yang akan diposting</p>
        <p class="mono text-[17px] font-extrabold text-center">${fmtRp(totalPayments)}</p>
      </div>
      <p class="text-[10.5px] text-[color:var(--ink-faint)] text-center mt-2">
        Transaksi akan dibuat per kategori alokasi.
      </p>
      <div class="flex gap-2.5 pt-4">
        <button type="button" id="btnPostCancel" class="btn-ghost flex-1" style="padding:12px 0;">Batal</button>
        <button type="button" id="btnPostConfirm" class="btn-primary flex-1" style="background:var(--gold);color:#fff;padding:12px 0;">Lanjutkan</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeModal = function () {
    if (document.getElementById("postConfirmOverlay")) {
      document.getElementById("postConfirmOverlay").remove();
    }
  };

  document
    .getElementById("btnPostCancel")
    .addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  document
    .getElementById("btnPostConfirm")
    .addEventListener("click", async function () {
      closeModal();
      await executePostToKas(monthKey);
    });
}

async function executePostToKas(monthKey) {
  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  const btn = $("btnShodPostToKas") || $("fabPostToKas");

  setButtonLoading(btn, true);

  try {
    const res = await apiPost({
      action: "postShodaqohToKas",
      token: session.token,
      monthKey: monthKey,
    });

    if (!res.success) throw new Error(res.message);

    showToast(res.message);

    if (res.details && res.details.length > 0) {
      showPostResultModal(res);
    }

    // Refresh semua data (kas + shodaqoh)
    await refreshAllDataWithShodaqoh();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

function showPostResultModal(res) {
  // Gunakan totalDebet dari response
  const totalAmount = res.totalDebet || res.total || 0;

  // Buat detail rows dari results
  let detailRows = "";

  if (res.details && res.details.length > 0) {
    detailRows = res.details
      .map(function (d) {
        // Ambil nilai debet atau kredit (mana yang > 0)
        const amount = d.debet || d.kredit || d.amount || 0;
        const account = d.account || d.keterangan || "Unknown";
        // Tampilkan tipe transaksi
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
    // Jika tidak ada details, tampilkan total saja
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
