"use client";

import { useState, useEffect, useCallback } from "react";
import type { SearchResult, JenisTransportasi } from "@/lib/types";
import JourneyCard from "@/components/JourneyCard";

interface Kota {
  kdkota: string;
  namakota: string;
}

const JENIS_OPTIONS: { value: JenisTransportasi; label: string }[] = [
  { value: "semua",              label: "Semua Moda" },
  { value: "Penyeberangan",     label: "⛴  Penyeberangan" },
  { value: "Perjalanan Bus",    label: "🚌  Bus" },
  { value: "Penerbangan",       label: "✈️  Pesawat" },
  { value: "Perjalanan Kereta", label: "🚂  Kereta" },
];

export default function HomePage() {
  const [kotaList, setKotaList] = useState<Kota[]>([]);
  const [kotaAsal, setKotaAsal]       = useState("");
  const [kotaTujuan, setKotaTujuan]   = useState("");
  const [jenis, setJenis]             = useState<JenisTransportasi>("semua");
  const [tanggal, setTanggal]         = useState("");
  const [result, setResult]           = useState<SearchResult | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [searched, setSearched]       = useState(false);

  // Load daftar kota
  useEffect(() => {
    fetch("/api/kota")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setKotaList(data);
      })
      .catch(() => {/* silent fail, user can type manually */});
  }, []);

  const handleSwap = () => {
    setKotaAsal(kotaTujuan);
    setKotaTujuan(kotaAsal);
  };

  const handleSearch = useCallback(async () => {
    if (!kotaAsal || !kotaTujuan) return;
    if (kotaAsal === kotaTujuan) {
      setError("Kota asal dan tujuan tidak boleh sama.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    const params = new URLSearchParams({ kotaAsal, kotaTujuan, jenis });
    if (tanggal) params.set("tanggal", tanggal);

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Terjadi kesalahan");
      setResult(data as SearchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [kotaAsal, kotaTujuan, jenis, tanggal]);

  const totalHasil = result
    ? result.direct.length + result.combined.length
    : 0;

  return (
    <>
      {/* ── HERO ─────────────────────────────────── */}
      <div className="hero">
        <div className="hero-inner">
          <span className="hero-label">Sistem Transportasi Nasional</span>
          <h1>Cari Perjalanan <em>Antar Kota</em></h1>
          <p>Temukan jadwal langsung maupun rute gabungan dengan berbagai moda transportasi.</p>

          {/* Search Card */}
          <div className="search-card">
            {/* Baris 1: Kota Asal — Tukar — Kota Tujuan */}
            <div className="search-grid">
              <div className="field">
                <label>Kota Asal</label>
                {kotaList.length > 0 ? (
                  <select value={kotaAsal} onChange={(e) => setKotaAsal(e.target.value)}>
                    <option value="">— Pilih Kota —</option>
                    {kotaList.map((k) => (
                      <option key={k.kdkota} value={k.kdkota}>
                        {k.namakota} ({k.kdkota})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Kode kota, mis. 2132SUA"
                    value={kotaAsal}
                    onChange={(e) => setKotaAsal(e.target.value.toUpperCase())}
                  />
                )}
              </div>

              <button className="swap-btn" onClick={handleSwap} title="Tukar asal & tujuan">
                ⇄
              </button>

              <div className="field">
                <label>Kota Tujuan</label>
                {kotaList.length > 0 ? (
                  <select value={kotaTujuan} onChange={(e) => setKotaTujuan(e.target.value)}>
                    <option value="">— Pilih Kota —</option>
                    {kotaList.map((k) => (
                      <option key={k.kdkota} value={k.kdkota}>
                        {k.namakota} ({k.kdkota})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Kode kota, mis. 2141JEA"
                    value={kotaTujuan}
                    onChange={(e) => setKotaTujuan(e.target.value.toUpperCase())}
                  />
                )}
              </div>
            </div>

            {/* Baris 2: Jenis — Tanggal — Cari */}
            <div className="search-bottom">
              <div className="field">
                <label>Moda Transportasi</label>
                <select value={jenis} onChange={(e) => setJenis(e.target.value as JenisTransportasi)}>
                  {JENIS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Tanggal (Opsional)</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>

              <button
                className="btn-search"
                onClick={handleSearch}
                disabled={loading || !kotaAsal || !kotaTujuan}
              >
                {loading ? "..." : "Cari →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RESULTS ───────────────────────────────── */}
      <div className="main">
        {error && <div className="error-banner">⚠️ {error}</div>}

        {loading && (
          <div className="loading-state">
            <div>🔍 Mencari perjalanan...</div>
          </div>
        )}

        {!loading && !searched && (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <p>Masukkan kota asal dan tujuan untuk mulai mencari.</p>
            <br />
            <small>Mendukung perjalanan langsung maupun gabungan (transit).</small>
          </div>
        )}

        {!loading && searched && result && totalHasil === 0 && (
          <div className="empty-state">
            <div className="empty-icon">😔</div>
            <p>Tidak ada perjalanan ditemukan untuk rute tersebut.</p>
            <br />
            <small>Coba ubah kota atau pilih "Semua Moda".</small>
          </div>
        )}

        {/* Perjalanan Langsung */}
        {!loading && result && result.direct.length > 0 && (
          <div>
            <div className="section-header">
              <span className="section-title">Perjalanan Langsung</span>
              <span className="badge">{result.direct.length} jadwal</span>
            </div>
            {result.direct.map((j, i) => (
              <JourneyCard key={i} journey={j} />
            ))}
          </div>
        )}

        {/* Perjalanan Gabungan */}
        {!loading && result && result.combined.length > 0 && (
          <div className={result.direct.length > 0 ? "section-gap" : ""}>
            <div className="section-header">
              <span className="section-title">Perjalanan Gabungan</span>
              <span className="badge badge-amber">{result.combined.length} opsi</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Rute dengan satu kali transit. Waktu tunggu minimal 15 menit.
            </p>
            {result.combined.map((j, i) => (
              <JourneyCard key={i} journey={j} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
