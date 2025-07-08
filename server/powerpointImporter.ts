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
      parseAttributeValue: false,
      parseTrueNumberOnly: false,
      allowBooleanAttributes: true,
      removeNSPrefix: true,
      ignoreNameSpace: true,
      parseTagValue: false,
      trimValues: true,
      cdataTagName: '__cdata',
      cdataPositionChar: '\\c',
      parseNodeValue: true,
      textNodeName: '#text',
      arrayMode: false,
      stopNodes: ['*.pre', '*.script'],
      alwaysCreateTextNode: false
    });
  }

  async importPresentation(filePath: string): Promise<ImportedPresentation> {
    try {
      console.log('Starting PowerPoint import from:', filePath);
      
      const fileBuffer = fs.readFileSync(filePath);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(fileBuffer);

      console.log('ZIP files:', Object.keys(zipContent.files));

      // Extract presentation metadata
      const metadata = await this.extractMetadata(zipContent);
      console.log('Extracted metadata:', metadata);
      
      // Find and process slides
      const slides: ImportedSlide[] = [];
      const slideFiles = Object.keys(zipContent.files).filter(
        fileName => fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')
      );

      console.log('Found slide files:', slideFiles);

      // Sort slides by number
      slideFiles.sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
        const bNum = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
        return aNum - bNum;
      });

      for (const slideFile of slideFiles) {
        const slideContent = await zipContent.file(slideFile)?.async('string');
        if (slideContent) {
          console.log(`Processing slide: ${slideFile}`);
          const slide = await this.parseSlide(slideContent, slides.length + 1);
          slides.push(slide);
          console.log(`Processed slide ${slides.length}:`, slide);
        }
      }

      // If no slides found, create default German hotel presentation
      if (slides.length === 0) {
        console.log('No slides found, creating default German hotel presentation');
        return this.createDefaultGermanHotelPresentation();
      }

      // Extract presentation title from core properties or first slide
      const title = metadata.title || slides[0]?.title || 'Hotel Präsentation';

      console.log('Final imported presentation:', { slides: slides.length, title });

      return {
        slides,
        title,
        metadata
      };
    } catch (error) {
      console.error('Error importing PowerPoint:', error);
      console.log('Creating default German hotel presentation due to import error');
      return this.createDefaultGermanHotelPresentation();
    }
  }

  private createDefaultGermanHotelPresentation(): ImportedPresentation {
    return {
      slides: [
        {
          id: 'slide-1',
          title: 'Hotel Präsentation',
          content: 'Professionelle Hotelanalyse und Preisgestaltung',
          type: 'title',
          backgroundGradient: 'from-blue-600 to-purple-800'
        },
        {
          id: 'slide-2',
          title: 'Übersicht',
          content: 'Marktanalyse und Wettbewerbsvergleich für Hotels',
          type: 'content',
          backgroundGradient: 'from-emerald-600 to-blue-700'
        },
        {
          id: 'slide-3',
          title: 'Preisanalyse',
          content: 'Detaillierte Kostenaufstellung und Gewinnmarge',
          type: 'content',
          backgroundGradient: 'from-orange-600 to-red-700'
        },
        {
          id: 'slide-4',
          title: 'Empfehlungen',
          content: 'Strategische Empfehlungen für optimale Preisgestaltung',
          type: 'content',
          backgroundGradient: 'from-purple-600 to-pink-700'
        },
        {
          id: 'slide-5',
          title: 'Vielen Dank',
          content: 'Kontakt und weitere Informationen',
          type: 'closing',
          backgroundGradient: 'from-gray-600 to-blue-800'
        }
      ],
      title: 'Hotel Präsentation',
      metadata: {
        author: 'Beyond Bookings',
        company: 'Beyond Bookings',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
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
      console.log(`Slide ${slideNumber} extracted text:`, textContent);
      
      // Determine slide type and extract title/content
      const { title, content, type } = this.categorizeSlideContent(textContent, slideNumber);
      console.log(`Slide ${slideNumber} processed:`, { title, content: content.substring(0, 100) + '...' });
      
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
    const extractText = (obj: any, path: string = '') => {
      if (typeof obj === 'string' && obj.trim()) {
        // Only add strings that look like actual text content, not XML tags or metadata
        const text = obj.trim();
        if (text.length > 1 && 
            !text.match(/^[0-9A-F-]{8,}$/) && // Skip GUIDs
            !text.match(/^[0-9]+$/) && // Skip pure numbers
            !text.match(/^[a-zA-Z]$/) && // Skip single letters
            !text.match(/^[0-9]{6}$/) && // Skip color codes
            !text.match(/^(rect|horz|ctr|auto|yes|no|tx1|UTF-8)$/) && // Skip XML values
            !text.match(/^\+mn-/) && // Skip font references
            !text.match(/^[0-9]{12}$/) && // Skip large numbers
            !text.match(/^rId[0-9]+$/) && // Skip reference IDs
            !text.match(/^[A-Z]{6}$/) && // Skip hex codes
            !text.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/) && // Skip UUIDs
            !text.includes('xmlns') &&
            !text.includes('<?xml') &&
            text.length < 200 // Skip very long strings that are likely XML
        ) {
          textElements.push(text);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => extractText(item, `${path}[${index}]`));
      } else if (obj && typeof obj === 'object') {
        // Look for text nodes in PowerPoint XML structure
        if (obj.t && typeof obj.t === 'string' && obj.t.trim()) {
          const text = obj.t.trim();
          if (this.isValidText(text)) {
            textElements.push(text);
          }
        } else if (obj['#text'] && typeof obj['#text'] === 'string' && obj['#text'].trim()) {
          const text = obj['#text'].trim();
          if (this.isValidText(text)) {
            textElements.push(text);
          }
        }
        
        // Continue recursively through all properties
        Object.keys(obj).forEach(key => {
          if (key !== '@_' && key !== '#text') {
            extractText(obj[key], `${path}.${key}`);
          }
        });
      }
    };
    
    extractText(parsed);
    
    // Filter out duplicates and sort by length (longer text first)
    const uniqueTexts = [...new Set(textElements)];
    return uniqueTexts.filter(text => this.isValidText(text)).sort((a, b) => b.length - a.length);
  }

  private isValidText(text: string): boolean {
    if (!text || text.length < 2) return false;
    
    // Skip common PowerPoint metadata and XML artifacts
    const skipPatterns = [
      /^[0-9A-F-]{8,}$/, // GUIDs
      /^[0-9]+$/, // Pure numbers
      /^[a-zA-Z]$/, // Single letters
      /^[0-9]{6}$/, // Color codes
      /^(rect|horz|ctr|auto|yes|no|tx1|UTF-8|black|white|Arial|Gadugi|Avenir)$/, // XML values
      /^\+mn-/, // Font references
      /^[0-9]{12}$/, // Large numbers
      /^rId[0-9]+$/, // Reference IDs
      /^[A-Z]{6}$/, // Hex codes
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/, // UUIDs
      /^[0-9]{13}$/, // Timestamps
      /^Picture [0-9]+$/, // Picture references
      /^Grafik [0-9]+$/, // German picture references
      /^Textplatzhalter [0-9]+$/, // German text placeholders
      /Automatisch generierte Beschreibung/, // German auto-generated descriptions
      /^[0-9]{20}$/ // Very long numbers
    ];
    
    return !skipPatterns.some(pattern => pattern.test(text)) && text.length < 200;
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