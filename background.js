chrome.runtime.onInstalled.addListener(() =>{
    chrome.contextMenus.create({
        id: "VocabVault",
        title: "Get definition and save to Anki",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "vocabVault") {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getSelectionText
      }, (results) => {
        if (results && results[0] && results[0].result) {
          const selectedText = results[0].result;
          chrome.storage.sync.get(["preferredLanguage"], (data) => {
            const preferredLanguage = data.preferredLanguage || "en";
            fetchDefinition(selectedText, preferredLanguage);
          });
        }
      });
    }
});


function getSelectionText() {
    return window.getSelection().toString();
}
  

async function fetchDefinition(word, language) {
    const prompt = `Define the word "${word}" within a sentence or with a few words in ${language} and provide a short example sentence.`;

    try {
        const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '
            body: JSON.stringify({
                prompt: prompt,
                max_tokens: 150
            })
        });
        const data = await response.json();
        const text = data.choices[0].text.trim();
        const [definition, example] = text.split("\n").map(line => line.trim());
        saveToGoogleSheets(word, definition, example);
    } catch(error) {
        console.error("Error fetching definition:", error);
    }    
}

function saveToGoogleSheets(word, definition, example){
    chrome.identity.getAuthToken({interactive: true}, (token) => {
        fetch('https://sheets.googleapis.com/v4/spreadsheets/YOUR_SPREADSHEET_ID/values/Sheet1!A1:append?valueInputOption=RAW', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                values: [[word, definition, example]]
            })
        }).then(response => response.json()).then(data => {
            console.log('Google Sheets response:', data);
        }).catch(error => {
            console.error('Error saving to Google Sheets:', error);
        });
    });
}
