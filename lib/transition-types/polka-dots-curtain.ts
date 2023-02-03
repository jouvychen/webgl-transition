// author: bobylito
// license: MIT
// https://gl-transitions.com/editor/PolkaDotsCurtain
export const polkaDotsCurtain = {
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
        
        // 自定义uniform及其它产量
        const float SQRT_2 = 1.414213562373;
        uniform float dots;// = 20.0;
        uniform vec2 center;// = vec2(0, 0);
        
        // 固定方法
        vec4 getToColor(vec2  uv){
            return texture2D(u_Sampler,uv);
        }
        vec4 getFromColor(vec2 uv){
            return texture2D(u_Sampler1,uv);
        }

        vec4 transition (vec2 uv) {
            bool nextImage = distance(fract(uv * dots), vec2(0.5, 0.5)) < ( progress / distance(uv, center));
            return nextImage ? getToColor(uv) : getFromColor(uv);
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'dots',
      value: [20.0],
    },
    {
      key: 'center',
      value: [0, 0],
    },
  ],
  intervalTime: 100,
};
