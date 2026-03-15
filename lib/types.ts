export type JenisTransportasi = "semua" | "Penyeberangan" | "Perjalanan Bus" | "Penerbangan" | "Perjalanan Kereta";

export interface Perjalanan {
  kdperjalanan: string;
  jenisperjalanan: string;
  waktukeberangkatan: string;
  waktutiba: string;
  kotaasal: string;
  namaasalkota?: string;
  kotatujuan: string;
  namatujuankota?: string;
  durasi_menit?: number;
}

export interface GabunganPerjalanan {
  type: "direct" | "combined";
  legs: Perjalanan[];
  total_durasi_menit: number;
  transit_kota?: string;
  transit_nama_kota?: string;
}

export interface SearchParams {
  kotaAsal: string;
  kotaTujuan: string;
  jenis: JenisTransportasi;
  tanggal?: string;
}

export interface SearchResult {
  direct: GabunganPerjalanan[];
  combined: GabunganPerjalanan[];
}
