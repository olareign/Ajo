import { join } from "node:path";
import { Welcome } from "@/components/Welcome";
import { listPeoplePhotos } from "@/lib/people-photos";

export default function Home() {
  return <Welcome photos={listPeoplePhotos(join(process.cwd(), "public", "people"))} />;
}
