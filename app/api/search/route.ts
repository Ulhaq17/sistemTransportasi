import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Perjalanan, GabunganPerjalanan, SearchResult } from "@/lib/types";

function hitungDurasi(awal: string, akhir: string): number {
  const diff = new Date(akhir).getTime() - new Date(awal).getTime();
  return Math.round(diff / 60000);
}

function formatPerjalanan(row: Record<string, unknown>): Perjalanan {
  return {
    kdperjalanan: row.kdperjalanan as string,
    jenisperjalanan: row.jenisperjalanan as string,
    waktukeberangkatan: row.waktukeberangkatan as string,
    waktutiba: row.waktutiba as string,
    kotaasal: row.kotaasal as string,
    namaasalkota: (row.namaasalkota as string) ?? row.kotaasal as string,
    kotatujuan: row.kotatujuan as string,
    namatujuankota: (row.namatujuankota as string) ?? row.kotatujuan as string,
    durasi_menit: hitungDurasi(
      row.waktukeberangkatan as string,
      row.waktutiba as string
    ),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const kotaAsal = searchParams.get("kotaAsal")?.trim().toUpperCase();
  const kotaTujuan = searchParams.get("kotaTujuan")?.trim().toUpperCase();
  const jenis = searchParams.get("jenis") ?? "semua";
  const tanggal = searchParams.get("tanggal"); // format: YYYY-MM-DD

  if (!kotaAsal || !kotaTujuan) {
    return NextResponse.json(
      { error: "kotaAsal dan kotaTujuan wajib diisi" },
      { status: 400 }
    );
  }

  try {
    // ----------------------------------------------------------------
    // Bangun filter jenis transportasi
    // ----------------------------------------------------------------
    const jenisFilter =
      jenis === "semua" ? sql`` : sql`AND p.jenisperjalanan = ${jenis}`;

    const tanggalFilter = tanggal
      ? sql`AND DATE(p.waktukeberangkatan) = ${tanggal}`
      : sql``;

    // ----------------------------------------------------------------
    // Query 1: Perjalanan langsung
    // ----------------------------------------------------------------
    const directRows = await sql`
      SELECT
        p.kdperjalanan,
        p.jenisperjalanan,
        p.waktukeberangkatan,
        p.waktutiba,
        p.kotaasal,
        ka.namakota AS namaasalkota,
        p.kotatujuan,
        kt.namakota AS namatujuankota
      FROM perjalanan p
      LEFT JOIN kota ka ON ka.kdkota = p.kotaasal
      LEFT JOIN kota kt ON kt.kdkota = p.kotatujuan
      WHERE p.kotaasal    = ${kotaAsal}
        AND p.kotatujuan  = ${kotaTujuan}
        ${jenisFilter}
        ${tanggalFilter}
      ORDER BY p.waktukeberangkatan ASC
    `;

    const direct: GabunganPerjalanan[] = directRows.map((row) => {
      const leg = formatPerjalanan(row as Record<string, unknown>);
      return {
        type: "direct",
        legs: [leg],
        total_durasi_menit: leg.durasi_menit ?? 0,
      };
    });

    // ----------------------------------------------------------------
    // Query 2: Perjalanan gabungan (dengan satu transit)
    // ----------------------------------------------------------------
    const combinedRows = await sql`
      SELECT
        p1.kdperjalanan        AS kd1,
        p1.jenisperjalanan     AS jenis1,
        p1.waktukeberangkatan  AS berangkat1,
        p1.waktutiba           AS tiba1,
        p1.kotaasal            AS asal1,
        ka1.namakota           AS namaasal1,
        p1.kotatujuan          AS tujuan1,

        p2.kdperjalanan        AS kd2,
        p2.jenisperjalanan     AS jenis2,
        p2.waktukeberangkatan  AS berangkat2,
        p2.waktutiba           AS tiba2,
        p2.kotatujuan          AS tujuan2,
        kt2.namakota           AS namatujuan2,

        k_transit.namakota     AS transit_nama_kota
      FROM perjalanan p1
      JOIN perjalanan p2
        ON  p1.kotatujuan         = p2.kotaasal
        AND p2.waktukeberangkatan >= p1.waktutiba + INTERVAL '15 minutes'
      LEFT JOIN kota ka1       ON ka1.kdkota  = p1.kotaasal
      LEFT JOIN kota kt2       ON kt2.kdkota  = p2.kotatujuan
      LEFT JOIN kota k_transit ON k_transit.kdkota = p1.kotatujuan
      WHERE p1.kotaasal   = ${kotaAsal}
        AND p2.kotatujuan = ${kotaTujuan}
        AND p1.kotatujuan != ${kotaTujuan}
        AND (${jenis} = 'semua'
          OR p1.jenisperjalanan = ${jenis}
          OR p2.jenisperjalanan = ${jenis})
        ${
          tanggal
            ? sql`AND DATE(p1.waktukeberangkatan) = ${tanggal}`
            : sql``
        }
      ORDER BY p1.waktukeberangkatan ASC, p2.waktukeberangkatan ASC
      LIMIT 20
    `;

    const combined: GabunganPerjalanan[] = combinedRows.map((row) => {
      const r = row as Record<string, unknown>;
      const leg1: Perjalanan = {
        kdperjalanan: r.kd1 as string,
        jenisperjalanan: r.jenis1 as string,
        waktukeberangkatan: r.berangkat1 as string,
        waktutiba: r.tiba1 as string,
        kotaasal: r.asal1 as string,
        namaasalkota: (r.namaasal1 as string) ?? (r.asal1 as string),
        kotatujuan: r.tujuan1 as string,
        namatujuankota: (r.transit_nama_kota as string) ?? (r.tujuan1 as string),
        durasi_menit: hitungDurasi(r.berangkat1 as string, r.tiba1 as string),
      };
      const leg2: Perjalanan = {
        kdperjalanan: r.kd2 as string,
        jenisperjalanan: r.jenis2 as string,
        waktukeberangkatan: r.berangkat2 as string,
        waktutiba: r.tiba2 as string,
        kotaasal: r.tujuan1 as string,
        namaasalkota: (r.transit_nama_kota as string) ?? (r.tujuan1 as string),
        kotatujuan: r.tujuan2 as string,
        namatujuankota: (r.namatujuan2 as string) ?? (r.tujuan2 as string),
        durasi_menit: hitungDurasi(r.berangkat2 as string, r.tiba2 as string),
      };
      const totalDurasi = hitungDurasi(
        r.berangkat1 as string,
        r.tiba2 as string
      );
      return {
        type: "combined",
        legs: [leg1, leg2],
        total_durasi_menit: totalDurasi,
        transit_kota: r.tujuan1 as string,
        transit_nama_kota:
          (r.transit_nama_kota as string) ?? (r.tujuan1 as string),
      };
    });

    const result: SearchResult = { direct, combined };
    return NextResponse.json(result);
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Periksa koneksi database." },
      { status: 500 }
    );
  }
}
