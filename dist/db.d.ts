import type { InspectionForm, FormQueryFilters, FieldValueResult, FormSummary } from "./types.js";
export declare function getFormById(formId: string): Promise<InspectionForm | null>;
export declare function listForms(filters: FormQueryFilters): Promise<InspectionForm[]>;
export declare function queryFieldValues(fieldName: string, filters: FormQueryFilters): Promise<FieldValueResult[]>;
export declare function listClients(): Promise<string[]>;
export declare function toFormSummary(form: InspectionForm): FormSummary;
//# sourceMappingURL=db.d.ts.map