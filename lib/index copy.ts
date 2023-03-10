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
  private analogLossContentCounts = 0;
  private parentId: string = '';
  private canvasId: string = '';
  private canvas: HTMLCanvasElement | null = null;
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;
  public firstInit = true;
  public timer: NodeJS.Timeout | undefined | null = undefined;
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
  public stopPlaying = false;
  public shaderProgram:WebGLProgram | null= null;
  public vertexBuffer:WebGLBuffer | null= null;
  
  

  constructor(domId: string, transitionList: any[], playPicList: string[], carouselTime?: number) {
    this.canvasId = Date.now().toString();
    this.parentId = domId;

    this.canvas = document.createElement("canvas");
    this.canvas.id = this.canvasId;
    document.querySelector(domId)?.appendChild(this.canvas);
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    
    // this.canvas.addEventListener("webglcontextlost", function (event) {
    //   console.log("WebGL上下文丢失");
  
    //   // inform WebGL that we handle context restoration
    //   event.preventDefault();
    //   console.log('3秒后重新初始化');

    //   setTimeout(()=>{
    //     // that.test()
    //   }, 3000)
    
    //   // Stop rendering
    //   // window.cancelAnimationFrame(requestId);
    // }, false);
    
    // let that = this;
    // this.canvas.addEventListener("webglcontextrestored", function (event) {
    //   console.log('webglcontextrestored恢复');
    //   that.test();
    // }, false);

    this.gl = this.canvas.getContext('webgl') as WebGLRenderingContext;
    this.transitionList = transitionList.map((o: string) => {
      return transitionObject[o];
    });
    this.playPicList = playPicList;
    this.carouselTime = carouselTime || 3000;

    //监听当页面tab是否被切出
    // window.addEventListener('visibilitychange', (e) => {
    //   console.log('页面是否切出', document.hidden);
    //   if (document.hidden) {
    //     console.log('页面已切出');
    //   } else {
    //     console.log('页面已回来');
    //   }
    // });

    console.log('初始信息', domId, transitionList, playPicList, this.canvas, this.gl);
    if (!this.gl) {
      console.error('无法初始化WebGL, 您的浏览器或机器可能不支持它。');
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
      this.restart();
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

    this.initShaderProgram();
    if (!this.shaderProgram) {
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
    this.gl.useProgram(this.shaderProgram);

    // 开始绘制
    const vertices = new Float32Array([-1.0, 1.0, 0.0, 1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 0.0]);
    const FSIZE = vertices.BYTES_PER_ELEMENT;
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    const a_Position = this.gl.getAttribLocation(this.shaderProgram, 'a_Position');
    const a_TexCoord = this.gl.getAttribLocation(this.shaderProgram, 'a_TexCoord');
    this.gl.vertexAttribPointer(a_Position, 2, this.gl.FLOAT, false, FSIZE * 4, 0);
    this.gl.vertexAttribPointer(a_TexCoord, 2, this.gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    this.gl.enableVertexAttribArray(a_Position);
    this.gl.enableVertexAttribArray(a_TexCoord);

    // 设置三角形的颜色
    const u_color = this.gl.getUniformLocation(this.shaderProgram, 'u_color');
    this.gl.uniform4f(u_color, 1.0, 1.0, 1.0, 1.0);
    const u_Sampler = this.gl.getUniformLocation(this.shaderProgram, 'u_Sampler');
    const u_Sampler1 = this.gl.getUniformLocation(this.shaderProgram, 'u_Sampler1');
    const shadowColour = this.gl.getUniformLocation(this.shaderProgram, 'shadow_colour');
    const shadowHeight = this.gl.getUniformLocation(this.shaderProgram, 'shadow_height');
    const bounces = this.gl.getUniformLocation(this.shaderProgram, 'bounces');

    this.gl.uniform4f(shadowColour, 0.0, 0.0, 0.0, 0.6);
    this.gl.uniform1f(shadowHeight, 0.075);
    this.gl.uniform1f(bounces, 3.0);

    // 只初始化获取一次图片资源
    if (this.playPicPreloadList.length != this.playPicList.length) {
      console.log('加载网络图片');
      await Promise.all([this.asyncLoadImage()]);
    }
    if(this.textures.length === 2) {
      this.gl.deleteTexture(this.textures[1]);
      this.gl.deleteTexture(this.textures[0]);
      this.textures = [];
    }
    this.creatFirstTexture();
    this.creatSecondTexture();

    // WebGL: INVALID_OPERATION: uniform1i: location not for current program
    // INVALID_OPERATION: getUniformLocation: object does not belong to this contex

    // WebGL: INVALID_OPERATION: uniform1i: location not for current program
    this.gl.uniform1i(u_Sampler, 0); // texture unit 0
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[1]);

    // WebGL: INVALID_OPERATION: uniform1i: location not for current program
    this.gl.uniform1i(u_Sampler1, 1); // texture unit 1
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);

    let i = 0.0;

    this.timer && clearInterval(this.timer);

    this.timer = setInterval(() => {
      if (!this.gl) {
        return;
      }

      if (this.textures.length === 2) {

        // https://stackoverflow.com/questions/14413713/webgl-invalid-operation-uniform1i-location-not-for-current-program/14416423

        // // WebGL: INVALID_OPERATION: uniform1i: location not for current program
        // // INVALID_OPERATION: getUniformLocation: object does not belong to this contex

        // // WebGL: INVALID_OPERATION: uniform1i: location not for current program
        // this.gl.uniform1i(u_Sampler, 0); // texture unit 0
        // this.gl.activeTexture(this.gl.TEXTURE0);
        // this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[1]);

        // // WebGL: INVALID_OPERATION: uniform1i: location not for current program
        // this.gl.uniform1i(u_Sampler1, 1); // texture unit 1
        // this.gl.activeTexture(this.gl.TEXTURE1);
        // this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);

        if(!this.shaderProgram) {
          console.error('shaderProgram失败');
          return;
        }

        // WebGL: INVALID_OPERATION: getUniformLocation: object does not belong to this context
        const progress = this.gl.getUniformLocation(this.shaderProgram, 'progress');
        // WebGL: INVALID_OPERATION: uniform1f: location not for current program
        this.gl.uniform1f(progress, i);

        for (let i = 0; i < this.assignmentList.length; i++) {
          const e = this.assignmentList[i];
          const length = e.value.length;
          switch (length) {
            case 1:
              // WebGL: INVALID_OPERATION: uniform1f: location not for current program
              // WebGL: too many errors, no more errors will be reported to the console for this context.
              // WebGL: INVALID_OPERATION: getUniformLocation: object does not belong to this context
              // WebGL: too many errors, no more errors will be reported to the console for this context.
              this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram, e.key), e.value[0]);
              break;
            case 2:
              this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, e.key), e.value[0], e.value[1]);
              break;
            case 3:
              this.gl.uniform3f(this.gl.getUniformLocation(this.shaderProgram, e.key), e.value[0], e.value[1], e.value[2]);
              break;
            case 4:
              this.gl.uniform4f(this.gl.getUniformLocation(this.shaderProgram, e.key), e.value[0], e.value[1], e.value[2], e.value[3]);
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
        // console.log('定时器');  

        if (!this.gl || this.stopPlaying) {
          return;
        }

      }

    }, this.intervalTime);

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
      // setTimeout(()=>{
      //   this.restart();
      // }, 500);
    }
  }

  // 模拟丢失上下文
  simulatedLostContext() {
    if (this.gl && this.gl.getExtension('WEBGL_lose_context')) {
      // setTimeout(() => {
        ++this.analogLossContentCounts;
        if (!this.gl || this.analogLossContentCounts > 1) {
          return;
        }
        const a = this.gl.getExtension('WEBGL_lose_context');
        a && a.loseContext();
        console.clear();
        console.log('模拟丢失');
        this.timer && clearInterval(this.timer);
        console.log('丢失后的timer', this.timer);
        
        this.diushijianting = 0;
        // setTimeout(()=>{
          this.test()
        // }, 3000)
        return;
      // }, 12000)
    }
  }

  stop() {
    this.stopPlaying = true;
    this.timer && (clearInterval(this.timer));
  }

  restart() {
    // 释放旧的gl上下文资源
    this.dispose();
    let that = this;
    console.log('restart webgl transition...');
    this.analogLossContentCounts = 0;

    // this.canvas?.removeEventListener("webglcontextlost",()=>{}, false)

    const el = document.querySelector(this.parentId);
    if(el) {
      const childs = el.childNodes; 
      for(let i = childs .length - 1; i >= 0; i--) {
        el.removeChild(childs[i]);
      }
    }

    // debugger
    this.canvasId = Date.now().toString();
    this.canvas = document.createElement("canvas");
    this.canvas.id = this.canvasId;
    document.querySelector(this.parentId)?.appendChild(this.canvas);
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    console.log('新的canvas', this.canvas);
    


    // this.canvas = canvas;
    // https://blog.csdn.net/qq_30100043/article/details/74127228
    //添加事件监听
    
    // this.canvas.addEventListener("webglcontextlost", function() {
    //   ++that.diushijianting;

    //   // 注释可以一直重新初始化
    //   // if(that.diushijianting > 1){
    //   //   that.diushijianting = 0;
    //   //   return;
    //   // }
      
    //   if(that.diushijianting > 1){
    //     return;
    //   }

    //   console.log('that', that);
    //   console.log('2次监听');
    //   that.test();
    // });
    // this.canvas.addEventListener("webglcontextrestored", function () {
    //   // start(canvas);
    //   console.log('webglcontextrestored恢复');

    // });

    // // 释放旧的gl上下文资源
    // this.dispose();

    this.gl = this.canvas.getContext('webgl') as WebGLRenderingContext;
    console.log(this.gl, this.transitionList);
    if (!this.gl) {
      console.error('无法重新初始化WebGL, 您的浏览器或机器可能不支持它。');
      return;
    }

    setTimeout(()=>{
      this.main();
    }, 3000)

    
  // })
  }

  dispose() {
    if(this.gl) {
      // https://www.daicuo.cc/biji/357969
      // WebGL: INVALID_OPERATION: bindBuffer: object does not belong to this context
      // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
      // WebGL: INVALID_OPERATION: bufferData: no buffer
      // this.gl.bufferData(this.gl.ARRAY_BUFFER, 1, this.gl.STATIC_DRAW);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
      // WebGL: INVALID_OPERATION: delete: object does not belong to this context
      this.vertexBuffer && this.gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer && (this.vertexBuffer = null);
      console.log('清空贴图');
      this.gl.deleteTexture(this.textures[1]);
      this.gl.deleteTexture(this.textures[0]);
    }
    
    this.firstInit = true;
    // this.timer = undefined;
    this.vsSource = '';
    this.fsSource = '';
    this.playPicPreloadList = [];
    if(this.gl){
      this.gl.deleteProgram(this.shaderProgram);
      console.log('删除着色器程序');
      this.gl.deleteShader(this.vertexShader);
      this.gl.deleteShader(this.fragmentShader);
    }
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