export const waterDrop = {
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
        uniform float amplitude; // = 30
        uniform float speed; // = 30


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
            vec2 dir = uv - vec2(.5);
            float dist = length(dir);

            if (dist > progress) {
                return mix(getFromColor(uv), getToColor(uv), progress);
            } else {
                vec2 offset = dir * sin(dist * amplitude - progress * speed);
                return mix(getFromColor(uv + offset), getToColor(uv), progress);
            }
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'amplitude',
      value: [40.0],
    }, {
      key: 'speed',
      value: [30.0],
    },
  ],
};
