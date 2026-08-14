export function CardCost({ cost, className = "" }: { cost: number; className?: string }) {
  return (
    <span
      className={`absolute top-2 right-2 z-10 grid place-items-center size-7 rounded-full bg-black/70 border border-gold/60 text-gold text-xs font-semibold backdrop-blur shadow-[0_0_12px_-4px_rgba(255,201,84,0.8)] ${className}`}
      title={`${cost} MP`}
    >
      {cost}
    </span>
  );
}