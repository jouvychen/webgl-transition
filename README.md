# webgl-transition
A simple webgl pictures transition animation package, adopt es6 standard, all glsl code from https://gl-transitions.com/.



- 内置转场动画

  - wind

  - waterDrop

  - squaresWire

  - dreamy

  - crossWarp

  -  crossZoom

  - directionalWarp

  - randomSquares

  - ripple

  - flyEye

  - morph

  - mosaic

  - perlin

  - simpleZoom

  - directional

  - windowSlice

  - linearBlur

  - invertedPageCurl

  - glitchMemories

  - polkaDotsCurtain



- How to use?

  **html**

  ```html
  <canvas id="glcanvas" width="1920" height="1080"></canvas>
  ```

  **javascript**

  ```js
  import { WebglTransitions } from 'webgl-transition'
  // need online photo resource
  const imgs = [
    'http://pic4.zhimg.com/v2-02ae8129fed6feadc1514fd861a44a2f_r.jpg',
  
    'http://pic1.zhimg.com/v2-aa528fcd1a5ff3ba4a4a8429d3c11222_r.jpg',
  
    'http://pic1.zhimg.com/v2-4ce925afd994d72a16276bc7fbddf97c_r.jpg',
  ];
  
  let webglTransitions = new WebglTransitions('#glcanvas', [
      'dreamy',
      'crossWarp',
      'crossZoom',
      'directionalWarp',
      'randomSquares',
    ], imgs);
  webglTransitions.main();
  ```

  
