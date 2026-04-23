type LambdaResult = {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
};
type FnUrlEvent = {
    rawPath: string;
    rawQueryString?: string;
    headers?: Record<string, string>;
    requestContext: {
        http: {
            method: string;
        };
    };
    body?: string;
    isBase64Encoded?: boolean;
};
export declare const handler: (event: FnUrlEvent) => Promise<LambdaResult>;
export {};
//# sourceMappingURL=lambda.d.ts.map