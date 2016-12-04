import { Component, OnInit, Input } from '@angular/core';
import { StoreService } from './store.service';

@Component({
    selector: 'square',
    template: `
    <img src="{{imgUrl}}" width="250px" height="250px">
  `
})
export class SquareComponent implements OnInit {
    @Input() id: number;
    private value: string;
    private imgUrl: string;
    constructor(private store: StoreService) { }
    ngOnInit(): void {
        this.value = this.store.getState()['board'][this.id]
        this.imgUrl = `./transparent.png`
        const unsubChangeValue = this.store.subscribe((char): void => {
            // Checking for move
            const board = this.store.getState()['board']
            if (char === this.value) return
            this.value = char
            this.imgUrl = this.value === 'X' ? `./X.png` : `./O.png`
            this.store.dispatch({ lockKeys: [`board.${this.id}`] })
            const winningCombos = {
                0: [[1, 2], [3, 6], [4, 8]],
                1: [[0, 2], [4, 7]],
                2: [[0, 1], [4, 6], [5, 8]],
                3: [[0, 6], [4, 5]],
                4: [[0, 8], [1, 7], [2, 6]],
                5: [[2, 8], [3, 4]],
                6: [[0, 3], [2, 4], [7, 8]],
                7: [[1, 4], [6, 8]],
                8: [[0, 4], [2, 5], [6, 7]]
            }

            // Checking for winner
            if (winningCombos[this.id].some(indexPair => indexPair.every(index => board[index] === board[this.id]))) this.store.dispatch({ type: 'WIN', player: char })

            // If win, this won't matter because state is locked. It will attempt a state and the lockedState status should reject it. If no win, it is needed.
            this.store.dispatch({ type: 'SWITCH' })
            unsubChangeValue()
        }, `board.${this.id}`)
    }
}
