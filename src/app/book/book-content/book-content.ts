import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  AfterViewInit,
  OnDestroy,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-book-content',
  templateUrl: './book-content.html',
  styleUrl: './book-content.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BookContent implements AfterViewInit, OnDestroy {
  currentChapter: string = '';
  scrollProgress: number = 0;
  isDragging: boolean = false;
  isScrollProgressVisible: boolean = false;
  isDragScaling: boolean = false;
  private intersectionObserver?: IntersectionObserver;
  private scrollTimeout: any;

  ngAfterViewInit() {
    // Set up intersection observer after view is initialized
    setTimeout(() => {
      this.setupChapterObserver();
    }, 100);
  }

  ngOnDestroy() {
    // Clean up intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    // Clean up scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    this.updateScrollProgress();
    this.showScrollProgress();
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    this.updateScrollProgress();
    this.showScrollProgress();
  }

  private updateScrollProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if (scrollHeight > 0) {
      this.scrollProgress = (scrollTop / scrollHeight) * 100;
    } else {
      this.scrollProgress = 0;
    }
  }

  private showScrollProgress() {
    // Show the progress bar immediately
    this.isScrollProgressVisible = true;

    // Clear any existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set a new timeout to hide after 700ms
    this.scrollTimeout = setTimeout(() => {
      this.isScrollProgressVisible = false;
    }, 700);
  }

  onProgressBarClick(event: MouseEvent) {
    // Don't trigger click if we just finished dragging
    if (this.isDragging) {
      return;
    }

    this.scrollToPosition(event);
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.isDragScaling = true;
    this.showScrollProgress(); // Show progress bar when interacting
    event.preventDefault(); // Prevent text selection
    this.scrollToPosition(event);
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      event.preventDefault();
      this.scrollToPosition(event);
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
    this.isDragScaling = false;
  }

  private scrollToPosition(event: MouseEvent) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();

    // Calculate the click/drag position relative to the progress bar
    const clickY = event.clientY - rect.top;
    const barHeight = rect.height;

    // Clamp the position within the bar bounds
    const clampedY = Math.max(0, Math.min(clickY, barHeight));

    // Calculate the percentage of where the user clicked/dragged (0 to 1)
    const clickPercentage = clampedY / barHeight;

    // Calculate the target scroll position
    const scrollHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const targetScrollPosition = clickPercentage * scrollHeight;

    // Scroll to the target position (no smooth behavior for dragging)
    window.scrollTo({
      top: targetScrollPosition,
      behavior: this.isDragging ? 'auto' : 'smooth',
    });
  }

  private setupChapterObserver() {
    // Create intersection observer to detect current chapter
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        // Find the entry with the largest intersection ratio
        let mostVisible = entries.reduce((prev, current) => {
          console.log('current.intersectionRatio', current.intersectionRatio);
          console.log('prev.intersectionRatio', prev.intersectionRatio);
          return (current.intersectionRatio > prev.intersectionRatio) ? current : prev;
          // return current.intersectionRatio > 0 ? current : prev;
        });

        if (mostVisible.intersectionRatio > 0.1) {
          // Get the chapter attribute from the book-section element
          const bookSection = mostVisible.target as HTMLElement;
          if (bookSection && bookSection.classList.contains('book-section')) {
            const chapter = bookSection.getAttribute('chapter');
            if (chapter && chapter.trim()) {
              this.currentChapter = chapter.trim();
            } else {
              this.currentChapter = '';
            }
          }
        }
      },
      {
        root: null, // Use viewport as root
        rootMargin: '-20% 0px -20% 0px', // Trigger when element is 20% into viewport
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0], // Multiple thresholds for better detection
      }
    );

    // Observe all book-section elements
    const bookSections = document.querySelectorAll('.book-section');
    bookSections.forEach((section) => {
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(section);
      }
    });
  }
}
