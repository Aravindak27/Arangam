# Quick Fix for Chat.jsx

## Problem:
Lines 536-538 contain orphaned code that's causing a syntax error.

## Solution:
Delete these 3 lines (536-538):
```
            onChange={handleFileSelect}
                                    style={{ display: 'none' }}
        />
```

These lines should be completely removed. They are leftover fragments from the earlier corruption.

## After deletion, line 535 should connect directly to line 539:
```javascript
<button className="btn-small danger" onClick={handleLeaveGroup}>Leave</button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="messages-container">
```

Then the app should load without errors!
