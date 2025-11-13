<!-- src/components/DebateRoom.vue -->
<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue';
import DebateCharacter from './DebateCharacter.vue';
import { debateService } from '@/services/debateService';

// Configuration for the debate
const debateConfig = ref({
  topic: 'Is AI consciousness possible?',
  characters: ['aria', 'sera', 'eidon'] // IDs must match backend character profiles
});

// Character configurations (model paths, etc.)
const characterConfigs = ref([
  // { id: 'aria', modelPath: '/avatars/aria.model3.json' }, // Update path as needed
  { id: 'aria', modelPath: '/avatars/aria/BlackWolfGIrl.model3.json' },
  { id: 'sera', modelPath: '/avatars/sera/Snow Leopard.model3.json' }, // Update path as needed
  { id: 'eidon', modelPath: '/avatars/eidon/10th.model3.json' } // Update path as needed
]);

const debateStatus = ref('idle'); // idle, active, stopped, error
const debateId = ref(null);
const characterRefs = ref([]); // To hold references to child components

// Function to handle messages received from the WebSocket
const handleWebSocketMessage = (message) => {
  console.log('[DebateRoom] Received WebSocket message:', message);

  if (message.type === 'debate_started') {
    debateStatus.value = 'active';
    debateId.value = message.data.debate_id;
    console.log('[DebateRoom] Debate started:', message.data.debate_id);
  } else if (message.type === 'character_speaking') {
    const characterId = message.data.character_id;
    console.log(`[DebateRoom] Character ${characterId} is speaking`);

    // Find the correct character component and trigger its speech handler
    const characterComponent = characterRefs.value.find(ref => ref.characterId === characterId);
    if (characterComponent) {
      // Call the onReceiveSpeech method exposed by the child component
      characterComponent.onReceiveSpeech(message.data);
    } else {
      console.warn(`[DebateRoom] No component found for character: ${characterId}`);
    }
  } else if (message.type === 'debate_ended') {
    debateStatus.value = 'stopped';
    console.log('[DebateRoom] Debate ended:', message.data);
  } else if (message.type === 'error') {
    debateStatus.value = 'error';
    console.error('[DebateRoom] Error from backend:', message.message);
  }
};

// Function to start the debate
const startDebate = async () => {
  if (debateStatus.value === 'active') {
    console.warn('[DebateRoom] Debate already active');
    return;
  }

  try {
    console.log('[DebateRoom] Attempting to connect to WebSocket...');
    await debateService.connect(handleWebSocketMessage);
    console.log('[DebateRoom] WebSocket connected, starting debate...');
    debateService.startDebate(debateConfig.value.topic, debateConfig.value.characters);
  } catch (error) {
    console.error('[DebateRoom] Failed to connect or start debate:', error);
    debateStatus.value = 'error';
  }
};

// Function to stop the debate
const stopDebate = () => {
  if (debateStatus.value === 'active' && debateId.value) {
    debateService.stopDebate(debateId.value);
    // The status will be updated by the handleWebSocketMessage when 'debate_ended' is received
  }
};

// Function to disconnect WebSocket (cleanup)
const disconnectWebSocket = () => {
  debateService.disconnect();
};

// Setup and cleanup
onMounted(() => {
  console.log('[DebateRoom] Component mounted');
  // WebSocket connection will be handled by startDebate
});

onUnmounted(() => {
  console.log('[DebateRoom] Component unmounted, disconnecting WebSocket');
  disconnectWebSocket();
});
</script>

<template>
  <div class="debate-room">
    <h1>AI VTuber Debate Room</h1>

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

    <div class="characters-container">
      <DebateCharacter v-for="config in characterConfigs" :key="config.id"
        :ref="(el) => { if (el) characterRefs[config.id] = el; }" :character-id="config.id"
        :model-path="config.modelPath" @speaking-started="(id) => console.log(`${id} started speaking`)"
        @speaking-ended="(id) => console.log(`${id} finished speaking`)" />
    </div>
  </div>
</template>

<style scoped>
.debate-room {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.controls {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 8px;
}

.controls>div {
  margin-bottom: 10px;
}

.controls label {
  display: inline-block;
  width: 120px;
  font-weight: bold;
}

.controls input {
  width: 300px;
  padding: 5px;
}

.controls button {
  margin-right: 10px;
  padding: 8px 16px;
  cursor: pointer;
}

.status {
  font-style: italic;
  color: #555;
}

.characters-container {
  display: flex;
  justify-content: space-around;
  /* Distribute characters evenly */
  align-items: flex-start;
  /* Align tops */
  flex-wrap: wrap;
  /* Allow wrapping if needed */
  gap: 20px;
  /* Space between character boxes */
}
</style>
