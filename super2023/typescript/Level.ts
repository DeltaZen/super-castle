/** This file is part of Super Holy Chalice.
 * https://github.com/mvasilkov/super2023
 * @license GPLv3 | Copyright (c) 2023 Mark Vasilkov
 */
'use strict'

import { easeInOutQuad, lerp } from '../node_modules/natlib/interpolation.js'
import { ShortBool, type ExtendedBool } from '../node_modules/natlib/prelude.js'
import { enterPhase, interpolatePhase } from '../node_modules/natlib/state.js'
import { Board } from './Board.js'
import { Cluster, PieceType, type Piece } from './Piece.js'
import { cascadeMove } from './rules.js'
import { Settings, con, linearToSrgb, srgbToLinear, wrapAround } from './setup.js'
import { DuckPhase, duckState, oscillatorState } from './state.js'

export class Level {
    readonly board: Board
    readonly active: Set<Piece>
    // Rendering properties
    readonly cellSize: number
    readonly boardLeft: number
    readonly boardTop: number

    constructor(width: number, height: number) {
        this.board = new Board(width, height)
        this.active = new Set

        this.cellSize = Math.min(Settings.SCREEN_WIDTH / width, Settings.SCREEN_HEIGHT / height)
        this.boardLeft = 0.5 * (Settings.SCREEN_WIDTH - width * this.cellSize)
        this.boardTop = 0.5 * (Settings.SCREEN_HEIGHT - height * this.cellSize)
    }

    tryMove(piece: Piece, Δx: -1 | 1, Δy: 0): ExtendedBool
    tryMove(piece: Piece, Δx: 0, Δy: -1 | 1): ExtendedBool

    /** Move a piece. Return TRUE on failure. */
    tryMove(piece: Piece, Δx: number, Δy: number): ExtendedBool {
        const plan = cascadeMove(this.board, piece, Δx, Δy)
        if (!plan) return ShortBool.TRUE
        for ([piece, Δx, Δy] of plan) {
            this.board.putPiece(piece, piece.x + Δx, piece.y + Δy)
            if (this.board.positions[piece.y]![piece.x]!.some(p => p.type === PieceType.CUTTER)) {
                piece.killed = ShortBool.TRUE
            }
            this.active.add(piece)
        }

        if (!this.board.pieces[PieceType.DUCK]?.filter(d => !d.killed).length) {
            // Don't kill the last duck: undo the changes.
            for ([piece, Δx, Δy] of plan) {
                this.board.putPiece(piece, piece.x - Δx, piece.y - Δy)
                piece.killed = ShortBool.FALSE
                this.active.delete(piece)
            }
            return ShortBool.TRUE
        }

        this.updateDucksOnGoal(duckState.ducksOnGoalNext)
        enterPhase(duckState, DuckPhase.MOVING, Settings.MOVE_DURATION)
        // .DeadCode
        return
        // .EndDeadCode
    }

    updateDucksOnGoal(collection: Set<Piece>) {
        this.board.pieces[PieceType.DUCK]?.forEach(duck => {
            const onGoal = this.board.positions[duck.y]![duck.x]!.some(p => p.type === PieceType.GOAL)

            if (onGoal) collection.add(duck)
            else collection.delete(duck)
        })
    }

    connectDucklings(ducks: Piece[]) {
        const clusters: Set<Cluster> = new Set

        ducks.forEach(duck => {
            this.board.getBorderingPieces(duck, PieceType.DUCKLING)?.forEach(duckling => {
                clusters.add(duckling.cluster!)
            })
        })

        if (!clusters.size) return

        clusters.forEach(cluster => {
            cluster.pieces.forEach(duckling => {
                this.board.discardPiece(duckling)
                const duck = this.board.createPiece(PieceType.DUCK, duckling.x, duckling.y)
                this.active.add(duck)
            })
        })

        new Cluster(this.board.pieces[PieceType.DUCK]!)

        enterPhase(duckState, DuckPhase.CONNECTING, Settings.CONNECT_DURATION)
    }

    render(t: number) {
        const tDuck = duckState.phase === DuckPhase.MOVING ?
            easeInOutQuad(interpolatePhase(duckState, Settings.MOVE_DURATION, t)) :
            duckState.phase === DuckPhase.CONNECTING ?
                easeInOutQuad(interpolatePhase(duckState, Settings.CONNECT_DURATION, t)) : 0

        const tOscillator = interpolatePhase(oscillatorState, Settings.OSCILLATOR_DURATION, t)

        const colorDuckEntering = '#' +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0xa7 / 255), srgbToLinear(0xff / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0xf0 / 255), srgbToLinear(0xcd / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0x70 / 255), srgbToLinear(0x75 / 255), tDuck)) * 255).toString(16)
        const secondaryColorDuckEntering = '#' +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0x38 / 255), srgbToLinear(0xef / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0xb7 / 255), srgbToLinear(0x7d / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0x64 / 255), srgbToLinear(0x57 / 255), tDuck)) * 255).toString(16)

        const colorDuckLeaving = '#' +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0xff / 255), srgbToLinear(0xa7 / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0xcd / 255), srgbToLinear(0xf0 / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0x75 / 255), srgbToLinear(0x70 / 255), tDuck)) * 255).toString(16)
        const secondaryColorDuckLeaving = '#' +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0xef / 255), srgbToLinear(0x38 / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0x7d / 255), srgbToLinear(0xb7 / 255), tDuck)) * 255).toString(16) +
            Math.floor(linearToSrgb(lerp(srgbToLinear(0x57 / 255), srgbToLinear(0x64 / 255), tDuck)) * 255).toString(16)

        for (let y = 0; y < this.board.height; ++y) {
            for (let x = 0; x < this.board.width; ++x) {
                const pieces = this.board.positions[y]![x]! // .Inline(1)
                const tVibe = wrapAround(tOscillator + Settings.OSCILLATOR_INCREMENT * (x - 0.85 * y))

                pieces.forEach(piece => this.renderPiece(piece, x, y, tDuck, tVibe, colorDuckEntering, secondaryColorDuckEntering, colorDuckLeaving, secondaryColorDuckLeaving))
            }
        }
    }

    renderPiece(piece: Piece, x: number, y: number, tDuck: number, tVibe: number, colorDuckEntering: string, secondaryColorDuckEntering: string, colorDuckLeaving: string, secondaryColorDuckLeaving: string) {
        if (duckState.phase === DuckPhase.MOVING && this.active.has(piece)) {
            x += lerp(piece.oldPosition.x - piece.x, 0, tDuck)
            y += lerp(piece.oldPosition.y - piece.y, 0, tDuck)
        }

        let size = this.cellSize
        x = x * size + this.boardLeft
        y = y * size + this.boardTop

        if (piece.killed) {
            size = lerp(size, 0, tDuck)
            const padding = 0.5 * (this.cellSize - size)
            x += padding
            y += padding
        }

        const bh = Settings.BLOCK_HEIGHT * size

        const duckColors = ['#ffcd75', colorDuckEntering, colorDuckLeaving, '#a7f070']
        const duckSecondaryColors = ['#ef7d57', secondaryColorDuckEntering, secondaryColorDuckLeaving, '#38b764']

        switch (piece.type) {
            case PieceType.DUCK:
                const colorIndex = (duckState.ducksOnGoal.has(piece) ? 1 : 0) + (duckState.ducksOnGoalNext.has(piece) ? 2 : 0)

                con.fillStyle = duckSecondaryColors[colorIndex]!
                con.fillRect(x, y - bh + size, size, bh)

                con.fillStyle = duckColors[colorIndex]!
                con.fillRect(x, y - bh, size, size)

                if (duckState.phase === DuckPhase.CONNECTING && this.active.has(piece)) {
                    const progress = size * tDuck

                    con.fillStyle = '#566c86'
                    con.fillRect(x + progress, y - bh + size, size - progress, bh)

                    con.fillStyle = '#94b0c2'
                    con.fillRect(x + progress, y - bh, size - progress, size)
                }
                break
            case PieceType.DUCKLING:
                con.fillStyle = '#566c86'
                con.fillRect(x, y - bh + size, size, bh)

                con.fillStyle = '#94b0c2'
                con.fillRect(x, y - bh, size, size)
                break
            case PieceType.BOX:
                con.fillStyle = '#333c57'
                con.fillRect(x, y - bh + size, size, bh)

                con.fillStyle = '#566c86'
                con.fillRect(x, y - bh, size, size)
                break
            case PieceType.CUTTER:
                const x0 = x + 0.5 * size
                const y0 = y + 0.5 * size
                const r = 0.25 * size * (1 - tVibe)
                const r2 = r + 0.25 * size
                const r3 = r + 0.5 * size
                const opacity = Math.floor(lerp(0, 255, tVibe))

                con.beginPath()
                con.arc(x0, y0, r, 0, 2 * Math.PI)
                con.moveTo(x0 + r2, y0)
                con.arc(x0, y0, r2, 0, 2 * Math.PI)
                con.strokeStyle = '#ea323c'
                con.stroke()

                con.beginPath()
                con.arc(x0, y0, r3, 0, 2 * Math.PI)
                con.strokeStyle = '#ea323c' + opacity.toString(16).padStart(2, '0')
                con.stroke()
                break
            case PieceType.GOAL:
                const step = size / Settings.HATCHING_AMOUNT

                con.beginPath()
                for (let n = 0; n < Settings.HATCHING_AMOUNT; ++n) {
                    const sn = step * (n + 0.5)

                    con.moveTo(x, y + sn)
                    con.lineTo(x + sn, y)
                    con.moveTo(x + size, y + size - sn)
                    con.lineTo(x + size - sn, y + size)
                }
                con.strokeStyle = '#a7f070'
                con.stroke()
        }
    }
}
