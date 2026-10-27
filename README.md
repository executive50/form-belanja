# Form Belanja — Toko Elektronik

Aplikasi web sederhana untuk mencatat transaksi penjualan elektronik (TV, Kulkas, Mesin Cuci, AC) dengan pembayaran **Tunai** atau **Kredit**, lengkap dengan perhitungan bunga dan pokok cicilan.

Dibuat dengan:

- **HTML** — struktur form dan tabel riwayat
- **CSS** — material translusen, tipografi sistem, mode terang/gelap otomatis, dan motion berbasis spring (gaya Apple)
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

## Desain & motion

Antarmuka mengikuti prinsip *apple-design* (fluid interfaces):

- **Material translusen** — toolbar sticky dan panel memakai `backdrop-filter` sehingga konten mengalir di bawahnya.
- **Palet** — maroon `#540b0e`, merah bata `#9e2a2b`, emas `#e09f3e`, kuning pastel `#fff3b0`, dan teal `#335c67`.
- **Spring, bukan durasi tetap** — panel kredit, indikator segmented control, dan toast dianimasikan dengan spring (`damping` 1.0) yang bisa dibalik di tengah jalan.
- **Feedback instan** — tombol dan kartu metode memberi respons pada saat ditekan (`:active`), bukan saat dilepas.
- **Tipografi optik** — font sistem, tracking negatif untuk judul besar, `tabular-nums` untuk angka rupiah.
- **Adaptif** — mengikuti mode terang/gelap sistem, serta menghormati `prefers-reduced-motion`, `prefers-reduced-transparency`, dan `prefers-contrast`.

## Cara menjalankan

```bash
cd "E:\Pemrograman 2\form-belanja"
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
