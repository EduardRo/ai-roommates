<template>
  <div class="container">
    <!-- LEFT ZONE: Avatar + Controls -->
    <div class="left-zone">
      <div class="avatar-container">
        <canvas ref="canvas"></canvas>
        <div v-if="!isAudioUnlocked" class="audio-unlock-panel" @click="unlockAudio">
          <button>Awaken Luna</button>
        </div>
        <div class="animation-panel">
          <button @click="triggerAnimation('CuriosityCombo')" :disabled="!canInteract">Curiosity Combo</button>
          <button @click="triggerAnimation('ExcitedWag')" :disabled="!canInteract">Excited Wag</button>
          <button @click="triggerAnimation('ThinkingSequence')" :disabled="!canInteract">Thinking Sequence</button>
        </div>
      </div>
    </div>

    <!-- RIGHT ZONE: Chat Interface -->
    <div class="right-zone">
      <div class="interaction-panel">

        <div class="response-display">
          <p>{{ personaStore.responseText || animationStatus || 'Luna is online.' }}</p>
        </div>
        <div class="input-area">
          <input v-model="userInput" @keyup.enter="submit" placeholder="Transmit directive..."
            :disabled="!canInteract" />
          <button @click="submit" :disabled="!canInteract">{{ personaStore.isLoading ? '...' : 'Send' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed, onUnmounted } from 'vue';
import { usePersonaStore } from '@/stores/personaStore';
import { getAudio } from '@/services/personaService';
const selectedModel = ref('companion') // default model used
const MODEL_PATH = "/avatars/leopard/Snow Leopard.model3.json";
const canvas = ref(null);
const userInput = ref('');
const personaStore = usePersonaStore();
const isAudioUnlocked = ref(false);
const isThinking = ref(false);
const isSpeaking = ref(false);
const animationStatus = ref('');
const canInteract = computed(() => !personaStore.isLoading && isAudioUnlocked.value);
let live2dModel = null;
let app = null;

// 1. UPDATE THE WATCHER (around line 41)
watch(() => personaStore.responseTrigger, (newValue, oldValue) => {
  console.log(`[Watcher] Trigger value changed: ${oldValue} -> ${newValue}`);
  const commands = personaStore.animationCommands;
  if (!commands || commands.length === 0) {
    console.log("[Watcher] No commands to execute");
    isThinking.value = false;
    isSpeaking.value = false;
    return;
  }
  console.log(`[Watcher] Commands: ${commands.length}`);
  if (commands[0].type === 'error') {
    playErrorAnimation();
  } else {
    // 🔥 PASS audio_b64 to orchestrateSpeech
    orchestrateSpeech(
      personaStore.responseText,
      commands,
      personaStore.audio_b64  // ← ADD THIS
    );
  }
  isThinking.value = false;
});

function changeModel() {
  personaStore.setModel(selectedModel.value)
  console.log(`[UI] Model switched to: ${selectedModel.value}`)
}

async function triggerAnimation(sequenceName) {
  if (!canInteract.value) return;
  //console.log(`[Animation] Triggering: ${sequenceName}`);
  animationStatus.value = `Playing ${sequenceName}`;
  try {
    const response = await fetch('http://127.0.0.1:8000/v1/trigger_animation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_name: sequenceName }),
    });
    if (!response.ok) throw new Error(`Animation Error: ${await response.text()}`);
    const { avatar_commands } = await response.json();
    //console.log(`[Animation] Received ${avatar_commands.length} commands for ${sequenceName}`);
    executeCommandList(avatar_commands, 7000); // Fixed 7-second duration
    await new Promise(resolve => setTimeout(resolve, 7000));
    animationStatus.value = '';
  } catch (error) {
    console.error(`[Animation] Failed: ${error}`);
    animationStatus.value = 'Animation failed';
    playErrorAnimation();
    await new Promise(resolve => setTimeout(resolve, 2000));
    animationStatus.value = '';
  }
}

async function submit() {
  if (!userInput.value.trim() || !canInteract.value) return;
  console.log(`[Submit] Sending: "${userInput.value}"`);
  isThinking.value = true;
  playThinkingAnimation();
  personaStore.ask(userInput.value);
  userInput.value = '';
}


//----------------------------------
// Function to orchestrate the speech and animation
// 2. UPDATE orchestrateSpeech FUNCTION (around line 82)
async function orchestrateSpeech(text, animationCommands, audioB64) {  // ← ADD audioB64 parameter
  if (!text || !animationCommands) return;
  isSpeaking.value = true;

  // Reset face to neutral
  ['ParamAngleX', 'ParamAngleZ', 'PARAM_ANGLE_X', 'PARAM_ANGLE_Z', 'ParamMouthOpenY'].forEach(p => setParameterValue(p, 0));

  // 🔥 PASS audioB64 to getAudio
  const audio = await getAudio(text, audioB64);  // ← CHANGE THIS LINE
  if (!audio) {
    console.warn("[Orchestrate] No audio generated, skipping animation.");
    isSpeaking.value = false;
    return;
  }

  // ... rest of the function stays the same
  // Start audio
  const playPromise = audio.play();

  const startTime = performance.now();
  const mouthMin = 0.2;
  const mouthMax = 0.8;

  let animIndex = 0;
  const totalCommands = animationCommands.length;
  const stepDuration = 100;
  let animationFrameId = null;
  let isAnimating = true;

  const estimatedDuration = Math.max(3, text.length / 12);
  const maxAnimationTime = estimatedDuration * 1000;

  console.log(`[Orchestrate] Estimated duration: ${estimatedDuration}s for ${text.length} chars`);

  function stopAnimation() {
    if (!isAnimating) return;
    isAnimating = false;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    setParameterValue('ParamMouthOpenY', 0);
    isSpeaking.value = false;
    console.log("[Orchestrate] Animation stopped");
  }

  function animate(time) {
    if (!isAnimating) {
      return;
    }

    const elapsed = time - startTime;

    if (elapsed > maxAnimationTime) {
      console.log(`[Orchestrate] Reached max animation time (${elapsed}ms)`);
      stopAnimation();
      return;
    }

    if (typeof audio.paused !== 'undefined' && audio.paused) {
      console.log("[Orchestrate] Audio paused detected");
      stopAnimation();
      return;
    }

    if (typeof audio.ended !== 'undefined' && audio.ended) {
      console.log("[Orchestrate] Audio ended detected");
      stopAnimation();
      return;
    }

    const t = (elapsed % 600) / 600;
    const mouthValue = mouthMin + (mouthMax - mouthMin) * Math.abs(Math.sin(Math.PI * t));
    setParameterValue('ParamMouthOpenY', mouthValue);

    const commandsPerStep = Math.ceil(totalCommands / (maxAnimationTime / stepDuration));

    for (let i = 0; i < commandsPerStep && animIndex < totalCommands; i++, animIndex++) {
      const cmd = animationCommands[animIndex];
      if (cmd.type === 'setParameter') {
        setParameterValue(cmd.payload.id, cmd.payload.value);
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  if (playPromise && typeof playPromise.then === 'function') {
    try {
      await playPromise;
    } catch (err) {
      console.error("[Orchestrate] Play failed:", err);
      stopAnimation();
      return;
    }
  }

  animationFrameId = requestAnimationFrame(animate);
}




//------------------------



async function playThinkingAnimation() {
  if (!live2dModel?.internalModel?.coreModel) {
    console.log("[Thinking] Model not ready");
    isThinking.value = false;
    return;
  }
  console.log("[Thinking] Starting animation");
  const params = [
    { id: 'ParamMouthOpenY', value: 0.0 },
    { id: 'ParamAngleZ', value: 15 },
    { id: 'ParamBrowLY', value: -0.8 },
    { id: 'Param38', value: 0.5 },
    { id: 'Param40', value: 0.5 },
  ];
  params.forEach(p => setParameterValue(p.id, p.value));
  //console.log("[Thinking] Set initial params");
  await new Promise(res => setTimeout(res, 10));
  setParameterValue('ParamMouthOpenY', 0.3);
  setParameterValue('ParamEyeLOpen', 0.0);
  setParameterValue('ParamEyeROpen', 0.0);
  //console.log("[Thinking] Set ParamMouthOpenY=0.3, eyes closed");
  await new Promise(res => setTimeout(res, 10));
  setParameterValue('ParamMouthOpenY', 0.5);
  setParameterValue('ParamEyeLOpen', 1.0);
  setParameterValue('ParamEyeROpen', 1.0);
  setParameterValue('ParamAngleX', 0);
  //console.log("[Thinking] Set ParamMouthOpenY=0.5, eyes open, ParamAngleX=10");
  await new Promise(res => setTimeout(res, 10));
  setParameterValue('ParamMouthOpenY', 0.7);
  setParameterValue('ParamAngleZ', -3);
  setParameterValue('ParamBodyAngleZ', 1);
  setParameterValue('Param38', -0.5);
  setParameterValue('Param40', -0.5);
  //console.log("[Thinking] Set ParamMouthOpenY=0.7, ParamAngleZ=-15, ParamBodyAngleZ=5");
  await new Promise(res => setTimeout(res, 100));
  setParameterValue('ParamMouthOpenY', 0.3);
  setParameterValue('ParamEyeLOpen', 0.0);
  setParameterValue('ParamEyeROpen', 0.0);
  setParameterValue('ParamAngleX', -7);
  setParameterValue('ParamBodyAngleZ', -3);
  //console.log("[Thinking] Set ParamMouthOpenY=0.3, eyes closed");
  await new Promise(res => setTimeout(res, 100));
  setParameterValue('ParamMouthOpenY', 0.7);
  setParameterValue('ParamEyeLOpen', 0.6);
  setParameterValue('ParamEyeROpen', 0.6);
  setParameterValue('ParamAngleX', -10);
  setParameterValue('ParamBodyAngleZ', -5);
  //console.log("[Thinking] Set ParamMouthOpenY=0, eyes open, ParamAngleX=-10, ParamBodyAngleZ=-5");
  await new Promise(res => setTimeout(res, 300));
  if (!isThinking.value) {
    const resetParams = [
      { id: 'ParamMouthOpenY', value: 0.0 },
      { id: 'ParamAngleZ', value: 0 },
      { id: 'ParamBrowLY', value: 0 },
      { id: 'ParamAngleX', value: 0 },
      { id: 'ParamBodyAngleZ', value: 0 },
      { id: 'Param38', value: 0 },
      { id: 'Param40', value: 0 },
    ];
    resetParams.forEach(p => setParameterValue(p.id, p.value));
    console.log("[Thinking] Reset all parameters");
  }
}

async function playErrorAnimation() {
  if (!live2dModel) return;
  setParameterValue('ParamBrowLY', -1);
  setParameterValue('ParamAngleZ', 10);
  //console.log("[Error] Set ParamBrowLY=-1, ParamAngleZ=10");
  await new Promise(res => setTimeout(res, 200));
  setParameterValue('ParamAngleZ', -10);
  await new Promise(res => setTimeout(res, 200));
  setParameterValue('ParamAngleZ', 0);
}

async function executeCommandList(commands, duration) {
  if (!live2dModel) {
    console.log("[Execute] Model not loaded");
    return;
  }
  const start = Date.now();
  for (const cmd of commands) {
    if (Date.now() - start > duration) {
      console.log("[Execute] Duration exceeded");
      break;
    }
    if (cmd.type === 'setParameter') {
      console.log(`[Execute] Applying ${cmd.payload.id}=${cmd.payload.value}`);
      setParameterValue(cmd.payload.id, cmd.payload.value);
    } else if (cmd.type === 'wait') {
      console.log(`[Execute] Waiting ${cmd.payload.duration_ms}ms`);
      await new Promise(res => setTimeout(res, cmd.payload.duration_ms));
    }
  }
  setParameterValue('ParamMouthOpenY', 0.0);
  //console.log("[Execute] Reset ParamMouthOpenY=0");
}

function setParameterValue(paramId, value) {
  if (!live2dModel?.internalModel?.coreModel) {
    console.error(`[SetParameter] Model not ready for ${paramId}`);
    return;
  }
  try {
    live2dModel.internalModel.coreModel.setParameterValueById(paramId, value);
    const current = live2dModel.internalModel.coreModel.getParameterValueById(paramId);
    console.log(`[SetParameter] Set ${paramId}=${value}, Current=${current}`);
  } catch (e) {
    console.error(`[SetParameter] Error setting ${paramId}: ${e}`);
  }
}

function unlockAudio() {
  isAudioUnlocked.value = true;
  console.log("[Audio] Context unlocked");
}

onMounted(async () => {
  if (typeof PIXI === 'undefined') {
    console.error("[Mounted] PIXI not loaded");
    return;
  }
  // eslint-disable-next-line no-undef
  app = new PIXI.Application({ view: canvas.value, autoStart: true, backgroundAlpha: 0, resizeTo: canvas.value.parentElement });
  try {

    // live2dModel = await PIXI.live2d.Live2DModel.from(MODEL_PATH);
    // 🔥 DISABLE MOUSE FOLLOWING HERE: Add { autoInteract: false } option 🔥
    // eslint-disable-next-line no-undef
    live2dModel = await PIXI.live2d.Live2DModel.from(MODEL_PATH, { autoInteract: false });
    app.stage.addChild(live2dModel);
    live2dModel.anchor.set(0.5, 0.5);
    live2dModel.x = app.screen.width / 2;
    live2dModel.y = app.screen.height * 1.65;
    live2dModel.scale.set(0.30);
    // 🔥 DISABLE MOUSE FOLLOWING HERE 🔥
    live2dModel.interactionManager.enabled = false;
    console.log("[Mounted] Live2D model loaded");


    //---------------------
    const debugParams = live2dModel.parameters || live2dModel.internalModel?.parameters;
    if (!debugParams) {
      console.error("No parameters found");
      return;
    }

    debugParams.ids.forEach((id, index) => {
      console.log(`[Param] ${id}: ${debugParams.values[index]}`);
    });



    //---------------------

    const paramIds = [
      'ParamAngleX', 'ParamAngleZ', 'ParamEyeLOpen', 'ParamEyeROpen',
      'ParamBrowLY', 'Param38', 'Param40', 'ParamBodyAngleZ', 'ParamEyeLSmile', 'ParamMouthOpenY'
    ];
    paramIds.forEach(id => {
      try {
        const min = live2dModel.internalModel.coreModel.getParameterMinimumValue(id);
        const max = live2dModel.internalModel.coreModel.getParameterMaximumValue(id);
        const current = live2dModel.internalModel.coreModel.getParameterValueById(id);
        console.log(`[Mounted] ${id}: min=${min}, max=${max}, current=${current}`);
      } catch (e) {
        console.error(`[Mounted] Error getting ${id}: ${e}`);
      }
    });
  } catch (error) {
    console.error(`[Mounted] Model load failed: ${error}`);
  }
});

onUnmounted(() => {
  if (app) {
    app.destroy(true);
    console.log("[Unmounted] PIXI app destroyed");
  }
});
</script>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  display: flex;
  background-color: #2c3e50;
  overflow: hidden;
}

/* LEFT ZONE */
.left-zone {
  width: 50%;
  height: 100%;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.avatar-container {
  width: 100%;
  height: 80%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  width: 100%;
  height: 100%;
  max-width: 800px;
  max-height: 800px;
  object-fit: contain;
  display: block;
}

.audio-unlock-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  cursor: pointer;
}

.audio-unlock-panel button {
  padding: 20px 40px;
  font-size: 1.5em;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.animation-panel {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 800px;
  padding: 10px;
  display: flex;
  gap: 10px;
  justify-content: center;
  z-index: 10;
}

.animation-panel button {
  padding: 10px 20px;
  font-size: 1em;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.animation-panel button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

/* RIGHT ZONE */
.right-zone {
  width: 50%;
  height: 100%;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  background-color: #1a252f;
}

.interaction-panel {
  width: 100%;
  max-width: 600px;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.response-display {
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 15px;
  border-radius: 12px;
  min-height: 150px;
  text-align: center;
  font-family: sans-serif;
  font-size: 1.1em;
  overflow-y: auto;
  max-height: 300px;
}

.input-area {
  display: flex;
  gap: 10px;
  width: 100%;
}

.input-area input {
  flex-grow: 1;
  border: none;
  padding: 15px;
  border-radius: 12px;
  font-size: 1em;
  background: #34495e;
  color: white;
  outline: none;
}

.input-area button {
  border: none;
  padding: 0 25px;
  background-color: #42b983;
  color: white;
  font-size: 1em;
  font-weight: bold;
  border-radius: 12px;
  cursor: pointer;
}

.input-area button:disabled {
  background-color: #555;
  cursor: not-allowed;
}
</style>
