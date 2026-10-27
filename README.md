# Form Belanja — Toko Elektronik

Aplikasi web sederhana untuk mencatat transaksi penjualan elektronik (TV, Kulkas, Mesin Cuci, AC) dengan pembayaran **Tunai** atau **Kredit**, lengkap dengan perhitungan bunga dan pokok cicilan.

Dibuat dengan:

- **HTML** — struktur form dan tabel riwayat
- **CSS** — tema papan tulis (chalkboard) yang responsif
- **Node.js + Express** — server, API, dan penyimpanan data JSON

## Fitur

- Form customer, tanggal transaksi, jenis barang, jumlah unit, dan harga.
- Metode bayar **Tunai** atau **Kredit**.
- Kredit: pilih bank (BCA 5,5%, BNI 7%, CIMB Niaga 6,75%), tenor, dan DP.
- Perhitungan otomatis:
  - **Total belanja** = harga × jumlah
  - **Saldo** = total − DP
  - **Bunga** = saldo × bunga bank × (tenor / 12)
  - **Pokok cicilan** = (saldo + bunga) / tenor
  - **Total bayar** = total + bunga
- Riwayat transaksi tersimpan di `data/transactions.json`.
- Hapus transaksi dari tabel riwayat.

## Cara menjalankan

```bash
cd E:\iot\form-belanja
npm install
npm start
```

Buka browser ke:

```text
http://localhost:3000
```

Mode development (auto-restart saat file berubah):

```bash
npm run dev
```

## Struktur file

```text
form-belanja/
├── server.js
├── package.json
├── data/
│   └── transactions.json
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/transactions` | Mengambil semua transaksi |
| POST | `/api/transactions` | Menyimpan transaksi baru |
| DELETE | `/api/transactions/:id` | Menghapus transaksi |

Contoh body `POST /api/transactions`:

```json
{
  "customer": "Budi",
  "tanggal": "2026-10-27",
  "jenis": "TV",
  "jumlah": 2,
  "harga": 3500000,
  "metode": "kredit",
  "bank": "BCA",
  "tenor": 12,
  "dp": 1000000
}
```

## Catatan

- Perhitungan bunga menggunakan metode **bunga flat** per tahun, bukan bunga efektif/anuitas.
- Data disimpan di file JSON, cocok untuk demo atau tugas. Untuk produksi, gunakan database seperti SQLite/MySQL/PostgreSQL.
