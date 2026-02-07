import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const appUrl = url.searchParams.get("state") || "http://localhost:5173";

  if (error) {
    return Response.redirect(
      `${appUrl}/github?error=${encodeURIComponent(error)}`,
      302
    );
  }

  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  const clientId = Deno.env.get("GITHUB_CLIENT_ID");
  const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return Response.redirect(
      `${appUrl}/github?error=${encodeURIComponent("GitHub OAuth not configured")}`,
      302
    );
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return Response.redirect(
        `${appUrl}/github?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`,
        302
      );
    }

    const accessToken = tokenData.access_token;
    return Response.redirect(
      `${appUrl}/github?token=${encodeURIComponent(accessToken)}`,
      302
    );
  } catch (e) {
    console.error("GitHub OAuth error:", e);
    return Response.redirect(
      `${appUrl}/github?error=${encodeURIComponent("Failed to connect")}`,
      302
    );
  }
});
