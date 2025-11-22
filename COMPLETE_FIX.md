# FINAL FIX - Complete Working Code

## The file is still corrupted. Here's what you need to do:

### Step 1: Find line 535 in Chat.jsx
Look for this line:
```javascript
<button className="btn-small danger" onClick={handleLeaveGroup}>Leave</button>
```

### Step 2: Delete everything from line 536 to line 552
Delete all these lines (the orphaned form elements)

### Step 3: After line 535, add the proper closing tags and structure:
```javascript
                                        <button className="btn-small danger" onClick={handleLeaveGroup}>Leave</button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="messages-container">
                            {messages.map((msg, index) => (
                                <React.Fragment key={msg._id || index}>
                                    {shouldShowDateSeparator(msg, messages[index - 1]) && (
                                        <div className="date-separator">
                                            <span>{formatDateSeparator(msg.createdAt || msg.time)}</span>
                                        </div>
                                    )}
                                    
                                    <div className={`message ${msg.type === 'system' ? 'system' : (msg.sender?._id === user.id || msg.sender === user.username ? 'sent' : 'received')}`}>
                                        <div className="message-content">
                                            <span className="sender" style={currentRoom.type === 'group' && msg.sender?._id !== user.id && msg.type !== 'system' ? { color: getUserColor(msg.sender?._id || msg.sender) } : {}}>
                                                {msg.sender?.username || msg.sender}
                                            </span>

                                            {msg.deleted ? (
                                                <p className="deleted-message"><i>This message was deleted</i></p>
                                            ) : msg.type === 'system' ? (
                                                <p>{msg.content}</p>
                                            ) : (
                                                <>
                                                    {msg.type === 'text' && <p>{msg.content}</p>}
                                                    {msg.type === 'image' && (
                                                        <div className="message-file">
                                                            <img src={`${import.meta.env.VITE_API_URL}${msg.fileUrl}`} alt={msg.fileName} />
                                                            <p>{msg.content}</p>
                                                        </div>
                                                    )}
                                                    {msg.type === 'file' && (
                                                        <div className="message-file">
                                                            <a href={`${import.meta.env.VITE_API_URL}${msg.fileUrl}`} download={msg.fileName}>
                                                                📎 {msg.fileName}
                                                            </a>
                                                            <p>{msg.content}</p>
                                                        </div>
                                                    )}
                                                    <div className="message-actions">
                                                        <button onClick={() => handleCopyMessage(msg.content)} title="Copy">📋</button>
                                                        {(msg.sender?._id === user.id || msg.sender === user.username) && (
                                                            <button onClick={() => handleDeleteMessage(msg._id)} title="Delete">🗑️</button>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            <span className="time">{formatTime(msg.createdAt || msg.time)}</span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}

                            {typingUsers.size > 0 && (
                                <div className="typing-indicator">
                                    {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        <form className="message-input" onSubmit={sendMessage}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="btn-icon"
                                disabled={isUploading}
                            >
                                📎
                            </button>
                            <input
                                type="text"
                                value={currentMessage}
                                onChange={handleTyping}
                                placeholder={isUploading ? `Uploading... ${uploadProgress}%` : "Type a message..."}
                                disabled={isUploading}
                            />
                            <button type="submit" disabled={isUploading}>Send</button>
                        </form>
                    </>
```

This replaces everything from line 535 to line 552 with the correct structure!
