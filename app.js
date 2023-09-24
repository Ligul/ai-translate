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
const clearButton = document.getElementById("clearButton");
const copyTranslatedButton = document.getElementById("copyTranslatedButton");

function placeButtonInTextarea(button, textAreaRect) {
    const buttonWidth = button.offsetWidth;
    const buttonHeight = button.offsetHeight;
    const buttonX = textAreaRect.right - (buttonWidth + 10); // adding margin of 10px
    const buttonY = textAreaRect.bottom - (buttonHeight + 10); // adding margin of 10px
    button.style.position = "absolute";
    button.style.left = `${buttonX}px`;
    button.style.top = `${buttonY}px`;
    button.style.width = `${buttonWidth}px`;
    button.style.height = `${buttonHeight}px`;
}

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
    _OPENAI_API_URL = localStorage.getItem("ai-translate_OPENAI_API_URL");
    _OPENAI_API_KEY = localStorage.getItem("ai-translate_OPENAI_API_KEY");
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
    localStorage.setItem("ai-translate_OPENAI_API_URL", apiUrl);
    localStorage.setItem("ai-translate_OPENAI_API_KEY", apiKey);
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
    const storedTargetLanguage = localStorage.getItem(
        "ai-translate_lastTargetLanguage"
    );
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
    const storedSourceLanguage = localStorage.getItem(
        "ai-translate_lastSourceLanguage"
    );
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
    placeButtonInTextarea(clearButton, sourceTextarea.getBoundingClientRect());
    placeButtonInTextarea(
        copyTranslatedButton,
        translatedTextarea.getBoundingClientRect()
    );
    reverseButton.disabled = sourceLanguageSelect.value == "Any language";
});

// Listen for changes on the targetLanguageSelect and store it's value in localStorage
targetLanguageSelect.addEventListener("change", function () {
    var selectedLanguage = targetLanguageSelect.value;
    localStorage.setItem("ai-translate_lastTargetLanguage", selectedLanguage);
    hideSameSourceLanguage();
});

sourceLanguageSelect.addEventListener("change", function () {
    var selectedSourceLang = sourceLanguageSelect.value;
    hideSameTargetLanguage();
    localStorage.setItem("ai-translate_lastSourceLanguage", selectedSourceLang);
    if (selectedSourceLang == "Any language") {
        reverseButton.disabled = true;
    } else {
        reverseButton.disabled = false;
    }
});

reverseButton.addEventListener("click", function () {
    const textLeft = sourceTextarea.value;
    const textRight = translatedTextarea.value;
    const temp = sourceLanguageSelect.value;
    sourceLanguageSelect.value = targetLanguageSelect.value;
    targetLanguageSelect.value = temp;
    localStorage.setItem(
        "ai-translate_lastSourceLanguage",
        sourceLanguageSelect.value
    );
    localStorage.setItem(
        "ai-translate_lastTargetLanguage",
        targetLanguageSelect.value
    );
    clearTranslatedTextarea();
    sourceTextarea.value = textRight;
    translatedTextarea.value = textLeft;
});

sourceTextarea.addEventListener("input", function () {
    if (sourceTextarea.value == "") {
        translateButton.disabled = true;
        clearButton.disabled = true;
        clearTranslatedTextarea();
    } else {
        translateButton.disabled = false;
        clearButton.disabled = false;
    }
});

const generate = async () => {
    // Alert the user if no text is entered
    if (!sourceTextarea.value) {
        alert("Please enter some text to translate.");
        return;
    }

    // Combining prompt
    var prompt = `Translate following text${
        sourceLanguageSelect.value != "Any language"
            ? " from " + sourceLanguageSelect.value
            : ""
    } to ${targetLanguageSelect.value}.`;

    const functions = [
        {
            name: "return_translation",
            description: "Return translated to target language text",
            parameters: {
                type: "object",
                properties: {
                    translation: {
                        type: "string",
                        description: "Translated text",
                    },
                    // "source_language": {"type": "string", "enum": ["Russian", "English"]},
                },
                required: ["translation"],
            },
        },
    ];

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
                functions: functions,
                function_call: { name: "return_translation" },
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

        var result_json = "";

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
                const { finish_reason } = choices[0];
                if (finish_reason != null) {
                    break;
                }
                const { function_call } = delta;
                const { arguments } = function_call;

                // Update the UI with the new content
                if (arguments) {
                    result_json += arguments;
                    try {
                        var streamed_part = JSON.parse(
                            result_json + '"}'
                        ).translation;
                        translatedTextarea.value = streamed_part;
                    } catch (e) {}
                }
            }
        }
        // parse result_json
        const result = JSON.parse(result_json);
        translatedTextarea.value = result.translation;

        copyTranslatedButton.disabled = false;
    } catch (error) {
        // Handle fetch request errors
        if (signal.aborted) {
            console.log("Request aborted.");
            copyTranslatedButton.disabled = false;
        } else {
            console.error(error);
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
    copyTranslatedButton.disabled = true;
}

clearButton.addEventListener("click", function () {
    clearTranslatedTextarea();
    sourceTextarea.value = "";
    clearButton.disabled = true;
});

copyTranslatedButton.addEventListener("click", function () {
    translatedTextarea.select();
    navigator.clipboard.writeText(translatedTextarea.value);
});
