const tokenState = {
  accessToken: null,
  expiresAt: 0,
  refreshPromise: null,
};

function resetAccessTokenCache() {
  tokenState.accessToken = null;
  tokenState.expiresAt = 0;
  tokenState.refreshPromise = null;
}

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildTokenRequestBody() {
  const params = new URLSearchParams();

  params.set(
    "grant_type",
    process.env.OPENSKY_TOKEN_GRANT_TYPE || "client_credentials",
  );
  params.set("client_id", getRequiredEnv("OPENSKY_CLIENT_ID"));
  params.set("client_secret", getRequiredEnv("OPENSKY_CLIENT_SECRET"));

  if (process.env.OPENSKY_TOKEN_SCOPE) {
    params.set("scope", process.env.OPENSKY_TOKEN_SCOPE);
  }

  if (process.env.OPENSKY_TOKEN_AUDIENCE) {
    params.set("audience", process.env.OPENSKY_TOKEN_AUDIENCE);
  }

  return params;
}

async function refreshAccessToken() {
  const response = await fetch(getRequiredEnv("OPENSKY_AUTH_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: buildTokenRequestBody(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenSky token refresh failed: ${response.status} ${errorText}`,
    );
  }

  const payload = await response.json();
  const expiresInSeconds = Number(payload.expires_in || 1800);
  const refreshBufferMs = Math.min(
    300000,
    Math.max(60000, expiresInSeconds * 250),
  );

  if (!payload.access_token) {
    throw new Error(
      "OpenSky token refresh response did not include access_token",
    );
  }

  tokenState.accessToken = payload.access_token;
  tokenState.expiresAt = Date.now() + expiresInSeconds * 1000 - refreshBufferMs;

  return tokenState.accessToken;
}

async function getAccessToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    tokenState.accessToken &&
    Date.now() < tokenState.expiresAt
  ) {
    return tokenState.accessToken;
  }

  if (!tokenState.refreshPromise) {
    tokenState.refreshPromise = refreshAccessToken().finally(() => {
      tokenState.refreshPromise = null;
    });
  }

  return tokenState.refreshPromise;
}

export { getAccessToken, resetAccessTokenCache };
