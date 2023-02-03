export const morph = {
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

        uniform float strength; // = 0.1


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


        vec4 transition (vec2 p) {
            vec4 ca = getFromColor(p);
            vec4 cb = getToColor(p);
            
            vec2 oa = (((ca.rg+ca.b)*0.5)*2.0-1.0);
            vec2 ob = (((cb.rg+cb.b)*0.5)*2.0-1.0);
            vec2 oc = mix(oa,ob,0.5)*strength;
            
            float w0 = progress;
            float w1 = 1.0-w0;
            return mix(getFromColor(p+oc*w0), getToColor(p-oc*w1), progress);
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'strength',
      value: [0.1],
    },
  ],
};
