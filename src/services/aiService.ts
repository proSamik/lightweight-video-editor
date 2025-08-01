import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { AISettings, CaptionSegment, AIModel } from '../types';
import { SrtExporter } from './srtExporter';

export class AIService {
  private static instance: AIService;
  private settings: AISettings | null = null;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  setSettings(settings: AISettings) {
    this.settings = settings;
  }

  getSettings(): AISettings | null {
    return this.settings;
  }

  private getProvider() {
    if (!this.settings) {
      throw new Error('AI settings not configured');
    }

    const modelId = this.settings.selectedModel || this.getDefaultModel();

    switch (this.settings.selectedProvider) {
      case 'anthropic':
        if (!this.settings.anthropicApiKey) {
          throw new Error('Anthropic API key not configured');
        }
        const anthropic = createAnthropic({
          apiKey: this.settings.anthropicApiKey
        });
        return anthropic(modelId);
      
      case 'google':
        if (!this.settings.googleAiApiKey) {
          throw new Error('Google AI API key not configured');
        }
        const google = createGoogleGenerativeAI({
          apiKey: this.settings.googleAiApiKey
        });
        return google(modelId);
      
      case 'openrouter':
        if (!this.settings.openrouterApiKey) {
          throw new Error('OpenRouter API key not configured');
        }
        const openrouter = createOpenRouter({
          apiKey: this.settings.openrouterApiKey
        });
        return openrouter(modelId);
      
      default:
        throw new Error('Invalid AI provider selected');
    }
  }

  private getDefaultModel(): string {
    switch (this.settings?.selectedProvider) {
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      case 'google':
        return 'gemini-1.5-flash';
      case 'openrouter':
        return 'anthropic/claude-3-haiku:beta';
      default:
        return 'claude-3-haiku-20240307';
    }
  }

  /**
   * Fetch available models for the current provider
   */
  async getAvailableModels(): Promise<AIModel[]> {
    if (!this.settings) {
      throw new Error('AI settings not configured');
    }

    try {
      switch (this.settings.selectedProvider) {
        case 'anthropic':
          return this.getAnthropicModels();
        
        case 'google':
          return this.getGoogleModels();
        
        case 'openrouter':
          return await this.getOpenRouterModels();
        
        default:
          return [];
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return this.getDefaultModels();
    }
  }

  private getAnthropicModels(): AIModel[] {
    return [
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: { input: 0.25, output: 1.25 }
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: { input: 3, output: 15 }
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextLength: 200000,
        pricing: { input: 15, output: 75 }
      }
    ];
  }

  private getGoogleModels(): AIModel[] {
    return [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        contextLength: 1000000,
        pricing: { input: 0.075, output: 0.3 }
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        contextLength: 2000000,
        pricing: { input: 1.25, output: 5 }
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        provider: 'google',
        contextLength: 30720,
        pricing: { input: 0.5, output: 1.5 }
      }
    ];
  }

  private async getOpenRouterModels(): Promise<AIModel[]> {
    if (!this.settings?.openrouterApiKey) {
      return this.getDefaultOpenRouterModels();
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.settings.openrouterApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch OpenRouter models');
      }

      const data = await response.json();
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'openrouter',
        contextLength: model.context_length,
        pricing: model.pricing ? {
          input: parseFloat(model.pricing.prompt) * 1000000, // Convert to per million tokens
          output: parseFloat(model.pricing.completion) * 1000000
        } : undefined
      }));
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      return this.getDefaultOpenRouterModels();
    }
  }

  private getDefaultOpenRouterModels(): AIModel[] {
    return [
      {
        id: 'anthropic/claude-3-haiku:beta',
        name: 'Claude 3 Haiku',
        provider: 'openrouter',
        contextLength: 200000
      },
      {
        id: 'anthropic/claude-3-sonnet:beta',
        name: 'Claude 3 Sonnet',
        provider: 'openrouter',
        contextLength: 200000
      },
      {
        id: 'google/gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'openrouter',
        contextLength: 1000000
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openrouter',
        contextLength: 128000
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'openrouter',
        contextLength: 128000
      }
    ];
  }

  private getDefaultModels(): AIModel[] {
    switch (this.settings?.selectedProvider) {
      case 'anthropic':
        return this.getAnthropicModels();
      case 'google':
        return this.getGoogleModels();
      case 'openrouter':
        return this.getDefaultOpenRouterModels();
      default:
        return [];
    }
  }

  /**
   * Generate YouTube description from captions
   */
  async generateDescription(captions: CaptionSegment[], customPrompt?: string): Promise<string> {
    const provider = this.getProvider();
    
    // Generate full SRT content
    const srtContent = SrtExporter.exportToSrt(captions);

    const defaultPrompt = `You are a YouTube content creator assistant. Based on the following video transcript with timestamps (SRT format), write an engaging YouTube video description that will help with discoverability and engagement.

Guidelines:
- Write a compelling hook in the first 2-3 lines
- Include key topics and main points from the video
- Use relevant keywords naturally
- Keep it engaging and professional
- Include call-to-action elements
- Optimize for YouTube SEO
- Maximum 500 words

Write a YouTube description:`;

    const promptContent = customPrompt || this.settings?.descriptionPrompt || defaultPrompt;

    const finalPrompt = `Prompt-
${promptContent}

Subtitles-
${srtContent}`;

    try {
      const { text } = await generateText({
        model: provider,
        prompt: finalPrompt,
        maxTokens: 2000,
        temperature: 0.7,
      });

      return text;
    } catch (error) {
      console.error('Error generating description:', error);
      throw new Error(`Failed to generate description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate YouTube titles from description and captions
   */
  async generateTitles(description: string, captions: CaptionSegment[], customPrompt?: string): Promise<{ title: string; characterCount: number }[]> {
    const provider = this.getProvider();

    // Generate full SRT content
    const srtContent = SrtExporter.exportToSrt(captions);

    const defaultPrompt = `You are a YouTube content creator assistant. Based on the following video description and transcript with timestamps, generate 4 compelling YouTube video titles that will maximize click-through rates, SEO and discoverability.

Guidelines:
- Each title should be 40-70 characters (YouTube optimal length)
- Make them engaging and click-worthy
- Include relevant keywords
- Vary the style (question, statement, benefit-driven, curiosity)
- Avoid clickbait - be authentic
- Consider trending formats

Description: ${description}

Generate exactly 4 YouTube titles, one per line:`;

    const promptContent = customPrompt || this.settings?.titlePrompt || defaultPrompt;
    
    const finalPrompt = `Prompt-
${promptContent.replace('${description}', description)}

Subtitles-
${srtContent}`;

    try {
      const { text } = await generateText({
        model: provider,
        prompt: finalPrompt,
        maxTokens: 400,
        temperature: 0.8,
      });

      // Parse the response into individual titles
      const titles = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 4) // Ensure we only get 4 titles
        .map(title => {
          // Clean up the title (remove numbering, bullets, etc.)
          const cleanTitle = title.replace(/^\d+\.?\s*/, '').replace(/^[-•]\s*/, '').trim();
          return {
            title: cleanTitle,
            characterCount: cleanTitle.length
          };
        });

      // If we don't have 4 titles, generate some fallbacks
      while (titles.length < 4) {
        titles.push({
          title: `Engaging Video Title ${titles.length + 1}`,
          characterCount: `Engaging Video Title ${titles.length + 1}`.length
        });
      }

      return titles;
    } catch (error) {
      console.error('Error generating titles:', error);
      throw new Error(`Failed to generate titles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test AI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const provider = this.getProvider();
      const { text } = await generateText({
        model: provider,
        prompt: 'Say "Connection test successful" if you can read this.',
        maxTokens: 10,
      });
      
      return text.toLowerCase().includes('connection test successful') || text.toLowerCase().includes('successful');
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }
}