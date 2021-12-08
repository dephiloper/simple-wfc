import { Input, IInput } from './input';
import * as THREE from 'three';
import { Clock, OrthographicCamera, Vector3 } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Prototype } from './prototype';
import YAML from 'yaml';

// red:   x
// green: y
// blue:  z
class Game {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  clock: Clock = new Clock();
  camera: OrthographicCamera;
  input: IInput;
  group: THREE.Group;
  loader: GLTFLoader;
  prots: Prototype[];
  timePassed: number = 6;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  index: number = 0;

  public async Init(): Promise<void> {
    this.scene = new THREE.Scene();
    this.loader = new GLTFLoader();
    this.group = new THREE.Group();
    this.input = Input.Instance;

    const ratio: number = window.innerHeight / window.innerWidth;
    const width: number = 40;
    const height: number = width * ratio;

    this.camera = new THREE.OrthographicCamera(
      width / - 2,
      width / 2,
      height / 2,
      height / - 2,
      -1000,
      1000
    );

    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
    this.camera.zoom = 2;
    this.camera.updateProjectionMatrix();

    this.scene.add(this.camera);

    const axesHelper = new THREE.AxesHelper(5);
    this.group.add(axesHelper);

    this.setupLight();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera);
    document.body.appendChild(this.renderer.domElement);

    const yaml = await fetch('./prototypes.yaml');
    this.prots = Prototype.parseFromObject(YAML.parse(await yaml.text()));


    let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
    let neighborMeshes = new THREE.Group();

    setInterval(async () => {
      let prot: Prototype = this.prots[this.index];
      if (mesh) {
        this.group.remove(mesh);
        this.group.remove(neighborMeshes);
      }
      
      mesh = await this.loadMesh(`models/${prot.mesh}`, prot.rotation);
      this.group.add(mesh);
      neighborMeshes = new THREE.Group();

      for (let [index, neighbors] of prot.neighbors) {
        if (neighbors.length == 0) continue;
        const side: Vector3 = Prototype.indexToVec3(index);
        const neighborMesh = await this.loadMesh(`models/${neighbors[0].mesh}`, neighbors[0].rotation);
        neighborMesh.position.add(side.multiplyScalar(3));
        neighborMeshes.add(neighborMesh);
      }
      this.group.add(neighborMeshes);

      this.index = (this.index + 1) % this.prots.length;
    }, 5000);

    this.renderer.setAnimationLoop(async () => await this.process());

    this.scene.add(this.group);
  }

  private setupLight(): void {
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    // this.scene.add(ambientLight);

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    // directionalLight.castShadow = true;
    // directionalLight.position.set(20, 40, 10);
    // this.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 300, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(75, 300, -75);
    this.scene.add(dirLight);
  }

  private async process(): Promise<void> {
    const delta = this.clock.getDelta();
    this.timePassed += delta;
    this.renderer.render(this.scene, this.camera);
    //this.group.rotation.y += delta * 0.2;
  }

  private async loadMesh(mesh: string, rotation: Vector3): Promise<THREE.Mesh> {
    return new Promise<THREE.Mesh>((resolve, reject) => {
      this.loader.load(mesh, (gltf: GLTF): void => {
        // TODO there is no other way of typing here
        const mesh: THREE.Mesh = gltf.scene.children[0] as THREE.Mesh;
        mesh.material = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });

        // TODO check if rotation works
        mesh.rotateX(THREE.MathUtils.degToRad(rotation.x));
        mesh.rotateY(THREE.MathUtils.degToRad(rotation.y));
        mesh.rotateZ(THREE.MathUtils.degToRad(rotation.z));
        resolve(mesh);
      },
        (xhr: ProgressEvent) => { },
        (error: ErrorEvent) => reject(new Error(`An error happened while loading the mesh ${error}`)))
    })
  }
}

const game = new Game();
game.Init();
