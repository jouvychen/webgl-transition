export const squaresWire = {
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

        uniform vec2 squares;// = vec2(10,10)
        uniform vec2 direction;// = vec2(1.0, -0.5)
        uniform float smoothness; // = 1.6
        const vec2 center = vec2(0.5, 0.5);


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
            vec2 v = normalize(direction);
            v /= abs(v.x)+abs(v.y);
            float d = v.x * center.x + v.y * center.y;
            float offset = smoothness;
            float pr = smoothstep(-offset, 0.0, v.x * uv.x + v.y * uv.y - (d-0.5+progress*(1.+offset)));
            vec2 squarep = fract(uv*vec2(squares));
            vec2 squaremin = vec2(pr/2.0);
            vec2 squaremax = vec2(1.0 - pr/2.0);
            float a = (1.0 - step(progress, 0.0)) * step(squaremin.x, squarep.x) * step(squaremin.y, squarep.y) * step(squarep.x, squaremax.x) * step(squarep.y, squaremax.y);
            return mix(getFromColor(uv), getToColor(uv), a);
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'squares',
      value: [22, 18],
    }, {
      key: 'direction',
      value: [1.0, -0.5],
    }, {
      key: 'smoothness',
      value: [1.6],
    },
  ],
};
