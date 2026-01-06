<template>
  <canvas
    ref="canvasRef"
    class="animated-lines-background fixed inset-0 w-full h-full -z-10 pointer-events-none"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let cleanupResize: (() => void) | null = null;

// Configuración
const CONFIG = {
  // Colores del gradiente: azul eléctrico, violeta (primary), magenta
  colors: [
    { r: 0, g: 191, b: 255 }, // Azul eléctrico (#00BFFF)
    { r: 33, g: 24, b: 110 }, // Violeta primary (#21186E)
    { r: 255, g: 0, b: 150 }, // Magenta (#FF0096)
  ],
  lineCount: 12, // 12 líneas
  baseLength: 1500, // Longitud base larga para flujo continuo
  minLength: 400, // Longitud mínima
  speed: 1.5, // Velocidad lenta y constante
  centerY: 0, // Se calculará como altura / 2
  verticalSpread: 250, // Spread vertical concentrado cerca del centro
  waveAmplitude: 2, // Amplitud mínima (ondulación apenas perceptible)
  waveFrequency: 0.0008, // Frecuencia muy baja
  coreLineWidth: 1.5, // Grosor del core (1-2px)
  haloLineWidth: 4, // Grosor del halo
  haloBlur: 15, // Blur moderado solo para el halo
  depthScale: 0.4, // Escala mínima en el centro (efecto profundidad)
};

interface Line {
  x: number; // Posición X inicial
  y: number; // Posición Y base (centro + variación)
  speed: number; // Velocidad constante
  phase: number; // Fase para la onda
  colorIndex: number; // Índice del color en el gradiente
  baseY: number; // Posición Y base para efecto tiovivo
}

const lines: Line[] = [];

// Inicializar líneas
const initLines = (width: number, height: number) => {
  lines.length = 0;
  CONFIG.centerY = height / 2;

  for (let i = 0; i < CONFIG.lineCount; i++) {
    // Distribución vertical concentrada cerca del centro (efecto tiovivo)
    // Usar distribución normal para concentrar líneas en el centro
    const t = i / (CONFIG.lineCount - 1); // 0 a 1
    // Distribución más concentrada en el centro
    const normalizedT = (t - 0.5) * 2; // -1 a 1
    const verticalOffset =
      Math.sign(normalizedT) *
      Math.pow(Math.abs(normalizedT), 1.5) *
      CONFIG.verticalSpread;
    const baseY = CONFIG.centerY + verticalOffset;

    // Posición X inicial: distribuidas uniformemente a lo largo de TODO el ancho
    // Incluyendo fuera del viewport para flujo continuo desde el inicio
    const totalWidth = width + CONFIG.baseLength * 2;
    const spacing = totalWidth / CONFIG.lineCount;
    const startX = -CONFIG.baseLength + i * spacing;

    // Velocidad constante (sin variación)
    const speed = CONFIG.speed;

    // Fase para la onda - distribuir uniformemente
    const phase = (i / CONFIG.lineCount) * Math.PI * 2;

    // Color del gradiente - rotar entre colores
    const colorIndex = i % CONFIG.colors.length;

    lines.push({
      x: startX,
      y: baseY,
      baseY,
      speed,
      phase,
      colorIndex,
    });
  }
};

// Calcular longitud de línea según posición X (larga en extremos, corta en centro)
const getLineLength = (x: number, width: number): number => {
  // Normalizar posición X (0 = izquierda, 1 = derecha)
  const normalizedX = x / width;
  // Distancia desde el centro (0.5)
  const distanceFromCenter = Math.abs(normalizedX - 0.5);
  // Longitud: máxima en extremos (0 o 1), mínima en centro (0.5)
  const lengthFactor = distanceFromCenter * 2; // 0 en centro, 1 en extremos
  return (
    CONFIG.minLength + lengthFactor * (CONFIG.baseLength - CONFIG.minLength)
  );
};

// Calcular escala de profundidad según posición Y (efecto tiovivo)
// Las líneas en el centro vertical se ven más pequeñas/alejadas
const getDepthScale = (y: number, height: number): number => {
  const centerY = height / 2;
  const distanceFromCenter = Math.abs(y - centerY);
  const maxDistance = CONFIG.verticalSpread;
  const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
  // Escala: mínima (más alejada) en el centro vertical, máxima (más cerca) lejos del centro
  return CONFIG.depthScale + (1 - CONFIG.depthScale) * normalizedDistance;
};

// Construir el path de la línea con ondulación mínima
const buildLinePath = (line: Line, length: number, depthScale: number) => {
  if (!ctx) return;

  const segments = 80; // Más segmentos para mejor calidad

  ctx.beginPath();

  // Calcular puntos de la línea con onda suave
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = line.x + t * length;
    const y =
      line.y +
      Math.sin(x * CONFIG.waveFrequency + line.phase) *
        CONFIG.waveAmplitude *
        depthScale;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
};

// Dibujar una línea con modelo de luz correcto: CORE + HALO
const drawLine = (line: Line, width: number, height: number) => {
  if (!ctx) return;

  // Calcular longitud según posición X (larga en extremos, corta en centro)
  const centerX = line.x + getLineLength(line.x, width) / 2;
  const length = getLineLength(centerX, width);

  // Calcular escala de profundidad según posición Y (efecto tiovivo)
  const depthScale = getDepthScale(line.y, height);

  // Gradiente de color: azul → violeta → magenta
  const color1 = CONFIG.colors[line.colorIndex];
  const color2 = CONFIG.colors[(line.colorIndex + 1) % CONFIG.colors.length];
  const color3 = CONFIG.colors[(line.colorIndex + 2) % CONFIG.colors.length];

  // Color para el halo (usar color medio)
  const haloColor = color2;

  // Construir path una sola vez
  buildLinePath(line, length, depthScale);

  // ===== CAPA 1: HALO SUAVE =====
  // Más ancho, opacidad baja, blur moderado
  ctx.save();
  ctx.shadowBlur = CONFIG.haloBlur * depthScale;
  ctx.shadowColor = `rgba(${haloColor.r}, ${haloColor.g}, ${haloColor.b}, 0.3)`;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = `rgba(${haloColor.r}, ${haloColor.g}, ${haloColor.b}, 0.15)`;
  ctx.lineWidth = CONFIG.haloLineWidth * depthScale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  // ===== CAPA 2: CORE LUMINOSO =====
  // Muy fino, nítido, opacidad alta, SIN blur
  ctx.save();
  ctx.shadowBlur = 0; // SIN blur en el core
  ctx.shadowColor = 'transparent';

  // Crear gradiente a lo largo de la línea para el core
  const gradient = ctx.createLinearGradient(
    line.x,
    line.y,
    line.x + length,
    line.y
  );

  // Gradiente con opacidad variable (tapering en extremos)
  const coreOpacity = 0.7 * depthScale; // Opacidad alta, ajustada por profundidad
  gradient.addColorStop(0, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0)`);
  gradient.addColorStop(
    0.1,
    `rgba(${color1.r}, ${color1.g}, ${color1.b}, ${coreOpacity * 0.4})`
  );
  gradient.addColorStop(
    0.3,
    `rgba(${color1.r}, ${color1.g}, ${color1.b}, ${coreOpacity * 0.7})`
  );
  gradient.addColorStop(
    0.5,
    `rgba(${color2.r}, ${color2.g}, ${color2.b}, ${coreOpacity})`
  );
  gradient.addColorStop(
    0.7,
    `rgba(${color3.r}, ${color3.g}, ${color3.b}, ${coreOpacity * 0.7})`
  );
  gradient.addColorStop(
    0.9,
    `rgba(${color3.r}, ${color3.g}, ${color3.b}, ${coreOpacity * 0.4})`
  );
  gradient.addColorStop(1, `rgba(${color3.r}, ${color3.g}, ${color3.b}, 0)`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = CONFIG.coreLineWidth * depthScale; // Muy fino (1-2px)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
};

// Loop de animación
const animate = () => {
  if (!canvasRef.value || !ctx) return;

  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Limpiar canvas (el contexto ya está escalado, usar dimensiones lógicas)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Actualizar y dibujar líneas
  lines.forEach((line) => {
    // Mover línea hacia la derecha (velocidad constante, sin variación por profundidad)
    line.x += line.speed;

    // Calcular longitud actual
    const centerX = line.x + getLineLength(line.x, width) / 2;
    const currentLength = getLineLength(centerX, width);

    // Si la línea sale completamente por la derecha, reaparecer por la izquierda
    // Colocarse detrás de la última línea visible para flujo continuo sin huecos
    if (line.x > width + currentLength) {
      // Encontrar la línea más a la izquierda (puede estar fuera del viewport)
      const leftmostX = Math.min(...lines.map((l) => l.x));
      // Colocar esta línea justo antes de la más a la izquierda
      const spacing = (width + CONFIG.baseLength * 2) / CONFIG.lineCount;
      line.x = leftmostX - spacing;
      // Mantener la posición Y base para efecto tiovivo
      line.y = line.baseY;
    }

    // Dibujar línea si está visible o cerca del viewport
    if (
      line.x + currentLength > -CONFIG.baseLength &&
      line.x < width + CONFIG.baseLength
    ) {
      drawLine(line, width, height);
    }
  });

  animationFrameId = requestAnimationFrame(animate);
};

// Configurar canvas
const setupCanvas = (): (() => void) | null => {
  if (!canvasRef.value) return null;

  const canvas = canvasRef.value;
  ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) return null;

  // Ajustar tamaño del canvas
  const resize = () => {
    if (!canvasRef.value) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.value.getBoundingClientRect();

    canvasRef.value.width = rect.width * dpr;
    canvasRef.value.height = rect.height * dpr;

    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // Reinicializar líneas con nuevo tamaño
    initLines(rect.width, rect.height);
  };

  resize();
  window.addEventListener('resize', resize);

  // Iniciar animación
  animate();

  // Retornar función de cleanup
  const cleanup = () => {
    window.removeEventListener('resize', resize);
  };
  return cleanup;
};

onMounted(() => {
  cleanupResize = setupCanvas();
});

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  if (cleanupResize) {
    cleanupResize();
  }
});
</script>

<style scoped>
.animated-lines-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -10;
  pointer-events: none;
  background-color: #000000;
}
</style>
