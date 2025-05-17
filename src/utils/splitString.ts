export function splitString(text: string, maxLength = 4000): string[] {
    if (text.length <= maxLength) return [text];
  
    const sentences = text.split(/(?<=[.!?]) +/);
    const chunks: string[] = [];
    let currentChunk = '';
  
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
  
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }  