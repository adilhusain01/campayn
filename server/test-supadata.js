import dotenv from 'dotenv';
import { Supadata } from '@supadata/js';

// Load environment variables
dotenv.config();

async function testSupadata() {
  console.log('🧪 Testing Supadata API...');
  console.log(`🔑 API Key configured: ${!!process.env.SUPADATA_API_KEY}`);
  console.log(`🔑 API Key length: ${process.env.SUPADATA_API_KEY?.length || 0} characters`);
  console.log(`🔑 API Key value: ${process.env.SUPADATA_API_KEY}`);

  try {
    // Initialize Supadata client
    const supadata = new Supadata({
      apiKey: process.env.SUPADATA_API_KEY,
    });

    console.log('✅ Supadata client initialized');

    // Test video URL
    const testVideoUrl = 'https://youtu.be/a7_WFUlFS94';
    console.log(`🎬 Testing with video: ${testVideoUrl}`);

    // Fetch transcript
    const transcript = await supadata.transcript({
      url: testVideoUrl,
      text: true,
      mode: "auto"
    });

    console.log('✅ Transcript fetch successful!');
    console.log(`📝 Full response:`, transcript);
    console.log(`📝 Content length: ${transcript.content?.length || 0} characters`);
    console.log(`📝 Content type: ${typeof transcript.content}`);
    console.log(`🌐 Language: ${transcript.lang || 'Unknown'}`);
    console.log(`🔤 Available languages: ${transcript.availableLangs?.join(', ') || 'None'}`);

    if (transcript.content && typeof transcript.content === 'string') {
      console.log(`📄 First 200 characters of transcript:`);
      console.log(transcript.content.substring(0, 200) + '...');
    } else {
      console.log(`⚠️  No transcript content available. This video might not have captions/subtitles.`);
    }

    console.log('\n🎉 Supadata test completed successfully!');

  } catch (error) {
    console.error('❌ Supadata test failed:');
    console.error(`Error message: ${error.message}`);
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error code: ${error.code || 'N/A'}`);
    console.error(`Error status: ${error.status || 'N/A'}`);

    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }

    console.error('Full error object:', error);
    process.exit(1);
  }
}

// Run the test
testSupadata();