export interface AwsCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}
export declare function getAwsCredentials(): Promise<AwsCredentials>;
//# sourceMappingURL=auth.d.ts.map