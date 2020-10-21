import React, { Component } from 'react'
import * as posenet from '@tensorflow-models/posenet'
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

export default class PoseNet extends Component<Props, State> {
  static defaultProps = {
    videoWidth: 600,
    videoHeight: 500,
    flipHorizontal: true,
    algorithm: 'single-pose',
    mobileNetArchitecture: isMobile() ? 0.50 : 1.01,
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
  net: posenet.PoseNet;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement | CanvasImageSource | ImageBitmap;

  constructor(props: Props) {
    super(props, PoseNet.defaultProps);
    this.state = {
      loading: true
    }
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

    const { videoWidth, videoHeight } = this.props
    const video = this.video
    const mobile = isMobile()

    video.width = videoWidth
    video.height = videoHeight

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
    const { videoWidth, videoHeight } = this.props
    const canvas = this.canvas
    const ctx = canvas.getContext('2d')

    canvas.width = videoWidth
    canvas.height = videoHeight

    this.poseDetectionFrame(ctx)
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
      let poses: Pose[] = []

      switch (algorithm) {
        case 'single-pose':
          const pose = await net.estimateSinglePose(
            video,
            {flipHorizontal: flipHorizontal}
          )

          poses.push(pose)

          break
        case 'multi-pose':

          poses = await net.estimateMultiplePoses(
            video,
            imageScaleFactor,
            flipHorizontal,
            outputStride,
            maxPoseDetections,
            minPartConfidence,
            nmsRadius
          )

          break
      }

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      if (showVideo) {
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-videoWidth, 0)
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight)
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
        <video playsInline ref={ this.getVideo }></video>
        <canvas ref={ this.getCanvas }></canvas>
      </div>
    )
  }
}