import Button from './Button';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function LLMButton() {
  const llmConfig = useQuery(api.llmConfig.getLLMConfig);
  const toggleLLM = useMutation(api.llmConfig.toggleLLM);
  
  // Map correct display names based on the config
  const getLabel = () => {
    if (!llmConfig) return 'Loading...';
    // If provider is 'deepseek' -> 'DeepSeek V3'
    // If provider is 'deepseek-reasoner' -> 'DeepSeek R1' (or whatever brand name you prefer)
    // If provider is 'ollama' -> 'Ollama Local'
    // If provider is 'google' -> 'Gemini Pro'
    
    // Based on previous conversations, we have 'ollama', 'api' (Qwen), and 'deepseek-reasoner' modes in common usage
    // But let's stick to reading the raw mode or a cleaner switch
    
    switch(llmConfig.mode) {
        case 'deepseek-reasoner': return 'DeepSeek R1';
        case 'api': return 'Qwen Max'; 
        default: return 'Ollama Local';
    }
  };

  const getIcon = () => {
     // Simple text icon or maybe a specific SVG if available. For now using '?' generic or text
     return undefined; 
  };
  
  return (
    <Button 
        onClick={() => toggleLLM()}
        title="Switch LLM Provider"
    >
       <span className="text-xl leading-none">🧠</span>
       <span>{getLabel()}</span>
    </Button>
  );
}
