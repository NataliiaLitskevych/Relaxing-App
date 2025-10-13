(function () {
  /*** ELEMENTS ***/
  const display   = document.getElementById('timer-display');
  const startBtn  = document.getElementById('start-btn');
  const pauseBtn  = document.getElementById('pause-btn');
  const resetBtn  = document.getElementById('reset-btn');
  const optionBtns= document.querySelectorAll('.time-option');
  const audioEl   = document.getElementById('player');
  const ring      = document.querySelector('.timer-progress');

  if (!display || !ring) {
    console.warn('Timer elements not found. Check HTML structure.');
    return;
  }

  /*** RING GEOMETRY ***/
  // r беремо з атрибута <circle r="...">
  const r = parseFloat(ring.getAttribute('r'));
  const CIRC = 2 * Math.PI * r;
  ring.style.strokeDasharray = CIRC;
  ring.style.strokeDashoffset = 0;

  /*** STATE ***/
  const DEFAULT_SECONDS = 30 * 60; // 30 хв
  let totalTime = DEFAULT_SECONDS;
  let remain    = totalTime;
  let running   = false;
  let paused    = false;
  let rafId     = null;
  let lastTs    = null;

  /*** BUTTON GLOW ANIMATION ***/
  function glowOnClick(btn){
    if (!btn) return;
    btn.classList.remove('is-clicked');     // перезапуск анімації
    void btn.offsetWidth;                   // reflow
    btn.classList.add('is-clicked');
    btn.addEventListener('animationend', () => {
      btn.classList.remove('is-clicked');
    }, { once: true });
  }

  /*** DISPLAY HELPERS ***/
  function formatTime(secFloat){
    const sec = Math.ceil(secFloat); // округл. вгору щоб не мигало -00:01
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function updateDisplay(){
    display.textContent = formatTime(remain);
  }

  function updateRing(){
    // progress: 1 → повний круг; 0 → порожньо
    const progress = remain / totalTime;
    ring.style.strokeDashoffset = CIRC * (1 - progress);
  }

  /*** TIMER CONTROL ***/
  function startTimer(){
    if (running) return;
    running = true;
    paused  = false;
    lastTs  = null;

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    pauseBtn.textContent = '⏸';

    fadeInAudio();
    rafId = requestAnimationFrame(step);
  }

  function pauseTimer(){
    if (!running) return;
    if (!paused) {
      paused = true;
      pauseBtn.textContent = '▶';
      try { audioEl.pause(); } catch {}
    } else {
      paused = false;
      pauseBtn.textContent = '⏸';
      try { audioEl.play(); } catch {}
      lastTs = null;
      rafId = requestAnimationFrame(step);
    }
  }

  function resetTimer(){
    running = false;
    paused  = false;
    cancelAnimationFrame(rafId);
    remain = totalTime;
    updateDisplay();
    updateRing();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    pauseBtn.textContent = '⏸';
    fadeOutAudio(true);
  }

  function completeTimer(){
    running = false;
    paused  = false;
    cancelAnimationFrame(rafId);
    remain = 0;
    updateDisplay();
    updateRing();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    fadeOutAudio(true);
    // alert('Session complete!'); // опційно
  }

  /*** RAF LOOP ***/
  function step(ts){
    if (!running) return;
    if (paused){
      rafId = requestAnimationFrame(step);
      return;
    }
    if (lastTs == null){
      lastTs = ts;
      rafId = requestAnimationFrame(step);
      return;
    }
    const delta = (ts - lastTs) / 1000;
    lastTs = ts;
    remain -= delta;
    if (remain <= 0){
      completeTimer();
      return;
    }
    updateDisplay();
    updateRing();
    rafId = requestAnimationFrame(step);
  }

  /*** AUDIO FADE HELPERS ***/
  function fadeInAudio(){
    if (!audioEl) return;
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch {}
    audioEl.volume = 0;
    audioEl.play().then(()=>{
      const dur = 1000;
      const start = performance.now();
      function anim(vt){
        const t = vt - start;
        const p = Math.min(t / dur, 1);
        if (!paused) audioEl.volume = p;
        if (p < 1 && !paused) requestAnimationFrame(anim);
      }
      requestAnimationFrame(anim);
    }).catch(()=>{});
  }

  function fadeOutAudio(stopAtEnd=false){
    if (!audioEl) return;
    const startVol = audioEl.volume;
    const dur = 1500;
    const start = performance.now();
    function anim(vt){
      const t = vt - start;
      const p = Math.min(t / dur, 1);
      audioEl.volume = startVol * (1 - p);
      if (p < 1){
        requestAnimationFrame(anim);
      } else {
        audioEl.volume = 0;
        if (stopAtEnd){
          try {
            audioEl.pause();
            audioEl.currentTime = 0;
          } catch {}
        }
      }
    }
    requestAnimationFrame(anim);
  }

  /*** PRESET TIME BUTTONS ***/
  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (running) return;     // не дозволяємо зміну, поки таймер працює
      glowOnClick(btn);
      const secs = parseInt(btn.dataset.time, 10);
      if (!isNaN(secs)) {
        totalTime = secs;
        remain = secs;
        updateDisplay();
        updateRing();
      }
    });
  });

  /*** EVENT WIRES ***/
  startBtn.addEventListener('click', () => {
    glowOnClick(startBtn);
    startTimer();
  });

  pauseBtn.addEventListener('click', () => {
    glowOnClick(pauseBtn);
    pauseTimer();
  });

  resetBtn.addEventListener('click', () => {
    glowOnClick(resetBtn);
    resetTimer();
  });

  /*** INIT ***/
  updateDisplay();
  updateRing();
})();
