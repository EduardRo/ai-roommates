<!-- src/components/DebateRoom.vue -->
<template>
  <div class="debate-room">
    <h1>AI VTuber Debate Room</h1>
    <div class="characters-container">
      <!-- Render 3 independent characters -->
      <DebateCharacter v-for="config in characterConfigs" :key="config.id" :character-id="config.id"
        :model-path="config.modelPath" />
    </div>
  </div>
</template>

<script setup>
import DebateCharacter from './DebateCharacter.vue';

const characterConfigs = [
  //{ id: 'aria', modelPath: '/avatars/aria/BlackWolfGIrl.model3.json' }
  //{ id: 'sera', modelPath: '/avatars/sera/Snow Leopard.model3.json' },
  { id: 'eidon', modelPath: '/avatars/eidon/10th.model3.json' }
];
</script>

<style scoped>
.debate-room {
  padding: 20px;
}

.characters-container {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
}
</style>
