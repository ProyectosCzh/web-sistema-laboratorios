import { RequireAuth } from "../lib/auth";
import AppProviders from "./AppProviders";
import Navbar from "./Navbar";
import StatsDashboard from "./StatsDashboard";

export default function DashboardPage() {
  return (
    <AppProviders>
      <RequireAuth>
        <Navbar />
        <main className="mx-auto max-w-7xl p-6">
          <h1 className="mb-6 text-xl font-bold text-gray-900">Panel general</h1>
          <StatsDashboard />
        </main>
      </RequireAuth>
    </AppProviders>
  );
}
