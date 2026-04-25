export interface TruckInspection {
  clean_interior_exterior?: string;
  no_unusual_odors?: string;
  security_seal?: string;
  no_mold_dirt_contamination?: string;
  no_pests_insects?: string;
  documentation_complete?: string;
  truck_temperature_f?: number | null;
  comments?: string;
}

export interface PackagingInspection {
  packaging_integrity?: string;
  labeling?: string;
  hygienic_conditions?: string;
  packaging_type?: string;
  comments?: string;
}

export interface Quantity {
  num_pallets?: number;
  cases_per_pallet?: number;
  total_cases?: number;
  requested_count?: number;
  actual_count?: number;
  variancy?: number;
}

export interface Defects {
  mechanical_damage?: number | null;
  cracks?: number | null;
  splits?: number | null;
  bruising?: number | null;
  blistering?: number | null;
  pitting?: number | null;
  shriveling?: number | null;
  insect_damage?: number | null;
  decay?: number | null;
  mold?: number | null;
  rusting?: number | null;
  water_damage?: number | null;
  scarring?: number | null;
  color_issue?: number | null;
  size_issue?: number | null;
  stem_issue?: number | null;
  tip_issue?: number | null;
  other?: number | null;
}

export interface QualityAssessment {
  pack_date?: string | null;
  inspection_status?: string;
  product_temperature_f?: string | null;
  pressure?: number | null;
  brix?: number | null;
  cases_inspected?: number;
  units_inspected?: number;
  defects?: Defects;
  defect_total_percentage?: number;
  ai_generated_comments?: string;
}

export interface QAAuthorization {
  final_verification_pass?: boolean;
  name?: string;
  title?: string;
  signature?: string;
}

export interface InspectionForm {
  form_id: string;
  entity_type: "FORM";
  client: string;
  items: string[];
  inspection_date: string;
  inspection_time?: string;
  po_number?: string;
  inspector_name?: string;
  shipper?: string;
  brand?: string;
  product_name?: string;
  origin?: string;
  truck_inspection?: TruckInspection;
  packaging_inspection?: PackagingInspection;
  quantity?: Quantity;
  quality_assessment?: QualityAssessment;
  qa_authorization?: QAAuthorization;
}

export interface FormQueryFilters {
  client?: string;
  item?: string;
  date_from?: string;
  date_to?: string;
  po_number?: string;
  inspection_status?: string;
  origin?: string;
  limit?: number;
}

export interface FormSummary {
  form_id: string;
  client: string;
  inspection_date: string;
  inspection_time?: string;
  po_number?: string;
  inspector_name?: string;
  product_name?: string;
  items: string[];
  origin?: string;
  inspection_status?: string;
}

export interface QualityMetricResult {
  form_id: string;
  client: string;
  inspection_date: string;
  po_number?: string;
  product_name?: string;
  origin?: string;
  inspection_status?: string;
  brix?: number | null;
  product_temperature_f?: string | null;
  pressure?: number | null;
  defect_total_percentage?: number;
  defects?: Defects;
  ai_generated_comments?: string;
}