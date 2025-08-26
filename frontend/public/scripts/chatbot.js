(function () {
  // Set Hindi as the default and only language
  let currentLang = 'hi';
  localStorage.setItem('chat-lang', currentLang);

  // Initialize messages with Hindi welcome text
  window.messages = JSON.parse(localStorage.getItem('lic-chat')) || [
    {
      sender: 'ai',
      text: 'हाय! मैं LIC इंडिया का चैटबॉट हूँ। LIC की योजनाओं, प्रीमियम, या दावों के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "पॉलिसी की स्थिति कैसे जांचें?"',
      id: 'welcome',
      timestamp: new Date().toISOString(),
      category: 'welcome',
      reactions: [],
      isPinned: false,
      associatedQuery: null
    }
  ];

  // Validate and reset messages if corrupted
  try {
    if (!Array.isArray(window.messages)) {
      console.warn('Invalid localStorage data, resetting messages');
      window.messages = [{
        sender: 'ai',
        text: 'हाय! मैं LIC इंडिया का चैटबॉट हूँ। LIC की योजनाओं, प्रीमियम, या दावों के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "पॉलिसी की स्थिति कैसे जांचें?"',
        id: 'welcome',
        timestamp: new Date().toISOString(),
        category: 'welcome',
        reactions: [],
        isPinned: false,
        associatedQuery: null
      }];
      localStorage.setItem('lic-chat', JSON.stringify(window.messages));
    }
  } catch (e) {
    console.error('Error parsing localStorage:', e);
    window.messages = [{
      sender: 'ai',
      text: 'हाय! मैं LIC इंडिया का चैटबॉट हूँ। LIC की योजनाओं, प्रीमियम, या दावों के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "पॉलिसी की स्थिति कैसे जांचें?"',
      id: 'welcome',
      timestamp: new Date().toISOString(),
      category: 'welcome',
      reactions: [],
      isPinned: false,
      associatedQuery: null
    }];
    localStorage.setItem('lic-chat', JSON.stringify(window.messages));
  }

  let isLoading = false;
  let isDarkMode = localStorage.getItem('chat-theme') === 'dark';
  let isHistoryCollapsed = false;
  let fontSize = parseInt(localStorage.getItem('chat-font-size')) || 14;
  let editingMessageId = null;
  let editedText = '';
  let isRecording = false;
  let isAutoReplyEnabled = true;
  let isAutoSpeakEnabled = true;
  let showTimestamps = true;
  let searchQuery = '';
  let selectedCategory = '';
  let isPinnedWindowOpen = false;
  let interactionAnalytics = { questionsAsked: 0, speechUsed: 0, categories: {}, reactionsUsed: 0 };
  let typingIndicatorElement = null;
  const suggestedPrompts = {
    hi: [
      'LIC जीवन आनंद योजना क्या है?',
      'LIC पॉलिसी का प्रीमियम कैसे चुकाएं?',
      'पॉलिसी की स्थिति कैसे जांचें?',
      'LIC की सबसे अच्छी योजना कौन सी है?',
      'LIC में क्लेम कैसे करें?',
      'LIC की नई योजनाएं क्या हैं?',
      'LIC में कितने प्रकार की योजनाएं हैं?',
      'LIC पॉलिसी का रजिस्ट्रेशन कैसे करें?',
      'LIC में ऑनलाइन पेमेंट कैसे करें?',
      'LIC की टर्म इंश्योरेंस योजना क्या है?',
      'LIC की पेंशन योजनाएं क्या हैं?',
      'LIC में मेच्योरिटी अमाउंट कैसे चेक करें?',
      'LIC एजेंट कैसे बनें?',
      'LIC की यूलिप योजनाएं क्या हैं?',
      'LIC में लोन कैसे लें?',
      'LIC पॉलिसी को सरेंडर कैसे करें?',
      'LIC में नॉमिनी कैसे बदलें?',
      'LIC की चाइल्ड प्लान क्या हैं?',
      'LIC की हेल्थ इंश्योरेंस योजनाएं क्या हैं?',
      'LIC की कस्टमर सर्विस कैसे संपर्क करें?'
    ]
  };
  let filteredSuggestions = suggestedPrompts[currentLang];
  const emojiOptions = ['👍', '😄', '🌟', '🙏', '👏'];
  const primaryApiKey = 'AIzaSyA6R5mEyZM7Vz61fisMnFaYedGptHv8B4I';
  const fallbackApiKey = 'AIzaSyCP0zYjRT5Gkdb2PQjSmVi6-TnO2a7ldAA';
  const recognition = window.SpeechRecognition || window.webkitSpeechRecognition ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() : null;

  // Load LIC context from single file
  function getContext() {
    return window.licContext?.hindiContext || 'LIC India context not available';
  }

  function getImageContext() {
    return window.licContext?.imageContext || {};
  }

  async function processMessageWithTone(message, messageId, tone) {
    if (isLoading) return;
    isLoading = true;
    interactionAnalytics.questionsAsked++;
    const { category, imageKey } = categorizeMessage(message);
    interactionAnalytics.categories[category] = (interactionAnalytics.categories[category] || 0) + 1;

    let aiResponse;
    let quickReplies = [];
    const toneInstruction = 'Respond in a professional, concise, and simple tone suitable for all users, including those from rural areas in India. Use clear, easy-to-understand Hindi without technical jargon or complex terms. For lists or comparisons (e.g., policy details, benefits), structure responses as bullet points with each item on a new line for clarity. Ensure answers are culturally sensitive and family-friendly.';
    const fullPrompt = `You are an AI assistant for LIC India. ${toneInstruction} Use the following context to answer questions about LIC policies, premiums, claims, or services, combining all available information. For general questions outside this context, provide accurate and relevant answers based on general knowledge. Include previous conversation history for context when relevant. Context: ${getContext()}\n\nConversation History: ${JSON.stringify(window.messages.slice(-5))} \n\nUser question: ${message}\n\nProvide a clear, well-educated response in Hindi with bullet points on new lines for any lists.`;

    async function tryApiRequest(apiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
        });
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } catch (error) {
        console.error('API error with key:', apiKey, error.message);
        return null;
      }
    }

    try {
      aiResponse = await tryApiRequest(primaryApiKey);
      if (!aiResponse) {
        console.warn('Primary API failed, trying fallback API key');
        aiResponse = await tryApiRequest(fallbackApiKey);
      }
      if (!aiResponse || aiResponse.includes('I don\'t have enough information')) {
        const searchResults = await performWebSearch(message);
        aiResponse = searchResults || 'क्षमा करें, मुझे विशिष्ट जानकारी नहीं मिली। LIC की योजनाओं, प्रीमियम, या दावों के बारे में पूछें!';
      }
      aiResponse = formatResponse(aiResponse);
      quickReplies = [
        'इस पर और विस्तार से बताएं?',
        'LIC की अन्य योजनाएं क्या हैं?',
        'मुझे LIC कस्टमर केयर से कैसे संपर्क करना चाहिए?'
      ];
    } catch (error) {
      console.error('Both API requests failed:', error.message);
      const searchResults = await performWebSearch(message);
      aiResponse = formatResponse(searchResults || 'कुछ गड़बड़ हो गई। कृपया फिर से प्रयास करें या LIC की योजनाओं, प्रीमियम, या दावों के बारे में पूछें!');
      quickReplies = [
        'दूसरा प्रश्न पूछें',
        'LIC की योजनाएं बताएं',
        'LIC कस्टमर केयर का नंबर क्या है?'
      ];
    }

    const responseId = Date.now();
    const imageContext = getImageContext();
    const imageData = imageKey && imageContext[imageKey] && isImageRelevant(message, imageContext[imageKey].keywords)
      ? imageContext[imageKey].urls[Math.floor(Math.random() * imageContext[imageKey].urls.length)]
      : null;
    window.messages.push({
      sender: 'ai',
      text: '',
      id: responseId,
      timestamp: new Date().toISOString(),
      category: category,
      reactions: [],
      isPinned: false,
      imageUrl: imageData?.url,
      imageAlt: imageData?.alt,
      associatedQuery: message
    });
    await typeMessage(aiResponse, responseId, quickReplies);

    if (isAutoReplyEnabled) {
      setTimeout(() => {
        const followUpId = Date.now() + 1;
        window.messages.push({
          sender: 'ai',
          text: '',
          id: followUpId,
          timestamp: new Date().toISOString(),
          category: 'follow-up',
          reactions: [],
          isPinned: false,
          associatedQuery: null
        });
        typeMessage(
          'LIC की योजनाओं, प्रीमियम, या दावों के बारे में और कोई प्रश्न? अधिक जानकारी के लिए Jitendra Patidar (Development Officer @LIC India, Neemuch Branch) से संपर्क करें: 7987235207',
          followUpId,
          [
            'LIC की सबसे अच्छी योजना कौन सी है?',
            'LIC में क्लेम कैसे करें?',
            'LIC की कस्टमर सर्विस कैसे संपर्क करें?'
          ]
        );
      }, 2000);
    }

    isLoading = false;
    renderMessages();
  }

  function isImageRelevant(message, keywords) {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  function formatResponse(text) {
    if (!text) return '<p>कोई जानकारी उपलब्ध नहीं।</p>';
    const listRegex = /^([-*] .+)$/gm;
    let formattedText = text;
    if (listRegex.test(text)) {
      formattedText = '<ul>';
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.match(/^- .+$/) || line.match(/^\* .+$/)) {
          formattedText += `<li>${line.replace(/[-*] /, '').trim()}</li>`;
        } else {
          formattedText += `</ul><p>${line.trim()}</p><ul>`;
        }
      });
      formattedText = formattedText.replace(/<ul>\s*<\/ul>/g, '');
      if (!formattedText.endsWith('</ul>')) formattedText += '</ul>';
    } else {
      formattedText = `<p>${text}</p>`;
    }
    return formattedText;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/^- (.*?)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    return text;
  }

  function cleanTextForSpeech(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/[*_~`#\-=+:;<>\[\]\{\}\(\)]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function categorizeMessage(message) {
    if (!message) return { category: 'general', imageKey: null };
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('जीवन आनंद') || lowerMessage.includes('jeevan anand')) {
      return { category: 'policy', imageKey: 'jeevan-anand' };
    } else if (lowerMessage.includes('न्यू जीवन') || lowerMessage.includes('new jeevan')) {
      return { category: 'policy', imageKey: 'new-jeevan' };
    } else if (lowerMessage.includes('धन वृद्धि') || lowerMessage.includes('dhan vriddhi')) {
      return { category: 'policy', imageKey: 'dhan-vriddhi' };
    } else if (lowerMessage.includes('अमृतबाल') || lowerMessage.includes('amritbal')) {
      return { category: 'policy', imageKey: 'amritbal' };
    } else if (lowerMessage.includes('योजना') || lowerMessage.includes('पॉलिसी') || lowerMessage.includes('plan')) {
      return { category: 'policy', imageKey: null };
    } else if (lowerMessage.includes('प्रीमियम') || lowerMessage.includes('premium') || lowerMessage.includes('भुगतान')) {
      return { category: 'premium', imageKey: null };
    } else if (lowerMessage.includes('दावा') || lowerMessage.includes('claim')) {
      return { category: 'claim', imageKey: null };
    } else if (lowerMessage.includes('संपर्क') || lowerMessage.includes('contact') || lowerMessage.includes('कस्टमर')) {
      return { category: 'contact', imageKey: null };
    } else {
      return { category: 'general', imageKey: null };
    }
  }

  async function performWebSearch(query) {
    console.log('Performing web search for:', query);
    return null; // Placeholder for actual search implementation
  }

  function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  async function typeMessage(text, messageId, quickReplies = []) {
    const message = window.messages.find(m => m.id === messageId);
    if (!message) return;
    let index = 0;
    const speed = 50;
    typingIndicatorElement = document.createElement('div');
    typingIndicatorElement.className = 'typing-indicator';
    typingIndicatorElement.innerHTML = '<span></span><span></span><span></span>';

    // Pre-calculate the final width of the message bubble to prevent shaking
    const tempDiv = document.createElement('div');
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.position = 'absolute';
    tempDiv.style.maxWidth = '80%';
    tempDiv.style.width = 'auto';
    tempDiv.style.padding = '0.5rem 0.75rem';
    tempDiv.style.boxSizing = 'border-box';
    tempDiv.className = 'ai-message';
    tempDiv.innerHTML = formatMarkdown(text);
    document.body.appendChild(tempDiv);
    const fixedWidth = Math.min(tempDiv.offsetWidth + 20, window.innerWidth * 0.8) + 'px';
    document.body.removeChild(tempDiv);

    // Render typing indicator and set fixed width
    renderMessages();
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .ai-message`);
    if (messageDiv) {
      messageDiv.style.width = fixedWidth;
      messageDiv.style.minWidth = '100px';
    }

    function type() {
      if (index < text.length) {
        message.text = text.slice(0, index + 1);
        renderMessages();
        index++;
        // Start speech synthesis after first character to align with typing
        if (index === 1 && isAutoSpeakEnabled && window.speakMessage) {
          const cleanedText = cleanTextForSpeech(text);
          if (cleanedText.trim()) {
            try {
              window.speakMessage(messageId, cleanedText, currentLang);
            } catch (e) {
              console.error('Speech synthesis error:', e);
            }
          }
        }
        setTimeout(type, speed);
      } else {
        message.text = text;
        typingIndicatorElement = null;
        if (quickReplies.length > 0) {
          updateSuggestions(quickReplies);
        }
        if (messageDiv) {
          messageDiv.style.width = '';
          messageDiv.style.minWidth = '100px';
        }
        localStorage.setItem('lic-chat', JSON.stringify(window.messages));
        renderMessages();
      }
    }
    type();
  }

  function renderMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
      console.error('Error: #chat-messages element not found');
      return;
    }
    chatMessages.innerHTML = '';
    let filteredMessages = window.messages;

    // Apply filtering only if not editing
    if (!editingMessageId) {
      if (isHistoryCollapsed) {
        filteredMessages = [];
      } else if (searchQuery) {
        filteredMessages = window.messages.filter(m =>
          m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.associatedQuery && m.associatedQuery.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      } else if (selectedCategory) {
        filteredMessages = window.messages.filter(m => m.category === selectedCategory);
      }
    } else {
      // Include all messages when editing to ensure the editing message is rendered
      filteredMessages = window.messages;
      console.log('Rendering all messages due to editingMessageId:', editingMessageId);
    }

    if (filteredMessages.length === 0) {
      chatMessages.innerHTML = '<div class="no-messages">कोई संदेश नहीं मिला</div>';
      scrollToBottom();
      return;
    }

    filteredMessages.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!b.isPinned && b.isPinned) return 1;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    filteredMessages.forEach(message => {
      if (!message.reactions) message.reactions = [];
      const messageDiv = document.createElement('div');
      messageDiv.className = `message-container flex mb-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`;
      messageDiv.dataset.messageId = message.id;
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = `relative max-w-[80%] p-3 rounded-lg ${message.sender === 'user' ? 'user-message' : 'ai-message'} ${message.isPinned ? 'border-2 border-yellow-500' : ''}`;
      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageContent.style.fontSize = `${fontSize}px`;

      // Explicitly handle edit UI for user messages being edited
      if (editingMessageId === message.id && message.sender === 'user') {
        const editHtml = `
          <div class="edit-message flex items-center gap-2">
            <input type="text" class="edit-message-input flex-1 p-2 border rounded-lg bg-[#F5F5F5] dark:bg-[#2A3942] text-black dark:text-[#E6E6FA]" value="${editedText.replace(/"/g, '&quot;')}" aria-label="Edit message">
            <button class="edit-message-button bg-[#128C7E] text-white p-2 rounded-lg" aria-label="Save edited message"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></button>
            <button class="cancel-edit-btn bg-[#FF4D4F] text-white p-2 rounded-lg" aria-label="Cancel edit"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
          </div>`;
        console.log('Rendering edit UI for message ID:', message.id, 'with HTML:', editHtml);
        messageContent.innerHTML = editHtml;

        // Immediate DOM check to confirm edit UI was added
        setTimeout(() => {
          const editInputCheck = document.querySelector(`[data-message-id="${message.id}"] .edit-message-input`);
          console.log('Immediate post-render check for edit input ID:', message.id, 'Found:', !!editInputCheck);
          if (!editInputCheck) {
            console.error('Edit UI not rendered for message ID:', message.id, 'Current #chat-messages HTML:', chatMessages.innerHTML);
          }
        }, 0);
      } else {
        let formattedText = formatMarkdown(message.text);
        if (message.isPinned && message.associatedQuery) {
          messageContent.innerHTML = `<p><strong>प्रश्न:</strong> ${message.associatedQuery || 'N/A'}</p><p><strong>उत्तर:</strong> ${formattedText}</p>`;
        } else {
          messageContent.innerHTML = formattedText;
        }
        if (message.imageUrl) {
          messageContent.innerHTML += `<img src="${message.imageUrl}" alt="${message.imageAlt || 'LIC संबंधित छवि'}" class="message-image" loading="lazy">`;
        }
        if (showTimestamps) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'message-timestamp';
          timeSpan.textContent = new Date(message.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
          messageContent.appendChild(timeSpan);
        }
        if (message.reactions.length > 0) {
          const reactionsDiv = document.createElement('div');
          reactionsDiv.className = 'message-reactions';
          message.reactions.forEach(reaction => {
            const reactionTag = document.createElement('span');
            reactionTag.className = 'reaction-tag';
            reactionTag.textContent = reaction;
            reactionsDiv.appendChild(reactionTag);
          });
          messageContent.appendChild(reactionsDiv);
        }
      }

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      if (message.sender === 'user') {
        actionsDiv.innerHTML = `
          <button class="action-btn edit-btn" aria-label="Edit message">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        `;
      }
      actionsDiv.innerHTML += `
        <button class="action-btn delete-btn" aria-label="Delete message">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 4v12m4-12v12"></path>
          </svg>
        </button>
        <button class="action-btn pin-btn" aria-label="${message.isPinned ? 'Unpin' : 'Pin'} message">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
          </svg>
        </button>
        <button class="action-btn react-btn" aria-label="Add reaction">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>
        <button class="action-btn speak-btn" aria-label="${message.isSpeaking ? 'Pause message' : 'Speak message'}">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${message.isSpeaking ? 'M10 9v6m4-6v6' : 'M14.752 11.168l-6.504-3.753v7.506l6.504-3.753zM5 3v18l14-9L5 3z'}"></path>
          </svg>
        </button>
      `;
      messageContent.appendChild(actionsDiv);
      bubbleDiv.appendChild(messageContent);
      messageDiv.appendChild(bubbleDiv);
      chatMessages.appendChild(messageDiv);
    });

    if (typingIndicatorElement) {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'message-container ai justify-start';
      const typingBubble = document.createElement('div');
      typingBubble.className = 'ai-message p-3 rounded-lg';
      typingBubble.style.width = '100px';
      typingBubble.appendChild(typingIndicatorElement);
      typingDiv.appendChild(typingBubble);
      chatMessages.appendChild(typingDiv);
    }

    scrollToBottom();
    localStorage.setItem('lic-chat', JSON.stringify(window.messages));
    updatePinnedMessages();
  }

  function updatePinnedMessages() {
    const pinnedWindow = document.getElementById('pinned-messages-window');
    if (!pinnedWindow) {
      console.error('Pinned messages window not found');
      return;
    }
    pinnedWindow.innerHTML = '<h3>पिन किए गए संदेश</h3>';
    const pinnedMessages = window.messages.filter(m => m.isPinned);
    if (pinnedMessages.length === 0) {
      pinnedWindow.innerHTML += '<p>कोई पिन किया हुआ संदेश नहीं</p>';
    } else {
      pinnedMessages.forEach(message => {
        const pinnedDiv = document.createElement('div');
        pinnedDiv.className = 'pinned-message';
        pinnedDiv.innerHTML = `
          <p><strong>प्रश्न:</strong> ${message.associatedQuery || 'N/A'}</p>
          <p><strong>उत्तर:</strong> ${formatMarkdown(message.text)}</p>
          <button class="unpin-btn">अनपिन करें</button>
        `;
        pinnedDiv.querySelector('.unpin-btn').addEventListener('click', () => {
          message.isPinned = false;
          updatePinnedMessages();
          renderMessages();
        });
        pinnedWindow.appendChild(pinnedDiv);
      });
    }
  }

  function updateSuggestions(prompts = suggestedPrompts[currentLang]) {
    const suggestionsContainer = document.getElementById('chat-suggestions');
    if (!suggestionsContainer) {
      console.error('Suggestions container not found');
      return;
    }
    suggestionsContainer.innerHTML = '';
    filteredSuggestions = prompts.filter(p => !searchQuery || p.toLowerCase().includes(searchQuery.toLowerCase()));
    filteredSuggestions.forEach(prompt => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.textContent = prompt;
      btn.addEventListener('click', () => {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
          chatInput.value = prompt;
          sendMessage(prompt);
        }
      });
      suggestionsContainer.appendChild(btn);
    });
  }

  function sendMessage(message) {
    if (!message || isLoading) return;
    const messageId = Date.now();
    window.messages.push({
      sender: 'user',
      text: message,
      id: messageId,
      timestamp: new Date().toISOString(),
      category: categorizeMessage(message).category,
      reactions: [],
      isPinned: false,
      associatedQuery: null
    });
    renderMessages();
    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.value = '';
    processMessageWithTone(message, messageId, 'professional');
  }

  function startEditing(id, text) {
    console.log('Starting edit for message ID:', id, 'with text:', text);
    editingMessageId = id;
    editedText = text;
    renderMessages();
    let attempts = 0;
    const maxAttempts = 3;
    function tryFindEditInput() {
      // Try primary selector
      let editInput = document.querySelector(`[data-message-id="${id}"] .edit-message-input`);
      // Fallback selector in case of DOM misalignment
      if (!editInput) {
        editInput = document.querySelector('.edit-message-input');
      }
      if (editInput) {
        console.log('Edit input found for message ID:', id, 'Selector used:', editInput.parentElement.dataset.messageId ? 'Primary' : 'Fallback');
        editInput.focus();
        editInput.addEventListener('input', e => {
          editedText = e.target.value;
        });
        editInput.addEventListener('keypress', e => {
          if (e.key === 'Enter') {
            saveEditedMessage(id);
          }
        });
      } else {
        attempts++;
        console.warn(`Edit input not found for message ID: ${id}, attempt ${attempts}/${maxAttempts}`);
        if (attempts < maxAttempts) {
          setTimeout(tryFindEditInput, 300); // Increased retry delay
        } else {
          console.error('Failed to find edit input for message ID:', id);
          editingMessageId = null;
          renderMessages();
        }
      }
    }
    setTimeout(tryFindEditInput, 200); // Increased initial delay
  }

  async function saveEditedMessage(id) {
    if (!editedText.trim()) {
      console.log('Edit canceled: empty text for message ID:', id);
      editingMessageId = null;
      renderMessages();
      return;
    }
    const originalMessage = window.messages.find(m => m.id == id);
    if (!originalMessage) {
      console.error('Message not found for ID:', id);
      editingMessageId = null;
      renderMessages();
      return;
    }
    if (originalMessage.text !== editedText) {
      console.log('Saving edited message ID:', id, 'with new text:', editedText);
      // Update original message
      window.messages = window.messages.map(m =>
        m.id == id ? { ...m, text: editedText, timestamp: new Date().toISOString(), category: categorizeMessage(editedText).category } : m
      );
      // Create new user message to trigger AI response
      const newMessageId = Date.now() + 1;
      window.messages.push({
        sender: 'user',
        text: editedText,
        id: newMessageId,
        timestamp: new Date().toISOString(),
        category: categorizeMessage(editedText).category,
        reactions: [],
        isPinned: false,
        associatedQuery: null
      });
      localStorage.setItem('lic-chat', JSON.stringify(window.messages));
      editingMessageId = null;
      renderMessages();
      await processMessageWithTone(editedText, newMessageId, 'professional');
    } else {
      console.log('No changes made to message ID:', id);
      editingMessageId = null;
      renderMessages();
    }
  }

  function cancelEdit() {
    console.log('Canceling edit for message ID:', editingMessageId);
    editingMessageId = null;
    editedText = '';
    renderMessages();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Check if required scripts are loaded
    if (!window.speakMessage || !window.licContext) {
      console.error('Required scripts (audiochatbot.js or licContext.js) failed to load');
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        chatMessages.innerHTML = '<div class="no-messages">चैटबॉट लोड करने में त्रुटि। कृपया पेज रिफ्रेश करें या Jitendra Patidar से संपर्क करें: 7987235207</div>';
      }
      return;
    }

    renderMessages();
    updateSuggestions();

    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.querySelector('.send-btn');
    const voiceBtn = document.querySelector('.voice-btn');
    const controlsToggle = document.querySelector('.controls-toggle');
    const pinnedToggle = document.querySelector('.pinned-toggle');
    const themeBtn = document.querySelector('.theme-btn');
    const searchToggle = document.querySelector('.search-toggle');
    const historyBtn = document.querySelector('.history-btn');
    const autoReplyBtn = document.querySelector('.auto-reply-btn');
    const autoSpeakBtn = document.querySelector('.auto-speak-btn');
    const timestampBtn = document.querySelector('.timestamp-btn');
    const clearBtn = document.querySelector('.clear-btn');
    const volumeControl = document.getElementById('volume-control');
    const fontIncreaseBtn = document.querySelector('.font-increase-btn');
    const fontDecreaseBtn = document.querySelector('.font-decrease-btn');
    const categoryFilter = document.getElementById('category-filter');
    const searchBar = document.getElementById('search-bar');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatInput || !sendBtn || !chatbotContainer || !chatMessages) {
      console.error('Critical UI elements missing');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'no-messages';
      errorDiv.textContent = 'चैटबॉट UI लोड करने में त्रुटि। कृपया पेज रिफ्रेश करें।';
      if (chatbotContainer) chatbotContainer.appendChild(errorDiv);
      return;
    }

    chatInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !isLoading) {
        const message = chatInput.value.trim();
        if (message) sendMessage(message);
      }
    });

    sendBtn.addEventListener('click', () => {
      const message = chatInput.value.trim();
      if (message && !isLoading) sendMessage(message);
    });

    if (recognition && voiceBtn) {
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      voiceBtn.addEventListener('click', () => {
        if (isRecording) {
          recognition.stop();
          voiceBtn.classList.remove('recording');
          isRecording = false;
        } else {
          recognition.start();
          voiceBtn.classList.add('recording');
          isRecording = true;
          interactionAnalytics.speechUsed++;
        }
      });
      recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        if (!isLoading) sendMessage(transcript);
        voiceBtn.classList.remove('recording');
        isRecording = false;
      };
      recognition.onerror = event => {
        console.error('Speech recognition error:', event.error);
        voiceBtn.classList.remove('recording');
        isRecording = false;
        chatInput.value = 'क्षमा करें, आवाज पहचान में त्रुटि।';
      };
      recognition.onend = () => {
        voiceBtn.classList.remove('recording');
        isRecording = false;
      };
    } else if (voiceBtn) {
      voiceBtn.disabled = true;
    }

    if (controlsToggle) {
      const chatbotControls = document.querySelector('.chatbot-controls');
      if (chatbotControls) {
        controlsToggle.addEventListener('click', () => {
          chatbotControls.classList.toggle('hidden');
          chatbotControls.style.display = chatbotControls.classList.contains('hidden') ? 'none' : 'block';
        });
      } else {
        console.error('Error: .chatbot-controls element not found');
      }
    }

    if (pinnedToggle) {
      pinnedToggle.addEventListener('click', () => {
        isPinnedWindowOpen = !isPinnedWindowOpen;
        const pinnedWindow = document.getElementById('pinned-messages-window');
        if (pinnedWindow) {
          pinnedToggle.classList.toggle('active', isPinnedWindowOpen);
          pinnedWindow.classList.toggle('active', isPinnedWindowOpen);
          updatePinnedMessages();
        }
      });
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        chatbotContainer.classList.toggle('dark', isDarkMode);
        localStorage.setItem('chat-theme', isDarkMode ? 'dark' : 'light');
      });
    }

    if (searchToggle) {
      searchToggle.addEventListener('click', () => {
        if (searchBar) {
          searchBar.classList.toggle('hidden');
          if (!searchBar.classList.contains('hidden')) {
            searchBar.focus();
          } else {
            searchQuery = '';
            searchBar.value = '';
            renderMessages();
            updateSuggestions();
          }
        }
      });
    }

    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        isHistoryCollapsed = !isHistoryCollapsed;
        historyBtn.textContent = isHistoryCollapsed ? 'इतिहास दिखाएं' : 'इतिहास छिपाएं';
        renderMessages();
      });
    }

    if (autoReplyBtn) {
      autoReplyBtn.addEventListener('click', () => {
        isAutoReplyEnabled = !isAutoReplyEnabled;
        autoReplyBtn.textContent = `ऑटो-रिप्लाई: ${isAutoReplyEnabled ? 'चालू' : 'बंद'}`;
      });
    }

    if (autoSpeakBtn) {
      autoSpeakBtn.addEventListener('click', () => {
        isAutoSpeakEnabled = !isAutoSpeakEnabled;
        autoSpeakBtn.textContent = `ऑटो-स्पीक: ${isAutoSpeakEnabled ? 'चालू' : 'बंद'}`;
      });
    }

    if (timestampBtn) {
      timestampBtn.addEventListener('click', () => {
        showTimestamps = !showTimestamps;
        timestampBtn.textContent = showTimestamps ? 'टाइमस्टैम्प छिपाएं' : 'टाइमस्टैम्प दिखाएं';
        renderMessages();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const popup = document.createElement('div');
        popup.className = 'confirm-popup';
        popup.innerHTML = `
          <p>क्या आप वाकई चैट इतिहास साफ करना चाहते हैं?</p>
          <button class="confirm-btn">हां</button>
          <button class="cancel-btn">नहीं</button>
        `;
        document.body.appendChild(popup);
        popup.querySelector('.confirm-btn').addEventListener('click', () => {
          window.messages = [{
            sender: 'ai',
            text: 'हाय! मैं LIC इंडिया का चैटबॉट हूँ। LIC की योजनाओं, प्रीमियम, या दावों के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "पॉलिसी की स्थिति कैसे जांचें?"',
            id: 'welcome',
            timestamp: new Date().toISOString(),
            category: 'welcome',
            reactions: [],
            isPinned: false,
            associatedQuery: null
          }];
          localStorage.setItem('lic-chat', JSON.stringify(window.messages));
          renderMessages();
          updateSuggestions();
          popup.remove();
        });
        popup.querySelector('.cancel-btn').addEventListener('click', () => {
          popup.remove();
        });
      });
    }

    if (volumeControl) {
      volumeControl.addEventListener('input', () => {
        if (window.setSpeechVolume) {
          window.setSpeechVolume(volumeControl.value);
          localStorage.setItem('chat-volume', volumeControl.value);
        }
      });
    }

    if (fontIncreaseBtn) {
      fontIncreaseBtn.addEventListener('click', () => {
        if (fontSize < 24) {
          fontSize += 2;
          localStorage.setItem('chat-font-size', fontSize);
          renderMessages();
        }
      });
    }

    if (fontDecreaseBtn) {
      fontDecreaseBtn.addEventListener('click', () => {
        if (fontSize > 12) {
          fontSize -= 2;
          localStorage.setItem('chat-font-size', fontSize);
          renderMessages();
        }
      });
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        selectedCategory = categoryFilter.value;
        renderMessages();
        updateSuggestions();
      });
    }

    if (searchBar) {
      searchBar.addEventListener('input', () => {
        searchQuery = searchBar.value.trim();
        renderMessages();
        updateSuggestions();
      });
    }

    if (chatMessages) {
      chatMessages.addEventListener('click', async e => {
        const target = e.target.closest('.action-btn, .edit-message-button, .cancel-edit-btn');
        if (!target) return;
        const messageDiv = target.closest('.message-container');
        if (!messageDiv) {
          console.error('Message container not found for target:', target);
          return;
        }
        const messageId = messageDiv.dataset.messageId;
        const message = window.messages.find(m => m.id == messageId);
        if (!message) {
          console.error('Message not found for ID:', messageId);
          return;
        }

        if (target.classList.contains('edit-btn') && message.sender === 'user') {
          startEditing(messageId, message.text);
        } else if (target.classList.contains('delete-btn')) {
          const popup = document.createElement('div');
          popup.className = 'confirm-popup';
          popup.innerHTML = `
            <p>क्या आप इस संदेश को हटाना चाहते हैं?</p>
            <button class="confirm-btn">हां</button>
            <button class="cancel-btn">नहीं</button>
          `;
          document.body.appendChild(popup);
          popup.querySelector('.confirm-btn').addEventListener('click', () => {
            window.messages = window.messages.filter(m => m.id != messageId);
            localStorage.setItem('lic-chat', JSON.stringify(window.messages));
            renderMessages();
            updatePinnedMessages();
            popup.remove();
          });
          popup.querySelector('.cancel-btn').addEventListener('click', () => {
            popup.remove();
          });
        } else if (target.classList.contains('pin-btn')) {
          message.isPinned = !message.isPinned;
          updatePinnedMessages();
          renderMessages();
        } else if (target.classList.contains('react-btn')) {
          const picker = document.createElement('div');
          picker.className = 'reaction-picker';
          emojiOptions.forEach(emoji => {
            const item = document.createElement('span');
            item.className = 'reaction-picker-item';
            item.textContent = emoji;
            item.addEventListener('click', () => {
              if (!message.reactions.includes(emoji)) {
                message.reactions.push(emoji);
                interactionAnalytics.reactionsUsed++;
                renderMessages();
              }
              picker.remove();
            });
            picker.appendChild(item);
          });
          target.parentElement.appendChild(picker);
        } else if (target.classList.contains('speak-btn')) {
          const cleanText = cleanTextForSpeech(message.text);
          if (window.speakMessage && cleanText.trim()) {
            try {
              window.speakMessage(message.id, cleanText, currentLang);
            } catch (e) {
              console.error('Speech synthesis error:', e);
            }
          }
        } else if (target.classList.contains('edit-message-button') && message.sender === 'user') {
          await saveEditedMessage(messageId);
        } else if (target.classList.contains('cancel-edit-btn')) {
          cancelEdit();
        }
      });
    }

    const socialToggle = document.querySelector('.social-toggle-button');
    const socialLinks = document.querySelector('.social-share-links');
    if (socialToggle && socialLinks) {
      socialToggle.addEventListener('click', () => {
        socialLinks.classList.toggle('open');
        socialToggle.classList.toggle('active');
      });
    }

    if (volumeControl) {
      volumeControl.value = localStorage.getItem('chat-volume') || 1;
      if (window.setSpeechVolume) window.setSpeechVolume(volumeControl.value);
    }
  });
})();
