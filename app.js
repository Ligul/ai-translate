OPENAI_API_URL = "";
OPENAI_API_KEY = "";
OPENAI_MODEL = "gpt-3.5-turbo";

let controller = null;

// Get references to HTML elements
const sourceLanguageSelect = document.getElementById("sourceLanguageSelect");
const targetLanguageSelect = document.getElementById("targetLanguageSelect");
const reverseButton = document.getElementById("reverseButton");
const sourceTextarea = document.getElementById("sourceTextarea");
const translatedTextarea = document.getElementById("translatedTextarea");
const translateButton = document.getElementById("translateButton");
const stopButton = document.getElementById("stopButton");
const apiEndpointInput = document.getElementById("apiEndpointInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveOpenAiCredsButton = document.getElementById("saveOpenAiCredsButton");

// Function to hide selected option from sourceLanguageSelect when selected in targetLanguageSelect
function hideSameSourceLanguage() {
  const selectedLanguage = targetLanguageSelect.value;
  for (var i = 0; i < sourceLanguageSelect.options.length; i++) {
    var option = sourceLanguageSelect.options[i];
    if (option.value == selectedLanguage) {
      option.hidden = true;
    } else {
      option.hidden = false;
    }
  }
}

// Function to hide selected option from targetLanguageSelect when selected in sourceLanguageSelect
function hideSameTargetLanguage() {
  const selectedLanguage = sourceLanguageSelect.value;
  for (var i = 0; i < targetLanguageSelect.options.length; i++) {
    var option = targetLanguageSelect.options[i];
    if (option.value == selectedLanguage) {
      option.hidden = true;
    } else {
      option.hidden = false;
    }
  }
}

function loadOpenaiCreds() {
  _OPENAI_API_URL = localStorage.getItem("OPENAI_API_URL");
  _OPENAI_API_KEY = localStorage.getItem("OPENAI_API_KEY");
  var creds = 0;
  if (_OPENAI_API_URL && _OPENAI_API_URL != "") {
    OPENAI_API_URL = _OPENAI_API_URL;
    creds += 1;
  }
  if (_OPENAI_API_KEY && _OPENAI_API_KEY != "") {
    OPENAI_API_KEY = _OPENAI_API_KEY;
    creds += 1;
  }
  return creds == 2;
}

function saveOpenAiCreds(apiUrl, apiKey) {
  localStorage.setItem("OPENAI_API_URL", apiUrl);
  localStorage.setItem("OPENAI_API_KEY", apiKey);
}

function showApiKeyModal() {
  $("#apiKeyModal").modal("show");
  if (OPENAI_API_URL != "") {
    apiEndpointInput.value = OPENAI_API_URL;
  }
  apiKeyInput.value = OPENAI_API_KEY;
  toggleOpenAiCredsSaveButton();
}

// On page load check if lastTargetLanguage is in localStorage and if so, load it and set as value of targetLanguageSelect if it is in list
document.addEventListener("DOMContentLoaded", function () {
  const storedTargetLanguage = localStorage.getItem("lastTargetLanguage");
  if (storedTargetLanguage) {
    const options = targetLanguageSelect.getElementsByTagName("option");
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === storedTargetLanguage) {
        targetLanguageSelect.value = storedTargetLanguage;
        hideSameSourceLanguage();
        break;
      }
    }
  }
  const storedSourceLanguage = localStorage.getItem("lastSourceLanguage");
  if (storedSourceLanguage) {
    const options = sourceLanguageSelect.getElementsByTagName("option");
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === storedSourceLanguage) {
        sourceLanguageSelect.value = storedSourceLanguage;
        hideSameTargetLanguage();
        break;
      }
    }
  }
  if (!loadOpenaiCreds()) {
    showApiKeyModal();
  }
});

// Listen for changes on the targetLanguageSelect and store it's value in localStorage
targetLanguageSelect.addEventListener("change", function () {
  var selectedLanguage = targetLanguageSelect.value;
  localStorage.setItem("lastTargetLanguage", selectedLanguage);
  hideSameSourceLanguage();
});

sourceLanguageSelect.addEventListener("change", function () {
  var selectedSourceLang = sourceLanguageSelect.value;
  hideSameTargetLanguage();
  localStorage.setItem("lastSourceLanguage", selectedSourceLang);
  if (selectedSourceLang == "Any language") {
    reverseButton.disabled = true;
  } else {
    reverseButton.disabled = false;
  }
});

reverseButton.addEventListener("click", function () {
  const temp = sourceLanguageSelect.value;
  sourceLanguageSelect.value = targetLanguageSelect.value;
  targetLanguageSelect.value = temp;
});

sourceTextarea.addEventListener("input", function () {
  if (sourceTextarea.value == "") {
    translateButton.disabled = true;
    clearTranslatedTextarea();
  } else {
    translateButton.disabled = false;
  }
});

const generate = async () => {
  // Alert the user if no prompt value
  if (!sourceTextarea.value) {
    alert("Please enter a prompt.");
    return;
  }

  // Combining prompt
  var prompt = `Translate following text${
    sourceLanguageSelect.value != "Any language"
      ? " from " + sourceLanguageSelect.value
      : ""
  } to ${targetLanguageSelect.value}. Return only the translated text in ${
    targetLanguageSelect.value
  } language, no quotes:`;

  // Disable the generate button and enable the stop button
  translateButton.hidden = true;
  stopButton.hidden = false;
  clearTranslatedTextarea();
  translatedTextarea.value = "Generating...";

  // Create a new AbortController instance
  controller = new AbortController();
  const signal = controller.signal;

  try {
    // Fetch the response from the OpenAI API with the signal from AbortController
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "assistant", content: prompt },
          { role: "user", content: sourceTextarea.value },
        ],
        temperature: 0.7,
        stream: true, // For streaming responses
      }),
      signal, // Pass the signal to the fetch request
    });
    if (!response.ok)
      // or check for response.status
      throw new Error(response.statusText);

    // Read the response as a stream of data
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    translatedTextarea.value = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // Massage and parse the chunk of data
      const chunk = decoder.decode(value);
      const parsedLines = chunk
        .split("\n")
        .filter((line) => line !== "" && line !== "data: [DONE]")
        .map((line) => {
          const match = line.match(/^data: (.*)$/);
          return match ? JSON.parse(match[1]) : null;
        })
        .filter(Boolean);

      for (const parsedLine of parsedLines) {
        const { choices } = parsedLine;
        const { delta } = choices[0];
        const { content } = delta;
        // Update the UI with the new content
        if (content) {
          translatedTextarea.value += content;
        }
      }
    }
  } catch (error) {
    // Handle fetch request errors
    if (signal.aborted) {
      translatedTextarea.value = "Request aborted.";
    } else {
      console.error("Error:", error);
      console.error("Error!");
      translatedTextarea.value = "Error occurred while generating.";
      // TODO: Do this only when access error
      const button = document.createElement("button");
      const textAreaRect = translatedTextarea.getBoundingClientRect();
      const buttonWidth = 200; // Replace with your desired button width
      const buttonHeight = 70; // Replace with your desired button height
      const buttonX =
        textAreaRect.left + (textAreaRect.width - buttonWidth) / 2;
      const buttonY =
        textAreaRect.top + (textAreaRect.height - buttonHeight) / 2;
      button.style.position = "absolute";
      button.style.left = `${buttonX}px`;
      button.style.top = `${buttonY}px`;
      button.style.width = `${buttonWidth}px`;
      button.style.height = `${buttonHeight}px`;
      button.innerHTML = "Check your OpenAI credentials?";
      button.onclick = showApiKeyModal;
      button.id = "checkCredsButton";
      button.classList.add("btn", "btn-primary"); // Add the Bootstrap button classes
      document.body.appendChild(button);
    }
  } finally {
    // Enable the generate button and disable the stop button
    translateButton.hidden = false;
    stopButton.hidden = true;
    controller = null; // Reset the AbortController instance
  }
};

const stop = () => {
  // Abort the fetch request by calling abort() on the AbortController instance
  if (controller) {
    controller.abort();
    controller = null;
  }
};

const run = () => {
  if (!loadOpenaiCreds()) {
    showApiKeyModal();
    return;
  }
  generate();
};

sourceTextarea.addEventListener("keydown", (event) => {
  if (event.keyCode === 13 && event.shiftKey) {
    event.preventDefault();
    if (sourceTextarea.value.trim() !== "") {
      run();
    }
  }
});

translateButton.addEventListener("click", run);
stopButton.addEventListener("click", stop);

function toggleOpenAiCredsSaveButton() {
  saveOpenAiCredsButton.disabled = false;
  // if (apiEndpointInput.value.trim() == "") {
  //   apiEndpointInput.classList.add("is-invalid");
  //   saveOpenAiCredsButton.disabled = true;
  // }
  if (apiKeyInput.value.trim() == "") {
    apiKeyInput.classList.add("is-invalid");
    saveOpenAiCredsButton.disabled = true;
  }
  if (!saveOpenAiCredsButton.disabled) {
    apiEndpointInput.classList.remove("is-invalid");
    apiKeyInput.classList.remove("is-invalid");
  }
}

apiEndpointInput.addEventListener("change", toggleOpenAiCredsSaveButton);
apiKeyInput.addEventListener("change", toggleOpenAiCredsSaveButton);

saveOpenAiCredsButton.addEventListener("click", function () {
  if (apiKeyInput.value == "") {
    return;
  }
  if (apiEndpointInput.value == "") {
    apiEndpointInput.value = apiEndpointInput.placeholder;
  }

  saveOpenAiCreds(apiEndpointInput.value, apiKeyInput.value);
  $("#apiKeyModal").modal("hide");
  clearTranslatedTextarea();
});

function clearTranslatedTextarea() {
  translatedTextarea.value = "";
  const element = document.getElementById("checkCredsButton");
  if (element) {
    element.parentNode.removeChild(element);
  }
}
