const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'transactions.json');

const JENIS_BARANG = ['TV', 'Kulkas', 'Mesin Cuci', 'AC'];
const BANK_BUNGA = {
  BCA: 5.5,
  BNI: 7,
  'CIMB Niaga': 6.75
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function bacaTransaksi() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Gagal membaca data:', err.message);
    return [];
  }
}

function simpanTransaksi(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function angka(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hitungTransaksi(input) {
  const harga = Math.max(0, angka(input.harga));
  const jumlah = Math.max(1, Math.floor(angka(input.jumlah, 1)));
  const metode = input.metode === 'kredit' ? 'kredit' : 'tunai';
  const bank = BANK_BUNGA[input.bank] ? input.bank : 'BCA';
  const tenor = Math.max(1, Math.floor(angka(input.tenor, 12)));
  const total = harga * jumlah;

  if (metode === 'tunai') {
    return {
      harga,
      jumlah,
      metode,
      bank: null,
      tenor: 0,
      dp: 0,
      saldo: 0,
      bungaPersen: 0,
      bunga: 0,
      pokokCicilan: 0,
      total,
      totalBayar: total
    };
  }

  const dp = Math.min(Math.max(0, angka(input.dp)), total);
  const saldo = total - dp;
  const bungaPersen = BANK_BUNGA[bank];
  // Bunga flat per tahun, dihitung proporsional dengan tenor (bulan).
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

app.get('/api/transactions', (req, res) => {
  const data = bacaTransaksi();
  data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(data);
});

app.post('/api/transactions', (req, res) => {
  const { customer, tanggal, jenis } = req.body || {};

  if (!customer || String(customer).trim() === '') {
    return res.status(400).json({ message: 'Nama customer wajib diisi.' });
  }
  if (!JENIS_BARANG.includes(jenis)) {
    return res.status(400).json({ message: 'Jenis barang tidak valid.' });
  }

  const perhitungan = hitungTransaksi(req.body || {});
  if (perhitungan.total <= 0) {
    return res.status(400).json({ message: 'Harga dan jumlah harus lebih dari 0.' });
  }

  const transaksi = {
    id: `TRX-${Date.now()}`,
    customer: String(customer).trim(),
    tanggal: tanggal || new Date().toISOString().slice(0, 10),
    jenis,
    ...perhitungan,
    createdAt: new Date().toISOString()
  };

  const data = bacaTransaksi();
  data.push(transaksi);
  simpanTransaksi(data);

  res.status(201).json(transaksi);
});

app.delete('/api/transactions/:id', (req, res) => {
  const data = bacaTransaksi();
  const sisa = data.filter((item) => item.id !== req.params.id);
  if (sisa.length === data.length) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
  }
  simpanTransaksi(sisa);
  res.json({ message: 'Transaksi dihapus.' });
});

app.listen(PORT, () => {
  console.log(`Form Belanja berjalan di http://localhost:${PORT}`);
});
