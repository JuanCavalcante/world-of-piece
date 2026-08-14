import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import wopLogo from "@/assets/wop-logo.png";

export function SiteNav() {
  const { user, loading } = useAuth();

  return (
    <nav className="relative z-20 flex items-center justify-between p-5 lg:px-12">
      <Link to="/" className="flex items-center gap-3">
        <img src={wopLogo} alt="World of Piece" className="size-10 lg:size-12 object-contain" />
        <span className="font-display font-bold text-lg lg:text-xl tracking-tight text-parchment">
          WORLD OF PIECE
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-[0.2em] text-gold">
        {!loading && user ? (
          <Link to="/dashboard" className="hover:text-parchment transition-colors">
            PAINEL
          </Link>
        ) : (
          <Link to="/cadastro" className="hover:text-parchment transition-colors">
            CADASTRO
          </Link>
        )}
      </div>
      <Link
        to={!loading && user ? "/dashboard" : "/entrar"}
        className="md:hidden text-xs font-bold tracking-widest text-gold border border-gold/40 px-3 py-2 rounded-sm hover:bg-gold/10"
      >
        {!loading && user ? "PAINEL" : "ENTRAR"}
      </Link>
    </nav>
  );
}
