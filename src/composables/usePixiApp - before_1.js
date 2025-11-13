// src/composables/usePixiApp.js

import { ref } from 'vue'
import * as PIXI from 'pixi.js'

// Create a single, shared PIXI.Application instance
// This will be initialized once and reused by all characters
let sharedApp = null
const isAppInitialized = ref(false)
const canvasRef = ref(null) // Reference to the shared <canvas> element

/**
 * Initialize the shared PixiJS application
 * This should be called ONCE by the parent component (DebateRoom.vue)
 */
export function usePixiApp() {
  // Initialize the shared app
  const initApp = () => {
    if (sharedApp || !canvasRef.value) return

    console.log('[usePixiApp] Initializing shared PixiJS application')

    // Create the PIXI app using the shared canvas
    sharedApp = new PIXI.Application({
      view: canvasRef.value, // Use the <canvas> from the parent
      autoStart: true, // Start rendering automatically
      backgroundAlpha: 0, // Transparent background
      antialias: true, // Smoother rendering
      resizeTo: window, // Resize with the window (optional)
    })

    isAppInitialized.value = true
    console.log('[usePixiApp] Shared PixiJS application initialized')
  }

  // Cleanup the app when the parent component is destroyed
  const destroyApp = () => {
    if (sharedApp) {
      console.log('[usePixiApp] Destroying shared PixiJS application')
      sharedApp.destroy(true, true) // Destroy WebGL context and remove canvas
      sharedApp = null
      isAppInitialized.value = false
    }
  }

  // Expose the shared app and canvas ref
  return {
    app: sharedApp,
    canvasRef,
    isAppInitialized,
    initApp,
    destroyApp,
  }
}

/**
 * Helper function for child components (DebateCharacter.vue)
 * to access the shared app instance
 */
export function getSharedPixiApp() {
  return sharedApp
}
