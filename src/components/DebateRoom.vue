<!-- src/components/DebateRoom.vue -->
<template>
  <div class="debate-room">
    <h1>AI VTuber Debate Room</h1>

    <canvas ref="sharedCanvasRef" class="shared-live2d-canvas" />

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

    <div class="character-placeholders">
      <DebateCharacter v-for="config in characterConfigs" :key="config.id" :character-id="config.id"
        :model-path="config.modelPath" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue';
import DebateCharacter from './DebateCharacter.vue';
import { usePixiApp } from '@/composables/usePixiApp';

const { canvasRef: sharedCanvasRef, initApp, destroyApp } = usePixiApp();

const debateConfig = ref({
  topic: 'Is AI consciousness possible?',
  characters: ['aria', 'sera', 'eidon']
});

const characterConfigs = ref([
  { id: 'aria', modelPath: '/avatars/aria/BlackWolfGIrl.model3.json' },
  { id: 'sera', modelPath: '/avatars/sera/Snow Leopard.model3.json' },
  { id: 'eidon', modelPath: '/avatars/eidon/10th.model3.json' }
]);

const debateStatus = ref('idle');
const debateId = ref(null);

// startDebate/stopDebate placeholders
const startDebate = () => { /* Implement */ };
const stopDebate = () => { /* Implement */ };

onMounted(() => {
  console.log('[DebateRoom] Component mounted, initializing shared Pixi app.');
  nextTick(() => initApp()); // Ensure canvas exists
});

onUnmounted(() => {
  console.log('[DebateRoom] Component unmounted, destroying shared Pixi app.');
  destroyApp();
});
</script>

<style scoped>
.debate-room {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.shared-live2d-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 600px;
  z-index: 1;
  pointer-events: none;
  display: block;
  background: transparent;
}

.controls {
  position: relative;
  z-index: 10;
  margin-bottom: 20px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 8px;
  width: 80%;
  max-width: 800px;
  text-align: center;
}

.status {
  font-style: italic;
  color: #ccc;
}

.character-placeholders {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: space-around;
  width: 100%;
  display: none;
  /* Hide if not needed */
}
</style>
