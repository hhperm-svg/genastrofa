/* ГЕНАСТРОФА — Главное игровое ядро, физика, AI противника, комбо и сценарии */
(function () {
  const GN = window.GN = window.GN || {};
  const M = GN.M;
  const V3 = THREE.Vector3;

  class Game {
    constructor() {
      this.container = document.getElementById('canvas-container');
      this.clock = new THREE.Clock();

      this.state = 'MENU'; // 'MENU' | 'BRIEFING' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
      this.selectedScenarioId = 1;
      this.playerClass = 'drill'; // 'drill' | 'aqua' | 'music'

      this.timeLeft = 60.0;
      this.damage = 0;
      this.comboMultiplier = 1;
      this.comboTimer = 0;

      // Кулдауны навыков (в секундах)
      this.cooldowns = { wrench: 0, drill: 0, weight: 0, music: 0 };
      this.maxCooldowns = { wrench: 0.6, drill: 0.05, weight: 5.5, music: 7.0 };

      // Бурение с зажатием (Hold Drill)
      this.isDrillHeld = false;
      this.drillProgress = 0;
      this.drillTargetObj = null;

      // Клавиатурный ввод
      this.keys = {};

      this._initScene();
      this._initLights();
      this._initApartment();
      this._initInteractiveObjects();
      this._initSensors();
      this._initRobot();
      this._initCharacter();
      this._initScenarios();
      this._initInput();
      this._initCameraControls();

      window.addEventListener('resize', () => this.onResize());
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    _initScene() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#d9d2c5');
      this.scene.fog = new THREE.FogExp2('#d9d2c5', 0.015);

      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 120);
      this.camTarget = new V3(0, 1.0, 0);

      // Изометрический динамичный ракурс (ближе, глубже, уютнее)
      this.camDistance = 15.8;
      this.camAngleH = Math.PI * 0.28;
      this.camAngleV = 0.62;
      this._updateCameraPosition();

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);

      this.fx = new GN.FXManager(this.scene, this.camera);
    }

    _initLights() {
      const hemiLight = new THREE.HemisphereLight('#fbf9f5', '#9a9488', 0.85);
      hemiLight.position.set(0, 25, 0);
      this.scene.add(hemiLight);

      this.sunLight = new THREE.DirectionalLight('#fff2de', 1.4);
      this.sunLight.position.set(-16, 20, -14);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 50;
      const d = 16;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0003;
      this.scene.add(this.sunLight);

      // Локальный синий свет ТВ
      this.tvLight = new THREE.PointLight('#5ce1ff', 0.8, 5);
      this.tvLight.position.set(-8.0, 1.4, -0.8);
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

      // Расположение предметов по зонам квартиры:
      // Квартира: 17 x 12 м (x ∈ [-8.5, 8.5], z ∈ [-6, 6])
      // Зона 1: КОМНАТА (x ∈ [-8.5, 0.5])
      // Зона 2: КУХНЯ (x ∈ [0.5, 8.5], z ∈ [-6, 0.5])
      // Зона 3: ВАННАЯ (x ∈ [0.5, 8.5], z ∈ [0.5, 6])
      const specs = [
        // КОМНАТА
        { id: 'tv', name: '75" OLED-телевизор', cost: 165000, tag: 'electric', room: 'Гостиная', pos: [-8.05, 0, -0.8], rot: Math.PI / 2, builder: M.builders.tv },
        { id: 'table', name: 'Журнальный стол + MacBook', cost: 185000, tag: 'electric', room: 'Гостиная', pos: [-5.7, 0, -0.8], rot: 0, builder: M.builders.table },
        { id: 'sofa', name: 'Изумрудный диван', cost: 95000, tag: 'dry', room: 'Гостиная', pos: [-3.4, 0, -0.8], rot: -Math.PI / 2, builder: M.builders.sofa },
        { id: 'shelf', name: 'Стеллаж с вазами Мин', cost: 64000, tag: 'dry', room: 'Гостиная', pos: [-7.6, 0, -5.6], rot: 0, builder: M.builders.shelf },
        { id: 'ficus', name: 'Фикус в кашпо', cost: 18000, tag: 'dry', room: 'Гостиная', pos: [-1.2, 0, -5.1], rot: 0, builder: M.builders.ficus },
        { id: 'pipe', name: 'Скрытая магистраль отопления', cost: 120000, tag: 'water', room: 'Гостиная', pos: [-2.6, 0, -5.99], rot: 0, builder: M.builders.pipe },
        { id: 'radiator', name: 'Чугунный радиатор', cost: 42000, tag: 'water', room: 'Гостиная', pos: [-4.75, 0, -5.88], rot: 0, builder: M.builders.radiator },

        // КУХНЯ
        { id: 'kitchen', name: 'Кухонный гарнитур + варочная', cost: 155000, tag: 'electric_water', room: 'Кухня', pos: [4.5, 0, -5.67], rot: 0, builder: M.builders.kitchen },
        { id: 'fridge', name: 'Холодильник BORK Smart', cost: 140000, tag: 'electric', room: 'Кухня', pos: [7.9, 0, -5.6], rot: -Math.PI / 2, builder: M.builders.fridge },
        { id: 'still', name: 'Самогонный аппарат «Первач-Люкс»', cost: 88000, tag: 'fire', room: 'Кухня', pos: [4.5, 0, -2.2], rot: 0, builder: M.builders.still },

        // ВАННАЯ
        { id: 'tub', name: 'Чугунная ванна с душем', cost: 92000, tag: 'water', room: 'Ванная', pos: [6.9, 0, 1.6], rot: -Math.PI / 2, builder: M.builders.tub },
        { id: 'toilet', name: 'Дизайнерский унитаз', cost: 48000, tag: 'water', room: 'Ванная', pos: [8.0, 0, 4.0], rot: -Math.PI / 2, builder: M.builders.toilet },
        { id: 'washer', name: 'Стиралка 1400 об/мин + раковина', cost: 78000, tag: 'electric_water', room: 'Ванная', pos: [3.5, 0, 0.65], rot: 0, builder: M.builders.washer },
        { id: 'riser', name: 'Главный стояк водоснабжения', cost: 210000, tag: 'water', room: 'Ванная', pos: [1.1, 0, 1.0], rot: 0, builder: M.builders.riser }
      ];

      specs.forEach(s => {
        const built = s.builder();
        built.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
        built.group.rotation.y = s.rot;
        this.scene.add(built.group);

        const focusOffset = built.focus || [0, 0.8, 0];
        const worldCenter = built.group.position.clone().add(new V3(focusOffset[0], focusOffset[1], focusOffset[2]));

        const obj = {
          ...s,
          ...built,
          broken: false,
          health: 100,
          worldCenter
        };

        if (built.size && built.size[0] > 0.2) {
          const hw = built.size[0] / 2;
          const hd = (built.size[1] || 0.6) / 2;
          this.colliders.push({
            x0: s.pos[0] - hw,
            x1: s.pos[0] + hw,
            z0: s.pos[2] - hd,
            z1: s.pos[2] + hd,
            top: built.size[2] || 0.8
          });
        }

        this.objects.push(obj);
      });
    }

    _initSensors() {
      this.sensors = [];
      const sensorLocs = [
        { pos: [-8.48, 1.8, 3.2], rot: Math.PI / 2, room: 'Гостиная' },
        { pos: [1.4, 1.8, -5.92], rot: 0, room: 'Кухня' }
      ];

      sensorLocs.forEach((loc, i) => {
        const s = M.sensor();
        s.group.position.set(loc.pos[0], loc.pos[1], loc.pos[2]);
        s.group.rotation.y = loc.rot;
        this.scene.add(s.group); // Правильное добавление THREE.Group!

        this.sensors.push({
          id: 'sensor_' + i,
          room: loc.room,
          group: s.group,
          parts: s.parts,
          active: false,
          timer: 0,
          disabled: false,
          worldPos: s.group.position.clone()
        });
      });

      this.sensorCycleTimer = 18.0;
    }

    _initRobot() {
      const r = M.robot();
      r.group.position.set(-6.5, 0, 4.2);
      this.scene.add(r.group);

      this.robot = {
        ...r,
        alive: true,
        pos: r.group.position,
        state: 'PATROL',
        speed: 2.3,
        chaseSpeed: 4.6,
        waypointIndex: 0,
        waypoints: [
          new V3(-6.5, 0, 4.2),
          new V3(-4.0, 0, 2.0),
          new V3(-4.0, 0, -2.5),
          new V3(0.5, 0, -2.8),
          new V3(4.5, 0, -3.5),
          new V3(7.0, 0, -1.8),
          new V3(4.5, 0, 2.5),
          new V3(2.5, 0, 4.0),
          new V3(0.5, 0, 2.8),
          new V3(-4.5, 0, 3.5)
        ]
      };
    }

    _initCharacter() {
      this.player = new GN.Gennadiy(this.scene);
      this.player.position.set(-4.0, 0, 2.0);

      this.player.onWeightLanded = () => {
        const pPos = this.player.position;
        this.fx.ring(pPos, 3.8, '#EF3124');
        this.fx.decal('crack', pPos.x, pPos.z, 2.4, Math.random() * 6);
        this.fx.popupText('БА-БАХ!', pPos, '#ffcc00');
        GN.sound.playKettlebellThud();
        this.fx.shake(0.65, 0.45);

        const radius = 3.4;
        let mult = this.playerClass === 'drill' ? 1.5 : 1.0;

        this.objects.forEach(obj => {
          if (!obj.broken) {
            const dist = pPos.distanceTo(obj.worldCenter);
            if (dist <= radius) {
              this.damageObject(obj, 100 * mult, 'weight');
            }
          }
        });

        if (this.robot.alive) {
          const rDist = pPos.distanceTo(this.robot.pos);
          if (rDist <= radius) {
            this.destroyRobot();
          }
        }

        // Обновление шага сценария
        this.checkCurrentScenarioStep('kettlebell');
      };
    }

    _initScenarios() {
      this.scenarios = [
        {
          id: 1,
          badge: '🌊 СЦЕНАРИЙ 1',
          name: '«Венеция в хрущёвке»',
          subtitle: 'Потоп высшей категории со срывом стояка',
          targetDamage: 450000,
          timeLimit: 60,
          briefing: [
            'Соседи снизу закончили дорогой евроремонт с итальянской плиткой и дубовым паркетом.',
            'Цель Геннадия: добраться до ванной, сорвать вентиль главного стояка ХВС/ГВС и затопить всю квартиру до приезда аварийной службы!'
          ],
          steps: [
            { id: 'riser', desc: 'Сорвать главный стояк водоснабжения в ванной [E]', done: false },
            { id: 'tub', desc: 'Сломать душ и переполнить чугунную ванну [E]', done: false },
            { id: 'water_level_20', desc: 'Поднять уровень воды до 20 см во всей квартире', done: false }
          ],
          completed: false
        },
        {
          id: 2,
          badge: '🔨 СЦЕНАРИЙ 2',
          name: '«Симфония несущей стены»',
          subtitle: 'Вибро-акустический капремонт в субботу утром',
          targetDamage: 550000,
          timeLimit: 55,
          briefing: [
            'Утро субботы (8:00) — священное время для перфоратора «Макита-Ультра»!',
            'Цель: найти в стене скрытую трубу отопления, уронить пудовую гирю на паркет и включить шансон по батарее, пока Альфа-датчики не вызвали наряд!'
          ],
          steps: [
            { id: 'pipe', desc: 'Пробурить скрытую магистраль в несущей стене [Q]', done: false },
            { id: 'kettlebell', desc: 'Сделать супер-слэм 24-кг гирей на паркет [F]', done: false },
            { id: 'radiator_sound', desc: 'Включить шансон по чугунной батарее [R]', done: false }
          ],
          completed: false
        },
        {
          id: 3,
          badge: '⚡ СЦЕНАРИЙ 3',
          name: '«Кухонный резонанс»',
          subtitle: 'Короткое замыкание, пар и взрыв аппарата',
          targetDamage: 650000,
          timeLimit: 50,
          briefing: [
            'На кухне бурлит самогонный аппарат «Первач-Люкс», а рядом работает умный холодильник BORK.',
            'Цель: устроить цепную реакцию стихий: перегреть аппарат, устроить потоп и замкнуть фазу на холодильнике!'
          ],
          steps: [
            { id: 'still', desc: 'Взорвать самогонный аппарат «Первач-Люкс» [E]', done: false },
            { id: 'fridge', desc: 'Разнести умный холодильник BORK [E]', done: false },
            { id: 'combo_water_electric', desc: 'Устроить комбо: КЗ в воде (Вода + Ток) [⚡]', done: false }
          ],
          completed: false
        },
        {
          id: 4,
          badge: '💥 СЦЕНАРИЙ 4',
          name: '«Тотальный капремонт»',
          subtitle: 'Свободная песочница: разнести всё за 60 секунд',
          targetDamage: 1200000,
          timeLimit: 60,
          briefing: [
            'Никаких ограничений! Полная свобода действий.',
            'Разбейте максимальное количество техники, мебели и труб, чтобы выставить соседям космический счёт!'
          ],
          steps: [
            { id: 'damage_500k', desc: 'Нанести ущерб от 500 000 ₽', done: false },
            { id: 'destroy_robot', desc: 'Уничтожить робот-пылесос гирей 24 кг [F]', done: false },
            { id: 'damage_1m', desc: 'Превысить отметку в 1 000 000 ₽', done: false }
          ],
          completed: false
        }
      ];
    }

    _initInput() {
      window.addEventListener('keydown', e => {
        this.keys[e.code] = true;

        if (this.state === 'PLAYING') {
          if (e.code === 'KeyE') this.triggerActionWrench();
          if (e.code === 'KeyQ') this.startDrilling();
          if (e.code === 'KeyF') this.triggerWeightDrop();
          if (e.code === 'KeyR') this.triggerRadiatorSound();
          if (e.code === 'Space') this.player.jump(6.8);
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
        if (e.target.closest('#hud') || e.target.closest('#modal') || e.target.closest('.interactive-card')) return;
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

        this.camAngleH -= dx * 0.007;
        this.camAngleV = Math.max(0.35, Math.min(1.15, this.camAngleV + dy * 0.006));
        this._updateCameraPosition();
      });

      window.addEventListener('mouseup', () => { isDragging = false; });

      window.addEventListener('wheel', e => {
        if (e.target.closest('#landing-page')) return;
        this.camDistance = Math.max(11, Math.min(26, this.camDistance + e.deltaY * 0.015));
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

      // Срезание стен относительно камеры (cutaway diorama)
      if (this.outerWalls) {
        const camDir = new V3().subVectors(this.camera.position, this.camTarget).normalize();
        this.outerWalls.forEach(wall => {
          const dot = wall.normal.dot(camDir);
          wall.group.visible = dot <= 0.28;
          if (wall.attach) {
            wall.attach.forEach(att => att.visible = wall.group.visible);
          }
        });
      }
    }

    // ---------------- ИГРОВЫЕ ДЕЙСТВИЯ ----------------
    startDrilling() {
      if (this.player.isStunned) return;
      this.isDrillHeld = true;
      this.player.startDrill();
      GN.sound.playDrill(0.5);
    }

    stopDrilling() {
      this.isDrillHeld = false;
      this.drillProgress = 0;
      this.player.stopDrill();
      if (window.GN.UI) window.GN.UI.hideDrillProgress();
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
          if (d < 2.6) {
            sensor.disabled = true;
            sensor.active = false;
            sensor.parts.draw('СБИТ!', false);
            GN.sound.playGlassSmash();
            this.fx.popupText('СБИТ!', sensor.worldPos, '#EF3124');
            this.addDamage(35000, 'Датчик Альфы обезврежен!');
            this.player.say('Не пищи мне тут!', 2);
          }
        }
      });

      // Поиск интерактивного объекта перед Геннадием
      const interactObj = this.getInteractableInFront(2.4);
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
    }

    triggerRadiatorSound() {
      let cd = this.maxCooldowns.music * (this.playerClass === 'music' ? 0.6 : 1.0);
      if (this.cooldowns.music > 0 || this.player.isStunned) return;
      this.cooldowns.music = cd;
      GN.sound.playRadiatorRing();

      const pPos = this.player.position;
      this.fx.ring(pPos, 5.5, '#4be3ff');
      this.fx.shake(0.35, 0.5);
      this.fx.popupText('♫ ШАНСОН ♫', pPos, '#4be3ff');
      this.player.say('Шансон на всю катушку!', 2.2);

      // Разбивает сервиз и вазы в радиусе 5.5 м
      const radius = 5.5;
      this.objects.forEach(obj => {
        if (!obj.broken && (obj.id === 'table' || obj.id === 'shelf')) {
          const d = pPos.distanceTo(obj.worldCenter);
          if (d <= radius) {
            this.damageObject(obj, 100, 'sound');
          }
        }
      });

      this.checkCurrentScenarioStep('radiator_sound');
    }

    getInteractableInFront(maxDist = 2.4) {
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
          if (dot > 0.15 && dist < minD) {
            minD = dist;
            best = obj;
          }
        }
      });

      return best;
    }

    damageObject(obj, amount, source = 'wrench') {
      if (obj.broken) return;

      if (this.fx.shieldActive) {
        this.showShieldBlockedMessage();
        return;
      }

      obj.broken = true;
      let cost = obj.cost;

      // Визуальный слом
      obj.breakFx(this.fx);

      // 3D комикс-всплывашка
      const popupWords = {
        tv: 'КРАШ!', sofa: 'ХРЯСЬ!', table: 'ДЗЫНЬ!', ficus: 'БУХ!',
        shelf: 'ОБВАЛ!', pipe: 'ПРОРЫВ!', radiator: 'КИПЯТОК!',
        kitchen: 'БАБАХ!', still: 'ВЗРЫВ ПАРА!', fridge: 'КЗ-З-З!',
        tub: 'ПОТОП!', toilet: 'БУЛЬК!', washer: 'РАЗНОС!', riser: 'ГЕЙЗЕР!'
      };
      const word = popupWords[obj.id] || 'БАМ!';
      this.fx.popupText(word, obj.worldCenter, '#ffdd33');

      // Звуки
      if (obj.tag.includes('electric')) GN.sound.playSpark();
      if (obj.tag.includes('water')) GN.sound.playWaterSpurt(0.7);
      if (obj.id === 'shelf' || obj.id === 'table') GN.sound.playGlassSmash();

      // Фонтан воды
      if (obj.waterJet) {
        const jetOrigin = obj.group.localToWorld(new V3(obj.waterJet.local[0], obj.waterJet.local[1], obj.waterJet.local[2]));
        const jetDir = new V3(obj.waterJet.dir[0], obj.waterJet.dir[1], obj.waterJet.dir[2]).transformDirection(obj.group.matrixWorld);
        this.fx.addWaterJet(jetOrigin, jetDir, obj.waterJet.speed, obj.waterJet.spread, obj.waterJet.big);

        let floodSpeed = this.playerClass === 'aqua' ? 0.18 : 0.09;
        this.fx.waterTargetHeight = Math.min(0.45, this.fx.waterTargetHeight + floodSpeed);
      }

      // Цепная реакция «Вода + Ток»
      if (obj.tag.includes('electric') && this.fx.waterLevel > 12) {
        this.triggerElectricWaterCombo(obj);
      }

      this.addDamage(cost, obj.name);
      this.checkCurrentScenarioStep(obj.id);
    }

    triggerElectricWaterCombo(sourceObj) {
      this.comboMultiplier = Math.min(5, this.comboMultiplier + 1.5);
      this.comboTimer = 6.0;

      const pPos = this.player.position;
      this.fx.lightningArc(sourceObj.worldCenter, new V3(pPos.x, this.fx.waterHeight, pPos.z));

      this.objects.forEach(other => {
        if (!other.broken && other.tag.includes('electric') && other !== sourceObj) {
          const d = sourceObj.worldCenter.distanceTo(other.worldCenter);
          if (d < 8.5) {
            setTimeout(() => {
              this.fx.lightningArc(sourceObj.worldCenter, other.worldCenter, () => {
                this.damageObject(other, 100, 'electric_chain');
              });
            }, 250);
          }
        }
      });

      this.addDamage(75000, 'КОМБО: КЗ В ВОДЕ (x2.5)!');
      this.fx.popupText('⚡ КОМБО КЗ ⚡', sourceObj.worldCenter, '#4be3ff');
      this.player.say('Опа, фаза на ноль пошла!', 2.5);
      this.checkCurrentScenarioStep('combo_water_electric');
    }

    destroyRobot() {
      this.robot.alive = false;
      this.robot.state = 'DEAD';
      this.robot.parts.body.rotation.z = Math.PI * 0.85;
      this.robot.parts.body.position.y = 0.2;
      this.robot.parts.ledMat.color.set('#222222');
      this.fx.debris(this.robot.pos, '#f2f2f0', 24, 4);
      this.fx.sparkSource(this.robot.pos, 12);
      this.fx.popupText('РАЗДАВЛЕН!', this.robot.pos, '#ff4444');
      GN.sound.playSpark();
      this.addDamage(45000, 'ЧистоБот-9000 уничтожен!');
      this.player.say('Отпылесосил, железка!', 2);
      this.checkCurrentScenarioStep('destroy_robot');
    }

    addDamage(amount, reason = '') {
      const multiplied = Math.round(amount * this.comboMultiplier);
      this.damage += multiplied;

      this.comboMultiplier = Math.min(5, Number((this.comboMultiplier + 0.25).toFixed(2)));
      this.comboTimer = 6.0;

      GN.sound.playCashChime();

      if (window.GN.UI) {
        window.GN.UI.updateDamage(this.damage, multiplied, this.comboMultiplier, reason);
      }

      if (this.damage >= 500000) this.checkCurrentScenarioStep('damage_500k');
      if (this.damage >= 1000000) this.checkCurrentScenarioStep('damage_1m');
    }

    showShieldBlockedMessage() {
      GN.sound.playSensorBeep(false);
      this.player.say('Тьфу, Альфа-Защита стоит!', 2.0);
      this.fx.popupText('0 ₽ (ЩИТ)', this.player.position, '#EF3124');
      if (window.GN.UI) {
        window.GN.UI.showShieldNotification();
      }
    }

    checkCurrentScenarioStep(stepId) {
      const sc = this.scenarios.find(s => s.id === this.selectedScenarioId);
      if (!sc || sc.completed) return;

      const step = sc.steps.find(st => st.id === stepId);
      if (step && !step.done) {
        step.done = true;
        this.player.say('Цель выполнена!', 2.0);

        if (sc.steps.every(s => s.done)) {
          sc.completed = true;
          this.addDamage(100000, `СЦЕНАРИЙ: ${sc.name}`);
          this.fx.popupText('ПОБЕДА!', this.player.position, '#38b000');
          this.player.say('Шах и мат, соседи!', 3.0);
          setTimeout(() => this.finishGame(true), 2500);
        }

        if (window.GN.UI) window.GN.UI.updateScenarioUI(sc);
      }
    }

    // ---------------- ИГРОВОЙ ЦИКЛ ----------------
    animate() {
      requestAnimationFrame(this.animate);
      const dt = Math.min(this.clock.getDelta(), 0.1);

      if (this.state === 'MENU') {
        // Плавное вращение камеры в меню для живой 3D-демонстрации
        this.camAngleH += dt * 0.12;
        this.camTarget.set(0, 1.1, 0);
        this._updateCameraPosition();
        if (this.player) this.player.updateMenuIdle(dt);
      } else if (this.state === 'PLAYING') {
        this._updateTimer(dt);
        this._updatePlayer(dt);
        this._updateRobot(dt);
        this._updateSensors(dt);
        this._updateCombo(dt);
        this._updateCameraFollow(dt);
        this._updateProximityPrompt();
      }

      this.fx.update(dt);
      this.renderer.render(this.scene, this.camera);
    }

    _updateTimer(dt) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.finishGame(false);
      }

      // Проверка уровня воды для сценариев
      if (this.fx.waterLevel > 20) {
        this.checkCurrentScenarioStep('water_level_20');
      }

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
      // Логика зажатия бура [Q] с прогрессом
      if (this.isDrillHeld && !this.player.isStunned) {
        const obj = this.getInteractableInFront(2.2);
        if (obj && !obj.broken) {
          this.drillProgress += dt * 1.5 * (this.playerClass === 'drill' ? 1.6 : 1.0);
          this.fx.sparkSource(this.player.drillBit.getWorldPosition(new V3()), 2);
          this.fx.shake(0.12, 0.1);

          if (window.GN.UI) window.GN.UI.showDrillProgress(this.drillProgress);

          if (this.drillProgress >= 1.0) {
            this.damageObject(obj, 100, 'drill');
            this.stopDrilling();
          }
        } else {
          this.drillProgress = Math.max(0, this.drillProgress - dt * 2.0);
          if (window.GN.UI) window.GN.UI.hideDrillProgress();
        }
      }

      // WASD перемещение
      let dx = 0;
      let dz = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

      if ((dx !== 0 || dz !== 0) && !this.player.isStunned) {
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

        if (!this._checkCollision(nextX, this.player.position.z, this.player.position.y)) {
          this.player.position.x = nextX;
        }
        if (!this._checkCollision(this.player.position.x, nextZ, this.player.position.y)) {
          this.player.position.z = nextZ;
        }

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

    _checkCollision(x, z, playerY = 0, radius = 0.42) {
      if (x < -8.3 || x > 8.3 || z < -5.8 || z > 5.8) return true;

      for (let i = 0; i < this.colliders.length; i++) {
        const c = this.colliders[i];
        if (x + radius > c.x0 && x - radius < c.x1 && z + radius > c.z0 && z - radius < c.z1) {
          // Если игрок выше предмета — позволяем стоять/ходить на нем
          if (c.top && playerY >= c.top - 0.1) {
            continue;
          }
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

      if (distToPlayer < 5.2 && !this.player.isStunned) {
        this.robot.state = 'CHASE';
        this.robot.parts.ledMat.color.set('#ff0033');
      } else if (distToPlayer > 7.5) {
        this.robot.state = 'PATROL';
        this.robot.parts.ledMat.color.set('#45e07a');
      }

      let targetPos;
      let spd;

      if (this.robot.state === 'CHASE') {
        targetPos = pPos;
        spd = this.robot.chaseSpeed;

        if (distToPlayer < 0.85 && !this.player.isStunned) {
          this.player.stun(1.5);
          this.comboMultiplier = 1;
          this.fx.popupText('ТАРАН!', this.player.position, '#ff0033');
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

      const toTarget = new V3().subVectors(targetPos, rPos);
      toTarget.y = 0;
      toTarget.normalize();

      rPos.x += toTarget.x * spd * dt;
      rPos.z += toTarget.z * spd * dt;
      this.robot.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);

      this.robot.parts.brushes.forEach(b => { b.rotation.y += dt * 25; });
    }

    _updateSensors(dt) {
      this.sensorCycleTimer -= dt;

      if (this.sensorCycleTimer <= 0) {
        this.sensorCycleTimer = 22.0;
        const available = this.sensors.filter(s => !s.disabled && !s.active);
        if (available.length > 0) {
          const s = available[(Math.random() * available.length) | 0];
          s.active = true;
          s.timer = 5.0;
          GN.sound.playSensorBeep(true);
          if (window.GN.UI) window.GN.UI.showSensorAlert(s.room);
        }
      }

      this.sensors.forEach(s => {
        if (s.active && !s.disabled) {
          s.timer -= dt;
          s.parts.draw(Math.ceil(s.timer) + 's', true);
          s.parts.ledMat.color.set(Math.sin(Date.now() * 0.02) > 0 ? '#ff1a1a' : '#550000');

          if (s.timer <= 0) {
            s.active = false;
            s.parts.draw('ЩИТ', true);
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
      const p = this.player.position;
      this.camTarget.x += (p.x * 0.55 - this.camTarget.x) * dt * 4.0;
      this.camTarget.z += (p.z * 0.55 - this.camTarget.z) * dt * 4.0;
      this._updateCameraPosition();
    }

    _updateProximityPrompt() {
      const obj = this.getInteractableInFront(2.4);
      if (window.GN.UI) {
        if (obj && !obj.broken) {
          // Проекция координат 3D-объекта в 2D-экранные координаты
          const screenPos = obj.worldCenter.clone().project(this.camera);
          const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

          let actionKey = 'E';
          let actionText = 'Сломать';
          if (obj.id === 'pipe') {
            actionKey = 'Q';
            actionText = 'Зажать бур';
          }
          window.GN.UI.show3DPrompt(x, y, actionKey, `${actionText} (${obj.cost.toLocaleString('ru-RU')} ₽)`);
        } else {
          window.GN.UI.hide3DPrompt();
        }
      }
    }

    // ---------------- УПРАВЛЕНИЕ СОСТОЯНИЕМ ----------------
    selectScenario(id) {
      this.selectedScenarioId = id;
    }

    start(playerClass = 'drill') {
      GN.sound.resume();
      GN.sound.startBGM();

      this.playerClass = playerClass;
      this.state = 'PLAYING';

      const sc = this.scenarios.find(s => s.id === this.selectedScenarioId) || this.scenarios[0];
      this.timeLeft = sc.timeLimit;
      this.damage = 0;
      this.comboMultiplier = 1;

      // Сброс шагов сценария
      sc.steps.forEach(s => s.done = false);
      sc.completed = false;

      // Перемещение персонажа в стартовую позицию
      if (sc.id === 1) this.player.position.set(4.0, 0, 3.0); // старт в ванной
      else if (sc.id === 3) this.player.position.set(3.5, 0, -2.0); // старт на кухне
      else this.player.position.set(-4.0, 0, 2.0); // гостиная

      if (playerClass === 'drill') {
        this.player.say('Перфоратор заряжен, соседи берегитесь!', 2.5);
      } else if (playerClass === 'aqua') {
        this.player.say('Сейчас устроим тут Аквадискотеку!', 2.5);
      } else if (playerClass === 'music') {
        this.player.say('Соседи, встречайте хиты шансона!', 2.5);
      }

      if (window.GN.UI) {
        window.GN.UI.onGameStart(sc);
      }
    }

    finishGame(isVictory = false) {
      this.state = 'GAMEOVER';
      this.player.stopDrill();
      GN.sound.stopBGM();

      const sc = this.scenarios.find(s => s.id === this.selectedScenarioId) || this.scenarios[0];

      if (window.GN.UI) {
        window.GN.UI.showFinalReceipt({
          isVictory,
          scenario: sc,
          totalDamage: this.damage,
          objects: this.objects.filter(o => o.broken),
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
