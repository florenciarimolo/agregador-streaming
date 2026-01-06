<template>
  <div
    class="animated-background fixed inset-0 w-full h-screen overflow-hidden pointer-events-none"
  >
    <!-- Animated gradient orbs -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="orb orb-4"></div>

    <!-- AI-inspired particles (stars/dots) -->
    <div class="particles">
      <div
        v-for="i in 50"
        :key="`particle-${i}`"
        class="particle"
        :style="getParticleStyle(i)"
      ></div>
    </div>

    <!-- Neural network nodes (sin conexiones/líneas) -->
    <svg
      class="neural-network"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      <g class="nodes">
        <circle
          v-for="(node, idx) in neuralNodes"
          :key="`node-${idx}`"
          :cx="node.x"
          :cy="node.y"
          :r="node.r"
          class="neural-node"
          :style="`animation-delay: ${node.delay}s`"
        />
      </g>
    </svg>

    <!-- Data cards (abstract shapes suggesting data processing) - Hidden in light theme -->
    <div class="data-cards hidden dark:block">
      <div
        v-for="i in 6"
        :key="`card-${i}`"
        class="data-card"
        :style="getCardStyle(i)"
      >
        <svg class="card-icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <!-- Subtle grid pattern -->
    <div class="grid-pattern"></div>
  </div>
</template>

<script setup lang="ts">
// Generate neural network nodes (once on component creation)
const generateNeuralNodes = () => {
  const nodes = [];
  for (let i = 0; i < 12; i++) {
    nodes.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      r: 3 + Math.random() * 2,
      delay: Math.random() * 3,
    });
  }
  return nodes;
};

const neuralNodes = generateNeuralNodes();

// Generate particle styles (use index as seed for consistent positioning)
const getParticleStyle = (index: number) => {
  // Use index as seed for pseudo-random but consistent positioning
  const seed = index * 0.618; // Golden ratio for better distribution
  const size = 1 + (Math.sin(seed) * 0.5 + 0.5) * 2;
  const left = (Math.sin(seed * 2) * 0.5 + 0.5) * 100;
  const top = (Math.cos(seed * 3) * 0.5 + 0.5) * 100;
  const delay = (Math.sin(seed * 5) * 0.5 + 0.5) * 5;
  const duration = 8 + (Math.cos(seed * 7) * 0.5 + 0.5) * 12;
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
};

// Generate card styles (use index as seed for consistent positioning)
const getCardStyle = (index: number) => {
  // Use index as seed for pseudo-random but consistent positioning
  const seed = index * 0.618; // Golden ratio for better distribution
  const left = 10 + (Math.sin(seed * 2) * 0.5 + 0.5) * 80;
  const top = 10 + (Math.cos(seed * 3) * 0.5 + 0.5) * 80;
  const rotation = -15 + (Math.sin(seed * 5) * 0.5 + 0.5) * 30;
  const delay = (Math.cos(seed * 7) * 0.5 + 0.5) * 4;
  const duration = 15 + (Math.sin(seed * 11) * 0.5 + 0.5) * 10;
  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: `rotate(${rotation}deg)`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
};
</script>

<style scoped>
.animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  z-index: 0;
  opacity: 0.8;
  overflow: hidden;
  background-color: transparent;
}

/* Animated gradient orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  animation: float 20s ease-in-out infinite;
  will-change: transform;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.25) 0%,
    rgba(33, 24, 110, 0.12) 40%,
    transparent 70%
  );
  top: -10%;
  left: -5%;
  animation-delay: 0s;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.22) 0%,
    rgba(33, 24, 110, 0.1) 40%,
    transparent 70%
  );
  top: 50%;
  right: -5%;
  animation-delay: -7s;
  animation-duration: 25s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.2) 0%,
    rgba(33, 24, 110, 0.1) 40%,
    transparent 70%
  );
  bottom: -10%;
  left: 20%;
  animation-delay: -14s;
  animation-duration: 30s;
}

.orb-4 {
  width: 320px;
  height: 320px;
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.2) 0%,
    rgba(33, 24, 110, 0.1) 40%,
    transparent 70%
  );
  top: 20%;
  left: 50%;
  animation-delay: -10s;
  animation-duration: 28s;
}

/* Floating animation - More movement */
@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(60px, -50px) scale(1.15);
  }
  50% {
    transform: translate(-40px, 40px) scale(0.85);
  }
  75% {
    transform: translate(50px, 60px) scale(1.1);
  }
}

/* AI Particles (stars/dots) */
.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  z-index: 1;
  overflow: hidden;
}

.particle {
  position: absolute;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  animation: particleFloat ease-in-out infinite;
  will-change: transform, opacity;
}

.dark .particle {
  background: rgba(255, 255, 255, 0.8);
}

@keyframes particleFloat {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(20px, -30px) scale(1.2);
    opacity: 0.8;
  }
}

/* Neural Network SVG */
.neural-network {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  z-index: 2;
  opacity: 0.4;
  overflow: hidden;
}

.dark .neural-network {
  opacity: 0.6;
}

.neural-node {
  fill: rgba(33, 24, 110, 0.4);
  opacity: 0;
  animation: nodePulse 3s ease-in-out infinite;
}

.dark .neural-node {
  fill: rgba(33, 24, 110, 0.6);
}

@keyframes nodePulse {
  0%,
  100% {
    opacity: 0.3;
    r: 3;
  }
  50% {
    opacity: 0.8;
    r: 5;
  }
}

/* Data Cards (abstract shapes) */
.data-cards {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  z-index: 1;
  overflow: hidden;
}

.data-card {
  position: absolute;
  width: 80px;
  height: 100px;
  background: rgba(33, 24, 110, 0.08);
  border: 1px solid rgba(33, 24, 110, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: cardFloat ease-in-out infinite;
  will-change: transform, opacity;
}

.card-icon {
  width: 24px;
  height: 24px;
  color: rgba(33, 24, 110, 0.3);
}

@keyframes cardFloat {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 0.4;
  }
  33% {
    transform: translate(10px, -15px) rotate(2deg);
    opacity: 0.6;
  }
  66% {
    transform: translate(-10px, 15px) rotate(-2deg);
    opacity: 0.5;
  }
}

/* Subtle grid pattern */
.grid-pattern {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  background-image:
    linear-gradient(rgba(33, 24, 110, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(33, 24, 110, 0.05) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.6;
  animation: gridMove 20s linear infinite;
  z-index: 0;
  overflow: hidden;
}

@keyframes gridMove {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .orb-1 {
    width: 250px;
    height: 250px;
  }

  .orb-2 {
    width: 200px;
    height: 200px;
  }

  .orb-3 {
    width: 180px;
    height: 180px;
  }

  .orb-4 {
    width: 200px;
    height: 200px;
  }

  .grid-pattern {
    background-size: 30px 30px;
  }

  .data-card {
    width: 60px;
    height: 75px;
  }

  .card-icon {
    width: 18px;
    height: 18px;
  }

  .particle {
    width: 1px !important;
    height: 1px !important;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .orb {
    animation: none;
  }

  .grid-pattern {
    animation: none;
  }

  .particle {
    animation: none;
  }

  .neural-node {
    animation: none;
    opacity: 0.4;
  }

  .data-card {
    animation: none;
  }
}
</style>

<!-- Global styles for theme selectors (need to access document root) -->
<style>
.dark .animated-background {
  opacity: 0.8;
}

.light .animated-background {
  opacity: 0.9;
}

/* Dark mode orbs - All primary color - Enhanced visibility */
.dark .orb-1 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.6) 0%,
    rgba(33, 24, 110, 0.35) 40%,
    transparent 70%
  );
}

.dark .orb-2 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.55) 0%,
    rgba(33, 24, 110, 0.3) 40%,
    transparent 70%
  );
}

.dark .orb-3 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.5) 0%,
    rgba(33, 24, 110, 0.25) 40%,
    transparent 70%
  );
}

.dark .orb-4 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.5) 0%,
    rgba(33, 24, 110, 0.25) 40%,
    transparent 70%
  );
}

.light .orb-1 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.2) 0%,
    rgba(33, 24, 110, 0.1) 40%,
    transparent 70%
  );
}

.light .orb-2 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.18) 0%,
    rgba(33, 24, 110, 0.09) 40%,
    transparent 70%
  );
}

.light .orb-3 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.15) 0%,
    rgba(33, 24, 110, 0.08) 40%,
    transparent 70%
  );
}

.light .orb-4 {
  background: radial-gradient(
    circle,
    rgba(33, 24, 110, 0.16) 0%,
    rgba(33, 24, 110, 0.08) 40%,
    transparent 70%
  );
}

/* Dark mode grid pattern - Lighter primary color - Enhanced visibility */
.dark .grid-pattern {
  background-image:
    linear-gradient(rgba(33, 24, 110, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(33, 24, 110, 0.2) 1px, transparent 1px);
  opacity: 1;
}

.light .grid-pattern {
  background-image:
    linear-gradient(rgba(33, 24, 110, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(33, 24, 110, 0.05) 1px, transparent 1px);
  opacity: 0.5;
}
</style>
