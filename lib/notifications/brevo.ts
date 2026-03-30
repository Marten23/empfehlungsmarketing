import "server-only";

type BrevoEmailRecipient = {
  email: string;
  name?: string | null;
};

type SendBrevoTransactionalEmailInput = {
  to: BrevoEmailRecipient;
  subject: string;
  htmlContent: string;
  textContent?: string;
};

type SendBrevoTemplateEmailInput = {
  to: BrevoEmailRecipient;
  templateId: number;
  params: Record<string, string>;
};

type BrevoSendResponse = {
  messageId?: string;
};

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY?.trim() ?? "";
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() ?? "";
  const senderName =
    process.env.BREVO_SENDER_NAME?.trim() || "Rewaro Benachrichtigung";

  if (!apiKey || !senderEmail) return null;
  return { apiKey, senderEmail, senderName };
}

export function isBrevoConfigured() {
  return Boolean(getBrevoConfig());
}

export async function sendBrevoTransactionalEmail(
  input: SendBrevoTransactionalEmailInput,
): Promise<BrevoSendResponse> {
  const config = getBrevoConfig();
  if (!config) {
    console.error("[Brevo] Missing configuration", {
      hasApiKey: Boolean(process.env.BREVO_API_KEY?.trim()),
      hasSenderEmail: Boolean(process.env.BREVO_SENDER_EMAIL?.trim()),
    });
    throw new Error(
      "Brevo is not configured. Expected BREVO_API_KEY and BREVO_SENDER_EMAIL.",
    );
  }

  const payload = {
    sender: {
      email: config.senderEmail,
      name: config.senderName,
    },
    to: [
      {
        email: input.to.email,
        ...(input.to.name ? { name: input.to.name } : {}),
      },
    ],
    subject: input.subject,
    htmlContent: input.htmlContent,
    ...(input.textContent ? { textContent: input.textContent } : {}),
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  console.info("[Brevo] API call executed", {
    sender: config.senderEmail,
    recipient: input.to.email,
    subject: input.subject,
    status: response.status,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    console.error("[Brevo] API error response", {
      sender: config.senderEmail,
      recipient: input.to.email,
      subject: input.subject,
      status: response.status,
      bodyText,
    });
    throw new Error(
      `Brevo send failed (${response.status}): ${bodyText || "unknown error"}`,
    );
  }

  const json = (await response.json().catch(() => ({}))) as BrevoSendResponse;
  console.info("[Brevo] API success", {
    recipient: input.to.email,
    messageId: json.messageId ?? null,
  });
  return json;
}

export function getBrevoNewContactTemplateId() {
  const directRaw =
    process.env.BREVO_TEMPLATE_NEUKUNDE ??
    process.env.Brevo_Template_Neukunde ??
    "";
  let raw = String(directRaw).trim().replace(/^["']|["']$/g, "");

  if (!raw) {
    const envKey = Object.keys(process.env).find(
      (key) => key.toLowerCase() === "brevo_template_neukunde",
    );
    if (envKey) {
      raw = String(process.env[envKey] ?? "")
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn("[Brevo] Invalid or missing template id", {
      hasDirectUpper: Boolean(process.env.BREVO_TEMPLATE_NEUKUNDE),
      hasDirectMixed: Boolean(process.env.Brevo_Template_Neukunde),
      resolvedRaw: raw || null,
    });
    return null;
  }
  return parsed;
}

export async function sendBrevoTemplateEmail(
  input: SendBrevoTemplateEmailInput,
): Promise<BrevoSendResponse> {
  const config = getBrevoConfig();
  if (!config) {
    console.error("[Brevo] Missing configuration", {
      hasApiKey: Boolean(process.env.BREVO_API_KEY?.trim()),
      hasSenderEmail: Boolean(process.env.BREVO_SENDER_EMAIL?.trim()),
    });
    throw new Error(
      "Brevo is not configured. Expected BREVO_API_KEY and BREVO_SENDER_EMAIL.",
    );
  }

  const payload = {
    sender: {
      email: config.senderEmail,
      name: config.senderName,
    },
    to: [
      {
        email: input.to.email,
        ...(input.to.name ? { name: input.to.name } : {}),
      },
    ],
    templateId: input.templateId,
    params: input.params,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  console.info("[Brevo] Template API call executed", {
    sender: config.senderEmail,
    recipient: input.to.email,
    templateId: input.templateId,
    status: response.status,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    console.error("[Brevo] Template API error response", {
      sender: config.senderEmail,
      recipient: input.to.email,
      templateId: input.templateId,
      status: response.status,
      bodyText,
    });
    throw new Error(
      `Brevo template send failed (${response.status}): ${bodyText || "unknown error"}`,
    );
  }

  const json = (await response.json().catch(() => ({}))) as BrevoSendResponse;
  console.info("[Brevo] Template API success", {
    recipient: input.to.email,
    templateId: input.templateId,
    messageId: json.messageId ?? null,
  });
  return json;
}
