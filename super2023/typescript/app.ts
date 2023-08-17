/** This file is part of Super Holy Chalice.
 * https://github.com/mvasilkov/super2023
 * @license GPLv3 | Copyright (c) 2023 Mark Vasilkov
 */
'use strict'

import { Input } from '../node_modules/natlib/controls/Keyboard.js'
import { register0, register1 } from '../node_modules/natlib/runtime.js'
import { startMainloop } from '../node_modules/natlib/scheduling/mainloop.js'
import { updatePhase } from '../node_modules/natlib/state.js'
import { Level } from './Level.js'
import { Cluster, PieceType, type Piece } from './Piece.js'
import { Settings, con, keyboard, pointer } from './setup.js'
import { DuckPhase, duckPhaseMap, duckState } from './state.js'

//#region Move to another file
const level = new Level(16, 16)

new Cluster([
    level.board.createPiece(PieceType.BOX, 3, 3),
    level.board.createPiece(PieceType.BOX, 4, 3),
    level.board.createPiece(PieceType.BOX, 3, 4),
    level.board.createPiece(PieceType.BOX, 4, 4),
])

level.board.createPiece(PieceType.CUTTER, 6, 6)

new Cluster([
    level.board.createPiece(PieceType.DUCK, 8, 7),
    level.board.createPiece(PieceType.DUCK, 7, 8),
    level.board.createPiece(PieceType.DUCK, 8, 8),
    level.board.createPiece(PieceType.DUCK, 9, 8),
    level.board.createPiece(PieceType.DUCK, 8, 9),
])

new Cluster([
    level.board.createPiece(PieceType.DUCKLING, 5, 11),
    level.board.createPiece(PieceType.DUCKLING, 4, 12),
    level.board.createPiece(PieceType.DUCKLING, 5, 12),
    level.board.createPiece(PieceType.DUCKLING, 6, 12),
])

new Cluster([
    level.board.createPiece(PieceType.DUCKLING, 3, 13),
    level.board.createPiece(PieceType.DUCKLING, 4, 13),
    level.board.createPiece(PieceType.DUCKLING, 5, 13),
    level.board.createPiece(PieceType.DUCKLING, 4, 14),
])

level.board.createPiece(PieceType.GOAL, 13, 14)
level.board.createPiece(PieceType.GOAL, 14, 14)
level.board.createPiece(PieceType.GOAL, 15, 14)
level.board.createPiece(PieceType.GOAL, 14, 15)
//#endregion

type MoveScalar = -1 | 0 | 1
type MoveScalarNonzero = -1 | 1

function updateControls() {
    const left = keyboard.state[Input.LEFT] || keyboard.state[Input.LEFT_A]
    const up = keyboard.state[Input.UP] || keyboard.state[Input.UP_W]
    const right = keyboard.state[Input.RIGHT] || keyboard.state[Input.RIGHT_D]
    const down = keyboard.state[Input.DOWN] || keyboard.state[Input.DOWN_S]

    // Left XOR right || up XOR down
    if ((left ? !right : right) || (up ? !down : down)) {
        const ducks = level.board.pieces[PieceType.DUCK] ?? []
        if (!ducks.length) return

        const Δx = (right ? 1 : 0) - (left ? 1 : 0) as MoveScalar
        const Δy = (down ? 1 : 0) - (up ? 1 : 0) as MoveScalar

        if (Δx) {
            ducks.sort((a, b) => Δx * (b.x - a.x))
            if (!level.tryMove(ducks[0]!, Δx, 0)) return
        }

        if (Δy) {
            ducks.sort((a, b) => Δy * (b.y - a.y))
            if (!level.tryMove(ducks[0]!, 0, Δy)) return
        }
    }

    if (pointer.held) {
        const ducks = level.board.pieces[PieceType.DUCK] ?? []
        if (!ducks.length) return

        // Pointer position in board coordinates
        register0.set(
            (pointer.x - level.boardLeft) / level.cellSize - 0.5,
            (pointer.y - level.boardTop) / level.cellSize - 0.5)

        // Centroid of ducks
        register1.set(
            ducks.reduce((xs, duck) => xs + duck.x, 0) / ducks.length,
            ducks.reduce((ys, duck) => ys + duck.y, 0) / ducks.length)

        let Δx: number, Δy: number
        const x = Math.abs(Δx = register0.x - register1.x)
        const y = Math.abs(Δy = register0.y - register1.y)

        if (x < y) {
            if (y < Settings.POINTER_DEAD_ZONE) return
            Δy = Δy < 0 ? -1 : 1
            ducks.sort((a, b) => Δy * (b.y - a.y))
            level.tryMove(ducks[0]!, 0, Δy as MoveScalarNonzero)
        }
        else {
            if (x < Settings.POINTER_DEAD_ZONE) return
            Δx = Δx < 0 ? -1 : 1
            ducks.sort((a, b) => Δx * (b.x - a.x))
            level.tryMove(ducks[0]!, Δx as MoveScalarNonzero, 0)
        }
    }
}

function update() {
    const oldPhase = updatePhase(duckState, duckPhaseMap)

    switch (duckState.phase) {
        case DuckPhase.INTERACTIVE:
            if (oldPhase === DuckPhase.MOVING || oldPhase === DuckPhase.CONNECTING) {
                const ducks: Piece[] = []

                for (const piece of level.active) {
                    // Does nothing if oldPhase === DuckPhase.CONNECTING
                    piece.oldPosition.copy(piece)

                    if (piece.type === PieceType.DUCK) {
                        ducks.push(piece)
                    }
                }
                level.active.clear()

                level.updateDucksOnGoal()
                level.connectDucklings(ducks)
            }
            // Could've changed in connectDucklings()
            if (duckState.phase === DuckPhase.INTERACTIVE) {
                updateControls()
            }
    }
}

function render(t: number) {
    con.fillStyle = '#1a1c2c'
    con.fillRect(0, 0, Settings.SCREEN_WIDTH, Settings.SCREEN_HEIGHT)

    level.render(t)
}

startMainloop(update, render)
