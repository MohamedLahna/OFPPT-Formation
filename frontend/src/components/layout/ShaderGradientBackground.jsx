import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

export default function ShaderGradientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <ShaderGradientCanvas
        fov={45}
        pixelDensity={0.7}
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <ShaderGradient
          animate="on"
          axesHelper="off"
          bgColor1="#000000"
          bgColor2="#000000"
          brightness={0.6}
          cAzimuthAngle={170}
          cDistance={4.4}
          cPolarAngle={70}
          cameraZoom={1}
          color1="#0703ff"
          color2="#240067"
          color3="#000042"
          destination="onCanvas"
          embedMode="off"
          envPreset="lobby"
          format="gif"
          fov={45}
          frameRate={10}
          gizmoHelper="hide"
          grain="off"
          lightType="env"
          pixelDensity={0.7}
          positionX={0}
          positionY={0.9}
          positionZ={-0.3}
          range="disabled"
          rangeEnd={40}
          rangeStart={0}
          reflection={0}
          rotationX={45}
          rotationY={0}
          rotationZ={0}
          shader="defaults"
          type="waterPlane"
          uAmplitude={0}
          uDensity={1.2}
          uFrequency={0}
          uSpeed={0.2}
          uStrength={3.4}
          uTime={0}
          wireframe={false}
        />
      </ShaderGradientCanvas>

      <div className="absolute inset-0 bg-[#070714]/72" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(124,58,237,0.08),transparent_58%),radial-gradient(140%_90%_at_80%_100%,rgba(6,182,212,0.06),transparent_64%)]" />
    </div>
  );
}
