import * as posenet from '@tensorflow-models/posenet';
import { Keypoint } from '@tensorflow-models/posenet';

interface coordinate {
  x: number;
  y: number;
}

const isAndroid = () => /Android/i.test(navigator.userAgent);

const isiOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

export const isMobile = () => isAndroid() || isiOS();

export const drawKeypoints = (keypoints: any, minConfidence: number, skeletonColor: string | CanvasGradient | CanvasPattern, ctx: CanvasRenderingContext2D, scale: number = 1) => {
    keypoints.forEach((keypoint: any) => {
      if (keypoint.score >= minConfidence) {
        const { y, x } = keypoint.position
        ctx.beginPath()
        ctx.arc(x * scale, y * scale, 3, 0, 2 * Math.PI)
        ctx.fillStyle = skeletonColor
        ctx.fill()
      }
    })
}

const toTuple = ({y, x}: coordinate) => [y, x]

const drawSegment = ([ay, ax]: [number, number], [by, bx]: [number, number], color: string | CanvasGradient | CanvasPattern, lineWidth: number, scale: number, ctx: CanvasRenderingContext2D) => {
  ctx.beginPath()
  ctx.moveTo(ax * scale, ay * scale)
  ctx.lineTo(bx * scale, by * scale)
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = color
  ctx.stroke()
}

export const drawSkeleton = (keypoints: Keypoint[], minConfidence: number, color: string | CanvasGradient | CanvasPattern, lineWidth: number, ctx: CanvasRenderingContext2D, scale: number = 1) => {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence)

  adjacentKeyPoints.forEach(keypoints => {
    drawSegment(
      toTuple(keypoints[0].position),
      toTuple(keypoints[1].position),
      color, lineWidth, scale, ctx
    )
  })
}