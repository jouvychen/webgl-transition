export const dreamy = {
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

        vec4 getToColor(vec2  uv){
            return texture2D(u_Sampler,uv);
        }
        vec4 getFromColor(vec2 uv){
            return texture2D(u_Sampler1,uv);
        }

        vec2 offset(float progress, float x, float theta) {
            float phase = progress*progress + progress + theta;
            float shifty = 0.03*progress*cos(10.0*(progress+x));
            return vec2(0, shifty);
        }


        vec4 transition (vec2 uv) {
            return mix(getFromColor(uv + offset(progress, uv.x, 0.0)), getToColor(uv + offset(1.0-progress, uv.x, 3.14)), progress);
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [],
};
