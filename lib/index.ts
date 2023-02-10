import RULE from './rules';

// https://www.khronos.org/webgl/wiki/HandlingContextLost#:~:text=By%20default%20when%20a%20WebGL%20program%20loses%20the,canvas%20%3D%20document.getElementById%20%28%22myCanvas%22%29%3B%20canvas.addEventListener%20%28%22webglcontextlost%22%2C%20function%20

// https://registry.khronos.org/webgl/specs/latest/1.0/#5.15.3
// 过渡效果
import { wind } from './transition-types/wind';
import { waterDrop } from './transition-types/water-drop';
import { squaresWire } from './transition-types/squares-wire';
import { crossWarp } from './transition-types/cross-warp';
import { crossZoom } from './transition-types/cross-zoom';
import { directionalWarp } from './transition-types/directional-warp';
import { dreamy } from './transition-types/dreamy';
import { flyEye } from './transition-types/fly-eye';
import { morph } from './transition-types/morph';
import { mosaic } from './transition-types/mosaic';
import { perlin } from './transition-types/perlin';
import { randomSquares } from './transition-types/random-squares';
import { ripple } from './transition-types/ripple';
import { simpleZoom } from './transition-types/simple-zoom';
import { directional } from './transition-types/directional';
import { windowSlice } from './transition-types/window-slice';
import { linearBlur } from './transition-types/linear-blur';
import { invertedPageCurl } from './transition-types/inverted-page-curl';
import { glitchMemories } from './transition-types/glitch-memories';
import { polkaDotsCurtain } from './transition-types/polka-dots-curtain';

// 初始化参数
interface InitParams {
  id: string,
  transitionList: any,
  playPicList: string[],
  carouselTime?: number
}

// 需要赋值给自定义uniform的参数
interface AssignmentList {
  key: string,
  value: number[],
}

interface ObjectKey {
  [key: string]: any;
}

const transitionObject: ObjectKey = {
  wind: wind,
  waterDrop: waterDrop,
  squaresWire: squaresWire,
  crossWarp: crossWarp,
  crossZoom: crossZoom,
  directionalWarp: directionalWarp,
  dreamy: dreamy,
  flyEye: flyEye,
  morph: morph,
  mosaic: mosaic,
  perlin: perlin,
  randomSquares: randomSquares,
  ripple: ripple,
  simpleZoom: simpleZoom,
  directional: directional,
  windowSlice: windowSlice,
  invertedPageCurl: invertedPageCurl,
  linearBlur: linearBlur,
  glitchMemories: glitchMemories,
  polkaDotsCurtain: polkaDotsCurtain,
}

export class WebglTransitions {
  private diushijianting = 0;
  private monidiushi = 0;
  private domId: string = '';
  private canvas: HTMLCanvasElement | null = null;
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;
  public firstInit = true;
  public timer: NodeJS.Timeout | undefined = undefined;
  public intervalTime = 100; // 过渡动画多少毫秒绘制一帧
  public vsSource = '';
  public fsSource = '';
  public assignmentList: AssignmentList[] = [];
  public gl: WebGLRenderingContext | null;
  public textures: WebGLTexture[] = [];
  public playIndex = 0;
  public transitionList: any[];
  public playPicIndex = 0; // 轮播次数
  public carouselTime: number; // 轮播间隔时间, 单位ms
  public playPicList: string[]; // 轮播图片
  public playPicPreloadList: HTMLImageElement[] = []; // 轮播图片预加载存储列表

  constructor(domId: string, transitionList: any[], playPicList: string[], carouselTime?: number) {
    this.domId = Date.now().toString();
    // localStorage.setItem("domId", `#${this.domId}`);
    sessionStorage.setItem("domId", domId);
    // this.checkInitResource(domId, transitionList, playPicList);

    // const canvas = document.querySelector(domId) as HTMLCanvasElement;

    const canvas = document.createElement("canvas");
    canvas.id = this.domId;
    document.querySelector(domId)?.appendChild(canvas);
    canvas.width = 1920;
    canvas.height = 1080;

    // canvas.addEventListener(
    //   "webglcontextlost", function (event) {
    //   event.preventDefault();
    // }, false);
    
    // canvas.addEventListener(
    //     "webglcontextrestored", function (event) {
    //     // 不会触发这个监听
    // }, false);


    // this.canvas = canvas;
    // https://blog.csdn.net/qq_30100043/article/details/74127228
    //添加事件监听
    // canvas.addEventListener("webglcontextlost", (e) => {
    //   console.log('this', this);
    //   console.log("WebGL上下文丢失");
    //   //停止动画
    //   this.timer && clearInterval(this.timer);
    //   e.preventDefault() //阻止浏览器的默认行为
    //   this.test();
    //   console.log('this', this);
      
    // }, false);
    canvas.addEventListener(
      "webglcontextlost", function (event) {
        console.log("WebGL上下文丢失");
  
      // inform WebGL that we handle context restoration
      event.preventDefault();
      console.log('3秒后重新初始化');

      setTimeout(()=>{
        that.test()
      }, 3000)
    
      // Stop rendering
      // window.cancelAnimationFrame(requestId);
    }, false);
    // canvas.addEventListener("webglcontextrestored", ()=> {
    //   // start(canvas);
    //   console.log('webglcontextrestored恢复');
    //   this.test()

    // }, false);
    let that = this;
    canvas.addEventListener(
      "webglcontextrestored", function (event) {
  
        that.test();
    }, false);

    // var el = document.querySelector(domId);
    // if(el) {
    //   var childs = el.childNodes; 
    //   for(var i = childs .length - 1; i >= 0; i--) {
    //     el.removeChild(childs[i]);
    //   }
    // }
    

    this.gl = canvas.getContext('webgl') as WebGLRenderingContext;
    this.transitionList = transitionList.map((o: string) => {
      return transitionObject[o];
    });
    this.playPicList = playPicList;
    this.carouselTime = carouselTime || 3000;
    console.log('初始信息', domId, transitionList, playPicList, canvas, this.gl);
    if (!this.gl) {
      // alert('无法初始化WebGL, 您的浏览器或机器可能不支持它。');
      console.error('1无法初始化WebGL, 您的浏览器或机器可能不支持它。');
      return;
    }
  };

  // 初始化校验
  checkInitResource(domId: string, transitionList: any, playPicList: string[]) {
    if (!domId || typeof domId !== 'string') {
      throw new Error('WebglTransitions初始化失败, 缺少Dom元素ID');
    }
    if (!transitionList || transitionList.length === 0) {
      throw new Error('WebglTransitions初始化失败, 缺少参数transitionList转场动画');
    }
    if (!playPicList || playPicList.length === 0) {
      throw new Error('WebglTransitions初始化失败, 缺少参数playPicList转场图片');
    }
  }

  //上线文丢失后停止动画
  contextLost(e: any) {
    console.log("WebGL上下文丢失");
    //停止动画
    this.timer && clearInterval(this.timer);
    e.preventDefault() //阻止浏览器的默认行为
    console.log('this', this);
    
    this.test();
  }

  test() {
    let that = this;
    // const that = this;
    // setTimeout(() => {
      // console.log('this.canvas', this.canvas);
      // console.log('this.domId', this.domId);
      console.log('重新初始化');
      this.monidiushi = 0;
      // that.diushijianting = 0;

      const domId = sessionStorage.getItem("domId");

      if (!domId) {
        return
      }

      var el = document.querySelector(domId);
      // debugger
      if(el) {
        var childs = el.childNodes; 
        for(var i = childs .length - 1; i >= 0; i--) {
          el.removeChild(childs[i]);
        }
      }

      // debugger
      this.domId = Date.now().toString();
      const canvas = document.createElement("canvas");
      canvas.id = this.domId;
      document.querySelector(domId)?.appendChild(canvas);
      canvas.width = 1920;
      canvas.height = 1080;

      console.log('新的canvas', canvas);
      


      // this.canvas = canvas;
      // https://blog.csdn.net/qq_30100043/article/details/74127228
      //添加事件监听
      
      canvas.addEventListener("webglcontextlost", function() {
        ++that.diushijianting;

        // 注释可以一直重新初始化
        // if(that.diushijianting > 1){
        //   that.diushijianting = 0;
        //   return;
        // }
// debugger
        if(that.diushijianting > 1){
          return;
        }

        console.log('that', that);
        console.log('2次监听');
        that.test();
      });
      canvas.addEventListener("webglcontextrestored", function () {
        // start(canvas);
        console.log('webglcontextrestored恢复');

      });

      this.vertexShader = null;
      this.fragmentShader = null;
      this.firstInit = true;
      this.timer = undefined;
      this.vsSource = '';
      this.fsSource = '';
      this.gl = null;
      this.playPicPreloadList = [];
      this.textures = [];
      this.playIndex = 0;
      this.playPicIndex = 0;

      this.gl = canvas.getContext('webgl') as WebGLRenderingContext;
      console.log(this.gl, this.transitionList);
      if (!this.gl) {
        // alert('无法初始化WebGL, 您的浏览器或机器可能不支持它。');
        console.error('2无法初始化WebGL, 您的浏览器或机器可能不支持它。');
        return;
      }

      this.main();
    // }, 3000)
  }

  asyncLoadImage() {
    // 遍历数组的路径，预加载到浏览器中
    return new Promise((resolve: any) => {
      let c = 0;
      for (let i = 0; i < this.playPicList.length; i++) {
        const img = new Image();

        // 图片是网络图片
        if (RULE.isNetworkImageLoose.pattern.test(this.playPicList[i])) {
          img.src = this.playPicList[i];
          img.setAttribute('crossOrigin', 'Anonymous');
        } else {
          // img.src = getImageUrl(this.playPicList[i]);
          img.src = `./images${this.playPicList[i]}`;
        }

        img.onload = () => {
          c++;
          console.log(c, this.playPicList[i]);
          this.playPicPreloadList.push(img);
          console.log('网络图', this.playPicPreloadList);
          if (this.playPicPreloadList.length === this.playPicList.length) {
            resolve(1);
          }
        };
      }
    });
  }

  creatFirstTexture() {
    if (!this.gl) {
      return;
    }
    // console.log('FirstTexture', this.playPicPreloadList[this.playPicIndex].currentSrc.toString());
    const textureRef = this.createTexture(this.gl.LINEAR, this.playPicPreloadList[this.playPicIndex]);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, textureRef);
    textureRef && this.textures.push(textureRef);
  }
  creatSecondTexture() {
    if (!this.gl) {
      return;
    }
    // console.log('SecondTexture', this.playPicPreloadList[this.playPicIndex + 1 === this.playPicPreloadList.length ? 0 : this.playPicIndex + 1].currentSrc.toString());
    const textureRef1 = this.createTexture(this.gl.LINEAR, this.playPicPreloadList[this.playPicIndex + 1 === this.playPicPreloadList.length ? 0 : this.playPicIndex + 1]);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, textureRef1);
    textureRef1 && this.textures.push(textureRef1);
  }

  async main() {
    if (!this.gl) {
      return;
    }
    const e = this.transitionList[this.playIndex];
    // console.log('当前动画', this.playIndex, e);
    console.log('当前动画', e, this.playIndex);

    this.intervalTime = e.intervalTime || 100;
    this.vsSource = e.vsSource;
    this.fsSource = e.fsSource;
    this.assignmentList = e.assignmentList;

    const shaderProgram = this.initShaderProgram();
    if (!shaderProgram) {
      console.log('shaderProgram初始化失败');
      return false;
    }
    if (this.firstInit) {
      this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Clear to black, fully opaque/
      this.gl.clearDepth(1.0); // Clear everything
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      this.firstInit = false;
    }
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.useProgram(shaderProgram);

    // 开始绘制
    const vertices = new Float32Array([-1.0, 1.0, 0.0, 1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 0.0]);
    const FSIZE = vertices.BYTES_PER_ELEMENT;
    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    const a_Position = this.gl.getAttribLocation(shaderProgram, 'a_Position');
    const a_TexCoord = this.gl.getAttribLocation(shaderProgram, 'a_TexCoord');
    this.gl.vertexAttribPointer(a_Position, 2, this.gl.FLOAT, false, FSIZE * 4, 0);
    this.gl.vertexAttribPointer(a_TexCoord, 2, this.gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    this.gl.enableVertexAttribArray(a_Position);
    this.gl.enableVertexAttribArray(a_TexCoord);

    // 设置三角形的颜色
    const u_color = this.gl.getUniformLocation(shaderProgram, 'u_color');
    this.gl.uniform4f(u_color, 1.0, 1.0, 1.0, 1.0);
    const u_Sampler = this.gl.getUniformLocation(shaderProgram, 'u_Sampler');
    const u_Sampler1 = this.gl.getUniformLocation(shaderProgram, 'u_Sampler1');
    const shadowColour = this.gl.getUniformLocation(shaderProgram, 'shadow_colour');
    const shadowHeight = this.gl.getUniformLocation(shaderProgram, 'shadow_height');
    const bounces = this.gl.getUniformLocation(shaderProgram, 'bounces');

    this.gl.uniform4f(shadowColour, 0.0, 0.0, 0.0, 0.6);
    this.gl.uniform1f(shadowHeight, 0.075);
    this.gl.uniform1f(bounces, 3.0);

    // 只初始化获取一次图片资源
    if (this.playPicPreloadList.length != this.playPicList.length) {
      console.log('加载网络图片');
      await Promise.all([this.asyncLoadImage()]);
    }
    this.gl.deleteTexture(this.textures[1]);
    this.gl.deleteTexture(this.textures[0]);
    this.textures = [];
    this.creatFirstTexture();
    this.creatSecondTexture();

    let i = 0.0;

    this.timer = setInterval(() => {
      if (!this.gl) {
        return;
      }

      if (this.textures.length === 2) {

        // WebGL: INVALID_OPERATION: uniform1i: location not for current program

        this.gl.uniform1i(u_Sampler, 0); // texture unit 0
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[1]);

        this.gl.uniform1i(u_Sampler1, 1); // texture unit 1
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);

        const progress = this.gl.getUniformLocation(shaderProgram, 'progress');
        this.gl.uniform1f(progress, i);

        for (let i = 0; i < this.assignmentList.length; i++) {
          const e = this.assignmentList[i];
          const length = e.value.length;
          switch (length) {
            case 1:
              this.gl.uniform1f(this.gl.getUniformLocation(shaderProgram, e.key), e.value[0]);
              break;
            case 2:
              this.gl.uniform2f(this.gl.getUniformLocation(shaderProgram, e.key), e.value[0], e.value[1]);
              break;
            case 3:
              this.gl.uniform3f(this.gl.getUniformLocation(shaderProgram, e.key), e.value[0], e.value[1], e.value[2]);
              break;
            case 4:
              this.gl.uniform4f(this.gl.getUniformLocation(shaderProgram, e.key), e.value[0], e.value[1], e.value[2], e.value[3]);
              break;
            default:
              break;
          }
        }

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        // 循环控制器
        if (i >= 1) {
          this.timer && clearInterval(this.timer);
          i = 0.0;
          if (this.playPicIndex === this.playPicList.length - 1) {
            this.playPicIndex = 0;
          } else {
            this.playPicIndex += 1;
          }

          if (this.playIndex === this.transitionList.length - 1) {

            this.playIndex = 0;
            setTimeout(() => {
              this.main();
            }, this.carouselTime);

          } else {

            this.playIndex += 1;
            setTimeout(() => {
              this.main();
            }, this.carouselTime);

          }

        }

        i += 0.02;

        // setTimeout(()=>{
        //   this.canvas.loseContextInNCalls(5);
        // })
        if (!this.gl) {
          return;
        }

        // if (this.gl && this.gl.getExtension('WEBGL_lose_context')) {
        //   setTimeout(() => {
        //     ++this.monidiushi;
        //     if (!this.gl || this.monidiushi > 1) {
        //       return;
        //     }
        //     const a = this.gl.getExtension('WEBGL_lose_context');
        //     a && a.loseContext();
        //     console.log('模拟丢失');
        //     this.timer && clearInterval(this.timer);
        //     this.diushijianting = 0;
        //     return;
        //   }, 12000)
        // }

      }

    }, this.intervalTime);

  }

  initShaderProgram(): WebGLProgram | null {
    this.loadVertexShader(this.vsSource);
    this.loadFragmentShader(this.fsSource);

    if (!this.vertexShader || !this.fragmentShader) {
      return false;
    }

    if (!this.gl) {
      return false;
    }

    const shaderProgram = this.gl.createProgram() as WebGLProgram;

    if (!shaderProgram) {
      console.log('createProgram失败，可能上下文丢失', this.vertexShader, this.fragmentShader, shaderProgram);
      // setTimeout(()=>{
      //   if (this.playIndex === this.transitionList.length - 1) {
      //       this.playIndex = 0;
      //     } else {
      //       this.playIndex += 1;
      //     }
      //     this.vertexShader = null;
      //     this.fragmentShader = null;
      //     this.timer && clearInterval(this.timer);
      //   this.main();
      //   // WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost
      //   console.log('重新初始化');
      // }, 5000)
      return false;
    }

    this.gl.attachShader(shaderProgram, this.vertexShader);
    this.gl.attachShader(shaderProgram, this.fragmentShader);
    this.gl.linkProgram(shaderProgram);

    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      // alert('无法初始化着色器程序: ' + this.gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    return shaderProgram;
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
    if (!this.gl) {
      return;
    }
    if (!this.vertexShader) {
      console.log('初始化this.vertexShader', this.vertexShader);
      this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER) as WebGLShader;
    }
    console.log('编译前this.vertexShader', this.vertexShader);
    this.gl.shaderSource(this.vertexShader, source);

    this.gl.compileShader(this.vertexShader);
    console.log('编译后this.vertexShader', this.vertexShader);

    if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS)) {
      console.log('编译顶点着色器失败', this.vertexShader, this.gl.COMPILE_STATUS);
      console.error('编译顶点着色器时发生错误: ', this.gl.getShaderInfoLog(this.vertexShader));
      // alert('编译顶点着色器时发生错误: ' + this.gl.getShaderInfoLog(this.vertexShader));
      this.gl.deleteShader(this.vertexShader);
    }
  }

  loadFragmentShader(source: string): void {
    if (!this.gl) {
      return;
    }
    if (!this.fragmentShader) {
      this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER) as WebGLShader;
    }
    this.gl.shaderSource(this.fragmentShader, source);

    this.gl.compileShader(this.fragmentShader);

    if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS)) {
      console.log('编译片元着色器失败', this.fragmentShader, this.gl.COMPILE_STATUS);
      console.error('编译片元着色器时发生错误: ', this.gl.getShaderInfoLog(this.fragmentShader));
      // alert('编译片元着色器时发生错误: ' + this.gl.getShaderInfoLog(this.fragmentShader));
      this.gl.deleteShader(this.fragmentShader);
    }
  }

  // 模拟丢失上下文
  simulatedLostContext() {
    if (this.gl && this.gl.getExtension('WEBGL_lose_context')) {
      // setTimeout(() => {
        ++this.monidiushi;
        if (!this.gl || this.monidiushi > 1) {
          return;
        }
        const a = this.gl.getExtension('WEBGL_lose_context');
        a && a.loseContext();
        console.log('模拟丢失');
        this.timer && clearInterval(this.timer);
        this.diushijianting = 0;
        return;
      // }, 12000)
    }
  }

}