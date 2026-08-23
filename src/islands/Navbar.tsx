import { useAuth } from "../lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/aulas", label: "Aulas" },
  { href: "/mantenimiento", label: "Mantenimiento" },
];

const ADMIN_LINKS = [
  { href: "/usuarios", label: "Usuarios" },
  { href: "/semestres", label: "Semestres" },
  { href: "/materias", label: "Materias" },
  { href: "/docentes", label: "Docentes" },
  { href: "/comisiones", label: "Comisiones" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const path = typeof window !== "undefined" ? window.location.pathname : "";

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const linkClass = (href: string) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return `rounded px-3 py-1.5 text-sm font-medium ${
      active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"
    }`;
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <a href="/" className="text-lg font-bold text-blue-700">
            LABMANAGE
          </a>
          <nav className="flex flex-wrap gap-1">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={linkClass(link.href)}>
                {link.label}
              </a>
            ))}
            {user?.role === "ENCARGADO" &&
              ADMIN_LINKS.map((link) => (
                <a key={link.href} href={link.href} className={linkClass(link.href)}>
                  {link.label}
                </a>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
