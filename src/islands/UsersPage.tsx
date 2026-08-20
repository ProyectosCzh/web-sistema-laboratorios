import { RequireAuth, RequireRole } from "../lib/auth";
import AppProviders from "./AppProviders";
import Navbar from "./Navbar";
import UsersTable from "./UsersTable";

export default function UsersPage() {
  return (
    <AppProviders>
      <RequireAuth>
        <Navbar />
        <RequireRole role="ENCARGADO">
          <main className="mx-auto max-w-7xl p-6">
            <h1 className="mb-6 text-xl font-bold text-gray-900">Usuarios</h1>
            <UsersTable />
          </main>
        </RequireRole>
      </RequireAuth>
    </AppProviders>
  );
}
