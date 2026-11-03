/* ГЕНАСТРОФА — Интерфейс, выбор сценариев, комикс-брифинги, 3D-промпты и чек */
(function () {
  const GN = window.GN = window.GN || {};

  class UIManager {
    constructor(game) {
      this.game = game;

      // Элементы интерфейса
      this.heroOverlay = document.getElementById('hero-overlay');
      this.briefingModal = document.getElementById('briefing-modal');
      this.hud = document.getElementById('hud');
      this.receiptModal = document.getElementById('receipt-modal');
      this.shieldAlert = document.getElementById('shield-alert');
      this.proximityPrompt = document.getElementById('proximity-prompt');
      this.drillProgressWrap = document.getElementById('drill-progress-wrap');
      this.drillProgressBar = document.getElementById('drill-progress-bar');

      this.radarCanvas = document.getElementById('radar-canvas');
      this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

      // Счетчики HUD
      this.damageVal = document.getElementById('damage-val');
      this.multiplierVal = document.getElementById('multiplier-val');
      this.timerVal = document.getElementById('timer-val');
      this.waterVal = document.getElementById('water-val');
      this.situationText = document.getElementById('situation-text');

      // Квесты / Сценарии
      this.scenarioTitle = document.getElementById('scenario-title');
      this.scenarioBadge = document.getElementById('scenario-badge');
      this.scenarioSteps = document.getElementById('scenario-steps');
      this.scenarioTarget = document.getElementById('scenario-target');

      // Кулдауны
      this.cdWrench = document.getElementById('cd-wrench');
      this.cdWeight = document.getElementById('cd-weight');
      this.cdMusic = document.getElementById('cd-music');

      this.displayedDamage = 0;
      this.targetDamage = 0;
      this.selectedClass = 'drill';

      this._initMenuScreen();
      this._initBriefing();
      this._initFinalModal();
      this._initCalculator();
      this._initMinimap();
    }

    _initMenuScreen() {
      // Выбор сценариев
      const scenarioCards = document.querySelectorAll('.scenario-select-card');
      scenarioCards.forEach(card => {
        card.addEventListener('click', () => {
          scenarioCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          const id = parseInt(card.getAttribute('data-scenario-id') || '1', 10);
          this.game.selectScenario(id);
        });
      });

      // Выбор классов
      const classCards = document.querySelectorAll('.class-card');
      classCards.forEach(card => {
        card.addEventListener('click', () => {
          classCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedClass = card.getAttribute('data-class');
        });
      });

      // Кнопка перехода к брифингу
      const btnStart = document.getElementById('btn-start-game');
      if (btnStart) {
        btnStart.addEventListener('click', () => {
          this.showBriefing();
        });
      }

      // Звук
      const btnMute = document.getElementById('btn-mute');
      if (btnMute) {
        btnMute.addEventListener('click', () => {
          const isMuted = GN.sound.toggleMute();
          btnMute.textContent = isMuted ? '🔇' : '♪';
          btnMute.title = isMuted ? 'Включить звук' : 'Выключить звук';
        });
      }

      // Досрочный финиш
      const btnEarlyFinish = document.getElementById('btn-early-finish');
      if (btnEarlyFinish) {
        btnEarlyFinish.addEventListener('click', () => {
          this.game.finishGame(false);
        });
      }
    }

    showBriefing() {
      const sc = this.game.scenarios.find(s => s.id === this.game.selectedScenarioId) || this.game.scenarios[0];
      if (this.briefingModal) {
        const titleEl = document.getElementById('briefing-title');
        const badgeEl = document.getElementById('briefing-badge');
        const textEl = document.getElementById('briefing-text');
        const goalsEl = document.getElementById('briefing-goals');

        if (titleEl) titleEl.textContent = sc.name;
        if (badgeEl) badgeEl.textContent = sc.badge;
        if (textEl) {
          textEl.innerHTML = sc.briefing.map(p => `<p>${p}</p>`).join('');
        }
        if (goalsEl) {
          goalsEl.innerHTML = sc.steps.map(s => `<li><span class="goal-bullet">●</span> ${s.desc}</li>`).join('');
        }

        this.heroOverlay.classList.add('hidden');
        this.briefingModal.classList.remove('hidden');
      } else {
        this.launchGame();
      }
    }

    _initBriefing() {
      const btnLaunch = document.getElementById('btn-launch-scenario');
      if (btnLaunch) {
        btnLaunch.addEventListener('click', () => {
          this.launchGame();
        });
      }
    }

    launchGame() {
      if (this.briefingModal) this.briefingModal.classList.add('hidden');
      if (this.heroOverlay) this.heroOverlay.classList.add('hidden');
      if (this.hud) this.hud.classList.remove('hidden');

      this.game.start(this.selectedClass);
    }

    onGameStart(scenario) {
      this.displayedDamage = 0;
      this.targetDamage = 0;
      if (this.damageVal) this.damageVal.textContent = '0 ₽';
      this.updateScenarioUI(scenario);
    }

    updateScenarioUI(sc) {
      if (!this.scenarioTitle || !this.scenarioSteps) return;

      this.scenarioTitle.textContent = sc.name;
      if (this.scenarioBadge) this.scenarioBadge.textContent = sc.badge;
      if (this.scenarioTarget) this.scenarioTarget.textContent = `Цель: от ${sc.targetDamage.toLocaleString('ru-RU')} ₽`;

      this.scenarioSteps.innerHTML = '';
      sc.steps.forEach(step => {
        const li = document.createElement('li');
        li.className = `quest-step-item ${step.done ? 'done' : ''}`;
        li.innerHTML = `
          <span class="step-check">${step.done ? '✓' : '○'}</span>
          <span class="step-text">${step.desc}</span>
        `;
        this.scenarioSteps.appendChild(li);
      });
    }

    updateDamage(targetTotal, addedAmount, multiplier, reason) {
      this.targetDamage = targetTotal;
      if (this.multiplierVal) {
        this.multiplierVal.textContent = `x${multiplier.toFixed(1)}`;
        this.multiplierVal.parentElement.classList.add('pulse');
        setTimeout(() => this.multiplierVal.parentElement.classList.remove('pulse'), 300);
      }

      if (this.situationText && reason) {
        this.situationText.textContent = `+${addedAmount.toLocaleString('ru-RU')} ₽: ${reason}`;
      }
    }

    updateHUD(timeLeft, waterLevel, cds, maxCds) {
      // Анимация наката ущерба
      if (this.displayedDamage < this.targetDamage) {
        this.displayedDamage += Math.ceil((this.targetDamage - this.displayedDamage) * 0.22);
        if (this.damageVal) {
          this.damageVal.textContent = `${this.displayedDamage.toLocaleString('ru-RU')} ₽`;
        }
      }

      // Таймер
      if (this.timerVal) {
        const m = Math.floor(timeLeft / 60);
        const s = Math.floor(timeLeft % 60);
        this.timerVal.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (timeLeft <= 10) {
          this.timerVal.classList.add('timer-danger');
        } else {
          this.timerVal.classList.remove('timer-danger');
        }
      }

      // Вода
      if (this.waterVal) {
        const cm = Math.round((waterLevel / 100) * 45);
        this.waterVal.textContent = `Вода: ${cm} см (${Math.round(waterLevel)}%)`;
      }

      // Кулдауны
      if (this.cdWrench && maxCds.wrench) {
        const pct = (cds.wrench / maxCds.wrench) * 100;
        this.cdWrench.style.height = `${pct}%`;
      }
      if (this.cdWeight && maxCds.weight) {
        const pct = (cds.weight / maxCds.weight) * 100;
        this.cdWeight.style.height = `${pct}%`;
      }
      if (this.cdMusic && maxCds.music) {
        const pct = (cds.music / maxCds.music) * 100;
        this.cdMusic.style.height = `${pct}%`;
      }

      this._drawRadar();
    }

    show3DPrompt(screenX, screenY, key, text) {
      if (!this.proximityPrompt) return;
      this.proximityPrompt.style.left = `${screenX}px`;
      this.proximityPrompt.style.top = `${screenY - 45}px`;
      this.proximityPrompt.innerHTML = `
        <span class="prompt-key">${key}</span>
        <span class="prompt-text">${text}</span>
      `;
      this.proximityPrompt.classList.remove('hidden');
    }

    hide3DPrompt() {
      if (this.proximityPrompt) {
        this.proximityPrompt.classList.add('hidden');
      }
    }

    showDrillProgress(pct) {
      if (this.drillProgressWrap && this.drillProgressBar) {
        this.drillProgressWrap.classList.remove('hidden');
        this.drillProgressBar.style.width = `${Math.min(100, Math.round(pct * 100))}%`;
      }
    }

    hideDrillProgress() {
      if (this.drillProgressWrap) {
        this.drillProgressWrap.classList.add('hidden');
      }
    }

    showSensorAlert(roomName) {
      if (!this.situationText) return;
      this.situationText.innerHTML = `<span style="color:#EF3124;font-weight:800;">ВНИМАНИЕ!</span> Датчик АльфаСтрахование (${roomName}) включил сирену! 5 сек!`;
    }

    showShieldNotification() {
      if (this.shieldAlert) {
        this.shieldAlert.classList.remove('hidden');
        this.shieldAlert.classList.add('show');
        setTimeout(() => {
          this.shieldAlert.classList.remove('show');
          this.shieldAlert.classList.add('hidden');
        }, 3200);
      }
    }

    // ---------------- 2D РАДАР / МИНИ-КАРТА ----------------
    _initMinimap() {
      if (!this.radarCanvas) return;
      this.radarCanvas.width = 190;
      this.radarCanvas.height = 140;
    }

    _drawRadar() {
      if (!this.radarCtx) return;
      const ctx = this.radarCtx;
      const w = 190, h = 140;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(23, 25, 28, 0.88)';
      GN.Tex.roundRect(ctx, 0, 0, w, h, 8);
      ctx.fill();

      const toRadarX = (wx) => ((wx + 8.5) / 17) * (w - 20) + 10;
      const toRadarY = (wz) => ((wz + 6.0) / 12) * (h - 20) + 10;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(toRadarX(-8.5), toRadarY(-6), (9 / 17) * (w - 20), (12 / 12) * (h - 20));
      ctx.strokeRect(toRadarX(0.5), toRadarY(-6), (8 / 17) * (w - 20), (6.5 / 12) * (h - 20));
      ctx.strokeRect(toRadarX(0.5), toRadarY(0.5), (8 / 17) * (w - 20), (5.5 / 12) * (h - 20));

      ctx.font = '700 8px Manrope, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('ЗАЛ', toRadarX(-6.5), toRadarY(-4.5));
      ctx.fillText('КУХНЯ', toRadarX(3.5), toRadarY(-4.5));
      ctx.fillText('ВАННА', toRadarX(3.5), toRadarY(2.0));

      // Мебель
      this.game.objects.forEach(obj => {
        const rx = toRadarX(obj.pos[0]);
        const ry = toRadarY(obj.pos[2]);
        ctx.fillStyle = obj.broken ? '#555555' : (obj.tag.includes('water') ? '#00bfff' : '#ffd23f');
        ctx.beginPath();
        ctx.arc(rx, ry, obj.broken ? 2 : 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Датчики
      this.game.sensors.forEach(s => {
        const sx = toRadarX(s.worldPos.x);
        const sy = toRadarY(s.worldPos.z);
        ctx.fillStyle = s.active ? '#ff1a1a' : '#EF3124';
        ctx.beginPath();
        ctx.arc(sx, sy, s.active ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Робот
      if (this.game.robot && this.game.robot.alive) {
        const rbx = toRadarX(this.game.robot.pos.x);
        const rby = toRadarY(this.game.robot.pos.z);
        ctx.fillStyle = this.game.robot.state === 'CHASE' ? '#ff0033' : '#45e07a';
        ctx.beginPath();
        ctx.arc(rbx, rby, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Игрок
      if (this.game.player) {
        const px = toRadarX(this.game.player.position.x);
        const py = toRadarY(this.game.player.position.z);
        const ang = this.game.player.facingAngle;

        ctx.fillStyle = 'rgba(239, 49, 36, 0.35)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, 14, ang - 0.45 - Math.PI / 2, ang + 0.45 - Math.PI / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#EF3124';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // ---------------- КАССОВЫЙ ЧЕК КАТАСТРОФЫ ----------------
    _initFinalModal() {
      const toggle = document.getElementById('alfa-policy-toggle');
      const totalAmountDisplay = document.getElementById('receipt-total-amount');
      const promoBlock = document.getElementById('promo-block');
      const policyBanner = document.getElementById('policy-banner');

      if (toggle) {
        toggle.addEventListener('change', () => {
          const stamp = document.getElementById('stamp-alfa-paid');
          if (toggle.checked) {
            totalAmountDisplay.innerHTML = `
              <span class="strikethrough">${this.game.damage.toLocaleString('ru-RU')} ₽</span>
              <span class="zero-rub">0 ₽ из вашего кармана</span>
            `;
            if (promoBlock) promoBlock.classList.remove('hidden');
            if (policyBanner) policyBanner.classList.remove('hidden');
            if (stamp) {
              stamp.classList.remove('hidden');
              stamp.classList.add('stamp-slam');
            }
            GN.sound.playCashChime();
          } else {
            totalAmountDisplay.textContent = `${this.game.damage.toLocaleString('ru-RU')} ₽`;
            if (promoBlock) promoBlock.classList.add('hidden');
            if (policyBanner) policyBanner.classList.add('hidden');
            if (stamp) {
              stamp.classList.add('hidden');
              stamp.classList.remove('stamp-slam');
            }
          }
        });
      }

      const btnCopy = document.getElementById('btn-copy-promo');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText('GENA15').then(() => {
            btnCopy.textContent = 'СКОПИРОВАНО!';
            setTimeout(() => btnCopy.textContent = 'СКОПИРОВАТЬ', 2000);
          }).catch(() => {
            btnCopy.textContent = 'GENA15';
          });
        });
      }

      const btnRestart = document.getElementById('btn-restart');
      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          location.reload();
        });
      }
    }

    showFinalReceipt(data) {
      if (this.hud) this.hud.classList.add('hidden');
      if (this.receiptModal) this.receiptModal.classList.remove('hidden');

      const rankEl = document.getElementById('receipt-rank');
      if (rankEl) {
        if (data.totalDamage >= 1200000) rankEl.textContent = 'Магистр стихийных бедствий (Геннадий PRO)';
        else if (data.totalDamage >= 600000) rankEl.textContent = 'Заслуженный шабашник района';
        else rankEl.textContent = 'Начинающий возмутитель спокойствия';
      }

      const listEl = document.getElementById('receipt-items-list');
      if (listEl) {
        listEl.innerHTML = '';
        data.objects.forEach(obj => {
          const row = document.createElement('div');
          row.className = 'receipt-row';
          row.innerHTML = `
            <span>${obj.name} (${obj.room})</span>
            <span>${obj.cost.toLocaleString('ru-RU')} ₽</span>
          `;
          listEl.appendChild(row);
        });

        if (data.waterLevel > 15) {
          const row = document.createElement('div');
          row.className = 'receipt-row';
          row.innerHTML = `
            <span>Затопление паркета и потолка соседей (${data.waterLevel} см)</span>
            <span>350 000 ₽</span>
          `;
          listEl.appendChild(row);
        }
      }

      const totalEl = document.getElementById('receipt-total-amount');
      if (totalEl) {
        totalEl.textContent = `${data.totalDamage.toLocaleString('ru-RU')} ₽`;
      }
    }

    // ---------------- ПРЕ-КАЛЬКУЛЯТОР НА ЛЕНДИНГЕ ----------------
    _initCalculator() {
      const sRepair = document.getElementById('calc-slider-repair');
      const sStuff = document.getElementById('calc-slider-stuff');
      const sLiab = document.getElementById('calc-slider-liability');

      const vRepair = document.getElementById('calc-val-repair');
      const vStuff = document.getElementById('calc-val-stuff');
      const vLiab = document.getElementById('calc-val-liability');
      const pMonthly = document.getElementById('calc-price-monthly');

      if (!sRepair || !sStuff || !sLiab) return;

      const updateCalc = () => {
        const r = parseInt(sRepair.value, 10);
        const s = parseInt(sStuff.value, 10);
        const l = parseInt(sLiab.value, 10);

        if (vRepair) vRepair.textContent = (r / 1000) + ' тыс. ₽';
        if (vStuff) vStuff.textContent = (s / 1000) + ' тыс. ₽';
        if (vLiab) vLiab.textContent = (l / 1000) + ' тыс. ₽';

        const monthly = Math.round(320 + (r / 100000) * 22 + (s / 100000) * 18 + (l / 100000) * 26);
        if (pMonthly) pMonthly.textContent = `${monthly.toLocaleString('ru-RU')} ₽ / мес`;
      };

      sRepair.addEventListener('input', updateCalc);
      sStuff.addEventListener('input', updateCalc);
      sLiab.addEventListener('input', updateCalc);
      updateCalc();
    }
  }

  window.GN = window.GN || {};
  window.GN.UIManager = UIManager;
})();
