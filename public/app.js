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
const creditInner = kreditPanel.querySelector('.credit-inner');
const saldoOutput = document.getElementById('saldo');
const bungaOutput = document.getElementById('bunga');
const pokokCicilanOutput = document.getElementById('pokokCicilan');

const totalBelanjaOutput = document.getElementById('totalBelanja');
const summaryDpOutput = document.getElementById('summaryDp');
const summaryBungaOutput = document.getElementById('summaryBunga');
const totalBayarOutput = document.getElementById('totalBayar');

const historyBody = document.getElementById('historyBody');
const historyCount = document.getElementById('historyCount');
const toast = document.getElementById('toast');
const resetBtn = document.getElementById('resetBtn');
const refreshBtn = document.getElementById('refreshBtn');
const radioCards = document.querySelectorAll('.radio-card');
const indicator = document.querySelector('.segmented-indicator');

const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------------
   Spring — damping ratio + response, seperti parameter Apple.
   Selalu mulai dari nilai yang sedang tampil, jadi bisa diinterupsi
   kapan saja tanpa lompatan.
   ------------------------------------------------------------------ */

class Spring {
  constructor(value, options = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.response = options.response ?? 0.4;
    this.damping = options.damping ?? 1;
    this.onUpdate = options.onUpdate ?? null;
    this.onRest = null;
    this.frame = 0;
    this.last = 0;
    this.tick = this.tick.bind(this);
  }

  to(target, options = {}) {
    this.target = target;
    if (options.velocity != null) this.velocity = options.velocity;
    if (options.response != null) this.response = options.response;
    if (options.damping != null) this.damping = options.damping;
    if (options.onRest !== undefined) this.onRest = options.onRest;
    this.start();
    return this;
  }

  jump(value) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.render();
    return this;
  }

  start() {
    if (reduceMotionQuery.matches) {
      this.value = this.target;
      this.velocity = 0;
      this.render();
      const done = this.onRest;
      this.onRest = null;
      if (done) done();
      return;
    }

    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  tick(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;

    const steps = Math.max(1, Math.ceil(dt * 240));
    const step = dt / steps;
    const omega = (2 * Math.PI) / Math.max(this.response, 0.05);
    const stiffness = omega * omega;
    const friction = 2 * this.damping * omega;

    for (let i = 0; i < steps; i += 1) {
      const acceleration = -stiffness * (this.value - this.target) - friction * this.velocity;
      this.velocity += acceleration * step;
      this.value += this.velocity * step;
    }

    const settled = Math.abs(this.value - this.target) < 0.01 && Math.abs(this.velocity) < 0.01;
    if (settled) {
      this.value = this.target;
      this.velocity = 0;
      this.frame = 0;
      this.render();
      const done = this.onRest;
      this.onRest = null;
      if (done) done();
      return;
    }

    this.render();
    this.frame = requestAnimationFrame(this.tick);
  }

  render() {
    if (this.onUpdate) this.onUpdate(this.value, this.velocity);
  }
}

/* ------------------------------------------------------------------
   Toast — material translusen, masuk dengan spring.
   ------------------------------------------------------------------ */

const TOAST_OFFSET = 26;

const toastSpring = new Spring(TOAST_OFFSET, {
  response: 0.34,
  damping: 1,
  onUpdate(value) {
    const y = Math.max(-6, value);
    const opacity = Math.min(1, Math.max(0, 1 - value / TOAST_OFFSET));
    toast.style.transform = `translate(-50%, ${y}px)`;
    toast.style.opacity = String(opacity);
  }
});

function showToast(message, isError = false) {
  const visible = Number(toast.style.opacity || 0) > 0.05;
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  if (!visible) toastSpring.jump(TOAST_OFFSET);
  toastSpring.to(0);
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(hideToast, 3200);
}

function hideToast() {
  toastSpring.to(TOAST_OFFSET);
}

/* ------------------------------------------------------------------
   Panel kredit — tinggi dianimasikan spring, bukan keyframes,
   supaya bisa dibalik di tengah jalan.
   ------------------------------------------------------------------ */

let creditOpen = false;
let creditHeight = 0;
let creditInitialized = false;

const creditSpring = new Spring(0, {
  response: 0.34,
  damping: 1,
  onUpdate(value) {
    const height = Math.max(0, value);
    kreditPanel.style.height = `${height}px`;
    const progress = creditHeight > 0 ? Math.min(1, height / creditHeight) : 0;
    kreditPanel.style.opacity = String(progress);
    creditInner.style.transform = `translateY(${(1 - progress) * -6}px)`;
  }
});

function setCreditPanel(open) {
  if (!creditInitialized) {
    creditOpen = open;
    creditInitialized = true;
    if (open) {
      kreditPanel.classList.remove('is-hidden');
      creditHeight = creditInner.offsetHeight;
      creditSpring.jump(creditHeight);
    } else {
      creditSpring.jump(0);
      kreditPanel.classList.add('is-hidden');
    }
    return;
  }

  if (open === creditOpen) return;
  creditOpen = open;

  if (open) {
    kreditPanel.classList.remove('is-hidden');
    creditHeight = creditInner.offsetHeight;
    creditSpring.to(creditHeight, { onRest: null });
    return;
  }

  creditSpring.to(0, {
    onRest() {
      if (!creditOpen) kreditPanel.classList.add('is-hidden');
    }
  });
}

/* ------------------------------------------------------------------
   Segmented control — indikator mengikuti pilihan dengan spring.
   ------------------------------------------------------------------ */

let indicatorPlaced = false;
let lastMetode = null;

const indicatorSpring = new Spring(0, {
  response: 0.3,
  damping: 1,
  onUpdate(value) {
    if (indicator) indicator.style.transform = `translateX(${value}px)`;
  }
});

function placeIndicator(animate = true) {
  const active = document.querySelector('.radio-card.is-active');
  if (!active || !indicator) return;

  const x = active.offsetLeft;
  indicator.style.width = `${active.offsetWidth}px`;

  if (!animate || !indicatorPlaced) {
    indicatorSpring.jump(x);
    indicatorPlaced = true;
    return;
  }

  indicatorSpring.to(x, { velocity: 0 });
}

/* ------------------------------------------------------------------
   Perhitungan
   ------------------------------------------------------------------ */

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

  setCreditPanel(kredit);

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

  placeIndicator(lastMetode !== null && lastMetode !== hasil.metode);
  lastMetode = hasil.metode;
}

/* ------------------------------------------------------------------
   Riwayat
   ------------------------------------------------------------------ */

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
  historyCount.textContent = String(items.length);

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
          <td>
            <button type="button" class="icon-btn" data-delete="${escapeHtml(item.id)}"
              title="Hapus transaksi" aria-label="Hapus transaksi ${escapeHtml(item.customer)}">✕</button>
          </td>
        </tr>`;
    })
    .join('');

  animateRowsIn();
}

function animateRowsIn() {
  if (reduceMotionQuery.matches) return;

  const rows = Array.from(historyBody.rows).filter((row) => !row.classList.contains('empty-row'));

  rows.forEach((row, index) => {
    row.style.opacity = '0';
    row.style.transform = 'translateY(4px)';

    window.setTimeout(() => {
      row.style.transition = 'opacity 220ms ease-out, transform 300ms cubic-bezier(0.22, 1, 0.36, 1)';
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';

      window.setTimeout(() => {
        row.style.transition = '';
        row.style.transform = '';
        row.style.opacity = '';
      }, 340);
    }, Math.min(index, 8) * 20);
  });
}

function animateRowOut(row) {
  return new Promise((resolve) => {
    if (!row || reduceMotionQuery.matches) {
      resolve();
      return;
    }

    row.style.transition = 'opacity 140ms ease-in, transform 200ms ease-in';
    row.style.opacity = '0';
    row.style.transform = 'translateX(-10px)';
    window.setTimeout(resolve, 170);
  });
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

/* ------------------------------------------------------------------
   Aksi
   ------------------------------------------------------------------ */

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

async function hapusTransaksi(id, button) {
  if (!id) return;
  if (!window.confirm('Hapus transaksi ini?')) return;

  const row = button ? button.closest('tr') : null;

  try {
    const response = await fetch(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Gagal menghapus transaksi.');
    showToast('Transaksi dihapus.');
    await animateRowOut(row);
    loadHistory();
  } catch (error) {
    showToast(error.message || 'Gagal menghapus transaksi.', true);
  }
}

/* ------------------------------------------------------------------
   Event & inisialisasi
   ------------------------------------------------------------------ */

form.addEventListener('submit', simpanTransaksi);
form.addEventListener('input', updateUI);
form.addEventListener('change', updateUI);

resetBtn.addEventListener('click', resetForm);
refreshBtn.addEventListener('click', loadHistory);

historyBody.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete]');
  if (button) hapusTransaksi(button.dataset.delete, button);
});

let resizeFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    placeIndicator(false);
    if (creditOpen) {
      creditHeight = creditInner.offsetHeight;
      creditSpring.jump(creditHeight);
    }
  });
});

tanggalInput.value = new Date().toISOString().slice(0, 10);
updateUI();
loadHistory();
