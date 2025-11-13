<!-- src/components/DebateCharacter.vue -->
<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
// Import the function to get the shared app and the reactive flag
import { getSharedPixiApp, isInitialized } from '@/composables/usePixiApp';
// ✅ Direct import of Live2DModel (avoids global PIXI.live2d registration issues)
import { Live2DModel } from '@zennomi/pixi-live2d-display';
// Import your character-specific rendering config
import { characterRenderConfig } from '@/config/characterRenderConfig'; // Adjust path as needed

const props = defineProps({
  characterId: {
    type: String,
    required: true
  },
  modelPath: {
    type: String,
    required: true
  },
});

let live2dModel = null;
const hasAttemptedLoad = ref(false); // Flag to prevent multiple load attempts

// Function to load and setup the model
const loadModel = async () => {
  if (hasAttemptedLoad.value) return; // Prevent running multiple times
  hasAttemptedLoad.value = true;

  const app = getSharedPixiApp();
  if (!app) {
    console.error(`[DebateCharacter:${props.characterId}] Shared PixiJS app not available during load attempt.`);
    // Reset flag to allow retry if app becomes available later (though unlikely in this flow)
    hasAttemptedLoad.value = false;
    return;
  }

  console.log(`[DebateCharacter:${props.characterId}] Attempting to load model: ${props.modelPath}`);

  try {
    // ✅ Direct use of imported Live2DModel.from (no global reference needed)
    live2dModel = await Live2DModel.from(props.modelPath, { autoInteract: false });

    if (!live2dModel) {
      throw new Error(`Failed to load model from ${props.modelPath}`);
    }

    // --- Apply Character-Specific Configuration ---
    const config = characterRenderConfig[props.characterId];
    if (config) {
      // Apply anchor point (determines which part of the model is positioned)
      live2dModel.anchor.set(config.anchor.x, config.anchor.y);

      // Get the dimensions of the shared application's view (the canvas)
      // These should be available if the app is truly initialized
      const appWidth = app.screen.width;
      const appHeight = app.screen.height;

      // Calculate position based on the shared app's dimensions and the config
      live2dModel.x = appWidth * config.position.x; // e.g., config.position.x = 0.25 for 25% from left
      live2dModel.y = appHeight * config.position.y; // e.g., config.position.y = 0.8 for 80% from top

      // Apply scale
      live2dModel.scale.set(config.scale.x, config.scale.y);

      console.log(`[DebateCharacter:${props.characterId}] Applied config: pos (${live2dModel.x}, ${live2dModel.y}), scale (${live2dModel.scale.x}, ${live2dModel.scale.y})`);
    } else {
      console.warn(`[DebateCharacter:${props.characterId}] No render config found in characterRenderConfig.js, using defaults.`);
      // Apply some sensible defaults if no config is found
      live2dModel.anchor.set(0.5, 1.0); // Bottom center anchor
      live2dModel.x = app.screen.width / 2; // Center horizontally
      live2dModel.y = app.screen.height * 0.8; // Near bottom vertically
      live2dModel.scale.set(0.3); // Default scale
    }
    // --- End Configuration ---

    // Add the loaded model to the SHARED stage
    app.stage.addChild(live2dModel);

    // --- Interaction Manager Safety Check ---
    // Check if the interactionManager property exists on the live2dModel object itself
    // before trying to access or modify its properties.
    if (live2dModel.interactionManager && typeof live2dModel.interactionManager === 'object') {
      console.log(`[DebateCharacter:${props.characterId}] Disabling interactionManager.`);
      // The property to disable interaction might be different depending on the pixi-live2d-display version
      // Common ones are: enabled, autoInteract, etc.
      // For now, let's try 'enabled' which is common.
      if (typeof live2dModel.interactionManager.enabled !== 'undefined') {
        live2dModel.interactionManager.enabled = false;
      } else {
        console.log(`[DebateCharacter:${props.characterId}] interactionManager.enabled property not found.`);
      }
    } else {
      console.log(`[DebateCharacter:${props.characterId}] interactionManager not found or not an object on model, skipping disable.`);
    }
    // --- End Safety Check ---

    // ✅ Add ticker for animation (ensures models update/animate)
    app.ticker.add((delta) => {
      if (live2dModel) {
        live2dModel.update(delta);
      }
    });

    console.log(`[DebateCharacter:${props.characterId}] Live2D model loaded and added to shared stage successfully`);

  } catch (error) {
    console.error(`[DebateCharacter:${props.characterId}] Error loading Live2D model:`, error);
    // Reset flag on error to allow retry if needed (e.g., if network issue)
    hasAttemptedLoad.value = false;
  }
};

// Watch for the shared app initialization
// This will run when isInitialized becomes true
watch(isInitialized, (initialized) => {
  if (initialized) {
    console.log(`[DebateCharacter:${props.characterId}] Shared app is now initialized, attempting to load model.`);
    loadModel(); // Attempt to load the model now that the app is ready
  }
}, { immediate: true }); // immediate: true ensures the watcher runs immediately when component is created

// Setup Live2D model (this is now just a placeholder or for cleanup)
onMounted(async () => {
  // The actual loading is handled by the watch on isInitialized
  // This hook can be used for other setup if needed, but model loading is deferred
  console.log(`[DebateCharacter:${props.characterId}] Mounted, waiting for shared app...`);
});

onUnmounted(() => {
  // Get the shared app instance again
  const app = getSharedPixiApp(); // Use the helper function
  if (app && live2dModel) {
    // Remove the model from the shared stage
    if (app.stage.children.includes(live2dModel)) {
      app.stage.removeChild(live2dModel);
    }
    // Destroy the model's resources
    live2dModel.destroy({ children: true, texture: true }); // v7 destroy options
    console.log(`[DebateCharacter:${props.characterId}] Model removed from stage and destroyed`);
  }
});

// Expose methods if needed by parent
// defineExpose({ ... });
</script>

<template>
  <!-- This component no longer renders its own canvas -->
  <!-- You can add UI elements here if needed, but the visual model is on the shared canvas -->
  <div class="character-ui-placeholder" :data-character-id="characterId">
    <!-- Example: Character name, status indicator -->
    <h4>{{ characterId }}</h4>
    <!-- Add other UI elements if required -->
  </div>
</template>

<style scoped>
.character-ui-placeholder {
  /* Style for the character's UI placeholder if shown */
  display: inline-block;
  margin: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-align: center;
  background-color: #f9f9f9;
  /* Hide by default if you don't want these boxes */
  display: none;
}

.character-ui-placeholder h4 {
  margin: 0;
  font-size: 1em;
}
</style>
