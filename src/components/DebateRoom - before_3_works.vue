<template>
  <div class="debate-room">
    <h1>AI VTuber Debate Room</h1>
    <div class="characters-container">
      <DebateCharacter v-for="config in characterConfigs" :key="config.id" :character-id="config.id"
        :model-path="config.modelPath" />
    </div>
  </div>
</template>

<script setup>
import DebateCharacter from './DebateCharacter.vue';

const characterConfigs = [
  { id: 'aria', modelPath: '/avatars/aria/BlackWolfGIrl.model3.json' },
  { id: 'sera', modelPath: '/avatars/sera/Snow Leopard.model3.json' },
  { id: 'eidon', modelPath: '/avatars/eidon/10th.model3.json' }
];
</script>

<style scoped>
.debate-room {
  padding: 20px;
  height: 100vh;
  /* Full viewport height */
  display: flex;
  flex-direction: column;
  /* Stack header and container vertically */
}

/* Characters container: Make it flexible and ensure horizontal layout */
.characters-container {
  display: flex;
  justify-content: space-around;
  /* Distribute horizontally */
  align-items: flex-end;
  /* Align characters to the bottom */
  flex: 1;
  /* Take up remaining space after header */
  min-height: 0;
  /* Allows flex items to shrink if needed */
  /* Remove 'flex-wrap: wrap;' to force horizontal layout */
  /* If characters don't fit, they will overflow or shrink (depending on their width) */
  gap: 20px;
  /* Add space between characters */
  padding: 20px 0;
  /* Add some vertical padding */
}

/* Adjust the character wrapper size to fit the available space */
/* You might need to make them smaller or use percentage widths */
/* For now, let's try a smaller fixed size and see if it fits */
/* src/components/DebateCharacter.vue */
/* width: 300px; height: 500px; */
/* Adjust these values based on your screen width and desired layout */
</style>
