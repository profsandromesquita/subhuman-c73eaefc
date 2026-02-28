import { MeshGradient } from "@paper-design/shaders-react";

export function ShaderBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <MeshGradient
        colors={["#000000", "#1a1a1a", "#0a0a0a", "#262626"]}
        distortion={0.4}
        swirl={0.6}
        speed={0.08}
        style={{ width: "100%", height: "100%" }}
      />
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-background/30" />
    </div>
  );
}
