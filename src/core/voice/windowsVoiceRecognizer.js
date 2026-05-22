import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

class WindowsVoiceRecognizer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isListening = false;
    this.wakeWords = ['jarvis', 'hey jarvis', 'wake up jarvis'];
    this.wakeWordDetected = false;
  }

  async initialize() {
    logger.info('🎤 Initializing Windows Voice Recognizer...');
    
    // Check if speech recognition is available
    const available = await this.checkAvailability();
    if (!available) {
      logger.warn('Windows Speech Recognition not available, using text input fallback');
      return false;
    }

    return true;
  }

  async checkAvailability() {
    try {
      await execAsync('powershell -Command "Add-Type -AssemblyName System.Speech"');
      return true;
    } catch (error) {
      return false;
    }
  }

  async startListening() {
    this.isListening = true;
    logger.info('🎤 Voice recognition started. Say "Hey Jarvis" to activate!');

    // PowerShell script for real-time voice recognition
    const psScript = `
      Add-Type -AssemblyName System.Speech;
      $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine;
      $recognizer.SetInputToDefaultAudioDevice();
      
      $grammar = New-Object System.Speech.Recognition.DictationGrammar;
      $recognizer.LoadGrammar($grammar);
      
      $recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple);
      
      Register-ObjectEvent -InputObject $recognizer -EventName SpeechRecognized -Action {
        $text = $Event.SourceEventArgs.Result.Text;
        Write-Output $text;
      };
      
      Start-Sleep -Seconds 30;
    `;

    try {
      const { stdout } = await execAsync(`powershell -Command "${psScript}"`, { timeout: 35000 });
      if (stdout.trim()) {
        const recognized = stdout.trim().toLowerCase();
        
        // Check for wake word
        if (this.wakeWords.some(w => recognized.includes(w))) {
          this.wakeWordDetected = true;
          logger.success('🎯 Wake word detected!');
          this.eventBus.emit('voice:wake-word-detected', {});
        }

        if (this.wakeWordDetected) {
          this.eventBus.emit('voice:command', recognized);
        }
      }
    } catch (error) {
      if (!error.message.includes('timeout')) {
        logger.error('Voice recognition error:', error.message);
      }
    }

    // Keep listening
    if (this.isListening) {
      this.startListening();
    }
  }

  async stop() {
    this.isListening = false;
    logger.info('Voice recognition stopped');
  }
}

export default WindowsVoiceRecognizer;
