import type { InspectionForm, FormQueryFilters, FormSummary, QualityMetricResult } from "./types.js";
export declare function getFormById(formId: string): Promise<InspectionForm | null>;
export declare function listForms(filters: FormQueryFilters): Promise<InspectionForm[]>;
export declare function getQualityMetrics(filters: FormQueryFilters): Promise<QualityMetricResult[]>;
export declare function listClients(): Promise<string[]>;
export declare function toFormSummary(form: InspectionForm): FormSummary;
//# sourceMappingURL=db.d.ts.map