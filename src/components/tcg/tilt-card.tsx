import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TiltCard({
  children,
  className,
  max = 12,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, o: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rotateY = (px - 0.5) * 2 * max;
    const rotateX = -(py - 0.5) * 2 * max;
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04,1.04,1.04)`,
      transition: "transform 80ms ease-out",
    });
    setGlarePos({ x: px * 100, y: py * 100, o: 0.28 });
  };

  const onLeave = () => {
    setStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      transition: "transform 450ms cubic-bezier(0.22,1,0.36,1)",
    });
    setGlarePos((g) => ({ ...g, o: 0 }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ ...style, transformStyle: "preserve-3d", willChange: "transform" }}
      className={cn("relative [contain:layout_style]", className)}
    >
      {children}
      {glare && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl z-20 transition-opacity duration-300"
          style={{
            opacity: glarePos.o,
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)`,
          }}
        />
      )}
    </div>
  );
}
