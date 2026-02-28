import { MeshGradient } from "@paper-design/shaders-react";

export function ShaderBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <MeshGradient
        colors={["#0a0a0a", "#2a2a2a", "#151515", "#333333"]}
        distortion={0.6}
        swirl={0.8}
        speed={0.08}
        style={{ width: "100%", height: "100%" }}
      />
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-background/20" />
    </div>
  );
}
