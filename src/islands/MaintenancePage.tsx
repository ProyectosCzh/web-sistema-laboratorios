import { RequireAuth } from "../lib/auth";
import AppProviders from "./AppProviders";
import MaintenancePanel from "./MaintenancePanel";
import Navbar from "./Navbar";

export default function MaintenancePage() {
  return (
    <AppProviders>
      <RequireAuth>
        <Navbar />
        <main className="mx-auto max-w-7xl p-6">
          <h1 className="mb-6 text-xl font-bold text-gray-900">Mantenimiento</h1>
          <MaintenancePanel />
        </main>
      </RequireAuth>
    </AppProviders>
  );
}
