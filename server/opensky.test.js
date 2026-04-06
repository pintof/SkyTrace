import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { registerFrontend } from "./frontend.js";
import { getAccessToken, resetAccessTokenCache } from "./opensky-auth.js";
import { sendOpenSkyRequest } from "./opensky-proxy.js";

// These tests are unit tests, not integration tests.
// They intentionally use fake env values because fetch is mocked and no real
// network call is made to the auth server or OpenSky.

function createMockResponse({
  status = 200,
  body = "",
  jsonBody,
  headers = {},
}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    async text() {
      if (typeof body === "string") {
        return body;
      }

      return JSON.stringify(body);
    },
    async json() {
      if (jsonBody !== undefined) {
        return jsonBody;
      }

      if (typeof body === "string") {
        return JSON.parse(body);
      }

      return body;
    },
  };
}

function createMockResponseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    sendFile(filePath) {
      this.body = filePath;
      return this;
    },
  };
}

function createMockAppRecorder() {
  return {
    middleware: [],
    routes: [],
    use(middleware) {
      this.middleware.push(middleware);
    },
    get(routePath, handler) {
      this.routes.push({ routePath, handler });
    },
  };
}

function toUrlString(url) {
  if (typeof url === "string") {
    return url;
  }

  if (url instanceof URL) {
    return url.href;
  }

  throw new TypeError("Expected fetch URL to be a string or URL instance");
}

function withMockedEnv() {
  process.env.OPENSKY_AUTH_URL = "https://auth.example.test/token";
  process.env.OPENSKY_CLIENT_ID = "client-id";
  process.env.OPENSKY_CLIENT_SECRET = "client-secret";
  process.env.OPENSKY_TOKEN_GRANT_TYPE = "client_credentials";
  delete process.env.OPENSKY_TOKEN_SCOPE;
  delete process.env.OPENSKY_TOKEN_AUDIENCE;
}

test.beforeEach(() => {
  resetAccessTokenCache();
  withMockedEnv();
});

test.afterEach(() => {
  resetAccessTokenCache();
});

test("registerFrontend returns a 500 JSON response when the build output is missing", async () => {
  const app = createMockAppRecorder();
  const response = createMockResponseRecorder();
  const missingIndexHtmlPath = path.join(
    process.cwd(),
    "__missing_dist__",
    "index.html",
  );

  registerFrontend(app, path.join(process.cwd(), "dist"), missingIndexHtmlPath);

  assert.equal(app.routes.length, 1);
  assert.equal(app.routes[0].routePath, "/{*splat}");

  await app.routes[0].handler({}, response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    error: "Missing frontend build",
    message: "Run npm run build before starting the production server.",
  });
});

test("getAccessToken caches the refreshed token until expiry", async () => {
  const originalFetch = globalThis.fetch;
  let refreshCalls = 0;

  globalThis.fetch = async (url) => {
    assert.equal(url, "https://auth.example.test/token");
    refreshCalls += 1;

    return createMockResponse({
      jsonBody: {
        access_token: `token-${refreshCalls}`,
        expires_in: 1800,
      },
    });
  };

  try {
    const firstToken = await getAccessToken();
    const secondToken = await getAccessToken();

    assert.equal(firstToken, "token-1");
    assert.equal(secondToken, "token-1");
    assert.equal(refreshCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAccessToken collapses concurrent refreshes into one in-flight request", async () => {
  const originalFetch = globalThis.fetch;
  let refreshCalls = 0;

  globalThis.fetch = async (url) => {
    assert.equal(url, "https://auth.example.test/token");
    refreshCalls += 1;

    await new Promise((resolve) => setTimeout(resolve, 10));

    return createMockResponse({
      jsonBody: {
        access_token: "shared-token",
        expires_in: 1800,
      },
    });
  };

  try {
    const [firstToken, secondToken, thirdToken] = await Promise.all([
      getAccessToken(),
      getAccessToken(),
      getAccessToken(),
    ]);

    assert.equal(firstToken, "shared-token");
    assert.equal(secondToken, "shared-token");
    assert.equal(thirdToken, "shared-token");
    assert.equal(refreshCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendOpenSkyRequest refreshes token and retries once after upstream 401", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const request = {
    originalUrl: "/api/opensky/api/states/all?icao24=0c2012",
  };
  const response = createMockResponseRecorder();

  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = toUrlString(url);

    calls.push({ url: requestUrl, options });

    if (requestUrl === "https://auth.example.test/token") {
      const tokenNumber = calls.filter(
        (call) => call.url === "https://auth.example.test/token",
      ).length;

      return createMockResponse({
        jsonBody: {
          access_token: `token-${tokenNumber}`,
          expires_in: 1800,
        },
      });
    }

    const upstreamCalls = calls.filter(
      (call) =>
        call.url === "https://opensky-network.org/api/states/all?icao24=0c2012",
    );

    if (upstreamCalls.length === 1) {
      return createMockResponse({ status: 401, body: "expired" });
    }

    return createMockResponse({
      status: 200,
      body: '{"ok":true}',
      headers: { "content-type": "application/json" },
    });
  };

  try {
    await sendOpenSkyRequest(request, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, '{"ok":true}');
    assert.equal(response.headers["Content-Type"], "application/json");

    const authCalls = calls.filter(
      (call) => call.url === "https://auth.example.test/token",
    );
    const upstreamCalls = calls.filter(
      (call) =>
        call.url === "https://opensky-network.org/api/states/all?icao24=0c2012",
    );

    assert.equal(authCalls.length, 2);
    assert.equal(upstreamCalls.length, 2);
    assert.equal(
      upstreamCalls[0].options.headers.Authorization,
      "Bearer token-1",
    );
    assert.equal(
      upstreamCalls[1].options.headers.Authorization,
      "Bearer token-2",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
