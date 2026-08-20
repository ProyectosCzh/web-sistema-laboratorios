import { RequireAuth } from "../lib/auth";
import AppProviders from "./AppProviders";
import ClassroomGrid from "./ClassroomGrid";
import Navbar from "./Navbar";

export default function ClassroomsPage() {
  return (
    <AppProviders>
      <RequireAuth>
        <Navbar />
        <main className="mx-auto max-w-7xl p-6">
          <h1 className="mb-6 text-xl font-bold text-gray-900">Aulas</h1>
          <ClassroomGrid />
        </main>
      </RequireAuth>
    </AppProviders>
  );
}
