// Author: gre
// License: MIT
// https://gl-transitions.com/editor/windowslice
export const windowSlice = {
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
        // 固定
        uniform sampler2D u_Sampler;
        uniform sampler2D u_Sampler1;
        varying lowp vec2 v_TexCoord;
        uniform vec4 shadow_colour; 
        uniform float shadow_height; 
        uniform float progress;
        
        // 自定义uniform
        uniform float count; // = 10.0
        uniform float smoothness; // = 0.5
        
        // 固定方法
        vec4 getToColor(vec2  uv){
            return texture2D(u_Sampler,uv);
        }
        vec4 getFromColor(vec2 uv){
            return texture2D(u_Sampler1,uv);
        }

        vec4 transition (vec2 uv) {
            float pr = smoothstep(-smoothness, 0.0, uv.x - progress * (1.0 + smoothness));
            float s = step(pr, fract(count * uv.x));
            return mix(getFromColor(uv), getToColor(uv), s);
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'count',
      value: [20.0],
    },
    {
      key: 'smoothness',
      value: [0.5],
    },
  ],
  intervalTime: 100,
};
