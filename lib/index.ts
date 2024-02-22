import RULE from './rules';
import { Transition, AssignmentList } from './interface'
import { debounce } from './utils';

enum CheckResourceList {
  gl = "gl",
  texturesLength = "texturesLength",
  shaderProgram = "shaderProgram",
  shaderCode = "shaderCode"
}

interface Window {
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
}

interface FrameRequestCallback {
  (time: number): void;
}

(function () {
  let lastTime = 0;
  const vendors = ['ms', 'moz', 'webkit', 'o'];

  for (let x = 0; x < vendors.length && !window.requestAnimationFrame; x++) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback: FrameRequestCallback): number {
      const currTime = new Date().getTime();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = window.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id: number): void {
      clearTimeout(id);
    };
  }
})();

// https://www.khronos.org/webgl/wiki/HandlingContextLost#:~:text=By%20default%20when%20a%20WebGL%20program%20loses%20the,canvas%20%3D%20document.getElementById%20%28%22myCanvas%22%29%3B%20canvas.addEventListener%20%28%22webglcontextlost%22%2C%20function%20

// https://registry.khronos.org/webgl/specs/latest/1.0/#5.15.3

interface Config {
  parentId: string,
  transitionList: Transition[],
  playPicUrlList?: string[],
  playPicList?: HTMLImageElement[],
  carouselTime?: number,
  watchResize?: boolean,
}

enum PlayStatus {
  playing = 'playing',
  pause = 'pause',
  stop = 'stop',
}

interface ResizeSize {
  width: number;
  height: number;
}

export class WebglTransitions {
  private numberOfLostContext = 0;
  private analogLossContentCounts = 0;
  private parentDom: HTMLDivElement;
  private aspect: number = 0; // 画布长宽比，用于父容器大小变化时重新设置高度
  private canvasId: string = '';
  private canvas: HTMLCanvasElement | null = null;
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;
  public firstInit = true;
  public intervalTime = 100; // 过渡动画多少毫秒绘制一帧
  public timer: NodeJS.Timeout | undefined | null = undefined;
  public vsSource = '';
  public fsSource = '';
  public assignmentList: AssignmentList[] = [];
  public gl: WebGLRenderingContext | null;
  public textures: WebGLTexture[] = [];
  public playIndex = 0;
  public transitionList!: Transition[];
  public playPicIndex = 0; // 轮播次数
  public playPicPreloadList: HTMLImageElement[] = []; // 轮播图片预加载存储列表
  public playStatus: PlayStatus = PlayStatus.stop;
  public stopPlaying = false;
  public shaderProgram: WebGLProgram | null = null;
  public vertexBuffer: WebGLBuffer | null = null;
  public animationId!: number;
  public progress = 0.0;
  private resizeObserver!: ResizeObserver | null;
  private config: Config;
  private onResizeCallback: (() => void) | null = null;
  // 默认值
  defaultConfig = {
    playPicUrlList: [],
    playPicList: [],
    carouselTime: 3000, // 轮播间隔时间, 单位ms
    watchResize: false, // 默认不监听父容器大小变化且重绘
  }


  // constructor(parentId: string, transitionList: Transition[], playPicList: string[] | HTMLImageElement[], carouselTime?: number) {
  constructor(config: Config) {
    this.config = { ...this.defaultConfig, ...config };
    this.checkInitResource();
    this.canvasId = `webgl-transition-${Math.random().toString().slice(2, 10)}`;

    this.canvas = document.createElement("canvas");
    this.canvas.id = this.canvasId;
    const parentDom = document.querySelector(this.config.parentId);
    if (parentDom instanceof HTMLDivElement) {
      this.parentDom = parentDom;
    } else {
      throw new Error('WebglTransitions初始化失败, parentId必须是div元素的id');
    }

    this.onWatchResize();


    const { clientWidth, clientHeight } = this.parentDom;
    this.canvas.width = clientWidth;
    this.canvas.height = clientHeight;
    this.aspect = this.canvas.width / this.canvas.height;

    this.parentDom.appendChild(this.canvas);

    this.gl = this.canvas.getContext('webgl') as WebGLRenderingContext;

    if (!this.gl) {
      console.error('无法初始化WebGL, 您的浏览器或机器可能不支持它。');
      return;
    }

    let that = this;
    this.canvas.addEventListener("webglcontextlost", function (event) {
      console.log("WebGL上下文丢失");

      // inform WebGL that we handle context restoration通知WebGL我们处理上下文恢复
      event.preventDefault();
      console.log('3秒后重新渲染');

      that.timer && clearTimeout(that.timer);
      that.timer = setTimeout(() => {
        that.restart()
      }, 3000)

      // Stop rendering
      // window.cancelAnimationFrame(requestId);
    }, false);

    // 若传入图片，则使用传入的图片对象
    if (this.config.playPicList!.length) {
      this.asyncLoadImageSelf(this.config.playPicList!);
    }

  };

  // 监听父容器大小变化
  onWatchResize() {
    if (this.config.watchResize) {
      this.resizeObserver = new ResizeObserver(debounce(() => {
        this.onResize()
      }, 300));
      this.resizeObserver.observe(this.parentDom);
    }
  }

  onResize(resizeSize?: ResizeSize) {
    // 外部手动传入宽高时使用外部数据，否则使用内部获取父元素的宽高
    const { width, height } = resizeSize ? resizeSize : { width: this.parentDom.clientWidth, height: this.parentDom.clientHeight };
    if (this.canvas!.width === Math.ceil(width) && this.canvas!.height === Math.ceil(height))
        return;

    this.setViewPort(0, 0, width, height);
    
    // 当缩放时，触发回调函数
    this.triggerResizeCallback();

    this.playStatus === PlayStatus.playing && this.startAnimationLoop();
  }

  setViewPort(x: number, y: number, width: number, height: number) {
    this.canvas!.width = width;
    this.canvas!.height = height;
    this.gl!.viewport(x, y, this.canvas!.width, this.canvas!.height);
  }

  // 外部实例调用该方法来设置resize时的回调函数
  setOnResizeCallback(callback: () => void) {
    this.onResizeCallback = callback;
  }

  private triggerResizeCallback() {
    if (this.onResizeCallback) {
      this.onResizeCallback();
    }
  }


  // 初始化校验
  checkInitResource() {
    const { parentId, transitionList, playPicList, playPicUrlList } = this.config;
    if (!parentId || typeof parentId !== 'string') {
      throw new Error('WebglTransitions初始化失败, 缺少Dom元素ID');
    }
    if (transitionList?.length < 1) {
      throw new Error('WebglTransitions初始化失败, 至少需要1种转场动画');
    }
    if (playPicList!.length + playPicUrlList!.length === 0) {
      throw new Error('WebglTransitions初始化失败, 缺少转场图片。参数：playPicList/playPicUrlList');
    } else if (playPicList!.length + playPicUrlList!.length < 2) {
      throw new Error('至少需要2张图片');
    }
  }

  asyncLoadImage() {
    // 遍历数组的路径，预加载到浏览器中
    return new Promise((resolve: any) => {
      let c = 0;
      for (let i = 0; i < this.config.playPicUrlList!.length; i++) {
        const img = new Image();

        img.setAttribute('crossOrigin', 'Anonymous');

        img.onload = () => {
          c++;
          this.playPicPreloadList.push(img);
          if (this.playPicPreloadList.length === this.config.playPicUrlList!.length + this.config.playPicList!.length) {
            console.log('加载的图片列表：', this.playPicPreloadList);
            resolve(1);
          }
        };
        img.onerror = () => {
          throw new Error('图片加载失败');
        };
        img.src = this.config.playPicUrlList![i];
      }
    });
  }

  // 自定义图片加载, 需要返回Image的数组
  asyncLoadImageSelf(imagesList: HTMLImageElement[]) {
    this.playPicPreloadList = [...this.playPicPreloadList, ...imagesList];
  }

  creatFirstTexture() {
    const textureRef = this.createTexture(this.gl!.LINEAR, this.playPicPreloadList[this.playPicIndex]);
    this.gl!.activeTexture(this.gl!.TEXTURE0);
    this.gl!.bindTexture(this.gl!.TEXTURE_2D, textureRef);
    textureRef && this.textures.push(textureRef);
  }
  creatSecondTexture() {
    const textureRef1 = this.createTexture(this.gl!.LINEAR, this.playPicPreloadList[this.playPicIndex + 1 === this.playPicPreloadList.length ? 0 : this.playPicIndex + 1]);
    this.gl!.activeTexture(this.gl!.TEXTURE1);
    this.gl!.bindTexture(this.gl!.TEXTURE_2D, textureRef1);
    textureRef1 && this.textures.push(textureRef1);
  }

  startCarousel() {

    this.playStatus = PlayStatus.playing;

    this.checkResource([CheckResourceList.gl, CheckResourceList.shaderProgram]);

    const animate = () => {

      if (!this.gl || this.playStatus != PlayStatus.playing) {
        return;
      }

      this.animationId = window.requestAnimationFrame(animate);

      const progress = this.gl!.getUniformLocation(this.shaderProgram!, 'progress');
      this.gl!.uniform1f(progress, this.progress);

      for (let i = 0; i < this.assignmentList.length; i++) {
        const e = this.assignmentList[i];
        const length = e.value.length;
        switch (length) {
          case 1:
            this.gl!.uniform1f(this.gl!.getUniformLocation(this.shaderProgram!, e.key), e.value[0]);
            break;
          case 2:
            this.gl!.uniform2f(this.gl!.getUniformLocation(this.shaderProgram!, e.key), e.value[0], e.value[1]);
            break;
          case 3:
            this.gl!.uniform3f(this.gl!.getUniformLocation(this.shaderProgram!, e.key), e.value[0], e.value[1], e.value[2]);
            break;
          case 4:
            this.gl!.uniform4f(this.gl!.getUniformLocation(this.shaderProgram!, e.key), e.value[0], e.value[1], e.value[2], e.value[3]);
            break;
          default:
            break;
        }
      }

      this.gl!.drawArrays(this.gl!.TRIANGLE_STRIP, 0, 4);

      // 循环控制器
      if (this.progress >= 1.0) {
        this.cancelAnimation();
        this.progress = 0.0;

        // 设置过渡图片
        this.playPicIndex === this.playPicPreloadList.length - 1 ? this.playPicIndex = 0 : this.playPicIndex += 1;
        // 设置过渡动画类型
        this.playIndex === this.config.transitionList.length - 1 ? this.playIndex = 0 : this.playIndex += 1;

        this.clearNextAnimation();
        this.timer = setTimeout(() => {
          this.main();
        }, this.config.carouselTime);
        return;

      }

      this.progress += 0.01;
    }

    animate();
  }

  checkResource(checkResourceList: CheckResourceList[]): boolean {
    let checkBoo = true;

    if (checkResourceList.includes(CheckResourceList.gl) && !this.gl) {
      checkBoo = false;
    }

    if (checkResourceList.includes(CheckResourceList.shaderProgram) && this.textures.length === 2) {
      if (!this.shaderProgram) {
        console.error('shaderProgram初始化失败');
        checkBoo = false;
      }
    }

    if (checkResourceList.includes(CheckResourceList.shaderCode) && (!this.vertexShader || !this.fragmentShader)) {
      checkBoo = false;
    }

    return checkBoo;
  }

  startAnimationLoop() {
    this.cancelAnimation();
    this.startCarousel();
  }

  cancelAnimation() {
    window.cancelAnimationFrame(this.animationId);
  }

  async main() {
    // console.log('贴图顺序信息', this.playPicPreloadList.map((o: HTMLImageElement) => {
    //   return o.currentSrc
    // }));

    if (!this.checkResource([CheckResourceList.gl])) {
      return false;
    }
    const transition = this.config.transitionList[this.playIndex];
    // console.log('当前动画', this.playIndex, transition);

    this.intervalTime = transition.intervalTime || 100;
    this.vsSource = transition.vsSource;
    this.fsSource = transition.fsSource;
    this.assignmentList = transition.assignmentList;

    this.initShaderProgram();
    if (!this.shaderProgram) {
      console.log('shaderProgram初始化失败');
      return false;
    }
    if (this.firstInit) {
      this.gl!.clearColor(0.0, 0.0, 0.0, 0.0); // Clear to black, fully opaque/
      this.gl!.clearDepth(1.0); // Clear everything
      this.gl!.clear(this.gl!.COLOR_BUFFER_BIT | this.gl!.DEPTH_BUFFER_BIT);
      this.firstInit = false;
    }
    this.gl!.viewport(0, 0, this.gl!.canvas.width, this.gl!.canvas.height);
    this.gl!.useProgram(this.shaderProgram);

    // 开始绘制
    const vertices = new Float32Array([-1.0, 1.0, 0.0, 1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 0.0]);
    const FSIZE = vertices.BYTES_PER_ELEMENT;
    this.vertexBuffer = this.gl!.createBuffer();
    this.gl!.bindBuffer(this.gl!.ARRAY_BUFFER, this.vertexBuffer);
    this.gl!.bufferData(this.gl!.ARRAY_BUFFER, vertices, this.gl!.STATIC_DRAW);
    const a_Position = this.gl!.getAttribLocation(this.shaderProgram, 'a_Position');
    const a_TexCoord = this.gl!.getAttribLocation(this.shaderProgram, 'a_TexCoord');
    this.gl!.vertexAttribPointer(a_Position, 2, this.gl!.FLOAT, false, FSIZE * 4, 0);
    this.gl!.vertexAttribPointer(a_TexCoord, 2, this.gl!.FLOAT, false, FSIZE * 4, FSIZE * 2);
    this.gl!.enableVertexAttribArray(a_Position);
    this.gl!.enableVertexAttribArray(a_TexCoord);

    // 设置三角形的颜色
    const u_color = this.gl!.getUniformLocation(this.shaderProgram, 'u_color');
    this.gl!.uniform4f(u_color, 1.0, 1.0, 1.0, 1.0);
    const u_Sampler = this.gl!.getUniformLocation(this.shaderProgram, 'u_Sampler');
    const u_Sampler1 = this.gl!.getUniformLocation(this.shaderProgram, 'u_Sampler1');
    const shadowColour = this.gl!.getUniformLocation(this.shaderProgram, 'shadow_colour');
    const shadowHeight = this.gl!.getUniformLocation(this.shaderProgram, 'shadow_height');
    const bounces = this.gl!.getUniformLocation(this.shaderProgram, 'bounces');

    this.gl!.uniform4f(shadowColour, 0.0, 0.0, 0.0, 0.6);
    this.gl!.uniform1f(shadowHeight, 0.075);
    this.gl!.uniform1f(bounces, 3.0);

    // 只初始化获取一次图片资源
    // if (this.playPicPreloadList.length != this.config.playPicUrlList!.length) {
    //   if (this.playPicPreloadList.length != this.config.playPicUrlList!.length) {
    //   await Promise.all([this.asyncLoadImage()]);
    // }
    if (this.playPicPreloadList.length != this.config.playPicUrlList!.length + this.config.playPicList!.length) {
      await Promise.all([this.asyncLoadImage()]);
    }
    if (this.textures.length === 2) {
      this.gl!.deleteTexture(this.textures[1]);
      this.gl!.deleteTexture(this.textures[0]);
      this.textures = [];
    }
    this.creatFirstTexture();
    this.creatSecondTexture();

    this.gl!.uniform1i(u_Sampler, 0); // texture unit 0
    this.gl!.activeTexture(this.gl!.TEXTURE0);
    this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.textures[1]);

    this.gl!.uniform1i(u_Sampler1, 1); // texture unit 1
    this.gl!.activeTexture(this.gl!.TEXTURE1);
    this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.textures[0]);

    // 开始轮播
    this.startAnimationLoop();

  }

  initShaderProgram() {
    this.loadVertexShader(this.vsSource);
    this.loadFragmentShader(this.fsSource);

    if (!this.checkResource([CheckResourceList.shaderCode])) {
      return false;
    }
    // 如果保留下面，则会黑色背景
    // if (!this.gl) {
    //   return false;
    // }

    this.shaderProgram = this.gl!.createProgram() as WebGLProgram;

    if (!this.shaderProgram) {
      console.log('shaderProgram初始化失败', this.vertexShader, this.fragmentShader, this.shaderProgram);
      return false;
    }

    this.gl!.attachShader(this.shaderProgram, this.vertexShader!);
    this.gl!.attachShader(this.shaderProgram, this.fragmentShader!);
    this.gl!.linkProgram(this.shaderProgram);

    if (!this.gl!.getProgramParameter(this.shaderProgram, this.gl!.LINK_STATUS)) {
      // alert('无法初始化着色器程序: ' + this.gl.getProgramInfoLog(shaderProgram));
      return null;
    }
  }

  createTexture(filter: any, data: HTMLImageElement): WebGLTexture | null {
    if (!this.gl) {
      return false;
    }
    const textureRef = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, textureRef);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, filter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
    return textureRef;
  }

  loadVertexShader(source: string): void {
    if (!this.vertexShader) {
      this.vertexShader = this.gl!.createShader(this.gl!.VERTEX_SHADER) as WebGLShader;
    }

    this.gl!.shaderSource(this.vertexShader, source);
    this.gl!.compileShader(this.vertexShader);

    if (!this.gl!.getShaderParameter(this.vertexShader, this.gl!.COMPILE_STATUS)) {
      console.log('编译顶点着色器失败，状态码：', this.gl!.COMPILE_STATUS);
      console.error('编译顶点着色器时发生错误: ', this.gl!.getShaderInfoLog(this.vertexShader));
      this.gl!.deleteShader(this.vertexShader);
    }
  }

  loadFragmentShader(source: string): void {
    if (!this.fragmentShader) {
      this.fragmentShader = this.gl!.createShader(this.gl!.FRAGMENT_SHADER) as WebGLShader;
    }

    this.gl!.shaderSource(this.fragmentShader, source);
    this.gl!.compileShader(this.fragmentShader);

    if (!this.gl!.getShaderParameter(this.fragmentShader, this.gl!.COMPILE_STATUS)) {
      console.log('编译顶点着色器失败，状态码：', this.gl!.COMPILE_STATUS);
      console.error('编译片元着色器时发生错误: ', this.gl!.getShaderInfoLog(this.fragmentShader));
      this.gl!.deleteShader(this.fragmentShader);
    }
  }

  // 模拟丢失上下文
  simulatedLostContext() {
    if (this.gl && this.gl.getExtension('WEBGL_lose_context')) {

      ++this.analogLossContentCounts;
      if (!this.gl || this.analogLossContentCounts > 1) {
        return;
      }
      const webglLoseContext = this.gl.getExtension('WEBGL_lose_context');
      webglLoseContext && webglLoseContext.loseContext();
      console.clear();
      console.log('模拟丢失');
      this.cancelAnimation();

      this.numberOfLostContext = 0;
      return;
    }
  }

  stop() {
    this.playStatus = PlayStatus.stop;
    this.cancelAnimation();
  }

  pause() {
    this.playStatus = PlayStatus.pause;
    this.cancelAnimation();
    this.clearNextAnimation();
  }

  continue() {
    // 处于等待下个动画间隙时，需要使用main方法设置图片和动画下标，未完成此轮动画时才调用startCarousel继续执行过渡动画
    if (this.progress === 0.0) {
      this.main();
    } else {
      this.startCarousel();
    }
  }

  private restart() {
    // 释放旧的gl上下文资源
    this.dispose();

    let that = this;
    console.log('restart webgl transition...');
    this.analogLossContentCounts = 0;

    const el = document.querySelector(this.config.parentId);
    if (el) {
      const childs = el.children;
      for (let i = childs.length - 1; i >= 0; i--) {
        if (RULE.webglTransitionParent.pattern.test(childs[i].id)) {
          el.removeChild(childs[i]);
        }
      }
    }

    this.canvasId = `webgl-transition-${Math.random().toString().slice(2, 10)}`;
    this.canvas = document.createElement("canvas");
    this.canvas.id = this.canvasId;
    const parent = document.querySelector(this.config.parentId);
    // const {clientWidth, clientHeight} = {clientWidth: parent?.clientWidth | 1920, clientHeight: 1080};
    document.querySelector(this.config.parentId)?.appendChild(this.canvas);
    // debugger
    this.canvas.width = parent ? parent.clientWidth : 1920;
    this.canvas.height = parent ? parent.clientHeight : 1080;
    // console.log('新的canvas', this.canvas);

    // https://blog.csdn.net/qq_30100043/article/details/74127228
    //添加事件监听

    this.canvas.addEventListener("webglcontextlost", function () {
      ++that.numberOfLostContext;

      // 注释可以一直重新初始化
      // if(that.numberOfLostContext > 1){
      //   that.numberOfLostContext = 0;
      //   return;
      // }

      if (that.numberOfLostContext > 1) {
        return;
      }

      console.log('2次监听');
      that.restart();
    });

    this.gl = this.canvas.getContext('webgl') as WebGLRenderingContext;

    if (!this.gl) {
      console.error('无法重新初始化WebGL, 您的浏览器或机器可能不支持它。');
      return;
    }

    this.clearNextAnimation();
    this.timer = setTimeout(() => {
      this.main();
    }, 1000)
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.gl) {
      // console.log('清空gl资源');
      // https://www.daicuo.cc/biji/357969
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
      this.vertexBuffer && this.gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer && (this.vertexBuffer = null);
      this.gl.deleteProgram(this.shaderProgram);
      this.gl.deleteShader(this.vertexShader);
      this.gl.deleteShader(this.fragmentShader);
      this.gl.deleteTexture(this.textures[1]);
      this.gl.deleteTexture(this.textures[0]);
    }

    this.firstInit = true;
    this.vsSource = '';
    this.fsSource = '';
    this.playPicPreloadList = [];
    this.shaderProgram = null;
    this.vertexShader = null;
    this.fragmentShader = null;
    this.gl = null;
    this.textures = [];
    this.playIndex = 0;
    this.playPicIndex = 0;

    // 移除画布
    const el = document.querySelector(`#${this.canvasId}`);
    if (el?.parentNode) {
      el.parentNode.removeChild(el)
    }

    this.canvas = null;
  }

  // 清除下次过渡动画
  clearNextAnimation() {
    this.timer && clearTimeout(this.timer);
  }

}