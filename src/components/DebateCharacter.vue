<!-- src/components/DebateCharacter.vue -->
<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { getAudio } from '@/services/personaService'; // Reuse your existing audio service

const props = defineProps({
  characterId: {
    type: String,
    required: true
  },
  modelPath: {
    type: String,
    required: true
  },
  // Optional: Pass character-specific settings if needed
  // voiceConfig: Object,
  // animationConfig: Object
});

const emit = defineEmits(['speakingStarted', 'speakingEnded']);

const canvas = ref(null);
const isSpeaking = ref(false);
const isThinking = ref(false);

let live2dModel = null;
let app = null;

// Function to handle incoming speech data for this character
const handleSpeech = async (text, audioB64, audioUrl) => {
  if (!text) return;

  console.log(`[DebateCharacter:${props.characterId}] Handling speech`);
  isSpeaking.value = true;
  emit('speakingStarted', props.characterId);

  // Reset mouth parameter before starting
  setParameterValue('ParamMouthOpenY', 0);

  try {
    // Use your existing getAudio function - it handles audio_b64 and audio_url internally
    // If audioUrl is provided and audioB64 is null, getAudio should fall back to URL
    const audio = await getAudio(text, audioB64);
    if (!audio) {
      console.warn(`[DebateCharacter:${props.characterId}] No audio generated, skipping animation.`);
      finishSpeaking();
      return;
    }

    // Start playing audio
    const playPromise = audio.play();
    const startTime = performance.now();
    const mouthMin = 0.2;
    const mouthMax = 0.8;

    let animIndex = 0;
    // Assuming animationCommands are sent in the message, which they currently are not.
    // We'll focus on basic lip-sync for now using the text.
    // If animation commands are sent later, they can be used here.
    const animationCommands = []; // Placeholder - you might receive these in the future
    const totalCommands = animationCommands.length;
    const stepDuration = 100;
    let animationFrameId = null;
    let isAnimating = true;

    // Estimate duration based on text length if audio duration is unavailable
    const estimatedDuration = Math.max(3, text.length / 12);
    const maxAnimationTime = estimatedDuration * 1000;

    console.log(`[DebateCharacter:${props.characterId}] Estimated duration: ${estimatedDuration}s for ${text.length} chars`);

    const stopAnimation = () => {
      if (!isAnimating) return;
      isAnimating = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      setParameterValue('ParamMouthOpenY', 0);
      console.log(`[DebateCharacter:${props.characterId}] Animation stopped`);
    };

    const animate = (time) => {
      if (!isAnimating) return;

      const elapsed = time - startTime;

      if (elapsed > maxAnimationTime) {
        console.log(`[DebateCharacter:${props.characterId}] Reached max animation time (${elapsed}ms)`);
        stopAnimation();
        finishSpeaking();
        return;
      }

      // Check if audio has ended
      if (audio.ended || (typeof audio.paused !== 'undefined' && audio.paused && elapsed > 1000)) { // Small delay to account for play() async
        console.log(`[DebateCharacter:${props.characterId}] Audio ended detected`);
        stopAnimation();
        finishSpeaking();
        return;
      }

      // Basic lip-sync based on time
      const t = (elapsed % 600) / 600; // Oscillate every 600ms
      const mouthValue = mouthMin + (mouthMax - mouthMin) * Math.abs(Math.sin(Math.PI * t));
      setParameterValue('ParamMouthOpenY', mouthValue);

      // Process animation commands if available
      if (totalCommands > 0) {
        const commandsPerStep = Math.ceil(totalCommands / (maxAnimationTime / stepDuration));
        for (let i = 0; i < commandsPerStep && animIndex < totalCommands; i++, animIndex++) {
          const cmd = animationCommands[animIndex];
          if (cmd.type === 'setParameter') {
            setParameterValue(cmd.payload.id, cmd.payload.value);
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    if (playPromise && typeof playPromise.then === 'function') {
      try {
        await playPromise;
      } catch (err) {
        console.error(`[DebateCharacter:${props.characterId}] Play failed:`, err);
        stopAnimation();
        finishSpeaking();
        return;
      }
    }

    animationFrameId = requestAnimationFrame(animate);

  } catch (error) {
    console.error(`[DebateCharacter:${props.characterId}] Error during speech:`, error);
    finishSpeaking();
  }
};

const finishSpeaking = () => {
  isSpeaking.value = false;
  emit('speakingEnded', props.characterId);
  console.log(`[DebateCharacter:${props.characterId}] Finished speaking`);
};

// Watch for speech events targeted at this character
// The parent component will call this function when a message arrives for this character
const onReceiveSpeech = (data) => {
  handleSpeech(data.text, data.audio_b64, data.audio_url); // Use the correct field names from backend
};

// Define setParameterValue function
function setParameterValue(paramId, value) {
  if (!live2dModel?.internalModel?.coreModel) {
    console.error(`[SetParameter:${props.characterId}] Model not ready for ${paramId}`);
    return;
  }
  try {
    live2dModel.internalModel.coreModel.setParameterValueById(paramId, value);
    // console.log(`[SetParameter:${props.characterId}] Set ${paramId}=${value}`); // Optional: remove for performance
  } catch (e) {
    console.error(`[SetParameter:${props.characterId}] Error setting ${paramId}: ${e}`);
  }
}

// Setup Live2D model
onMounted(async () => {
  if (typeof PIXI === 'undefined') {
    console.error(`[DebateCharacter:${props.characterId}] PIXI not loaded`);
    return;
  }

  try {
    // Initialize PIXI Application
    app = new PIXI.Application({
      view: canvas.value,
      autoStart: true,
      backgroundAlpha: 0,
      resizeTo: canvas.value.parentElement
    });

    // Load Live2D Model
    // Note: You might need to adjust the import path for PIXI.live2d depending on your setup
    // This assumes pixi-live2d-display is correctly installed and configured
    // eslint-disable-next-line no-undef
    live2dModel = await PIXI.live2d.Live2DModel.from(props.modelPath, { autoInteract: false });
    app.stage.addChild(live2dModel);

    // Position and scale the model (adjust as needed for your layout)
    live2dModel.anchor.set(0.5, 0.5);
    // Example positioning - you'll likely want to adjust these based on your 3-character layout
    live2dModel.x = app.screen.width / 2;
    live2dModel.y = app.screen.height * 1.7; // Adjust Y position
    live2dModel.scale.set(0.25); // Adjust scale
    live2dModel.interactionManager.enabled = false;

    console.log(`[DebateCharacter:${props.characterId}] Live2D model loaded successfully`);

    // Optional: Log initial parameters for debugging
    // const debugParams = live2dModel.internalModel?.parameters;
    // if (debugParams) {
    //   debugParams.ids.forEach((id, index) => {
    //     console.log(`[DebateCharacter:${props.characterId}] Initial ${id}: ${debugParams.values[index]}`);
    //   });
    // }

  } catch (error) {
    console.error(`[DebateCharacter:${props.characterId}] Error loading Live2D model:`, error);
  }
});

onUnmounted(() => {
  // Cleanup PIXI Application and WebSocket resources if needed
  if (app) {
    app.destroy(true);
    console.log(`[DebateCharacter:${props.characterId}] PIXI app destroyed`);
  }
  // Note: WebSocket connection is managed by parent, not individual characters
});

// Expose the speech handler so the parent can call it
defineExpose({
  characterId: props.characterId,
  onReceiveSpeech
});
</script>

<template>
  <div class="debate-character" :class="{ speaking: isSpeaking, thinking: isThinking }">
    <h3>{{ characterId }}</h3> <!-- Display character ID for now, you can fetch the name from props if available -->
    <canvas ref="canvas" class="live2d-canvas"></canvas>
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
