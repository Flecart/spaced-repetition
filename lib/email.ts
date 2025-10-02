import { Resend } from "resend";
import { loadConfig } from "@/lib/config";

export async function sendDailyEmail(subject: string, html: string) {
  const cfg = loadConfig();
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  if (!cfg.emailFrom) throw new Error("EMAIL_FROM missing");
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({
    from: cfg.emailFrom,
    to: cfg.emailTo,
    subject,
    html
  });
  return res;
}


