import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState title="Not in this model" action={<LinkButton href="/" variant="primary">Back to dashboard</LinkButton>}>
      That team, week, game or page doesn’t exist in the 2027–2031 model. Seasons run 2027–2031 and weeks 0–13; only the 68 Power/Notre Dame programs have team pages.
    </EmptyState>
  );
}
