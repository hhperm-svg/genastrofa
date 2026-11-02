/* ГЕНАСТРОФА — HUD, Canvas 2D радар-миникарта, чеки катастрофы и калькулятор */
(function () {
  class UIManager {
    constructor(game) {
      this.game = game;

      // Элементы интерфейса
      this.heroOverlay = document.getElementById('hero-overlay');
      this.hud = document.getElementById('hud');
      this.receiptModal = document.getElementById('receipt-modal');
      this.shieldAlert = document.getElementById('shield-alert');
      this.radarCanvas = document.getElementById('radar-canvas');
      this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

      // Счетчики HUD
      this.damageVal = document.getElementById('damage-val');
      this.multiplierVal = document.getElementById('multiplier-val');
      this.timerVal = document.getElementById('timer-val');
      this.waterVal = document.getElementById('water-val');
      this.situationText = document.getElementById('situation-text');

      // Квесты
      this.questTitle = document.getElementById('quest-title');
      this.questSteps = document.getElementById('quest-steps');
      this.questReward = document.getElementById('quest-reward');

      // Док кулдаунов
      this.cdWrench = document.getElementById('cd-wrench');
      this.cdWeight = document.getElementById('cd-weight');
      this.cdMusic = document.getElementById('cd-music');

      this.displayedDamage = 0;
      this.targetDamage = 0;

      this._initHeroScreen();
      this._initFinalModal();
      this._initCalculator();
      this._initMinimap();
    }

    _initHeroScreen() {
      const classCards = document.querySelectorAll('.class-card');
      let selectedClass = 'drill';

      classCards.forEach(card => {
        card.addEventListener('click', () => {
          classCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedClass = card.getAttribute('data-class');
        });
      });

      const startBtn = document.getElementById('btn-start-game');
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          this.heroOverlay.classList.add('hidden');
          this.hud.classList.remove('hidden');
          this.game.start(selectedClass);
        });
      }

      const btnMute = document.getElementById('btn-mute');
      if (btnMute) {
        btnMute.addEventListener('click', () => {
          const isMuted = GN.sound.toggleMute();
          btnMute.textContent = isMuted ? '🔇' : '♪';
          btnMute.title = isMuted ? 'Включить звук' : 'Выключить звук';
        });
      }

      const btnEarlyFinish = document.getElementById('btn-early-finish');
      if (btnEarlyFinish) {
        btnEarlyFinish.addEventListener('click', () => {
          this.game.finishGame();
        });
      }
    }

    onGameStart() {
      this.updateQuest(this.game.quests[0]);
    }

    updateDamage(targetTotal, addedAmount, multiplier, reason) {
      this.targetDamage = targetTotal;
      if (this.multiplierVal) {
        this.multiplierVal.textContent = `x${multiplier.toFixed(1)}`;
        this.multiplierVal.parentElement.classList.add('pulse');
        setTimeout(() => this.multiplierVal.parentElement.classList.remove('pulse'), 300);
      }

      // Текстовый комментарий разрушения
      if (this.situationText && reason) {
        this.situationText.textContent = `+${addedAmount.toLocaleString('ru-RU')} ₽: ${reason}`;
      }
    }

    updateHUD(timeLeft, waterLevel, cds, maxCds) {
      // Анимация наката цифр ущерба
      if (this.displayedDamage < this.targetDamage) {
        this.displayedDamage += Math.ceil((this.targetDamage - this.displayedDamage) * 0.2);
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
        }
      }

      // Уровень затопления
      if (this.waterVal) {
        const cm = Math.round((waterLevel / 100) * 45); // до 45 см
        this.waterVal.textContent = `${cm} см (${Math.round(waterLevel)}%)`;
      }

      // Кулдауны клавиш
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

    updateQuest(quest) {
      if (!this.questTitle || !this.questSteps) return;
      this.questTitle.textContent = quest.title;
      if (this.questReward) {
        this.questReward.textContent = `+${quest.reward.toLocaleString('ru-RU')} ₽`;
      }

      this.questSteps.innerHTML = '';
      quest.steps.forEach(step => {
        const li = document.createElement('li');
        li.className = `quest-step-item ${step.done ? 'done' : ''}`;
        li.innerHTML = `
          <span class="step-check">${step.done ? '✓' : '○'}</span>
          <span class="step-text">${step.desc}</span>
        `;
        this.questSteps.appendChild(li);
      });
    }

    showSensorAlert(roomName) {
      if (!this.situationText) return;
      this.situationText.innerHTML = `<span style="color:#EF3124;font-weight:800;">ВНИМАНИЕ!</span> Датчик АльфаСтрахование (${roomName}) включил тревогу! 5 сек!`;
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
      const w = 190;
      const h = 140;

      ctx.clearRect(0, 0, w, h);

      // Фон миникарты
      ctx.fillStyle = 'rgba(23, 25, 28, 0.85)';
      ctx.roundRect(0, 0, w, h, 8);
      ctx.fill();

      // Масштабирование: квартира 17м x 12м -> w x h
      const toRadarX = (wx) => ((wx + 8.5) / 17) * (w - 20) + 10;
      const toRadarY = (wz) => ((wz + 6.0) / 12) * (h - 20) + 10;

      // Зоны квартиры
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      // Гостиная (слева)
      ctx.strokeRect(toRadarX(-8.5), toRadarY(-6), (9 / 17) * (w - 20), (12 / 12) * (h - 20));
      // Кухня (справа сверху)
      ctx.strokeRect(toRadarX(0.5), toRadarY(-6), (8 / 17) * (w - 20), (6.5 / 12) * (h - 20));
      // Ванная (справа снизу)
      ctx.strokeRect(toRadarX(0.5), toRadarY(0.5), (8 / 17) * (w - 20), (5.5 / 12) * (h - 20));

      // Подписи комнат
      ctx.font = '700 8px Manrope, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('ЗАЛ', toRadarX(-6.5), toRadarY(-4.5));
      ctx.fillText('КУХНЯ', toRadarX(3.5), toRadarY(-4.5));
      ctx.fillText('ВАННА', toRadarX(3.5), toRadarY(2.0));

      // Интерактивные объекты
      this.game.objects.forEach(obj => {
        const rx = toRadarX(obj.pos[0]);
        const ry = toRadarY(obj.pos[2]);

        ctx.fillStyle = obj.broken ? '#555555' : (obj.tag.includes('water') ? '#00bfff' : '#ffd23f');
        ctx.beginPath();
        ctx.arc(rx, ry, obj.broken ? 2 : 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Датчики Альфы
      this.game.sensors.forEach(s => {
        const sx = toRadarX(s.worldPos.x);
        const sy = toRadarY(s.worldPos.z);
        ctx.fillStyle = s.active ? '#ff1a1a' : '#EF3124';
        ctx.beginPath();
        ctx.arc(sx, sy, s.active ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Робот-пылесос
      if (this.game.robot && this.game.robot.alive) {
        const rbx = toRadarX(this.game.robot.pos.x);
        const rby = toRadarY(this.game.robot.pos.z);
        ctx.fillStyle = this.game.robot.state === 'CHASE' ? '#ff0033' : '#45e07a';
        ctx.beginPath();
        ctx.arc(rbx, rby, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Маркер игрока (Геннадий) и конус взгляда
      if (this.game.player) {
        const px = toRadarX(this.game.player.position.x);
        const py = toRadarY(this.game.player.position.z);
        const ang = this.game.player.facingAngle;

        // Конус взгляда
        ctx.fillStyle = 'rgba(239, 49, 36, 0.35)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, 14, ang - 0.45 - Math.PI / 2, ang + 0.45 - Math.PI / 2);
        ctx.closePath();
        ctx.fill();

        // Точка игрока
        ctx.fillStyle = '#EF3124';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // ---------------- ФИНАЛЬНЫЙ КАССОВЫЙ ЧЕК КАТАСТРОФЫ ----------------
    _initFinalModal() {
      const toggle = document.getElementById('alfa-policy-toggle');
      const totalAmountDisplay = document.getElementById('receipt-total-amount');
      const promoBlock = document.getElementById('promo-block');
      const policyBanner = document.getElementById('policy-banner');

      if (toggle) {
        toggle.addEventListener('change', () => {
          if (toggle.checked) {
            // Включение страховки: перечеркивание суммы в 0 ₽
            totalAmountDisplay.innerHTML = `
              <span class="strikethrough">${this.game.damage.toLocaleString('ru-RU')} ₽</span>
              <span class="zero-rub">0 ₽ из вашего кармана</span>
            `;
            promoBlock.classList.remove('hidden');
            policyBanner.classList.remove('hidden');
            GN.sound.playCashChime();
          } else {
            totalAmountDisplay.textContent = `${this.game.damage.toLocaleString('ru-RU')} ₽`;
            promoBlock.classList.add('hidden');
            policyBanner.classList.add('hidden');
          }
        });
      }

      // Кнопка копирования промокода
      const btnCopyPromo = document.getElementById('btn-copy-promo');
      if (btnCopyPromo) {
        btnCopyPromo.addEventListener('click', () => {
          navigator.clipboard.writeText('GENA15').then(() => {
            btnCopyPromo.textContent = 'СКОПИРОВАНО! ✓';
            setTimeout(() => { btnCopyPromo.textContent = 'СКОПИРОВАТЬ ПРОМОКОД'; }, 2000);
          });
        });
      }

      // Кнопка перезапуска игры
      const btnRestart = document.getElementById('btn-restart');
      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }

    showFinalReceipt(data) {
      if (!this.receiptModal) return;

      // Определение звания разрушителя
      let rank = 'Начинающий ремонтник';
      if (data.totalDamage > 1500000) rank = 'Гроза панелек и стояков';
      else if (data.totalDamage > 1000000) rank = 'Заслуженный шабашник района';
      else if (data.totalDamage > 500000) rank = 'Магистр перфораторных наук';

      document.getElementById('receipt-rank').textContent = rank;

      // Заполнение списка сломанного имущества
      const listEl = document.getElementById('receipt-items-list');
      if (listEl) {
        listEl.innerHTML = '';
        data.objects.forEach(obj => {
          const row = document.createElement('div');
          row.className = 'receipt-row';
          row.innerHTML = `
            <span>${obj.name}</span>
            <span class="receipt-price">${obj.cost.toLocaleString('ru-RU')} ₽</span>
          `;
          listEl.appendChild(row);
        });

        // Бонусы за квесты
        data.quests.forEach(q => {
          const row = document.createElement('div');
          row.className = 'receipt-row bonus';
          row.innerHTML = `
            <span>Бонус: ${q.title}</span>
            <span class="receipt-price">+${q.reward.toLocaleString('ru-RU')} ₽</span>
          `;
          listEl.appendChild(row);
        });
      }

      const totalAmountDisplay = document.getElementById('receipt-total-amount');
      if (totalAmountDisplay) {
        totalAmountDisplay.textContent = `${data.totalDamage.toLocaleString('ru-RU')} ₽`;
      }

      this.hud.classList.add('hidden');
      this.receiptModal.classList.remove('hidden');
    }

    // ---------------- ПРЕ-КАЛЬКУЛЯТОР НА ЛЕНДИНГЕ ----------------
    _initCalculator() {
      const sliderRepair = document.getElementById('calc-slider-repair');
      const sliderStuff = document.getElementById('calc-slider-stuff');
      const sliderLiability = document.getElementById('calc-slider-liability');

      const valRepair = document.getElementById('calc-val-repair');
      const valStuff = document.getElementById('calc-val-stuff');
      const valLiability = document.getElementById('calc-val-liability');
      const priceMonthly = document.getElementById('calc-price-monthly');

      const recalculate = () => {
        if (!sliderRepair || !sliderStuff || !sliderLiability) return;
        const r = parseInt(sliderRepair.value, 10);
        const s = parseInt(sliderStuff.value, 10);
        const l = parseInt(sliderLiability.value, 10);

        valRepair.textContent = `${(r / 1000).toLocaleString('ru-RU')} тыс. ₽`;
        valStuff.textContent = `${(s / 1000).toLocaleString('ru-RU')} тыс. ₽`;
        valLiability.textContent = `${(l / 1000).toLocaleString('ru-RU')} тыс. ₽`;

        // Формула приблизительного полиса АльфаСтрахования от ~350 руб/мес
        const monthly = Math.round(350 + (r * 0.0003) + (s * 0.0004) + (l * 0.00035));
        priceMonthly.textContent = `${monthly.toLocaleString('ru-RU')} ₽ / мес`;
      };

      [sliderRepair, sliderStuff, sliderLiability].forEach(sl => {
        if (sl) sl.addEventListener('input', recalculate);
      });

      recalculate();
    }
  }

  window.GN = window.GN || {};
  window.GN.UIManager = UIManager;
})();
