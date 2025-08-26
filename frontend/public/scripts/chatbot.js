(function() {
  let currentLang = localStorage.getItem('chat-lang') || 'hi';
  window.messages = JSON.parse(localStorage.getItem('lic-chat')) || [
    {
      sender: 'ai',
      text: currentLang === 'hi' 
        ? 'हाय! मैं LIC इंडिया चैटबॉट हूँ। बीमा योजनाओं, प्रीमियम, दावों, या सेवाओं के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "प्रीमियम कैसे चुकाएं?"'
        : 'Hi! I\'m the LIC India chatbot. Ask about insurance plans, premiums, claims, or services, like "What is LIC Jeevan Anand?" or "How to pay premiums?"',
      id: 'welcome',
      timestamp: new Date().toISOString(),
      category: 'welcome',
      reactions: [],
      isPinned: false
    }
  ];

  try {
    if (!Array.isArray(window.messages)) {
      console.warn('Invalid localStorage data, resetting messages');
      window.messages = [{
        sender: 'ai',
        text: currentLang === 'hi' 
          ? 'हाय! मैं LIC इंडिया चैटबॉट हूँ। बीमा योजनाओं, प्रीमियम, दावों, या सेवाओं के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "प्रीमियम कैसे चुकाएं?"'
          : 'Hi! I\'m the LIC India chatbot. Ask about insurance plans, premiums, claims, or services, like "What is LIC Jeevan Anand?" or "How to pay premiums?"',
        id: 'welcome',
        timestamp: new Date().toISOString(),
        category: 'welcome',
        reactions: [],
        isPinned: false
      }];
      localStorage.setItem('lic-chat', JSON.stringify(window.messages));
    }
  } catch (e) {
    console.error('Error parsing localStorage:', e);
    window.messages = [{
      sender: 'ai',
      text: currentLang === 'hi' 
        ? 'हाय! मैं LIC इंडिया चैटबॉट हूँ। बीमा योजनाओं, प्रीमियम, दावों, या सेवाओं के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "प्रीमियम कैसे चुकाएं?"'
        : 'Hi! I\'m the LIC India chatbot. Ask about insurance plans, premiums, claims, or services, like "What is LIC Jeevan Anand?" or "How to pay premiums?"',
      id: 'welcome',
      timestamp: new Date().toISOString(),
      category: 'welcome',
      reactions: [],
      isPinned: false
    }];
    localStorage.setItem('lic-chat', JSON.stringify(window.messages));
  }

  let isLoading = false;
  let isDarkMode = false;
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
  const suggestedPrompts = {
    en: [
      'What is LIC Jeevan Anand plan?',
      'How to pay LIC policy premium?',
      'How to check policy status?',
      'What is the best LIC plan?',
      'How to file a claim with LIC?',
      'What are LIC’s new plans?',
      'What types of plans does LIC offer?',
      'How to register an LIC policy?',
      'How to make online payments for LIC?',
      'What is LIC’s term insurance plan?',
      'What are LIC’s pension plans?',
      'How to check LIC maturity amount?',
      'How to become an LIC agent?',
      'What are LIC’s ULIP plans?',
      'How to get a loan from LIC?',
      'How to surrender an LIC policy?',
      'How to change nominee in LIC?',
      'What are LIC’s child plans?',
      'What are LIC’s health insurance plans?',
      'How to contact LIC customer service?'
    ],
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

  // Load LIC context from licContext.js
  function getContext() {
    return window.licContext?.hindiContext || 'LIC India context not available';
  }

  function getImageContext() {
    return window.licContext?.imageContext || {};
  }

  async function performWebSearch(query) {
    try {
      const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${primaryApiKey}&cx=017576662512468239146:omuauf_lfve&q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search API failed');
      const data = await response.json();
      return data.items?.[0]?.snippet || null;
    } catch (error) {
      console.error('Web search error:', error);
      return null;
    }
  }

  function isImageRelevant(message, keywords) {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  function formatResponse(text) {
    return text
      .replace(/(\n\s*[-*]\s+)/g, '\n- ')
      .replace(/(\n- .+)+/g, match => match.replace(/\n/g, '\n'));
  }

  async function typeMessage(text, messageId, quickReplies) {
    const message = window.messages.find(m => m.id === messageId);
    if (!message) {
      console.error(`Message not found for ID: ${messageId}`);
      return;
    }
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .message-content`);
    if (!messageDiv) {
      console.error(`Message content div not found for ID: ${messageId}`);
      return;
    }

    messageDiv.innerHTML = '<div class="typing-placeholder min-h-[20px]"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    const placeholder = messageDiv.querySelector('.typing-placeholder');
    let currentText = '';
    const charDelay = 50;

    if (isAutoSpeakEnabled && typeof window.speakMessage === 'function') {
      console.log(`Auto-speak triggered for message ID: ${messageId}`);
      window.speakMessage(messageId, text, currentLang);
      interactionAnalytics.speechUsed++;
    }

    for (let i = 0; i < text.length; i++) {
      currentText += text[i];
      placeholder.innerHTML = `<div>${formatMarkdown(currentText)}</div>`;
      message.text = currentText;
      await new Promise(resolve => setTimeout(resolve, charDelay));
    }

    message.text = formatResponse(text);
    message.quickReplies = quickReplies;
    messageDiv.innerHTML = formatMarkdown(message.text);
    if (message.quickReplies && message.quickReplies.length > 0) {
      const replyButtons = document.createElement('div');
      replyButtons.className = 'quick-replies flex flex-wrap gap-2 mt-2';
      message.quickReplies.forEach(reply => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-white dark:text-[var(--chat-text-dark)] p-2 rounded-lg text-sm min-w-[120px] text-center';
        btn.textContent = reply;
        btn.addEventListener('click', () => handleQuickReply(reply));
        replyButtons.appendChild(btn);
      });
      messageDiv.appendChild(replyButtons);
    }
    renderMessages();
    console.log(`Message typed for ID: ${messageId}`);
  }

  async function processMessage(message, messageId) {
    if (isLoading) {
      console.warn('Message processing skipped: isLoading=true');
      return;
    }
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
    console.log(`Message processed for ID: ${responseId}`);
  }

  function renderMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
      console.error('Error: #chat-messages element not found');
      return;
    }
    chatMessages.innerHTML = '';
    const filteredMessages = searchQuery
      ? window.messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()) || (m.associatedQuery && m.associatedQuery.toLowerCase().includes(searchQuery.toLowerCase())))
      : selectedCategory
      ? window.messages.filter(m => m.category === selectedCategory)
      : window.messages;

    if (filteredMessages.length === 0) {
      chatMessages.innerHTML = `<div class="no-messages">${currentLang === 'hi' ? 'कोई संदेश नहीं मिला' : 'No messages found'}</div>`;
    }

    filteredMessages.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    filteredMessages.forEach(function(message) {
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
        messageContent.innerHTML =
          '<div class="edit-message flex items-center gap-2">' +
            `<input type="text" class="edit-message-input flex-1 p-2 border rounded-lg bg-[var(--chat-ai-light)] dark:bg-[var(--chat-ai-dark)] text-[var(--chat-text-light)] dark:text-[var(--chat-text-dark)]" value="${editedText.replace(/"/g, '&quot;')}">` +
            '<button class="edit-message-button bg-[var(--chat-accent)] text-white p-[0.3rem] rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></button>' +
            '<button class="cancel-btn bg-[var(--chat-error)] text-white p-[0.3rem] rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>' +
          '</div>';
      } else {
        messageContent.innerHTML = formattedText;
        if (message.imageUrl) {
          messageContent.innerHTML += `<img src="${message.imageUrl}" alt="${message.imageAlt || 'Image related to LIC India'}" class="message-image max-w-full h-auto rounded-lg mt-2" loading="lazy">`;
        }
        if (showTimestamps) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'message-timestamp text-[0.625rem] text-[var(--chat-secondary-text-light)] dark:text-[var(--chat-secondary-text-dark)] text-right block mt-1';
          timeSpan.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          messageContent.appendChild(timeSpan);
        }
        if (message.reactions.length > 0) {
          messageContent.innerHTML += '<div class="message-reactions flex flex-wrap gap-1 mt-1">' + 
            message.reactions.map(r => `<span class="reaction-tag bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-white dark:text-[var(--chat-text-dark)] rounded-full px-2 py-1 text-[1rem] font-family-emoji">${r}</span>`).join('') + 
            '</div>';
        }
        if (message.quickReplies && message.quickReplies.length > 0) {
          const replyButtons = document.createElement('div');
          replyButtons.className = 'quick-replies flex flex-wrap gap-2 mt-2';
          message.quickReplies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'quick-reply-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-white dark:text-[var(--chat-text-dark)] p-2 rounded-lg text-sm min-w-[120px] text-center';
            btn.textContent = reply;
            btn.addEventListener('click', () => handleQuickReply(reply));
            replyButtons.appendChild(btn);
          });
          messageContent.appendChild(replyButtons);
        }
      }
      if (message.sender === 'ai' && message.text && typeof window.speakMessage === 'function') {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn absolute top-2 right-2 p-[0.3rem] bg-transparent text-[var(--chat-secondary-text-light)] dark:text-[var(--chat-secondary-text-dark)] rounded-lg hover:bg-[var(--chat-accent)] hover:text-white';
        speakBtn.setAttribute('aria-label', 'Play or pause message');
        speakBtn.innerHTML = message.isSpeaking
          ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"></path></svg>`
          : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-6.504-3.753v7.506l6.504-3.753zM5 3v18l14-9L5 3z"></path></svg>`;
        speakBtn.addEventListener('click', () => {
          window.speakMessage(message.id, message.text, currentLang);
          console.log(`Speech started for message ID: ${message.id}`);
        });
        bubbleDiv.appendChild(speakBtn);
      }
      const messageActions = document.createElement('div');
      messageActions.className = 'message-actions flex justify-end gap-2 mt-2';
      if (message.sender === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-[var(--chat-secondary-text-light)] dark:text-[var(--chat-secondary-text-dark)] p-[0.3rem] rounded-lg hover:bg-[var(--chat-accent)] hover:text-white';
        editBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
        editBtn.addEventListener('click', function() { 
          startEditing(message.id, message.text); 
          console.log(`Edit button clicked for message ID: ${message.id}`);
        });
        messageActions.appendChild(editBtn);
      }
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-[var(--chat-secondary-text-light)] dark:text-[var(--chat-secondary-text-dark)] p-[0.3rem] rounded-lg hover:bg-[var(--chat-accent)] hover:text-white';
      deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4"></path></svg>';
      deleteBtn.addEventListener('click', function() { deleteMessage(message.id); });
      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-[var(--chat-secondary-text-light)] dark:text-[var(--chat-secondary-text-dark)] p-[0.3rem] rounded-lg hover:bg-[var(--chat-accent)] hover:text-white';
      copyBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
      copyBtn.addEventListener('click', function() { copyMessage(message.text); });
      const pinBtn = document.createElement('button');
      pinBtn.className = 'action-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-[var(--chat-secondary-text-light)] dark:text-[var(--chat-secondary-text-dark)] p-[0.3rem] rounded-lg hover:bg-[var(--chat-accent)] hover:text-white';
      pinBtn.innerHTML = message.isPinned 
        ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v7m-7 7h7m-7-7h14"></path></svg>' 
        : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>';
      pinBtn.addEventListener('click', function() { togglePinMessage(message.id); });
      const reactionBtn = document.createElement('button');
      reactionBtn.className = 'action-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-[var(--chat-secondary-text-light)] dark:text-[var(--chat-secondary-text-dark)] p-[0.3rem] rounded-lg hover:bg-[var(--chat-accent)] hover:text-white';
      reactionBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      reactionBtn.addEventListener('click', function() { showReactionPicker(message.id, bubbleDiv); });
      messageActions.appendChild(deleteBtn);
      messageActions.appendChild(copyBtn);
      messageActions.appendChild(pinBtn);
      messageActions.appendChild(reactionBtn);
      bubbleDiv.appendChild(messageContent);
      bubbleDiv.appendChild(messageActions);
      messageDiv.appendChild(bubbleDiv);
      chatMessages.appendChild(messageDiv);
    });

    if (isLoading) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'flex justify-start mb-2';
      loadingDiv.innerHTML = '<div class="ai-message p-3 rounded-lg max-w-[80%] flex items-center"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
      chatMessages.appendChild(loadingDiv);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
    updateTimestamps();
    updateButtonStates();
    localStorage.setItem('lic-chat', JSON.stringify(window.messages));
    console.log(`Messages rendered: ${filteredMessages.length} messages`);

    if (editingMessageId) {
      const observer = new MutationObserver((mutations, obs) => {
        const editInput = document.querySelector(`[data-message-id="${editingMessageId}"] .edit-message-input`);
        if (editInput) {
          console.log(`Edit input found for message ID: ${editingMessageId}`);
          editInput.focus();
          editInput.addEventListener('input', (e) => {
            editedText = e.target.value;
            console.log(`Edit input updated for message ID: ${editingMessageId}, text: ${editedText}`);
          });
          editInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEditedMessage(editingMessageId);
          });
          const saveBtn = document.querySelector(`[data-message-id="${editingMessageId}"] .edit-message-button`);
          if (saveBtn) {
            saveBtn.addEventListener('click', () => {
              saveEditedMessage(editingMessageId);
              console.log(`Save button clicked for message ID: ${editingMessageId}`);
            });
          }
          const cancelBtn = document.querySelector(`[data-message-id="${editingMessageId}"] .cancel-btn`);
          if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
              cancelEdit();
              console.log(`Cancel button clicked for message ID: ${editingMessageId}`);
            });
          }
          obs.disconnect();
        }
      });
      observer.observe(chatMessages, { childList: true, subtree: true });
    }

    updatePinnedMessagesWindow();
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-[var(--chat-ai-light)] dark:bg-[var(--chat-ai-dark)] p-1 rounded">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-500 underline">$1</a>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/(\n<li>.*<\/li>)+/g, '<ul class="list-disc pl-5">$&</ul>')
      .replace(/\n/g, '<br>');
  }

  function updateTimestamps() {
    const timestamps = document.querySelectorAll('.message-timestamp');
    timestamps.forEach(function(timestamp) {
      const messageId = timestamp.closest('[data-message-id]').dataset.messageId;
      const message = window.messages.find(function(message) { return message.id === messageId; });
      if (message) timestamp.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
  }

  function updateButtonStates() {
    const clearBtn = document.querySelector('.clear-btn');
    if (clearBtn) clearBtn.disabled = window.messages.length === 1 && window.messages[0].id === 'welcome';
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) sendBtn.disabled = isLoading;
    const voiceBtn = document.querySelector('.voice-btn');
    if (voiceBtn) voiceBtn.disabled = isLoading || !recognition;
    document.querySelectorAll('.suggestion-btn').forEach(function(btn) { btn.disabled = isLoading; });
  }

  function updatePinnedMessagesWindow() {
    const pinnedWindow = document.getElementById('pinned-messages-window');
    if (!pinnedWindow) {
      console.error('Error: #pinned-messages-window not found');
      return;
    }
    pinnedWindow.innerHTML = '';
    const pinnedMessages = window.messages.filter(m => m.isPinned);
    if (pinnedMessages.length > 0) {
      const header = document.createElement('h3');
      header.textContent = currentLang === 'hi' ? 'पिन किए गए संदेश' : 'Pinned Messages';
      pinnedWindow.appendChild(header);
      pinnedMessages.forEach(message => {
        const pinnedDiv = document.createElement('div');
        pinnedDiv.className = 'pinned-message bg-[var(--chat-ai-light)] dark:bg-[var(--chat-ai-dark)] p-2 rounded-lg mb-2';
        pinnedDiv.innerHTML = `<p>${formatMarkdown(message.text)}</p>`;
        const unpinBtn = document.createElement('button');
        unpinBtn.className = 'unpin-btn bg-[var(--chat-error)] text-white p-1 rounded-lg';
        unpinBtn.textContent = currentLang === 'hi' ? 'अनपिन करें' : 'Unpin';
        unpinBtn.addEventListener('click', () => togglePinMessage(message.id));
        pinnedDiv.appendChild(unpinBtn);
        pinnedWindow.appendChild(pinnedDiv);
      });
    } else {
      const noPinned = document.createElement('p');
      noPinned.textContent = currentLang === 'hi' ? 'कोई पिन किया गया संदेश नहीं' : 'No pinned messages';
      pinnedWindow.appendChild(noPinned);
    }
    pinnedWindow.classList.toggle('active', isPinnedWindowOpen && pinnedMessages.length > 0);
    console.log(`Pinned window updated: isPinnedWindowOpen=${isPinnedWindowOpen}, pinnedMessages=${pinnedMessages.length}`);
  }

  async function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) {
      console.error('Error: #chat-input element not found');
      return;
    }
    const message = input.value.trim();
    if (!message || isLoading) return;

    const messageId = Date.now();
    window.messages.push({ 
      sender: 'user', 
      text: message, 
      id: messageId, 
      timestamp: new Date().toISOString(), 
      category: categorizeMessage(message).category, 
      reactions: [], 
      isPinned: false 
    });
    input.value = '';
    renderMessages();
    await processMessage(message, messageId);
    console.log(`Message sent: ${message}, ID: ${messageId}`);
  }

  function categorizeMessage(message) {
    const lowerMessage = message.toLowerCase();
    const imageContext = getImageContext();
    for (const [imageKey, { keywords }] of Object.entries(imageContext)) {
      if (isImageRelevant(lowerMessage, keywords)) {
        return { category: 'plans', imageKey };
      }
    }
    if (lowerMessage.includes('service') || lowerMessage.includes('सेवा') || lowerMessage.includes('customer') || lowerMessage.includes('कस्टमर')) {
      return { category: 'services' };
    } else if (lowerMessage.includes('plan') || lowerMessage.includes('policy') || lowerMessage.includes('insurance') || lowerMessage.includes('योजना') || lowerMessage.includes('पॉलिसी') || lowerMessage.includes('बीमा')) {
      return { category: 'plans' };
    } else if (lowerMessage.includes('premium') || lowerMessage.includes('payment') || lowerMessage.includes('प्रीमियम') || lowerMessage.includes('भुगतान')) {
      return { category: 'premiums' };
    } else if (lowerMessage.includes('claim') || lowerMessage.includes('क्लेम')) {
      return { category: 'claims' };
    } else if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('संपर्क') || lowerMessage.includes('सपोर्ट')) {
      return { category: 'contact' };
    } else {
      return { category: 'general' };
    }
  }

  function filterByCategory(category) {
    selectedCategory = category;
    searchQuery = '';
    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.value = '';
    renderMessages();
    handleInputChange('');
    console.log(`Category filter applied: ${category}`);
  }

  function handlePromptClick(prompt) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = prompt;
      sendMessage();
    }
  }

  function handleQuickReply(prompt) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = prompt;
      sendMessage();
    }
  }

  function handleInputChange(value) {
    const suggestionsContainer = document.getElementById('chat-suggestions');
    if (suggestionsContainer) {
      filteredSuggestions = value.trim() ? suggestedPrompts[currentLang].filter(function(prompt) { return prompt.toLowerCase().includes(value.toLowerCase()); }) : suggestedPrompts[currentLang];
      suggestionsContainer.innerHTML = filteredSuggestions.map(function(prompt) {
        return `<button class="suggestion-btn bg-[var(--chat-border-light)] dark:bg-[var(--chat-border-dark)] text-white dark:text-[var(--chat-text-dark)] p-2 rounded-lg text-sm">${prompt}</button>`;
      }).join('');
      suggestionsContainer.querySelectorAll('.suggestion-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => handlePromptClick(filteredSuggestions[index]));
      });
    }
    updateButtonStates();
  }

  function showReactionPicker(messageId, messageDiv) {
    const existingPicker = messageDiv.querySelector('.reaction-picker');
    if (existingPicker) {
      existingPicker.remove();
      console.log(`Reaction picker closed for message ID: ${messageId}`);
      return;
    }
    const picker = document.createElement('div');
    picker.className = 'reaction-picker absolute bg-[var(--chat-ai-light)] dark:bg-[var(--chat-ai-dark)] border border-[var(--chat-border-light)] dark:border-[var(--chat-border-dark)] rounded-lg p-2 flex gap-2 z-10 max-w-full font-family-emoji';
    emojiOptions.forEach(emoji => {
      const btn = document.createElement('button');
      btn.textContent = emoji;
      btn.className = 'reaction-picker-item text-[1rem] p-1 hover:bg-[var(--chat-accent)] rounded';
      btn.addEventListener('click', function() { 
        addReaction(messageId, emoji); 
        picker.remove(); 
        console.log(`Reaction ${emoji} selected for message ID: ${messageId}`);
      });
      picker.appendChild(btn);
    });
    messageDiv.appendChild(picker);
    const message = window.messages.find(m => m.id === messageId);
    picker.style.top = '100%';
    picker.style.left = message.sender === 'user' ? 'auto' : '0';
    picker.style.right = message.sender === 'user' ? '0' : 'auto';
    console.log(`Reaction picker opened for message ID: ${messageId}`);
  }

  function addReaction(messageId, emoji) {
    const message = window.messages.find(m => m.id === messageId);
    if (message) {
      message.reactions = message.reactions || [];
      if (!message.reactions.includes(emoji)) {
        message.reactions.push(emoji);
        interactionAnalytics.reactionsUsed++;
        renderMessages();
        localStorage.setItem('lic-chat', JSON.stringify(window.messages));
        console.log(`Reaction ${emoji} added to message ID: ${messageId}`);
      }
    }
  }

  function togglePinMessage(messageId) {
    const message = window.messages.find(m => m.id === messageId);
    if (message) {
      message.isPinned = !message.isPinned;
      renderMessages();
      updatePinnedMessagesWindow();
      localStorage.setItem('lic-chat', JSON.stringify(window.messages));
      console.log(`Toggled pin for message ID: ${messageId}, isPinned: ${message.isPinned}`);
    }
  }

  function startEditing(id, text) {
    editingMessageId = id;
    editedText = text;
    renderMessages();
    console.log(`Starting edit for message ID: ${id} with text: ${text}`);
  }

  function saveEditedMessage(id) {
    if (editedText.trim()) {
      const newMessageId = Date.now();
      window.messages = window.messages.filter(m => m.id !== id);
      window.messages.push({
        sender: 'user',
        text: editedText,
        id: newMessageId,
        timestamp: new Date().toISOString(),
        category: categorizeMessage(editedText).category,
        reactions: [],
        isPinned: false
      });
      editingMessageId = null;
      editedText = '';
      renderMessages();
      processMessage(editedText, newMessageId);
      console.log(`Message saved for ID: ${newMessageId}, text: ${editedText}`);
    } else {
      editingMessageId = null;
      editedText = '';
      renderMessages();
      console.log('Edit cancelled due to empty text');
    }
  }

  function cancelEdit() {
    editingMessageId = null;
    editedText = '';
    renderMessages();
    console.log('Edit cancelled');
  }

  function deleteMessage(id) {
    window.messages = window.messages.filter(function(message) { return message.id !== id; });
    if (window.messages.length === 0) {
      window.messages.push({
        sender: 'ai',
        text: currentLang === 'hi' 
          ? 'हाय! मैं LIC इंडिया चैटबॉट हूँ। बीमा योजनाओं, प्रीमियम, दावों, या सेवाओं के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "प्रीमियम कैसे चुकाएं?"'
          : 'Hi! I\'m the LIC India chatbot. Ask about insurance plans, premiums, claims, or services, like "What is LIC Jeevan Anand?" or "How to pay premiums?"',
        id: 'welcome',
        timestamp: new Date().toISOString(),
        category: 'welcome',
        reactions: [],
        isPinned: false
      });
    }
    renderMessages();
    localStorage.setItem('lic-chat', JSON.stringify(window.messages));
    console.log(`Message deleted: ID ${id}`);
  }

  function copyMessage(text) {
    navigator.clipboard.writeText(text).then(function() {
      alert(currentLang === 'hi' ? 'संदेश कॉपी किया गया!' : 'Message copied!');
    }).catch(function() {
      alert(currentLang === 'hi' ? 'कॉपी करने में असफल!' : 'Failed to copy!');
    });
  }

  function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.getElementById('chatbot-container').classList.toggle('dark', isDarkMode);
    const themeBtn = document.querySelector('.theme-btn');
    if (themeBtn) {
      themeBtn.innerHTML = isDarkMode
        ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>'
        : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
      console.log(`Theme toggled: isDarkMode=${isDarkMode}`);
    }
    renderMessages();
  }

  function toggleControls() {
    const controls = document.getElementById('chat-controls');
    if (controls) {
      controls.classList.toggle('hidden');
      const toggleBtn = document.querySelector('.controls-toggle');
      if (toggleBtn) {
        toggleBtn.innerHTML = controls.classList.contains('hidden')
          ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>'
          : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        console.log(`Controls toggled: hidden=${controls.classList.contains('hidden')}`);
      }
    } else {
      console.error('Error: #chat-controls not found');
    }
  }

  function toggleSearchBar() {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
      searchBar.classList.toggle('hidden');
      if (!searchBar.classList.contains('hidden')) {
        searchBar.focus();
      }
      console.log(`Search bar toggled: hidden=${searchBar.classList.contains('hidden')}`);
    } else {
      console.error('Error: #search-bar not found');
    }
  }

  function togglePinnedWindow() {
    isPinnedWindowOpen = !isPinnedWindowOpen;
    const pinnedToggle = document.querySelector('.pinned-toggle');
    if (pinnedToggle) {
      pinnedToggle.classList.toggle('active', isPinnedWindowOpen);
      console.log(`Pinned toggle clicked: isPinnedWindowOpen=${isPinnedWindowOpen}`);
    }
    updatePinnedMessagesWindow();
  }

  function searchMessages(query) {
    searchQuery = query;
    selectedCategory = '';
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = '';
    renderMessages();
    console.log(`Search query applied: ${query}`);
  }

  function toggleHistory() {
    isHistoryCollapsed = !isHistoryCollapsed;
    const historyBtn = document.querySelector('.history-btn');
    if (historyBtn) {
      historyBtn.textContent = isHistoryCollapsed ? (currentLang === 'hi' ? 'इतिहास दिखाएं' : 'Show History') : (currentLang === 'hi' ? 'इतिहास छिपाएं' : 'Hide History');
      console.log(`History toggled: isHistoryCollapsed=${isHistoryCollapsed}`);
    }
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.style.display = isHistoryCollapsed ? 'none' : 'block';
    }
    if (!isHistoryCollapsed) renderMessages();
  }

  function toggleAutoReply() {
    isAutoReplyEnabled = !isAutoReplyEnabled;
    const autoReplyBtn = document.querySelector('.auto-reply-btn');
    if (autoReplyBtn) {
      autoReplyBtn.textContent = isAutoReplyEnabled ? (currentLang === 'hi' ? 'ऑटो-रिप्लाई: चालू' : 'Auto-Reply: On') : (currentLang === 'hi' ? 'ऑटो-रिप्लाई: बंद' : 'Auto-Reply: Off');
      console.log(`Auto-reply toggled: isAutoReplyEnabled=${isAutoReplyEnabled}`);
    }
  }

  function toggleAutoSpeak() {
    isAutoSpeakEnabled = !isAutoSpeakEnabled;
    const autoSpeakBtn = document.querySelector('.auto-speak-btn');
    if (autoSpeakBtn) {
      autoSpeakBtn.textContent = isAutoSpeakEnabled ? (currentLang === 'hi' ? 'ऑटो-स्पीक: चालू' : 'Auto-Speak: On') : (currentLang === 'hi' ? 'ऑटो-स्पीक: बंद' : 'Auto-Speak: Off');
      console.log(`Auto-speak toggled: isAutoSpeakEnabled=${isAutoSpeakEnabled}`);
    }
  }

  function toggleTimestamps() {
    showTimestamps = !showTimestamps;
    const timestampBtn = document.querySelector('.timestamp-btn');
    if (timestampBtn) {
      timestampBtn.textContent = showTimestamps ? (currentLang === 'hi' ? 'टाइमस्टैम्प छिपाएं' : 'Hide Timestamps') : (currentLang === 'hi' ? 'टाइमस्टैम्प दिखाएं' : 'Show Timestamps');
      console.log(`Timestamps toggled: showTimestamps=${showTimestamps}`);
    }
    renderMessages();
  }

  function adjustFontSize(change) {
    fontSize = Math.max(10, Math.min(18, fontSize + change));
    localStorage.setItem('chat-font-size', fontSize);
    const elements = document.querySelectorAll('.chatbot-container .message-content, .chatbot-container .chat-input, .chatbot-container .search-bar, .chatbot-container .suggestion-btn, .chatbot-container .quick-reply-btn, .chatbot-container .message-actions');
    elements.forEach(function(element) {
      element.style.setProperty('font-size', `${fontSize}px`, 'important');
    });
    console.log(`Font size adjusted to ${fontSize}px, change=${change}, affected ${elements.length} elements`);
  }

  function confirmClearChat() {
    const confirmPopup = document.createElement('div');
    confirmPopup.className = 'confirm-popup bg-[var(--chat-bg-light)] dark:bg-[var(--chat-bg-dark)] p-4 rounded-lg shadow-lg';
    confirmPopup.innerHTML = `
      <p class="text-[var(--chat-text-light)] dark:text-[var(--chat-text-dark)] mb-4">${currentLang === 'hi' ? 'क्या आप वाकई चैट इतिहास मिटाना चाहते हैं?' : 'Are you sure you want to clear the chat history?'}</p>
      <button class="confirm-btn bg-[var(--chat-accent)] text-white p-2 rounded-lg mr-2">${currentLang === 'hi' ? 'हाँ' : 'Yes'}</button>
      <button class="cancel-btn bg-[var(--chat-error)] text-white p-2 rounded-lg">${currentLang === 'hi' ? 'नहीं' : 'No'}</button>
    `;
    document.getElementById('chatbot-container').appendChild(confirmPopup);
    const confirmBtn = confirmPopup.querySelector('.confirm-btn');
    const cancelBtn = confirmPopup.querySelector('.cancel-btn');
    if (confirmBtn) confirmBtn.addEventListener('click', clearChat);
    if (cancelBtn) cancelBtn.addEventListener('click', () => confirmPopup.remove());
  }

  function clearChat() {
    window.messages = [{
      sender: 'ai',
      text: currentLang === 'hi' 
        ? 'हाय! मैं LIC इंडिया चैटबॉट हूँ। बीमा योजनाओं, प्रीमियम, दावों, या सेवाओं के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "प्रीमियम कैसे चुकाएं?"'
        : 'Hi! I\'m the LIC India chatbot. Ask about insurance plans, premiums, claims, or services, like "What is LIC Jeevan Anand?" or "How to pay premiums?"',
      id: 'welcome',
      timestamp: new Date().toISOString(),
      category: 'welcome',
      reactions: [],
      isPinned: false
    }];
    localStorage.setItem('lic-chat', JSON.stringify(window.messages));
    renderMessages();
    document.querySelectorAll('.confirm-popup').forEach(p => p.remove());
    console.log('Chat history cleared');
  }

  function toggleRecording() {
    if (!recognition) {
      alert(currentLang === 'hi' ? 'क्षमा करें, आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।' : 'Sorry, voice input is not supported in your browser.');
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
      recognition.start();
      isRecording = true;
      const voiceBtn = document.querySelector('.voice-btn');
      if (voiceBtn) voiceBtn.classList.add('recording');
      console.log(`Voice recording started, lang: ${recognition.lang}`);
    }
  }

  if (recognition) {
    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.value = transcript;
        isRecording = false;
        const voiceBtn = document.querySelector('.voice-btn');
        if (voiceBtn) voiceBtn.classList.remove('recording');
        const messageId = Date.now();
        window.messages.push({ 
          sender: 'user', 
          text: transcript, 
          id: messageId, 
          timestamp: new Date().toISOString(), 
          category: categorizeMessage(transcript).category, 
          reactions: [], 
          isPinned: false 
        });
        renderMessages();
        processMessage(transcript, messageId);
        console.log(`Voice input processed: ${transcript}`);
      }
    };
    recognition.onend = function() {
      isRecording = false;
      const voiceBtn = document.querySelector('.voice-btn');
      if (voiceBtn) voiceBtn.classList.remove('recording');
      console.log('Voice recording stopped');
    };
    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      isRecording = false;
      const voiceBtn = document.querySelector('.voice-btn');
      if (voiceBtn) voiceBtn.classList.remove('recording');
      alert(currentLang === 'hi' ? 'वॉइस रिकग्निशन में त्रुटि: ' + event.error : 'Voice recognition error: ' + event.error);
    };
  }

  document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
      console.error('Critical: #chat-messages element not found on DOM load');
      return;
    }
    chatMessages.style.display = 'block';
    renderMessages();
    handleInputChange('');

    const controlsToggle = document.querySelector('.controls-toggle');
    if (controlsToggle) {
      controlsToggle.addEventListener('click', () => {
        toggleControls();
        console.log('Controls toggle clicked');
      });
    } else {
      console.error('Error: .controls-toggle not found');
    }

    const searchToggle = document.querySelector('.search-toggle');
    if (searchToggle) {
      searchToggle.addEventListener('click', () => {
        toggleSearchBar();
        console.log('Search toggle clicked');
      });
    } else {
      console.error('Error: .search-toggle not found');
    }

    const pinnedToggle = document.querySelector('.pinned-toggle');
    if (pinnedToggle) {
      pinnedToggle.addEventListener('click', () => {
        togglePinnedWindow();
        console.log('Pinned toggle clicked');
      });
    } else {
      console.error('Error: .pinned-toggle not found');
    }

    const themeBtn = document.querySelector('.theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        toggleTheme();
        console.log('Theme toggle clicked');
      });
    } else {
      console.error('Error: .theme-btn not found');
    }

    const langToggle = document.querySelector('.lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', function() {
        currentLang = currentLang === 'en' ? 'hi' : 'en';
        localStorage.setItem('chat-lang', currentLang);
        document.getElementById('chatbot-container').setAttribute('lang', currentLang);
        langToggle.setAttribute('data-lang', currentLang === 'en' ? 'hi' : 'en');
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
          chatInput.placeholder = currentLang === 'hi' ? chatInput.dataset.placeholderHi : 'Ask about LIC plans or services...';
        }
        const searchBar = document.getElementById('search-bar');
        if (searchBar) {
          searchBar.placeholder = currentLang === 'hi' ? searchBar.dataset.placeholderHi : 'Search Messages';
        }
        const welcomeMsg = window.messages.find(m => m.id === 'welcome');
        if (welcomeMsg) {
          welcomeMsg.text = currentLang === 'hi' 
            ? 'हाय! मैं LIC इंडिया चैटबॉट हूँ। बीमा योजनाओं, प्रीमियम, दावों, या सेवाओं के बारे में पूछें, जैसे "LIC जीवन आनंद योजना क्या है?" या "प्रीमियम कैसे चुकाएं?"'
            : 'Hi! I\'m the LIC India chatbot. Ask about insurance plans, premiums, claims, or services, like "What is LIC Jeevan Anand?" or "How to pay premiums?"';
          localStorage.setItem('lic-chat', JSON.stringify(window.messages));
        }
        handleInputChange(document.getElementById('chat-input').value);
        filteredSuggestions = suggestedPrompts[currentLang];
        renderMessages();
        if (typeof window.stopAllSpeech === 'function') window.stopAllSpeech();
        console.log(`Language toggled to: ${currentLang}`);
      });
    }

    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.addEventListener('input', (e) => searchMessages(e.target.value));

    const historyBtn = document.querySelector('.history-btn');
    if (historyBtn) historyBtn.addEventListener('click', toggleHistory);

    const autoReplyBtn = document.querySelector('.auto-reply-btn');
    if (autoReplyBtn) autoReplyBtn.addEventListener('click', toggleAutoReply);

    const autoSpeakBtn = document.querySelector('.auto-speak-btn');
    if (autoSpeakBtn) autoSpeakBtn.addEventListener('click', toggleAutoSpeak);

    const timestampBtn = document.querySelector('.timestamp-btn');
    if (timestampBtn) timestampBtn.addEventListener('click', toggleTimestamps);

    const volumeControl = document.getElementById('volume-control');
    if (volumeControl) volumeControl.addEventListener('input', function(e) {
      if (typeof window.setSpeechVolume === 'function') {
        window.setSpeechVolume(e.target.value);
        console.log(`Volume set to: ${e.target.value}`);
      }
    });

    document.querySelectorAll('.font-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const change = btn.textContent.includes('+') ? 2 : -2;
        adjustFontSize(change);
      });
    });

    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.addEventListener('change', (e) => filterByCategory(e.target.value));

    const clearBtn = document.querySelector('.clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', confirmClearChat);

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('input', (e) => handleInputChange(e.target.value));
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }

    const voiceBtn = document.querySelector('.voice-btn');
    if (voiceBtn) voiceBtn.addEventListener('click', toggleRecording);

    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    adjustFontSize(0);
    console.log('DOM loaded, chatbot initialized');
  });
})();
