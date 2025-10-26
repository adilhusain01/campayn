import { GoogleGenerativeAI } from '@google/generative-ai';
import { Supadata } from '@supadata/js';

class AIVerificationService {
  constructor() {
    console.log(`🔧 Initializing AIVerificationService...`);
    console.log(`🔑 GEMINI_API_KEY configured: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`🔑 SUPADATA_API_KEY configured: ${!!process.env.SUPADATA_API_KEY}`);
    console.log(`🔑 SUPADATA_API_KEY value: ${process.env.SUPADATA_API_KEY}`);

    // Don't initialize clients here - will be lazy loaded
    this._genAI = null;
    this._model = null;
    this._supadata = null;

    console.log(`✅ AIVerificationService initialized successfully`);
  }

  // Lazy initialization of Gemini AI client
  getGeminiModel() {
    if (!this._model) {
      console.log(`🔧 Lazy initializing Gemini AI client...`);
      console.log(`🔑 GEMINI_API_KEY at lazy init: ${!!process.env.GEMINI_API_KEY}`);
      console.log(`🔑 GEMINI_API_KEY value: ${process.env.GEMINI_API_KEY}`);
      this._genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this._model = this._genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      console.log(`✅ Gemini AI client initialized`);
    }
    return this._model;
  }

  // Lazy initialization of Supadata client
  getSupadataClient() {
    if (!this._supadata) {
      console.log(`🔧 Lazy initializing Supadata client...`);
      console.log(`🔑 SUPADATA_API_KEY at lazy init: ${process.env.SUPADATA_API_KEY}`);
      this._supadata = new Supadata({
        apiKey: process.env.SUPADATA_API_KEY,
      });
      console.log(`✅ Supadata client initialized`);
    }
    return this._supadata;
  }

  /**
   * Get transcript from YouTube video using Supadata
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} - Transcript data
   */
  async getVideoTranscript(videoId) {
    try {
      console.log(`🎬 Fetching transcript for video: ${videoId}`);
      console.log(`🔑 Supadata API Key configured: ${!!process.env.SUPADATA_API_KEY}`);
      console.log(`🔑 Supadata API Key length: ${process.env.SUPADATA_API_KEY?.length || 0} characters`);
      console.log(`🔑 Supadata API Key value: ${process.env.SUPADATA_API_KEY}`);

      const supadata = this.getSupadataClient();
      const transcript = await supadata.transcript({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        text: true, // Get plain text format
        mode: "auto" // Use auto mode for best results
      });

      console.log(`✅ Transcript fetched successfully. Response:`, transcript);
      console.log(`📝 Content type: ${typeof transcript.content}`);
      console.log(`📝 Content length: ${Array.isArray(transcript.content) ? transcript.content.length : (transcript.content?.length || 0)} items/characters`);
      console.log(`🌐 Language: ${transcript.lang}, Available languages: ${transcript.availableLangs?.join(', ')}`);

      return transcript;
    } catch (error) {
      console.error(`❌ Error fetching transcript for video ${videoId}:`, error.message);
      console.error(`❌ Full error details:`, error);
      console.error(`❌ Error status:`, error.status || error.code);
      console.error(`❌ Error response:`, error.response?.data || error.response);
      throw new Error(`Failed to fetch video transcript: ${error.message}`);
    }
  }

  /**
   * Analyze transcript content against campaign requirements using AI
   * @param {string} transcript - Video transcript text
   * @param {Object} campaignData - Campaign details including requirements
   * @returns {Promise<Object>} - Analysis result with approval status
   */
  async analyzeTranscriptContent(transcript, campaignData) {
    try {
      console.log(`🤖 Starting AI analysis for campaign: ${campaignData.title}`);

      const prompt = this.buildAnalysisPrompt(transcript, campaignData);

      const model = this.getGeminiModel();
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log(`🧠 AI Analysis completed. Response length: ${text.length} characters`);

      // Parse the JSON response
      let analysisResult;
      try {
        // Extract JSON from the response (AI might include markdown formatting)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('❌ Error parsing AI response:', parseError.message);
        console.error('AI Response:', text);
        throw new Error('Failed to parse AI analysis result');
      }

      // Validate the response structure
      if (typeof analysisResult.approved !== 'boolean') {
        throw new Error('Invalid AI response: missing or invalid "approved" field');
      }

      console.log(`📊 AI Analysis Result:`, {
        approved: analysisResult.approved,
        confidence: analysisResult.confidence,
        reason: analysisResult.reason?.substring(0, 100) + '...'
      });

      return analysisResult;
    } catch (error) {
      console.error(`💥 Error in AI analysis:`, error.message);
      throw error;
    }
  }

  /**
   * Build the prompt for AI analysis
   * @param {string} transcript - Video transcript
   * @param {Object} campaignData - Campaign details
   * @returns {string} - Formatted prompt
   */
  buildAnalysisPrompt(transcript, campaignData) {
    return `You are an AI content moderator for a marketing campaign platform. Your job is to analyze YouTube video transcripts to determine if they meet the campaign requirements.

CAMPAIGN DETAILS:
- Title: ${campaignData.title}
- Description: ${campaignData.description}
- Requirements: ${campaignData.requirements}

VIDEO TRANSCRIPT:
${transcript}

ANALYSIS CRITERIA:
1. Check if the influencer mentions the brand/product/service specified in the campaign
2. Verify if they follow the specific requirements mentioned in the campaign requirements
3. Look for any promotional content related to the campaign (even if brief, 30-60 seconds is acceptable)
4. Check for minimum word count requirements if specified in the campaign requirements
5. Ensure the content is relevant to the campaign objectives

IMPORTANT GUIDELINES:
- A brief 30-60 second mention in a longer video is acceptable
- Look for brand mentions, product references, or campaign-related keywords
- Consider variations in how the brand/product might be mentioned
- Be reasonable - influencers might not use exact wording but should cover the main points
- If word count requirements are specified, check if the promotional segment meets those requirements

Please respond with ONLY a valid JSON object in this exact format:
{
  "approved": boolean,
  "confidence": number (0-100),
  "reason": "detailed explanation of why the content was approved/rejected",
  "brandMentions": ["list of detected brand/product mentions"],
  "promotionalSegmentWordCount": number (estimated words in promotional segment),
  "meetsRequirements": {
    "mentionsBrand": boolean,
    "followsGuidelines": boolean,
    "adequateWordCount": boolean
  }
}

Be thorough but fair in your analysis. The goal is to ensure genuine promotional content while not being overly strict.`;
  }

  /**
   * Verify video content against campaign requirements
   * @param {string} videoId - YouTube video ID
   * @param {Object} campaignData - Campaign details
   * @returns {Promise<Object>} - Verification result
   */
  async verifyVideoContent(videoId, campaignData) {
    const startTime = Date.now();
    console.log(`🔍 Starting content verification for video ${videoId} against campaign "${campaignData.title}"`);

    try {
      // Step 1: Get transcript
      const transcriptData = await this.getVideoTranscript(videoId);

      // Check if transcript is available and has content
      const hasTranscript = transcriptData.content &&
        ((Array.isArray(transcriptData.content) && transcriptData.content.length > 0) ||
         (typeof transcriptData.content === 'string' && transcriptData.content.trim().length > 0));

      if (!hasTranscript) {
        return {
          approved: false,
          reason: 'No transcript available for this video. The video might not have captions or subtitles enabled.',
          error: 'NO_TRANSCRIPT',
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Analyze content with AI
      // Convert content to string if it's an array
      const transcriptText = Array.isArray(transcriptData.content)
        ? transcriptData.content.join(' ')
        : transcriptData.content;

      const analysisResult = await this.analyzeTranscriptContent(transcriptText, campaignData);

      // Step 3: Return comprehensive result
      const result = {
        approved: analysisResult.approved,
        confidence: analysisResult.confidence,
        reason: analysisResult.reason,
        brandMentions: analysisResult.brandMentions || [],
        promotionalSegmentWordCount: analysisResult.promotionalSegmentWordCount || 0,
        meetsRequirements: analysisResult.meetsRequirements || {},
        transcriptLanguage: transcriptData.lang,
        transcriptLength: transcriptText.length,
        processingTime: Date.now() - startTime
      };

      console.log(`✅ Content verification completed in ${result.processingTime}ms. Result: ${result.approved ? 'APPROVED' : 'REJECTED'}`);

      return result;
    } catch (error) {
      console.error(`💥 Content verification failed:`, error.message);

      return {
        approved: false,
        reason: `Content verification failed: ${error.message}`,
        error: 'VERIFICATION_ERROR',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Batch verify multiple videos (for future use)
   * @param {Array} videoData - Array of {videoId, campaignData} objects
   * @returns {Promise<Array>} - Array of verification results
   */
  async batchVerifyContent(videoData) {
    console.log(`📦 Starting batch verification for ${videoData.length} videos`);

    const results = [];

    for (const { videoId, campaignData } of videoData) {
      try {
        const result = await this.verifyVideoContent(videoId, campaignData);
        results.push({ videoId, ...result });

        // Add delay between requests to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          videoId,
          approved: false,
          reason: `Batch verification error: ${error.message}`,
          error: 'BATCH_ERROR'
        });
      }
    }

    console.log(`📦 Batch verification completed. Approved: ${results.filter(r => r.approved).length}/${results.length}`);

    return results;
  }
}

export default new AIVerificationService();