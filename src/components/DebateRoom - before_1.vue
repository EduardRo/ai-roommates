<!-- src/components/DebateRoom.vue -->
<template>
  <div class="debate-room">
    <h1>AI VTuber Debate Room</h1>

    <!-- Shared canvas for ALL characters -->
    <canvas ref="sharedCanvas" class="shared-live2d-canvas"></canvas>

    <div class="controls">
      <div>
        <label for="topic">Debate Topic:</label>
        <input id="topic" v-model="debateConfig.topic" type="text" :disabled="debateStatus === 'active'" />
      </div>
      <div>
        <label>Characters:</label>
        <span>{{ debateConfig.characters.join(', ') }}</span>
      </div>
      <div>
        <button @click="startDebate" :disabled="debateStatus === 'active'">
          {{ debateStatus === 'active' ? 'Debate Active' : 'Start Debate' }}
        </button>
        <button @click="stopDebate" :disabled="debateStatus !== 'active'">
          Stop Debate
        </button>
      </div>
      <div class="status">
        Status: <strong>{{ debateStatus }}</strong>
        <span v-if="debateId"> | ID: {{ debateId }}</span>
      </div>
    </div>

    <!-- Characters are now "virtual" — they add models to the shared canvas -->
    <div class="characters-container">
      <DebateCharacter v-for="config in characterConfigs" :key="config.id" :character-id="config.id"
        :model-path="config.modelPath" @speaking-started="(id) => console.log(`${id} started speaking`)"
        @speaking-ended="(id) => console.log(`${id} finished speaking`)" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import DebateCharacter from './DebateCharacter.vue';
import { usePixiApp } from '@/composables/usePixiApp';
import { debateService } from '@/services/debateService';

// Use the shared PixiJS app composable
const { canvasRef: sharedCanvas, initApp, destroyApp, isAppInitialized } = usePixiApp();

// Configuration for the debate
const debateConfig = ref({
  topic: 'Is AI consciousness possible?',
  characters: ['aria', 'sera', 'eidon']
});

const characterConfigs = ref([
  { id: 'aria', modelPath: '/avatars/aria/BlackWolfGlr.model3.json' },
  { id: 'sera', modelPath: '/avatars/sera/Snow Leopard.model3.json' },
  { id: 'eidon', modelPath: '/avatars/eidon/10th.model3.json' }
]);

const debateStatus = ref('idle');
const debateId = ref(null);
const characterRefs = ref({});

// WebSocket message handler (unchanged for now)
const handleWebSocketMessage = (message) => {
  console.log('[DebateRoom] Received WebSocket message:', message);
  // ... (rest of your message handling logic)
};

// Initialize the shared PixiJS app when the component mounts
onMounted(() => {
  console.log('[DebateRoom] Component mounted');
  initApp(); // This sets up the shared canvas
});

// Clean up the app when the component unmounts
onUnmounted(() => {
  console.log('[DebateRoom] Component unmounted');
  destroyApp();
});

// ... (rest of your startDebate, stopDebate, etc. functions remain unchanged)
</script>

<style scoped>
/* Add styles for the shared canvas */
.shared-live2d-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  /* Behind character UI boxes */
  pointer-events: none;
  /* Prevent canvas from blocking UI clicks */
}

.debate-room {
  position: relative;
  padding: 20px;
  font-family: Arial, sans-serif;
  height: 100vh;
  /* Full viewport height */
  overflow: hidden;
}

/* Keep your existing controls and characters-container styles */
.controls {
  position: relative;
  z-index: 10;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 8px;
}

.characters-container {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  /* Align bottoms for better positioning */
  height: 80%;
  /* Leave space for controls */
  gap: 20px;
}

/* Optional: Hide character UI boxes if you want pure canvas rendering */
/* .debate-character { display: none; } */
</style>
