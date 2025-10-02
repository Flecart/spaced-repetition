export type AppConfig = {
  githubMirrorRepo: string; // e.g. owner/name
  githubBranch: string;
  githubToken: string; // from env
  emailTo: string;
  emailFrom: string; // verified sender for Resend
  timezone: string; // e.g. Europe/Zurich
  dailySendHour: number; // 9 for 9am
  dailyNewLimit: number; // cap on new items per day
  databaseUrl: string; // postgres connection string
};

export function loadConfig(): AppConfig {
  const cfg: AppConfig = {
    githubMirrorRepo: process.env.GITHUB_MIRROR_REPO || "",
    githubBranch: process.env.GITHUB_MIRROR_BRANCH || "main",
    githubToken: process.env.GITHUB_TOKEN || "",
    emailTo: process.env.EMAIL_TO || "hxuanqiang@ethz.ch",
    emailFrom: process.env.EMAIL_FROM || "",
    timezone: process.env.TIMEZONE || "Europe/Zurich",
    dailySendHour: Number(process.env.DAILY_SEND_HOUR || 9),
    dailyNewLimit: Number(process.env.DAILY_NEW_LIMIT || 20),
    databaseUrl: process.env.DATABASE_URL || ""
  };

  return cfg;
}


