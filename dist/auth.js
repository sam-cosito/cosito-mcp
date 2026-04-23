import { CognitoIdentityProviderClient, InitiateAuthCommand, AuthFlowType, } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand, } from "@aws-sdk/client-cognito-identity";
let cachedCredentials = null;
let credentialsExpiry = null;
export async function getAwsCredentials() {
    // Mode 1: direct IAM credentials — fastest path, recommended for server deployments
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
        };
    }
    // Mode 2: Cognito User Pool + Identity Pool — returns temporary AWS credentials
    const requiredVars = [
        "COGNITO_USER_POOL_ID",
        "COGNITO_CLIENT_ID",
        "COGNITO_USERNAME",
        "COGNITO_PASSWORD",
        "COGNITO_IDENTITY_POOL_ID",
    ];
    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables. Provide either AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY, ` +
            `or all Cognito variables: ${missing.join(", ")}`);
    }
    // Return cached credentials if still valid (with 5-minute buffer)
    if (cachedCredentials &&
        credentialsExpiry &&
        credentialsExpiry.getTime() - Date.now() > 5 * 60 * 1000) {
        return cachedCredentials;
    }
    const region = process.env.AWS_REGION || "us-east-1";
    // Step 1: Authenticate with Cognito User Pool to get ID token
    const idpClient = new CognitoIdentityProviderClient({ region });
    const authResponse = await idpClient.send(new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
            USERNAME: process.env.COGNITO_USERNAME,
            PASSWORD: process.env.COGNITO_PASSWORD,
        },
    }));
    const idToken = authResponse.AuthenticationResult?.IdToken;
    if (!idToken) {
        throw new Error("Cognito authentication failed — no ID token returned");
    }
    // Step 2: Exchange ID token for temporary AWS credentials via Identity Pool
    const logins = {
        [`cognito-idp.${region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`]: idToken,
    };
    const identityClient = new CognitoIdentityClient({ region });
    const { IdentityId } = await identityClient.send(new GetIdCommand({
        IdentityPoolId: process.env.COGNITO_IDENTITY_POOL_ID,
        Logins: logins,
    }));
    if (!IdentityId) {
        throw new Error("Failed to obtain Cognito Identity ID");
    }
    const { Credentials } = await identityClient.send(new GetCredentialsForIdentityCommand({
        IdentityId,
        Logins: logins,
    }));
    if (!Credentials?.AccessKeyId || !Credentials?.SecretKey) {
        throw new Error("Failed to obtain AWS credentials from Cognito Identity Pool");
    }
    cachedCredentials = {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretKey,
        sessionToken: Credentials.SessionToken,
    };
    credentialsExpiry = Credentials.Expiration ?? new Date(Date.now() + 60 * 60 * 1000);
    return cachedCredentials;
}
//# sourceMappingURL=auth.js.map