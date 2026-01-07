import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';

/**
 * Composable for scroll-based animations using Intersection Observer
 * Triggers animations when elements enter the viewport (works for both scroll up and down)
 */
export function useScrollAnimation() {
  const animatedElements = ref<Set<Element>>(new Set());
  let observer: IntersectionObserver | null = null;

  const setupObserver = () => {
    if (typeof window === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target;
          
          if (entry.isIntersecting) {
            // Element is entering viewport
            // Force re-animation by removing and re-adding the class
            element.classList.remove('home-animate-visible');
            // Force a reflow to ensure the removal is processed
            void element.offsetWidth;
            // Re-add the class to trigger animation
            element.classList.add('home-animate-visible');
            // Mark as animated
            animatedElements.value.add(element);
            if (import.meta.dev) {
              console.log('[useScrollAnimation] Element entered viewport and animated:', element);
            }
          } else {
            // Element is leaving viewport
            // Remove animation class to allow re-animation when scrolling back
            element.classList.remove('home-animate-visible');
            animatedElements.value.delete(element);
            if (import.meta.dev) {
              console.log('[useScrollAnimation] Element left viewport, reset for re-animation:', element);
            }
          }
        });
      },
      {
        // Trigger when element is 10% visible
        threshold: 0.1,
        // Start animation when element is 50px from entering viewport
        rootMargin: '0px 0px -50px 0px',
      }
    );
  };

  const observeElement = (element: Element | null) => {
    if (!element || !observer) return;
    observer.observe(element);
  };

  const observeElements = (selector: string) => {
    if (typeof document === 'undefined' || !observer) return;
    
    const elements = document.querySelectorAll(selector);
    if (import.meta.dev) {
      console.log(`[useScrollAnimation] Found ${elements.length} elements with selector: ${selector}`);
    }
    
    elements.forEach((element) => {
      // Observe all elements including hero section (for re-animation on scroll back)
      // Only observe if not already being observed
      if (!animatedElements.value.has(element)) {
        observer?.observe(element);
        if (import.meta.dev) {
          console.log('[useScrollAnimation] Observing element:', element);
        }
      }
    });
  };

  const reobserveAll = () => {
    if (typeof document === 'undefined' || !observer) return;
    
    // Re-observe all elements that might have been added dynamically
    const elements = document.querySelectorAll('.home-animate');
    elements.forEach((element) => {
      // Observe all elements including hero section (for re-animation on scroll back)
      // Only observe if not currently being observed
      if (!animatedElements.value.has(element)) {
        observer?.observe(element);
      }
    });
  };

  onMounted(async () => {
    await nextTick();
    setupObserver();
    
    // Observe all elements with home-animate class after DOM is ready
    // Use multiple attempts to catch dynamically rendered elements
    const observeWithRetry = (attempt = 0) => {
      if (attempt < 3) {
        requestAnimationFrame(() => {
          observeElements('.home-animate');
          if (attempt < 2) {
            setTimeout(() => observeWithRetry(attempt + 1), 300);
          }
        });
      }
    };
    
    observeWithRetry();
  });

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    animatedElements.value.clear();
  });

  return {
    observeElement,
    observeElements,
    reobserveAll,
  };
}

