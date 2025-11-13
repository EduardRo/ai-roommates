<!-- src/components/DebateCharacter.vue -->
<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
// 🔥 Import the config
import { characterRenderConfig } from '@/config/characterRenderConfig';

const props = defineProps({
  characterId: { type: String, required: true },
  modelPath: { type: String, required: true }
});

const canvas = ref(null);
let live2dModel = null;
let app = null;

onMounted(async () => {
  if (typeof PIXI === 'undefined') {
    console.error(`[DebateCharacter:${props.characterId}] PIXI not loaded`);
    return;
  }

  try {
    // eslint-disable-next-line no-undef
    app = new PIXI.Application({
      view: canvas.value,
      autoStart: true,
      backgroundAlpha: 0,
      resizeTo: canvas.value.parentElement
    });

    // Load the model
    // eslint-disable-next-line no-undef
    live2dModel = await PIXI.live2d.Live2DModel.from(props.modelPath, { autoInteract: false });
    app.stage.addChild(live2dModel);

    // 🔥 FIX 1: Safe access to interactionManager (same as before)
    if (live2dModel.interactionManager) {
      console.log(`[DebateCharacter:${props.characterId}] Disabling interactionManager`);
      live2dModel.interactionManager.enabled = false;
    } else {
      console.log(`[DebateCharacter:${props.characterId}] No interactionManager found, skipping disable.`);
    }

    // 🔥 FIX 2: Use the new config for positioning and scaling
    const config = characterRenderConfig[props.characterId];
    if (config) {
      // Apply anchor point
      live2dModel.anchor.set(config.anchor.x, config.anchor.y);

      // Get canvas dimensions
      const canvasWidth = app.screen.width;
      const canvasHeight = app.screen.height;

      // Apply position (as fraction of canvas size)
      live2dModel.x = canvasWidth * config.position.x;
      live2dModel.y = canvasHeight * config.position.y;

      // Apply scale
      live2dModel.scale.set(config.scale.x, config.scale.y);

      console.log(`[DebateCharacter:${props.characterId}] Applied config: pos (${live2dModel.x}, ${live2dModel.y}), scale (${live2dModel.scale.x}, ${live2dModel.scale.y})`);
    } else {
      console.warn(`[DebateCharacter:${props.characterId}] No render config found, using defaults.`);
      // Apply some defaults if config is missing
      live2dModel.anchor.set(0.5, 1);
      live2dModel.x = app.screen.width / 2;
      live2dModel.y = app.screen.height * 0.9;
      live2dModel.scale.set(0.3);
    }

    console.log(`[DebateCharacter:${props.characterId}] Loaded successfully`);

  } catch (error) {
    console.error(`[DebateCharacter:${props.characterId}] Error loading model:`, error);
  }
});

onUnmounted(() => {
  if (app) {
    app.destroy(true);
    console.log(`[DebateCharacter:${props.characterId}] Pixi app destroyed`);
  }
});
</script>

<!-- Keep the same template and styles -->
<template>
  <div class="character-wrapper">
    <canvas ref="canvas" class="live2d-canvas"></canvas>
    <div class="character-label">{{ characterId }}</div>
  </div>
</template>

<!-- Keep the script setup as is -->
<style scoped>
/* Make the wrapper smaller to fit 3 side-by-side more easily */
.character-wrapper {
  display: inline-block;
  /* Keep inline-block or flex item will override */
  margin: 10px;
  width: 300px;
  /* Reduced width */
  height: 500px;
  /* Reduced height */
  position: relative;
  border: 1px solid red;
  /* Temporary border */
  /* Optional: Add flex properties if needed for internal alignment */
  display: flex;
  flex-direction: column;
  /* Stack canvas and label vertically */
  align-items: center;
  /* Center label horizontally */
}

.live2d-canvas {
  width: 100%;
  /* Fill the wrapper */
  height: 100%;
  /* Fill the wrapper */
  border: 1px solid blue;
  /* Temporary border */
  background-color: rgba(200, 200, 200, 0.2);
  /* Temporary background */
  /* Ensure canvas doesn't overflow its container */
  object-fit: contain;
  /* Scale content to fit */
}

.character-label {
  position: relative;
  /* Or absolute if you want it overlaying the canvas */
  bottom: 10px;
  /* Adjust if using absolute positioning */
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 10;
  /* Ensure label is above canvas if needed */
  /* Optional: If using relative positioning inside flex column */
  align-self: center;
  /* Center label within flex column */
  margin-top: 5px;
  /* Space between canvas and label */
}
</style>
