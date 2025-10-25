class ChatInClassFirebase {
    constructor() {
        this.currentUser = {
            username: '',
            name: '',
            role: '', // 'teacher' or 'student'
            id: this.generateUserId(),
            isAuthenticated: false
        };
        this.currentSubject = 'general';
        this.onlineUsers = new Map();
        this.database = null;
        this.isConnected = false;
        
        // Initialize subjects
        this.subjects = ['general', 'math', 'english', 'science', 'physics', 'chemistry', 'biology'];
        
        // Wait for Firebase to be loaded
        this.waitForFirebase();
    }

    waitForFirebase() {
        if (window.firebaseDatabase) {
            this.database = window.firebaseDatabase;
            this.init();
        } else {
            setTimeout(() => this.waitForFirebase(), 100);
        }
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.updateOnlineCount();
        this.setupFirebaseListeners();
        this.updateConnectionStatus(true);
    }

    setupFirebaseListeners() {
        try {
            // Listen for new messages in all subjects
            this.subjects.forEach(subject => {
                const messagesRef = window.firebaseRef(this.database, `messages/${subject}`);
                window.firebaseOnValue(messagesRef, (snapshot) => {
                    const messages = snapshot.val();
                    if (messages && this.currentSubject === subject) {
                        this.displayMessagesFromFirebase(messages);
                    }
                    this.updateMessageCountFromFirebase(subject, messages);
                });
            });

            // Listen for online users
            const usersRef = window.firebaseRef(this.database, 'users');
            window.firebaseOnValue(usersRef, (snapshot) => {
                const users = snapshot.val() || {};
                this.updateOnlineUsersFromFirebase(users);
            });

            // Listen for typing indicators
            const typingRef = window.firebaseRef(this.database, 'typing');
            window.firebaseOnValue(typingRef, (snapshot) => {
                const typingData = snapshot.val() || {};
                this.updateTypingIndicator(typingData);
            });

            console.log('Firebase listeners set up successfully');
        } catch (error) {
            console.error('Error setting up Firebase listeners:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        const status = document.getElementById('connection-status');
        
        if (connected) {
            indicator.textContent = '🟢';
            text.textContent = 'Connected to Firebase - Real-time sync active';
            status.style.backgroundColor = '#10b981';
            status.style.color = 'white';
        } else {
            indicator.textContent = '🔴';
            text.textContent = 'Connection failed - Check Firebase configuration';
            status.style.backgroundColor = '#ef4444';
            status.style.color = 'white';
        }
    }

    setupEventListeners() {
        // Authentication tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAuthTab(e.currentTarget.dataset.tab);
            });
        });

        // Login form
        document.getElementById('login-btn').addEventListener('click', () => {
            this.handleLogin();
        });

        document.getElementById('login-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        // Register form
        document.getElementById('register-btn').addEventListener('click', () => {
            this.handleRegister();
        });

        // Role selection
        document.querySelectorAll('.role-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectRole(e.currentTarget.dataset.role);
            });
        });

        // Name input
        const nameInput = document.getElementById('user-name');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                this.validateJoinButton();
            });

            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !document.getElementById('join-chatroom').disabled) {
                    this.joinChatroom();
                }
            });
        }

        // Join chatroom
        document.getElementById('join-chatroom').addEventListener('click', () => {
            this.joinChatroom();
        });

        // Role toggle / Logout
        document.getElementById('role-toggle').addEventListener('click', () => {
            if (this.currentUser.isAuthenticated) {
                this.handleLogout();
            } else {
                this.showRoleModal();
            }
        });

        // Subject selection
        document.querySelectorAll('.subject-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectSubject(e.currentTarget.dataset.subject);
            });
        });

        // Message input
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
            this.handleTyping();
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        document.getElementById('send-message').addEventListener('click', () => {
            this.sendMessage();
        });

        // Quick actions
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleQuickAction(e.currentTarget.dataset.action);
            });
        });

        // File attachment (placeholder)
        document.getElementById('attach-file').addEventListener('click', () => {
            this.handleFileAttachment();
        });

        // Emoji (placeholder)
        document.getElementById('add-emoji').addEventListener('click', () => {
            this.handleEmojiPicker();
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.goOffline();
        });
    }

    checkExistingSession() {
        const savedUser = localStorage.getItem('chatinclass_user');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                this.currentUser = { ...userData, isAuthenticated: true };
                this.hideLoginModal();
                this.updateUserInfo();
                this.enableChatInput();
                this.goOnline();
                this.loadMessages();
            } catch (e) {
                localStorage.removeItem('chatinclass_user');
                this.showLoginModal();
            }
        } else {
            this.showLoginModal();
        }
    }

    showLoginModal() {
        document.getElementById('login-modal').style.display = 'flex';
    }

    hideLoginModal() {
        document.getElementById('login-modal').style.display = 'none';
    }

    showRoleModal() {
        document.getElementById('role-modal').style.display = 'flex';
    }

    hideRoleModal() {
        document.getElementById('role-modal').style.display = 'none';
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
        document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
        
        // Clear messages
        document.getElementById('login-message').textContent = '';
        document.getElementById('register-message').textContent = '';
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const messageEl = document.getElementById('login-message');

        if (!username || !password) {
            this.showAuthMessage('login', 'Please enter both username and password', 'error');
            return;
        }

        try {
            // Check if user exists in Firebase
            const userRef = window.firebaseRef(this.database, `accounts/${username}`);
            const snapshot = await new Promise((resolve) => {
                window.firebaseOnValue(userRef, resolve, { onlyOnce: true });
            });

            const userData = snapshot.val();
            if (!userData) {
                this.showAuthMessage('login', 'Username not found', 'error');
                return;
            }

            // Simple password check (in production, use proper hashing)
            if (userData.password !== password) {
                this.showAuthMessage('login', 'Incorrect password', 'error');
                return;
            }

            // Login successful
            this.currentUser = {
                username: username,
                name: userData.name,
                role: userData.role,
                id: userData.id || this.generateUserId(),
                isAuthenticated: true
            };

            // Save session
            localStorage.setItem('chatinclass_user', JSON.stringify(this.currentUser));

            this.showAuthMessage('login', 'Login successful!', 'success');
            setTimeout(() => {
                this.hideLoginModal();
                this.updateUserInfo();
                this.enableChatInput();
                this.goOnline();
                this.loadMessages();
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            this.showAuthMessage('login', 'Login failed. Please try again.', 'error');
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const name = document.getElementById('register-name').value.trim();
        const role = document.getElementById('register-role').value;

        if (!username || !password || !name || !role) {
            this.showAuthMessage('register', 'Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthMessage('register', 'Password must be at least 6 characters', 'error');
            return;
        }

        if (username.length < 3) {
            this.showAuthMessage('register', 'Username must be at least 3 characters', 'error');
            return;
        }

        try {
            // Check if username already exists
            const userRef = window.firebaseRef(this.database, `accounts/${username}`);
            const snapshot = await new Promise((resolve) => {
                window.firebaseOnValue(userRef, resolve, { onlyOnce: true });
            });

            if (snapshot.val()) {
                this.showAuthMessage('register', 'Username already exists', 'error');
                return;
            }

            // Create new account
            const newUser = {
                username: username,
                password: password, // In production, hash this!
                name: name,
                role: role,
                id: this.generateUserId(),
                createdAt: window.firebaseServerTimestamp()
            };

            await window.firebaseSet(userRef, newUser);

            this.showAuthMessage('register', 'Account created successfully!', 'success');
            
            // Auto-login after registration
            setTimeout(() => {
                this.currentUser = {
                    username: username,
                    name: name,
                    role: role,
                    id: newUser.id,
                    isAuthenticated: true
                };

                localStorage.setItem('chatinclass_user', JSON.stringify(this.currentUser));
                this.hideLoginModal();
                this.updateUserInfo();
                this.enableChatInput();
                this.goOnline();
                this.loadMessages();
            }, 1000);

        } catch (error) {
            console.error('Registration error:', error);
            this.showAuthMessage('register', 'Registration failed. Please try again.', 'error');
        }
    }

    showAuthMessage(form, message, type) {
        const messageEl = document.getElementById(`${form}-message`);
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
    }

    handleLogout() {
        // Clear session
        localStorage.removeItem('chatinclass_user');
        
        // Go offline
        this.goOffline();
        
        // Reset user
        this.currentUser = {
            username: '',
            name: '',
            role: '',
            id: this.generateUserId(),
            isAuthenticated: false
        };
        
        // Reset UI
        this.showLoginModal();
        this.disableChatInput();
        
        // Clear messages
        document.getElementById('messages-container').innerHTML = '';
        this.showWelcomeMessage();
    }

    disableChatInput() {
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-message');
        
        messageInput.disabled = true;
        sendBtn.disabled = true;
        messageInput.placeholder = 'Please sign in to chat...';
    }

    selectRole(role) {
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelector(`[data-role="${role}"]`).classList.add('selected');
        this.currentUser.role = role;
        this.validateJoinButton();
    }

    validateJoinButton() {
        const nameInput = document.getElementById('user-name');
        const joinBtn = document.getElementById('join-chatroom');
        
        const isValid = this.currentUser.role && nameInput.value.trim().length >= 2;
        joinBtn.disabled = !isValid;
    }

    joinChatroom() {
        const nameInput = document.getElementById('user-name');
        this.currentUser.name = nameInput.value.trim();
        
        // Update UI
        this.updateUserInfo();
        this.enableChatInput();
        this.hideRoleModal();
        
        // Add user to Firebase
        this.goOnline();
        
        // Send welcome message
        this.addSystemMessage(`${this.currentUser.name} (${this.currentUser.role}) joined the chatroom`);
        
        // Load messages for current subject
        this.loadMessages();
    }

    goOnline() {
        if (!this.database) return;
        
        try {
            const userRef = window.firebaseRef(this.database, `users/${this.currentUser.id}`);
            window.firebaseSet(userRef, {
                name: this.currentUser.name,
                role: this.currentUser.role,
                timestamp: window.firebaseServerTimestamp()
            });

            // Remove user when they disconnect
            window.firebaseOnDisconnect(userRef).remove();
            
            console.log('User added to Firebase');
        } catch (error) {
            console.error('Error going online:', error);
        }
    }

    goOffline() {
        if (!this.database) return;
        
        try {
            const userRef = window.firebaseRef(this.database, `users/${this.currentUser.id}`);
            window.firebaseSet(userRef, null);
        } catch (error) {
            console.error('Error going offline:', error);
        }
    }

    updateUserInfo() {
        const userRoleElement = document.getElementById('user-role');
        const roleToggle = document.getElementById('role-toggle');
        const roleIcon = this.currentUser.role === 'teacher' ? '👨‍🏫' : '👨‍🎓';
        const roleText = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
        
        userRoleElement.textContent = `${roleIcon} ${this.currentUser.name} (${roleText})`;
        
        if (this.currentUser.isAuthenticated) {
            roleToggle.textContent = 'Logout';
            roleToggle.className = 'logout-btn';
        } else {
            roleToggle.textContent = 'Switch Role';
            roleToggle.className = 'role-btn';
        }
    }

    enableChatInput() {
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-message');
        
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.placeholder = 'Type your message here...';
        messageInput.focus();
    }

    selectSubject(subject) {
        // Update active subject
        document.querySelectorAll('.subject-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector(`[data-subject="${subject}"]`).classList.add('active');
        
        this.currentSubject = subject;
        
        // Update subject title
        const subjectNames = {
            general: 'General Discussion',
            math: 'Mathematics',
            english: 'English',
            science: 'Science',
            physics: 'Physics',
            chemistry: 'Chemistry',
            biology: 'Biology'
        };
        
        document.getElementById('current-subject').textContent = subjectNames[subject];
        
        // Load messages for this subject
        this.loadMessages();
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        
        if (!content || !this.database) return;
        
        const message = {
            content: content,
            sender: this.currentUser.name,
            role: this.currentUser.role,
            timestamp: window.firebaseServerTimestamp(),
            userId: this.currentUser.id
        };
        
        try {
            const messagesRef = window.firebaseRef(this.database, `messages/${this.currentSubject}`);
            window.firebasePush(messagesRef, message);
            
            // Clear input
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            // Clear typing indicator
            this.clearTyping();
            
            console.log('Message sent to Firebase');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    displayMessagesFromFirebase(messages) {
        const messagesContainer = document.getElementById('messages-container');
        
        // Clear existing messages
        messagesContainer.innerHTML = '';
        
        if (!messages) {
            this.showWelcomeMessage();
            return;
        }
        
        // Convert to array and sort by timestamp
        const messageArray = Object.entries(messages).map(([id, message]) => ({
            id,
            ...message
        }));
        
        messageArray.sort((a, b) => {
            const aTime = a.timestamp || 0;
            const bTime = b.timestamp || 0;
            return aTime - bTime;
        });
        
        messageArray.forEach(message => {
            this.displayMessage(message);
        });
        
        this.scrollToBottom();
    }

    displayMessage(message) {
        const messagesContainer = document.getElementById('messages-container');
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;
        messageElement.innerHTML = `
            <div class="message-bubble">
                <div class="message-header">
                    <span class="message-role">${message.sender}</span>
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                </div>
                <div class="message-content">${this.formatMessageContent(message.content)}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
    }

    loadMessages() {
        if (!this.database) {
            this.showWelcomeMessage();
            return;
        }
        
        const messagesRef = window.firebaseRef(this.database, `messages/${this.currentSubject}`);
        window.firebaseOnValue(messagesRef, (snapshot) => {
            const messages = snapshot.val();
            this.displayMessagesFromFirebase(messages);
        });
    }

    showWelcomeMessage() {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-content">
                    <h3>👋 Welcome to ${document.getElementById('current-subject').textContent}!</h3>
                    <p>Sign in to start chatting with your classmates</p>
                    <p>Teachers can make announcements and ask questions</p>
                    <p>Students can ask for help and participate in discussions</p>
                    <p>Your account saves your progress and lets you return anytime!</p>
                    <p>Messages sync in real-time across all devices via Firebase!</p>
                </div>
            </div>
        `;
    }

    formatMessageContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    formatTime(timestamp) {
        if (!timestamp) return 'Just now';
        
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now - messageTime;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        
        return messageTime.toLocaleDateString();
    }

    addSystemMessage(content) {
        if (!this.database) return;
        
        const message = {
            content: content,
            sender: 'System',
            role: 'announcement',
            timestamp: window.firebaseServerTimestamp(),
            userId: 'system'
        };
        
        try {
            const messagesRef = window.firebaseRef(this.database, `messages/${this.currentSubject}`);
            window.firebasePush(messagesRef, message);
        } catch (error) {
            console.error('Error sending system message:', error);
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = newHeight + 'px';
    }

    handleTyping() {
        if (!this.database) return;
        
        try {
            const typingRef = window.firebaseRef(this.database, `typing/${this.currentUser.id}`);
            window.firebaseSet(typingRef, {
                name: this.currentUser.name,
                subject: this.currentSubject,
                timestamp: window.firebaseServerTimestamp()
            });

            // Clear typing after 3 seconds
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.clearTyping();
            }, 3000);
        } catch (error) {
            console.error('Error updating typing status:', error);
        }
    }

    clearTyping() {
        if (!this.database) return;
        
        try {
            const typingRef = window.firebaseRef(this.database, `typing/${this.currentUser.id}`);
            window.firebaseSet(typingRef, null);
        } catch (error) {
            console.error('Error clearing typing status:', error);
        }
    }

    updateTypingIndicator(typingData) {
        const typingIndicator = document.getElementById('typing-indicator');
        const typingUsers = Object.values(typingData || {})
            .filter(user => user.subject === this.currentSubject && user.name !== this.currentUser.name)
            .map(user => user.name);

        if (typingUsers.length > 0) {
            const names = typingUsers.slice(0, 2).join(', ');
            const suffix = typingUsers.length > 2 ? ` and ${typingUsers.length - 2} others` : '';
            typingIndicator.textContent = `${names}${suffix} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
        } else {
            typingIndicator.textContent = '';
        }
    }

    handleQuickAction(action) {
        const messageInput = document.getElementById('message-input');
        
        switch (action) {
            case 'help':
                messageInput.value = '🆘 I need help with: ';
                break;
            case 'question':
                messageInput.value = '❓ Question: ';
                break;
            case 'announcement':
                if (this.currentUser.role === 'teacher') {
                    messageInput.value = '📢 Announcement: ';
                } else {
                    alert('Only teachers can make announcements');
                    return;
                }
                break;
        }
        
        messageInput.focus();
        messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
    }

    handleFileAttachment() {
        alert('File attachment feature coming soon!');
    }

    handleEmojiPicker() {
        const emojis = ['😊', '👍', '❤️', '😂', '🤔', '👏', '🎉', '📚', '✅', '❌'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        const messageInput = document.getElementById('message-input');
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        messageInput.focus();
        messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
    }

    updateOnlineUsersFromFirebase(users) {
        this.onlineUsers.clear();
        Object.entries(users).forEach(([id, user]) => {
            this.onlineUsers.set(id, user);
        });
        this.updateOnlineUsersList();
        this.updateOnlineCount();
    }

    updateOnlineUsersList() {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        this.onlineUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = `user-item ${user.role}`;
            userElement.innerHTML = `
                <div class="user-status"></div>
                <span>${user.name}</span>
            `;
            usersList.appendChild(userElement);
        });
    }

    updateOnlineCount() {
        document.getElementById('online-count').textContent = this.onlineUsers.size;
    }

    updateMessageCountFromFirebase(subject, messages) {
        const count = messages ? Object.keys(messages).length : 0;
        const subjectElement = document.querySelector(`[data-subject="${subject}"] .message-count`);
        if (subjectElement) {
            subjectElement.textContent = count;
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Initialize the chatroom when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatInClassFirebase();
});