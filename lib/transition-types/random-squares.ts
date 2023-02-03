export const randomSquares = {
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

        uniform vec2 size; // = ivec2(10, 10)
        uniform float smoothness; // = 0.5


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

        float rand (vec2 co) {
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }


        vec4 transition (vec2 uv) {
            float r = rand(floor(vec2(size) * uv));
            float m = smoothstep(0.0, -smoothness, r - (progress * (1.0 + smoothness)));
            return mix(getFromColor(uv), getToColor(uv), m);
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'size',
      value: [12, 10],
    }, {
      key: 'smoothness',
      value: [0.4],
    },
  ],
};
