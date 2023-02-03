// Author: 0gust1
// License: MIT
// https://gl-transitions.com/editor/SimpleZoom
export const simpleZoom = {
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
        uniform float progress;
        
        uniform float zoom_quickness; // = 0.8
        float nQuick = clamp(zoom_quickness,0.2,1.0);
        
        vec4 getToColor(vec2  uv){
            return texture2D(u_Sampler,uv);
        }
        vec4 getFromColor(vec2 uv){
            return texture2D(u_Sampler1,uv);
        }

        vec2 zoom(vec2 uv, float amount) {
            return 0.5 + ((uv - 0.5) * (1.0-amount));
        }

        vec4 transition (vec2 uv) {
            return mix(
                getFromColor(zoom(uv, smoothstep(0.0, nQuick, progress))),
                getToColor(uv),
               smoothstep(nQuick-0.2, 1.0, progress)
            );
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'zoom_quickness',
      value: [0.8],
    },
  ],
};
