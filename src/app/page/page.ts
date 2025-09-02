import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-page',
  imports: [],
  templateUrl: './page.html',
  styleUrl: './page.scss'
})
export class Page {
  scrollProgress: number = 0;
  isDragging: boolean = false;
  isDragScaling: boolean = false;

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    console.log('Scroll event triggered:', event);
    console.log('Scroll position X, Y:', window.scrollX, window.scrollY);
    this.updateScrollProgress();
  }

  private updateScrollProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (scrollHeight > 0) {
      this.scrollProgress = (scrollTop / scrollHeight) * 100;
    } else {
      this.scrollProgress = 0;
    }
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
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const targetScrollPosition = clickPercentage * scrollHeight;
    
    // Scroll to the target position (no smooth behavior for dragging)
    window.scrollTo({
      top: targetScrollPosition,
      behavior: this.isDragging ? 'auto' : 'smooth'
    });
  }

}
