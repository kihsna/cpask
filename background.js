let lastCopiedText = '';

const prompt0 = ``; // INSERT PROMPT FOR MODE 0
const prompt1 = `write c code for the following problem statemnt without comments and use simple and small variable names untill specified in problem.`; /* INSERT PROMPT FOR MODE 0 for egample prompt to write c code*/
const prompt2 = `write simple java code for the following problem statement using simple and small variable names untill specified in question and use "read" as Scanner object and main programme should be in class Main and dont write comments`; /* INSERT PROMPT FOR MODE 1 for exas,ple prompt to write java code */


function extractCode(response, mode) {
  if (mode === 'mode0') {
    return response;
  }

  const codeRegex = mode === 'mode1' ? /```c(.*?)```/s :
                    /```java(.*?)```/s;

  const match = response.match(codeRegex);
    return match ? match[1].trim() : '[No code block found]';
}


function sendToGeminiAPI(inputText, mode) {
  const apiKey = 'AIzaSyCQN76GNAUfHFwRk1vQ6fdKJxXZPjirqxg';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const selectedPrompt = mode === 'mode1' ? prompt1 : mode === 'mode2' ? prompt2 : prompt0;
  const fullInput = `${selectedPrompt}\n\n${inputText}`;

  const data = {
    contents: [{ parts: [{ text: fullInput }] }],
    generationConfig: {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain'
    }
  };

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(result => {
      if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const fullResponse = result.candidates[0].content.parts[0].text;
        chrome.storage.local.get(['mode'], function(result) {
          const mode = result.mode || 'mode0';
          const code = extractCode(fullResponse, mode);
          chrome.storage.local.set({
            geminiResponse: code,
            fullResponse: fullResponse
          }, () => {
            console.log('Gemini API response stored:', code, fullResponse);
          });
        });
      } else {
        console.error('Unexpected response structure from Gemini API', result);
      }
    })
    .catch(error => {
      console.error('Error calling Gemini API:', error);
    });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'send-to-gemini') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getClipboardText' });
    });
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'sendToGeminiAPI') {
    chrome.storage.local.get(['mode'], function(result) {
      const mode = result.mode || 'mode0';
      sendToGeminiAPI(request.text, mode);
    });
  }
});
