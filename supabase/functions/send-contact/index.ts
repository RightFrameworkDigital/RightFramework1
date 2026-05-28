import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendEmail(resendKey: string, payload: object) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { name, business, email, phone, message, type, date, time } = body;

    const isAppointment = type === "appointment";

    if (isAppointment) {
      if (!name || !business || !phone || !message) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Resend API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Email to Right Framework ---
    const internalSubject = isAppointment
      ? `New Consultation Request — ${date} at ${time}`
      : `New Message from ${name}`;

    const internalBody = isAppointment
      ? `
<h2>New Free Consultation Request</h2>
<table style="border-collapse:collapse;width:100%;max-width:560px;font-family:sans-serif;font-size:15px;color:#111;">
  <tr><td style="padding:8px 0;color:#666;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">Business</td><td style="padding:8px 0;">${business}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">Phone</td><td style="padding:8px 0;"><a href="tel:${phone}" style="color:#1a56db;">${phone}</a></td></tr>
  ${email ? `<tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#1a56db;">${email}</a></td></tr>` : ""}
  <tr><td style="padding:8px 0;color:#666;">Requested Date</td><td style="padding:8px 0;font-weight:600;color:#1a56db;">${date}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">Requested Time</td><td style="padding:8px 0;font-weight:600;color:#1a56db;">${time}</td></tr>
  <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;">${message.replace(/\n/g, "<br>")}</td></tr>
</table>
<p style="margin-top:24px;font-size:13px;color:#888;">Sent via rightframework.tech contact form</p>
      `.trim()
      : `
<h2>New Message from ${name}</h2>
<table style="border-collapse:collapse;width:100%;max-width:560px;font-family:sans-serif;font-size:15px;color:#111;">
  <tr><td style="padding:8px 0;color:#666;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">Business</td><td style="padding:8px 0;">${business || "—"}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#1a56db;">${email}</a></td></tr>
  <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;">${message.replace(/\n/g, "<br>")}</td></tr>
</table>
<p style="margin-top:24px;font-size:13px;color:#888;">Sent via rightframework.tech contact form</p>
      `.trim();

    await sendEmail(resendKey, {
      from: "Right Framework <contact@rightframework.tech>",
      to: ["contact@rightframework.tech"],
      ...(email ? { reply_to: email } : {}),
      subject: internalSubject,
      html: internalBody,
    });

    // --- Confirmation email to customer (only if they provided an email) ---
    // Requires a verified domain in Resend. Fails silently until then.
    const customerEmail = email || null;
    if (customerEmail) {
      const confirmationSubject = isAppointment
        ? "We received your consultation request — Right Framework"
        : "We received your message — Right Framework";

      const confirmationBody = isAppointment
        ? `
<div style="font-family:sans-serif;font-size:15px;color:#111;max-width:560px;">
  <h2 style="color:#111;">Thanks, ${name}! We'll be in touch soon.</h2>
  <p>We received your consultation request for <strong>${date} at ${time}</strong>. Our team will confirm your appointment shortly.</p>
  <p>Here's a summary of what you submitted:</p>
  <table style="border-collapse:collapse;width:100%;font-size:15px;color:#111;">
    <tr><td style="padding:6px 0;color:#666;width:140px;">Business</td><td style="padding:6px 0;">${business}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Phone</td><td style="padding:6px 0;">${phone}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Requested Date</td><td style="padding:6px 0;">${date}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Requested Time</td><td style="padding:6px 0;">${time}</td></tr>
    <tr><td style="padding:6px 0;color:#666;vertical-align:top;">Message</td><td style="padding:6px 0;">${message.replace(/\n/g, "<br>")}</td></tr>
  </table>
  <p style="margin-top:24px;">If you have any questions in the meantime, reply to this email or reach us at <a href="mailto:contact@rightframework.tech" style="color:#1a56db;">contact@rightframework.tech</a>.</p>
  <p style="color:#888;font-size:13px;margin-top:32px;">— The Right Framework Team</p>
</div>
        `.trim()
        : `
<div style="font-family:sans-serif;font-size:15px;color:#111;max-width:560px;">
  <h2 style="color:#111;">Thanks, ${name}! We got your message.</h2>
  <p>We'll get back to you as soon as possible, typically within 1 business day.</p>
  <p>Here's a copy of your message:</p>
  <blockquote style="border-left:3px solid #ddd;margin:16px 0;padding:8px 16px;color:#444;">${message.replace(/\n/g, "<br>")}</blockquote>
  <p>If you have anything to add, just reply to this email or reach us at <a href="mailto:contact@rightframework.tech" style="color:#1a56db;">contact@rightframework.tech</a>.</p>
  <p style="color:#888;font-size:13px;margin-top:32px;">— The Right Framework Team</p>
</div>
        `.trim();

      try {
        await sendEmail(resendKey, {
          from: "Right Framework <contact@rightframework.tech>",
          to: [customerEmail],
          reply_to: "contact@rightframework.tech",
          subject: confirmationSubject,
          html: confirmationBody,
        });
      } catch (_) {
        // Silently skip — requires verified domain in Resend
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
