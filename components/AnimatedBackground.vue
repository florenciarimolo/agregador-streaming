<template>
  <div
    class="animated-background absolute inset-0 overflow-hidden pointer-events-none"
  >
    <!-- Animated gradient orbs -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="orb orb-4"></div>

    <!-- Subtle grid pattern -->
    <div class="grid-pattern"></div>
  </div>
</template>

<script setup lang="ts">
// No props needed - uses theme colors automatically
</script>

<style scoped>
.animated-background {
  z-index: 0;
  opacity: 0.8;
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
    rgba(99, 102, 241, 0.25) 0%,
    rgba(99, 102, 241, 0.12) 40%,
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
    rgba(99, 102, 241, 0.22) 0%,
    rgba(99, 102, 241, 0.1) 40%,
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
    rgba(99, 102, 241, 0.2) 0%,
    rgba(99, 102, 241, 0.1) 40%,
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
    rgba(99, 102, 241, 0.2) 0%,
    rgba(99, 102, 241, 0.1) 40%,
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

/* Subtle grid pattern */
.grid-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.6;
  animation: gridMove 20s linear infinite;
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
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .orb {
    animation: none;
  }

  .grid-pattern {
    animation: none;
  }
}
</style>

<!-- Global styles for theme selectors (need to access document root) -->
<style>
.dark .animated-background {
  opacity: 0.5;
}

.light .animated-background {
  opacity: 0.9;
}

/* Dark mode orbs - All primary color */
.dark .orb-1 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.4) 0%,
    rgba(99, 102, 241, 0.2) 40%,
    transparent 70%
  );
}

.dark .orb-2 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.35) 0%,
    rgba(99, 102, 241, 0.18) 40%,
    transparent 70%
  );
}

.dark .orb-3 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.3) 0%,
    rgba(99, 102, 241, 0.15) 40%,
    transparent 70%
  );
}

.dark .orb-4 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.3) 0%,
    rgba(99, 102, 241, 0.15) 40%,
    transparent 70%
  );
}

.light .orb-1 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.2) 0%,
    rgba(99, 102, 241, 0.1) 40%,
    transparent 70%
  );
}

.light .orb-2 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.18) 0%,
    rgba(99, 102, 241, 0.09) 40%,
    transparent 70%
  );
}

.light .orb-3 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(99, 102, 241, 0.08) 40%,
    transparent 70%
  );
}

.light .orb-4 {
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.16) 0%,
    rgba(99, 102, 241, 0.08) 40%,
    transparent 70%
  );
}

/* Dark mode grid pattern - Lighter primary color */
.dark .grid-pattern {
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.12) 1px, transparent 1px);
  opacity: 0.8;
}

.light .grid-pattern {
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px);
  opacity: 0.7;
}
</style>
