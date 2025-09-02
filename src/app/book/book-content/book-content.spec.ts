import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookContent } from './book-content';

describe('BookContent', () => {
  let component: BookContent;
  let fixture: ComponentFixture<BookContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookContent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
