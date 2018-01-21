/* global ResizeObserver */
import { uniqueId } from 'lodash'
// import produce from 'immer'
// import { tween } from 'popmotion'
import React, { Component } from 'react'
import { findDOMNode } from 'react-dom'

const DIRECTION_TO_LEFT = -1
const DIRECTION_TO_RIGHT = 1
const DIRECTION_TO_TOP = -1
const DIRECTION_TO_BOTTOM = 1

const PADDLE_WIDTH_SMALL = 64
const PADDLE_WIDTH_MEDIUM = 128
const PADDLE_WIDTH_LARGE = 256
const PADDLE_HEIGHT = 16
const PADDLE_MARGIN = 16

class Paddle {
    constructor({ stageWidth, stageHeight, x, directionX }) {
        this.stageWidth = stageWidth
        this.stageHeight = stageHeight
        this.width = PADDLE_WIDTH_MEDIUM
        this.height = PADDLE_HEIGHT
        this.x = typeof x === 'number' ? x : PADDLE_MARGIN
        this.directionX = directionX || DIRECTION_TO_RIGHT
    }

    get x2() {
        return this.x + this.width
    }

    get y() {
        return this.stageHeight - PADDLE_MARGIN - this.height
    }

    get y2() {
        return this.y + this.height
    }

    tick() {
        const stateChange = {}
        const isOverflowToRight = this.x2 > this.stageWidth
        const isToRight = this.directionX === DIRECTION_TO_RIGHT
        const isToLeft = this.directionX === DIRECTION_TO_LEFT

        if (isOverflowToRight) {
            stateChange.x = this.stageWidth - this.width
        } else if (isToRight) {
            const canProcess = this.x2 < this.stageWidth
            if (canProcess) {
                stateChange.x = this.x + 1
            } else {
                stateChange.directionX = DIRECTION_TO_LEFT
            }
        } else if (isToLeft) {
            const canProcess = this.x > 0
            if (canProcess) {
                stateChange.x = this.x - 1
            } else {
                stateChange.directionX = DIRECTION_TO_RIGHT
            }
        }

        return new Paddle({ ...this, ...stateChange })
    }

    updateStage({ width, height }) {
        return new Paddle({ ...this, stageWidth: width, stageHeight: height })
    }
}

const BALL_RADIUS = 8
const BALL_MARGIN = 16

class Ball {
    constructor({ id, stageWidth, stageHeight, cx, cy, directionX, directionY }) {
        this.id = id || uniqueId()
        this.stageWidth = stageWidth
        this.stageHeight = stageHeight
        this.radius = BALL_RADIUS
        this.cx = typeof cx === 'number' ? cx : BALL_MARGIN + this.radius
        this.cy = typeof cy === 'number' ? cy : BALL_MARGIN + this.radius
        this.directionX = directionX || DIRECTION_TO_RIGHT
        this.directionY = directionY || DIRECTION_TO_BOTTOM
    }

    get x() {
        return this.cx - this.radius
    }

    get x2() {
        return this.cx + this.radius
    }

    get y() {
        return this.cy - this.radius
    }

    get y2() {
        return this.cy + this.radius
    }

    tick(paddle) {
        const stateChange = {}
        const isToBottom = this.directionY === DIRECTION_TO_BOTTOM
        const isToTop = this.directionY === DIRECTION_TO_TOP

        // todo: stage

        if (isToBottom) {
            const isInsidePaddle =
                paddle.y <= this.y2 &&
                paddle.y2 >= this.y2 &&
                paddle.x < this.x2 &&
                paddle.x2 > this.x
            if (isInsidePaddle) {
                stateChange.directionY = DIRECTION_TO_TOP
            } else {
                stateChange.cy = this.cy + 1
            }
        } else if (isToTop) {
            const canProcess = this.y > 0
            if (canProcess) {
                stateChange.cy = this.cy - 1
            } else {
                stateChange.directionY = DIRECTION_TO_BOTTOM
            }
        }

        return new Ball({ ...this, ...stateChange })
    }

    updateStage({ width, height }) {
        return new Ball({ ...this, stageWidth: width, stageHeight: height })
    }
}

const Stage = ({ width, height, paddle, balls }) => (
    <svg className="Stage" viewBox={`0 0 ${width} ${height}`}>
        {balls &&
            balls.map((ball) => (
                <circle
                    key={ball.id}
                    className="Stage__ball"
                    cx={ball.cx}
                    cy={ball.cy}
                    r={ball.radius}
                />
            ))}

        {paddle && (
            <rect
                className="Stage__paddle"
                x={paddle.x}
                y={paddle.y}
                width={paddle.width}
                height={paddle.height}
            />
        )}
    </svg>
)

class App extends Component {
    state = {
        stageWidth: 0,
        stageHeight: 0,
        paddle: null,
        balls: null,
        score: 0,
    }
    appEl = null
    resizeObserver = null
    requestId = null

    componentDidMount() {
        this.appEl = findDOMNode(this)

        this.resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            this.setState(({ paddle, balls }) => ({
                stageWidth: width,
                stageHeight: height,
                paddle: paddle.updateStage({ width, height }),
                balls: balls.map((ball) => ball.updateStage({ width, height })),
            }))
        })
        this.resizeObserver.observe(this.appEl)

        const gameLoop = () => {
            this.requestId = requestAnimationFrame(gameLoop)

            this.setState(({ paddle, balls, score }) => {
                const tickedPaddle = paddle.tick()
                return {
                    paddle: tickedPaddle,
                    balls: balls.map((ball) => ball.tick(tickedPaddle)),
                    score: score + 1,
                }
            })
        }
        this.requestId = requestAnimationFrame(gameLoop)

        this.setState(() => {
            const stageWidth = this.appEl.offsetWidth
            const stageHeight = this.appEl.offsetHeight
            const paddle = new Paddle({ stageWidth, stageHeight })
            const ball = new Ball({ stageWidth, stageHeight, cx: stageWidth / 2 })

            return {
                stageWidth,
                stageHeight,
                paddle,
                balls: [ball],
            }
        })
    }

    componentWillUnmount() {
        if (this.resizeObserver) {
            this.resizeObserver.unobserve(this.appEl)
            this.resizeObserver.disconnect()
            this.resizeObserver = null
        }

        cancelAnimationFrame(this.requestId)
    }

    render() {
        const { stageWidth, stageHeight, paddle, balls, score } = this.state

        return (
            <div className="App">
                <Stage width={stageWidth} height={stageHeight} paddle={paddle} balls={balls} />

                <div className="Status">Score : {score}</div>

                <div className="Overlay" />
            </div>
        )
    }
}

export default App
