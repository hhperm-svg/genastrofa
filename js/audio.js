/* ГЕНАСТРОФА — процедурный аудио-движок SoundFX на чистом Web Audio API */
(function () {
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.bgmGain = null;
      this.muted = false;
      this.bgmPlaying = false;
      this.bgmTimer = null;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }

    resume() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
      }
      return this.muted;
    }

    // 1. Перфоратор «Макита-Ультра»: Sawtooth + FM модуляция + фильтрованный шум
    playDrill(duration = 0.35) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      // Несущая пилообразная волна
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.linearRampToValueAtTime(125, t + duration);

      // Модулятор ударов бойка (28 Гц)
      const mod = this.ctx.createOscillator();
      mod.type = 'square';
      mod.frequency.setValueAtTime(28, t);

      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(75, t);
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      // Металлический шум удара бура о бетон
      const noise = this._createNoiseBuffer(duration);
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.setValueAtTime(3.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      noiseSrc.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      mod.start(t);
      osc.start(t);
      noiseSrc.start(t);

      mod.stop(t + duration);
      osc.stop(t + duration);
      noiseSrc.stop(t + duration);
    }

    // 2. Звон бьющегося стекла и фарфора (высокочастотные гармоники + резкий спад)
    playGlassSmash() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const freqs = [1820, 2640, 3950, 5200, 7100];

      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 150, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.45, t + 0.45);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18 / (idx + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45 + idx * 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.55);
      });

      // Хруст осколков
      const noise = this._createNoiseBuffer(0.25);
      const nSrc = this.ctx.createBufferSource();
      nSrc.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4500, t);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.3, t);
      nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      nSrc.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);

      nSrc.start(t);
      nSrc.stop(t + 0.25);
    }

    // 3. Гул падающей 24-кг гири (глубокий суб-басовый удар + вибрация пола)
    playKettlebellThud() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      // Саб-басовый питч-дроп
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.6);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      // Гулкий резонанс металлического ядра
      const ring = this.ctx.createOscillator();
      ring.type = 'triangle';
      ring.frequency.setValueAtTime(220, t);
      ring.frequency.exponentialRampToValueAtTime(90, t + 0.4);

      const ringGain = this.ctx.createGain();
      ringGain.gain.setValueAtTime(0.25, t);
      ringGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      ring.connect(ringGain);
      ringGain.connect(this.sfxGain);

      osc.start(t);
      ring.start(t);
      osc.stop(t + 0.8);
      ring.stop(t + 0.4);
    }

    // 4. Шипение прорванной трубы и гейзера воды
    playWaterSpurt(duration = 0.5) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      const noise = this._createNoiseBuffer(duration);
      const src = this.ctx.createBufferSource();
      src.buffer = noise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(1200, t + duration * 0.5);
      filter.Q.setValueAtTime(2.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      src.start(t);
      src.stop(t + duration);
    }

    // 5. Треск короткого замыкания (электроразряд, КЗ в воде)
    playSpark() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, t); // Сетевой фон 50 Гц
      osc.frequency.linearRampToValueAtTime(220, t + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      // Быстрые высокочастотные щелчки
      const burst = this._createNoiseBuffer(0.18);
      const bSrc = this.ctx.createBufferSource();
      bSrc.buffer = burst;

      const bFilter = this.ctx.createBiquadFilter();
      bFilter.type = 'highpass';
      bFilter.frequency.setValueAtTime(3200, t);

      const bGain = this.ctx.createGain();
      bGain.gain.setValueAtTime(0.45, t);
      bGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      bSrc.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.sfxGain);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      bSrc.start(t);
      osc.stop(t + 0.25);
      bSrc.stop(t + 0.18);
    }

    // 6. Сирена умного датчика «АльфаСтрахование»
    playSensorBeep(isAlert = false) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAlert ? 1760 : 880, t); // A6 or A5
      if (isAlert) {
        osc.frequency.setValueAtTime(1760, t);
        osc.frequency.setValueAtTime(2200, t + 0.08);
      }

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + (isAlert ? 0.2 : 0.1));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + (isAlert ? 0.22 : 0.12));
    }

    // 7. Звук активации Купола Альфа-Защиты (технологичный гул защиты)
    playShieldDome() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(840, t + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.6);
    }

    // 8. Кассовый аппарат и звон монет «Альфа-Рубли»
    playCashChime() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      // Звон 1 (C7)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2093, t);

      const gain1 = this.ctx.createGain();
      gain1.gain.setValueAtTime(0.3, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc1.connect(gain1);
      gain1.connect(this.sfxGain);

      // Звон 2 (E7) со смещением
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2637, t + 0.08);

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.35, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);

      osc1.start(t);
      osc2.start(t + 0.08);
      osc1.stop(t + 0.45);
      osc2.stop(t + 0.6);
    }

    // 9. Звуковая волна шансона / звон по батарее («R»)
    playRadiatorRing() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      const freqs = [330, 440, 660, 990];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.98, t + 0.7);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25 / (i + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.7);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.75);
      });
    }

    // 10. Шаги Геннадия (легкий резиновый щелчок тапка)
    playFootstep() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90 + Math.random() * 30, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.08);
    }

    // 11. Удар ключом / срыв резьбы («E»)
    playWrenchClank() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.16);
    }

    // 12. Фоновая процедурная ироничная музыка в стиле инди-симулятора
    startBGM() {
      if (this.bgmPlaying || !this.ctx) return;
      this.bgmPlaying = true;

      // Простой задорный ритмичный паттерн баса и аккордов
      const bassNotes = [110, 110, 146.8, 164.8, 110, 130.8, 146.8, 164.8]; // A2 - D3 - E3...
      const chordNotes = [
        [220, 261.6, 329.6], // Am
        [220, 261.6, 329.6],
        [293.6, 349.2, 440], // Dm
        [329.6, 392.0, 493.8], // Em
        [220, 261.6, 329.6],
        [261.6, 329.6, 392], // C
        [293.6, 349.2, 440], // Dm
        [329.6, 415.3, 493.8]  // E7
      ];

      let step = 0;
      const tempo = 220; // мс на шаг

      const tick = () => {
        if (!this.bgmPlaying || this.muted) {
          if (this.bgmPlaying) this.bgmTimer = setTimeout(tick, tempo);
          return;
        }

        const t = this.ctx.currentTime;

        // Басовая нота
        const bassOsc = this.ctx.createOscillator();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassNotes[step % bassNotes.length], t);

        const bassGain = this.ctx.createGain();
        bassGain.gain.setValueAtTime(0.18, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(t);
        bassOsc.stop(t + 0.2);

        // Аккорд на каждый 2-й шаг (ритм польки/боссановы)
        if (step % 2 === 1) {
          const chord = chordNotes[(step >> 1) % chordNotes.length];
          chord.forEach(f => {
            const cOsc = this.ctx.createOscillator();
            cOsc.type = 'sine';
            cOsc.frequency.setValueAtTime(f, t);

            const cGain = this.ctx.createGain();
            cGain.gain.setValueAtTime(0.06, t);
            cGain.gain.exponentialRampToValueAtTime(0.005, t + 0.15);

            cOsc.connect(cGain);
            cGain.connect(this.bgmGain);

            cOsc.start(t);
            cOsc.stop(t + 0.16);
          });
        }

        step++;
        this.bgmTimer = setTimeout(tick, tempo);
      };

      tick();
    }

    stopBGM() {
      this.bgmPlaying = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }

    _createNoiseBuffer(seconds) {
      const size = this.ctx.sampleRate * seconds;
      const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }
  }

  window.GN = window.GN || {};
  window.GN.SoundFX = SoundFX;
  window.GN.sound = new SoundFX();
})();
