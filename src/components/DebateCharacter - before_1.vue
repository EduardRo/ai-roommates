<!-- src/components/DebateCharacter.vue -->
<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
import { getSharedPixiApp } from '@/composables/usePixiApp';
import { getAudio } from '@/services/personaService';

const props = defineProps({
  characterId: { type: String, required: true },
  modelPath: { type: String, required: true }
});

const emit = defineEmits(['speakingStarted', 'speakingEnded']);

const isSpeaking = ref(false);
const isThinking = ref(false);

let live2dModel = null;
let app = null; // This will now reference the SHARED app

// ... (keep your existing handleSpeech, finishSpeaking, onReceiveSpeech, setParameterValue functions)

onMounted(async () => {
  // Get the shared PixiJS app
  app = getSharedPixiApp();
  if (!app) {
    console.error(`[DebateCharacter:${props.characterId}] Shared PixiJS app not initialized`);
    return;
  }

  try {
    // Load the Live2D model
    // eslint-disable-next-line no-undef
    live2dModel = await PIXI.live2d.Live2DModel.from(props.modelPath, { autoInteract: false });

    // Add the model to the SHARED stage
    app.stage.addChild(live2dModel);

    // Position and scale the model — these will be per-character in the next step
    live2dModel.anchor.set(0.5, 1); // Anchor to bottom-center
    live2dModel.x = app.screen.width / 2; // TEMP: Center all (will be fixed per-character later)
    live2dModel.y = app.screen.height * 0.9; // Near bottom
    live2dModel.scale.set(0.25);

    // Safe interactionManager check
    if (live2dModel.interactionManager) {
      live2dModel.interactionManager.enabled = false;
    }

    console.log(`[DebateCharacter:${props.characterId}] Model added to shared stage`);

  } catch (error) {
    console.error(`[DebateCharacter:${props.characterId}] Error loading model:`, error);
  }
});

onUnmounted(() => {
  // Remove the model from the shared stage when this component is destroyed
  if (live2dModel && app) {
    app.stage.removeChild(live2dModel);
    live2dModel.destroy();
    console.log(`[DebateCharacter:${props.characterId}] Model removed from stage`);
  }
});

// Expose methods for parent
defineExpose({
  characterId: props.characterId,
  onReceiveSpeech
});
</script>

<!-- Keep your existing template and styles for status indicators -->
<template>
  <div class="debate-character" :class="{ speaking: isSpeaking, thinking: isThinking }">
    <h3>{{ characterId }}</h3>
    <!-- No canvas here anymore -->
    <div class="status-indicator">
      <span v-if="isSpeaking" class="status-speaking">🎤 Speaking</span>
      <span v-else-if="isThinking" class="status-thinking">🤔 Thinking</span>
      <span v-else class="status-idle">😴 Idle</span>
    </div>
  </div>
</template>



<style scoped>
.debate-character {
  display: inline-block;
  margin: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-align: center;
  background-color: #f9f9f9;
  transition: border-color 0.3s;
}

.debate-character.speaking {
  border-color: #4CAF50;
  background-color: #e8f5e9;
}

.debate-character.thinking {
  border-color: #FF9800;
  background-color: #fff3e0;
}

.live2d-canvas {
  width: 200px;
  height: 300px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.status-indicator {
  margin-top: 5px;
}

.status-speaking {
  color: #4CAF50;
  font-weight: bold;
}

.status-thinking {
  color: #FF9800;
  font-weight: bold;
}

.status-idle {
  color: #999;
}
</style>
