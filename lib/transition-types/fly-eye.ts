export const flyEye = {
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

        uniform float size; // = 0.04
        uniform float zoom; // = 50.0
        uniform float colorSeparation; // = 0.3


        uniform sampler2D u_Sampler;
        uniform sampler2D u_Sampler1;
        varying lowp vec2 v_TexCoord;
        uniform vec4 shadow_colour; 
        uniform float shadow_height; 
        uniform float bounces; 
        uniform float progress;

        vec4 getToColor(vec2  uv){
            return texture2D(u_Sampler,uv);
        }
        vec4 getFromColor(vec2 uv){
            return texture2D(u_Sampler1,uv);
        }


        vec4 transition (vec2 uv) {
            float inv = 1. - progress;
            vec2 disp = size*vec2(cos(zoom*uv.x), sin(zoom*uv.y));
            vec4 texTo = getToColor(uv + inv*disp);
            vec4 texFrom = vec4(
                getFromColor(uv + progress*disp*(1.0 - colorSeparation)).r,
                getFromColor(uv + progress*disp).g,
                getFromColor(uv + progress*disp*(1.0 + colorSeparation)).b,
                1.0);
            return texTo*progress + texFrom*inv;
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'size',
      value: [0.04],
    },
    {
      key: 'zoom',
      value: [50.0],
    },
    {
      key: 'colorSeparation',
      value: [0.3],
    },
  ],
};
