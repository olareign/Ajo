import { join } from "node:path";
import { Landing } from "@/components/Landing";
import { Welcome } from "@/components/Welcome";
import { listPeoplePhotos } from "@/lib/people-photos";

/** Phones get the short welcome screen; wide screens get the full landing page. */
export default function Home() {
  const photos = listPeoplePhotos(join(process.cwd(), "public", "people"));
  return (
    <>
      <div className="lg:hidden">
        <Welcome photos={photos} />
      </div>
      <div className="hidden lg:block">
        <Landing photos={photos} />
      </div>
    </>
  );
}
