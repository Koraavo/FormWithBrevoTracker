export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      const origin = request.headers.get("Origin");
  
      const allowedOrigins = [
        "https://form-with-brevo-tracker.pages.dev",
        "https://webhookbrevo.kinjalvoraa.workers.dev",
        "http://127.0.0.1:5500" // Allow local testing
      ];
  
      function jsonResponse(data, status = 200) {
        return new Response(JSON.stringify(data), {
          status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "https://form-with-brevo-tracker.pages.dev",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, api-key",
          }
        });
      }
  
      if (request.method === "OPTIONS") {
        return jsonResponse({ success: true });
      }
  
      if (url.pathname === "/get-brevo-key") {
        if (!env.BREVO_API_KEY) return jsonResponse({ error: "API key not found" }, 500);
        return jsonResponse({ key: env.BREVO_API_KEY });
      }
  
      if (url.pathname === "/get-ma-key") {
        if (!env.BREVO_MA_KEY) return jsonResponse({ error: "MA key not found" }, 500);
        return jsonResponse({ key: env.BREVO_MA_KEY });
      }
  
      if (url.pathname === "/submit-form") {
        if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
        
        try {
          const requestData = await request.json();
          const { email, firstname, lastname, phone, isSubscribed } = requestData;
  
          if (!email || !firstname || !lastname) {
            return jsonResponse({ error: "Missing required fields" }, 400);
          }
  
          let body;
          if (isSubscribed) {
            body = JSON.stringify({
              sender: { email: "kinjal.vora@sendinblue.com", name: "Kinjal-Brevo" },
              to: [{ email, name: `${firstname} ${lastname}` }],
              templateId: 116,
              params: { FIRSTNAME: firstname, LASTNAME: lastname }
            });
          } else {
            body = JSON.stringify({
              email,
              emailBlacklisted: !isSubscribed,
              smsBlacklisted: phone === "",
              updateEnabled: true,
              listIds: [4],
              attributes: { FIRSTNAME: firstname, LASTNAME: lastname, SMS: phone || null, WHATSAPP: phone || null }
            });
          }
  
          const response = await fetch("https://api.brevo.com/v3/contacts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api-key": env.BREVO_API_KEY,
            },
            body,
          });
  
          if (!response.ok) throw new Error(await response.text());
          return jsonResponse({ success: true, message: "Form submission successful" });
        } catch (error) {
          console.error("🚨 Form Submission Error:", error);
          return jsonResponse({ error: "Form submission failed" }, 500);
        }
      }
  
      if (url.pathname.startsWith("/api/")) {
        const apiPath = url.pathname.replace("/api/", "");
        const apiUrl = `https://api.brevo.com/v3/${apiPath}`;
  
        if (!env.BREVO_API_KEY) return jsonResponse({ error: "API key not found" }, 500);
  
        try {
          const response = await fetch(apiUrl, {
            method: request.method,
            headers: {
              "Content-Type": "application/json",
              "api-key": env.BREVO_API_KEY,
            },
            body: request.method !== "GET" ? await request.text() : undefined,
          });
  
          return jsonResponse(await response.json(), response.status);
        } catch (error) {
          console.error("🚨 API Proxy Error:", error);
          return jsonResponse({ error: "API request failed" }, 500);
        }
      }
  
      return jsonResponse({ error: "Endpoint not found" }, 404);
    }
  };  