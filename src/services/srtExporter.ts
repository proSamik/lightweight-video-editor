// Local caption type used for SRT export to decouple from renderer types
interface SrtCaption {
  id?: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  text: string;
}

export class SrtExporter {
  /**
   * Converts caption segments to SRT format string
   */
  static exportToSrt(captions: SrtCaption[]): string {
    return captions
      .filter(caption => caption.text.trim()) // Filter empty captions
      .map((caption, index) => {
        const startTime = this.formatTime(caption.startTime);
        const endTime = this.formatTime(caption.endTime);
        // Clean text: remove multiple spaces and ensure proper line breaks
        const text = caption.text
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\n/g, '\r\n');
        
        return `${index + 1}\r\n${startTime} --> ${endTime}\r\n${text}\r\n`;
      })
      .join('\r\n');
  }

  /**
   * Updates SRT content with edited captions, maintaining sync
   */
  static updateSrtFromCaptions(captions: SrtCaption[]): string {
    // Re-index captions after text edits to maintain proper SRT sequence
    const filteredCaptions = captions.filter(caption => 
      caption.text && caption.text.trim().length > 0
    );
    
    return this.exportToSrt(filteredCaptions);
  }

  /**
   * Formats time in milliseconds to standard SRT timestamp format (HH:MM:SS,mmm)
   * Correctly handles conversion from milliseconds to SRT format
   */
  private static formatTime(timeInMilliseconds: number): string {
    // Ensure we have a valid number
    const validTimeMs = Math.max(0, timeInMilliseconds || 0);
    
    // Convert to total seconds (including fractional part)
    const totalSeconds = validTimeMs / 1000;
    
    // Extract hours, minutes, seconds, and milliseconds
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);

    // Format as HH:MM:SS,mmm
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }

  /**
   * Validates SRT content
   */
  static validateSrt(srtContent: string): boolean {
    const lines = srtContent.split('\n');
    let sequenceNumber = 1;
    let i = 0;

    while (i < lines.length) {
      // Skip empty lines
      if (!lines[i].trim()) {
        i++;
        continue;
      }

      // Check sequence number
      if (parseInt(lines[i].trim()) !== sequenceNumber) {
        return false;
      }
      i++;

      // Check timestamp format
      if (!lines[i] || !this.isValidTimestamp(lines[i])) {
        return false;
      }
      i++;

      // Check for subtitle text (at least one line)
      if (!lines[i]) {
        return false;
      }

      // Skip subtitle text lines
      while (i < lines.length && lines[i].trim()) {
        i++;
      }

      sequenceNumber++;
    }

    return true;
  }

  /**
   * Validates timestamp format (standard SRT format)
   */
  private static isValidTimestamp(line: string): boolean {
    const timestampPattern = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;
    return timestampPattern.test(line.trim());
  }
}