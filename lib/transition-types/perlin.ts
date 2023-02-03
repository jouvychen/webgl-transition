export const perlin = {
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

        uniform float scale; // = 4.0
        uniform float smoothness; // = 0.01

        uniform float seed; // = 12.9898


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

        // http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
        float random(vec2 co)
        {
            highp float a = seed;
            highp float b = 78.233;
            highp float c = 43758.5453;
            highp float dt= dot(co.xy ,vec2(a,b));
            highp float sn= mod(dt,3.14);
            return fract(sin(sn) * c);
        }

        // 2D Noise based on Morgan McGuire @morgan3d
        // https://www.shadertoy.com/view/4dS3Wd
        float noise (in vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            // Four corners in 2D of a tile
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            // Smooth Interpolation

            // Cubic Hermine Curve.  Same as SmoothStep()
            vec2 u = f*f*(3.0-2.0*f);
            // u = smoothstep(0.,1.,f);

            // Mix 4 coorners porcentages
            return mix(a, b, u.x) +
                    (c - a)* u.y * (1.0 - u.x) +
                    (d - b) * u.x * u.y;
        }

        vec4 transition (vec2 uv) {
            vec4 from = getFromColor(uv);
            vec4 to = getToColor(uv);
            float n = noise(uv * scale);
            
            float p = mix(-smoothness, 1.0 + smoothness, progress);
            float lower = p - smoothness;
            float higher = p + smoothness;
            
            float q = smoothstep(lower, higher, n);
            
            return mix(
                from,
                to,
                1.0 - q
            );
        }

        void main() {
            gl_FragColor =  transition(v_TexCoord);
        }
    `,
  assignmentList: [
    {
      key: 'scale',
      value: [4.0],
    }, {
      key: 'smoothness',
      value: [0.01],
    }, {
      key: 'seed',
      value: [12.9898],
    },
  ],
};
