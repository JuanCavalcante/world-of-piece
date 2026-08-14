export function SiteFooter() {
  return (
    <footer className="py-10 border-t border-gold/10 text-center">
      <p className="text-[10px] tracking-[0.3em] text-parchment/40 uppercase">
        World of Piece &copy; {new Date().getFullYear()} &bull; O Novo Mundo aguarda
      </p>
    </footer>
  );
}
