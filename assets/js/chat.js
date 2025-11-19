// Live Chat System với Firebase Realtime Database
(function() {
    if (window._chatSystem) {
        console.warn("Chat system đã được khởi tạo!");
        return;
    }
    window._chatSystem = true;

    let chatRef = null;
    let messagesListener = null;
    let lastMessageTime = 0;
    let unreadCount = 0;
    let isChatOpen = false;

    // Khởi tạo chat
    function initChat() {
        if (!firebase.database) {
            console.error("Firebase Database chưa được load!");
            return;
        }

        chatRef = firebase.database().ref('globalChat');
        
        // Lắng nghe tin nhắn mới
        messagesListener = chatRef.limitToLast(50).on('child_added', (snapshot) => {
            const message = snapshot.val();
            if (message) {
                displayMessage(message);
                
                // Tăng badge nếu chat đang đóng và không phải tin nhắn của mình
                if (!isChatOpen && message.userId !== currentUser?.uid) {
                    unreadCount++;
                    updateChatBadge();
                }
            }
        });

        setupChatUI();
    }

    // Setup giao diện chat
    function setupChatUI() {
        const chatBtn = document.getElementById('chat-btn');
        const chatModal = document.getElementById('chatModal');
        const closeChat = document.getElementById('close-chat');
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');

        if (!chatBtn || !chatModal) return;

        // Mở chat
        chatBtn.onclick = () => {
            if (!currentUser || !player) {
                alert('Vui lòng đăng nhập để sử dụng chat!');
                return;
            }

            chatModal.style.display = 'flex';
            isChatOpen = true;
            unreadCount = 0;
            updateChatBadge();
            
            // Scroll to bottom
            setTimeout(() => {
                const messagesDiv = document.getElementById('chat-messages');
                if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 100);
        };

        // Đóng chat
        if (closeChat) {
            closeChat.onclick = () => {
                chatModal.style.display = 'none';
                isChatOpen = false;
            };
        }

        // Click outside to close
        chatModal.onclick = (e) => {
            if (e.target === chatModal) {
                chatModal.style.display = 'none';
                isChatOpen = false;
            }
        };

        // Gửi tin nhắn
        const sendMessage = () => {
            if (!chatInput || !currentUser || !player) return;

            const message = chatInput.value.trim();
            if (!message) return;

            // Rate limiting: 1 tin nhắn mỗi 2 giây
            const now = Date.now();
            if (now - lastMessageTime < 2000) {
                alert('Vui lòng đợi 2 giây trước khi gửi tin nhắn tiếp theo!');
                return;
            }

            // Kiểm tra độ dài
            if (message.length > 200) {
                alert('Tin nhắn quá dài! Tối đa 200 ký tự.');
                return;
            }

            // Filter bad words (optional - có thể thêm sau)
            const filteredMessage = filterBadWords(message);

            const messageData = {
                userId: currentUser.uid,
                userName: player.name,
                userLevel: player.lvl || 1,
                message: filteredMessage,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            chatRef.push(messageData).then(() => {
                chatInput.value = '';
                lastMessageTime = now;
            }).catch((error) => {
                console.error('Lỗi gửi tin nhắn:', error);
                alert('Không thể gửi tin nhắn!');
            });
        };

        if (chatSend) {
            chatSend.onclick = sendMessage;
        }

        if (chatInput) {
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            };
        }
    }

    // Hiển thị tin nhắn
    function displayMessage(message) {
        const messagesDiv = document.getElementById('chat-messages');
        if (!messagesDiv) return;

        const isMyMessage = currentUser && message.userId === currentUser.uid;
        
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: ${isMyMessage ? 'flex-end' : 'flex-start'};
            margin: 5px 0;
        `;

        // Tạo icon level dựa trên level
        let levelIcon = '⚔️';
        if (message.userLevel >= 50) levelIcon = '👑';
        else if (message.userLevel >= 30) levelIcon = '🔥';
        else if (message.userLevel >= 20) levelIcon = '⭐';
        else if (message.userLevel >= 10) levelIcon = '🗡️';

        const header = document.createElement('div');
        header.style.cssText = `
            font-size: 0.8em;
            color: #999;
            margin-bottom: 3px;
            ${isMyMessage ? 'text-align: right;' : 'text-align: left;'}
        `;
        header.innerHTML = isMyMessage 
            ? `<span style="color: #0084ff; font-weight: bold;">Bạn</span> ${levelIcon} Lv.${message.userLevel}`
            : `${levelIcon} <span style="color: #4a9eff; font-weight: bold;">Lv.${message.userLevel}</span> ${escapeHtml(message.userName)}`;

        const bubble = document.createElement('div');
        bubble.style.cssText = `
            background: ${isMyMessage ? 'linear-gradient(135deg, #0084ff, #00a8ff)' : 'rgba(60,60,60,0.9)'};
            color: #fff;
            padding: 10px 14px;
            border-radius: 18px;
            max-width: 70%;
            word-wrap: break-word;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            ${isMyMessage ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
        `;
        bubble.textContent = message.message;

        messageEl.appendChild(header);
        messageEl.appendChild(bubble);
        messagesDiv.appendChild(messageEl);

        // Auto scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Cập nhật badge số tin nhắn chưa đọc
    function updateChatBadge() {
        const badge = document.getElementById('chat-badge');
        if (!badge) return;

        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Filter bad words (có thể mở rộng)
    function filterBadWords(text) {
        // Danh sách từ cấm (có thể thêm nhiều hơn)
        const badWords = ['fuck', 'shit', 'ass', 'bitch', 'dm', 'đm', 'vl', 'vcl', 'cc', 'đĩ', 'lồn', 'cặc'];
        let filtered = text;
        
        badWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        });
        
        return filtered;
    }

    // Escape HTML để tránh XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Dọn dẹp khi user logout
    function cleanupChat() {
        if (messagesListener && chatRef) {
            chatRef.off('child_added', messagesListener);
        }
        unreadCount = 0;
        updateChatBadge();
    }

    // Khởi tạo khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initChat, 500);
        });
    } else {
        setTimeout(initChat, 500);
    }

    // Export cleanup function
    window.cleanupChat = cleanupChat;

})();
