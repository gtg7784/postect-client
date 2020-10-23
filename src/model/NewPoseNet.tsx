import React, { Component } from 'react'
import * as posenet from '@tensorflow-models/posenet'
import * as tf from '@tensorflow/tfjs-core'
import { ModelConfig, Pose } from '@tensorflow-models/posenet';
import { isMobile, drawKeypoints, drawSkeleton } from './utils'

interface Props {
  videoWidth: number;
  videoHeight: number;
  flipHorizontal: boolean;
  algorithm: 'single-pose' | 'multi-pose';
  mobileNetArchitecture?: ModelConfig;
  showVideo: boolean;
  showSkeleton: boolean;
  showPoints: boolean;
  minPoseConfidence: number;
  minPartConfidence: number;
  maxPoseDetections: number;
  nmsRadius: number;
  outputStride: number;
  imageScaleFactor: number;
  skeletonColor: string | CanvasGradient | CanvasPattern;
  skeletonLineWidth: number;
  loadingText: string;
}

interface State {
  loading: boolean;
}

type PosenetInput = ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | tf.Tensor3D;

class PoseNet extends Component<Props, State> {
  static defaultProps = {
    videoWidth: 600,
    videoHeight: 500,
    flipHorizontal: false,
    algorithm: 'single-pose',
    mobileNetArchitecture: {
      architecture: 'ResNet50',
      outputStride: 32,
      inputResolution: {width: 500, height: 500},
      multiplier: isMobile() ? 0.50 : 1.0,
    },
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
    maxPoseDetections: 2,
    nmsRadius: 20.0,
    outputStride: 16,
    imageScaleFactor: 0.5,
    skeletonColor: 'aqua',
    skeletonLineWidth: 2,
    loadingText: 'load posenet'
  }
  net: posenet.PoseNet | null;
  canvas: HTMLCanvasElement | null;
  video: HTMLMediaElement | null;

  constructor(props: Props) {
    super(props, PoseNet.defaultProps);
    this.state = {
      loading: true
    }

    this.net = null;
    this.canvas = null;
    this.video = null;
  }

  getCanvas = (ele: HTMLCanvasElement) => this.canvas = ele;

  getVideo = (ele: HTMLVideoElement) => this.video = ele;
  
  async componentWillMount() {
    // Loads the pre-trained PoseNet model
    const { mobileNetArchitecture } = this.props;
    this.net = await posenet.load(mobileNetArchitecture);
  }
  
  async componentDidMount() {
    try {
      await this.setupCamera()
    } catch(e) {
      throw 'This browser does not support video capture, or this device does not have a camera'
    } finally {
      this.setState({ loading: false })
    }

    this.detectPose()
  }

  setupCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw 'Browser API navigator.mediaDevices.getUserMedia not available'
    }

    if(this.video === null) {
      console.log('this video is null!')
      return;
    }

    const { videoWidth, videoHeight } = this.props
    const video = this.video
    const mobile = isMobile()

    // video.width = videoWidth
    // video.height = videoHeight

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: mobile ? void 0 : videoWidth,
        height: mobile ? void 0: videoHeight,
      }
    });

    video.srcObject = stream

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        // Once the video metadata is ready, we can start streaming video
        video.play()
        resolve(video)
      }
    })
  }

  detectPose = () => {
    if(this.canvas === null) {
      console.log('this canvas is null!')
      return;
    }

    const { videoWidth, videoHeight } = this.props
    const canvas = this.canvas
    const ctx = canvas.getContext('2d')

    canvas.width = videoWidth
    canvas.height = videoHeight

    this.poseDetectionFrame(ctx as CanvasRenderingContext2D)
  }

  poseDetectionFrame = (ctx: CanvasRenderingContext2D) => {
    const {
      algorithm,
      imageScaleFactor,
      flipHorizontal,
      outputStride,
      minPoseConfidence,
      maxPoseDetections,
      minPartConfidence,
      nmsRadius,
      videoWidth,
      videoHeight,
      showVideo,
      showPoints,
      showSkeleton,
      skeletonColor,
      skeletonLineWidth,
    } = this.props

    const net = this.net
    const video = this.video

    const poseDetectionFrameInner = async () => {
      if(net === null || video == null) return ;

      let poses: Pose[] = []

      switch (algorithm) {
        case 'single-pose':
          const pose = await net.estimateSinglePose(
            video as PosenetInput,
            {flipHorizontal: flipHorizontal}
          )

          poses.push(pose)

          break
        case 'multi-pose':

          poses = await net.estimateMultiplePoses(
            video as PosenetInput,
            {
              flipHorizontal: flipHorizontal,
              maxDetections: maxPoseDetections
            }
          )

          break
      }

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      if (showVideo) {
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-videoWidth, 0)
        ctx.drawImage(video as CanvasImageSource, 0, 0, videoWidth, videoHeight)
        ctx.restore()
      }

      // For each pose (i.e. person) detected in an image, loop through the poses
      // and draw the resulting skeleton and keypoints if over certain confidence
      // scores
      poses.forEach(({ score, keypoints }) => {
        if (score >= minPoseConfidence) {
          if (showPoints) {
            drawKeypoints(keypoints, minPartConfidence, skeletonColor, ctx);
          }
          if (showSkeleton) {
            drawSkeleton(keypoints, minPartConfidence, skeletonColor, skeletonLineWidth, ctx);
          }
          drawKeypoints(keypoints, minPartConfidence, skeletonColor, ctx);
          drawSkeleton(keypoints, minPartConfidence, skeletonColor, skeletonLineWidth, ctx);
        }
      })

      requestAnimationFrame(poseDetectionFrameInner)
    }

    poseDetectionFrameInner()
  }

  render() {
    const loading = this.state.loading
      ? <div className="PoseNet__loading">{ this.props.loadingText }</div>
      : ''
    return (
      <div className="PoseNet">
        { loading }
        <video playsInline ref={this.getVideo} />
        <canvas ref={this.getCanvas} />
      </div>
    )
  }
}

export default PoseNet;