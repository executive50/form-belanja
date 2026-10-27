const BANK_RATES = {
  BCA: 5.5,
  BNI: 7,
  'CIMB Niaga': 6.75
};

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const form = document.getElementById('formBelanja');
const customerInput = document.getElementById('customer');
const tanggalInput = document.getElementById('tanggal');
const jenisInput = document.getElementById('jenis');
const jumlahInput = document.getElementById('jumlah');
const hargaInput = document.getElementById('harga');
const bankInput = document.getElementById('bank');
const tenorInput = document.getElementById('tenor');
const dpInput = document.getElementById('dp');

const kreditPanel = document.getElementById('kreditPanel');
const saldoOutput = document.getElementById('saldo');
const bungaOutput = document.getElementById('bunga');
const pokokCicilanOutput = document.getElementById('pokokCicilan');

const totalBelanjaOutput = document.getElementById('totalBelanja');
const summaryDpOutput = document.getElementById('summaryDp');
const summaryBungaOutput = document.getElementById('summaryBunga');
const totalBayarOutput = document.getElementById('totalBayar');

const historyBody = document.getElementById('historyBody');
const toast = document.getElementById('toast');
const resetBtn = document.getElementById('resetBtn');
const refreshBtn = document.getElementById('refreshBtn');
const radioCards = document.querySelectorAll('.radio-card');

function angka(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatRupiah(value) {
  return rupiah.format(Math.round(angka(value)));
}

function getMetode() {
  return form.querySelector('input[name="metode"]:checked').value;
}

function hitungLokal() {
  const harga = Math.max(0, angka(hargaInput.value));
  const jumlah = Math.max(1, Math.floor(angka(jumlahInput.value, 1)));
  const total = harga * jumlah;
  const metode = getMetode();

  if (metode === 'tunai') {
    return { harga, jumlah, metode, total, dp: 0, saldo: 0, bunga: 0, pokokCicilan: 0, totalBayar: total };
  }

  const bank = bankInput.value;
  const tenor = Math.max(1, Math.floor(angka(tenorInput.value, 12)));
  const dp = Math.min(Math.max(0, angka(dpInput.value)), total);
  const saldo = total - dp;
  const bungaPersen = BANK_RATES[bank] || 0;
  const bunga = saldo * (bungaPersen / 100) * (tenor / 12);
  const pokokCicilan = (saldo + bunga) / tenor;

  return {
    harga,
    jumlah,
    metode,
    bank,
    tenor,
    dp,
    saldo,
    bungaPersen,
    bunga,
    pokokCicilan,
    total,
    totalBayar: total + bunga
  };
}

function updateUI() {
  const hasil = hitungLokal();
  const kredit = hasil.metode === 'kredit';

  kreditPanel.classList.toggle('is-hidden', !kredit);

  saldoOutput.textContent = kredit ? formatRupiah(hasil.saldo) : 'Rp 0';
  bungaOutput.textContent = kredit
    ? `${formatRupiah(hasil.bunga)} (${hasil.bungaPersen.toLocaleString('id-ID')}%)`
    : 'Rp 0';
  pokokCicilanOutput.textContent = kredit
    ? `${formatRupiah(hasil.pokokCicilan)} / bulan`
    : 'Rp 0';

  totalBelanjaOutput.textContent = formatRupiah(hasil.total);
  summaryDpOutput.textContent = formatRupiah(hasil.dp);
  summaryBungaOutput.textContent = formatRupiah(hasil.bunga);
  totalBayarOutput.textContent = formatRupiah(hasil.totalBayar);

  radioCards.forEach((card) => {
    const input = card.querySelector('input');
    card.classList.toggle('is-active', input.checked);
  });
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTanggal(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function renderHistory(items) {
  if (!items.length) {
    historyBody.innerHTML = '<tr class="empty-row"><td colspan="7">Belum ada transaksi.</td></tr>';
    return;
  }

  historyBody.innerHTML = items
    .map((item) => {
      const kredit = item.metode === 'kredit';
      const detail = kredit
        ? `<span class="detail-line">${escapeHtml(item.bank)} · ${item.tenor} bln</span>
           <span class="detail-line">DP ${formatRupiah(item.dp)} · Cicilan ${formatRupiah(item.pokokCicilan)}/bln</span>`
        : '<span class="detail-line">Lunas</span>';

      return `
        <tr>
          <td class="customer">${escapeHtml(item.customer)}</td>
          <td>${formatTanggal(item.tanggal)}</td>
          <td>${escapeHtml(item.jenis)} (${item.jumlah} unit)</td>
          <td>${formatRupiah(item.total)}</td>
          <td><span class="badge ${kredit ? 'kredit' : 'tunai'}">${kredit ? 'KREDIT' : 'TUNAI'}</span></td>
          <td>${detail}</td>
          <td><button type="button" class="icon-btn" data-delete="${escapeHtml(item.id)}" title="Hapus transaksi">✕</button></td>
        </tr>`;
    })
    .join('');
}

async function loadHistory() {
  try {
    const response = await fetch('/api/transactions');
    if (!response.ok) throw new Error('Gagal memuat riwayat.');
    const data = await response.json();
    renderHistory(data);
  } catch (error) {
    renderHistory([]);
    showToast(error.message || 'Gagal memuat riwayat.', true);
  }
}

async function simpanTransaksi(event) {
  event.preventDefault();

  const payload = {
    customer: customerInput.value.trim(),
    tanggal: tanggalInput.value,
    jenis: jenisInput.value,
    jumlah: Math.max(1, Math.floor(angka(jumlahInput.value, 1))),
    harga: Math.max(0, angka(hargaInput.value)),
    metode: getMetode(),
    bank: bankInput.value,
    tenor: Math.max(1, Math.floor(angka(tenorInput.value, 12))),
    dp: Math.max(0, angka(dpInput.value))
  };

  if (!payload.customer) {
    showToast('Nama customer wajib diisi.', true);
    customerInput.focus();
    return;
  }
  if (payload.harga <= 0) {
    showToast('Harga harus lebih dari 0.', true);
    hargaInput.focus();
    return;
  }

  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Gagal menyimpan transaksi.');

    showToast(`Transaksi ${result.customer} berhasil disimpan.`);
    resetForm();
    loadHistory();
  } catch (error) {
    showToast(error.message || 'Gagal menyimpan transaksi.', true);
  }
}

function resetForm() {
  form.reset();
  tanggalInput.value = new Date().toISOString().slice(0, 10);
  document.querySelector('input[name="metode"][value="tunai"]').checked = true;
  updateUI();
}

async function hapusTransaksi(id) {
  if (!id) return;
  if (!window.confirm('Hapus transaksi ini?')) return;

  try {
    const response = await fetch(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Gagal menghapus transaksi.');
    showToast('Transaksi dihapus.');
    loadHistory();
  } catch (error) {
    showToast(error.message || 'Gagal menghapus transaksi.', true);
  }
}

form.addEventListener('submit', simpanTransaksi);
form.addEventListener('input', updateUI);
form.addEventListener('change', updateUI);

resetBtn.addEventListener('click', resetForm);
refreshBtn.addEventListener('click', loadHistory);

historyBody.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete]');
  if (button) hapusTransaksi(button.dataset.delete);
});

tanggalInput.value = new Date().toISOString().slice(0, 10);
updateUI();
loadHistory();
