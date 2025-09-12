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

interface SubchapterData {
  subchapterId: number;
  subchapterName: string;
  startPosition: number;
  endPosition: number;
  percentageStartPosition: number;
  percentageEndPosition: number;
  isActive: boolean;
  theme: string;
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
  chaptersData: ChapterData[] = [];
  subchaptersData: SubchapterData[] = []; // Array to store chapter data objects
  viewportTopPosition: number = 0; // Store current viewport top scroll position
  viewportBottomPosition: number = 0; // Store current viewport bottom scroll position
  private intersectionObserver?: IntersectionObserver;
  private scrollTimeout: any;
  private resizeObserver?: ResizeObserver;
  currentScrollPosition: number = 0;
  nextScrollPosition: number = 0;
  isTouchDevice: boolean = false;
  isTouchModeActive: boolean = false;
  isSnapScrolling: boolean = false;
  private snapScrollTimeout: any;

  private themeObject = [
    {
      theme: 'white',
      color: '#FFFFFF',
      scrollBarDividerColor: '#FFFFFF',
      chapterTitleColor: '#0093E3',
      scrollbarEmptyColor: '#DFDFDF',
      timelineTextEmptyColor: '#DFDFDF',
      scrollbarFillColor: '#0099EB',
      timelineTextFillColor: '#567787',
      treeIconColor: '#000000',
      isActive: false,
    },
    {
      theme: 'gray',
      color: '#646464',
      scrollBarDividerColor: '#646464',
      chapterTitleColor: '#FFFFFF',
      scrollbarEmptyColor: '#7C7C7C',
      timelineTextEmptyColor: '#7C7C7C',
      scrollbarFillColor: '#FFFFFF',
      timelineTextFillColor: '#FFFFFF',
      treeIconColor: '#000000',
      isActive: false,
    },
    {
      theme: 'blue',
      color: '#008BD6',
      scrollBarDividerColor: '#008BD6',
      chapterTitleColor: '#FFFFFF',
      scrollbarEmptyColor: '#189CD3',
      timelineTextEmptyColor: '#189CD3',
      scrollbarFillColor: '#FFFFFF',
      timelineTextFillColor: '#FFFFFF',
      treeIconColor: '#FFFFFF',
      isActive: false,
    },
    {
      theme: 'black',
      color: '#000000',
      scrollBarDividerColor: '#000000',
      chapterTitleColor: '#FFFFFF',
      scrollbarEmptyColor: '#2C2C2C',
      timelineTextEmptyColor: '#2C2C2C',
      scrollbarFillColor: '#FFFFFF',
      timelineTextFillColor: '#FFFFFF',
      treeIconColor: '#FFFFFF',
      isActive: false,
    },
    
  ]


  ngAfterViewInit() {
    // Detect touch device
    this.detectTouchDevice();
    
    // Set up intersection observer after view is initialized
    setTimeout(() => {
      this.setupChapterObserver();
      this.calculateChapterHeights(); // Calculate heights of all chapters
      this.calculateFullBookHeight(); // Calculate total height of full-book
      this.calculateScrollProgressBarHeight(); // Calculate scroll progress bar height
        this.setupResizeObserver(); // Set up resize observer for dynamic updates
        this.initializeChaptersData(); // Initialize chapters data array
        this.initializeSubchaptersData(); // Initialize subchapters data array
        this.getBackgroundColorAtPosition(100, 100);
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
    // Clean up snap scroll timeout
    if (this.snapScrollTimeout) {
      clearTimeout(this.snapScrollTimeout);
    }
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private lastScrollTop = 0;
  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    // Block input during snap scrolling
    if (this.isSnapScrolling) {
      return;
    }

    this.updateScrollProgress();
    this.updateFullBookScrollPosition();
    this.calculateHrMainToDisplayDistance();
    this.updateChaptersData();
    this.updateSubchaptersData();
    
    // Show scroll progress bar only for non-touch devices
    if (!this.isTouchDevice) {
      this.showScrollProgress();
    }

    // Clear existing timeout
     if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if(!this.isTouchDevice) {
        const currentScroll = window.scrollY || document.documentElement.scrollTop;

        if (currentScroll > this.lastScrollTop) {
          // User is scrolling down
          
          // Set timeout to detect when scrolling stops
          this.scrollTimeout = setTimeout(() => {
            this.handleScrollComplete_down();
          }, 150); // 150ms delay to detect scroll completion
        } else if (currentScroll < this.lastScrollTop) {
          // User is scrolling up

          // Set timeout to detect when scrolling stops
          this.scrollTimeout = setTimeout(() => {
            this.handleScrollComplete_up();
          }, 150); // 150ms delay to detect scroll completion
        }

        this.lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // avoid negative values
    }
  }

  // Handle scroll completion and snap-to functionality
  private handleScrollComplete_down(): void {
    // Check if viewport contains any snap-start element
    const snapStartElements = document.querySelectorAll('snap-start');
    let closestSnapElement: HTMLElement | null = null;
    let closestDistance = Infinity;

    snapStartElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      const viewportHeight = window.innerHeight;
      
      // Check if element is in viewport
      if (elementTop < viewportHeight && elementBottom > 0) {
        // Calculate distance from top of viewport
        const distance = Math.abs(elementTop);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSnapElement = element as HTMLElement;
        }
      }
    });

    // If we found a snap-start element in viewport, snap to it
    if (closestSnapElement) {
      this.snapToElementTop(closestSnapElement);
    }
    this.hideScrollProgress();

  }

  // Handle scroll completion and snap-to functionality
  private handleScrollComplete_up(): void {
    // Check if viewport contains any snap-start element
    const snapStartElements = document.querySelectorAll('snap-start');
    let closestSnapElement: HTMLElement | null = null;
    let closestDistance = Infinity;

    snapStartElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      const viewportHeight = window.innerHeight;
      
      // Check if element is in viewport
      if (elementTop < viewportHeight && elementBottom > 0) {
        // Calculate distance from top of viewport
        const distance = Math.abs(elementTop);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSnapElement = element as HTMLElement;
        }
      }
    });

    // If we found a snap-start element in viewport, snap to it
    if (closestSnapElement) {
      this.snapToElementBottom(closestSnapElement);
    }
    this.hideScrollProgress();
  }

  // Snap to a specific element
  private snapToElementTop(element: HTMLElement): void {
    this.isSnapScrolling = true;
    
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetPosition = rect.top + scrollTop;
    
    // Smooth scroll to the element
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });

    // Set timeout to re-enable input after scroll completes
    this.snapScrollTimeout = setTimeout(() => {
      this.isSnapScrolling = false;
      this.updateChaptersData();
      this.updateSubchaptersData();
    }, 200); // 800ms should be enough for smooth scroll to complete 
  }

  // Snap to the bottom of a specific element
  private snapToElementBottom(element: HTMLElement): void {
    this.isSnapScrolling = true;
    
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const targetPosition = rect.bottom + scrollTop - viewportHeight;
    
    // Smooth scroll to the bottom of the element
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    }); 

    // Set timeout to re-enable input after scroll completes
    this.snapScrollTimeout = setTimeout(() => {
      this.isSnapScrolling = false;
      this.updateChaptersData();
      this.updateSubchaptersData();
    }, 200); // 800ms should be enough for smooth scroll to complete
  }


  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    // Block input during snap scrolling
    if (this.isSnapScrolling) {
      event.preventDefault();
      return;
    }

    this.updateScrollProgress();
    this.updateFullBookScrollPosition();
    this.calculateHrMainToDisplayDistance();
    this.updateChaptersData();
    this.updateSubchaptersData();
    
    // Show scroll progress bar on wheel for non-touch devices (desktop/large screens)
    if (!this.isTouchDevice) {
      this.showScrollProgress();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const prevIsTouchDevice = this.isTouchDevice;
    
    // Re-detect touch device on resize
    this.detectTouchDevice();
    
    // Log current device type
    if (prevIsTouchDevice !== this.isTouchDevice) {
    
      if(!this.isTouchDevice) {
        const scrollProgressBar = document.querySelector('.scroll-progress-bar') as HTMLElement;
        if (scrollProgressBar) {
          scrollProgressBar.removeAttribute("style");
        }
          this.showScrollProgress();
      }
    }

     
   }

  // Get background color at specific position (top, right)
  private getBackgroundColorAtPosition(top: number, right: number): void {
    const viewportWidth = window.innerWidth;
    const x = viewportWidth - right; // Convert right to left position
    const y = top;
    
    const element = document.elementFromPoint(x, y);
    if (element) {
      const computedStyle = window.getComputedStyle(element);
      const backgroundColor = computedStyle.backgroundColor;
      
      // Convert RGB to hex if needed
      if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
        const rgbToHex = (rgb: string) => {
          const result = rgb.match(/\d+/g);
          if (result) {
            const r = parseInt(result[0]);
            const g = parseInt(result[1]);
            const b = parseInt(result[2]);
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          }
          return rgb;
        };
        
        const hexColor = rgbToHex(backgroundColor);
        this.themeObject.forEach((theme) => {
            if (theme.color.toUpperCase() === hexColor.toUpperCase()) {
              theme.isActive = true;
            } else {
              theme.isActive = false;
            }
          });
          if (this.themeObject.every(theme => !theme.isActive)) {
            this.themeObject[0].isActive = true;
          }
      }
    } else {
    }

    
  }

  updateElementsBasedOnThemeActive(element: string) {
    const obj = this.themeObject.find(theme => theme.isActive);
    if (obj) {
      return obj[element as keyof typeof obj];
    }
    return this.themeObject[0][element as keyof typeof this.themeObject[0]];
  }

  // Method to get label color based on scroll progress
  getLabelColor(chapter: ChapterData): string {
    const scrollProgressPercent = this.scrollProgress;
    const chapterStartPercent = chapter.percentageStartPosition;

    const obj = this.themeObject.find(theme => theme.isActive) 
          ? this.themeObject.find(theme => theme.isActive) 
          : this.themeObject[0];  

    // If scroll progress is before this chapter, use default color
    if (scrollProgressPercent <= chapterStartPercent) {
        return obj?.timelineTextEmptyColor as string;
    }
    return obj?.timelineTextFillColor as string;
  }


  // Detect if device is touch device or has screen size <= 767px
  detectTouchDevice(): void {
    // Check for touch capability
    const isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check for screen size <= 767px
    const isSmallScreen = window.innerWidth <= 767;
    
    // Check for hover capability (touch devices typically don't have hover)
    const hasHover = window.matchMedia('(hover: hover)').matches;
    
    // Check for fine pointer (mouse vs touch)
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    
    // // Device is considered touch device if:
    // // 1. Has touch capability AND (small screen OR no hover OR no fine pointer)
    // // 2. OR just small screen (regardless of other capabilities)
    this.isTouchDevice = (isTouchCapable && (isSmallScreen || !hasHover || !hasFinePointer)) || isSmallScreen;
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
    }
    
    // Update viewport positions
    this.updateViewportPositions();
  }

  // Update viewport top and bottom positions
  private updateViewportPositions(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    
    this.viewportTopPosition = scrollTop;
    this.viewportBottomPosition = scrollTop + viewportHeight;
  }

  private calculateHrMainToDisplayDistance() {
    const hrMain = document.querySelector('.hr-main-top') as HTMLElement;
    const displayElement = document.querySelector('.hr-main-fixed') as HTMLElement;
    
    if (hrMain && displayElement) {
      const hrMainRect = hrMain.getBoundingClientRect();
      const displayRect = displayElement.getBoundingClientRect();
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

  private hideScrollProgress() {
    // Hide the progress bar immediately
    this.isScrollProgressVisible = false;
    
    // Clear any existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
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
    this.themeObject.forEach((theme) => {
      theme.isActive = false;
    });
    this.themeObject[0].isActive = true;
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

      const totalFullHeight = this.getFullBookHeight();
      const totalFullHeightScaled = this.getFullBookHeight()*0.28;
      const scrollDistanceScaled = scrollDistance*0.28;
      const currentScrollProgressPercent = this.scrollProgress;
      
      // Update .full-book translation proportionally with scroll progress bar fill
      const fullBookElement = document.querySelector('.full-book') as HTMLElement;
      if (fullBookElement) {
        const translateY = (mousePercentage - 0.5) * scrollHeight * 0.28; // Proportional translation
        fullBookElement.style.transform = `translate(0px, ${translateY}px) scale(0.28)`;
      }
      
      this.scrollToPosition(event);
      // Update scroll progress for dynamic label colors during dragging
      this.updateScrollProgress();
      this.updateChaptersData();
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
    this.isDragScaling = false;
   this.getBackgroundColorAtPosition(100, 100);
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
    if (!this.isTouchModeActive) {
      const fullBookElement = document.querySelector('.full-book') as HTMLElement;
      if (fullBookElement) {
        fullBookElement.style.transform = 'none';
        fullBookElement.style.transition = 'transform 0.3s ease-in-out';
      }
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
      
      // Move to next chapter position
      currentPosition = endPosition;
    });
  }

  calculateFullBookHeight() {
    const fullBook = document.querySelector('.full-book') as HTMLElement;
    if (fullBook) {
      const oldHeight = this.fullBookHeight;
      this.fullBookHeight = fullBook.offsetHeight;
      
      // If height changed significantly, also recalculate chapter positions
      if (Math.abs(this.fullBookHeight - oldHeight) > 10) {
        this.calculateChapterHeights();
      }
    }
  }

  calculateScrollProgressBarHeight() {
    const progressBar = document.querySelector('.scroll-progress-bar') as HTMLElement;
    if (progressBar) {
      this.scrollProgressBarHeight = progressBar.offsetHeight;
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

  // Get the start position of a subchapter from the top
  getSubchapterStartPosition(subchapterElement: HTMLElement): number {
    const rect = subchapterElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.top + scrollTop;
  }

  // Get the end position of a subchapter from the top
  getSubchapterEndPosition(subchapterElement: HTMLElement): number {
    const rect = subchapterElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.bottom + scrollTop;
  }

  getChaptersData(): ChapterData[] {
    return this.chaptersData;
  }

  getSubchaptersData(): SubchapterData[] {
    return this.subchaptersData;
  }

  getViewportTopPosition(): number {
    return this.viewportTopPosition;
  }

  getViewportBottomPosition(): number {
    return this.viewportBottomPosition;
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
    } 
  }

  // Method to force recalculation of full book height
  recalculateFullBookHeight(): void {
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
          percentageStartPosition: Math.round(10*(100 * (startPosition / totalFullHeight)))/10,
          percentageEndPosition: Math.round(10*(100 * (endPosition / totalFullHeight)))/10,
          isActive: false, // Will be updated in updateChaptersData
          chapterId: index + 1
        };
        
        this.chaptersData.push(chapterData);
      }
    });

    // Get current scroll progress percentage (0-100)
    const currentScrollProgressPercent = this.scrollProgress;

    this.chaptersData.forEach((chapter) => {
      chapter.isActive = currentScrollProgressPercent >= chapter.percentageStartPosition && 
                         currentScrollProgressPercent < chapter.percentageEndPosition;
    });
  }

  // Initialize subchapters data array
  private initializeSubchaptersData(): void {
    this.subchaptersData = [];
    const bookPages = document.querySelectorAll('.book-page');
    
    bookPages.forEach((page, index) => {
      const subchapterName = page.getAttribute('subchapter') || '';
      if (subchapterName) {
        const startPosition = this.getSubchapterStartPosition(page as HTMLElement);
        const endPosition = this.getSubchapterEndPosition(page as HTMLElement);
        const totalFullHeight = this.getFullBookHeight();
        const theme = page.getAttribute('theme') || 'white'; // Extract theme attribute, default to 'white'
        
        const subchapterData: SubchapterData = {
          subchapterId: index + 1,
          subchapterName: subchapterName,
          startPosition: Math.round(startPosition),
          endPosition: Math.round(endPosition),
          percentageStartPosition: Math.round(10*(100 * (startPosition / totalFullHeight)))/10,
          percentageEndPosition: Math.round(10*(100 * (endPosition / totalFullHeight)))/10,
          isActive: false, // Will be updated in updateSubchaptersData
          theme: theme
        };
        
        this.subchaptersData.push(subchapterData);
      }
    });

    // Get current scroll progress percentage (0-100)
    const currentScrollProgressPercent = this.scrollProgress;

    this.subchaptersData.forEach((subchapter) => {
      subchapter.isActive = currentScrollProgressPercent >= subchapter.percentageStartPosition && 
                         currentScrollProgressPercent < subchapter.percentageEndPosition;
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
      if(currentScrollProgressPercent===100) {
        chapter.isActive = currentScrollProgressPercent >= chapter.percentageStartPosition && 
                        currentScrollProgressPercent <= chapter.percentageEndPosition;
      } else {
        chapter.isActive = currentScrollProgressPercent >= chapter.percentageStartPosition && 
                         currentScrollProgressPercent < chapter.percentageEndPosition;
      }
      
    });
  }

  // Update subchapters data with current scroll position
  private updateSubchaptersData(): void {
    if (this.subchaptersData.length === 0) {
      this.initializeSubchaptersData();
      return;
    }
    
    // // Get current scroll position
    // const currentScrollPosition = this.fullBookScrollPosition;
    // Get current scroll progress percentage (0-100)
    const currentScrollProgressPercent = this.scrollProgress;
    
    this.subchaptersData.forEach((subchapter) => {
      // Update isActive based on current scroll position
      
      
      if(currentScrollProgressPercent===100) {
        subchapter.isActive = currentScrollProgressPercent >= subchapter.percentageStartPosition && 
                           currentScrollProgressPercent <= subchapter.percentageEndPosition;
      } else {
        subchapter.isActive = currentScrollProgressPercent >= subchapter.percentageStartPosition && 
                          currentScrollProgressPercent < subchapter.percentageEndPosition;
      }
    });

    setTimeout(() => {
      this.getBackgroundColorAtPosition(100, 100);
    }, 300);
  }

  private setupChapterObserver() {
    // Create intersection observer to detect current chapter
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        // Find the entry with the largest intersection ratio
        let mostVisible = entries.reduce((prev, current) => {
          return (current.intersectionRatio > prev.intersectionRatio) ? current : prev;
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


  // Touch device button click handler
  onTouchButtonClick(): void {
    if (!this.isTouchDevice) return;
    
    this.isTouchModeActive = !this.isTouchModeActive;
    
    if (this.isTouchModeActive) {
      // Show scroll progress bar and scale down full book
      this.showTouchMode();
    } else {
      // Hide scroll progress bar and restore full book scale
      this.hideTouchMode();
    }
  }

  // Show touch mode - display scroll progress bar and scale full book
  showTouchMode(): void {
    const scrollProgressBar = document.querySelector('.scroll-progress-bar') as HTMLElement;
    const fullBookElement = document.querySelector('.full-book') as HTMLElement;
    
    if (scrollProgressBar) {
      scrollProgressBar.style.opacity = '1';
      scrollProgressBar.style.display = 'block';
      scrollProgressBar.style.pointerEvents = 'auto';
      scrollProgressBar.classList.add('touch-mode-active');
    }
    
    if (fullBookElement) {
      fullBookElement.style.transformOrigin = `50% 50px`;
      fullBookElement.style.transform = 'scale(0.28)';
      fullBookElement.style.transition = 'transform 0.3s ease-in-out';
    }
  }

  // Hide touch mode - hide scroll progress bar and restore full book scale
  hideTouchMode(): void {
    const scrollProgressBar = document.querySelector('.scroll-progress-bar') as HTMLElement;
    const fullBookElement = document.querySelector('.full-book') as HTMLElement;
    
    if (scrollProgressBar) {
      scrollProgressBar.style.opacity = '0';
      scrollProgressBar.style.display = 'none';
      scrollProgressBar.style.pointerEvents = 'none';
      scrollProgressBar.classList.remove('touch-mode-active');
    }
    
    if (fullBookElement) {
      fullBookElement.style.transform = 'none';
      fullBookElement.style.transition = 'transform 0.3s ease-in-out';
    }
  }

  
}
