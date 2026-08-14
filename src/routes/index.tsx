import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import heroShip from "@/assets/supernovas-bg.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-sea-deep text-parchment font-body flex flex-col">
      <div className="relative flex-1 flex flex-col">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={heroShip}
            alt="Navio pirata navegando sob a lua no Grand Line"
            width={1920}
            height={1080}
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sea-deep via-sea-deep/40 to-sea-deep/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-sea-deep/80 via-transparent to-sea-deep/30" />
        </div>

        <SiteNav />

        <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 px-6 lg:px-24 py-10 lg:py-16">
          <div className="max-w-xl text-center lg:text-left">
            <span className="inline-block text-[10px] tracking-[0.3em] text-gold uppercase mb-5">
              Inicie sua jornada
            </span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-normal leading-[0.95] mb-6 text-balance">
              Seu legado
              <br />
              <span className="text-gradient-primary italic">começa aqui</span>
            </h1>
            <p className="text-base lg:text-lg text-parchment/70 mb-8 max-w-md mx-auto lg:mx-0">
              Junte-se a varios jogadores no RPG de mesa do universo One
              Piece. Forje seu destino, monte sua tripulação e reivindique o
              tesouro supremo.
            </p>
          </div>

          <div className="w-full max-w-md bg-sea-surface/80 backdrop-blur-xl border border-gold/20 p-7 lg:p-8 rounded-sm shadow-2xl relative">
            <div className="absolute -top-3 -right-3 size-12 border-t-2 border-r-2 border-gold/50" />
            <div className="absolute -bottom-3 -left-3 size-12 border-b-2 border-l-2 border-gold/50" />

            <h2 className="font-display text-xl lg:text-2xl mb-2 text-center tracking-wide">
              ACESSO AO MUNDO
            </h2>
            <p className="text-center text-[11px] tracking-widest uppercase text-parchment/40 mb-7">
              Continue sua jornada.
            </p>

            <div className="space-y-3">
              <Link
                to="/entrar"
                className="block w-full py-3 bg-sea-deep border border-gold/40 text-gold font-bold text-sm tracking-widest text-center hover:bg-gold hover:text-sea-deep transition-colors rounded-sm"
              >
                ENTRAR
              </Link>
              <Link
                to="/cadastro"
                className="block w-full py-3 bg-gradient-primary text-parchment font-semibold text-sm tracking-widest text-center rounded-md shadow-elegant hover:shadow-glow transition-all duration-200 hover:-translate-y-0.5"
              >
                Iniciar Jornada
              </Link>
            </div>

            <p className="text-center text-[11px] text-parchment/40 mt-6">
              Ao entrar você aceita as regras e os termos de serviço do servidor.
            </p>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
