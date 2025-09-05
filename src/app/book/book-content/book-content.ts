import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  AfterViewInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChapterData {
  chapterName: string;
  startPosition: number;
  endPosition: number;
  totalFullHeight: number;
  percentageStartPosition: number;
  percentageEndPosition: number;
  isActive: boolean;
  chapterId: number;
}

@Component({
  selector: 'app-book-content',
  templateUrl: './book-content.html',
  styleUrl: './book-content.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule],
  standalone: true,
})
export class BookContent implements AfterViewInit, OnDestroy {
  chapterHeight: number = 0;
  scrollProgress: number = 0;
  isDragging: boolean = false;
  isScrollProgressVisible: boolean = false;
  isDragScaling: boolean = false;
  chapterHeights: Map<string, number> = new Map(); // Map to store heights for each chapter
  chapterPositions: Map<string, {start: number, end: number}> = new Map(); // Map to store start/end positions
  fullBookHeight: number = 0; // Store the total height of full-book
  scrollProgressBarHeight: number = 0; // Store the height of scroll progress bar
  fullBookScrollPosition: number = 0; // Store the current scroll position of full-book from top
  hrMainToDisplayDistance: number = 0; // Store the distance between hr-main-top and hr-main-fixed
  chaptersData: ChapterData[] = []; // Array to store chapter data objects
  private intersectionObserver?: IntersectionObserver;
  private scrollTimeout: any;
  private resizeObserver?: ResizeObserver;
  currentScrollPosition: number = 0;
  nextScrollPosition: number = 0;


  ngAfterViewInit() {
    // Set up intersection observer after view is initialized
    setTimeout(() => {
      this.setupChapterObserver();
      this.calculateChapterHeights(); // Calculate heights of all chapters
      this.calculateFullBookHeight(); // Calculate total height of full-book
      this.calculateScrollProgressBarHeight(); // Calculate scroll progress bar height
      this.setupResizeObserver(); // Set up resize observer for dynamic updates
      this.initializeChaptersData(); // Initialize chapters data array
    }, 500); // Increased timeout to allow more time for content to load
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
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    this.updateScrollProgress();
    this.updateFullBookScrollPosition();
    this.calculateHrMainToDisplayDistance();
    this.updateChaptersData();
    this.showScrollProgress();
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    this.updateScrollProgress();
    this.updateFullBookScrollPosition();
    this.calculateHrMainToDisplayDistance();
    this.updateChaptersData();
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

  private updateFullBookScrollPosition() {
    const fullBook = document.querySelector('.full-book') as HTMLElement;
    if (fullBook) {
      const rect = fullBook.getBoundingClientRect();
      this.fullBookScrollPosition = Math.abs(rect.top);
      ////console.log(`Full book scroll position from top: ${this.fullBookScrollPosition}px`);
    }
  }

  private calculateHrMainToDisplayDistance() {
    const hrMain = document.querySelector('.hr-main-top') as HTMLElement;
    const displayElement = document.querySelector('.hr-main-fixed') as HTMLElement;
    
    if (hrMain && displayElement) {
      const hrMainRect = hrMain.getBoundingClientRect();
      const displayRect = displayElement.getBoundingClientRect();
      
      // Calculate the distance between the bottom of hr-main-top and the top of the display
      this.hrMainToDisplayDistance = Math.round(displayRect.top - hrMainRect.bottom);
      ////console.log(`Distance between hr-main-top and hr-main-fixed: ${this.hrMainToDisplayDistance}px`);
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
    
    // Calculate initial positions for scaling and translation
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const barHeight = rect.height;
    const clampedY = Math.max(0, Math.min(clickY, barHeight));
    const clickPercentage = clampedY / barHeight;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const targetScrollPosition = clickPercentage * scrollHeight;
    
    // Apply initial scaling and translation to .full-book
    const fullBookElement = document.querySelector('.full-book') as HTMLElement;
    if (fullBookElement) {
      console.log(111)
      fullBookElement.style.transformOrigin = `50% ${targetScrollPosition + 300}px`;
      fullBookElement.style.transform = `scale(0.28)`;
      fullBookElement.style.transition = 'transform 0.3s ease-in-out';
    }
    
    this.scrollToPosition(event);
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      event.preventDefault();
      
      const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      // Calculate current scroll progress for proportional translation
      const progressBar = event.currentTarget as HTMLElement;
      const rect = progressBar.getBoundingClientRect();
      const mouseY = event.clientY - rect.top;
      const barHeight = rect.height;
      const clampedY = Math.max(0, Math.min(mouseY, barHeight));
      const mousePercentage = clampedY / barHeight;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const targetScrollPosition = mousePercentage * scrollHeight;

      const scrollDistance = targetScrollPosition - currentScrollPosition;
      
      // Update .full-book translation proportionally with scroll progress bar fill
      const fullBookElement = document.querySelector('.full-book') as HTMLElement;
      if (fullBookElement) {
        console.log(222)
        const translateY = (mousePercentage - 0.5) * scrollHeight * 0.28; // Proportional translation
        fullBookElement.style.transform = `translate(0px, ${translateY}px) scale(0.28)`;
        
        // fullBookElement.style.transformOrigin = `50% ${translateY + 300}px`;
        // fullBookElement.style.transform = `translate(0px, ${-scrollDistance}px) scale(0.28)`;
        // fullBookElement.style.transition = 'transform 0.3s ease-in-out';

        // const hrDistance = this.hrMainToDisplayDistance;
        // const hrDistancePC = 100*this.getHrMainToDisplayDistance()/this.getFullBookHeight();
        // fullBookElement.style.transformOrigin = `50% ${hrDistancePC + 10}%`;
        // fullBookElement.style.transform = `translate(0%, ${-hrDistancePC}%) scale(0.28)`;
        // fullBookElement.style.transition = 'transform 0.3s ease-in-out';
      }
      
      this.scrollToPosition(event);
      // Update scroll progress for dynamic label colors during dragging
      this.updateScrollProgress();
      this.updateChaptersData();
    }


    // // Get current scroll position
    // const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // // Calculate target scroll position
    // const progressBar = event.currentTarget as HTMLElement;
    // const rect = progressBar.getBoundingClientRect();
    // const clickY = event.clientY - rect.top;
    // const barHeight = rect.height;
    // const clampedY = Math.max(0, Math.min(clickY, barHeight));
    // const clickPercentage = clampedY / barHeight;
    // const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    // const targetScrollPosition = clickPercentage * scrollHeight;
    // const scrollDistance = targetScrollPosition - currentScrollPosition;

    // // Log current and target positions
    // console.log(`Current scroll position: ${Math.round(currentScrollPosition)}px`);
    // console.log(`Target scroll position: ${Math.round(targetScrollPosition)}px`);
    // console.log(`Scroll distance: ${Math.round(scrollDistance)}px`);

    // // Dynamically change transform-origin for .drag-scaling based on target scroll position
    // const fullBookElement = document.querySelector('.full-book') as HTMLElement;
    // if (fullBookElement) {
    //   // if (this.isDragScaling) {
    //     // dragScalingElement.style.transformOrigin = `50% ${targetScrollPosition + 50}px`;
    //     fullBookElement.style.transform = `translate(0px, ${-scrollDistance + 50}px) scale(0.28)`;
    //     fullBookElement.style.transition = 'transform 0.3s ease-in-out';
    //   // } else {
    //   //   dragScalingElement.style.transform = 'none';
    //   // }
    // } 
  }

  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
    this.isDragScaling = false;

    // Get the final scroll progress bar position
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    const barHeight = rect.height;
    const clampedY = Math.max(0, Math.min(mouseY, barHeight));
    const finalPercentage = clampedY / barHeight;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const finalScrollPosition = finalPercentage * scrollHeight;

    // Reset .full-book to normal scale
    const fullBookElement = document.querySelector('.full-book') as HTMLElement;
    if (fullBookElement) {
      fullBookElement.style.transform = 'none';
      fullBookElement.style.transition = 'transform 0.3s ease-in-out';
    }

    // Scroll to the final proportional position
    window.scrollTo({
      top: finalScrollPosition,
      behavior: 'smooth'
    });
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




    // // Get current scroll position
    // const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // // Calculate target scroll position
    // // const progressBar = event.currentTarget as HTMLElement;
    // // const rect = progressBar.getBoundingClientRect();
    // // const clickY = event.clientY - rect.top;
    // // const barHeight = rect.height;
    // // const clampedY = Math.max(0, Math.min(clickY, barHeight));
    // // const clickPercentage = clampedY / barHeight;
    // // const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    // // const targetScrollPosition = clickPercentage * scrollHeight;
    // const scrollDistance = targetScrollPosition - currentScrollPosition;

    // // Log current and target positions
    // console.log(`Current scroll position: ${Math.round(currentScrollPosition)}px`);
    // console.log(`Target scroll position: ${Math.round(targetScrollPosition)}px`);
    // console.log(`Scroll distance: ${Math.round(scrollDistance)}px`);

    // // Dynamically change transform-origin for .drag-scaling based on target scroll position
    // const fullBookElement = document.querySelector('.full-book') as HTMLElement;
    // if (fullBookElement) {
    //   // if (this.isDragScaling) {
    //     fullBookElement.style.transformOrigin = `50% ${targetScrollPosition + 50}px`;
    //     fullBookElement.style.transform = `translate(0px, ${-scrollDistance + 50}px) scale(0.28)`;
    //     // fullBookElement.style.transition = 'transform 0.3s ease-in-out';
    //     // fullBookElement.style.transformOrigin = `50% ${targetScrollPosition * 0.28 + 50}px`;
    //     // fullBookElement.style.transform = `translate(0px, ${-scrollDistance * 0.28 + 50}px) scale(0.28)`;
    //   // } else {
    //   //   dragScalingElement.style.transform = 'none';
    //   // }
    // }

    
  }

  private calculateChapterHeights() {
    // Get all book-section elements
    const bookSections = document.querySelectorAll('.book-section');
    let currentPosition = 0;
    
    bookSections.forEach((section) => {
      const bookSection = section as HTMLElement;
      const chapter = bookSection.getAttribute('chapter') || 'Unknown';
      const height = bookSection.offsetHeight;
      const startPosition = currentPosition;
      const endPosition = currentPosition + height;
      
      // Store the height in our map
      this.chapterHeights.set(chapter, height);
      
      // Store the start and end positions
      this.chapterPositions.set(chapter, {
        start: startPosition,
        end: endPosition
      });
      
      ////console.log(`Chapter "${chapter}" height: ${height}px, start: ${startPosition}px, end: ${endPosition}px`);
      
      // Move to next chapter position
      currentPosition = endPosition;
    });
  }

  calculateFullBookHeight() {
    const fullBook = document.querySelector('.full-book') as HTMLElement;
    if (fullBook) {
      const oldHeight = this.fullBookHeight;
      this.fullBookHeight = fullBook.offsetHeight;
      ////console.log(`Full book height: ${this.fullBookHeight}px (was: ${oldHeight}px)`);
      
      // If height changed significantly, also recalculate chapter positions
      if (Math.abs(this.fullBookHeight - oldHeight) > 10) {
        ////console.log('Significant height change detected, recalculating chapter positions');
        this.calculateChapterHeights();
      }
    } else {
      console.warn('Full book element not found');
    }
  }

  calculateScrollProgressBarHeight() {
    const progressBar = document.querySelector('.scroll-progress-bar') as HTMLElement;
    if (progressBar) {
      this.scrollProgressBarHeight = progressBar.offsetHeight;
      ////console.log(`Scroll progress bar height: ${this.scrollProgressBarHeight}px`);
    }
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      this.calculateScrollProgressBarHeight();
      this.calculateFullBookHeight(); // Recalculate full book height when it changes
    });
    const progressBar = document.querySelector('.scroll-progress-bar');
    if (progressBar) {
      this.resizeObserver.observe(progressBar);
    }
    
    // Also observe the full-book element for height changes
    const fullBook = document.querySelector('.full-book');
    if (fullBook) {
      this.resizeObserver.observe(fullBook);
    }
    
    // Also observe the viewport for zoom and window resize changes
    this.resizeObserver.observe(document.documentElement);
  }

  getChapterHeight(chapter: string): number {
    return this.chapterHeights.get(chapter) || 0;
  }

  getChapterStartPosition(chapter: string): number {
    return this.chapterPositions.get(chapter)?.start || 0;
  }

  getChapterEndPosition(chapter: string): number {
    return this.chapterPositions.get(chapter)?.end || 0;
  }

  getFullBookHeight(): number {
    return this.fullBookHeight;
  }

  getScrollProgressBarHeight(): number {
    return this.scrollProgressBarHeight;
  }

  getFullBookScrollPosition(): number {
    return this.fullBookScrollPosition;
  }

  getHrMainToDisplayDistance(): number {
    return this.hrMainToDisplayDistance;
  }

  getChaptersData(): ChapterData[] {
    return this.chaptersData;
  }

  // Method to scroll to a specific chapter
  scrollToChapter(chapterName: string): void {
    const startPosition = this.getChapterStartPosition(chapterName);
    if (startPosition !== undefined) {
      // Add a small offset to ensure the chapter appears at the top of the viewport
      // This accounts for any fixed elements or padding that might affect positioning
      const scrollOffset = 10; // Small offset to ensure perfect alignment
      const targetPosition = Math.max(0, startPosition - scrollOffset);
      
      window.scrollTo({
        top: targetPosition + 11,
        behavior: 'smooth'
      });
      console.log(`Scrolling to chapter: ${chapterName} at position: ${targetPosition}px (original: ${startPosition}px)`);
    } else {
      console.warn(`Chapter "${chapterName}" not found`);
    }
  }

  // Method to force recalculation of full book height
  recalculateFullBookHeight(): void {
    ////console.log('Forcing recalculation of full book height');
    this.calculateFullBookHeight();
  }

  // Initialize chapters data array
  private initializeChaptersData(): void {
    this.chaptersData = [];
    const bookSections = document.querySelectorAll('.book-section');
    
    bookSections.forEach((section, index) => {
      const chapterName = section.getAttribute('chapter') || '';
      if (chapterName) {
        const startPosition = this.getChapterStartPosition(chapterName);
        const endPosition = this.getChapterEndPosition(chapterName);
        const totalFullHeight = this.getFullBookHeight();
        
        const chapterData: ChapterData = {
          chapterName: chapterName,
          startPosition: startPosition,
          endPosition: endPosition,
          totalFullHeight: totalFullHeight,
          percentageStartPosition: Math.round(100 * (startPosition / totalFullHeight)),
          percentageEndPosition: Math.round(100 * (endPosition / totalFullHeight)),
          isActive: false, // Will be updated in updateChaptersData
          chapterId: index + 1
        };
        
        this.chaptersData.push(chapterData);
      }
    });

    this.chaptersData.forEach((chapter) => {
      chapter.isActive = this.fullBookScrollPosition >= chapter.startPosition && 
                         this.fullBookScrollPosition < chapter.endPosition;
    });
  }

  // Update chapters data with current scroll position
  private updateChaptersData(): void {
    if (this.chaptersData.length === 0) {
      this.initializeChaptersData();
      return;
    }
    
    // Get current scroll progress percentage (0-100)
    const currentScrollProgressPercent = this.scrollProgress;
    
    this.chaptersData.forEach((chapter) => {
      // Update isActive based on scroll progress bar percentage fill
      chapter.isActive = currentScrollProgressPercent >= chapter.percentageStartPosition && 
                         currentScrollProgressPercent < chapter.percentageEndPosition;
      
      // // Update totalFullHeight in case it changed
      // chapter.totalFullHeight = this.getFullBookHeight();
      
      // // Recalculate percentages
      // chapter.percentageStartPosition = Math.round(100 * (chapter.startPosition / chapter.totalFullHeight));
      // chapter.percentageEndPosition = Math.round(100 * (chapter.endPosition / chapter.totalFullHeight));
    });
    
    // Log active chapter
    const activeChapter = this.chaptersData.find(chapter => chapter.isActive);
    if (activeChapter) {
      //console.log('Active chapter:', activeChapter.chapterName);
    }
  }

  private setupChapterObserver() {
    // Create intersection observer to detect current chapter
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        // Find the entry with the largest intersection ratio
        let mostVisible = entries.reduce((prev, current) => {
          ////console.log('current.intersectionRatio', current.intersectionRatio);
          ////console.log('prev.intersectionRatio', prev.intersectionRatio);
          return (current.intersectionRatio > prev.intersectionRatio) ? current : prev;
          // return current.intersectionRatio > 0 ? current : prev;
        });

                 if (mostVisible.intersectionRatio > 0.1) {
           // Get the chapter attribute from the book-section element
           const bookSection = mostVisible.target as HTMLElement;
           if (bookSection && bookSection.classList.contains('book-section')) {
             const chapter = bookSection.getAttribute('chapter');
             if (chapter && chapter.trim()) {
               // Update the current chapter height
               this.chapterHeight = this.getChapterHeight(chapter.trim());
             } else {
               this.chapterHeight = 0;
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

  // Method to get label color based on scroll progress
  getLabelColor(chapter: ChapterData): string {
    const scrollProgressPercent = this.scrollProgress;
    const chapterStartPercent = chapter.percentageStartPosition;
    // const chapterEndPercent = chapter.percentageEndPosition;
    
    // If scroll progress is before this chapter, use default color
    if (scrollProgressPercent <= chapterStartPercent) {
      return '#ccc'; // Grey
    }
    
    // If scroll progress is within this chapter, use the dynamic fill color
    const scrollProgressFill = document.querySelector('.scroll-progress-fill') as HTMLElement;
    if (scrollProgressFill) {
      const computedStyle = window.getComputedStyle(scrollProgressFill);
      return computedStyle.backgroundColor;
    }
    return '#007bff'; // Fallback blue color
  }
}
