import RULE from './rules';
import { Transition, AssignmentList, ParentDom } from './interface'
import { isArrayOfStrings, debounce } from './utils';

enum CheckResourceList {
  gl = "gl",
  texturesLength = "texturesLength",
  shaderProgram = "shaderProgram",
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

export class WebglTransitions {
  private loadImageSelf = false;
  private numberOfLostContext = 0;
  private analogLossContentCounts = 0;
  private parentDom: HTMLDivElement;
  // private parent: ParentDom = { domId: '', width: undefined, height: undefined };
  // private parent: ParentDom = { domId: '', width: undefined, height: undefined };
  private parentId: string = '';
  private aspect: number = 0; // 画布长宽比，用于父容器大小变化时重新设置高度
  private canvasId: string = '';
  private canvas: HTMLCanvasElement | null = null;
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;
  public firstInit = true;
  public intervalTime = 100; // 过渡动画多少毫秒绘制一帧
  public vsSource = '';
  public fsSource = '';
  public assignmentList: AssignmentList[] = [];
  public gl: WebGLRenderingContext | null;
  public textures: WebGLTexture[] = [];
  public playIndex = 0;
  public transitionList!: Transition[];
  public playPicIndex = 0; // 轮播次数
  public carouselTime!: number; // 轮播间隔时间, 单位ms
  public playPicList: string[] = []; // 轮播图片
  public playPicPreloadList: HTMLImageElement[] = []; // 轮播图片预加载存储列表
  public stopPlaying = false;
  public shaderProgram: WebGLProgram | null = null;
  public vertexBuffer: WebGLBuffer | null = null;
  public animationId!: number;
  public myI = 0.0;
  private resizeObserver!: ResizeObserver | null;
  private watchResize = false; // 默认不监听父容器大小变化且重绘


  constructor(parentId: string, transitionList: Transition[], playPicList: string[] | HTMLImageElement[], carouselTime?: number) {
    this.checkInitResource(parentId, transitionList, playPicList);
    this.canvasId = `webgl-transition-${Math.random().toString().slice(2, 10)}`;
    this.parentId = parentId;

    this.canvas = document.createElement("canvas");
    this.canvas.id = this.canvasId;
    const parentDom = document.querySelector(parentId);
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

      setTimeout(() => {
        that.restart()
      }, 3000)

      // Stop rendering
      // window.cancelAnimationFrame(requestId);
    }, false);

    this.transitionList = transitionList;
    if (isArrayOfStrings(playPicList)) {
      this.playPicList = playPicList;
    } else {
      this.asyncLoadImageSelf(playPicList);
    }
    this.carouselTime = carouselTime || 3000;

  };

  // 监听父容器大小变化
  onWatchResize() {
    if (this.watchResize) {
      this.resizeObserver = new ResizeObserver(debounce(() => {
        this.onResize()
      }, 300));
      this.resizeObserver.observe(this.parentDom);
    }
  }

  onResize(width?: number, height?: number) {
    if (width && height) {
      this.canvas!.width = width;
      this.canvas!.height = height;

      this.gl!.viewport(0, 0, width, height);
    } else {
      const { clientWidth } = this.parentDom;
      this.canvas!.width = clientWidth;
      this.canvas!.height = clientWidth / this.aspect;

      this.gl!.viewport(0, 0, this.gl!.canvas.width, this.gl!.canvas.height);
    }

    this.startAnimationLoop();
  }


  // 初始化校验
  checkInitResource(domId: string, transitionList: Transition[], playPicList: string[] | HTMLImageElement[]) {
    if (!domId || typeof domId !== 'string') {
      throw new Error('WebglTransitions初始化失败, 缺少Dom元素ID');
    }
    if (transitionList?.length < 1) {
      throw new Error('WebglTransitions初始化失败, 至少需要1种转场动画');
    }
    if (playPicList?.length === 0) {
      throw new Error('WebglTransitions初始化失败, 缺少参数playPicList转场图片');
    } else if (playPicList?.length < 2) {
      throw new Error('至少需要2张图片');
    }
  }

  asyncLoadImage() {
    // 遍历数组的路径，预加载到浏览器中
    return new Promise((resolve: any) => {
      let c = 0;
      for (let i = 0; i < this.playPicList.length; i++) {
        const img = new Image();

        img.src = this.playPicList[i];
        img.setAttribute('crossOrigin', 'Anonymous');

        img.onload = () => {
          c++;
          this.playPicPreloadList.push(img);
          if (this.playPicPreloadList.length === this.playPicList.length) {
            resolve(1);
          }
        };
      }
    });
  }

  // 自定义图片加载, 需要返回Image的数组
  asyncLoadImageSelf(imagesList: HTMLImageElement[]) {
    this.loadImageSelf = true;
    this.playPicPreloadList = imagesList;
  }

  creatFirstTexture() {
    // this.checkResource([CheckResourceList.gl]);
    const textureRef = this.createTexture(this.gl!.LINEAR, this.playPicPreloadList[this.playPicIndex]);
    this.gl!.activeTexture(this.gl!.TEXTURE0);
    this.gl!.bindTexture(this.gl!.TEXTURE_2D, textureRef);
    textureRef && this.textures.push(textureRef);
  }
  creatSecondTexture() {
    // this.checkResource([CheckResourceList.gl]);
    const textureRef1 = this.createTexture(this.gl!.LINEAR, this.playPicPreloadList[this.playPicIndex + 1 === this.playPicPreloadList.length ? 0 : this.playPicIndex + 1]);
    this.gl!.activeTexture(this.gl!.TEXTURE1);
    this.gl!.bindTexture(this.gl!.TEXTURE_2D, textureRef1);
    textureRef1 && this.textures.push(textureRef1);
  }

  startCarousel() {

    this.checkResource([CheckResourceList.gl, CheckResourceList.shaderProgram]);

    const animate = () => {
      this.animationId = window.requestAnimationFrame(animate);

      const progress = this.gl!.getUniformLocation(this.shaderProgram!, 'progress');
      this.gl!.uniform1f(progress, this.myI);

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
      if (this.myI >= 1.0) {

        this.cancelAnimation();
        this.myI = 0.0;

        // 设置过渡图片
        this.playPicIndex === this.playPicPreloadList.length - 1 ? this.playPicIndex = 0 : this.playPicIndex += 1;
        // 设置过渡动画类型
        this.playIndex === this.transitionList.length - 1 ? this.playIndex = 0 : this.playIndex += 1;

        setTimeout(() => {
          this.main();
        }, this.carouselTime);

      }

      this.myI += 0.01;

      if (!this.gl || this.stopPlaying) {
        return;
      }

    }

    animate();
  }

  checkResource(checkResourceList: CheckResourceList[]) {
    if (checkResourceList.includes(CheckResourceList.gl) && !this.gl) {
      return;
    }

    if (checkResourceList.includes(CheckResourceList.shaderProgram) && this.textures.length === 2) {
      if (!this.shaderProgram) {
        console.error('shaderProgram失败');
        return;
      }
    }
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

    this.checkResource([CheckResourceList.gl]);
    const transition = this.transitionList[this.playIndex];
    // console.log('当前动画', this.playIndex, transition);
    // console.log('当前动画', transition, this.playIndex);

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
    if (!this.loadImageSelf && this.playPicPreloadList.length != this.playPicList.length) {
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

    if (!this.vertexShader || !this.fragmentShader) {
      return false;
    }

    if (!this.gl) {
      return false;
    }

    this.shaderProgram = this.gl.createProgram() as WebGLProgram;

    if (!this.shaderProgram) {
      console.log('createProgram失败，可能上下文丢失', this.vertexShader, this.fragmentShader, this.shaderProgram);
      return false;
    }

    this.gl.attachShader(this.shaderProgram, this.vertexShader);
    this.gl.attachShader(this.shaderProgram, this.fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
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
    this.checkResource([CheckResourceList.gl]);
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
    this.checkResource([CheckResourceList.gl]);
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
    this.stopPlaying = true;
    this.cancelAnimation();
  }

  private restart() {
    // 释放旧的gl上下文资源
    this.dispose();

    let that = this;
    console.log('restart webgl transition...');
    this.analogLossContentCounts = 0;

    const el = document.querySelector(this.parentId);
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
    const parent = document.querySelector(this.parentId);
    // const {clientWidth, clientHeight} = {clientWidth: parent?.clientWidth | 1920, clientHeight: 1080};
    document.querySelector(this.parentId)?.appendChild(this.canvas);
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
    // console.log(this.gl, this.transitionList);
    if (!this.gl) {
      console.error('无法重新初始化WebGL, 您的浏览器或机器可能不支持它。');
      return;
    }

    setTimeout(() => {
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

    // this.loadImageSelf = false;
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
    this.canvas = null;
  }

}