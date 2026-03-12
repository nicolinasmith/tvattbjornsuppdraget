const game = document.getElementById("game");
const track = document.getElementById("track");
const sprite = document.getElementById("sprite");
const nicolina = document.getElementById("nicolina");
const quizOverlay = document.getElementById("quizOverlay");
const quizHeading = document.getElementById("quizHeading");
const quizQuestion = document.getElementById("quizQuestion");
const quizAnswers = document.getElementById("quizAnswers");
const quizFeedback = document.getElementById("quizFeedback");
const introPopupOne = document.getElementById("introPopupOne");
const introPopupTwo = document.getElementById("introPopupTwo");
const introContinue = document.getElementById("introContinue");
const introStartJourney = document.getElementById("introStartJourney");
const miniFinale = document.getElementById("miniFinale");
const miniFinaleContinue = document.getElementById("miniFinaleContinue");
const miniFinaleDetails = document.getElementById("miniFinaleDetails");
const miniFinaleDetailsContinue = document.getElementById("miniFinaleDetailsContinue");
const togetherScene = document.getElementById("togetherScene");
const FRAME_COUNT = 4;
const NICOLINA_FRAME_COUNT = 4;
const NICOLINA_FRAME_INSET_X = 2;
const QUESTIONS_ENABLED = true;
const spriteCtx = sprite.getContext("2d", { alpha: true });
const nicolinaCtx = nicolina.getContext("2d", { alpha: true });
const SIGN_SPACING = 900;

let frameIndex = 0;
let frameSourceWidth = 0;
let frameSourceHeight = 0;
let sheetWidth = 0;
let sheetLoaded = false;
let frameCropBounds = [];
let nicolinaFrameIndex = 0;
let nicolinaFrameSourceWidth = 0;
let nicolinaFrameSourceHeight = 0;
let nicolinaSheetWidth = 0;
let nicolinaSheetLoaded = false;
let nicolinaRunTimer = null;
let isPointerHeld = false;
let runTimer = null;
let backgroundOffset = 0;
let worldDistance = 0;
let questions = [];
let signStops = [];
let signElements = [];
let nextSignIndex = 0;
let isQuizOpen = false;
let isIntroActive = true;
let isFinaleUnlocked = false;
let hasReachedNicolina = false;
let nicolinaWorldStop = 0;

function goToIntroStepTwo() {
  introPopupOne.classList.add("hidden");
  introPopupTwo.classList.remove("hidden");
}

function startJourneyFromIntro() {
  introPopupTwo.classList.add("hidden");
  isIntroActive = false;
}

function openMiniFinale() {
  miniFinale.classList.remove("hidden");
}

function closeMiniFinale() {
  miniFinale.classList.add("hidden");
}

function openMiniFinaleDetails() {
  miniFinaleDetails.classList.remove("hidden");
}

function closeMiniFinaleDetails() {
  miniFinaleDetails.classList.add("hidden");
}

function showTogetherScene() {
  closeMiniFinaleDetails();
  sprite.classList.add("hidden");
  nicolina.classList.add("hidden");
  if (nicolinaRunTimer) {
    clearInterval(nicolinaRunTimer);
    nicolinaRunTimer = null;
  }
  togetherScene.classList.remove("hidden");
}

function proceedMiniFinale() {
  closeMiniFinale();
  openMiniFinaleDetails();
}

function updateBackground() {
  track.style.backgroundPosition = `${backgroundOffset}px 0`;
}

function buildSigns() {
  signElements.forEach((sign) => sign.remove());
  signElements = signStops.map((_) => {
    const sign = document.createElement("div");
    sign.className = "sign";
    track.appendChild(sign);
    return sign;
  });
  updateSigns();
}

function updateSigns() {
  const spriteFront = sprite.offsetLeft + sprite.clientWidth * 0.72;
  signElements.forEach((sign, index) => {
    const stop = signStops[index];
    const x = spriteFront + stop - worldDistance;
    sign.style.left = `${x}px`;
    if (index < nextSignIndex) {
      sign.classList.add("passed");
    } else {
      sign.classList.remove("passed");
    }
  });
}

function updateNicolinaPosition() {
  if (!isFinaleUnlocked) {
    return;
  }

  const spriteFront = sprite.offsetLeft + sprite.clientWidth * 0.72;
  const x = spriteFront + nicolinaWorldStop - worldDistance;
  nicolina.style.left = `${x}px`;
}

function closeQuiz() {
  isQuizOpen = false;
  quizOverlay.classList.add("hidden");
}

function unlockFinale() {
  if (isFinaleUnlocked) {
    return;
  }

  isFinaleUnlocked = true;
  nicolinaWorldStop = worldDistance + track.clientWidth * 1.35;
  nicolina.classList.remove("hidden");
  updateNicolinaFrame();
  updateNicolinaPosition();
}

function startNicolinaRun() {
  if (nicolinaRunTimer || !nicolinaSheetLoaded) {
    return;
  }

  nicolinaRunTimer = setInterval(() => {
    nicolinaFrameIndex = (nicolinaFrameIndex + 1) % NICOLINA_FRAME_COUNT;
    updateNicolinaFrame();
  }, 120);
}

function openQuiz(index) {
  const item = questions[index % questions.length];
  if (!item) {
    nextSignIndex += 1;
    return;
  }

  let isQuestionCompleted = false;
  isQuizOpen = true;
  quizOverlay.classList.remove("hidden");
  quizFeedback.textContent = "";
  const totalQuestions = signStops.length || questions.length;
  const questionNumber = Math.min(index + 1, totalQuestions);
  if (quizHeading) {
    quizHeading.textContent = `Fraga ${questionNumber} / ${totalQuestions}`;
  }
  quizQuestion.textContent = item.question;
  quizAnswers.innerHTML = "";

  item.answers.forEach((answer, answerIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = answer;
    button.addEventListener("click", () => {
      if (isQuestionCompleted || button.disabled) {
        return;
      }

      if (answerIndex === item.correct) {
        isQuestionCompleted = true;

        // Lock all answers after correct click so question index cannot skip on double-tap.
        quizAnswers.querySelectorAll("button").forEach((btn) => {
          btn.disabled = true;
        });

        quizFeedback.textContent = "Rätt svar! Du kan springa vidare.";
        nextSignIndex += 1;
        updateSigns();
        if (nextSignIndex >= signStops.length) {
          unlockFinale();
        }
        setTimeout(closeQuiz, 1000);
      } else {
        // Prevent repeatedly selecting the same wrong answer, but allow other guesses.
        button.disabled = true;
        quizFeedback.textContent = "Fel svar. Försök igen för att komma vidare.";
      }
    });
    quizAnswers.appendChild(button);
  });
}

function maybeTriggerQuestion() {
  if (!QUESTIONS_ENABLED) {
    return;
  }

  if (isQuizOpen || nextSignIndex >= signStops.length) {
    return;
  }

  const currentStop = signStops[nextSignIndex];
  if (worldDistance >= currentStop) {
    worldDistance = currentStop;
    backgroundOffset = -worldDistance;
    updateBackground();
    updateSigns();
    openQuiz(nextSignIndex);
  }
}

function updateFrame() {
  if (!sheetLoaded || !spriteCtx) return;

  const renderWidth = Math.max(1, Math.round(sprite.clientWidth));
  const renderHeight = Math.max(1, Math.round(sprite.clientHeight));

  if (sprite.width !== renderWidth || sprite.height !== renderHeight) {
    sprite.width = renderWidth;
    sprite.height = renderHeight;
  }

  const frameStart = Math.round((frameIndex * sheetWidth) / FRAME_COUNT);
  const frameEnd = Math.round(((frameIndex + 1) * sheetWidth) / FRAME_COUNT);
  const frameCrop = frameCropBounds[frameIndex];
  const sx = frameCrop ? frameCrop.sx : frameStart + 3;
  const sy = 0;
  const sw = frameCrop
    ? frameCrop.sw
    : Math.max(1, frameEnd - frameStart - 6);
  const sh = frameSourceHeight;

  spriteCtx.clearRect(0, 0, sprite.width, sprite.height);
  spriteCtx.imageSmoothingEnabled = false;

  spriteCtx.drawImage(
    spriteSheet,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    sprite.width,
    sprite.height
  );
}

function calculateFrameCropBounds() {
  const offscreen = document.createElement("canvas");
  offscreen.width = sheetWidth;
  offscreen.height = frameSourceHeight;
  const ctx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    frameCropBounds = [];
    return;
  }

  ctx.drawImage(spriteSheet, 0, 0);
  const imageData = ctx.getImageData(0, 0, sheetWidth, frameSourceHeight).data;
  frameCropBounds = [];

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const frameStart = Math.round((frame * sheetWidth) / FRAME_COUNT);
    const frameEnd = Math.round(((frame + 1) * sheetWidth) / FRAME_COUNT);
    let minX = frameEnd;
    let maxX = frameStart - 1;

    for (let x = frameStart; x < frameEnd; x += 1) {
      for (let y = 0; y < frameSourceHeight; y += 1) {
        const alphaIndex = (y * sheetWidth + x) * 4 + 3;
        if (imageData[alphaIndex] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    if (maxX < minX) {
      frameCropBounds.push({ sx: frameStart + 3, sw: Math.max(1, frameEnd - frameStart - 6) });
      continue;
    }

    const safeMinX = Math.max(frameStart, minX - 1);
    const safeMaxX = Math.min(frameEnd - 1, maxX + 1);
    frameCropBounds.push({ sx: safeMinX, sw: Math.max(1, safeMaxX - safeMinX + 1) });
  }
}

function updateNicolinaFrame() {
  if (!nicolinaSheetLoaded || !nicolinaCtx) {
    return;
  }

  const renderWidth = Math.max(1, Math.round(nicolina.clientWidth));
  const renderHeight = Math.max(1, Math.round(nicolina.clientHeight));

  if (nicolina.width !== renderWidth || nicolina.height !== renderHeight) {
    nicolina.width = renderWidth;
    nicolina.height = renderHeight;
  }

  const frameStart = Math.round((nicolinaFrameIndex * nicolinaSheetWidth) / NICOLINA_FRAME_COUNT);
  const frameEnd = Math.round(((nicolinaFrameIndex + 1) * nicolinaSheetWidth) / NICOLINA_FRAME_COUNT);
  const sx = frameStart + NICOLINA_FRAME_INSET_X;
  const sy = 0;
  const sw = Math.max(1, frameEnd - frameStart - NICOLINA_FRAME_INSET_X * 2);
  const sh = nicolinaFrameSourceHeight;

  nicolinaCtx.clearRect(0, 0, nicolina.width, nicolina.height);
  nicolinaCtx.imageSmoothingEnabled = false;

  nicolinaCtx.drawImage(
    nicolinaSheet,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    nicolina.width,
    nicolina.height
  );
}

function nextFrame() {
  frameIndex = (frameIndex + 1) % FRAME_COUNT;
  updateFrame();
}

function runStep() {
  nextFrame();
  const runStepSize = track.clientWidth * 0.03;
  worldDistance += runStepSize;
  if (isFinaleUnlocked && !hasReachedNicolina && worldDistance >= nicolinaWorldStop) {
    worldDistance = nicolinaWorldStop;
    hasReachedNicolina = true;
    isPointerHeld = false;
    stopRunning();
    startNicolinaRun();
    openMiniFinale();
  }
  backgroundOffset = -worldDistance;
  updateBackground();
  updateSigns();
  updateNicolinaPosition();
  maybeTriggerQuestion();
}

function stopRunning() {
  if (!runTimer) {
    return;
  }
  clearInterval(runTimer);
  runTimer = null;
}

function startRunning() {
  if (runTimer || !sheetLoaded || isQuizOpen || hasReachedNicolina) {
    return;
  }

  runStep();
  runTimer = setInterval(() => {
    if (!isPointerHeld || isQuizOpen) {
      stopRunning();
      return;
    }
    runStep();
  }, 90);
}

const spriteSheet = new Image();
spriteSheet.src = "assets/daniel.png";
spriteSheet.addEventListener("load", () => {
  sheetWidth = spriteSheet.naturalWidth;
  frameSourceWidth = sheetWidth / FRAME_COUNT;
  frameSourceHeight = spriteSheet.naturalHeight;
  calculateFrameCropBounds();
  sprite.style.aspectRatio = `${frameSourceWidth} / ${frameSourceHeight}`;
  sheetLoaded = true;
  updateFrame();
});

const nicolinaSheet = new Image();
nicolinaSheet.src = "assets/nicolina.png";
nicolinaSheet.addEventListener("load", () => {
  nicolinaSheetWidth = nicolinaSheet.naturalWidth;
  nicolinaFrameSourceWidth = nicolinaSheetWidth / NICOLINA_FRAME_COUNT;
  nicolinaFrameSourceHeight = nicolinaSheet.naturalHeight;
  nicolina.style.aspectRatio = `${nicolinaFrameSourceWidth} / ${nicolinaFrameSourceHeight}`;
  nicolinaSheetLoaded = true;
  updateNicolinaFrame();
});

fetch("data/questions.json")
  .then((response) => response.json())
  .then((data) => {
    if (!QUESTIONS_ENABLED) {
      questions = [];
      signStops = [];
      unlockFinale();
      return;
    }

    questions = Array.isArray(data) ? data : [];
    signStops = questions.map((_, index) => (index + 1) * SIGN_SPACING);
    buildSigns();
  })
  .catch(() => {
    questions = [];
    signStops = [];
    if (!QUESTIONS_ENABLED) {
      unlockFinale();
    }
  });

updateFrame();

function onPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  if (isIntroActive) {
    return;
  }
  isPointerHeld = true;
  startRunning();
}

function onPointerUp() {
  isPointerHeld = false;
  stopRunning();
}

game.addEventListener("pointerdown", onPointerDown);
game.addEventListener("pointerup", onPointerUp);
game.addEventListener("pointercancel", onPointerUp);
game.addEventListener("pointerleave", onPointerUp);
window.addEventListener("blur", onPointerUp);
introContinue.addEventListener("click", goToIntroStepTwo);
introStartJourney.addEventListener("click", startJourneyFromIntro);
miniFinaleContinue.addEventListener("click", proceedMiniFinale);
miniFinaleDetailsContinue.addEventListener("click", showTogetherScene);

window.addEventListener("resize", () => {
  updateFrame();
  updateNicolinaFrame();
  updateSigns();
  updateNicolinaPosition();
});
updateBackground();
updateFrame();
updateNicolinaFrame();
