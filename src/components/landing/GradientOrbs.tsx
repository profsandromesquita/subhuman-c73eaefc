export function GradientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden md:block">
      {/* Behind hero - top center */}
      <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-foreground/[0.04] blur-[120px] rounded-full will-change-transform" />
      {/* Between sections 3-4 - left */}
      <div className="absolute top-[200vh] -left-64 w-[500px] h-[500px] bg-foreground/[0.03] blur-[120px] rounded-full will-change-transform" />
      {/* Before CTA final - right */}
      <div className="absolute top-[450vh] -right-64 w-[500px] h-[500px] bg-foreground/[0.04] blur-[120px] rounded-full will-change-transform" />
    </div>
  );
}
