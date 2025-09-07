import { Component, HostListener } from '@angular/core';
import { BookContent } from './book-content/book-content';

@Component({
  selector: 'app-book',
  imports: [BookContent],
  templateUrl: './book.html',
  styleUrl: './book.scss'
})
export class Book {
  isDragScaling: boolean = false;

  // @HostListener('window:scroll', ['$event'])
  // onScroll(event: Event) {
  //   // console.log('Scroll event triggered:', event);
  //   // console.log('Scroll position X, Y:', window.scrollX, window.scrollY);
  // }
}
