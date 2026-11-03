/* ГЕНАСТРОФА — система визуальных эффектов, частиц, затопления и купола защиты */
(function () {
  const GN = window.GN = window.GN || {};
  const T = GN.Tex;

  class FXManager {
    constructor(scene, camera) {
      this.scene = scene;
      this.camera = camera;

      // Списки активных частиц и анимаций
      this.particles = [];
      this.tweens = [];
      this.waterJets = [];
      this.lightnings = [];
      this.decals = [];

      // Тряска камеры
      this.shakeIntensity = 0;
      this.shakeDuration = 0;

      // Уровень затопления
      this.waterLevel = 0; // в процентах 0..100
      this.waterHeight = 0; // в мировых координатах y
      this.waterTargetHeight = 0;

      this._initWaterPlane();
      this._initShieldDome();
    }

    _initWaterPlane() {
      // Полупрозрачный зеркальный меш воды
      const geo = new THREE.PlaneGeometry(17, 12, 32, 24);
      this.waterMat = new THREE.MeshStandardMaterial({
        color: '#2eaae0',
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.75,
        depthWrite: false
      });

      this.waterMesh = new THREE.Mesh(geo, this.waterMat);
      this.waterMesh.rotation.x = -Math.PI / 2;
      this.waterMesh.position.set(0, -0.05, 0); // Чуть ниже пола изначально
      this.waterMesh.receiveShadow = false;
      this.waterMesh.castShadow = false;
      this.scene.add(this.waterMesh);

      this.waterPosAttr = geo.attributes.position;
      this.waterBaseY = new Float32Array(this.waterPosAttr.count);
      for (let i = 0; i < this.waterPosAttr.count; i++) {
        this.waterBaseY[i] = this.waterPosAttr.getZ(i); // Z в PlaneGeometry после ротации станет Y
      }
    }

    _initShieldDome() {
      // Купол защиты «АльфаСтрахование»
      const domeGeo = new THREE.SphereGeometry(10.5, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2);
      this.domeMat = new THREE.MeshBasicMaterial({
        color: '#EF3124',
        wireframe: true,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });

      this.domeMesh = new THREE.Mesh(domeGeo, this.domeMat);
      this.domeMesh.position.set(0, 0, 0);
      this.scene.add(this.domeMesh);

      // Внутреннее свечение купола
      const glowGeo = new THREE.SphereGeometry(10.4, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2);
      this.domeGlowMat = new THREE.MeshBasicMaterial({
        color: '#ff4d40',
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
      });
      this.domeGlow = new THREE.Mesh(glowGeo, this.domeGlowMat);
      this.domeMesh.add(this.domeGlow);

      this.shieldActive = false;
      this.shieldTimer = 0;
    }

    activateShield(duration = 5.0) {
      this.shieldActive = true;
      this.shieldTimer = duration;
      this.domeMat.opacity = 0.55;
      this.domeGlowMat.opacity = 0.18;
      GN.sound.playShieldDome();
    }

    deactivateShield() {
      this.shieldActive = false;
      this.shieldTimer = 0;
      this.domeMat.opacity = 0;
      this.domeGlowMat.opacity = 0;
    }

    // Тряска экрана
    shake(intensity = 0.4, duration = 0.35) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
    }

    // Расширяющееся кольцо ударной волны
    ring(pos, maxRadius = 3.5, color = '#ffffff') {
      const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x, 0.02, pos.z);
      this.scene.add(mesh);

      const anim = {
        time: 0,
        duration: 0.55,
        update: (dt) => {
          anim.time += dt;
          const p = anim.time / anim.duration;
          const s = 1 + p * (maxRadius * 3);
          mesh.scale.set(s, s, s);
          ringMat.opacity = (1 - p) * 0.9;
          if (p >= 1) {
            this.scene.remove(mesh);
            ringGeo.dispose();
            ringMat.dispose();
            return false;
          }
          return true;
        }
      };
      this.tweens.push(anim);
    }

    // Разлетающиеся 3D-осколки
    debris(pos, color, count = 16, force = 4) {
      for (let i = 0; i < count; i++) {
        const size = 0.04 + Math.random() * 0.08;
        const geo = Math.random() > 0.5
          ? new THREE.BoxGeometry(size, size, size)
          : new THREE.TetrahedronGeometry(size);

        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.7
        });

        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.castShadow = true;
        this.scene.add(m);

        const angle = Math.random() * Math.PI * 2;
        const speed = (0.5 + Math.random()) * force;
        const vy = 1.5 + Math.random() * 4;

        this.particles.push({
          mesh: m,
          vx: Math.cos(angle) * speed,
          vy: vy,
          vz: Math.sin(angle) * speed,
          rx: (Math.random() - 0.5) * 15,
          ry: (Math.random() - 0.5) * 15,
          life: 2.2,
          maxLife: 2.2
        });
      }
    }

    // Выброс отдельной части модели (подушка, дверца, вентиль)
    throwPart(mesh, vx, vy, vz, spin = 6) {
      if (!mesh) return;
      // Открепляем от родителя в сцену с сохранением мировой позиции
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      const worldQuat = new THREE.Quaternion();
      mesh.getWorldQuaternion(worldQuat);

      this.scene.add(mesh);
      mesh.position.copy(worldPos);
      mesh.quaternion.copy(worldQuat);

      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        rx: (Math.random() - 0.5) * spin,
        ry: (Math.random() - 0.5) * spin,
        life: 3.5,
        maxLife: 3.5
      });
    }

    // Искры (от перфоратора или КЗ)
    sparkSource(pos, count = 6) {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.02, 6, 4);
        const mat = new THREE.MeshBasicMaterial({ color: '#ffea42' });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        this.scene.add(m);

        const a = Math.random() * Math.PI * 2;
        const sp = 2.5 + Math.random() * 4;
        this.particles.push({
          mesh: m,
          vx: Math.cos(a) * sp,
          vy: 1 + Math.random() * 3.5,
          vz: Math.sin(a) * sp,
          life: 0.35 + Math.random() * 0.3,
          maxLife: 0.65
        });
      }
    }

    // Клубы пара
    steam(pos, count = 18) {
      for (let i = 0; i < count; i++) {
        const size = 0.15 + Math.random() * 0.25;
        const geo = new THREE.IcosahedronGeometry(size, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 1,
          transparent: true,
          opacity: 0.65,
          depthWrite: false
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(
          pos.x + (Math.random() - 0.5) * 0.3,
          pos.y + Math.random() * 0.2,
          pos.z + (Math.random() - 0.5) * 0.3
        );
        this.scene.add(m);

        this.particles.push({
          mesh: m,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 1.2 + Math.random() * 1.8,
          vz: (Math.random() - 0.5) * 0.8,
          scaleRate: 1.8,
          life: 1.2,
          maxLife: 1.2
        });
      }
    }

    // Пыль / пена
    puffs(pos, color, count = 14) {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 8, 6);
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.9,
          transparent: true,
          opacity: 0.8
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        this.scene.add(m);

        const a = Math.random() * Math.PI * 2;
        const s = 1.2 + Math.random() * 2;
        this.particles.push({
          mesh: m,
          vx: Math.cos(a) * s,
          vy: 0.8 + Math.random() * 2,
          vz: Math.sin(a) * s,
          life: 0.9,
          maxLife: 0.9
        });
      }
    }

    // Постоянный гейзер воды от пробитой трубы
    addWaterJet(worldPos, dir, speed = 5.0, spread = 0.2, big = false) {
      const jet = {
        origin: worldPos.clone(),
        dir: dir.clone().normalize(),
        speed,
        spread,
        big,
        spawnTimer: 0
      };
      this.waterJets.push(jet);
      return jet;
    }

    // Разряд молнии между двумя точками (КЗ в воде)
    lightningArc(p1, p2, callback) {
      const points = [];
      const segments = 10;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const pt = new THREE.Vector3().lerpVectors(p1, p2, t);
        if (i > 0 && i < segments) {
          pt.x += (Math.random() - 0.5) * 0.4;
          pt.y += (Math.random() - 0.5) * 0.35 + 0.15;
          pt.z += (Math.random() - 0.5) * 0.4;
        }
        points.push(pt);
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: '#4be3ff',
        linewidth: 3
      });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);

      GN.sound.playSpark();

      let frames = 0;
      const step = () => {
        frames++;
        if (frames > 4) {
          this.scene.remove(line);
          geo.dispose();
          mat.dispose();
          callback && callback();
        } else {
          mat.color.set(frames % 2 === 0 ? '#ffffff' : '#00bfff');
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    }

    // Нанесение декали на пол
    decal(type, x, z, scale = 1.0, rot = 0) {
      const tex = T.decal(type);
      const geo = new THREE.PlaneGeometry(scale, scale);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.92
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.005, z);
      this.scene.add(m);
      this.decals.push(m);
      return m;
    }

    // 3D комикс-всплывашка текста/урона
    popupText(text, pos, color = '#ffdd00') {
      const c = document.createElement('canvas');
      c.width = 384;
      c.height = 128;
      const ctx = c.getContext('2d');

      ctx.font = '900 48px Unbounded, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Жирный черный контур в стиле комиксов
      ctx.strokeStyle = '#17191C';
      ctx.lineWidth = 10;
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;
      ctx.strokeText(text, 192, 64);

      // Яркая цветная заливка
      ctx.fillStyle = color;
      ctx.fillText(text, 192, 64);

      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const geo = new THREE.PlaneGeometry(1.9, 0.65);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y + 0.8, pos.z);
      this.scene.add(mesh);

      let life = 0.9;
      this.tweens.push({
        duration: life,
        update: (dt) => {
          life -= dt;
          mesh.position.y += dt * 1.6;
          if (this.camera) mesh.quaternion.copy(this.camera.quaternion);

          const scale = 1 + Math.sin((1 - life / 0.9) * Math.PI) * 0.25;
          mesh.scale.set(scale, scale, scale);
          mat.opacity = Math.max(0, life / 0.9);

          if (life <= 0) {
            this.scene.remove(mesh);
            geo.dispose();
            mat.dispose();
            tex.dispose();
            return false;
          }
          return true;
        }
      });
    }

    // Вспомогательный твин
    tween(duration, cb, easing = 'easeOut') {
      let elapsed = 0;
      this.tweens.push({
        duration,
        update: (dt) => {
          elapsed += dt;
          let p = Math.min(1, elapsed / duration);
          if (easing === 'bounce') {
            p = p < 0.7 ? (p / 0.7) : (1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.2);
          } else {
            p = 1 - Math.pow(1 - p, 3); // cubic easeOut
          }
          cb(p);
          return elapsed < duration;
        }
      });
    }

    update(dt) {
      // 1. Обновление купола Альфа-Защиты
      if (this.shieldActive) {
        this.shieldTimer -= dt;
        this.domeMesh.rotation.y += dt * 0.4;
        this.domeMat.opacity = 0.4 + Math.sin(Date.now() * 0.008) * 0.15;
        if (this.shieldTimer <= 0) {
          this.deactivateShield();
        }
      }

      // 2. Тряска экрана
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
        const ox = (Math.random() - 0.5) * this.shakeIntensity;
        const oy = (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.x += ox;
        this.camera.position.y += oy;
      }

      // 3. Подъем уровня воды и рябь на волнах
      if (this.waterHeight < this.waterTargetHeight) {
        this.waterHeight = Math.min(this.waterTargetHeight, this.waterHeight + dt * 0.035);
        this.waterMesh.position.y = this.waterHeight;
        this.waterLevel = Math.min(100, (this.waterHeight / 0.4) * 100);
      }

      // Рябь на воде
      if (this.waterHeight > 0.01) {
        const time = Date.now() * 0.003;
        for (let i = 0; i < this.waterPosAttr.count; i++) {
          const x = this.waterPosAttr.getX(i);
          const y = this.waterPosAttr.getY(i);
          const wave = Math.sin(x * 1.8 + time) * Math.cos(y * 1.8 + time) * 0.02;
          this.waterPosAttr.setZ(i, wave);
        }
        this.waterPosAttr.needsUpdate = true;
      }

      // 4. Генерация частиц из гейзеров
      this.waterJets.forEach(jet => {
        jet.spawnTimer += dt;
        if (jet.spawnTimer > 0.04) {
          jet.spawnTimer = 0;
          const count = jet.big ? 4 : 2;
          for (let k = 0; k < count; k++) {
            const geo = new THREE.SphereGeometry(jet.big ? 0.06 : 0.035, 6, 4);
            const mat = new THREE.MeshBasicMaterial({ color: '#7ad0f5', transparent: true, opacity: 0.75 });
            const m = new THREE.Mesh(geo, mat);
            m.position.copy(jet.origin);
            this.scene.add(m);

            const rx = (Math.random() - 0.5) * jet.spread;
            const rz = (Math.random() - 0.5) * jet.spread;
            this.particles.push({
              mesh: m,
              vx: (jet.dir.x + rx) * jet.speed,
              vy: (jet.dir.y + Math.random() * 0.2) * jet.speed,
              vz: (jet.dir.z + rz) * jet.speed,
              life: 1.1,
              maxLife: 1.1,
              isWaterDrop: true
            });
          }
        }
      });

      // 5. Физика частиц
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;

        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          if (p.mesh.geometry) p.mesh.geometry.dispose();
          if (p.mesh.material) p.mesh.material.dispose();
          this.particles.splice(i, 1);
          continue;
        }

        // Движение с гравитацией
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;

        p.vy -= 9.8 * dt; // гравитация

        // Отскок от пола
        const floorY = Math.max(0, this.waterHeight);
        if (p.mesh.position.y <= floorY) {
          p.mesh.position.y = floorY;
          p.vy = -p.vy * 0.35;
          p.vx *= 0.7;
          p.vz *= 0.7;
        }

        // Вращение
        if (p.rx) p.mesh.rotation.x += p.rx * dt;
        if (p.ry) p.mesh.rotation.y += p.ry * dt;

        // Рост пара
        if (p.scaleRate) {
          const s = 1 + (1 - p.life / p.maxLife) * p.scaleRate;
          p.mesh.scale.set(s, s, s);
        }

        // Прозрачность
        if (p.mesh.material && p.mesh.material.transparent) {
          p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
        }
      }

      // 6. Твины
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const active = this.tweens[i].update(dt);
        if (!active) {
          this.tweens.splice(i, 1);
        }
      }
    }
  }

  window.GN = window.GN || {};
  window.GN.FXManager = FXManager;
})();
