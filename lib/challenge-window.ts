import { NO_ID, settingsCol } from "./db";

export interface ChallengeWindow {
  open: boolean;
  endsAt: string | null;
  expired: boolean;
}

// The challenge window is open only while the admin has enabled it and the
// solve countdown has not expired. Admins bypass this everywhere.
export async function getChallengeWindow(): Promise<ChallengeWindow> {
  const doc = await (await settingsCol()).findOne({ id: "challenges" }, NO_ID);
  const endsAt = doc?.endsAt ?? null;
  const expired = !!endsAt && Date.parse(endsAt) <= Date.now();
  const open = !!doc?.visible && !!endsAt && !expired;
  return { open, endsAt, expired };
}
