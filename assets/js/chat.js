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
    let chatCooldownTimer = null;
    let chatCooldownRemaining = 0;
    let lastPurgeTime = Date.now();
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
                // Bỏ qua tin nhắn cũ trước mốc purge để tránh hiển thị lịch sử
                if (typeof message.timestamp === 'number' && message.timestamp < lastPurgeTime) {
                    return;
                }
                displayMessage(message);

                // Play incoming message sfx for other users
                try {
                    if (message.userId !== currentUser?.uid) {
                        if (typeof sfxItem !== 'undefined' && sfxItem && typeof sfxItem.play === 'function') sfxItem.play();
                    }
                } catch (e) {}

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
        const chatBtn = document.getElementById('header-chat-btn');
        const chatModal = document.getElementById('chatModal');
        const closeChat = document.getElementById('close-chat');
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');

        if (!chatBtn || !chatModal) return;

        // Mở chat
        chatBtn.onclick = () => {
            try { if (typeof sfxOpen !== 'undefined' && sfxOpen && typeof sfxOpen.play === 'function') sfxOpen.play(); } catch (e) {}
            if (!currentUser || !player) {
                alert('Vui lòng đăng nhập để sử dụng chat!');
                return;
            }

            chatModal.style.display = 'flex';
            isChatOpen = true;
            unreadCount = 0;
            updateChatBadge();
            // Move notification down
            if (typeof moveNotificationForLiveChat === 'function') moveNotificationForLiveChat(true);
            // Scroll to bottom
            setTimeout(() => {
                const messagesDiv = document.getElementById('chat-messages');
                if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 100);
        };

        // Đóng chat
        if (closeChat) {
            closeChat.onclick = () => {
                try { if (typeof sfxDecline !== 'undefined' && sfxDecline && typeof sfxDecline.play === 'function') sfxDecline.play(); } catch (e) {}
                chatModal.style.display = 'none';
                isChatOpen = false;
                // Reset notification position
                if (typeof moveNotificationForLiveChat === 'function') moveNotificationForLiveChat(false);
            };
        }

        // Click outside to close
        chatModal.onclick = (e) => {
            if (e.target === chatModal) {
                try { if (typeof sfxDecline !== 'undefined' && sfxDecline && typeof sfxDecline.play === 'function') sfxDecline.play(); } catch (e) {}
                chatModal.style.display = 'none';
                isChatOpen = false;
                // Reset notification position
                if (typeof moveNotificationForLiveChat === 'function') moveNotificationForLiveChat(false);
            }
        };

        // Cập nhật UI countdown cho nút gửi
        const updateSendButtonCountdown = () => {
            const chatSendBtn = document.getElementById('chat-send');
            if (!chatSendBtn) return;
            if (chatCooldownRemaining > 0) {
                chatSendBtn.disabled = true;
                chatSendBtn.innerText = `${chatCooldownRemaining}s`;
            } else {
                chatSendBtn.disabled = false;
                chatSendBtn.innerHTML = '<i class="fas fa-paper-plane" style="font-size:1.25rem;"></i>';
            }
        };

        const startChatCooldown = (seconds) => {
            chatCooldownRemaining = seconds;
            updateSendButtonCountdown();
            if (chatCooldownTimer) clearInterval(chatCooldownTimer);
            chatCooldownTimer = setInterval(() => {
                chatCooldownRemaining -= 1;
                if (chatCooldownRemaining <= 0) {
                    clearInterval(chatCooldownTimer);
                    chatCooldownTimer = null;
                    chatCooldownRemaining = 0;
                }
                updateSendButtonCountdown();
            }, 1000);
        };

        // Gửi tin nhắn
        const sendMessage = () => {
            if (!chatInput || !currentUser || !player) return;

            const message = chatInput.value.trim();
            if (!message) return;

            // Rate limiting: 1 tin nhắn mỗi 5 giây với đếm ngược
            const now = Date.now();
            if (now - lastMessageTime < 5000 || chatCooldownRemaining > 0) {
                // Nếu đang cooldown, chỉ cập nhật UI, không hiện alert
                if (chatCooldownRemaining <= 0) {
                    const remaining = Math.ceil((5000 - (now - lastMessageTime)) / 1000);
                    startChatCooldown(Math.max(remaining, 1));
                }
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
                try { if (typeof sfxConfirm !== 'undefined' && sfxConfirm && typeof sfxConfirm.play === 'function') sfxConfirm.play(); } catch (e) {}
                chatInput.value = '';
                lastMessageTime = now;
                // Bắt đầu cooldown 5s sau khi gửi
                startChatCooldown(5);
                // Cập nhật lastChatTime để phù hợp security rules
                try {
                    if (currentUser?.uid) {
                        const uid = currentUser.uid;
                        const lastUpdatedRef = firebase.database().ref(`users/${uid}/lastUpdated`);
                        lastUpdatedRef.once('value').then(snap => {
                            if (snap.exists()) {
                                firebase.database().ref(`users/${uid}/lastChatTime`).set(firebase.database.ServerValue.TIMESTAMP);
                            } else {
                                // Nếu user node chưa tồn tại, bỏ qua để tránh vi phạm rules
                            }
                        }).catch(() => {});
                    }
                } catch (e) {}
            }).catch((error) => {
                try { if (typeof sfxDeny !== 'undefined' && sfxDeny && typeof sfxDeny.play === 'function') sfxDeny.play(); } catch (e) {}
                console.error('Lỗi gửi tin nhắn:', error);
                alert('Không thể gửi tin nhắn!');
            });
        };

        if (chatSend) {
            // Khởi tạo nút gửi ở trạng thái sẵn sàng
            chatSend.disabled = false;
            chatSend.onclick = sendMessage;
        }

        if (chatInput) {
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    // Chỉ gửi khi không đang cooldown
                    if (chatCooldownRemaining === 0) sendMessage();
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

        // Tạo icon level và màu dựa trên level
        let levelIcon = '⚔️';
        let levelColor = '#888';
        let levelIconGlow = '';
        let bubbleGlow = '';
        
        if (message.userLevel >= 100) {
            levelIcon = '🌟';
            levelColor = '#ff00ff'; // Tím hồng huyền thoại
            levelIconGlow = 'text-shadow: 0 0 8px rgba(255, 0, 255, 0.8), 0 0 12px rgba(255, 0, 255, 0.5);';
            bubbleGlow = 'border: 1px solid rgba(255, 0, 255, 0.6); box-shadow: 0 0 8px rgba(255, 0, 255, 0.4);';
        } else if (message.userLevel >= 80) {
            levelIcon = '🔱';
            levelColor = '#ff1493'; // Hồng đậm thần thoại
            levelIconGlow = 'text-shadow: 0 0 8px rgba(255, 20, 147, 0.8), 0 0 12px rgba(255, 20, 147, 0.5);';
            bubbleGlow = 'border: 1px solid rgba(255, 20, 147, 0.6); box-shadow: 0 0 8px rgba(255, 20, 147, 0.4);';
        } else if (message.userLevel >= 60) {
            levelIcon = '⚡';
            levelColor = '#ffa500'; // Cam vàng sấm sét
            levelIconGlow = 'text-shadow: 0 0 8px rgba(255, 165, 0, 0.8), 0 0 12px rgba(255, 165, 0, 0.5);';
            bubbleGlow = 'border: 1px solid rgba(255, 165, 0, 0.6); box-shadow: 0 0 8px rgba(255, 165, 0, 0.4);';
        } else if (message.userLevel >= 50) {
            levelIcon = '👑';
            levelColor = '#ffd700'; // Vàng gold
            levelIconGlow = 'text-shadow: 0 0 10px rgba(255, 215, 0, 0.9), 0 0 15px rgba(255, 215, 0, 0.6);';
            bubbleGlow = 'border: 1px solid rgba(255, 215, 0, 0.7); box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);';
        } else if (message.userLevel >= 40) {
            levelIcon = '💎';
            levelColor = '#00ffff'; // Cyan kim cương
        } else if (message.userLevel >= 30) {
            levelIcon = '🔥';
            levelColor = '#ff6b35'; // Cam đỏ
        } else if (message.userLevel >= 20) {
            levelIcon = '⭐';
            levelColor = '#ffeb3b'; // Vàng
        } else if (message.userLevel >= 10) {
            levelIcon = '🗡️';
            levelColor = '#e0e0e0'; // Bạc sáng
        }

        const header = document.createElement('div');
        header.style.cssText = `
            font-size: 0.75em;
            margin-bottom: 3px;
            ${isMyMessage ? 'text-align: right;' : 'text-align: left;'}
        `;
        header.innerHTML = isMyMessage 
            ? `<span style=\"color: #66b3ff; font-weight: bold; text-shadow: 0 0 5px rgba(102, 179, 255, 0.5);\">Bạn</span> <span style=\"margin-left: 0; margin-right: 2px; ${levelIconGlow}\">${levelIcon}</span><span style=\"font-size: 0.9em; color: ${levelColor}; font-weight: bold; text-shadow: 0 0 5px ${levelColor};\">Lv.${message.userLevel}</span>`
            : `<span style=\"margin-left: 0; margin-right: 2px; ${levelIconGlow}\">${levelIcon}</span><span style=\"font-size: 0.9em; color: ${levelColor}; font-weight: bold; text-shadow: 0 0 5px ${levelColor};\">Lv.${message.userLevel}</span> <span style=\"color: #e0e0e0; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.8);\">${escapeHtml(message.userName)}</span>`;

        const bubble = document.createElement('div');
        bubble.style.cssText = `
            background: ${isMyMessage ? 'linear-gradient(135deg, #0084ff, #00a8ff)' : 'rgba(60,60,60,0.9)'};
            color: #fff;
            font-size: 0.95rem;
            padding: 8px 14px;
            border-radius: 16px;
            max-width: 70%;
            word-wrap: break-word;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            margin-left: ${isMyMessage ? '0' : '8px'};
            margin-right: ${isMyMessage ? '8px' : '0'};
            ${isMyMessage ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
            ${bubbleGlow}
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
        const badge = document.getElementById('header-chat-badge');
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
            // Tự động xóa lịch sử chat hiển thị mỗi 6 giờ (client-side)
            setInterval(() => {
                lastPurgeTime = Date.now();
                const messagesDiv = document.getElementById('chat-messages');
                if (messagesDiv) {
                    messagesDiv.innerHTML = '<p style="text-align:center; color:#999;">Lịch sử chat đã được làm sạch.</p>';
                }
                unreadCount = 0;
                updateChatBadge();
            }, 21600000);
        });
    } else {
        setTimeout(initChat, 500);
        setInterval(() => {
            lastPurgeTime = Date.now();
            const messagesDiv = document.getElementById('chat-messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = '<p style="text-align:center; color:#999;">Lịch sử chat đã được làm sạch.</p>';
            }
            unreadCount = 0;
            updateChatBadge();
        }, 21600000);
    }

    // Export cleanup function
    window.cleanupChat = cleanupChat;

})();
