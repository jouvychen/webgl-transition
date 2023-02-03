export const ripple = {
  vsSource: `
        attribute vec4 a_Position;
        attribute vec2 a_TexCoord;
        varying vec2 v_TexCoord;
        void main() {
            gl_Position =  a_Position;
            v_TexCoord = a_TexCoord;
        }
    `, fsSource: `
        #ifdef GL_ES
        precision mediump float;
        #endif

        uniform float amplitude; // = 100.0
        uniform float speed; // = 50.0


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
            vec2 offset = dir * (sin(progress * dist * amplitude - progress * speed) + .5) / 30.;
            return mix(
                getFromColor(uv + offset),
                getToColor(uv),
                smoothstep(0.2, 1.0, progress)
            );
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'amplitude',
      value: [100.0],
    }, {
      key: 'speed',
      value: [50.0],
    },
  ],
};
