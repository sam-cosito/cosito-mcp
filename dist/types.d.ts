export interface FormRow {
    field_name: string;
    input_type: string;
    required: boolean;
    answer: string;
    notes: string;
    applies_to: string[];
}
export interface FormSection {
    name: string;
    subtitle: string;
    rows: FormRow[];
}
export interface InspectionForm {
    form_id: string;
    entity_type: "FORM";
    client: string;
    items: string[];
    sections: FormSection[];
    inspection_date: string;
    created_at: string;
    status?: string;
}
export interface FormQueryFilters {
    client?: string;
    item?: string;
    date_from?: string;
    date_to?: string;
    section_name?: string;
    limit?: number;
}
export interface FieldValueResult {
    form_id: string;
    client: string;
    inspection_date: string;
    items: string[];
    section_name: string;
    field_name: string;
    input_type: string;
    answer: string;
    applies_to: string[];
}
export interface FormSummary {
    form_id: string;
    client: string;
    inspection_date: string;
    items: string[];
    status?: string;
    created_at: string;
}
//# sourceMappingURL=types.d.ts.map