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

  // Initialize DOM elements
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.querySelector('.send-btn');
  const voiceBtn = document.querySelector('.voice-btn');
  const themeBtn = document.querySelector('.theme-btn');
  const controlsToggle = document.querySelector('.controls-toggle');
  const chatControls = document.getElementById('chat-controls');
  const fontIncreaseBtn = document.querySelector('.font-increase-btn');
  const fontDecreaseBtn = document.querySelector('.font-decrease-btn');
  const volumeControl = document.getElementById('volume-control');
  const historyBtn = document.querySelector('.history-btn');
  const autoReplyBtn = document.querySelector('.auto-reply-btn');
  const autoSpeakBtn = document.querySelector('.auto-speak-btn');
  const timestampBtn = document.querySelector('.timestamp-btn');
  const searchBar = document.getElementById('search-bar');
  const searchToggle = document.querySelector('.search-toggle');
  const categoryFilter = document.getElementById('category-filter');
  const clearBtn = document.querySelector('.clear-btn');
  const pinnedToggle = document.querySelector('.pinned-toggle');
  const pinnedMessagesWindow = document.getElementById('pinned-messages-window');
  const chatSuggestions = document.getElementById('chat-suggestions');
  const chatbotContainer = document.querySelector('.chatbot-container');

  // Load LIC context from single file
  function getContext() {
    return window.licContext?.hindiContext || 'LIC India context not available';
  }

  function getImageContext() {
    return window.licContext?.imageContext || {};
  }

  function showTonePicker(message, messageId) {
    // Only professional tone is allowed, so process directly
    processMessageWithTone(message, messageId, 'professional');
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
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  async function typeMessage(text, messageId, quickReplies = []) {
    const message = window.messages.find(m => m.id === messageId);
    if (!message) return;
    let index = 0;
    const speed = 50;
    let cleanedText = '';
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
    const fixedWidth = Math.min(tempDiv.offsetWidth + 20, window.innerWidth * 0.8) + 'px'; // Add padding buffer
    document.body.removeChild(tempDiv);

    // Clean text for speech and start audio immediately
    cleanedText = cleanTextForSpeech(text);
    if (isAutoSpeakEnabled && window.speakMessage && cleanedText.trim()) {
      try {
        window.speakMessage(messageId, cleanedText, currentLang);
      } catch (e) {
        console.error('Speech synthesis error:', e);
      }
    }

    // Apply fixed width during typing
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
        setTimeout(type, speed);
      } else {
        message.text = text;
        typingIndicatorElement = null;
        if (quickReplies.length > 0) {
          updateSuggestions(quickReplies);
        }
        if (messageDiv) {
          messageDiv.style.width = ''; // Remove fixed width after typing
          messageDiv.style.minWidth = '100px';
        }
        localStorage.setItem('lic-chat', JSON.stringify(window.messages));
        renderMessages();
      }
    }
    type();
  }

  function renderMessages() {
    if (!chatMessages) {
      console.error('Error: #chat-messages element not found');
      return;
    }
    chatMessages.innerHTML = '';
    let filteredMessages = window.messages;
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

    if (filteredMessages.length === 0) {
      chatMessages.innerHTML = '<div class="no-messages">कोई संदेश नहीं मिला</div>';
      scrollToBottom();
      return;
    }

    filteredMessages.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
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
      let formattedText = formatMarkdown(message.text);
      if (editingMessageId === message.id) {
        messageContent.innerHTML = `
          <div class="edit-message flex items-center gap-2">
            <input type="text" class="edit-message-input flex-1 p-2 border rounded-lg bg-[#F5F5F5] dark:bg-[#2A3942] text-black dark:text-[#E6E6FA]" value="${editedText.replace(/"/g, '&quot;')}">
            <button class="edit-message-button bg-[#128C7E] text-white p-2 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></button>
            <button class="cancel-btn bg-[#FF4D4F] text-white p-2 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
          </div>`;
      } else {
        messageContent.innerHTML = formattedText;
        if (message.imageUrl) {
          const img = document.createElement('img');
          img.src = message.imageUrl;
          img.alt = message.imageAlt || 'LIC image';
          img.className = 'message-image';
          messageContent.appendChild(img);
        }
      }
      bubbleDiv.appendChild(messageContent);

      if (showTimestamps) {
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp text-right text-xs text-[#546E7A] dark:text-[#8696A0]';
        timestampDiv.textContent = new Date(message.timestamp).toLocaleString('hi-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
        bubbleDiv.appendChild(timestampDiv);
      }

      const reactionsDiv = document.createElement('div');
      reactionsDiv.className = 'message-reactions flex gap-1 mt-1';
      message.reactions.forEach(reaction => {
        const reactionTag = document.createElement('span');
        reactionTag.className = 'reaction-tag text-sm px-1 bg-[#128C7E] dark:bg-[#0A3D37] text-white rounded';
        reactionTag.textContent = reaction;
        reactionsDiv.appendChild(reactionTag);
      });
      bubbleDiv.appendChild(reactionsDiv);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions flex gap-1 mt-1 justify-end';
      const pinBtn = document.createElement('button');
      pinBtn.className = 'action-btn p-1 rounded hover:bg-[#25D366]';
      pinBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>`;
      pinBtn.title = message.isPinned ? 'अनपिन करें' : 'पिन करें';
      actionsDiv.appendChild(pinBtn);

      const reactBtn = document.createElement('button');
      reactBtn.className = 'action-btn p-1 rounded hover:bg-[#25D366]';
      reactBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      reactBtn.title = 'रिएक्शन जोड़ें';
      actionsDiv.appendChild(reactBtn);

      if (message.sender === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn p-1 rounded hover:bg-[#25D366]';
        editBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`;
        editBtn.title = 'संपादित करें';
        actionsDiv.appendChild(editBtn);
      }

      bubbleDiv.appendChild(actionsDiv);
      messageDiv.appendChild(bubbleDiv);
      chatMessages.appendChild(messageDiv);

      if (message.id === editingMessageId) {
        const editInput = messageContent.querySelector('.edit-message-input');
        editInput.focus();
        editInput.addEventListener('input', (e) => {
          editedText = e.target.value;
        });
        messageContent.querySelector('.edit-message-button').addEventListener('click', () => {
          if (editedText.trim()) {
            message.text = editedText;
            editingMessageId = null;
            editedText = '';
            localStorage.setItem('lic-chat', JSON.stringify(window.messages));
            renderMessages();
          }
        });
        messageContent.querySelector('.cancel-btn').addEventListener('click', () => {
          editingMessageId = null;
          editedText = '';
          renderMessages();
        });
      }

      pinBtn.addEventListener('click', () => {
        message.isPinned = !message.isPinned;
        localStorage.setItem('lic-chat', JSON.stringify(window.messages));
        renderMessages();
        renderPinnedMessages();
      });

      reactBtn.addEventListener('click', () => {
        const existingPicker = document.querySelector('.reaction-picker');
        if (existingPicker) existingPicker.remove();
        const picker = document.createElement('div');
        picker.className = 'reaction-picker absolute bottom-8 right-0 bg-[#ECE5DD] dark:bg-[#111B21] border border-[#128C7E] dark:border-[#0A3D37] rounded-lg p-1 flex gap-1 shadow-lg';
        emojiOptions.forEach(emoji => {
          const emojiBtn = document.createElement('span');
          emojiBtn.className = 'reaction-picker-item text-sm p-1 cursor-pointer hover:bg-[#25D366] rounded';
          emojiBtn.textContent = emoji;
          emojiBtn.addEventListener('click', () => {
            if (!message.reactions.includes(emoji)) {
              message.reactions.push(emoji);
              interactionAnalytics.reactionsUsed++;
              localStorage.setItem('lic-chat', JSON.stringify(window.messages));
              renderMessages();
            }
            picker.remove();
          });
          picker.appendChild(emojiBtn);
        });
        bubbleDiv.appendChild(picker);
      });

      if (message.sender === 'user') {
        messageContent.querySelector('.edit-message-button')?.addEventListener('click', () => {
          if (editedText.trim()) {
            message.text = editedText;
            editingMessageId = null;
            editedText = '';
            localStorage.setItem('lic-chat', JSON.stringify(window.messages));
            renderMessages();
          }
        });
        messageContent.querySelector('.cancel-btn')?.addEventListener('click', () => {
          editingMessageId = null;
          editedText = '';
          renderMessages();
        });
      }
    });

    if (typingIndicatorElement) {
      chatMessages.appendChild(typingIndicatorElement);
    }
    scrollToBottom();
    renderPinnedMessages();
  }

  function renderPinnedMessages() {
    if (!pinnedMessagesWindow) return;
    pinnedMessagesWindow.innerHTML = '';
    const pinnedMessages = window.messages.filter(m => m.isPinned);
    if (pinnedMessages.length > 0 && isPinnedWindowOpen) {
      pinnedMessagesWindow.classList.add('active');
      const title = document.createElement('h3');
      title.textContent = 'पिन किए गए संदेश';
      pinnedMessagesWindow.appendChild(title);
      pinnedMessages.forEach(message => {
        const pinnedDiv = document.createElement('div');
        pinnedDiv.className = 'pinned-message p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#202C33] mb-2 shadow';
        const text = document.createElement('p');
        text.innerHTML = formatMarkdown(message.text);
        pinnedDiv.appendChild(text);
        const unpinBtn = document.createElement('button');
        unpinBtn.className = 'unpin-btn bg-[#FF4D4F] text-white p-1 rounded mt-1';
        unpinBtn.textContent = 'अनपिन करें';
        unpinBtn.addEventListener('click', () => {
          message.isPinned = false;
          localStorage.setItem('lic-chat', JSON.stringify(window.messages));
          renderMessages();
          renderPinnedMessages();
        });
        pinnedDiv.appendChild(unpinBtn);
        pinnedMessagesWindow.appendChild(pinnedDiv);
      });
    } else {
      pinnedMessagesWindow.classList.remove('active');
    }
  }

  function updateSuggestions(prompts) {
    if (!chatSuggestions) return;
    chatSuggestions.innerHTML = '';
    filteredSuggestions = prompts || suggestedPrompts[currentLang];
    filteredSuggestions.forEach(prompt => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn p-2 bg-[#128C7E] dark:bg-[#0A3D37] text-white rounded-lg text-sm hover:bg-[#25D366]';
      btn.textContent = prompt;
      btn.addEventListener('click', () => {
        chatInput.value = prompt;
        sendMessage(prompt);
      });
      chatSuggestions.appendChild(btn);
    });
  }

  function sendMessage(messageText) {
    if (!messageText.trim() || isLoading) return;
    const messageId = Date.now();
    window.messages.push({
      sender: 'user',
      text: messageText,
      id: messageId,
      timestamp: new Date().toISOString(),
      category: categorizeMessage(messageText).category,
      reactions: [],
      isPinned: false,
      associatedQuery: null
    });
    localStorage.setItem('lic-chat', JSON.stringify(window.messages));
    chatInput.value = '';
    renderMessages();
    showTonePicker(messageText, messageId);
  }

  function initializeSpeechRecognition() {
    if (!recognition) {
      voiceBtn.disabled = true;
      return;
    }
    recognition.lang = 'hi-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      chatInput.value = finalTranscript || interimTranscript;
    };

    recognition.onend = () => {
      if (isRecording) {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        if (chatInput.value.trim()) {
          interactionAnalytics.speechUsed++;
          sendMessage(chatInput.value);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isRecording = false;
      voiceBtn.classList.remove('recording');
      chatInput.value = 'स्पीच रिकग्निशन में त्रुटि। कृपया फिर से कोशिश करें।';
    };
  }

  function showConfirmPopup(message, onConfirm) {
    const popup = document.createElement('div');
    popup.className = 'confirm-popup bg-[#ECE5DD] dark:bg-[#111B21] p-4 rounded-lg shadow-lg';
    popup.innerHTML = `
      <p class="text-[#111B21] dark:text-[#E9EDEF]">${message}</p>
      <button class="confirm-btn bg-[#25D366] text-white px-4 py-2 rounded-lg">हाँ</button>
      <button class="cancel-btn bg-[#FF4D4F] text-white px-4 py-2 rounded-lg">नहीं</button>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.confirm-btn').addEventListener('click', () => {
      onConfirm();
      popup.remove();
    });
    popup.querySelector('.cancel-btn').addEventListener('click', () => {
      popup.remove();
    });
  }

  // Event Listeners
  if (chatInput && sendBtn) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
      }
    });
    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (!recognition) return;
      if (!isRecording) {
        isRecording = true;
        voiceBtn.classList.add('recording');
        chatInput.value = '';
        recognition.start();
      } else {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        recognition.stop();
      }
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      localStorage.setItem('chat-theme', isDarkMode ? 'dark' : 'light');
      chatbotContainer.classList.toggle('dark', isDarkMode);
      renderMessages();
    });
  }

  if (controlsToggle && chatControls) {
    controlsToggle.addEventListener('click', () => {
      chatControls.classList.toggle('hidden');
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

  if (volumeControl) {
    volumeControl.addEventListener('input', (e) => {
      window.setVolume?.(parseFloat(e.target.value));
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

  if (searchBar && searchToggle) {
    searchToggle.addEventListener('click', () => {
      searchBar.classList.toggle('hidden');
      if (!searchBar.classList.contains('hidden')) {
        searchBar.focus();
      }
    });
    searchBar.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMessages();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      selectedCategory = e.target.value;
      renderMessages();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      showConfirmPopup('क्या आप चैट इतिहास साफ करना चाहते हैं?', () => {
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
      });
    });
  }

  if (pinnedToggle) {
    pinnedToggle.addEventListener('click', () => {
      isPinnedWindowOpen = !isPinnedWindowOpen;
      renderPinnedMessages();
    });
  }

  // Initialize
  chatbotContainer.classList.toggle('dark', isDarkMode);
  updateSuggestions();
  renderMessages();
  initializeSpeechRecognition();
})();
