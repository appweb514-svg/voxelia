// Ciel : soleil/lune, étoiles, nuages voxels, cycle jour/nuit + brouillard
import * as THREE from 'three';
export class Sky {
  constructor(scene) {
    this.t = 0.32; // 0..1 (0=minuit, 0.25=lever, 0.5=midi)
    this.dayLen = 600; // 10 min par jour
    const g = new THREE.Group(); this.g = g;
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.moon = new THREE.DirectionalLight(0x8899ff, 0.0);
    scene.add(this.sun); scene.add(this.moon); scene.add(this.sun.target);
    this.sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xffe066, fog: false }));
    this.moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0xdde6ff, fog: false }));
    scene.add(this.sunMesh); scene.add(this.moonMesh);
    // étoiles
    const n = 400, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.5; p[i * 3] = Math.cos(a) * Math.cos(e) * 400; p[i * 3 + 1] = Math.sin(e) * 400; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 400; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true }));
    scene.add(this.stars);
    // nuages : ~20 boîtes blanches translucides
    this.clouds = new THREE.Group();
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 14, 1.6, 6 + Math.random() * 10), cm);
      m.position.set((Math.random() - 0.5) * 320, 74 + Math.random() * 6, (Math.random() - 0.5) * 320);
      this.clouds.add(m);
    }
    scene.add(this.clouds);
    this.hemi = new THREE.HemisphereLight(0xbdd7ff, 0x6a5a45, 0.9);
    scene.add(this.hemi);
    scene.fog = new THREE.Fog(0x9ecfff, 30, 140);
    scene.background = new THREE.Color(0x87ceeb);
  }
  get isNight() { return this.t < 0.22 || this.t > 0.78; }
  get clock() {
    const h = Math.floor(this.t * 24), m = Math.floor((this.t * 24 - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  update(dt, playerPos) {
    this.t = (this.t + dt / this.dayLen) % 1;
    const ang = this.t * Math.PI * 2 - Math.PI / 2; // soleil tourne
    const sx = Math.cos(ang), sy = Math.sin(ang);
    const px = playerPos.x, pz = playerPos.z;
    this.sun.position.set(px + sx * 120, sy * 120, pz + 40);
    this.sun.target.position.set(px, 0, pz);
    this.moon.position.set(px - sx * 120, -sy * 120, pz - 40);
    const day = Math.max(0, sy);
    const dusk = Math.max(0, 1 - Math.abs(sy) * 4);
    this.sun.intensity = 0.15 + day * 2.1;
    this.moon.intensity = this.isNight ? 0.35 : 0;
    this.hemi.intensity = 0.25 + day * 0.75;
    this.sunMesh.position.set(px + sx * 350, sy * 350, pz + 120);
    this.sunMesh.lookAt(px, 0, pz);
    this.moonMesh.position.set(px - sx * 350, -sy * 350, pz - 120);
    this.moonMesh.lookAt(px, 0, pz);
    this.stars.material.opacity = this.isNight ? 0.9 : 0;
    this.stars.position.set(px, 0, pz);
    // couleurs du ciel
    const sc = this.g.scene ?? null; void sc;
    const sky = new THREE.Color();
    if (this.isNight) sky.setHex(0x0a1028);
    else if (dusk > 0.25) sky.setHex(0xff9a4d).lerp(new THREE.Color(0x87ceeb), 1 - dusk);
    else sky.setHex(0x87ceeb);
    this.bg = sky;
    this.clouds.position.x = (this.clouds.position.x + dt * 1.2) % 320;
    this.clouds.position.z = 0;
    this.clouds.children.forEach(c => { c.position.x = ((c.position.x + dt * 1.2 + 160) % 320) - 160 + px * 0; });
    return { day, dusk };
  }
  applyScene(scene) {
    if (this.bg) { scene.background = this.bg; scene.fog.color.copy(this.bg).lerp(new THREE.Color(0xffffff), 0.1); }
  }
}
