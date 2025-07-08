import { powerpointImporter } from './powerpointImporter';
import path from 'path';
import fs from 'fs';

export async function extractUserPresentation() {
  try {
    const presentationPath = path.join(process.cwd(), 'uploads', 'user_presentation.pptx');
    
    if (!fs.existsSync(presentationPath)) {
      console.log('User presentation not found, using default');
      return null;
    }

    console.log('Extracting user presentation from:', presentationPath);
    const importedPresentation = await powerpointImporter.importPresentation(presentationPath);
    
    console.log('Extracted presentation:', importedPresentation);
    return importedPresentation;
  } catch (error) {
    console.error('Error extracting user presentation:', error);
    return null;
  }
}