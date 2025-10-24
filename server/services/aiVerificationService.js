import { GoogleGenerativeAI } from '@google/generative-ai';
import { Supadata } from '@supadata/js';

class AIVerificationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.supadata = new Supadata({
      apiKey: process.env.SUPADATA_API_KEY,
    });
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Get transcript from YouTube video using Supadata
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} - Transcript data
   */
  async getVideoTranscript(videoId) {
    try {
      console.log(`🎬 Fetching transcript for video: ${videoId}`);

      const transcript = await this.supadata.youtube.transcript({
        videoId: videoId,
        text: true // Get plain text format
      });

      console.log(`✅ Transcript fetched successfully. Length: ${transcript.content?.length || 0} characters`);
      console.log(`🌐 Language: ${transcript.lang}, Available languages: ${transcript.availableLangs?.join(', ')}`);

      return transcript;
    } catch (error) {
      console.error(`❌ Error fetching transcript for video ${videoId}:`, error.message);
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

      const result = await this.model.generateContent(prompt);
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

      if (!transcriptData.content || transcriptData.content.trim().length === 0) {
        return {
          approved: false,
          reason: 'No transcript available for this video. The video might not have captions or subtitles.',
          error: 'NO_TRANSCRIPT',
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Analyze content with AI
      const analysisResult = await this.analyzeTranscriptContent(transcriptData.content, campaignData);

      // Step 3: Return comprehensive result
      const result = {
        approved: analysisResult.approved,
        confidence: analysisResult.confidence,
        reason: analysisResult.reason,
        brandMentions: analysisResult.brandMentions || [],
        promotionalSegmentWordCount: analysisResult.promotionalSegmentWordCount || 0,
        meetsRequirements: analysisResult.meetsRequirements || {},
        transcriptLanguage: transcriptData.lang,
        transcriptLength: transcriptData.content.length,
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