import { DEMO_PRIVATE_GROUPS, DEMO_PUBLIC_GROUPS } from "@/features/groups/demo-groups";
import { GroupsScreen } from "@/features/groups/GroupsScreen";

export default function GroupsPage() {
  return (
    <GroupsScreen
      locale="en-NG"
      privateGroups={DEMO_PRIVATE_GROUPS}
      publicGroups={DEMO_PUBLIC_GROUPS}
    />
  );
}
