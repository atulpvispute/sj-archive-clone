import { Component, signal } from '@angular/core';
import { Book } from './book/book';


@Component({
  selector: 'app-root',
  imports: [Book],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('assignment-1');
}
