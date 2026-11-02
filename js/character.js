/* ГЕНАСТРОФА — 3D-персонаж «Сосед Геннадий» и процедурные анимации */
(function () {
  const T = GN.Tex;
  const M = GN.M;

  class Gennadiy {
    constructor(scene) {
      this.scene = scene;
      this.group = new THREE.Group();
      this.scene.add(this.group);

      this.position = this.group.position;
      this.rotation = this.group.rotation;

      // Характеристики движения
      this.speed = 4.2;
      this.sprintMult = 1.6;
      this.velocity = new THREE.Vector3();
      this.moveDir = new THREE.Vector3();
      this.facingAngle = 0;
      this.targetAngle = 0;

      // Состояния анимации
      this.isMoving = false;
      this.isSprinting = false;
      this.isGrounded = true;
      this.isDrilling = false;
      this.isSwinging = false;
      this.isDroppingWeight = false;
      this.isStunned = false;
      this.stunTimer = 0;

      this.jumpVy = 0;
      this.animTime = 0;

      // Бабблы с репликами
      this.currentBubble = null;
      this.bubbleTimer = 0;
      this.quotes = [
        'Ща мы тут несущую проверим!',
        'Опа, тёпленькая пошла!',
        'Это не я, это стояк такой был!',
        'А чё, нормальный евроремонт!',
        'Сверлю до победного!',
        'Главное — в проводку не попасть... Ой!',
        'Чисто косметический ремонт!'
      ];

      this._buildModel();
      this._buildSpeechBubble();
    }

    _buildModel() {
      const g = this.group;

      // Корень персонажа
      this.bodyRoot = new THREE.Group();
      g.add(this.bodyRoot);

      // 1. Ноги и ступни
      const pantsMat = new THREE.MeshStandardMaterial({
        map: T.pants(),
        roughness: 0.8
      });
      const skinMat = M.mat('#eac4a6', 0.6);
      const slipperMat = M.mat('#265b99', 0.5);

      // Левая нога
      this.leftLeg = new THREE.Group();
      this.leftLeg.position.set(-0.16, 0.65, 0);
      this.bodyRoot.add(this.leftLeg);

      this.leftThigh = M.cyl(0.09, 0.075, 0.35, pantsMat, 0, -0.175, 0, this.leftLeg, 12);
      this.leftShin = new THREE.Group();
      this.leftShin.position.set(0, -0.35, 0);
      this.leftLeg.add(this.leftShin);

      M.cyl(0.075, 0.065, 0.35, pantsMat, 0, -0.175, 0, this.leftShin, 12);
      // Тапок
      const leftFoot = new THREE.Group();
      leftFoot.position.set(0, -0.35, 0.06);
      this.leftShin.add(leftFoot);
      M.rbox(0.12, 0.06, 0.22, 0.02, slipperMat, 0, 0.03, 0, leftFoot);
      M.box(0.1, 0.03, 0.06, skinMat, 0, 0.065, -0.04, leftFoot);

      // Правая нога
      this.rightLeg = new THREE.Group();
      this.rightLeg.position.set(0.16, 0.65, 0);
      this.bodyRoot.add(this.rightLeg);

      this.rightThigh = M.cyl(0.09, 0.075, 0.35, pantsMat, 0, -0.175, 0, this.rightLeg, 12);
      this.rightShin = new THREE.Group();
      this.rightShin.position.set(0, -0.35, 0);
      this.rightLeg.add(this.rightShin);

      M.cyl(0.075, 0.065, 0.35, pantsMat, 0, -0.175, 0, this.rightShin, 12);
      // Тапок
      const rightFoot = new THREE.Group();
      rightFoot.position.set(0, -0.35, 0.06);
      this.rightShin.add(rightFoot);
      M.rbox(0.12, 0.06, 0.22, 0.02, slipperMat, 0, 0.03, 0, rightFoot);
      M.box(0.1, 0.03, 0.06, skinMat, 0, 0.065, -0.04, rightFoot);

      // 2. Таз и Торс
      this.torso = new THREE.Group();
      this.torso.position.set(0, 0.72, 0);
      this.bodyRoot.add(this.torso);

      // Пояс трико
      M.cyl(0.19, 0.18, 0.12, pantsMat, 0, 0.06, 0, this.torso, 14);

      // Тельняшка (полосатый торс)
      const telnyashkaMat = new THREE.MeshStandardMaterial({
        map: T.stripes('#ffffff', '#1b4a8a', 14, true),
        roughness: 0.8
      });
      this.chest = M.cyl(0.24, 0.2, 0.44, telnyashkaMat, 0, 0.32, 0, this.torso, 16);
      this.chest.scale.set(1.15, 1, 0.85); // Характерное "пивное" пузико

      // 3. Шея и Голова
      M.cyl(0.08, 0.09, 0.1, skinMat, 0, 0.58, 0, this.torso, 12);

      this.head = new THREE.Group();
      this.head.position.set(0, 0.72, 0.02);
      this.torso.add(this.head);

      // Лицо и нос
      M.sph(0.15, skinMat, 0, 0, 0, this.head, 14, 12);
      const nose = M.sph(0.04, M.mat('#e0a588', 0.6), 0, -0.01, 0.16, this.head, 10, 8);
      nose.scale.set(1.2, 1, 1.3);

      // Глаза
      const eyeWhite = M.mat('#ffffff', 0.3);
      const eyePupil = M.mat('#17191C', 0.2);
      [-0.05, 0.05].forEach(x => {
        M.sph(0.022, eyeWhite, x, 0.03, 0.14, this.head, 8, 6);
        M.sph(0.01, eyePupil, x, 0.03, 0.158, this.head, 6, 4);
      });

      // Пышные усы Геннадия
      const mustacheMat = M.mat('#5c3b1e', 0.9);
      const stache = new THREE.Group();
      stache.position.set(0, -0.045, 0.145);
      this.head.add(stache);

      const mLeft = M.cyl(0.025, 0.015, 0.09, mustacheMat, -0.04, 0, 0, stache, 8);
      mLeft.rotation.z = 0.4;
      const mRight = M.cyl(0.025, 0.015, 0.09, mustacheMat, 0.04, 0, 0, stache, 8);
      mRight.rotation.z = -0.4;

      // Строительная оранжевая каска
      const helmetMat = M.mat('#f2780c', 0.35, 0.1);
      const helmet = new THREE.Group();
      helmet.position.set(0, 0.07, 0);
      this.head.add(helmet);

      const dome = M.sph(0.165, helmetMat, 0, 0.02, 0, helmet, 16, 12);
      dome.scale.set(1, 0.75, 1.1);
      // Козырек
      const brim = M.cyl(0.2, 0.2, 0.015, helmetMat, 0, 0.01, 0.04, helmet, 16);
      brim.scale.set(0.9, 1, 1.15);

      // Налобный фонарик на каске
      const lampCase = M.box(0.06, 0.04, 0.03, M.mat('#17191C', 0.5), 0, 0.05, 0.17, helmet);
      const lampGlass = M.cyl(0.02, 0.02, 0.005, M.basic('#ffffcc'), 0, 0.05, 0.186, helmet, 10);
      lampGlass.rotation.x = Math.PI / 2;

      // Прожектор света от фонарика
      this.headlampLight = new THREE.SpotLight(0xfff2a8, 1.8, 12, Math.PI / 5, 0.4, 1.2);
      this.headlampLight.position.set(0, 0.05, 0.2);
      this.headlampLight.target.position.set(0, -1, 5);
      helmet.add(this.headlampLight);
      helmet.add(this.headlampLight.target);

      // 4. Руки и инструмент
      // Левая рука (с разводным ключом)
      this.leftArm = new THREE.Group();
      this.leftArm.position.set(-0.28, 0.46, 0);
      this.torso.add(this.leftArm);

      M.cyl(0.065, 0.055, 0.28, telnyashkaMat, 0, -0.14, 0, this.leftArm, 10);
      this.leftForearm = new THREE.Group();
      this.leftForearm.position.set(0, -0.28, 0);
      this.leftArm.add(this.leftForearm);

      M.cyl(0.055, 0.048, 0.26, skinMat, 0, -0.13, 0, this.leftForearm, 10);
      M.sph(0.045, skinMat, 0, -0.27, 0, this.leftForearm, 8, 6);

      // Красный газовый ключ в левой руке
      this.wrench = new THREE.Group();
      this.wrench.position.set(0, -0.28, 0.06);
      this.wrench.rotation.set(Math.PI / 2, 0, 0);
      this.leftForearm.add(this.wrench);

      const wrenchMat = M.mat('#EF3124', 0.4, 0.4);
      M.box(0.03, 0.32, 0.02, wrenchMat, 0, 0.08, 0, this.wrench);
      M.box(0.06, 0.08, 0.03, wrenchMat, 0.015, 0.22, 0, this.wrench);
      M.box(0.07, 0.04, 0.025, M.mat('#444', 0.3, 0.8), 0.025, 0.26, 0, this.wrench);

      // Правая рука (с ударным перфоратором)
      this.rightArm = new THREE.Group();
      this.rightArm.position.set(0.28, 0.46, 0);
      this.torso.add(this.rightArm);

      M.cyl(0.065, 0.055, 0.28, telnyashkaMat, 0, -0.14, 0, this.rightArm, 10);
      this.rightForearm = new THREE.Group();
      this.rightForearm.position.set(0, -0.28, 0);
      this.rightArm.add(this.rightForearm);

      M.cyl(0.055, 0.048, 0.26, skinMat, 0, -0.13, 0, this.rightForearm, 10);
      M.sph(0.045, skinMat, 0, -0.27, 0, this.rightForearm, 8, 6);

      // Ударный перфоратор «Макита-Ультра»
      this.drillTool = new THREE.Group();
      this.drillTool.position.set(0, -0.28, 0.08);
      this.drillTool.rotation.set(Math.PI / 3, 0, 0);
      this.rightForearm.add(this.drillTool);

      const makitaCyan = M.mat('#008882', 0.4);
      const toolBlack = M.mat('#1f2226', 0.5);
      const steelMat = M.mat('#b5bcc4', 0.2, 0.85);

      // Корпус перфоратора
      M.rbox(0.1, 0.14, 0.26, 0.02, makitaCyan, 0, 0, 0.06, this.drillTool);
      M.box(0.08, 0.12, 0.09, toolBlack, 0, -0.06, -0.03, this.drillTool);
      // Рукоятка
      M.cyl(0.025, 0.025, 0.14, toolBlack, 0, -0.12, -0.02, this.drillTool, 8);
      // Патрон SDS-plus и бур
      M.cyl(0.03, 0.035, 0.08, toolBlack, 0, 0.02, 0.22, this.drillTool, 10).rotation.x = Math.PI / 2;
      this.drillBit = M.cyl(0.012, 0.012, 0.22, steelMat, 0, 0.02, 0.35, this.drillTool, 8);
      this.drillBit.rotation.x = Math.PI / 2;

      // 5. Чугунная гиря 24 кг (активируется при супер-прыжке)
      this.kettlebell = new THREE.Group();
      this.kettlebell.position.set(0, 0.4, 0.35);
      this.kettlebell.visible = false;
      this.bodyRoot.add(this.kettlebell);

      const ironMat = M.mat('#2b2e34', 0.7, 0.2);
      M.sph(0.18, ironMat, 0, 0, 0, this.kettlebell, 14, 12);
      // Ручка гири
      const handle = M.tor(0.11, 0.025, ironMat, 0, 0.17, 0, this.kettlebell, Math.PI);
      // Надпись 24 КГ
      const kbLabel = M.plane(0.14, 0.08, new THREE.MeshBasicMaterial({
        map: T.textPlate(['24', 'КГ'], '#2b2e34', '#e6e6e6', 128, 64, '800 24px Unbounded, sans-serif'),
        transparent: true
      }), 0, 0.02, 0.18, this.kettlebell);
    }

    _buildSpeechBubble() {
      // 3D холст баббла над головой
      this.bubbleCanvas = T.cv(512, 192);
      this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas);
      this.bubbleTex.anisotropy = 4;

      const mat = new THREE.MeshBasicMaterial({
        map: this.bubbleTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      this.bubbleMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.68), mat);
      this.bubbleMesh.position.set(0, 2.1, 0);
      this.bubbleMesh.visible = false;
      this.group.add(this.bubbleMesh);
    }

    say(text, duration = 3.2) {
      const phrase = text || this.quotes[(Math.random() * this.quotes.length) | 0];
      const c = this.bubbleCanvas;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 512, 192);

      // Белое облако с тенью и хвостиком
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#17191C';
      g.lineWidth = 6;

      g.beginPath();
      g.roundRect(10, 10, 492, 140, 24);
      g.fill();
      g.stroke();

      // Хвостик облака
      g.beginPath();
      g.moveTo(230, 150);
      g.lineTo(256, 186);
      g.lineTo(276, 150);
      g.closePath();
      g.fillStyle = '#ffffff';
      g.fill();
      g.stroke();

      // Заливка поверх линии хвостика
      g.fillRect(234, 144, 38, 10);

      // Текст реплики
      g.fillStyle = '#17191C';
      g.font = '800 26px Manrope, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';

      // Перенос строк при необходимости
      const words = phrase.split(' ');
      if (words.length > 4) {
        const mid = Math.ceil(words.length / 2);
        g.fillText(words.slice(0, mid).join(' '), 256, 60);
        g.fillText(words.slice(mid).join(' '), 256, 100);
      } else {
        g.fillText(phrase, 256, 80);
      }

      this.bubbleTex.needsUpdate = true;
      this.bubbleMesh.visible = true;
      this.bubbleTimer = duration;
    }

    update(dt, camera) {
      this.animTime += dt;

      // Ориентация баббла к камере (billboard)
      if (this.bubbleMesh.visible) {
        if (camera) {
          this.bubbleMesh.quaternion.copy(camera.quaternion);
        }
        this.bubbleTimer -= dt;
        if (this.bubbleTimer <= 0) {
          this.bubbleMesh.visible = false;
        }
      }

      // Стан от робота
      if (this.isStunned) {
        this.stunTimer -= dt;
        this.head.rotation.z = Math.sin(this.animTime * 25) * 0.3;
        this.torso.rotation.x = 0.35;
        if (this.stunTimer <= 0) {
          this.isStunned = false;
          this.head.rotation.z = 0;
          this.torso.rotation.x = 0;
        }
        return;
      }

      // Плавный поворот в сторону движения
      if (this.isMoving) {
        const diff = this.targetAngle - this.facingAngle;
        let dNorm = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.facingAngle += dNorm * Math.min(1, dt * 14);
        this.group.rotation.y = this.facingAngle;
      }

      // Гравитация и прыжки
      if (!this.isGrounded) {
        this.position.y += this.jumpVy * dt;
        this.jumpVy -= 22 * dt;
        if (this.position.y <= 0) {
          this.position.y = 0;
          this.isGrounded = true;
          this.jumpVy = 0;
          if (this.isDroppingWeight) {
            this.onWeightLanded && this.onWeightLanded();
            this.isDroppingWeight = false;
            this.kettlebell.visible = false;
          }
        }
      }

      // Процедурные циклы анимаций
      const speedFactor = this.isSprinting ? 1.5 : 1.0;
      const walkFreq = 11 * speedFactor;

      if (this.isMoving && this.isGrounded) {
        const sw = Math.sin(this.animTime * walkFreq);
        // Махи ног
        this.leftLeg.rotation.x = sw * 0.65;
        this.rightLeg.rotation.x = -sw * 0.65;
        this.leftShin.rotation.x = Math.max(0, -sw * 0.5);
        this.rightShin.rotation.x = Math.max(0, sw * 0.5);

        // Покачивание корпуса и таза
        this.torso.position.y = 0.72 + Math.abs(Math.sin(this.animTime * walkFreq)) * 0.05;
        this.torso.rotation.y = sw * 0.08;
        this.torso.rotation.z = Math.cos(this.animTime * walkFreq) * 0.04;

        // Махи рук
        if (!this.isDrilling && !this.isSwinging) {
          this.leftArm.rotation.x = -sw * 0.5;
          this.rightArm.rotation.x = sw * 0.4;
        }
      } else if (this.isGrounded) {
        // Дыхание в покое (idle)
        const idle = Math.sin(this.animTime * 2.2);
        this.torso.position.y = 0.72 + idle * 0.015;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftShin.rotation.x = 0;
        this.rightShin.rotation.x = 0;
        if (!this.isDrilling && !this.isSwinging) {
          this.leftArm.rotation.x = idle * 0.05;
          this.rightArm.rotation.x = -idle * 0.05;
        }
      }

      // Анимация бурения («Q»)
      if (this.isDrilling) {
        const vib = Math.sin(this.animTime * 55) * 0.08;
        this.rightArm.rotation.x = -1.2 + vib;
        this.rightForearm.rotation.x = -0.5 + vib;
        this.drillTool.rotation.x = Math.PI / 2 + vib;
        this.drillBit.rotation.y += dt * 80;
        this.torso.rotation.x = 0.15 + vib * 0.5;
        this.head.rotation.x = 0.2;
      }

      // Анимация удара ключом («E»)
      if (this.isSwinging) {
        this.swingTime += dt;
        const progress = Math.min(1, this.swingTime / 0.28);
        this.leftArm.rotation.x = -Math.sin(progress * Math.PI) * 1.6;
        this.wrench.rotation.z = Math.sin(progress * Math.PI) * 1.2;
        if (progress >= 1) {
          this.isSwinging = false;
        }
      }

      // Анимация гири в воздухе («F»)
      if (this.isDroppingWeight) {
        this.kettlebell.visible = true;
        this.rightArm.rotation.x = -2.2;
        this.leftArm.rotation.x = -2.2;
        this.kettlebell.position.y = 0.95 + Math.sin(this.animTime * 15) * 0.05;
      }
    }

    startDrill() {
      this.isDrilling = true;
    }

    stopDrill() {
      this.isDrilling = false;
      this.rightArm.rotation.set(0, 0, 0);
      this.rightForearm.rotation.set(0, 0, 0);
      this.drillTool.rotation.set(Math.PI / 3, 0, 0);
      this.torso.rotation.x = 0;
      this.head.rotation.x = 0;
    }

    swingWrench() {
      this.isSwinging = true;
      this.swingTime = 0;
    }

    jump(force = 7.5) {
      if (!this.isGrounded) return;
      this.isGrounded = false;
      this.jumpVy = force;
    }

    dropWeight() {
      this.jump(8.5);
      this.isDroppingWeight = true;
    }

    stun(duration = 1.5) {
      this.isStunned = true;
      this.stunTimer = duration;
      this.stopDrill();
      this.say('Ой, заклинило!', 1.5);
    }
  }

  window.GN = window.GN || {};
  window.GN.Gennadiy = Gennadiy;
})();
