import { NewPlan } from "./NewPlan";

// "Today" must be the request date, not the build date.
export const dynamic = "force-dynamic";

export default function NewSavingsPlanPage() {
  // TODO: use the user's time zone and currency from their profile once auth exists.
  const today = new Date().toISOString().slice(0, 10);
  return <NewPlan today={today} />;
}
