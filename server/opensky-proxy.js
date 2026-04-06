import { getAccessToken } from "./opensky-auth.js";

async function sendOpenSkyRequest(req, res, forceRefresh = false) {
  const upstreamPath = req.originalUrl.replace(/^\/api\/opensky/, "");
  const upstreamUrl = new URL(upstreamPath, "https://opensky-network.org");
  const accessToken = await getAccessToken(forceRefresh);
  const response = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (response.status === 401 && !forceRefresh) {
    return sendOpenSkyRequest(req, res, true);
  }

  const body = await response.text();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    res.setHeader("Content-Type", contentType);
  }

  res.status(response.status).send(body);
}

export { sendOpenSkyRequest };
