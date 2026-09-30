function generateShodaqohRekapText() {
  const monthKey = state.shodaqoh.selectedMonth;
  const monthLabel = getMonthLabel(monthKey);

  const payments = state.shodaqoh.payments || [];

  let totalSusulanIr = 0;
  let totalUangSambung = 0;
  let totalJimpitan = 0;
  let totalSiarSiar = 0;
  let totalSeribuan = 0;
  let totalKafan = 0;
  let totalUkhroMt = 0;

  payments.forEach(function (p) {
    totalSusulanIr += Number((p.carryover_ir ?? p.susulan_ir) || 0);
    totalUangSambung += Number((p.connecting_fund ?? p.uang_sambung) || 0);
    totalJimpitan += Number((p.community_dues ?? p.jimpitan) || 0);
    totalSiarSiar += Number((p.outreach_fund ?? p.siar_siar) || 0);
    totalSeribuan += Number((p.thousand_fund ?? p.seribuan) || 0);
    totalKafan += Number((p.funeral_fund ?? p.kafan) || 0);
    totalUkhroMt += Number(p.ukhro_mt || 0);
  });

  const total =
    totalSusulanIr +
    totalUangSambung +
    totalJimpitan +
    totalSiarSiar +
    totalSeribuan +
    totalKafan +
    totalUkhroMt;

  const formatNumber = (n) => {
    return Math.round(n || 0).toLocaleString("id-ID");
  };

  let lines = [];
  lines.push(`*Bulan ${monthLabel}*`);
  lines.push("");
  lines.push(`Persenan.      ${formatNumber(totalSusulanIr)}`);
  lines.push(`Sambung.      ${formatNumber(totalUangSambung)}`);
  lines.push(`Jimpitan.          ${formatNumber(totalJimpitan)}`);
  lines.push(`Siar2.               ${formatNumber(totalSiarSiar)}`);
  lines.push(`1000an.             ${formatNumber(totalSeribuan)}`);
  lines.push(`Kafan.               ${formatNumber(totalKafan)}`);
  lines.push(`Ukro mt.         ${formatNumber(totalUkhroMt)}`);
  lines.push(`        __________________+`);
  lines.push(`*Total             ${formatNumber(total)}*`);

  return lines.join("\n");
}

async function copyShodaqohRekap() {
  const btn = document.getElementById("btnCopyShodaqohRekap");
  if (!btn) return;

  const payments = state.shodaqoh.payments || [];
  const hasData = payments.some((p) => {
    return (
      Number((p.carryover_ir ?? p.susulan_ir) || 0) > 0 ||
      Number((p.connecting_fund ?? p.uang_sambung) || 0) > 0 ||
      Number((p.community_dues ?? p.jimpitan) || 0) > 0 ||
      Number((p.outreach_fund ?? p.siar_siar) || 0) > 0 ||
      Number((p.thousand_fund ?? p.seribuan) || 0) > 0 ||
      Number((p.funeral_fund ?? p.kafan) || 0) > 0 ||
      Number(p.ukhro_mt || 0) > 0
    );
  });

  if (!hasData) {
    showToast("Belum ada data pembayaran untuk bulan ini.", "warning");
    return;
  }

  const text = generateShodaqohRekapText();

  try {
    await navigator.clipboard.writeText(text);

    btn.classList.add("copied");
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    `;

    showToast("Rekap berhasil disalin ke clipboard!", "success");

    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = originalHtml;
    }, 2000);
  } catch (err) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();

      showToast("Rekap berhasil disalin ke clipboard!", "success");
    } catch (e) {
      showToast("Gagal menyalin teks. Silakan coba lagi.", "error");
    }
  }
}
