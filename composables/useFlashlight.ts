import { ref, computed, onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { Theme } from '@/types/enums/Theme';

export interface FlashlightStyles {
  backgroundStyle: string;
  borderStyle: string;
  borderTopStyle: string;
  borderRightStyle: string;
  borderBottomStyle: string;
  borderLeftStyle: string;
  borderShadowStyle: string;
}

/**
 * Helper function to get the actual DOM element from a ref
 * Handles both native DOM elements and Vue component instances
 */
function getDOMElement(ref: Ref<HTMLElement | null>): HTMLElement | null {
  if (!ref.value) return null;
  
  // If it's already a DOM element, return it
  if (ref.value instanceof HTMLElement) {
    return ref.value;
  }
  
  // If it's a Vue component, try to get $el
  // Type assertion needed because TypeScript doesn't know about Vue component $el property
  const component = ref.value as unknown as { $el?: HTMLElement };
  if (component.$el && component.$el instanceof HTMLElement) {
    return component.$el;
  }
  
  // If $el is not available, the component might not be mounted yet
  return null;
}

/**
 * Composable for creating a subtle flashlight effect that follows the mouse cursor
 * on both the background and border of a card element.
 */
export function useFlashlight(elementRef: Ref<HTMLElement | null>, enabled: Ref<boolean> | boolean = true) {
  const mouseX = ref<number>(0);
  const mouseY = ref<number>(0);
  const elementWidth = ref<number>(0);
  const elementHeight = ref<number>(0);
  const isHovering = ref<boolean>(false);
  const { theme } = useTheme();

  const isEnabled = computed(() => {
    return typeof enabled === 'boolean' ? enabled : enabled.value;
  });

  const isDarkMode = computed(() => theme.value === Theme.DARK);

  const handleMouseMove = (event: MouseEvent) => {
    const element = getDOMElement(elementRef);
    if (!element || !isEnabled.value) return;

    const rect = element.getBoundingClientRect();
    mouseX.value = event.clientX - rect.left;
    mouseY.value = event.clientY - rect.top;
    elementWidth.value = rect.width;
    elementHeight.value = rect.height;
  };

  const handleMouseEnter = () => {
    if (!isEnabled.value) return;
    isHovering.value = true;
  };

  const handleMouseLeave = () => {
    if (!isEnabled.value) return;
    isHovering.value = false;
  };

  onMounted(async () => {
    // Wait for next tick to ensure component is fully mounted
    await nextTick();
    
    const element = getDOMElement(elementRef);
    if (!element) return;

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
  });

  onUnmounted(() => {
    const element = getDOMElement(elementRef);
    if (!element) return;

    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
  });

  const styles = computed<FlashlightStyles>(() => {
    if (!isHovering.value || elementWidth.value === 0 || elementHeight.value === 0) {
      return {
        backgroundStyle: '',
        borderStyle: '',
        borderTopStyle: 'transparent',
        borderRightStyle: 'transparent',
        borderBottomStyle: 'transparent',
        borderLeftStyle: 'transparent',
        borderShadowStyle: '',
      };
    }

    // Create a radial gradient that follows the mouse for background
    const gradientSize = 200; // Size of the flashlight effect in pixels
    
    // Colors for light mode
    const lightBackground = 'rgba(255, 255, 255, 0.15)';
    // Use same border color as outline button: border-gray-300 = rgb(209, 213, 219)
    const lightBorder = 'rgba(209, 213, 219, 0.8)'; // gray-300
    const lightShadow = 'rgba(209, 213, 219, 0.3)';
    
    // Colors for dark mode
    // Use same border color as outline button: border-gray-600 = rgb(75, 85, 99)
    const darkBackground = 'rgba(55, 48, 163, 0.25)'; // primary-900 with opacity
    const darkBorder = 'rgba(75, 85, 99, 0.8)'; // gray-600
    const darkShadow = 'rgba(75, 85, 99, 0.3)'; // gray-600
    
    // Select colors based on theme
    const backgroundColor = isDarkMode.value ? darkBackground : lightBackground;
    const borderColor = isDarkMode.value ? darkBorder : lightBorder;
    const shadowColor = isDarkMode.value ? darkShadow : lightShadow;
    
    const backgroundGradient = `radial-gradient(${gradientSize}px circle at ${mouseX.value}px ${mouseY.value}px, ${backgroundColor} 0%, transparent 70%)`;
    
    // Calculate border gradient that follows the cursor around the perimeter
    // We'll create gradients for each side of the border
    const highlightSize = 120; // Size of the highlight along the border
    
    // Calculate which side of the border the cursor is closest to
    const distToTop = mouseY.value;
    const distToBottom = elementHeight.value - mouseY.value;
    const distToLeft = mouseX.value;
    const distToRight = elementWidth.value - mouseX.value;
    
    const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);
    
    // Create gradients for each side
    let topGradient = 'transparent';
    let rightGradient = 'transparent';
    let bottomGradient = 'transparent';
    let leftGradient = 'transparent';
    
    // Top border
    if (distToTop === minDist) {
      const highlightStart = Math.max(0, mouseX.value - highlightSize / 2);
      const highlightEnd = Math.min(elementWidth.value, mouseX.value + highlightSize / 2);
      const highlightPos = (highlightStart / elementWidth.value) * 100;
      const highlightWidth = ((highlightEnd - highlightStart) / elementWidth.value) * 100;
      topGradient = `linear-gradient(to right, transparent ${highlightPos}%, ${borderColor} ${highlightPos}%, ${borderColor} ${highlightPos + highlightWidth}%, transparent ${highlightPos + highlightWidth}%)`;
    }
    
    // Right border
    if (distToRight === minDist) {
      const highlightStart = Math.max(0, mouseY.value - highlightSize / 2);
      const highlightEnd = Math.min(elementHeight.value, mouseY.value + highlightSize / 2);
      const highlightPos = (highlightStart / elementHeight.value) * 100;
      const highlightWidth = ((highlightEnd - highlightStart) / elementHeight.value) * 100;
      rightGradient = `linear-gradient(to bottom, transparent ${highlightPos}%, ${borderColor} ${highlightPos}%, ${borderColor} ${highlightPos + highlightWidth}%, transparent ${highlightPos + highlightWidth}%)`;
    }
    
    // Bottom border
    if (distToBottom === minDist) {
      const highlightStart = Math.max(0, mouseX.value - highlightSize / 2);
      const highlightEnd = Math.min(elementWidth.value, mouseX.value + highlightSize / 2);
      const highlightPos = (highlightStart / elementWidth.value) * 100;
      const highlightWidth = ((highlightEnd - highlightStart) / elementWidth.value) * 100;
      bottomGradient = `linear-gradient(to left, transparent ${highlightPos}%, ${borderColor} ${highlightPos}%, ${borderColor} ${highlightPos + highlightWidth}%, transparent ${highlightPos + highlightWidth}%)`;
    }
    
    // Left border
    if (distToLeft === minDist) {
      const highlightStart = Math.max(0, mouseY.value - highlightSize / 2);
      const highlightEnd = Math.min(elementHeight.value, mouseY.value + highlightSize / 2);
      const highlightPos = (highlightStart / elementHeight.value) * 100;
      const highlightWidth = ((highlightEnd - highlightStart) / elementHeight.value) * 100;
      leftGradient = `linear-gradient(to top, transparent ${highlightPos}%, ${borderColor} ${highlightPos}%, ${borderColor} ${highlightPos + highlightWidth}%, transparent ${highlightPos + highlightWidth}%)`;
    }
    
    // Calculate box-shadow position relative to the card
    const shadowX = mouseX.value;
    const shadowY = mouseY.value;
    const shadowBlur = 20;
    const shadowSpread = 0;
    const borderShadowStyle = `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${shadowColor} inset`;

    return {
      backgroundStyle: backgroundGradient,
      borderStyle: '', // Keep for backward compatibility but not used
      borderTopStyle: topGradient,
      borderRightStyle: rightGradient,
      borderBottomStyle: bottomGradient,
      borderLeftStyle: leftGradient,
      borderShadowStyle,
    };
  });

  return {
    styles,
    isHovering,
  };
}

