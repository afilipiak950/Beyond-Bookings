import { documentProcessor } from './documentProcessor';
import { storage } from './storage';

// Debug function to test document processing
export async function debugDocumentProcessing() {
  console.log('=== Starting Document Processing Debug ===');
  
  // Test with a simple Excel file processing
  const testUploadData = {
    userId: '1',
    fileName: 'test.zip',
    originalFileName: 'test.zip',
    filePath: 'uploads/test.zip',
    fileSize: 3762,
    fileType: 'application/zip',
    uploadStatus: 'processing'
  };
  
  try {
    console.log('Testing ZIP file processing...');
    const result = await documentProcessor.processZipFile('uploads/test.zip', testUploadData, storage);
    console.log('Processing result:', result);
    
    // Check database state
    const uploads = await storage.getDocumentUploads('1');
    const analyses = await storage.getDocumentAnalyses('1');
    
    console.log('Database state:');
    console.log('- Uploads:', uploads.length);
    console.log('- Analyses:', analyses.length);
    
    return result;
  } catch (error) {
    console.error('Debug processing error:', error);
    throw error;
  }
}

// Auto-run debug when imported
if (require.main === module) {
  debugDocumentProcessing().catch(console.error);
}