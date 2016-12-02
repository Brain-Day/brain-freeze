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
        const unsubChangeValue = this.store.subscribe(() => {
            // Checking for move
            const char = this.store.getState()['board'][this.id]
            if (char === this.value) return
            this.value = char
            this.imgUrl = this.value === 'X' ? `./X.png` : `./O.png`
            this.store.dispatch({ lockKeys: [`board.${this.id}`] })
            this.store.dispatch({ type: 'CHECK_WIN', id: this.id})
            this.store.dispatch({ type: 'SWITCH' })
            unsubChangeValue()
        })
    }
}
