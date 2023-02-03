// author: gre
// license: MIT
// https://gl-transitions.com/editor/LinearBlur
export const linearBlur = {
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
        uniform float intensity; // = 0.1
        const int passes = 6;
        
        // 固定方法
        vec4 getToColor(vec2  uv){
            return texture2D(u_Sampler,uv);
        }
        vec4 getFromColor(vec2 uv){
            return texture2D(u_Sampler1,uv);
        }

        vec4 transition (vec2 uv) {
            vec4 c1 = vec4(0.0);
            vec4 c2 = vec4(0.0);
        
            float disp = intensity*(0.5-distance(0.5, progress));
            for (int xi=0; xi<passes; xi++)
            {
                float x = float(xi) / float(passes) - 0.5;
                for (int yi=0; yi<passes; yi++)
                {
                    float y = float(yi) / float(passes) - 0.5;
                    vec2 v = vec2(x,y);
                    float d = disp;
                    c1 += getFromColor( uv + d*v);
                    c2 += getToColor( uv + d*v);
                }
            }
            c1 /= float(passes*passes);
            c2 /= float(passes*passes);
            return mix(c1, c2, progress);
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'intensity',
      value: [0.1],
    },
  ],
  intervalTime: 90,
};
