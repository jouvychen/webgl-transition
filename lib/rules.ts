export default {
  isNetworkImageLoose: {
    // 网络图片宽松模式：以http://或https://开头的网络资源
    pattern: /^(http:\/\/|https:\/\/).*$/,
    msg: '不是网络图片，不以http://或https://开头',
  },
  webglTransitionParent: {
    pattern: /^(webgl-transition-).*$/,
  }
}  