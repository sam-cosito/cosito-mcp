import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { createMcpServer } from "./server.js";

const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN!;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET!;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const SERVER_URL = process.env.MCP_SERVER_URL!;

const verifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_USER_POOL_ID,
  clientId: COGNITO_CLIENT_ID,
  tokenUse: "access",
});

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, mcp-session-id",
  "access-control-max-age": "86400",
};

type LambdaResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type FnUrlEvent = {
  rawPath: string;
  rawQueryString?: string;
  headers?: Record<string, string>;
  requestContext: { http: { method: string } };
  body?: string;
  isBase64Encoded?: boolean;
};

function json(statusCode: number, body: unknown, extra?: Record<string, string>): LambdaResult {
  return {
    statusCode,
    headers: { "content-type": "application/json", ...CORS_HEADERS, ...(extra ?? {}) },
    body: JSON.stringify(body),
  };
}

function redirect(location: string): LambdaResult {
  return { statusCode: 302, headers: { location }, body: "" };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return {};
  }
}

export const handler = async (event: FnUrlEvent): Promise<LambdaResult> => {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.rawPath;
  const params = new URLSearchParams(event.rawQueryString ?? "");

  console.log(`${method} ${path}`);

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (path === "/health" && method === "GET") {
    return json(200, { status: "ok", service: "cosito-mcp" });
  }

  // OAuth 2.0 Authorization Server Metadata (RFC 8414)
  if (path === "/.well-known/oauth-authorization-server" && method === "GET") {
    return json(200, {
      issuer: SERVER_URL,
      authorization_endpoint: `${SERVER_URL}/authorize`,
      token_endpoint: `${SERVER_URL}/token`,
      registration_endpoint: `${SERVER_URL}/register`,
      scopes_supported: ["openid", "email"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  }

  // OAuth Protected Resource Metadata (RFC 9728)
  if (path === "/.well-known/oauth-protected-resource" && method === "GET") {
    return json(200, {
      resource: SERVER_URL,
      authorization_servers: [SERVER_URL],
      bearer_methods_supported: ["header"],
    });
  }

  // Dynamic Client Registration — return our pre-configured Cognito client
  if (path === "/register" && method === "POST") {
    return json(201, {
      client_id: COGNITO_CLIENT_ID,
      client_name: "Cosito MCP",
      redirect_uris: [
        "https://claude.ai/api/mcp/auth_callback",
        "https://claude.com/api/mcp/auth_callback",
      ],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  }

  // Authorization — relay to Cognito, encoding Claude's redirect_uri + state
  if (path === "/authorize" && method === "GET") {
    const clientId = params.get("client_id");
    const claudeRedirectUri = params.get("redirect_uri") ?? "";
    const claudeState = params.get("state") ?? "";
    const codeChallenge = params.get("code_challenge") ?? "";
    const codeChallengeMethod = params.get("code_challenge_method") ?? "S256";

    if (clientId !== COGNITO_CLIENT_ID) {
      return json(400, { error: "invalid_client", error_description: "Unknown client_id" });
    }

    const relayState = Buffer.from(JSON.stringify({ uri: claudeRedirectUri, st: claudeState })).toString("base64url");
    const ourCallback = `${SERVER_URL}/callback`;
    const cognitoParams = new URLSearchParams({
      response_type: "code",
      client_id: COGNITO_CLIENT_ID,
      redirect_uri: ourCallback,
      state: relayState,
      scope: "openid email",
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });
    return redirect(`${COGNITO_DOMAIN}/oauth2/authorize?${cognitoParams}`);
  }

  // Callback — decode relay state and forward code back to Claude
  if (path === "/callback" && method === "GET") {
    const code = params.get("code");
    const state = params.get("state") ?? "";
    const error = params.get("error");

    if (error || !code) {
      return json(400, { error: error ?? "missing_code" });
    }

    let claudeRedirectUri: string;
    let claudeState: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      claudeRedirectUri = decoded.uri;
      claudeState = decoded.st;
    } catch {
      return json(400, { error: "invalid_state" });
    }

    const callbackParams = new URLSearchParams({ code, state: claudeState });
    return redirect(`${claudeRedirectUri}?${callbackParams}`);
  }

  // Token — proxy to Cognito with client secret + forward code_verifier
  if (path === "/token" && method === "POST") {
    let rawBody = event.body ?? "";
    if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString();
    const incoming = new URLSearchParams(rawBody);

    const code = incoming.get("code") ?? "";
    const codeVerifier = incoming.get("code_verifier") ?? "";
    const grantType = incoming.get("grant_type") ?? "authorization_code";
    const ourCallback = `${SERVER_URL}/callback`;

    const basicAuth = Buffer.from(`${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`).toString("base64");
    const cognitoBody = new URLSearchParams({
      grant_type: grantType,
      client_id: COGNITO_CLIENT_ID,
      code,
      redirect_uri: ourCallback,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });

    const cognitoRes = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "authorization": `Basic ${basicAuth}`,
      },
      body: cognitoBody.toString(),
    });
    const responseBody = await cognitoRes.text();
    console.log("Cognito token status:", cognitoRes.status, "body:", responseBody.substring(0, 300));

    return {
      statusCode: cognitoRes.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
      body: responseBody,
    };
  }

  // MCP endpoint — verify JWT then handle with MCP transport
  if (path === "/mcp" && (method === "POST" || method === "GET" || method === "DELETE")) {
    const authHeader = event.headers?.["authorization"] ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token || token === authHeader) {
      console.log("MCP: no bearer token");
      return {
        statusCode: 401,
        headers: {
          "www-authenticate": `Bearer realm="${SERVER_URL}", resource_metadata="${SERVER_URL}/.well-known/oauth-protected-resource"`,
          "content-type": "application/json",
          ...CORS_HEADERS,
        },
        body: JSON.stringify({ error: "unauthorized", error_description: "Bearer token required" }),
      };
    }

    const claims = decodeJwtPayload(token);
    console.log("MCP: token claims:", JSON.stringify({
      token_use: claims["token_use"],
      client_id: claims["client_id"],
      exp: claims["exp"],
      iss: claims["iss"],
    }));

    try {
      await verifier.verify(token);
      console.log("MCP: JWT verified ok");
    } catch (err) {
      console.error("JWT verify failed:", err instanceof Error ? err.message : String(err));
      return {
        statusCode: 401,
        headers: {
          "www-authenticate": `Bearer error="invalid_token"`,
          "content-type": "application/json",
          ...CORS_HEADERS,
        },
        body: JSON.stringify({ error: "invalid_token" }),
      };
    }

    // Build a Web Standard Request directly — avoids the @hono/node-server
    // adapter that breaks on our Lambda event (missing rawHeaders).
    const host = event.headers?.["host"] ?? "localhost";
    const qs = event.rawQueryString ? `?${event.rawQueryString}` : "";
    const url = `https://${host}${path}${qs}`;

    const reqHeaders = new Headers(
      Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v] as [string, string])
    );

    let bodyInit: BodyInit | null = null;
    if (method !== "GET" && method !== "DELETE" && event.body) {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString()
        : event.body;
      console.log("MCP request body:", raw.substring(0, 200));
      bodyInit = raw;
    }

    const request = new Request(url, { method, headers: reqHeaders, body: bodyInit });

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createMcpServer();
    await server.connect(transport);

    const response = await transport.handleRequest(request);
    const responseBody = await response.text();
    console.log("MCP response:", response.status, responseBody.substring(0, 300));

    const responseHeaders: Record<string, string> = { ...CORS_HEADERS };
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return { statusCode: response.status, headers: responseHeaders, body: responseBody };
  }

  return json(404, { error: "Not found" });
};
