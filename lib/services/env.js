function validateEnv() {
  // At least one LLM provider key must be configured
  const llmKeys = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY'];
  const hasAtLeastOneLLM = llmKeys.some((key) => !!process.env[key]);

  if (!hasAtLeastOneLLM) {
    const msg = `CRITICAL CONFIGURATION ERROR: At least one LLM provider API key must be set (${llmKeys.join(', ')})`;
    console.error(JSON.stringify({
      event: 'UNEXPECTED_ERROR',
      message: msg,
      timestamp: new Date().toISOString()
    }));
    throw new Error(msg);
  }

  // Warn about which LLM keys are absent
  const missingLLM = llmKeys.filter((key) => !process.env[key]);
  if (missingLLM.length > 0) {
    console.warn(JSON.stringify({
      event: 'CONFIG_WARN',
      message: `WARNING: Some LLM provider keys are not set: ${missingLLM.join(', ')}. Providers will be skipped.`,
      timestamp: new Date().toISOString()
    }));
  }

  // Check optional configuration variables and print warnings if missing
  const optional = [
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GMAIL_USER',
    'GMAIL_PASS',
    'GOOGLE_SHEET_ID'
  ];
  const missingOptional = optional.filter((key) => !process.env[key]);

  if (missingOptional.length > 0) {
    console.warn(JSON.stringify({
      event: 'CONFIG_WARN',
      message: `WARNING: Missing optional environment variables: ${missingOptional.join(', ')}. Graceful fallbacks will be used.`,
      timestamp: new Date().toISOString()
    }));
  }

  // Check JSON parsing if account key is configured
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.warn(JSON.stringify({
        event: 'CONFIG_WARN',
        message: 'WARNING: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Google Sheets integration will be disabled.',
        timestamp: new Date().toISOString()
      }));
    }
  }
}

module.exports = { validateEnv };
