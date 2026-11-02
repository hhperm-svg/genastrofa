/* ГЕНАСТРОФА — Главное игровое ядро, физика, AI противника, комбо и квесты */
(function () {
  const M = GN.M;
  const V3 = THREE.Vector3;

  class Game {
    constructor() {
      this.container = document.getElementById('canvas-container');
      this.clock = new THREE.Clock();

      this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
      this.timeLeft = 60.0;
      this.damage = 0;
      this.comboMultiplier = 1;
      this.comboTimer = 0;

      // Выбранный класс
      this.playerClass = 'drill'; // 'drill' | 'aqua' | 'music'

      // Кулдауны навыков (в секундах)
      this.cooldowns = {
        wrench: 0,
        drill: 0,
        weight: 0,
        music: 0
      };
      this.maxCooldowns = {
        wrench: 0.8,
        drill: 0.1,
        weight: 6.0,
        music: 8.0
      };

      // Клавиатурный ввод
      this.keys = {};

      this._initScene();
      this._initLights();
      this._initApartment();
      this._initInteractiveObjects();
      this._initSensors();
      this._initRobot();
      this._initCharacter();
      this._initQuests();
      this._initInput();
      this._initCameraControls();

      window.addEventListener('resize', () => this.onResize());
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    _initScene() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#d9d2c5');
      this.scene.fog = new THREE.FogExp2('#d9d2c5', 0.018);

      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
      this.camTarget = new V3(0, 1.2, 0);

      // Изометрический ракурс
      this.camDistance = 22;
      this.camAngleH = Math.PI * 0.25; // 45 градусов вокруг квартиры
      this.camAngleV = 0.65; // угол обзора сверху вниз
      this._updateCameraPosition();

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.container.appendChild(this.renderer.domElement);

      this.fx = new GN.FXManager(this.scene, this.camera);
    }

    _initLights() {
      // Мягкий полусферический рассеянный свет
      const hemiLight = new THREE.HemisphereLight('#fbf9f5', '#9a9488', 0.75);
      hemiLight.position.set(0, 20, 0);
      this.scene.add(hemiLight);

      // Тёплый солнечный направленный свет (имитация дневного солнца из окон)
      this.sunLight = new THREE.DirectionalLight('#fff1db', 1.25);
      this.sunLight.position.set(-14, 18, -12);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 45;
      const d = 14;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0004;
      this.scene.add(this.sunLight);

      // Локальный свет от ТВ
      this.tvLight = new THREE.PointLight('#5ce1ff', 0, 4.5);
      this.tvLight.position.set(-5.6, 1.3, -2.4);
      this.scene.add(this.tvLight);
    }

    _initApartment() {
      M.initMaterials();
      const apt = M.buildApartment(this.scene);
      this.apartmentRoot = apt.root;
      this.colliders = apt.colliders;
      this.outerWalls = apt.outerWalls;
    }

    _initInteractiveObjects() {
      this.objects = [];

      // Каталог интерактивных предметов с метаданными и позициями
      const specs = [
        // Зона 1: КОМНАТА
        { id: 'tv', name: '75" OLED-телевизор', cost: 165000, tag: 'electric', room: 'room', pos: [-5.6, 0, -2.5], rot: 0, builder: M.builders.tv },
        { id: 'sofa', name: 'Итальянский изумрудный диван', cost: 95000, tag: 'dry', room: 'room', pos: [-5.7, 0, 1.2], rot: 0, builder: M.builders.sofa },
        { id: 'table', name: 'Журнальный стол + MacBook', cost: 185000, tag: 'electric', room: 'room', pos: [-5.7, 0, -0.6], rot: 0, builder: M.builders.table },
        { id: 'ficus', name: 'Фикус в кашпо', cost: 18000, tag: 'dry', room: 'room', pos: [-7.8, 0, -1.8], rot: 0, builder: M.builders.ficus },
        { id: 'shelf', name: 'Стеллаж с вазами Мин', cost: 64000, tag: 'dry', room: 'room', pos: [-1.4, 0, 1.2], rot: -Math.PI / 2, builder: M.builders.shelf },
        { id: 'pipe', name: 'Магистраль отопления в стене', cost: 120000, tag: 'water', room: 'room', pos: [-8.48, 0, 0.4], rot: Math.PI / 2, builder: M.builders.pipe },
        { id: 'radiator', name: 'Чугунный радиатор отопления', cost: 42000, tag: 'water', room: 'room', pos: [-4.75, 0, -5.88], rot: 0, builder: M.builders.radiator },

        // Зона 2: КУХНЯ
        { id: 'kitchen', name: 'Кухонный гарнитур + варочная', cost: 155000, tag: 'electric_water', room: 'kitchen', pos: [4.5, 0, -5.6], rot: 0, builder: M.builders.kitchen },
        { id: 'still', name: 'Самогонный аппарат «Первач-Люкс»', cost: 88000, tag: 'fire', room: 'kitchen', pos: [4.5, 0, -2.4], rot: 0, builder: M.builders.still },
        { id: 'fridge', name: 'Холодильник BORK Smart', cost: 140000, tag: 'electric', room: 'kitchen', pos: [8.0, 0, -5.5], rot: -Math.PI / 2, builder: M.builders.fridge },

        // Зона 3: ВАННАЯ
        { id: 'tub', name: 'Чугунная ванна с душем', cost: 92000, tag: 'water', room: 'bath', pos: [7.2, 0, 2.8], rot: -Math.PI / 2, builder: M.builders.tub },
        { id: 'toilet', name: 'Дизайнерский унитаз', cost: 48000, tag: 'water', room: 'bath', pos: [7.8, 0, 5.4], rot: -Math.PI / 2, builder: M.builders.toilet },
        { id: 'washer', name: 'Стиралка 1400 об/мин + раковина', cost: 78000, tag: 'electric_water', room: 'bath', pos: [2.5, 0, 5.5], rot: Math.PI, builder: M.builders.washer },
        { id: 'riser', name: 'Главный стояк водоснабжения', cost: 210000, tag: 'water', room: 'bath', pos: [1.2, 0, 5.6], rot: Math.PI, builder: M.builders.riser }
      ];

      specs.forEach(s => {
        const built = s.builder();
        built.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
        built.group.rotation.y = s.rot;
        this.scene.add(built.group);

        const obj = {
          ...s,
          ...built,
          broken: false,
          health: 100,
          worldCenter: built.group.position.clone().add(new V3(built.focus[0], built.focus[1], built.focus[2]))
        };

        // Добавляем коллайдер мебели
        if (s.size[0] > 0.2) {
          const hw = s.size[0] / 2;
          const hd = s.size[1] / 2;
          this.colliders.push({
            x0: s.pos[0] - hw,
            x1: s.pos[0] + hw,
            z0: s.pos[2] - hd,
            z1: s.pos[2] + hd,
            top: s.size[2]
          });
        }

        this.objects.push(obj);
      });
    }

    _initSensors() {
      this.sensors = [];
      const sensorLocs = [
        { pos: [-4.2, 2.2, -5.92], rot: 0, room: 'Гостиная' },
        { pos: [8.42, 2.2, -3.2], rot: -Math.PI / 2, room: 'Кухня' }
      ];

      sensorLocs.forEach((loc, i) => {
        const s = M.sensor();
        s.group.position.set(loc.pos[0], loc.pos[1], loc.pos[2]);
        s.group.rotation.y = loc.rot;
        this.scene.add(s);

        this.sensors.push({
          id: 'sensor_' + i,
          room: loc.room,
          ...s,
          active: false,
          timer: 0,
          disabled: false,
          worldPos: s.group.position.clone()
        });
      });

      this.sensorCycleTimer = 16.0; // раз в 18-20 секунд датчик пиликает
    }

    _initRobot() {
      const r = M.robot();
      r.group.position.set(-6.5, 0, 4.2);
      this.scene.add(r.group);

      this.robot = {
        ...r,
        alive: true,
        pos: r.group.position,
        state: 'PATROL', // 'PATROL' | 'CHASE' | 'DEAD'
        speed: 2.2,
        chaseSpeed: 4.8,
        waypointIndex: 0,
        waypoints: [
          new V3(-6.5, 0, 4.2),
          new V3(-4.0, 0, -0.5),
          new V3(-2.0, 0, -4.5),
          new V3(3.5, 0, -3.5),
          new V3(6.5, 0, -1.5),
          new V3(5.5, 0, 3.5),
          new V3(3.0, 0, 4.2),
          new V3(-3.0, 0, 2.5)
        ]
      };
    }

    _initCharacter() {
      this.player = new GN.Gennadiy(this.scene);
      this.player.position.set(-4.0, 0, 2.5); // Старт в центре гостиной

      // Обратный вызов приземления гири («F»)
      this.player.onWeightLanded = () => {
        const pPos = this.player.position;
        this.fx.ring(pPos, 3.8, '#EF3124');
        this.fx.decal('crack', pPos.x, pPos.z, 2.2, Math.random() * 6);
        GN.sound.playKettlebellThud();
        this.fx.shake(0.65, 0.4);

        // AoE-урон предметам вокруг (радиус 3.2 м)
        const radius = 3.2;
        let mult = this.playerClass === 'drill' ? 1.5 : 1.0;

        this.objects.forEach(obj => {
          if (!obj.broken) {
            const dist = pPos.distanceTo(obj.worldCenter);
            if (dist <= radius) {
              this.damageObject(obj, 100 * mult, 'weight');
            }
          }
        });

        // Уничтожение робота-пылесоса гирей
        if (this.robot.alive) {
          const rDist = pPos.distanceTo(this.robot.pos);
          if (rDist <= radius) {
            this.destroyRobot();
          }
        }
      };
    }

    _initQuests() {
      this.quests = [
        {
          id: 1,
          title: 'Диверсия №1: «Венеция в хрущёвке»',
          reward: 90000,
          desc: 'Сорвать стояк и устроить полномасштабный потоп',
          steps: [
            { desc: 'Сорвать вентиль стояка в ванной', done: false },
            { desc: 'Затопить ванную комнату', done: false },
            { desc: 'Довести уровень воды до гостиной (> 25%)', done: false }
          ],
          completed: false
        },
        {
          id: 2,
          title: 'Диверсия №2: «Симфония несущей стены»',
          reward: 110000,
          desc: 'Проверить прочность стен и звукоизоляцию',
          steps: [
            { desc: 'Пробурить скрытую трубу в стене (Q)', done: false },
            { desc: 'Уронить 24-кг гирю на паркет (F)', done: false },
            { desc: 'Позвонить по батарее на весь дом (R)', done: false }
          ],
          completed: false
        },
        {
          id: 3,
          title: 'Диверсия №3: «Давление в норме»',
          reward: 130000,
          desc: 'Кухонный резонанс и мощный взрыв пара',
          steps: [
            { desc: 'Взорвать самогонный аппарат «Первач-Люкс»', done: false },
            { desc: 'Разнести умный холодильник BORK', done: false },
            { desc: 'Устроить комбо: «Вода + Ток»', done: false }
          ],
          completed: false
        }
      ];

      this.currentQuestIndex = 0;
    }

    _initInput() {
      window.addEventListener('keydown', e => {
        this.keys[e.code] = true;

        if (this.state === 'PLAYING') {
          if (e.code === 'KeyE') this.triggerActionWrench();
          if (e.code === 'KeyQ') this.startDrilling();
          if (e.code === 'KeyF') this.triggerWeightDrop();
          if (e.code === 'KeyR') this.triggerRadiatorSound();
          if (e.code === 'Space') this.player.jump(7.2);
          if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.player.isSprinting = true;
        }

        if (e.code === 'KeyP') this.togglePause();
      });

      window.addEventListener('keyup', e => {
        this.keys[e.code] = false;

        if (e.code === 'KeyQ') this.stopDrilling();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.player.isSprinting = false;
      });
    }

    _initCameraControls() {
      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      window.addEventListener('mousedown', e => {
        if (e.target.closest('#hud') || e.target.closest('#modal') || e.target.closest('#hero-overlay')) return;
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      });

      window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        this.camAngleH -= dx * 0.006;
        this.camAngleV = Math.max(0.3, Math.min(1.2, this.camAngleV + dy * 0.005));
        this._updateCameraPosition();
      });

      window.addEventListener('mouseup', () => { isDragging = false; });

      window.addEventListener('wheel', e => {
        if (e.target.closest('#landing-page')) return;
        this.camDistance = Math.max(14, Math.min(32, this.camDistance + e.deltaY * 0.02));
        this._updateCameraPosition();
      });
    }

    _updateCameraPosition() {
      const hDist = this.camDistance * Math.cos(this.camAngleV);
      const y = this.camDistance * Math.sin(this.camAngleV);
      const x = hDist * Math.sin(this.camAngleH);
      const z = hDist * Math.cos(this.camAngleH);

      this.camera.position.set(this.camTarget.x + x, this.camTarget.y + y, this.camTarget.z + z);
      this.camera.lookAt(this.camTarget);

      // Срезание передних стен квартиры по направлению взгляда камеры
      if (this.outerWalls) {
        const camDir = new V3().subVectors(this.camera.position, this.camTarget).normalize();
        this.outerWalls.forEach(wall => {
          // Если нормаль стены смотрит в камеру — скрываем или делаем прозрачной
          const dot = wall.normal.dot(camDir);
          wall.group.visible = dot <= 0.25;
          if (wall.attach) {
            wall.attach.forEach(att => att.visible = wall.group.visible);
          }
        });
      }
    }

    // ---------------- ИГРОВЫЕ ДЕЙСТВИЯ ----------------
    startDrilling() {
      if (this.player.isStunned) return;
      this.player.startDrill();
      GN.sound.playDrill(0.4);
    }

    stopDrilling() {
      this.player.stopDrill();
    }

    triggerActionWrench() {
      if (this.cooldowns.wrench > 0 || this.player.isStunned) return;
      this.cooldowns.wrench = this.maxCooldowns.wrench;
      this.player.swingWrench();
      GN.sound.playWrenchClank();

      // Проверка датчиков рядом
      this.sensors.forEach(sensor => {
        if (sensor.active && !sensor.disabled) {
          const d = this.player.position.distanceTo(sensor.worldPos);
          if (d < 2.5) {
            sensor.disabled = true;
            sensor.active = false;
            sensor.draw('СБИТ!', false);
            GN.sound.playGlassSmash();
            this.addDamage(35000, 'Датчик обезврежен!');
            this.player.say('Не пищи мне тут!', 2);
          }
        }
      });

      // Поиск интерактивного объекта перед Геннадием
      const interactObj = this.getInteractableInFront(2.2);
      if (interactObj && !interactObj.broken) {
        this.damageObject(interactObj, 100, 'wrench');
      }
    }

    triggerWeightDrop() {
      let cd = this.maxCooldowns.weight;
      if (this.cooldowns.weight > 0 || this.player.isStunned) return;
      this.cooldowns.weight = cd;
      this.player.dropWeight();
      this.player.say('Пошла родная!', 1.8);
      this.checkQuestStep(2, 1); // Квест 2: бросок гири
    }

    triggerRadiatorSound() {
      let cd = this.maxCooldowns.music * (this.playerClass === 'music' ? 0.6 : 1.0);
      if (this.cooldowns.music > 0 || this.player.isStunned) return;
      this.cooldowns.music = cd;
      GN.sound.playRadiatorRing();

      const pPos = this.player.position;
      this.fx.ring(pPos, 5.5, '#4be3ff');
      this.fx.shake(0.3, 0.45);
      this.player.say('Шансон на всю катушку!', 2.2);

      // Разбивает сервиз и посуду в радиусе 5.5 м
      const radius = 5.5;
      this.objects.forEach(obj => {
        if (!obj.broken && (obj.id === 'table' || obj.id === 'shelf')) {
          const d = pPos.distanceTo(obj.worldCenter);
          if (d <= radius) {
            this.damageObject(obj, 100, 'sound');
          }
        }
      });

      this.checkQuestStep(2, 2); // Квест 2: звон по батарее
    }

    getInteractableInFront(maxDist = 2.2) {
      const pPos = this.player.position;
      const fDir = new V3(0, 0, 1).applyAxisAngle(new V3(0, 1, 0), this.player.facingAngle);

      let best = null;
      let minD = maxDist;

      this.objects.forEach(obj => {
        const toObj = new V3().subVectors(obj.worldCenter, pPos);
        const dist = toObj.length();
        if (dist <= maxDist) {
          toObj.normalize();
          const dot = fDir.dot(toObj);
          if (dot > 0.25 && dist < minD) {
            minD = dist;
            best = obj;
          }
        }
      });

      return best;
    }

    damageObject(obj, amount, source = 'wrench') {
      if (obj.broken) return;

      // Если включен Купол Альфа-Защиты — блокируем урон!
      if (this.fx.shieldActive) {
        this.showShieldBlockedMessage();
        return;
      }

      obj.broken = true;
      let cost = obj.cost;

      // Применение визуального слома
      obj.breakFx(this.fx);

      // Звуковые эффекты поломки
      if (obj.tag.includes('electric')) GN.sound.playSpark();
      if (obj.tag.includes('water')) GN.sound.playWaterSpurt(0.6);
      if (obj.id === 'shelf' || obj.id === 'table') GN.sound.playGlassSmash();

      // Фонтан воды
      if (obj.waterJet) {
        const jetOrigin = obj.group.localToWorld(new V3(obj.waterJet.local[0], obj.waterJet.local[1], obj.waterJet.local[2]));
        const jetDir = new V3(obj.waterJet.dir[0], obj.waterJet.dir[1], obj.waterJet.dir[2]).transformDirection(obj.group.matrixWorld);
        this.fx.addWaterJet(jetOrigin, jetDir, obj.waterJet.speed, obj.waterJet.spread, obj.waterJet.big);

        // Увеличение уровня воды
        let floodSpeed = this.playerClass === 'aqua' ? 0.16 : 0.08;
        this.fx.waterTargetHeight = Math.min(0.42, this.fx.waterTargetHeight + floodSpeed);
      }

      // Цепная реакция «Вода + Ток»
      if (obj.tag.includes('electric') && this.fx.waterLevel > 15) {
        this.triggerElectricWaterCombo(obj);
      }

      // Начисление ущерба с учетом комбо-множителя
      this.addDamage(cost, obj.name);

      // Проверка прогресса квестов
      this.checkQuestsOnObjectBroken(obj);
    }

    triggerElectricWaterCombo(sourceObj) {
      // Молнии по всей воде и бонус x2.5
      this.comboMultiplier = Math.min(5, this.comboMultiplier + 1.5);
      this.comboTimer = 6.0;

      const pPos = this.player.position;
      this.fx.lightningArc(sourceObj.worldCenter, new V3(pPos.x, this.fx.waterHeight, pPos.z));

      // Ищем соседние электроприборы для цепного взрыва
      this.objects.forEach(other => {
        if (!other.broken && other.tag.includes('electric') && other !== sourceObj) {
          const d = sourceObj.worldCenter.distanceTo(other.worldCenter);
          if (d < 8.0) {
            setTimeout(() => {
              this.fx.lightningArc(sourceObj.worldCenter, other.worldCenter, () => {
                this.damageObject(other, 100, 'electric_chain');
              });
            }, 300);
          }
        }
      });

      this.addDamage(75000, 'КОМБО: КЗ В ВОДЕ (x2.5)!');
      this.player.say('Опа, фаза на ноль пошла!', 2.5);
      this.checkQuestStep(3, 2); // Квест 3: Вода + Ток
    }

    destroyRobot() {
      this.robot.alive = false;
      this.robot.state = 'DEAD';
      this.robot.parts.body.rotation.z = Math.PI * 0.85;
      this.robot.parts.body.position.y = 0.2;
      this.robot.parts.ledMat.color.set('#222222');
      this.fx.debris(this.robot.pos, '#f2f2f0', 24, 4);
      this.fx.sparkSource(this.robot.pos, 12);
      GN.sound.playSpark();
      this.addDamage(45000, 'ЧистоБот-9000 уничтожен!');
      this.player.say('Отпылесосил, железка!', 2);
    }

    addDamage(amount, reason = '') {
      const multiplied = Math.round(amount * this.comboMultiplier);
      this.damage += multiplied;

      // Продление и рост комбо-шкалы
      this.comboMultiplier = Math.min(5, Number((this.comboMultiplier + 0.25).toFixed(2)));
      this.comboTimer = 6.0;

      GN.sound.playCashChime();

      // Обновление UI
      if (window.GN.UI) {
        window.GN.UI.updateDamage(this.damage, multiplied, this.comboMultiplier, reason);
      }
    }

    showShieldBlockedMessage() {
      GN.sound.playSensorBeep(false);
      this.player.say('Тьфу, Альфа-Защита стоит!', 2.0);
      if (window.GN.UI) {
        window.GN.UI.showShieldNotification();
      }
    }

    checkQuestsOnObjectBroken(obj) {
      if (obj.id === 'riser') {
        this.checkQuestStep(1, 0); // Квест 1: сорвать стояк
      }
      if (obj.id === 'pipe') {
        this.checkQuestStep(2, 0); // Квест 2: пробурить трубу
      }
      if (obj.id === 'still') {
        this.checkQuestStep(3, 0); // Квест 3: взорвать аппарат
      }
      if (obj.id === 'fridge') {
        this.checkQuestStep(3, 1); // Квест 3: разнести холодильник
      }
    }

    checkQuestStep(questId, stepIndex) {
      const q = this.quests.find(x => x.id === questId);
      if (!q || q.completed) return;

      if (!q.steps[stepIndex].done) {
        q.steps[stepIndex].done = true;

        // Проверяем, завершен ли весь квест
        if (q.steps.every(s => s.done)) {
          q.completed = true;
          this.addDamage(q.reward, `КВЕСТ: ${q.title}`);
          this.player.say('Квест выполнен! Налетай!', 2.5);
        }

        if (window.GN.UI) window.GN.UI.updateQuest(q);
      }
    }

    // ---------------- ИГРОВОЙ ЦИКЛ ----------------
    animate() {
      requestAnimationFrame(this.animate);
      const dt = Math.min(this.clock.getDelta(), 0.1);

      if (this.state === 'PLAYING') {
        this._updateTimer(dt);
        this._updatePlayer(dt);
        this._updateRobot(dt);
        this._updateSensors(dt);
        this._updateCombo(dt);
        this._updateCameraFollow(dt);
      }

      this.fx.update(dt);
      this.renderer.render(this.scene, this.camera);
    }

    _updateTimer(dt) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.finishGame();
      }

      // Квест 1: затопление ванной и комнаты
      if (this.fx.waterLevel > 15) this.checkQuestStep(1, 1);
      if (this.fx.waterLevel > 28) this.checkQuestStep(1, 2);

      // Кулдауны навыков
      for (const k in this.cooldowns) {
        if (this.cooldowns[k] > 0) {
          this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
        }
      }

      if (window.GN.UI) {
        window.GN.UI.updateHUD(this.timeLeft, this.fx.waterLevel, this.cooldowns, this.maxCooldowns);
      }
    }

    _updatePlayer(dt) {
      // Бурение в непрерывном режиме («Q»)
      if (this.player.isDrilling) {
        const obj = this.getInteractableInFront(2.0);
        if (obj && !obj.broken) {
          this.damageObject(obj, 100, 'drill');
        }
        this.fx.sparkSource(this.player.drillBit.getWorldPosition(new V3()), 2);
      }

      // Обработка передвижения WASD
      let dx = 0;
      let dz = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

      if ((dx !== 0 || dz !== 0) && !this.player.isStunned) {
        // Проекция направления относительно ориентации камеры
        const camYaw = this.camAngleH;
        const moveX = dx * Math.cos(camYaw) + dz * Math.sin(camYaw);
        const moveZ = -dx * Math.sin(camYaw) + dz * Math.cos(camYaw);

        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        const dirX = moveX / len;
        const dirZ = moveZ / len;

        this.player.targetAngle = Math.atan2(dirX, dirZ);
        this.player.isMoving = true;

        const currentSpeed = this.player.speed * (this.player.isSprinting ? this.player.sprintMult : 1.0);
        const nextX = this.player.position.x + dirX * currentSpeed * dt;
        const nextZ = this.player.position.z + dirZ * currentSpeed * dt;

        // Коллизии о стены и препятствия
        if (!this._checkCollision(nextX, this.player.position.z)) {
          this.player.position.x = nextX;
        }
        if (!this._checkCollision(this.player.position.x, nextZ)) {
          this.player.position.z = nextZ;
        }

        // Звук шагов
        if (!this.stepTimer) this.stepTimer = 0;
        this.stepTimer += dt;
        if (this.stepTimer > (this.player.isSprinting ? 0.22 : 0.35)) {
          this.stepTimer = 0;
          GN.sound.playFootstep();
        }
      } else {
        this.player.isMoving = false;
      }

      this.player.update(dt, this.camera);
    }

    _checkCollision(x, z, radius = 0.45) {
      // Границы квартиры: x ∈ [-8.3, 8.3], z ∈ [-5.8, 5.8]
      if (x < -8.3 || x > 8.3 || z < -5.8 || z > 5.8) return true;

      // Коллизии со стенами и мебелью
      for (let i = 0; i < this.colliders.length; i++) {
        const c = this.colliders[i];
        if (x + radius > c.x0 && x - radius < c.x1 && z + radius > c.z0 && z - radius < c.z1) {
          return true;
        }
      }
      return false;
    }

    _updateRobot(dt) {
      if (!this.robot.alive) return;

      const pPos = this.player.position;
      const rPos = this.robot.pos;
      const distToPlayer = rPos.distanceTo(pPos);

      // Проверка обнаружения Геннадия в радиусе 5 метров
      if (distToPlayer < 5.0 && !this.player.isStunned) {
        this.robot.state = 'CHASE';
        this.robot.parts.ledMat.color.set('#ff0033'); // красный диод атаки
      } else if (distToPlayer > 7.5) {
        this.robot.state = 'PATROL';
        this.robot.parts.ledMat.color.set('#45e07a'); // зеленый диод патруля
      }

      let targetPos;
      let spd;

      if (this.robot.state === 'CHASE') {
        targetPos = pPos;
        spd = this.robot.chaseSpeed;

        // Таран персонажа
        if (distToPlayer < 0.85 && !this.player.isStunned) {
          this.player.stun(1.5);
          this.comboMultiplier = 1; // сброс множителя комбо
          GN.sound.playWrenchClank();
          this.fx.shake(0.4, 0.25);
        }
      } else {
        targetPos = this.robot.waypoints[this.robot.waypointIndex];
        spd = this.robot.speed;

        if (rPos.distanceTo(targetPos) < 0.6) {
          this.robot.waypointIndex = (this.robot.waypointIndex + 1) % this.robot.waypoints.length;
        }
      }

      // Движение и поворот робота
      const toTarget = new V3().subVectors(targetPos, rPos);
      toTarget.y = 0;
      toTarget.normalize();

      rPos.x += toTarget.x * spd * dt;
      rPos.z += toTarget.z * spd * dt;
      this.robot.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);

      // Вращение щеток
      this.robot.parts.brushes.forEach(b => { b.rotation.y += dt * 25; });
    }

    _updateSensors(dt) {
      this.sensorCycleTimer -= dt;

      // Запуск пищания одного из датчиков
      if (this.sensorCycleTimer <= 0) {
        this.sensorCycleTimer = 22.0;
        const available = this.sensors.filter(s => !s.disabled && !s.active);
        if (available.length > 0) {
          const s = available[(Math.random() * available.length) | 0];
          s.active = true;
          s.timer = 5.0; // 5-секундный отсчет
          GN.sound.playSensorBeep(true);
          if (window.GN.UI) window.GN.UI.showSensorAlert(s.room);
        }
      }

      // Обновление активных датчиков
      this.sensors.forEach(s => {
        if (s.active && !s.disabled) {
          s.timer -= dt;
          s.draw(Math.ceil(s.timer) + 's', true);
          s.parts.ledMat.color.set(Math.sin(Date.now() * 0.02) > 0 ? '#ff1a1a' : '#550000');

          if (s.timer <= 0) {
            s.active = false;
            s.draw('ЩИТ', true);
            // Активация Красного Купола Альфа-Защиты на 5 сек
            this.fx.activateShield(5.0);
            this.player.say('Оп-па, Альфа-Защита включилась!', 2.5);
          }
        }
      });
    }

    _updateCombo(dt) {
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.comboMultiplier = 1;
        }
      }
    }

    _updateCameraFollow(dt) {
      // Плавное следование камеры за персонажем (lerp)
      const p = this.player.position;
      this.camTarget.x += (p.x * 0.35 - this.camTarget.x) * dt * 3.5;
      this.camTarget.z += (p.z * 0.35 - this.camTarget.z) * dt * 3.5;
      this._updateCameraPosition();
    }

    // ---------------- УПРАВЛЕНИЕ СОСТОЯНИЕМ ИГРЫ ----------------
    start(playerClass = 'drill') {
      GN.sound.resume();
      GN.sound.startBGM();

      this.playerClass = playerClass;
      this.state = 'PLAYING';
      this.timeLeft = 60.0;
      this.damage = 0;
      this.comboMultiplier = 1;

      // Бонусы классов
      if (playerClass === 'drill') {
        this.player.say('Перфоратор к бою готов!', 2.5);
      } else if (playerClass === 'aqua') {
        this.player.say('Сейчас устроим тут Аквадискотеку!', 2.5);
      } else if (playerClass === 'music') {
        this.player.say('Соседи, встречайте хиты шансона!', 2.5);
      }

      if (window.GN.UI) {
        window.GN.UI.onGameStart();
      }
    }

    finishGame() {
      this.state = 'GAMEOVER';
      this.player.stopDrill();
      GN.sound.stopBGM();

      if (window.GN.UI) {
        window.GN.UI.showFinalReceipt({
          totalDamage: this.damage,
          objects: this.objects.filter(o => o.broken),
          quests: this.quests.filter(q => q.completed),
          waterLevel: Math.round(this.fx.waterLevel)
        });
      }
    }

    togglePause() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
      } else if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
      }
    }

    onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  window.GN = window.GN || {};
  window.GN.Game = Game;
})();
