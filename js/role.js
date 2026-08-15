// ---------- ROLE BASED CREATE VISIBILITY ----------
// Sumber hak akses hanya dari role yang sudah diverifikasi backend.
function applyRoleBasedCreateVisibility() {
  const isAdmin = state.isAdmin === true;

  document.documentElement.classList.toggle("role-admin", isAdmin);
  document.documentElement.classList.toggle("role-non-admin", !isAdmin);

  document
    .querySelectorAll(
      '[data-action="create"], [data-role-action="create"], .create-action, #createTransactionBtn',
    )
    .forEach((el) => {
      el.classList.toggle("hidden", !isAdmin);
      el.setAttribute("aria-hidden", String(!isAdmin));
    });

  // Jika role berubah menjadi non-admin saat form terbuka,
  // tutup form dan cegah aksi create.
  if (!isAdmin) {
    $("txOverlay")?.classList.add("hidden");
  }
}

window.applyRoleBasedCreateVisibility = applyRoleBasedCreateVisibility;
