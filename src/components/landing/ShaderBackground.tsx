import { MeshGradient } from "@paper-design/shaders-react";

export function ShaderBackground() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  return (
    <div className="w-full h-screen bg-black fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <MeshGradient
        className="w-full h-full absolute inset-0"
        colors={["#000000", "#111111", "#222222", "#3a3a3a"]}
        speed={isMobile ? 0.6 : 0.3}
        distortion={isMobile ? 0.6 : 0.3}
        swirl={isMobile ? 0.7 : 0.4}
      />
    </div>
  );
}
