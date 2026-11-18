# PROJECT_MEMORY — porto-main

**Status:** ATURAN AKTIF untuk project ini saja
**Dibuat:** 16 November 2026
**Cakupan:** KHUSUS project porto-main + folder ini. Bukan aturan global, tidak berlaku untuk project/folder lain.

---

## 1. Lokasi utama

| Jenis | Path |
|---|---|
| Folder utama semua file | `/home/sync-id/Documents/BackUP_Migrasi/porto-local/porto-main/` |
| Log perubahan Hermes | `/home/sync-id/.hermes/agent-change-log.md` |
| File aturan ini | `/home/sync-id/Documents/BackUP_Migrasi/porto-local/porto-main/PROJECT_MEMORY.md` |

Semua pekerjaan, perubahan, dan catatan untuk project ini hanya menyentuh folder di atas.

---

## 2. Aturan update

1. **Setiap ada perubahan kode** di project ini → catat di `/home/sync-id/.hermes/agent-change-log.md`.
2. Beri tanda `[porto-main]` di awal/variabel entri supaya gampang difilter.
3. Setelah **project porto-main selesai** → perbarui entri memori di `~/.hermes/memories/MEMORY.md` (baris "Project porto-main") dan tulis ringkasan akhir di file ini.
4. Project atau folder lain **tidak** mengikuti aturan ini.

---

## 3. Format entri log

Satu baris, mengikuti gaya terbaru di log:

```
YYYY-MM-DD HH:MM +07:00 | Agent: <nama> | [porto-main] <action> | <alasan>
```

Contoh:

```
2026-11-16 22:45 +07:00 | Agent: Sol | [porto-main] tambah PROJECT_MEMORY.md | aturan update khusus project porto-main
```

---

## 4. Snapshot kondisi saat aturan dibuat

- **Git:** branch `master`, **belum ada commit** — seluruh file masih `untracked`.
- **Stack:** Next.js (App Router) + Tailwind CSS v3.4, `jsconfig.json` (bukan TypeScript).
- **Isi folder:** `app/`, `components/`, `context/`, `public/`, `tests/`, `translations/`.
- **Konfigurasi:** `next.config.mjs`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.mjs`.
- **Catatan desain:** `.impeccable/decision/cinematic-rework.md`, `.impeccable/questions/roll.json`.
- **Belum ada:** `CLAUDE.md`, `AGENTS.md`, atau memori project sebelumnya.

---

## 5. Progres

Belum ada perubahan kode yang dicatat. Entri log pertama akan muncul di bagian ini setelah ada pekerjaan nyata.

| Tanggal | Perubahan | Oleh |
|---|---|---|
| 2026-11-18 | Catatan rombak scene 3D (verdict "norak") → `.impeccable/decision/3d-scene-rework-notes.md`; scene ditunda sampai arah A/B/C dipilih | Sol |