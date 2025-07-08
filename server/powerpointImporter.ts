import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface ImportedSlide {
  id: string;
  title: string;
  content: string;
  type: 'title' | 'content' | 'section' | 'comparison' | 'closing';
  backgroundGradient: string;
  layout?: string;
  originalXml?: string;
}

export interface ImportedPresentation {
  slides: ImportedSlide[];
  title: string;
  theme?: string;
  metadata?: {
    author?: string;
    company?: string;
    created?: string;
    modified?: string;
  };
}

export class PowerPointImporter {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      parseTrueNumberOnly: false,
      allowBooleanAttributes: true,
      removeNSPrefix: true,
      ignoreNameSpace: false,
      parseTagValue: false,
      trimValues: true,
      cdataTagName: '__cdata',
      cdataPositionChar: '\\c',
      localeRange: '',
      parseNodeValue: true,
      parseAttributeValue: false,
      textNodeName: '#text',
      arrayMode: false,
      stopNodes: ['*.pre', '*.script'],
      alwaysCreateTextNode: false,
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        if (['sld', 'slide', 'sp', 'shape', 'p', 'paragraph', 'r', 'run', 't', 'text'].includes(name)) {
          return true;
        }
        return false;
      }
    });
  }

  async importPresentation(filePath: string): Promise<ImportedPresentation> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(fileBuffer);

      // Extract presentation metadata
      const metadata = await this.extractMetadata(zipContent);
      
      // Find and process slides
      const slides: ImportedSlide[] = [];
      const slideFiles = Object.keys(zipContent.files).filter(
        fileName => fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')
      );

      // Sort slides by number
      slideFiles.sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
        const bNum = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
        return aNum - bNum;
      });

      console.log(`Found ${slideFiles.length} slides in PowerPoint file`);

      for (const slideFile of slideFiles) {
        const slideContent = await zipContent.file(slideFile)?.async('string');
        if (slideContent) {
          const slide = await this.parseSlide(slideContent, slides.length + 1);
          slides.push(slide);
        }
      }

      // If no slides were found, create a fallback slide
      if (slides.length === 0) {
        console.warn('No slides found in PowerPoint file, creating fallback slide');
        slides.push({
          id: 'slide-1',
          title: 'Imported Presentation',
          content: 'Content could not be extracted from the PowerPoint file. Please edit this slide to add your content.',
          type: 'title',
          backgroundGradient: 'from-blue-600 to-purple-800'
        });
      }

      // Extract presentation title from core properties or first slide
      const title = metadata.title || slides[0]?.title || 'Imported Presentation';

      return {
        slides,
        title,
        metadata
      };
    } catch (error) {
      console.error('Error importing PowerPoint:', error);
      
      // Return a fallback presentation if import fails completely
      return {
        slides: [
          {
            id: 'slide-1',
            title: 'Import Failed',
            content: 'The PowerPoint file could not be imported. Please check the file format and try again.',
            type: 'title',
            backgroundGradient: 'from-red-600 to-orange-600'
          }
        ],
        title: 'Import Failed',
        metadata: {}
      };
    }
  }

  private async extractMetadata(zipContent: JSZip): Promise<any> {
    try {
      const corePropsFile = zipContent.file('docProps/core.xml');
      if (corePropsFile) {
        const corePropsContent = await corePropsFile.async('string');
        const parsed = this.parser.parse(corePropsContent);
        
        return {
          title: parsed.coreProperties?.title || '',
          author: parsed.coreProperties?.creator || '',
          company: parsed.coreProperties?.company || '',
          created: parsed.coreProperties?.created || '',
          modified: parsed.coreProperties?.modified || ''
        };
      }
    } catch (error) {
      console.warn('Could not extract metadata:', error);
    }
    return {};
  }

  private async parseSlide(slideXml: string, slideNumber: number): Promise<ImportedSlide> {
    try {
      const parsed = this.parser.parse(slideXml);
      
      // Extract text content from slide
      const textContent = this.extractTextFromSlide(parsed);
      
      // Determine slide type and extract title/content
      const { title, content, type } = this.categorizeSlideContent(textContent, slideNumber);
      
      // Generate appropriate background gradient based on content
      const backgroundGradient = this.generateBackgroundGradient(type, slideNumber);

      return {
        id: `slide-${slideNumber}`,
        title,
        content,
        type,
        backgroundGradient,
        originalXml: slideXml
      };
    } catch (error) {
      console.error(`Error parsing slide ${slideNumber}:`, error);
      return {
        id: `slide-${slideNumber}`,
        title: `Slide ${slideNumber}`,
        content: 'Content extraction failed',
        type: 'content',
        backgroundGradient: 'from-gray-600 to-gray-800',
        originalXml: slideXml
      };
    }
  }

  private extractTextFromSlide(parsed: any): string[] {
    const textElements: string[] = [];
    
    // Recursive function to extract text from nested XML structure
    const extractText = (obj: any, depth: number = 0) => {
      // Prevent infinite recursion
      if (depth > 20) return;
      
      if (typeof obj === 'string') {
        const trimmed = obj.trim();
        if (trimmed.length > 0) {
          textElements.push(trimmed);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => extractText(item, depth + 1));
      } else if (obj && typeof obj === 'object') {
        // Look for text nodes in PowerPoint XML structure
        if (obj.t || obj['#text']) {
          const text = obj.t || obj['#text'];
          if (typeof text === 'string' && text.trim()) {
            textElements.push(text.trim());
          }
        }
        
        // Continue recursively through all properties
        Object.values(obj).forEach(value => extractText(value, depth + 1));
      }
    };
    
    try {
      extractText(parsed);
    } catch (error) {
      console.warn('Error extracting text from slide:', error);
      return ['Slide content could not be extracted'];
    }
    
    // Filter out empty strings and duplicates, limit to reasonable length
    return textElements
      .filter((text, index, arr) => 
        text.length > 0 && text.length < 1000 && arr.indexOf(text) === index
      )
      .slice(0, 50); // Limit to first 50 text elements
  }

  private categorizeSlideContent(textContent: string[], slideNumber: number): {
    title: string;
    content: string;
    type: 'title' | 'content' | 'section' | 'comparison' | 'closing';
  } {
    const allText = textContent.join(' ').toLowerCase();
    
    // Determine slide type based on content and position
    let type: 'title' | 'content' | 'section' | 'comparison' | 'closing' = 'content';
    
    if (slideNumber === 1) {
      type = 'title';
    } else if (allText.includes('vergleich') || allText.includes('comparison') || allText.includes('vs')) {
      type = 'comparison';
    } else if (allText.includes('danke') || allText.includes('thank') || allText.includes('kontakt') || allText.includes('contact')) {
      type = 'closing';
    } else if (textContent.length <= 2 && textContent[0] && textContent[0].length < 50) {
      type = 'section';
    }
    
    // Extract title (usually first or largest text block)
    const title = textContent[0] || `Slide ${slideNumber}`;
    
    // Extract content (remaining text)
    const content = textContent.slice(1).join('\n\n') || 'Content from imported slide';
    
    return { title, content, type };
  }

  private generateBackgroundGradient(type: string, slideNumber: number): string {
    const gradients = {
      title: 'from-blue-600 to-purple-800',
      content: 'from-gray-600 to-gray-800',
      section: 'from-indigo-600 to-purple-700',
      comparison: 'from-green-600 to-blue-700',
      closing: 'from-purple-600 to-pink-700'
    };
    
    return gradients[type] || 'from-gray-600 to-gray-800';
  }
}

export const powerpointImporter = new PowerPointImporter();