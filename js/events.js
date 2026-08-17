// events.js
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  if ($("btnTheme")) {
    $("btnTheme").addEventListener("click", () =>
      applyTheme(currentTheme() === "dark" ? "light" : "dark"),
    );
  }

  if ($("themeLightBtn"))
    $("themeLightBtn").addEventListener("click", () => applyTheme("light"));

  if ($("themeDarkBtn"))
    $("themeDarkBtn").addEventListener("click", () => applyTheme("dark"));

  if ($("btnRefresh")) {
    $("btnRefresh").addEventListener("click", () => {
      $("btnRefresh").classList.add("spin");
      loadData().finally(() =>
        setTimeout(() => $("btnRefresh").classList.remove("spin"), 400),
      );
    });
  }

  if ($("searchInput"))
    $("searchInput").addEventListener("input", applyFilters);

  if ($("btnSeeAll"))
    $("btnSeeAll").addEventListener("click", () => switchTab("history"));

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  if ($("btnPrint")) {
    $("btnPrint").addEventListener("click", () => {
      const monthKey = state.selectedMonth;
      const scope = computeScope(monthKey);

      if ($("printPeriod"))
        $("printPeriod").textContent = "Periode: " + getMonthLabel(monthKey);

      buildPrintTable(scope.list);

      if ($("printTotalDebet"))
        $("printTotalDebet").textContent = fmtRp(scope.debet);

      if ($("printTotalKredit"))
        $("printTotalKredit").textContent = fmtRp(scope.kredit);

      if ($("printTotalSaldo"))
        $("printTotalSaldo").textContent = fmtRp(scope.akhir);

      fitPrintToOnePage();
      window.print();
    });
  }

  window.addEventListener("afterprint", () => {
    document.documentElement.style.setProperty("--print-scale", "1");
  });

  if ($("btnLogout")) {
    $("btnLogout").addEventListener("click", () => {
      const session = getSession();

      if (session && session.token) {
        apiPost({
          action: "logout",
          token: session.token,
        }).catch(() => {});
      }

      clearSession();
      document.documentElement.classList.remove("authenticated");
      document.documentElement.classList.add("auth-locked");
      $("shell")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
      $("authForm")?.reset();
      showToast("Berhasil keluar.");
    });
  }

  if ($("segDebet"))
    $("segDebet").addEventListener("click", () => setTxJenis("debet"));

  if ($("segKredit"))
    $("segKredit").addEventListener("click", () => setTxJenis("kredit"));

  if ($("fabAdd")) {
    $("fabAdd").addEventListener("click", () => {
      if (state.isAdmin !== true) return;

      if (state.activeTab === "shodaqoh") {
        openShodaqohPaymentForm(null);
        return;
      }

      state.editingNo = null;

      if ($("txSheetTitle")) $("txSheetTitle").textContent = "Tambah Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Simpan";
      $("txError")?.classList.add("hidden");
      $("txForm")?.reset();
      setTxJenis("debet");

      if ($("txTanggal")) $("txTanggal").valueAsDate = new Date();
      $("txOverlay")?.classList.remove("hidden");
    });
  }

  if ($("btnCancelTx")) {
    $("btnCancelTx").addEventListener("click", () => {
      state.editingNo = null;
      $("txOverlay")?.classList.add("hidden");
    });
  }

  if ($("txOverlay")) {
    $("txOverlay").addEventListener("click", (e) => {
      if (e.target === $("txOverlay")) {
        $("txOverlay").classList.add("hidden");
      }
    });
  }

  if ($("txForm")) {
    $("txForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const jumlah = Number($("txJumlah").value);

      if (!jumlah || jumlah <= 0) {
        $("txError").textContent = "Jumlah nominal harus lebih dari 0.";
        $("txError").classList.remove("hidden");
        return;
      }

      if (state.isAdmin !== true) {
        $("txError").textContent =
          "Hanya admin yang dapat menyimpan transaksi.";
        $("txError").classList.remove("hidden");
        return;
      }

      const session = getSession();

      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        $("txOverlay").classList.add("hidden");
        setAdminUI(false);
        return;
      }

      const isEditing = state.editingNo !== null;

      $("btnSubmitTx").disabled = true;
      $("btnSubmitTx").textContent = isEditing ? "Memperbarui…" : "Menyimpan…";

      try {
        const payload = {
          action: isEditing ? "editTransaction" : "addTransaction",
          token: session.token,
          tanggal: $("txTanggal").value,
          account: $("txAccount").value.trim(),
          keterangan: $("txKeterangan").value.trim(),
          jenis: state.txJenis,
          jumlah,
        };

        if (isEditing) payload.no = state.editingNo;

        const res = await apiPost(payload);

        if (!res.success) {
          $("txError").textContent =
            res.message || "Gagal menyimpan transaksi.";
          $("txError").classList.remove("hidden");
          return;
        }

        $("txOverlay").classList.add("hidden");
        showToast(
          isEditing
            ? "Transaksi berhasil diperbarui."
            : "Transaksi berhasil ditambahkan.",
        );

        state.editingNo = null;
        await loadData();
      } catch (err) {
        $("txError").textContent =
          "Tidak dapat menghubungi server: " + err.message;
        $("txError").classList.remove("hidden");
      } finally {
        $("btnSubmitTx").disabled = false;
        $("btnSubmitTx").textContent = isEditing ? "Update" : "Simpan";
      }
    });
  }

  function openTxActionSheet(no) {
    const tx = state.transactions.find((t) => String(t.no) === String(no));
    if (!tx) return;

    state.actionNo = tx.no;

    if ($("txActionSubtitle")) {
      $("txActionSubtitle").textContent =
        fmtDateShort(tx.tanggal) + " · " + tx.account;
    }

    $("txActionOverlay")?.classList.remove("hidden");
  }

  function closeTxActionSheet() {
    $("txActionOverlay")?.classList.add("hidden");
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".tx-card-clickable");
    if (!card) return;
    openTxActionSheet(card.dataset.no);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest && e.target.closest(".tx-card-clickable");
    if (!card) return;
    e.preventDefault();
    openTxActionSheet(card.dataset.no);
  });

  if ($("btnActionCancel"))
    $("btnActionCancel").addEventListener("click", closeTxActionSheet);

  if ($("txActionOverlay")) {
    $("txActionOverlay").addEventListener("click", (e) => {
      if (e.target === $("txActionOverlay")) {
        closeTxActionSheet();
      }
    });
  }

  if ($("btnActionEdit")) {
    $("btnActionEdit").addEventListener("click", () => {
      const no = state.actionNo;
      const tx = state.transactions.find((t) => String(t.no) === String(no));

      closeTxActionSheet();
      if (!tx) return;

      state.editingNo = tx.no;

      if ($("txSheetTitle")) $("txSheetTitle").textContent = "Edit Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Update";
      $("txError")?.classList.add("hidden");

      $("txTanggal").value = tx.tanggal;
      $("txAccount").value = tx.account;
      $("txKeterangan").value = tx.keterangan;
      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;
      setTxJenis(tx.debet > 0 ? "debet" : "kredit");

      $("txOverlay")?.classList.remove("hidden");
    });
  }

  if ($("btnActionDuplicate")) {
    $("btnActionDuplicate").addEventListener("click", () => {
      const no = state.actionNo;
      const tx = state.transactions.find((t) => String(t.no) === String(no));

      closeTxActionSheet();
      if (!tx) return;

      state.editingNo = null;

      if ($("txSheetTitle"))
        $("txSheetTitle").textContent = "Duplikasi Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Simpan";
      $("txError")?.classList.add("hidden");

      $("txTanggal").value = tx.tanggal;
      $("txAccount").value = tx.account;
      $("txKeterangan").value = tx.keterangan;
      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;
      setTxJenis(tx.debet > 0 ? "debet" : "kredit");

      $("txOverlay")?.classList.remove("hidden");
    });
  }

  function closeCarryForwardConfirm() {
    $("carryForwardOverlay")?.classList.add("hidden");
    state.carryForwardMonth = null;
    state.carryForwardNextMonth = null;
  }

  if ($("btnCarryForwardCancel")) {
    $("btnCarryForwardCancel").addEventListener(
      "click",
      closeCarryForwardConfirm,
    );
  }

  if ($("carryForwardOverlay")) {
    $("carryForwardOverlay").addEventListener("click", (event) => {
      if (event.target === $("carryForwardOverlay")) {
        closeCarryForwardConfirm();
      }
    });
  }

  if ($("btnCarryForwardConfirm")) {
    $("btnCarryForwardConfirm").addEventListener("click", async () => {
      if (!state.carryForwardMonth) return;

      const session = getSession();

      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeCarryForwardConfirm();
        return;
      }

      const monthKey = state.carryForwardMonth;

      $("btnCarryForwardConfirm").disabled = true;
      $("btnCarryForwardConfirm").textContent = "Memproses…";

      try {
        const res = await apiPost({
          action: "carryForwardSaldo",
          token: session.token,
          monthKey,
        });

        if (!res.success) {
          showToast(res.message || "Gagal membuat saldo awal.", "error");
          return;
        }

        showToast(res.message || "Saldo awal berhasil dibuat.");
        closeCarryForwardConfirm();
        await loadData();
      } catch (err) {
        showToast("Tidak dapat menghubungi server: " + err.message, "error");
      } finally {
        $("btnCarryForwardConfirm").disabled = false;
        $("btnCarryForwardConfirm").textContent = "Lanjutkan";
      }
    });
  }

  // ============================================================
  // SHODAQOH IR — EVENT HANDLERS
  // ============================================================

  if ($("shodFilterYear"))
    $("shodFilterYear").addEventListener("change", function () {
      state.shodaqoh.filters.year = this.value;
      renderPaymentHistory();
    });

  if ($("shodFilterMonth"))
    $("shodFilterMonth").addEventListener("change", function () {
      state.shodaqoh.filters.month = this.value;
      var p = state.shodaqoh.filters.year + "-" + state.shodaqoh.filters.month;
      if (state.shodaqoh.filters.year && state.shodaqoh.filters.month) {
        loadShodaqohData(p);
      }
    });

  if ($("shodFilterMember"))
    $("shodFilterMember").addEventListener("change", function () {
      state.shodaqoh.filters.memberId = this.value;
      renderShodaqohMonitoring();
      renderPaymentHistory();
    });

  if ($("shodFilterStatus"))
    $("shodFilterStatus").addEventListener("change", function () {
      state.shodaqoh.filters.status = this.value;
      renderShodaqohMonitoring();
    });

  if ($("btnShodAddPayment"))
    $("btnShodAddPayment").addEventListener("click", () => {
      if (state.isAdmin === true) openShodaqohPaymentForm(null);
    });

  if ($("btnCancelShodaqohPayment"))
    $("btnCancelShodaqohPayment").addEventListener(
      "click",
      closeShodaqohPaymentForm,
    );

  if ($("shodaqohPaymentOverlay")) {
    $("shodaqohPaymentOverlay").addEventListener("click", (e) => {
      if (e.target === $("shodaqohPaymentOverlay")) closeShodaqohPaymentForm();
    });
  }

  if ($("shodaqohPaymentForm")) {
    $("shodaqohPaymentForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        return;
      }

      const susulanBulan = [
        ...document.querySelectorAll('input[name="shodSusulanBulan"]:checked'),
      ].map((el) => el.value);

      const payload = {
        action: state.shodaqoh.selectedPaymentId
          ? "updateShodaqohPayment"
          : "createShodaqohPayment",
        token: session.token,
        paymentId: state.shodaqoh.selectedPaymentId,
        memberId: $("shodPaymentMember").value,
        tanggalPembayaran: $("shodPaymentDate").value,
        total: Number($("shodPaymentAmount").value),
        susulan_ir: Number($("shod_susulan_ir")?.value || 0),
        susulan_bulan: susulanBulan,
        uang: Number($("shod_uang")?.value || 0),
        jimpitan: Number($("shod_jimpitan")?.value || 0),
        siar_siar: Number($("shod_siar_siar")?.value || 0),
        seribuan: Number($("shod_seribuan")?.value || 0),
        kafan: Number($("shod_kafan")?.value || 0),
        ukhro_mt: Number($("shod_ukhro_mt")?.value || 0),
        keterangan: $("shodPaymentNote").value,
      };

      $("btnSubmitShodaqohPayment").disabled = true;

      try {
        const r = await apiPost(payload);
        if (!r.success) throw new Error(r.message);
        showToast(r.message);
        closeShodaqohPaymentForm();
        await loadShodaqohData(state.shodaqoh.selectedMonth);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        $("btnSubmitShodaqohPayment").disabled = false;
      }
    });
  }

  document.addEventListener("click", (e) => {
    const m = e.target.closest("[data-shod-member]");
    if (m) {
      if (typeof openShodaqohMemberDetail === "function") {
        openShodaqohMemberDetail(m.dataset.shodMember);
      }
      return;
    }
    const p = e.target.closest("[data-shod-payment]");
    if (p) {
      if (typeof openShodaqohPaymentDetail === "function") {
        openShodaqohPaymentDetail(p.dataset.shodPayment);
      }
    }
  });

  if ($("btnCloseShodMemberDetail"))
    $("btnCloseShodMemberDetail").addEventListener("click", () =>
      $("shodMemberDetailOverlay")?.classList.add("hidden"),
    );

  if ($("btnCloseShodPaymentDetail"))
    $("btnCloseShodPaymentDetail").addEventListener("click", () =>
      $("shodPaymentDetailOverlay")?.classList.add("hidden"),
    );

  if ($("btnShodEditPayment")) {
    $("btnShodEditPayment").addEventListener("click", async () => {
      const id = $("btnShodEditPayment").dataset.paymentId;
      const d = await apiGetShodaqohPaymentDetail(id);
      $("shodPaymentDetailOverlay")?.classList.add("hidden");
      if (typeof openShodaqohPaymentForm === "function") {
        openShodaqohPaymentForm(d.payment);
      }
    });
  }

  if ($("btnShodReversePayment")) {
    $("btnShodReversePayment").addEventListener("click", async () => {
      const id = $("btnShodReversePayment").dataset.paymentId;
      if (!id) return;
      if (!confirm("Reversal pembayaran ini? Histori tetap disimpan.")) return;

      const session = getSession();
      try {
        const r = await apiPost({
          action: "reverseShodaqohPayment",
          token: session.token,
          paymentId: id,
        });
        if (!r.success) throw new Error(r.message);
        showToast(r.message);
        $("shodPaymentDetailOverlay")?.classList.add("hidden");
        await loadData();
        await loadShodaqohData(state.shodaqoh.selectedMonth);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  if ($("btnShodPostToKas")) {
    $("btnShodPostToKas").addEventListener("click", async function () {
      if (state.isAdmin !== true) {
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

      // MODAL KONFIRMASI
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
            Semua pembayaran Shodaqoh IR bulan <b>${getMonthLabel(monthKey)}</b> akan diposting ke Kas Utama.
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

          const session = getSession();
          if (!session) {
            showToast("Sesi admin berakhir, silakan login ulang.", "error");
            return;
          }

          const btn = $("btnShodPostToKas");
          const originalText = btn.innerHTML;

          btn.disabled = true;
          btn.innerHTML = `<span class="inline-block animate-spin">⟳</span> Memproses…`;

          try {
            const res = await apiPost({
              action: "postShodaqohToKas",
              token: session.token,
              monthKey: monthKey,
            });

            if (!res.success) throw new Error(res.message);

            showToast(res.message);

            if (res.details && res.details.length > 0) {
              let detailRows = res.details
                .map(function (d) {
                  return `
                  <div class="flex items-center justify-between py-2 border-b border-[color:var(--line)] last:border-0">
                    <span class="text-xs font-medium">${d.account}</span>
                    <span class="mono text-xs font-bold">${fmtRp(d.amount)}</span>
                  </div>
                `;
                })
                .join("");

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
                  Rincian transaksi yang dibuat di Kas Utama:
                </p>
                <div class="mt-3 p-3 bg-[color:var(--surface-alt)] rounded-lg max-h-48 overflow-y-auto">
                  ${detailRows}
                </div>
                <div class="flex items-center justify-between mt-3 pt-2 border-t border-[color:var(--line)]">
                  <span class="text-xs font-bold">TOTAL</span>
                  <span class="mono text-sm font-extrabold">${fmtRp(res.total)}</span>
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

            await loadData();
            await loadShodaqohData(state.shodaqoh.selectedMonth);
          } catch (err) {
            showToast(err.message, "error");
          } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        });
    });
  }

  // ============================================================
  // SHODAQOH MEMBER — ACTION SHEET EVENTS
  // ============================================================

  document.addEventListener("click", function (e) {
    const memberBtn = e.target.closest("[data-shod-member]");
    if (
      memberBtn &&
      !e.target.closest("button") &&
      !e.target.closest(".tx-card-clickable")
    ) {
      if (state.isAdmin === true) {
        if (typeof openShodMemberActionSheet === "function") {
          openShodMemberActionSheet(memberBtn.dataset.shodMember);
        }
      } else {
        if (typeof openShodaqohMemberDetail === "function") {
          openShodaqohMemberDetail(memberBtn.dataset.shodMember);
        }
      }
    }
  });

  if ($("btnMemberActionCancel")) {
    $("btnMemberActionCancel").addEventListener("click", function () {
      if (typeof closeShodMemberActionSheet === "function") {
        closeShodMemberActionSheet();
      }
    });
  }

  if ($("shodMemberActionOverlay")) {
    $("shodMemberActionOverlay").addEventListener("click", function (e) {
      if (e.target === this) {
        if (typeof closeShodMemberActionSheet === "function") {
          closeShodMemberActionSheet();
        }
      }
    });
  }

  if ($("btnMemberActionDetail")) {
    $("btnMemberActionDetail").addEventListener("click", function () {
      const memberId =
        typeof shodMemberActionId !== "undefined" ? shodMemberActionId : null;
      if (typeof closeShodMemberActionSheet === "function") {
        closeShodMemberActionSheet();
      }
      if (memberId) {
        setTimeout(function () {
          if (typeof openShodaqohMemberDetail === "function") {
            openShodaqohMemberDetail(memberId);
          }
        }, 200);
      }
    });
  }

  if ($("btnMemberActionEdit")) {
    $("btnMemberActionEdit").addEventListener("click", function () {
      const memberId =
        typeof shodMemberActionId !== "undefined" ? shodMemberActionId : null;
      if (typeof closeShodMemberActionSheet === "function") {
        closeShodMemberActionSheet();
      }
      if (memberId) {
        setTimeout(function () {
          if (typeof openShodMemberForm === "function") {
            openShodMemberForm(memberId);
          }
        }, 200);
      }
    });
  }

  if ($("btnMemberActionDelete")) {
    $("btnMemberActionDelete").addEventListener("click", function () {
      const memberId =
        typeof shodMemberActionId !== "undefined" ? shodMemberActionId : null;
      if (typeof closeShodMemberActionSheet === "function") {
        closeShodMemberActionSheet();
      }
      if (memberId) {
        setTimeout(function () {
          if (typeof openShodMemberDeleteConfirm === "function") {
            openShodMemberDeleteConfirm(memberId);
          }
        }, 200);
      }
    });
  }

  // ============================================================
  // SHODAQOH MEMBER — FORM EVENTS
  // ============================================================

  if ($("btnAddMember")) {
    $("btnAddMember").addEventListener("click", function () {
      if (state.isAdmin !== true) {
        showToast("Hanya admin yang dapat menambah anggota.", "error");
        return;
      }
      if (typeof openShodMemberForm === "function") {
        openShodMemberForm(null);
      }
    });
  }

  if ($("btnMemberFormCancel")) {
    $("btnMemberFormCancel").addEventListener("click", function () {
      if (typeof closeShodMemberForm === "function") {
        closeShodMemberForm();
      }
    });
  }

  if ($("shodMemberFormOverlay")) {
    $("shodMemberFormOverlay").addEventListener("click", function (e) {
      if (e.target === this) {
        if (typeof closeShodMemberForm === "function") {
          closeShodMemberForm();
        }
      }
    });
  }

  if ($("shodMemberForm")) {
    $("shodMemberForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const memberId = this.dataset.memberId || null;
      const nama = $("shodMemberFormName").value.trim();
      const nominal = Number($("shodMemberFormNominal").value || 0);

      const errorEl = $("shodMemberFormError");

      if (!nama) {
        errorEl.textContent = "Nama anggota wajib diisi.";
        errorEl.classList.remove("hidden");
        return;
      }

      if (nominal <= 0) {
        errorEl.textContent = "Nominal bulanan harus lebih dari 0.";
        errorEl.classList.remove("hidden");
        return;
      }

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        return;
      }

      $("btnMemberFormSubmit").disabled = true;
      $("btnMemberFormSubmit").textContent = "Menyimpan…";

      try {
        let res;
        if (memberId) {
          res = await apiPost({
            action: "updateShodaqohMember",
            token: session.token,
            memberId: memberId,
            nama: nama,
            nominalBulanan: nominal,
          });
        } else {
          res = await apiPost({
            action: "addShodaqohMember",
            token: session.token,
            nama: nama,
            nominalBulanan: nominal,
          });
        }

        if (!res.success) throw new Error(res.message);

        showToast(res.message);
        if (typeof closeShodMemberForm === "function") {
          closeShodMemberForm();
        }
        await loadShodaqohData(state.shodaqoh.selectedMonth);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
      } finally {
        $("btnMemberFormSubmit").disabled = false;
        $("btnMemberFormSubmit").textContent = "Simpan";
      }
    });
  }

  // ============================================================
  // SHODAQOH MEMBER — DELETE CONFIRM
  // ============================================================

  if ($("btnDeleteMemberCancel")) {
    $("btnDeleteMemberCancel").addEventListener("click", function () {
      if (typeof closeShodMemberDeleteConfirm === "function") {
        closeShodMemberDeleteConfirm();
      }
    });
  }

  if ($("deleteMemberConfirmOverlay")) {
    $("deleteMemberConfirmOverlay").addEventListener("click", function (e) {
      if (e.target === this) {
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
      }
    });
  }

  if ($("btnDeleteMemberConfirm")) {
    $("btnDeleteMemberConfirm").addEventListener("click", async function () {
      const memberId =
        typeof shodMemberActionId !== "undefined" ? shodMemberActionId : null;
      if (!memberId) {
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
        return;
      }

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
        return;
      }

      $("btnDeleteMemberConfirm").disabled = true;
      $("btnDeleteMemberConfirm").textContent = "Menghapus…";

      try {
        const res = await apiPost({
          action: "deleteShodaqohMember",
          token: session.token,
          memberId: memberId,
        });

        if (!res.success) throw new Error(res.message);

        showToast(res.message || "Anggota berhasil dihapus.");
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
        await loadShodaqohData(state.shodaqoh.selectedMonth);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        $("btnDeleteMemberConfirm").disabled = false;
        $("btnDeleteMemberConfirm").textContent = "Hapus";
      }
    });
  }

  // ============================================================
  // DELETE TRANSACTION CONFIRM
  // ============================================================

  function openDeleteConfirm() {
    const tx = state.transactions.find(
      (t) => String(t.no) === String(state.actionNo),
    );

    if ($("deleteConfirmDesc")) {
      $("deleteConfirmDesc").innerHTML = tx
        ? `<b>${tx.account}</b> · ${fmtDateShort(
            tx.tanggal,
          )} akan dihapus permanen dan tidak bisa dibatalkan.`
        : "Tindakan ini tidak bisa dibatalkan.";
    }

    $("deleteConfirmOverlay")?.classList.remove("hidden");
  }

  function closeDeleteConfirm() {
    $("deleteConfirmOverlay")?.classList.add("hidden");
  }

  if ($("btnActionDelete")) {
    $("btnActionDelete").addEventListener("click", () => {
      closeTxActionSheet();
      openDeleteConfirm();
    });
  }

  if ($("btnDeleteCancel"))
    $("btnDeleteCancel").addEventListener("click", () => {
      state.actionNo = null;
      closeDeleteConfirm();
    });

  if ($("deleteConfirmOverlay")) {
    $("deleteConfirmOverlay").addEventListener("click", (e) => {
      if (e.target === $("deleteConfirmOverlay")) {
        state.actionNo = null;
        closeDeleteConfirm();
      }
    });
  }

  if ($("btnDeleteConfirm")) {
    $("btnDeleteConfirm").addEventListener("click", () => {
      const no = state.actionNo;

      if (no === null || no === undefined) {
        closeDeleteConfirm();
        return;
      }

      const session = getSession();

      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeDeleteConfirm();
        return;
      }

      $("btnDeleteConfirm").disabled = true;
      $("btnDeleteConfirm").textContent = "Menghapus…";

      apiPost({
        action: "deleteTransaction",
        token: session.token,
        no,
      })
        .then((res) => {
          if (!res.success) {
            showToast(res.message || "Gagal menghapus transaksi.", "error");
            return;
          }
          showToast("Transaksi berhasil dihapus.");
          loadData();
        })
        .catch((err) =>
          showToast("Tidak dapat menghubungi server: " + err.message, "error"),
        )
        .finally(() => {
          state.actionNo = null;
          $("btnDeleteConfirm").disabled = false;
          $("btnDeleteConfirm").textContent = "Hapus";
          closeDeleteConfirm();
        });
    });
  }

  // ============================================================
  // AUTH
  // ============================================================

  if ($("btnTogglePassword")) {
    $("btnTogglePassword").addEventListener("click", () => {
      const pwdInput = $("authPassword");
      const iconEye = $("iconEye");
      const iconEyeOff = $("iconEyeOff");
      const isPassword = pwdInput.type === "password";

      pwdInput.type = isPassword ? "text" : "password";
      iconEye?.classList.toggle("hidden", !isPassword);
      iconEyeOff?.classList.toggle("hidden", isPassword);
    });
  }

  if ($("authForm")) {
    $("authForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = $("authUsername").value.trim();
      const password = $("authPassword").value;

      $("btnAuthSubmit").disabled = true;
      $("btnAuthSubmit").textContent = "Memeriksa…";

      try {
        const res = await apiPost({
          action: "login",
          username,
          password,
        });

        if (!res.success) {
          $("authError").textContent =
            res.message || "Username atau password salah.";
          $("authError").classList.remove("hidden");
          return;
        }

        const role = String(res.role || "pengurus").toLowerCase();

        saveSession(res.token, res.nama || username, role, res.expiresAt);
        setAdminUI(role === "admin", res.nama || username);

        $("authError").classList.add("hidden");
        $("authForm").reset();

        if ($("authPassword")) $("authPassword").type = "password";
        $("iconEye")?.classList.add("hidden");
        $("iconEyeOff")?.classList.remove("hidden");

        enterApp();
      } catch (err) {
        $("authError").textContent =
          "Tidak dapat menghubungi server: " + err.message;
        $("authError").classList.remove("hidden");
      } finally {
        $("btnAuthSubmit").disabled = false;
        $("btnAuthSubmit").textContent = "Masuk";
      }
    });
  }

  // ============================================================
  // GLOBAL EVENTS
  // ============================================================

  document.addEventListener("click", (event) => {
    const homeDropdown = $("homeMonthDropdown");
    const historyDropdown = $("historyMonthDropdown");
    const shodaqohDropdown = $("shodaqohMonthDropdown");

    if (
      (!homeDropdown || !homeDropdown.contains(event.target)) &&
      (!historyDropdown || !historyDropdown.contains(event.target)) &&
      (!shodaqohDropdown || !shodaqohDropdown.contains(event.target))
    ) {
      closeAllMonthDropdowns();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMonthDropdowns();
      closeTxActionSheet();
      state.actionNo = null;
      closeDeleteConfirm();
      $("shodaqohPaymentOverlay")?.classList.add("hidden");
      $("shodMemberDetailOverlay")?.classList.add("hidden");
      $("shodPaymentDetailOverlay")?.classList.add("hidden");
      if (typeof closeShodMemberActionSheet === "function") {
        closeShodMemberActionSheet();
      }
      if (typeof closeShodMemberDeleteConfirm === "function") {
        closeShodMemberDeleteConfirm();
      }
      if (typeof closeShodMemberForm === "function") {
        closeShodMemberForm();
      }
      state.shodaqoh.actionNo = null;
      state.shodaqoh.editingNo = null;
    }
  });

  // ============================================================
  // INIT SESSION
  // ============================================================

  const existing = getSession();

  if (existing) {
    setAdminUI(
      String(existing.role || "").toLowerCase() === "admin",
      existing.nama,
    );
    enterApp();
  }
});
