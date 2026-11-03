export interface MapReport {
  id: number;
  text_masked: string;
  intensity: number;
  intensity_src: "ai" | "button";
  odor_type: string;
  symptoms: string[];
  grid_lat: number;
  grid_lng: number;
  needs_review: boolean;
  merged_count: number;
  is_demo: boolean;
  reported_at: string;
}

export interface Summary {
  total: number;
  high_intensity_count: number;
  location_failures: number;
}

export const timeOf = (iso: string) => iso.slice(11, 16);
