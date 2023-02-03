export const mosaic = {
  vsSource: `
        attribute vec4 a_Position;
        attribute vec2 a_TexCoord;
        varying vec2 v_TexCoord;
        void main() {
            gl_Position =  a_Position;
            v_TexCoord = a_TexCoord;
        }
    `,
  fsSource: `
        #ifdef GL_ES
        precision mediump float;
        #endif
        uniform sampler2D u_Sampler;
        uniform sampler2D u_Sampler1;
        varying lowp vec2 v_TexCoord;
        uniform vec4 shadow_colour; 
        uniform float shadow_height; 
        uniform float bounces; 
        uniform float progress;

        const float PI = 3.14159265358979323;
        uniform float endx; // = 2
        uniform float endy; // = -1

        vec4 getToColor(vec2  uv){
            return texture2D(u_Sampler,uv);
        }
        vec4 getFromColor(vec2 uv){
            return texture2D(u_Sampler1,uv);
        }

        float Rand(vec2 v) {
            return fract(sin(dot(v.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }
        vec2 Rotate(vec2 v, float a) {
            mat2 rm = mat2(cos(a), -sin(a), sin(a), cos(a));
            return rm*v;
        }
        float CosInterpolation(float x) {
            return -cos(x*PI)/2.+.5;
        }

        vec4 transition (vec2 uv) {
            vec2 p = uv.xy / vec2(1.0).xy - .5;
            vec2 rp = p;
            float rpr = (progress*2.-1.);
            float z = -(rpr*rpr*2.) + 3.;
            float az = abs(z);
            rp *= az;
            rp += mix(vec2(.5, .5), vec2(endx + .5, endy + .5), (CosInterpolation(progress) * CosInterpolation(progress)));
            vec2 mrp = mod(rp, 1.);
            vec2 crp = rp;
            bool onEnd = floor(crp.x)==endx&&floor(crp.y)==endy;
            if(!onEnd) {
                float ang = float(int(Rand(floor(crp))*4.))*.5*PI;
                mrp = vec2(.5) + Rotate(mrp-vec2(.5), ang);
            }
            if(onEnd || Rand(floor(crp))>.5) {
                return getToColor(mrp);
            } else {
                return getFromColor(mrp);
            }
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  //   run() {
  //     let t = 0.0;
  //     let i = 0.0;

  //     // 进度控制
  //     const progress = this.gl.getUniformLocation(this.shaderProgram, 'progress');
  //     this.gl.uniform1f(progress, i);

  //     // 解决wengl1不能初始赋值uniform
  //     const endx = this.gl.getUniformLocation(this.shaderProgram, 'endx');
  //     this.gl.uniform1f(endx, 2.0);
  //     const endy = this.gl.getUniformLocation(this.shaderProgram, 'endy');
  //     this.gl.uniform1f(endy, -1.0);

  //     t += 0.02;
  //     i = Math.abs(Math.sin(t));
  //   }
  assignmentList: [
    {
      key: 'endx',
      value: [2.0],
    }, {
      key: 'endy',
      value: [-1.0],
    },
  ],
};
